create or replace function public.cassola_close_accepted_inventory_task()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.employee_inventory_tasks
  set status = 'closed', updated_at = now()
  where id = new.inventory_task_id
    and credential_id = new.credential_id
    and source_kind = 'person'
    and status = 'active';
  return null;
end;
$$;

create or replace function public.cassola_refresh_scope_after_inventory_task_close()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  person_id text;
  role_id_for_employee text;
  active_role_name text;
  personal_ids text[];
  role_ids text[];
  sku_ids text[];
begin
  select staff_person_id, staff_role_id
  into person_id, role_id_for_employee
  from public.access_credentials
  where id = new.credential_id and role = 'employee'
  for update;
  if person_id is null then return null; end if;

  select array_agg(distinct sku)
  into personal_ids
  from public.employee_inventory_tasks t
  cross join lateral unnest(t.resolved_sku_ids) as items(sku)
  where t.credential_id = new.credential_id
    and t.source_kind = 'person'
    and t.status = 'active';

  select r.resolved_sku_ids, coalesce(r.role_name, '')
  into role_ids, active_role_name
  from public.staff_role_inventory_task_rules r
  where r.role_id = role_id_for_employee and r.status = 'active';

  select coalesce(array_agg(distinct sku order by sku), '{}')
  into sku_ids
  from unnest(coalesce(personal_ids, '{}') || coalesce(role_ids, '{}')) as items(sku);

  update public.access_credentials
  set scope = jsonb_build_object(
        'id', 'staff:' || person_id,
        'kind', 'skuIds',
        'skuIds', sku_ids,
        'label', case
          when active_role_name is not null then '岗位 ' || active_role_name ||
            case when cardinality(personal_ids) > 0 then ' + 个人任务' else '' end
          when cardinality(sku_ids) > 0 then 'Staff 个人任务'
          else '无盘货任务'
        end
      ),
      updated_at = now()
  where id = new.credential_id;
  return null;
end;
$$;

revoke execute on function public.cassola_close_accepted_inventory_task() from public, anon, authenticated;
revoke execute on function public.cassola_refresh_scope_after_inventory_task_close() from public, anon, authenticated;

create trigger cassola_close_accepted_inventory_task
after update of status on public.employee_submissions
for each row
when (new.status = 'accepted' and new.inventory_task_id is not null)
execute function public.cassola_close_accepted_inventory_task();

create trigger cassola_refresh_scope_after_inventory_task_close
after update of status on public.employee_inventory_tasks
for each row
when (old.status = 'active' and new.status = 'closed' and new.source_kind = 'person')
execute function public.cassola_refresh_scope_after_inventory_task_close();

-- Existing reviewed tasks close through the same scope refresh path.
update public.employee_inventory_tasks t
set status = 'closed', updated_at = now()
where t.source_kind = 'person'
  and t.status = 'active'
  and exists (
    select 1
    from public.employee_submissions s
    where s.inventory_task_id = t.id
      and s.credential_id = t.credential_id
      and s.status = 'accepted'
  );

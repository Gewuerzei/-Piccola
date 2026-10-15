-- Staff department v1 transport. Does not migrate personal data or change the legacy staff Head.
-- Future Staff v2 directory is a separate migration; current scopes are independent
-- snapshots matching the existing Staff editor, not a unified people-directory release.
INSERT INTO public.cloud_scopes(id,label,sort_order,enabled) VALUES
 ('staff:sushi','🍣 Staff · Sushi',61,true),
 ('staff:sala','🍷 Staff · Bar/Sala',62,true),
 ('staff:cucina','🍳 Staff · Cucina',63,true)
ON CONFLICT(id) DO NOTHING;

INSERT INTO public.cloud_scope_heads(scope_id,state)
SELECT s.id, '{}'::jsonb FROM public.cloud_scopes s
WHERE s.id IN ('staff:sushi','staff:sala','staff:cucina')
ON CONFLICT(scope_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.staff_department_grants(
 credential_id text NOT NULL REFERENCES public.access_credentials(id) ON DELETE CASCADE,
 department_id text NOT NULL CHECK (department_id IN ('sushi','sala','cucina')),
 can_read boolean NOT NULL DEFAULT true,
 can_write boolean NOT NULL DEFAULT true,
 granted_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(credential_id,department_id)
);
ALTER TABLE public.staff_department_grants ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.staff_department_grants FROM anon, authenticated, public;
-- Existing active Supervisor is the migration operator. Never infer privileges
-- for future newly created supervisors; they need explicit administrator grants.
INSERT INTO public.staff_department_grants(credential_id,department_id)
SELECT c.id,x.department_id FROM public.access_credentials c
CROSS JOIN (VALUES ('sushi'),('sala'),('cucina')) x(department_id)
WHERE c.role='supervisor' AND c.active=true
ON CONFLICT(credential_id,department_id) DO NOTHING;

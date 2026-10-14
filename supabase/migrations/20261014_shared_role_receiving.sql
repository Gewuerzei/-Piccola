-- Cassola role-shared employee receiving (deployed production 2026-10-14).
-- Existing personal receipt rows remain unchanged.
-- NULL credential_id identifies an unclaimed role task until the first eligible
-- employee executes receipt_claim_role; Edge performs an atomic conditional claim.
ALTER TABLE public.employee_receipt_tasks
  ALTER COLUMN credential_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS source_role_id text,
  ADD COLUMN IF NOT EXISTS source_role_name text,
  ADD COLUMN IF NOT EXISTS claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_employee_receipt_role_unclaimed
  ON public.employee_receipt_tasks (source_role_id, status, authorized_at DESC)
  WHERE credential_id IS NULL AND source_role_id IS NOT NULL;

-- Contract enforced by cassola-cloud ACTIVE v20:
-- - supervisor receipt_authorize may specify either credentialId OR roleId
-- - role receipts are visible only to eligible Employee PINs with a live,
--   matching access_credentials.staff_role_id and managed staff_person_id
-- - receipt_claim_role conditionally changes credential_id from NULL to claimant
-- - once claimed, employee receipt_submit and supervisor receipt_review are unchanged
-- - never grant role receipt eligibility from Sala's legacy serving-station label
-- - old legacy staff scope upload/download/restore remains frozen

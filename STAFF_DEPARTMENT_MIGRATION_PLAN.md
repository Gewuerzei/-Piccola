# Cassola Staff · Department Workspaces Migration Plan

> Status: **APPROVED ARCHITECTURE / DESIGN ONLY** (2026-10-13)  
> Business partition: **Sushi / Cucina / Sala**.  
> **Not yet implemented or migrated.** Existing `staff` Cloud Head, localStorage, checkpoints, historic publications, and employee credentials remain unchanged.
>
> Public repository: this document may contain **schema and anonymous examples only**. Never store live employee names, PINs, avatars, shifts, attendance, proprietary business figures, session tokens, or raw Cloud snapshots here.

## 1. Goal and non-goals

One **global person directory**, three independently versioned **department Staff workspaces**, and explicit supervisor permissions. Supervisors may collaborate on the same department. Staff Cloud download **must never silently replace the other departments**, and importing people is a separate **preview + explicit merge** operation.

Staff partition uses the **organizational department** (Sushi, Cucina, Sala), **not** device, supervisor, Inventory area, supplier, or employee inventory-task scope. Note Inventory currently has a `bar` (Bar / Sala) scope; Staff Sala must **not** reuse Inventory's `bar` snapshot.

Out of scope for automatic migration: guessing an employee's department from name, language, device, primaryRole, or legacy Staff roster; auto-linking two different IDs by display name; converting old global `staff` Head in place; changing Inventory or existing employee tasks as a side effect.

## 2. Proposed V2 data contract

Cloud scopes (new, distinct from all Inventory scopes):
- `staff:directory`: shared people and memberships; per-person stable global `personId`; name, role references, active state; optional `homeDepartment`. Department membership is an array with an explicit membership state. Avatars remain client IndexedDB and in explicitly requested full backup only.
- `staff:sushi`, `staff:cucina`, `staff:sala`: department scoped `attendance`, `schedules`, `swaps`, `restMoves`, `weekPublications`, scoped `history`, department role mappings, migration provenance. The scope contains **references** to global person IDs, not full independent person master copies.
- The **legacy `staff` scope is frozen as a read-only history/archive for migration and audit**. Do not reuse it as a fourth working department or silently delete it.

Example synthetic snapshot contracts (no real data):

```json
{
  "schemaVersion": 2,
  "scopeId": "staff:directory",
  "people": {"person-example-1": {"id": "person-example-1", "name": "Example", "memberships": ["sushi"]}},
  "identityAliases": {"legacy-source-example:old-person-id": "person-example-1"},
  "migrationProvenance": {"planVersion": 1}
}
```

```json
{
  "schemaVersion": 2,
  "scopeId": "staff:sushi",
  "members": ["person-example-1"],
  "attendance": {"2026-10-12": {"person-example-1": {"status": "rest", "portion": "full"}}},
  "schedules": {},
  "swaps": [],
  "restMoves": [],
  "weekPublications": {"2026-10-12": []},
  "history": [],
  "departmentRoles": [],
  "migrationProvenance": {"sourceId": "legacy-source-example"}
}
```

Rules:
- All department references resolve against the shared directory. Department membership never implies a new person entity. Multiple memberships are allowed, with a single explicitly designated home department if business rules need one.
- A person’s official cross-department leave/rest is checked against **other department commitments**. Cross-department overlaps must be flagged for human review, not silently synchronized, deleted, or doubled.
- `weekPublications[weekStart]` retain **immutable frozen snapshots**, original publication IDs, `version`, timestamps, and provenance. Published records must survive renaming and future membership changes. A new correction is a new published version, never an edit to v1.
- `roles` and employee access references need department-qualified identities, for example `staff:sushi:maki` rather than treating bare `maki` as globally unique. Legacy IDs remain as aliases until their linked tasks/PINs have been audited.
- `area` in Inventory, supplier-task scopes, and the legacy Staff `primaryRole` are **not** authoritative department selectors.

## 3. Local-first data and cutover

- Keep existing `cassola_staff_v01` and avatar IndexedDB **untouched** for recovery. Never migrate by overwriting this key. Never clear localStorage.
- New V2 client state goes under a separate root `cassola_staff_v02` containing `directory`, `departments`, a `migrationManifest`, and per-scope sync metadata. One root avoids a partially written directory/department when PWA closes between localStorage writes.
- Retain the old Staff Cloud meta and rollback key unchanged. V2 uses new per-scope lineage/base versions. Download/restore always snapshots the full V2 root before applying a validated update; keep multiple dated recovery records (IndexedDB/explicit exports), not only the one-slot V1 rollback.
- During pre-migration deployment default to **legacy read-only** for unsafe operations. V2 must be feature-gated until corresponding Edge validation, permission grants, and test data have been verified.
- PDF and UI default to the selected department. File name/title explicitly includes department, week start, and publication version/draft. Existing legacy PDFs and publications remain readable in an archive.

## 4. Server migration and security gates

Database/Edge rollout order:
1. Take a read-only inventory of legacy `staff` versions/checkpoints, current Head, linked credential IDs and active tasks. Create validated **immutable recovery material** in a private, access-controlled location; check hashes and recoverability. Never copy personal snapshots to GitHub.
2. Add new rows in `cloud_scopes` for `staff:directory`, `staff:sushi`, `staff:cucina`, `staff:sala` using a reviewed transactional Supabase migration. Preserve the old `staff` row and lineage.
3. Update Edge `allowedSupervisorScopes`, session scopes, access validation, `status / upload_scopes / download_scopes / history / restore` and the server-side RPC allowlists. Explicit access checks must bind **actor, requested department, and role**, not device name or user-provided body field. A legacy all-departments Supervisor is an explicit compatibility grant, not an unverified default.
4. Treat personal directory and departmental roster as separate scoped heads. Verify new scope's `baseVersionId` against the exact Head under atomic RPC; no last-writer-wins whole-state upload. On divergence create a **branch or conflict**, not a canonical overwrite.
5. Employee managed PIN/credentials, shared role inventory-task rules, personal task IDs and employee submissions keep old person/role references until identity alias mapping is reviewed. Any rebinding needs explicit transactional mapping with audit and idempotency keys. Do not automatically revoke or recreate PINs/tasks during Staff import.
6. Keep current anonymous/employee database roles denied direct table writes; Edge/service-role mediation, RLS/grants, and audit remain mandatory. Block legacy V1 `staff` upload/restore from silently becoming the V2 directory.

## 5. Legacy source discovery and identity mapping

There are multiple historical Staff rosters with different person IDs; **roster disjointness does not prove different human identities or departments**. Do not infer ownership. Source ownership is a required Supervisor decision.

Provide an offline-safe **migration preview**:
- List each source by anonymous `sourceVersionId`, timestamp, source kind, count of personnel, weeks with attendance, weekPublication count, and checksum. Avoid leaking raw staff data into public logs.
- Supervisor explicitly picks the **target department** for each selected source and sees its visible people locally.
- For each person choose: **link to existing global person / add new global person / skip and keep in archive**. No automatic same-name links. `(sourceVersionId, legacyPersonId)` uniquely keys an alias; preserve original IDs where nonconflicting.
- A snapshot's `attendance`, `schedules`, `swaps`, `restMoves`, `weekPublications`, `history` must be rewritten only through the approved alias map, with original frozen publication payload/provenance preserved for audit.
- Reject unresolved references, duplicate event IDs with different payloads, same department/week publication conflicts, and incompatible task/access references. **Do not silently filter records**.
- Importing just people is not the same action as importing department schedules. Provide explicit independent options and preview counts.
- Commit idempotently with `migrationId = hash(sourceVersionId + targetDepartment + mappingDecisionVersion)` and a private migration ledger; repeated execution must yield no duplicates.

## 6. Conflict-aware merge (local, Cloud, and JSON)

Three-way merge requires **base (B), local (L), remote (R)** from a verified common ancestor:
- If only one side changed a field, adopt that change (including explicit deletion/tombstone).
- If both changed the same field/person-day to *the same value*, accept once.
- If both changed the same field/person-day to *different values*, **conflict**: show B/L/R, request explicit resolution and preserve both branch references.
- Different person-day attendance keys can be proposed for automatic non-conflicting merge **only inside the same department**. Missing attendance means *work* but only an explicit deletion from the known base is treated as clearing a recorded status.
- Person directory fields use per-person, per-field conflict detection. Name alone is never an ID. A directory change never silently alters department memberships.
- Swaps/restMoves/history are event-ledgers: union **by stable event ID**, reject same ID with different content. Validate both swap endpoints stay in the department or mark a cross-department operation for manual review. Preserve lifecycle status and references.
- Published weekly snapshots are **append-only by publication ID**. Two independent versions called `v1` for the same department/week are not equivalent: retain both source branches, ask the Supervisor to select a canonical publication lineage, and publish any reconciliation as **new vN**.
- Apply all edits to a temporary validated V2 state, present a human-readable diff, and only then atomically save. Cloud upload after user confirmation checks Head parent lineage again. **Never turn an entire other department into the current department via download.**
- Plain Staff JSON import uses the same preview/merge engine and requires explicit target scope. Legacy JSON may be archived without any mutation; reject cross-department imports lacking mapping.

## 7. UI expectations

- Staff header and nav: selector `🍣 Sushi / 🔪 Cucina / 🍽️ Sala`. Switches **view and working scope**, not full-account login. Remember selected department per device, never infer from last imported file.
- Each department shows its own: weekly table, v1/v2 publications, PDF, month, roster membership, scheduling, role tasks, and version history. Global directory has a separate "People" manager with department membership badges.
- Cloud panel shows chosen department name and canonical Head/base/conflict state. Buttons say **“Download Sushi rest plan” / “Merge people…”** distinctly. Downloads require no-data-loss diff and pre-apply backup.
- Import wizard displays `source -> destination`, unmatched people, attendance dates, publication versions, swaps, and collision list; commits only after confirm.
- Export each scope and full backup independently. File names contain department and schema version. PDF header should show department.
- If the Cloud data or old snapshot cannot be assigned confidently to a department, keep it in an **unassigned archive** with its own original IDs, accessible for recovery but not active in any department.

## 8. Deployment phases and acceptance gates

**P0 – Preserve**: Before any migration, keep legacy local V1 read-only backups and private Cloud history/restore points. Confirm the previously published week can be materialized without modifying the current Head.

**P1 – New storage without cutover**: Deploy new Cloud scopes, role grants, API paths and V2 local state behind a disabled feature gate. Unit/integration test three independent empty workspaces with fake people.

**P2 – Migration dry-run**: Human-reviewed mapping of every chosen legacy source to Sushi/Cucina/Sala or archive. Preview roster links, week v1, swaps, role task links, and incomplete references. Require a fully passing report to proceed.

**P3 – Per-department staged import**: Commit exactly one department at a time with migration ledger, read-after-write comparison (counts, checksums, publication IDs), dedicated checkpoint, and explicit Supervisor sign-off. Never edit the original V1 state. Roll back by switching V2 view/pointer, not deleting V1 history.

**P4 – Dual-Supervisor concurrency test**: Two clients edit different people/dates within one department; merge nonconflicting differences with review. Same cell concurrently edited must fork/conflict. Editing one department cannot change another scope.

**P5 – Cutover**: Set selected departments to V2 after backup and validation. Block legacy V1 Staff writes; preserve it for history/forensics. Do not migrate Inventory or employee access implicitly.

Mandatory tests (synthetic data):
- Different 8-person rosters both importable into explicitly selected departments without losing either; same name with different IDs remains unresolved.
- Multiple supervisors share one department while another department remains unaffected; never use device name as scope.
- Week `v1`, its frozen snapshot, and its PDF remain available after upgrade, repeated imports, and rollback.
- Cross-department worker, leave conflicts, multi-department visibility, role task/PIN references, and inactive users.
- Concurrent same-cell conflict, disjoint-cell merge, deletion semantics, stale baseVersion, offline stale upload, failure mid-migration, retry/idempotency.
- Cloud version/checkpoint/branch lineage per scope, cross-scope access forbidden, and no leakage via API.
- iPhone offline PWA upgrade and restart, no localStorage loss, legacy JSON restores to archive only unless mapped.

## 9. Hard stop conditions

Stop and require explicit human review if: source department unassigned; people aliases unresolved; a week publication would disappear or be rewritten; matching names are being linked automatically; active employee PIN/task relationships would change without mapping; Cloud base/head mismatch; any scope Head or local original would be overwritten; cross-department permission validation fails; the source backup/checkpoint has not been verified.

**Implementation is a future, separate change set. Creating this plan does not deploy migrations or mutate production data.**

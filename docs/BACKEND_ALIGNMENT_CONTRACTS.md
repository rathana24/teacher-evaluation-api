# Backend alignment contracts

Contracts the frontend relies on that are easy to miss in Swagger. Each section names the endpoint, what the server already does, and what clients still have to do.

## M5: what `POST /academic-years` copies

`POST /api/academic-years` (ADMIN) creates the year and, in the same SERIALIZABLE transaction, initializes it from its immediate predecessor (`start_year - 1`):

- It **copies student group placements**: missing yearly placements are created as new `student_academic_records` for the new year.
- It **does not copy teaching assignments.** This endpoint creates no semesters, so there is nothing to copy assignments into. Every predecessor assignment is reported as skipped with reason `INCOMPLETE_OR_UNAVAILABLE_CONTEXT`.

Existing destination records are never overwritten. Enrollments, evaluations, participants and responses are never copied or changed. If any step fails, the whole request rolls back, including the year.

The 201 response is the year plus a `rollover` object:

| Field | Meaning |
|---|---|
| `status` | `COMPLETE` (predecessor found and processed), `NO_PREDECESSOR` (no year with `start_year - 1`; nothing copied), `UNAVAILABLE` (no structured `start_year`) |
| `unavailable_reason` | `STRUCTURED_START_YEAR_REQUIRED` when `status` is `UNAVAILABLE`, otherwise `null` |
| `source_academic_year_id` | ID of the predecessor year, or `null` |
| `groups.copied` / `preserved` / `skipped` | Counts of student placements |
| `groups.copied_record_ids` | New `student_academic_records` IDs |
| `groups.reasons[]` | `{ student_id, reason }` for each skipped student, e.g. `NO_PREDECESSOR_GROUP`, `INACTIVE_ACCOUNT`, `OUTSIDE_DEPARTMENT_SCOPE`, `COHORT_MAPPING_REQUIRED`, `BEYOND_PROGRAM_OR_UNRESOLVED`, `TRANSFER_MAPPING_REQUIRED` |
| `assignments.copied` / `preserved` / `skipped` | Through this endpoint always `0` / `0` / number of predecessor assignments |
| `assignments.copied_offering_ids` | Empty through this endpoint |
| `assignments.reasons[]` | `{ source_offering_id, reason: "INCOMPLETE_OR_UNAVAILABLE_CONTEXT" }` for each predecessor assignment |

Client rules:

- **Recommended:** use `POST /api/academic-years/setup` with an `idempotency_key`. It creates the year, Semester 1 and Semester 2, the student group placements and the teaching assignments in one atomic, idempotent request. Recover a lost response with `GET /api/academic-years/setup/receipts/{key}`. `/auth/me` advertises `capabilities.integrated_academic_year_rollover_v1` for this contract.
- **If a client uses plain `POST /academic-years`:** it must not copy student group placements again; read them from `rollover.groups`. It **must still** create the semesters and then copy the teaching assignments itself. That client copy is not redundant, but it is not atomic.

Coverage: `test/backend-alignment.e2e-spec.ts` (plain `POST /academic-years` copies groups, skips assignments, creates no semesters) and `test/academic-year-setup.e2e-spec.ts` (Swagger contract and `/setup` behaviour).

# Backend alignment contracts

Contracts the frontend relies on that are easy to miss in Swagger. Each section names the endpoint, what the server already does, and what clients must not do.

## M5: `POST /academic-years` performs the rollover

`POST /api/academic-years` (ADMIN) creates the year **and**, in the same SERIALIZABLE transaction, initializes it from its immediate predecessor (`start_year - 1`):

- copies missing yearly **student group placements** into new `student_academic_records` for the new year;
- copies eligible **teaching assignments** into new `course_offerings` (new IDs, `source_offering_id` provenance), revalidated against the new year's curriculum approvals and placements.

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
| `assignments.copied` / `preserved` / `skipped` | Counts of teaching assignments |
| `assignments.copied_offering_ids` | New `course_offerings` IDs |
| `assignments.reasons[]` | `{ source_offering_id, reason }` for each skipped assignment |

Client rules:

- Do **not** repeat the copy in the browser after `POST /academic-years`; show the returned `rollover` instead. `/auth/me` advertises `capabilities.integrated_academic_year_rollover_v1` for this server-side behaviour.
- This endpoint does **not** create semesters. For one idempotent request that creates the year, Semester 1 and Semester 2 and runs the same rollover, use `POST /api/academic-years/setup` with an `idempotency_key`; recover a lost response with `GET /api/academic-years/setup/receipts/{key}`.

Coverage: `test/academic-year-setup.e2e-spec.ts` (Swagger contract and setup behaviour) and `test/academic-years.e2e-spec.ts`.

# Frontend–Backend Alignment Analysis

Phase 1 (inspection) and phase 2 (backend changes) · 21 Oct 2026

## Phase 2 status

Backend branch `frontend-alignment` (from `master`, not pushed). One change per commit.

| Item | Status | Commits |
|---|---|---|
| M1: `GET /evaluations` returns `survey_versions.survey_id` | **Done** | `51664ba` |
| M2: `PUT /course-offerings/:id` accepts `section_code: null` and clears the label (an empty string `""` is still 400) | **Done** | `d8109e6` |
| M5: `POST /academic-years` documented: it copies student group placements but **not** teaching assignments (no semesters exist, so each is skipped with `INCOMPLETE_OR_UNAVAILABLE_CONTEXT`); `/academic-years/setup` with the `Idempotency-Key` header does both atomically | **Done** (backend docs) | `e2ee856`, wording corrected in `e27c8b4` and `0693ec8` |
| G1: e2e, plain `POST /academic-years` copies groups, skips assignments, creates no semesters | **Done** | `7d27b24`, year range fix `33e9619` |
| G2: e2e, draft 404 message pinned exactly; 409 after final submit | **Done** | `7d27b24` |
| G3: e2e, `POST /students` with `gender: null` → 201 | **Done** | `7d27b24` |
| Older backend-alignment tests moved to a non-colliding year range | **Done** | `ee57cd7` |
| M3, M4, M5 client change, G2 detection by status | Frontend proposals | `docs/FRONTEND_PROPOSALS.md` |
| M6: `REQUIRE_MAJOR_SCOPED_COHORTS` | **Open**, to review later | — |

Test results after phase 2: `npm test` 57 suites, **837/837** passed (baseline 827); `npm run test:e2e` 48 suites, **2,266/2,266** passed (baseline 2,254), on a freshly rebuilt `teacher_evaluation_test`. Backend contract notes: `teacher-evaluation-api/docs/BACKEND_ALIGNMENT_CONTRACTS.md`.

The rest of this document is the phase 1 report. Statuses in it are updated where phase 2 changed them.

## Phase 1 notes

Scope: inspection only; no code, config or database was changed.

- Frontend backup: `D:\internship\backups\frontend-master-20261021-125521` (186/186 files; node_modules, dist, build excluded). The frontend is not a git repository.
- Backend git status (`teacher-evaluation-api`, branch `master`, up to date with origin): uncommitted changes, left untouched:
  - `.gitignore` (+`thesis-figures/`), `README.md` (+64 lines of verification notes)
  - `src/evaluations/evaluations.service.ts`: adds `survey_id: true` to the evaluation include. **The frontend needs this field** (see M1).
  - Untracked: `Backend_Requirements.md`, `report.md`, `screenshots/`
- To run the frontend build and tests, `npm ci` added `node_modules/` and `npm run build` produced `dist/` in the frontend folder. Both are generated and git-ignored; no source file was edited.

## 1. Overview

**Backend:** NestJS 12, Prisma 6, PostgreSQL. Routes are served under `/api` with JWT bearer auth and role guards (ADMIN, LECTURER, STUDENT). The global `ValidationPipe` uses `whitelist: true` and `transform: true`, so unknown fields are stripped silently rather than rejected. Errors use the Nest format `{statusCode, message, code?}`.

- Swagger confirms 145 routes (144 plus health). Migrations are up to date (28).
- Most of improve.txt A–S is already implemented: atomic year setup and rollover (B/F/I), automatic course codes (G), reviewed assignment+enrollment (J), evaluation group scopes and major filter (A/K), create-and-publish (L), deadline extension (M), activity log (N), the one-evaluation-per-offering rule with `EVALUATION_EXISTS` (O), `_count.enrollments` (P), bulk evaluations (Q) and the student self-context (R).
- `/auth/me` advertises these features as `capabilities`, but only when the schema checks pass.
- `major_scoped_generations` is advertised only when `REQUIRE_MAJOR_SCOPED_COHORTS=true`. The local `.env` does not set it.

**Frontend:** React 19 + Vite 7 SPA.

- All requests go through `src/services/apiClient.js`. It reads the base URL from `VITE_API_BASE_URL` (default in dev: `http://localhost:3000/api`) and sends a bearer token from `sessionStorage.access_token`, one session per tab.
- Errors carry `status` and the top-level `code`; for 5xx it shows a generic message. There is no automatic logout on 401; callers handle it.
- `appDataSource.js` loads role-scoped data and maps UI actions to API writes. `backendContracts.js` handles pagination and students.
- `reviewedWorkflows.js` handles the preview→confirm pattern (it requires a UUID v4 `review_id` and an `expires_at`). Group, enrollment, rollover, bulk and activity calls each have their own service module.
- Features are gated on the `/auth/me` capabilities `change_password`, `major_scoped_generations`, `bulk_evaluations_v1` and `evaluation_activity_v1`.

## 2. Summary counts

The frontend calls about 70 distinct endpoints (method + path pattern) from about 40 call sites. All of them were checked against the DTOs, services and Swagger.

| Class | Count | Notes |
|---|---|---|
| OK | All except the 6 below | Path, method, request fields and response fields agree (static check) |
| MISMATCH | 6 | M1–M6 below |
| MISSING (backend lacks it) | 0 | Every path the frontend calls exists |
| Backend features the frontend does not use | 9 groups | Section 3b. They cause most of the "blocked" UI states |

Step D (live, read-only) was run on 21 Oct 2026 against `teacher_evaluation` using the AMS demo accounts. Results are in section 3c.

## 3a. MISMATCH table

| # | Frontend file:line | Endpoint | Frontend sends/expects | Backend does | User impact | Fix (where, why) |
|---|---|---|---|---|---|---|
| M1 (**done**, `51664ba`) | `services/appDataSource.js:304` | `GET /evaluations` | Reads `e.survey_versions.survey_id` | Committed code does not select `survey_id`; the uncommitted working-copy change adds it. The live dev server (built from the working copy) returns it, so the live check passes only because of the uncommitted change. | Each period gets `surveyId = "undefined"`, which breaks question-set matching, duplicate detection and the version label context in Evaluation periods | **Backend.** Commit the existing one-line change and add a test. The field is harmless and non-identifying. |
| M2 (**done**, `d8109e6`) | `services/appDataSource.js:556` (callers `CoursesByYear.jsx:111`, `LecturerAssignments.jsx:87`) | `PUT /course-offerings/:id` | `section_code: r.section \|\| null`, so editing any assignment **without a class label** sends `null` | `@ValidateIf(v !== undefined) @IsNotEmpty()`: null → **400** "section_code should not be empty". A label also cannot be cleared. | Saving an edit fails for every unlabelled assignment (old mismatch 2) | **Backend.** On update, accept `null` (and blank) as "clear the label" and store NULL. The label is display-only and not part of assignment identity (J), so this does not weaken any rule. |
| M3 | `pages/admin_user/LecturerAssignments.jsx:207` (form) → `appDataSource.js:553` | `POST /course-offerings` | "Student year: Optional". An empty value sends `year_level: null`. | `year_level` is a required integer 1–5 on create, so the request fails with **400** | Creating an assignment from the lecturer page fails (old mismatch 3) | **Frontend.** Keep the backend requirement: H requires an approved curriculum year for new offerings, and relaxing it would reopen the unscoped curriculum bypass. Make the field required on create. |
| M4 | `LecturerAssignments.jsx:208` → `appDataSource.js:554` | `PUT /course-offerings/:id` | Choosing "Not assigned (legacy)" sends `class_type: null` | 400 `OFFERING_CLASS_TYPE_REQUIRED` when the saved type is known; omitting the field would preserve it | Edits fail if a known type is set back to blank (rare) | **Frontend.** Omit `class_type` when it is blank. The backend rule protects assignment identity (J). |
| M5 (backend docs **done**, `e2ee856` + `e27c8b4` + `0693ec8`) | `services/appDataSource.js:668-690` | `POST /academic-years` | After creating the year, the frontend runs its own non-atomic semester, group-placement and teaching-assignment copies | In the same transaction the server copies student group placements and returns `rollover`. It does **not** copy teaching assignments: it creates no semesters, so each predecessor assignment is skipped with `INCOMPLETE_OR_UNAVAILABLE_CONTEXT` (verified by G1). `POST /academic-years/setup` (`Idempotency-Key` header, `capabilities.integrated_academic_year_rollover_v1`) creates the year, semesters, groups and assignments atomically. | The client group copy is duplicate work (it reports the server's placements as "preserved"). The client semester and assignment copies are still needed with the plain endpoint, but they are not atomic. | **Frontend.** When the capability is true, call `POST /academic-years/setup` and show `rollover` (F/I). Otherwise skip only the group copy. **Backend:** documented in Swagger and `BACKEND_ALIGNMENT_CONTRACTS.md`. |
| M6 (low; not blocking on this DB) | `services/backendContracts.js:74`, `ManagementEditor.jsx:53`, `StudentImport.jsx:98` | `/auth/me` capabilities, `POST /students`, `/students/import` | Student create/import is allowed only with `major_scoped_generations` **or** when the generations list already contains `major_id` + `generation_number` | The capability appears only when `REQUIRE_MAJOR_SCOPED_COHORTS=true`; the local `.env` does not set it | Live: all 6 generations have `major_id` + `generation_number`, so the frontend's fallback unblocks student create/import here. On a database with unmapped legacy cohorts, the UI would be **blocked**. | **Backend config/ops**, not code. After the cohort-mapping preflight (`npm run cohorts:preflight`), enable `REQUIRE_MAJOR_SCOPED_COHORTS=true` (E). Don't advertise the capability without the flag, because that would let new students link to the wrong major's cohort. |

Checked and OK (examples):

- **Auth:** login `{identifier,password}`; `/auth/me` with the full `academic_context` (R); `PUT /auth/password`.
- **Accounts:** paginated `/users` and `/students` with `{data,pagination{page,limit,total,total_pages}}`; `POST/PUT /users` with nullable gender; `POST /users/:id/departments`. The lecturer import password `password@1235` meets the 6–72 character rule.
- **Academic setup:** departments, majors (`department_id` string), semesters, courses (explicit code).
- **Curriculum:** course-year rules and revisions. Rule edits go through `/revisions`, so the stripped `effective_academic_year_id` on PUT is never sent.
- **Questions:** surveys, versions (`copy_questions`), questions, reorder.
- **Evaluations:** `create-preview` and `POST /evaluations` (`group_scope` shape matches); `PUT /evaluations/:id/schedule` with an end_at-only body (M); open, close and delete; open/preview and open/confirm (`assigned_survey_version_id` etc.); bulk-create-preview and bulk-create (Q); activity (N); duplicate `409 EVALUATION_EXISTS` at top level (O).
- **Enrollment and groups:** enrollment preview/bulk and reassignment preview/confirm (`confirmed_enrollment_id`, `impact`, `can_confirm`); class-group preview/confirm; `/students/group-options`; `/students/export`; `/student-academic-records`; `POST /student-generations` with `{major_id, generation_number, entry_academic_year_id, starting_year_level}`.
- **Student pages:** `/student/evaluations/history` (semester_number, class_type, section_code, start_year, is_active); survey; the draft 404 message matches exactly ("No saved draft was found for this evaluation"); responses.
- **Results:** `/lecturer/results`, `/lecturer/course-offerings`, `/admin/results`; `_count.enrollments` on `/course-offerings` (P).

## 3b. Backend features the frontend does not use yet

| Backend contract (capability) | Frontend today | Who should act |
|---|---|---|
| `POST /course-offerings/create-with-enrollments/preview\|confirm\|receipts` (`reviewed_assignment_enrollment_v1`) | New-assignment dialog: final save blocked (README) | Frontend integrates (J) |
| `POST /academic-years/setup`, `/:id/complete-setup`, `/initialize` (`atomic_academic_year_setup_v1`, `integrated_…`) | Non-atomic client copies (M5) | Frontend |
| `POST /courses` without `course_code` + `Idempotency-Key` (`automatic_course_codes_v1`) | Suggests a code client-side and always sends one | Frontend (G) |
| `publish: true` on `POST /evaluations` (`atomic_evaluation_publication_v1`) | Create then separate `POST /open` (non-atomic) | Frontend (L) |
| `group_scopes[]`, `major_ids[]` on evaluations (`evaluation_group_scopes_v1`, `evaluation_major_filter_v1`) | Singular `group_scope` only | Frontend (A) |
| Result major filter / exports `GET /admin/results/export`, `/lecturer/results/export` | Builds exports client-side | Optional |
| `/lecturer/evaluations`, `/:id/dashboard`, `/:id/comments` | Uses `/lecturer/results` only | Optional |
| `/student/evaluations`, `/:id/submission-status`, `DELETE …/draft` | Uses history/survey/draft only | Optional |
| Cohort mapping `/student-generations/mapping/*`, `/evaluations/participants/preview`, `/surveys/:id/usage`, version archive/delete, single enrollment add/remove | Not used | Admin/ops tools; no action needed |

## 3c. Live flow results (step D, read-only)

Only GET requests were made, plus `POST /auth/login`. Every response was 2xx except the expected ones listed here.

| Role | Requests replayed (as `loadAppData` does) | Result |
|---|---|---|
| Admin `admin@itc.edu.kh` | login, `/auth/me`, `/users` (paged), `/academic-years`, `/evaluations`, `/surveys`, `/departments`, `/course-offerings`, `/admin/results`, `/courses`, `/semesters`, `/student-generations`, `/majors`, `/course-year-rules`, `/students?academic_year_id=5` pages 1–2, survey versions and questions, `/evaluations/1`, `/evaluations/1/activity`, `/course-offerings/1/enrollments`, `/students/51?academic_year_id=5`, `/students/group-options`, `/students/export`, `/admin/results/2` | All 200. All 13 capabilities advertised except `major_scoped_generations`. `survey_id` present, `_count.enrollments` integers, export complete (50/50), activity `{items, next_cursor:null}`. |
| Lecturer `sok.dara` (open evaluation) | login, `/auth/me`, `/lecturer/results`, `/lecturer/course-offerings` | 200. Results: 0 evaluations; the OPEN one is correctly hidden (BR04, closed-only). Offerings `{complete:true,total:2}`. `GET /evaluations` → **403** (expected). |
| Lecturer `lim.sreyneang` (closed) | same | 200. 2 CLOSED evaluations, shape as the frontend expects, no `student_code`/identity fields. `/evaluations` → **403** (expected). |
| Student `e20240001` | login, `/auth/me`, `/student/evaluations/history`, `/academic-years`, `/student/evaluations/:id/survey` | 200. `/auth/me` returns the full `academic_context` (R). History: 2 evaluations, **both already Completed**, contrary to "not submitted". `/survey` on them → **409** "You have already submitted this evaluation" (expected; the UI does not open completed evaluations). `/users` → **403** (expected). |

Live data notes:

- No offering currently has an empty label, null year or null class type, so M2–M4 do not trigger on existing records. They trigger when an admin clears a label, leaves the year blank, or blanks the class type.
- Draft, resume and submit could not be observed: `e20240001` has no unsubmitted evaluation. To observe them, use a student who is a participant in OPEN evaluation 1 and has not submitted yet.

Checks that need a write (not performed, per instructions):

| Check | Request | Why it is a write |
|---|---|---|
| Edit an assignment and clear its label (M2) | `PUT /course-offerings/:id` `section_code:null` | Updates an offering (expected 400 today) |
| Create an assignment with a blank year (M3) / blank class type on edit (M4) | `POST`/`PUT /course-offerings` | Creates/updates an offering |
| Create a year and observe the duplicate rollover (M5) | `POST /academic-years` | Creates a year, placements, offerings |
| Evaluation create preview/confirm, bulk preview/confirm | `POST /evaluations/create-preview`, `/bulk-create-preview`, `/evaluations`, `/bulk-create` | Previews store an expiring review record; confirm creates evaluations |
| Enrollment, class-group, reassignment, open, apply-to-unfinished previews | the respective `…/preview` | Store review records |
| Extend deadline | `PUT /evaluations/1/schedule` `{end_at}` | Changes the schedule and writes an activity event |
| Student draft and submit | `PUT …/draft`, `POST …/responses` | Saves answers / final submission |
| Password change, student create/import | `PUT /auth/password`, `POST /students`, `/students/import` | Account and student writes |

Recommendation: run these on the e2e database (`teacher_evaluation_test`) during phase 2, as e2e tests rather than by hand.

## 4. Backend changes

| Change | Effort | Risk | Migration | Touches | Tests to add |
|---|---|---|---|---|---|
| B1 (**done**, `51664ba`): Commit `survey_versions.survey_id` in the evaluation include (M1) | S | Low | No | K (list metadata) | Unit: list/detail include `survey_versions.survey_id`; e2e: `GET /evaluations` returns it as a string |
| B2 (**done**, `d8109e6`; null clears, `""` stays 400): Accept `section_code: null`/blank on `PUT /course-offerings/:id` as clear-to-NULL (M2) | S | Low (label is display-only; duplicate identity already excludes it) | No | J, BR08 | Unit: null clears, omitted preserves, `"  "` clears or 400 (decide), >50 chars → 400; e2e: edit unlabelled offering succeeds; duplicate identity still 409 |
| B3 (**done**, `e2ee856`, corrected `e27c8b4`/`0693ec8`): Document in OpenAPI what `POST /academic-years` copies (groups yes, assignments no) and the `rollover` result (M5) | S | Low | No | F, I | Swagger snapshot / e2e asserts `rollover` key |
| B4 (ops, **open**): Run `cohorts:preflight`, map legacy cohorts, set `REQUIRE_MAJOR_SCOPED_COHORTS=true` (M6) | M | Medium (data review) | No new schema; reviewed mapping via existing endpoints | E | Existing cohort e2e with the flag on; `/auth/me` advertises `major_scoped_generations` |

There are no new endpoints to build. Every route the frontend calls already exists.

## 5. Proposals for the frontend team

These stay on the frontend because changing the backend would weaken a rule:

1. **M3:** make "Student year" required when creating an assignment (`LecturerAssignments.jsx:207`). The backend requires an approved curriculum year (H); accepting null would reopen the curriculum bypass.
2. **M4:** omit `class_type` when blank on edit instead of sending `null`. Class type is part of assignment identity (J).
3. **M5:** when `integrated_academic_year_rollover_v1` is true, use `POST /academic-years/setup` (with the `Idempotency-Key` header) and show the server's `rollover`; retire the client-side copies (F/I). With the plain `POST /academic-years`, skip only the client group copy: the semester and teaching-assignment copies are still needed.
6. **G2:** detect "no saved draft" by status 404, not by the exact message.

The detailed version, with file references, is `docs/FRONTEND_PROPOSALS.md`.
4. Adopt the advertised atomic contracts (J, G, L, A) from section 3b so the remaining "blocked" UI states can be enabled.
5. **Tests:** 69 of 524 Vitest tests fail under Node 24.16. 68 are in `App.test.jsx`: 65 unhandled "RequestInit: Expected signal to be an instance of AbortSignal" errors, likely from react-router + jsdom on Node 24, which in turn cause timeouts and missing elements. The other failure is `studentProgressExport.test.js:94`, where the expected file name lacks `-report`. All 69 use mocked fetch, so none is API-related. Run the suite on Node 22 LTS, or pin `undici`/`jsdom`. The build passes; there is a warning that the main chunk exceeds 500 kB.

## 6. Recommended order (phase 2, one branch, one change at a time)

1. B1: commit `survey_id` with tests. **Done.**
2. B2: `section_code: null` clears the label on update, with tests. **Done.**
3. B3: OpenAPI documentation for `POST /academic-years` rollover. **Done.**
4. Write-path checks from section 3c, as e2e tests on `teacher_evaluation_test`. **Done** for the gaps found (G1–G3); the other flows already had e2e coverage.
5. B4 (**open**): cohort preflight and flag enablement, only after reviewing the mapping with you.

Then hand section 5 to the frontend team.

## Old mismatches re-check (E)

| Old mismatch | Status | Evidence |
|---|---|---|
| 1. New generation sent only a name; backend needs `major_id` | **Fixed** | `backendContracts.js:80` sends `generation_number, major_id, entry_academic_year_id, starting_year_level`, which matches `CreateStudentGenerationDto` |
| 2. Assignment edit sent `section_code: null` | **Fixed on the backend** (`d8109e6`) | `appDataSource.js:556` still sends null; the backend now accepts it and clears the label (M2) |
| 3. `year_level` shown optional; backend requires it | **Still present (changed location)** | The new-assignment dialog (`CreateTeachingAssignments`) now enforces an approved year, but `LecturerAssignments.jsx:207` still marks it Optional (M3) |

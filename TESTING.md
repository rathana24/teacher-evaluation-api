# Backend testing and evaluation guide

Use this guide to evaluate every backend feature with repeatable steps and recorded evidence. It describes this repository's current tests and contracts; it is not a claim of certification or complete frontend acceptance.

## 1. Test environment

Run commands from `D:\internship\teacher-evaluation-api` in PowerShell. Dependencies and PostgreSQL must be available. The test runner requires Node.js 20.12 or newer; use the project's installed compatible runtime.

| Database | Use during testing |
| --- | --- |
| `teacher_evaluation_test` | Automated API tests and manual tests with synthetic data. |
| `teacher_evaluation` | Normal backend database. Do not use it for destructive test cases. |

`.env.test.local` must contain `NODE_ENV=test`, `DB_NAME=teacher_evaluation_test`, and a `DATABASE_URL` pointing to that database on `localhost` or `127.0.0.1`. It also needs the app configuration, including JWT settings. Keep credentials private. `DB_NAME` and `DATABASE_URL` refer to the same database, not two databases.

Check configuration first:

```powershell
npm run test:e2e:check
```

Expected: `Test configuration valid: teacher_evaluation_test`. This checks configuration, not database connectivity. The test database must already exist. For first setup or after pulling existing migrations, run:

```powershell
npm run test:e2e:migrate
npm run test:e2e:seed
```

These commands deploy existing migrations and upsert synthetic fixtures into the validated test database. They do not reset it. The seed restores baseline test accounts and their passwords, so do not rerun it while another tester is using those accounts. Avoid the general Prisma seed or reset commands for this evaluation.

## 2. Run the automated checks

Run each command separately and inspect its exit code and summary before continuing:

```powershell
npm test -- --runInBand
npm run test:e2e
npm run build
npm run lint
```

- Unit tests verify service rules with mocked dependencies. They cannot establish PostgreSQL transaction behavior or full HTTP authorization.
- API tests start NestJS inside the test process, use Supertest, and connect to real PostgreSQL. You do not need to start a separate server for these tests.
- `test/consistency.e2e-spec.ts` deliberately overlaps operations against real PostgreSQL to check conflicts, rollback and historical preservation. It is included in the full API run.
- Build and lint are supporting checks; passing them does not establish business correctness.

Run one feature or scenario when investigating a failure:

```powershell
npm test -- --runInBand --runTestsByPath src/students/students.service.spec.ts
npm run test:e2e -- --runTestsByPath test/enrollments.e2e-spec.ts
npm run test:e2e -- --runTestsByPath test/consistency.e2e-spec.ts
npm run test:e2e -- --runTestsByPath test/consistency.e2e-spec.ts -t "concurrent final submissions"
npm run test:e2e -- --runTestsByPath test/integration.e2e-spec.ts
```

Keep API runs sequential on this shared test database. `--runInBand` is already configured by the runner. After a fix, rerun the failing suite and then the full relevant regression run.

To save machine-readable results, use a new output directory per evaluation:

```powershell
New-Item -ItemType Directory -Force .tmp/test-evaluation-01
npm test -- --runInBand --json --outputFile=.tmp/test-evaluation-01/unit.json
npm run test:e2e -- --json --outputFile=.tmp/test-evaluation-01/api.json
npm run test:cov -- --runInBand
```

Coverage opens at `coverage/lcov-report/index.html`. Review uncovered decision branches, particularly authorization, eligibility, history and error handling. Coverage percentage alone is not an acceptance result, and the current configuration has no enforced coverage threshold.

Previously saved results: 39 unit suites / 476 tests and 17 API suites / 334 tests passed. The API total includes 23 consistency/recovery tests; do not add those 23 again. These are prior results, not a fresh execution of all tests when this guide was written. Record your own run and any changed totals. The prior lint run had six warnings and no errors.

## 3. Use one test-case structure

For each operation, cover these applicable categories:

| Category | What to check |
| --- | --- |
| Valid flow | Correct role, valid data, expected response and exact intended database change. |
| Invalid input | Missing required fields, malformed IDs, wrong types, invalid dates/enums and boundary values. |
| Authentication and authorization | Missing/invalid/revoked token, wrong role, another user's or lecturer's resource. |
| Duplicate and missing resource | Duplicate create/submit, unknown ID, deleted or unavailable dependency. |
| State and history | Archived sets, DRAFT/OPEN/CLOSED evaluations, saved drafts, completed work, preserved historical IDs. |
| Concurrency and rollback | Overlapping writes cannot cause partial changes, duplicate responses or lost updates. |
| Privacy and response contract | Correct field types, pagination/filter behavior, no credential leaks or response-to-student linkage. |

Record: case ID, feature/requirement, role, preconditions, fixture IDs, request/steps, expected HTTP status/body, expected database change, actual result, evidence, and status. Use **PASS**, **FAIL**, **BLOCKED**, or **NOT TESTED**. An unspecified school policy is BLOCKED, not PASS.

Common status meanings: 400 invalid request/business input; 401 unauthenticated; 403 forbidden; 404 unavailable resource where the endpoint specifies it; 409 duplicate, stale state or write conflict. Password-change throttling returns 429. Use the individual endpoint's Swagger contract for the exact expectation: creation, update and deletion do not all share one success status.

For every rejected mutation, verify that no unintended row, answer, enrollment or participant change was committed. A status code alone is insufficient evidence.

## 4. Feature checklist and existing test locations

All route prefixes below start with `/api`. "No dedicated API suite" means other tests may use the feature as setup, but that is not a complete test of its endpoints. A controller test that only checks `should be defined` does not prove HTTP behavior.

| Feature / route | Required evaluation cases | Existing automated starting point |
| --- | --- | --- |
| Startup, Prisma, health, Swagger | Test database connection; `/health`; `/docs`; BigInt IDs serialize as strings; validation strips unknown fields; browser CORS for allowed frontend origin. | `src/app.controller.spec.ts`; API suites exercise startup/Prisma. Bootstrap/Swagger/CORS need separate manual verification. |
| Authentication `/auth` | Email and student-code login; wrong password; inactive account; `/me`; password change, old token revocation, password boundaries and sixth password-change attempt in a minute. | `src/auth/*.spec.ts`, password guard spec, Auth cases in `test/app.e2e-spec.ts`. Full password HTTP flow needs additional evaluation. |
| Users `/users` | Account CRUD, search/pagination, duplicate email/code, role/status changes, protected deletion, department membership and primary department. | `src/users/*.spec.ts`, `test/users.e2e-spec.ts`. |
| Departments `/departments` | CRUD, duplicate code/name rules, status, unknown ID, deletion with dependents, non-admin writes denied. | `src/departments/*.spec.ts`; no dedicated API suite. |
| Majors `/majors` | CRUD, department association, duplicate code, missing department, dependent deletion. | `src/majors/*.spec.ts`; no dedicated API suite. |
| Academic years `/academic-years` | CRUD, start year, active-year rules, duplicate names, dependent deletion, historical preservation. | `src/academic-years/*.spec.ts`; no dedicated API suite. |
| Semesters `/semesters` | Explicit semester number within academic year, duplicate context, missing year, date validation and dependent deletion. | `src/semesters/semesters.service.spec.ts`, `test/semesters.e2e-spec.ts`. |
| Student generations `/student-generations` | CRUD, entry year association, duplicates, effective year calculation, protected deletion. | `src/student-generations/*.spec.ts`; no dedicated API suite. |
| Students `/students` | Atomic account/profile/initial placement creation, optional fields, duplicates, selected-year filters, normalized group options, update/delete protections. | `src/students/students.service.spec.ts`; consistency cases cover selected flows. No dedicated CRUD API suite. |
| Academic records `/student-academic-records` | One placement per student/year, explicit major/group/year level, 1 and 5 boundaries, reject 0/6, selected-year override, later changes preserve past assignments. | `src/student-academic-records/*.spec.ts`, related students specs; no dedicated API suite. |
| Bulk class group `/students/bulk/class-group` | Exact profile IDs and selected year, normalized group, all-or-nothing if any placement is missing, race with individual edit, no automatic enrollment move. | Students service spec and `test/consistency.e2e-spec.ts`. |
| Import `/students/import` | Valid rows, duplicate normalized codes, existing account skipped, unknown/ambiguous major, password bounds, row failure reporting without partial account/profile. Successful other rows remain imported by design. | `src/students/student-import.service.spec.ts`; no dedicated API suite. |
| Export `/students/export` | Correct year/semester/group scope, empty scope, progress totals, context required, no passwords or anonymous answer linkage. Participation export is identifiable staff data and must remain ADMIN-only. | `src/students/student-export.service.spec.ts`; no dedicated API suite. |
| Student progress | Active versus upcoming/expired/CLOSED evaluations, submitted counts, deduplication and zero denominator, selected placement context. | `src/students/student-evaluation-progress.service.spec.ts`; verify fields through student list/detail/export HTTP responses. |
| Courses `/courses` | CRUD, duplicate course code, input validation, protected dependent deletion, authorization. | Courses cases in `test/app.e2e-spec.ts`; no dedicated course service spec. |
| Curriculum `/course-year-rules` | Course/major/year/class-type association, filtering, duplicates, invalid dependencies, year boundaries. Do not invent expected effective-year/revision rules. | `src/course-year-rules/course-year-rules.service.spec.ts`; no dedicated API suite. |
| Offerings `/course-offerings` | Valid course/lecturer/semester/context, duplicate uniqueness, COURSE/TD/TP distinction, saved A-only/A+B scopes, update/delete protections. Section text cannot establish eligibility. | Course offerings service spec, `test/course-offerings.e2e-spec.ts`, consistency suite. |
| Lecturer offerings `/lecturer/course-offerings` | Only owned offerings, filters and missing/wrong-role token. A second lecturer cannot see the first lecturer's assignments. | Lecturer offerings controller spec; no dedicated API suite for this route. |
| Enrollment `/course-offerings/:offeringId/enrollments` | Single/bulk/preview use the same ACTIVE/year/generation/major/year-level/group rules; exact confirmed account IDs; A-only rejects B; A+B accepts both; duplicates and legacy no-scope behavior. | Enrollment service spec, `test/enrollments.e2e-spec.ts`, consistency suite. |
| Reassignment under enrollment route | Preview/confirm only intended account; compatible saved scopes; protected draft/completed work; stale preview and concurrent draft saving; full rollback. | Enrollment service spec and consistency suite. |
| Question sets `/surveys` | Atomic first version, title uniqueness, usage, update, archive, continuing existing assignments, reject new archived assignments, protected delete. | Survey lifecycle spec, `test/surveys.e2e-spec.ts`, consistency suite. |
| Versions `/surveys/:surveyId/versions` | Clone preserves previous version, sequential version numbers, same-set ownership, archive/delete restrictions, latest checks, no silent empty-version fallback. | Version service/lifecycle specs, `test/survey-versions.e2e-spec.ts`, consistency suite. |
| Apply newer version to unfinished | Move only safe same-set participants; keep drafts and submitted users pinned; safe NULL-version movement; reject superseded target; overlapping draft save rolls back; repeat under unchanged eligibility moves zero. | Version lifecycle spec and consistency suite. Separate reviewed preview/receipt remains pending. |
| Questions `/survey-versions/:versionId/questions`, `/questions/:questionId` | All six types, valid options, type-specific bounds, option ownership, reorder uniqueness/atomicity; assigned and older questions immutable; edit/use race. | Question lifecycle spec, `test/questions.e2e-spec.ts`, `test/questions-reorder.e2e-spec.ts`, consistency suite. |
| Evaluations `/evaluations` | Participant preview/exact confirmation, frozen targets, schedule validation, DRAFT -> OPEN -> CLOSED, stale version create/open, archived continuity, duplicate/delete restrictions. | Evaluation service/lifecycle specs, `test/evaluations.e2e-spec.ts`, consistency suite. |
| Student access `/student/evaluations` | Assigned-only list/history/survey/status, correct effective version, active schedule, already submitted, inactive/nonparticipant/wrong role. | Student access service spec, `test/student-access.e2e-spec.ts`. |
| Drafts `/student/evaluations/:id/draft` | Save/read/replace/delete, ownership, partial answer contract, all question types, version pinning, closed/unassigned access, saving after submit and races. | Draft service spec, `test/assessment-drafts.e2e-spec.ts`, consistency suite. |
| Final response `/student/evaluations/:id/responses` | All required answers, six types, bounds/options/duplicate question rejection, active schedule, submit once, draft removed, exactly one anonymous response under concurrent submission. | Submission service spec, `test/submissions.e2e-spec.ts`, consistency suite. |
| Lecturer dashboard `/lecturer/evaluations`, `/:id/dashboard` | Owned evaluations, response rate and counts, zero responses, OPEN/CLOSED visibility, other lecturer denied, actual submitted-version questions. | Dashboard service spec, `test/lecturer-dashboard.e2e-spec.ts`, consistency suite. |
| Comments `/lecturer/evaluations/:id/comments` | Owned evaluation, only appropriate text answers, actual response version, no student linkage, missing/foreign resource. | `test/comments.e2e-spec.ts`, consistency suite; no dedicated comments service spec. |
| Results `/admin/results`, `/admin/results/:lecturerId`, `/lecturer/results` | Role/ownership, hand-calculated aggregates, six types, V1/V2 separated, unknown version count explicit, no response-to-student linkage. Legacy dashboard flat shape is distinct from canonical per-version results. | Results service/controller specs and consistency suite; no dedicated API suite for complete results authorization/aggregation. |
| Historical recovery operator tool | Synthetic records only: evidence required, ambiguous preserved, dry-run unchanged, apply/rollback idempotence, fingerprint drift rejects whole batch, timestamps/answers unchanged. | Recovery cases in `test/consistency.e2e-spec.ts`; CLI packaging/backup/restore needs separate operator evaluation. See recovery guide. |

## 5. Manual API evaluation with Swagger or Postman

Start an isolated test server after the configuration check and test seed above:

```powershell
npm run build
node -e "require('./test/run-e2e.cjs'); require('./dist/main.js');"
```

This loads the validated test environment before starting NestJS. Normal `npm run start:dev` uses the regular environment. The test server uses the configured `PORT`, default 3000. Stop it with Ctrl+C when finished.

Open `http://localhost:3000/api/docs` (adjust the port if configured differently). The test seed provides these synthetic accounts with password `Password123`:

| Role | Login identifier |
| --- | --- |
| ADMIN | `admin@itc.edu.kh` |
| LECTURER | `sokdara@itc.edu.kh` |
| Second LECTURER | `chanthy@itc.edu.kh` |
| STUDENT | `student1@itc.edu.kh`, `student2@itc.edu.kh`, `student3@itc.edu.kh` |

POST `/api/auth/login` with `{ "identifier": "admin@itc.edu.kh", "password": "Password123" }`. Copy `access_token` into Swagger Authorize. In Postman use Bearer Token authorization. Keep separate tokens for each role; repeat authorization checks with the second lecturer and another student.

Create your own uniquely named fixtures, such as `MANUAL-20261007-01`, and record every returned ID. Do not hard-code ID `1`, edit baseline `E2E BASE` fixtures, or run manual mutations alongside the automated suites.

Important ID distinction: student CRUD and bulk placement use **student profile IDs**; enrollment, reassignment and `confirmed_student_ids` use **account IDs**. Both are returned as strings. Test the correct IDs deliberately; accidental equality between profile/account IDs can hide a bug.

Follow this dependency order for a complete new scenario:

1. ADMIN creates department, major, academic year, semester and generation; creates lecturer and students with selected-year placements.
2. Creates course, curriculum rule and offering with explicit scope. Use group A plus an otherwise similar B student and another-generation A student as negative controls.
3. Previews enrollment; checks the exact account IDs; confirms; verifies only intended enrollments exist.
4. Creates a question set and its questionnaire. Cover `RATING`, `TEXT`, `AGREEMENT`, `FREQUENCY`, `MULTIPLE_CHOICE`, and `CHECKBOX`; prepare answers according to each question's configured bounds/options.
5. Previews evaluation participants; creates the evaluation with reviewed `survey_version_id` and exact confirmed IDs; records frozen membership; sets a valid schedule and opens it.
6. STUDENT sees only the assigned survey; saves and reloads a draft; submits once. Verify draft removal, completed status, rejection of a second submission and exclusion of an unassigned student.
7. LECTURER checks the owned evaluation list; the second lecturer is denied access to the first lecturer's dashboard/comments. The owner's dashboard/comments return 409 until the evaluation closes.
8. ADMIN creates V2 while a different student has a V1 draft. Applying the latest version keeps that draft pinned; only safe unfinished participants move. Submit appropriate V1 and V2 answers and verify separate canonical version results.
9. Test stale creation/opening against a newer version, A-only/shared scope rejection/acceptance, and historical preservation after a later placement change. Do not expect a new route for intentional older-version retention: that contract is pending.
10. Close the evaluation; verify student writes return 409. LECTURER checks counts, comments and canonical version results; ADMIN checks aggregate results. Record protected deletion behavior. Clean up only your own disposable fixture IDs where permitted; retain evidence needed for reviewing protected history.

For aggregate accuracy, prepare a tiny known dataset. For a rating question permitting 2 and 4, two answers of 2 and 4 must have mean 3 and count 2 in that version's result. Keep V1 and V2 calculations separate; compare expected checkbox/choice counts against each selected option, not just the total participant count. Submitted/assigned response rates need the exact frozen denominator used by the endpoint.

## 6. Frontend requirement evaluation

Run the full suites and then review these demonstrations against [the implementation review](docs/BACKEND_PROJECT_REPORT.md#7-backend-improvement-requirements-and-delivery-status):

| Handoff requirement | Demonstration and remaining acceptance limit |
| --- | --- |
| 1. Eligibility | A-only versus A+B; wrong year/generation/major/year-level/group; inactive account; consistent single/bulk/reassignment behavior; documented legacy behavior. |
| 2. Concurrency | Run consistency suite; inspect complete snapshot or 409, full rollback and reviewed retry. Signed context tokens and durable receipts remain pending, so current tests cannot establish those proposed behaviors. |
| 3. Questionnaire lifecycle | Stale explicit version and stale opening return 409; empty latest has no fallback; assigned questions immutable; archived assignment continues. Intentional older-version opening and mandatory explicit-version policy remain pending. |
| 4. Progression exceptions | Test existing generation formula and explicit placement overrides, years 1-5, preservation. Full repeat/pause/transfer acceptance is BLOCKED until school policy is specified. |
| 5. Apply to unfinished | Saved drafts/completions protected, same-set latest only, safe NULL movement, concurrent rollback. Separate preview/confirmation and durable operation retry acceptance remain pending. |
| 6. Historical metadata | Synthetic recovery scenarios and truthful unversioned counts. Passing them does not authorize school data recovery or prove official provenance/backup recovery. |
| 7. Curriculum/title policy | Test current rule CRUD and global title uniqueness. Effective-year/revision and department ownership decisions remain pending. |
| 8. Labels/privacy | Verify preserved IDs/group strings, current-label behavior, whole anonymous aggregates and scope restrictions. Immutable historical labels remain a school decision. |

A concurrent confirmation may serialize before a later placement/status change. A complete reviewed snapshot followed by that later change can be valid. Require consistent atomic history or a conflict; do not demand 409 for every overlap. Deterministic overlap tests in the consistency suite are stronger evidence than manually clicking Submit twice.

## 7. Record results and decide acceptance

Copy [the evaluation template in Appendix C](docs/BACKEND_PROJECT_REPORT.md#appendix-c-reusable-evaluation-record) for each test round. Capture timestamp, workspace revision/change summary, environment, commands, counts, case evidence and defects. Use synthetic evidence and omit passwords/tokens from screenshots and reports.

Prioritize missing dedicated API coverage for students, academic structure, curriculum, import/export, lecturer offerings and full results/password authorization. Setup calls and mocked service tests do not replace those checks. Browser CORS, bootstrap wiring, load behavior and a backup/restore drill also need separate evaluation; the functional suite does not establish them. Agree school load targets before performance testing; record concurrent users, data volume, latency, errors and PostgreSQL behavior on a suitable test environment.

Accept a feature only when applicable cases pass, expected database effects are verified, and material defects are resolved. Record unresolved policy/contract items as BLOCKED. A passing test count is useful evidence, but does not make all eight frontend requirements complete.

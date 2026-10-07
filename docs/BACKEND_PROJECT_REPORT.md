# Teacher Evaluation Backend: Consolidated Project Report

**Project:** `teacher-evaluation-api`

**Purpose:** Academic reporting, professor review, backend evaluation and frontend handoff

**Reporting date:** 7 October 2026

**Evaluated workspace:** Uncommitted changes based on `ca33a3464ad3c1bf656b2c6b0055a4b9a369da0f`

**Delivery status:** Implemented improvements verified; full frontend acceptance and school production readiness remain pending.

This report consolidates the nine previous documents in `docs`, including the technical Word document. Repeated explanations are combined, older test counts are superseded by the latest recorded evaluation, and proposed behavior is distinguished from implemented behavior. The separate source documents have been replaced by this report in Markdown and Word formats.

## Contents

1. [Project overview and contribution](#1-project-overview-and-contribution)
2. [Architecture and technology](#2-architecture-and-technology)
3. [Users, permissions and privacy](#3-users-permissions-and-privacy)
4. [Database and core concepts](#4-database-and-core-concepts)
5. [Functional scope](#5-functional-scope)
6. [Complete school workflow](#6-complete-school-workflow)
7. [Backend improvement requirements and delivery status](#7-backend-improvement-requirements-and-delivery-status)
8. [Frontend integration contracts](#8-frontend-integration-contracts)
9. [Testing and quality evaluation](#9-testing-and-quality-evaluation)
10. [Historical metadata recovery](#10-historical-metadata-recovery)
11. [Remaining decisions and next steps](#11-remaining-decisions-and-next-steps)
12. [Presentation and reporting notes](#12-presentation-and-reporting-notes)

Appendices: functional requirement register; API route reference; evaluation template; source-document map.

## 1. Project overview and contribution

The backend supports a school teaching-evaluation system. Administrators configure academic structure and teaching assignments, select the correct students, prepare questionnaires and open evaluations. Students answer their assigned evaluations. Lecturers and administrators view anonymous results through the permissions assigned to their roles.

The system handles more than basic record creation and editing. Its central responsibility is to keep academic scope and evaluation history consistent when class groups, student placements or questionnaires change.

For example, two groups can study the same course but attend different TD/TP offerings. A questionnaire intended for group A must not include group B simply because both study that course. If a student later moves from A to B, the school must still retain the original evaluation's confirmed membership. If questions change from V1 to V2, saved drafts and completed answers must keep the questionnaire they used.

The design follows this process:

```text
Make academic scope explicit
    -> Preview eligible students
    -> Review exact identifiers
    -> Confirm atomically
    -> Preserve evaluation history
    -> Report answers using their actual questionnaire version
```

The recent work strengthens shared eligibility checks, transaction consistency, questionnaire protection, version application, reporting and test isolation. It also provides verified historical-metadata recovery tooling and documents the decisions that cannot be made by implementation alone.

**Current conclusion:** the implemented behavior passed the latest regression and critical HTTP evaluation. Several follow-up requirements still need frontend contracts or school policies. Passing tests does not establish that all requirements are complete or that production deployment is ready.

## 2. Architecture and technology

```text
Frontend / API client
    -> NestJS controllers
    -> JWT authentication and role/ownership checks
    -> Request validation
    -> Business services
    -> Prisma database access and transactions
    -> PostgreSQL
```

This diagram describes responsibilities; middleware, guards and validation execute according to the NestJS request lifecycle.

| Layer / technology | Responsibility |
| --- | --- |
| NestJS 12 and TypeScript | Application modules, HTTP routes and typed service code. |
| Controllers | Receive requests, apply guards, parse identifiers and call services. |
| DTOs, class-validator, class-transformer | Define request fields and validate types, values and business context. |
| JWT and Passport | Authenticate accounts; guards enforce role access. Services enforce ownership and eligibility. |
| Business services | Academic placement, targeting, lifecycle rules, history protection and transaction behavior. |
| Prisma | Database models, queries and transaction access. |
| PostgreSQL | Persist accounts, academic structure, membership, versions, drafts and anonymous responses. |
| Swagger / OpenAPI | Publish the current API contract at `/api/docs`. |
| Jest, ts-jest and Supertest | Unit, API, integration and PostgreSQL consistency verification. |

The API base path is `/api`. Existing update routes generally use `PUT`; lifecycle actions use explicit POST routes such as `open`, `close`, `archive` and `apply-to-unfinished`.

Recent competing mutations run inside serializable PostgreSQL transactions. Validation and writes use the same transaction snapshot. Nested service operations reuse that transaction instead of opening a separate one. A write conflict or transaction expiry is exposed as `409 Conflict`, with the operation rolled back.

The shared wrapper currently uses a 5-second transaction-acquisition wait and a 20-second transaction timeout. These implementation limits are not a measured school-capacity target. Import keeps separate transactions per row, and recovery uses its own operator transaction settings.

## 3. Users, permissions and privacy

| Role | Main responsibilities | Access boundary |
| --- | --- | --- |
| ADMIN | Academic setup, accounts/students, placement, curriculum, offerings, enrollment, questionnaires, evaluations, imports/exports and administrative results. | Management functions require the appropriate role and business-state checks. |
| LECTURER | View owned teaching assignments/evaluations, anonymous aggregates and written comments. | Ownership is checked; another lecturer's dashboard/comments are denied. |
| STUDENT | View assigned evaluations/history, load the effective questionnaire, manage a draft and submit once. | Operates on the authenticated student's assignment; does not choose another student identity in the request. |

Accounts support email or student-code login through the `identifier` field. Password operations include validation and authentication-version revocation of existing tokens when applicable. The password-change guard limits requests to five per account in a minute; this is not a claim of general login rate limiting or complete production security hardening.

A draft is identifiable unfinished student work. A final response stores content without a student ID or participant ID. The participant row records completion separately. Reports must not create a join from anonymous response content back to the student.

Student participation exports are identifiable administrative data, even though final answer reports are anonymous. Their access and sharing must remain separate. Existing JWT, role, ownership and response separation checks are implemented protections; a comprehensive security audit and stronger production HTTP hardening were not part of this improvement handoff.

## 4. Database and core concepts

### 4.1 Configured databases

The project uses PostgreSQL and currently has two local database configurations. The application connects to one at a time.

| Database | Configuration | Purpose |
| --- | --- | --- |
| `teacher_evaluation` | `.env` | Normal backend data. Whether it is the official school database remains unconfirmed. |
| `teacher_evaluation_test` | `.env.test.local` | Isolated synthetic data for automated API tests and controlled manual evaluation. |

Only one database is needed to run a deployed backend. A separate test database protects normal records because tests create, change and delete fixtures. Both databases can run on the same PostgreSQL server. `DATABASE_URL` and `DB_NAME` refer to the same selected database; they do not represent additional databases.

No schema change, migration, reset, historical backfill or credential replacement was performed against the normal database during this work. A separate school production database is not configured in the inspected local project.

### 4.2 Important relationships

```text
User account
  + Student profile -> Generation
  |                    -> Academic-year placement -> Major / Year / Group
  + Lecturer role

Course -> Curriculum rule -> Major / Year / Class type
  -> Course offering -> Lecturer / Semester / Explicit group scopes
      -> Enrollment
      -> Evaluation -> Questionnaire version -> Questions / Options
          -> Frozen group/generation targets
          -> Participant -> Identifiable draft / Completion flag
          -> Anonymous response -> Answers / Selected options
```

Participant identity and anonymous response content both belong to evaluation context, but there is no direct response-to-student or response-to-participant identifier in the final response model.

| Concept | Meaning |
| --- | --- |
| Account (`users`) | Authentication identity and role/status. |
| Student profile (`students`) | Student code, generation and link to an account. |
| Academic record | One student's explicit placement in one academic year: major, year level and optional group. |
| Course-year rule | Curriculum association between course, major, year level and configured class type. |
| Course offering | A concrete course delivery by a lecturer in a semester. |
| Offering group scope | The configured academic/group context served by an offering. |
| Enrollment | Account membership in a course offering. |
| Survey / named question set | Reusable questionnaire identity and title. |
| Survey version | A questionnaire version with its own questions/options and lifecycle. |
| Evaluation | Scheduled collection of responses for an offering and assigned version. |
| Evaluation group/generation target | Confirmed targeting context retained for an evaluation. |
| Evaluation participant | Frozen assignment of a student account to an evaluation. |
| Assessment draft | Identifiable unfinished answers and saved questionnaire version. |
| Response and answers | Anonymous final content and its actual saved version. |

Account IDs and student profile IDs are different. Student CRUD/bulk placement uses profile IDs; enrollment, reassignment and participant confirmation use account IDs. API output serializes BigInt identifiers as strings. Follow each request DTO: some existing course/semester input fields remain numeric.

### 4.3 Placement and group rules

A group belongs to an academic-year placement, not globally to an account. Group `A` in one generation/major is different from group `A` elsewhere. Matching needs the relevant academic year, generation, major, year level and normalized group.

An explicit record takes precedence for the selected year. When suitable numeric year information exists, generation-based progression can calculate a year without requiring ordinary annual placement rows merely to repeat that formula. With starting year 1, a generation entering in 2026 normally resolves to year 2 in 2027. An explicit record can override the selected-year placement; how repeats, pauses and transfers affect subsequent years is still a school decision.

The current program bounds are years 1-5. Unsupported automatic progression is reported as not started, beyond program or unavailable; it is not silently forced into those bounds.

New group writes trim outer spaces, collapse repeated internal spaces, uppercase and enforce a maximum of 50 characters. For example, `"  group   b "` becomes `"GROUP B"`. Empty values become null where the field is nullable. Unknown historical strings are preserved until an explicit write changes them.

## 5. Functional scope

| Feature group | Current responsibilities / modules |
| --- | --- |
| Authentication and accounts | `auth`, `users`: login, own profile/password, role/status management and department membership. |
| Academic structure | `academic-years`, `semesters`, `departments`, `majors`, `student-generations`. |
| Students and placement | `students`, `student-academic-records`: profiles, selected-year context, group options and bulk group changes. |
| Import/export/progress | Student import, export and evaluation-progress services. |
| Course and curriculum | `courses`, `course-year-rules`: reusable subjects and major/year/class associations. |
| Teaching assignments | `course-offerings`: offering metadata, explicit group scopes and lecturer-owned assignments. |
| Membership | `enrollments`: single/bulk enrollment, preview/confirmation and deliberate reassignment. |
| Questionnaire management | `surveys`, `survey-versions`, `questions`: atomic initial version, cloning, edits, ordering, archive and protected deletion. |
| Evaluation management | `evaluations`: participant preview, exact confirmation, frozen targets, schedule and DRAFT/OPEN/CLOSED lifecycle. |
| Student evaluation access | `student-access`, `assessment-drafts`, `submissions`: assigned survey, history/status, unfinished work and final submission. |
| Reporting | `lecturer-dashboard`, `comments`, `results`: owned views and anonymous aggregates with actual-version context. |
| Shared infrastructure | Prisma, role/decorator utilities, ID parsing, class-group normalization, saved-scope matching and transaction binding. |
| Historical operator tooling | Evidence-based review/dry-run/recovery/rollback for nullable version metadata. |

The complete FR01-FR44 functional register is preserved in Appendix A. It describes baseline functions and must be read together with the follow-up acceptance limits in Section 7.

## 6. Complete school workflow

### 6.1 Academic and teaching setup

ADMIN creates academic years, semesters, departments, majors and generations; creates/imports students with placements; maintains course/curriculum rules; and creates offerings for lecturers. New offerings specify COURSE, TD or TP. New semester creation requires semester number 1 or 2; historical null values are not guessed.

The reusable course is different from its offerings. Offering uniqueness considers its delivery context, including year level and class type, so COURSE and TD are not rejected merely because they share a section label.

An offering may serve A only or shared A+B. Its saved group scopes define this membership. `section_code` remains a display label and cannot establish eligibility by itself.

### 6.2 Enrollment

ADMIN chooses offering and academic/group context. The backend previews eligible ACTIVE student accounts, exact IDs, already-enrolled counts and new candidates. Confirmation sends the reviewed context and exact IDs. The backend recomputes eligibility inside the transaction, rejects selection drift with 409 and creates only missing enrollment rows.

Single, bulk and reassignment checks use the same saved-scope matcher. Another year's, generation's or major's same-named group does not qualify. A-only rejects B; A+B can accept both.

For legacy offerings with no saved scopes, single/bulk compatibility remains for valid ACTIVE student accounts; no section restriction is inferred. Bulk still uses its explicit requested context. Group-targeted evaluation creation and reassignment require saved scopes. This exception does not create scope records or rewrite history.

### 6.3 Placement changes and reassignment

Bulk class-group changes use confirmed profile IDs in a selected academic year. Every student must already have a placement in that year; if one is missing, the whole operation is rejected. The write updates the group only and does not invent placements, change passwords or automatically move enrollment/evaluation membership.

A deliberate enrollment move uses a source offering, target offering and account ID. Preview reports compatibility and protected participant/draft/completion impact. Confirmation rechecks the state. If protected work would be damaged, it is blocked. A safe operation moves the enrollment only; frozen participants and placement history remain intact.

### 6.4 Questionnaires and versions

Creating a named set atomically creates V1 in DRAFT. A later version can copy existing questions. All six question types are supported: RATING, TEXT, AGREEMENT, FREQUENCY, MULTIPLE_CHOICE and CHECKBOX. Type-specific bounds, required answers, option ownership and display order are validated.

Editing is restricted to the latest eligible draft version. Any assigned evaluation, including DRAFT, protects its questions/options from mutation. Locked/used historical records cannot be destructively changed or deleted. Reordering is atomic and preserves uniqueness.

For new evaluation creation, the existing explicit `survey_version_id` provides reviewed-version checking. A newer version causes 409; the backend does not silently substitute one. Set-only compatibility validates the actual latest version and rejects an empty/archived latest rather than falling back to an older usable version.

An archived named set rejects new assignments, while existing assignments to a usable version can continue. This does not make an archived version editable or authorize new archived-set use.

### 6.5 Evaluation targeting and lifecycle

Participant selection intersects actual offering enrollment with requested academic/generation/group context and eligibility. Group filters cannot be ignored or silently widened to ALL_ENROLLED. Targeted creation requires exact reviewed account IDs.

Confirmation freezes participants and target records. Schedule editing is DRAFT-only. Opening checks schedule, usable questionnaire, participants and the actual latest version. A superseded draft assignment returns 409 while preserving the assigned version and frozen IDs. An explicit workflow for intentionally retaining an older version at opening is proposed, not implemented.

```text
DRAFT: review targeting and edit schedule
    -> OPEN: student writes only during the valid scheduled window
    -> CLOSED: lecturer dashboard/comments become available
```

A confirmed snapshot may validly serialize before a simultaneous later placement/status/enrollment change. Even if the other HTTP request finishes first, transaction ordering can still produce a complete valid earlier snapshot. The requirement is consistent atomic state or a conflict, not 409 for every overlap. Current exact-ID checks do not yet prove every reviewed placement/impact field stayed unchanged; stronger context tokens remain pending.

### 6.6 Student draft and final submission

Student access requires the authenticated assignment and applicable current enrollment/state rules. The evaluation must be OPEN, inside its time window and not already submitted. The student loads the effective questionnaire version, rather than assuming every participant uses the evaluation's base version.

A student can save/reload/update/delete an unfinished draft. Saved work stays tied to its version. Unversioned or version-mismatched historical drafts are not automatically reinterpreted as current questions.

Final submission validates question ownership/type, required fields, configured bounds and option choices. One transaction rechecks access, conditionally marks the participant submitted, creates the anonymous response/answers and removes the draft. Failure rolls back the operation. Concurrent duplicate attempts cannot create two final responses.

### 6.7 Applying a newer questionnaire version

The existing ADMIN route applies only the actual latest version of the same named set to eligible DRAFT/OPEN evaluations. A DRAFT target becomes LOCKED; an already latest LOCKED target can reconcile again. The evaluation's original/base version is preserved.

| Participant state | Application behavior |
| --- | --- |
| Completed | Retain its saved version. |
| Has a saved draft | Retain its saved version and answers. |
| Safe unfinished, no draft | May move to the latest version, including a safe NULL-version participant. |
| Already on target | No duplicate movement. |

A superseded target cannot downgrade participants. Concurrent draft saving can cause the application to roll back atomically. Repeating under unchanged eligibility moves zero. The route resolves current eligibility on each call, so it is not a durable receipt for the original reviewed operation. Separate preview/confirmation and operation receipts remain pending; automatic application must not be enabled without the agreed workflow.

### 6.8 Results, progress, import and export

Lecturer dashboard/comments require ownership and a CLOSED evaluation. Canonical ADMIN/LECTURER results exclude DRAFT evaluations and report actual saved response versions under `version_results`. The flat legacy dashboard/comments shape is retained and is distinct from canonical per-version reporting.

Unknown historical response versions remain explicit through `unversioned_submission_count`; their answers are not attributed to today's questionnaire. Scoped anonymous reporting must preserve whole supported aggregates rather than inventing mixed/unknown subpopulation slices. Student participation export filters do not establish anonymous answer ownership.

Progress distinguishes active, upcoming, expired, completed and closed assignments. Import normalizes new data, skips existing/conflicting identifiers and reports failures without exposing internal details. Each new import row creates its account/profile/placement atomically; other successful rows remain imported when one row fails. This intentional partial batch behavior differs from all-or-nothing bulk placement.

Exports apply valid academic/generation/major/group context, include the placement year represented by group data and retain staff-only identifiable progress boundaries. Missing placement metadata is reported rather than reconstructed from current labels.

## 7. Backend improvement requirements and delivery status

The frontend follow-up in `D:\internship\imp.txt` has eight improvement areas. These are separate from the baseline FR01-FR44 register.

| No. | Improvement | Implemented and evaluated | Remaining acceptance work |
| --- | --- | --- | --- |
| 1 | Offering eligibility | Shared saved-scope checks; ACTIVE accounts; A-only/shared behavior; academic context; documented legacy exception. | School progression exceptions remain part of requirement 4. |
| 2 | Concurrent confirmation | Serializable validation/writes; transaction reuse; conflict rollback; real placement/status/membership/draft/submission races. | Signed context/impact tokens and durable retry receipts. Current exact-ID confirmation is a partial reviewed-snapshot contract. |
| 3 | Questionnaire lifecycle | Stale explicit selection/opening conflicts; actual latest without fallback; assigned-question immutability; archived-set continuity. | Agreed intentional older-version opening; decision on mandatory explicit version for every new caller. |
| 4 | Repeat/pause/transfer policy | Existing generation/selected-year behavior and bounds preserved; later changes do not rewrite history. | School-approved exception continuity/eligibility and any required migration. |
| 5 | Apply newer version to unfinished | Same-set latest only; draft/completion protection; safe NULL handling; atomic races; unchanged-state repeat checked. | Separate reviewed preview/confirm, moved/skipped reasons contract and durable operation receipt. |
| 6 | Historical recovery | Read-only audit; independently verified manifest; fingerprints; dry-run; atomic metadata-only recovery and conditional rollback tested on synthetic data. | Correct official database, provenance, verified backup/restore and approved recovery records. No school backfill executed. |
| 7 | Curriculum/title policy | Current curriculum CRUD and global case-insensitive title uniqueness preserved. | Effective-year/revision and global/department ownership decisions before schema changes. |
| 8 | Historical labels/privacy | Frozen IDs/group strings, existing scope protections and anonymous aggregate boundaries retained. Current referenced labels remain current. | Decide immutable label snapshots and presentation of legacy unknown names. |

Requirements 2, 3, 5, 6 and 8 have partial delivery or pending acceptance; requirements 4 and 7 depend on school decisions. The evaluated implementation is useful and reviewable, but all eight requirements must not be described as finished.

## 8. Frontend integration contracts

### 8.1 Current behavior

Login uses `{ "identifier": "student-code-or-email", "password": "..." }`. Protected calls use `Authorization: Bearer <access_token>`. Student CRUD and bulk placement use profile IDs; enrollment/reassignment/participant confirmation use account IDs.

Frontend confirmation must echo exact preview IDs and context. New evaluations should send the existing reviewed `survey_version_id`. Opening retains frozen membership and the assigned version; it does not automatically update to the latest questionnaire.

| HTTP status | Typical meaning |
| --- | --- |
| 200 | Successful read/update or explicit action where specified; previews use 200. |
| 201 | Creation; bulk enrollment and final submission use 201. |
| 204 | Successful deletion where specified; evaluation deletion uses 204. |
| 400 | Invalid input/answers or missing required business context. |
| 401 | Missing, invalid, expired or revoked authentication. |
| 403 | Wrong role, owner or evaluation eligibility. |
| 404 | Resource unavailable/not found according to the endpoint. |
| 409 | Duplicate, protected state, closed/not-open evaluation, stale review/version or atomic write conflict. |
| 429 | Password-change request limit exceeded. |

The exact endpoint contract takes precedence over this general table. On 409, reload the relevant context, review what changed and confirm again. Do not silently replace questionnaire versions or blindly retry with newly calculated membership.

### 8.2 Proposed behavior requiring agreement

The input handoff states: **"Agree route/DTO changes with the frontend team before implementation."** The following fields/routes are proposals, not delivered API capabilities:

1. Add signed `review_token` values to enrollment, participant, reassignment and bulk-placement impact previews. Bind operation/context, exact selection, relevant placement/status/impact and expiry; drift returns 409.
2. Add a reviewed ADMIN preview/confirmation flow for newer-version application. A proposed preview route is `POST /api/surveys/:surveyId/versions/:versionId/apply-to-unfinished/preview`; output would include impact, moved/skipped reasons and a token without anonymous answer values or identity linkage.
3. Add an explicit older-assignment opening review and confirmation body using `review_token` and `retain_assigned_version_id`. Default opening remains stale-conflicting.
4. Add an operation ID and durable receipt in the same transaction as mutation. Retrying a completed operation would return its original receipt; reusing an ID for a different request would return 409. Storage requires an approved migration.
5. Agree deprecation of set-only creation and whether explicit reviewed version selection becomes mandatory for every new caller.

No token/receipt/retention implementation or associated migration has been added while agreement is pending. The backend alone cannot confirm frontend-team acceptance.

## 9. Testing and quality evaluation

### 9.1 Latest recorded evidence

Fresh tests were run on 7 October 2026. The unit/API runs began at 18:08:38 Asia/Phnom_Penh. Runtime metadata recorded Node.js `v24.16.0` and PostgreSQL `18.4` on the validated test database.

| Verification | Result | Meaning / limit |
| --- | --- | --- |
| Unit suite | 39 suites / 476 tests passed; zero failures/pending tests. | Service/controller rules with mocked dependencies; not complete HTTP/database proof. |
| API/integration suite | 17 suites / 334 tests passed; zero failures/pending tests. | NestJS/Supertest and real PostgreSQL; includes service-level consistency scenarios. |
| Consistency/recovery suite | 23 scenarios passed, included in the 334 total. | Deterministic actual PostgreSQL overlap and preservation checks. |
| Complete integration story | 16 cases passed, included in the 334 total. | Admin -> Student -> Lecturer workflow. |
| Built-server HTTP walkthrough | 80 checks passed. | Includes boot/setup requests, business assertions and cleanup; not 80 additional Jest tests. |
| Build / Prisma validation / whitespace | Passed. | Build and structural checks; no school migration was executed. |
| Lint | No errors, six existing warnings. | Two empty entity files and four unused declarations/imports remain. |

Older source documents mention 453 tests. That is an earlier baseline, replaced in this report by the latest 476 unit tests and 334 API tests. The 23 consistency and 16 integration cases must not be added to the API total a second time.

The source tests are reproducible evidence. Raw JSON/logs and the one-off HTTP script are retained locally under `.tmp/precommit-20261007` and ignored by Git. They are not included in the proposed commit or a school-data export.

### 9.2 Critical observed behavior

The built application was tested through an owned temporary HTTP server using synthetic fixtures. A-only direct B enrollment returned 400; widened bulk confirmation returned 409; both left zero unintended enrollments. Shared A+B preview selected exactly three accounts and excluded group C.

Assigned question editing returned 409 and retained original wording. Stale creation/opening returned 409 while the rejected opening kept DRAFT status, assigned V1 and exact frozen IDs. V2 application protected a V1 draft and completed V1 participant, moved exactly one safe unfinished participant and moved zero on unchanged repetition.

Duplicate submission returned 409. Successful completion removed its draft. Another lecturer's dashboard/comments returned 403 and their result list excluded the evaluation. The owner's dashboard returned 409 while OPEN and 200 after closing. Closed draft writes returned 409.

Canonical results produced three known submissions: V1 ratings 2 and 4 had average 3/count 2; V2 rating 5 had average 5/count 1. Results kept the versions separate and exposed no response-to-student identifier fields. Health, Swagger/OpenAPI and configured-origin CORS preflight also passed. Temporary fixtures were removed by exact owned IDs and the server was stopped.

Initial walkthrough expectations were corrected to match existing success codes and the closed-results rule; those were script expectation corrections, not business-logic fixes. An outdated version-application Swagger description was corrected. Its subsequent build and focused startup/OpenAPI checks passed. Frontend browser behavior was not evaluated.

### 9.3 Reproducing the checks

Run commands separately from the project root and inspect each result:

```powershell
npm run test:e2e:check
npm test -- --runInBand
npm run test:e2e
npm run build
npm run lint
git diff --check
```

For test-database preparation only, when the database exists and existing migrations/fixtures need setup:

```powershell
npm run test:e2e:migrate
npm run test:e2e:seed
```

The runner requires `NODE_ENV=test`, a local PostgreSQL URL targeting exactly `teacher_evaluation_test`, and matching `DB_NAME`. Node.js must support `util.parseEnv` (introduced in 20.12). Configuration validation does not prove connectivity; API runs do. No database reset is required. Seeding restores synthetic baseline account passwords, so coordinate shared test use.

Automated API tests start NestJS themselves. For isolated Swagger/Postman evaluation:

```powershell
npm run build
node -e "require('./test/run-e2e.cjs'); require('./dist/main.js');"
```

Open `/api/docs` on its configured port (default 3000), authorize with a synthetic account token and use uniquely named fixtures. Stop the test server afterward. Normal `start:dev` selects the regular environment and should not be confused with this isolated launch.

Targeted tests and evidence capture:

```powershell
npm test -- --runInBand --runTestsByPath src/students/students.service.spec.ts
npm run test:e2e -- --runTestsByPath test/consistency.e2e-spec.ts
npm run test:e2e -- --runTestsByPath test/integration.e2e-spec.ts
New-Item -ItemType Directory -Force .tmp/evaluation-next
npm test -- --runInBand --json --outputFile=.tmp/evaluation-next/unit.json
npm run test:e2e -- --json --outputFile=.tmp/evaluation-next/api.json
npm run test:cov -- --runInBand
```

Coverage output is `coverage/lcov-report/index.html`. The current configuration has no enforced coverage threshold. Review uncovered decisions, not just a percentage. API runs use `--runInBand`; do not run multiple mutation suites or manual fixture edits simultaneously on the shared test database. Package scripts supply the required ESM VM flag.

For fresh development installation, install the declared dependencies and generate the Prisma client. Configure the intended database explicitly before applying existing migrations. Migration design, production rollout and school recovery are separate approved operator activities; this report does not instruct an automatic production reset or migration.

### 9.4 Quality criteria and coverage gaps

For each feature evaluate valid behavior, invalid input/boundaries, authentication/role/ownership, duplicate/missing resources, lifecycle/history, concurrency/rollback, and response/privacy contracts. Check exact intended database effects, including no unintended changes after rejection.

Record PASS, FAIL, BLOCKED or NOT TESTED. An unspecified school policy is BLOCKED. Passing test counts alone cannot establish feature acceptance.

Dedicated API suites cover courses, users, semesters, offerings, enrollment, questionnaires, evaluations, student access, drafts, submission, dashboards/comments, integration and consistency. Students/academic structure/curriculum/import/export/lecturer-offerings/full results authorization still have gaps in dedicated HTTP coverage; some are exercised as setup or through mocked services, which is insufficient for complete acceptance.

The real-server walkthrough provides targeted additional evidence for academic creation and canonical results/ownership, but does not close every CRUD/filter/error gap. Complete frontend integration, broad browser-origin behavior, school-sized performance, comprehensive security review and backup/restore practice remain unperformed. Agree concurrent-user/data-volume and latency/error targets before a performance assessment.

The root [testing guide](../TESTING.md) gives the complete feature-to-test matrix. Appendix C supplies a reusable evaluation record.

## 10. Historical metadata recovery

### 10.1 Recovery purpose and evidence boundary

`scripts/historical-metadata.cjs` is an operator tool, not a public API or startup migration. Default execution audits nullable response/draft versions and missing official year/semester/offering metadata. It does not guess dates or classes from labels/IDs and does not change schema.

A structural question-ID match is only a candidate. Independent school provenance, such as a contemporaneous questionnaire export and approved version record, is required. Empty/invalid answers, missing questions, wrong-set/options, duplicates or multiple versions remain ambiguous and unchanged.

The earlier read-only inspection found a database mismatch:

| Dataset description | Accounts | Profiles | Evaluations | Submissions | Drafts |
| --- | --- | --- | --- | --- | --- |
| Frontend handoff baseline | 22 | 13 | 17 | 66 | 4 |
| Inspected local normal database | 11 | 2 | 3 | 2 | 1 |

The inspected local database had two unversioned submissions and zero unversioned drafts. These are recorded inspection values, not a fresh census during document consolidation. The official database remains unconfirmed; no data was changed to make the counts match.

### 10.2 Operator procedure

Audit output contains record/question IDs, candidate versions, fingerprints and reasons; it excludes credentials, student identities and exported answer content. Keep administrative audit artifacts private.

```powershell
# Isolated synthetic audit:
node scripts/historical-metadata.cjs review --test --output .tmp/recovery-test-review.json
```

For an approved normal-database audit, omit `--test` only after verifying the intended `.env`/ambient environment. Use a new output filename; existing reports are not overwritten.

Create a manifest only from independently verified records. The fields are:

```json
{
  "schema_version": 1,
  "database_fingerprint": "<copied from the verified database audit>",
  "records": [
    {
      "kind": "response",
      "id": "<reviewed record ID>",
      "fingerprint": "<exact audit fingerprint>",
      "verified_version_id": "<independently verified version ID>",
      "verified_by": "<school verifier>",
      "evidence_reference": "<independent historical evidence>"
    }
  ]
}
```

`kind` can be `response` or `draft`. Placeholder values must be replaced with verified values before use. The database fingerprint prevents a manifest from being used against another host/database/schema. Question/option/set ownership and record fingerprints are rechecked; drift or ambiguity rejects the batch.

```powershell
node scripts/historical-metadata.cjs dry-run --test --manifest .tmp/verified-test-recovery.json
```

School apply/rollback requires the correct database, school evidence approval, a secure complete PostgreSQL backup and a separately tested restore. The CLI checks only a nonempty recognizable PostgreSQL backup header; this cannot establish completeness or recoverability. The following are operator reference commands, not actions executed by this report:

```powershell
node scripts/historical-metadata.cjs apply --manifest '<approved-manifest>' --backup '<verified-backup>' --journal '<new-apply-journal>'
node scripts/historical-metadata.cjs rollback --manifest '<apply-journal>' --backup '<verified-backup>' --journal '<new-rollback-journal>'
```

Apply and rollback each use an atomic serializable transaction. Only nullable version metadata is changed; answers, options, timestamps, credentials, placements, participants and evaluation base versions remain intact. The journal is written before commit to support conditional recovery after interruption. Inspect and dry-run an interrupted operation before retry, with a new journal filename each time.

Repeated apply or completed rollback reports `ALREADY_APPLIED`. Rollback refuses another saved version or changed evidence. Real PostgreSQL synthetic tests covered evidence validation, dry-run, apply/rollback repetition, stale-batch rollback and ambiguous preservation. Official semester/class/year metadata remains reported for review rather than inferred or backfilled.

## 11. Remaining decisions and next steps

| Decision owner | Decision needed | Effect |
| --- | --- | --- |
| Frontend/backend teams | Review tokens, preview/confirm routes, older-version retention and retry receipts. | Finalize route/DTO/operation behavior before implementing the proposal. |
| Frontend/backend teams | Mandatory explicit version selection versus set-only compatibility. | Establish reviewed-save behavior for every caller and any deprecation period. |
| School | Repeat, pause/resumption and transfer continuity; approval and unresolved eligibility. | Define effective placement across later years and APIs without unnecessary normal annual records. |
| School | Curriculum effective academic years and immutable revisions. | Preserve the rule context of existing assignments; determine migration needs. |
| School | Global or department-owned title uniqueness. | Decide ownership and migration; do not merge existing question sets. |
| School | Current versus saved historical labels and unknown-name presentation. | Determine immutable snapshots and legacy limitations. |
| School/operator | Official database, provenance and verified backup/restore. | Establish whether and how historical metadata can be recovered. |

After agreement, implement the remaining contracts/policies, add meaningful acceptance tests, evaluate the actual frontend connection, assess school-sized load and rehearse operational recovery. No approval is inferred from a passing regression suite.

The current delivery can be reviewed as a scoped backend improvement commit. The pre-commit evaluation recorded ignored private environment/temp files, no schema/migration changes and no staging/commit/push. Those are evaluation-time facts; this report does not itself create a commit. A targeted credential-pattern scan passed, but was not a comprehensive secret/security audit.

Suggested commit title: `Protect backend consistency and preserve evaluation history`.

Suggested handoff description: strengthen shared scope checks and serializable mutations; enforce reviewed latest versions; protect assigned questions, drafts and completions; keep response-version reporting truthful; include isolated regression/recovery tests and clear acceptance documentation. State the pending contracts/policies rather than describing the whole follow-up as complete.

## 12. Presentation and reporting notes

### 12.1 Short explanation for a professor

> This backend manages the school's teaching-evaluation process from academic setup to anonymous results. Its main contribution is preserving correct student scope and questionnaire history when placements or questions change. Administrators review exact membership, evaluations retain their confirmed context, students submit once, and reports use the version actually answered. The latest evaluation passed 476 unit tests and 334 API tests, including 23 real PostgreSQL consistency/recovery scenarios. Remaining frontend contracts and school policies are documented, so the tested implementation is not presented as full production readiness.

### 12.2 Suggested demonstration

1. Explain accounts, profiles, placements, offerings and evaluations using the data diagram.
2. Show A-only rejection and shared A+B acceptance with exact preview IDs.
3. Open an evaluation, save a V1 draft and submit another V1 participant.
4. Apply V2: preserve the draft/completion and move only safe unfinished work.
5. Demonstrate stale-version rejection and duplicate-submission prevention.
6. Close the evaluation; compare known V1/V2 aggregates and lecturer ownership.
7. Present regression/race evidence and identify the remaining agreement and test gaps.

Use synthetic test data, not school records or credentials, for the demonstration. The 80-check walkthrough was scripted HTTP verification; do not describe it as a completed frontend browser demonstration.

### 12.3 Engineering lessons

Academic labels need scoped context. Reviewed identifiers require transactional revalidation. Frozen membership protects historical interpretation, while saved questionnaire versions protect answer meaning. Anonymous content must remain separate from identifiable completion tracking. When policy or provenance is unknown, the backend should preserve evidence and report the limitation instead of inventing history.

Future ideas in the original documentation include machine-readable application error codes, stronger HTTP/login protection, broader pagination consistency, richer administrative audit logging, impact visualization and additional privacy-preserving reporting. These remain future ideas, not delivered features or newly added handoff obligations.

## Appendix A. Functional requirement register

This preserves the original FR01-FR44 scope in concise form. Descriptions reflect current contracts; the follow-up limits in Section 7 still apply.

| ID | Functional requirement | Report section |
| --- | --- | --- |
| FR01 | Authenticate the three roles and enforce access control. | 3, 8 |
| FR02 | Manage accounts/status/passwords and linked student profiles. | 3, 5 |
| FR03 | Manage academic years, semesters, departments, majors and generations. | 4-6 |
| FR04 | Maintain one explicit student placement per academic year. | 4.3 |
| FR05 | Resolve selected-year context from explicit placement or supported generation progression. | 4.3, 7 |
| FR06 | Manage course/major/year curriculum rules. | 5, 6.1 |
| FR07 | Manage offerings with lecturer, semester, year/class/section metadata and group scopes. | 4, 6.1 |
| FR08 | Use explicit scopes rather than section labels for group membership. | 6.1-6.2 |
| FR09 | Support single and preview-confirmed group enrollment. | 6.2 |
| FR10 | Select ACTIVE eligible accounts using exact academic/group context. | 6.2 |
| FR11 | Confirm exact reviewed IDs and reject selection drift; stronger impact snapshots remain pending. | 6.2, 7-8 |
| FR12 | Preserve existing enrollment and prevent/skip duplicates. | 6.2 |
| FR13 | Preview and deliberately confirm compatible enrollment reassignment. | 6.3 |
| FR14 | Protect participants, drafts, completion and placement history during reassignment. | 6.3 |
| FR15 | Manage named question sets and metadata. | 6.4 |
| FR16 | Preserve questionnaire versions for assignments and final responses. | 6.4-6.8 |
| FR17 | Restrict question creation/edit/delete/reorder to editable versions. | 6.4 |
| FR18 | Support all six question types with bounds/options/order validation. | 6.4, 6.6 |
| FR19 | Protect locked/used questionnaire data from unsafe mutation/deletion/archive. | 6.4 |
| FR20 | Apply latest same-set versions only to safe unfinished participants. | 6.7, 7 |
| FR21 | Manage DRAFT, schedule, OPEN and CLOSED evaluation lifecycle. | 6.5 |
| FR22 | Preview participants from real enrollment and explicit context. | 6.5 |
| FR23 | Confirm exact participant IDs and reject changed selection. | 6.5, 7 |
| FR24 | Preserve frozen group targets/participants after later placement changes. | 6.5 |
| FR25 | Require valid confirmed participants for targeted opening. | 6.5 |
| FR26 | Enforce assignment/enrollment, active state/window and not-submitted access. | 6.6 |
| FR27 | Keep unfinished drafts on their saved effective version. | 6.6-6.7 |
| FR28 | Validate and store final anonymous answers transactionally. | 6.6 |
| FR29 | Prevent repeat and concurrent duplicate final submission. | 6.6, 9 |
| FR30 | Separate response content from participant identity/completion. | 3, 4 |
| FR31 | Provide student history/status. | 5, 6.6 |
| FR32 | Provide owned lecturer evaluation views, counts, dashboard and comments. | 6.8, 8 |
| FR33 | Provide administrative anonymous results and context. | 6.8 |
| FR34 | Report actual saved response versions without corrupting mixed-version history. | 6.8, 9 |
| FR35 | Return frozen target metadata where available and report legacy unknown context. | 6.5, 6.8 |
| FR36 | Import new students with normalization and protected duplicate/row-failure handling. | 6.8 |
| FR37 | Export valid scoped student data with placement-year labels. | 6.8 |
| FR38 | Provide normalized group options for exact placement scope. | 4.3, 5 |
| FR39 | Bulk-change only groups on existing selected-year placements; reject missing rows atomically. | 6.3 |
| FR40 | Normalize new groups and enforce their 50-character bound. | 4.3 |
| FR41 | Preserve historical unknown group values until explicit update. | 4.3 |
| FR42 | Require explicit semester 1/2 for new creation while preserving historical null metadata. | 6.1, 10 |
| FR43 | Exclude DRAFT evaluations from canonical results; require CLOSED lecturer dashboard/comments. | 6.8, 8 |
| FR44 | Calculate response counts/rates using the evaluation's intended frozen population. | 6.8, 9 |

## Appendix B. API route reference

Prefixes below include `/api`. Consult Swagger for fields, allowed actions, success codes and endpoint-specific protection. A route family's read permissions can differ from its writes; do not assume every authenticated read is ADMIN-only.

| Feature | Current route family / key actions |
| --- | --- |
| Health / documentation | `/api/health`; `/api/docs`; `/api/docs-json`. |
| Authentication | `/api/auth/login`; `/api/auth/me`; `/api/auth/password`. |
| Accounts | `/api/users`; `/:id`; `/:id/departments`; `/:id/departments/:departmentId`. |
| Academic years / semesters | `/api/academic-years`; `/api/semesters`, with `/:id` CRUD. |
| Departments / majors | `/api/departments`; `/api/majors`, with `/:id` CRUD. |
| Generations | `/api/student-generations`, with `/:id` CRUD. |
| Students | `/api/students`; `/import`; `/export`; `/group-options`; `/bulk/class-group`; `/:id`. |
| Placement | `/api/student-academic-records`, with `/:id` CRUD. |
| Courses / curriculum | `/api/courses`; `/api/course-year-rules`, with `/:id` CRUD. |
| Offerings | `/api/course-offerings`, with `/:id` CRUD. |
| Lecturer assignments | `/api/lecturer/course-offerings`. |
| Enrollment | `/api/course-offerings/:offeringId/enrollments`; `/preview`; `/bulk`; `/reassignment/preview`; `/reassignment/confirm`; `/:studentId` deletion. |
| Named question sets | `/api/surveys`; `/:id`; `/:id/usage`; `/:id/archive`. |
| Versions | `/api/surveys/:surveyId/versions`; `/:versionId`; `/:versionId/archive`; `/:versionId/apply-to-unfinished`. |
| Questions | `/api/survey-versions/:versionId/questions`; reorder action documented in Swagger; `/api/questions/:questionId`. |
| Evaluations | `/api/evaluations`; `/participants/preview`; `/:id`; `/:id/schedule`; `/:id/open`; `/:id/close`. |
| Student access | `/api/student/evaluations`; `/history`; `/:id/survey`; `/:id/submission-status`. |
| Draft / submission | `/api/student/evaluations/:id/draft`; `/:id/responses`. |
| Lecturer dashboard/comments | `/api/lecturer/evaluations`; `/:id/dashboard`; `/:id/comments`. |
| Canonical results | `/api/admin/results`; `/api/admin/results/:lecturerId`; `/api/lecturer/results`. |

The proposed version-application preview and retention/token fields in Section 8.2 are not included as current routes.

## Appendix C. Reusable evaluation record

This is a blank structure for the next round, not additional passing evidence. Record date/tester, workspace revision and uncommitted changes, runtime versions, intended database/host without credentials, synthetic fixture prefix and evaluated scope.

| Case field | What to record |
| --- | --- |
| Case ID / feature / requirement | A stable reference such as ENR-001 and FR10 / follow-up 1. |
| Role / preconditions | Caller role, evaluation/version state and exact synthetic fixture IDs. |
| Reproduction | Method, URL, sanitized body or repeatable steps. |
| Expected HTTP result | Exact status and meaningful response fields. |
| Expected database effect | Exact intended writes or preserved state after rejection. |
| Actual outcome | Observed response and database assertions. |
| Evidence | Automated test name, sanitized report or local evidence path. |
| Status | PASS, FAIL, BLOCKED or NOT TESTED. |
| Defect / blocker | Impact, reason, owner and retest result. |

| Feature group | Case/evidence reference | Status |
| --- | --- | --- |
| Startup/authentication/roles/password | | NOT TESTED |
| Academic structure/accounts/department membership | | NOT TESTED |
| Students/placement/groups/import/export/progress | | NOT TESTED |
| Courses/curriculum/offerings/lecturer assignments | | NOT TESTED |
| Enrollment/preview/bulk/reassignment | | NOT TESTED |
| Question sets/versions/questions/reorder/application | | NOT TESTED |
| Evaluation targeting/schedule/lifecycle | | NOT TESTED |
| Student access/history/draft/final submission | | NOT TESTED |
| Dashboard/comments/admin and lecturer results | | NOT TESTED |
| Concurrency/rollback/privacy/history/recovery | | NOT TESTED |

For each defect, record reproduction, expected versus actual behavior, impact, evidence and resolution/retest. Keep school-policy decisions separate from implementation failures. Give an overall conclusion only for the evaluated scope, with passed/failed/blocked/not-tested counts and reviewer/date. Use this appendix as the evaluation template for future rounds.

## Appendix D. Source-document map

The following historical source documents were consolidated into this report and their separate copies removed. The names below record provenance rather than links to available files. Latest acceptance/evidence records take precedence over older completion wording. The Word export contains the same report content, formatted for reading and printing.

| Original source | Content consolidated here |
| --- | --- |
| `README.md` | Project overview, roles, stack, modules, database concepts and development commands; Sections 1-5 and 9. |
| `Backend_Requirements.md` | FR01-FR44, business rules, relationships, acceptance examples and future ideas; Sections 3-6, 9, 12 and Appendix A. |
| `README_BACKEND_WORKFLOW.md` | Full academic/enrollment/version/evaluation/student/import/export/lecturer workflow and errors; Sections 4, 6, 8-9. |
| `Assessment_System_Technical_Functional_Documentation.docx` | Architecture, concepts, functional register, historical-integrity explanation and defense summary; Sections 1-6, 12 and Appendix A. |
| `FRONTEND_REQUIREMENTS_REVIEW.md` | Eight follow-up requirements, exact contract limits, proposed tokens/receipts and school decisions; Sections 7-8, 10-11. |
| `FRONTEND_HANDOFF.md` | Delivered behavior, endpoint contracts and pending agreement; Sections 6-8 and 11. |
| `HISTORICAL_METADATA_RECOVERY.md` | Evidence boundary, manifest, operator audit/dry-run/apply/rollback and backup limitations; Section 10. |
| `PRECOMMIT_EVALUATION.md` | Fresh verification, actual HTTP assertions, commit review, limitations and pending Step 5; Sections 7, 9 and 11. |
| `TEST_EVALUATION_TEMPLATE.md` | Reusable test case/coverage/defect/acceptance structure; Section 9 and Appendix C. |

Additional supporting reference: root [TESTING.md](../TESTING.md), used for exact commands, feature coverage and isolated evaluation setup. No source credential files or school records are embedded in this report.

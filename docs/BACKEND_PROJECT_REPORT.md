# Teacher Evaluation Backend: Consolidated Project Report

**Project:** `teacher-evaluation-api`

**Purpose:** Academic reporting, professor review, backend evaluation and frontend handoff

**Documentation maintenance date:** 16 October 2026. Historical delivery and database evidence dated 14 October 2026 is preserved below; subsequent local work and the partial current browser review are recorded in Section 13.

**Current source snapshot:** owner-authorized local source checkpoint on master, based on historical a298798bc6648b7250760378f201e2ece0daf194, packaging Steps 1–43 and the six-file scaffold cleanup. Git log identifies this revision; this operation does not push it. Section 13 preserves dated implementation/test evidence, including the original uncommitted/no-commit status. Earlier f80ab227e2d79841c44a12d4b18dc66dda061469 is historical provenance.

**Current status:** Step 43 defense checkpoint: M active OPEN deadline extension implemented locally. New 26 unit/32 API cases included in fresh full 777 unit/2,231 API across 52/46 suites PASS; focused 70 unit/two suites and 224 API/five suites, 41 standalone checks and a separate 16-step HTTP workflow PASS. No new schema/migration/configuration/frontend changes. Test 31/226/23/25; normal recorded 28/199/18/24 untouched. Remaining automation/integration/privacy/production work is documented as limitations; no claim of full A-S completion or UI acceptance. Section 13.48.

**Recorded local database status at delivery (14 October 2026):** teacher_evaluation and teacher_evaluation_test then both had 28 application tables, 199 columns and all 18 migrations, including academic-integrity enforcement. The approved normal 17 -> 18 migration followed a fresh protected cutover backup and verified restoration; all original values, all 24 sequence states and all 17 earlier complete migration records were preserved. At that delivery the schemas matched and 16 read-only normal workflow checks passed; Step 31 subsequently expands test only and Step 36 extends its review-kind constraint through migration 20. Section 11.12 records those dated results; Sections 11.8-11.11 retain their dated earlier steps.

**Evidence boundary:** Step 43 has fresh 777/2,231 full backend tests and 16 separately repeated HTTP workflow cases; no new UI execution. Source snapshot verified, five retained backup/migration hashes match. No schema/Prisma/private/frontend changes, normal access, new database backup/restore, commit or push. Test remains 31/226/23/25; normal is dated recorded 28/199/18/24. Word content/package checked; visual rendering NOT CHECKED.

This report consolidates the nine previous documents in `docs`, including the technical Word document. Repeated explanations are combined, older test counts are superseded by the latest recorded evaluation, and proposed behavior is distinguished from implemented behavior. The separate source documents have been replaced by this report in Markdown and Word formats.

**Documentation-only scope audit (16 October 2026):** Current descriptions and test-location references were reconciled with unchanged Step 43 source, Prisma schema/migrations and saved results. All 486 protected file hashes match. No application/frontend/private configuration, database or runtime test was changed/executed in this audit. The latest executed evidence remains 777 unit/2,231 API PASS; older results below are dated history. Word content/package checks are separate from visual rendering, which remains NOT CHECKED.

## Local source checkpoint, 16 October 2026

This revision packages backend Steps 1–43 and the six-file scaffold cleanup into an owner-authorized local commit, based on historical delivery `a298798`. Use `git log -1` to identify the resulting commit. Remote publication is not part of this operation; no deployment or normal database migration is implied. Earlier statements saying "uncommitted" or "no commit/push" preserve the status at their dated checkpoints.

Latest cleanup evidence is 777 unit tests/52 suites PASS, TypeScript/build PASS and 480 other protected file hashes unchanged. The 2,231 API tests/46 suites, 41 safety checks and repeated 16-step HTTP workflow remain recorded Step 43 evidence; no runtime tests or database access were repeated for this commit. Private credentials, backups and ignored evidence are excluded from Git. Full frontend acceptance, normal rollout, production readiness and supervisor acceptance of the reduced defense scope remain pending. Word content/package checks do not establish visual rendering, which remains NOT CHECKED.

## Repository organization and defense cleanup

**16 October 2026, after Step 43:** removed six unused NestJS entity scaffold files and their empty folders. The majors and student-generations files were empty; academic-years, departments, students and student-academic-records each contained only an empty class. None was imported or referenced by application/test/operator code. Prisma remains the database model. No controller, service, DTO, module, test, migration or package configuration was removed or refactored.

| Location | Purpose / retained content |
| --- | --- |
| `src/` | Backend feature modules, controllers, services, DTOs and unit tests. Common rules stay in `src/common/`; database access stays in `src/prisma/`. |
| `prisma/` | Schema, all 23 migrations, migration lock and seed. Migration files remain necessary for fresh isolated setup and later reviewed deployment. |
| `test/` | API suites, guarded runners, synthetic fixtures and helpers. Tests are part of the verification evidence and remain in the delivery. |
| `scripts/` | Administrator bootstrap, integrity preflights and reviewed mapping/operator utilities. Historical metadata tools and SQL remain for documented recovery/rehearsal workflows. |
| `docs/` | Exactly the synchronized Markdown and Word backend reports. README and TESTING remain at the root. |
| `.tmp/` | Ignored local test results, screenshots, historical source snapshots, recovery/backup evidence and documentation utilities. These are retained for thesis/defense traceability and are not a Git source delivery. Do not delete the whole folder or rerun one-off migration helpers. |
| `dist/`, `node_modules/` | Ignored compiled application and installed dependencies, retained so the local demo remains available. `dist` is regenerated by the build. |
| Root configuration | Package/lock, TypeScript, Nest, lint/test configuration, environment templates and Git/editor configuration remain. Private environment files remain ignored and unchanged. |

Five disposable Python bytecode files and their cache folder, plus the root TypeScript build cache, were removed. Build tools can recreate caches. Backup files, browser evidence, test logs/results, screenshots and source snapshots were retained. No frontend changes, database access/migration, commit or push occurred in this cleanup.

**New cleanup verification:** whole-repository TypeScript check with incremental output disabled PASS; production build PASS; **777 unit tests across 52 suites PASS**. The initial unit run passed all cases but could not save JSON because Windows denied the report write; the authorized repeat saved the passing report. The other **480 protected file hashes match** the Step 43 baseline; the six recorded scaffold deletions are the only source differences. No API/database or browser scenarios were rerun: **2,231 API/46 suites, 41 safety checks and the 16-step HTTP workflow remain previously recorded Step 43 evidence**. Source cleanup does not establish new UI, deployment or production acceptance. Word content/package synchronization is checked separately; visual rendering remains NOT CHECKED.

For a fresh checkout, create the ignored fixture parent before running API tests: `New-Item -ItemType Directory -Force .tmp | Out-Null`. The owned cohort fixtures create temporary folders inside it. Follow the isolated configuration, client-generation and migration instructions; a source checkout includes no private credentials, database or prepared demo accounts. Do not run database tests during an interactive demo.

### Current defense scope and limitations

This is the latest A–S summary as of **16 October 2026, Step 43**. Earlier matrices retain their dated review status. “Implemented locally” means backend implementation and defined automated evidence; frontend acceptance and normal/production deployment remain separate.

| ID | Requirement | Current status / remaining boundary |
|---|---|---|
| A | Shared-major evaluation audiences/results | PARTIAL: shared ALL_ENROLLED exists; plural evaluation group_scopes, independent major_ids and complete audience breakdowns remain. Major-filtered answers/exports are deferred pending privacy policy. |
| B | Atomic year/two semesters | IMPLEMENTED locally, Step 42; missing-only completion and durable retries included. F/I integration is still absent. |
| C | Optional academic-date clearing | IMPLEMENTED locally; omitted/null/replacement and resulting date-order rules retained. |
| D | First-administrator provisioning | IMPLEMENTED locally, Step 26; secure CLI and concurrency/rerun checks. |
| E | Major-scoped integer cohorts | PARTIAL overall: isolated schema/catalog/imports/CRUD/transfer/resolver/mapping and controlled write capability exist. Real legacy ownership mappings, coordinated frontend/enforcement/normal rollout remain. |
| F | Student-group rollover | NOT IMPLEMENTED. Existing yearly groups remain independent; no automatic predecessor copy. |
| G | Automatic course codes | IMPLEMENTED locally, Step 38; allocation/retry receipts and manual-code compatibility. Matching UI/rollout remain. |
| H | Curriculum-backed assignment years | IMPLEMENTED locally, Step 39; destination-semester revision checks, preserved pinned/legacy history. |
| I | Teaching-assignment rollover | NOT IMPLEMENTED. Destination audiences, source provenance and integrated B/F/I recovery remain. |
| J | Reviewed assignment/enrollment creation | IMPLEMENTED locally, Step 41; atomic preview/confirm/recovery and complete-context identity. Matching UI/legacy/normal rollout remain. |
| K | Frozen list audience metadata | PARTIAL: existing targets/labels/counts; complete frozen major/year pairs and availability for all audiences remain. |
| L | Atomic reviewed create/publish | PARTIAL: reviewed creation and publication exist separately; combined transaction/receipt remains. |
| M | Active deadline extension | IMPLEMENTED locally, Step 43; active OPEN, end-only, strictly later, serializable with closure/other extensions. |
| N | Evaluation activity history | NOT IMPLEMENTED; existing review receipts/cohort journals do not provide this feed. |
| O | One evaluation per assignment | NOT IMPLEMENTED; current identity remains assignment plus questionnaire version. Requires preserved-legacy audit/constraint plan. |
| P | Setup counts/prerequisite contracts | PARTIAL: persisted enrollment counts/year/semester metadata implemented, Step 27; remaining errors/capabilities depend on unfinished workflows. |
| Q | Reviewed bulk create/publish | NOT IMPLEMENTED; no final bulk endpoint/capability advertised. |
| R | Student self-context/class labels | IMPLEMENTED locally, Steps 2/27/35; complete selected-year context with missing/false distinctions. Matching UI/privacy wording acceptance remains. |
| S | Lecturer release/small-cohort policy | CLOSED-only release implemented and retained; thresholds, text/export/filter suppression and overlap safeguards await school decisions. |

There are eight locally implemented requirement categories (B/C/D/G/H/J/M/R), five partial (A/E/K/L/P), five unimplemented (F/I/N/O/Q), and one with remaining school-policy decisions (S). Categories differ in size; this is not a percentage-complete calculation. Larger additions are deferred for the defense checkpoint, not deleted from requirements or described as passed.

Current evidence: **777 unit/2,231 API across 52/46 suites PASS**, new 26/32 included; focused 70 unit/224 API, 41 standalone checks and 16-step HTTP workflow PASS. Browser/UI integration **NOT TESTED for this checkpoint**; no new browser session. Word visual rendering **NOT CHECKED**. Normal rollout, actual ownership/historical recovery and realistic load/security/production acceptance remain. The local commit is now authorized; remote publication remains separate. The test schema differs from normal's dated recorded schema. Original imp.txt/imp1.txt may be unavailable; preserved FR01–FR44/A–S plus unchanged improve.txt remain the sources.

### Demonstration and acceptance boundaries

The owner chose Step 43 as the current defense checkpoint because time is needed for the thesis, slides and rehearsal. **This scope choice does not make the remaining improve.txt requirements optional or establish acceptance of the complete frontend request.** They remain unmet, partial or dependent on school decisions, as identified in the A–S table. Supervisor agreement with the reduced scope is needed; no supervisor acceptance is recorded here. If all improve.txt items are required, the current backend does not meet that full requirement and those features still need implementation/evaluation.

| Category | What may be claimed / what remains |
|---|---|
| Implemented and verified backend features | Present as the completed local contribution supported by defined Step 43 evidence. Demonstrate them with synthetic teacher_evaluation_test accounts and Swagger/API requests. |
| Partial or absent frontend requirements | Deferred unmet requirements and limitations/future work. Stopping new development for the defense does not implement, waive or remove them. No supervisor waiver has been recorded. |
| Normal database deployment | Pending deployment work, required before using this revision with teacher_evaluation. It is not required to commit/share source, organize the repository or demonstrate the isolated test backend. |
| Privacy-policy dependencies | Await explicit school decisions on thresholds, identifying text, exports, filters and overlap safeguards. Keep the approved implemented CLOSED-only lecturer rule; do not invent suppression settings. |
| Frontend integration | Matching browser flows need separate acceptance. Some prepared controls remain blocked by missing backend contracts; use only confirmed working UI paths and label unsupported actions honestly. |
| Complete-project/production acceptance | Not established by the reduced defense scope, automated totals or a successful API demonstration. |

**Demonstration environment.** Use only synthetic teacher_evaluation_test data with the guarded start:test workflow. The separately repeated 16-step HTTP integration flow verifies the stated backend scenario; it is not a complete rendered-UI evaluation. Saved drafts and history have their own evidence. Frontend controls are demonstrated only when confirmed to match this revision. No normal-school records/private credentials are needed for this demonstration.

**Migration boundary.** Test was last verified at 23 migrations/31 application tables/226 columns, while normal remains the 14 October recorded 18/28/199 state and was not reaudited. Migration safety depends on normal's actual records and schema, not only synthetic passes: legacy cohort ownership, complete assignment duplicates or migration drift may need review. Before normal deployment, inspect read-only, create a protected backup and verify restoration, rehearse migrations 19–23 on the restored copy, review preservation results and obtain separate deployment approval, then verify records/sequences/constraints and application behavior. Keep normal/test records separate; do not copy synthetic fixtures to normal. The current revision must not be run against the recorded older normal schema as though it were compatible.

For the defense, a truthful statement is: “This demonstration covers the implemented and verified backend scope. Additional frontend requirements, complete UI acceptance and normal deployment remain pending.” The latest executed totals remain 777 unit/2,231 API tests, plus separate 41-check safety and 16-step HTTP workflow evidence. This clarification performs no new runtime/database evaluation and changes no requirement status.

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
13. [Current work and frontend integration review](#13-current-work-and-frontend-integration-review-15-october-2026)

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

**Current conclusion:** The defense checkpoint is the tested local backend through Step 43. B/C/D/G/H/J/M/R are implemented locally; A/E/K/L/P are partial; F/I/N/O/Q are unimplemented; S retains CLOSED-only release while small-cohort policy remains undecided. Core cohort/import/transfer/resolver and reviewed mapping support exist in the isolated rollout, but actual ownership mappings and normal/frontend cutover remain. Current scope is frozen for thesis/defense preparation. Use the current A–S table above for limits and Sections 13.46–13.48 for recent J/B/M evidence; passing backend tests does not establish UI or production acceptance.

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

**Last verified Step 43 database state (16 October 2026):**

| Database | Tables / columns / successful migrations / sequences | Evidence boundary |
|---|---|---|
| teacher_evaluation_test | 31 / 226 / 23 / 25 | Guarded synthetic testing; Step 43 read-only postflight, no new audit during this documentation follow-up. |
| teacher_evaluation | 28 / 199 / 18 / 24 | Recorded 14 October delivery only; not queried or migrated in subsequent local work. |

They are not currently claimed to be symmetric. Test-only migrations 19–23 add cohort expansion/mapping, course-creation receipts, reviewed assignment identity/receipts and year-setup receipts. Current development uses the isolated test schema. Normal deployment needs its own separately approved preflight, verified restore/rehearsal and compatible build. The following paragraphs preserve the 14 October alignment and later Step 31 provenance.

The additive `20261007140000_add_reviewed_operations`, `20261008010000_add_student_progression`, `20261008020000_add_curriculum_revisions`, `20261008030000_add_historical_target_labels` and `20261014010000_enforce_one_primary_department` migrations were first applied to teacher_evaluation_test for follow-up validation. The owner subsequently approved local normal-database alignment after backup/restore and rehearsal; at that alignment, both configured databases had all 17 migrations, 28 application tables and 199 columns. The five migrations add review storage, the progression_action enum (existing placements default to NORMAL without inferred exceptions), curriculum revision history with nullable legacy bindings, nullable historical-label snapshots/capture timestamps with checks/triggers, and the partial primary-department unique index. No reset, school metadata backfill, credential replacement or copying of test fixtures into normal was performed. The test's three original memberships and normal's four memberships were preserved. Section 11.8 records complete-row/sequence preservation and read-only normal API verification. The subsequent 20261014020000_enforce_academic_integrity migration adds safeguards without adding tables/columns; it was first applied only to test (18 migrations). It subsequently passed fresh backup/rehearsal and the approved normal deployment in Section 11.12, so both configured databases had 18 migrations at the 14 October delivery. Step 31 then adds migration 19 to test only: 31 tables/226 columns/25 sequences; normal remains recorded 28/199/18/24 and is not reaudited. The regenerated client requires the test schema during this rollout; use the guarded start:test command. See Section 13.36. Other school targets need their own procedure; a separate school production database is not configured in the inspected project.

Four temporary validation databases were recorded as retained on 14 October 2026 (not reaudited in this follow-up): teacher_evaluation_restore_20261014_155714_7066b3ca retains the earlier 17-migration rehearsal; teacher_evaluation_restore_20261014_163139_6f06419f retains the 12-migration pre-cutover state; teacher_evaluation_restore_20261014_191129_c6d73577 retains the new 18-migration rehearsal; teacher_evaluation_restore_20261014_194406_c2b09381 retains the final 17-migration cutover backup state. All remain separate from the two configured application databases, have restricted CONNECT access and were unchanged during normal deployment. The backend connects to one configured database at a time. No copy was dropped/reset; cleanup and archive retention require separate agreement.

### 4.2 Important relationships

```text
User account
  + Student profile -> Generation
  |                    -> Academic-year placement -> Major / Year / Group
  + Lecturer role

Course -> Curriculum rule -> Major / Year level
                         -> Academic-year revision -> Saved offering scope binding
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
| Academic record | One student's explicit placement in one academic year: major, year level and optional group. Step 31 adds a nullable explicit generation_id; old links remain unresolved until reviewed mapping. |
| Major-owned cohort | Separate BigInt ID and positive integer number, unique within major_id; immutable canonical entry metadata. Legacy owner/number stay null. |
| Cohort evidence | cohort_mapping_operations, student_cohort_assignment_events and cohort_mapping_receipts preserve immutable reviewed provenance, yearly assignments and retries. ADMIN-only mapping inventory/preview/confirm/receipt routes now exist under /api/student-generations/mapping; they are disabled by default and restricted to the isolated rollout. No shared-public or normal legacy ownership mapping has been applied. |
| Course-year rule | Stable association between course, major and year level. Class type belongs to the offering, not this rule. |
| Curriculum revision | Immutable enabled/withdrawn decision effective from a structured academic year; saved numeric start_year and revision number. |
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

Step 31 introduces a composite foreign key from yearly (generation_id, major_id) to the matching canonical cohort pair, plus deferred same-transaction assignment evidence for non-null links. Existing null links remain compatible. Mapping/assignment/receipt UPDATE and DELETE are blocked; canonical major/number/entry identity cannot be relabeled. Legacy names retain a partial unique index while canonical labels may repeat. Subsequent Steps 32–35 implement major-aware import, canonical profile creation/personal edits, explicit chronological transfers and selected-year consumers. Steps 36/37 add test-only reviewed mapping and controlled legacy writes. /auth/me advertises major_scoped_generations only with REQUIRE_MAJOR_SCOPED_COHORTS=true and validated connected-schema prerequisites, including an empty catalog. Default compatibility remains and private settings were not changed. Full E rollout still awaits actual ownership, matching frontend and normal acceptance.

### 4.3 Placement and group rules

A group belongs to an academic-year placement, not globally to an account. Group `A` in one generation/major is different from group `A` elsewhere. Matching needs the relevant academic year, generation, major, year level and normalized group.

The user approved exception progression on 8 October 2026. An explicit selected-year placement takes precedence. Otherwise, the latest approved earlier placement anchors year progression and major continuity; without an earlier placement, use the generation entry-year formula. Repeat/transfer progression therefore does not revert to the original generation calculation. Numeric start_year determines chronology; IDs and labels are never used to infer it. Calculating an effective year does not create an annual placement. A nonempty group on an explicit placement for the selected academic year is required for enrollment, targeting and answering evaluations. Groups never carry forward. PAUSE remains ineligible through later NORMAL/REPEAT/TRANSFER placements until an explicit approved RESUME.

The current program bounds are years 1-5. Unsupported automatic progression is reported as not started, beyond program or unavailable; it is not silently forced into those bounds.

New group writes trim outer spaces, collapse repeated internal spaces, uppercase and enforce a maximum of 50 characters. For example, `"  group   b "` becomes `"GROUP B"`. Empty values become null where the field is nullable. Unknown historical strings are preserved until an explicit write changes them.

## 5. Functional scope

| Feature group | Current responsibilities / modules |
| --- | --- |
| Authentication and accounts | `auth`, `users`: login, own profile/password, role/status management and department membership. |
| Academic structure | `academic-years`, `semesters`, `departments`, `majors`, `student-generations`. |
| Students and placement | `students`, `student-academic-records`: profiles, selected-year context, group options and bulk group changes. |
| Import/export/progress | Student import, export and evaluation-progress services. |
| Course and curriculum | `courses`, `course-year-rules`: reusable subjects, major/year-level associations and effective academic-year revisions. |
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

For a newly migrated empty installation, use the secure first-admin CLI in Section 13.31 rather than sample seeding. It adds only the first ACTIVE administrator and permits initial setup without prior department membership. Existing installations retain their administrators and records; bootstrap refuses them.

Step 33 adds canonical ownership/chronology validation and INITIAL evidence to individual student creation. Personal edits may retain the current cohort but cannot reassign it; a different ID returns 409. Use the implemented explicit yearly placement/TRANSFER workflow for a new chronological destination, or the guarded reviewed mapping workflow for unresolved legacy history. Neither rewrites prior placements. Student responses expose explicit per-record cohort links without inferring unknown history. Section 13.38 records verification and remaining limits.

Step 32 adds major-aware student imports: explicit owner/number selection, all-row major/chronology validation and per-student atomic INITIAL yearly cohort evidence. Existing-code skips and runtime partial results remain; the transitional unscoped path and remaining E consumers are described in Section 13.37.

ADMIN creates academic years, semesters, departments, majors and generations; creates/imports students with placements; maintains course/curriculum rules; and creates offerings for lecturers. New offerings specify COURSE, TD or TP. New semester creation requires semester number 1 or 2; historical null values are not guessed. Step 42 adds atomic POST /api/academic-years/setup and missing-only /:id/complete-setup with UUID v4 Idempotency-Key retries/recovery. Step 38 adds optional server course-code allocation and actor-bound receipts. Step 41 adds reviewed pre-creation assignment/scopes/enrollment preview/confirm/recovery. Separate CRUD remains supported; F/I automatic rollover is absent.

The reusable course is different from its offerings. Offering identity is (course_id, lecturer_id, semester_id, year_level, class_type); section labels/groups never distinguish it. API checks cover all contexts; migration 22 additionally enforces SQL uniqueness when year/type are both known. The earlier six-field nullable index remains for legacy compatibility; unknown rows are not inferred, merged or deleted. COURSE and TD are distinct identities. New contexts require a valid student year and latest enabled applicable destination-semester curriculum approval, including unscoped offerings.

An offering may serve A only or shared A+B. Its saved group scopes define this membership. `section_code` remains a display label and cannot establish eligibility by itself.

### 6.2 Enrollment

ADMIN chooses offering and academic/group context. The backend previews eligible ACTIVE student accounts, exact IDs, already-enrolled counts and new candidates. Confirmation sends the reviewed context and exact IDs. The backend recomputes eligibility inside the transaction, rejects selection drift with 409 and creates only missing enrollment rows.

Single, bulk and reassignment checks use the same saved-scope matcher. Another year's, generation's or major's same-named group does not qualify. A-only rejects B; A+B can accept both.

For legacy offerings with no saved scopes, single/bulk compatibility remains for valid ACTIVE student accounts; no section restriction is inferred. Bulk still uses its explicit requested context. Group-targeted evaluation creation and reassignment require saved scopes. This exception does not create scope records or rewrite history.

### 6.3 Placement changes and reassignment

Current local Step 34 adds explicit major-owned yearly cohort placement and TRANSFER through POST /api/student-academic-records: choose the actual destination cohort ID, append after known latest history, and atomically store the new record/event and advance the compatibility profile pointer. Old record identities and evidence stay protected; TRANSFER does not cancel PAUSE. This forward workflow does not infer legacy ownership or implement reviewed backdated correction. Step 35 now connects the shared historical-year cohort resolver to filters, options, enrollment/targeting, exports, self/access, review snapshots and canonical target-label capture; real reviewed mapping and full E/UI cutover remain pending. Sections 13.39-13.40 record the contracts and passing evidence.

Bulk class-group changes use confirmed profile IDs in a selected academic year. Every student must already have a placement in that year; if one is missing, the whole operation is rejected. The write updates the group only and does not invent placements, change passwords or automatically move enrollment/evaluation membership.

A deliberate enrollment move uses a source offering, target offering and account ID. Preview reports compatibility and protected participant/draft/completion impact. Confirmation rechecks the state. If protected work would be damaged, it is blocked. A safe operation moves the enrollment only; frozen participants and placement history remain intact.

### 6.4 Questionnaires and versions

Creating a named set atomically creates V1 in DRAFT. A later version can copy existing questions. All six question types are supported: RATING, TEXT, AGREEMENT, FREQUENCY, MULTIPLE_CHOICE and CHECKBOX. Type-specific bounds, required answers, option ownership and display order are validated.

Editing is restricted to the latest eligible draft version. Any assigned evaluation, including DRAFT, protects its questions/options from mutation. Locked/used historical records cannot be destructively changed or deleted. Reordering is atomic and preserves uniqueness.

For new evaluation creation, the existing explicit `survey_version_id` provides reviewed-version checking. A newer version causes 409; the backend does not silently substitute one. Set-only compatibility validates the actual latest version and rejects an empty/archived latest rather than falling back to an older usable version.

An archived named set rejects new assignments, while existing assignments to a usable version can continue. This does not make an archived version editable or authorize new archived-set use.

### 6.5 Evaluation targeting and lifecycle

Participant selection intersects actual offering enrollment with requested academic/generation/group context and eligibility. Shared-major ALL_ENROLLED is supported; evaluation input still accepts only singular group_scope, while plural evaluation scopes and independent major_ids remain future work. Existing duplicate identity is offering plus survey_version_id; the stronger one-evaluation-per-offering policy O is not implemented. Group filters cannot be ignored or silently widened to ALL_ENROLLED. Targeted creation requires exact reviewed account IDs.

Confirmation freezes participants and target records. DRAFT schedules support start/end editing. Step 43 additionally permits an ADMIN to extend a currently active OPEN deadline with end_at only, strictly later than the current deadline. Supplied start_at (even unchanged/null), upcoming/expired/CLOSED or missing-window states are rejected. Extension and closure/competing extensions serialize; questions, participants, drafts and submitted responses stay unchanged. Ordinary opening checks schedule, usable questionnaire, participants and actual latest version. A superseded draft returns 409 while preserving its assigned version/frozen IDs. The new reviewed opening workflow allows an explicit retain-assigned decision after full state review; it requires already frozen participants and does not use the legacy zero-participant membership fallback. Invalid/expired dates, empty questions and archived individual versions remain rejected.

```text
DRAFT: review targeting and edit schedule
    -> OPEN: student writes during the scheduled window; ADMIN may extend an active deadline
    -> CLOSED: lecturer dashboard/comments become available
```

A confirmed snapshot may validly serialize before a simultaneous later placement/status/enrollment change. Even if the other HTTP request finishes first, transaction ordering can still produce a complete valid earlier snapshot. The requirement is consistent atomic state or a conflict, not 409 for every overlap. The reviewed workflow now checks a server-stored fingerprint of relevant context/impact in the write transaction, including same-ID drift; unreviewed legacy compatibility retains only its earlier exact-ID guarantees.

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

A superseded target cannot downgrade participants. Concurrent draft saving can cause the application to roll back atomically. The new `/apply-to-unfinished/preview` and `/confirm` workflow reviews impact and stores the original committed result. Retrying that completed review returns the original moved/skipped counts without moving newly eligible participants. The old route accepts `review_id` too; omission retains legacy current-eligibility recalculation until cutover. Automatic frontend application remains a frontend integration decision, not a backend action performed here.

### 6.8 Results, progress, import and export

The owner approved a consistent CLOSED-only lecturer result policy on 14 October 2026. Canonical lecturer results, dashboard and comments require CLOSED evaluations and ownership. Canonical ADMIN results still exclude DRAFT and may monitor OPEN evaluations. Canonical results report actual saved response versions under `version_results`; the legacy flat dashboard/comments shape remains distinct. Section 8.9 documents the changed release contract.

Unknown historical response versions remain explicit through `unversioned_submission_count`; their answers are not attributed to today's questionnaire. Scoped anonymous reporting must preserve whole supported aggregates rather than inventing mixed/unknown subpopulation slices. Student participation export filters do not establish anonymous answer ownership.

Progress distinguishes active, upcoming, expired, completed and closed assignments. Import normalizes new data, skips existing/conflicting identifiers and reports failures without exposing internal details. Each new import row creates its account/profile/placement atomically; other successful rows remain imported when one row fails. This intentional partial batch behavior differs from all-or-nothing bulk placement.

Student import generation names are trimmed and repeated whitespace collapsed before enforcing the same 100-Unicode-character limit as storage. Both HTTP DTO validation and a direct service guard reject longer normalized names before writes; generated OpenAPI declares maxLength=100. Step 6 records ASCII/Unicode boundary and safe-retry evidence.

Exports apply valid academic/generation/major/group context, include the placement year represented by group data and retain staff-only identifiable progress boundaries. Missing placement metadata is reported rather than reconstructed from current labels.

## 7. Backend improvement requirements and delivery status

The original frontend follow-up in `D:\internship\imp.txt` has eight improvement areas. These are separate from the baseline FR01-FR44 register. The newer confirmed handoff, `D:\internship\imp1.txt`, dated 7 October 2026, closes requirement 1 and retains the original numbering for the seven remaining areas. Its frontend source review did not include a fresh frontend/backend installation or integration test. The user subsequently authorized the documented review contract and explicitly approved repeat/transfer anchors, persistent pauses until resumption, and yearly group requirements. The user also authorized effective academic-year curriculum revisions and retained global case-insensitive question-set title uniqueness on 8 October 2026. Actual frontend acceptance is still pending.

| No. | Improvement | Implemented and evaluated | Remaining acceptance work |
| --- | --- | --- | --- |
| 1 | Offering eligibility | Shared saved-scope checks; ACTIVE accounts; A-only/shared behavior; shared progression and required yearly group even for legacy unscoped offerings. | Actual frontend acceptance. An unscoped offering still does not imply a section/group scope. |
| 2 | Concurrent confirmation | Existing serializable protections plus caller-bound stored reviews for enrollment, full creation targeting, reassignment and bulk group placement; semantic context/impact fingerprints; expiry and exact original-result retries; overlapping PostgreSQL checks. | Frontend integration and agreed legacy cutover. Unreviewed compatibility does not provide full reviewed-state guarantees. |
| 3 | Questionnaire lifecycle | Existing latest/no-fallback/immutability/continuity plus explicit assigned-version opening preview/confirmation, stale-review checks and frozen-participant protection. Reviewed creation requires explicit version selection. | Frontend integration; mandatory explicit version for all legacy callers requires a compatibility/cutover decision. |
| 4 | Repeat/pause/transfer policy | User-approved policy implemented with one shared resolver, explicit academic-record actions, persistent pause/resume, yearly groups, structured chronology, cross-API checks and preserved frozen history. | Frontend acceptance and deployment of the additive progression migration to the intended database. |
| 5 | Apply newer version to unfinished | Existing protection plus ADMIN per-evaluation impact preview, review-bound confirmation and durable original-result retry. Draft/submission drift and concurrent saving reject atomically; skipped reasons match existing results. | Frontend integration, legacy cutover and decision to enable automatic application. |
| 6 | Historical recovery | Read-only audit; independently verified manifest; fingerprints; dry-run; atomic metadata-only recovery and conditional rollback tested on synthetic data. | Correct official database, provenance, verified backup/restore and approved recovery records. No school backfill executed. |
| 7 | Curriculum/title policy | User-approved academic-year revisions, saved offering bindings, withdrawal/reapproval, protected identities/chronology and global titles; 23 PostgreSQL acceptance cases pass. | Complete frontend integration and another school target deployment. Local migration is complete; untracked/unscoped legacy assignments remain explicitly unversioned and no historical backfill was performed. |
| 8 | Historical labels | User-approved immutable confirmation snapshots, explicit current labels/legacy unknowns, review binding and whole anonymous aggregate protection; 10 PostgreSQL cases and 8 unit cases pass. | Frontend must consume historical_labels, preserve UNKNOWN presentation and complete its UI evaluation. Local migration is complete; another school target deployment and official historical recovery remain separate. No legacy name backfill. |

Reviewed API paths for requirements 2, 3 and 5 are implemented and tested. Their actual frontend acceptance and legacy cutover remain pending. Requirement 6 still needs official operator evidence. Requirements 4, 7 and 8 have user approval and backend tests, with frontend/deployment acceptance still pending. All eight requirements must not be described as finished.

### 7.1 New remaining-requirements checklist

The following preserves the complete acceptance register from the newer handoff. Read it alongside the delivery matrix above and execution status in Section 11.2; it is not a statement that the newly delivered API paths are still unimplemented. Preserve completed functionality and regression tests. Security hardening remains deferred.

**Requirement 2 - Confirm the operation actually reviewed.** Bind preview and confirmation to the operation, caller, academic year, generation/major/year/group context, exact selection, and relevant placement/status/impact. Detect relevant changes even when the account IDs are unchanged. Unrelated changes, such as an account's display name, must not invalidate eligibility reviews. Validate expiry and authorization; reject relevant drift with 409 and require a fresh preview. Validation, confirmation writes and the recorded result must share the existing serializable transaction. A lost-response retry must return the original outcome without enrolling or moving additional users. Different input with the same operation identifier must conflict. Specify storage, compatibility and frontend agreement before implementing the contract. A confirmation that consistently serializes before a later placement change may validly succeed.

**Requirement 3 - Review intentional opening with an older assigned version.** Show the DRAFT evaluation's assigned set/version alongside its current latest version. Require an explicit, review-bound retain-assigned decision. Preserve normal date, question usability, participant and other opening checks, frozen membership, drafts and history. A stale review returns 409; ordinary opening keeps its stale-version conflict. Continuing existing assignments under a whole-set archive follows existing continuity rules; new archived-set assignment and use of an archived/unusable version remain prohibited. Agree whether all new callers must supply an explicit reviewed `survey_version_id`; document any deprecation rather than removing set-only compatibility silently.

**Requirement 4 - Approved exception progression.** The user approved progression from the last approved placement for repeating/transferred students, ineligibility until explicit resumption for paused students, and an annual group assignment. This is implemented; the following handoff criteria remain the acceptance reference. The approved rules now determine paused eligibility, major continuity and yearly group assignment. Apply one effective-placement policy to list/profile/export, enrollment selection and evaluation targeting. Reuse generation and academic-record models; do not add a permanent manually promoted year or manufacture normal annual records. Preserve years 1-5, NOT_STARTED and BEYOND_PROGRAM unless the school changes program rules. BEYOND_PROGRAM does not prove graduation. Preserve recorded past placements, enrollments, participants, drafts and completed results.

**Requirement 5 - Review unfinished-participant version updates.** Provide ADMIN impact preview for the same set's actual latest version, with affected evaluation scope, moved/skipped totals and reasons. Exclude anonymous answer values and response-to-student linkage. Confirmation must be bound to the reviewed impact using requirement 2; version, eligibility, draft or submission drift requires re-review. Move only reviewed safe unfinished participants. Preserve drafts, completions, base versions and separate V1/V2 results; never downgrade or change sets. A completed operation retry must not move anyone who becomes eligible later. Agree routes, DTOs, moved/skipped meanings and compatibility before implementation; automatic frontend application remains disabled pending agreement.

**Requirement 6 - Validate and operate verified recovery.** Keep the existing tool. Validate its packaging, dry-run, apply, repeat and conditional rollback on isolated synthetic fixtures. Identify the intended school database and re-audit it; the older 66 submissions/four drafts are observations from a different local review, not current proof. Supply an operator procedure covering a secure backup and separately verified restore, independently verified provenance, approved manifest, counts, journal and recovery. Apply only approved evidence. Question IDs are candidate hints, not provenance. Preserve ambiguous/unversioned records with actionable review status and truthful totals. School semester/class/year metadata also needs evidence; synthetic fixture recovery is not school backfill.

**Requirement 7 - Approved curriculum and title policy.** The user approved effective academic-year revisions for future assignments and retained global case-insensitive title uniqueness. The implementation uses stable course/major/year-level rule identities, strictly advancing academic-year approvals/withdrawals and saved applicable revisions on new tracked group scopes. Existing bindings keep their revisions; legacy unknown bindings remain null. A course moved to another level uses a new rule and withdrawal of the previous rule. No sets or histories are merged. Sections 8.6 and 9.8 define the concrete contract, compatibility and evidence.

**Requirement 8 - Approved immutable target labels.** The user approved saved generation/major/academic-year names at targeting confirmation, separate current labels and explicit legacy unknowns. New frozen generation/group targets now capture server-authored JSON snapshots and timestamps in the same serializable transaction. Creation reviews include the displayed labels; a relevant pre-confirmation rename returns 409/REVIEW_STALE. Reads and lifecycle actions never reconstruct legacy names. Whole anonymous aggregates remain intact, and unsupported query slicing returns 400/UNSUPPORTED_ANONYMOUS_SCOPE. Sections 8.7 and 9.9 define the contract and fresh evidence.

**Delivery requirements for every implemented change:** publish concrete Swagger requests/responses and errors; distinguish profile IDs from account IDs; document binding/expiry/retries and migration/compatibility; add direct-API bypass, rollback and real PostgreSQL overlap tests; keep mutations on the isolated database; record fresh evidence separately from the earlier 476/334 counts. Preserve school data. Any school migration/recovery needs impact review, a verified backup and the required approval; this review authorizes no reset.

## 8. Frontend integration contracts

### 8.1 Current behavior

Login uses `{ "identifier": "student-code-or-email", "password": "..." }`. Protected calls use `Authorization: Bearer <access_token>`. Student CRUD and bulk placement use profile IDs; enrollment/reassignment/participant confirmation use account IDs.

Reviewed confirmation echoes exact preview IDs/context plus `review_id`. New reviewed evaluations must supply explicit `survey_version_id` and use the full creation preview rather than treating participant selection alone as version/date review. Opening retains membership and assigned questions; explicit reviewed retention can keep an older version without selecting new questions.

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

### 8.2 Delivered reviewed behavior and remaining integration decisions

The handoff asks for agreement on routes, DTOs and compatibility. After the concrete proposal was documented, the user authorized backend implementation. The delivered contract uses opaque `review_id` values rather than a new signed `review_token`. This authorization is not evidence that the actual frontend has integrated or accepted it.

1. Enrollment and reassignment previews now return a caller-bound `review_id` and `expires_at`; their existing confirmation routes accept that ID with unchanged operation inputs.
2. `/evaluations/create-preview` reviews the complete creation input, including an explicit version and dates. Confirmation freezes its exact account IDs, including ALL_ENROLLED reviews.
3. Bulk group placement has `/preview` and `/confirm` routes using student PROFILE IDs and reviewed context/impact.
4. Older-assignment opening has `/open/preview` and `/open/confirm` with an explicit `RETAIN_ASSIGNED_VERSION` decision and assigned version ID. Ordinary opening remains stale-conflicting.
5. Version application has `/apply-to-unfinished/preview` and `/confirm`, with proposed moved/skipped totals and committed original-result retry. It exposes no anonymous answer values or response-to-student linkage.
6. First confirmation checks a stored semantic context fingerprint and expiry; business writes and receipt completion commit together. Reusing the review for a different operation/input conflicts. Completed retries do not recalculate or mutate.
7. Legacy compatibility remains by default. Agree frontend rollout, set-only deprecation and the switch to `REQUIRE_REVIEWED_CONFIRMATION=true` before requiring all callers to use reviews.

The additive review migration is supplied and tested only on the isolated database. The backend alone cannot establish frontend-team acceptance or school production readiness.

### 8.3 Implemented contract for frontend integration

**Status: implemented and backend-tested; actual frontend acceptance pending.** The contract uses an opaque UUID `review_id` referencing a stored reviewed operation. Its identity also identifies retries, avoiding two separate client identifiers. A review expires after 15 minutes for first confirmation; a completed retry can return its original result after that expiry.

Every review returns `review_id`, `expires_at`, selection/context and the operation's impact. Confirmation sends the same normalized operation inputs and exact IDs; empty-body version application requires only its review ID. The record is bound to the initiating ACTIVE ADMIN account and operation/resource; another account cannot use it. Authentication and ADMIN authorization are rechecked even for completed retries. First confirmation validates expiry and the fingerprint of relevant placement/status, offering scope, enrollment/participant/version and applicable impact. Password hashes, unrelated account display names/notes and anonymous answer values are excluded. Creation reviews also bind the selected historical target labels described in Section 8.7; relevant generation/major/year label changes require re-review. Draft update timestamps are relevant where saved-work changes affect reviewed impact. The preview is a consistent snapshot; confirmation checks and writes share one serializable transaction.

For a completed operation, the backend validates caller, operation/resource and exact normalized inputs, then returns the original result without reevaluating eligibility or mutation. Responses add `review_id` and `already_applied`, preserving domain fields. The latter is false initially and true on replay; all domain counts/IDs stay original. A retry cannot reopen a subsequently CLOSED evaluation, undo a later placement correction or move additional participants. The receipt describes historical operation success, not necessarily the resource's current state; reload the resource separately for current presentation. Records are retained without automatic purge; a future retention policy needs agreement.

| Operation | Reviewed route | Confirmation route and identifiers |
| --- | --- | --- |
| Group enrollment | Existing `POST /api/course-offerings/:offeringId/enrollments/preview`, with added review fields. | Existing `POST /api/course-offerings/:offeringId/enrollments/bulk`; same selection, `confirmed_student_ids` (account IDs), and `review_id`. |
| Participant targeting/evaluation creation | New `POST /api/evaluations/create-preview`; complete creation input including dates and explicit version, without confirmation fields. Existing participant preview remains a selection helper. | Existing `POST /api/evaluations`; full reviewed creation input, exact confirmed account IDs and `review_id`. This avoids treating a participant-only preview as a review of questionnaire/date choices it never received. |
| Enrollment reassignment | Existing `POST /api/course-offerings/:offeringId/enrollments/reassignment/preview`, with added review fields. | Existing `POST /api/course-offerings/:offeringId/enrollments/reassignment/confirm`; `student_id` (account ID), `target_offering_id`, `confirmed_enrollment_id`, and `review_id`. |
| Reviewed bulk group placement | New `POST /api/students/bulk/class-group/preview`; existing-year placements, exact profile IDs and destination group. | New `POST /api/students/bulk/class-group/confirm`; `academic_year_id`, `student_ids` (profile IDs), `class_group`, and `review_id`. Existing `PUT /api/students/bulk/class-group` behavior is covered by the compatibility decision below. |
| Older assigned-version opening | New `POST /api/evaluations/:id/open/preview`; shows assigned/latest versions, normal opening checks and frozen scope. | New `POST /api/evaluations/:id/open/confirm`; `review_id`, `decision: "RETAIN_ASSIGNED_VERSION"`, and `retain_assigned_version_id`. Existing ordinary `/open` retains stale-version rejection. |
| Latest version application | New `POST /api/surveys/:surveyId/versions/:versionId/apply-to-unfinished/preview`; reports per-evaluation and overall impact without answer content. | New `POST /api/surveys/:surveyId/versions/:versionId/apply-to-unfinished/confirm`; `review_id`. Bind exact reviewed affected evaluations and participants in server-side storage. |

**Implemented storage/migration:** additive `reviewed_operations` originally allowed six reviewed kinds. Isolated migrations 20–23 retain those and add COHORT_MAPPING, CREATE_COURSE, CREATE_ASSIGNMENTS and SETUP_ACADEMIC_YEAR, for ten permitted kinds. CREATE_COURSE and SETUP_ACADEMIC_YEAR are direct idempotent-creation receipts; they do not use a separate expiring preview. Active deadline extension adds no receipt kind/activity feed. It stores UUID, actor account ID, resource key, normalized request JSON/request fingerprint, relevant snapshot fingerprint, created/expiry/completion timestamps and original result JSON. It does not store full placement/question snapshots, credentials, draft answer content or anonymous response values. Its actor foreign key and completion consistency CHECK preserve administrative record integrity. Existing business records stay intact. Preview writes only review storage; completion and business writes commit together. Migration `20261007140000_add_reviewed_operations` was initially test-only and is now applied to both configured local application databases as part of their completed 18-migration alignment (Section 11.12). Review the intended database, backup and migration before an operator deploys this backend elsewhere.

**Compatibility and cutover:** review fields remain optional on legacy routes during integration. When the operator sets `REQUIRE_REVIEWED_CONFIRMATION=true` and restarts the API, bulk enrollment, evaluation creation, reassignment, bulk placement and unfinished-version application reject missing reviews with 400/`REVIEW_REQUIRED`. Their reviewed inputs still use the same existing business routes; newer `/confirm` routes always require review. Ordinary latest-version opening remains available. Set-only creation stays a legacy path until cutover; reviewed creation always requires explicit version. Direct-API bypass checks passed with cutover enabled in the isolated tests. Private environments were not edited to enable it. Until frontend callers are migrated and cutover is agreed, unreviewed compatibility remains a limitation of overall requirement acceptance.

### 8.4 Request/response examples and errors

These examples use illustrative IDs and timestamps, not actual school identifiers. They describe the implemented contract; obtain a fresh review from the running API rather than copying an example UUID.

```json
{
  "review_id": "40aa52de-b777-4e6d-a508-c117f98b8c1a",
  "expires_at": "2026-10-07T12:15:00.000Z",
  "course_offering_id": "15",
  "selection": {
    "academic_year_id": "2",
    "generation_id": "3",
    "major_id": "4",
    "year_level": 2,
    "class_groups": ["A"]
  },
  "confirmed_student_ids": ["101", "102"],
  "matched_count": 2,
  "already_enrolled_count": 0,
  "new_enrollment_count": 2
}
```

Enrollment confirmation sends the same selection fields and account IDs plus `review_id` to `/enrollments/bulk`. The result preserves `course_offering_id`, `matched_count`, `enrolled_count`, and `already_enrolled_count`, adding `review_id` and `already_applied`. The first response and completed replay both report the original enrollment count; the latter does not enroll additional accounts.

```json
{
  "review_id": "93f2381c-cac2-45df-8c5b-8fba72ebc8ac",
  "expires_at": "2026-10-07T12:15:00.000Z",
  "survey_id": "7",
  "survey_version_id": "9",
  "eligible_evaluations": 1,
  "proposed_moved_participants": 2,
  "proposed_skipped_participants": 3,
  "skipped_reasons": {
    "submitted": 1,
    "protected_draft": 1,
    "already_on_target": 1
  },
  "evaluations": [
    { "evaluation_id": "20", "proposed_moved_participants": 2, "proposed_skipped_participants": 3 }
  ]
}
```

Version-application confirmation sends `{ "review_id": "93f2381c-cac2-45df-8c5b-8fba72ebc8ac" }`. Preserve current result fields including `moved_participants`, `updated_participants`, `skipped_participants`, `skipped_reasons`, `skipped_submitted`, `skipped_with_draft`, `already_on_target`, `operation`, `status` and version identity. Preview totals are proposed impact; confirmation totals are committed impact. Completed replay returns committed original impact. Do not use `retry_safe` on legacy recalculation to imply a durable reviewed receipt.

Older-version opening review returns evaluation ID, assigned survey/version IDs, latest version ID, `can_retain_assigned_version: true`, empty `blocking_reasons` and frozen participant count after normal checks succeed. Missing frozen participants, invalid/expired dates, empty questions or an archived version fail with a normal 400/409 rather than producing a confirmable review. Whole-set archive continuity remains allowed for valid existing assignments. Confirmation sends the explicit decision/assigned version; it accepts no replacement membership or force flag. Bulk placement preview shows current/proposed groups and enrollment/frozen-participant/draft/completion counts without answer values. Reassignment retains its existing impact fields; create-preview includes complete reviewed dates/version and targeting output.

All previews and new action confirmations use HTTP 200; existing creation/bulk/reassignment successes remain 201. Malformed input/missing mandatory review is 400; authentication failure is 401; missing ADMIN authorization is 403; unavailable or another caller's review is 404. First-confirmation expiry/drift/input mismatch returns 409 with `REVIEW_EXPIRED`, `REVIEW_STALE`, `REVIEW_INPUT_MISMATCH`, or `REVIEW_OPERATION_MISMATCH`. Missing mandatory review uses `REVIEW_REQUIRED`. Transaction conflicts retain the existing 409 message contract. Rejected confirmation leaves business rows and completion receipt unchanged. Swagger now includes DTO fields, workflow descriptions and illustrative request/response/error examples.

### 8.5 Approved student progression workflow

**Status: implemented and backend-tested.** The user approved these three rules on 8 October 2026. One resolver in src/common/utils/student-placement.util.ts supplies Students list/profile, export academic_context, enrollment selection/single enrollment/reassignment, evaluation targeting, available questionnaires and draft/submission access. Eligibility uses the offering/evaluation academic-year context. Historical reads and frozen assignment rows are preserved; a later placement does not rewrite saved answers, enrollments, targets or results.

| Action | ADMIN meaning and behavior |
| --- | --- |
| NORMAL | Ordinary approved placement. Default for existing rows; it cannot implicitly clear an earlier pause. |
| REPEAT | Approve the actual repeated year level/major; later years progress from the last approved placement. |
| TRANSFER | Approve destination major and actual year level; later progression carries this approved placement, not the original generation trajectory. |
| PAUSE | Suspend eligibility. Later ordinary placements and group changes do not resume the student. |
| RESUME | Explicitly approve resumption and its placement. A previous pause is required. Resumption without a yearly group is still ineligible. |

Use existing ADMIN POST /api/student-academic-records to approve a placement. Student IDs here are PROFILE IDs. Example repeat request (replace the illustrative IDs with real context):

```json
{
  "student_id": "12",
  "academic_year_id": "7",
  "year_level": 2,
  "major_id": "3",
  "class_group": "A",
  "progression_action": "REPEAT"
}
```

For a transfer, send TRANSFER with the approved destination major and level. To pause an existing placement, PUT /api/student-academic-records/:id with {"progression_action":"PAUSE"}. To explicitly resume in that same year, PUT that row with {"progression_action":"RESUME","year_level":2,"major_id":"3","class_group":"A"}. For resumption in a later year, create or update that year's placement with RESUME. Omitted action on an update preserves its current state. Saving a group alone is not resumption. These APIs require authenticated ADMIN; DTO examples and errors are in Swagger.

Create returns 201 and update returns 200. Unknown/null action, a resume with no pause, a missing structured year for an exception, or moving an exception to another student/year returns 400. Exception rows cannot be reset to NORMAL; deleting them returns 409. Conflicting chronological year context returns 409 during exception approval. Normal records remain editable; explicit corrections update that year's placement and do not automatically rewrite evaluation history. The state field records the approved state for an academic year, not a complete chronological audit log of every same-year administrative edit.

Students academic_context exposes calculated_year_level, effective_year_level, year_level_source, progression_status (ACTIVE, PAUSED or UNRESOLVED), placement_eligible, ineligibility_reason and placement. Source PROGRESSION_CALCULATION identifies progression from an earlier approved placement; ACADEMIC_RECORD identifies the selected year's explicit placement. A future calculated placement may retain the approved major, but its group is null until explicitly assigned for that year. Normal progression without an earlier placement still uses GENERATION_CALCULATION, with NOT_STARTED/BEYOND_PROGRAM/UNAVAILABLE and years 1-5 preserved. Beyond program does not assert graduation.

Export academic_context uses the same resolver; its placement column describes the actual explicit historical record, which can be absent even when an effective future year can be calculated. Export progress totals retain frozen assignments and are not proof that the student can currently answer. No response/answer content or credential fields are added to roster exports.

New eligibility always needs an ACTIVE STUDENT account and a nonempty normalized group for the relevant year, including legacy unscoped offerings. An unscoped offering continues to impose no inferred group/section restriction, but it no longer permits enrolling a student with no yearly assignment. Enrollment selection must match the offering academic year. Targeting returns paused_student, missing_yearly_group and progression_unresolved counts. Saved-scope checks still apply. Paused/unassigned students cannot load questionnaires, save drafts or submit; frozen participant membership and existing draft/version content remain unchanged and can be used after explicit valid resumption. Historical completion/status reads remain available under their existing permissions.

Missing structured chronology on an exception or conflicting unordered anchors produces UNRESOLVED eligibility for administrator review. Exact-year normal records are not invalidated merely by another normal record with the same calendar year. Reviewed-operation fingerprints now include relevant earlier placements, actions and structured year metadata; changing progression after preview makes first confirmation stale and leaves enrollment/receipt rows unchanged. Completed operation retries still return the original receipt, not a recalculated selection.

The additive 20261008010000_add_student_progression migration defaults old rows to NORMAL and makes no guesses about legacy repeats, transfers or pauses. It was first validated in the guarded test database and later applied to local teacher_evaluation during the separately approved alignment in Section 11.8. Other school targets must receive the migration before using these updated services. No historical exception backfill, reset or credential replacement was performed.

### 8.6 Approved curriculum and title contract

The curriculum rule identity is the course/major/year-level tuple. Curriculum does not configure COURSE/TD/TP; that remains an offering field. New revisions are immutable enabled/withdrawn decisions, effective for the whole academic year (both semesters) and later years until the next revision. Chronology uses numeric start_year, never IDs, names, is_active or today's calendar. Each subsequent revision must have a strictly greater effective_start_year. Same-year aliases and backdated subsequent approvals return 409. A reason up to 2,000 characters is optional. Only ADMIN can use these endpoints.

Create a revisioned rule and its first enabled approval atomically:

```http
POST /api/course-year-rules
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{"course_id":"10","major_id":"20","year_level":2,"effective_academic_year_id":"30"}
```

The 201 response includes the rule and revisions[]; save the returned rule/revision IDs. Existing unversioned rules may begin their timeline using POST /api/course-year-rules/:id/revisions with {"effective_academic_year_id":"30","enabled":true,"reason":"Approved curriculum"}. This does not bind or revalidate past offerings. GET /:id/revisions lists history. GET /:id/applicable?academic_year_id=30 returns rule_id, academic_year_id, policy, revision and enabled. REVISIONED with no applicable approval has revision:null and enabled:false. LEGACY_UNVERSIONED has revision:null and enabled:null, explicitly indicating unknown revision policy rather than approval.

For a new offering, send group_scopes with academic_year_id, generation_id, major_id, year_level and class_groups. Its academic year must match the semester. Optional curriculum_revision_id is the expected applicable revision from the read endpoint. The serializable write rechecks applicability; obsolete, wrong-rule, future or withdrawn selections return 409. Omission resolves the latest applicable revision for a tracked course/major pair; only an enabled revision permits the assignment, and an older enabled revision cannot bypass a later withdrawal. Every scoped level in that tracked pair requires an applicable revisioned rule; a missing rule or disabled approval is rejected. The returned group scopes expose curriculum_revision_id and curriculum_revision. Failed validation writes no offering or group rows.

Withdraw future new assignments without changing existing bindings:

```http
POST /api/course-year-rules/3/revisions
Authorization: Bearer <ADMIN_TOKEN>
Content-Type: application/json

{"effective_academic_year_id":"31","enabled":false,"reason":"Withdrawn from next academic year"}
```

A later-year enabled:true revision explicitly permits new assignments again. A moved course/major/year-level tuple needs a new rule plus withdrawal of the old rule; PUT cannot rewrite a revisioned identity and DELETE cannot erase its history. Existing curriculum-bound offerings retain their course, semester, year level, group context and saved revision. Use a new offering for changed context. Metadata edits and resending identical groups preserve saved scope row IDs/timestamps and bindings, including after withdrawal. Existing enrollment, targeting and student access continue using saved offering context; later curriculum revisions do not mutate participants, drafts or completed answers. Reviews fingerprint the saved revision ID, not today's latest curriculum.

The additive migration introduces curriculum_revisions, a nullable group-scope binding, uniqueness/FK checks and database protection against rewriting revision content, rule identity or referenced start_year. Display-name changes remain permitted; approved requirement 8 preserves confirmed labels separately from current names (Section 8.7). No existing scope is backfilled. Rules created without effective_academic_year_id and course/major pairs with no revision history retain legacy behavior; unscoped offerings have no major context to resolve. Their null bindings are explicit compatibility limits, not proven historical curriculum. Send an expected revision for every new frontend assignment that must enforce the approved curriculum. Migration on the school database remains a separately prepared deployment step.

Question-set titles retain trimmed, global case-insensitive uniqueness across administrators and departments. Archived titles remain reserved. Duplicate creation or rename returns 409; concurrent attempts cannot both create the same normalized title. No department-owner model or set/history merge was introduced. Internal spaces are not collapsed by the title policy.

### 8.7 Approved historical target labels

Capture occurs when evaluation targeting is confirmed and frozen generation/group targets are inserted, including legacy-compatible creation with explicit confirmed targeting. The same serializable transaction validates membership, reads display context, creates the evaluation/targets/participants and records a reviewed receipt when applicable. Preview reads are not historical captures. Opening, closing, applying questionnaire versions, editing current names or reading reports never recapture labels.

Each target exposes historical_labels (schema_version:1), labels_captured_at, historical_labels_status CAPTURED/UNKNOWN, historical_labels_unavailable_reason and current_labels. Generation snapshots include the generation ID/name, entry-year ID/name/start_year and starting level as displayed at confirmation. Group snapshots include the academic-year ID/name/start_year, generation ID/name, major ID/code/name, saved year level and class group. Snapshots exclude account/student/participant/response identifiers and answers. Names and codes are copied exactly; nullable start_year remains null when unknown.

```json
{
  "historical_labels": {
    "schema_version": 1,
    "academic_year": {"id":"1","name":"2026-2027","start_year":2026},
    "generation": {"id":"2","name":"Generation 2025"},
    "major": {"id":"3","code":"SE","name":"Software Engineering"},
    "year_level": 2,
    "class_group": "A"
  },
  "labels_captured_at": "2026-10-08T00:00:00.000Z",
  "historical_labels_status": "CAPTURED",
  "historical_labels_unavailable_reason": null,
  "current_labels": {
    "generation": {"id":"2","name":"Renamed generation"},
    "major": {"id":"3","code":"SE","name":"Renamed major"}
  }
}
```

The example shows a target-label excerpt; current_labels also carries the corresponding year/group context. Use historical_labels for historical display. For an older target without captured proof, historical_labels and labels_captured_at are null, status is UNKNOWN and reason is LEGACY_LABELS_NOT_CAPTURED. Present an unknown historical name; current_labels may be shown separately. Existing top-level name and referenced-object fields remain current-name compatibility fields. Do not label those fields historical or silently use them to fill null snapshots. This additive presentation avoids changing existing name-field semantics while giving the new frontend an explicit historical display contract.

The new fields appear in evaluation list/detail targets, canonical ADMIN/LECTURER results, lecturer evaluation/dashboard group context and lecturer offering evaluation targets. Unscoped ALL_ENROLLED assignments with no frozen generation/group targets retain the existing unavailable-scope reasons; no inferred target rows are manufactured from today's profiles.

POST /api/evaluations/create-preview now returns target_labels with the planned generation/group snapshots. Review the displayed names as well as version/dates/account IDs. Confirm using the original request fields plus confirmed_student_ids and review_id; do not submit target_labels, historical_labels or capture timestamps. Labels are server-authored. A selected generation/major/year name or captured metadata change before first confirmation returns 409/REVIEW_STALE with no evaluation, targets, participants or completed receipt. Re-review to confirm the new labels. Other workflows retain their relevant semantic checks; unrelated account display-name edits still do not stale eligibility-only reviews.

A completed review retry returns the original result, including saved labels and the current-label context recorded at that operation. Reload evaluation/results for live current_labels afterward. A confirmation serialized before a concurrent rename may validly capture its earlier coherent snapshot; otherwise the conflict rolls the transaction back. It cannot mix names from separate snapshots.

The additive 20261008030000_add_historical_target_labels migration adds nullable JSONB snapshots/capture timestamps to both frozen target tables, paired-value/schema checks and database guards against changing saved target rows. Existing rows remain null. Normal current-name CRUD continues to work; captured history is not rewritten. No historical-name backfill was performed. This migration was initially test-only and is now included in local normal alignment (Section 11.12); deployment to another school target remains a separate reviewed task.

Anonymous reports remain whole evaluation aggregates. Query slicing is unsupported on /api/admin/results, /api/admin/results/:lecturerId, /api/lecturer/results and the lecturer dashboard/comments routes. Any query parameters, including generation_id, class_group or unknown group_scope, return 400/UNSUPPORTED_ANONYMOUS_SCOPE instead of silently returning a mislabeled subset. The lecturer path parameter still selects whole evaluations owned by that lecturer. Saved labels do not establish who wrote anonymous answers. Identifiable student participation/export filters remain a separate existing contract.

### 8.8 Frontend team handoff and acceptance checklist

This is the entry point for the frontend team after an authorized repository publication. The owner authorized this master delivery after final review; clone the commit containing this report. An older GitHub commit may not include these changes. Record the delivered branch and commit with `git branch --show-current` and `git rev-parse HEAD`. No frontend project is supplied. Sections 8.3-8.7 define the detailed contracts; Section 9 records backend evidence, not frontend acceptance.

**Set up an isolated preview.** Install PostgreSQL 15 or newer (required by the NULLS NOT DISTINCT offering index) and a compatible Node.js runtime. The recorded checks used PostgreSQL 18.4 and Node.js 24.16.0; other compatible versions have not been evaluated here. Create a local database named `teacher_evaluation_test` using your PostgreSQL administrator. Run from the cloned repository root, with each command succeeding before the next:

```powershell
npm.cmd ci
if (-not (Test-Path -LiteralPath .env.test.local)) {
  Copy-Item -LiteralPath .env.test.example -Destination .env.test.local
}
```

Edit `.env.test.local` with local credentials and a random test JWT secret. Set `NODE_ENV=test`; both `DB_NAME` and `DATABASE_URL` must refer to local `teacher_evaluation_test`. Encode URL-special password characters in `DATABASE_URL`. Set `FRONTEND_ORIGIN` to the exact frontend origin, such as `http://localhost:5173`; multiple allowed origins can be comma-separated. Keep this file private. Then run:

```powershell
npm.cmd run test:e2e:generate
npm.cmd run test:e2e:check
npm.cmd run test:e2e:migrate
npm.cmd run test:e2e:seed
npm.cmd test -- --runInBand
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run lint
npm.cmd run start:test
```

The guarded commands deploy supplied migrations and seed synthetic accounts; they do not reset the database. Coordinate seeding with other testers because it restores test account passwords. Run automated API tests sequentially before manual testing. The configuration check validates the target settings, not connectivity. If migration/seed fails, resolve the local connection before continuing. Root `TESTING.md` contains the detailed setup and troubleshooting procedure.

| Preview item | Address or action |
| --- | --- |
| API base URL | `http://localhost:3000/api`; configure the frontend API client with this URL. |
| Health | GET `http://localhost:3000/api/health`; expect 200. |
| Swagger | `http://localhost:3000/api/docs`; OpenAPI JSON is `/api/docs-json`. |
| Another port | `npm.cmd run start:test -- --port 3001`; update the frontend API base URL accordingly. |
| Stop preview | Ctrl+C in the API terminal. |
| ADMIN test account | `admin@itc.edu.kh` |
| LECTURER test account | `sokdara@itc.edu.kh` |
| STUDENT test account | `student1@itc.edu.kh` |
| Synthetic password | `Password123` for these isolated test accounts. |

POST `/api/auth/login` with the following body; expect 200 and `access_token`. In Swagger, paste the token into Authorize. API clients send `Authorization: Bearer <access_token>` and JSON requests use `Content-Type: application/json`. GET `/api/auth/me` verifies the authenticated identity. Use the appropriate role's own token for lecturer/student checks.

```json
{"identifier":"admin@itc.edu.kh","password":"Password123"}
```

**Choose real fixture IDs before running examples.** IDs below are illustrative strings, not guaranteed seed IDs. Read academic years, generations, majors, students, offerings and survey versions through their Swagger GET endpoints. Student list/profile `id` is a profile ID; `user_id` is an account ID. Keep BigInt IDs as strings. Enrollment, reassignment and confirmed participants use account IDs; bulk placement uses profile IDs. Select ACTIVE students with an explicit group in the offering's academic year and matching saved offering scope. Use a usable latest question version and an unused offering/version pair for evaluation creation. The seed's `E2E BASE PROTECTED` evaluation is closed test infrastructure; create separate synthetic demonstration resources instead of editing it. Seed data alone does not guarantee all exception/retention scenarios exist.

**Six reviewed workflows.** All previews below use ADMIN authorization and return 200. Obtain each workflow's own fresh `review_id`; never reuse the UUID from another example. First confirmation must be within 15 minutes, with the same caller, resource and reviewed input. Replace the example UUID with the value returned by that workflow's preview. Preview writes review storage, while domain changes occur only at confirmation.

Enrollment: POST `/api/course-offerings/15/enrollments/preview`:

```json
{"academic_year_id":"2","generation_id":"3","major_id":"4","year_level":2,"class_groups":["A"]}
```

Inspect `selection`, `confirmed_student_ids` and matched/new/already-enrolled counts. POST `/api/course-offerings/15/enrollments/bulk` with the same selection fields and the complete account-ID array returned by preview; expect 201:

```json
{"academic_year_id":"2","generation_id":"3","major_id":"4","year_level":2,"class_groups":["A"],"confirmed_student_ids":["101","102"],"review_id":"40aa52de-b777-4e6d-a508-c117f98b8c1a"}
```

Evaluation creation: POST `/api/evaluations/create-preview`:

```json
{"course_offering_id":"15","survey_version_id":"9","participant_scope":"ALL_ENROLLED","group_scope":{"academic_year_id":"2","generation_id":"3","major_id":"4","year_level":2,"class_groups":["A"]}}
```

Inspect exact eligible account IDs, ineligible reasons, version and `target_labels`. Optional `start_at`/`end_at` must be valid ISO timestamps with a valid order; use a current demonstration window and retain those exact values in confirmation. POST `/api/evaluations` with the original creation input plus the preview's complete `confirmed_student_ids` and `review_id`; expect 201 and a DRAFT evaluation. Do not submit `target_labels`, historical snapshots or capture timestamps:

```json
{"course_offering_id":"15","survey_version_id":"9","participant_scope":"ALL_ENROLLED","group_scope":{"academic_year_id":"2","generation_id":"3","major_id":"4","year_level":2,"class_groups":["A"]},"confirmed_student_ids":["101","102"],"review_id":"40aa52de-b777-4e6d-a508-c117f98b8c1a"}
```

Reassignment: POST `/api/course-offerings/15/enrollments/reassignment/preview`:

```json
{"student_id":"101","target_offering_id":"16"}
```

Inspect the source enrollment and protected-history impact. Copy its returned `confirmed_enrollment_id`; the target offering must match the student's yearly placement. POST `/api/course-offerings/15/enrollments/reassignment/confirm`; expect 201. Frozen evaluation participants do not move with enrollment:

```json
{"student_id":"101","target_offering_id":"16","confirmed_enrollment_id":"30","review_id":"40aa52de-b777-4e6d-a508-c117f98b8c1a"}
```

Bulk placement: POST `/api/students/bulk/class-group/preview` using existing selected-year placements and PROFILE IDs:

```json
{"academic_year_id":"2","student_ids":["11","12"],"class_group":"B"}
```

Inspect proposed groups and enrollment/participant/draft/completion impact. POST `/api/students/bulk/class-group/confirm`; expect 200. The update does not rewrite earlier frozen membership:

```json
{"academic_year_id":"2","student_ids":["11","12"],"class_group":"B","review_id":"40aa52de-b777-4e6d-a508-c117f98b8c1a"}
```

Older assigned-version opening: for a valid V1-assigned DRAFT after a usable V2 exists, ordinary POST `/api/evaluations/20/open` returns 409. POST `/api/evaluations/20/open/preview` without a body. Display assigned/latest versions and normal opening checks. POST `/api/evaluations/20/open/confirm` using the assigned version from that preview; expect 200 and OPEN with the original version/participants:

```json
{"review_id":"40aa52de-b777-4e6d-a508-c117f98b8c1a","decision":"RETAIN_ASSIGNED_VERSION","retain_assigned_version_id":"8"}
```

Latest-version application: POST `/api/surveys/7/versions/9/apply-to-unfinished/preview` without a body. Display per-evaluation and overall proposed moved/skipped counts and reasons. POST `/api/surveys/7/versions/9/apply-to-unfinished/confirm`; expect 200 with committed counts. Only reviewed safe unfinished participants move; saved drafts, completed answers and historical base versions remain:

```json
{"review_id":"40aa52de-b777-4e6d-a508-c117f98b8c1a"}
```

**Errors, retries and display rules.** A successful first confirmation adds `already_applied:false`; resending the exact operation with the same review after a lost response returns the original result with `already_applied:true`. Completed retries do not recompute eligibility or undo later changes. Reload the resource after receiving a receipt to display current state. A 409 from a pending operation requires renewed context/review; do not silently expand account IDs or swap versions. Keep the original review/input when retrying an uncertain network outcome so the backend can resolve whether it committed.

| Outcome | Frontend action |
| --- | --- |
| 400 / `REVIEW_REQUIRED` | Obtain the correct workflow preview and send its review ID. |
| 409 / `REVIEW_STALE` or `REVIEW_EXPIRED` | Reload context and show a fresh preview before another confirmation. |
| 409 / `REVIEW_INPUT_MISMATCH` or `REVIEW_OPERATION_MISMATCH` | Check the request/resource; obtain a separate review for a changed operation. |
| 409 transaction conflict | No partial business writes commit; preserve the original request when resolving a retry and re-review if state has changed. |
| 401 / 403 | Authenticate or use an authorized role; an expired/revoked token is distinct from an expired review. |
| 404 for a review | Review is unavailable or belongs to another caller; do not expose another admin's context. |
| 400 / `UNSUPPORTED_ANONYMOUS_SCOPE` | Remove query parameters from anonymous results/dashboard/comments calls; display the whole aggregate. |

Historical screens use `historical_labels`; display `UNKNOWN` when status is UNKNOWN and keep `current_labels` separate. Existing name/relation fields continue to mean current names. Creation review includes selected generation/major/year labels: renaming those before confirmation makes it stale. Unrelated account name/notes edits do not stale eligibility-only reviews. Keep response-version result groups separate; saved target labels never justify linking anonymous answers to students.

The delivered default `REQUIRE_REVIEWED_CONFIRMATION=false` retains legacy compatibility. The frontend should always send reviews for these six workflows. Agree cutover before setting it true and restarting the API; five applicable legacy mutation routes then reject omitted reviews. Automatic latest-version application remains a separate frontend decision. All five additive follow-up migrations need the intended deployment's own verified backup and approval; the isolated setup above does not deploy the school database.

**Frontend acceptance record.** Use synthetic resources and record request/status/body, expected versus actual effects and evidence for every row. Passing backend tests does not fill these frontend results automatically.

| Case | Frontend team must verify | Current frontend status |
| --- | --- | --- |
| FE-01 / requirement 1 | A-only/shared A+B eligibility, ACTIVE accounts and direct API scope rejection. | NOT TESTED |
| FE-02 / requirement 2 | Show reviewed scope/impact, confirm unchanged input, display stale/expired errors, retry without additional changes. | NOT TESTED |
| FE-03 / requirement 3 | Show assigned/latest versions; require explicit older-version retention; preserve participant/question history. | NOT TESTED |
| FE-04 / requirement 4 | Repeat/transfer anchors, persistent pause until RESUME and missing yearly group agree across screens and API eligibility. | NOT TESTED |
| FE-05 / requirement 5 | Show moved/skipped reasons; preserve V1 drafts/completions and separate V1/V2 results; no additional movement on retry. | NOT TESTED |
| FE-06 / requirement 6 | Display unversioned/unknown results truthfully; official recovery remains blocked on operator evidence and backup/restore. | NOT TESTED; official operation BLOCKED |
| FE-07 / requirement 7 | Select applicable academic-year revision, retain historical offering bindings and show global title collisions. | NOT TESTED |
| FE-08 / requirement 8 | After a rename, historical names stay fixed and current names change; older labels show UNKNOWN; unsupported report slices show an explicit error. | NOT TESTED |
| FE-09 / integration | ADMIN/STUDENT/LECTURER login, own-resource access, frontend-origin CORS, full workflow, CLOSED-only lecturer results and protected teaching-context conflicts. | NOT TESTED |

Return one evaluation record containing delivered commit/branch, runtime/database identity without credentials, frontend origin, scenario fixture IDs, actual results, evidence references and unresolved items. Include screenshots only when the team actually runs its UI; redact tokens, passwords and identifying answer content. Mark PASS, FAIL, BLOCKED or NOT TESTED honestly. The 14 October delivered evidence is 514 unit/471 API tests; the latest executed local Step 43 evidence is 777 unit/2,231 API across 52/46 suites, plus 41 safety checks and a separately repeated 16-step HTTP workflow. This documentation audit did not rerun them; the frontend team's own run must record its own totals. Publication, legacy cutover, school migration and recovery are separate decisions.

### 8.9 Approved result release and teaching context

The owner explicitly approved both policies before implementation: lecturer answers/comments are released only after CLOSED; evaluated offerings retain their course, lecturer, semester and academic-year assignment. This follow-up changes validation and release behavior, while keeping existing routes, identifiers and response shapes. No schema change or migration is needed.

GET /api/lecturer/results now returns only owned CLOSED evaluations. It returns 200 with an empty evaluations array if none are released; it does not return OPEN answers while the lecturer's dashboard says results are unavailable. The owned evaluation list may still show OPEN status/progress without answer content. Existing dashboard/comments routes still return 409 before closure, 403 for another lecturer's evaluation and 200 after closure. ADMIN canonical monitoring of OPEN evaluations is unchanged. No minimum-cohort threshold was introduced; that separate privacy policy remains unapproved.

PUT /api/course-offerings/:id rejects a changed course_id, lecturer_id or semester_id whenever any evaluation exists, including DRAFT, OPEN and CLOSED. The response is 409 with code OFFERING_HISTORY_PROTECTED. Create a new offering for a new teaching assignment and use the existing deliberate enrollment/review workflows as appropriate; old evaluation participants, questionnaire versions, drafts and answers remain attached to the original assignment.

PUT /api/semesters/:id also rejects a changed academic_year_id when any offering in that semester has an evaluation, using 409/SEMESTER_HISTORY_PROTECTED. This prevents moving a preserved offering indirectly through its shared semester. Semester academic-year inputs remain numeric in the existing DTO; offering IDs remain strings.

Identical assignment IDs are accepted. Permitted display/date edits remain available; existing curriculum restrictions continue to govern year levels/groups/revisions. Unused offerings and semesters remain editable. Current catalog display names are not made immutable by this follow-up; the existing historical_labels/current_labels contract remains in force.

```json
{"code":"OFFERING_HISTORY_PROTECTED","message":"An offering with evaluations keeps its original course, lecturer and semester. Create a new offering for a changed teaching assignment."}
```

```json
{"code":"SEMESTER_HISTORY_PROTECTED","message":"A semester used by evaluated offerings keeps its original academic year. Create a new semester and offering for a changed teaching context."}
```

The frontend should display these conflicts and direct the administrator to create a new assignment rather than silently retrying a context edit. Offering validation/count/writes share the existing serializable transaction. Semester updates now use the same transaction utility, including nested service access, so a simultaneous evaluation creation cannot leave a partially reassigned context. These are API/service protections; no SQL triggers were added. Direct operator SQL needs its own reviewed procedure.

Section 9.11 records acceptance evidence. Frontend UI evaluation remains pending. The owner authorized publication after final review; local normal migration is complete as recorded in Section 11.12.

### 8.10 One primary department per user

The owner authorized the integrity improvement after review. Users retain multiple department memberships and may have zero or one primary department. The existing composite user_id/department_id key and route/DTO response shapes are unchanged. No primary_department_id field is added to users; the join table remains the source of membership flags.

POST /api/users/:id/departments is ADMIN-only. The path uses an account ID string; existing department_id input remains numeric. Setting is_primary:true demotes the previous primary and upserts the selected membership in the same serializable transaction. Other memberships and their created_at timestamps remain. Setting false, or omitting is_primary, retains the existing non-primary behavior, including demoting that membership if it was primary. Removing the primary can leave zero; no replacement is chosen automatically.

```json
{"department_id":3,"is_primary":true}
```

Success remains 201. GET /api/users/:id/departments and the staff GET /api/auth/me profile return consistent membership flags. Invalid/inactive departments are 400, missing users are 404, and authentication/ADMIN boundaries remain 401/403. Concurrent unique/serialization failures now return 409 with the following domain error. Demotion and upsert roll back together; reload memberships and deliberately resubmit the desired choice. This configuration workflow does not introduce a review_id receipt or automatic retry.

```json
{"code":"DEPARTMENT_ASSIGNMENT_CONFLICT","message":"Department assignments changed concurrently. Reload the assignments before retrying; no partial changes were saved."}
```

Migration 20261014010000_enforce_one_primary_department owns the partial unique index user_departments_one_primary_per_user_idx on user_id WHERE is_primary = TRUE. The predicate restricts only primary rows, so multiple non-primary memberships remain valid. The Prisma schema comments identify SQL ownership; do not replace the composite key with a general unique(user_id) or unique(user_id,is_primary), which would restrict supported memberships.

The migration locks membership writes during its duplicate check/index creation and fails with an explicit review message if any user has multiple primaries. It does not delete rows, choose a primary or change flags. Before intended-database deployment, an operator must verify the exact target and restorable backup, run this read-only audit and review any results before migration:

```sql
SELECT user_id, COUNT(*) AS primary_count
FROM user_departments
WHERE is_primary = TRUE
GROUP BY user_id
HAVING COUNT(*) > 1;
```

If rows are returned, stop before deployment and obtain an approved correction for each account. Do not invent a winning department or automatically demote records. If deployment has already recorded a failed migration, review the failure/actual schema and follow Prisma's approved failed-migration recovery procedure before retrying. This report supplies no school apply or data-correction approval.

The initial guarded teacher_evaluation_test audit found zero duplicates, and the public partial index was verified unique/valid there. The owner later authorized normal alignment; teacher_evaluation now has the same index after its own zero-duplicate audit, verified backup/restore and rehearsal. Test's three and normal's four original memberships were preserved. Section 9.12 records the original tests, including the exact migration on temporary clean/duplicate tables; Section 11.8 records normal deployment. Credentials and original stored values were preserved. This source follow-up remains uncommitted/unpushed.

## 9. Testing and quality evaluation

### 9.1 Delivery evidence recorded on 14 October 2026

Fresh full academic-integrity runs started on 14 October 2026 at 18:34:24, Asia/Phnom_Penh. All 514 unit and 471 API tests passed; API writes used guarded teacher_evaluation_test only. The earlier primary-department run at 14:16:08 passed 502/420; the new work adds 12 unit cases and 51 PostgreSQL cases. Earlier built-server checks remain separate historical evidence, not frontend browser acceptance.

| Verification | Result | Meaning / limit |
| --- | --- | --- |
| Unit suite | 43 suites / 514 tests passed; zero failures/pending tests. | Service/controller rules with mocked dependencies; not complete HTTP/database proof. |
| API/integration suite | 19 suites / 471 tests passed; zero failures/pending tests. | NestJS/Supertest and real PostgreSQL; includes the new reviewed paths and legacy compatibility. |
| Consistency/recovery suite | 86 scenarios passed, included in the 471 total: 23 existing, 19 reviewed, 12 progression, 10 historical-label, 12 school-policy and 10 primary-department cases. | Actual PostgreSQL overlap, original-result retry, reviewed drift and history/privacy checks. |
| Complete integration story | 16 cases passed, included in the 471 total. | Admin -> Student -> Lecturer backend workflow; not actual frontend browser acceptance. |
| Curriculum/title acceptance | 23 PostgreSQL cases passed, included in the 471 API total. | Academic-year selection, legacy unknowns, withdrawals/reapproval, atomic rejection, concurrent approvals, exact preservation and global title collisions; Section 9.8. |
| Historical-label acceptance | 10 PostgreSQL cases and 8 unit cases passed; included in the 471 API and 514 unit totals. | Captured/current/unknown presentation, stale renames, stable retry, history preservation, SQL immutability and anonymous query rejection; Section 9.9. |
| School-policy acceptance | 12 new PostgreSQL cases passed, included in the 471 total. | All evaluation states, ownership, unchanged history, ordinary edits and two real transaction overlaps; Section 9.11. |
| Primary-department acceptance | 10 PostgreSQL cases and two unit error-mapping cases passed, included in current totals. | SQL uniqueness, atomic switching/rollback, race rejection, API/profile flags and exact migration preflight; Section 9.12. |
| Academic-integrity acceptance | 51 PostgreSQL cases and 12 unit cases passed, included in current totals. | Active-year uniqueness, literal/Unicode/archived titles, all eight nullable offering-key combinations, bounds/dates/error mapping, concurrency and 14 exact-migration refusal cases. Section 11.10. |
| Built-server academic-integrity contract | Six grouped checks passed using two GET requests on owned temporary port 61923. | Health, served Swagger, generation create/update bounds, all eight nullable calendar DTO fields, literal title identity and activation conflict descriptions. Test connection read-only; database state unchanged and server stopped. Section 11.10. |
| Earlier built-server historical-label contract | Six grouped checks passed on owned temporary port 30424. | Startup, captured/unknown Swagger examples, server-owned fields, explicit slice rejection/whole reports and fixture cleanup; server stopped. |
| Built-server curriculum contract | Nine grouped checks passed on owned temporary port 30421. | Startup/docs, revision DTOs/routes/examples/JWT, optional compatibility and owned fixture cleanup. Server stopped; browser integration not tested. |
| Guided four-scenario HTTP evaluation | 87 HTTP assertions and 42 database assertions passed; all four scenarios passed. | Fresh built API on temporary port 30420 with dedicated synthetic accounts, real JWT login and exact history snapshots. Fixtures removed and server stopped. See Section 9.7; browser UI was unavailable. |
| Built-server progression checks | Six grouped checks passed on owned temporary port 30419. | Latest built startup/health/docs/OpenAPI; optional enum in create/update DTOs; concrete request examples/JWT/unauthenticated rejection. Temporary server stopped. |
| Earlier reviewed-workflow built-server checks | 12 grouped checks passed on owned temporary port 30418. | Health/docs/OpenAPI, all seven new POST routes and unauthenticated rejection, required DTO fields, configured-origin CORS. Temporary server stopped. |
| Earlier built-server walkthrough | 80 checks passed before baseline commit. | Prior evidence for setup/business behavior/cleanup; not newly rerun or additional Jest tests. |
| Build / schema / whitespace | Existing build/schema/whitespace checks passed; final migration/catalog verification passed. | Both application databases now have 18 migrations, 11 new validated CHECKs, two new unique indexes, the title-key function and stronger offering uniqueness. Original normal values/sequences preserved. Section 11.12. |
| Normal/test database structure comparison | Read-only catalog comparison completed on 14 October 2026: normal 26 application tables/174 columns/12 applied migrations; test 28 tables/199 columns/17 applied migrations. | Normal lacks the five improvement migrations. Shared objects have no changed definitions in the inspected categories; Section 9.13. No migration or data change was performed. |
| Normal-database migration preflight | Read-only aggregate audit completed on 14 October 2026: zero duplicate-primary users, new-object/new-column conflicts or unvalidated constraints. | Two responses still lack questionnaire-version metadata. Local backup/restore subsequently passed in Section 11.6; authoritative provenance and migration approval remain pending. |
| Local normal-database backup/restore | Custom archive created and restored on 14 October 2026; 27 tables including migration history have matching full-row digests, with 23 matching sequences and matching effective schema/permissions. | Normal/test databases were not migrated. The copy initially retained 12 migrations; the subsequent authorized rehearsal is recorded in Section 11.7. Local restoration proof is separate from official historical recovery. |
| Restored-copy migration rehearsal | All five pending migrations applied successfully; 109 API/PostgreSQL cases passed across two suites, with original record values preserved after migration and fixture cleanup. | At rehearsal completion, copy had 28 tables/199 columns/17 migrations, normal had 12 and test had 17. Normal was subsequently aligned in Section 11.8. The rehearsal is a targeted rerun of existing cases. |
| Earlier approved local normal alignment | All five pending migrations applied to teacher_evaluation after a fresh protected backup/verified restore. Both application databases had 28 tables/199 columns/17 migrations; original values and sequences preserved, test unchanged. | 16 read-only HTTP/API checks passed on normal; temporary instance stopped. No normal fixture/seed/reset/backfill, password reset, commit or push. Section 11.8. |
| Normal preservation during this implementation | Full schema, complete-row keyed digests including migration history, and all sequence states matched before/after; private configuration files unchanged. | New academic-integrity migration applied to test only. Normal remains at 17; no normal write tests, migration or data correction. Section 11.10. |
| Fresh academic-integrity backup/restore | Protected 112,747-byte archive restored into a new isolated copy. All 29 tables including migration history and all 24 sequences matched; one equivalent CHECK cast representation was verified explicitly. | Normal remains at 17. Archive/checksum and all 23 protected artifacts' access rules verified. Section 11.11. |
| Academic-integrity migration rehearsal | New copy upgraded 17 -> 18; 160 cases passed across three suites, followed by 16 read-only existing-data GET checks. | Original values and all 17 existing complete migration records preserved. Normal/test/older copies unchanged; new copy's fixture-driven sequence advances are expected. Section 11.11. |
| Approved normal academic-integrity alignment | One migration applied 17 -> 18 after fresh cutover backup/restore and final preflight; all original values, 24 sequences and old 17 full migration records preserved. | Schema matches test, all 16 read-only normal GET checks passed, test/four restore copies unchanged, and configuration/source hashes unchanged. Section 11.12. |
| Lint | No errors, five existing warnings. | Two empty entity files and three unused imports/test options remain. The previously unused enrollment example now documents Swagger requests. |

Older sources mention 453 unit tests; the earlier committed baseline reported 476/334. Delivered `a298798` totals are 514 unit and 471 API tests. Subsequent local Step 1 totals of 520/473 are recorded separately in Section 13. Earlier primary-department totals were 502/420; historical labels passed 500/398 and progression passed 492/365. The 86 consistency, 16 integration, 23 curriculum and 51 academic-integrity cases are subsets of the 471 API total. The new work adds 12 unit and 51 API cases. Focused reruns, migration rehearsal and earlier HTTP walkthroughs are separate evidence, not additional tests to add.

Latest normal-alignment evidence is .tmp/academic-normal-deployment-20261014.json, .tmp/academic-normal-readers-20261014.json, .tmp/academic-normal-catalog-20261014.json and .tmp/academic-cutover-backup-20261014.json. Latest full-regression evidence is .tmp/academic-integrity-unit-verified.json, .tmp/academic-integrity-api-verified.json, .tmp/academic-integrity-delivery-20261014.json and .tmp/constraint-implementation-normal-preservation.json. Earlier primary-department evidence is .tmp/primary-departments-unit-final.json, .tmp/primary-departments-api-final.json, .tmp/primary-departments-focused.json, .tmp/primary-departments-audit.json and .tmp/primary-departments-evaluation.json. Earlier policy evidence is .tmp/school-policy-unit-final.json, .tmp/school-policy-api-final.json and .tmp/school-policy-focused.json. The policy follow-up is local and uncommitted. Earlier historical-label evidence is .tmp/labels-unit-final.json, .tmp/labels-api-final.json, .tmp/labels-focused-api.json and .tmp/labels-http-checks.json. Earlier curriculum evidence is .tmp/curriculum-unit-final.json, .tmp/curriculum-api-final.json, .tmp/curriculum-focused-api.json and .tmp/curriculum-http-checks.json. Earlier progression evidence is .tmp/progression-unit-final.json, .tmp/progression-api-final.json and .tmp/progression-consistency-final.json; these are ignored synthetic evidence, not school-data exports. Earlier reviewed-workflow evidence is under `.tmp/frontend-followup-20261007`: `unit-final.json`, `api-final.json`, `reviewed-api-final.json`, `http-checks.json`, and the read-only test audit. The directory name reflects the handoff date; some checks completed on 8 October. Earlier raw logs/HTTP walkthrough remain under `.tmp/precommit-20261007`. All are ignored by Git and are not school-data exports.


### 9.2 Earlier baseline HTTP behavior

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

Dedicated API suites now include student CRUD/permissions and import/export alongside courses, users, semesters, offerings, enrollment, questionnaires, evaluations, student access, drafts, submission, dashboards/comments, curriculum revisions, integration and consistency. Step 8 inspected assertions and prioritized own-password, export group-options and lecturer-own-assignment HTTP gaps. Step 9 now closes the defined own-password batch with 38 passing HTTP cases; Step 10 evaluates group options (48 passing cases/three overflow failures), resolved by approved Step 11 with 55 focused passes and full 552/726, while Step 12 executes lecturer own-assignment HTTP cases (58 PASS/two overflow FAIL), resolved by approved Step 13 with 65 lecturer passes and full 552/791. Academic setup, some student progress/delete cases and further admin-results combinations remain partial. A missing dedicated filename alone does not prove missing coverage; Section 13.13 records the refined scope.

The real-server walkthrough provides targeted additional evidence for academic creation and canonical results/ownership, but does not close every CRUD/filter/error gap. Complete frontend integration, broad browser-origin behavior, school-sized performance, production security review and target-environment operational recovery acceptance remain pending. Recorded local backup/restore and rehearsal evidence is preserved in Section 11. Agree concurrent-user/data-volume and latency/error targets before a performance assessment.

The root [testing guide](../TESTING.md) gives the complete feature-to-test matrix. Appendix C supplies a reusable evaluation record.

### 9.5 Reviewed-workflow acceptance results

These 19 new cases passed against real PostgreSQL in `test/consistency.e2e-spec.ts`, alongside the 23 preserved consistency/recovery cases. Each uses owned synthetic fixtures and asserts database effects, not just HTTP status. No school records were used.

| Case | Accepted behavior and preservation | Status |
| --- | --- | --- |
| RV-01 | Same selected account IDs with changed relevant placement produce REVIEW_STALE; zero enrollment/receipt completion. | PASS |
| RV-02 | Name/notes changes are allowed; completed retry preserves original counts, including after expiry; newly eligible accounts wait for a fresh operation. | PASS |
| RV-03 | Expiry, another caller, changed input and different resource reject without partial enrollment writes. | PASS |
| RV-04 | Changed questionnaire with unchanged version ID invalidates creation review; fresh confirmation freezes reviewed IDs and retry returns the same evaluation. | PASS |
| RV-05 | New latest version invalidates creation review; reviewed set-only creation is rejected without assignment. | PASS |
| RV-06 | Malformed optional context and invalid schedules return 400 rather than server errors; no new assignment. | PASS |
| RV-07 | Bulk placement rejects changed placement; completed retry does not overwrite a later correction; missing review is rejected. | PASS |
| RV-08 | Reassignment checks same-ID placement/impact; success and completed retry move only enrollment and preserve frozen participants. | PASS |
| RV-09 | Ordinary stale opening/force attempt conflicts; reviewed explicit V1 retention opens V1 and preserves participants; completed retry cannot reopen later CLOSED state. | PASS |
| RV-10 | New latest invalidates opening review; valid existing whole-set-archived assignments continue, while new archived-set assignment fails. | PASS |
| RV-11 | Version preview reports exact moved/skipped impact without answer/identity linkage; confirmation protects V1 drafts/completions/base version, retries do not expand, and mixed results remain separate. | PASS |
| RV-12 | New draft invalidates application review and rolls back all movement/locking; empty latest is rejected without fallback. | PASS |
| RV-13 | Reviewed opening cannot bypass reversed/expired dates, archived individual versions, empty questions or absent frozen participants. | PASS |
| RV-14 | Already-on-target draft uses the existing already_on_target reason; preview totals match committed totals. | PASS |
| RV-15 | Cutover rejects all five legacy unreviewed mutation routes; new reviewed confirmation routes always reject missing review. | PASS |
| RV-16 | Every new route requires authentication and ADMIN authorization. | PASS |
| RV-17 | Simultaneous confirmation of one review commits once and permits original-result retry. | PASS |
| RV-18 | Reviewed enrollment overlapping placement produces a consistent earlier snapshot or complete atomic conflict with matching receipt state. | PASS |
| RV-19 | Draft saving during reviewed application causes complete movement/locking/receipt rollback; the draft remains protected. | PASS |

Acceptance limits: legacy omission is still allowed until agreed cutover; the actual frontend has not been connected here; school policies and official recovery evidence are pending. The progression, curriculum/title and historical-label approvals are implemented and recorded below; official recovery, intended-database deployment and frontend acceptance remain pending.

### 9.6 Progression policy acceptance

| Case | PostgreSQL acceptance scenario | Result |
| --- | --- | --- |
| SP-01 | Repeat progresses from approved placement, requires the new year's group and agrees across view/enrollment/targeting. | PASS |
| SP-02 | Transfer retains approved major/level across views and export; earlier placement remains unchanged. | PASS |
| SP-03 | Pause persists through ordinary placement and blocks enrollment/targeting/available surveys/drafts/submissions until explicit resume. | PASS |
| SP-04 | Same-year pause/resume preserves saved draft and exact frozen participant; ordinary group edit is not resumption. | PASS |
| SP-05 | Missing/null/blank yearly group blocks eligibility even on legacy offering paths; old group is never inherited. | PASS |
| SP-06 | Invalid/null actions, resume without pause, missing chronology and moving/deleting exception anchors are rejected. | PASS |
| SP-07 | Pause after preview rejects confirmation with no enrollment or completed receipt. | PASS |
| SP-08 | Resume without yearly group clears pause but keeps placement ineligible until assignment. | PASS |
| SP-09 | Prior approved-placement change invalidates review even when current account selection stays the same. | PASS |
| SP-10 | Pause blocks reassignment preview/confirmation and preserves original enrollment. | PASS |
| SP-11 | Missing pause chronology fails closed across views/targeting/access and retains assignment history. | PASS |
| SP-12 | Concurrent pause/draft save serializes consistently; no partial draft or frozen-history changes. | PASS |

Sixteen resolver unit cases additionally cover structured chronology instead of IDs, bounds, generation fallback, transfer major, group isolation, persistent pause, explicit resume, ambiguous anchors and loss of pause chronology. API fixtures now create valid synthetic annual assignments; the separate rejection cases test the required missing-yearly-group behavior. No full frontend acceptance or school deployment is inferred from these results.

### 9.7 Executed four-scenario HTTP walkthrough

The user asked Codex to complete the guided evaluation. The built API walkthrough finished on 08 October 2026 at 01:13:16, Asia/Phnom_Penh, against teacher_evaluation_test. Test configuration and current_database() were independently checked; the migration runner reported no pending test migrations and the build passed. An owned temporary server ran on port 30420. Swagger UI/OpenAPI/health, real ADMIN and STUDENT login, and authenticated role boundaries were checked through HTTP. Dedicated fixture accounts used temporary passwords; credentials and JWT tokens were excluded from recorded evidence.

| Step | Actual behavior and verified database effect | Result |
| --- | --- | --- |
| 1. Repeat/transfer | Generation formula gave Year 3; approved repeat resolved Year 2 and transfer resolved Year 4 with destination major. Before yearly assignment, neither inherited an old group. After assignment, student views, single enrollment, evaluation targeting and published-period export agreed. The entire earlier transfer placement remained unchanged. | PASS |
| 2. Pause/resume | PAUSE removed the evaluation from available work; questionnaire/draft/submission requests returned 403, and new enrollment returned 400. Targeting excluded the paused account. Group assignment alone did not resume it; resetting PAUSE to NORMAL returned 400. Explicit RESUME restored questionnaire and draft access. Exact saved draft content, version, timestamps and frozen evaluation rows were unchanged. | PASS |
| 3. Missing yearly group | Absent, null, empty and whitespace-only groups blocked eligibility; earlier groups were never inherited. Enrollment returned 400 and questionnaire/draft/submission access returned 403. Targeting excluded the account with missing_yearly_group. Reassigning the current-year group restored access. No spare enrollment or evaluation-history changes were created. | PASS |
| 4. Preserved drafts/completions | A nonempty identifiable saved draft and a completed anonymous rating response were created through the API. Later pause/resume and group removal preserved exact draft/response/answer content, versions, timestamps, frozen participants/targets, original enrollments, assigned questions and the other evaluation. Completion remained visible in student history and submission status. Anonymous response rows had no student/account/participant identity field. | PASS |

The walkthrough recorded 87 HTTP assertions and 42 database assertions, including owned-fixture cleanup checks. These are separate from the existing 492-unit/365-API Jest totals and must not be added to them. The 16 resolver tests and 12 PostgreSQL progression cases were freshly rerun and passed; 42 other consistency cases were skipped by the deliberate filter, not rerun or newly accepted. Business mutations used HTTP; direct Prisma operations prepared bounded synthetic academic/questionnaire fixtures and compared/removed only owned rows. No application source change was needed for this evaluation.

All owned temporary users, academic years, offerings and review receipts were verified removed; the owned test server was stopped. The normal database was not migrated or modified. Ignored sanitized evidence is .tmp/four-progression-scenarios-result.json, .tmp/four-scenarios-policy-unit.json and .tmp/four-scenarios-policy-api.json. The ignored executable walkthrough is .tmp/evaluate-four-progression-scenarios.cjs; it uses the guarded test runner and deletes only its owned synthetic fixtures.

**Frontend browser integration: NOT TESTED.** Only the backend project was available in this workspace. The configured frontend origin, http://localhost:5173, did not respond. Swagger/API success establishes the backend behavior, not the frontend's screen behavior or release acceptance. A frontend project/runtime or URL is needed to complete that separate evaluation. School deployment, official recovery and frontend acceptance remain pending; the historical-label approval is now implemented in Section 9.9.

### 9.8 Curriculum and global-title acceptance

Requirement 7 was approved and implemented on 8 October 2026. The focused PostgreSQL suite has 23 passing cases, all included in the 18-suite/388-test API total. After a final semantic-ID and Swagger refinement, all 23 cases and the 50 affected curriculum/offering unit cases passed again. The full 40-suite/492-test unit result remains recorded separately. Nine built-server checks passed at 01:35:54, Asia/Phnom_Penh: test database identity, health/docs, required revision inputs, the three authenticated read/write routes with concrete response examples, optional compatibility fields, invalid-input rejection and owned-fixture cleanup. The temporary server on port 30421 was stopped. Build/schema/whitespace pass; lint retains five existing warnings and no errors.

| Case | Executed acceptance behavior | Result |
| --- | --- | --- |
| CR-01 | pins the first applicable approval and leaves earlier legacy scopes unknown | PASS |
| CR-02 | rejects direct edits and deletion of revisioned rule identities | PASS |
| CR-03 | rejects missing, null or unstructured effective-year inputs without creating revisions | PASS |
| CR-04 | rejects same calendar year aliases and backdating using numeric chronology | PASS |
| CR-05 | keeps revision endpoints admin-only | PASS |
| CR-06 | rejects unsupported level, pre-effective year, missing year chronology and wrong explicit revision | PASS |
| CR-07 | returns an explicit applicable revision for frontend selection without guessing past rules | PASS |
| CR-08 | rolls back initial rule creation when its effective academic year is unstructured | PASS |
| CR-09 | resolves an omitted revision automatically for new tracked assignments | PASS |
| CR-10 | allows concurrent withdrawal attempts to commit at most one next revision | PASS |
| CR-11 | rejects new assignments after withdrawal without partial offering or scope writes | PASS |
| CR-12 | preserves enrollments, frozen participants, drafts, responses and answers after withdrawal | PASS |
| CR-13 | preserves the pinned revision when same scopes are resent or labels are edited | PASS |
| CR-14 | rejects replacement bindings, removed groups and changed semester for pinned offerings | PASS |
| CR-15 | retains all earlier revisions when a subsequent year explicitly resumes approval | PASS |
| CR-16 | rejects explicit obsolete revisions in a resumed academic year | PASS |
| CR-17 | protects referenced calendar chronology but permits display-name updates | PASS |
| CR-18 | rejects SQL rewrites of saved revision content and rule identities | PASS |
| CR-19 | does not invent revisions for untracked major assignments | PASS |
| CR-20 | requires a new rule identity when moving a course to another year level | PASS |
| CR-21 | retains global case-insensitive title ownership across admins and departments | PASS |
| CR-22 | rejects rename collisions and keeps archived titles reserved without merging history | PASS |
| CR-23 | serializes concurrent case-insensitive title creation across different admins | PASS |

The preservation test compares exact offering scopes, enrollments, evaluation/base version, frozen participants/completion, draft content/version/timestamps and anonymous responses/answers across a withdrawal. Explicit same-scope edits preserve original group row IDs/timestamps and revision bindings. Rejected assignment/revision creation leaves no partial rows. Concurrent academic-year approvals and concurrent case-insensitive title creation each commit one result and reject the other with 409. SQL rewrite attempts cannot alter saved revision content or a revisioned tuple.

Evidence: .tmp/curriculum-unit-final.json, .tmp/curriculum-api-final.json, .tmp/curriculum-focused-api.json and .tmp/curriculum-http-checks.json. Tests removed only their owned fixtures. The normal/school database was unchanged. Actual frontend/browser integration is NOT TESTED; legacy adoption, intended-database migration and official recovery remain pending. The historical-label decision pending at that curriculum delivery is now approved and implemented in Section 9.9. This closes requirement 7's agreed backend implementation, not school release acceptance.

### 9.9 Historical-label acceptance

The user explicitly authorized requirement 8 before implementation. Fresh full tests passed: 41 unit suites/500 tests and 18 API suites/398 tests, including 64 consistency cases. The ten historical-label PostgreSQL cases are included in 398; eight view/scope unit cases are included in 500. The earlier 492/388 curriculum totals remain historical evidence, not the latest result. Build, schema validation, test-database schema comparison and whitespace checks passed. Lint has five existing warnings and no errors.

| Case | Executed acceptance behavior | Result |
| --- | --- | --- |
| HL-01 | previews exact labels and captures them only in the committed targeting transaction | PASS |
| HL-02 | rejects a generation rename after review atomically and captures fresh labels after re-review | PASS |
| HL-03 | rejects a major rename after review atomically and captures fresh labels after re-review | PASS |
| HL-04 | rejects a academic_year rename after review atomically and captures fresh labels after re-review | PASS |
| HL-05 | keeps captured labels and exact drafts/completions/answers across renames and version application | PASS |
| HL-06 | keeps legacy target labels unknown through reads and lifecycle actions | PASS |
| HL-07 | rejects SQL rewrites of captured labels and frozen target identity | PASS |
| HL-08 | does not accept forged labels through compatibility creation DTOs | PASS |
| HL-09 | keeps whole anonymous aggregates and rejects mixed or unknown generation/group query slices | PASS |
| HL-10 | a real concurrent rename and confirmation retain one coherent snapshot or roll back atomically | PASS |

Six fresh built-server checks passed on owned port 30424: guarded startup/health; captured and UNKNOWN Swagger examples; historical/current report names; server-output snapshot fields and rejected forged/invalid assignment; explicit anonymous slice rejection with successful whole reports; and consistency fixture cleanup. The API's existing whitelist strips unknown request fields; it was not changed into global strict rejection. A valid isolated compatibility-creation test proves client-authored snapshot values cannot replace server labels. No new target-edit route exists. The temporary server was stopped.

Exact preservation comparisons cover frozen targets, original questionnaire versions, participant/completion rows, draft content/version/timestamps and anonymous responses/answers after generation/major/year renames and later questionnaire application. Stable retries retain their original snapshots without recreating targets or participants. A gated real PostgreSQL confirmation/rename overlap preserves one coherent earlier snapshot or rolls back atomically. Mixed and unknown generation/group query requests are explicitly rejected without reconstructing student-identifiable answers.

Evidence is .tmp/labels-unit-final.json, .tmp/labels-api-final.json, .tmp/labels-focused-api.json and .tmp/labels-http-checks.json. Tests cleaned up owned fixtures; the normal database is unchanged. Actual frontend UI/browser integration is NOT TESTED because no frontend project is available. The frontend team will evaluate the delivered GitHub repository using the root testing guide when publication is authorized. No commit or push was performed, and the user requires permission before further actions. Official recovery/backup/restore, intended-database deployment, load evaluation and frontend acceptance remain pending.

### 9.10 Earlier frontend-requirements evaluation and acceptance boundary

The final documentation review compares the eight areas in `D:\internship\imp1.txt` with the approved implementation and the latest recorded evidence. Backend implementation evaluation is complete for requirements 1-5, 7 and 8 within their agreed contracts. Requirement 6 is partial: the existing recovery tool passes synthetic tests, but official recovery acceptance depends on school/operator evidence. Requirements 2, 3 and 5 pass on reviewed workflows; default legacy compatibility means these guarantees are not yet mandatory for every caller. This is a backend review outcome, not completion of every frontend or school release obligation.

| Requirement | Backend result and evidence | Remaining acceptance |
| --- | --- | --- |
| R1 - Offering eligibility | PASS. Saved offering scope, ACTIVE accounts, A-only/shared A+B cases and required annual group are covered by the preserved PostgreSQL consistency checks. | Actual frontend behavior and school deployment. |
| R2 - Reviewed confirmation | PASS for reviewed paths. RV-01-RV-08 and RV-15-RV-19 cover semantic drift, caller/input/expiry, stable retries, authorization, cutover enforcement and atomic overlap. | Frontend adoption and agreed legacy cutover; unreviewed compatibility is still available by default. |
| R3 - Older assigned version | PASS. RV-05 and RV-09-RV-10/RV-13 cover explicit creation version, deliberate retention, stale reviews, archived-set continuity and normal opening checks. | Frontend explicit decision flow and mandatory version-selection rollout for legacy callers. |
| R4 - Progression exceptions | PASS. SP-01-SP-12 and 16 resolver unit cases cover repeat/transfer anchors, persistent pause/resume, annual groups, consistent readers/eligibility and preserved history. | Actual frontend acceptance and intended-database progression migration. |
| R5 - Latest-version impact | PASS for reviewed paths. RV-11-RV-12/RV-14/RV-19 cover preview/committed impact, protected drafts/completions, stable retry, version-separated results and atomic draft overlap. | Frontend adoption, legacy cutover and a decision before automatic application. |
| R6 - Historical recovery | PARTIAL. Two preserved PostgreSQL recovery cases and the packaged isolated read-only audit pass; the operator runbook is supplied. | Official intended database/provenance, approved records, secure verified backup/restore and full operator CLI rehearsal. No school backfill was performed. |
| R7 - Curriculum/title policy | PASS. All 23 curriculum/title PostgreSQL cases pass: effective-year revisions, retained offering bindings, withdrawal/reapproval, global title collisions and history preservation. | Actual frontend acceptance and intended-database curriculum migration; unknown legacy bindings remain explicit. |
| R8 - Historical target labels | PASS. HL-01-HL-10 and eight helper unit cases cover immutable capture, current/UNKNOWN separation, stale renames, protected answers, whole aggregates and coherent concurrent outcomes. | Actual frontend presentation and intended-database label migration; no legacy name reconstruction. |

At the earlier 8 October review, full runs began at 02:17:45 (unit) and 02:17:44 (API), Asia/Phnom_Penh. They passed 41 unit suites/500 tests and 18 API suites/398 tests, with zero failures or pending tests. The 64 consistency cases, 23 curriculum cases and 16 integration-story cases are subsets of that 398 API total. The 16 progression resolver cases and eight historical-label helper cases are subsets of the 500 unit total. Six built-server label checks passed afterward; these grouped checks are separate evidence, not additional Jest test counts. Build/schema checks passed; lint had no errors and five existing warnings. Section 9.11 supersedes those full-suite totals with the approved school-policy follow-up.

The subsequent requirement review and handoff/documentation preparation did not rerun the full backend suites. Eleven handoff JSON bodies were validated against the built DTOs and fourteen POST route references matched built controllers. The Markdown/Word reports were regenerated and checked for content, links, tables and OOXML/package integrity; visual Word rendering was unavailable. No UI, clean-clone installation, load benchmark, school restore or official migration was performed during these documentation steps.

Local raw test evidence is ignored under `.tmp`; reproducible test source and commands are part of the repository delivery. A recipient must run its own checks against the exact published commit, record its own results and fill the FE-01-FE-09 frontend checklist in Section 8.8. The current workspace remains uncommitted, and no push or school-database change is implied by this review. Section 11.4 identifies the remaining release tasks and their required decisions.

### 9.11 Approved school-policy acceptance

The owner approved both policies on 14 October 2026. All 12 new PostgreSQL cases passed in the full consistency suite, using only owned synthetic fixtures. The focused run passed 12 cases and skipped the other 64; the full run passed all 76 consistency cases. No filtered run is counted as full coverage.

| Case | Accepted behavior | Result |
| --- | --- | --- |
| POL-01 | Withhold OPEN/DRAFT lecturer answers; release results/dashboard/comments only after close; ADMIN monitoring retained. | PASS |
| POL-02 | Empty released list, authentication, role and lecturer ownership remain enforced. | PASS |
| POL-03 | DRAFT evaluations prevent changed course, lecturer or semester; exact history unchanged. | PASS |
| POL-04 | OPEN evaluations prevent changed context; exact saved drafts/completions/answers unchanged. | PASS |
| POL-05 | CLOSED evaluations prevent changed context; exact history unchanged. | PASS |
| POL-06 | DRAFT evaluated semester cannot move to another academic year. | PASS |
| POL-07 | OPEN evaluated semester cannot move to another academic year. | PASS |
| POL-08 | CLOSED evaluated semester cannot move to another academic year. | PASS |
| POL-09 | Unused offerings/semesters remain editable. | PASS |
| POL-10 | Identical IDs and permitted display edits retain scopes, drafts and anonymous answers. | PASS |
| POL-11 | Concurrent offering reassignment rolls back when evaluation creation commits. | PASS |
| POL-12 | Concurrent semester year move rolls back when evaluation creation commits. | PASS |

Full verification passed 41 unit suites/500 tests and 18 API suites/410 tests, with zero failures/pending tests. The 12 policy cases are part of 410, not additional tests to add to that total. The targeted three unit suites passed 66 tests; full regression includes them. Build and test-environment guard passed. Lint has no errors and the same five existing warnings. Evidence is .tmp/school-policy-unit-final.json, .tmp/school-policy-api-final.json and .tmp/school-policy-focused.json.

Assertions compare complete owned offering history after rejected requests, including enrollments/scopes, frozen evaluation context, participants, drafts and anonymous responses/answers. Permitted metadata changes retain those history rows. SQL barriers exercise real serializable overlap: committed evaluation creation causes the context-changing transaction to roll back. Fixture cleanup removes only owned synthetic rows. No schema/private environment changes, migration, reset, school backfill or commit/push occurred. Frontend UI evaluation remains NOT TESTED.

### 9.12 Primary-department integrity acceptance

The owner approved the one-primary rule before implementation. At that implementation stage, the isolated test audit found zero duplicate users among three memberships, all primary for separate accounts, and the migration was applied only to teacher_evaluation_test. The same three membership/primary counts remained after tests, the SQL partial index was valid/unique and no owned consistency accounts remained. Normal was not audited or changed during that initial stage; its later separately approved audit and alignment are recorded in Sections 11.5 and 11.8.

| Case | Accepted behavior | Result |
| --- | --- | --- |
| PD-01 | Multiple non-primary memberships and zero primary remain valid. | PASS |
| PD-02 | Atomic primary switch retains memberships/timestamps and consistent profile flags. | PASS |
| PD-03 | Repeated assignment remains idempotent; demotion/removal does not invent a replacement. | PASS |
| PD-04 | Invalid/missing/inactive references and malformed input do not demote the previous primary. | PASS |
| PD-05 | Authentication and ADMIN authorization remain enforced without writes for rejected callers. | PASS |
| PD-06 | Direct SQL cannot create two primaries; the whole statement rolls back while non-primary rows remain supported. | PASS |
| PD-07 | Gated simultaneous first-primary requests commit once, return a conflict and permit a deliberate reload/retry. | PASS |
| PD-08 | A disappeared target department rolls back the old-primary demotion and all attempted membership writes. | PASS |
| PD-09 | The exact migration preserves clean temporary rows and creates the partial unique index. | PASS |
| PD-10 | The exact migration refuses duplicate temporary data without rewriting it or choosing a winner. | PASS |

Focused PostgreSQL run: 10 passed, 76 skipped; it is not a full regression. Full verification: 41 unit suites/502 tests and 18 API suites/420 tests passed with zero failures/pending tests, including all 86 consistency cases. The two targeted user unit suites passed 24 tests. Build passed; lint had no errors and the same five existing warnings. SQL barriers exercise actual concurrent transactions, and migration refusal is tested on temporary tables with savepoints; the public index is never dropped to create bad fixtures.

Read-only verification confirmed the migration completion record, public partial index predicate/validity, zero duplicate primaries, preserved initial membership counts, cleanup and an empty ORM schema diff. The SQL index is verified separately from the Prisma model representation. Evidence is .tmp/primary-departments-audit.json, .tmp/primary-departments-unit-final.json, .tmp/primary-departments-api-final.json, .tmp/primary-departments-focused.json, .tmp/primary-departments-evaluation.json and .tmp/primary-departments-schema-diff.sql. These ignored artifacts contain synthetic evidence, not school approval.

Both report formats document current contracts and deployment prerequisites. No automatic record correction, normal/school migration, reset, credential replacement or commit/push was performed. Actual frontend UI evaluation remains NOT TESTED. Additional database constraints or other improvements require a separate agreed scope.

### 9.13 Read-only normal/test database structure comparison

Step 1 of the database-design review completed on 14 October 2026 at 15:00:59, Asia/Phnom_Penh. The actual configured local databases teacher_evaluation and teacher_evaluation_test were inspected in their public schemas; both reported PostgreSQL 18.4. Each inspection used a repeatable-read transaction with transaction_read_only confirmed on, statement/lock timeouts and catalog-only queries. The only application-adjacent records read were migration names, checksums and completion/rollback status. No application records, credentials or answer content were displayed or copied.

| Inspected item | teacher_evaluation (normal) | teacher_evaluation_test |
| --- | --- | --- |
| Application tables, excluding _prisma_migrations | 26 | 28 |
| Application columns | 174 | 199 |
| Applied repository migrations | 12 of 17 | 17 of 17 |
| Pending repository migrations | 5 | 0 |
| Failed/incomplete migration records | 0 | 0 |
| Applied migration checksum mismatches | 0 | 0 |
| Applied migrations absent from this repository | 0 | 0 |
| Indexes on application tables | 53 | 60 |
| Enumerated types | 9 | 10 |
| User-defined triggers | 0 | 5 |

The databases are not currently structurally identical. All observed differences are objects present only in the test database; no changed definitions or normal-only objects were found in the compared tables, columns, constraints, indexes, enums, triggers or associated trigger functions. This is a catalog comparison, not proof of data equality, backup recoverability, database-role permissions, operational settings or performance.

| Migration missing from the normal database | Missing structure / protection |
| --- | --- |
| 20261007140000_add_reviewed_operations | reviewed_operations table, reviewed-confirmation storage, checks and indexes. |
| 20261008010000_add_student_progression | student_progression_action enum and student_academic_records.progression_action column. |
| 20261008020000_add_curriculum_revisions | curriculum_revisions table, course_offering_group_scopes.curriculum_revision_id, related checks/indexes/foreign keys and three immutability triggers. |
| 20261008030000_add_historical_target_labels | historical_labels and labels_captured_at on both target tables, pair checks and two immutability triggers. |
| 20261014010000_enforce_one_primary_department | Partial unique index user_departments_one_primary_per_user_idx. |

The 25 test-only columns comprise 19 columns in the two new tables and six added columns on existing tables. The catalog also records seven test-only indexes, one test-only enum, five triggers and four associated trigger functions. Constraint totals include PostgreSQL 18 not-null constraints. Migration checksums were compared with the repository SQL, accounting for LF/CRLF line endings; none differed. The checked schema represents 28 application models, all present in the test database; the normal database lacks reviewed_operations and curriculum_revisions.

The normal database must receive the five pending migrations before the updated backend can use all delivered features there. Do not use migration reset or copy test records into it. Before any normal/intended-database deployment, identify the authoritative target, verify a restorable backup, review migration impact and audit primary-department duplicates. This step did not inspect normal membership records or establish that its data satisfies the new constraint. Obtain separate approval before applying migrations or correcting data.

Evidence is the ignored local .tmp/database-structure-comparison-20261014.json, generated by .tmp/compare-database-structures.cjs. Database identities and metadata were saved without connection strings, passwords or application rows. Both reports were updated; no database migration, seed, reset, application-data write, commit or push was performed. The recorded 502-unit/420-API results remain earlier regression evidence and were not rerun for this read-only comparison. Step 2, further constraint improvements, has not started.

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

### 10.3 Follow-up operational evidence

On 7 October 2026, `node test/run-e2e.cjs check` passed. The packaged audit command `node scripts/historical-metadata.cjs review --test --output .tmp/frontend-followup-20261007/test-database-review.json` also succeeded against the guarded local `teacher_evaluation_test` connection. It reported **zero unversioned submissions and zero unversioned drafts**, with no backfill performed. This establishes fresh test-database configuration and read-only audit packaging, not the school database's counts.

The focused command `node test/run-e2e.cjs test --runTestsByPath test/consistency.e2e-spec.ts -t 'historical recovery' --json --outputFile=.tmp/frontend-followup-20261007/recovery-tests.json` then passed **two recovery cases in one suite; 21 other cases were skipped by the filter**. Using owned synthetic PostgreSQL fixtures, these cases check independent evidence, dry-run, idempotent metadata apply, exact conditional rollback, rejection of stale batches and preservation of ambiguous records. This rerun exercises the existing tool functions through tests; it is not a complete operator CLI/backup/restore rehearsal, a school backfill, a full consistency regression, or frontend acceptance. The tests clean up their owned temporary records. Private audit/test artifacts are ignored and are not intended for repository publication.

### 10.4 School operator handoff checklist

1. Record the intended host/port/database/schema without credentials and verify it with an actual database connection. Compare a fresh audit fingerprint, not the older local counts. The school owner must identify whether the configured normal database is authoritative.
2. Take a complete PostgreSQL backup to an access-controlled operator location. Record tool/server versions, backup format, timestamp, checksum and scope. A recognizable header or `pg_restore --list` alone does not prove recoverability.
3. Restore into a separately approved isolated validation database, never over the school database. Verify schema, row counts and preserved credentials/statuses/placements/enrollments/participants/drafts/responses; record evidence that the restored backup is usable. Do not create or reset this database implicitly from the application.
4. Obtain independent historical provenance and verifier approval for each manifest record. Mark ambiguous candidates for review instead of guessing. Verify fingerprints and recorded question/version ownership.
5. Run a dry-run using the approved manifest against the intended database. Record exact recoverable/already-applied/rejected counts and resolve any rejection before school mutation.
6. Obtain school/operator approval for that exact manifest, database and impact. Run metadata-only apply with the verified backup and a new journal path. Keep artifacts private and preserve original content/timestamps/history.
7. Verify the committed counts and known/unknown breakdown. Repeating an approved operation must not rewrite content. If interrupted, inspect the journal and dry-run before retry; do not assume that the presence of a journal proves commit.
8. If rollback is approved, use the apply journal and fresh rollback journal. Conditional rollback must refuse changed fingerprints or another saved version. Record final outcome and remaining unversioned limitations.

This is an operator runbook, not proof those school steps were performed. The isolated audit and existing synthetic recovery cases passed; the intended official database, provenance, secure complete backup/restore and school approval are still dependencies. The review-table deployment is also an additive migration that needs the intended deployment's backup/impact procedure; it is not a historical recovery operation.

## 11. Remaining decisions and next steps

**Current defense boundary:** Feature development is frozen at Step 43; prepare the thesis, slides and repeatable backend demonstration. Larger A–S additions remain limitations/future work in the current scope table. The publication/alignment narratives below are dated 14 October evidence, not approval to publish or migrate the later local work. Normal has not received migrations 19–23.

At the earlier handoff, the project owner confirmed that the frontend was unavailable, so actual browser integration was NOT TESTED then. The backend delivery was subsequently recorded as published commit a298798. The frontend is now available locally, with three narrow browser cases passed and the remaining acceptance pending; Section 13 contains the current status. API/database evidence and browser acceptance remain separate. Additional local code/documentation changes have no commit or push authorization.

| Decision owner | Decision needed | Effect |
| --- | --- | --- |
| Frontend/backend teams | Integrate and evaluate the implemented review_id, preview/confirm, retention and original-result retry contract. | Approve actual frontend behavior and choose the legacy cutover; backend implementation authorization is not frontend acceptance. |
| Frontend/backend teams | Mandatory explicit version selection versus set-only compatibility. | Establish reviewed-save behavior for every caller and any deprecation period. |
| Frontend/backend teams | Evaluate the approved progression workflow against the actual frontend; prepare intended-database deployment. | Policy and backend implementation are complete; no school database migration was executed. |
| Frontend/backend teams and operator | Evaluate the approved curriculum/title contract and deploy its additive migration to the intended database. | Policy and backend implementation complete; legacy unknown bindings remain explicit and no school migration was performed. |
| Frontend/backend teams and operator | Evaluate approved historical_labels/current_labels/UNKNOWN presentation and deploy the additive migration. | Policy and backend implementation complete; no legacy names were inferred and no school migration was performed. |
| School/operator | Official database, provenance and verified backup/restore. | Establish whether and how historical metadata can be recovered. |

The reviewed-confirmation/progression/curriculum/historical-label contracts from the earlier delivery are implemented; the expanded A–S roadmap is only partly complete. Delivery a298798 was recorded as published on 14 October, while Steps 1–43 remain local and uncommitted. Current handoff work is to preserve/review that checkpoint, prepare the defense, and separately coordinate frontend acceptance, legacy cutover, actual school deployment, load and operational recovery. Any newly requested behavior needs its own agreed scope and meaningful acceptance checks. No approval is inferred from a passing regression suite.

The earlier reviewed-workflow, progression, curriculum and historical-label delivery was committed/pushed as `f80ab22`. The school-policy, primary-department, academic-integrity and documentation follow-up is included in this owner-authorized master delivery. The owner separately approved local teacher_evaluation alignment; the five migrations pending in that earlier alignment were applied there on 14 October with original values preserved. Later test-only migrations 19–23 have not been applied to normal. Other school targets and official historical recovery remain separate scopes. Private environment/backup/temp files remain excluded from Git. Publication approval covers the reviewed source and documentation, not private artifacts. The earlier targeted credential-pattern scan was not a comprehensive security audit.

Approved delivery commit title: `Enforce academic integrity and protect evaluation history`.

Suggested handoff description: release lecturer answers/comments only after CLOSED; preserve evaluated assignment identity; retain approved progression, yearly group, curriculum and historical-label behavior; enforce primary-department and academic-integrity rules. Full regression passed 514 unit/471 API tests. Fresh protected backup/restore and a 160-case rehearsal preceded the approved normal 17 -> 18 migration. At that 14 October delivery both configured databases had 28 application tables/199 columns/all 18 migrations; original normal values/sequences/old migration records were preserved and 16 read-only normal GET checks passed. Rehearsal/read-only checks are separate evidence, not extra regression cases. Frontend UI acceptance, reviewed cutover, official recovery and school production readiness remain pending. This is reviewable publication text, not a new commit or push.

### 11.1 School policy recommendations for approval

The progression, curriculum/title and historical-label recommendations were explicitly approved by the user and implemented. Official recovery still needs operator evidence.

- **Repeat/pause/transfer - approved and implemented:** progress from the latest approved placement, keep a pause until explicit RESUME, and require a nonempty group for the selected academic year. The additive action field and shared resolver preserve calculated normal progression without manufacturing annual records. Missing/conflicting exception chronology is UNRESOLVED and ineligible. Section 8.5 documents the concrete ADMIN workflow.
- **Curriculum - approved and implemented:** effective academic-year revisions preserve existing saved offering bindings. Use numeric start_year; same-year and backdated subsequent revisions conflict. Moving course/major/year level uses a new identity and withdrawal of the old rule. Legacy unknowns remain null. Sections 8.6 and 9.8 document validation, compatibility and test-only migration.
- **Question-set titles - approved and retained:** global case-insensitive uniqueness applies across administrators/departments and includes archived sets. Surrounding whitespace is trimmed. Concurrent create/rename collisions return 409; sets and histories are never merged. No department ownership migration was introduced.
- **Historical labels - approved and implemented:** capture server-authored generation/group display snapshots when targeting is confirmed. Expose historical_labels and current_labels separately with CAPTURED/UNKNOWN status and capture time. Older null labels remain unknown; no name backfill or current-name fallback. Selected label drift requires re-review. Preserve whole anonymous aggregates and explicitly reject unsupported slicing. Sections 8.7 and 9.9 define the contract and evidence.
- **Recovery:** obtain the operator's intended database and school-approved independently verified manifest. Complete and verify a secure backup/restore rehearsal before school apply. Preserve records whose provenance is unavailable; recovery of synthetic fixtures does not approve school backfill.

### 11.2 Step-by-step execution and acceptance plan

Notify the user when each step is finished and update both report formats with evidence and remaining limits. Continue independent authorized work while decisions are pending; do not implement an unagreed contract or invent school policy.

| Step | Work and completion criterion | Current status |
| --- | --- | --- |
| Step A | Confirm the source file; compare against current code; record all remaining requirements, concrete API/storage/compatibility proposals and school recommendations. | Complete; imp1.txt reviewed and implementation authorized by the user. |
| Step B | Establish routes/DTOs, expiry, actor binding, retries, retention, storage migration and compatibility. | Concrete contract authorized for backend implementation. Default compatibility remains; actual frontend acceptance and cutover decision pending. |
| Step C | Implement reviewed enrollment, full evaluation-create targeting, reassignment and bulk group placement using shared protected transactions and durable original results. | Implemented; tested unchanged review, same-ID drift, unrelated-field changes, exact retry, concurrency/rollback and direct API rejection when cutover is enabled. |
| Step D | Implement older-assigned-version opening review/confirmation. | Implemented; tested deliberate V1 retention with V2, stale/latest drift, archived/unusable versions, frozen membership and retry after later closure. |
| Step E | Implement unfinished-version impact preview/confirmation. | Implemented; tested draft/completion/base preservation, exact impact/retry, skipped-reason compatibility and real PostgreSQL overlap with draft saving. |
| Step F | Validate recovery packaging and synthetic dry-run/apply/repeat/conditional rollback; complete intended-database/evidence/backup/restore runbook. | Fresh packaged read-only audit and two existing PostgreSQL recovery cases passed. Full operator CLI/backup/restore rehearsal and school evidence remain pending; school apply is a separate approved action. |
| Step G | Approve and implement exception continuity, curriculum/title policy and historical-label presentation where changes are needed. | Progression policy approved and implemented; 12 PostgreSQL acceptance scenarios and 16 resolver cases pass. Curriculum/title policy is approved and implemented with 23 PostgreSQL cases; historical-label policy is approved and implemented with 10 PostgreSQL and 8 unit cases. |
| Step H | Run fresh unit/API/PostgreSQL regressions, build/lint/schema checks and actual frontend acceptance; update evidence and evaluate together. | Backend regression/build/schema checks executed; latest evidence is in Section 9. Actual frontend/browser acceptance and intended-database school deployment remain pending. |

Final evaluation should map every acceptance case to an actual request, expected/actual result, exact database effect and evidence, using Appendix C. School/contract dependencies stay BLOCKED or NOT TESTED until resolved; a documentation proposal is not a PASS for an unimplemented feature. Commit/push is not part of this follow-up unless separately requested.

### 11.3 GitHub repository preview for the frontend team

Step 2 documentation preparation is complete: Section 8.8 supplies isolated setup, synthetic login, six reviewed request sequences, errors/retries and the FE-01-FE-09 frontend checklist. Eleven JSON request bodies validate against the current built DTOs and fourteen POST route references match the built controllers. Both report formats have matching handoff content and pass package/content checks; Word visual rendering was not available. This documentation update introduces no new full backend test run, database change, frontend acceptance or repository publication. The owner must authorize the next step separately.

The tracked .env.test.example provides placeholders for a separate local teacher_evaluation_test database. Copy it to the ignored .env.test.local without overwriting existing configuration, enter local credentials and a random test JWT secret, then follow the clone-and-test procedure in root TESTING.md. The database must exist before migration. Use npm.cmd ci, npm.cmd run test:e2e:generate, npm.cmd run test:e2e:check, npm.cmd run test:e2e:migrate and npm.cmd run test:e2e:seed. Run unit/API tests and npm.cmd run build; npm.cmd run start:test starts the built API using the same local test-database guard. Optional --port selects another preview port. Open /api/docs for Swagger and /api/health for readiness. The guard rejects remote/normal databases and a non-test NODE_ENV. No UI project is needed for this API preview.

Five grouped built-server preview checks passed on 8 October 2026 at 01:51:58, Asia/Phnom_Penh, using owned temporary port 30423: guarded startup/database/port, Swagger UI/OpenAPI, documented synthetic ADMIN login and authenticated profile, protected-results rejection, and configured-origin CORS preflight. The server was stopped. The guarded Prisma-generation command passed and invalid preview port input was rejected before startup. Lint has no errors and five existing warnings. No normal database was changed and no school deployment or GitHub push was performed. These checks are separate from the earlier 492-unit/388-API totals; the full suites were not rerun for the preview-command/documentation addition.

Evidence is .tmp/repository-preview-checks.json. The frontend team should record the delivered commit/branch, its own test results, browser integration, reviewed-confirmation rollout and remaining acceptance findings. The historical-label policy was subsequently explicitly approved and implemented; Sections 8.7 and 9.9 record that separate authorized work. Repository preview preparation alone did not approve that schema change.


### 11.4 Final release tasks and ownership

The three requested preparation steps are complete: requirements/evidence review, frontend handoff preparation, and final evaluation/release-task documentation. The backend's approved implementation and local evaluation are ready for review. Further actions require the owner's permission. Keeping the preparation complete does not mark the tasks below complete.

| Task | Owner and completion evidence | Status / dependency |
| --- | --- | --- |
| RELEASE-01 - Publish approved delivery | Recorded delivery a298798 includes school policies, primary-department protection and academic-integrity work. Local HEAD and origin/master match; no fresh remote check was performed. | Delivered publication recorded. Subsequent local Step 1/Step 2/Step 3 changes and documentation maintenance remain uncommitted; separate approval is required to commit/push them. |
| RELEASE-02 - Reproduce repository setup | Backend/frontend tester runs the documented isolated setup from a clean checkout of the published commit; records runtime, migrations, tests, health, Swagger and synthetic login. | NOT TESTED from a clean published checkout. Current local test results remain valid local evidence. |
| RELEASE-03 - Evaluate the frontend UI | Frontend team completes FE-01-FE-09 with requests/results and browser evidence. Report defects with the source snapshot and scenario IDs. | Partial: frontend available; three narrow Brave cases PASS, opening BLOCKED and remaining workflow NOT TESTED. Section 13.4 records the exact scope. |
| RELEASE-04 - Agree reviewed-workflow cutover | Frontend/backend teams prove each caller sends explicit versions and fresh reviews, agree automatic-application behavior and then authorize the operator's configuration/restart. Verify missing-review rejection and safe retries. | PENDING agreement. Default REQUIRE_REVIEWED_CONFIRMATION=false preserves compatibility; true-mode rejection is already backend-tested. |
| RELEASE-05 - Verify official recovery | School/operator identifies the authoritative database and independent provenance; rehearses CLI/secure backup/restore; approves exact manifests and journals before school metadata apply. Preserve ambiguous records. | Local teacher_evaluation backup/restore passed in Section 11.6. Official historical recovery remains BLOCKED on official evidence, CLI rehearsal and operator approval; no school metadata recovery was performed. |
| RELEASE-06 - Prepare school deployment | Verify the authoritative school target, protected restoration procedure and all required migrations; evaluate school-sized load and full frontend/backend workflows before release. | Inspected local teacher_evaluation is aligned through 18 migrations (Sections 11.8/11.12). Another school target, load/frontend acceptance and production release remain PENDING; no other school target was migrated. |

Frontend API testing on an isolated database can proceed after an authorized repository publication without waiting for official historical recovery. School deployment and official metadata recovery each require their own operational evidence. Agree performance expectations before load testing; do not invent acceptable latency/concurrency thresholds. Preserve all existing accounts, credentials, placements, enrollments, frozen targets, drafts, anonymous answers and unknown legacy metadata throughout operational work.

The earlier f80ab22 delivery was committed/pushed. Separate publication approval resulted in recorded delivery a298798. That historical approval does not authorize publication of subsequent local changes, frontend cutover, additional database changes or school production release. Private environment files and ignored evidence remain excluded from source control.

### 11.5 Safe normal-database migration plan for owner review

The owner requested preparation of a safe alignment plan. Data provenance remains unconfirmed: teacher_evaluation may contain development data, real school records or a mixture. Small row counts do not establish provenance. All records were treated as data to preserve. The owner separately authorized backup/restore, rehearsal and the subsequent local normal migration/read-only verification; Sections 11.6-11.8 record completion. The updated stage table below reflects those completed local steps. Other targets or additional changes require a new agreed scope.

**Completed preflight.** On 14 October 2026 at 15:20:29, Asia/Phnom_Penh, an aggregate-only audit used a repeatable-read, explicitly read-only transaction against local teacher_evaluation/public on PostgreSQL 18.4. It found zero users with duplicate primary memberships among four memberships, zero conflicting names for the planned new relations/types/functions/columns, and zero unvalidated constraints. The configured database role has public-schema CREATE access and access through ownership roles for the seven affected existing tables. No other database connections/open transactions were observed at that instant; this does not guarantee a later maintenance window or predict migration duration.

The baseline contains 11 accounts, two student profiles, one placement, 10 enrollments, three evaluations, 10 participants, one draft, two responses and seven answers. Both responses have unknown questionnaire-version metadata; no draft has an unknown version. No numeric academic-year chronology is missing and no placement is outside supported levels 1-5. Only counts were retained; no identities, credentials, draft JSON or answer text were exported by this audit. The counts are a preservation baseline, not proof that the records are synthetic or that their historical meaning is recoverable.

The installed pg_dump.exe and pg_restore.exe under C:/Program Files/PostgreSQL/18/bin both report version 18.4, matching the inspected server. The initial preparation checked tool availability only; the subsequent authorized backup/restore is recorded in Section 11.6. Preflight evidence is the ignored .tmp/normal-migration-preflight-20261014.json and its local helper .tmp/audit-normal-migration-preflight.cjs.

| Plan stage | Concrete action and acceptance criterion | Current status |
| --- | --- | --- |
| M1 - Identify records and target | Verify the local target; preserve every existing record when provenance is unconfirmed. Agree backup/restore scope and access controls. Confirm authoritative school provenance separately before school deployment/recovery. | Local target and protected backup/temporary restore scope verified and authorized. All records preserved; authoritative school provenance remains unconfirmed. |
| M2 - Review migration impact | Review the five pending SQL files in Section 9.13 and repeat the duplicate/name/status checks immediately before deployment. Confirm exact release source and a last known compatible application build. Preserve unknown historical records. | Read-only SQL review and aggregate preflight COMPLETE; final cutover check still required. |
| M3 - Back up and prove restoration | Produce a full single-database custom-format archive in protected storage; restore into a fresh isolated target and verify complete rows, schema, permissions, migration history and sequences privately. Repeat cutover backup/maintenance preparation before any later normal migration. | PASS for the current local database; Section 11.6. Exported read-only snapshot used, with no other source sessions observed. No service was stopped and no normal/test migration was performed. |
| M4 - Rehearse migration on the restored copy | Check the isolated target identity before every command. Apply the exact five pending migrations there, compare schemas/indexes/triggers and verify existing record values, including version nulls, participant/draft/response history and credentials. Exercise the reviewed/progression/curriculum/label/department workflows using owned fixtures only in the isolated copy. | PASS: five migrations and 109 targeted API/PostgreSQL checks completed; original values preserved and owned fixtures removed. Section 11.7. Normal/test databases unchanged. |
| M5 - Review and approve normal deployment | Review backup/restore/rehearsal evidence, expected effects and rollback procedure. Following owner approval for the exact local target, verify the fresh cutover backup and absence of other source sessions, then apply only pending versioned migrations. | COMPLETE for local teacher_evaluation: owner approved, fresh backup/restore passed, no other source sessions observed, and the five migrations applied. Section 11.8. |
| M6 - Verify and release | Confirm 17 successful migrations, 28 application tables/199 columns and expected schema protections; compare preserved original values and sequences. Run read-only health and authenticated readers, then close the validation instance. Keep synthetic write tests isolated. | COMPLETE for local alignment: schema/data preservation and 16 read-only GET checks passed. No persistent service restart, public deployment or frontend acceptance was performed. Section 11.8. |

**Expected migration effects.** The new progression column gives existing placement rows the explicit NORMAL default; it does not discover historical repeat/transfer/pause decisions. Existing offering scopes retain null curriculum bindings, and old target rows retain null labels/capture times. No migration assigns a guessed survey version to the two unversioned responses, changes an account password or copies synthetic test records into normal. The primary index rejects duplicate primaries without selecting a winner. Academic-year chronology and historical targeting protections are created as specified in the reviewed SQL; verify them on the restored copy rather than inferring deployment safety solely from additive SQL.

**Backup and restore boundaries.** A single-database pg_dump archive does not capture cluster-wide role definitions, PostgreSQL server configuration or private application environment files. The operator must verify that required roles/permissions, extensions and connection configuration exist for the restore and separately protect any needed operational material. Restore into a fresh isolated database with an explicit approved name, not teacher_evaluation or the shared teacher_evaluation_test. This is a temporary validation target, not an additional permanent application database. Do not use pg_restore --create (which can select the archive's original database name), --clean, migration reset, or test seeding as a restoration shortcut. A successful isolated restore must be checked, not assumed from an archive listing.

**Rollback boundary.** The five migrations are separate deployment steps; a deployment failure can leave earlier steps applied. Stop, inspect migration history and actual schema, and use a reviewed recovery procedure rather than rerunning blindly or dropping new objects. A rollback to the cutover backup would discard subsequent writes unless they are preserved/reconciled, so keep writers paused until the acceptance decision and pair any restore with the confirmed compatible application build. No rollback, schema downgrade or normal-database restore is authorized by this plan.

The initial plan preparation changed only documentation and performed read-only audits. The owner later separately authorized the operational steps recorded below, including the local normal alignment in Section 11.8. No test-database migration, credential replacement, commit or push was performed during that alignment. Further database-design constraint improvements are a separate scope.

### 11.6 Completed local backup and isolated restore validation

The owner authorized starting the backup/restore step with all existing teacher_evaluation records preserved. Native pg_dump/pg_restore 18.4 created and restored a full custom-format single-database archive on 14 October 2026. Execution started at 16:00:14 and verification completed at 16:03:48, Asia/Phnom_Penh. The source inspection transaction was repeatable-read and read-only; its exported snapshot was passed to pg_dump so the original full-row comparison and archive used the same committed data snapshot. Zero other source sessions were observed before the dump. Normal and test database configurations and records were not changed.

| Artifact / check | Verified result |
| --- | --- |
| Backup archive | .tmp/backups/teacher-evaluation-20261014-155714-7066b3ca/teacher_evaluation.dump; 97,514 bytes. |
| SHA-256 | 10cc51da06e0c9e8e05c5eced953ad4e42f1a01de628836c92f2b14ffffb67ba; independently rechecked after restoration. |
| File access | Folder inheritance disabled; folder and all archive/log/manifest artifacts allow only the current Windows user and SYSTEM. Git-ignore verified. |
| Temporary restore database | teacher_evaluation_restore_20261014_155714_7066b3ca; newly created empty target with source encoding/locale/owner, and PUBLIC database CONNECT revoked. |
| Native restore | Explicit temporary target, single transaction, exit-on-error; no --create, --clean, reset or seed. Dump/restore exited successfully, with empty stderr logs. |
| Application structure | 26 application tables and 174 columns restored; logical schema, constraints, indexes, enums, triggers, functions, sequences, extensions, policies, ownership and effective permissions match. |
| Complete row comparison | All 27 tables including _prisma_migrations match full-row HMAC-SHA-256 digests and counts. The random comparison keys stayed in memory and were not persisted. |
| Sequence state | All 23 sequences retain their original last_value and is_called state. |
| Migration history | All 12 original migration records preserved. No additional migrations applied to source, test or temporary target. |
| Historical data | Both unversioned responses remain unknown; saved draft, answers, accounts/credentials, placements, enrollment and participant records match the archive source. |

The preserved row counts include 11 accounts, two profiles, one placement, 10 enrollments, three evaluations, 10 participants, one draft, two responses and seven answers. Complete canonical rows were compared privately, including credential hashes, timestamps, draft JSON and final answers; none were printed in tool output or public reports. The comparison covers values, not just counts. Fresh read-only captures of source and restored copy also matched, with all original source counts retained.

The first comparison flagged raw catalog representation differences: public-schema permissions changed from default/null representation to explicit equivalent grants, and the recreated semesters table no longer contained a physical column slot left by a previously dropped column. Verification was corrected to compare effective ACLs and visible column order. Complete-row/sequence comparisons from the original exported snapshot and first restored capture passed, followed by fresh semantic schema and complete-row checks. No application object or record was edited to make the comparison pass.

Private evidence is .tmp/backup-restore-evaluation-20261014.json plus the ACL-restricted archive, native logs and original/semantic manifests in its backup folder. Helpers are ignored local .tmp/backup-and-restore-normal.cjs and .tmp/verify-existing-restore.cjs. The archive is access-controlled, not encrypted; keep it private, outside Git and outside frontend/professor submissions. This proves restoration of this local single-database archive on the same PostgreSQL cluster. It does not establish an off-machine disaster-recovery procedure, authoritative school provenance, cluster-role/server-configuration backup or official historical metadata recovery.

The temporary database is an isolated validation copy, not another permanent application database. At completion of this backup/restore step it retained the original 12-migration schema, while normal still had five pending migrations and test had all 17. No temporary copy deletion, migration rehearsal, normal migration, school backfill, credential change, commit or push occurred during backup verification. The subsequent separately authorized rehearsal is recorded in Section 11.7. The normal database's five migrations still require the later review/approval step; no new unit/API regression was run for backup verification. Both existing report formats were updated and checked.

### 11.7 Completed migration rehearsal on the restored copy

The owner separately authorized rehearsing the five pending migrations on teacher_evaluation_restore_20261014_155714_7066b3ca. This step started on 14 October 2026 at 16:17:19 and completed at 16:21:57, Asia/Phnom_Penh. Source and test were inspected read-only; the only migration/fixture writes targeted the verified temporary copy. Private .env and .env.test.local files were not modified. No application implementation change, normal/test migration, commit or push occurred.

The existing normal/test runner retains its exact teacher_evaluation_test guard. A separate ignored local rehearsal environment validates localhost, the exact restore database from the successful backup evidence and the public schema before supplying the isolated connection to Prisma/Jest. It does not enable arbitrary target names. Migrate deploy applied only the five versioned SQL files listed in Section 9.13, with no migration reset, seed, guessed backfill or credential replacement. All 17 migration records then completed successfully, with no failed/rolled-back entry; repository checksums and the original 12 records matched.

| Rehearsal acceptance | Verified result |
| --- | --- |
| Schema transition | Copy changed from 26 application tables/174 columns/12 applied migrations to 28 tables/199 columns/17 applied migrations. |
| Existing rows immediately after migration | Complete original-column projections for all 26 original application tables matched full-row HMAC digests and counts; original stored values were preserved. |
| New fields | Existing placements have NORMAL; legacy curriculum bindings and target-label fields remain null. New reviewed_operations and curriculum_revisions tables remain empty after fixture cleanup. |
| Original sequence state immediately after migration | All 23 original sequences matched their pre-migration state. Later owned fixture writes legitimately advanced copy sequences; none were rewound. |
| Schema comparison | Columns, constraints, indexes, enums, triggers, functions and policies matched the current test schema. Function-definition CRLF/LF differences were normalized for comparison; stored functions were not rewritten. |
| Consistency workflows | 86 existing cases passed, covering scope/transaction/recovery behavior, reviewed operations, progression, historical labels, school policies and primary departments. |
| Curriculum/title workflows | 23 existing acceptance cases passed with owned rehearsal login/questionnaire fixtures. Business assertions were unchanged. |
| Focused result | Two suites/109 tests passed; zero failures or pending tests. These are existing scenarios rerun on the copy, not 109 additional unique tests to add to the earlier 420 API total. |
| Cleanup and preservation | Owned fixtures removed. Original-column full-row digests and counts matched again after workflow checks; original accounts/credential hashes, placements, enrollments, participants, drafts, responses and answers remained intact. |
| Normal/test unchanged | Before/after read-only schema, complete-row and sequence snapshots matched for both databases. Normal retains 12 migrations; test retains 17. |
| Legacy unknown versions | Both original unversioned responses remain null/unknown; the original draft remains versioned. No historical version or label was inferred. |

The consistency suite ran unchanged. The local curriculum copy redirected four seeded-account lookups and its baseline questionnaire helper to four owned rehearsal accounts and an owned questionnaire; import paths were adjusted for the temporary file location. Assertions were preserved, and the source and adapted file checksums were recorded. The rehearsal did not rely on or reset original account passwords. The suites' own cleanup and the helper's exact-ID cleanup removed only their synthetic fixtures; post-cleanup projection checks established preservation of all existing original records and counts.

The initial schema comparison flagged CRLF/LF representation differences in the four newly deployed trigger function bodies. Comparison was corrected to normalize line endings, and a guarded resume verified that all 17 migrations had already succeeded. No migration was rerun, migration record resolved, function rewritten or normal/test database changed as a response to that comparison issue.

Evidence is ignored local .tmp/migration-rehearsal-20261014.json plus protected rehearsal migration/API logs, Jest results and verification metadata in the existing backup folder. Local helpers/configuration are .tmp/rehearse-restored-migrations.cjs, .tmp/rehearsal-environment.cjs, .tmp/rehearsal-jest.json and the temporary curriculum adapter. Native backup evidence and archive remain intact; the copied database now has the updated schema. Archive content is private and excluded from repository delivery.

At completion of this rehearsal, M3 backup/restore and M4 rehearsal were complete; M5 normal deployment was NOT APPROVED and M6 normal verification was NOT STARTED. The owner subsequently approved both local steps, completed in Section 11.8 after a fresh cutover backup/restore and final preflight. The rehearsal does not establish authoritative school provenance, historical-recovery CLI acceptance, load capacity, frontend/browser integration or production readiness. It introduced no new full unit/420-case API regression; the 502/420 totals remain the earlier recorded full-suite evidence.

### 11.8 Completed local normal-database alignment and read-only verification

Following successful backup/restore and the 109-case rehearsal, the owner authorized the next normal migration/verification step. Local teacher_evaluation was upgraded on 14 October 2026, starting at 16:40:58 and completing at 16:41:05, Asia/Phnom_Penh. Only the five pending migrations listed in Section 9.13 were applied. At that completion, both application databases had matching application definitions and all 17 migrations; later Section 11.12 records alignment through 18; their data remains separate. This is the inspected local target, whose authoritative school provenance remains unconfirmed.

A fresh cutover backup was created and verified before deployment. The ACL-restricted archive is .tmp/backups/teacher-evaluation-20261014-163139-6f06419f/teacher_evaluation.dump, 97,514 bytes, SHA-256 9f62ce186c989f24989d708b588f9a5c4317faf804bd51381ce15d1028912ab3. It was restored into the fresh teacher_evaluation_restore_20261014_163139_6f06419f target, retaining the original 12-migration schema for validation/rollback evidence. Before migration, all 27 original tables including migration history, all 23 sequences, schema definitions and effective permissions matched that fresh restored copy. Both backup helpers used exported read-only snapshots; the normal database was unchanged by backup/restore. Archive checksum and every artifact's Windows access rules were checked; backup/log/manifest access is limited to the current Windows user and SYSTEM.

Final cutover preflight verified the exact local teacher_evaluation/public identity, zero other database sessions, zero duplicate-primary users, the exact five pending migrations and SQL checksums matching the tested versions. No service was stopped or unrelated session terminated. The current build passed before deployment. Prisma migrate deploy received the explicitly validated normal connection; no reset, seed, test-fixture copy, guessed historical metadata repair or migration-record resolution was performed.

| Acceptance | Result |
| --- | --- |
| Normal before / after | 26 application tables/174 columns/12 migrations -> 28 tables/199 columns/17 migrations. |
| Test database | Remains 28 application tables/199 columns/17 migrations. Before/after schema, complete-row digests and sequence state matched; no test writes. |
| Migration completion | All 17 records finished successfully, with no failed/rolled-back migration. Original 12 complete migration records, including timestamps/logs, matched their preserved original-column digests. |
| Original application values | All 26 original application tables retained complete original-column digests and counts, including account/credential values, placement, enrollment, participant, draft, response and answer records. |
| Original sequences | All 23 original sequence values/is_called states preserved. No normal synthetic fixtures or write-based API tests were used. |
| Updated schema | Columns, constraints, indexes, enums, triggers, functions and policies match the test schema; function CRLF/LF representation normalized in comparison. |
| New metadata | Existing placements have NORMAL; existing curriculum bindings/labels remain unknown/null. New review/curriculum tables remain empty. Two original responses remain unversioned; the original draft remains versioned. |
| Read-only HTTP verification | All 16 GET checks passed on a temporary built-AppModule HTTP instance using normal data. Connection default_transaction_read_only=on was verified before requests. |
| No API side effects | Complete post-migration schema/row/sequence snapshots were identical before and after API checks. Temporary instance stopped; no persistent normal service restart was performed. |
| Configuration / source control | .env and .env.test.local remained byte-identical; no JWT/password replacement. No new staging, commit or push. |

The 16 read-only GET checks cover health/database counts, Swagger JSON and department-assignment route metadata, unauthenticated ADMIN result rejection, ADMIN profile/staff/student/placement/offering/curriculum readers, anonymous ADMIN results and unsupported slicing rejection, LECTURER profile/closed-only results/ADMIN-role rejection, and STUDENT profile/history. They ran on owned loopback port 50695 from 16:41:01 to 16:41:04, Asia/Phnom_Penh, and the instance was closed afterward. Requests used short-lived locally signed validation JWTs for existing ACTIVE accounts, checked by the normal JWT/auth_version/role guards. Tokens and response contents were not exported. Original password login was not exercised or reset, and main-bootstrap CORS/browser behavior was not evaluated by this read-only instance.

Current application counts remain 11 accounts, two student profiles, one placement, 10 enrollments, three evaluations, 10 participants, one draft, two responses and seven answers. Preserved unknown history remains explicit. The test database and fresh pre-cutover copy were unchanged; the earlier rehearsal copy retains its migrated schema. Two application databases are configured, with two separate temporary validation copies retained. No application configuration selects either copy, and no copy was automatically dropped.

Evidence is ignored .tmp/normal-deployment-20261014.json, .tmp/normal-deployment-api-20261014.json and .tmp/normal-cutover-backup-evaluation-20261014.json, plus protected native migration/API logs and before/after manifests in the fresh backup folder. Helpers are local .tmp/deploy-normal-migrations.cjs, .tmp/normal-readonly-api.cjs and .tmp/cutover-backup-and-restore.cjs. The archive remains access-controlled and private; it is not included in frontend/professor/GitHub delivery. Native archives do not replace separately protected role/server/application configuration or off-machine disaster-recovery evidence.

M5 and M6 are complete for this authorized local alignment. Further actions require a new agreed scope: frontend acceptance, reviewed-workflow cutover, official historical recovery, performance measurement, additional database constraints, temporary-copy cleanup or publication. This step did not rerun the full unit/API suites; the latest full regression remains 502 unit/420 API tests, the rehearsal is a separate 109-case targeted rerun and normal verification is a separate 16-request read-only check. Both report formats and root guides were updated to distinguish current schema alignment from the older test-only migration stages.

### 11.9 Completed read-only constraint audit and proposal for owner review

This section preserves the review before implementation was authorized. Its approval boundary and 17-migration snapshots refer to that completed read-only step; the subsequent approved implementation and current state are recorded in Section 11.10.

Scope and approval boundary: following local alignment, the owner approved a read-only audit and concrete proposal for four additional safeguards. This step did not authorize their implementation, a new migration, data correction or publication. The audit ran on 14 October 2026 at approximately 18:08-18:09, Asia/Phnom_Penh, against only the two configured local application databases. Each connection defaulted to read-only and each audit/snapshot transaction explicitly verified read-only mode. Both servers report PostgreSQL 18.4 and English_United States.1252 collation/ctype.

| Audit area | Normal teacher_evaluation | Isolated teacher_evaluation_test | Conclusion |
| --- | --- | --- | --- |
| Schema / migration history | 28 application tables, 199 columns, 17 migration records. | 28 application tables, 199 columns, 17 migration records. | Alignment remains intact; no new migration applied. |
| Active academic years | One year, zero active. | Two years, zero active. | No multiple-active conflict. Zero active must remain valid; do not select a year automatically. |
| Questionnaire titles, including archived rows | Four titles; zero normalized duplicate groups, blank/untrimmed titles or excessive lengths. | 23 titles; zero normalized duplicate groups, blank/untrimmed titles or excessive lengths. | Existing rows fit trimmed, globally case-insensitive uniqueness. Neither snapshot contains archived rows; archived-title behavior still requires dedicated implementation tests. |
| Complete offering assignment key, grouping NULL as equal | Two offerings; zero duplicate groups. Both have unknown year_level/class_type. | Four offerings; zero duplicate groups. All have unknown year_level; class_type is populated. | Strengthen uniqueness without requiring legacy metadata or collapsing distinct section/class/year assignments. |
| Year levels across six columns | Zero known levels outside 1-5. | Zero known levels outside 1-5. | Bounds are compatible with current records. Unknown offering levels remain valid. Three scope/rule tables are currently empty in each database; their absence is not behavioral test coverage. |
| Academic-year, semester and evaluation date ranges | Zero invalid complete ranges; one year and one evaluation have both dates unknown. | Zero invalid complete ranges; two years, two semesters and one evaluation have both dates unknown. | Preserve nullable and partial dates; check ordering only when both endpoints are present. No partial ranges were found in these snapshots. |

The six audited level columns are student_generations.starting_year_level, student_academic_records.year_level, course_year_rules.year_level, course_offering_group_scopes.year_level, evaluation_group_targets.year_level and nullable course_offerings.year_level. Numeric academic_years.start_year was also checked against the existing API's 1900-2200 bounds; no invalid or unknown values were found. Existing survey titles have no JavaScript/PostgreSQL lower-case disagreement or JavaScript/explicit-whitespace SQL trim disagreement. This is evidence for current records, not a proof for every future Unicode title.

Catalog inspection confirms that the proposed active-year partial index, normalized survey-title index and level/date CHECK constraints are absent. The current six-column offering index is unique but uses PostgreSQL's ordinary NULL-distinct behavior. Existing reviewed-operation, curriculum, historical-label and primary-department safeguards remain in place. Full schema definitions, all stored rows including migration history (compared privately with keyed digests), and all sequence states matched before and after each database audit. Backend source, Prisma schema/migration files, package files and both private configuration files also remained byte-identical. No record values, credentials or response contents were exported; the two retained restore copies were not targeted.

Proposed implementation, NOT IMPLEMENTED:

| Proposal | Concrete database enforcement | Compatibility and backend work |
| --- | --- | --- |
| DB-01: At most one active academic year | A unique partial index on academic_years.is_active WHERE is_active = TRUE. Only active rows enter this index. | Continue the existing serializable transaction that deactivates other years before activation. Allow zero active and any number of inactive years. Return a meaningful 409 for an activation race instead of describing it as a duplicate year name. |
| DB-02: Global questionnaire-title uniqueness | A unique expression index on lower(btrim(title, explicit_ECMAScript_trim_characters)), covering all surveys, including archived sets. Add a nonblank-title CHECK using the same whitespace definition. | Preserve title display case, existing trim behavior and the 200-character API bound. Use a parameterized literal comparison of the same database-derived key for create/update checks. Do not use wildcard matching for identity. Do not rename, merge or reassign existing sets automatically. |
| DB-03: Offering uniqueness including unknown optional fields | Upgrade course_offerings_assignment_unique_idx to a unique index with NULLS NOT DISTINCT on the same six fields: course_id, lecturer_id, semester_id, year_level, class_type, section_code. | Preserve nullable fields, case-sensitive section labels, empty-string-versus-NULL distinctions and existing Prisma compound selector. Retain existing serializable duplicate checks and 409 behavior. Group scopes are not added to or substituted for this assignment key. |
| DB-04: Consistent levels and ordered ranges | CHECK level BETWEEN 1 AND 5 on all six audited level columns; CHECK start_year IS NULL OR start_year BETWEEN 1900 AND 2200; CHECK end > start when both endpoints exist on academic_years, semesters and evaluations. | Preserve existing NOT NULL declarations and optional values. Add the missing generation maximum, normalize calendar dates before comparison, retain evaluation timestamp precision and map recognized constraint errors to useful 400 responses. Existing history-protection conflicts remain 409. |

The explicit title trim character set must match the application's JavaScript String.trim behavior: U+0009-000D, U+0020, U+00A0, U+1680, U+2000-200A, U+2028, U+2029, U+202F, U+205F, U+3000 and U+FEFF. Default PostgreSQL btrim(title) removes ordinary spaces only and is insufficient for this contract. Use the same immutable SQL expression or fixed function definition for the index and literal duplicate query. Do not change its whitespace/collation semantics without an explicit re-audit and index rebuild. Current JavaScript title-length validation remains necessary because PostgreSQL character counts and JavaScript UTF-16 length differ for supplementary characters. No new accent-insensitivity, Unicode normalization or case-insensitive section rule is proposed.

Three API compatibility issues found during this review must accompany the constraints:

1. Generation creation/update currently has @Min(1) but no @Max(5); the shared progression resolver limits eligible levels to 1-5. Add @Max(5) and matching Swagger maximum before database enforcement so a generation starting at 6 receives a clear 400 rather than an unexpected database error. Existing generation values all fit the intended bound.
2. Prisma's current title equals/mode:insensitive query generates unescaped ILIKE $1. A read-only synthetic probe verified that underscore/percent act as patterns: Academic _ matches Academic A, and Academic % matches Academic ABC. Such legitimate distinct titles can currently receive a false duplicate rejection; a trailing backslash also requires explicit coverage. No current stored titles contain these pattern characters. Replace this check with parameterized, literal equality using the proposed normalized database key and test both create/update. This aligns behavior with title identity and never requires changing existing title text.
3. Academic-year and semester endpoints accept ISO date strings, while their columns store DATE. Two timestamps on the same calendar day can pass the current JavaScript ordering check and then store equal dates. A read-only synthetic SQL probe confirmed this mismatch. Normalize these endpoints to a documented UTC calendar-date representation consistent with persistence, then require end_date > start_date. Preserve nullable/partial endpoints and keep evaluation start_at/end_at as timestamps. UTC/offset boundary cases need tests; no cross-table requirement that semester dates lie within academic-year dates is introduced by this proposal.

Illustrative SQL for review only; this block is not a migration and was not executed:

```sql
CREATE UNIQUE INDEX academic_years_one_active_idx
  ON academic_years (is_active) WHERE is_active = TRUE;

-- Candidate replacement definition; replacement ordering must be transactional.
CREATE UNIQUE INDEX course_offerings_assignment_unique_idx
  ON course_offerings
    (course_id, lecturer_id, semester_id, year_level, class_type, section_code)
  NULLS NOT DISTINCT;

ALTER TABLE student_generations
  ADD CONSTRAINT student_generations_starting_level_check
  CHECK (starting_year_level BETWEEN 1 AND 5);

ALTER TABLE semesters
  ADD CONSTRAINT semesters_date_order_check
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date > start_date);
```

The offering index name already exists. The example is its proposed final definition, not a standalone command to run against the current database. An approved migration must inspect ownership/dependencies, preserve the compound-key name, build/swap the replacement under appropriate locks in one transaction, and roll back all changes on failure. No COALESCE sentinel is needed, avoiding accidental collisions between unknown and real values. PostgreSQL documentation supports partial uniqueness, NULLS NOT DISTINCT and nullable CHECK semantics: https://www.postgresql.org/docs/18/ddl-constraints.html and https://www.postgresql.org/docs/18/indexes-partial.html. The SQL excerpts and source discussion were reviewed against version 18 documentation; deployment on a different server must first verify feature support.

Proposed next sequence, requiring separate owner approval for implementation:

1. Implement the four safeguards and three associated API compatibility fixes locally. Write SQL-owned index/CHECK ownership comments in the Prisma schema and update Swagger/error descriptions; preserve all routes, IDs, relations and existing workflows.
2. Use the guarded synthetic test database to test direct-SQL rejection, valid/unknown legacy values, archived/case/whitespace/literal-symbol titles, all nullable offering-key combinations, level boundaries, calendar-date offsets/equality, and concurrent activation/duplicate creation. Add migration preflight refusal cases using isolated fixtures/copies so dirty data cannot be silently corrected. Run the relevant tests and the full existing regression, then update actual test totals.
3. Review the completed implementation, test results and migration SQL together. Re-audit current normal data, obtain a fresh protected backup and verify an isolated restore; rehearse the new migration and workflows on that copy before proposing normal deployment. A clean audit today does not guarantee tomorrow's data is still clean.
4. Apply to the normal database only after the owner approves that concrete migration step. A bounded migration transaction must acquire appropriate locks, repeat the conflict audit and abort on duplicates/invalid values without modifying application records. Verify schema, preserved original values/sequences, configuration and read-only normal workflows afterward. Never run normal reset, seed or synthetic write tests.

Evidence: ignored .tmp/database-constraints-audit-20261014.json and .tmp/database-constraints-edge-review-20261014.json, produced by .tmp/audit-additional-constraints.cjs and .tmp/review-constraint-edge-cases.cjs. Only aggregate counts, schema metadata and synthetic literal probes are retained. Private operational logs are excluded from report and repository content.

Step status: AUDIT AND PROPOSAL COMPLETE; IMPLEMENTATION NOT APPROVED. Both report formats record this boundary. No new application code, migration, staging, commit or push was performed in this step. The latest full regression remains 502 unit/420 API tests; these read-only aggregate checks and synthetic SQL expressions are separate audit evidence, not new passing API test cases. School production/frontend acceptance and official historical-recovery evidence remain pending as recorded in Section 11.4.

### 11.10 Implemented academic-integrity safeguards and completed backend evaluation

This section preserves the implementation/isolated-evaluation snapshot. Its 17-migration normal state and unapproved-deployment wording describe that stage. Backup/rehearsal subsequently completed in Section 11.11; the owner then approved normal deployment, completed in Section 11.12.

After reviewing Section 11.9, the owner authorized implementation and isolated testing. All four safeguards and three associated API fixes are now implemented locally. The additive 20261014020000_enforce_academic_integrity migration was applied only through the guarded test runner to teacher_evaluation_test. Normal deployment, a new backup/rehearsal, frontend UI evaluation and publication remain separate steps requiring approval. No commit or push was performed.

| Safeguard | Implemented behavior | Evaluation |
| --- | --- | --- |
| DB-01: Active academic year | A partial unique index permits at most one TRUE, any number of FALSE and zero active years. Existing serializable activation demotes other years atomically. Activation index conflicts have a useful 409/ACADEMIC_YEAR_ACTIVATION_CONFLICT; serialization races remain useful 409 conflicts. Name uniqueness keeps its original error. | Three PostgreSQL cases cover direct rejection/rollback, concurrent activation with deliberate retry and unchanged duplicate-name behavior. |
| DB-02: Questionnaire title | Immutable public.survey_title_key(text) applies the fixed JavaScript-compatible trim character set and PostgreSQL lower-case conversion. An expression unique index covers all titles, including archived rows, and a CHECK rejects blank titles. Parameterized create/update checks use literal equality with the identical expression. Display case and existing 200-UTF-16-unit service bound remain. | Eight PostgreSQL cases cover percent/underscore/backslash create/update, Unicode/trim/case collisions, archived reservation, all supported trim characters, blank input and concurrent creation with one initial version. |
| DB-03: Nullable offering key | The existing six-field index name/Prisma compound selector is preserved, with NULLS NOT DISTINCT. Unknown optional values remain allowed. Case-sensitive section labels and empty string versus NULL remain distinct. | Ten PostgreSQL cases cover all eight nullable combinations, section distinctions and concurrent/duplicate API creation. |
| DB-04: Levels and dates | Eleven named CHECKs protect six level columns (1-5), optional numeric start_year (1900-2200), three nullable date/time ranges and nonblank survey titles. Generation create/update now documents and enforces the missing maximum 5. | Fifteen PostgreSQL cases exercise direct bounds, generation API defaults/boundaries, service error mapping, numeric years, complete/partial/unknown dates, calendar-day normalization and unchanged evaluation timestamp precision. |
| Atomic migration preflight | One DO statement locks the ten affected tables, audits all conflicts before DDL, and aborts without choosing winners or changing application rows. Lock timeout is five seconds and statement timeout is 60 seconds. The offering index replacement is within this same atomic statement. | Fourteen cases run the exact migration against temporary conflicting tables and verify unchanged rows/no partial index. One catalog case verifies all 11 validated CHECKs and offering NULL-equality metadata. |

The three API compatibility changes are delivered together with the constraints: generation maximum 5; literal title identity instead of unescaped ILIKE pattern matching; and UTC calendar-day validation for academic-year/semester DATE fields. ISO datetimes without an explicit offset also mean UTC. Date-only start/end input keeps its calendar meaning; offset-qualified datetimes first resolve to the UTC day and discard the time. Same-day start/end is rejected after normalization. Null can clear an optional calendar endpoint, and partial dates remain allowed. Evaluation start_at/end_at retain timestamp precision and can represent a valid interval within one day. Existing progression, frozen assignment/semester identity, curriculum approval history, historical labels and anonymous reporting protections were preserved.

Known database CHECK failures receive 400 with the relevant field rule, including Prisma connector errors that arrive without a P2004 code. Mapping is restricted to the named constraints; unrelated connector errors and existing curriculum/history exceptions retain their domain handling. The shared serializable transaction utility performs this mapping before service-specific generic error conversion; the nontransactional semester-create catch also handles its named date CHECK. This prevents a numeric-year/date CHECK being misreported as a historical curriculum conflict. Swagger describes the generation maximum, calendar normalization, literal title characters and activation conflicts.

The title duplicate query uses the same parameterized lower/btrim expression instead of calling the newly introduced SQL function directly. It therefore remains usable on the currently unchanged normal schema while its additional database enforcement awaits approval. Schema comments record the SQL-owned partial/expression indexes, NULLS NOT DISTINCT and CHECK constraints. Preserve these protections through versioned migrations; Prisma schema declarations alone do not represent all of their semantics.

Full regression runs started at 18:34:24 on 14 October 2026, Asia/Phnom_Penh: 43 unit suites/514 tests and 19 API suites/471 tests passed, with zero failures or pending cases. The new work adds 12 unit and 51 PostgreSQL cases to the earlier 502/420 totals. The existing 86 consistency, 23 curriculum and 16 integration cases all passed and are already included in 471. The consistency fixture that previously persisted a reversed window now asserts that SQL rejects it and then uses missing/expired valid windows to evaluate opening protection. Unit lifecycle mocks were updated for the literal SQL title lookup. API test discovery now targets only test/**/*.e2e-spec.ts, preventing ignored temporary rehearsal adapters from entering the normal regression. These changes preserve the original acceptance purposes.

Build passed and lint has zero errors with the same five pre-existing warnings. New synthetic fixtures were cleaned up, including their owned accounts, academic structure, offerings and questionnaire versions. This full run does not establish actual browser/frontend UI acceptance, workload capacity or deployment readiness.

After marking optional calendar dates nullable in their TypeScript/Swagger contracts, the build passed again. A fresh built-AppModule HTTP instance ran on owned temporary loopback port 61923 at approximately 18:45, Asia/Phnom_Penh. Six grouped contract checks passed through two GET requests: health, served Swagger JSON, generation create/update bounds 1-5, all eight nullable string calendar properties across create/update DTOs, literal title descriptions and activation-conflict responses. The test connection defaulted to read-only; full test schema/row/sequence snapshots matched before/after, and the temporary server stopped. No fixture writes, login/reset, normal connection or browser UI evaluation occurred in this check. Evidence is .tmp/academic-integrity-openapi-20261014.json; its six checks are separate from the 514/471 Jest totals.

The two calendar create/update API cases were then rerun against the final nullable DTO declarations: two passed, 49 unselected cases skipped. They again verified same-day rejection, offset normalization, stored UTC dates and explicit null clearing. This is a targeted rerun of cases already included in the full 471 total, not two additional tests. Evidence is .tmp/academic-integrity-calendar-final.json.

| Current inspected target | Tables / columns / applied migrations | New safeguard state |
| --- | --- | --- |
| Normal teacher_evaluation | 28 / 199 / 17 | New migration NOT APPLIED. Full schema, all original rows including migration history and all sequence states matched before/after implementation/testing. |
| Test teacher_evaluation_test | 28 / 199 / 18 | New migration applied successfully; 11 new CHECKs validated, two new unique indexes, one immutable title-key function, and existing offering index strengthened. |

No normal synthetic tests, writes, seed/reset, guessed historical correction, password/JWT replacement or migration-record repair occurred. Both private configuration files were byte-identical. The monitor retained full normal snapshots privately in memory and compared keyed row digests without exporting record contents. The two existing temporary restore databases were not selected or migrated in this step.

The delivered migration SQL checksum is SHA-256 e4f4940d0ae9acda9455dc59dbe0ed5a71f7ffd935b2f927c08832e7b33cd26b, matching the finished test migration record. Its file is prisma/migrations/20261014020000_enforce_academic_integrity/migration.sql. Evidence is ignored .tmp/academic-integrity-unit-verified.json, .tmp/academic-integrity-api-verified.json, .tmp/academic-integrity-delivery-20261014.json and .tmp/constraint-implementation-normal-preservation.json; earlier targeted runs are superseded by the passing full regression. Schema/catalog verification confirmed clean migration history: 17 normal and 18 test migrations, with no failed/rolled-back entry.

Step status: IMPLEMENTATION AND ISOLATED EVALUATION COMPLETE; NEW NORMAL MIGRATION NOT APPROVED. Next, review this implementation and evidence together. After separate approval, re-audit current normal records, create a fresh protected backup and verify restoration, then rehearse this exact new migration and workflows on a dedicated restored copy. Report that outcome before requesting normal deployment approval. Existing backups precede this new migration and must not be treated as a substitute for a fresh verified cutover backup.

### 11.11 Completed fresh backup/restore and academic-integrity migration rehearsal

This section retains the completed pre-deployment review, including the normal 17-migration state and unapproved boundary at that time. The owner subsequently approved deployment and verification, completed in Section 11.12.

The owner approved the next backup, restoration verification and rehearsal step after implementation review. The sole migration under review is 20261014020000_enforce_academic_integrity. It was applied only to the fresh restored copy; normal, test and both older copies were not migration targets. No backend/test source, Prisma schema/migration file, package file or private configuration changed. No staging, commit or push was performed.

Fresh read-only normal preflight passed: 17 finished migrations, no failed/rolled-back record, and no conflicting active years, normalized/blank titles, nullable offering duplicates, invalid levels/numeric years/date ranges or colliding new index/function/CHECK names. Zero other normal sessions were found. The existing offering index is standalone rather than constraint-owned. SQL SHA-256 e4f4940d0ae9acda9455dc59dbe0ed5a71f7ffd935b2f927c08832e7b33cd26b matches the tested eighteenth migration. No records were changed or guessed. Normal-data provenance remains unconfirmed; every existing record was treated as valuable.

| Backup / restore acceptance | Result |
| --- | --- |
| Fresh archive | .tmp/backups/teacher-evaluation-20261014-191129-c6d73577/teacher_evaluation.dump, 112,747 bytes. |
| Archive checksum | SHA-256 f7becd85b7e29a79c40979d7e3cf222d9a65b5687b044d19dd784c27862a9968. |
| Backup mechanism | PostgreSQL 18.4 custom archive from the same exported read-only repeatable-read snapshot used for complete-row comparison. No exclusions, normal writes, reset, seed or backfill. |
| Fresh restore target | teacher_evaluation_restore_20261014_191129_c6d73577, created empty with source encoding/locale/owner; PUBLIC CONNECT revoked and connection limit four. |
| Restoration | pg_restore --single-transaction --exit-on-error; no --clean, existing-copy overwrite or source restoration. |
| Full match | All 29 tables including migration history and all 24 sequences matched. The copy initially had 28 application tables/199 columns/17 original migration records. Full rows were compared by private keyed digests; key and row contents were not exported. |
| CHECK equivalence | Only reviewed_operations_kind_check had a deparse difference: whole-array text cast versus identical per-element casts. Other metadata matched exactly. Targeted definition normalization and nine read-only literal cases verified six valid operations, two invalid values and NULL behavior. No DDL/data correction forced a match. |
| Access | Folder inheritance disabled; current Windows user and SYSTEM only. Final ACL checks passed for all 23 archive/log/manifest artifacts. Archive is access-controlled, not encrypted, and excluded from report/GitHub/frontend delivery. |

Archive creation began at 19:11:35 and restoration/equivalence verification completed at 19:14:07 on 14 October 2026, Asia/Phnom_Penh. The raw schema comparison initially stopped on the CHECK cast representation; exact row/sequence comparisons already matched. Explicit follow-up established equivalence before restoration was marked verified. This was a comparison issue, not repaired school data or failed native restoration.

Migration on the new copy passed: 17 -> 18 finished migrations, unchanged 28 application tables/199 columns, all 28 original application tables' complete values/counts preserved, all 24 sequence positions preserved immediately after DDL, and all 17 original complete migration records including timestamps/logs preserved. New checks/indexes/title-key function match the tested schema. Function line endings and the single verified CHECK cast representation were normalized only for comparison; database objects were not rewritten. The migration was applied once. Existing optional unknown values remain valid; the two original unversioned responses received no guessed metadata.

The workflow rehearsal passed 160 cases across three suites: 86 consistency/review/progression/history/privacy/primary-department, 23 curriculum/global-title and 51 academic-integrity cases. The ordinary runner remains pinned to teacher_evaluation_test; a separate ignored rehearsal environment permits only this exact freshly verified copy. Consistency assertions ran unchanged. Other suites were adapted only for import paths and owned synthetic account/base-questionnaire lookups, with original/adapter hashes recorded. All assertions and expected outcomes were retained.

The first temporary Jest configuration selected only the 86 consistency cases. It was corrected to select the three exact files, then all 160 cases were rerun without reapplying the migration. Both private native results are retained; 86 is an initial subset and must not be added to 160. Rehearsal started at 19:18:43 and complete workflow/preservation verification finished at 19:23:35, Asia/Phnom_Penh. Owned synthetic fixtures were removed. Original application values/counts and complete migration records remained intact afterward. Fixture creation legitimately advanced the new copy's sequences; those positions were not rewound.

After cleanup, a temporary built-AppModule instance on the migrated copy passed 16 GET checks against existing copied normal records: health/Swagger, unauthenticated rejection, ADMIN account/student/placement/offering/curriculum/results and unsupported anonymous scope rejection, LECTURER profile/CLOSED-only results/ADMIN-role rejection, and STUDENT profile/history. It used owned loopback port 64118 at approximately 19:26, Asia/Phnom_Penh. Connection default_transaction_read_only=on was verified before requests. Full schema/row/sequence snapshots matched before/after and the server stopped. Short-lived locally signed validation JWTs used existing ACTIVE copied account IDs/auth_version/roles; tokens/response contents were not exported. Original password login, CORS/browser behavior and actual frontend UI were not tested by these GETs. Synthetic login and workflow writes were tested only in the isolated rehearsal.

| Current database | Applied migrations | Role / preservation |
| --- | --- | --- |
| teacher_evaluation | 17 | Configured normal backend; new migration NOT APPLIED. Existing records/schema/sequences unchanged. |
| teacher_evaluation_test | 18 | Configured synthetic test backend; unchanged throughout this rehearsal. |
| teacher_evaluation_restore_20261014_155714_7066b3ca | 17 | Earlier validation copy; full schema/row/sequence snapshot unchanged. |
| teacher_evaluation_restore_20261014_163139_6f06419f | 12 | Earlier pre-cutover validation/rollback copy; full schema/row/sequence snapshot unchanged. |
| teacher_evaluation_restore_20261014_191129_c6d73577 | 18 | Newly migrated rehearsal copy; original values preserved and fixtures cleaned. Archive retains its pre-migration 17-migration snapshot. |

The passing workflow rehearsal compared complete before/after snapshots of normal, test and both older copies; all matched. Private configuration and backend/schema/test/package source hashes also matched. Separate before/after normal snapshots matched across the 16 copied-data GET requests. Both application configurations remain unchanged and select none of the three restore copies.

Evidence is ignored .tmp/academic-migration-preflight-20261014.json, .tmp/academic-backup-restore-20261014.json, .tmp/academic-migration-rehearsal-20261014.json and .tmp/academic-rehearsal-readers-20261014.json; protected native archives/manifests/results are in the fresh folder. Helpers and adapters remain local under .tmp. Full regression remains 514 unit/471 API tests. These 160 rehearsal cases, 16 copied-data GET checks and nine equivalence expressions are separate evidence, not extra cases to add to the full totals. Frontend acceptance, school-sized performance and official historical recovery remain pending.

Step status: FRESH BACKUP/RESTORE AND REHEARSAL COMPLETE; NORMAL MIGRATION NOT APPROVED. Proposal for approval: apply only 20261014020000_enforce_academic_integrity to the explicitly validated local teacher_evaluation/public target, taking it from 17 to 18 migrations. Immediately beforehand, recheck records, archive checksum/permissions, SQL checksum, migration history and other sessions; ensure the backup still covers current normal data. If data changed or the archive is no longer current, refresh/verify backup first. Do not stop unrelated sessions or choose duplicate winners automatically.

The reviewed SQL locks ten affected tables, repeats conflict checks and applies DDL as one atomic statement, with a five-second lock timeout and 60-second statement timeout. An error must stop deployment for review; no reset, seed, guessed repair or migration-record resolution is proposed. After approved migration, compare schema to test, verify all original records/sequences/old migration records, perform read-only normal HTTP workflow checks, stop the temporary instance and update both reports. Commit/push and migration of another school target remain separate permissions.

### 11.12 Completed approved normal academic-integrity migration and verification

After reviewing the backup/rehearsal results and the explicit 17 -> 18 normal migration plan, the owner authorized deployment and verification. The inspected local teacher_evaluation/public database was upgraded on 14 October 2026, from 19:48:28 to 19:48:36, Asia/Phnom_Penh. Only 20261014020000_enforce_academic_integrity was pending and applied. Both configured application databases now have 28 application tables, 199 columns and all 18 successful migrations, with matching verified schema protections. Their data remains separate. This completes local alignment; it does not establish authoritative school provenance, full browser/frontend acceptance or production readiness.

A new cutover backup was created immediately before deployment instead of assuming the older rehearsal archive was still current. The protected archive is .tmp/backups/teacher-evaluation-20261014-194406-c2b09381/teacher_evaluation.dump, 112,747 bytes, SHA-256 f3ee74198e55fe2e3ef0c6006862c8c94981d27b7ee18a4ac1db054713c9815b. It was restored into new teacher_evaluation_restore_20261014_194406_c2b09381, which retains the 17-migration pre-deployment state. Creation/restore verification completed at 19:44:14-19:44:17, Asia/Phnom_Penh. All 29 original tables including migration history, all 24 sequences and effective schema/permissions matched. The exported read-only snapshot method and single-transaction/error-stop restoration were reused. The known reviewed-operation CHECK cast representation was verified again with nine literal cases; only comparison representation was normalized, with no database correction. Access checks passed before deployment and for all 18 final protected archive/log/manifest artifacts. Files are limited to the current Windows user and SYSTEM; the archive remains private and excluded from report/GitHub delivery.

Final preflight verified the exact local normal/public connection, zero other normal sessions, zero conflict records across all four safeguard areas and no new object-name collisions or offering-index constraint dependencies. The one pending migration and its SHA-256 e4f4940d0ae9acda9455dc59dbe0ed5a71f7ffd935b2f927c08832e7b33cd26b matched test/rehearsal. All local migration files matched tested history, allowing prior CRLF/LF representations. Current normal records, schema and sequences still matched the fresh restored backup immediately before migration. No unrelated session was terminated, persistent service stopped/restarted, configuration switched or migration record repaired.

| Acceptance | Result |
| --- | --- |
| Normal migration | 17 -> 18 successful migrations; all 18 finished, no failed/rolled-back entry. Only the approved academic-integrity migration was applied. |
| Tables / columns | Normal and test both have 28 application tables and 199 columns. No application table/column, API identifier or relationship was removed or renamed. |
| Complete original values | All 28 original application tables retain complete-row keyed digests and counts, including account/credential values, placements, enrollments, participants, questionnaire history, drafts, responses and answers. No normal fixtures or write-based test data. |
| Original sequences | All 24 sequence last_value/is_called states preserved. No rewinding or guessing. |
| Migration history | All 17 original complete rows, including timestamps/logs, retained their original full-row digests. The new eighteenth record is the only addition. |
| Schema alignment | Columns, constraints, indexes, enums, triggers, functions and policies match test. Function line endings and the previously proved CHECK cast form were normalized only for comparison. |
| Live safeguard metadata | All 11 new CHECKs are validated. New active-year and global-title unique indexes are valid, offering index uses NULLS NOT DISTINCT, title-key function is immutable/strict/parallel-safe, and existing primary-department partial uniqueness remains valid. |
| Existing unknowns | Zero active academic years remains valid; original two responses remain unversioned and the original draft remains versioned. No group/progression/curriculum/label backfill. |
| Normal HTTP readers | All 16 read-only GET checks passed on a temporary built-AppModule instance using normal records. Schema/row/sequence snapshots were identical before and after requests. |
| Other databases | Test and all four retained validation copies have identical full before/after schema/row/sequence snapshots; none was migrated or written during normal deployment. |
| Source / configuration | Backend/schema/test/package and both private configuration files remained byte-identical. No password/JWT replacement, staging, commit or push. |

The 16 normal GET checks ran at approximately 19:48:32-19:48:35 on owned loopback port 51834. They cover health/Swagger, unauthenticated ADMIN rejection, ADMIN profile/accounts/students/placements/offerings/curriculum/results and unsupported anonymous query scope rejection, LECTURER profile/CLOSED-only results/ADMIN-role rejection, and STUDENT profile/history. Connection default_transaction_read_only=on was verified before any requests. Short-lived locally signed validation JWTs used existing ACTIVE normal account IDs/auth_version/roles; tokens and response contents were not exported. The instance stopped after verification. Existing password login and main-bootstrap CORS/browser behavior were not exercised or reset; write workflows remain supported by the earlier isolated 471-case regression and 160-case restored-copy rehearsal, rather than write tests against normal records.

Preserved normal counts include 11 accounts, two student profiles, one placement, 10 enrollments, three evaluations, 10 participants, one draft, two responses and seven answers. Both new metadata tables remain empty; optional unknown history remains unknown. The final read-only catalog check independently confirmed every new named CHECK, unique-index predicate/NULL behavior, title-key function attributes and clean 18-migration history without attempting invalid writes on normal.

An additional read-only comparison against the untouched fresh cutover restoration independently verified all 28 application tables' complete stored values, all 24 sequence states and all 17 original complete migration rows, including their timestamps/logs. Matching keyed digests are recorded in .tmp/academic-normal-backup-preservation-20261014.json; the ephemeral key and record values were not exported.

| Database / copy | Applied migrations | Current purpose |
| --- | --- | --- |
| teacher_evaluation | 18 | Configured normal backend; new integrity protections active and original records preserved. |
| teacher_evaluation_test | 18 | Configured synthetic test backend; unchanged by this normal deployment. |
| teacher_evaluation_restore_20261014_155714_7066b3ca | 17 | Earlier rehearsal copy, unchanged. |
| teacher_evaluation_restore_20261014_163139_6f06419f | 12 | Earlier pre-cutover backup copy, unchanged. |
| teacher_evaluation_restore_20261014_191129_c6d73577 | 18 | Academic-integrity rehearsal copy, unchanged. |
| teacher_evaluation_restore_20261014_194406_c2b09381 | 17 | Fresh final cutover restoration/rollback evidence, unchanged. |

There are still two configured application databases; four extra local copies serve only as temporary validation/rollback evidence. No application configuration selects a copy, and no copy was dropped or reset. Their retention/cleanup remains a separately authorized operational task.

Evidence is ignored .tmp/academic-normal-deployment-20261014.json, .tmp/academic-normal-readers-20261014.json, .tmp/academic-normal-catalog-20261014.json, .tmp/academic-cutover-preflight-20261014.json and .tmp/academic-cutover-backup-20261014.json, plus private native logs and complete keyed manifests in the fresh cutover folder. Full regression remains 514 unit/471 API tests. The earlier 160 rehearsal cases and 16 copied-data GET checks, this step's 16 normal GET checks and nine backup-equivalence expressions are separate evidence, not additional cases to add to full totals. No full suite rerun was required because application code and tests were unchanged during deployment.

Step status: APPROVED NORMAL MIGRATION AND VERIFICATION COMPLETE. The four agreed database safeguards are now enforced on both configured application databases and existing backend behavior remains supported by the recorded checks. Next actions require their own agreed scope: final delivery review/publication, frontend UI acceptance, reviewed-confirmation cutover, official historical recovery, school-sized performance/deployment or temporary-copy cleanup. No new commitment or publication permission is inferred from database approval.

### 11.13 Final delivery review before publication

This section records the review-stage boundary. After that review, the owner explicitly authorized committing and pushing the reviewed delivery to master. Historical statements below describe the completed review before that separate approval; the current header and release checklist reflect publication authorization.

The owner authorized a final local delivery review after normal alignment. A read-only recheck confirmed both configured databases on PostgreSQL 18.4, each with 28 application tables, 199 columns, 18 successful migrations and zero incomplete migrations. No database records, schema, sequence positions or private configurations were changed during this review.

The publication candidate was checked for private environment files, temporary evidence, native backups and credential patterns. `.env`, `.env.test.local` and `.tmp` are ignored, and no private archive/key file is included. Credential-URL matches are example placeholders or runtime configuration interpolation; the documented Password123 accounts are explicitly synthetic test accounts. Both new migration directories, their service changes and their tests must be included in the eventual commit. Do not publish backups or `.tmp` evidence.

The review corrected earlier test-only migration statements, distinguished historical test totals from current results, documented the PostgreSQL 15 minimum required by the offering index, and replaced generic normal-database development/seed advice with the guarded frontend test procedure. Both report formats remain synchronized. The original requirement text files at the previously recorded D:/internship paths were unavailable during this review; requirement coverage was checked against the preserved eight-area register and the approved contracts in this report. No fresh comparison with those absent originals is claimed.

Latest application regression remains 514 unit/471 API tests. This review changed documentation only; it did not rerun the full application suite. Test configuration, suite discovery, recorded regression/migration evidence, document content/package/link checks and Git whitespace checks were evaluated separately. Word visual rendering and a clean published checkout were not evaluated. Frontend UI acceptance, reviewed-confirmation cutover, official historical recovery and school-sized load/deployment acceptance remain pending.

Delivery conclusion: ready for the separately approved commit and frontend API handoff, subject to recording the actual published commit and the frontend team's own acceptance results. Publication is not authorized by this review. No staging, commit or push was performed.

## 12. Presentation and reporting notes

### 12.1 Short explanation for a professor

This backend supports the school's teacher-evaluation workflow using NestJS/TypeScript, Prisma and PostgreSQL. Administrators prepare academic structure, student placements, curriculum, teaching assignments, enrollments and questionnaires. Students save drafts and submit; lecturers receive their own results after evaluations are CLOSED.

My contribution focuses on academic consistency and preserving history: one shared progression policy respects repeats/transfers and persistent pauses; yearly groups stay independent; curriculum approvals and questionnaire versions preserve their original meaning; reviewed confirmations revalidate exact selections and support safe recovery. Recent additions include major-aware cohorts, automatic course codes, reviewed assignment/enrollment creation, atomic year/two-semester setup and active deadline extension.

The latest local checkpoint passed 777 unit tests and 2,231 API tests, plus 41 standalone safety checks and a separately repeated 16-step HTTP workflow. These results establish the tested backend scope, not complete frontend acceptance or production readiness. The current A–S matrix distinguishes completed work from partial features and future improvements.

Synthetic work used only the isolated test database. Normal-school migration/recovery and legacy ownership decisions remain separately reviewed. Completion tracking is identifiable, while anonymous response storage and lecturer report projections avoid direct student-answer identity links; small-cohort and identifying-text risks still require school policy. Word visual rendering remains unchecked. Current source is local and uncommitted; delivery commit a298798 and its 514/471 test results remain historical evidence.

### 12.2 Suggested demonstration

Demonstrate the implemented Step 43 scope on teacher_evaluation_test using synthetic data. The owner-selected checkpoint requires supervisor agreement as a reduced defense scope; remaining improve.txt requests are deferred unmet requirements, not automatically optional. Normal migration is a prerequisite for normal deployment, not for this isolated demonstration. Swagger/API actions and scripted HTTP checks must not be presented as complete browser acceptance. See the demonstration and acceptance boundaries at the front of this report.

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

## 13. Current work and frontend integration review (15 October 2026)

This section is the current reference for ongoing backend work. Sections 9-11 preserve dated delivery/rehearsal evidence; their earlier counts and statements about unavailable frontend tools do not establish the current UI's acceptance. The earlier documentation-only review preserved Step 1. The owner then approved Step 2 academic-display metadata implementation; Sections 13.7 and 13.8 record the separately approved metadata and answerability work with their fresh verification. Existing approved features remain preserved.

### 13.1 Workspace and evidence snapshots

| Snapshot | Evidence and interpretation |
| --- | --- |
| Published delivery | Backend branch master, local HEAD and origin/master at `a298798bc6648b7250760378f201e2ece0daf194`. Publication was recorded by the owner and delivery documentation; no new remote fetch/push was performed. |
| Recorded backend delivery | 43 unit suites/514 tests and 19 API suites/471 tests passed on 14 October 2026. Focused subsets, 160 rehearsal cases and 16 normal read-only GET checks must not be added to that API total. |
| Recorded local databases | Each application database: 18 successful migrations, 28 application tables, 199 columns. Normal alignment followed protected backup/restoration and rehearsal; original values and 24 sequence states were preserved. These are delivery evidence, not a fresh current normal-data audit. |
| Subsequent local Step 1 | Effective questionnaire metadata fix; focused unit 20/20, focused API 19/19, full unit 43 suites/520 tests, full API 19 suites/473 tests, build and whitespace checks passed; five pre-existing lint warnings. These were executed in the preceding code-fix session, not rerun for this documentation update. Six unit and two API cases were added to the delivery counts. |
| Newly completed local Step 2 | Academic-display metadata fix on 15 October: focused unit 26/26 and API 21/21; fresh full unit 43 suites/526 tests and full API 19 suites/475 tests passed after formatting. Production build passed; lint has zero errors and the same five warnings. Six more unit and two more API cases were added, already included in the totals. Both local fixes remain uncommitted. |
| Newly completed local Step 3 | Current answerability shares the existing access gate. Corrected focused checks passed 46 unit/35 API tests; final full regression passed 43 suites/548 unit and 19 suites/489 API tests. Build/whitespace passed, lint has zero errors/five existing warnings. This adds 22 unit and 14 API cases to Step 2. No new UI case was executed. |
| Newly completed local Step 4 | New student CRUD/permission API suite: 89 focused cases passed; fresh full 43 suites/548 unit and 20 suites/578 API passed. Build/whitespace passed, lint has zero errors/five existing warnings. Existing application code/configuration is unchanged during this step; no UI acceptance was executed. |
| Newly completed local Step 5 | 48 focused import/export API cases passed; fresh full 43 suites/548 unit and 21 suites/626 API passed. Build, scoped new-suite type check and lint passed (five existing warnings). Separate generation-length probe FAIL and whole-repository test-file typing FAIL (22 existing errors) remain. No application change or new UI pass. |
| Newly completed local Step 6 | Normalized import generation names now match the stored 100-character limit and generated Swagger schema; 100-character ASCII/Unicode imports and retries pass, 101-character imports return 400 before writes. Fresh full 43 suites/552 unit and 21 suites/633 API passed. Build/scoped typing/lint pass (five existing warnings); 22 existing test typing errors remain. |
| Newly completed local Step 7 | Whole-repository no-emit type checking now PASS with zero errors after repairs in four existing test files. Focused 88 unit/86 consistency cases and fresh full 43 suites/552 unit plus 21 suites/633 API tests passed. All 650 existing matcher calls/expected arguments preserved; build/lint pass (five existing warnings). No application source or new UI case changed. |
| Recorded Step 10: defect found | 51 group-options HTTP cases: 48 PASS/3 FAIL; full 719 API PASS/3 FAIL (722 total). Overflow IDs returned 500 instead of 400. Resolved with approval in Step 11; historical failure remains preserved. |
| Recorded Step 12: lecturer defect | 60 HTTP cases: 58 PASS/two FAIL; full then 784 API PASS/two FAIL, 786 total. Overflowing academic-year/semester filters returned 500 instead of 400. Resolved with approval in Step 13; historical failure remains preserved. |
| Recorded Step 14: department defects | 76 HTTP cases: 66 PASS/10 FAIL; full then 857 API PASS/10 FAIL, 867 total. Blank text was accepted and null/overflow input returned 500. Resolved with approval in Step 15; discovery evidence remains preserved. |
| Recorded Step 16: major defects | 88 HTTP cases: 78 PASS/10 FAIL; full then 963 API PASS/10 FAIL, 973 total. Blank names were stored and null/overflow requests returned 500. Resolved with approval in Step 17; discovery evidence retained. |
| Recorded passing local Step 17 | Normalized name validation, non-null partial updates, parent ID upper bound and a major-only bounded path pipe resolve the defects. Major 114/department 94 focused cases and fresh full 552 unit/999 API tests (43/26 suites) PASS. Type/build PASS; lint zero errors/five existing warnings. Shared parser/service/department code unchanged. |
| Recorded Step 18: academic-year defects | 87 HTTP cases: 76 PASS/11 FAIL; full then 1,075 API PASS/11 FAIL (1,086 total, 27 suites). Blank names/impossible dates were accepted; null name/active updates and excessive path IDs returned 500. Resolved with approval in Step 19; discovery evidence retained. |
| Recorded passing local Step 19 | Name/null/date/path validation repaired without changing nullable chronology/dates, activation transactions or history policy. Year 129 and 203 combined focused cases PASS; fresh full 552 unit/1,128 API tests (43/27 suites) PASS. Type/build PASS; lint zero errors/five existing warnings. No migration, frontend or private-setting change. |
| Recorded Step 20: semester defects | 106 HTTP cases: 91 PASS/15 FAIL; full then 1,219 API PASS/15 FAIL (1,234 total, 28 suites). Blank names/impossible dates accepted; null/overflow inputs returned 500; unsafe numeric parent JSON rounded to another owned year and saved. Resolved with approval in Step 21; discovery evidence retained. |
| Recorded passing local Step 21 | Semester name/null/date/parent/path validation repairs resolve all 15 failures. Parent numeric payload is bounded to safe integers; null classification/dates and teaching history remain supported. Expanded semester 153/combined focused 254 cases PASS; fresh full 552 unit/1,281 API tests (43/28 suites) PASS. Type/build PASS; lint zero errors/five existing warnings. |
| New local Step 22: course findings | 96 HTTP cases: 82 PASS/14 FAIL; fresh full 552 unit PASS and 1,363 API PASS/14 FAIL (1,377 total, 29 suites). Blank code/name accepted, null/overflow requests return 500 and unsafe numeric parent JSON saves a rounded owned department ID. At discovery four application fixes awaited approval; approved Step 24 resolves all 14 failures while preserving permissions/uniqueness/dependencies. |
| Completed local Step 15 | Normalized text validation, non-null partial updates and a department-only bounded ID pipe resolve the defects. 94 focused cases and fresh full 552 unit/885 API tests (43/25 suites) PASS; type/build PASS, lint zero errors/five existing warnings. Shared pipe/service/schema/frontend unchanged. |
| Completed local Step 13 | Lecturer query DTO rejects overflowing optional IDs without Number conversion; 65 lecturer/55 group-options focused cases PASS. Fresh full 552 unit/791 API tests (43/24 suites), type checking/build PASS; lint zero errors/five existing warnings. No migration, frontend change or new browser acceptance. |
| Completed local Step 11 | Query DTO enforces signed BigInt upper bound without Number conversion. 55 focused API/schema cases and fresh full 552 unit/726 API tests (43/23 suites) PASS. Zero type errors/build PASS; lint zero errors/five existing warnings. No migration, frontend change or new UI acceptance. |
| Completed local Step 9 | Tests/docs only: 38 password HTTP cases PASS for three roles, rejected inputs, session revocation, ownership, rate limiting and competing updates. Fresh full 552 unit/671 API tests (43/22 suites), zero type errors/build PASS; lint zero errors/five existing warnings. No new UI evaluation or application fix. |
| Completed local Step 8 audit | Source inspection traced admin/shared calls to routes, DTOs, IDs, guards and actual test assertions. Three HTTP coverage gaps are prioritized: own-password change, export group options and lecturer own assignments. No newly confirmed application defect; no application/frontend code changes, database access, runtime-suite rerun or browser evaluation. Step 7 remains the last executed 552/633 and zero-type-error checkpoint. |
| Recorded local Step 23 | Source-only review of all 19 improve.txt A-S areas; implementation matrix, decisions and dependency-ordered roadmap in Section 13.28. No runtime or database execution in that review. |
| Completed local Step 24 | Approved course validation repair resolves all 14 failures. Fresh 124 focused, 552 unit and 1,405 API checks PASS across 43/29 full suites; types/build/format PASS, lint zero errors/five existing warnings. Owned fixtures removed; 411 files unchanged/four intended updates plus one new pipe. G automatic codes and other new workflows remain pending. Section 13.29. |
| Local Step 25: contract review | Current versus requested/proposed API contracts recorded; source fingerprint identifies inspected frontend, not a prepared upstream commit. Three owner decisions and matching frontend handoff remain pending. No code/database/runtime changes; latest test result remains Step 24. Section 13.30. |
| Completed local Step 26 | Three rules explicitly approved. D first-admin command verified with 38 focused cases and fresh full 552 unit/1,443 API PASS (43/30 suites). Owned test schema/migration copies removed; public rows/ledger/sequences and 415 prior files unchanged, package command added plus three new files. Next P/R. Section 13.31. |
| Completed local Step 27 | P/R read metadata: _count.enrollments and allowlisted student.academic_context. New eight units/24 APIs; full 560 unit/1,467 API PASS across 44/31 suites. Five intended updates/three new files, 414 prior files unchanged; owned fixtures cleaned. P future errors/capabilities and frontend acceptance pending. Section 13.32. |
| Completed local Step 28 preflight | E read-only isolated cohort audit/design; 41 new Node checks PASS, 422 prior files unchanged. Three cohort numbers need reviewed mappings; one cohort lacks major evidence. Full row/ledger/sequence fingerprints unchanged. E write contract/history migration remains NOT IMPLEMENTED. Section 13.33. |
| Completed local Step 29 prototype | E owned-schema SQL expansion/history and explicit synthetic split preservation: 35 focused checks; fresh full 560 unit/1,502 API/integration cases PASS across 44/32 suites. Shared public remains 28 tables/199 columns/18 migrations. Candidate outside active chain; mapping executor and E API delivery pending. Section 13.34. |
| Completed local Step 30 executor | Reviewed candidate mappings/immutable receipts in owned fixtures: 54 new/89 combined focused cases; fresh full 560 unit/1,556 API-integration cases PASS across 44/33 suites. State-bound review, atomic preservation and durable same-result retries. E Prisma/API promotion and real cutover remain pending. Section 13.35. |
| Completed local Step 31 catalog | Active additive migration 19 on test only: 31 tables/226 columns/25 sequences; normal remains recorded 28/199/18/24. New 53 catalog HTTP checks; 286 focused and fresh full 560 unit/1,609 API-integration cases PASS across 44/34 suites. No inferred mappings; full E remains disabled pending coordinated import/transfer/history consumers. Section 13.36. |
| Completed local Step 32 imports | Major-aware pair resolution and request prevalidation; immutable INITIAL evidence saved atomically per student, safe skips/retries and runtime partial results. New 60 HTTP cases; 168 focused and fresh full 560 unit/1,669 API-integration cases PASS across 44/35 suites. No migration; normal untouched; full E still disabled. Section 13.37. |
| Completed local Step 33 student CRUD | Canonical initial owner/chronology checks and atomic INITIAL evidence; personal cohort changes now 409, unchanged links/no-op edits remain safe. New 68 HTTP checks; 217 focused and full 560 unit/1,737 API-integration cases PASS across 44/36 suites. No migration; full E still disabled pending academic transfer/resolver consumers. Section 13.38. |
| Completed local Step 34 yearly cohort placement | Explicit destination-major cohort selection, atomic chronological append/TRANSFER evidence and compatibility profile update; persistent PAUSE and old evaluation history preserved. New 88/focused 293/full 560 unit and 1,825 API-integration PASS across 44/37 suites. No migration; full E resolver/consumers and matching UI pending. Section 13.39. |
| Completed local Step 35 historical cohort consumers | Selected-year record/earlier anchor drives cohort filters, options, enrollment, targets, export, self/access and review snapshots; unknown tracked history never borrows the latest pointer. New 20 unit/35 HTTP, focused 260, full 580 unit/1,860 API-integration PASS across 45/38 suites. No migration; real mapping/write/UI cutover remains pending. Section 13.40. |
| Completed local Step 36 reviewed mapping | ADMIN inventory/preview/confirm/receipt API, disabled by default and test-only. New 22 unit/55 HTTP; focused 217 and full 602 unit/1,915 API PASS across 46/39 suites. Protected/rehearsed test migration 20 preserves original rows/sequences/19 ledger entries; no shared legacy mappings or normal access. Real/write/UI/normal cutover pending. Section 13.41. |
| Completed local Step 37 controlled writes | Opt-in strict cohort writes and connected-schema /auth/me capability; default compatibility unchanged. New 17 unit/43 HTTP; 349 focused and full 619 unit/1,958 API PASS across 47/40 suites. No migration/normal/frontend/private changes. Actual ownership/UI/normal rollout pending. Section 13.42. |
| Completed local Step 38 course allocation | G automatic codes, atomic durable retries/recovery and schema-gated capability; official case-sensitive identities retained. New 33 unit/50 HTTP; 334 focused and full 652 unit/2,008 API PASS across 48/41 suites. Protected/rehearsed test migration 21 preserves original rows/25 sequence states/20 previous ledger records. Test 31/226/21/25; normal untouched. Matching UI/normal/production acceptance pending. Section 13.43. |
| Completed local Step 39 teaching curriculum gate | Step 39 requirement H backend slice passes 28 new unit/44 API-integration cases, included in fresh full 680 unit/2,052 API checks across 49/42 suites; focused 260/seven suites and 41 standalone checks PASS. New/changed academic contexts require student year 1–5 and an enabled applicable revision for the selected semester, including unscoped assignments. Unchanged historical null years/bindings and pinned contexts are preserved. No migration; test remains 31/226/21/25 and normal recorded 28/199/18/24 untouched. Frontend optional-year/unversioned/unscoped source gaps remain; matching Brave acceptance BLOCKED. Next J reviewed assignment/immediate enrollment. Section 13.44. [Contract](#1344-local-step-39-curriculum-approval-for-new-and-changed-teaching-contexts); [verification](../TESTING.md#curriculum-approved-teaching-context-verification). |
| Completed local Step 40 assignment identity prerequisite | Step 40 passes the J API-identity prerequisite: course/lecturer/semester/student-year/class-type identity excludes labels/groups, with authorized existing-ID conflicts and SERIALIZABLE API race protection. Eight new unit/33 API checks included in fresh full 688 unit/2,085 API across 49/43 suites; focused 257/six suites and 41 standalone checks PASS. Isolated audit finds one preserved legacy duplicate group/four incomplete rows. No SQL constraint/migration change; test 31/226/21/25, normal recorded 28/199/18/24 untouched. J combined preview/create/enroll/receipt and capability are NOT IMPLEMENTED. Frontend/Brave and stricter SQL/normal rollout pending. Section 13.45. [Contract](#1345-local-step-40-label-free-teaching-assignment-identity-j-prerequisite); [verification](../TESTING.md#label-free-teaching-assignment-identity-verification). |
| Completed local Step 41 milestone 1 | Step 41 milestone 1 J backend PASS: zero-offering explicit-roster preview, atomic all-row create/pin/enroll/receipt, drift/expiry checks, original retry/recovery and schema-gated reviewed_assignment_enrollment_v1. Complete five-field SQL identity excludes labels; legacy null contexts preserved. 29 new unit/58 API cases included in fresh full 717 unit/2,143 API across 50/44 suites PASS; focused 446/ten suites and 41 standalone checks PASS. Protected/rehearsed test migration 22 preserves original rows/25 sequences/21 earlier ledger rows. Test 31/226/22/25; normal recorded 28/199/18/24 untouched. Matching frontend/Brave and production/operational acceptance pending. Next B/F/I milestone 2. Section 13.46. [Contract](#1346-local-step-41-milestone-1-reviewed-assignment-creation-and-enrollment); [verification](../TESTING.md#reviewed-assignment-creation-and-enrollment-verification). |
| Frontend availability | React/Vite project at `D:\internship\teacher-evaluations-frontend`; live origin `http://localhost:5173`. External frontend repository URL/revision was not provided. The browser review used the actual local UI in an isolated Brave profile. |
| Earlier documentation/UI review | Backend configuration guard passed for local teacher_evaluation_test. Partial real UI cases below used that test API. The normal database was not selected for synthetic requests. Existing source/configuration hashes were recorded before documentation work and checked afterward. |

Local ignored evidence for the partial browser review is under `.tmp/documentation-review`: sanitized request path/status/field-name traces, case results and screenshots. Login bodies, Authorization headers and tokens are excluded from these traces. Evidence is local, not a new public report or school-data export. Synthetic fixture records tagged `UI-mv8d8hex` were created only in teacher_evaluation_test; they are retained for review, not official school records. The earlier metadata tests cleaned their own fixtures. No backup/restore copy was removed.

The original `D:\internship\imp.txt` and `imp1.txt` files were unavailable. Requirement interpretation uses the preserved eight-area register, FR01-FR44, approved policy and existing tests. A fresh comparison against those absent originals is not claimed.

### 13.2 Completed local backend step: questionnaire descriptors

An evaluation originally assigned V1 can have an eligible unfinished participant moved to V2. Previously, its questions came from V2 while the displayed descriptor still said V1. The local correction selects display metadata through the participant's stored questionnaire relation; it does not rewrite the evaluation's original assignment.

| Student endpoint | Effective metadata | Original assignment metadata |
| --- | --- | --- |
| GET /api/student/evaluations | Each item's survey | Additive assigned_survey |
| GET /api/student/evaluations/history | Each item's survey, including completed participants | Additive assigned_survey |
| GET /api/student/evaluations/:id/survey | evaluation.survey agrees with questions and the existing survey_version_id | evaluation.assigned_survey |

Both descriptors contain title and version_no. A legacy NULL participant version uses the evaluation base version even if a newer version exists. Completion fields and status are unchanged. Internal questionnaire/offering/student/participant IDs are not added to list descriptors. The original assignment, V1 questions, drafts and anonymous responses retain their existing protection rules. No schema migration is needed.

Example response fragment, not real school identifiers:

```json
{
  "evaluation": {
    "survey": { "title": "Teaching Evaluation", "version_no": 2 },
    "assigned_survey": { "title": "Teaching Evaluation", "version_no": 1 }
  },
  "survey_version_id": "9",
  "participant_survey_version_id": "9"
}
```

Evidence: [student-access service](../src/student-access/student-access.service.ts), [unit cases](../src/student-access/student-access.service.spec.ts), [PostgreSQL/API cases](../test/student-access.e2e-spec.ts). Before the fix, the targeted regression expected V2 and received V1. The API case performs reviewed V1-to-V2 application and verifies all three student endpoints, original-assignment retention, unchanged participant/base-question records on GET, privacy fields and legacy NULL fallback. Completed-history checks are unit evidence, not a newly executed browser scenario. The current frontend already reads survey/evaluation.survey; no frontend source was changed.

### 13.3 Frontend/backend contract review

The frontend uses an API client, shared SystemContext and appDataSource. Pages can consume fetched data without issuing their own fetch. VITE_API_BASE_URL points to the backend /api prefix; JWT bearer tokens are stored per tab. Backend guards remain authoritative for role, status, ownership and eligibility.

| Area | Current match or limitation | Supporting backend tests |
| --- | --- | --- |
| Authentication and own profile/password | POST auth/login uses identifier/password; GET auth/me supplies identity/capabilities; PUT auth/password matches the UI. Per-workspace login checks supplement backend role guards. | auth service/controller/JWT specs; API role cases in student-access/integration/consistency; Step 9 adds 38 own-password HTTP cases. |
| Academic setup and accounts | Department, major, year, semester, course and staff/student routes and input types match the adapters. User and student profile IDs are handled separately. Some UI controls are narrower than the API. | academic-year/semester/department/major/user/student unit cases; users/semesters/academic-integrity API suites. |
| Progression and yearly groups | UI submits existing placement actions NORMAL/REPEAT/TRANSFER/PAUSE/RESUME. Shared backend resolver governs eligibility; Step 3 now returns current answerability/reasons; the frontend still derives readiness from history_status and needs to consume the new fields. | placement resolver unit cases; consistency/progression API cases and recorded guided backend walkthrough. |
| Enrollment and reviewed creation | Preview and confirmation paths, string account IDs, numeric context fields where required, UUID review_id and exact input snapshots match. Actual narrow UI cases passed below. | enrollments/evaluations/consistency API suites. |
| Questionnaire versions and history | Version creation/questions/reorder/application routes match. Local Step 1 fixes effective display metadata. Browser version-update/draft protection acceptance remains untested. | student-access unit/API cases; questions/survey-versions/assessment-drafts/consistency suites. |
| Results, curriculum and historical labels | Canonical results are grouped by stored answer version. Lecturer data requires CLOSED. Frontend normalizes version_results and historical labels; anonymous group query slicing remains prohibited. | curriculum-revisions, consistency, lecturer-dashboard/comments and integration suites. |
| Imports and exports | Browser parses files; confirmed student rows use students/import. Student export fetches server-scoped JSON; result files use fetched snapshots. Imports have intentional per-row partial outcomes and safe existing-code skips. | Unit cases, Step 4 permissions, Step 5 business cases and Step 6 normalized-name boundaries/OpenAPI checks. The prior 101-character generation probe now PASS; frontend file-format acceptance remains outside these backend tests. |
| Error handling | API client preserves HTTP status and string error code, joins validation arrays and hides internal 5xx details. Reviewed forms invalidate stale reviews and preserve original input for retry. A saved write followed by failed refresh is reported separately. | reviewed workflow unit/consistency rejection and replay tests; real browser error cases are mostly NOT TESTED. |

BigInt output identifiers remain strings. Student CRUD and placement use students.id; password resets, enrollment and participant IDs use users.id. Staff/student list loaders fetch all server pages before local filtering. Existing department assignment and course/semester DTOs may require numeric IDs; adapters explicitly convert them. An unused specialized endpoint does not imply a disconnected feature: lecturer comments are included in canonical results, student completion is read from history, and curriculum revisions are included in the rules collection.

### 13.4 Actual browser evaluation results

Date: 15 October 2026, Asia/Phnom_Penh. Browser: Brave, separate hidden headless profile; real React/Vite UI with the guarded test API. Initial academic/course/account/questionnaire fixtures were prepared through API calls and do not count as UI CRUD passes. Only actions actually executed through the rendered UI are classified below. The user clarified the task as documentation maintenance; further integration experiments were stopped.

| Case | Status | Observed scope / remaining limit |
| --- | --- | --- |
| UI-01 Admin sign-in and dashboard loading | PASS | Real sign-in rendered backend-driven dashboard and admin navigation; authenticated API/CORS requests succeeded. Aggregate accuracy across all data was not independently established. |
| UI-02 Group enrollment review/confirmation | PASS | UI preview selected three owned synthetic students, then confirmed the exact group through the reviewed bulk endpoint; server enrollment count verified as three. |
| UI-03 Evaluation creation review/confirmation | PASS | UI selected the owned offering/question set, generation, schedule and three eligible students; stored DRAFT evaluation and three frozen participants verified. |
| UI-04 Reviewed opening | BLOCKED | Opening review screen was displayed, but confirmation was not completed before interruption. An earlier browser-helper button-selection error was not classified as an application defect. |
| UI-05 Repeat/transfer progression | NOT TESTED | Existing backend evidence retained; no completed real-UI progression case in this review. |
| UI-06 Persistent pause/RESUME and yearly groups | NOT TESTED | No completed browser action and acceptance assertions; backend policy tests are separate evidence. |
| UI-07 Stale/expired review and lost-response retry | NOT TESTED | Backend consistency cases remain recorded; no browser replay/expiry test completed. |
| UI-08 V1/V2 application and protected drafts/completions | NOT TESTED | Local backend metadata/API tests passed previously; browser lifecycle was not executed here. |
| UI-09 Save/resume draft and final submission | NOT TESTED | No newly executed UI draft/submission case. |
| UI-10 CLOSED-only lecturer results/comments | NOT TESTED | Existing backend release/ownership tests are retained; no complete current browser release case. |
| UI-11 Imports, exports and full admin CRUD | NOT TESTED | Source review only; fixture setup is not UI CRUD evidence. |
| UI-12 Word visual rendering | NOT TESTED | DOCX package/XML, report content and links checked; Word page rendering was not inspected. |
| UI-13 Student metadata and blocked-answerability display | NOT TESTED | Steps 2/3 have source/API verification. Frontend consumption of the answerability fields and real browser acceptance were not completed. |

Two earlier automation attempts were interrupted by helper selector/serialization issues and later retried successfully for enrollment/creation. Their raw BLOCKED records are preserved locally; the final case status reflects the completed retest. No application FAIL was established by those harness errors. Overall browser acceptance is partial: three narrowly defined PASS cases, one BLOCKED opening case and the remaining scenarios NOT TESTED. No new complete UI workflow, school-sized load result or production-readiness conclusion is claimed.

### 13.5 Remaining backend and frontend work

**Historical running checklist:** Rows retain the checkpoint evidence as it accumulated. References to a feature still pending at an earlier step do not override later delivery. Use the current defense scope table at the front and Section 13.48 for latest status; for example G is now implemented locally and the latest totals are 777/2,231.

| Item | Owner and next action | Current status |
| --- | --- | --- |
| Student history display metadata | Backend: added class_type, stored semester_number, start_year and is_active consistently to available/history/survey summaries, with legacy-null and privacy checks. | COMPLETE locally; Step 2 passed 526 unit/475 API tests. Actual browser acceptance for these fields remains NOT TESTED. |
| Current student answerability | Backend: added answerable/answerability_reason from shared rules, preserving history labels, enrolled scope and frozen membership. Frontend: consume the fields. | COMPLETE locally; Step 3 recorded 548/489, Step 6 full runtime regression passed 552/633. Frontend consumption and browser acceptance remain pending. |
| Academic-year dates and clearing semester dates | Existing backend routes support them; frontend controls/payloads need wiring where required. | Source-observed UI limitation; no new backend endpoint needed. |
| Individual enrollment, secondary departments, generation/version management | Backend APIs already exist; frontend team decides and implements needed controls. | Partial UI coverage, not missing backend routes. |
| Dashboard freshness and summary efficiency | Frontend refresh policy; optionally a scoped server summary with generated_at if load measurements justify it. | Optional improvement; no measured capacity target or summary endpoint delivered. |
| Student CRUD API verification | Backend: 89 automated HTTP/database cases for CRUD, permissions, validation, rollback and context. | COMPLETE locally at Step 4, 548/578 recorded. Step 6 full regression is 552/633; broader group/history coverage gaps remain. |
| Dedicated import/export API business flows | Backend: mixed-row/retry imports and scoped exports with known nonzero progress/privacy/error assertions; Step 6 adds generation-name boundaries. | 55 API/schema cases PASS. The earlier generation-name length defect is resolved; frontend file handling remains NOT TESTED in these batches. |
| Import generation-name validation | Backend: normalize names, enforce 100 Unicode characters in DTO/service and publish matching OpenAPI metadata. | COMPLETE locally at Step 6: 100-character creation/retry and 101-character 400/no-write cases PASS; prior standalone probe now PASS. |
| Existing test-file TypeScript errors | Backend: repaired async mock signatures, typed CJS records/transaction results, service arguments and checked reviewed response fields. | COMPLETE locally at Step 7: 22 diagnostics reduced to zero; original matcher expectations and 552/633 runtime totals preserved. |
| Frontend-critical coverage audit | Backend: traced actual UI request families and inspected existing route/permission/business assertions. | COMPLETE for the defined Step 8 source scope; three small HTTP batches identified. This is not full browser acceptance or an exhaustive runtime-path proof. |
| Own-password HTTP verification | Backend: real self-service password changes, validation, revocation, isolation, rate limiting and competing changes using owned actors. | COMPLETE locally at Step 9: 38 focused cases and full 552/671 PASS; no application fix needed. New UI acceptance NOT TESTED. |
| Export group-options HTTP verification | Backend: exact scope, normalization, permissions, malformed/missing IDs, precision and row preservation; approved Step 11 bounds query IDs to database storage. | COMPLETE for defined cases: 55 focused API/schema cases PASS and full 552/726. Step 10's three failures are resolved. Actual browser export acceptance remains separate. |
| Lecturer own-assignment HTTP verification | Backend: complete token-owned assignments, with/without evaluation, filters, group/history metadata, privacy shape and permissions; Step 13 validates optional ID storage bounds. | COMPLETE for defined cases: 65 lecturer cases PASS; full 552/791. Both Step 12 failures resolved; new browser acceptance remains separate. |
| Department CRUD/permission verification | Backend: actual CRUD/roles/duplicates/dependencies, normalized text, non-null partial updates and department-only storage bounds. | COMPLETE for defined cases at Step 15: 94 focused PASS and full 552/885; all 10 Step 14 failures resolved. Actual browser acceptance remains separate. |
| Major CRUD/permission verification | Backend: actual CRUD/roles/uniqueness/dependencies, normalized names, non-null partial updates and parent/path ID bounds. | COMPLETE for defined cases at Step 17: 114 major focused cases PASS and full 552/999; all 10 Step 16 failures resolved. Actual browser acceptance remains separate. |
| Academic-year CRUD/permission verification | Backend: actual CRUD/roles, activation/history protections and repaired name/null/date/path validation. | COMPLETE for defined cases at Step 19: year 129 PASS; full 552/1,128. All 11 Step 18 failures resolved. Complete UI and other year-related combinations remain separate. |
| Semester CRUD/permission verification | Backend: actual CRUD/roles, year-context/history safeguards and repaired name/null/date/numeric-parent/path validation. | COMPLETE for defined cases at Step 21: 153 semester focused cases and full 552/1,281 PASS; all 15 Step 20 failures resolved. Complete UI workflow remains separate. |
| Course-catalog CRUD/permission verification | Backend: approved Step 24 repairs all four validation groups while preserving numeric payloads, nullable descriptions, code/name rules and active-department policy. | COMPLETE for defined cases: 124 focused PASS; fresh full 552 unit/1,405 API PASS. Step 22 failures resolved; G automatic codes and complete UI acceptance remain pending. Section 13.29. |
| Further academic/result HTTP coverage | Backend: remaining academic setup, student progress/delete and admin-result combinations after the course repair. | Pending. Three priority Step 8 batches are covered, not every route/requirement combination. |
| Complete real UI acceptance | Frontend team/backend owner evaluate progression, groups, reviews, versions, drafts, submissions and lecturer release on isolated synthetic data. | Pending beyond the narrow PASS cases above. |
| Legacy reviewed-confirmation cutover | Agree caller readiness and test the existing REQUIRE_REVIEWED_CONFIRMATION switch before another deployment. | Pending; private setting was not changed. |
| Official recovery and production readiness | Verified official provenance/recovery records, target backup/restore, deployment plan, performance/error targets and production HTTP/security review. | Pending; synthetic test/rehearsal evidence is not school operational acceptance. |

### 13.6 Maintained thesis and defense reference

README is the entry point/current status; TESTING contains repeatable setup and evaluation; the Markdown and Word reports contain the same detailed technical narrative, requirement register and dated evidence. Update these four files after an approved backend change. Keep exactly BACKEND_PROJECT_REPORT.md and BACKEND_PROJECT_REPORT.docx inside docs; consolidate useful evidence instead of creating extra reports.

During the earlier documentation-only review, verification checked 28 local file/heading links, table structure, fenced examples, the complete FR01-FR44 register and Markdown/Word text synchronization. DOCX package/XML and internal/external link relationships passed structural checks. Hash comparison confirmed 256 protected backend files and 145 frontend files unchanged during that documentation work, including private configurations. Steps 2/3 separately authorize changes to the same four backend source/test files; Steps 4/5 each add one dedicated API test file without changing existing application source; Step 6 changes only the import DTO/service and their two test files; Step 7 changes only four existing test files; current documentation and protected-file checks are recorded below. Online link availability and visual Word page rendering were not newly checked.

For every change, record its requirement, endpoint/fields, before/after behavior, preserved rules, test names/commands/counts, source snapshot, database used and remaining acceptance. A regression should reproduce the defect, then focused and full backend checks should pass. Describe 100% of defined checks passing as tested coverage, not universal correctness. Do not count mocked frontend tests or API-only preparation as real UI acceptance.

For a thesis or defense, cite delivered 514/471, Step 1 520/473, Step 2 526/475, Step 3 548/489, Step 4 548/578, Step 5 548/626 runtime tests and its separate FAIL findings, Step 6 552/633 and resolved generation-name probe, Step 7 resolution of all 22 typing errors with fresh 552/633 runtime verification, and the three narrow Brave cases separately. Explain scoped membership, shared progression/access decisions, review-bound atomic changes, history preservation and anonymous reporting. Backend academic metadata and answerability are implemented locally; frontend consumption, full UI acceptance and operational/performance work remain pending. Human review of Word pages remains outstanding.

### 13.7 Completed local Step 2: student academic metadata

Date: 15 October 2026, Asia/Phnom_Penh. After the documentation-maintenance review, the owner approved the next small backend task: expose the missing academic-display fields consumed by the available frontend. This authorization covers this metadata step, supporting tests and updates to the four approved documents; no commit, push or additional answerability implementation was performed.

The frontend's student loader reads GET /api/student/evaluations/history and already expects the fields below. Previously the backend omitted them, so the adapter received blank class types, unknown semester/year classification and an active-year flag that evaluated false even when the stored year was active. The shared student summary now returns the stored values on available/history responses and the evaluation object in GET /api/student/evaluations/:id/survey.

| Field | HTTP type | Source and meaning |
| --- | --- | --- |
| class_type | COURSE, TD, TP or null | Offering's saved class_type; no new internal offering ID is exposed. |
| semester.semester_number | Number or null | Stored semester classification; never inferred from semester.name. |
| semester.start_year | Number or null | Stored academic-year start_year; legacy unknown remains null. |
| semester.is_active | Boolean | Current academic-year is_active value. This is not an answerability or submission-permission flag. |

Example summary fragment with synthetic labels/identifiers:

```json
{
  "id": "20",
  "class_type": "TP",
  "semester": {
    "name": "Semester 2",
    "semester_number": 2,
    "academic_year_id": "10",
    "academic_year": "2026-2027",
    "start_year": 2026,
    "is_active": true
  }
}
```

Implementation changes the student context selection and shared summary only. Existing course/lecturer/semester labels, string HTTP IDs, survey/assigned_survey descriptors and completion/history fields retain their meaning. Authorization, shared placement rules, schedules, frozen membership, drafts, final answers and question-version protections are unchanged. All columns already existed; no Prisma schema edit or migration was needed. Frontend source and private configuration were not changed.

| Verification step | Actual result |
| --- | --- |
| Guarded test configuration | PASS: local teacher_evaluation_test confirmed before API execution. |
| Regression before service change | EXPECTED FAIL: six new unit cases failed with 20 existing passing; two new API cases failed with 19 existing passing. Missing class_type was undefined instead of the required stored value/null. |
| Focused verification after fix | PASS: 26 unit cases and 21 PostgreSQL/API cases. |
| Full regression on final formatted source | PASS: 43 unit suites/526 tests and 19 API suites/475 tests. Focused cases are included, not additional totals. |
| Production build | PASS: npm.cmd run build. |
| Lint | PASS with warnings: zero errors; five pre-existing warnings in unchanged files. |
| Whitespace | PASS: git diff --check. |
| Actual UI acceptance of new metadata | NOT TESTED: source adapter compatibility and API output were checked; no new Brave workflow was executed for this step. |
| Word visual rendering | NOT TESTED: package/content/link checks do not establish visual page layout. |

Six added unit cases cover all three summaries, true/false year flags, mismatched display-name/semester-number values, nullable offering/semester classification and completed legacy history with an unknown start year. Two added API cases exercise COURSE/TD/TP across all three endpoints and nullable legacy history. They assert HTTP identifier types, existing questionnaire descriptors and unchanged evaluation/participant/base-question records after reads. They temporarily change only owned synthetic fixture classifications, restore them in finally blocks and remove suite fixtures afterward. The full guarded regression also retains the existing progression, draft, submission, version, privacy and lecturer-release cases.

Reproduce the focused checks with the commands in TESTING's current verification checkpoint; then run full unit/API suites, build, lint and git diff --check. API testing uses only teacher_evaluation_test. No reseed, migration, normal-data audit or backup deletion was performed. Additional checks validated three built Swagger response examples and all 22 JSON example blocks in the maintained Markdown documents. A read-only audit found zero student-access courses/students/years/surveys created since the preceding documentation checkpoint (14 October 17:43:19 UTC) remaining under the suite prefixes. Older matching synthetic fixtures dated 7 October were preserved. Documentation synchronization/link/package checks were repeated, and hashes confirmed 252 other protected backend files and all 145 frontend files unchanged, excluding only the four approved student-access source/test files. Private configurations and normal school records were not changed. Ignored local verification evidence is .tmp/student-metadata-step2-evidence.json; it is not a new public report.

At completion of Step 2, current answerability was proposed as the next task. The owner subsequently approved it; Section 13.8 records its completion. Frontend consumption remains pending.

### 13.8 Completed local Step 3: current answerability

Date: 15 October 2026, Asia/Phnom_Penh. The owner approved current answerability and a blocked reason after Step 2. Previously history_status could say Not Started while survey access correctly rejected a paused student or missing yearly group. The backend now exposes that access decision separately; it does not replace history labels or rewrite enrollment, frozen membership, drafts or questionnaire versions.

| Student response | Added contract |
| --- | --- |
| GET /api/student/evaluations | Every returned item has answerable=true and answerability_reason=null; blocked assignments remain excluded. |
| GET /api/student/evaluations/history | Each existing enrolled-participant item has a boolean answerable and a stable reason code or null. history_status and completion fields retain their existing meaning. |
| GET /api/student/evaluations/:id/survey | A successful evaluation object includes answerable=true and answerability_reason=null. Rejected access keeps existing HTTP statuses/messages. |

Example history fragments using synthetic IDs:

```json
[
  { "id": "20", "history_status": "Not Started", "answerable": true, "answerability_reason": null },
  { "id": "21", "history_status": "Not Started", "answerable": false, "answerability_reason": "PAUSED" }
]
```

The shared answerabilityFor helper reuses resolveStudentPlacement and is also called by getAnswerableEvaluation, which survey, draft and submission services already use. History loads the active placement profile once per request; decisions do not issue per-item access queries. Transactional draft/submission calls retain their supplied database handle. Existing participant/enrollment checks and error precedence are preserved.

| Reason code | Meaning and evidence boundary |
| --- | --- |
| INACTIVE_STUDENT | Active student profile is unavailable. Disabled accounts normally receive JWT 401 before summaries; this code covers the service-level profile gate. |
| PROGRESSION_CHRONOLOGY_UNAVAILABLE | Shared resolver cannot order exceptional progression safely. Unknown chronology for REPEAT/TRANSFER/PAUSE/RESUME is not invented. |
| PAUSED | A prior/current PAUSE persists; a later NORMAL group does not resume it. Explicit RESUME is required. |
| MISSING_YEARLY_GROUP | Required exact-year placement or nonempty group is missing. |
| YEAR_LEVEL_UNAVAILABLE | Resolver cannot provide a bounded effective level. Dedicated new coverage is a defensive unit fixture; the SQL 1-5 constraint prevents that invalid record in normal API storage. |
| EVALUATION_NOT_OPEN | Evaluation status is not OPEN (currently DRAFT or CLOSED). ARCHIVED is not an evaluation status. |
| EVALUATION_UNSCHEDULED | Start or end is absent. |
| EVALUATION_NOT_STARTED | Current time is before start; start is inclusive. |
| EVALUATION_ENDED | Current time is at/after end; end is exclusive. |
| ALREADY_SUBMITTED | Completion blocks another answer after earlier access gates pass. |

The first failed gate is returned: active profile, placement, lifecycle/schedule, then completion. Thus completed history remains Completed even if the current reason is PAUSED or EVALUATION_NOT_OPEN. Unknown start-year metadata alone does not automatically reject an exact valid NORMAL placement; the approved shared resolver still governs it. is_active remains academic-year metadata, not submission permission.

History retains its enrolled-participant filter. Removing enrollment omits that assignment from history and keeps survey denial at 403; no new NOT_ENROLLED summary or broader history scope is invented. JWT/role/ownership guards remain authoritative. These fields are advisory snapshots: state/time can change, and actual reads/writes recheck access. An allowed flag does not bypass answer validation, protected-draft/version conflicts or duplicate-submit safeguards.

| Verification | Actual result |
| --- | --- |
| Test environment guard | PASS: local teacher_evaluation_test validated before API runs. |
| Initial regression / fixture review | Missing-field failures reproduced, including paused/missing-group history marked Not Started. Raw runs recorded 21 failed/26 passed unit and 13 failed/23 passed API cases; the unsupported-status API failure was a test-fixture issue. Fixture corrections below are separate from application defects. |
| Corrected focused checks | PASS: 46 unit and 35 API cases. Two more unit cases were then added and covered by the final full run. |
| Final full regression | PASS: 43 unit suites/548 tests and 19 API suites/489 tests; 22 new unit and 14 new API cases are included, not additional totals. |
| Production build | PASS: npm.cmd run build. |
| Lint / whitespace | PASS: zero lint errors/five unchanged warnings; git diff --check passed. |
| New frontend UI acceptance | NOT TESTED: the frontend loader still needs to consume answerable/answerability_reason. Existing three narrow Brave passes do not establish this feature's UI acceptance. |
| Word visual rendering | NOT TESTED: synchronized content/package checks do not establish page layout. |

The initial test fixture incorrectly included ARCHIVED as an evaluation status and sent an empty submission answer list, which validation rejects before the access gate. Those test inputs were corrected to supported states and a valid rating answer; application validation was preserved. The final matrix includes eligible/inactive profiles, missing annual placement/group, paused/RESUME and unresolved chronology, all supported lifecycle states, missing dates, exact time boundaries, completion, disabled-account JWT rejection and removed enrollment. Multi-item history verifies one placement lookup. API cases verify denied survey/draft/valid submission access, preserved saved drafts, unchanged participants/version pins and original history/completion fields. Exact clock boundaries and defensive invalid year levels are unit evidence, not newly executed UI cases.

Supporting source and tests: [student access service](../src/student-access/student-access.service.ts), [unit cases](../src/student-access/student-access.service.spec.ts), [API cases](../test/student-access.e2e-spec.ts). Full regression retains existing draft, anonymous-response, review, progression, questionnaire-version and lecturer-release coverage. No schema, migration, reseed, normal database mutation or frontend source change was made. Owned test fixtures are restored/removed; older synthetic records and backups are preserved. Local ignored evidence is .tmp/student-answerability-step3-evidence.json.

Additional verification checked three built Swagger response examples, all ten documented reason codes and all 23 JSON example blocks in the maintained Markdown documents. Read-only fixture checks found zero new suite courses, student profiles, academic years, surveys, accounts or drafts under the owned prefixes since the earlier documentation checkpoint. Report content/link/package checks were repeated; 252 other protected backend files and all 145 frontend files, including private configuration, match their recorded hashes. Only the four approved student-access source/test files are excluded from that preservation check. Word visual page rendering was not checked.

Next handoff: the frontend team should use answerable for the action's availability and translate answerability_reason for its explanation while retaining history_status for historical display. It must still handle server rejection after a stale snapshot and draft/version/answer-validation errors. Evaluate this through the real UI on teacher_evaluation_test, then continue complete reviewed-confirmation/version/draft/submission/lecturer acceptance. Reviewed cutover, official recovery, performance and production readiness remain pending. No commit or push was performed.

### 13.9 Completed local Step 4: automated student CRUD and permissions

Date: 15 October 2026, Asia/Phnom_Penh. The owner asked how to perform backend verification automatically. A dedicated test/students.e2e-spec.ts suite was added so the student CRUD/permission checks can be repeated from PowerShell without manual Swagger requests. Application behavior already matched these defined cases; no application fix, migration, configuration change, commit or push was performed.

```powershell
cd D:\internship\teacher-evaluation-api
npm.cmd run test:e2e -- --runTestsByPath test/students.e2e-spec.ts
```

The guarded runner loads only the isolated local test configuration. Before any fixture write, the suite checks the actual PostgreSQL current_database() value equals teacher_evaluation_test. It starts its own Nest application with the production prefix/validation behavior, authenticates synthetic seeded actors, creates uniquely named owned departments/majors/years/generations and students, executes real HTTP requests and verifies committed database effects. Per-test cleanup removes additional owned accounts/profiles/placements; final cleanup removes the baseline fixtures and dependencies and closes the application. No separate frontend, Swagger session or already running backend is needed; PostgreSQL and the configured test environment are prerequisites.

| Verification | Actual result |
| --- | --- |
| Focused student CRUD/permission suite | PASS: 89 cases in one new API suite. |
| Fresh full unit regression | PASS: 43 suites/548 tests; no new unit case was added in this step. |
| Fresh full API regression | PASS: 20 suites/578 tests, including the 89 new cases (489 + 89). |
| Production build | PASS: npm.cmd run build. |
| Lint / whitespace | PASS: zero lint errors/five existing warnings; git diff --check passed. |
| Frontend UI acceptance | NOT TESTED: these are API/database assertions, not new browser passes. |
| Word visual rendering | NOT TESTED: content/package/link checks do not establish page layout. |

| Tested area | Defined acceptance |
| --- | --- |
| Seven route permissions | Missing/invalid token and STUDENT/LECTURER calls against list, detail, create, update, delete, import and export return 401/403 with no student data or changes to owned records. Import/export checks here are authorization only. |
| Atomic creation | Exactly one account, profile and initial academic record; valid 1/5 boundaries; normalized code/email/name and optional null fields. Stored password is hashed; unknown role/status payload fields do not change the STUDENT/ACTIVE account contract. |
| Validation and uniqueness | Fourteen invalid create cases return 400; missing generation/year/major return 404; normalized code/email collisions return 409 without partial rows. Concurrent duplicate-code creates yield one successful complete student and one rejection, with no orphan account. |
| Safe response/context | Profile route IDs and account references remain correctly typed strings; recursive payload checks exclude password/password_hash/auth_version/access_token. Unassigned progress is zero; selected-year major/group/level uses that year's stored placement. |
| Filtering/pagination | Stable owned population across pages, empty scoped population, trimmed case-insensitive search, required year context, malformed/missing identifiers and query rejection. Reading does not rewrite placements. |
| Update behavior | Normalized changes, generation update and nullable email/gender/notes clearing retain initial placement history and password. Invalid requests and duplicate updates leave all accompanying account/profile changes rolled back. |
| Disable/delete behavior | Disabling rejects an existing JWT while preserving placements. Academic history blocks permanent deletion with 409; a directly prepared history-free legacy fixture can be deleted along with its account. API-created students already have an initial academic record and therefore remain protected. |

Supporting [dedicated API suite](../test/students.e2e-spec.ts) assertions inspect both HTTP responses and the exact scoped account/profile/placement state. Synthetic fixtures are owned by the unique run marker; no global reset, truncate, seed restore or cleanup of another tester's rows is used. Seed actors support authentication; fixture setup also reads the synthetic student's existing password hash without modifying that account. Normal school data, private configuration and frontend source are preserved.

Hash comparison against the pre-step snapshot confirmed all 401 existing protected files unchanged (256 backend and 145 frontend), including the earlier local student-access changes and private configuration. Read-only audits found zero new CRUD fixture accounts, profiles, records, academic years, generations, majors or departments remaining under the owned prefixes. All 23 Markdown JSON examples parse successfully; report content/link/package checks were repeated. These checks are separate from the 578 API test total.

This batch is defined coverage, not all conceivable student cases or production/frontend acceptance. Dedicated import business flows and scoped/nonzero-progress exports remain the next backend work. Nonzero student-list/detail progress, enrollment/participant-only delete blockers, reviewed group-route business cases and every possible malformed input are not newly covered by this suite. Existing unit/consistency/review suites retain their separate evidence. Any newly discovered application defect should be reported for approval before a code fix.

The four approved documents record these results, and both report formats are regenerated from the same Markdown narrative. Word visual rendering remains unchecked. Raw sanitized local evidence is .tmp/students-crud-step4-evidence.json; protected-file hashes are preserved in .tmp/students-crud-step4-baseline.json. No additional public report was created. All local work remains uncommitted, and publication requires separate approval.

### 13.10 Completed local Step 5: import/export verification and open defects

Historical checkpoint: Step 6 below subsequently resolves the generation-name defect; the 22 existing test typing errors remain pending. The following Step 5 results describe the state before that fix.

Date: 15 October 2026, Asia/Phnom_Penh. Following the owner's next-step request, a dedicated [student import/export API suite](../test/students-import-export.e2e-spec.ts) was added. It contains 30 import and 18 export cases. This is backend HTTP/database verification; frontend CSV/XLSX parsing or formatting is outside this batch. No application fix, schema migration, configuration change, normal database operation, commit or push was performed.

```powershell
cd D:\internship\teacher-evaluation-api
npm.cmd run test:e2e -- --runTestsByPath test/students-import-export.e2e-spec.ts
```

The existing runner guards the isolated configuration. The suite also verifies current_database() equals teacher_evaluation_test before writes. It starts an ephemeral Nest/Supertest API, logs in with the synthetic seeded administrator and creates uniquely owned departments, majors, years, generations, student placements, teaching assignments, questionnaire, evaluations and participants. Owned import additions are removed after each case, and final cleanup removes baseline fixtures/dependencies before closing the app. Seed actors are not modified. The normal database is not used. Existing source/configuration hash checks include the prior student-access fixes and prior student CRUD suite, so this step cannot silently alter them.

| Verification | Actual status |
| --- | --- |
| Focused import/export API suite | PASS: 48 cases, one suite (30 import/18 export), 9.681 seconds on the corrected fixture/query. |
| Full unit regression | PASS: 43 suites/548 tests, 51.651 seconds. |
| Full API regression | PASS: 21 suites/626 tests, 103.941 seconds; 578 + 48, not an additional 48 after the total. |
| Production build / scoped new-suite type check | PASS: npm.cmd run build and no-emit TypeScript check restricted to the new suite and imported application code. |
| Lint / whitespace | PASS: zero errors/five existing warnings; whitespace checked after documentation updates. |
| Extra generation-name boundary probe | FAIL: a separate normalized 101-character new generation returned HTTP 500; expected a client validation error 400. No generation, account or student was written. |
| Whole-repository no-emit TypeScript check | FAIL: 22 existing errors in three unit-spec files and test/consistency.e2e-spec.ts. None remain in the new import/export suite. This is separate from the passing production build and Jest runtime tests. |
| Existing protected files | PASS: 257 backend files plus 145 frontend files unchanged since this step began, including previous local work and private configuration. |
| Owned cleanup / examples | PASS: read-only checks found zero remaining owned users, students, placements, generations, departments, majors, years, courses, surveys, questions or answers; 23 Markdown JSON examples parse successfully. The boundary probe removed its owned year. |
| Complete frontend/browser acceptance | NOT TESTED in Step 5; earlier three narrow Brave PASS cases retain their own dated scope. |
| Word visual rendering | NOT TESTED: package, text and link synchronization are checked, visual page layout is not. |

**Import behavior verified through HTTP**

Mixed rows return ordered one-based results and exact CREATED/SKIPPED/FAILED counts. A valid row persists one STUDENT/ACTIVE account, one profile and the selected initial placement. Existing codes, including an inactive student's code, are skipped before major resolution. Unknown and ambiguous majors fail their rows without guessing or creating majors, while other successful rows remain committed. ADMIN-only permissions retain Step 4's evidence.

Retries do not overwrite an existing profile, password, generation or yearly placement. Major lookup accepts case-insensitive exact existing code/name. Generation lookup normalizes casing/whitespace, rejects ambiguous case-variant names, preserves an existing generation's chronology and creates a new generation only with explicit valid entry-year data. A newly created shared generation remains even if every student's major fails; this is intentionally recorded rather than describing the entire import request as atomic.

Blank names fall back to normalized codes; optional gender/notes/group can remain null. Default or blank initial password uses the existing synthetic import default password@1235; explicit valid passwords work. Each account has an independently salted hash, and a real student login succeeds. Fifteen request-validation cases and four missing/ambiguous-dependency cases reject without changes to owned state. These cover duplicate normalized codes before generation creation, empty/501-row payloads, invalid row values, year/ID bounds, password length and UTF-8 bcrypt byte overflow.

The frontend parses CSV/XLSX and posts JSON. HTTP 201 means an import report was produced, not that every row succeeded: the frontend must display summary/results and let staff review failed/skipped rows. Repeating the same normalized codes is safe for existing accounts; importing is not an update operation.

**Export behavior verified against a known dataset**

Synthetic fixture data covers scheduled OPEN, future OPEN, expired OPEN, unscheduled OPEN, CLOSED and DRAFT evaluations across two years and both semester numbers, including deliberately misleading semester names. Expected counts are specified independently of the service implementation. The primary student's Semester 1 has active assigned/completed/left = 2/1/1 and total assigned/completed/not_completed = 6/2/4. Its whole-year totals are active 3/1/2 and total 7/2/5; all-period total is 8/3/5. Later-year counts are 1/1/0, without carrying previous year's totals forward. DRAFT does not contribute; CLOSED/out-of-window published assignments contribute only to total.

Without a period filter, matching unassigned and draft-only profiles appear with real zero counts. With a selected year/semester, the population requires explicitly assigned OPEN/CLOSED participation in that period. An inactive account's historical participation remains visible to the administrator. Generation filters isolate another student participating in a shared evaluation. Year/major/group filters use the selected year's stored placement and normalize historical group labels. Latest unfiltered placement uses structured start_year even when academic-year IDs were created in reverse chronological order. Semester selection uses stored semester_number, not a display label. Empty groups return a complete empty dataset.

The JSON response uses report.generated_at/scope/identifiable_participation_data/privacy_notice, preview.student_count/complete and data. It is a complete dataset, not a paginated student-list response. It excludes credential fields, private question text and a stored anonymous-answer sentinel. Export is identifiable staff participation reporting; its privacy notice and ADMIN-only access matter. Response content remains anonymous and separate from participant progress. Reads and invalid scopes do not rewrite owned profiles, placements, submission flags or stored anonymous answers.

Completion flags and the independent anonymous answer are prepared directly in the isolated fixture. This validates reporting against known records, not a new browser-submission lifecycle. Progress counters are participation data and do not establish current answerability: inactive accounts or ended assignments can retain historical totals. New-generation default starting level, a successful maximum-size 500-row import, concurrent import races/transaction-failure injection, every field-length boundary, throughput and frontend spreadsheet rendering remain outside this new batch. Existing unit/API evidence retains its own scope.

**Confirmed defects and proposed next work**

An additional source review noticed [import DTO](../src/students/dto/import-students.dto.ts) generation permits 150 characters whereas student_generations.name in the [Prisma schema](../prisma/schema.prisma) is VARCHAR(100). A separate synthetic HTTP probe confirmed that a normalized 101-character new generation passes request validation but fails at persistence with 500. The expected safe contract is 400 before writes. No generation/account/student was created; the probe's isolated year was removed. This FAIL is separate from the passing 48-case/626-test regression, and no universal all-checks-pass claim is made.

Proposed application fix: validate the generation name against the stored 100-character limit, keep normalization and existing generation behavior, document the same constraint and add 100/101-character HTTP regression coverage. It requires the owner's approval before implementation. The reproduction is preserved in ignored .tmp/import-generation-length-probe.cjs.

The supplementary whole-repository command node node_modules/typescript/bin/tsc --noEmit --pretty false reports 22 existing errors in src/course-offerings/course-offerings.service.spec.ts, src/evaluations/evaluations.service.spec.ts, src/semesters/semesters.service.spec.ts and test/consistency.e2e-spec.ts. They include Jest mock typing, unknown response values and stale typed assumptions about reviewed-operation responses. Those files were unchanged in this step. The new suite's own typing issue was corrected and its scoped check passes. Proposed cleanup should narrow values/update types while preserving all runtime assertions; changes to existing tests also await approval. Jest's current transpilation and production-build exclusions explain why runtime tests/build can pass while the broader check fails.

The initial fixture attempt used an unsupported class_type and rolled back its setup transaction. The next run passed 45 cases with three query-harness errors caused by an incorrect Prisma relation name; after correction all 48 passed. These are test-authoring failures, separate from the confirmed generation-limit application defect. A sandbox result-file write failure was resolved through an approved rerun; it is not an application failure. Sanitized evidence is retained locally in .tmp/import-export-step5-evidence.json.

README, TESTING and both report formats are updated consistently; dated delivery/Steps 1-4 and earlier narrow UI evidence remain preserved. Document content/package/link checks do not establish visual Word rendering. All work remains uncommitted. Next approved backend changes should first close the generation validation defect and existing test typings, then continue remaining group/authorization coverage and coordinate complete frontend acceptance. Operational recovery, school-sized performance and production readiness remain separate unfinished work.

### 13.11 Completed local Step 6: import generation-name validation

Historical checkpoint: the 22 test typing errors recorded below were subsequently resolved in Step 7. Step 6 evidence remains the state at that time.

Date: 15 October 2026, Asia/Phnom_Penh. The owner authorized the listed backend improvements one by one with explanations. This checkpoint completes the first item: prevent an oversized imported generation name from reaching the 100-character database column and causing an internal-server error. The 22 pre-existing test typing errors are deliberately retained for the next sequential item. No normal migration, frontend modification, configuration change, backup deletion, commit or push was performed.

**Before and after**

Before this fix, ImportStudentsDto permitted 150 characters while student_generations.name stored at most 100. A 101-character new name passed DTO validation and failed at persistence with HTTP 500. The new DTO trims/collapses whitespace before enforcing a shared 100-character limit, publishes that limit in OpenAPI and leaves non-string inputs to standard validation. The service retains normalization and independently rejects longer names before any database access, protecting internal callers as well as HTTP requests. Counting uses Unicode code points, so a supplementary character is not incorrectly counted twice as UTF-16 code units. Storage, schema and approved import workflow are unchanged.

Normalized 100-character names still create one generation and one complete account/profile/placement. Padding and repeated whitespace can make the raw request longer than 100 while the normalized name remains valid. Repeating an accepted boundary import reuses the same generation and skips existing codes without modifying passwords or placement history. Normalized 101-character ASCII and Unicode names now return 400 without import writes. The frontend can display the existing validation-message array for invalid HTTP input; no frontend source change is needed to use the same route/payload.

The implementation is limited to [import DTO](../src/students/dto/import-students.dto.ts) and [import service](../src/students/student-import.service.ts). Four new [unit cases](../src/students/student-import.service.spec.ts) cover ASCII/Unicode limits and direct-service protection; seven additional [API/schema cases](../test/students-import-export.e2e-spec.ts) cover persisted 100-character creation/retry, rejected 101-character requests, non-string safety and the generated OpenAPI schema.

```powershell
cd D:\internship\teacher-evaluation-api
npm.cmd test -- --runInBand --runTestsByPath src/students/student-import.service.spec.ts
npm.cmd run test:e2e -- --runTestsByPath test/students-import-export.e2e-spec.ts
npm.cmd test -- --runInBand
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run lint
git diff --check
```

| Verification | Actual result |
| --- | --- |
| Reproduce before the fix | FAIL as expected: two missing service rejections; actual 101-character ASCII/Unicode requests returned 500; generated schema advertised 150. Existing accepted-boundary/non-string cases retained their behavior. |
| Focused import-service unit suite | PASS: 20 cases, including four new regressions. |
| Focused import/export suite | PASS: 55 cases, including seven new API/schema checks. This consists of 36 import HTTP cases, 18 export HTTP cases and one OpenAPI schema check. |
| Fresh full unit regression | PASS: 43 suites/552 tests (548 + 4). |
| Fresh full API regression | PASS: 21 suites/633 tests (626 + 7). Focused cases are already included. |
| Original standalone probe | PASS: expected/actual HTTP 400, zero generation/account/student writes; probe's owned test year removed. |
| Production build and scoped changed-suite typing | PASS. The service guard and DTO compile; no changed-suite type errors remain. |
| Lint / whitespace / preservation | PASS: zero lint errors/five existing warnings; whitespace and protected-file checks completed after the final changes. Only the four authorized implementation/test files differ from the pre-step snapshot. |
| Whole-repository test-file typing | FAIL remains: 22 existing errors in unchanged course-offerings/evaluations/semesters unit specs and test/consistency.e2e-spec.ts. This is the next checklist item. |
| Real frontend UI / Word visual layout | NOT TESTED in this checkpoint. Earlier narrow Brave results retain their own scope; Word text/package/link checks do not establish page rendering. |

The existing guarded runner and an explicit current_database() check restrict fixture work to teacher_evaluation_test. API tests verify stored generation/account/profile/placement state, no-write rejection and no-change retries. Existing mixed-row import behavior, default/custom passwords, preserved generation chronology, per-row partial outcomes and export counts/history/privacy regressions still pass. No reset, reseed, new schema or global cleanup is required. Read-only checks confirm removal of owned fixtures and preservation of all other protected source/configuration files, including frontend and previous local work.

The old Step 5 FAIL evidence remains recorded rather than being rewritten as if it originally passed. The isolated standalone reproduction is rerun against the newly built API and now passes. A new OpenAPI test's missing config type field was corrected during verification; the final scoped check passes. The command-filter issue and corrected test-authoring issue are separate from the application defect and retained in local raw evidence.

Sanitized evidence and source hashes are retained in ignored .tmp/import-generation-step6-evidence.json and .tmp/import-generation-step6-baseline.json. README, TESTING and both report formats are maintained as the only approved documentation set. All local work remains uncommitted. Next: repair the 22 existing test typings while preserving assertions, then assess remaining frontend-critical coverage before final handoff and thesis evidence freeze. School deployment, performance/recovery acceptance and complete UI acceptance remain separate unfinished work.

### 13.12 Completed local Step 7: existing test TypeScript errors

Date: 15 October 2026, Asia/Phnom_Penh. The owner approved continuing one by one to the second checklist improvement. The 22 existing test TypeScript errors are now resolved without modifying application source or adding/removing test cases. This closes the separate failing no-emit check preserved at Steps 5/6, while the already fixed generation-name defect remains protected by its existing tests. All local work remains uncommitted; no normal migration, frontend/configuration change, backup deletion, commit or push was performed.

**Why runtime tests passed while type checking failed**

The production build excludes spec files. The current Jest setup transpiles with isolatedModules, so runtime assertions can execute successfully without the broader TypeScript check passing. This step repairs the test declarations and call contracts rather than suppressing errors or changing school rules. The configured whole-repository command now completes with exit code zero and no diagnostics; the production build and runtime tests are still checked separately.

| Changed test file | Repair and preserved behavior |
| --- | --- |
| Course offerings unit spec | Explicit asynchronous course-rule mock signature, retaining the same empty rule result and all offering/history expectations. |
| Evaluations unit spec | Explicit Promise return types for academic-year and major mocks, retaining the same fixture values and targeting/lifecycle expectations. |
| Semesters unit spec | Explicit Promise number return type for the evaluation count mock; historical protection behavior and expectations are unchanged. |
| Consistency API suite | Test-local CJS historical-record/manifest/outcome types; typed transaction results and question callbacks; correct string selected-year argument; runtime-checked academic context, enrollment review IDs/counts and confirmed evaluation ID; object request payload signatures. Existing recovery, progression, concurrency, review and privacy scenarios retain their assertions. |

The CommonJS historical-metadata script itself is unchanged. Its interface in the test reflects the reviewed inspected-record fields and WOULD_CHANGE/CHANGED/ALREADY_APPLIED outcomes. Verified manifest arrays are explicitly typed. Reviewed-operation services also remain unchanged: test helpers check the returned string account IDs and nonnegative enrollment count before narrowing them. A confirmed creation ID must be a string before BigInt conversion. Selected-year student context is requested with the service's required string argument and checked for presence, avoiding an unchecked assumption about a union response. These checks strengthen failure reporting without weakening the original comparisons.

```powershell
cd D:\internship\teacher-evaluation-api
node node_modules/typescript/bin/tsc --noEmit --pretty false
npm.cmd test -- --runInBand --runTestsByPath src/course-offerings/course-offerings.service.spec.ts src/evaluations/evaluations.service.spec.ts src/semesters/semesters.service.spec.ts
npm.cmd run test:e2e -- --runTestsByPath test/consistency.e2e-spec.ts
npm.cmd test -- --runInBand
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run lint
git diff --check
```

| Verification | Actual result |
| --- | --- |
| Reproduce the prior failure | FAIL before repair: whole-repository no-emit checking reported exactly 22 diagnostics in these four tests. |
| Final whole-repository no-emit check | PASS: zero errors, exit code zero. No ts-ignore, ts-nocheck, ts-expect-error, test skips or todos were introduced. |
| Focused unit regression | PASS: three suites/88 tests, 2.881 seconds. |
| Focused PostgreSQL consistency regression | PASS: one suite/86 cases, 16.009 seconds. |
| Fresh full unit regression | PASS: 43 suites/552 tests, 42.720 seconds. |
| Fresh full API regression | PASS: 21 suites/633 tests, 89.945 seconds. No new cases are added; totals match Step 6. |
| Assertion preservation | PASS: compiler-AST comparison with the pre-step committed versions preserves all 650 existing matcher calls and expected arguments across four files. Direct test declarations are unchanged; parameterized cases remain included in runtime totals. |
| Build / lint / whitespace | PASS: production build; zero lint errors/five existing warnings; whitespace checks. |
| Protected files / fixture cleanup | PASS: only the four authorized tests differ from the pre-step 403-file snapshot; 399 other files, including all application/frontend/private configuration files, are unchanged. Read-only checks find zero new owned consistency fixture users, students, departments, majors, years, generations, courses or surveys. Older fixtures are not removed. |
| UI / Word page layout | NOT TESTED in this checkpoint. API fixture operations do not count as browser acceptance; document text/package/link checks do not establish visual rendering. |

The existing guarded runner restricts API evaluation to teacher_evaluation_test. A separate read-only database check verifies current_database() before fixture audits; no normal database operation was performed. The consistency suite creates and cleans its own synthetic data as before. Source-hash comparison preserves the prior questionnaire, metadata, answerability and generation-name fixes and all frontend/private settings. The audit does not reset sequences or clean another tester's historical rows.

The test count is intentionally unchanged because this work fixes how existing tests are typed and how helper responses are checked. It does not add an endpoint or establish additional frontend feature coverage. Test totals, type diagnostics and assertion-audit counts measure different things and must be cited separately in a thesis or defense.

Detailed local evidence is ignored .tmp/test-typing-step7-evidence.json; .tmp/test-typing-step7-baseline.json preserves the pre-step hashes and .tmp/test-typing-step7-assertions.cjs provides the structural assertion check. The four approved documents record current and historical evidence, and both report formats remain synchronized. Word visual inspection is still pending. Next: audit frontend-critical requests against actual route/permission assertions, reusing consistency/integration coverage before proposing additional cases. Complete UI acceptance, reviewed-confirmation cutover, school-sized performance and target-environment recovery remain separate work.

### 13.13 Completed local Step 8: frontend-critical contract and coverage audit

Historical source-only checkpoint: the own-password HTTP gap identified below is subsequently resolved by Step 9 in Section 13.14. Step 10 in Section 13.15 subsequently tests group options and finds three overflow failures, resolved in Step 11/Section 13.16; Step 12/Section 13.17 subsequently executes lecturer-own-assignment HTTP tests and finds two overflow failures, resolved with approval in Step 13/Section 13.18.

Date: 15 October 2026, Asia/Phnom_Penh. The owner asked how to proceed after resolving generation-name validation and the 22 test typing errors. This step traces the available frontend to existing backend contracts and actual assertions before adding tests. It is source/documentation review: no application/frontend code, database, migration, seed, runtime suite, browser session, commit or push was executed. Last executed verification remains Step 7: 552 unit/633 API tests, zero whole-repository type errors, build/lint passing with five existing warnings.

**Method and evidence boundary**

Start from the screen/action, follow its shared loader or write helper, inspect the matching controller/DTO/guard/service and then inspect tests that actually assert behavior. Shared data means a page can display backend data without calling fetch itself. Static discovery read 124 backend controller route declarations and 84 named frontend client/wrapper call sites across all roles. Dynamic paths, generic helpers and component preview/confirm props require manual resolution. These counts are not executed requests, unique mapped frontend endpoints, a coverage percentage or proof that every runtime path was resolved. Guards were inspected separately; absence of a Roles decorator in the inventory does not imply a public endpoint.

The 20-family matrix below is an admin-focused contract review with shared profile/authentication and selected lecturer/student consumers. PASS means the inspected source route/payload/consumer contract is present and consistent; it does not mean new HTTP or UI acceptance. PARTIAL/MISSING describe existing test scope rather than confirmed missing application features. Browser acceptance is NOT TESTED in this step for every row. Existing Step 7 passing tests retain their dated execution evidence.

| UI/action family | Source contract and IDs | Existing backend evidence / remaining HTTP gap |
| --- | --- | --- |
| C01 Sign-in and profile | PASS: POST auth/login identifier/password, bearer JWT, GET auth/me and capability flags. | app/login/me HTTP cases plus auth specs and integration; no new login/browser run. |
| C02 Own password | PASS: shared profile sends PUT auth/password with current_password/new_password, without a target account ID. | MISSING inspected HTTP coverage; service/controller/rate-limit unit cases exist. First next batch. |
| C03 Admin dashboard | PASS: shared admin loader fetches people, academic setup, evaluations, offerings and admin/results; frontend derives charts/counts. | Underlying API evidence exists; complete dashboard aggregate accuracy and refresh behavior need UI acceptance. No dedicated dashboard summary endpoint is required by these calls. |
| C04 Departments and majors | PASS: generic setup maps GET/POST/PUT/DELETE; department status and major string department_id match DTOs. | PARTIAL: unit cases and actual major rename HTTP; full CRUD/permission matrices remain. No department HTTP path was found in inspected suites. |
| C05 Years and semesters | PASS: numeric start_year/semester_number; semester academic_year_id is a number, calendar fields optional. | Semesters API plus academic-integrity year/date/activation cases exist; full year CRUD/role matrix remains partial. Frontend does not expose every supported date operation. |
| C06 Generations | PASS: resolve existing normalized label or POST name, string entry_academic_year_id and numeric starting_year_level. | Generation unit/boundary API and import creation/reuse exist; complete standalone CRUD/role scope remains partial. |
| C07 Staff and departments | PASS: users are account IDs; staff-only collection; membership department_id is numeric and is_primary boolean. Lecturer import uses account creation followed by membership assignment. | Users API and primary-department consistency cases exist; full browser multi-request partial-failure recovery remains NOT TESTED. |
| C08 Student profiles | PASS: student routes use profile IDs; linked account IDs retained for password/status operations; paginated collections are fully loaded. | Dedicated 89-case CRUD/permission suite exists. Nonzero list/detail progress and enrollment/participant-only deletion blockers remain outside that batch. |
| C09 Progression and annual placement | PASS: POST/PUT academic-records uses profile/year/major string IDs, numeric level and NORMAL/REPEAT/TRANSFER/PAUSE/RESUME. | Real progression/pause/resume/yearly-group/history assertions in consistency; full generic route permission/delete cases remain partial. |
| C10 Reviewed bulk group | PASS: POST preview/confirm under students/bulk/class-group uses exact profile IDs, year, normalized group and opaque review_id. | Consistency HTTP cases already assert drift, atomic changes and stable retry. Do not replace them merely because there is no group-named suite. |
| C11 Group options for export | PASS: GET students/group-options takes three string query IDs; response echoes scope and normalized groups. | MISSING inspected HTTP coverage; two service unit cases exist. Second next batch. Valid scopes with no records return empty groups; do not invent a new 404 rule. |
| C12 Student import and export | PASS: frontend parses files/posts JSON, groups mixed files into request-level class_group batches and fetches complete export snapshots. | Existing 55 import/export/schema cases and CRUD permissions retained; frontend file formatting and multi-batch interruption/retry remain NOT TESTED. |
| C13 Curriculum | PASS: course/major IDs are strings, level numeric; revisions send effective_academic_year_id/enabled/reason and are read from the rules collection. | Dedicated curriculum-revisions API suite includes real rule creation/revisions/history, alongside unit cases. Additional base CRUD/role edges remain partial. |
| C14 Teaching assignments | PASS: string course/lecturer/semester IDs, numeric/null level, COURSE/TD/TP, section and explicit group_scopes. | Offerings API plus curriculum/consistency history and integrity cases exist; remaining browser edits/errors retain their own limits. |
| C15 Enrollment and reassignment | PASS: group preview/bulk use account IDs; reassignment preview/confirm carries account, target offering, reviewed enrollment and review IDs. | Enrollment and reviewed consistency assertions cover scope, protected drafts/submissions, drift, retry and rollback. Reassignment UI exists; individual new-enrollment controls are a separate UI scope. |
| C16 Question sets, versions, questions | PASS: survey/version/question routes and reorder body; six question types and option IDs; preview/confirm applies versions to unfinished participants. | Dedicated lifecycle/question/reorder suites and reviewed consistency cases exist. Actual UI version/draft/history acceptance remains pending. |
| C17 Evaluation lifecycle | PASS: reviewed create, schedule PUT, open/close, explicit retained-version opening preview/confirm; string IDs and ISO timestamps. | Evaluation/consistency tests cover snapshots, schedules, stale versions, retries, CLOSED behavior and strict-cutover rejection. Real UI opening was previously BLOCKED, not passed. |
| C18 Admin/lecturer results | PASS: admin loader reads admin/results; lecturer reads own lecturer/results; version_results/unversioned counts reconciled and historical labels retained. | Actual HTTP listing, CLOSED release, wrong-role/ownership and anonymous-slicing assertions exist in consistency. Additional admin-target/role/aggregate combinations remain partial. |
| C19 Lecturer assignment list | PASS: GET lecturer/course-offerings uses token identity and returns items/total/complete even without an evaluation. | MISSING inspected HTTP coverage; controller delegation and service filtering/shape unit tests exist. Third next batch. |
| C20 Student metadata/access display | Metadata survey/class/semester/year fields are consumed. Backend answerable/answerability_reason exist; frontend still derives readiness from history_status. | Backend unit/API flags already tested; frontend consumption and actual blocked-state behavior remain NOT TESTED. Source-observed integration risk described below. |

**Traceable source examples**

The [admin/shared data source](../../teacher-evaluations-frontend/src/services/appDataSource.js) shows the bulk GET loaders, write routing and lecturer assignment/results consumers. [Academic setup](../../teacher-evaluations-frontend/src/services/academicSetup.js) and [backend contract adapters](../../teacher-evaluations-frontend/src/services/backendContracts.js) show numeric versus string foreign-key conversion and separate student profile/placement/password calls. [Shared password service](../../teacher-evaluations-frontend/src/services/userProfile.js) maps to the [auth controller](../src/auth/auth.controller.ts), service specs and rate-limit guard specs, while a repository-wide API-suite search found no matching password HTTP request/assertion.

[Student export](../../teacher-evaluations-frontend/src/components/StudentProgressExport.jsx) calls group-options and checks scope/groups; [students controller](../src/students/students.controller.ts), StudentGroupOptionsQueryDto and students service show the matching ADMIN-only query/response. Its unit tests normalize/deduplicate labels and return empty scopes. The [lecturer controller](../src/course-offerings/lecturer-course-offerings.controller.ts) obtains ownership from CurrentUser, while controller/service unit tests verify delegation, filters and the complete response shape. Neither endpoint had matching inspected HTTP assertions.

Existing [consistency API assertions](../test/consistency.e2e-spec.ts) were inspected rather than inferred from filenames. They include real primary-department operations, progression/yearly groups, reviewed group/creation/reassignment/version workflows, actual admin and lecturer result requests, CLOSED release, other-lecturer isolation and forbidden anonymous slicing. [Curriculum revision cases](../test/curriculum-revisions.e2e-spec.ts) include real POST course-year-rules and subsequent revision/teaching-history behavior. These correct an earlier overly broad statement that these families lacked dedicated HTTP coverage.

**Frontend integration dependencies**

The student adapter maps history_status and fetches drafts for Not Started rows without consuming answerable/answerability_reason. Its catch handles 409 draft/version conflicts but rethrows other errors. By source inspection, an ineligible/paused draft 403 can propagate as a load error. No browser reproduction was performed, so this is a source-observed risk rather than an application FAIL. The frontend team should consume the existing flags, skip blocked draft work and validate the rendered behavior. Backend pause/eligibility protections remain required.

The dashboard timer changes time-based labels without polling new server records. Counts and rating distributions are calculated in dashboardAnalytics from the fetched canonical results and participant counts. This makes UI refresh and arithmetic acceptance a frontend/joint task; it does not establish a missing backend summary requirement. Academic-year dates and clearing semester dates are supported by the API but not fully exposed in the inspected UI adapters. Some generation/secondary membership/individual enrollment controls are also narrower than backend capabilities.

Student profile editing and lecturer imports use multiple backend requests with explicit partial-outcome messages. A successful profile/account save followed by failed placement/department/password work must be retried on the existing account. SystemContext distinguishes a saved write from a failed refresh. These frontend recovery paths still need actual UI evaluation; backend per-operation transactions do not make a multi-request workflow globally atomic.

**Prioritized automated acceptance after this audit**

| Order | Proposed cases | Current execution status |
| --- | --- | --- |
| 1. Own-password HTTP | Owned synthetic active account; valid change; old JWT and old password rejected; new login works; bad current/same/short/oversized-byte input leaves hash/auth_version unchanged; missing/invalid JWT; per-user isolation; sixth request 429. | NOT TESTED through HTTP in inspected suites. Existing service/controller/guard unit evidence retained. |
| 2. Export group-options HTTP | ADMIN-only role/JWT matrix, required/invalid scope IDs, exact year/generation/major, whitespace/case normalization, duplicate labels, valid empty scopes and read preservation. | NOT TESTED through HTTP in inspected suites; two existing unit cases retained. |
| 3. Own lecturer assignments HTTP | Two-lecturer isolation; assignments with/without evaluations; academic/semester/type/search filters; safe complete items/total metadata; invalid queries, empty scopes and role/JWT rejection; query cannot override token ownership. | NOT TESTED through HTTP in inspected suites; unit/controller evidence retained. |
| Later evidence gaps | Complete academic CRUD/permission combinations; nonzero student list/detail counts; enrollment/participant-only deletion blockers; additional admin-result target/aggregation combinations; browser multi-call recovery and file export. | PARTIAL existing backend evidence, with browser scenarios NOT TESTED beyond earlier narrow passes. Define each batch before implementation. |

The next implementation should add the first guarded API batch using only teacher_evaluation_test and owned synthetic actors. A test-data setup or unit mock is not an HTTP pass. If a test reveals an application defect, report the reproduction and proposed fix before implementing it under the owner's instruction. No new missing backend endpoint or newly confirmed backend defect was established by this source-only audit.

**Review verification and preservation**

Source hashes confirm all 403 protected backend/frontend files unchanged during this step (258 backend, 145 frontend), including private configuration and prior fixes. The inventory paths, local report links, 23 JSON examples, FR01-FR44 register, document structure and Markdown/Word synchronization are checked. No database was accessed and no tests were rerun; the source-audit result must not be added to the last executed 552/633 totals. No new Brave pass is claimed. Word visual rendering remains NOT TESTED. Exactly the two report files remain inside docs, alongside the approved README and TESTING at repository root.

Ignored local evidence is .tmp/frontend-contract-step8-evidence.json, with route/call discovery in .tmp/frontend-contract-step8-inventory.json and pre-review hashes in .tmp/frontend-contract-step8-baseline.json. These are reproducibility aids rather than extra public reports. Runtime case totals, static declaration/call counts and source comparison status are different measures. Some original requirement text remains unavailable; the preserved FR01-FR44/eight-area register and approved policies remain the interpretation reference. Complete frontend acceptance and school production readiness are still separate unfinished work.

### 13.14 Completed local Step 9: self-service password HTTP verification

Date: 15 October 2026, Asia/Phnom_Penh. The owner approved the next automated batch after the frontend/backend source audit. Added [test/auth-password.e2e-spec.ts](../test/auth-password.e2e-spec.ts); no application code fix was required. Real NestJS requests use the same PUT /api/auth/password body as the shared frontend profile service: current_password and new_password, with a bearer JWT and no target ID. Frontend source and browser state were not changed or newly evaluated.

**Acceptance and actual results**

| Scenario | Cases | Status and observed behavior |
| --- | --- | --- |
| Own-account changes for ADMIN/LECTURER/STUDENT | 3 | PASS: response contains only the documented success message; bcrypt hash changes and auth_version increases by one. Two distinct old JWT sessions fail with 401, old-password login fails and new-password login/profile succeeds. Exact non-credential user fields, student profile/placement and department memberships are preserved; another account and token remain valid. |
| Accepted boundaries | 4 | PASS: six characters, 72 ASCII bytes, 72 UTF-8 bytes and literal surrounding spaces work; exact new-password login succeeds and the old password fails. Spaces are preserved. |
| Rejected inputs | 19 | PASS: missing, empty, short, 73-character, 75-byte multibyte, null and non-string fields, wrong current password and same-password replacement return 400. Account/hash/auth_version and academic/membership state remain identical; existing JWT and password remain valid. |
| Authentication | 7 | PASS: missing/malformed/bad-signature/expired/missing-version/wrong-version JWT and a post-login deactivated account return 401 without credential mutation. The JWT guard rejects inactive accounts before the service's 403 branch; this suite does not claim that branch is a separate HTTP pass. |
| Target/privilege injection | 1 | PASS: extra target account IDs, role, status and auth_version are stripped by validation. Only the authenticated student's password changes; neither its privileges nor the other lecturer's credentials change. |
| Per-user rate budget | 3 | PASS: first five failed attempts return 400 and sixth returns 429; another same-source user can still change its own password. Re-login and successful password rotation do not reset the same user's window; DTO failures also count. |
| Competing changes | 1 | PASS: two concurrent requests from the same initial state produce exactly one success, one 400/401 rejection and one auth_version increment. Only the winning password logs in and the original session is revoked. This verifies the observed invariant, not every possible schedule. |
| Total focused suite | 38 | PASS: one suite, 18.980 seconds. These cases are included in the full API count below. |

**Verification procedure and checkpoint**

Run the focused command and complete regression procedure in [TESTING.md](../TESTING.md#automated-self-service-password-http-checks). Fresh final full execution passes 43 unit suites/552 tests (43.089 seconds) and 22 API suites/671 tests. Whole-repository tsc --noEmit passes with zero diagnostics; production build and whitespace checks pass; lint has zero errors and the same five pre-existing warnings. No focused count is added twice. Step 7's 552/633 and delivery's 514/471 remain historical checkpoints.

The runner validates the local teacher_evaluation_test configuration; the suite additionally asserts current_database() before any fixture writes. It creates unique synthetic users with real hashed passwords and owned department/year/major/generation dependencies, plus a linked yearly placement for student actors. Tests never rotate seeded or school credentials. Owned account/profile/placement/membership rows are cleaned after each case, dependency rows after the suite; cleanup and 403-file hash checks separately PASS. Normal teacher_evaluation is never selected. Test sequences may advance normally as fixtures are inserted/deleted; no normal records or sequence claims are inferred from this test run.

**Boundaries and next action**

This batch establishes HTTP acceptance only for the listed self-service scenarios. Administrative password reset is separate. The existing guard unit tests retain rate-window rollover coverage; no newly timed 60-second HTTP expiry test was run. This does not establish general login rate limiting, complete authentication hardening, all error/privacy combinations, new frontend acceptance or production readiness. The suite uses two real concurrent requests without introducing a mocked database race. No application defect was observed in the defined cases.

Next: add guarded GET /api/students/group-options HTTP cases, then GET /api/lecturer/course-offerings. Retain existing progression, reviewed-confirmation, history/privacy and CLOSED-result tests. Report any newly reproduced application issue before implementing its fix. No migration, reset, reseed, private configuration edit, normal database access, backup deletion, commit or push was performed. All earlier local changes remain uncommitted.

The four maintained documents are updated together; docs contains exactly the Markdown and Word reports. Local links, JSON examples, FR01-FR44, DOCX package/XML/references and exact Markdown/Word content synchronization are checked. **Word visual rendering was NOT CHECKED**; package/content checks are not visual layout evidence. Ignored local evidence: .tmp/auth-password-step9-evidence.json, .tmp/auth-password-step9-baseline.json and .tmp/auth-password-step9-check.cjs. Original imp.txt/imp1.txt remain unavailable; the preserved register and approved policies remain the requirement reference.

### 13.15 Local Step 10: student export group-options HTTP verification

Historical discovery checkpoint: the three failures and pending-approval wording below record the pre-fix state. The owner subsequently approved the repair; Section 13.16 records the implemented fix and fresh passing results.

Date: 15 October 2026, Asia/Phnom_Penh. The owner approved proceeding from the password verification to group options. Added [test/students-group-options.e2e-spec.ts](../test/students-group-options.e2e-spec.ts). It executes GET /api/students/group-options against real NestJS validation/JWT/role guards and Prisma/PostgreSQL, using the three string scope IDs sent by [StudentProgressExport.jsx](../../teacher-evaluations-frontend/src/components/StudentProgressExport.jsx). No frontend source or browser acceptance changed. At this discovery checkpoint, the suite found a real defect and was not marked complete or fully passing.

**Acceptance results**

| Scope | Cases | Result |
| --- | --- | --- |
| Frontend response contract | 1 | PASS: academic_year_id/generation_id/major_id echoed as exact strings; groups/total are complete and normalized. Trim/collapse whitespace, uppercase, deduplicate, sort, remove null/blank labels; retain Khmer label. Exact shape excludes student/account/anonymous-answer information. |
| Three-dimensional placement filtering | 3 | PASS: alternate year, generation and major each isolate the matching label; no unrelated or carried-forward group enters the selected response. |
| Unmatched existing placement scope | 1 | PASS: existing year/major combination with no placement returns an empty list; generation progression does not invent a group. |
| Nonexistent but well-formed IDs | 3 | PASS: each in-range absent ID returns 200, exact echoed scope and no groups. No new 404 requirement is invented. |
| Large in-range string IDs | 2 | PASS: 9007199254740993 and signed BigInt maximum 9223372036854775807 retain exact string values without Number rounding. |
| Unrelated/pagination queries | 1 | PASS: extra group/status/year-level/page/limit fields leave the complete scope response unchanged. |
| JWT and role matrix | 4 | PASS: missing/invalid JWT 401; STUDENT/LECTURER 403 without group data. ADMIN positive requests succeed. |
| Missing fields | 3 | PASS: each omitted scope ID returns 400 with its field identified. |
| Malformed scope values | 27 | PASS: nine invalid strings per field: empty, zero, negative, fraction, exponent, letters, whitespace, leading zero and comma. |
| Repeated parameters | 3 | PASS: repeated query key rejected with 400 for each field. |
| Out-of-storage-range scope values | 3 | FAIL: each ID set to 9223372036854775808 returns 500, expected 400. Retained regression assertions expose the defect; no skips or acceptance of 500. |
| Focused total | 51 | 48 PASS/3 FAIL; one failing suite, 5.204 seconds. |

Stored labels for inactive and paused students remain visible in this administrative history lookup. That is the inspected and tested contract; current enrollment/answerability remains controlled by separate eligibility services. Group options need actual selected-year placements and never create records, advance a student or carry an earlier group forward.

**Reproduced defect and proposed fix**

The current StudentGroupOptionsQueryDto checks positive-decimal syntax but does not check the database's upper bound. JavaScript BigInt accepts 9223372036854775808; Prisma cannot encode it into signed 64-bit storage. Replacing academic_year_id, generation_id or major_id with that value independently yields HTTP 500. The valid maximum itself returns a safe empty result. Owned fixture snapshots show no data mutation for any of these requests.

Expected behavior: values outside 1..9223372036854775807 return 400 before Prisma, retaining decimal strings and avoiding Number precision conversion. Proposed implementation is an upper-bound validator on the three query fields with boundary tests and matching Swagger metadata. No database migration or frontend change is required. Under the owner's instruction to report newly found code fixes first, approval was requested; application code remains unchanged while awaiting the response. This is an input-error handling defect, not evidence that normal frontend-selected groups fail.

**Fresh verification and evidence boundary**

All 43 unit suites/552 tests PASS (40.209 seconds). The full API run has 719 PASS/3 FAIL, 722 total, across 23 suites (22 PASS/one FAIL); all three failures are the new storage-overflow regressions. Whole-repository no-emit type checking and production build PASS; lint zero errors/five pre-existing warnings; whitespace checks PASS. The 51 focused cases are included in full totals. The historical Step 9 552/671 PASS must not be presented as the current working-tree result. Rerun focused and full verification after an approved fix before advancing this checkpoint to PASS.

Configuration is guarded to local teacher_evaluation_test; the suite additionally checks current_database() before fixture writes. All users, years, generations, majors and students are uniquely owned synthetic fixtures. Every case verifies exact account/hash/version/profile/placement/support state preservation, and cleanup removes owned fixtures after the suite. Independent cleanup checks find zero owned leftovers; hashes confirm all 404 existing protected source/configuration files unchanged (259 backend, 145 frontend). The new file is additive; earlier approved local fixes/tests remain intact. No normal database access, migration, seed/reset, private setting change, backup deletion, commit or push occurred.

Repeat commands and manual synthetic Swagger reproduction are in [TESTING.md](../TESTING.md#automated-student-export-group-options-checks). Ignored local evidence: .tmp/students-group-options-step10-evidence.json, .tmp/students-group-options-step10-baseline.json and .tmp/students-group-options-step10-check.cjs. All four approved documents retain past evidence and the FR01-FR44 register. Markdown/Word text, local links, JSON examples, DOCX package/XML/references are checked; **Word visual rendering was NOT CHECKED**. No new UI PASS or production-readiness result is claimed. After resolving the defect, the next coverage batch remains GET /api/lecturer/course-offerings.

### 13.16 Completed local Step 11: group-options ID-range validation

Historical passing checkpoint: Step 12 subsequently adds lecturer-owned-assignment tests and finds two failures in its separate filter DTO. The group-options fix remains verified; the latest whole-tree outcome is recorded in Section 13.17.

Date: 15 October 2026, Asia/Phnom_Penh. After reviewing the three Step 10 overflow failures, the owner explicitly approved the proposed application fix. Changed only [StudentGroupOptionsQueryDto](../src/students/dto/student-group-options-query.dto.ts) in application source and extended [the existing group-options API suite](../test/students-group-options.e2e-spec.ts). The prior failures remain recorded in Section 13.15 and its original ignored evidence file. No database migration or frontend code change is needed.

**Behavior and implementation**

GET /api/students/group-options keeps academic_year_id, generation_id and major_id as required positive decimal strings. Each field must fit 1..9223372036854775807, PostgreSQL's signed BigInt range for positive IDs. The existing syntax check enforces positivity and rejects zero/leading-zero/exponent/fraction/whitespace forms. An additional class-validator constraint checks string length and then compares equal-length strings lexically against the maximum, avoiding JavaScript Number rounding and avoiding conversion of arbitrarily long input. NestJS validation rejects overflow before the controller converts the accepted value to BigInt or calls Prisma.

Oversized IDs now return 400 with a validation-message array containing '<field> must not exceed 9223372036854775807'. Valid large strings remain exact. The lookup keeps its existing response shape, ADMIN permission, normalized stored groups and 200/empty response for a well-formed missing scope. This is not a current-eligibility filter and does not remove inactive/paused students' stored labels. Other endpoint DTOs were not changed; this repair is not a repository-wide storage-range audit.

Swagger metadata now states required string IDs, positive-decimal pattern, minimum length one, maximum length 19 and the exact maximum in each parameter description. The textual bound is intentional: maxLength=19 alone does not enforce every numeric upper bound on 19-digit strings. Frontend callers should keep IDs as strings and use their existing 400 validation-message handling.

**Acceptance and verification**

| Check | Actual result |
| --- | --- |
| Original three failures | PASS: each field set to 9223372036854775808 now returns 400, with the exact field-specific maximum message. Original expected statuses are retained, with stronger message assertions. |
| Three excessive-input regressions | PASS: a 1,000-digit value in each field returns 400 and preserves all owned rows. No database encoding error. |
| Valid boundary behavior | PASS: 9007199254740993 and 9223372036854775807 retain exact string values and safely return empty scopes. Existing normal filtering, labels, role checks, malformed/repeated parameters and read preservation continue to pass. |
| OpenAPI metadata | PASS: one generated-schema assertion checks all three required query parameters, types, syntax/length metadata and maximum descriptions. |
| Focused total | PASS: 55 cases, 54 HTTP/one OpenAPI, in 6.378 seconds. This is the original 51 plus four new cases; no skips or accepted-500 weakening. |
| Full final regression | PASS: 43 unit suites/552 tests and 23 API suites/726 tests. Focused cases are already included in the full API/schema total. Type checking zero diagnostics; production build PASS; lint zero errors/five existing warnings; formatting/diff checks PASS. |
| Protected source and configuration | PASS: among the 404 pre-existing protected files, only the approved query DTO changed; all other 403, including frontend/private configurations and prior fixes/tests, remain unchanged. The group-options test file was extended separately. |
| Synthetic cleanup | PASS: zero owned group-options users/students/years/generations/majors/departments remain after verification. Exact fixture snapshots are checked after every HTTP/schema case. |
| Browser and Word visual rendering | NOT TESTED. API/schema success does not establish new UI acceptance or page-layout rendering. |

Repeat the commands in [TESTING.md](../TESTING.md#group-options-id-range-fix-and-verification), including the focused suite, whole-repository no-emit check, full unit/API runs, build, lint and diff checks. The isolated runner validates teacher_evaluation_test, and the suite confirms current_database() before fixture writes. It creates and cleans only owned synthetic accounts/placements/dependencies; no seeded account passwords or normal records are changed. Database sequences may advance when synthetic fixtures are inserted/deleted; no normal sequence claim is inferred from these tests.

The earlier Step 10 result remains 719 passed/three failed, 722 total; the current Step 11 result is a newly executed 726 PASS after four added cases and the approved fix. Delivery's 514/471, Step 9's 552/671 and all dated earlier checkpoints remain separate. The four approved documents and Word report are synchronized; local links, 23 JSON examples, FR01-FR44, DOCX package/XML/references are checked. **Word visual rendering was NOT CHECKED.** Original imp.txt/imp1.txt remain unavailable; the preserved register and approved decisions remain the requirements reference.

Ignored local evidence is .tmp/group-options-id-fix-step11-evidence.json. Preservation/cleanup is checked with .tmp/students-group-options-step10-check.cjs --allow-group-id-fix against the retained pre-change baseline. No normal database access, migration, reseed/reset, frontend/private configuration change, backup deletion, commit or push occurred. All changes remain local and uncommitted. Next: define and execute lecturer-own-assignment HTTP cases; complete real UI, reviewed cutover, recovery, performance and school production acceptance remain pending.

### 13.17 Local Step 12: lecturer own-assignment HTTP verification

Historical discovery checkpoint: the failure and pending-approval wording below records the pre-fix state. The owner subsequently approved this separate DTO repair; Section 13.18 records its implementation and fresh passing results.

Date: 15 October 2026, Asia/Phnom_Penh. The owner approved the next coverage batch after the group-options fix. Added [test/lecturer-course-offerings.e2e-spec.ts](../test/lecturer-course-offerings.e2e-spec.ts). Real NestJS requests exercise the [lecturer controller](../src/course-offerings/lecturer-course-offerings.controller.ts), optional query DTO, service, JWT/role guards and PostgreSQL, using only owned synthetic test records. The [frontend lecturer loader](../../teacher-evaluations-frontend/src/services/appDataSource.js) calls this endpoint without filters and validates items, total and complete=true; it also needs assignments without evaluations. Source compatibility and normal HTTP behavior pass, but two input-boundary cases fail. No new browser acceptance is claimed.

**Acceptance results**

| Scenario | Cases | Actual result |
| --- | --- | --- |
| Owned/other/empty lists and group/history metadata | 4 | PASS: only the authenticated lecturer's four assignments, including one without evaluations and one with null class/year/section; second lecturer sees only its own even on the same course/semester; empty lecturer receives items=[], total=0, complete=true. Stable offering order and newest-first nested evaluations; DRAFT/OPEN/CLOSED lifecycle metadata, explicit group scopes and captured historical labels distinct from current names. |
| Academic-year/semester/year-level/class-type filters | 11 | PASS: known owner-scoped subsets; COURSE/TD/TP and years 1/2/5 exercised. |
| Search | 7 | PASS: case-insensitive code/name/section, trimmed/blank/no-match values retain ownership and correct complete counts. |
| Combined/contradictory filters | 2 | PASS: exact filter intersection; valid incompatible year/semester returns empty complete list. |
| Injected owner/role/pagination | 1 | PASS: lecturer_id/user_id/role cannot override CurrentUser; page/limit do not truncate the non-paginated complete response. |
| Nonexistent in-range filter IDs | 2 | PASS: each filter accepts signed BigInt maximum as a string and returns complete empty result. |
| JWT/role matrix | 4 | PASS: missing/invalid JWT 401; ADMIN/STUDENT 403 without items. Lecturer positive cases succeed. |
| Invalid ID forms | 16 | PASS: eight malformed forms for each optional ID field return 400. |
| Invalid year level/class type | 8 | PASS: five year-level cases and three invalid class-type values return 400. |
| Search length | 1 | PASS: 151-character search rejected. |
| Repeated query IDs | 2 | PASS: duplicate academic-year or semester keys rejected with 400. |
| Out-of-storage-range query IDs | 2 | FAIL: academic_year_id or semester_id set to 9223372036854775808 returns 500, expected 400. Original expected-status assertions retained; no skips or accepted server error. |
| Focused total | 60 | 58 PASS/two FAIL in 7.726 seconds; one failing suite. |

The response checks recursively exclude passwords/hash/auth_version, user email/full_name, student/participant IDs, draft/response/answer data and individual rating/text values. Fixtures contain real owned participant, enrollment and anonymous rating-answer rows; those rows remain preserved and absent from this metadata response. This route lists teaching assignments and evaluation lifecycle context, not result content. Seeing own DRAFT/OPEN metadata does not weaken CLOSED-only lecturer result release, whose existing tests remain separate. Null curriculum bindings are exercised; non-null curriculum revisions, all historical-label variants, account-state transitions and a school-sized complete-list load are outside this new suite's scope.

**Confirmed defect and approval boundary**

LecturerCourseOfferingsQueryDto's two optional IDs validate positive-decimal syntax but not signed 64-bit storage range. JavaScript BigInt accepts the excessive value; Prisma cannot encode it. Each field independently produces 500 at course_offerings.findMany. A valid maximum returns an empty result, while malformed syntax already returns 400. Exact owned fixture snapshots remain unchanged for both failing requests. The ordinary frontend unfiltered request passes; this defect is in malformed-filter handling.

The prior Step 11 repair was scoped to StudentGroupOptionsQueryDto, a different endpoint. Proposed next fix: add the same string-safe upper-bound validation to academic_year_id and semester_id here, preserve optional semantics/positive syntax/response shape and update Swagger metadata with boundary regressions. No migration or frontend change is needed. Under the owner's instruction, this newly reproduced application fix was reported for approval before implementation. At this checkpoint it remains pending; application code is unchanged.

**Fresh regression and preservation**

All 43 unit suites/552 tests PASS in 57.575 seconds. Full API result is 784 PASS/two FAIL, 786 total, across 24 suites (23 PASS/one FAIL); exactly the two new overflow cases fail. The focused 60 cases are included in full totals. Whole-repository type check has zero errors; production build PASS; lint zero errors/five existing warnings; formatting and whitespace checks PASS. Step 11's 552/726 remains the last fully passing checkpoint. After an approved fix, rerun the new suite, existing group-options boundaries and full regression before recording a new PASS.

The test runner validates local teacher_evaluation_test and the suite checks current_database() before fixture writes. Five uniquely owned accounts, two years/three semesters/two courses, major/generation, four owned assignments plus another lecturer's assignment, groups, questionnaire versions, four evaluations and one synthetic anonymous submission are created. Per-case snapshots cover owned users, offering scopes/enrollments, evaluations/targets/participants/anonymous responses/answers, versions/questions and academic course/semester/year rows. Cleanup removes owned children before their dependencies; independent checks find zero owned leftovers. Hash comparison confirms all 405 pre-existing protected files unchanged (260 backend, 145 frontend), including earlier fixes/tests/private configurations. No normal database access, application/frontend edit, migration, seed/reset, private setting edit, backup deletion, commit or push occurred.

Repeat commands and isolated Swagger reproduction are in [TESTING.md](../TESTING.md#automated-lecturer-own-assignment-http-checks). Ignored local evidence: .tmp/lecturer-offerings-step12-evidence.json, .tmp/lecturer-offerings-step12-baseline.json and .tmp/lecturer-offerings-step12-check.cjs. The four approved documents retain FR01-FR44 and dated delivery/local results; Markdown/Word content, local links, 23 JSON examples and DOCX package/XML/references are checked. **Word visual rendering was NOT CHECKED.** Original imp.txt/imp1.txt remain unavailable. Complete UI acceptance, reviewed cutover, operational recovery, performance and production readiness remain separate unfinished work.

### 13.18 Completed local Step 13: lecturer filter-ID range validation

Historical passing checkpoint: Step 14 subsequently adds department HTTP cases and finds 10 failures in department input handling. The lecturer repair remains verified; Section 13.19 records the latest whole-tree outcome.

Date: 15 October 2026, Asia/Phnom_Penh. The owner approved fixing the two lecturer-filter failures from Step 12. Changed only [LecturerCourseOfferingsQueryDto](../src/course-offerings/dto/lecturer-course-offerings-query.dto.ts) in application source and extended [the existing lecturer API suite](../test/lecturer-course-offerings.e2e-spec.ts). The Step 11 group-options implementation remains unchanged. No migration or frontend change is required.

The optional academic_year_id and semester_id filters keep positive-decimal syntax and now enforce the upper bound 9223372036854775807. A class-validator constraint compares string length and same-length lexical values, avoiding Number rounding and parsing of excessive input. Validation rejects overflow before service BigInt conversion/Prisma. Empty, malformed and repeated ID parameters remain rejected; omitted filters remain valid. The lecturer identity still comes from CurrentUser, never query parameters. Complete owned lists, assignments without evaluations, legacy null metadata, filtering, captured historical labels and excluded student/answer data remain verified by the original cases.

Swagger now describes optional string IDs, positive-decimal syntax, lengths 1..19 and the exact maximum. Its generated schema is tested, including pattern behavior on a valid decimal and a leading-zero value. maxLength=19 alone is not a full numeric bound; the documented maximum is additionally enforced by the runtime validator. The existing frontend unfiltered request and validation-error handling need no payload change.

| Acceptance/check | Actual result |
| --- | --- |
| Two original overflow regressions | PASS: 9223372036854775808 in either filter returns 400 with '<field> must not exceed 9223372036854775807'. Expected statuses retained; exact message assertions added. |
| Excessive input | PASS: two new cases reject a 1,000-digit value with 400, preserving all owned fixture rows. |
| String precision boundaries | PASS: two new 9007199254740993 requests safely return complete empty results; both existing signed-maximum cases remain passing. No Number conversion introduced. |
| OpenAPI | PASS: one new generated-schema case checks both optional query string parameters, syntax, length, maximum descriptions and example pattern behavior. |
| Focused suites | PASS: 65 lecturer cases (64 HTTP/one OpenAPI) plus 55 unchanged group-options cases, 120 total/two suites in 13.270 seconds. Original 60 lecturer cases retained, five added; no skips or accepted-500 weakening. |
| Full final regression | PASS: 43 unit suites/552 tests and 24 API suites/791 tests. Focused cases are included in these totals. Whole-repository type checking zero errors; production build PASS; lint zero errors/five existing warnings; formatting/diff checks PASS. |
| Preservation and cleanup | PASS: exactly the approved lecturer DTO and existing lecturer test changed among 406 protected files; other 404 unchanged, including group-options source/tests, frontend and private configuration. Zero owned lecturer/group-options fixture leftovers. |
| New browser acceptance / Word visual rendering | NOT TESTED. These backend checks do not establish UI acceptance, visual page layout or production readiness. |

The runner validates local teacher_evaluation_test and the suites verify current_database() before fixture writes. They use only owned synthetic accounts/dependencies and remove their fixtures; no normal records or seeded passwords change. Per-case snapshots retain account, academic, offering/group/enrollment, evaluation/target/participant and anonymous response/answer state. Normal database sequences are not accessed; synthetic test sequences may advance during ordinary fixture insert/delete work.

Repeat the focused and final commands in [TESTING.md](../TESTING.md#lecturer-filter-id-range-fix-and-verification). Step 12 remains a historical 784-pass/two-fail checkpoint with 786 total; Step 13 newly executes 791 passing API/schema cases after five additions and the repair. Unit totals remain 552 because no new unit suite was needed for these HTTP/schema regressions. The original ignored .tmp/lecturer-offerings-step12-evidence.json is preserved; current evidence/check/baseline use the .tmp/lecturer-filter-id-fix-step13 prefix. The fresh 406-file baseline permits only the two authorized changes.

All three source-audit priorities from Step 8 now have defined real HTTP coverage: self-service password, export group options and lecturer own assignments. That scope is not every possible route, requirement, permission edge, curriculum/history variant or load condition. Next backend work should inspect and expand the known partial academic-setup CRUD/role matrix, beginning with departments; nonzero student list/detail progress, enrollment/participant-only delete blockers and further admin-result combinations also remain pending. Actual frontend consumption of answerability fields, full real-UI workflows, reviewed cutover, recovery, performance and school deployment acceptance retain separate status.

The four approved documents are updated together; docs contains exactly the Markdown and Word reports. Links, 23 JSON examples, FR01-FR44, package/XML/references and exact Markdown/Word content synchronization are checked. **Word visual rendering was NOT CHECKED.** Original imp.txt/imp1.txt remain unavailable; the preserved register and approved decisions remain the requirements reference. No normal database access, frontend/private-setting edit, migration, seed/reset, backup deletion, commit or push occurred; all changes remain local and uncommitted.

### 13.19 Local Step 14: department CRUD and permission verification

Historical discovery checkpoint: failure and pending-approval wording below records the pre-fix state. The owner approved all three scoped repairs afterward; Section 13.20 records their implementation and fresh passing results.

Date: 15 October 2026, Asia/Phnom_Penh. The owner approved proceeding to the known partial academic-setup coverage. Reviewed the [frontend academic setup adapter](../../teacher-evaluations-frontend/src/services/academicSetup.js), [department controller](../src/departments/departments.controller.ts), service/DTOs, shared ID pipe, Prisma relationships and existing assertions before adding [test/departments.e2e-spec.ts](../test/departments.e2e-spec.ts). Existing department unit coverage only checks provider construction; primary-department consistency cases test user memberships, not these CRUD routes. No application or frontend change was made in this verification step.

**Actual route contract and passing evidence**

GET /api/departments and GET /api/departments/:id require a valid active-account JWT and allow ADMIN, LECTURER and STUDENT. POST, PUT and DELETE additionally require ADMIN. The frontend sends trimmed code/name and ACTIVE/INACTIVE status. Responses contain string id, code, name, status and timestamps; list/detail/create/update also expose course and user-membership counts, without user records. Major counts are not included. Delete returns the deleted metadata without _count. Empty-body updates remain compatible and may update updated_at; omitted data fields stay intact. Text trimming preserves internal spaces.

| Scenario | Cases | Actual result |
| --- | --- | --- |
| Authenticated list/detail and counts | 4 | PASS: all three roles read safe metadata; course and staff-membership counts match actual fixtures, major-only count remains zero in the published count shape. |
| JWT/write-role matrix | 16 | PASS: missing/invalid JWT on five routes returns 401; STUDENT/LECTURER writes return 403; rejected requests preserve owned rows. |
| Valid create, defaults, trim, limits and injected fields | 6 | PASS: default/explicit ACTIVE/INACTIVE, trim with internal spaces, 30-character code/150-character Khmer name, injected ID/private fields stripped. |
| Duplicate create/update | 4 | PASS: trimmed code/name conflict returns 409; an otherwise valid status change is not partially committed. |
| Valid updates | 6 | PASS: code/name/status partial updates, unchanged values, empty-body compatibility and status changes retaining related rows. |
| Delete behavior | 4 | PASS: unused deletion then 404; separate course-only, staff-membership-only and major-only references each reject with 409 and preserve exact rows. Major-only protection uses the existing foreign key/P2003 catch even though _count does not include majors. |
| Invalid create | 12 | PASS: missing, empty, null, numeric and overlong text plus invalid statuses return 400. |
| Ordinary invalid update | 8 | PASS: empty/numeric/overlong text and invalid non-null statuses return 400. |
| Missing/malformed path IDs | 6 | PASS: valid absent signed-maximum ID returns 404 on GET/PUT/DELETE; malformed text returns 400. |
| Null update values | 3 | FAIL: code/name null trigger trim TypeError; status null triggers Prisma validation. Each returns 500, expected 400. |
| Whitespace-only text | 4 | FAIL: POST returns 201 and PUT 200 for code/name containing only whitespace; service trimming stores empty strings. Expected 400/no write. Owned synthetic rows are cleaned. |
| Overflowing path IDs | 3 | FAIL: GET/PUT/DELETE with 9223372036854775808 reach Prisma and return 500 instead of expected 400. |
| Total focused suite | 76 | 66 PASS/10 FAIL. All expected 400 assertions retained, no skips or acceptance of invalid writes/server errors. |

Normal frontend request shapes and valid HTTP operations pass. The adapter already prevents blank trimmed text, invalid status and unsafe numeric IDs; these findings are backend direct-input validation gaps. No real UI scenario was executed. The suite checks bounded normal inputs, not every Unicode/collation rule, concurrent duplicate/delete race or signed/alternative ID syntax. Service source orders lists by name; exhaustive database-collation ordering acceptance was not newly tested. No global case-insensitive department uniqueness requirement was invented: the existing exact stored-code/name uniqueness and trim conflicts are exercised.

**Confirmed defects and proposed scoped repair**

First, CreateDepartmentDto uses IsNotEmpty before service-side trim, so whitespace passes HTTP validation and becomes an empty stored code/name. PUT inherits the same issue. Four cases prove synthetic writes occurred; this is not a no-mutation failure. Track the response ID before asserting status and clean these owned rows after each test. Proposed fix: validate nonblank normalized code/name at the request boundary while retaining valid trimmed values and length rules.

Second, UpdateDepartmentDto uses PartialType optional semantics that skip explicit null values. The service checks undefined, then calls trim on null code/name; null status reaches a non-null database enum. Proposed fix: distinguish omitted fields from explicit null, reject invalid null with 400 and preserve partial/empty update compatibility.

Third, the shared ParseBigIntPipe accepts any JavaScript BigInt without checking storage range. The department GET/PUT/DELETE each use it and fail for the excessive value. Proposed fix: validate storage range on the department routes and return 400 before Prisma, preserving existing legitimate IDs and keeping this repair scoped to departments. A global shared-pipe change would affect other routes and is not included in this proposed authorization.

All three fixes were reported together for the owner's required approval; none is implemented at this checkpoint. No migration or frontend change is needed. After approval, preserve the 76 assertions, add meaningful boundary/error/Swagger coverage and rerun focused/full verification before recording PASS.

**Fresh verification and preservation**

Full unit verification passes 43 suites/552 tests. Full API verification has 857 PASS/10 FAIL, 867 total across 25 suites (24 PASS/one FAIL); exactly the new department regressions fail. Whole-repository type checking zero errors, production build PASS, lint zero errors/five existing warnings, formatting/whitespace checks PASS. An initial test-helper cast accidentally retained response metadata in semantic comparisons; the helper now returns only the explicitly checked identity fields. Three new-test typing diagnostics were corrected with a typed input and literal keys. These were test construction issues, not additional application defects. Final discovery counts are 66/10 rather than the initial helper-affected 64/12. Focused cases are already included in full API totals; historical Step 13's 552/791 remains the last fully passing checkpoint.

The runner validates local teacher_evaluation_test and the suite checks current_database() before writes. Three owned role accounts and four baseline departments provide separate unused/course/member/major scopes; each case creates additional owned rows as needed. Successful API creations are tracked before assertions; cleanup uses owned IDs/markers and deletes owned child rows before departments/accounts. Independent checks find zero owned users/departments/courses/majors; foreign keys prevent orphaned memberships. Hash checks confirm all 406 existing protected backend/frontend files unchanged (261 backend, 145 frontend), including prior repairs/tests/private configurations. No application/frontend edit, normal database access, migration, seed/reset, backup deletion, commit or push occurred.

Repeat commands and isolated synthetic Swagger examples are in [TESTING.md](../TESTING.md#automated-department-crud-and-permission-checks). Ignored aids: .tmp/departments-step14-evidence.json, .tmp/departments-step14-baseline.json and .tmp/departments-step14-check.cjs. Four approved documents retain dated results, FR01-FR44, 23 JSON examples and exact Markdown/Word content. Links, DOCX package/XML/references are checked. **Word visual rendering was NOT CHECKED.** Original imp.txt/imp1.txt remain unavailable. Complete frontend acceptance, reviewed cutover, recovery, performance and school production readiness remain separate unfinished work.

### 13.20 Completed local Step 15: department validation repair

Historical passing checkpoint: Step 16 subsequently adds major CRUD/permission tests and exposes 10 failures in separate major validation. Department regressions remain resolved; Section 13.21 records the latest whole-tree result.

Date: 15 October 2026, Asia/Phnom_Penh. The owner approved all three department fixes from Step 14. Changed CreateDepartmentDto, UpdateDepartmentDto and department controller wiring/Swagger; added [ParseDepartmentIdPipe](../src/departments/pipes/parse-department-id.pipe.ts) and extended [the department API suite](../test/departments.e2e-spec.ts). Department business service, the shared ParseBigIntPipe, other route wiring, schema/migrations, frontend and private configuration remain unchanged. No database migration is needed.

**Implemented behavior and compatibility**

CreateDepartmentDto trims string code/name before validation, preserves non-string values for rejection, and validates nonblank normalized text within 30/150 characters. Internal spaces remain intact. UpdateDepartmentDto inherits these transforms while skipping only omitted text fields, not explicit null. Status is declared separately so creation's optional-null default does not skip update validation. Omitted update status retains its value, explicit null status returns 400, and an empty update remains compatible. Creation's existing omitted/null status -> ACTIVE behavior is deliberately preserved and documented, not extended to updates.

Department GET/PUT/DELETE now use a local pipe that first delegates to the existing BigInt parser, then checks -9223372036854775808..9223372036854775807. It never converts through Number and rejects overflow before Prisma. A well-formed absent in-range integer still returns 404, including the signed lower bound; this repair adds storage bounds without globally redefining ID syntax or positivity. The existing shared pipe and every non-department route stay unchanged. The pipe parses the input before its range check; it does not claim to reject long inputs without any BigInt parsing.

Swagger describes trimmed nonblank text/lengths, creation versus update status nullability, optional update fields, string department IDs/storage bounds and 400 responses on affected operations. Frontend code already supplies trimmed text and a valid enum, so normal payloads need no change. Existing exact uniqueness, valid metadata/counts, authenticated read/ADMIN write rules and deletion safeguards remain covered.

| Acceptance/check | Actual result |
| --- | --- |
| Original four blank-text failures | PASS: code/name whitespace on create/update returns 400; exact owned state is preserved instead of storing empty strings. |
| Original three null-update failures | PASS: null code/name/status returns 400 without writes. Omitted fields and empty-body compatibility retained. |
| Original three path-overflow failures | PASS: excessive ID 9223372036854775808 returns 400 on GET/PUT/DELETE before database access for that lookup. |
| Status/normalization compatibility | PASS: one new null-create-status alias case and two padded maximum-length create/update cases; defaults, internal spaces and existing valid requests remain passing. |
| Mixed invalid updates | PASS: five new cases combine null/blank fields with otherwise valid code/name/status changes; validation rejects the entire request with no partial writes. |
| Additional signed bounds | PASS: nine new cases test below-minimum and 1,000-digit excess (400), plus absent signed minimum (404), across all three department path routes. Existing maximum/malformed cases retained. |
| OpenAPI | PASS: one new generated-schema case validates field requirements/lengths/nullability, optional updates, path string/bound descriptions and documented 400 responses. |
| Focused total | PASS: 94 cases (93 HTTP/one OpenAPI), one suite, 7.009 seconds; original 76 retained plus 18 additions, no skips or accepted-error weakening. |
| Full final regression | PASS: 43 unit suites/552 tests and 25 API suites/885 tests. Focused cases are included, not added again. Whole-repository type checking zero diagnostics; production build PASS; lint zero errors/five existing warnings; formatting/diff checks PASS. |
| Source/fixture preservation | PASS: four approved existing files changed among 407 protected files; other 403 remain unchanged, including shared pipe/service, prior fixes/tests, frontend/private configurations. One new local department pipe is additive. Independent checks find zero owned department users/departments/courses/majors. |
| New browser acceptance / Word visual rendering | NOT TESTED. These backend/schema checks do not establish UI, page-layout or production acceptance. |

The API runner validates local teacher_evaluation_test and the suite asserts current_database() before writes. It uses owned role accounts/departments/dependencies and snapshots invalid-request state; cleanup tracks successful synthetic IDs before assertions and removes only owned children/parents. The original four invalid-write regressions now reject with no synthetic mutation. Normal teacher_evaluation is never selected; test sequences may advance normally during fixture creation/deletion. No seeded passwords, school records or normal sequences are changed.

Repeat focused/full commands and isolated Swagger checks in [TESTING.md](../TESTING.md#department-validation-fixes-and-verification). Step 14 remains a historical 857-pass/10-fail API checkpoint with 867 total; Step 15 newly executes 885 passing cases after 18 additions and the approved repair. Unit total remains 552; meaningful HTTP/schema regressions cover these changes without a redundant unit suite. Original .tmp/departments-step14-evidence.json is preserved; current ignored evidence/baseline/check files use .tmp/department-validation-step15. The new baseline includes the existing department test and permits only the four authorized existing changes, alongside the additive pipe.

Next backend batch: inspect existing major CRUD/role assertions before adding missing cases; preserve already tested rename/history and database-integrity scenarios. Other academic/result edges, nonzero student list/detail progress, enrollment/participant-only deletion cases, frontend answerability consumption, complete UI workflows, reviewed cutover, recovery and school-sized performance/production acceptance remain separate pending work. This repair is scoped to department input and paths, not a global API-hardening claim.

The four approved documents are synchronized; docs contains exactly the Markdown and Word reports. Local links, 23 JSON examples, FR01-FR44, DOCX package/XML/references and exact content alignment are checked. **Word visual rendering was NOT CHECKED.** Original imp.txt/imp1.txt remain unavailable; the preserved requirement register/approved decisions remain the reference. No normal database access, migration, seed/reset, frontend/private edit, backup deletion, commit or push occurred. All changes remain local and uncommitted.

### 13.21 Local Step 16: major CRUD and permission verification

Historical discovery checkpoint: failure and pending-approval wording below records the pre-fix state. The owner subsequently approved the scoped repair; Section 13.22 records its implementation and fresh passing results.

Date: 15 October 2026, Asia/Phnom_Penh. The owner approved the next major coverage batch. Reviewed the [frontend academic adapter](../../teacher-evaluations-frontend/src/services/academicSetup.js), [major controller](../src/majors/majors.controller.ts), service/DTOs, shared ID parser, Prisma constraints and existing assertions before adding [test/majors.e2e-spec.ts](../test/majors.e2e-spec.ts). Existing [consistency cases](../test/consistency.e2e-spec.ts) already rename majors through PUT while checking historical labels; the unit spec only constructs the provider. These facts are retained rather than reporting all major behavior as previously untested. Application/frontend source is unchanged in this step.

**Actual contract and acceptance**

Authenticated ADMIN/LECTURER/STUDENT can read major list/detail; only ADMIN can create/update/delete. Frontend code/name are trimmed and department_id is a string. Backend code is uppercase on writes and unique globally. Names are trimmed and unique within a department; the same name under another department is allowed. The service requires an existing parent but does not reject its INACTIVE status. This existing policy is observed, not changed without a requirement decision. Responses expose safe major/department metadata and placement/rule counts; major itself has no status field. Unknown injected status/private/ID fields are stripped. Delete returns metadata without nested/count fields.

| Scenario | Cases | Actual result |
| --- | --- | --- |
| Authenticated reads and actual counts | 4 | PASS: three-role list/detail contract and real placement/rule counts; no private user records. Scope/target references are not in the published count shape. |
| JWT/write-role matrix | 16 | PASS: missing/invalid JWT on five routes -> 401; STUDENT/LECTURER writes -> 403, without owned-state mutation. |
| Normal creates | 4 | PASS: string parent ID, uppercase code, trimmed name, stored length limits/Khmer name, stripped injected fields and existing inactive parent behavior. |
| Uniqueness/conflicting updates | 5 | PASS: global normalized code conflict, per-department name conflict, cross-department same-name success, duplicate-code and conflicting reparent rollback. |
| Valid updates | 4 | PASS: isolated code/name/parent updates, unchanged fields and empty-body compatibility. |
| Missing parent | 2 | PASS: absent in-range parent yields 404 for create/update without writes. |
| Delete behavior | 5 | PASS: unused deletion then 404; placement-only, curriculum-rule-only, offering-scope-only and evaluation-target-only references each return 409 and preserve rows. |
| Create validation | 19 | PASS: required fields and empty/null/non-string/overlong text, code syntax and malformed parent IDs return 400. |
| Ordinary update validation | 13 | PASS: invalid non-null inputs return 400. |
| Absent/malformed major IDs | 6 | PASS: signed maximum as absent returns 404, malformed text returns 400 on GET/PUT/DELETE. |
| Null updates | 3 | FAIL: code/name null cause trim errors; null department_id causes BigInt conversion error. Each returns 500, expected 400. |
| Whitespace names | 2 | FAIL: create 201/update 200 store empty names. Expected 400/no write. These owned synthetic writes are cleaned. Code whitespace already rejects through its allowed-character regex. |
| Parent/path storage overflow | 5 | FAIL: department_id excessive on create/update, and major ID excessive on GET/PUT/DELETE, return 500 instead of 400. |
| Focused total | 88 | 78 PASS/10 FAIL, 7.665 seconds. Expected rejection assertions retained; no skips or acceptance of server errors/blank writes. |

Major deletion first checks placement and curriculum-rule counts. Offering scopes and evaluation targets are protected by their actual foreign keys and the service's P2003 -> 409 catch even when the two published counts are zero. Four separate fixtures exercise these paths without substituting a more obvious blocker. Existing historical-label and curriculum-integrity suites remain separate regression evidence; no exhaustive concurrent delete/reparent/collation/label-variant acceptance is inferred.

**Defects and proposed scoped fix**

CreateMajorDto validates nonempty name before service trim, so spaces pass and become an empty stored name; the inherited update DTO has the same gap. PartialType null skipping allows null code/name/department_id into service conversion, returning 500. The foreign department ID regex and shared path BigInt parser do not bound storage range; 9223372036854775808 reaches Prisma and returns 500 in five route combinations. Existing positive normal frontend requests pass; its adapter already rejects blank text and unsafe selected IDs. These are malformed direct-API validation defects, not newly reproduced UI failures.

Proposed repair, awaiting the owner's required approval: validate normalized nonblank names, reject explicit null updates while retaining omission/empty-body behavior, and bound parent/path IDs before Prisma. Keep major code normalization, uniqueness, existing parent policy and dependency protections intact. Scope the repair to major DTO/routes; no migration or frontend change is needed. No application fix has been made at this checkpoint.

**Fresh regression and preservation**

All 43 unit suites/552 tests PASS. Full API result is 963 PASS/10 FAIL, 973 total across 26 suites (25 PASS/one FAIL); exactly the new major validation regressions fail. Whole-repository type checking zero diagnostics; production build PASS; lint zero errors/five existing warnings; formatting/diff checks PASS. The focused 88 cases are included in full totals. Step 15's 552/885 remains the last fully passing checkpoint. After an approved repair, rerun focused/full verification before recording a new PASS.

The runner validates local teacher_evaluation_test and the suite asserts current_database() before fixture writes. Three owned accounts, three departments, five majors and distinct student placement, rule, offering scope and evaluation target fixtures support real HTTP checks. No school records or seeded passwords are touched. Passing rejection cases snapshot owned majors/parents/references/account state; the two failing whitespace cases do write invalid synthetic names, so there is no blanket no-mutation claim. Successful response IDs are tracked before assertions; after-case cleanup removes temporary majors, and final cleanup removes owned children before parents. Independent checks find zero owned users/majors/departments/students/years/generations/courses/semesters/surveys. Hashes confirm all 408 pre-existing protected files unchanged (263 backend, 145 frontend), including previous repairs/tests, shared parser and private settings.

Repeat commands and isolated Swagger reproduction are in [TESTING.md](../TESTING.md#automated-major-crud-and-permission-checks). Ignored evidence/baseline/check files use .tmp/majors-step16. Four approved documents retain dated evidence, FR01-FR44, 23 JSON examples and synchronized Markdown/Word text; local links and DOCX package/XML/references are checked. **Word visual rendering was NOT CHECKED.** Original imp.txt/imp1.txt remain unavailable. No normal database access, application/frontend/private edit, migration, seed/reset, backup deletion, commit or push occurred. New browser acceptance, operational recovery, performance and production readiness remain separate unfinished work.

### 13.22 Completed local Step 17: major validation repair

Date: 15 October 2026, Asia/Phnom_Penh. The owner approved all three major validation repairs. Changed major create/update DTOs and controller wiring/Swagger; added [ParseMajorIdPipe](../src/majors/pipes/parse-major-id.pipe.ts) and extended [the existing major suite](../test/majors.e2e-spec.ts). Major business service, shared ParseBigIntPipe, department fixes, other routes, Prisma schema/migrations, frontend and private configuration remain unchanged. No migration is required.

Name trimming runs before nonblank/length validation; non-string values remain available for rejection. UpdateMajorDto skips only undefined, so explicit null code/name/department_id now returns 400 while omitted fields and empty updates remain compatible. Code keeps its existing allowed-character regex and service uppercase/global-uniqueness behavior; raw padding is not newly accepted. Names remain unique within a department. Existing inactive-parent acceptance and placement/rule/scope/target deletion protection are preserved.

The parent department ID retains decimal-string syntax and adds a signed-storage maximum of 9223372036854775807. A string constraint ignores leading zeros only in its comparison and checks significant length/equal-length lexical value, avoiding Number rounding and parsing excessive input as BigInt. Leading-zero requests still resolve to the existing parent; zero still produces absent-department 404. Swagger states the numeric bound without falsely limiting raw leading-zero-compatible IDs to 19 characters. For major path IDs, the local pipe delegates to the unchanged BigInt parser and then bounds signed storage; it does parse before its range check. Valid absent in-range integers stay 404, including the signed minimum. All overflow requests reject before their Prisma lookup.

| Acceptance/check | Actual result |
| --- | --- |
| Original 10 failures | PASS: both blank-name cases, three null updates, two parent overflows and three path overflows return 400. Original expected-status and exact no-write assertions retained. |
| Name/mixed-update cases | PASS: two padded maximum-length names and four mixed-null/blank updates; invalid payloads commit none of their otherwise valid changes. |
| Parent ID boundary/compatibility | PASS: 10 new create/update cases cover valid leading zeros, absent zero/above-safe-integer values, 1,000-digit and leading-zero-prefixed overflow. Expected 201/200, 404 or 400 as appropriate; range errors identify department_id. |
| Major path edges | PASS: nine new cases across GET/PUT/DELETE cover below-minimum/long overflow (400) and absent signed minimum (404); existing signed maximum/malformed cases remain passing. |
| OpenAPI | PASS: one new generated-schema case checks non-null/required creation fields, optional updates, code/parent patterns, name lengths, signed path bounds and documented 400 responses. |
| Focused suites | PASS: major 114 cases (113 HTTP/one OpenAPI) and department 94 cases, 208 total/two suites in 15.290 seconds. Original 88 major cases retained, 26 added, no skips or expected-error weakening. |
| Full final regression | PASS: 43 unit suites/552 tests and 26 API suites/999 tests. Focused cases already included; type checking zero errors, build PASS, lint zero errors/five existing warnings, formatting/diff checks PASS. |
| Preservation/cleanup | PASS: four authorized existing files changed among 409 protected files; other 405 unchanged. One major-only pipe is additive. Department code/tests, shared parser, major service, prior fixes and frontend/private settings remain intact. No owned major/department fixtures remain. |
| New browser acceptance / Word visual rendering | NOT TESTED. Backend/schema checks do not establish UI acceptance, visual layout or production readiness. |

The runner validates local teacher_evaluation_test, and suites assert current_database() before fixture writes. All accounts/academic dependencies/reference rows are owned synthetic fixtures, cleaned children before parents. Exact state snapshots prove invalid requests do not change owned rows; the former blank-name failures now reject without synthetic writes. Normal records/credentials/sequences are never selected; ordinary test fixture creation/deletion can advance isolated test sequences. No database migration, seed/reset or normal recovery operation was performed.

Repeat focused/full commands and isolated Swagger examples in [TESTING.md](../TESTING.md#major-validation-fixes-and-verification). Step 16 remains a historical 963-pass/10-fail API checkpoint with 973 total; Step 17 newly executes 999 passing API/schema cases after 26 additions and the approved repair. Unit total stays 552 because the real HTTP/schema regressions provide the needed behavioral evidence. Original .tmp/majors-step16-evidence.json is preserved; current evidence/baseline/check use .tmp/major-validation-step17. A fresh 409-file baseline permits only the four authorized existing changes, alongside the additive pipe.

Next backend work proposed at Step 17, now evaluated in Step 18 below: audit existing academic-year CRUD/role assertions before filling gaps; existing activation/date/concurrency, curriculum and historical-label checks must not be reclassified as absent. Other academic/result edges, student list/detail nonzero progress and enrollment/participant-only deletion cases, frontend answerability adoption, complete UI workflows, reviewed cutover, official recovery and performance/production acceptance remain pending. This scoped repair does not establish a global ID-policy rewrite or exhaustive requirement coverage.

All four approved documents are synchronized; docs contains exactly the Markdown and Word reports. Local links, 23 JSON examples, FR01-FR44, DOCX package/XML/references and content alignment are checked. **Word visual rendering was NOT CHECKED.** Original imp.txt/imp1.txt remain unavailable; the preserved register and approved decisions remain the requirement reference. No frontend/private edit, normal database access, backup deletion, commit or push occurred. All changes remain local and uncommitted.

### 13.23 Local Step 18: academic-year CRUD and permission verification

Historical discovery checkpoint: failures and pending-approval wording below describe the pre-repair state. The owner subsequently approved all four fixes; Section 13.24 records the implementation and fresh passing results.

Date: 15 October 2026, Asia/Phnom_Penh. This is a test/documentation batch, not an application repair. Added [the academic-year HTTP suite](../test/academic-years.e2e-spec.ts) after reviewing frontend year requests, backend controller/service/DTOs, nullable calendar conversion, Prisma relationships, integrity migrations and existing assertions. No application, schema, migration, frontend or private configuration change is made in this batch.

The frontend [year adapter](../../teacher-evaluations-frontend/src/services/appDataSource.js) sends name, numeric start_year and boolean is_active to POST/PUT /api/academic-years and uses DELETE with the saved string ID. Its optional semester setup follows year creation through separate requests, with semesterSetupError available for a partial failure. This year payload passes real backend HTTP checks. The separate year-plus-semesters UI sequence is NOT TESTED in this batch; it must not be described as one atomic transaction. Direct API date inputs expose additional validation boundaries beyond the current year form. Descending display-name sorting is current list behavior, while numeric chronology remains a separate field used for academic policy.

Existing evidence was retained before adding cases. [Academic-integrity tests](../test/academic-integrity.e2e-spec.ts) already exercise actual date-order/duplicate/activation requests, concurrent activation and database safeguards. [Curriculum tests](../test/curriculum-revisions.e2e-spec.ts) protect effective chronology and allow a display rename; consistency tests protect historical labels. The old academic-year unit spec only constructs a provider. This step supplements behavioral coverage and does not reclassify existing tests as absent.

| Scenario | Newly executed result and meaning |
| --- | --- |
| Authenticated reads | PASS: ADMIN/LECTURER/STUDENT read lists/details; ID is a string, public metadata has eight fields and timestamps are valid. |
| Authentication and permissions | PASS: missing/invalid JWT is 401 on list/detail/create/update/delete; student/lecturer writes are 403 and leave owned state unchanged. |
| Frontend payload and compatible fields | PASS: frontend-shaped create, partial/empty updates, unknown-field stripping, maximum 20-character Khmer name, 1900/2200 start_year, nullable dates/chronology. Create is_active:null defaults false; do not confuse this intentional compatibility with the invalid nullable update. |
| Activation and rollback | PASS: owned active-year create/update switching, explicit deactivation, duplicate-name 409 rollback and rejected invalid-date activation preserve the required state. Existing concurrent-race coverage remains retained, not newly added here. |
| Dates and curriculum | PASS: valid offset timestamps normalize to UTC calendar days, partial updates check the stored other endpoint, dates can clear to null, protected effective chronology rejects with 409 and a display rename leaves revisions unchanged. |
| Deletion integrity | PASS: unused year returns empty 204, then 404. Four separately owned semester-only, generation-entry-only, placement-only and curriculum-revision-only dependencies each block deletion with 409. |
| Nonblank names | FAIL, two cases: whitespace-only creation returns 201 and update 200, expected 400. These calls write invalid synthetic names; cleanup tracks the owned IDs even when names change. |
| Required update values | FAIL, two cases: name:null and is_active:null return Prisma-driven 500, expected 400. Nullable start_year/start_date/end_date are valid API capabilities and must remain supported. |
| Impossible calendar dates | FAIL, four cases: 2026-02-30 is accepted for start/end on both POST (201) and PUT (200), expected 400. Parsing/normalization permits a date that does not exist. |
| Storage-range IDs | FAIL, three cases: GET/PUT/DELETE with 9223372036854775808 return 500, expected 400. Absent signed maximum 9223372036854775807 returns 404; malformed text returns 400 as expected. |
| Focused/full regression | FAIL: 76 PASS/11 FAIL out of 87 focused HTTP cases. Full API: 1,075 PASS/11 FAIL, 1,086 total across 27 suites (26 PASS/one FAIL). Fresh units: 552/43 suites PASS. Focused cases are already in the full API total. |
| Engineering checks | PASS: whole-repository type checking zero errors, build succeeds, lint zero errors/five existing warnings, test formatting and diff checks pass. |
| Preservation and cleanup | PASS: fresh 410-file baseline unchanged, including all prior fixes/tests, frontend and private settings. Owned year/account/academic fixture counts are zero after focused/full cleanup; all pre-existing test-year rows retain their values and timestamps. |
| New UI acceptance / Word visual rendering | NOT TESTED. No new Brave browser workflow or rendered Word inspection was performed. |

The suite requires an idle isolated teacher_evaluation_test with no pre-existing active years. Before any fixture write it asserts current_database(), snapshots existing years and refuses an active baseline. Each activation scenario additionally checks for an active year outside its owned set. It never disables another tester's active year. After every case and final cleanup, the pre-existing year rows must match their exact original values/timestamps. Only owned synthetic data is removed, with dependent rows removed before parents. Ordinary isolated fixture creation/deletion can advance test sequences; normal school records/sequences are not accessed.

Passing rejection cases compare exact owned-state snapshots. For the defective accepted writes, the failed expected-status assertion is evidence of a write problem, not proof of no mutation. The owned-ID ledger allows cleanup of renamed/blank synthetic rows. Independent follow-up checks find zero owned leftovers. Semester/group/target references were not all independently isolated by the new suite: valid group/target fixtures also require semester context. The four independent dependency checks support their stated relationships only.

One additional source-confirmed limitation remains: deletion-conflict text always says the year is used by semesters even when another reference causes the foreign-key error. The 409 status and protected data pass; broader message improvement is separate from the four proposed validation repairs.

Proposed next action, awaiting the owner's required application-fix approval: normalize/reject blank year names; reject explicit null name/is_active on update while retaining omitted fields, nullable chronology/dates and creation defaults; reject impossible calendar days; add scoped academic-year path range validation before Prisma. Preserve existing activation transactions, uniqueness, effective chronology and historical-label safeguards. No migration/frontend change is required by this proposal. Retain all original 87 assertions and add compatibility/boundary regressions, then rerun focused/full checks. Until then this checkpoint remains FAIL.

Use the repeat commands and safe preconditions in [TESTING.md](../TESTING.md#automated-academic-year-crud-and-permission-checks). Evidence is retained in ignored .tmp/academic-years-step18-evidence.json, with the corresponding 410-file baseline and cleanup/preservation helper. Step 17's fully passing 552/999 repair remains historical; Step 18 adds 87 cases and exposes 11 failures without application edits. Delivery's 514/471 and 18-migration/28-table/199-column normal/test evidence are recorded historical results, not a new normal database audit.

All four approved documents are updated together; docs still contains exactly the Markdown and Word reports. Local links, JSON examples, FR01-FR44 and Word package/XML/text alignment are checked. **Word visual rendering was NOT CHECKED.** Original imp.txt/imp1.txt remain unavailable; the preserved requirement register and approved policies remain the reference. No normal access, seed/reset, migration, frontend/private change, backup deletion, commit or push occurs. Frontend answerability adoption, complete UI workflow, reviewed cutover, official recovery, performance and production acceptance remain pending.

### 13.24 Completed local Step 19: academic-year validation repair

Date: 15 October 2026, Asia/Phnom_Penh. The owner approved all four repairs after the Step 18 evidence table. Changes are confined to academic-year create/update DTOs, controller/Swagger, a new [year-only path pipe](../src/academic-years/pipes/parse-academic-year-id.pipe.ts) and the extended [academic-year suite](../test/academic-years.e2e-spec.ts). AcademicYearsService, shared BigInt/calendar utilities, Prisma schema/migrations, prior fixes/tests, frontend and private configuration remain unchanged. No migration or normal database operation is needed.

Names are trimmed before nonblank/string/20-character validation, with non-string inputs retained for rejection. The exact database name uniqueness rule now receives the normalized name, so padded duplicates reject with 409. Existing stored labels are not rewritten. Updates skip only omitted name values and explicitly reject null name/is_active with 400. Creation preserves the existing omitted/null active alias of false; nullable start_year/start_date/end_date and empty updates remain supported. The DTO TypeScript and Swagger contracts now explicitly describe the allowed nulls and chronology bounds.

Both date DTO fields use strict ISO calendar validation, rejecting impossible days before calendar normalization. Valid leap years, offset timestamps, offsetless ISO datetime UTC interpretation, nullable clearing and date ordering against stored endpoints remain supported. The shared calendar utility and other resource DTOs are unchanged; this repair establishes the academic-year HTTP contract, not universal validation for direct internal service calls or other route families.

The academic-year-only path pipe delegates to the existing BigInt parser, then checks the signed PostgreSQL storage range -9223372036854775808..9223372036854775807 before any year Prisma lookup. Oversized values return 400; syntactically valid absent in-range IDs remain 404, including signed minimum and integers above JavaScript's safe-number range. Existing leading-zero IDs still resolve correctly. This pipe parses BigInt before range checking; it does not introduce a global parser/ID policy change. Swagger documents string path IDs, bounds, 400 responses and the previously omitted start_year response example field.

| Acceptance/check | Actual result |
| --- | --- |
| Original Step 18 cases | PASS: all 87 pass before additions; all 11 former failures now return expected 400. A hash-based reconstruction verifies original suite content unchanged except for the added Swagger import/new appended block. No original expected statuses/assertions are weakened. |
| Trim/uniqueness/Unicode blanks | PASS: six added create/update cases cover padded maximum-length names, normalized duplicates (409) and Unicode-only whitespace (400). |
| Atomic invalid mixed updates | PASS: five cases reject blank/null name, null active and impossible start/end dates without any owned-state/active-year change, despite valid companion fields. |
| Real dates and nullable fields | PASS: six valid create/update leap-day/offsetless cases, eight invalid non-leap/century/month-day/offset cases, plus one mixed rename/nullable chronology/date clearing case. Original offset/order/null/default assertions remain passing. |
| ID boundary compatibility | PASS: 12 added GET/PUT/DELETE cases cover signed underflow/1,000-digit overflow (400), signed minimum and above-safe-integer absent values (404). Three more preserve valid leading-zero existing IDs. Original max/malformed/overflow cases still pass. |
| Generated OpenAPI | PASS: one new schema case checks name requirements/length, optional updates, create/update nullability, chronology bounds, real-date descriptions, signed string path bounds, 400 responses and start_year in success examples. |
| Focused final | PASS: 203 cases/three suites in 18.723 seconds: 129 year cases (128 HTTP/one OpenAPI), plus 74 retained academic-integrity/curriculum cases. Original 87 retained, 42 added; no skips or expected-error weakening. |
| Full final | PASS: 43 unit suites/552 tests and 27 API suites/1,128 tests. Focused cases are included in totals. Whole-repository types: zero errors; build PASS, lint zero errors/five existing warnings, formatting/diff checks PASS. |
| Preservation/cleanup | PASS: four authorized existing files changed among 411 protected files; other 407 unchanged. A year-only pipe is additive. No owned synthetic fixtures remain; exact pre-existing test-year values/timestamps are preserved. |
| New UI acceptance / Word visual rendering | NOT TESTED. Backend/schema checks do not establish Brave UI behavior or visual Word layout. |

The initial expanded test run recorded 201 passes/two failures across 203 cases. Both failures used a new 21-character synthetic update name, so valid name validation returned 400 before the absent-ID 404 lookup. Shortening only that synthetic label corrected the fixture; expected 404 statuses and original 87 cases remained unchanged. The final focused run and full regression above use the corrected fixture. This is separate test-authoring evidence, not an extra application defect or a weakened assertion.

The runner and suite guard teacher_evaluation_test before fixture writes. The suite requires an idle test database with zero pre-existing active years and refuses to disable another tester's year. Each activation case checks for foreign active rows; each case and final cleanup compare every pre-existing year row, including timestamps, against the original snapshot. Invalid mixed updates compare exact owned-state snapshots. Owned fixture cleanup removes dependent rows before parents and independent marker checks find zero leftovers. Only isolated test sequences may advance from ordinary fixture creation; normal records/sequences are not accessed.

Repeat focused/full commands and isolated Swagger examples in [TESTING.md](../TESTING.md#academic-year-validation-fixes-and-verification). Step 18 remains historical evidence of 1,075 API passes/11 failures out of 1,086. Step 19 newly passes 1,128 API/schema tests after 42 added cases and the scoped repair; units stay 552 because behavioral regressions are covered by real HTTP/schema checks. Evidence/baseline/preservation helper use ignored .tmp/academic-year-validation-step19; the original .tmp/academic-years-step18 evidence is preserved.

The frontend still saves years using name, numeric start_year and boolean is_active; optional semester setup still follows through separate requests with partial-failure reporting. The misleading semester-only deletion-conflict text remains a known limitation outside this approved validation scope; 409 protection is correct for the four independently tested relation types. Offering-group/target deletion dependencies and complete browser year-plus-semesters setup were not independently accepted by this batch.

Next backend work proposed at Step 19, now evaluated in Step 20 below: audit existing semester CRUD/role assertions before adding missing cases, retaining existing date-order, academic-year consistency, protected teaching/curriculum and historical-label evidence. Remaining academic/result edges, student progress/delete combinations, frontend answerability adoption, complete UI workflows, reviewed cutover, official recovery, performance and production acceptance remain pending. The passing scoped repair does not prove every frontend requirement or production readiness.

All four approved documents are synchronized; docs contains exactly the Markdown and Word reports. Local links, 23 JSON examples, FR01-FR44 and DOCX package/XML/reference/text alignment are checked. **Word visual rendering was NOT CHECKED.** Original imp.txt/imp1.txt remain unavailable; preserved requirements and approved decisions remain the reference. No frontend/private edit, normal database access, migration, seed/reset, backup deletion, commit or push occurred. All changes remain local and uncommitted.

### 13.25 Local Step 20: semester CRUD boundary and permission verification

Historical discovery checkpoint: the failure/pending-approval wording below records the pre-repair state. The owner subsequently approved all five repairs; Section 13.26 records the implementation and fresh passing results.

Date: 15 October 2026, Asia/Phnom_Penh. Added [a separate semester boundary/permission suite](../test/semesters-crud.e2e-spec.ts), after reading frontend [academicSetup.js](../../teacher-evaluations-frontend/src/services/academicSetup.js), semester controller/service/create-update DTOs, calendar conversion, Prisma relationships/migrations and existing tests. Application/frontend/private configuration is unchanged. This is a test/documentation checkpoint; application repairs require the owner's separate approval.

Existing evidence was retained: [14 semester service unit cases](../src/semesters/semesters.service.spec.ts), [15 original semester API cases](../test/semesters.e2e-spec.ts), academic-integrity date/null/order cases and consistency/curriculum protection. Consistency already tests actual DRAFT/OPEN/CLOSED academic-year move rejection, protected answers/drafts and display metadata, plus a controlled transaction race with evaluation creation. The new suite supplements these tests rather than claiming the feature previously lacked coverage. Every prior test file remains unchanged.

Frontend semester requests use a numeric academic_year_id, numeric semester_number 1 or 2, trimmed semester_name up to 50 characters and optional real YYYY-MM-DD dates. Responses serialize semester/year IDs as strings, with stored semester classification and full nested academic-year metadata. Client list loading supports the helper's selected-year filtering. Creation of missing Semester 1/2 rereads the existing list and sends separate POSTs; it does not make academic-year/semester setup one atomic transaction. The new HTTP reread exercise supports those requests but does not execute the actual JavaScript helper or Brave UI.

| Scenario | Newly executed result and implication |
| --- | --- |
| Reads/auth/roles | PASS: all three active roles read list/detail; nine semester/eight nested year metadata fields, string IDs and valid timestamps. Missing/invalid JWT returns 401 on all five routes; lecturer/student writes return 403 without owned-state change. |
| Normal CRUD/frontend payload | PASS: semester numbers 1/2, numeric parent payload, 50-character Khmer name, omitted date defaults, injected-field stripping, partial/empty updates, empty 204 unused deletion then 404, offering-dependent deletion 409. |
| Uniqueness/context | PASS: duplicate name or number within a year returns 409 without partial writes; same name/number across years is valid; moving into an occupied year-number tuple rejects; no-evaluation offering semester remains movable. |
| Calendar/null classification | PASS: valid leap days, offsets/offsetless UTC normalization, stored-other-endpoint ordering, nullable date clearing and historical null semester-number preservation. Explicit null semester_number update currently succeeds; new creation still requires 1/2. This preserves current compatibility rather than inventing a new classification policy. |
| Evaluated teaching history | PASS: DRAFT/OPEN/CLOSED year moves return 409/SEMESTER_HISTORY_PROTECTED and exact owned-state equality; identical year IDs/display changes preserve offering/evaluation/version rows. Existing draft/answer/history/concurrency tests remain retained evidence. |
| Missing-semester reread | PASS at backend HTTP level: list identifies owned Semester 1, then only Semester 2 is created; first row/ID/timestamps remain unchanged. Actual frontend/helper retry acceptance is NOT TESTED in this batch. |
| Nonblank names | FAIL, two cases: whitespace-only POST returns 201 and PUT 200, expected 400. Invalid synthetic names are written and cleaned by owned IDs. |
| Non-null required updates | FAIL, two cases: semester_name:null causes Prisma 500; academic_year_id:null causes BigInt conversion 500; expected 400. Nullable dates/semester_number have distinct supported behavior. |
| Impossible dates | FAIL, four cases: either endpoint accepts 2026-02-30 on POST (201)/PUT (200), expected 400. |
| Numeric year-ID precision/range | FAIL, four cases: raw JSON 9007199254740993 is rounded and saved against owned year 9007199254740992 (POST 201/PUT 200), expected 400. Numeric 1e30 produces 500 on both, expected 400. An absent safe-integer parent correctly returns 400. |
| Semester path overflow | FAIL, three cases: GET/PUT/DELETE with 9223372036854775808 return 500, expected 400. Absent signed maximum is 404 and malformed text is 400 as expected. |
| Focused/full regression | FAIL: focused 91 PASS/15 FAIL, 106 HTTP cases. Full API 1,219 PASS/15 FAIL, 1,234 total across 28 suites (27 PASS/one FAIL). Fresh unit regression: 552/43 suites PASS. Focused cases are included in full totals. |
| Engineering checks | PASS: whole-repository type checking zero errors, build succeeds, lint zero errors/five existing warnings, formatting/diff checks pass. |
| Preservation/cleanup | PASS: fresh 412-file baseline unchanged, covering application/prior tests/frontend/private settings. All pre-existing test-year/semester rows and timestamps match their snapshots; owned fixtures and high-ID precision sentinel are removed. |
| New browser acceptance / Word visual rendering | NOT TESTED. No new Brave workflow or visually rendered Word check. |

The precision result is actual runtime evidence: the raw JSON contains odd academic_year_id 9007199254740993, while both successful responses contain academic_year_id="9007199254740992". JSON parsing cannot preserve the odd value as a JavaScript number; IsInt alone accepts the rounded even number. An explicitly owned even-ID year lets the test demonstrate the wrong relationship rather than merely a failed lookup. No school record is used. The frontend already checks Number.isSafeInteger, but API validation must enforce its own numeric boundary. The proposed compatible repair keeps the number payload and rejects values above 9007199254740991 (Number.MAX_SAFE_INTEGER), before BigInt conversion/Prisma.

Before fixture writes, the suite asserts teacher_evaluation_test and requires precision sentinel ID 9007199254740992 to be absent. A pre-existing row blocks setup; it is never overwritten or deleted to enable the test. The owned sentinel is inserted with an explicit ID, without setting the sequence. Every existing test-year and semester row is snapshotted and compared after each case and final cleanup. Three owned active-role accounts, four inactive years, six baseline semesters, a department/course, four offerings and one questionnaire/version with three evaluation status references support the checks. These direct synthetic evaluation references test the history guard, not a complete evaluation-creation workflow; richer existing consistency scenarios remain intact.

Passing rejection cases compare exact owned semester/year/user/offering/evaluation/version state. Failing accepted-name/date/precision cases do write synthetic records, so no blanket no-write claim is made. An owned ID ledger and owned-year scope allow cleanup even after blank-name/parent changes. Dependent fixture cleanup removes evaluations/offerings/version/survey before semesters/course/department/years/users. Independent checks find no marker leftovers or high-ID sentinel. Normal records/sequences are not accessed; ordinary isolated fixture writes may advance test sequences. The full suite retains its other idle/zero-active-year preconditions.

Additional source-confirmed frontend/documentation limits: empty date controls omit fields and cannot clear a stored date using the backend's supported null payload; semester response examples omit semester_number and nested start_year even though actual responses include them. These are distinct from newly observed browser failures. No browser acceptance or new generated-OpenAPI assertion is claimed for Step 20.

Next action, awaiting required owner approval: trim/reject blank semester names; reject explicit null name/year updates; reject impossible calendar days; bound numeric year IDs to safe integers; add semester-only signed path bounds. Preserve numeric DTO types, valid/absent safe-ID behavior, nullable dates/semester_number, uniqueness, allowable no-evaluation moves and evaluated teaching history. Update Swagger and retain all 106 new cases, adding meaningful boundary/compatibility/schema cases. No migration/frontend change is required for this proposed scope. Until repaired and retested this checkpoint remains FAIL.

Repeat commands and safe preconditions are in [TESTING.md](../TESTING.md#automated-semester-crud-boundary-and-permission-checks). Ignored .tmp/semesters-step20-evidence.json and baseline/check helpers retain the checkpoint; prior Step 19 remains a fully passing 552/1,128 result. Delivery's 514/471 tests and normal/test 18-migration/28-table/199-column evidence remain recorded historical results, not a new normal audit. All four approved documents are maintained; docs contains exactly the Markdown and Word reports. Local links, 23 JSON examples, FR01-FR44 and Word package/XML/reference/text alignment are checked. **Word visual rendering was NOT CHECKED.** Original imp.txt/imp1.txt remain unavailable; the preserved register and approved decisions remain the requirement reference.

No application/frontend/private configuration edit, normal access, migration, seed/reset, backup deletion, commit or push occurs. Further academic/result edges, student progress/delete combinations, frontend answerability adoption, complete UI workflows, reviewed cutover, official recovery, performance and production acceptance remain pending. Backend tests do not prove complete frontend acceptance or production readiness.

### 13.26 Completed local Step 21: semester validation repair

Date: 15 October 2026, Asia/Phnom_Penh. The owner approved all five repairs after the Step 20 findings. Changed semester create/update DTOs, controller/Swagger and added [ParseSemesterIdPipe](../src/semesters/pipes/parse-semester-id.pipe.ts); extended the existing [semester boundary suite](../test/semesters-crud.e2e-spec.ts). SemestersService, shared BigInt/calendar utilities, schema/migrations, prior fixes/tests, original semester API/unit suites, consistency tests, frontend and private settings remain unchanged. No migration is needed.

Incoming semester names are trimmed before required/string/50-character validation, retaining non-string values for rejection. Name uniqueness remains case-sensitive within the academic year, now receiving the normalized input. Existing stored labels are not rewritten. Update name and academic_year_id validate every supplied value except undefined, so explicit null returns 400. Other omitted fields and empty updates remain compatible. Historical null semester numbers are still preserved and explicit nullable number updates remain supported; new creation still requires 1 or 2. Nullable date clearing remains supported and accurately described by TypeScript/Swagger.

Academic-year body IDs retain the frontend's existing numeric type. IsInt/Min(1)/Max(Number.MAX_SAFE_INTEGER) bounds them to 1..9007199254740991, rejecting the rounded result of unsafe JSON and excessive values before SemestersService converts them to BigInt or sends them to Prisma. Valid absent numeric parents still return 400/Academic year not found; strings remain invalid. Responses retain string IDs. The numeric parent body cannot represent full signed BigInt storage; binding to larger year IDs would require a separately agreed contract migration. This scoped repair deliberately preserves current frontend compatibility.

Create/update date validators now check strict ISO calendar validity before existing UTC-day conversion. Leap centuries, timezone offsets, offsetless UTC interpretation, partial endpoints, stored-other-endpoint order and null clearing remain supported. The shared conversion utility is unchanged. The new semester-only path pipe delegates to the prior integer parser then bounds signed PostgreSQL BigInt storage before Prisma. Valid absent path integers stay 404, including signed minimum/above-safe-number values; valid leading zeros are preserved. Parsing precedes the bounds check; this is not a global parser policy change.

Swagger now records required create/optional update fields, integer numeric parent limits, correct nullability, real-date descriptions, string path bounds and 400 responses. Success examples include semester_number and nested academic-year start_year/timestamps, matching the actual returned metadata.

| Acceptance/check | Actual result |
| --- | --- |
| Original 106 cases | PASS before additions: all 15 former failures return 400, including no wrong-year raw-JSON writes. Original suite body/status/no-write assertions are hash-verified unchanged after excluding only the added import/appended test block. |
| Names and per-year uniqueness | PASS: six new create/update cases for padded maximum length, normalized duplicate name (409) and Unicode-only blank input (400). |
| No partial updates | PASS: six mixed invalid name/null-year/unsafe-year/date cases commit none of their valid companion name/number/year/date changes; owned context/history rows remain unchanged. |
| Safe numeric parent boundary | PASS: two exact maximum-safe inputs reach absent-parent lookup (400/Academic year not found), two adjacent unsafe inputs reject at field validation (400). Original odd-JSON precision/1e30 regressions remain passing. |
| Calendar/null compatibility | PASS: six valid leap-century/offset/offsetless create/update cases, eight invalid non-leap/century/month-day/offset cases and one mixed rename/null classification/date clearing case. Original date/null/history cases remain passing. |
| Signed path/precision compatibility | PASS: 12 new GET/PUT/DELETE underflow/long-overflow/absent-minimum/above-safe-integer cases plus three valid leading-zero paths. Existing malformed/max/overflow expectations remain passing. |
| Generated OpenAPI | PASS: one case checks required name/year/number, optional updates, integer numeric-parent bound, field nullability/length, real-date descriptions, signed string path bounds, 400 responses and complete classification/year success examples. |
| Focused final | PASS: 254 cases/three suites in 50.576 seconds: 153 expanded semester cases (152 HTTP/one OpenAPI), plus 101 original semester/consistency cases. Original 106 retained, 47 added; no skips or expected-error weakening. |
| Full final | PASS: 43 unit suites/552 tests and 28 API suites/1,281 tests. Focused cases are included in totals. Whole-repository types zero errors; build PASS, lint zero errors/five existing warnings, formatter/diff PASS. |
| Preservation/cleanup | PASS: four authorized existing files changed among 413 protected files; other 409 unchanged, plus one additive semester-only pipe. Exact pre-existing test-year/semester rows/timestamps preserved; no owned marker fixtures or unsafe sentinel remain. |
| New UI acceptance / Word visual rendering | NOT TESTED. Backend/schema checks do not establish actual Brave UI workflow or visual Word layout. |

The runner/suite guard teacher_evaluation_test before fixture writes. The explicitly owned precision-sentinel ID must be absent beforehand; setup refuses a pre-existing row rather than overwriting it. Every pre-existing test-year/semester row is snapshotted and checked after each case and final cleanup. The direct synthetic evaluation references verify the history guard; original richer consistency cases still exercise protected drafts/answers, metadata and the concurrent evaluation/year-move race. The full suite also retains the idle zero-active-year precondition of academic-year tests. Cleanup removes owned dependencies before parents and the explicit-ID sentinel; ordinary isolated fixture creation can advance test sequences, while normal records/sequences are never accessed.

Repeat focused/full commands, identifier contracts and isolated Swagger requests in [TESTING.md](../TESTING.md#semester-validation-fixes-and-verification). Step 20 remains historical evidence of 1,219 API passes/15 failures out of 1,234, including actual wrong-year writes. Step 21 newly executes 1,281 passing API/schema cases after the repair and 47 additions; units remain 552 because behavioral boundaries are tested through real HTTP/schema requests. Evidence/baseline/check helpers use ignored .tmp/semester-validation-step21. The original .tmp/semesters-step20 evidence is preserved.

The frontend numeric payload remains compatible. Empty frontend date controls still omit fields and cannot request null clearing; its separate missing-semester/year-plus-semesters helper/browser workflow was not newly accepted here. Backend setup requests are separate operations and can partially succeed. Further source/role/edge coverage, actual UI acceptance, frontend answerability adoption, reviewed cutover, official recovery, performance and production-readiness work remain pending. Next backend work proposed at Step 21, now evaluated in Step 22 below: audit existing course-catalog CRUD/role coverage against frontend requests before adding missing checks. The passing semester repair does not certify every frontend requirement.

All four approved documents are synchronized; docs contains exactly the Markdown and Word reports. Local links, 23 JSON examples, FR01-FR44 and DOCX package/XML/reference/text alignment are checked. **Word visual rendering was NOT CHECKED.** Original imp.txt/imp1.txt remain unavailable; the preserved requirement register and approved decisions remain the reference. No frontend/private edit, normal database access, migration, seed/reset, backup deletion, commit or push occurred. All changes remain local and uncommitted.

### 13.27 Local Step 22: course-catalog CRUD boundary and permission verification

Historical discovery: the failures recorded here are now resolved by approved Step 24 in Section 13.29. The original results remain preserved below.

Date: 15 October 2026, Asia/Phnom_Penh. Added [test/courses-crud.e2e-spec.ts](../test/courses-crud.e2e-spec.ts), after reviewing course controller/service/DTOs, frontend [academicSetup.js](../../teacher-evaluations-frontend/src/services/academicSetup.js), schema/migrations and existing assertions. This is a test/documentation batch; no application or frontend/private configuration change is made. Existing [app API tests](../test/app.e2e-spec.ts) retain 13 course CRUD/three auth cases, [integration tests](../test/integration.e2e-spec.ts) retain course creation in the backend workflow, and curriculum/consistency behavior/history remains retained. There is no dedicated course service unit spec; this does not mean course HTTP creation/CRUD lacked prior coverage.

Documentation correction on 15 October 2026: prior Step 20/21 prose described 16 original semester API cases. An unanchored search included app.init(); there are 15 actual test declarations. Those descriptions are corrected, while historical evidence files and recorded Jest totals are preserved. Step 21's 254 focused total remains 153 expanded semester + 15 original semester + 86 consistency; its 101 retained cases and all full-suite totals are unchanged. This is a source-count correction, not a deleted/skipped test.

The frontend courseCatalog adapter sends trimmed course_code/course_name, numeric department_id and trimmed description, to /api/courses POST/PUT; DELETE uses a saved path ID. The API returns string course/department IDs and full nested department metadata. Course codes are globally unique, exact and case-sensitive; no major-style regex/uppercase rule applies. Duplicate course names are allowed. Nullable descriptions and empty strings remain valid; raw API description spaces are preserved. Explicit department assignment requires ACTIVE. These existing behaviors are preserved in the test expectations.

| Scenario | Newly executed result and meaning |
| --- | --- |
| Reads/auth/permissions | PASS: three active roles read list/detail; eight course/six nested department fields, string IDs and valid timestamps. Missing/invalid JWT returns 401 on all five routes; lecturer/student writes return 403 without owned-state changes. |
| Normal CRUD/frontend payload | PASS: numeric department payload, 30-character code/150-character Khmer name, optional descriptions, injected-field stripping, partial/empty updates, unused bodyless 204 deletion then 404. |
| Code/name semantics | PASS: duplicate code create/update across departments returns 409, codes remain case-sensitive without automatic uppercase, internal characters/spaces remain compatible and duplicate course names work. |
| Descriptions | PASS: omitted/null/empty creation, text/null/empty updates, raw-space preservation. Null description is valid, unlike null required code/name/department. |
| Department rules | PASS: inactive assignment and absent safe parent return 400; metadata updates on an existing inactive-parent course work when the parent is omitted, while resending that inactive parent rejects. |
| Dependencies/catalog metadata | PASS: separately isolated course-offering and course-year-rule relations block course deletion with 409; display changes preserve offering/rule rows. These checks do not independently reproduce full evaluated/anonymous history; existing richer history suites remain retained. |
| Blank code/name | FAIL, four cases: whitespace-only code/name accepted on POST (201)/PUT (200), expected 400. Invalid synthetic values are written and cleaned by owned IDs. |
| Null required updates | FAIL, three cases: course_code:null/course_name:null cause Prisma 500; department_id:null causes BigInt conversion 500; expected 400. Nullable description remains deliberately supported. |
| Numeric department precision/range | FAIL, four cases: raw JSON 9007199254740993 rounds and saves against owned department 9007199254740992 on POST (201)/PUT (200), expected 400. Numeric 1e30 returns 500 on both, expected 400. |
| Course path overflow | FAIL, three cases: GET/PUT/DELETE with 9223372036854775808 return 500, expected 400. Valid absent signed maximum gives 404; malformed text gives 400. |
| Focused/full regression | FAIL: 82 PASS/14 FAIL from 96 focused HTTP cases; full API 1,363 PASS/14 FAIL, 1,377 total across 29 suites (28 PASS/one FAIL). Fresh units: 552/43 suites PASS. Focused cases are included in full totals. |
| Engineering checks | PASS: zero whole-repository type errors, build PASS, lint zero errors/five existing warnings, formatting/diff PASS. One initial new-test annotation error was corrected before final checks without modifying behavior/status assertions. |
| Preservation/cleanup | PASS: all 414 protected files unchanged, including prior fixes/tests/frontend/private settings. Every pre-existing test course/department row retains exact values/timestamps; owned fixtures and high-ID department sentinel are removed. |
| New UI acceptance / Word visual rendering | NOT TESTED. No new Brave workflow/helper execution or visually rendered Word check. |

The numeric precision result is actual HTTP evidence. Raw JSON contains department_id 9007199254740993, while successful create/update responses contain department_id="9007199254740992". An explicitly owned ACTIVE even-ID department demonstrates the unintended relationship instead of merely an absent-parent error; no school record is used. IsInt alone accepts the rounded JavaScript number. Frontend numericId already checks Number.isSafeInteger, but the backend must independently validate it. The proposed repair retains numeric department_id and bounds it to 1..9007199254740991 before conversion/Prisma.

The suite checks teacher_evaluation_test and snapshots all existing course/department rows before fixture writes. Department sentinel ID 9007199254740992 must be absent; setup refuses an existing row, never overwriting/deleting it to enable tests. Owned fixtures are three role accounts, four departments, four baseline courses, one major/year/semester, one offering and one curriculum rule. One baseline course deliberately represents a previously assigned inactive department; it is a direct fixture, not an API permission bypass. The high-ID department is inserted explicitly without setting a sequence. Every existing course/department row is compared after each case and final cleanup. Owned dependencies are removed before parents, and follow-up checks find no owned marker records or precision sentinel. Only ordinary isolated fixture sequences may advance; normal records/sequences are not accessed.

Passing rejections compare exact owned course/department/user/offering/rule/major/semester/year snapshots. Failing accepted blank/precision requests do mutate owned synthetic records; no no-write pass is claimed. The owned ID/department ledger permits cleanup after blank-code/parent changes. There is no dedicated race or complete evaluated-questionnaire-history acceptance added in this suite; original curriculum/consistency tests remain intact.

Frontend handoff limitation, supported by source and HTTP rather than a new UI walkthrough: saveSetupRecord sends the department ID on every course save, so an existing inactive-department course cannot use the permitted omitted-parent metadata-only update through that adapter. The frontend team must review this against the existing active-assignment rule; changing that school policy is not included in the proposed validation repair. Description trimming also belongs to the frontend, while the API supports raw spaces/null/empty distinctions. Swagger course examples omit department_id/departments and current 400/DELETE 409 cases are incompletely documented. An approved repair should update those examples/contracts; no new generated-OpenAPI assertion is claimed for this discovery batch.

Next action, awaiting required owner approval: trim/reject blank course code/name, reject explicit null required updates, bound numeric department IDs to safe integers and add course-only signed path bounds. Preserve case-sensitive/global codes, allowed code characters/internal spaces, duplicate names, nullable descriptions, numeric request types, active-department policy and dependency/history protections. No migration/frontend change is required for that proposal. Keep all 96 cases, add meaningful compatibility/boundary/OpenAPI regressions and rerun focused/full checks. Until repaired and verified this checkpoint remains FAIL.

Commands/preconditions are in [TESTING.md](../TESTING.md#automated-course-catalog-crud-boundary-and-permission-checks). Ignored .tmp/courses-step22-evidence.json and baseline/check helpers retain the checkpoint; Step 21 remains the preceding fully passing 552/1,281 result. Delivery's 514/471 tests and normal/test 18-migration/28-table/199-column alignment remain historical recorded evidence, not a new normal audit. All four approved documents are maintained; docs contains exactly the Markdown and Word reports. Local links, 23 JSON examples, FR01-FR44 and Word package/XML/reference/text synchronization are checked. **Word visual rendering was NOT CHECKED.** Original imp.txt/imp1.txt remain unavailable; preserved requirements/approved decisions remain the reference.

No application/frontend/private configuration edit, normal access, migration, seed/reset, backup deletion, commit or push occurs. Remaining academic/result edges, student progress/delete combinations, frontend answerability adoption, complete UI workflows, reviewed cutover, official recovery, performance and production acceptance remain pending. Backend tests do not establish complete UI acceptance or production readiness.

### 13.28 Local Step 23: improve.txt A-S review and delivery roadmap

Subsequent status: Step 24 completes the initial course repair; Step 26 records approval of the three school rules and completes D first-admin provisioning. P/R, E implementation/mapping, other A-S work and full acceptance remain pending. This dated matrix records the Step 23 baseline; later deliveries update the current status above and in Section 13.31. This section preserves the source-only review at its original checkpoint.

**15 October 2026: source/documentation review only.** The newly supplied [workspace improve.txt](../../improve.txt) contains 19 requirement areas, A-S. This section adds a current change register; it does not replace the original eight-area requirement review, FR-01-FR-44 or dated delivery/testing evidence. The supplied file is available locally; the unavailable original imp.txt/imp1.txt limitation still applies. Backend HEAD remains a298798 with subsequent local work uncommitted. No new application fix or migration is authorized by this review request.

Requirement-source SHA-256: `ce8e7bf3c80ec3f16130fdbefbb8d675b1ed0d76887e026fe20ed83baf42d949` (UTF-8 file bytes). This identifies the version reviewed; a later edit to improve.txt requires another comparison. The frontend folder exists but has no standalone .git directory here, so no independent frontend delivery SHA was established. Searches of the current frontend src tree found no major_scoped_generations, evaluation_activity_v1, bulk_evaluations_v1, bulk-create or rollover implementation markers. This is a version/handoff uncertainty, not proof that the frontend team's prepared changes do not exist elsewhere. Request the exact corresponding frontend revision before acceptance.

Status meanings: IMPLEMENTED means the requested behavior is present and supported by prior evidence; PARTIAL means reusable behavior exists but the complete new requirement is unmet; NOT IMPLEMENTED means no complete supporting workflow/contract was found; DECISION REQUIRED means school/privacy policy must be settled before implementation. These source statuses are distinct from runtime PASS/FAIL/BLOCKED/NOT TESTED. New A-S runtime scenarios are NOT TESTED in this review. The latest executed regression remains Step 22: 552 unit PASS and 1,363 API PASS/14 FAIL, 1,377 API total across 29 suites. Step 21 remains the last fully passing 552/1,281 checkpoint. Nothing in this review turns those 14 failures into passes.

| ID / frontend request | Current backend and evidence | Remaining backend work / acceptance condition |
| --- | --- | --- |
| A. Shared-class, multi-major evaluation audiences and results | PARTIAL. ALL_ENROLLED supports shared eligible enrollments; offerings accept multiple scopes; evaluation targeting accepts only singular group_scope. Existing reviewed creation freezes participants and target labels. | Add backward-compatible group_scopes and independent major_ids, validated intersections, deduplication, complete frozen labels and authoritative per-major/group counts. Reject both singular/plural fields, empty or conflicting restrictions. Bind exact audience/version/schedule to review and revalidate atomically. Major-filtered anonymous answers/exports need the privacy design described below. |
| B. Atomic academic-year and two-semester setup | Step 42 local backend IMPLEMENTED: explicit ADMIN setup/complete-setup/receipt routes, exact two-number validation, all-or-nothing activation/semesters, missing-only preservation and actor/input-bound durable retries. Test migration 23; fresh full 751 unit/2,199 API PASS. | Matching UI/normal rollout pending. This first part of milestone 2 does not yet implement F/I automatic group/teaching rollover or advertise an integrated capability. Section 13.47. |
| C. Clear optional year/semester dates | IMPLEMENTED; prior year/semester and academic-integrity tests cover clearing, retention and chronology. Services distinguish omitted input from null; calendarDate preserves null instead of creating 1970. | Retain prior regressions: omit retains, null clears, valid date replaces, resulting order is valid. Preserve linked schedules/history. No reimplementation or new runtime PASS is claimed in this review. |
| D. Provision the first administrator | NOT IMPLEMENTED. Existing sample seeding is not the requested production bootstrap. | Secure operator CLI, normal password hashing, no default/output password or public bootstrap route. Empty-installation only; concurrent/rerun attempts cannot create a second administrator, reset credentials or add academic sample data. Test using owned isolated fixtures without resetting shared test data. |
| E. Major-scoped integer generations | At this Step 23 review: NOT IMPLEMENTED. At that time student_generations had a globally unique name and no major_id/generation_number; imports used a global label. Steps 31-35 later add the test schema/catalog, major-aware imports, individual creation with INITIAL evidence, safe personal edits, explicit chronological yearly placement/TRANSFER and selected-year historical cohort resolution/consumers. Step 36 adds authenticated reviewed mapping only in a disabled-by-default isolated rollout, plus test migration 20. Step 37 adds opt-in legacy-write enforcement and schema-gated /auth/me capability, including empty catalogs. Actual ownership/frontend/normal cutover and complete E acceptance remain pending; latest scope is Section 13.42. | Design reviewed migration/mapping for major ownership and positive integer numbers; unique major/number, aliases/numeric sorting, scoped imports/profile/group/export changes, ownership validation and transfer policy. Expose the capability only when deployed. Audit ambiguous/shared legacy cohorts; never infer historical ownership from today's major. |
| F. Automatic yearly student-group rollover | NOT IMPLEMENTED. Yearly records and authoritative progression resolution exist; year creation does not copy placements. | Copy only eligible predecessor-year placements identified by start_year minus one. Preserve every destination row including blank groups; skip paused/disabled/ambiguous/invalid placements with reasons. Integrate with B/I atomically, persist provenance/counts and idempotency. Never auto-resume or copy enrollments/evaluations. |
| G. Server-generated course codes | At the Step 23 review, NOT IMPLEMENTED. Step 38 implements omitted-code department-prefix allocation, actor/input-bound UUID retry receipts, recovery, concurrency/length/collision rules and /auth/me automatic_course_codes_v1 in the isolated rollout. Explicit official codes remain case-sensitive; new blank/null input still invalid. Test migration 21 and full 652 unit/2,008 API checks pass. Matching frontend/Brave, normal rollout and performance/production acceptance pending; Section 13.43. | On omitted code, allocate a concurrency-safe department-prefix sequence with collision/length handling and retry identity. Preserve explicit codes and code stability on edit. Do not use unlocked MAX+1. Coordinate the Step 22 fix and changed omission expectation; explicit blank/null and omitted code are different inputs. |
| H. Curriculum eligibility for every new offering | At Step 23 PARTIAL: optional year and unscoped bypass. Step 39 implements required year and enabled selected-semester revision for every new/changed context, scoped or unscoped; preserves unchanged legacy/pinned history. Fresh full 680 unit/2,052 API checks pass. No migration. Local backend slice complete; matching frontend/Brave and normal/production acceptance pending, Section 13.44. | Require valid level and enabled applicable revision for new scoped/unscoped offerings; resolve latest revision applicable to the destination year. Preserve unchanged legacy contexts/pinned revisions and legitimate lecturer-only edits. New stricter policy needs compatibility tests. |
| I. Automatic yearly teaching-assignment rollover | NOT IMPLEMENTED. No source-offering provenance or atomic rollover workflow was found. | After B/E/F/H and assignment identity decisions, copy eligible assignments into matching semester numbers with new IDs and unchanged teaching level. Derive destination cohorts/groups from destination placements, skip ambiguous whole assignments, preserve existing destinations and support multiple lecturers. Persist source provenance/audit counts; copy no enrollments/evaluations. |
| J. Reviewed multirow offering creation plus enrollment | Step 40 supplies API identity; Step 41 completes the local backend preview/atomic all-row create/pin/enroll/receipt, drift/expiry checks, durable original recovery and deployed capability. Test migration 22 adds complete-context label-free SQL uniqueness, preserving null legacy history. Fresh 717 unit/2,143 API PASS. Matching frontend/Brave and normal/operational acceptance pending; Section 13.46. | Preview without writes, exact per-row roster confirmation, one all-or-nothing create/scopes/revisions/enrollment transaction, drift checks and durable retry receipt. The new uniqueness key excludes section_code; audit existing label-only duplicates before a reviewed migration. |
| K. Frozen audience metadata on admin evaluation lists | PARTIAL. Existing includes expose year/semester, targets and counts, but not the complete requested department ID, coherent frozen major/year pairs and completeness metadata for all audiences. | Snapshot evaluation-time placement metadata for all newly frozen participants including ALL_ENROLLED. Return deduplicated major/year pairs with availability/completeness; do not reconstruct old audience labels from current student records. Retain legacy counts and mark unavailable history. |
| L. Atomic reviewed create and publish | PARTIAL. Reviewed creation produces DRAFT, then opening is a separate call. Future scheduling and current access-window rules already exist. | One reviewed idempotent transaction creates, freezes and publishes OPEN with the existing schedule rules. Expired/invalid input leaves no draft. Retry returns the original evaluation and does not alter pre-existing evaluations. |
| M. Extend an active evaluation deadline | Step 43 local backend IMPLEMENTED: active OPEN end-only strictly later extension on existing schedule route; SERIALIZABLE with closure/competing extensions, retained DRAFT behavior and protected history. New 26 unit/32 API included in full 777/2,231 PASS. | Matching frontend/Brave and normal/production acceptance remain. No new migration or activity-history capability. Section 13.48. |
| N. Immutable evaluation activity v1 | NOT IMPLEMENTED. Existing reviewed-operation receipts are not an activity feed; no matching route/model/capability was found. | Add same-transaction events with actor snapshots for every specified mutation, no duplicates on retry/rollback, bounded opaque keyset pagination and admin authorization. No participants/answers/secrets in events; decide retention/tombstones. Advertise in login/me only when implemented; never fabricate old activity. |
| O. One evaluation per offering | NOT IMPLEMENTED. Current uniqueness is offering plus survey_version_id, which allows another evaluation with a different version. | Audit legacy multiple evaluations and approve a preservation/constraint plan. Enforce the new offering-only identity with authorized EVALUATION_EXISTS metadata and concurrency-safe guards; reviewed retries still return their original receipt. Never delete/merge history to make a constraint pass. |
| P. Persisted enrollment counts and prerequisite metadata | PARTIAL. Selected-year student queries exist, but offeringInclude has no _count.enrollments and the full requested prerequisite/error/capability contract is absent. | Expose true persisted enrollment counts and complete semester context, document stable prerequisite errors, and advertise E/J/L capabilities only after the corresponding implementations are deployed. Zero must be an explicit valid count. |
| Q. Reviewed bulk evaluation create/publish v1 | NOT IMPLEMENTED. No bulk endpoints or bulk_evaluations_v1 capability found. Existing review storage is a foundation. | At most 50 distinct offerings; exact version/schedule, complete READY/SKIPPED/BLOCKED previews, exact roster confirmations and one atomic create/freeze/publish/event transaction. Any READY conflict invalidates all writes. Persist retry receipts beyond preview expiry; no loop fallback or compensating history deletion. Depends on O/P/N and shared L logic. |
| R. Self-profile academic context and student class labels | PARTIAL. auth/me resolves student context but reduces it to major/year/academic_year. Student available/history summaries already contain semester, class_type, section_code and course metadata; student academic-year access exists. | Expose the full self-only current-year academic record/group and authoritative progression/placement eligibility/reason, with null/unavailable handling and no older-record fallback. Keep assigned-history authorization; distinguish teaching-section labels from student academic groups. Frontend must preserve the privacy wording. |
| S. Lecturer release and small-cohort policy | DECISION REQUIRED for the new threshold/suppression policy. CLOSED-only lecturer results are already implemented and previously tested. | Retain the approved CLOSED-only policy until an explicit replacement is approved. Agree configurable response thresholds, suppression metadata, text/export/filter behavior and subtraction-attack protection. Do not invent a threshold or change historical visibility. |

**Source basis and existing test coverage**

The matrix comes from the supplied requirements plus current code, schema/migrations, tests and frontend service calls, rather than from frontend labels alone. Key inspection points are [evaluation targeting DTO](../src/evaluations/dto/evaluation-targeting.dto.ts), [evaluation service](../src/evaluations/evaluations.service.ts), [offering service](../src/course-offerings/course-offerings.service.ts), [new-offering DTO](../src/course-offerings/dto/create-course-offering.dto.ts), [year service](../src/academic-years/academic-years.service.ts), [semester service](../src/semesters/semesters.service.ts), [generation DTO](../src/student-generations/dto/create-student-generation.dto.ts), [import DTO](../src/students/dto/import-students.dto.ts), [auth service](../src/auth/auth.service.ts), [student summaries](../src/student-access/student-access.service.ts), [reviewed workflow routes](../src/reviewed-workflows/reviewed-workflows.controller.ts), [results routes](../src/results/results.controller.ts), [anonymous scope guard](../src/common/utils/anonymous-report-scope.util.ts), [Prisma schema](../prisma/schema.prisma) and the current frontend [academic setup helper](../../teacher-evaluations-frontend/src/services/academicSetup.js).

Previously recorded evaluation, reviewed-workflow, progression, curriculum, academic-integrity and student-access tests support the existing behavior, not the absent new contracts. C is supported by the recorded year/semester/date-order/clearing suites; H has scoped revision/history assertions; L has existing reviewed creation/opening/scheduling tests; R has academic metadata/access tests; S has CLOSED-only result permission checks. Existing tests do not establish multi-major anonymous slicing, atomic B/F/I rollover, major-scoped generation migration, automatic course codes, combined J/L workflows, activity events or Q bulk support. No new runtime assertion has been executed for those requests.

**Decisions and preservation boundaries before implementation**

1. Agree the exact frontend delivery and request/response schemas, stable error codes, ID types and capability names. Current ADMIN guards are role based; department membership/primary department is not automatically a department permission model. Define permitted departments, global-admin behavior and bootstrap access before enforcing a guessed restriction.
2. Settle E cohort ownership and transfer policy, and audit J/O uniqueness conflicts. Current offering uniqueness includes section_code; current evaluation uniqueness includes survey version. These are changes to existing rules. Review legacy exceptions and a non-destructive enforcement plan before any migration. No normal records were read or changed for this audit.
3. Resolve A5 together with S. Current responses contain no student/participant link or response-major snapshot, and the anonymous scope guard rejects slicing. Frozen participant major counts cannot identify which anonymous answers belong to that major. An agreed privacy-safe future cohort aggregation design is required; do not introduce response-to-student linkage or derive past answers from current placements. Historical per-major answer slices must remain unavailable where not recorded. Small cohorts, text, overlapping filters and exports need the same disclosure policy.
4. Define durable operation keys/receipts, concurrent-request behavior, feature flags, audit retention and legacy partial-setup recovery. Never advertise a capability for a source-only or partially deployed workflow. Previously approved persistent PAUSE until explicit RESUME, yearly placement, protected history and CLOSED-only release remain in force unless a specific change is approved.
5. New F initialization is an explicit new rollover operation, not permission to infer groups during ordinary reads or rewrite old records. Resolve missing/ambiguous predecessor years and destination placements explicitly. A paused student stays paused, and every destination-year record remains independent.

**Ordered backend delivery plan and finish criteria**

| Stage | Work and dependencies | Required evidence before moving on |
| --- | --- | --- |
| 0. Agree the handoff | Version improve.txt and the matching frontend; resolve department authorization, E transfer/mapping policy, A5/S privacy, J/O identity and receipt/capability contracts. Preserve C and existing approved workflows. | Reviewed contracts/decision register and isolated synthetic scenarios. Policy-dependent features remain BLOCKED until decisions are approved; unaffected work can proceed. |
| 1. Restore a green baseline and basic contracts | Approve the Step 22 course repair: blanks/nulls, safe numeric department IDs and path bounds; align future code omission with G instead of enforcing obsolete required-code expectations. Add low-risk P counts/R self context and D first-admin CLI in separately reviewed changes. | Each defect reproduction passes, no unsafe rounding writes, retained compatibility/permissions pass, bootstrap concurrency/rerun tests pass and latest full regression is green. Adjust an old test only for an explicitly approved contract change, never to conceal failure. |
| 2. Review data identities and migrations | E major-scoped generations and J/O uniqueness/provenance design. Inventory ambiguous mappings and existing duplicates without deleting/merging historical evaluations, offerings, participants or responses. | Synthetic migration fixtures cover numeric/GenN conversion, shared/unknown cohorts, collisions, foreign keys and historical snapshots. Backup/restore/rehearsal and normal migration require separately approved operational work; this review performs none. |
| 3. Make academic creation reliable | G atomic course code allocation, H curriculum gates, J reviewed multirow offering/enrollment; use reviewed identities from Stage 2. | Concurrent allocation/manual collision, unscoped/scoped curriculum, unchanged legacy edits, zero-write preview, drift, whole-batch rollback and same-ID retry tests. Existing CRUD remains compatible. |
| 4. Add yearly initialization | B atomic year/semester setup, then F placement rollover, then I offering rollover using E/H and destination placements. Deliver the integrated B/F/I transaction, missing-only recovery and durable source provenance. | Semester 2/rollover failure restores all state and active year; retries do not duplicate; blank/existing placements stay unchanged; paused/ineligible/ambiguous rows skip with reasons; no enrollment/evaluation history copied. |
| 5. Freeze and expose audiences | A targeting/counts and K coherent frozen audience metadata after the cohort model is settled. Implement A5 answer slicing only after the approved A5/S privacy design; keep it unavailable otherwise. | Shared DS/FE union, independent major filter, overlap deduplication, enrollment intersection, conflicting scopes, review drift and immutable labels. Count totals match exact participants, with explicit unknown category. Old singular clients still work. |
| 6. Complete evaluation lifecycle and audit | O offering-only creation guard, N same-transaction events, M active deadline extension and L atomic reviewed create/publish. Implement audit hooks with the lifecycle changes so new events are not missed. | Serialized concurrent creation/close/extension, past/future/expired schedule boundaries, rollback/no orphan draft, immutable actor snapshots, opaque pagination and one receipt/event set per retry. Legacy protected history remains intact. |
| 7. Deliver bulk workflow | Q uses shared L creation, N events, O conflicts and P readiness; advertise the exact capability only on successful deployment. | Full 50-item boundary, READY/SKIPPED/BLOCKED completeness, exact confirmation, changed roster/version, one-row conflict rolling back all READY writes, expired preview versus committed retry, authorized references and no frontend loop fallback. |
| 8. Accept the whole system | Retain all prior regressions; cover the new routes/permissions/errors/ID boundaries, approved S policy and privacy exports. Run complete real UI workflows in Brave against teacher_evaluation_test with synthetic accounts and the agreed frontend revision. | Record each scenario PASS/FAIL/BLOCKED/NOT TESTED with actual evidence: setup, generations, progression/PAUSE/RESUME, yearly groups, offerings/enrollment, preview/confirmation/retry, questionnaire revisions, drafts/submission, CLOSED lecturer results, deadline/activity and bulk. Backend passes alone do not establish frontend acceptance. |
| 9. Prepare delivery and thesis evidence | Update these same four documents after each approved implementation, synchronize Markdown/Word, finish operational recovery/performance/production review and actual Word visual inspection. | Dated totals, migration/recovery evidence, documented limits, school-sized performance observations and reviewed deployment/rollback steps. Commit/push or normal database work still needs separate permission. |

For each approved code step: record the previous checkpoint, reproduce the gap with a meaningful test, implement the smallest compatible change, run focused tests, then the appropriate full unit/API/type/build/lint checks. Use only the isolated teacher_evaluation_test for owned synthetic runtime fixtures; do not reset shared test data. Verify cleanup, historical records and private/frontend files are preserved, then update all four documents with actual results. A green test suite demonstrates the tested scenarios; it cannot certify 100% of every possible input, UI behavior or production condition.

**Actual evaluation results for this review**

| Check | Status and limit |
| --- | --- |
| Read all A-S and compare with local source/schema/tests/frontend | PASS: review completed; implementation statuses are in the matrix above. This is source evidence. |
| Fresh unit/API execution, database queries/migrations or new Brave scenarios | NOT TESTED: deliberately not executed for this preview. Latest runtime remains the Step 22 failure checkpoint above. |
| File preservation, maintained-document links, MD/Word synchronization and package XML | PASS: all 415 protected source/prior-test/frontend/private files and improve.txt unchanged; all A-S registered; local links/anchors, synchronized Word content/package XML and exactly two docs files checked. These are documentation checks, not runtime acceptance. |
| Word visual rendering | NOT TESTED: package/text synchronization cannot establish page layout or visual quality. |
| Implementation/release actions | None: no application/frontend/private change, database access, migration, reset/seed, backup deletion, commit, push or external team message. |

The detailed machine-readable review/preservation record is retained in ignored .tmp/improve-step23-evidence.json. Only the existing two approved report files remain in docs.

### 13.29 Completed local Step 24: course validation repair

**15 October 2026: approved implementation, PASS.** The owner approved starting the consolidated backlog. This step completes its initial four course-validation repairs and preserves the existing supplied-code contract; G automatic course-code allocation is a separate pending feature. Before editing, the existing 96 course HTTP cases were freshly reproduced: 82 PASS/14 FAIL. The original cases and expected rejections are retained and now pass. The expanded suite has 124 passing checks (123 HTTP and one generated OpenAPI check), including 28 additions. No earlier test suite is rewritten.

| Change | Behavior and verification |
| --- | --- |
| Nonblank normalized code/name | DTO transforms trim only outer string whitespace before validation. Blank create/update values return 400; valid padded values are stored trimmed. Code case, permitted internal spaces/characters and duplicate names remain supported. Post-trim maximum lengths and duplicate-code 409 are checked. |
| Required update null handling | ValidateIf skips only undefined for code/name/department. Explicit null returns 400 rather than reaching Prisma; omission and empty updates retain existing values. Description independently supports omitted/null/empty/raw-space text, accurately typed and documented. |
| Numeric parent precision | IsInt/Min(1)/Max(Number.MAX_SAFE_INTEGER) retains the current numeric department_id payload while preventing rounded/oversized values from reaching BigInt conversion. The raw JSON 9007199254740993 probe and first unsafe numeric boundary both reject with 400/no writes. The safe upper boundary still reaches the existing parent-not-found check. |
| Local path bound | ParseCourseIdPipe extends the unchanged shared parser and checks signed PostgreSQL BigInt bounds before course service calls. All three detail/update/delete routes return 400 for overflow; signed minimum/maximum and precise absent IDs above JavaScript safe range are 404, and leading-zero existing paths remain supported. |
| Swagger alignment | Create/update properties document minimum/maximum, nullability and omission behavior. Complete course responses include department_id and nested departments. Path/input 400 and dependency DELETE 409 responses are documented and asserted from generated OpenAPI. |
| Preserved business behavior | ADMIN writes and all-role reads, authentication failures, partial updates, case-sensitive global code uniqueness, nullable descriptions, ACTIVE-parent policy, legacy inactive-parent omission compatibility and protected offering/rule deletion all pass. No CoursesService, shared parser, Prisma schema/migration or frontend adapter changes. |

**Fresh verification and preservation**

| Check | Actual result |
| --- | --- |
| Before-fix reproduction | 82 PASS/14 FAIL out of 96 HTTP cases, 8.126 seconds. A first sandbox run reproduced the same failures but could not write its result file; the authorized rerun saved the evidence. |
| Expanded focused course suite | PASS: 124 checks, 12.326 seconds. Original 96 test names retained; 27 new HTTP cases and one OpenAPI case. No skipped/focused-only/todo tests. |
| Full units | PASS: 552 tests across 43 suites, 60.875 seconds. |
| Full API | PASS: 1,405 tests across 29 suites, 195.269 seconds. All focused course checks are already included; 1,377 previous total plus 28 additions equals 1,405. No failures/skips/todos. |
| Whole-repository type checking | PASS, zero errors. One new-test assertion typing issue was corrected before final types/full regression without altering its intended expected value. |
| Build, lint, formatting and diff | Build PASS; lint zero errors/five unchanged existing warnings; changed-file formatting and git diff --check PASS. |
| File preservation | 415 baseline files: 411 unchanged and four intended updates (course controller, create/update DTOs and course test suite), plus one new course path pipe. No unexpected source, prior-test, frontend/private, Prisma or improve.txt changes. The ignored preservation helper required Windows path normalization; the actual changed-file set was the intended four. |
| Database preservation and cleanup | Only teacher_evaluation_test. Existing course/department rows and timestamps match snapshots after each case and cleanup; owned CC account/catalog/year/semester/offering fixtures and high-ID department sentinel are absent after the full run. No normal database access or sequence reset, migration or seed. |
| Document checks | Local links/anchors, original FR01-FR44 and new A-S register, JSON examples, synchronized Markdown/Word content, package XML and exactly two docs files checked. Word visual rendering NOT CHECKED. |
| Browser/release actions | New Brave acceptance NOT TESTED. No frontend/private edit, normal migration, backup deletion, commit or push. Changes remain local and uncommitted. |

Source: [create DTO](../src/courses/dto/create-course.dto.ts), [update DTO](../src/courses/dto/update-course.dto.ts), [controller](../src/courses/courses.controller.ts), [new course-only pipe](../src/courses/pipes/parse-course-id.pipe.ts), [expanded tests](../test/courses-crud.e2e-spec.ts). [TESTING repair procedure](../TESTING.md#course-validation-repair-and-verification) gives repeatable commands and isolated-data preconditions. Ignored .tmp/courses-step24-before/focused/unit/api JSON files retain Jest evidence; .tmp/courses-step24-baseline/check/evidence files record preservation, exact totals and cleanup. Historical Steps 22/23 remain available above.

This completes the initial defect-repair step in the combined backlog. Next: settle the frontend revision/department/privacy/cohort/identity contracts required by later work, then D secure first-admin provisioning and P/R prerequisite/self-profile metadata. Independent approved work can proceed while a dependent policy decision waits. C date clearing and all approved progression/PAUSE/RESUME/history/CLOSED-result protections remain retained; no new A-S feature is claimed solely because existing regression passes.

### 13.30 Local Step 25: contract baseline and pending policy decisions

Subsequent delivery: Step 27 supplies P persisted counts and R self-context. The engineering proposal table below is preserved as the Step 25 baseline; current read contracts/results are in Section 13.32. Future P prerequisite/error capabilities, prepared frontend handoff and legacy migration mappings remain pending.

Subsequent owner decision, 15 October 2026: the owner replied "Use these three rules". D25-01-D25-03 below are now approved as specified; this section retains the originally pending review context. Matching prepared frontend delivery and reviewed legacy data mappings remain pending. Section 13.31 implements D without claiming E transfer enforcement or a selected disclosure threshold.

**15 October 2026: source/documentation review, not feature implementation.** This is Step 2 of the combined backlog, following the passing Step 24 course repair. The contract review and decision register below are prepared; the overall sign-off step is not complete while owner policy answers and the matching frontend delivery are unavailable. Three concise policy questions were presented to the owner; no selection or silence is treated as approval. Do not silently change current permissions, transfer behavior or result visibility.

No application/frontend/private source, database, migrations or runtime tests were changed/executed in this step. Latest executed backend evidence remains Step 24: 124 focused course checks, 552 unit/1,405 API tests across 43/29 full suites PASS; zero type errors, build/format PASS, lint zero errors/five existing warnings. These are prior executed results, not new Step 25 test runs.

**Version baseline and source findings**

Backend HEAD remains a298798bc6648b7250760378f201e2ece0daf194 with the previously documented local changes. The frontend directory has no standalone Git metadata; Git discovery resolves to the parent D:/internship repository, which has no resolvable HEAD. It is not an independently versioned frontend delivery. No remote fetch or Git configuration file was changed; the safe.directory override used for inspection applied only to those commands. Ask for the matching frontend repository/revision at handoff, or receive and fingerprint its actual delivered source before browser acceptance. Do not infer its features from improve.txt's descriptions of a prepared version.

Local frontend fingerprint: `22c637a703b31f2a4bcf0607afaa3e6aaff6e1fc1848151db604f3b6ae5913f3`, covering 145 src/public and package/build-entry files from the current preservation manifest. The sorted path/SHA-256 manifest and canonical JSON hashing method are saved in ignored .tmp/contracts-step25-evidence.json. Private environment files and node_modules are excluded from this delivery fingerprint. It identifies only the inspected local source, not an upstream commit or a tested UI build. improve.txt SHA-256 remains `ce8e7bf3c80ec3f16130fdbefbb8d675b1ed0d76887e026fe20ed83baf42d949`.

| Finding | Local source evidence and implication | Runtime status / owner |
| --- | --- | --- |
| F25-01: matching prepared frontend unavailable | Current generation adapter resolves global name and POSTs name; requested capability markers major_scoped_generations, evaluation_activity_v1 and bulk_evaluations_v1 are absent from both current src trees. Existing assignment writes still POST offerings directly. | NOT TESTED as a new UI scenario. Frontend delivery/version handoff remains pending. |
| F25-02: clearing semester dates through this frontend | academicSetup.setupRecordInput omits blank start_date/end_date. Backend C correctly clears with explicit null, but an omitted update retains a saved date. The current adapter cannot express blank-to-null clearing through that serializer. | Source-confirmed frontend integration gap; actual browser clearing NOT TESTED. Frontend team must distinguish retain from clear. No backend C reimplementation needed. |
| F25-03: unknown profile eligibility | normalizeProfile uses context.placement_eligible === true, collapsing absent/null and false into false. It also lacks the newer policy wording described in R. | Source-confirmed adapter behavior; R needs explicit boolean/null semantics and coordinated frontend consumption. No frontend edit authorized here. |
| F25-04: new audience fields on old backend | Existing EvaluationTargetingDto has singular group_scope, no major_ids/group_scopes. Global whitelist validation removes fields absent from DTO metadata; sending future restrictions now could leave a broader existing ALL_ENROLLED request. | Source inference, new HTTP behavior NOT TESTED. Capability/contract-gate the future audience serializer; never send unsupported restrictions as if enforced. |
| F25-05: existing review contract versus Q | Current review store returns REVIEW_STALE, preserves completed results before checking preview expiry and binds actor/kind/resource/input. Q explicitly requires REVIEW_INVALIDATED for drift/concurrent READY duplicates. | Retain existing error codes for current clients; define Q's additive mapping. Do not rename all old errors or discard committed receipts after preview expiry. |
| F25-06: two-write setup/publication | createMissingSemesters loops separate POSTs; current evaluation creation/opening paths are separate. They provide foundations but not B/L atomicity or J/Q bulk creation. | Source review only. Advertise each integrated capability only after its server transaction/receipt implementation is verified. |

**Confirmed contracts to preserve**

| Area | Current or explicitly requested contract | Implementation / sign-off state |
| --- | --- | --- |
| Authentication and authorization | Bearer JWT on protected requests. JWT signature/expiry plus current ACTIVE user/auth_version are checked. Server-authoritative role/ownership checks remain required even when controls are hidden. ADMIN department permission policy is D25-01 below. | Existing behavior retained; no new role or permission inferred from primary department. |
| IDs and scalar types | Response BigInt identifiers are decimal strings. Keep current string-ID contracts for students/profiles/offerings/evaluations/cohorts and exact confirmed participant account IDs. Existing course department_id and semester academic_year_id bodies remain safe JSON integers, not silently converted to strings. generation_number is a future positive JSON integer, separate from generation_id. | Existing route-specific types retained; E's new fields remain unimplemented. Never apply one blanket ID type to every legacy DTO. |
| Student identity | Participant confirmations use users.id; placement/bulk-group operations use students.id. Generation record ID, major ID and generation number are distinct. A class section_code is not a student's yearly class_group. | Explicit current/required distinctions; use source DTOs and generated Swagger for each operation. |
| Dates and access window | Calendar date omission retains, null clears, valid ISO replaces; resulting order is validated. Evaluation timestamps use explicit ISO instants; access requires start_at <= server time < end_at and existing frozen-participant eligibility rules. | C implemented; future publication/window enforcement already supported. M active extension and L atomic creation remain pending. |
| Reviewed operations | Preview binds actor, operation, full input/version/schedule/audience and authoritative state. Confirmation revalidates atomically, uses exact IDs and returns the original committed receipt on identical retry, including after preview expiry. Current preview TTL is 15 minutes. | Existing six reviewed operations provide a foundation. Completed receipt retention has no scheduled purge in inspected code; an operational retention policy still needs documenting before future cleanup work. |
| Audience A/K | Scopes union first, then intersect with enrollment and other explicit restrictions. Reject conflicting/empty restrictions, deduplicate, freeze historical labels/placement context, keep explicit unknown categories and equal count totals. | Explicit requirement; plural scopes/major filter/frozen per-participant placement metadata not yet deployed. Do not broaden or manufacture enrollment. |
| New identities J/O | Offering key excludes section_code; evaluation key is offering-only regardless of questionnaire version/status. Neither change authorizes deleting/merging legacy history. | New requirement accepted for planning; migration/enforcement design requires a collision audit and preservation review. Existing constraints remain unchanged today. |
| Capabilities | Current /auth/me only advertises change_password. E fixes major_scoped_generations; N fixes evaluation_activity_v1 on me and login user; Q fixes bulk_evaluations_v1 on authenticated user payloads. Missing/false means unavailable; true only for fully deployed semantics. | These three future capabilities are absent. Requirements do not fix exact flag names for B/F/G/I/J/L/A; agree them with the matching frontend instead of inventing an advertised API. Login currently has no capability object. |
| Errors | Retain existing validation/auth/permission/not-found/conflict status behavior. Existing reviews use REVIEW_REQUIRED, REVIEW_EXPIRED, REVIEW_STALE and input/operation mismatch codes. O requires 409 EVALUATION_EXISTS with authorized references; Q requires 409 REVIEW_INVALIDATED and REVIEW_EXPIRED no-write failures. | New prerequisite and idempotency codes need an additive contract. Do not leak another actor's review or unauthorized evaluation ID. |
| Results and history | Existing lecturer CLOSED-only/ownership rules and identity-free result/export fields remain. Current responses have no participant/student association or response-major snapshot; arbitrary query slicing is rejected. | A5/S policy/design pending. Frozen audience participation counts are not evidence of major-attributed anonymous answers. |

**Engineering proposals requiring frontend contract agreement before their implementation**

These are reviewable proposals, not callable endpoints, deployed Swagger or owner-approved new school policies. Where improve.txt supplies an exact v1 shape (N/Q), that shape takes precedence over a convenience redesign.

| Work | Proposed contract or fixed requirement | Acceptance gate |
| --- | --- | --- |
| D first-admin provisioning | Proposed command npm.cmd run admin:bootstrap with secure operator input, normal hashing and transactional/concurrency-safe first-admin check; no public route, sample rows or default password. No department needed to create the first ADMIN under current permissions. | Command is NOT IMPLEMENTED. Define empty-installation preconditions and test an owned isolated fixture without resetting shared test records. D can proceed independently of deciding future department-admin permissions. |
| B/F/I year initialization | Propose an explicit setup operation separate from existing CRUD; bind a caller operation key to actor, operation and canonical input. Return saved year/semester IDs and authoritative placement/offering copied/preserved/skipped results. F must cover the documented year-creation paths after its rollout, not only a convenient new route. | Exact route/body/capability/key limits require frontend agreement. Missing-only recovery, integrated transaction/provenance and predecessor ambiguity must be tested. No existing CRUD default changes during this review. |
| G generated codes | Existing POST /courses may omit course_code only after G is deployed; explicit code behavior remains, updates never regenerate. Propose an actor/operation-bound Idempotency-Key header for this non-preview create. Same key plus same input returns original course; changed input fails with a documented conflict. | Exact key validation/retention/capability contract pending. Current Step 24 still requires supplied codes. No unlocked MAX+1 or automatic retry after an ambiguous save. |
| J reviewed offering/enrollment | Add a preview/confirmation pair, exact per-row rosters, one transaction for all offerings/scopes/revisions/enrollments and durable same-ID receipts. Use the agreed new identity excluding labels. | Exact endpoint names, row identifiers and capability name remain proposed, not specified by the current frontend delivery. Preview must create no offerings. |
| L reviewed create/publish | Add an explicit combined operation while preserving existing draft creation/open recovery. Bind the full review and freeze/publish in one transaction, with original-ID retries and no orphan draft. | Agree explicit route/body and capability; do not silently turn every legacy POST into automatic publication. |
| N activity v1 | Use the exact requested ADMIN GET /evaluations/:id/activity shape, actions, actor snapshots, before/after, opaque keyset cursor and same-transaction events. | Bound limit/cursor, define event ordering, retention/tombstones and legacy-history availability before deployment. No event model/route yet exists. |
| Q bulk v1 | Use exact POST /evaluations/bulk-create-preview and /evaluations/bulk-create shapes from improve.txt; max 50 distinct offerings, ALL_ENROLLED, explicit latest versions, complete READY/SKIPPED/BLOCKED roster and exact READY confirmations. | All-or-nothing revalidation/create/freeze/publish/events; concurrent READY duplicate invalidates all writes. Committed receipt survives preview expiry. No client loop fallback. |
| P/R read metadata | P: true persisted _count.enrollments, year/semester context and meaningful unavailable versus zero. R: add complete self-only student.academic_context for profile_academic_year, including record/group/major, effective year/progression and eligibility/reason. | Preserve existing profile fields and selected-year semantics, with no older-record group fallback or extra admin-list fetch. Existing class labels remain separate from groups; profile missing-context eligibility must be explicit null. |

**Owner decision register**

| Decision | Existing protection / proposal | Status and affected work |
| --- | --- | --- |
| D25-01: ADMIN department scope | APPROVED: ADMIN remains school-wide. Primary/multiple department memberships remain profile metadata; major/course department consistency still applies. First-admin setup needs no pre-existing department assignment. | Owner: "Use these three rules", 15 October 2026. Existing role behavior retained; no new department-restricted admin role inferred. |
| D25-02: transfer cohort policy | APPROVED: require an explicitly selected destination-major cohort and preserve prior academic history. Never guess an equivalent generation number or relabel old placements/targets from the current cohort. | Owner approval recorded 15 October 2026. E schema/history mapping and enforcement remain NOT IMPLEMENTED; approval is not proof that the current mutable generation link represents every historical cohort. |
| D25-03: release, suppression and major answer slicing | APPROVED: retain CLOSED-only lecturer results; keep major-filtered answers unavailable until school-approved minimum-response/text/export/filter disclosure rules and a privacy-safe design exist. Frozen audience counts are separate. | Owner approval recorded 15 October 2026. Current release remains implemented; no numeric threshold was selected, no response/student link added and A5/new S suppression remain DEFERRED. |
| D25-04: legacy collision/mapping disposition | J/O stronger uniqueness and E major ownership need explicit mappings/grandfathered-history handling for real conflicts. Never merge/delete existing evaluations or infer cohort ownership from present placements. | PENDING REAL-DATA AUDIT AND REVIEWED MAPPINGS. Subsequent Step 28 supplies the isolated E preflight, synthetic classifier cases and migration design; it approves no mappings and performs no migration. J/O collision audits and normal operational work remain separate. |
| D25-05: prepared frontend contract delivery | The inspected source differs from several prepared-frontend descriptions; the local fingerprint is the current evidence boundary. | PENDING MATCHING REVISION/DELIVERY. No external team contact authorized or sent. Exact future optional capability/endpoint contracts require frontend-team review. |

An approved choice will be recorded with its date and scope in this register; it does not imply approval for unrelated migrations, normal data changes, commits or releases. Pending choices block only dependent changes. At the original review D was the next independent candidate; it is now completed by Step 26. P/R read contracts are next under the approved school-wide authorization behavior. The remaining A-S roadmap in Section 13.28 stays in force.

**Actual checks and acceptance limits**

| Check | Result |
| --- | --- |
| Source/contract audit | PASS for inspected code and A-S requirement text; findings and current/proposed contracts above. It is not stakeholder sign-off. |
| Policy decisions / matching prepared frontend | BLOCKED pending the specific answers/revision; no default/preselection counted as approval. |
| Preservation and maintained documentation | PASS: all 416 current source/test/frontend/private baseline files and improve.txt unchanged; Markdown/Word text/package, local links and original/new requirement registers checked; docs still contains exactly two reports. |
| Newly executed unit/API/browser tests or database access | NOT TESTED / none in this step. Latest runtime remains the passing Step 24 checkpoint. |
| Word visual rendering | NOT TESTED. Content/package checks do not establish visual page quality. |

Source references: [auth service](../src/auth/auth.service.ts), [JWT strategy](../src/auth/jwt.strategy.ts), [role guard](../src/common/guards/roles.guard.ts), [review store](../src/reviewed-workflows/reviewed-operation.store.ts), [serializable transaction helper](../src/common/utils/serializable-transaction.util.ts), [placement resolver](../src/common/utils/student-placement.util.ts), [targeting DTO](../src/evaluations/dto/evaluation-targeting.dto.ts), [Prisma schema](../prisma/schema.prisma), [existing consistency/review assertions](../test/consistency.e2e-spec.ts), frontend [API adapter](../../teacher-evaluations-frontend/src/services/apiClient.js), [setup serializer](../../teacher-evaluations-frontend/src/services/academicSetup.js), [generation resolver](../../teacher-evaluations-frontend/src/services/backendContracts.js), [review helper](../../teacher-evaluations-frontend/src/services/reviewedWorkflows.js) and [profile adapter](../../teacher-evaluations-frontend/src/services/userProfile.js). No source file was edited for these findings.

### 13.31 Completed local Step 26: approved policies and first-admin provisioning

Subsequent status: Step 27 implements the P/R read-metadata work proposed at this checkpoint. The earlier 552/1,443 verification remains historical; latest results are in Section 13.32.

**15 October 2026: owner rules approved; D implementation PASS.** The owner replied "Use these three rules" after the explicit recommendations: ADMIN manages all departments; a major transfer requires an explicit destination-major cohort while preserving prior history; lecturer results remain CLOSED-only and major-filtered answers stay unavailable until the school approves disclosure rules. No response threshold was selected. D25-01-D25-03 in Section 13.30 are updated with this approval; this does not authorize guessing legacy mappings, normal migrations, commits or releases. Current school-wide/CLOSED-only behavior stays in place. Transfer-cohort storage/enforcement remains part of future E, and A5/new S filtering/suppression is deferred.

**Delivered command and behavior**

The backend now has npm.cmd run admin:bootstrap, implemented by [CLI](../scripts/bootstrap-admin.cjs) and [provisioning transaction](../scripts/lib/first-admin.cjs). It uses the existing Prisma model and bcrypt implementation (cost 10) without adding a dependency, HTTP bootstrap endpoint, schema migration or sample seed. The command requires operator name/email/password, normalizes name/email, enforces input and bcrypt byte limits, and either hides both password entries in a terminal or reads a bounded UTF-8 JSON object through explicit --stdin. No password is accepted through command arguments or supplied by default. Help is safe without a database connection; output contains only controlled messages and the new ID/role/status, not credentials/hashes.

It reads an explicitly configured DATABASE_URL from the existing environment/selected env file and displays only target database/schema names. Existing environment values have priority. NODE_ENV=test restricts it to local teacher_evaluation_test. It requires all repository migration names to be successfully applied, then uses one ReadCommitted transaction with a bounded lock wait and SHARE ROW EXCLUSIVE locks on all application tables plus the migration ledger. The empty-state check follows lock acquisition, so a second CLI process sees the first committed administrator and refuses. Existing ADMIN accounts (ACTIVE or INACTIVE), other accounts and school records are never reset or overwritten. The unchanged AMS department created by a historical migration is the only permitted academic baseline; no new department/academic/sample rows are added. Migration-ledger readiness is not a schema-drift/checksum audit. The CLI does not migrate or seed.

For operator instructions and safe commands, see [README setup](../README.md#secure-first-administrator-setup) and [TESTING verification](../TESTING.md#secure-first-admin-command-and-isolated-verification). On an existing seeded/shared database, refusal is correct. Do not clear records to force an empty-installation test, and do not treat this command as recovery/password reset. No normal installation was provisioned during this delivery.

| Acceptance area | Actual evidence |
| --- | --- |
| Fresh account and boundaries | PASS: one ACTIVE ADMIN, normalized email/name, bcrypt cost 10/hash verification, exact safe receipt; 150-character Khmer name/72-byte password accepted; invalid/missing/blank/oversized/unknown fields and byte overflow reject. |
| Real authentication/setup | PASS: provisioned account logs in, reads /auth/me with no department assignment and creates a department, major, year and semester through real Nest guards/controllers. Unauthenticated staff creation remains 401. |
| Reruns/concurrency/atomicity | PASS: existing ACTIVE/INACTIVE administrators refuse without changed snapshots; two separate CLI processes create one account and return ADMIN_EXISTS for the loser; injected post-insert failure rolls back. |
| Empty/migration guards | PASS: existing student/lecturer/year/extra department refuses without writes; unfinished migration ledger refuses; test-mode normal URL rejects before connection; unexpected connection errors do not expose secrets. |
| Input/output and prompting | PASS: real stdin CLI success/error cases, malformed/8192-byte bounded input, secret-argument rejection, help/noninteractive behavior, hidden password/matching/cancelled prompting with automated terminal streams. No password/hash/URL credential output. Manual Windows Terminal interaction NOT TESTED. |
| Focused and full runtime | Final focused 38 PASS (23.815 seconds); fresh full unit 552/43 suites PASS (67.583 seconds), full API 1,443/30 suites PASS. Added 38 are included in the full total, not added twice. No failures/skips/todos. |
| Engineering | Whole-repository types zero errors, build/format/diff PASS; lint zero errors/five existing warnings; both new CJS scripts separately linted. |
| Preserved source/config | 416-file baseline: 415 unchanged, package.json adds only the command, plus three new files (two scripts and one test suite). All prior source/tests, frontend/private, schema/migrations and improve.txt unchanged. |
| Isolated fixture/cleanup | Only teacher_evaluation_test. Collision-checked owned schema replays 18 migration names/28 tables; three hard-coded public.survey_title_key references redirected only in temporary migration copies. Shared public application/ledger content fingerprints and sequence last values unchanged after every case; owned schema/folder removed. |
| Documentation and limits | Four approved documents updated; original requirements/evidence and A-S register retained, links/JSON/Word package/content checked. No new browser acceptance or Word visual rendering; production readiness not established. No normal access, shared/public migration/seed/reset, backup deletion, commit or push. |

An initial focused run recorded 23 PASS/15 FAIL because an incorrect class-validator helper export was used in new CJS validation. This was corrected without weakening any expected result; final focused/full checks pass. JSON parsing now handles malformed input separately so unexpected programming errors are not mislabeled as invalid credentials. The failed result remains in ignored .tmp/admin-step26-focused.json; final focused/unit/API results and preservation/cleanup evidence remain alongside it.

**Testing isolation and next work**

[test/admin-bootstrap.e2e-spec.ts](../test/admin-bootstrap.e2e-spec.ts) creates a new owned bootstrap_test_<UUID> schema inside the already guarded isolated database, rather than resetting the shared test installation. It builds temporary copies of all migrations and redirects only the three reviewed schema-qualified function references so no public function is recreated. This is a namespace-adapted feature fixture, not a normal production migration rehearsal. The API overrides PrismaService with the owned-schema client, and after each case compares every shared public application table and migration ledger by row count/content fingerprint plus public sequence last values. Cleanup verifies the exact database and generated schema identifier, and checks the resolved temporary folder remains directly inside the intended .tmp directory before deletion. It never removes unowned backup/test records.

D is complete for the specified tested contract. Next implement P persisted enrollment counts/prerequisite metadata and R complete self-profile academic context, preserving route-specific ID types and self/role authorization. Matching prepared frontend delivery and contract acceptance remain pending. E will apply the approved explicit transfer-cohort rule through a reviewed history-preserving model/migration; the approval does not remove that implementation work. Lecturer answer slicing/suppression stays deferred until the school supplies disclosure rules, while current CLOSED-only release and frozen audience metadata remain distinct.

### 13.32 Completed local Step 27: enrollment counts and self-profile context

**15 October 2026: PASS for P/R read metadata.** Generic course-offering list/detail now exposes _count.enrollments from the persisted Prisma enrollment relation, including zero. The shared include also supplies it in existing create/update responses; separate lecturer-own assignment output is unchanged. Counts remain tied to each offering/semester, not current global placements, group-scope totals or frozen evaluation membership. Existing semester/year metadata, access and row ordering remain. No participant identities are added and no future capability is advertised. P's broader structured prerequisite errors/capabilities will be implemented with E/J/L rather than marked complete here.

/auth/me now adds student.academic_context through a dedicated safe projection of StudentsService's existing resolver. It includes selected-year metadata, actual year-scoped placement/group/major, generation entry context, calculated/effective year/source, progression/anchor and placement eligibility/reason. It does not duplicate progression calculation or expose the administrative row, private notes, account secrets, full historical placement arrays or evaluation_progress. Legacy generation/effective_placement/profile_academic_year remain; current-year major still comes only from the explicit current record. Staff shapes and absent student:null remain compatible.

| State | Authoritative behavior |
| --- | --- |
| Resolved eligible placement | placement_eligible=true, reason null, actual selected-year record/group and effective year. Assigned evaluations are not required. |
| Missing current-year record/group | No older group substitution. academic_record is null when absent; eligibility=false with MISSING_YEARLY_GROUP. Shared progression may still calculate an effective year/anchor. |
| PAUSE, RESUME and REPEAT | PAUSE remains in force across NORMAL; only RESUME restores eligibility. Approved repeat year remains authoritative instead of being overwritten by generation arithmetic. |
| Unavailable/mismatched academic context | Eligibility, progression and placement are explicitly null, not false. Preserve the known selected year where available; missing linked student stays student:null. |
| Self/role permissions | JWT identifies the account; query IDs/year cannot select someone else's profile. Student editing remains ADMIN-only, disabled accounts fail authentication, and students retain authenticated academic-year reads. |

**Executed checks**

| Check | Actual result |
| --- | --- |
| Discovery | 24 new API cases: seven PASS/17 FAIL. One new lecturer-results assertion used the wrong existing nesting and was corrected to evaluation.id; the other failures reproduced absent counts/context/docs. Original discovery file retained. New-test fixture/schema typing errors were fixed before final checks. |
| Focused units | 62 PASS across auth, new safe projection and offerings. Eight new units cover safe allowlisting, exact true/false/null, selected-year mismatch and no old-group fallback. Three existing auth expected objects add the new property; all previous fields/status expectations remain. |
| Focused API | 24 PASS, 10.449 seconds. Read-only full profile and active-year preference despite a newer inactive year; role/auth/self isolation; missing record/group; PAUSE/RESUME/repeat; eligibility without assigned evaluations; complete semester metadata and counts independent of scopes/frozen/history. Generated Swagger count example/profile nullability descriptions checked. |
| Full regression | 560 unit/44 suites PASS (56.8 seconds); 1,467 API/31 suites PASS. Added eight units/24 API cases are included: 552 + 8 and 1,443 + 24. Focused counts are not added again. No failures/skips/todos. |
| Types/build/lint/format | Zero whole-repository type errors; build/diff PASS; lint zero errors/five existing warnings. New projection/tests and offering changes formatted; original auth formatting retained to keep the change reviewable. |
| Preservation/cleanup | 419-file baseline: 414 unchanged/five intended updates plus three new files. Shared resolver, frontend/private, prior other tests and Prisma schema/migrations unchanged. All pre-existing rows in 28 application tables plus ledger retained after every case and the exact set restored after cleanup. Every checked read/rejection compares whole-table fingerprints before/after; owned MR fixtures removed. Test sequences advance normally with synthetic rows and are not reset. |
| Acceptance limits | No new Brave or actual frontend-helper execution, lecturer text/export UI acceptance or visual Word rendering. New lecturer metadata regression has no submitted answers; it preserves CLOSED release/identity shape while prior full result/comment tests remain separate evidence. No major slicing/suppression implemented. |

The new [HTTP suite](../test/read-metadata.e2e-spec.ts) requires idle teacher_evaluation_test/public with no pre-existing active year and fails before writes otherwise. It owns five accounts, two student profiles and their records, academic fixtures and questionnaire/evaluation rows; it never deactivates another tester's active year. Metadata writes used only to arrange owned test cases are distinguished from read-only API requests. Cleanup removes only those owned IDs; pre-existing record fingerprints are compared without printing private values. The retained bootstrap regression still runs its own temporary migration fixture; no normal/shared schema migration is part of this change.

Implementation: [safe projection](../src/auth/student-self-context.ts), [projection units](../src/auth/student-self-context.spec.ts), [auth service](../src/auth/auth.service.ts), [auth Swagger descriptions](../src/auth/auth.controller.ts), [offering include](../src/course-offerings/course-offerings.service.ts) and [offering Swagger example](../src/course-offerings/course-offerings.controller.ts). [TESTING](../TESTING.md#enrollment-count-and-self-profile-read-verification) documents complete field semantics, a JSON excerpt and commands. The original auth formatting was reconstructed only after verifying its bytes against the pre-step baseline; other prior local changes were not overwritten. Ignored .tmp/metadata-step27-before/focused-unit/focused-api/unit/api/evidence files retain results and scope qualifications.

R's backend read contract is complete for the tested scenarios. Current frontend still needs honest unknown eligibility normalization and privacy wording, and the prepared revision must be supplied for complete UI acceptance. P persisted counts/read context are complete; future prerequisite errors/feature flags remain pending with their workflows. Next E: review the major-scoped cohort/history model and explicit ownership/collision mappings, applying the approved destination-major transfer cohort rule without relabeling historical placements/targets. No normal migration, seed/reset, backup deletion, commit or push is authorized or performed by this checkpoint.

### 13.33 Local Step 28: E cohort preflight and migration design

**15 October 2026: read-only preflight PASS; E write contract/migration NOT IMPLEMENTED.** This checkpoint continues the approved destination-major transfer rule D25-02. It adds a reusable isolated audit, synthetic classifier/guard tests and the design below. It changes no application routes, Prisma schema, migrations, existing tests, frontend or private configuration. It applies no cohort mapping. The latest full application results remain Step 27's recorded 560 unit/44 suites and 1,467 API/31 suites; neither full suite was rerun in this checkpoint.

**Evidence and actual isolated findings**

The [CLI](../scripts/generation-preflight.cjs) reads only .env.test.local, requires NODE_ENV=test, matching DB_NAME and a local teacher_evaluation_test/public URL, then verifies the actual database/schema. The [collector/classifier](../scripts/lib/generation-preflight.cjs) sets PostgreSQL READ ONLY before application queries, inside REPEATABLE READ transactions. It selects cohort/profile/placement/scope/target evidence; it does not select names, emails, student codes, credentials or answer content into the report. Legacy cohort names and captured labels are used internally but only IDs, counts, issue codes and fingerprints are emitted. IDs in this administrative review are not a public endpoint or lecturer result.

| Isolated observation | Actual result and meaning |
| --- | --- |
| Population | 3 legacy cohorts, 11 current profiles and 9 academic records. All are existing isolated data; no new database fixtures were created by this checkpoint. |
| Numeric conversion | All 3 cohort names are unparseable under the conservative integer/Gen N compatibility parser. Each needs an explicit reviewed number or retention as a read-only legacy reference. Arbitrary fixture labels are allowed by the old contract; this is a migration input issue, not evidence of broken current CRUD. |
| Ownership | 2 cohorts each have one observed major, which still does not establish original ownership. The remaining cohort has no major evidence: its 2 profiles have no academic placement. Current-profile association never proves which cohort a student belonged to in a past year. |
| History and frozen references | 2 cohorts have placement history without stored per-year cohort identity. One has an offering scope and a captured generation target. Preserve this reference and its original labels; never guess a numeric value inside the old snapshot. |
| Collisions | 0 parseable candidate collisions. Since all 3 numbers are unresolved, this does not rule out collisions after reviewed numeric assignment. No multi-major student history was observed in this dataset; synthetic tests cover that case. |
| Preservation | All 28 application tables plus the migration ledger have equal before/after row fingerprints; ledger contains 18 rows. All 24 public sequences retain last_value and is_called. Actual transaction_read_only=on and isolation=repeatable read. This verifies this audit, not a new migration or a fresh normal-database certification. |

Input source SHA-256: cd0c489927d21d1e598e5d19450d1dc7bddb044b3ff249f2f3aa77d9160a9476. Before/after database-state SHA-256: e3039699cfa844dff065cab197e9e1d49a147996016545bdfb52f4b7b721b378. Local evidence is retained in ignored .tmp/generations-step28-audit.json and .tmp/generations-step28-evidence.json. Fingerprints are review bindings, not a backup or authorization to modify rows. Each collector uses one consistent snapshot; any different before/after state makes the CLI fail and requires coordinating concurrent isolated testers.

**Why a new column alone is insufficient**

At the Step 28 checkpoint, the [schema](../prisma/schema.prisma) had globally unique student_generations.name and one mutable students.generation_id. student_academic_records stores the major/year/group/progression action, but no generation_id. [Personal profile updates](../src/students/students.service.ts) can currently change the single cohort independently; [academic-record writes](../src/student-academic-records/student-academic-records.service.ts) do not select a destination cohort. [Imports](../src/students/student-import.service.ts) resolve global case-insensitive names. Generation lists sort text; [eligibility](../src/common/utils/student-placement.util.ts), enrollment and reviewed selection consumers use the profile's cohort. Merely adding major_id would reject valid transfer history or reinterpret earlier years through today's cohort. These are source findings, not newly executed CRUD failure cases.

The historical-label migration protects the entire target row from UPDATE, not only its JSON fields, and currently accepts schema_version=1. A migration must not update old target foreign keys, disable the protection, fabricate missing snapshots, or overwrite captured labels to make a split fit. Existing responses contain no student/participant link. Preserve this separation; cohort migration cannot reconstruct answer ownership or enable major-filtered answer slicing.

**Proposed implementation design; no SQL or API change applied**

| Area | Concrete design and acceptance boundary |
| --- | --- |
| Canonical cohort identity | Keep the BigInt record id. Add major_id FK and positive INTEGER generation_number, bounded 1..2147483647, UNIQUE(major_id,generation_number). Numbers are JSON integers; IDs remain decimal strings. Remove global text-name uniqueness as identity for new cohorts; retain legacy labels only for compatibility/history display. Numeric order is independent within each major. |
| Legacy compatibility | Use an explicit LEGACY_READ_ONLY versus MAJOR_SCOPED state during expansion. Canonical rows require both ownership fields; legacy rows remain identifiable and cannot be used for new assignments/imports. Reviewed unambiguous rows may retain their old ID; shared/unknown rows retain the old ID for historical reads while separately created canonical rows receive new IDs. Same-number aliases with different entry metadata cannot be merged automatically. |
| Placement and transfer history | Add generation_id to yearly records, with an immutable assignment/mapping audit trail. Reviewed known history links to its actual cohort; unknown old history stays explicitly unresolved and readable. Require a valid cohort/major pair for every new placement. TRANSFER atomically records explicit destination generation_id, destination major/year/level/group and the assignment event; preserve older records/cohort links. A current-profile cohort may remain a compatibility pointer but is never the historical source of truth. |
| Selected-year resolution | Resolve cohort from the selected year's record or a reviewed prior assignment timeline, never from a later/current profile cohort. Unknown chronology/ownership remains unresolved. PAUSE persists across NORMAL, REPEAT and TRANSFER until RESUME; a transfer cannot implicitly resume. Missing yearly assignment/group still blocks placement eligibility; no old group fallback. Backdated/future assignments and protected corrections need reviewed chronological validation and audit, not a raw profile-link edit. |
| Ownership enforcement | Enforce new cohort/major pairs in initial creation, import, placement, filters, group options, offering scopes, enrollment and evaluation targeting. Use composite FK/unique keys where applicable, plus transaction validation for legacy read-only rows. Change every shared consumer of progressionStudentSelect/resolveStudentPlacement and reviewed placement fingerprints together. A foreign key on the cohort alone does not enforce matching majors. |
| Write/read contracts | Implement E's POST/import payloads and major-qualified response/export metadata. Normalize 5, "5", "05" and "Gen 5" only inside explicit major context; reject invalid/ambiguous values before writes. Existing personal edits can keep an unchanged legacy link. Reuse an existing pair's own entry metadata, retain import retries/skips and reject mixed-major rows atomically. No capabilities.major_scoped_generations=true until all write/validation/read semantics are deployed, including empty catalogs. |
| Enrollment and frozen evaluation metadata | Shared ALL_ENROLLED may include DS Gen 5 and FE Gen 1 by distinct cohort IDs; never require equal generation numbers. Keep old frozen targets on their original reference. New snapshots need versioned cohort ID/number/major metadata; extend SQL validation to accept the new snapshot version while retaining version 1 and the immutable-row trigger. Frozen participants and anonymous responses remain unchanged. A new snapshot never retroactively supplies missing old labels. |

**Explicit mapping manifest and migration sequence**

The audit intentionally emits no approved owner or executable mapping. A restricted, reviewed manifest must bind both the input fingerprint and full database-state fingerprint to its schema/manifest version, reviewer and review date. Each legacy cohort needs disposition KEEP_ID_AS_CANONICAL, SPLIT_KEEP_LEGACY_REFERENCE or RETAIN_UNRESOLVED; explicit major_id/number/entry year/starting level for each canonical destination; evidence and reason. Record every affected current profile, yearly placement and live offering scope by primary key with expected old values and approved destination; use a restricted administrative mapping file rather than public student identifiers. Record every frozen target as KEEP_ORIGINAL_REFERENCE, with unchanged label hash and capture time. Record existing enrollments, participants, drafts, responses and progression exceptions as preserved rows. New-ID allocation must be recorded in the audit trail; IDs cannot be guessed from cohort numbers.

| Order | Work and pass condition |
| --- | --- |
| 1. Expand in isolated fixtures | Prepare schema/migration code and synthetic mapping fixtures for shared/unknown cohorts, transfers, aliases and conflicting entry metadata. Add canonical/legacy constraints, yearly cohort history and assignment audit without deleting existing rows. No normal migration. |
| 2. Validate reviewed input | Reject unreviewed/incomplete/stale manifests, duplicate destination pairs, invalid IDs, missing relation dispositions, incompatible chronology and overwritten frozen references before any write. Re-read the bound state inside the protected apply transaction; do not trust a prior CLI audit during concurrent writes. |
| 3. Map atomically | Preserve IDs where reviewed; allocate new IDs for split destinations; map only explicitly approved profiles/yearly records/live scopes. Keep unresolved and frozen legacy references readable. Capture immutable before/after mapping evidence. Roll back all application changes on conflict; record committed retry identity so an exact retry returns the original result. |
| 4. Deploy coordinated contracts | Update DTOs, Swagger, selected-year resolver, filters, import/export, reviewed contexts, new labels and capability availability together. Outstanding previews must re-review when relevant mapped context changes; retries of already committed confirmations must still return their original result. |
| 5. Prove preservation | On isolated migration fixtures, compare all original rows/IDs and approved changes, foreign keys, unique/check constraints, exceptions, labels, enrollments, drafts/participants/results and recorded ID allocations. Test invalid/stale/collision rollback, independent major numbering, explicit transfers, persistent pause and concurrent duplicate creation/import. Rehearse recovery rather than assuming a transaction proves restore. |
| 6. Review real data separately | Normal school data has not been audited in this checkpoint. Obtain the separately authorized operational review, real mappings, verified backup/restore and rehearsal before any normal application. Keep legacy references until every historical dependency has a safe disposition; no erase/reseed or blanket merge. |

**Verification and what remains**

| Scenario | Status and actual evidence |
| --- | --- |
| Audit parser, ambiguity/collision classifier and guards | PASS: 40 Node tests, including bounds, aliases, arbitrary labels, DS/FE independent number 1, differing entry years/levels, shared cohorts versus individual transfer, PAUSE counts, immutable-label distinctions, exact BigInt IDs, no identity output, source immutability and rejected non-test configurations/contexts. These are classifier/guard fixtures, not proof of deployed E database constraints. |
| Real read-only isolated audit | PASS: 1 additional Node test; repeated collection agrees, all row/ledger/sequence fingerprints remain equal. Total new checks: 41 PASS, zero failures/skips. The CLI was separately executed and saved its sanitized review. |
| Engineering and prior work preservation | PASS: scoped CJS lint and formatting, whitespace diff check; all 422 pre-step application/frontend/config/schema/test files unchanged, plus 3 new audit/test source files. No dependencies or package command changed. |
| New E HTTP writes, enforced transfer history and migration rehearsal | NOT TESTED; implementation has not been delivered. No capability flag is enabled. The audit and design do not resolve the 3 mappings. |
| Matching frontend/Brave acceptance | NOT TESTED in this checkpoint; matching prepared revision remains pending. Existing partial browser evidence is preserved separately. |
| Normal-data mapping, recovery, performance and deployment | NOT TESTED here; require separate operational work and evidence. Documentation package/text checks do not establish production readiness. |

Next implementation slice: prepare the expansion/history migration and explicit synthetic manifests, then demonstrate preservation and refusal/rollback on the isolated database before enabling E write contracts. The school rules are already approved; actual legacy mappings still require concrete evidence/review. No normal records, backups, commits or remote branch were changed. Word text/package synchronization is checked separately; visual Word rendering remains NOT CHECKED.

### 13.34 Local Step 29: isolated cohort expansion and mapping fixtures

**16 October 2026: candidate expansion PASS in owned fixtures; E public schema/API delivery remains pending.** This continues Step 28 and the approved explicit destination-major transfer policy. The [candidate SQL](../scripts/migrations/major-scoped-generations-expand.sql) is deliberately outside prisma/migrations; it rejects execution unless the actual database is teacher_evaluation_test and the current schema matches an owned cohort_test_<UUID> fixture. It is not a production migration command. No active Prisma model or existing migration was changed, and the current application still uses the original cohort contract. No E capability is enabled.

**Implemented and exercised foundation**

| Candidate behavior | Actual fixture verification |
| --- | --- |
| Major-owned integer identity | Positive INTEGER generation_number and major_id FK, UNIQUE(major_id,generation_number), separate BigInt primary key. DS Gen 1 and FE Gen 1 coexist with distinct IDs/entry years; display labels may duplicate. Same-major collisions, missing major, zero/negative/overflow reject; maximum integer and an ID beyond JavaScript safe integer work. Two concurrent same-major creations yield exactly one persisted row. |
| Legacy preservation | All existing cohorts initially become LEGACY_READ_ONLY with null ownership fields. The expansion does not guess ownership/numbers, rewrite names or change entry metadata. Explicitly mapped unambiguous cohorts can retain the original ID with mapping provenance; shared cohorts can retain the old reference while separate canonical rows receive new IDs. New unowned cohorts and raw legacy rename/delete reject. Canonical ownership/number/entry identity cannot be relabeled. |
| Year-specific cohort history | Existing yearly records gain nullable generation_id without inferred backfill. New records require a canonical cohort matching their major. A resolved yearly identity cannot be moved to a different student/year/major/cohort; profile-pointer changes cannot rewrite it. A deferred constraint requires matching immutable assignment evidence in the same transaction. |
| Mapping and assignment journals | Add cohort_mapping_operations and student_cohort_assignment_events. Operations retain manifest/source fingerprints, explicit synthetic review metadata and the manifest; events retain the yearly record/cohort/major and operation or prior-cohort context. UPDATE/DELETE guards protect both journals. The fixture supplies these records explicitly; a general reviewed-manifest executor, authorization, stale-state validation, receipt/retry recovery and real-data review are NOT IMPLEMENTED by these tables. |
| Explicit transfer foundation | A new TRANSFER event needs the selected destination cohort and a prior resolved cohort for the same student in an earlier structured year. An INITIAL event cannot substitute. The earlier yearly cohort remains unchanged. Full selected-year resolution, ambiguous chronology, protected corrections and persistent-pause enforcement across all API consumers still require the coordinated E application changes; this SQL fixture does not establish that new API behavior. |
| Offering-scope ownership | New/changed scope identities require a major-owned cohort matching the scope major. Unchanged legacy scope references remain readable. An explicitly selected live scope may be mapped; old frozen generation/group targets retain their original IDs and label JSON. Their existing whole-row immutable trigger remains intact. |

Candidate schema metrics: **30 application tables / 221 columns**: the 28-table/199-column baseline plus two audit/history tables and five columns on existing tables. The 18 baseline migration copies are deployed only into the temporary owned namespace before the candidate DO block. This is a namespace-adapted expansion prototype, not the official 19th migration or proof that normal/test public schemas now contain these fields. The fixture redirects only the three reviewed public.survey_title_key references; originals are unchanged. No old snapshot-version constraint, response model or student-to-response relationship was changed.

**Actual migration and preservation evidence**

The [35-case integration suite](../test/cohort-expansion.e2e-spec.ts) uses the [owned fixture helper](../test/helpers/cohort-expansion-fixture.ts). Its synthetic baseline includes every application table, repeated/transferred/paused/resumed yearly records, a pinned curriculum revision, enrollments, CLOSED evaluation targets with captured labels, completed/unfinished participants, a protected draft, questionnaire/version/options, an anonymous response/answer and a completed reviewed-operation receipt. These accounts are storage fixtures with non-login password hashes; they are not frontend test credentials.

An injected exception at the end of the candidate DO block proves all candidate DDL rolls back: original rows and the old column shape remain, and the next clean expansion succeeds. Re-executing the expansion fails without partial changes; this is an expand-once SQL candidate, not an idempotent mapping command. A later mapping conflict rolls back the operation journal, newly allocated cohorts and earlier mapped records together. Deferred constraints are explicitly forced before rollback-only tests finish; successful test callbacks do not bypass their validation.

The committed synthetic manifest splits one shared legacy cohort into explicit DS/FE destinations, maps six yearly records and one current profile/live scope, and keeps the shared legacy reference for frozen targets. Assertions compare every original application/ledger value, allowing only the explicitly approved profile/scope pointer differences; added canonical rows and yearly cohort links are checked separately. Student/year/major/group/level/progression values, original timestamps, questionnaire history, frozen labels, participants/draft and anonymous response/answers remain unchanged. Progression actions remain NORMAL, REPEAT, TRANSFER, PAUSE, NORMAL, RESUME. This proves preservation of those stored actions, not newly implemented eligibility logic.

After every test the shared public application/ledger row fingerprints and all public sequence last_value/is_called states match the fixture's initial snapshot. Rollback-only cases also restore the owned row baseline; the successful mapping/concurrency cases commit intentionally inside that disposable namespace. Cleanup checks the exact database/schema and resolved temporary folder before removing only owned fixtures, verifies the namespace is absent and rechecks public preservation. It resets no shared sequence. Other existing full-regression suites still create/clean their own public synthetic rows and may advance isolated test sequences normally.

Fresh post-regression read-only catalog check: teacher_evaluation_test/public still has **28 application tables, 199 columns, 18 successful migrations and 24 sequences**, with zero cohort_test_ namespaces left. Normal teacher_evaluation was not queried or migrated; its same baseline remains recorded delivery evidence. No existing public cohort or normal school cohort was assigned a new number/major by this step.

| Verification | Actual result |
| --- | --- |
| Focused candidate expansion | PASS: 35 cases, one integration suite. These are database integration cases, not browser scenarios or new HTTP write-contract acceptance. |
| Fresh full regression | PASS: 560 unit tests/44 suites; 1,502 API/integration-runner cases/32 suites. The 35 new cases are included in 1,502, not additional to it. No failures/skips/todos. Step 28's 41 standalone Node checks remain prior evidence and were not rerun here. |
| Engineering | Whole-repository no-emit types zero errors, build PASS, lint zero errors/five existing warnings, new TypeScript formatting and whitespace diff PASS. |
| Source preservation | All 425 protected pre-step source/test/frontend/config/schema/migration files unchanged, plus three new SQL/test/helper files. No dependency, package command, application service or private configuration update. |
| Initial failures and correction | Initial sandbox EPERM prevented fixture-directory/result-file writes; rerun with permitted access. The first executable run failed during new-fixture setup because SYNTHETIC_HISTORY is not an allowed reviewed-operation kind. The fixture was corrected to CREATE_EVALUATION; the existing check and expected behaviors were preserved. Then 30 cases passed; the expanded final suite passes 35. No existing application defect was inferred from these setup failures. |
| UI, normal operations and release | NOT TESTED: new Brave E workflows, normal mapping/migration, official recovery, school-scale performance and production acceptance. No normal access, backup deletion, commit or push. Word package/content/link checks run separately; visual rendering NOT CHECKED. |

Ignored evidence: .tmp/cohort-step29-focused-api.json, .tmp/cohort-step29-full-unit.json, .tmp/cohort-step29-full-api.json, .tmp/cohort-step29-evidence.json and .tmp/cohort-step29-after-baseline.json. Requirement source remains the Step 23 improve.txt hash. The candidate hard guard intentionally prevents shared deployment; do not remove it or copy this SQL into the active migration chain as an operational shortcut.

**Next E work:** implement a validated reviewed-mapping executor against these owned fixtures, including complete relation dispositions, expected-old-value/full-state bindings, authorization boundaries and durable retry receipts. Then coordinate active Prisma models/migration promotion with cohort creation/import/read contracts, the historical placement resolver, profile-update guards, scope/target consumers, versioned new labels and OpenAPI/tests. Only advertise capabilities.major_scoped_generations when the complete contract is deployed. Real legacy mappings, normal backup/rehearsal/cutover and frontend acceptance remain separately reviewed work.

### 13.35 Local Step 30: reviewed cohort mapping executor and durable receipts

**16 October 2026: executor PASS in owned isolated fixtures; E public API/migration delivery remains pending.** The [mapping library](../scripts/lib/cohort-mapping.cjs), [candidate receipt table](../scripts/migrations/cohort-mapping-receipts.sql) and [54 new integration cases](../test/cohort-mapping.e2e-spec.ts) build on the unchanged Step 29 expansion. The library exports inspectMapping and applyMapping for a trusted authenticated adapter; it introduces no HTTP route, operator command, public deployment path or frontend capability. Both candidates remain outside prisma/migrations and refuse public/normal contexts. Existing public cohorts and school data receive no mappings.

**Review and execution contract**

| Area | Implemented fixture contract |
| --- | --- |
| Scope and administrator boundary | Verify actual teacher_evaluation_test and cohort_test_<UUID> schema before application reads/writes. The manifest must match that exact context. Resolve the trusted principal's ID against current users: ACTIVE ADMIN and matching auth_version; caller-supplied role cannot grant permission. Reviewer must be the same current administrator. The library does not verify JWT signatures or authenticate a supplied ID; a future server/operator adapter must supply a genuinely authenticated principal. No such public adapter is delivered here. ADMIN remains school-wide. |
| Read-only inspection | REPEATABLE READ/READ ONLY snapshot returns administrative cohort/reference IDs, per-row hashes and complete source fingerprint. It excludes account credentials, student codes/names, private notes, draft contents and answer text. Legacy cohort labels remain restricted administrative review data. Returned relation association is not evidence of original cohort ownership; destination numbers/owners are explicitly reviewed input, never inferred from current major. |
| Complete reviewed manifest | Require schema_version=1, UUID-v4 operation_id, exact database/schema, source fingerprint, reviewer_id, reviewed_at/expires_at, reason, all cohort dispositions and every profile/yearly-record/live-scope/frozen-target reference with expected SHA-256. Each row appears exactly once, including unchanged/unresolved references. Frozen targets only accept KEEP_ORIGINAL_REFERENCE. Missing/duplicate/unknown references, stale hashes, extra fields and invalid signed-BigInt IDs reject before mapping writes. |
| Bounded input | Maximum JSON size 5 MiB; 500 cohorts, 50 destinations per cohort, 5,000 profiles, 10,000 yearly records, 10,000 scopes and 20,000 frozen targets. Destination keys are bounded; numbers are positive INTEGER values, not IDs or numeric strings. Reviewer reason is nonblank/up to 2,000 characters. Uncommitted review windows are at most 30 minutes; future/expired reviews reject. These are prototype engineering limits, not a school-scale performance finding. |
| Explicit cohort dispositions | KEEP_ID_AS_CANONICAL requires one destination retaining the original ID/entry metadata. SPLIT_KEEP_LEGACY_REFERENCE requires explicit destinations while retaining the old reference; RETAIN_UNRESOLVED has none. Existing canonical rows use KEEP_EXISTING_CANONICAL and retain identity. Reuse of an existing canonical destination requires its exact ID/major/number/entry metadata; no automatic alias merge or collision winner. Duplicate destination keys/pairs or conflicting metadata reject. |
| Placement/profile validation | Each mapped reference binds its stored source association and explicit reviewed destination. Recorded major must match destination ownership, with structured academic chronology and destination entry year no later than the placement/scope year. Resolved yearly cohorts cannot be rewritten. A changed compatibility profile pointer must match its latest unambiguous reviewed placement; profiles without placement evidence remain unchanged. New owner selection is never guessed for orphan profiles. No major, group, year level or progression action is recalculated or changed. |
| Atomicity and concurrency | READ COMMITTED transaction locks the full known candidate table set in a stable order before fresh authorization/state reads. It then validates the complete rows/schema/ledger fingerprint, writes operation provenance/cohorts/year links/events/pointers/scopes and receipt together, and forces deferred constraints. Lock timeout is five seconds and transaction timeout 30 seconds. Concurrent identical confirmations serialize: one commit and one original-receipt read. |
| Preservation after every write | Post-write verification runs after receipt insertion, so receipt-trigger side effects also roll back. It checks original protected column values, exact approved cohort/reference changes, unrelated and frozen table hashes, prior journal rows, exact new assignment events and stored operation/receipt payload. Schema/constraint/index/function/trigger definitions are also bound to review. Injected answer changes or rewritten receipt JSON fail preservation and roll back all mapping/journal/receipt rows. |
| Durable original-result retries | Receipt is keyed by operation UUID and binds actor and canonical request fingerprint. A valid same-actor/current-session retry returns the original stored IDs/counts even after review expiry or later database drift. Changed input with the same ID rejects; another actor or revoked session cannot read the receipt. Receipt UPDATE/DELETE is blocked. No TTL cleanup is introduced. Future operational retention/recovery policy and authenticated exposure still require review. |

Fingerprint scope is every row in the known candidate application tables plus the migration ledger and schema definitions. Sequence counters are deliberately excluded from the review binding: PostgreSQL allocations may leave gaps after transaction rollback, and this tool never resets them. All original shared public sequence states are separately checked around each owned fixture. This distinction allows retry after a row-level rollback without treating harmless allocation gaps as changed academic facts. Fingerprints are not backups or restoration evidence.

Stable user-safe library errors include INVALID_MANIFEST, ISOLATED_FIXTURE_REQUIRED, TARGET_MISMATCH, FORBIDDEN, INCOMPLETE_MAPPING, INVALID_MAPPING, MAPPING_STALE, REVIEW_EXPIRED, DESTINATION_CONFLICT, OPERATION_REUSED, MAPPING_SCHEMA_MISMATCH, PRESERVATION_FAILED, MAPPING_BUSY and MAPPING_FAILED. Raw Prisma/SQL errors, private configuration and answer data are not surfaced by the library. These are candidate tool errors, not newly published HTTP status/error contracts.

**What was actually tested**

| Verification | Result and boundary |
| --- | --- |
| New executor suite | PASS: 54 integration cases. Complete split/retention/keep-ID/reuse, input bounds/types, exact context, inactive/non-admin/revoked sessions, wrong reviewer, incomplete/duplicate/stale source references, wrong major/chronology/profile destination, frozen-reference rejection, receipt failure/side effects/tampering, concurrency, changed-input refusal, cross-actor protection and committed retry after expiry/drift. Non-numeric record order and an exact 9007199254740993 profile ID guard against JavaScript rounding or text-order mistakes. |
| Focused combined suites | PASS: 89 cases across 2 suites: 54 new executor plus the unchanged 35 Step 29 expansion cases. Most refusal/success scenarios run inside an outer rollback transaction with the real executor callback/locks/validation; separate real root transactions prove rollback, commit, concurrency and durable receipt behavior. This is database integration evidence, not new frontend or HTTP acceptance. |
| Fresh full regression | PASS: 560 unit tests/44 suites and 1,556 API/integration-runner cases/33 suites; the 54 new cases are included in 1,556. No failures/skips/todos. Prior 41 standalone Node preflight checks are retained evidence and were not rerun here. |
| Engineering | Whole-repository types zero errors, build PASS, lint zero errors/five existing warnings; scoped executor/test lint has zero warnings; formatting and whitespace diff PASS. The first 41 executor checks passed, then coverage expanded to 54. One new redundant-spread lint warning was removed; no old expectation was weakened. |
| Preservation and cleanup | All 428 protected prior source/test/frontend/config/schema/migration files unchanged; three new SQL/library/test files. Owned fixture comparisons preserve shared public application/ledger row hashes and all 24 sequence last_value/is_called states. Only verified owned schema/folder is removed. Final read-only catalog check: shared teacher_evaluation_test/public remains 28 tables/199 columns/18 successful migrations/24 sequences; no cohort fixture namespaces remain. Other full-regression suites may advance isolated public sequences normally. |
| Candidate-only schema | Receipt fixture contains 31 application tables/226 columns, verified in the full new suite. This adds one five-column receipt table to Step 29's temporary 30/221 schema. Active Prisma schema/client and the 18-file migration chain remain unchanged. Normal teacher_evaluation was not queried or migrated. |
| UI and operational acceptance | NOT TESTED: new E browser flows, real legacy mappings, normal migration/recovery, production adapter authentication, school-sized performance and deployment. No existing public cohort mappings, normal access, backup deletion, commit or push. Word content/package/link synchronization is checked separately; visual rendering remains NOT CHECKED. |

The synthetic baseline contains a transferred student's two yearly majors, a second profile with unknown placement, an offering scope, enrollments, captured and unavailable frozen labels, a CLOSED evaluation, completed and unfinished participants, a protected draft and anonymous written answer. Successful mapping leaves those histories/labels/text unchanged. No response-to-student link or major-filtered answer contract is added. Persistent PAUSE, yearly group rules, curriculum revisions and selected-year cohort resolution still need coordinated E application integration before any capability is advertised.

Evidence is retained in ignored .tmp/cohort-step30-focused-api.json, .tmp/cohort-step30-full-unit.json, .tmp/cohort-step30-full-api.json, .tmp/cohort-step30-evidence.json and .tmp/cohort-step30-after-baseline.json. The improve.txt version/hash is unchanged.

**Next:** integrate the tested design with the active Prisma model and a reviewed migration promotion plan, then implement E cohort creation/import/ownership validation, safe personal edits, year-specific historical resolver and every scope/target/export consumer, with coordinated OpenAPI/compatibility tests. Review outstanding-preview invalidation and committed confirmation retries together. Keep capabilities.major_scoped_generations absent until that complete contract is deployed. Real-data mappings and normal backup/rehearsal/cutover remain separately authorized operational work.

### 13.36 Local Step 31: additive test migration and major-owned cohort catalog

**16 October 2026: catalog and isolated schema PASS; complete E workflow remains IN PROGRESS.** The [active Prisma schema](../prisma/schema.prisma) and [migration 19](../prisma/migrations/20261016010000_expand_major_scoped_cohorts/migration.sql) now include major-owned numeric cohorts, a nullable yearly cohort link, immutable mapping/assignment journals and durable receipts. The migration is applied only to teacher_evaluation_test/public. No existing ownership, cohort number or yearly history was inferred or mapped. The prototype mapping executor still refuses public contexts; it has no authenticated public adapter. capabilities.major_scoped_generations remains absent.

**Database state and operational boundary**

| Database / evidence | Tables / columns / successful migrations / sequences | Status |
| --- | --- | --- |
| Isolated teacher_evaluation_test/public, newly verified 16 October | 31 / 226 / 19 / 25 | PASS. Original 28 application tables' prior column values, 24 sequence states and 18 complete ledger rows were preserved during migration. All old cohorts remain LEGACY_READ_ONLY with null ownership/number; no public mapping journal/event/receipt remains after synthetic tests. |
| Normal teacher_evaluation, recorded 14 October | 28 / 199 / 18 / 24 | NOT REAUDITED. No normal connection or migration occurred in Step 31. The two databases are deliberately no longer symmetric. |
| Owned rehearsal from baseline 18 | 31 / 226 after exact active SQL | PASS. Injected failure at the end of the atomic DDL rolled back the whole expansion; successful rehearsal preserved original values/sequences. The exact owned namespace/folder was removed. |

The regenerated Prisma client expects the expanded schema. During this rollout, run the backend with npm.cmd run start:test and the guarded isolated configuration; do not point this source revision at the older normal schema or use a default-environment migration command. Normal migration requires a separately approved backup, verified restore, rehearsal and cutover after coordinated E completion. Do not reset/downgrade either database to make their counts equal.

A restricted pre-migration custom-format test backup is retained under ignored .tmp/cohort-step31-backup-usooSQ. Its size is 125,054 bytes and SHA-256 is f891e1efefe81c7d1f4239b51b0e5b2ea13378c3e32fe112ced2b30c2da24ab4. Access restrictions and pg_restore table-of-contents were checked. **Restoration of this backup was NOT TESTED.** This evidence does not replace the dated normal-database restore evidence. Applied migration SHA-256 is 27f37fc8824921e690937816c26c5536e16a2369d990ae4f483a9d76d63417d6; it was not edited after deployment.

**Catalog contract for the frontend team**

| Request or rule | Implemented behavior and evidence |
| --- | --- |
| GET /api/student-generations; optional major_id | Authenticated roles may read. Filter by explicit owning major; numeric generation_number order within each major. IDs serialize as decimal strings; generation_number is a JSON integer. Legacy rows expose LEGACY_READ_ONLY and null major_id/generation_number rather than guessed metadata. Major id/code/name/department_id are returned; mapping-operation IDs are excluded. |
| POST /api/student-generations | ADMIN only. Require major_id and entry_academic_year_id as positive decimal strings within signed BigInt range. Require generation_number as a JSON integer 1..2147483647 unless a numeric name compatibility alias is supplied. Entry year needs structured start_year and owning department must be ACTIVE. starting_year_level defaults to 1 and must be 1..5. |
| Numeric aliases and independent numbering | name may supply 1, 01 or Gen 1 with an explicit major. Both name and number must agree when supplied. Arbitrary new global labels reject. DS number 1 and FE number 1 may coexist with different IDs/entry years; display names alone are ambiguous. Same-major duplicates return 409 COHORT_EXISTS. Two concurrent duplicate requests persist one cohort. |
| PUT /api/student-generations/:id | Canonical major, number, entry year and starting level are immutable: changes return 409 COHORT_IDENTITY_IMMUTABLE. Equal values return the existing row without timestamp writes. Legacy ownership edits return 409 COHORT_MAPPING_REQUIRED. Existing legacy display/entry compatibility remains during expansion; captured historical labels remain protected. LEGACY_READ_ONLY describes unresolved ownership, not a blanket prohibition of old label edits. |
| DELETE /api/student-generations/:id | ADMIN may delete an unused cohort. Existing students, frozen evaluation references, mapping provenance or other FK references block deletion with 409. |
| Invalid input and permission errors | Missing/null/string-number/overflow IDs and numbers reject with 400; missing major/year 404; non-admin writes 403 and anonymous requests 401. New catalog path/filter validation never converts database IDs through Number. Null update values reject. |
| Compatibility import safety | Existing name-based import and its retry lookup now select only LEGACY_READ_ONLY rows. They cannot select a major-owned cohort by display name. A canonical-only label with no entry year rejects without writes. This retains legacy import behavior; it does not deliver the requested major-aware numeric import. |

Example ADMIN body for POST /api/student-generations; replace string IDs with actual isolated catalog IDs:

```json
{
  "major_id": "2",
  "generation_number": 1,
  "entry_academic_year_id": "3",
  "starting_year_level": 1
}
```

The inspected frontend resolveGeneration in src/services/backendContracts.js still matches global names and sends only name, entry_academic_year_id and starting_year_level when creating a cohort. **FAIL by source contract comparison:** that create body lacks required major_id; equal display names across majors are ambiguous in its current lookup. The frontend team must select by major_id plus generation_number, retain the returned database ID and use the major filter. No frontend file was changed. New E Brave UI scenarios remain NOT TESTED; do not enable the full capability until every dependent backend consumer and the matching frontend revision are accepted.

**Verification and remaining work**

| Verification | Actual result / boundary |
| --- | --- |
| New real HTTP catalog suite | PASS: 53 cases, including independent majors/entry years, numeric aliases/sort/bounds, inactive departments, BigInt strings, duplicate/concurrent conflicts, immutable identity, legacy mapping refusal, deletion references, roles, unchanged rejected/read/no-op state, import isolation and OpenAPI. All original public row/ledger hashes survive; owned catalog fixtures are removed. |
| Focused regression | PASS: 286 checks across 6 suites: catalog 53, import/export 55, academic integrity 51, first-admin 38, candidate expansion 35 and candidate mapping 54. Historical fixture suites use a separately generated baseline-18 Prisma client and exact baseline migration copies; current client reads expanded public tables. |
| Fresh full regression | PASS: 560 unit tests/44 suites and 1,609 API/integration cases/34 suites. New 53 cases are included in 1,609, not added again. No failures/skips/todos. Step 30's 1,556 is preserved as prior evidence. |
| Standalone audit | PASS: all 41 Node checks rerun against the expanded isolated catalog, including read-only state/ledger/sequence preservation. These checks are separate from Jest totals. |
| Engineering | PASS: zero TypeScript errors, production build, scoped formatting and whitespace diff. Repository lint has zero errors/five existing warnings. Existing unrelated formatting was not changed. |
| Preservation | 418 of 431 prior protected files unchanged; 13 intended backend/schema/test compatibility changes and 7 added source files. Frontend/private configurations, improve.txt and all earlier migration SQL files unchanged. Full regression may advance isolated synthetic sequences; none were reset. |
| Execution interruptions | Initial sandbox run passed catalog/import/integrity but blocked temporary fixtures and JSON reports with EPERM. Permitted rerun passed. One legacy name-unique test assertion was changed to assert exactly one legacy match after global uniqueness removal. A subsequent review added import isolation; final regression covers that guard. No assertions were weakened to accept incorrect behavior. |
| UI / operations / Word | New E UI scenarios, normal cutover, test-backup restoration, school-sized performance and production deployment NOT TESTED. Word package/content/links are checked; visual rendering NOT CHECKED. No normal access, backup deletion, commit or push. |

This is an additive expansion, not final E enforcement. Nullable old yearly links, legacy inserts/imports and existing placement writes remain compatible until coordinated cutover. The new FK/check/immutable-evidence rules protect explicit canonical pairs and non-null resolved links; they do not require every legacy write to become canonical yet. Personal cohort edits, new student/placement creation, explicit destination-major TRANSFER, persistent PAUSE/RESUME resolution, exports, offering scopes and evaluation selection still need coordinated ownership/chronology checks. Do not use the new catalog as proof that these write paths are safe for major-scoped production use. Existing frozen targets/labels, questionnaire versions, drafts, anonymous answers, yearly groups and teaching history were not relabeled.

**Next:** implement the major-aware import and student/academic-record contract, including explicit destination cohort selection, immutable year-specific assignment evidence and safe personal edits; then update the shared historical resolver and every scope/target/export consumer, with invalid-major/chronology, persistent-pause, yearly-group, concurrency, preview invalidation and durable-confirmation tests. Keep capability absent until the full contract passes. Authenticate any future mapping adapter and review real mapping manifests separately. Normal recovery/cutover and matching Brave acceptance remain later approval/acceptance steps.

Local evidence: .tmp/cohort-step31-migration-evidence.json, .tmp/cohort-step31-focused-api.json, .tmp/cohort-step31-full-unit.json, .tmp/cohort-step31-full-api.json, .tmp/cohort-step31-evidence.json and .tmp/cohort-step31-after-baseline.json. These are ignored verification artifacts, not additional maintained reports.

### 13.37 Local Step 32: major-aware imports and initial cohort assignment evidence

**16 October 2026: major-aware backend import slice PASS; complete E workflow remains IN PROGRESS.** POST /api/students/import now supports explicit major-owned cohorts through the [DTO](../src/students/dto/import-students.dto.ts), [authenticated ADMIN controller](../src/students/students.controller.ts) and [new import service](../src/students/student-cohort-import.service.ts). The original service dispatches explicit-major/number requests to that implementation; unscoped legacy label imports remain transitional in the existing path. No full E capability is advertised. No Prisma model, migration, database configuration or frontend file changed in this step.

**Request, validation and response contract**

| Area | Implemented major-aware behavior |
| --- | --- |
| Major and cohort identity | Require major_id as a positive decimal string up to 9223372036854775807; generation_number is a JSON integer 1..2147483647. Keep the separate returned cohort ID; the number and major ID never substitute for generation_id. Alternatively generation may carry a numeric string alias 3, 03 or Gen 3 with the same explicit major; if both alias and number are supplied, they must agree. Arbitrary labels reject in this path. |
| Every spreadsheet major | Resolve each row's major code or exact normalized name case-insensitively. Exactly one major must match and its ID must equal the request owner. Mixed, unknown or ambiguous majors reject the entire request before even a cohort is created. Use distinct major/cohort batches for mixed-major files. An inactive owning department rejects; ADMIN remains school-wide. |
| Placement and chronology | academic_year_id is a bounded decimal-string ID; year_level is integer 1..5. Placement year must have structured start_year. New cohorts require a structured entry_academic_year_id no later than the placement year; starting_year_level defaults to 1 and is bounded 1..5. No chronology is guessed from names or IDs. Explicit placement level is retained, not recalculated from another major's entry metadata. |
| Reuse and new metadata | Resolve/create only by (major_id,generation_number), never global display name. Existing pairs retain their own ID/entry year/starting level. Optional well-formed entry/starting values are creation hints and do not overwrite existing metadata; existing pairs need no entry hint. New same-number cohorts in another major can have independent entry metadata. Same-name unresolved legacy cohorts are neither adopted nor relabeled. |
| Prevalidation before writes | HTTP nested DTO checks cover field types/lengths and 1..500 rows. Before cohort creation, reject blank or duplicate normalized codes, invalid IDs/numbers/levels, invalid password byte limits, wrong spreadsheet majors and invalid chronology. Normalize groups before writes. Explicit null initial_password rejects with 400 in the new path rather than reaching string operations. |
| Passwords and groups | Omitted/blank initial_password retains the existing password@1235 compatibility default; explicit passwords require 6..72 characters and at most 72 UTF-8 bytes. Newly created accounts receive independently salted bcrypt hashes. Groups trim/collapse spaces and uppercase; blank/omitted group stays null. Import does not invent a required yearly group or certify evaluation eligibility. Use the existing controlled synthetic credentials only for isolated testing. |
| Return shape | Preserve generation, academic_year, summary and ordered results. generation adds ownership_state, integer generation_number, string major_id and safe majors metadata, while keeping string ID/entry ID and starting level. Each CREATED result returns the student profile ID, not the user/account ID. No passwords, hashes, private notes, answer content or mapping-operation IDs are exposed. |

Example ADMIN JSON, using actual isolated IDs and a spreadsheet major code that resolves to major_id:

```json
{
  "major_id": "2",
  "generation_number": 1,
  "academic_year_id": "4",
  "year_level": 2,
  "entry_academic_year_id": "3",
  "starting_year_level": 1,
  "initial_password": "SyntheticImport123!",
  "class_group": "A",
  "students": [
    { "student_code": "SYNTHETIC-DS-001", "full_name": "Synthetic Student", "major": "DS" }
  ]
}
```

**Atomicity, concurrency and retry limits**

| Situation | Actual behavior |
| --- | --- |
| One new student | One serializable transaction rechecks the active owner, row-major resolution, current cohort pair and entry/placement chronology, then writes account, profile, yearly record with generation_id, and matching immutable INITIAL assignment event. Deferred database evidence constraints must pass before success. Evidence failure rolls back all four student-related writes. |
| Request versus row atomicity | Input validation is request-wide. Runtime persistence is atomic per new student, retaining the existing ordered CREATED/SKIPPED/FAILED results. One runtime failure does not remove other committed students. Cohort preparation commits before row writes; a valid newly created cohort may remain if all student saves fail. This endpoint is not an atomic whole-file import. |
| Safe skipped records | Existing normalized student codes are skipped without changing name, password, status, cohort, placement, progression or old history, even if the existing profile belongs to another major. Import is not a transfer operation. A competing unique student-code insertion is also SKIPPED; no duplicate user or profile survives the losing transaction. |
| Pair concurrency | A transaction-scoped advisory lock serializes major-aware imports for the same pair; the database unique key also arbitrates catalog creation. Lock waits are bounded to five seconds; contention returns safe 409 and no application writes. Preparation retries serialization/unique collisions at most three attempts; student transactions retry serialization conflicts at most three attempts. No sequence reset or metadata replacement makes a retry succeed. |
| Retry evidence | A completed same-payload retry returns all existing codes as SKIPPED and preserves exact stored rows/password hashes. Two concurrent different-code imports share one cohort; identical-code imports create once and skip once. This uses uniqueness/existence checks, not a reviewed-operation receipt or whole-file exactly-once guarantee. |
| Errors and permissions | Invalid data/mismatch/chronology 400; absent major/year 404; ambiguous row-major or bounded contention 409; non-admin 403; anonymous 401. Unexpected per-row save errors return FAILED with Student could not be imported and do not expose raw database failure details. HTTP 201 can contain FAILED rows: frontend must inspect summary/results. |

The current frontend src/services/studentImport.js still sends an unscoped generation label, and src/services/appDataSource.js forwards that body. **NOT CONNECTED to the new major-aware path by source comparison.** The legacy path remains available during rollout, but it does not satisfy the finished E import contract. The frontend team must send major_id and integer generation_number, split mixed-major inputs into explicit batches, preserve returned IDs/metadata and inspect partial results. No frontend changes or new Brave scenarios were executed. Full E capability remains absent until the remaining student/transfer/resolver/metadata consumers and matching UI are accepted.

**Actual verification and evidence**

| Check | Result and boundary |
| --- | --- |
| New real HTTP suite | PASS: 60 cases in [student-cohort-import.e2e-spec.ts](../test/student-cohort-import.e2e-spec.ts). DS/FE independent number 1/entry years/levels; strict aliases and bounds; major mismatch/ambiguity/inactive/missing references; null/Unicode-byte passwords; chronology; normalized duplicate codes; maximum integer and IDs beyond JS precision; null groups; safe reuse/skips/retries; concurrent cohort/student insertion; bounded lock contention; evidence-failure rollback/partial success; privacy, roles and Swagger/capability state. |
| Row cap | PASS: 501 rows reject before writes; exactly 500 valid existing-code rows return 500 SKIPPED without changing records. The 500-row positive case does not measure new-account hashing throughput or establish school-scale performance. |
| Focused regression | PASS: 168 API/integration cases across 3 suites: new import 60, unchanged legacy import/export 55 and existing cohort catalog 53. Legacy import unit suite separately passed all 20 cases. |
| Fresh full regression | PASS: 560 unit tests/44 suites and 1,669 API/integration cases/35 suites; no failures/skips/todos. The 60 new cases are included in 1,669, not additional. Step 31's 560/1,609 remains dated prior evidence. Standalone read-only audit rerun: 41 PASS, excluded from Jest totals. |
| Owned fixture boundary | [Fixture helper](../test/helpers/cohort-import-fixture.ts) guards the real database name, owns a collision-checked cohort_import_test_<UUID> schema, replays all 19 migration copies there and redirects only the three known historical public.survey_title_key references. Original migrations are unchanged. Real API guards/services/constraints run against that schema. Every case compares all shared public row/ledger hashes and 25 sequence last_value/is_called states; exact owned schema/folder cleanup is verified. Immutable INITIAL events are never deleted individually or disabled for tests. |
| Engineering and preservation | PASS: types/build, scoped formatting and whitespace diff; lint zero errors/five existing warnings, new source/helper/test lint zero warnings. Of 438 prior protected files, 435 unchanged and three intended DTO/dispatch/controller updates; three new sources added. Frontend, private configurations, earlier migrations and retained Step 31 backup hash unchanged. |
| Database state | No migration or schema change: test remains 31 application tables/226 columns/19 successful migrations/25 sequences, with no owned test namespaces left. Normal remains recorded 28/199/18/24 and was not connected to or migrated. Full-regression public synthetic sequences may advance normally; none were reset. |
| Development findings | First focused run had two fixture failures: incorrect users relation name and duplicate major names inside one department. Fixtures were corrected to the actual relation and cross-department ambiguity; no constraint or assertion was weakened. Removed one new helper lint warning. Added null-password rejection during review; final focused/full results include it. |
| Acceptance limits | New E Brave UI NOT TESTED. Real legacy ownership mapping, normal migration/recovery, school-sized throughput and production deployment NOT TESTED. Word package/content/links checked; visual rendering NOT CHECKED. No backup deletion, commit or push. |

**Next:** coordinate individual student creation/personal edits and academic-record placement/TRANSFER with explicit cohort ownership and immutable yearly assignment evidence, then replace current-profile fallback in selected-year historical resolution and update group/scope/target/export metadata. Preserve explicit destination-major cohort choice, persistent PAUSE until RESUME, mandatory yearly groups, frozen labels/questionnaire versions/drafts and anonymous answer boundaries. Reviewed mappings/authenticated adapter, outstanding-review invalidation, durable confirmation behavior and matching frontend acceptance remain later E work. Do not enable capabilities.major_scoped_generations yet or run this revision against the older normal schema.

Ignored evidence: .tmp/cohort-step32-focused-api.json, .tmp/cohort-step32-full-unit.json, .tmp/cohort-step32-full-api.json, .tmp/cohort-step32-evidence.json and .tmp/cohort-step32-after-baseline.json. These are local verification artifacts, not extra maintained reports.

### 13.38 Local Step 33: cohort-safe student creation and personal edits

**16 October 2026: student creation/personal-edit slice PASS; E academic transfer and historical resolver remain IN PROGRESS.** The [student service](../src/students/students.service.ts), [create DTO](../src/students/dto/create-student.dto.ts), [update DTO](../src/students/dto/update-student.dto.ts) and [controller](../src/students/students.controller.ts) now protect explicit cohort ownership during initial creation and prevent a personal edit from silently relabeling a student's cohort. No migration/schema change, legacy ownership mapping, normal connection or frontend edit occurred. Full major_scoped_generations capability remains absent.

**Implemented requests and historical meaning**

| Area | Current backend contract |
| --- | --- |
| POST /api/students | ADMIN supplies a saved generation_id plus initial academic_year_id, major_id and year_level; the cohort's number is never its database ID. A MAJOR_SCOPED cohort must belong to the initial major, whose department must be ACTIVE. Entry and placement start_year must be structured and entry no later than placement. Missing references 404; owner/chronology/inactive-department mismatches 400 before account writes. Existing explicit year-level precedence is retained. |
| Atomic initial assignment | A serializable transaction contains reference/ownership validation, account, profile, initial yearly record with generation_id and its matching immutable INITIAL event. Nested operations remain bound to that transaction. Failure of event persistence or a duplicate account/profile rolls all four student-related writes back. Concurrent duplicate submissions commit one account/profile/placement/event; the other request returns 409. Sequence gaps are allowed and never reset. |
| Transitional legacy creation | Existing unscoped legacy creation remains available during coordinated rollout. Its owner/number and yearly cohort link remain null; it creates no fabricated ownership or INITIAL event. This preserves earlier compatibility, not completed E enforcement. Legacy mapping and final write cutover are separate reviewed work. |
| PUT /api/students/:id personal fields | Omit generation_id or repeat its existing ID. Any different cohort ID returns 409 COHORT_CHANGE_REQUIRES_TRANSFER before saving accompanying name/email/notes/status changes. Applies to canonical-to-canonical, cross-major, canonical-to-legacy, legacy-to-canonical and legacy-to-legacy changes. This endpoint does not transfer major, resume studies or rewrite a yearly record. |
| Same cohort / empty request | An unchanged cohort-only body or empty body returns the existing selected representation without writing profile/account timestamps. Ordinary personal edits may update their own timestamps, while retaining cohort and every academic record/assignment event. Already-linked unresolved legacy cohorts remain editable for personal details without assigning an owner. |
| Validation and nullable fields | Create cohort/year/major IDs and update cohort ID are positive bounded signed-BigInt decimal strings; numeric JSON values, zero, negatives, decimal strings, null and overflow reject with 400. Trimmed student codes/full names must remain nonblank. Null student_code/full_name/generation_id/status updates reject. Email/gender/notes still support explicit null clearing. Null create email means no email. Passwords above 72 UTF-8 bytes reject before bcrypt; existing length rules remain. |
| Groups and protected history | New initial groups use the common trim/collapse/uppercase normalization. Blank or omitted groups remain null; they do not borrow an old group or grant evaluation eligibility. Personal edits retain old group, major, year, progression, password and role. A paused legacy record stays PAUSE even if academic fields are submitted to the personal endpoint; the existing whitelist excludes those fields. Historical profile deletion still returns 409 rather than removing placements/events. |
| Student metadata | Student list/details/create/update expose student_generations ownership_state, major_id, integer generation_number and safe majors metadata. Returned IDs remain strings. Each student_academic_records item now includes its stored generation_id and nullable linked student_generations metadata. An unresolved historical record returns null rather than borrowing the current-profile cohort. No mapping-operation ID, password/hash/auth_version or assignment journal is exposed. Administrative notes remain part of the authorized admin profile contract. |

The prior Step 4 test allowed a mutable profile-only cohort pointer change while preserving old records. The approved E historical ownership/transfer rule supersedes that behavior. Its successful personal-edit test now repeats the same cohort while retaining its original field-normalization, password, role and academic-record assertions. The new suite separately proves that five kinds of cohort reassignment reject atomically. Historical documentation/test counts remain dated evidence, not a claim that the earlier pointer-change contract still applies.

Example isolated ADMIN create request; replace these string IDs with actual catalog IDs:

```json
{
  "student_code": "SYNTHETIC-DS-002",
  "full_name": "Synthetic Student",
  "password": "SyntheticCrud123!",
  "generation_id": "7",
  "academic_year_id": "4",
  "major_id": "2",
  "year_level": 2,
  "class_group": "A"
}
```

For a personal update, send the profile ID in /api/students/:id, not users.id; omit generation_id or repeat the stored value. A changed cohort is a deliberate academic operation requiring explicit destination-major selection and preserved yearly evidence. That transfer endpoint/contract is not delivered by this checkpoint. Do not reinterpret a 409 as permission to change the old placement directly.

**Actual verification and integration limits**

| Check | Result / evidence boundary |
| --- | --- |
| New real HTTP suite | PASS: 68 cases in [student-cohort-crud.e2e-spec.ts](../test/student-cohort-crud.e2e-spec.ts). Independent DS/FE number 1; atomic INITIAL evidence; explicit record metadata; unresolved legacy behavior; nullable email/groups; wrong owner/inactive department/chronology; missing references and bounded ID types/ranges; blank fields/UTF-8 password; cohort ID versus number; duplicate/concurrent rollback; injected evidence failure; all five forbidden cohort transitions; exact no-op timestamps; safe personal edits, persistent stored PAUSE, nullable clearing, protected deletion, BigInt precision, permissions and Swagger/capability state. |
| Focused regression | PASS: 217 HTTP/integration cases across 3 suites: new cohort CRUD 68, retained student CRUD/permissions 89 and major-aware imports 60. Separately, all 27 existing student-service unit cases pass. Only the earlier successful cohort-pointer edit expectation changes to the approved unchanged-cohort contract; every unrelated assertion is retained. |
| Fresh full regression | PASS: 560 unit tests/44 suites and 1,737 API/integration cases/36 suites, no failures/skips/todos. The 68 new cases are included in 1,737, not additional. Step 32's 560/1,669 remains prior evidence. Standalone read-only audit rerun: 41 PASS, excluded from Jest totals. |
| Real database isolation | Reuse the guarded owned-schema [fixture](../test/helpers/cohort-import-fixture.ts): teacher_evaluation_test/cohort_import_test_<UUID>, all 19 namespace-adapted migration copies, no modified original SQL. Every new case compares shared public application/ledger row hashes and all 25 sequence last_value/is_called states. Cleanup removes only the verified owned namespace/folder, including immutable synthetic history as a whole; no protection is disabled or event individually deleted. |
| Engineering and preservation | PASS: types/build/scoped formatting/diff; lint zero errors/five existing warnings, new suite lint zero warnings. Of 441 prior protected files, 435 unchanged and six intended service/DTO/controller/unit/legacy-test updates; one new HTTP suite. Frontend, private configurations, migrations and retained backup hash unchanged. |
| Database status | No new migration or schema change: test 31 tables/226 columns/19 successful migrations/25 sequences, no owned fixture schemas remaining. Normal stays recorded 28/199/18/24, not accessed or migrated. Existing synthetic public regression sequences may advance normally; none are reset. |
| Fixture correction | The first combined run stopped the new suite at setup because its synthetic year name exceeded the existing VARCHAR limit; 149 existing cases passed. Shortening the fixture label preserved that constraint. New 68 then passed; final combined/full totals above are fresh successful executions. |
| UI / operations / Word | New Brave scenarios NOT TESTED. Real reviewed ownership mappings, normal cutover/recovery, school-sized performance and production acceptance NOT TESTED. Word package/content/links checked; visual rendering NOT CHECKED. No backup deletion, commit or push. |

The inspected frontend saveStudent already posts generation_id, initial major/year/level, and repeats generation_id in personal PUT requests. **PARTIAL source contract match:** unchanged personal edits and valid initial canonical ID payloads are supported, but its global-name cohort resolver remains ambiguous for same-number majors and its editor can still propose a cohort change. The frontend must retain explicit returned IDs/major metadata and handle COHORT_CHANGE_REQUIRES_TRANSFER without silently attempting a profile-only reassignment. Its separate follow-up academic-record write is not an atomic transfer workflow; no matching UI acceptance is claimed.

**Remaining E boundary:** selected-year progression still uses the existing resolver and current compatibility pointer in downstream consumers; exposing per-record links does not finish historical cohort resolution. The academic-record API still has its earlier placement/transfer contract. Canonical identity changes may be rejected by database safeguards rather than handled as an explicit transfer; it is not the completed new workflow. Group/options, targeting, exports, self-profile metadata, reviewed previews/retries and frozen new-label capture still need the coordinated E consumer work. Keep the capability absent and use the guarded start:test revision; do not run this source against the older normal schema.

**Next:** implement explicit cohort selection for academic-record placement and TRANSFER, preserving prior yearly cohort links and append-only events, explicit destination-major ownership, chronological ordering, persistent PAUSE until RESUME and required yearly groups. Then update historical resolution and remaining metadata/scope/target/export consumers, review preview invalidation/committed retries, authenticate any public mapping adapter, review real ownership mappings and complete matching Brave acceptance before normal recovery/rehearsal/cutover.

Ignored evidence: .tmp/cohort-step33-new-api.json, .tmp/cohort-step33-focused-api.json, .tmp/cohort-step33-full-unit.json, .tmp/cohort-step33-full-api.json, .tmp/cohort-step33-evidence.json and .tmp/cohort-step33-after-baseline.json. These are local artifacts, not additional maintained reports.

### 13.39 Local Step 34: explicit yearly cohort placement and transfer

**16 October 2026: this backend placement/transfer slice PASS; requirement E remains IN PROGRESS.** ADMIN can now append a yearly placement with an explicit saved destination generation_id through POST /api/student-academic-records. The [placement helper](../src/student-academic-records/student-cohort-placement.service.ts), [academic-record service](../src/student-academic-records/student-academic-records.service.ts), [DTO](../src/student-academic-records/dto/create-student-academic-record.dto.ts) and [controller](../src/student-academic-records/student-academic-records.controller.ts) use the existing serializable transaction and expanded test schema. No new route, schema change or migration is needed. This supersedes Step 33's then-pending explicit academic-transfer status; its dated evidence remains intact.

**Request, chronology and history contract**

| Area | Implemented behavior |
| --- | --- |
| Explicit yearly assignment | Supply student PROFILE ID, academic-year ID, major ID, saved cohort ID and numeric year_level; optional class_group and progression_action. IDs are bounded positive signed-BigInt decimal strings, distinct from generation_number. MAJOR_SCOPED destination ownership must match the selected major; its department must be ACTIVE. Entry and placement start_year must be structured, with entry no later than placement. Missing references 404; invalid ownership/date/ID/type inputs 400. |
| Explicit cohort change | A different cohort requires progression_action=TRANSFER; TRANSFER requires a different cohort. Choose the exact saved destination ID, including for a transfer between two cohorts within the same major. Cross-major transfer never infers a cohort from an equal integer number. NORMAL, REPEAT, PAUSE and RESUME retain the previous cohort. |
| Chronological append | The destination year must follow the latest existing record by structured start_year, regardless of database ID/name. An existing same-year record returns 409 ACADEMIC_RECORD_EXISTS. Undated or duplicate existing chronology, same-date aliases and backdated inserts return 409 COHORT_CHRONOLOGY_REVIEW_REQUIRED. This is a forward-append workflow; a reviewed backdated correction workflow is not delivered. |
| Known latest context | Latest yearly cohort must already be resolved and match the profile compatibility pointer and stored major. Latest-unresolved or absent history returns 409 COHORT_MAPPING_REQUIRED; pointer/major disagreement returns 409 COHORT_CONTEXT_STALE. Older unresolved dated links can remain null when the latest resolved context is valid; nothing guesses their original ownership. |
| Atomic evidence and profile | New yearly record and immutable cohort-assignment event commit together. A transfer event stores explicit previous/destination IDs; the profile's compatibility generation_id advances in the same transaction. Earlier yearly links/events are untouched. Same-cohort assignments use event action INITIAL, meaning initial cohort assignment of that new yearly record; NORMAL/REPEAT/PAUSE/RESUME remain its separate progression_action. |
| Persistent PAUSE and groups | Existing progression validation still applies. PAUSE remains effective through later NORMAL, REPEAT and TRANSFER until explicit RESUME; a transfer does not resume studies. RESUME without a prior pause rejects. RESUME may update an eligible paused record while retaining its immutable TRANSFER event. A resumed student without an explicitly assigned yearly group remains ineligible with MISSING_YEARLY_GROUP. Groups are normalized; omitted/blank groups stay null and never copy a prior group. |
| Protected record edits | PUT cannot relabel resolved student/year/major/cohort identity: 409 COHORT_ASSIGNMENT_IMMUTABLE before accompanying writes. Repeating the same generation_id is accepted without rewriting the link. A fake TRANSFER label on INITIAL evidence returns 409 COHORT_TRANSFER_REQUIRES_NEW_PLACEMENT. Existing permitted group/year-level/progression edits retain progression guards. This slice does not introduce a blanket ban on ordinary historical group corrections. |
| Legacy and deletion | Wholly unscoped legacy POST omission retains its earlier transitional behavior with null cohort link and no fabricated event. Any cohort-tracked history requires explicit generation_id; a legacy profile pointer cannot bypass that requirement. Explicit legacy assignment/backfill by PUT or identity moves involving tracked unresolved history require reviewed mapping. Resolved or cohort-tracked yearly history cannot be deleted: 409 COHORT_ASSIGNMENT_PROTECTED. Wholly legacy deletion retains existing protections. |
| Metadata and safe retries | List/detail/create/update return the yearly record's own nullable generation_id and safe major-qualified cohort metadata, separately from the current profile cohort. No assignment journal, password/auth secrets or answer values are exposed. Duplicate/retried POST conflicts without duplicate writes; no dedicated reviewed transfer preview or original-result retry receipt is delivered here. Reload and inspect before further action. |

Example isolated ADMIN transfer; replace all IDs with actual saved synthetic references. The year must follow this student's latest record and the destination cohort must belong to major_id:

```json
{
  "student_id": "12",
  "academic_year_id": "6",
  "major_id": "3",
  "generation_id": "9",
  "year_level": 2,
  "class_group": "B",
  "progression_action": "TRANSFER"
}
```

POST returns 201 on success. Use student profile IDs, not account IDs, and ADMIN bearer authentication. A same-cohort repeat uses its existing generation_id and REPEAT; an explicit later RESUME uses the same cohort and must satisfy the existing pause rules. Personal PUT /api/students/:id still cannot change cohorts. Do not turn a 409 into a direct relabeling of an old yearly record.

**Actual verification and limitations**

| Scenario / check | Result and evidence |
| --- | --- |
| New real HTTP suite | PASS: 88 cases in [student-cohort-placement.e2e-spec.ts](../test/student-cohort-placement.e2e-spec.ts), real Nest guards/services/Prisma and all 19 migrated constraints in an owned test namespace. Explicit same/cross-major selection, chronology, unresolved/stale context, types/ranges/nulls, roles, precision above JavaScript's safe integer, metadata, protected edits/deletion and capability state are covered. |
| PAUSE / RESUME / yearly groups | PASS: PAUSE followed by NORMAL, REPEAT and TRANSFER remains paused; explicit RESUME restores ACTIVE progression but not missing-group eligibility. Explicit yearly group assignment restores placement eligibility. In-place RESUME preserves the original transfer event. |
| Atomicity / concurrency / retries | PASS: injected event-write and profile-update database failures roll all business changes back. Concurrent same-year transfers commit exactly one complete record/event/profile change; the other returns 409. Different-year races either serialize into a valid explicit previous-cohort chain or reject without partial history. A duplicate retry adds nothing. Sequence gaps are permitted and never reset. |
| Protected evaluation history | PASS: a synthetic fixture with saved enrollments, locked V1/draft V2, frozen historical generation/group labels, an unfinished protected draft and completed anonymous response/answer retains every existing row/value after two HTTP transfers, except the two intended profile pointers/timestamps. Exactly two yearly records and two assignment events append. No response-to-student linkage is introduced. Fixture setup is not a newly accepted full questionnaire/UI lifecycle. |
| Focused regression | PASS: 293 cases/4 suites: new placement 88, Step 33 cohort CRUD 68, existing consistency 86 and academic integrity 51. All are included in the full API total below. The initial new-only run passed 87 cases; the additional full-history preservation case then passed in focused/full execution. |
| Fresh full regression | PASS: 560 unit tests/44 suites and 1,825 API/integration cases/37 suites, no failures/skips/todos. Prior Step 33 totals 560/1,737 remain dated evidence. Standalone read-only preflight/audit checks: 41 PASS, separate from Jest totals. |
| Isolation / scope / engineering | PASS: every new case verifies shared public table/ledger row hashes and all 25 sequence states unchanged; owned fixtures are removed as a whole without disabling immutable-history protections. Of 442 prior protected files, 439 unchanged and three intended academic-record DTO/controller/service updates; three added helper/pipe/test files. Types/build/scoped formatting/diff PASS; lint zero errors/five existing warnings, new-source lint zero warnings. Frontend, private configurations, migration SQL and retained backup hashes unchanged. |
| Database status | PASS for test audit: 31 application tables/226 columns/19 successful migrations/25 sequences; no owned fixture namespaces left. No migration in this slice. Normal remains recorded 28/199/18/24, NOT REAUDITED and not accessed/migrated. Full synthetic regression sequences may advance normally; none are reset. The retained Step 31 backup was not newly restored. |
| Frontend source integration | PARTIAL contract match; new UI scenarios NOT TESTED. The inspected [saveStudent adapter](../../teacher-evaluations-frontend/src/services/backendContracts.js) omits generation_id in academic-record POST/PUT, chooses existing rows for PUT and first performs a separate personal update. Canonical new-year POST now requires the explicit cohort ID and missing it returns 400. Personal cohort changes still return 409. The frontend team must implement deliberate destination-cohort selection and an append transfer flow, show partial-save/error outcomes, and retain returned string IDs. Source inspection is not a newly executed browser failure. |
| Full E / operations / production | Selected-year resolver and downstream consumers NOT COMPLETED; major_scoped_generations capability remains absent. Real reviewed legacy mappings, normal recovery/rehearsal/cutover, new Brave acceptance, school-sized performance and production acceptance NOT TESTED. Word content/package/links checked; visual rendering NOT CHECKED. No backup deletion, commit or push. |

**Next backend slice:** resolve a cohort from the requested historical year and its stored record/approved anchor, with explicit unknowns rather than the latest profile pointer. Then apply that shared policy to group options, scope filters, enrollment/targeting, exports, self-context metadata, reviewed previews/retries and new frozen labels. The latest pointer may represent a future appended year; its value alone must not become a historical-year answer. Existing saved labels/versions remain protected. Reviewed mapping/cutover and matching frontend acceptance stay separate gates; full E is not claimed complete.

Ignored local evidence: .tmp/cohort-step34-focused-api.json, .tmp/cohort-step34-full-unit.json, .tmp/cohort-step34-full-api.json, .tmp/cohort-step34-evidence.json and .tmp/cohort-step34-after-baseline.json. These are working artifacts, not additional maintained reports.

### 13.40 Local Step 35: selected-year cohort resolution and consumers

**16 October 2026: selected-year resolver and consumer slice PASS; full E rollout remains IN PROGRESS.** The [shared cohort utility](../src/common/utils/student-cohort.util.ts) and [placement resolver](../src/common/utils/student-placement.util.ts) now distinguish a yearly cohort from the latest profile compatibility pointer. [Student reads/filtering/group options](../src/students/students.service.ts), [enrollment and reassignment](../src/enrollments/enrollments.service.ts), [evaluation targeting](../src/evaluations/evaluations.service.ts), [identifiable exports](../src/students/student-export.service.ts), [self-profile projection](../src/auth/student-self-context.ts), [student access](../src/student-access/student-access.service.ts), [reviewed snapshots](../src/reviewed-workflows/reviewed-workflows.service.ts) and [new target-label capture](../src/common/utils/target-labels.util.ts) consume that history. No schema change or migration; full major_scoped_generations capability remains absent.

**Why this matters.** A synthetic student starts in DS Gen 1 in 2090, explicitly transfers to FE Gen 1 in 2092, then DS Gen 2 in 2094. The profile points to DS Gen 2. A 2090 request must still use DS Gen 1; a 2092 request uses FE Gen 1. A missing 2093 placement can use the FE progression anchor for cohort/year-level display, but its group stays null and placement eligibility stays false. Equal cohort numbers never imply equal cohort IDs or majors. Reads never create yearly rows, assignment events or inferred ownership.

**Resolution and compatibility contract**

| Situation | Current behavior |
| --- | --- |
| Exact selected-year record with a resolved link | Use its generation_id and safe linked cohort metadata, even after a future transfer changes the profile pointer. Validate linked ID, MAJOR_SCOPED ownership and stored major. cohort_context.source=ACADEMIC_RECORD, availability=RESOLVED. Approved explicit level/group and existing PAUSE rules retain precedence. |
| Missing selected-year record | Choose the latest earlier structured record by start_year, never ID, name or array order. A resolved anchor gives source=PROGRESSION_ANCHOR. It supports progression display, without copying a group or granting eligibility. Future records do not become earlier anchors. |
| Unknown tracked history | An unresolved exact/latest applicable row, canonical orphan profile or year before the first known record returns generation_id:null, generation:null and COHORT_HISTORY_UNAVAILABLE. Do not skip an unknown latest anchor to borrow an older known cohort. Explicit record level/major/group can remain visible while eligibility is false. |
| Conflicting or invalid cohort evidence | Competing latest same-date cohorts/majors or undated tracked history for a missing year returns COHORT_CHRONOLOGY_UNAVAILABLE. Missing/mismatched relation ID, owner or stored major returns COHORT_OWNERSHIP_MISMATCH. No compatibility-pointer substitution. Existing progression chronology/PAUSE gates remain separate and retain their precedence. |
| Wholly legacy compatibility | A LEGACY_READ_ONLY profile with no resolved yearly links retains its earlier profile fallback, labeled source=LEGACY_PROFILE and availability=LEGACY_UNVERIFIED. No major/number/history is manufactured. Any resolved history prevents using a legacy pointer to bypass an unresolved selected row. Final legacy write/mapping cutover is not delivered. |
| Calculated level and groups | Generation calculation uses the selected cohort's entry metadata, not a later profile cohort. An approved yearly record/progression anchor still determines effective level. Unknown cohort calculation is UNAVAILABLE; existing known-cohort NOT_STARTED/BEYOND_PROGRAM behavior and levels 1-5 remain. Every missing annual group remains null/ineligible. |

Selected-year responses add academic_context.cohort_context with generation_id, safe generation metadata, source, availability, reason and anchor_record_id; placement also adds generation_id. Canonical generation metadata contains ownership_state, major_id, integer generation_number, safe majors, entry year and starting level. IDs remain decimal strings in HTTP, including 9007199254740993. Availability is RESOLVED, LEGACY_UNVERIFIED or UNAVAILABLE. This is current cohort metadata for the resolved historical link, not a reconstruction of an uncaptured historical name. Historical evaluation displays still use saved historical_labels.

Illustrative response excerpt, not fixed database IDs or a complete response:

```json
{
  "cohort_context": {
    "generation_id": "7",
    "source": "ACADEMIC_RECORD",
    "availability": "RESOLVED",
    "reason": null,
    "anchor_record_id": "20"
  },
  "placement": {
    "academic_year_id": "4",
    "generation_id": "7",
    "source": "ACADEMIC_RECORD",
    "year_level": 1,
    "major_id": "2",
    "class_group": "A"
  },
  "placement_eligible": true
}
```

**Consumer behavior and actual evaluation**

| Feature / scenario | Result and contract |
| --- | --- |
| Student lists/detail | PASS: academic_year_id plus generation_id filters resolved selected-year cohorts before pagination. Root generation_id/student_generations remain compatibility profile fields for admin personal editing; selected-year consumers must read academic_context.cohort_context. Omitting academic_year_id deliberately retains profile-pointer filtering and does not claim a historical-year answer. |
| Group options | PASS: exact-year records use their stored cohort links; the SQL legacy fallback applies only to wholly unresolved LEGACY_READ_ONLY histories. Canonical requests additionally return safe generation ownership/major/number metadata. Existing legacy response shape and empty/nonexistent-reference behavior remain. Options describe stored groups, including paused/inactive students; they are not proof of enrollment eligibility. |
| Enrollment and reassignment | PASS: direct enrollment, group previews/confirmations and reassignment validate the offering year's resolved cohort, group, major, level and existing eligibility. A later pointer that matches the wrong old-year scope cannot bypass validation. Reassignment preserves academic rows and frozen/protected work. Unknown cohort history blocks new enrollment with an administrator-review message. |
| Evaluation selection | PASS: SELECTED_GENERATIONS/group filters and preview roster labels use each offering-year cohort among actual enrollments. Equal-number DS/FE cohorts stay separate. Unknown tracked cohort history is excluded and counted in additive ineligible_reasons.cohort_unavailable; existing paused/group/level reasons remain. This does not add plural audience restrictions or anonymous answer slicing. |
| Reviewed confirmation and retries | PASS: stored snapshots bind relevant selected-year records/cohort metadata and progression facts. A future transfer alone leaves a valid older-year enrollment or evaluation-creation review usable. Old-year group drift or selected major-label drift returns 409 REVIEW_STALE with no business writes. Completed enrollment/creation retries return the original receipt without recomputing rosters or labels. No dedicated new transfer-preview receipt is introduced. |
| Frozen target labels | PASS: new canonical generation/group target snapshots additionally capture ownership, major ID/display metadata and integer cohort number. Keep historical_labels.schema_version=1, supported by the existing database constraint; additions fit its existing extensible object. Old captured/unknown snapshots remain untouched. Renames change current_labels while saved names/major/number remain frozen. This does not complete K's future all-participant audience snapshot contract. |
| Scoped exports | PASS: with an academic year, cohort filtering and row generation labels use selected-year context; unresolved tracked context yields generation:null and a reason. Existing assigned OPEN/CLOSED period restriction, historical placement groups and participation counts remain. Without a year, generation retains compatibility-profile metadata. Exports contain authorized identifiable participation data, never anonymous answers. |
| Self-profile and access | PASS: auth/me uses the existing active-year policy; student.generation follows that year's cohort and is null for unresolved tracked history. academic_context exposes safe cohort metadata and stored yearly generation_id. Missing groups remain missing. Available evaluations omit unanswerable rows; assigned history reports COHORT_HISTORY_UNAVAILABLE. Direct enrolled/assigned draft and submission attempts return 403 with that code and no writes. Existing history ownership, CLOSED-only lecturer results and anonymity safeguards remain. |
| New unit and HTTP cases | PASS: 20 new unit cases, comprising 19 cohort-policy cases and one nested self-projection privacy case; 35 new real HTTP cases. Exact/anchor resolution, future transfers, missing/unknown history, ownership/chronology, legacy behavior, input preservation, BigInt precision, per-year filters/options/enrollment/reassignment/targets/export/self/access, review drift/retries, immutable labels and permissions are covered. |
| Final regression | PASS: 260 focused API cases/4 suites (new resolution 35, placement 88, consistency 86, academic integrity 51). Fresh full 580 unit tests/45 suites and 1,860 API/integration cases/38 suites, no failures/skips/todos. New cases are included in full totals. Step 34's 560/1,825 is prior evidence. Standalone read-only preflight/audit rerun: 41 PASS, excluded from Jest totals. |
| Isolation / engineering / scope | PASS: every new HTTP case compares all shared public table/ledger row hashes and 25 sequence states; owned 19-migration fixture namespace is cleaned as a whole. Final test 31 tables/226 columns/19 successful migrations/25 sequences, no owned fixture schemas. Types/build/scoped formatting/diff PASS; lint zero errors/five existing warnings, new-source lint zero warnings. Of 445 prior protected files, 428 unchanged and 17 intended consumer/projection/Swagger/unit updates; three added utility/unit/HTTP files. Frontend, private configuration, migrations and retained backup unchanged. |
| Discovery and correction evidence | Initial focused units exposed old query/response expectations and inconsistent legacy mock-pointer behavior; the latter was fixed without weakening scope rejection. Initial HTTP checks detected an unsupported snapshot-version increment; code now retains schema_version=1 and original SQL. Expanded checks found the wrong legacy-state literal and a test expecting a blocked row in the available-only list; corrected to the actual LEGACY_READ_ONLY schema and assigned-history contract. Enrolled/assigned fixtures then exercise the specific cohort gate, including explicit 403 codes, rather than failing earlier for missing enrollment. An incorrect nonexistent suite path was corrected to actual existing suites. Final passing totals above are the acceptance evidence. |
| Integration / operations / Word | New Brave scenarios NOT TESTED; source handoff only. Full E capability absent. Real reviewed legacy mappings, normal access/migration/recovery, new backup restore, school-sized performance and production acceptance NOT TESTED. Normal remains recorded 28/199/18/24, NOT REAUDITED. Word package/content/links checked; visual rendering NOT CHECKED. No backup deletion, commit or push. |

**Frontend handoff:** the inspected frontend account mapper still reads the profile generation pointer and its yearly save omits generation_id. A selected-year view must consume cohort_context and its explicit unavailable/legacy states; self generation can now be null. Retain saved cohort string IDs and major/number metadata, and supply generation_id for cohort-tracked yearly POST. Admin personal editing still uses the compatibility pointer and rejects a changed cohort. Coordinate and evaluate the actual frontend revision in Brave; backend API passes are not frontend acceptance.

**Remaining E gates:** authenticated reviewed real-mapping/cutover support beyond the owned-schema executor prototype, reviewed ownership mappings, coordinated retirement of transitional legacy writes, frontend contract/acceptance and separately approved normal recovery/rehearsal/migration. Do not advertise major_scoped_generations until the complete agreed rollout contract is supported. Subsequent backend work remains G course codes, H curriculum, J combined assignments/enrollment, B/F/I rollover, A/K audiences, O duplicates, N activity, M extensions, L create/publish, P prerequisite contracts and Q bulk publication; S/A5 privacy stays deferred to school policy.

Ignored working evidence: .tmp/cohort-step35-focused-api.json, .tmp/cohort-step35-full-unit.json, .tmp/cohort-step35-full-api.json, .tmp/cohort-step35-evidence.json and .tmp/cohort-step35-after-baseline.json. No additional maintained report is created.

### 13.41 Local Step 36: authenticated isolated reviewed cohort mapping

**16 October 2026: authenticated mapping workflow PASS for its isolated rollout; full E and normal deployment remain IN PROGRESS.** New [controller](../src/student-generations/cohort-mapping.controller.ts), [service](../src/student-generations/cohort-mapping.service.ts) and [Swagger contracts](../src/student-generations/dto/cohort-mapping.dto.ts) wrap the existing [mapping executor](../scripts/lib/cohort-mapping.cjs) and [review store](../src/reviewed-workflows/reviewed-operation.store.ts). Routes are ADMIN-only, disabled unless COHORT_MAPPING_ENABLED is exactly true as a string, and restricted by actual connection context to teacher_evaluation_test/public or verified-format owned cohort test namespaces. This is backend delivery with synthetic evaluation, not authorization or evidence for mapping real school records.

**Purpose and complete request flow**

| Route | Behavior |
| --- | --- |
| GET /api/student-generations/mapping/inventory | Read the complete inventory, source fingerprint and saved reference hashes. Include cohort identity/entry metadata, profile/yearly/scope references, structured years/majors and frozen target context. No passwords or password hashes, student codes, notes, draft contents or anonymous answers are returned. SHA-256 reference digests bind the reviewed source values without exposing them. |
| POST /api/student-generations/mapping/preview | Supply exactly source_fingerprint, reason, cohorts, profiles, records, scopes and frozen_targets. Every source reference appears once with its unchanged expected_sha256 and explicit destination/disposition, including retained unknowns. Server authors actual database/schema, reviewer_id, operation UUID, reviewed_at and manifest expiry. Return manifest, impact, review_id and expires_at. Only review storage changes; no cohort, profile, yearly record, scope, assignment event or mapping receipt is written. |
| POST /api/student-generations/mapping/confirm | Submit exactly review_id and the unchanged complete manifest returned by preview. Revalidate the actor/current token revision, operation/input binding, target, schema/source state, ownership and chronology. Atomically commit explicit links, MIGRATION events, immutable operation/receipt evidence and review completion. Relevant drift returns 409 REVIEW_STALE; changed input returns REVIEW_INPUT_MISMATCH; uncommitted expiry returns REVIEW_EXPIRED. |
| GET /api/student-generations/mapping/receipts/:reviewId | Actor-bound, read-only recovery of the immutable original mapping receipt. A committed receipt returns original IDs/counts plus already_applied=true, including after preview expiry and unrelated later source changes. Another actor or different operation is hidden with 404. MAPPING_NOT_COMMITTED means no committed receipt is visible in that snapshot; retry the same confirmation after an uncertain response. |

For Swagger evaluation, authenticate a synthetic ADMIN, inspect the inventory, prepare a complete explicit proposal, preview it and review the returned destinations/counts and retained frozen/unknown references. Confirm the returned manifest unchanged; do not construct server-authored target/reviewer/timestamp fields yourself. Retain review_id, manifest and operation ID for lost-response recovery. An ambiguous 500 response is not proof that the operation was uncommitted; check the receipt and retry the original body rather than making a replacement mapping.

The flag is opt-in runtime configuration; no private environment file was edited here. Automated tests set it only inside their process and restore it. An enabled endpoint on a schema without migration 20 returns 409 MAPPING_MIGRATION_REQUIRED. Default disabled requests return 503 COHORT_MAPPING_DISABLED; authentication/role failures still return 401/403 first. Normal and arbitrary databases remain unsupported even with the flag. Full major_scoped_generations capability stays absent.

**Mapping meaning and preservation safeguards**

| Area | Current contract |
| --- | --- |
| Explicit dispositions | RETAIN_UNRESOLVED preserves a legacy cohort. SPLIT_KEEP_LEGACY_REFERENCE creates or explicitly reuses destination cohorts while retaining the old identity. KEEP_ID_AS_CANONICAL preserves an eligible unused/compatible legacy ID, name, entry metadata and timestamps. KEEP_EXISTING_CANONICAL retains resolved identity. Major/positive integer number pairs and destination keys must be distinct; there is no automatic alias merge or equal-number inference. |
| Unknown old records after a known later cohort | The trusted HTTP adapter permits an explicit destination for an unresolved old yearly record even when today's profile already points to another canonical cohort. The reviewer must bind the actual record hash, its major and a valid entry/year chronology. This resolves Step 35's mixed-history case without inferring that history from the current profile. Resolved yearly links cannot be rewritten. |
| Latest placement and PAUSE | Affected histories require structured, unambiguous years. The profile pointer must agree with the latest reviewed/resolved yearly cohort. Canonical profile changes still require the ordinary yearly TRANSFER workflow; mapping is not a bypass. Existing class groups, year levels, major/year identity, progression actions, account fields and timestamps remain unchanged. A PAUSE remains effective after mapping; no annual group, RESUME, enrollment or evaluation is manufactured. |
| Frozen and canonical references | Every frozen generation/group reference must be explicitly retained. Keep-ID canonicalization is rejected when frozen legacy targets reference that identity; split while retaining the original reference instead. Canonical offering scopes cannot be moved to another cohort through legacy mapping. Captured labels, legacy unknown labels, questionnaire versions, enrollments, participants, drafts, completions and anonymous responses/answers remain unchanged. |
| Atomic evidence | The existing mapping_operations and mapping_receipts tables retain immutable manifest/receipt evidence; each newly resolved yearly record receives its matching MIGRATION assignment event. Receipt references and current ADMIN identity are checked. Existing append-only protections and deferred evidence checks remain enabled. Raw link updates intentionally preserve original timestamps, independently verified by row hashes. |
| Review and retries | Reviews expire after 15 minutes. Schema/data fingerprints include school data and schema definitions; HTTP review-row data is excluded from staleness so storing another preview does not invalidate a review. Confirmations lock and validate inside the bound transaction. Completed identical retries return their original receipt after expiry/source drift; changed input or a different actor cannot reuse it. Generic MAPPING_FAILED responses explicitly direct receipt recovery rather than claiming rollback after an uncertain response. |
| Boundaries and sizes | The complete manifest validator bounds cohort/profile/record/scope/frozen-reference arrays, exact keys, UUIDs, SHA hashes, signed-BigInt strings, positive integer numbers, dates, reason and a 5 MiB serialized manifest ceiling. The application's unchanged default JSON body parser is approximately 100 KB, so actual HTTP acceptance is smaller. Large-school request sizing, whole-inventory scan/lock cost, retention and production operating limits remain work to evaluate. No school-sized benchmark is claimed. |

Default prototype inspectMapping/applyMapping calls still reject shared public schemas; the authenticated adapter has a separate explicit test-only policy. Its HTTP request body cannot select that policy or a different connection. The prior 54 prototype checks remain passing. Direct school/normal mapping support and production target policy require a separately reviewed rollout; this step enables neither.

**Migration 20 and actual evidence**

| Check | Result / evidence boundary |
| --- | --- |
| Why a migration is required | Existing SQL constrained reviewed_operations.operation_kind to six earlier workflows. New [migration 20](../prisma/migrations/20261016020000_add_reviewed_cohort_mapping_kind/migration.sql) atomically extends that CHECK with COHORT_MAPPING, retaining the six existing values. No original migration, Prisma model, table, column, sequence, ownership or application record is rewritten. |
| Owned rehearsal and rollback | PASS: before shared-test migration, 178 checks across four owned-schema mapping/history suites passed, including 54 new HTTP cases at that checkpoint. A separate owned constraint rehearsal injected a final DDL failure, verified the old constraint was restored, then applied the real SQL successfully. Later final coverage adds the 55th missing-migration prerequisite case and all 38 password HTTP cases. |
| Protected test backup | New custom-format test backup retained with restricted ACL, SHA-256 and pg_restore table-of-contents verification. Backup is 152,326 bytes, SHA-256 6bbc1623b918dd3978e984e107fbb8da8f2a92428eb98c5b4b9e13c8e143cae3. Restoration was NOT EXECUTED; index/hash verification is not restore proof. Prior Step 31 backup remains unchanged. |
| Actual shared-test migration | PASS: guarded local teacher_evaluation_test migration 19 to 20. All original values in 31 application tables, all 25 last_value/is_called sequence states and all 19 prior complete migration rows were preserved exactly at cutover; exactly one successful ledger row appended. Final schema remains 31 application tables/226 columns/25 sequences, now 20 successful migrations. No shared-public legacy mapping was applied. Normal remains recorded 28/199/18/24, NOT REAUDITED and not accessed/migrated. |
| New unit checks | PASS: 22 in [cohort-mapping.service.spec.ts](../src/student-generations/cohort-mapping.service.spec.ts): disabled modes, signed claims/expiry, identity, role/status/revocation and fake unsupported target contexts without a real normal-database connection. |
| New real HTTP checks | PASS: 55 in [cohort-mapping-http.e2e-spec.ts](../test/cohort-mapping-http.e2e-spec.ts): role/auth/gate/prerequisite handling, strict complete proposals, server-authored metadata, preview-only persistence, ownership/chronology/frozen guards, stale/expired/cross-actor reviews, canonical reuse/keep-ID, rollback, competing confirmations, old unresolved history under a canonical profile, persistent PAUSE, exact high IDs, protected values/timestamps and original receipts after actual preview expiry with a current token. |
| Fresh final regression | PASS: 217 focused API cases/5 suites: new HTTP 55, original executor 54, expansion 35, historical resolution 35 and password 38. Fresh full 602 unit tests/46 suites and 1,915 API/integration cases/39 suites, no failures/skips/todos. New 22/55 cases are included in full totals. Step 35's 580/1,860 remains dated evidence. Separate standalone preflight/audit rerun: 41 PASS, excluded from Jest totals. |
| Failure/retest evidence | Initial preview attempts correctly exposed the missing SQL review kind; a new migration was added rather than weakening the old constraint. Confirmation stale-code handling was aligned with the review contract. The first full API attempt was not accepted: an unconfigured JwtService provider affected password-test signing; editing during that run also produced stale/mixed dependency metadata. Its preserved result is 1,794 passed/120 failed, 1,914 total before the additional prerequisite case. The provider was removed, verification kept local with an explicit secret, and fresh focused/full runs above passed. No password assertions were relaxed and no tests skipped. |
| Scope, engineering and isolation | PASS: types/build/scoped formatting/diff; lint zero errors/five existing warnings, new-source lint zero warnings. Of 448 prior protected files, 441 unchanged and seven intended executor/review/module/Swagger/fixture/audit updates; six added controller/service/DTO/unit/HTTP/migration files. Each new HTTP case preserves shared-public rows/ledger/25 sequence states; exact owned namespace cleanup is verified. Frontend, private configuration, original migrations and retained backups remain unchanged. |
| Frontend, Word and deployment | New Brave scenarios NOT TESTED; the unchanged inspected frontend has no new mapping request/UI integration. Word package/content/links checked; visual rendering NOT CHECKED. Real ownership/provenance approval, controlled legacy-write retirement, matching frontend acceptance, normal target support/recovery/rehearsal/migration, school-sized performance and production acceptance remain pending. No backup deletion, commit or push. |

**Next:** agree and implement the controlled legacy-write/capability cutover contract while preserving explicit unresolved history, then evaluate real ownership evidence and the matching frontend before any separately approved normal rollout. The remaining G/H/J/B-F-I/A-K/O/N/M/L/P/Q roadmap and school S/A5 privacy decision remain; this mapping step does not implement those features or establish complete E/production acceptance.

Ignored local evidence: .tmp/cohort-step36-rehearsal-api.json, .tmp/cohort-step36-focused-api.json, .tmp/cohort-step36-full-unit.json, .tmp/cohort-step36-full-api.json, .tmp/cohort-step36-first-full-api.json, .tmp/cohort-step36-migration-evidence.json, .tmp/cohort-step36-evidence.json and .tmp/cohort-step36-after-baseline.json. Retain the protected backup; these are working evidence, not additional maintained reports.

### 13.42 Local Step 37: controlled legacy writes and schema-gated cohort capability

**16 October 2026 — PASS for this backend cutover slice.** E's major-owned write contracts now have an explicit operator switch and a connected-schema capability gate. This completes the local write-mode support after Steps 31–36; it does not complete actual legacy ownership review, school deployment or frontend acceptance. Default compatibility remains active because no private configuration was edited. The request authorizes this backend slice, its isolated verification and the four maintained documents; no frontend edit, normal database operation, backup deletion, commit or push occurred.

**Why this change was needed**

Before this step the canonical routes worked, but compatibility routes could still create a student linked to a legacy label, import a global label and append an unresolved yearly placement. Advertising major_scoped_generations under those rules would overstate the enforced contract. The new switch lets the operator coordinate that boundary with the frontend team without inferring old ownership or rewriting historical data.

| Contract | Implemented behavior |
|---|---|
| Exact opt-in | REQUIRE_MAJOR_SCOPED_COHORTS must equal the literal string true. Missing/false/TRUE/1 do not enable it. This process setting is independent of REQUIRE_REVIEWED_CONFIRMATION and the separately disabled, test-only COHORT_MAPPING_ENABLED. Requests cannot choose a mode, database or schema. No setting was saved to a private file. |
| Compatibility before cutover | Legacy student creation, global-label imports and unresolved yearly creation retain their earlier behavior. Major-owned catalog/import/create/transfer contracts remain available. The capability is absent until strict mode is enabled and deployment checks pass. |
| Strict student creation | POST /api/students requires the chosen generation_id to resolve to a MAJOR_SCOPED cohort and match the initial major. An existing legacy label returns 400/MAJOR_SCOPED_COHORT_REQUIRED before account/profile/record creation. Canonical account/profile/yearly record/INITIAL evidence remain atomic. |
| Strict imports | Unscoped label-only imports return 400/MAJOR_SCOPED_COHORT_REQUIRED before any creation, including retries containing only existing student codes. Supply major_id and generation_number, or a supported numeric generation alias with explicit major_id. All spreadsheet rows must resolve to that major; no first-match major inference is allowed. Request-wide validation, per-student atomic evidence, skip-on-retry and partial runtime row results remain unchanged. This is not an all-or-nothing batch import. |
| Strict new yearly placements | A wholly unresolved legacy student cannot receive another omitted-cohort placement. An explicitly selected canonical cohort still cannot bypass the reviewed mapping prerequisite. Tracked students continue to require an explicit generation_id, unambiguous chronological append and explicit destination major/cohort for TRANSFER. Existing 409 mapping/chronology/context/history guards remain. |
| Legacy corrections and reads | Reads, exports, personal edits, same-identity echoes and permitted group/year-level/PAUSE/RESUME corrections remain available. Changing an unresolved record's student/year/major or labeling it TRANSFER is rejected in strict mode. No historical generation_id, MIGRATION event or ownership is invented. Historical nulls and saved labels remain intact. Existing removal/history protections are unchanged; the switch does not introduce a general deletion ban. |
| Capability | GET /api/auth/me includes capabilities.major_scoped_generations=true only when strict mode and both connected-namespace deployment checks pass. This works with zero cohorts and for authenticated ADMIN/LECTURER/STUDENT profiles, including a student without a profile. Otherwise the field is absent; change_password remains unchanged. Login stays unchanged: clients must refresh /auth/me for this capability. |
| Deployment prerequisites | Read-only catalog checks verify required cohort columns/types, named validated ownership/unique/FK/action constraints, the COHORT_MAPPING review-kind CHECK and eight enabled cohort/history triggers in current_schema(). Successful, non-rolled-back migration 19/20 ledger entries must have their verified SQL checksums. Row counts and existing cohorts never determine support. The check neither connects to another database nor claims a complete schema/security audit. |
| Incomplete deployment | The capability stays absent; strict new cohort/catalog/student/import/yearly writes return 503/COHORT_SCHEMA_NOT_READY before mutation. Database connection/query failures propagate as failures rather than a successful empty dependency. Checks are not cached, so drift can remove the capability on the next profile request. They are not a replacement for controlled migrations or protection against a malicious schema owner. |
| Separation of concerns | A true write capability does not mean legacy mappings are complete, reviewed mapping is enabled, the normal database is migrated, the real UI passed, or production is ready. Unresolved legacy rows may remain visible while strict creation is available. Each acceptance gate needs its own evidence. |

**How the frontend and operator should use it**

1. Agree a matching frontend revision and use only the isolated test startup described in TESTING.md. Keep normal credentials and records out of synthetic tests. Verify migrations through the guarded test commands; Step 37 adds no migration.
2. Update frontend cohort selection/imports to carry an explicit major and saved cohort ID/number. The current unchanged frontend [backendContracts.js](../../teacher-evaluations-frontend/src/services/backendContracts.js) still resolves generations globally by label, creates a cohort without major_id/generation_number and omits generation_id in yearly saves; [userProfile.js](../../teacher-evaluations-frontend/src/services/userProfile.js) currently consumes only change_password. These are source integration findings, not newly executed browser results.
3. For an agreed isolated cutover, set REQUIRE_MAJOR_SCOPED_COHORTS=true in that terminal session before npm.cmd run start:test. The guarded launcher selects teacher_evaluation_test; do not use the ordinary normal startup. Leave mapping disabled unless running its separately reviewed isolated workflow. Refresh /auth/me after restarting and require the literal boolean true before enabling the new UI write flow.
4. Send canonical requests, surface structured errors and preserve unsaved input. MAJOR_SCOPED_COHORT_REQUIRED asks for explicit major/cohort selection; COHORT_MAPPING_REQUIRED asks for a reviewed historical mapping. COHORT_SCHEMA_NOT_READY is an operator deployment issue; never retry with a legacy global label. Do not fabricate a successful save from a failed request or collapse dependency failure into an empty selector.
5. Demonstrate old-year reads, yearly groups, PAUSE until RESUME, imports/retries and explicit transfer through Brave on the matching revision. Preserve old labels and history. Actual school ownership mappings require reviewed evidence; normal backup/restore/rehearsal/migration and coordinated enablement still require their own approval.

Clearing the session switch and restarting returns to compatibility writes; it does not undo canonical records, mapping receipts or migration history. Keep resolved ownership and historical protection in every mode. This is a compatibility setting, not a data rollback procedure. No normal cutover or restore was executed in this step.

**Actual verification and remaining acceptance**

| Scenario | Status | Evidence / limit |
|---|---|---|
| Exact switch, no-op compatibility, ready/missing schema, missing ledger, 503, recheck and propagated DB failures | PASS | 17 new unit checks. |
| Empty installation capability, role/self behavior, opt-in/out and independent mapping switch | PASS | New HTTP cases against a genuinely migrated owned namespace, initially with no cohorts. No profile/row invention. |
| Compatibility writes; strict legacy rejection; canonical catalog/import/create/continue/transfer; mixed-major rejection; skips/duplicate retries | PASS | Included in 43 new HTTP cases. Every new case checks shared public test rows, complete ledger and all 25 sequence states unchanged. |
| Legacy read/export/personal/group/progression corrections and protected history | PASS | Null yearly cohorts remain null, no manufactured audit events; existing creation/import/placement/resolution/mapping suites retained. Non-identity corrections were exercised with PAUSE then explicit RESUME. |
| Connected-schema drift | PASS | Owned-only constraint renames, a temporarily disabled identity guard, an incorrect migration checksum and rolled-back ledger entry suppress capability; guarded writes reject missing prerequisites. Restored in finally blocks. No shared/normal DDL and no immutable audit trigger was disabled. |
| Focused regression | PASS | 349 API cases across six suites: cutover 43, import 60, student CRUD 68, placement 88, resolution 35 and authenticated mapping 55. |
| Fresh full regression | PASS | 619 unit cases/47 suites and 1,958 API-integration cases/40 suites; zero failures/skips/todos. New 17/43 cases are included, not added twice. 41 standalone audit checks pass separately. |
| Engineering | PASS | Whole-repository TypeScript, build, scoped formatting and diff checks; lint zero errors/five pre-existing warnings, new files zero errors/warnings. |
| Current frontend strict cohort contract | FAIL | Source mismatch described above; frontend files were not edited or executed for acceptance. These are handoff fixes, not backend regressions. |
| Actual matching frontend/Brave workflow | BLOCKED | Matching frontend request/capability changes and coordinated isolated setup are needed. No new browser scenario was executed; backend HTTP tests do not establish UI acceptance. |
| Actual school ownership / normal cutover | BLOCKED | Reviewed real ownership evidence, matching frontend and separately approved normal recovery/rehearsal/migration/enablement remain prerequisites. Normal was not accessed. |
| School-load performance / production acceptance | NOT TESTED | Uncached readiness scans, import transaction/load behavior, mapping request-size/lock/retention limits and production operating targets need agreed benchmarks and deployment acceptance. |
| Word visual rendering | NOT TESTED | Markdown/Word content synchronization, package/XML/CRC, metadata and links checked; visual rendering NOT CHECKED. |

The retained first HTTP run failed 0/39 because synthetic users lacked required timestamps; the second ran 37/39 with two incorrect response assertions. The fixtures and assertions were corrected to use the existing summary object. Final focused and fresh full reports pass all 43 new cases; no existing assertion was weakened and the earlier failures are not accepted delivery evidence. A new unit test-table formatting error was also corrected before the passing run. The focused/full-unit PowerShell logging wrapper reported a native stderr status despite passing Jest JSON/log summaries; final full API used direct command-shell redirection and completed successfully. Accepted counts come from parsed final Jest reports with no pending/failed/todo cases.

No migration was added. Final read-only audit remains **teacher_evaluation_test/public: 31 application tables, 226 columns, 20 successful migrations, 25 sequences**, with no owned namespaces left behind. Normal remains the **14 October recorded 28/199/18/24**, not reaudited. Synthetic full suites may advance isolated public sequences; none is reset. Each new owned-schema case preserves shared state. Retained migration SQL and protected backup hashes match their recorded evidence; no backup was deleted or restored. Of 454 prior protected files, 443 remain unchanged and 11 are intended source/Swagger updates; three new source/test files yield a 457-file baseline. All 145 frontend files and private configurations remain unchanged.

Sources: [write policy](../src/common/utils/cohort-write-policy.ts), [policy units](../src/common/utils/cohort-write-policy.spec.ts), [HTTP verification](../test/cohort-write-cutover.e2e-spec.ts), [profile capability](../src/auth/auth.service.ts), [import dispatch](../src/students/student-import.service.ts), [major-aware imports](../src/students/student-cohort-import.service.ts), [student creation](../src/students/students.service.ts), [yearly creation](../src/student-academic-records/student-academic-records.service.ts), [history guard](../src/student-academic-records/student-cohort-placement.service.ts) and [catalog](../src/student-generations/student-generations.service.ts). Retained local evidence is .tmp/cohort-step37-evidence.json with focused/full Jest reports and a protected after-baseline; these ignored synthetic artifacts are not additional docs files.

Next independent backend slice is G: atomic automatic course-code generation, preserving explicit official codes and existing identities. E's actual ownership review and frontend/normal rollout remain separate gates; H/J, atomic year/group/teaching rollover, audience/submission/audit/publication/bulk work, school privacy decisions, operational recovery, performance and thesis handoff remain in the dependency-ordered roadmap. Missing original requirement text remains disclosed; this step uses the preserved FR01–44/A–S register and unchanged improve.txt. No claim of complete frontend or production readiness is made.

### 13.43 Local Step 38: atomic course-code allocation and durable creation receipts

**16 October 2026 — PASS for requirement G's backend slice.** Course creation can omit course_code; the backend allocates and saves it atomically with a durable, actor-bound retry result. Official case-sensitive codes and historical course identities remain preserved. New 33 unit/50 HTTP cases are included in fresh full 652 unit/2,008 API cases across 48/41 suites PASS. Focused regression passes 334 cases/six suites; 41 standalone checks pass separately. This is backend evidence, not complete frontend acceptance or production readiness.

**Purpose and final contract**

The previous create DTO required the browser to supply a code. A suggested code in a loaded catalog is not reserved, and a lost creation response could leave the administrator uncertain whether another POST would duplicate the subject. The server now owns automatic allocation, while a client-generated key identifies one intentional creation across retries. Active ADMIN accounts remain school-wide under the approved policy; primary-department membership is metadata, not a new access restriction.

| Operation | Implemented behavior |
|---|---|
| POST /api/courses, automatic | Omit course_code; supply required nonblank course_name, safe numeric department_id and an Idempotency-Key UUID v4 header. Blank/null codes are invalid rather than an automatic-mode shortcut. The response is the original course object with authoritative course_code and string response IDs; no new wrapper breaks existing consumers. |
| Generated prefix/number | Normalize the selected department code with Unicode NFKD, remove U+0300–U+036F combining marks, uppercase, replace non-ASCII letter/digit runs with hyphens, strip edge hyphens, cap the prefix to 20 characters and strip a final hyphen. Empty/unusable prefixes return 400/COURSE_CODE_PREFIX_REQUIRED; an official code remains available. Department rows/codes are not changed. Start at PREFIX-001; pad to at least three digits, support 1000 and BigInt arithmetic, and reject final codes over 30 characters with 409/COURSE_CODE_EXHAUSTED. |
| Occupied codes | While holding the transaction lock, consider numeric suffixes from current courses and retained completed CREATE_COURSE results, regardless of prefix case. Manually occupied suffixes and zero-padded numeric aliases move the next number forward. Departments normalizing to the same prefix share its global number space. Do not infer a course ID from its number. Allocation advances from the largest reserved suffix; it is not gapless. |
| Concurrency and atomicity | Shared transaction advisory lock course-code-allocation:v1 serializes API creation and code edits; READ COMMITTED intentionally sees the preceding allocator's committed rows after waiting. ACTIVE ADMIN and department status/code are checked under row-share locks. Course and completed receipt commit together. Keep the existing global exact unique index as a final arbiter; keyed unique conflicts retry the whole transaction at most twice before the existing 409. Five-second lock timeout and 20-second transaction timeout bound creation waits. Arbitrary SQL/seed writers do not participate in the API advisory-lock protocol. |
| Official-code compatibility | Supplied codes remain trimmed, nonblank and at most 30 characters, retaining case and internal characters, including literal percent/underscore. Exact duplicates return the existing 409 course_code already exists. Case-sensitive official identities remain allowed, including case variants. Never uppercase or replace a supplied code to resolve a conflict. Existing unkeyed official requests remain compatible; add a key to obtain durable retry recovery. |
| Updates and historical identity | Name/department edits retain the stored code when course_code is omitted; explicit code edits retain the earlier validation/unique rules. No automatic regeneration on edit. Existing course IDs/FKs, curriculum approvals/revisions, teaching assignments, questionnaire versions, completion and anonymous answers are not rewritten. |
| Key and input binding | UUID v4 header, canonicalized to lowercase, generated once per intended creation. A committed key binds the authenticated actor, CREATE_COURSE resource and normalized DTO input, including automatic versus explicit mode. Identical retries return HTTP 201 with the saved original object. Changed committed input returns 409/COURSE_CREATE_INPUT_MISMATCH; another actor cannot read or claim it (404); another operation cannot reuse it (409/IDEMPOTENCY_KEY_IN_USE). |
| Durable storage | Reuse reviewed_operations with the new CREATE_COURSE kind, inserted already completed in the same transaction. No preview is required for course creation. expires_at equals completion time and does not expire a completed course receipt. Keep completed receipts indefinitely until an agreed retention/recovery policy preserves retry identity and reserved suffixes. This is an administrative result store, not delivery of N's activity/audit requirements or a new SQL immutable-log guarantee. |
| Recovery | GET /api/courses/creation-receipts/:key returns {idempotency_key,course,already_applied:true} for the authenticated original actor. Original result survives later edits, deactivation, elapsed expiry or course deletion; it is not the current course state. Missing receipt 404 means no committed result is visible in that snapshot, not proof that an in-flight request rolled back. Recover or retry the original POST with the same key/input after an uncertain response. |
| Errors and permissions | Key missing for automatic mode: 400/IDEMPOTENCY_KEY_REQUIRED; invalid UUID: 400/IDEMPOTENCY_KEY_INVALID. Missing receipt deployment: 503/COURSE_CODE_SCHEMA_NOT_READY. Bounded concurrency failure: 409/COURSE_CREATE_RETRY_REQUIRED. Other unexpected creation errors: 500/COURSE_CREATE_RESULT_UNCERTAIN, directing receipt recovery rather than claiming rollback. Anonymous requests are 401; student/lecturer writes and receipts are 403. Current ADMIN role/status is rechecked in the transaction; JWT/session checks remain. |
| Capability | GET /api/auth/me advertises capabilities.automatic_course_codes_v1=true only when the connected schema has the supported CREATE_COURSE CHECK, completion constraint and valid global unique course-code index, including with an empty catalog. Otherwise absent. It indicates implementation support, not authorization or UI/production acceptance. Login is unchanged; fetch /auth/me. E's independent strict-mode capability and mapping opt-in remain unchanged. |

**Case-collision preflight and safe rollout**

The [isolated read-only preflight](../scripts/course-code-preflight.cjs) uses the existing local-test guard, a read-only repeatable-read snapshot and before/after fingerprints of all application rows, migration ledger and 25 sequence states. It groups existing codes using PostgreSQL lower(course_code), reporting original IDs/codes without renaming. Actual shared-test preflight before and after this step reports zero collision groups with unchanged fingerprints. Synthetic owned fixtures deliberately retain Case-Old/case-old and an additional official variant, verifying preservation. This is not a normal-school collision audit.

No case normalization or case-insensitive unique index is introduced. Migration 21, 20261016030000_add_course_creation_receipts, only adds CREATE_COURSE to the existing operation-kind CHECK while retaining all seven prior kinds. It changes no Prisma models, application tables, columns, sequences or course codes. The migration was rehearsed through 147 owned-schema HTTP checks and an injected final-DDL failure/rollback, then applied only to teacher_evaluation_test after a protected custom-format backup. All 31 original application tables' rows, all 25 sequence states and all 20 prior complete migration rows were preserved; exactly one ledger row was appended. Normal was not accessed or migrated.

The retained backup has 153,067 bytes, SHA-256 551d78518bb2eba591e3e8015714d62fd97cd90d5fa75a2f7bb7916a4177ef9c, owner/SYSTEM restricted access and a checked archive table of contents. Restore was NOT EXECUTED. Migration SQL SHA-256 is 1e6bf65bef77888e189dd4d7b5db788c58e12687cef413311e587c756c1308c4. Earlier migration/backup hashes remain intact. The ignored local .tmp/course-step38-migration-evidence.json records the retained archive path and preservation evidence; no backup was deleted.

**Frontend handoff and actual evaluation**

The unchanged [academicSetup.js](../../teacher-evaluations-frontend/src/services/academicSetup.js) still requires an explicit code/name, supplies course_code and sends no new idempotency header; [userProfile.js](../../teacher-evaluations-frontend/src/services/userProfile.js) does not consume this capability. improve.txt describes a prepared suggestion flow, but the inspected workspace must not be treated as a matching delivered automatic-allocation UI. Preserve existing manual-code saves. On a matching revision, fetch /auth/me; leave automatic-mode code omitted, retain manually edited codes, create/store a UUID once, and use the returned stored code. No separate generate button or speculative code reservation is needed. Preserve form input on 400/409/503/network errors, and do not silently create a new key after an uncertain outcome. This backend step does not edit the frontend or start a persistent browser/API session.

| Scenario | Status | Actual evidence / acceptance boundary |
|---|---|---|
| Prefix/number/key/length/readiness rules | PASS | 33 new unit cases. Includes aliases, 999→1000, BigInt suffixes, Unicode prefix sanitization, unusable prefixes and 30-character exhaustion. |
| Empty catalog, official codes, department changes, code collisions, role/scope and Swagger | PASS | Included in 50 new owned-schema HTTP cases. Official case-sensitive identities and literal special characters remain supported. |
| Two admins, duplicate concurrent key, manual/automatic race and bounded lock wait | PASS | Unique committed results, once-only same-key execution and 409 retry guidance; same key succeeds after lock release. A small concurrency test is not a school-load benchmark. |
| Receipt insert failure and recovery | PASS | Injected owned receipt trigger failure rolls back course/result rows; original key safely retries. Original result recovers after edits, inactive department, expiry and deletion. No sequence reset; rolled-back inserts may leave ID gaps. |
| Historical preservation | PASS | Every new HTTP case checks shared public rows/ledger/all 25 sequences unchanged. Owned fixture includes approved curriculum revision, offering/enrollment, locked questionnaire, CLOSED evaluation, completion and an anonymous rating response/answer; protected rows remain identical. |
| Focused regression | PASS | 334 API checks/six suites: new allocation 50, catalog 124, cohort cutover 43, read metadata 24, bootstrap 38, mapping HTTP 55. |
| Fresh full regression | PASS | 652 unit/48 suites and 2,008 API/41 suites, zero failures/skips/todos. New 33/50 cases are included, not added twice. 41 standalone audit checks are separate. |
| Engineering | PASS | Whole-repository TypeScript/build, scoped new-source formatting, script syntax and diff checks. Lint zero errors/five existing warnings; new sources zero warnings. |
| Existing frontend/manual request contract | PASS for backend HTTP compatibility | Existing explicit-code creation and case-sensitive behavior retained. This is not new browser acceptance. |
| Matching automatic frontend/Brave workflow | BLOCKED | Current source lacks omitted-code/key/capability flow. Requires frontend handoff and a matching isolated revision; no new real-UI scenario executed. |
| Normal school deployment/recovery | BLOCKED | Separate normal backup/restore/rehearsal/migration approval and operator acceptance remain; normal untouched. |
| School-load/performance/production and Word visual rendering | NOT TESTED | Global lock and catalog/receipt scans, contention/retention/recovery capacity and production targets remain unbenchmarked. Word content/package/XML/links checked; visual rendering NOT CHECKED. |

The retained first focused regression passed 333/334 and failed the original case-sensitive official-code assertion after an overly strict case-insensitive duplicate check was added. The implementation was corrected to retain the approved policy; the original assertion was preserved. The initial preflight's candidate policy text is superseded by this final case-sensitive policy; its unchanged diagnostic counts/hashes remain read-only evidence. Final focused and fresh full runs pass. Earlier passing discovery/rehearsal counts (48 first HTTP, then 146 and 147 rehearsal cases) describe those earlier test sets, not the final 50-case suite. They are not added to final totals. Source review also led to a literal-special-character regression check before final acceptance.

Final read-only test status is **31 application tables /226 columns /21 successful migrations /25 sequences**, with no owned namespaces left. Normal remains the **14 October recorded 28/199/18/24**, not reaudited; the schemas are not claimed equal. Synthetic full regression can advance test public sequences; none was reset. Of 457 prior protected files, 444 are unchanged and 13 are intended source/test/Swagger updates; six added files give a 463-file baseline. All 145 frontend files, private configurations and original migration SQL remain unchanged. No shared-public course/receipt creation or legacy mapping was performed by the new HTTP suite. No commit/push occurred.

Sources: [allocation/receipt service](../src/courses/course-creation.service.ts), [prefix/schema/key rules](../src/courses/course-code.util.ts), [unit checks](../src/courses/course-code.util.spec.ts), [create DTO](../src/courses/dto/create-course.dto.ts), [course service](../src/courses/courses.service.ts), [HTTP/Swagger](../src/courses/courses.controller.ts), [50 HTTP checks](../test/course-code-allocation.e2e-spec.ts), [existing catalog compatibility](../test/courses-crud.e2e-spec.ts), [migration 21](../prisma/migrations/20261016030000_add_course_creation_receipts/migration.sql), [auth capability](../src/auth/auth.service.ts) and [verification guide](../TESTING.md#atomic-course-code-allocation-verification). Local ignored evidence .tmp/course-step38-evidence.json links the fresh reports and protected baseline; it does not create another docs file.

Next backend slice is H: curriculum-backed year validation for every new/context-changing teaching assignment, including requests without group scopes. E ownership/frontend/normal rollout, J reviewed assignments/enrollment and the remaining dependency-ordered A–S workflows, school privacy decisions, operational recovery, school-load performance, production acceptance and thesis handoff remain pending. The original missing requirement-file limitation and preserved FR01–44/A–S register remain unchanged.

### 13.44 Local Step 39: curriculum approval for new and changed teaching contexts

**16 October 2026 — PASS for requirement H's backend slice.** New teaching assignments and changed academic contexts now require a valid student year and an enabled curriculum revision applicable to the selected semester's academic year, including assignments with no group scopes. New 28 unit/44 API-integration cases are included in fresh full 680 unit/2,052 API checks across 49/42 suites PASS. Focused API regression passes 260 checks/seven suites; 41 standalone audit checks pass separately. These are backend results, not frontend/browser or production acceptance.

**Problem and final behavior**

Previously, an omitted year_level became null and curriculum validation only iterated explicit scopes. An empty or omitted scope list could therefore create an assignment without an approved course/year; an unversioned legacy rule was also treated as sufficient for a new scoped assignment. H closes those paths while preserving existing historical records. No database migration, backfill or new capability flag is added.

| Contract | Implemented behavior |
|---|---|
| New assignment | POST /api/course-offerings requires year_level from 1 to 5 and class_type, together with the existing course/lecturer/semester string IDs. Numeric-string year compatibility remains; null/boolean/array/fraction/out-of-range years are rejected. group_scopes may be omitted or empty; explicit null is invalid. |
| Selected semester chronology | Resolve the semester's own academic_year_id and structured start_year. A missing structured year returns 400/OFFERING_ACADEMIC_YEAR_REQUIRED; the active year, year label, greatest ID or a future approval cannot substitute. Existing semester-number classification is not expanded by H. |
| Unscoped approval | With no scopes, at least one rule for the exact course/student year must have an enabled latest revision effective at or before the selected year, through an active major department. No rule, legacy rule without revisions, future-only approval, latest withdrawal or inactive-only approval returns 409/OFFERING_CURRICULUM_APPROVAL_REQUIRED. This is an existence gate; it does not invent a major/scope or persist a single unscoped revision. Broader audience-major restrictions remain A/K work. |
| Scoped approval | Every explicit major/year needs its own enabled latest applicable revision. Another major or another student year cannot supply approval. Save the authoritative revision ID on each new scope. A supplied stale/future/wrong-owner/unknown curriculum_revision_id returns 409/OFFERING_CURRICULUM_REVISION_MISMATCH. Existing semester-year, level, cohort-owner, normalized-group and duplicate-scope validation remains. |
| Authorization and atomicity | The existing serializable transaction now also reads/rechecks the authenticated actor's current ACTIVE ADMIN role, course/approved-major department status, active lecturer, semester chronology and approvals before writing offering/scopes. Controller identity comes from JWT, not the body. Approved ADMIN scope remains school-wide; primary departments are metadata. Explicit applicable approvals can serve an active major in another department. New course contexts with an inactive owning department return 400/OFFERING_DEPARTMENT_INACTIVE. |
| Academic context change | A changed course, semester, year_level or normalized group identity requires approval again, even when scopes are omitted/empty. A new context with an unknown year returns 400/OFFERING_YEAR_LEVEL_REQUIRED; a resolved year cannot be cleared to null. A changed legacy scoped context must explicitly resend group_scopes to save new bindings, otherwise 409/OFFERING_GROUP_SCOPES_REQUIRED. No silent legacy backfill. |
| Unchanged historical context | Lecturer/display edits, empty updates and identical context/scope echoes retain existing legacy null years, unversioned bindings and saved revision IDs without requiring a later approval. Identical scopes keep their row IDs/timestamps rather than delete/recreate them. New stricter approval rules do not relabel old records or infer their former approval. |
| Pinned/used history | Existing pinned course/semester/year/groups and selected revision remain immutable. A lecturer-only edit on an otherwise unused pinned assignment can proceed after withdrawal; any evaluation, including DRAFT, still protects the offering's course/lecturer/semester with OFFERING_HISTORY_PROTECTED. Permitted display edits do not alter enrollment, participants, drafts, completion or anonymous responses/results. |
| Current read endpoints | GET /api/course-year-rules, /:id/revisions and /:id/applicable?academic_year_id=... remain. Use the selected semester's year; enabled:null under LEGACY_UNVERSIONED is unknown history, not approval for a new context. An absent applicable revision or withdrawal is enabled:false. POST /:id/revisions remains the explicit approval/withdrawal mechanism; do not rewrite an old revision. OpenAPI explains the distinction and new errors. |

The transaction is the existing serializable boundary, including its conflict/retry behavior; H does not introduce a new exactly-once operation or require all concurrent administrative changes to follow a wall-clock commit order. No enrollment/participant/draft/answer mutation is added. Each row request is atomic, but an earlier successful row remains when a later mixed-semester row fails. Reviewed multi-row assignment creation with immediate enrollment and durable retries is requirement J, not H.

**Frontend setup and handoff**

Use the guarded isolated startup and synthetic accounts in TESTING.md. For a new assignment, select its semester first, read the exact course/year/major rules and their applicable revisions for that semester's academic_year_id, then choose an approved year. One applicable year can be selected automatically; multiple years need a deliberate choice. A legacy unversioned rule must first receive an explicitly approved revision for the intended chronology. Preview-only active-year hints cannot authorize a save. For an unchanged historical lecturer/display edit, preserve null/unknown fields and pinned groups rather than forcing a new approval.

The current unchanged [CoursesByYear.jsx](../../teacher-evaluations-frontend/src/pages/admin_user/CoursesByYear.jsx) still labels the year optional and saves teacher rows sequentially. [assignmentScopes.js](../../teacher-evaluations-frontend/src/services/assignmentScopes.js) resolves selected-semester revisions for explicit scopes but only blocks a missing approval when that rule already has revisions; it maps an empty list without an unscoped approval check. These source gaps conflict with new-context H requirements. Existing explicit approved payloads remain supported at HTTP level. Preserve input and show actionable backend errors; do not turn an unavailable prerequisite into a successful empty selection, invent an approval or silently retry another year. A matching frontend revision and Brave acceptance remain necessary. No frontend file was edited and no new UI scenario was executed.

**Actual verification and limits**

| Scenario | Status | Actual evidence / limit |
|---|---|---|
| Year/scope keys, actor and department checks, applicable history and per-major validation | PASS | 28 new unit cases; existing 30 offering-service cases also pass with explicit actors/approval prerequisites. |
| New unscoped/scoped contexts | PASS | 44 new API-integration cases include missing/invalid years, null/empty scopes, unversioned/no/future/withdrawn approvals, exact selected-semester chronology, reapproval, mixed majors/years, wrong revision and cohort ownership. |
| Historical preservation | PASS | Null-year/inactive-department legacy lecturer edits, identical legacy scope IDs/null bindings, pinned edits after a same-year withdrawal, immutable pinned context and evaluated teaching protection. A CLOSED fixture includes approved scope, locked questionnaire, enrollment, completion and an anonymous rating answer. Protected rows remain identical. |
| Rollback and mixed rows | PASS | Injected owned scope-insert failure rolls back offering/scope rows together. A separate valid-row/invalid-row example retains the prior successful row, explicitly demonstrating current per-request semantics rather than claiming batch atomicity. |
| Authentication/permissions | PASS | School-wide second ADMIN, student/lecturer 403, anonymous/revoked 401 and direct non-ADMIN service caller rejection. No primary-department scope was invented. |
| Focused API regression | PASS | 260 cases/seven suites: new policy 44, existing offering CRUD 20, curriculum history 23, enrollments 20, full evaluation story 16, academic integrity 51 and consistency 86. |
| Fresh full regression | PASS | 680 unit/49 suites and 2,052 API/42 suites; zero failures/skips/todos. New 28/44 cases are included, not added twice. API-integration counts include supporting Swagger/direct-service/preservation checks, not a count of individual network requests. 41 standalone audit checks pass separately. |
| Engineering | PASS | Whole-repository TypeScript/build, scoped new-source formatting and diff checks. Lint zero errors/five existing warnings; new files zero warnings. |
| Current frontend new-context local validation | FAIL from source review | Optional year and unversioned/unscoped bypasses remain. This is a source contract finding, not an executed browser failure or a claim that every current UI path fails. |
| Matching frontend/Brave acceptance | BLOCKED | Requires frontend handoff/revision and isolated setup. No browser run performed; backend tests do not establish UI acceptance. |
| Normal rollout / operational acceptance | BLOCKED | Separate school mapping/recovery/rehearsal/deployment acceptance and any required migration approval remain. Normal was not accessed. H adds no migration. |
| School-load/performance/production and Word visual rendering | NOT TESTED | Rule/revision scans and transaction contention are not load benchmarks. Word content/package/XML/CRC/links checked; visual rendering NOT CHECKED. |

The retained first focused run passed 257/260 and failed three checks: the new pinned test used a mismatched scope level and reached the earlier 400 guard, while a new synthetic approval accidentally protected the original calendar-boundary fixture. The test now supplies a matching changed scope to reach pinned immutability, and the approval uses a separate synthetic effective-year identity. Original calendar assertions were retained; final focused/full reports pass. An initial missing test-brace syntax error was corrected before runtime acceptance. Earlier new-null-year and new-unversioned-major creation expectations were explicitly retired under the approved H requirement; stored legacy fixtures are seeded directly instead of calling the now-restricted creation API. No permission, academic-integrity or result-history assertion was weakened.

Each new API case owns a migrated cohort_import_test namespace and verifies shared public rows, complete ledger and all 25 sequence states unchanged. Existing workflow fixtures add only captured synthetic curriculum prerequisites and remove their own rules/revisions afterward; the helper rejects a non-test process/database. New policy writes use the same transaction as authorization/approval reads; neither frontend preview data nor another Prisma connection authorizes the write. No immutable-history trigger is disabled.

Final read-only test status remains **31 application tables /226 columns /21 successful migrations /25 sequences**, with no owned namespaces left. No new migration/model/column or normal operation occurs. Normal remains the **14 October recorded 28/199/18/24**, not reaudited; no parity claim. Full synthetic regression may advance test public sequences, never reset. Three retained migration/backup hashes match prior evidence; no new backup/restore, backup deletion, commit or push. Of 463 prior protected files, 450 remain unchanged and 13 are intended source/test/Swagger updates; four added files yield a 467-file baseline. All 145 frontend files and private configurations remain unchanged.

Sources: [policy](../src/course-offerings/offering-curriculum.policy.ts), [28 policy units](../src/course-offerings/offering-curriculum.policy.spec.ts), [offering service](../src/course-offerings/course-offerings.service.ts), [new DTO](../src/course-offerings/dto/create-course-offering.dto.ts), [update DTO](../src/course-offerings/dto/update-course-offering.dto.ts), [scope DTO](../src/course-offerings/dto/course-offering-group-scope.dto.ts), [offering Swagger](../src/course-offerings/course-offerings.controller.ts), [revision Swagger](../src/course-year-rules/course-year-rules.controller.ts), [44 integration cases](../test/offering-curriculum-policy.e2e-spec.ts), [guarded synthetic approval helper](../test/helpers/offering-approval.ts) and [verification guide](../TESTING.md#curriculum-approved-teaching-context-verification). Local ignored .tmp/curriculum-step39-evidence.json retains final reports/baseline and labels Step 38 migration/preflight evidence as historical. Exactly the existing two report files remain in docs.

Next backend slice is J: reviewed teaching-assignment creation with immediate enrollment, explicit preview/confirmation and durable retries; it must reuse these H checks. Atomic year/semester creation and student/teaching rollover B/F/I, audience/major restrictions A/K, evaluation/submission/audit/publication/bulk requirements, school privacy decisions, E real ownership and frontend/normal rollout, operational recovery, performance and thesis handoff remain in the dependency-ordered roadmap. Missing original requirement text is still disclosed; the preserved FR01–44/A–S register and unchanged improve.txt remain the references.

### 13.45 Local Step 40: label-free teaching-assignment identity (J prerequisite)

**16 October 2026 — PASS for the API identity prerequisite; J remains PARTIAL.** Class labels and selected groups no longer distinguish otherwise identical teaching assignments in API create/update. Eight new unit/33 new API-integration cases are included in fresh full **688 unit/2,085 API checks across 49/43 suites PASS**. Focused 257 API/six suites and 38 offering-service units PASS; 41 standalone audit checks pass separately. The combined pre-creation preview, all-row creation/enrollment confirmation, exact reviewed-roster binding and durable receipt workflow are **NOT IMPLEMENTED**. No combined-workflow capability is advertised.

**Why this is a separate prerequisite**

Requirement J explicitly excludes section_code from duplicate identity. Previously both the application check and existing SQL index included that display label, allowing another label for the same course/lecturer/semester/student year/class type. Implementing a combined workflow on top of that check would retain an accidental-duplicate path. A guarded, read-only isolated audit found **one existing duplicate group (two rows with different labels and a null student year), and four incomplete year/type rows overall**. Its before/after fingerprints prove no audit writes. This is teacher_evaluation_test evidence, not a school-database audit. The same duplicate group, IDs and original labels remain after regression.

| Contract | Implemented behavior |
|---|---|
| API identity | Exact tuple (course_id, lecturer_id, semester_id, year_level, class_type). semester_id identifies the academic year. Neither section_code nor group scopes distinguish identities; selecting another group is not permission to create another copy. A different course, lecturer, semester, student year or class type remains a different identity and must pass the existing H checks. |
| Duplicate response | POST/PUT return HTTP 409, code OFFERING_ALREADY_EXISTS, user-safe message and existing_course_offering_id when the transactional lookup detects another row. If several legacy rows already match, return the earliest numeric ID deterministically; this is navigation guidance, never a merge choice or proof that only one old row exists. Active ADMIN remains school-wide. Anonymous/non-ADMIN writes do not receive the reference. |
| Concurrency | Existing SERIALIZABLE transactions include the label-free predicate read and all existing reference/approval/scope/write checks. Simultaneous API create/create, update/update and create/update collisions cannot both commit the same new identity. Serialization/transaction errors P2034/P2028 return 409/OFFERING_WRITE_CONFLICT with refresh/review guidance. SQL unique conflicts retain 409/OFFERING_ALREADY_EXISTS; a commit-time conflict may lack an existing ID. Refresh authorized assignments and compare the exact tuple; do not guess an ID. |
| Retry boundary | Existing standalone POST is not idempotent and has no durable creation receipt. A changed label is not a retry key. After a lost response, refresh authorized assignments; an existing identity conflicts rather than creating another copy. J's pending reviewed operation must bind the original input/student IDs and return the same committed offering/enrollment receipt after successful expiry. |
| Display label input | Omission retains optional-label behavior; a supplied null/empty string returns 400, instead of letting null reach trim and crash. Whitespace-only strings retain existing trim-to-empty compatibility and still cannot bypass identity. No global label normalization/renaming or current record changes. |
| Legacy nulls | Null year/type compare as null, distinct from a known modern year/type. No inferred year/type, silent backfill or automatic merging. Unique legacy display edits remain possible. An edit matching another pre-existing legacy row returns 409 and needs separate review; retaining history does not imply those duplicates are safe to edit into each other. |
| History and scopes | Existing evaluated-offering course/lecturer/semester protection and pinned revision/context rules remain. No enrollment, participant, draft, questionnaire, completion, response or result is created/changed by this prerequisite. A class label does not establish group eligibility. |
| SQL limitation | **No index/trigger/schema change.** The existing six-field NULLS NOT DISTINCT SQL index still includes section_code. The stronger rule is enforced by API transaction predicates; direct SQL/seed writers can still create label-only duplicates. Future rollover and combined creation must reuse the new API identity rule. A stricter database constraint requires separately reviewed legacy conflict/null compatibility and a non-destructive migration; no delete/merge is authorized. |

**Executed evaluation**

| Scenario | Result | Evidence / boundary |
|---|---|---|
| Labels omitted/different/blank and changed groups | PASS | New owned API cases reject an occupied identity and return the original ID; invalid null/empty labels return 400. Genuine changes to each identity component remain supported. |
| Update collisions, unique display edits and legacy nulls | PASS | Conflicting updates make no row changes; unique legacy edits preserve unknown fields; pre-existing duplicates remain original separate rows. |
| Simultaneous create/create, update/update, create/update | PASS | Each tested collision has exactly one winner; losing requests return 409 and a later lookup/retry resolves the committed identity. Small races are not school-load benchmarks or a direct-SQL uniqueness guarantee. |
| Permissions and teaching history | PASS | Student/lecturer 403, unauthenticated 401, second active ADMIN allowed, direct non-ADMIN service rejection. Each new case preserves shared public rows/ledger/all 25 sequences and protected owned CLOSED evaluation, enrollment, locked questionnaire, completion and anonymous rating answer. |
| Read-only duplicate audit | PASS | Actual guarded test before/after audits: one duplicate group/four incomplete rows; all original duplicate IDs/labels unchanged. Owned synthetic audit additionally covers complete and null duplicate identities. No normal audit or mutation. |
| Focused/full regression | PASS | 257 API/six suites: identity 33, curriculum policy 44, offering CRUD 20, consistency 86, academic integrity 51 and curriculum history 23. Full 688 unit/49 suites and 2,085 API/43 suites, zero failures/skips/todos; eight/33 new cases are included, not added twice. 41 standalone checks separately PASS. |
| Engineering | PASS | TypeScript/build/script syntax, scoped new-source formatting and diff checks. Lint zero errors/five existing warnings; new sources zero warnings. |
| Combined reviewed assignment creation/enrollment | NOT TESTED / not implemented | No pre-creation preview/confirm, multirow rollback, durable receipt or combined capability exists yet. Existing offering and reviewed enrollment endpoints remain separate; no frontend loop can make them atomic. |
| Matching frontend/Brave acceptance | BLOCKED | Local CoursesByYear.jsx still saves rows through a sequential CRUD loop; the prepared frontend described in improve.txt is not the matching local revision. No frontend edit or new UI/browser scenario. |
| Stricter SQL constraint and normal rollout | BLOCKED | Pre-existing legacy collisions need reviewed handling. No school database access, migration or destructive conflict resolution. |
| Performance/production and Word visual rendering | NOT TESTED | No school-load/production acceptance; Word content/package/XML/CRC/links checked, visual rendering NOT CHECKED. |

Existing fixtures changed explicitly to respect J's identity rule: the protected H assignments use distinct COURSE and TD identities rather than labels alone; H transient successes/legacy records are removed by captured IDs inside their owned namespace after each case, while protected history remains. The existing no-section CRUD fixture uses an independent TD identity so its original create/duplicate/delete assertions remain meaningful. No permission, result-history, curriculum or calendar assertion was weakened. The first full regression report is retained: 2,084 passed/one failed/2,085 total. An existing missing-approval fixture used an occupied COURSE identity, so the new duplicate guard correctly ran first. That fixture now uses an unoccupied TD identity; its original missing-approval assertion remains unchanged. Final focused/full reports pass.

Test remains **31 application tables/226 columns/21 successful migrations/25 sequences**, zero owned namespaces at final audit. No new migration/model/index/constraint and no public legacy mapping. Normal remains the **14 October recorded 28/199/18/24**, not reaudited; no parity claim. Full synthetic regression may advance public test sequences; none are reset. Three retained migration SQL/backup hashes match prior evidence; no new backup, restore, backup deletion, commit or push. Of 467 prior protected files, 459 are unchanged, eight are intended source/test/Swagger changes and two additions yield a 469-file baseline; all 145 frontend files and private configurations remain unchanged.

Sources: [service and transaction checks](../src/course-offerings/course-offerings.service.ts), [unit cases](../src/course-offerings/course-offerings.service.spec.ts), [new owned API cases](../test/offering-identity.e2e-spec.ts), [guarded read-only audit](../scripts/offering-identity-preflight.cjs), [Swagger](../src/course-offerings/course-offerings.controller.ts), [create label validation](../src/course-offerings/dto/create-course-offering.dto.ts), [update label validation](../src/course-offerings/dto/update-course-offering.dto.ts), [frontend current save loop](../../teacher-evaluations-frontend/src/pages/admin_user/CoursesByYear.jsx), and [repeat verification](../TESTING.md#label-free-teaching-assignment-identity-verification). Local ignored .tmp/offering-step40-evidence.json retains accepted reports, preflight findings and the preservation baseline. Exactly two report files remain in docs.

Next is J's combined reviewed operation: define the multirow/multi-major contract; preview exact eligible rosters without creating offerings; atomically recheck actors, semester, curriculum, scopes, identity and progression; create scopes/revisions/enrollments with durable actor/input-bound retries; document recovery and advertise capability only after verification. The legacy constraint migration remains separate reviewed work. B/F/I atomic year/semesters/placements/teaching rollover, A/K audiences, O/N/M/L/Q, E actual ownership review, school privacy decisions, full frontend/operational/production acceptance and thesis handoff remain in the existing roadmap. Original unavailable requirement files remain disclosed; preserved FR01–FR44/A–S and unchanged improve.txt are the references.

### 13.46 Local Step 41: milestone 1 reviewed assignment creation and enrollment

**16 October 2026 — PASS for milestone 1's J backend contract and reviewed complete-identity migration.** Administrators can review explicit class audiences before an assignment exists, then create every reviewed assignment, pinned curriculum scope, exact enrollment and durable result in one transaction. **29 new unit/58 new API-integration cases** are included in fresh full **717 unit/2,143 API checks across 50/44 suites PASS**; focused 446 API/ten suites, focused 91 unit/three suites and 91 owned-schema API/two suites PASS. 41 standalone audit checks pass separately. Frontend/Brave and production acceptance remain pending; this backend checkpoint is not an end-to-end UI pass.

**Why the change matters**

Previously an administrator had to create an offering before previewing its students, then enroll through a separate request. Closing the browser or failing a later row could leave unfinished assignments. Step 40 first corrected API identity; Step 41 supplies the combined workflow and a non-destructive SQL uniqueness boundary for complete contexts. Existing standalone creation, editing, enrollment removal and reviewed enrollment remain supported as separate operations; sequential calls do not acquire the new all-or-nothing guarantee.

| Route / contract | Implemented behavior |
|---|---|
| Capability | GET /api/auth/me returns capabilities.reviewed_assignment_enrollment_v1=true only when the connected namespace has the validated CREATE_ASSIGNMENTS receipt kind, completion CHECK and valid unique complete-identity index with the expected five columns/predicate, including an empty catalog. Otherwise absent. Login remains unchanged. This is feature support, not permission or UI/production acceptance. |
| POST /api/course-offerings/create-with-enrollments/preview | Body: course_id and academic_year_id as positive PostgreSQL bigint strings, year_level integer 1–5, assignments array. Each row has unique row_key, lecturer_id, semester_id, class_type, optional section_code, and required nonempty group_scopes. One course/year/student level per operation; semesters may differ within that year. At most 50 rows, 50 scopes/row, 50 groups/scope and 10,000 student-to-assignment memberships. Existing HTTP request-size and transaction limits also apply. |
| Preview output | UUID v4 review_id, 15-minute expires_at, can_confirm:true, items and total_enrollment_count. Each item has row_key/context, resolved revision IDs, eligible_count, exact confirmed_student_ids (STUDENT user IDs), complete safe eligible_students, and major/cohort/group breakdown. Counts equal the deduplicated roster. No passwords, notes, drafts or anonymous answers. Preview writes only an expiring review: no offering/scope/enrollment/evaluation. |
| Explicit eligibility | Every row requires selected major-owned cohort/group audiences; no omitted/empty/all-department fallback. Reuses H curriculum and scope checks plus selected-year student placement/progression. Active accounts, persistent PAUSE until RESUME, explicit repeat/transfer anchors, actual yearly cohort and nonempty yearly group remain authoritative. DS A and FE A are different contexts; cross-department audiences need explicit applicable approvals and active departments. ADMIN remains school-wide. Empty eligible row returns ASSIGNMENT_AUDIENCE_EMPTY; it never broadens participation. |
| POST /api/course-offerings/create-with-enrollments/confirm | Send unchanged preview input plus review_id and confirmations[{row_key,confirmed_student_ids}] for every row. Normalized full input, exact rosters, actor and server snapshot are bound to the review. One SERIALIZABLE transaction rechecks course/department, lecturer, semester/year, current approvals, cohort/placement/progression, groups and identity; creates all offerings/scopes/enrollments; and completes the result record. Any row/scope/enrollment/receipt failure rolls back the whole operation. No existing enrollment/history is replaced and no evaluation opens. |
| Success receipt | status:COMPLETE, created_offering_count, enrolled_count, items[{row_key,course_offering_id,status:CREATED,matched_count,enrolled_count,already_enrolled_count:0}], review_id and already_applied:false. Every offering is new, so the original already-enrolled count is zero. Completed retries return the same original IDs/counts with already_applied:true, rather than current-state counts or newly expanded rosters. |
| Durable retry and recovery | GET /api/course-offerings/create-with-enrollments/receipts/:reviewId returns the original completed result for the current ACTIVE original ADMIN. Completed receipts survive preview expiry and later eligibility/assignment changes, including deletion of an otherwise unused created offering. They have no completion TTL and must not be purged as expired previews. Recovery does not re-enroll students. Receipts are administrative result storage, not N's evaluation activity feed. |
| Errors | 400: invalid IDs/size, duplicate row keys/identities, missing/empty audience, wrong selected year or malformed confirmations. 409: existing assignment identity, REVIEW_INPUT_MISMATCH, REVIEW_OPERATION_MISMATCH, REVIEW_EXPIRED or REVIEW_STALE. Unauthorized actor cannot read another review (404); anonymous 401/non-ADMIN 403. Missing schema 503/ASSIGNMENT_SCHEMA_NOT_READY. ASSIGNMENT_RETRY_REQUIRED and 500/ASSIGNMENT_RESULT_UNCERTAIN direct recovery/retry of the SAME review/body. ASSIGNMENT_NOT_COMMITTED means no result is visible in that snapshot, not proof another in-flight request rolled back. |

**Assignment identity and migration 22**

Migration 20261016040000_reviewed_assignment_creation adds CREATE_ASSIGNMENTS to the existing reviewed-operation kind CHECK, retaining all eight previous kinds. It adds a unique index on (course_id, lecturer_id, semester_id, year_level, class_type) **only where year_level and class_type are both non-null**. Class labels and group scopes do not distinguish complete identities, even for direct SQL writers. Known class types cannot be cleared through API update into a legacy null context. The six-field NULLS NOT DISTINCT index and Prisma compound selector remain.

This is deliberate legacy compatibility: existing unknown contexts are not guessed, relabeled, merged or deleted. The retained isolated audit finds one null-year duplicate group and four incomplete rows, unchanged before/after; zero complete-identity collision groups. Null legacy rows remain outside the new partial index and retain the earlier SQL semantics plus label-free API transaction checks. It is not a claim of five-field SQL uniqueness for unknown historical contexts. Actual legacy ownership/null resolution and any school migration remain separately reviewed operational work. Migration refuses complete-field conflicts without modifying records; there is no automatic destructive repair.

The migration was verified in fully migrated owned fixtures, a conflict-refusal case, and copied original offering/review tables. Injecting failure after final DDL rolled back both kind/index changes; original copied rows remained identical on successful rehearsal. Only then did guarded test migration follow a protected custom-format backup. All original rows in 31 application tables, all 25 sequence states and all 21 prior complete migration rows were preserved; exactly one ledger row was appended. No new Prisma model/table/column/sequence. Test is now **31/226/22/25**. Normal remains the **14 October recorded 28/199/18/24**, untouched and not reaudited; no parity claim.

New backup: 154,396 bytes, owner/SYSTEM restricted access, archive table of contents checked. SHA-256 605a6fcd768cb0f2c07444e4bca1dcdd843db7c4e4978ef139b2dbee0396d2bf. Restore was **NOT EXECUTED**. Migration SQL SHA-256 f2b6778aa997598fb20c7aa953a707262a060f97ac5f91b864f4c09c93a1cd68. All three older protected backup/migration hashes remain intact. Local ignored .tmp/assignment-step41-migration-evidence.json records the archive path and preservation results. Do not rerun the historical one-off migration helper.

**Actual evaluation and boundaries**

| Scenario | Result | Evidence / remaining acceptance |
|---|---|---|
| Safe input, ordering, exact bigint IDs, size limits and literal readiness | PASS | 29 new unit cases; numeric IDs outside PostgreSQL bigint bounds or unsafe numeric transport rejected. |
| Shared DS/FE COURSE, separate TD/TP, explicit selected-year cohorts and roster/count agreement | PASS | Included in 58 new owned API-integration checks. Active year differs from the selected year. Same cohort number/group letter across majors does not combine identities accidentally. |
| Empty/unchecked groups, missing placement, paused/disabled/repeat/transfer students and unavailable ownership | PASS | No broadening. Explicit repeats can select their approved level; NORMAL cannot silently resume a previous PAUSE. |
| Preview/confirm binding, expiry, roles and context drift | PASS | Changed group, progression, account, lecturer, department, semester or approval invalidates review before writes. Exact row/user confirmations required; another administrator cannot claim/read the result. |
| Whole-operation rollback | PASS | Injected second-row scope/enrollment failures and final receipt-update failure leave no partial offerings/enrollments/completion. Same review/body succeeds after the injected failure is removed. No immutable-history guard disabled. |
| Safe retries and concurrency | PASS | Concurrent identical confirmations create one result; distinct competing reviews cannot duplicate assignment identity. Completed same-input retries/recovery retain original IDs/counts beyond expiry and later eligibility changes/deletion. Small races are not a load benchmark. |
| History preservation | PASS | Every new API case preserves shared public rows/ledger/all 25 sequences and protected owned CLOSED evaluation, locked questionnaire, pinned assignment/scopes/enrollment, completion and anonymous rating answer. No existing participants/drafts/results are rewritten. |
| Focused/full regression | PASS | 446 API/ten suites plus 134 compatibility cases/four suites; 717 unit/50 suites; 2,143 API/44 suites, zero failures/skips/todos. New 29/58 are included, not added twice. 91 focused unit/three suites and 91 owned-schema API/two suites; 41 standalone checks separately PASS. |
| Engineering/documentation | PASS | TypeScript/build, new-source lint/formatting, script syntax and diff checks. Whole lint: zero errors/five existing warnings. Local links, JSON examples, synchronized Word content and package/XML/CRC checked. |
| Matching frontend/Brave | BLOCKED | Current CoursesByYear.jsx still uses sequential CRUD; local source does not consume the new capability/endpoints. Exact matching frontend handoff/revision is needed. No frontend file edited and no new UI scenario executed. |
| Normal deployment and operational recovery | BLOCKED | Separate approved school preflight, backup/restore, rehearsal and deployment acceptance remain. Test backup index verification is not a restore rehearsal or normal migration. |
| School-load/security/production acceptance and Word visual rendering | NOT TESTED | Transactions remain bounded; large-roster scans, contention and retention/recovery targets need evaluation. Word visual rendering **NOT CHECKED**. |

Failed intermediate evidence is retained. Initial focused units: 87 passed/four ESM mock-setup failures from 91; the unnecessary global jest mock was replaced with a simple async catalog stub. Initial owned API: 33 passed/57 setup failures from 90; synthetic tracked placements lacked immutable assignment evidence. Fixtures now create matching INITIAL/TRANSFER evidence in the same transaction without disabling safeguards. A later added deletion-recovery case yields final 91 owned checks. First expanded API focus: 399 passed/47 failed from 446 (38 bootstrap setup cases expected old migration count, seven capability expectations omitted the new deployed flag, two reassignment fixtures used label-only duplicate identities). Counts/capabilities and distinct TD/TP fixtures were aligned with the approved contract; original permission/history/draft assertions remain. Nullable-identity fixtures explicitly preserve unknown legacy contexts and test rejection of complete label-only duplicates under the new policy. First full regression retained 2,046 passed/97 failed/2,143 total: 35 selected-year-cohort and 55 import/export cases failed their old label-only fixture setup; six saved-scope enrollment cases needed a distinct TD context; one read-metadata capability list needed the new flag. Synthetic lecturers and class types now give independent identities while keeping original course/year/progression/enrollment/history assertions. The four compatibility suites pass 134 cases separately. Final reports supersede these attempts. A later full attempt took 7,685 seconds and finished with 1,951 passed/192 failed/2,143 total. The report recorded timeouts in password, metadata and cohort-expansion checks, followed by active-year baseline failures. Its exact cause was not established. The retained metadata fixture MR1792144977411 was identified from that run and removed by captured IDs only, inside a guarded transaction that verified every other test row, the migration ledger and all 25 sequence states unchanged. No active-year flag was changed by recovery. The interrupted-attempt report and cleanup evidence remain in ignored .tmp files. All five affected suites then passed 277 tests with zero failures before the final full regression. No normal database access or timeout increase was used.

Of 469 prior protected files, 453 remain unchanged and 16 are intended source/test/Swagger changes; seven additions yield a 476-file baseline. All 145 frontend files, private configurations and existing migration SQL remain unchanged. Four retained protected backup/migration hashes match; no backup deletion, commit or push. Exactly the existing two report files remain in docs. Historical Step 40/39/38 and original 514/471 delivery evidence remain dated, rather than described as newly executed.

Sources: [controller and Swagger](../src/course-offerings/assignment-creation.controller.ts), [atomic service](../src/course-offerings/assignment-creation.service.ts), [input/schema rules](../src/course-offerings/assignment-creation.util.ts), [29 units](../src/course-offerings/assignment-creation.util.spec.ts), [DTOs](../src/course-offerings/dto/reviewed-assignment.dto.ts), [existing creation validation](../src/course-offerings/course-offerings.service.ts), [receipt store](../src/reviewed-workflows/reviewed-operation.store.ts), [migration 22](../prisma/migrations/20261016040000_reviewed_assignment_creation/migration.sql), [58 owned checks](../test/assignment-creation.e2e-spec.ts), [auth capability](../src/auth/auth.service.ts), [frontend current loop](../../teacher-evaluations-frontend/src/pages/admin_user/CoursesByYear.jsx), and [reproducible setup/requests](../TESTING.md#reviewed-assignment-creation-and-enrollment-verification).

Next is **milestone 2: B/F/I** — atomic academic-year/two-semester setup with independent student-group and teaching-assignment initialization, missing-only recovery, provenance, skip reasons and durable retries. It must reuse H/J validation and must not copy enrollments/evaluations or silently resume pauses. A/K audiences, O/N/M/L/Q evaluation workflows, remaining P prerequisite contracts, E real ownership/normal cutover, school privacy decisions, full frontend/operational/production acceptance and thesis handoff remain. Missing original imp.txt/imp1.txt is still disclosed; preserved FR01–FR44/A–S plus unchanged improve.txt remain references.

### 13.47 Local Step 42: atomic academic-year and two-semester setup

**16 October 2026 — PASS for B backend setup; milestone 2 remains PARTIAL.** An administrator can create one year and both semesters in one transaction, including any active-year switch and a durable result. New **34 unit/56 API cases** are included in fresh full **751 unit/2,199 API tests across 51/45 suites PASS**. Focused 375 API/six suites and 41 standalone safety-audit checks separately PASS. These are backend results; no new Brave/UI acceptance was executed.

This is the first independently verified part of milestone 2. **F automatic student-group rollover and I teaching-assignment rollover are still NOT IMPLEMENTED.** No integrated academic-year rollover capability is advertised. Existing separate year and semester CRUD remains unchanged; ordinary year creation does not unexpectedly create semesters, placements or assignments. Frontend compatibility rollover must not be retired on the strength of this B-only contract.

| Contract | Behavior |
|---|---|
| POST /api/academic-years/setup | ACTIVE ADMIN only, HTTP 201. Required Idempotency-Key UUID v4 header; body academic_year plus exactly two semesters with distinct names and numbers 1 and 2. Year fields reuse existing name, structured start_year, optional date and activation validation. Each semester has its own optional dates. All input is validated before writes. |
| Atomic creation | One SERIALIZABLE transaction creates the year, deactivates previous active years if requested, creates both numbered semesters and writes the completed receipt. Failure at Semester 2, receipt storage or transaction commit cannot leave a partial year/semester/active-year switch. Existing unique-name/number and one-active-year constraints remain. |
| POST /api/academic-years/:id/complete-setup | ACTIVE ADMIN, HTTP 200, required UUID v4 key and semesters array containing numbers 1 and 2. Positive PostgreSQL bigint string year ID, at most 9223372036854775807. Creates only missing numbered semesters. Existing semester names/dates/IDs and every year field/active flag remain unchanged, even if supplied semester values differ. Validate the entire request including values for preserved slots. |
| Legacy partial years | An existing null-number semester is preserved rather than guessed as Semester 1 or 2. Completion can add missing numbered rows alongside it. If a preserved legacy name conflicts with a requested missing number, the transaction fails without partial writes; an administrator must review the conflict separately. Completion never overwrites/deletes linked history. |
| Saved result | status COMPLETE, academic_year, semesters ordered 1/2, created_semester_count, preserved_semester_count, created_semester_ids, preserved_semester_ids, idempotency_key and already_applied. IDs are decimal strings on HTTP transport. Counts reflect the original completed operation, not later current state. |
| Retry binding | UUID v4 is normalized to lower case and bound to original actor, operation/resource, normalized year input or completion target, both semester names/numbers/dates. Semester input order is canonicalized; dates use existing UTC calendar-day semantics. Same key/input returns original saved IDs/counts with already_applied:true, without repeating activation or inserts. Different input returns 409 YEAR_SETUP_INPUT_MISMATCH. A key used by another operation returns 409 IDEMPOTENCY_KEY_IN_USE; another actor sees 404. |
| GET /api/academic-years/setup/receipts/:key | Current ACTIVE original ADMIN only, HTTP 200, original completed result with already_applied:true. Recovery works after later edits, expiry or deletion of otherwise unused setup records. Completed receipts have no TTL and must be retained/backed up. Recovery does not recreate deleted rows or reactivate the year. Missing 404/incomplete 409 is not proof that another in-flight request rolled back. |
| Error/recovery | Invalid key/input/ID/date order 400; unknown year/receipt/other actor 404; non-ADMIN 403; anonymous/inactive session 401. Missing installed receipt kind/completion CHECK gives 503 YEAR_SETUP_SCHEMA_NOT_READY for a new operation, while completed recovery/replay still works. Duplicate names/numbers or serialization conflict gives 409 YEAR_SETUP_RETRY_OR_CONFLICT. Unexpected failure gives 500 YEAR_SETUP_RESULT_UNCERTAIN. After uncertainty retain/recover/retry the SAME key/body; do not create a replacement key blindly. |

**Migration and preservation**

Migration 20261016050000_academic_year_setup_receipts extends only reviewed_operations_kind_check with SETUP_ACADEMIC_YEAR, retaining the nine earlier kinds. It locks receipt writes with a five-second lock timeout and applies the CHECK atomically. No new models, tables, columns, sequences or assignment identity rules. Migration 22's complete-context uniqueness and legacy null compatibility remain unchanged.

Before shared-test cutover, 56 real owned-schema HTTP cases passed. A protected custom-format test backup was created; its archive table of contents and restricted owner/SYSTEM ACL were checked. Original receipt rows were copied into an owned namespace. An injected final-DDL exception restored the original CHECK, then successful rehearsal preserved all copied row hashes. The guarded migration preserved every original row in all 31 application tables, all 25 sequence states and all 22 previous full migration rows; exactly one ledger record was appended. Owned namespaces were removed and preservation checked. Test is now **31 application tables/226 columns/23 successful migrations/25 sequences**. Normal is the **14 October recorded 28/199/18/24**, untouched and not reaudited. These databases are not currently claimed to match.

New backup: 155,647 bytes; SHA-256 aef74a19cc39d70908999c7f865bc090b67bab768b054d44767c0420f709b5fa. Migration SQL SHA-256 29990fbee6dfc792f073419a416e1dceec1cef995c01ea456699b16b8fc43253. Backup restore **NOT EXECUTED**. All five retained migration/backup hashes match. Ignored .tmp/year-step42-migration-evidence.json retains the exact backup path, rehearsal and preservation evidence; do not rerun the historical one-off migration helper.

| Scenario | Result | Evidence / limit |
|---|---|---|
| Empty catalog, exact year/two semesters, optional dates and activation | PASS | 56 new owned API cases include migrated-empty readiness, exact counts/IDs, inactive creation and active-year switching. |
| Invalid nested input, IDs, dates, keys, duplicate names/numbers and unknown year | PASS | Rejections preserve all stored rows. 34 new units also cover normalized input, strict integer/UUID transport and literal schema readiness. |
| Missing-only completion and legacy rows | PASS | Empty, one-number and two-number years; saved names/dates/year unchanged; legacy null number retained; collision causes no partial completion. |
| Atomic rollback and retry | PASS | Injected Semester 2 and receipt failures restore all year/semester/activation state; same key/body succeeds after removing the injected fault. Completion's failed Semester 2 leaves no new Semester 1. |
| Durable original result and permissions | PASS | Original receipt across reordered input, uppercase UUID, later edit/deletion/expiry; input/actor/operation isolation; direct service ADMIN check; inactive session rejected. No receipt purge or current-state recomputation. |
| Concurrency | PASS | Same-key setup, competing keys with one year identity and competing missing-only completion leave one year and one row per semester number. Serializable loser can return 409; same-key retry/recovery is required. Small races are not load benchmarks. |
| History/shared-data preservation | PASS | After every new API case, all shared public rows/ledger/all 25 sequences remain unchanged. Protected owned offering/enrollment, CLOSED evaluation/completion, questionnaire, anonymous response/rating and original semester remain identical. No history guard disabled. |
| Full regression / engineering | PASS | 375 focused API/six suites; 751 unit/51 suites; 2,199 API/45 suites; 41 standalone checks. Full accepted reports have zero failures/skips/todos. TypeScript/build/diff/format checks pass; lint zero errors/five prior warnings. Initial new-file typing diagnostics were corrected before acceptance. |
| Frontend/Brave | NOT TESTED | Existing UI does not consume these new routes. No frontend edit, new UI scenario or integrated rollover claim. |
| F/I integrated initialization | NOT TESTED | Still absent. Next implement authoritative predecessor-year student-group rollover, then destination-audience teaching copies with provenance, integrated transaction and missing-only recovery. |
| Normal deployment/restore/production/Word visual rendering | BLOCKED / NOT TESTED | Normal rollout needs separately approved recovery/rehearsal; restore not executed, school-load/production untested; Word visual rendering NOT CHECKED. |

Of 476 prior protected files, 472 remain unchanged and four intended modifications wire the module and advance three migration-count fixture/audit expectations. Seven additions produce a 483-file baseline. Existing application year/semester CRUD code, Prisma schema, all 145 frontend files and private configurations are unchanged. Five backup/migration hash pairs remain intact. No backup deletion, commit or push. Exactly the existing two report files remain in docs. Step 41's 717/2,143 and original 514/471 results remain dated historical evidence.

Sources: [setup controller/Swagger](../src/academic-years/academic-year-setup.controller.ts), [transaction/receipt service](../src/academic-years/academic-year-setup.service.ts), [input/schema rules](../src/academic-years/academic-year-setup.util.ts), [34 units](../src/academic-years/academic-year-setup.util.spec.ts), [nested DTOs](../src/academic-years/dto/academic-year-setup.dto.ts), [56 owned API cases](../test/academic-year-setup.e2e-spec.ts), [migration 23](../prisma/migrations/20261016050000_academic_year_setup_receipts/migration.sql), [existing year CRUD](../src/academic-years/academic-years.service.ts), [existing semester CRUD](../src/semesters/semesters.service.ts), and [setup/repeat verification](../TESTING.md#atomic-academic-year-and-semester-setup-verification).

Remaining: finish F/I within milestone 2, then A/K audiences and O/N/M/L/Q evaluation workflows, remaining P prerequisites, E real ownership/normal rollout, school privacy decisions, frontend/operational/security/performance/production acceptance and thesis handoff. Missing original imp.txt/imp1.txt remains disclosed; the preserved FR01–44/A–S register and unchanged improve.txt remain the requirement references.

### 13.48 Local Step 43: active deadline extension and defense checkpoint

**16 October 2026 — PASS for M backend extension and this bounded defense checkpoint.** New **26 unit/32 API cases** are included in fresh full **777 unit/2,231 API across 52/46 suites PASS**. Focused 70 unit/two suites, 224 API/five suites, 41 standalone safety checks and a separately repeated 16-step HTTP school workflow PASS. Counts overlap and must not be added to the full totals. Existing DRAFT scheduling, questionnaire history, reviewed operations, student progression, CLOSED lecturer release and privacy safeguards remain supported. This does not complete all A–S requirements or establish UI/production acceptance.

| Contract / scenario | Verified behavior |
|---|---|
| PUT /api/evaluations/:id/schedule | Existing ADMIN-only route; current ACTIVE authentication/role guards retained, school-wide ADMIN policy unchanged. Existing DRAFT schedule behavior remains. For OPEN, active means start_at <= server time < current end_at. Missing-window, upcoming, expired and CLOSED evaluations return 409/EVALUATION_NOT_ACTIVE. |
| Active body | end_at only, valid ISO instant strictly later than the current end. Supplying start_at, including the unchanged value or explicit null, returns 400/ACTIVE_DEADLINE_START_IMMUTABLE. Missing/null/malformed/impossible/equal/earlier deadline returns 400, with ACTIVE_DEADLINE_MUST_INCREASE for domain rejections; transport validation can reject before service. DTO-initialized undefined means omitted, not supplied JSON. |
| Atomic mutation | Existing SERIALIZABLE transaction reads state and samples server time once. It updates only end_at and updated_at. Start, status, question version/locks, curriculum/scopes, enrollments, frozen participants, drafts, completion, anonymous responses/answers and CLOSED history remain unchanged. No new tables/columns/migration/capability/activity event. |
| Concurrency | Real competing extensions and extension/closure checks PASS. A serialization loser can receive 409 and must reload status/deadline before a deliberate retry. An extension that serialized before closure can succeed; closure cannot be undone and no request reopens an expired/CLOSED evaluation. A later committed deadline cannot be shortened by an earlier requested deadline. Small races are not a load benchmark. |
| Recovery | After network/500 uncertainty, GET the evaluation and compare current status/deadline. Exact repeat of an already committed deadline is a no-write 400 because it is no longer later. This operation adds no durable retry receipt and does not promise idempotent HTTP success. Never treat a missing response as proof of rollback. |
| Boundaries/permissions | Pure tests cover exact opening instant, exact closing rejection and last active millisecond; HTTP covers active/inactive states, timezone-equivalent deadlines, unknown fields/ID, anonymous/non-ADMIN/inactive rejection and another permitted ADMIN. |
| Preservation/failure | Every new API case checks shared public rows/ledger/all 25 sequences plus protected owned academics, pinned scopes, questionnaire/lock, enrollment, draft, completion and anonymous answer rows; original CLOSED evaluation unchanged. Injected update failure changes no stored rows and succeeds after fault removal. Student history retains enrolled scope/completed status and only changes the displayed deadline. |
| Engineering | Whole-repository TypeScript/build PASS; lint zero errors/five prior warnings; new files/DTO formatting and diff checks PASS. Of 483 prior protected files, 478 unchanged/five intended modifications plus three new files produce a 486-file baseline. All 145 frontend files, Prisma schema/migrations and private configurations unchanged. |

The first expanded API attempt retained **215 passed/nine failed/224 total**: eight new cases exposed DTO optional-field initialization, which made the initial own-property check mistake omitted start_at for supplied input; one old case expected 409 for every OPEN schedule request. The policy now uses undefined as omission and rejects explicit JSON values/null. A pure regression covers transformed omission. The prior equal-deadline HTTP case now correctly expects 400/ACTIVE_DEADLINE_MUST_INCREASE; its rejected-write behavior is preserved. Final focused/full reports pass; failure evidence is retained rather than hidden.

**Defense preparation and preserved scope**

Before editing, all 483 protected-file hashes matched the Step 42 baseline. A 340-file source/documentation ZIP was created and CRC checked, excluding private configurations and database archives; SHA-256 5593c4d1f6464db79996b327cd7bd9dd2e88051602b94e1750e418f71fb0d3d2. Ignored .tmp/deadline-step43-source-baseline.json records its path/hash. Final verified source/documents are also preserved in a separate local snapshot after document checks. Snapshots are local handoff evidence, not commits or remote delivery. No backup deletion, commit, push, persistent API or browser launch.

The [existing 16-step HTTP integration workflow](../test/integration.e2e-spec.ts) was executed again separately: admin login, accounts, course/semester, teaching/enrollment, questionnaire/questions, evaluation creation/opening, student access/submission, repeat-submission rejection, lecturer restriction while OPEN, closure and lecturer dashboard/comments PASS. This is a scripted API demonstration, not a real UI pass. Draft save/submission/history are covered by the focused submission/consistency regressions and protected-draft extension cases; the 16-step workflow itself does not perform a draft save. The repeatable commands and safe Swagger procedure are in TESTING. No real school data or private credentials were used.

Read-only final isolated inspection still finds **31 application tables/226 columns/23 successful migrations/25 sequences**, no owned fixture namespaces, one preserved null-year offering duplicate group/four incomplete legacy rows. No schema change, new database backup or restore was performed in this step. Five retained backup/migration hashes match. The latest Step 42 archive TOC/ACL checks remain historical and its restore remains NOT EXECUTED. Normal is the **14 October recorded 28/199/18/24**, untouched and not reaudited; no current parity claim.

The current defense scope/limitations table at the front of this report is the authoritative concise A–S status. F/I integrated rollover, A/K audience expansion, O/N/L/Q/P remaining contracts, E real ownership/normal rollout, S/A5 privacy decisions, matching frontend/Brave, historical recovery, realistic load/security/production acceptance and Word visual rendering remain. Missing original requirement-file limitations are retained. All four maintained documents are synchronized; exactly two report files remain in docs. The user has not authorized commit/push or normal deployment.

Sources: [deadline policy](../src/evaluations/active-deadline.util.ts), [25 policy units](../src/evaluations/active-deadline.util.spec.ts), [transaction service](../src/evaluations/evaluations.service.ts), [service unit integration](../src/evaluations/evaluations.service.spec.ts), [controller/Swagger](../src/evaluations/evaluations.controller.ts), [schedule DTO](../src/evaluations/dto/update-schedule.dto.ts), [32 API cases](../test/active-deadline.e2e-spec.ts), [updated equal-deadline regression](../test/evaluations.e2e-spec.ts), and [repeat/demo procedure](../TESTING.md#active-deadline-extension-and-defense-verification).

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
| FR11 | Confirm exact reviewed IDs and context/impact; preserve original operation result on reviewed retry. Legacy omission remains until cutover. | 6.2, 7-8 |
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
| FR23 | Review full creation, freeze exact participant IDs and reject relevant context/version/schedule drift. | 6.5, 7-8 |
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
| FR43 | Exclude DRAFT from ADMIN results; require CLOSED for all lecturer results/dashboard/comments. | 6.8, 8 |
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
| Generations / reviewed ownership mapping | /api/student-generations with /:id CRUD; ADMIN /mapping/inventory, /mapping/preview, /mapping/confirm and /mapping/receipts/:reviewId are disabled-by-default, test-only reviewed rollout routes. |
| Students | `/api/students`; `/import`; `/export`; `/group-options`; `/bulk/class-group`; `/:id`. |
| Placement | `/api/student-academic-records`, with `/:id` CRUD. |
| Courses / curriculum | /api/courses and GET /api/courses/creation-receipts/:key (actor-bound creation recovery); `/api/course-year-rules` and `/:id` legacy CRUD; `/:id/revisions` GET/POST; `/:id/applicable?academic_year_id=...` GET. |
| Offerings | `/api/course-offerings`, with `/:id` CRUD. |
| Reviewed assignment creation/enrollment | POST /api/course-offerings/create-with-enrollments/preview; POST /api/course-offerings/create-with-enrollments/confirm; GET /api/course-offerings/create-with-enrollments/receipts/:reviewId. ADMIN only; exact reviewed rosters and durable original result. Section 13.46. |
| Atomic year/semester setup | POST /api/academic-years/setup; POST /api/academic-years/:id/complete-setup; GET /api/academic-years/setup/receipts/:key. ACTIVE ADMIN; UUID v4 idempotency header for writes; B only, F/I pending. Section 13.47. |
| Lecturer assignments | `/api/lecturer/course-offerings`. |
| Enrollment | `/api/course-offerings/:offeringId/enrollments`; `/preview`; `/bulk`; `/reassignment/preview`; `/reassignment/confirm`; `/:studentId` deletion. |
| Named question sets | `/api/surveys`; `/:id`; `/:id/usage`; `/:id/archive`. |
| Versions | `/api/surveys/:surveyId/versions`; `/:versionId`; `/:versionId/archive`; `/:versionId/apply-to-unfinished`. |
| Questions | `/api/survey-versions/:versionId/questions`; reorder action documented in Swagger; `/api/questions/:questionId`. |
| Evaluations | /api/evaluations; /participants/preview; /:id; PUT /:id/schedule for DRAFT edits or strictly later active OPEN end-only extension; /:id/open; /:id/close. No atomic create/publish, bulk-create or activity feed. |
| Student access | `/api/student/evaluations`; `/history`; `/:id/survey`; `/:id/submission-status`. |
| Draft / submission | `/api/student/evaluations/:id/draft`; `/:id/responses`. |
| Lecturer dashboard/comments | `/api/lecturer/evaluations`; `/:id/dashboard`; `/:id/comments`. |
| Canonical results | `/api/admin/results`; `/api/admin/results/:lecturerId`; `/api/lecturer/results`. |

Additional implemented reviewed routes: `POST /api/evaluations/create-preview`; `POST /api/students/bulk/class-group/preview` and `/confirm`; `POST /api/evaluations/:id/open/preview` and `/confirm`; `POST /api/surveys/:surveyId/versions/:versionId/apply-to-unfinished/preview` and `/confirm`. Existing enrollment/reassignment previews now return review fields; their confirmations, evaluation creation, bulk-placement PUT and old version-application route accept review_id. See Section 8 for compatibility and success/error contracts.

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

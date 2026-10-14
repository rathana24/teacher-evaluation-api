# Teacher Evaluation Backend: Consolidated Project Report

**Project:** `teacher-evaluation-api`

**Purpose:** Academic reporting, professor review, backend evaluation and frontend handoff

**Reporting date:** 14 October 2026 (tested safeguards, verified backup/rehearsal and completed normal-database alignment)

**Evaluated source snapshot:** local follow-up on `master`, based on published commit `f80ab227e2d79841c44a12d4b18dc66dda061469`. That commit contains the earlier reviewed-workflow, progression, curriculum and historical-label delivery. The two approved school policies, one-primary-department protection and four academic-integrity safeguards with their API compatibility fixes are implemented and tested. After final review, the owner authorized this delivery to master; the evaluated source is the commit containing this report. Record its SHA with git rev-parse HEAD. Section 9 distinguishes current evidence from earlier test runs.

**Delivery status:** Implemented improvements verified; full frontend acceptance and school production readiness remain pending.

**Current local database status:** teacher_evaluation and teacher_evaluation_test now both have 28 application tables, 199 columns and all 18 migrations, including academic-integrity enforcement. The approved normal 17 -> 18 migration followed a fresh protected cutover backup and verified restoration; all original values, all 24 sequence states and all 17 earlier complete migration records were preserved. Schema matches test and 16 read-only normal workflow checks passed. Section 11.12 records current results; Sections 11.8-11.11 retain their dated earlier steps.

**Next review:** Local implementation, isolated evaluation, migration rehearsal and approved normal alignment are complete. Latest full regression remains 514 unit/471 API tests; the 160-case rehearsal and 16 normal GET checks are separate evidence. Final delivery review is complete and the owner authorized publication to master. Next, reproduce the delivered checkout and evaluate actual frontend acceptance; reviewed-workflow cutover and another school deployment still need their own approval.

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

The additive `20261007140000_add_reviewed_operations`, `20261008010000_add_student_progression`, `20261008020000_add_curriculum_revisions`, `20261008030000_add_historical_target_labels` and `20261014010000_enforce_one_primary_department` migrations were first applied to teacher_evaluation_test for follow-up validation. The owner subsequently approved local normal-database alignment after backup/restore and rehearsal; at that alignment, both configured databases had all 17 migrations, 28 application tables and 199 columns. The five migrations add review storage, the progression_action enum (existing placements default to NORMAL without inferred exceptions), curriculum revision history with nullable legacy bindings, nullable historical-label snapshots/capture timestamps with checks/triggers, and the partial primary-department unique index. No reset, school metadata backfill, credential replacement or copying of test fixtures into normal was performed. The test's three original memberships and normal's four memberships were preserved. Section 11.8 records complete-row/sequence preservation and read-only normal API verification. The subsequent 20261014020000_enforce_academic_integrity migration adds safeguards without adding tables/columns; it was first applied only to test (18 migrations). It subsequently passed fresh backup/rehearsal and the approved normal deployment in Section 11.12, so both configured databases now have 18 migrations. Other school targets need their own procedure; a separate school production database is not configured in the inspected project.

Four temporary validation databases remain: teacher_evaluation_restore_20261014_155714_7066b3ca retains the earlier 17-migration rehearsal; teacher_evaluation_restore_20261014_163139_6f06419f retains the 12-migration pre-cutover state; teacher_evaluation_restore_20261014_191129_c6d73577 retains the new 18-migration rehearsal; teacher_evaluation_restore_20261014_194406_c2b09381 retains the final 17-migration cutover backup state. All remain separate from the two configured application databases, have restricted CONNECT access and were unchanged during normal deployment. The backend connects to one configured database at a time. No copy was dropped/reset; cleanup and archive retention require separate agreement.

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
| Academic record | One student's explicit placement in one academic year: major, year level and optional group. |
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

Confirmation freezes participants and target records. Schedule editing is DRAFT-only. Ordinary opening checks schedule, usable questionnaire, participants and actual latest version. A superseded draft returns 409 while preserving its assigned version/frozen IDs. The new reviewed opening workflow allows an explicit retain-assigned decision after full state review; it requires already frozen participants and does not use the legacy zero-participant membership fallback. Invalid/expired dates, empty questions and archived individual versions remain rejected.

```text
DRAFT: review targeting and edit schedule
    -> OPEN: student writes only during the valid scheduled window
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
| 7 | Curriculum/title policy | User-approved academic-year revisions, saved offering bindings, withdrawal/reapproval, protected identities/chronology and global titles; 23 PostgreSQL acceptance cases pass. | Actual frontend integration and intended-database migration. Untracked/unscoped legacy assignments remain explicitly unversioned; no historical backfill. |
| 8 | Historical labels | User-approved immutable confirmation snapshots, explicit current labels/legacy unknowns, review binding and whole anonymous aggregate protection; 10 PostgreSQL cases and 8 unit cases pass. | Frontend must consume historical_labels, preserve UNKNOWN presentation and evaluate its UI; intended-database migration remains pending. No legacy name backfill. |

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

**Implemented storage/migration:** additive `reviewed_operations`, limited by a database CHECK to six operation kinds. It stores UUID, actor account ID, resource key, normalized request JSON/request fingerprint, relevant snapshot fingerprint, created/expiry/completion timestamps and original result JSON. It does not store full placement/question snapshots, credentials, draft answer content or anonymous response values. Its actor foreign key and completion consistency CHECK preserve administrative record integrity. Existing business records stay intact. Preview writes only review storage; completion and business writes commit together. Migration `20261007140000_add_reviewed_operations` was initially test-only and is now applied to both configured local application databases as part of their completed 18-migration alignment (Section 11.12). Review the intended database, backup and migration before an operator deploys this backend elsewhere.

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

Return one evaluation record containing delivered commit/branch, runtime/database identity without credentials, frontend origin, scenario fixture IDs, actual results, evidence references and unresolved items. Include screenshots only when the team actually runs its UI; redact tokens, passwords and identifying answer content. Mark PASS, FAIL, BLOCKED or NOT TESTED honestly. Latest backend evidence is 514 unit tests and 471 API tests; the frontend team's own run must record its own totals. Publication, legacy cutover, school migration and recovery are separate decisions.

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

### 9.1 Latest recorded evidence

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

Older sources mention 453 unit tests; the committed baseline reported 476/334. Current totals are 514 unit and 471 API tests. Earlier primary-department totals were 502/420; historical labels passed 500/398 and progression passed 492/365. The 86 consistency, 16 integration, 23 curriculum and 51 academic-integrity cases are subsets of the 471 API total. The new work adds 12 unit and 51 API cases. Focused reruns, migration rehearsal and earlier HTTP walkthroughs are separate evidence, not additional tests to add.

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

Dedicated API suites cover courses, users, semesters, offerings, enrollment, questionnaires, evaluations, student access, drafts, submission, dashboards/comments, integration and consistency. Students/academic structure/import/export/lecturer-offerings/full results authorization still have gaps in dedicated HTTP coverage; some are exercised as setup or through mocked services, which is insufficient for complete acceptance.

The real-server walkthrough provides targeted additional evidence for academic creation and canonical results/ownership, but does not close every CRUD/filter/error gap. Complete frontend integration, broad browser-origin behavior, school-sized performance, comprehensive security review and backup/restore practice remain unperformed. Agree concurrent-user/data-volume and latency/error targets before a performance assessment.

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

The project owner confirmed that no frontend UI or frontend project is available here. The agreed delivery format is the backend GitHub repository, which the frontend team can clone, preview through Swagger and test against its own UI later. Actual browser integration remains NOT TESTED. API/database evidence supports backend behavior; it does not claim a completed frontend screen evaluation. The owner authorized this follow-up for publication to master after final review; record the delivery commit from the checkout containing this report.

| Decision owner | Decision needed | Effect |
| --- | --- | --- |
| Frontend/backend teams | Integrate and evaluate the implemented review_id, preview/confirm, retention and original-result retry contract. | Approve actual frontend behavior and choose the legacy cutover; backend implementation authorization is not frontend acceptance. |
| Frontend/backend teams | Mandatory explicit version selection versus set-only compatibility. | Establish reviewed-save behavior for every caller and any deprecation period. |
| Frontend/backend teams | Evaluate the approved progression workflow against the actual frontend; prepare intended-database deployment. | Policy and backend implementation are complete; no school database migration was executed. |
| Frontend/backend teams and operator | Evaluate the approved curriculum/title contract and deploy its additive migration to the intended database. | Policy and backend implementation complete; legacy unknown bindings remain explicit and no school migration was performed. |
| Frontend/backend teams and operator | Evaluate approved historical_labels/current_labels/UNKNOWN presentation and deploy the additive migration. | Policy and backend implementation complete; no legacy names were inferred and no school migration was performed. |
| School/operator | Official database, provenance and verified backup/restore. | Establish whether and how historical metadata can be recovered. |

The agreed backend contracts/policies are implemented. Remaining work is to publish the authorized delivery, reproduce its setup, evaluate the actual frontend connection, agree legacy cutover, assess school-sized load and rehearse operational recovery. Any newly requested behavior needs its own agreed scope and meaningful acceptance checks. No approval is inferred from a passing regression suite.

The earlier reviewed-workflow, progression, curriculum and historical-label delivery was committed/pushed as `f80ab22`. The school-policy, primary-department, academic-integrity and documentation follow-up is included in this owner-authorized master delivery. The owner separately approved local teacher_evaluation alignment; all five pending migrations are now applied there with original values preserved. Other school targets and official historical recovery remain separate scopes. Private environment/backup/temp files remain excluded from Git. Publication approval covers the reviewed source and documentation, not private artifacts. The earlier targeted credential-pattern scan was not a comprehensive security audit.

Approved delivery commit title: `Enforce academic integrity and protect evaluation history`.

Suggested handoff description: release lecturer answers/comments only after CLOSED; preserve evaluated assignment identity; retain approved progression, yearly group, curriculum and historical-label behavior; enforce primary-department and academic-integrity rules. Full regression passed 514 unit/471 API tests. Fresh protected backup/restore and a 160-case rehearsal preceded the approved normal 17 -> 18 migration. Both configured databases now have 28 application tables/199 columns/all 18 migrations; original normal values/sequences/old migration records were preserved and 16 read-only normal GET checks passed. Rehearsal/read-only checks are separate evidence, not extra regression cases. Frontend UI acceptance, reviewed cutover, official recovery and school production readiness remain pending. This is reviewable publication text, not a new commit or push.

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
| RELEASE-01 - Publish local follow-up | Earlier delivery was committed/pushed as f80ab227e2d79841c44a12d4b18dc66dda061469. The school policies, primary-department protection and academic-integrity delivery are local; normal migration is complete. | AUTHORIZED after final delivery review; record the actual delivery SHA from Git and verify origin/master. |
| RELEASE-02 - Reproduce repository setup | Backend/frontend tester runs the documented isolated setup from a clean checkout of the published commit; records runtime, migrations, tests, health, Swagger and synthetic login. | NOT TESTED from a clean published checkout. Current local test results remain valid local evidence. |
| RELEASE-03 - Evaluate the frontend UI | Frontend team connects its own project and completes FE-01-FE-09 with requests/results and browser evidence. Report defects with the delivery commit and scenario IDs. | NOT TESTED; no frontend UI/project is available in this workspace. |
| RELEASE-04 - Agree reviewed-workflow cutover | Frontend/backend teams prove each caller sends explicit versions and fresh reviews, agree automatic-application behavior and then authorize the operator's configuration/restart. Verify missing-review rejection and safe retries. | PENDING agreement. Default REQUIRE_REVIEWED_CONFIRMATION=false preserves compatibility; true-mode rejection is already backend-tested. |
| RELEASE-05 - Verify official recovery | School/operator identifies the authoritative database and independent provenance; rehearses CLI/secure backup/restore; approves exact manifests and journals before school metadata apply. Preserve ambiguous records. | Local teacher_evaluation backup/restore passed in Section 11.6. Official historical recovery remains BLOCKED on official evidence, CLI rehearsal and operator approval; no school metadata recovery was performed. |
| RELEASE-06 - Prepare school deployment | Verify the authoritative school target, protected restoration procedure and all required migrations; evaluate school-sized load and full frontend/backend workflows before release. | Inspected local teacher_evaluation is aligned through 18 migrations (Sections 11.8/11.12). Another school target, load/frontend acceptance and production release remain PENDING; no other school target was migrated. |

Frontend API testing on an isolated database can proceed after an authorized repository publication without waiting for official historical recovery. School deployment and official metadata recovery each require their own operational evidence. Agree performance expectations before load testing; do not invent acceptable latency/concurrency thresholds. Preserve all existing accounts, credentials, placements, enrollments, frozen targets, drafts, anonymous answers and unknown legacy metadata throughout operational work.

The earlier f80ab22 delivery was committed/pushed. The owner authorized publication of this reviewed follow-up to master. This approval does not authorize frontend cutover, additional database changes or school production release. Private environment files and ignored evidence remain excluded from source control.

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

> This backend manages the school's teaching-evaluation process from academic setup to anonymous results. Its main contribution is preserving student scope and questionnaire history when placements or questions change. Administrators can now confirm a stored review, safely retry its original operation and deliberately retain an older assigned questionnaire. The latest backend evaluation passed 514 unit tests and 471 API tests, including 86 consistency/recovery/progression/history/privacy scenarios and 51 academic-integrity cases. New database safeguards protect active years, global questionnaire titles, nullable offering identity, year levels and date order; their migration is validated on test and applied to local normal after verified backup/restore/rehearsal. Both configured databases have 18 migrations; original normal records/sequences were preserved and 16 read-only normal checks passed. A partial unique index and protected assignment transaction enforce at most one primary department per user without removing other memberships. Lecturer results now require CLOSED evaluations; evaluated teaching assignments retain their course, lecturer, semester and academic year. Approved repeat/transfer/pause/resume/yearly-group rules use one shared resolver; approved curriculum revisions preserve the rules used by existing offerings, and saved target labels remain stable after later renames. Frontend integration/cutover, school deployment and official recovery evidence remain pending; passing backend tests is not full production readiness.

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
| Generations | `/api/student-generations`, with `/:id` CRUD. |
| Students | `/api/students`; `/import`; `/export`; `/group-options`; `/bulk/class-group`; `/:id`. |
| Placement | `/api/student-academic-records`, with `/:id` CRUD. |
| Courses / curriculum | `/api/courses`; `/api/course-year-rules` and `/:id` legacy CRUD; `/:id/revisions` GET/POST; `/:id/applicable?academic_year_id=...` GET. |
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

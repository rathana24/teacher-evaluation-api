# Teacher Evaluation Backend: Consolidated Project Report

**Project:** `teacher-evaluation-api`

**Purpose:** Academic reporting, professor review, backend evaluation and frontend handoff

**Reporting date:** 8 October 2026 (follow-up implementation and evaluation)

**Current workspace:** branch `master`, uncommitted reviewed-workflow, approved progression, curriculum/title and historical-label implementation based on `578c63fbafd7f75ff228771c10ca1224e0e8f783` (`fix: protect evaluation consistency and preserve history`). Earlier follow-up notes named `reaksa/development`; the final read-only branch check returned `master`. This review did not switch branches. Section 9 distinguishes fresh follow-up checks from the earlier pre-commit evidence. The baseline commit does not contain the current uncommitted delivery.

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

The additive `20261007140000_add_reviewed_operations`, `20261008010000_add_student_progression`, `20261008020000_add_curriculum_revisions` and `20261008030000_add_historical_target_labels` migrations were applied only to `teacher_evaluation_test` for follow-up validation. They add administrative review storage, an academic-record progression_action enum (old rows default to NORMAL without inferred exceptions), and curriculum revision history with nullable saved offering bindings. The curriculum migration leaves all existing scopes unversioned and does not backfill from current rules. The historical-label migration adds nullable JSON snapshots/capture timestamps to frozen generation/group targets, with paired-value checks and database protection against rewriting targets. Existing labels remain null; no names are reconstructed. No migration, reset, historical backfill or credential replacement was performed against the normal database. The updated backend needs all four follow-up migrations on its intended database before using these updated services; prepare and verify the school deployment separately. A separate school production database is not configured in the inspected local project.

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

Lecturer dashboard/comments require ownership and a CLOSED evaluation. Canonical ADMIN/LECTURER results exclude DRAFT evaluations and report actual saved response versions under `version_results`. The flat legacy dashboard/comments shape is retained and is distinct from canonical per-version reporting.

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

**Implemented storage/migration:** additive `reviewed_operations`, limited by a database CHECK to six operation kinds. It stores UUID, actor account ID, resource key, normalized request JSON/request fingerprint, relevant snapshot fingerprint, created/expiry/completion timestamps and original result JSON. It does not store full placement/question snapshots, credentials, draft answer content or anonymous response values. Its actor foreign key and completion consistency CHECK preserve administrative record integrity. Existing business records stay intact. Preview writes only review storage; completion and business writes commit together. Migration `20261007140000_add_reviewed_operations` has been applied only to `teacher_evaluation_test` here. Review the intended database, backup and migration before an operator deploys this backend elsewhere.

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

The additive 20261008010000_add_student_progression migration defaults old rows to NORMAL and makes no guesses about legacy repeats, transfers or pauses. It was applied only to the guarded test database. School operators must migrate the intended database before running these updated services. No school backfill, reset or normal-database migration was performed.

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

The additive 20261008030000_add_historical_target_labels migration adds nullable JSONB snapshots/capture timestamps to both frozen target tables, paired-value/schema checks and database guards against changing saved target rows. Existing rows remain null. Normal current-name CRUD continues to work; captured history is not rewritten. No historical-name backfill or school migration was performed.

Anonymous reports remain whole evaluation aggregates. Query slicing is unsupported on /api/admin/results, /api/admin/results/:lecturerId, /api/lecturer/results and the lecturer dashboard/comments routes. Any query parameters, including generation_id, class_group or unknown group_scope, return 400/UNSUPPORTED_ANONYMOUS_SCOPE instead of silently returning a mislabeled subset. The lecturer path parameter still selects whole evaluations owned by that lecturer. Saved labels do not establish who wrote anonymous answers. Identifiable student participation/export filters remain a separate existing contract.

### 8.8 Frontend team handoff and acceptance checklist

This is the entry point for the frontend team after an authorized repository publication. The changes are currently local and uncommitted; cloning an older GitHub commit will not include this delivery. Record the delivered branch and commit with `git branch --show-current` and `git rev-parse HEAD`. No frontend project is supplied. Sections 8.3-8.7 define the detailed contracts; Section 9 records backend evidence, not frontend acceptance.

**Set up an isolated preview.** Install PostgreSQL and a compatible Node.js runtime (the recorded checks used Node.js 24.16.0). Create a local database named `teacher_evaluation_test` using your PostgreSQL administrator. Run from the cloned repository root, with each command succeeding before the next:

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

The delivered default `REQUIRE_REVIEWED_CONFIRMATION=false` retains legacy compatibility. The frontend should always send reviews for these six workflows. Agree cutover before setting it true and restarting the API; five applicable legacy mutation routes then reject omitted reviews. Automatic latest-version application remains a separate frontend decision. All four additive follow-up migrations need the intended deployment's own verified backup and approval; the isolated setup above does not deploy the school database.

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
| FE-09 / integration | ADMIN/STUDENT/LECTURER login, own-resource access, frontend-origin CORS and full create/open/draft/submit/close/results flow. | NOT TESTED |

Return one evaluation record containing delivered commit/branch, runtime/database identity without credentials, frontend origin, scenario fixture IDs, actual results, evidence references and unresolved items. Include screenshots only when the team actually runs its UI; redact tokens, passwords and identifying answer content. Mark PASS, FAIL, BLOCKED or NOT TESTED honestly. Backend evidence remains 500 unit tests and 398 API tests; the frontend team's own run must record its own totals. Publication, legacy cutover, school migration and recovery are separate decisions.

## 9. Testing and quality evaluation

### 9.1 Latest recorded evidence

Fresh full historical-label follow-up runs started on 8 October 2026 at 02:17:45 (unit) and 02:17:44 (API), Asia/Phnom_Penh, against the guarded local test database with the installed Node.js v24.16.0 and Prisma 6.19.3. The previously recorded review-workflow built-server checks are separate evidence and were not rerun as a frontend browser test.

| Verification | Result | Meaning / limit |
| --- | --- | --- |
| Unit suite | 41 suites / 500 tests passed; zero failures/pending tests. | Service/controller rules with mocked dependencies; not complete HTTP/database proof. |
| API/integration suite | 18 suites / 398 tests passed; zero failures/pending tests. | NestJS/Supertest and real PostgreSQL; includes the new reviewed paths and legacy compatibility. |
| Consistency/recovery suite | 64 scenarios passed, included in the 398 total: 23 existing, 19 reviewed, 12 progression and 10 historical-label cases. | Actual PostgreSQL overlap, original-result retry, reviewed drift and history/privacy checks. |
| Complete integration story | 16 cases passed, included in the 398 total. | Admin -> Student -> Lecturer backend workflow; not actual frontend browser acceptance. |
| Curriculum/title acceptance | 23 PostgreSQL cases passed, included in the 398 API total. | Academic-year selection, legacy unknowns, withdrawals/reapproval, atomic rejection, concurrent approvals, exact preservation and global title collisions; Section 9.8. |
| Historical-label acceptance | 10 PostgreSQL cases and 8 unit cases passed; included in the 398 API and 500 unit totals. | Captured/current/unknown presentation, stale renames, stable retry, history preservation, SQL immutability and anonymous query rejection; Section 9.9. |
| Built-server historical-label contract | Six grouped checks passed on owned temporary port 30424. | Startup, captured/unknown Swagger examples, server-owned fields, explicit slice rejection/whole reports and fixture cleanup; server stopped. |
| Built-server curriculum contract | Nine grouped checks passed on owned temporary port 30421. | Startup/docs, revision DTOs/routes/examples/JWT, optional compatibility and owned fixture cleanup. Server stopped; browser integration not tested. |
| Guided four-scenario HTTP evaluation | 87 HTTP assertions and 42 database assertions passed; all four scenarios passed. | Fresh built API on temporary port 30420 with dedicated synthetic accounts, real JWT login and exact history snapshots. Fixtures removed and server stopped. See Section 9.7; browser UI was unavailable. |
| Built-server progression checks | Six grouped checks passed on owned temporary port 30419. | Latest built startup/health/docs/OpenAPI; optional enum in create/update DTOs; concrete request examples/JWT/unauthenticated rejection. Temporary server stopped. |
| Earlier reviewed-workflow built-server checks | 12 grouped checks passed on owned temporary port 30418. | Health/docs/OpenAPI, all seven new POST routes and unauthenticated rejection, required DTO fields, configured-origin CORS. Temporary server stopped. |
| Earlier built-server walkthrough | 80 checks passed before baseline commit. | Prior evidence for setup/business behavior/cleanup; not newly rerun or additional Jest tests. |
| Build / Prisma validation / whitespace | Passed. | Additive migration applied to test database only; no school migration was executed. |
| Lint | No errors, five existing warnings. | Two empty entity files and three unused imports/test options remain. The previously unused enrollment example now documents Swagger requests. |

Older sources mention 453 unit tests; the committed baseline reported 476 unit and 334 API tests. Fresh follow-up totals are 500 unit and 398 API tests. Progression had 492 unit/365 API tests; curriculum added 23 API cases; historical labels added 8 unit and 10 API cases. The 64 consistency and 16 integration cases are already included in the API total. The 16 resolver policy cases are included in the unit total. The focused 19-case rerun also checks a subset, not additional tests to add.

Reproducible source tests are uncommitted test-code candidates. Latest historical-label evidence is .tmp/labels-unit-final.json, .tmp/labels-api-final.json, .tmp/labels-focused-api.json and .tmp/labels-http-checks.json. Earlier curriculum evidence is .tmp/curriculum-unit-final.json, .tmp/curriculum-api-final.json, .tmp/curriculum-focused-api.json and .tmp/curriculum-http-checks.json. Earlier progression evidence is .tmp/progression-unit-final.json, .tmp/progression-api-final.json and .tmp/progression-consistency-final.json; these are ignored synthetic evidence, not school-data exports. Earlier reviewed-workflow evidence is under `.tmp/frontend-followup-20261007`: `unit-final.json`, `api-final.json`, `reviewed-api-final.json`, `http-checks.json`, and the read-only test audit. The directory name reflects the handoff date; some checks completed on 8 October. Earlier raw logs/HTTP walkthrough remain under `.tmp/precommit-20261007`. All are ignored by Git and are not school-data exports.

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

### 9.10 Final backend evaluation and acceptance boundary

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

Latest recorded full runs began on 8 October 2026 at 02:17:45 (unit) and 02:17:44 (API), Asia/Phnom_Penh. They passed 41 unit suites/500 tests and 18 API suites/398 tests, with zero failures or pending tests. The 64 consistency cases, 23 curriculum cases and 16 integration-story cases are subsets of the 398 API total. The 16 progression resolver cases and eight historical-label helper cases are subsets of the 500 unit total. Six built-server label checks passed afterward; these grouped checks are separate evidence, not additional Jest test counts. Build/schema checks passed; lint has no errors and five existing warnings.

The subsequent requirement review and handoff/documentation preparation did not rerun the full backend suites. Eleven handoff JSON bodies were validated against the built DTOs and fourteen POST route references matched built controllers. The Markdown/Word reports were regenerated and checked for content, links, tables and OOXML/package integrity; visual Word rendering was unavailable. No UI, clean-clone installation, load benchmark, school restore or official migration was performed during these documentation steps.

Local raw test evidence is ignored under `.tmp`; reproducible test source and commands are part of the repository delivery. A recipient must run its own checks against the exact published commit, record its own results and fill the FE-01-FE-09 frontend checklist in Section 8.8. The current workspace remains uncommitted, and no push or school-database change is implied by this review. Section 11.4 identifies the remaining release tasks and their required decisions.

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

The project owner confirmed that no frontend UI or frontend project is available here. The agreed delivery format is the backend GitHub repository, which the frontend team can clone, preview through Swagger and test against its own UI later. Actual browser integration remains NOT TESTED. API/database evidence supports backend behavior; it does not claim a completed frontend screen evaluation. The current follow-up remains local and uncommitted until the final GitHub publication step.

| Decision owner | Decision needed | Effect |
| --- | --- | --- |
| Frontend/backend teams | Integrate and evaluate the implemented review_id, preview/confirm, retention and original-result retry contract. | Approve actual frontend behavior and choose the legacy cutover; backend implementation authorization is not frontend acceptance. |
| Frontend/backend teams | Mandatory explicit version selection versus set-only compatibility. | Establish reviewed-save behavior for every caller and any deprecation period. |
| Frontend/backend teams | Evaluate the approved progression workflow against the actual frontend; prepare intended-database deployment. | Policy and backend implementation are complete; no school database migration was executed. |
| Frontend/backend teams and operator | Evaluate the approved curriculum/title contract and deploy its additive migration to the intended database. | Policy and backend implementation complete; legacy unknown bindings remain explicit and no school migration was performed. |
| Frontend/backend teams and operator | Evaluate approved historical_labels/current_labels/UNKNOWN presentation and deploy the additive migration. | Policy and backend implementation complete; no legacy names were inferred and no school migration was performed. |
| School/operator | Official database, provenance and verified backup/restore. | Establish whether and how historical metadata can be recovered. |

The agreed backend contracts/policies are implemented. Remaining work is to publish the authorized delivery, reproduce its setup, evaluate the actual frontend connection, agree legacy cutover, assess school-sized load and rehearse operational recovery. Any newly requested behavior needs its own agreed scope and meaningful acceptance checks. No approval is inferred from a passing regression suite.

The prior delivery was committed as `578c63f`. The current workspace is on `master`; this follow-up remains uncommitted, includes additive review, progression, curriculum and historical-label migrations and preserves ignored private environment/temp files. No normal-database migration or school backfill was executed. This report does not itself stage, commit or push changes. The earlier targeted credential-pattern scan was not a comprehensive security audit.

Suggested commit title for a later authorized publication: `Add reviewed workflows and preserve academic evaluation history`.

Suggested handoff description: add caller-bound preview/confirmation and stable retries; permit explicitly reviewed older-version opening; protect drafts/completions during latest-version application; apply approved repeat/transfer/pause/resume/yearly-group rules; preserve offering curriculum revisions and immutable target labels with truthful legacy unknowns. Validation recorded 500 unit and 398 API tests passed. Actual frontend acceptance, legacy cutover, official recovery and school deployment remain pending. This is proposed publication text, not evidence of a commit or push.

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
| RELEASE-01 - Commit and publish delivery | The owner authorized committing this delivery and pushing to `origin/master`. Record the new commit ID, verify it is present on `origin/master` and share the handoff in Section 8.8. | IN PROGRESS. Remote fetch was blocked by a stale reference conflict and network unavailability; no commit or push is yet confirmed. |
| RELEASE-02 - Reproduce repository setup | Backend/frontend tester runs the documented isolated setup from a clean checkout of the published commit; records runtime, migrations, tests, health, Swagger and synthetic login. | NOT TESTED from a clean published checkout. Current local test results remain valid local evidence. |
| RELEASE-03 - Evaluate the frontend UI | Frontend team connects its own project and completes FE-01-FE-09 with requests/results and browser evidence. Report defects with the delivery commit and scenario IDs. | NOT TESTED; no frontend UI/project is available in this workspace. |
| RELEASE-04 - Agree reviewed-workflow cutover | Frontend/backend teams prove each caller sends explicit versions and fresh reviews, agree automatic-application behavior and then authorize the operator's configuration/restart. Verify missing-review rejection and safe retries. | PENDING agreement. Default REQUIRE_REVIEWED_CONFIRMATION=false preserves compatibility; true-mode rejection is already backend-tested. |
| RELEASE-05 - Verify official recovery | School/operator identifies the authoritative database and independent provenance; rehearses CLI/secure backup/restore; approves exact manifests and journals before school metadata apply. Preserve ambiguous records. | BLOCKED on official evidence and operator approval. Synthetic recovery tests do not establish a recoverable school backup. |
| RELEASE-06 - Prepare school deployment | School/operator verifies intended database, secure restorable backup, migration impact and all four additive migrations; evaluates school-sized load and the full workflow before release. Record outcomes and authorize migration/deployment separately. | PENDING. No school migration, load benchmark or production release was performed. |

Frontend API testing on an isolated database can proceed after an authorized repository publication without waiting for official historical recovery. School deployment and official metadata recovery each require their own operational evidence. Agree performance expectations before load testing; do not invent acceptable latency/concurrency thresholds. Preserve all existing accounts, credentials, placements, enrollments, frozen targets, drafts, anonymous answers and unknown legacy metadata throughout operational work.

The owner authorized a local commit and push to `origin/master`. This documentation update does not itself stage files or mutate a database. Record publication only after verifying the remote commit. Private environment settings and ignored temporary files are excluded from source control.

## 12. Presentation and reporting notes

### 12.1 Short explanation for a professor

> This backend manages the school's teaching-evaluation process from academic setup to anonymous results. Its main contribution is preserving student scope and questionnaire history when placements or questions change. Administrators can now confirm a stored review, safely retry its original operation and deliberately retain an older assigned questionnaire. The latest backend evaluation passed 500 unit tests and 398 API tests, including 64 real PostgreSQL consistency/recovery/progression/historical-label scenarios. Approved repeat/transfer/pause/resume/yearly-group rules use one shared resolver; approved curriculum revisions preserve the rules used by existing offerings, and saved target labels remain stable after later renames. Frontend integration/cutover, school deployment and official recovery evidence remain pending; passing backend tests is not full production readiness.

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

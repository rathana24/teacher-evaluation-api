# Assessment System — Backend Requirements

## 1. Purpose

The Assessment System backend supports teaching evaluation management for three roles: `ADMIN`, `LECTURER`, and `STUDENT`.

The implemented backend manages academic structure, students and placements, curriculum rules, course offerings and teaching groups, enrollments, versioned question sets, evaluation targeting, student drafts and anonymous submissions, lecturer/admin results, imports, exports, and protected reassignment workflows.

This document defines requirements from the implemented system itself. It is a clean functional reference, not a development history.

## 2. Technology and API conventions

| Area | Implemented choice |
|---|---|
| Framework | NestJS |
| Language | TypeScript |
| ORM | Prisma |
| Database | PostgreSQL |
| Authentication | JWT with Passport |
| Authorization | Role-based access control plus ownership/eligibility checks |
| Validation | `class-validator`, `class-transformer`, NestJS ValidationPipe |
| API documentation | Swagger / OpenAPI |
| Testing | Jest and Supertest |
| Base path | `/api` |
| Database identifiers | BigInt; API-facing identifiers are handled as strings where required |
| Update style | `PUT` for implemented update routes |
| State changes | Explicit action routes such as `open`, `close`, `archive`, and `apply-to-unfinished` |

## 3. Actors and business responsibilities

### ADMIN

ADMIN manages the controlled academic and evaluation setup:

- users and student accounts;
- academic years, semesters, departments, majors, and student generations;
- student academic placement records;
- course-year curriculum rules;
- courses and course offerings;
- explicit course-offering group scopes;
- enrollments and group-based enrollment preview/confirmation;
- enrollment reassignment with impact protection;
- surveys, survey versions, questions, and question ordering;
- evaluation participant preview, confirmation, scheduling, opening, and closing;
- student import/export and class-group administration;
- administrative anonymous result access.

### LECTURER

LECTURER is limited to teaching assignments and results belonging to that lecturer:

- view owned course offerings/evaluations;
- see configured teaching group scope separately from frozen evaluation group targets;
- view anonymous aggregate results for owned evaluations;
- view anonymous written comments;
- never receive student identity from anonymous response records.

### STUDENT

STUDENT operates only on the authenticated student's own evaluation access:

- view evaluations assigned and currently answerable;
- view evaluation history;
- load the effective questionnaire;
- check submission status;
- save, reload, and delete an unfinished draft;
- submit a final evaluation once.

## 4. Functional requirements

| ID | Requirement |
|---|---|
| FR01 | Authenticate ADMIN, LECTURER, and STUDENT accounts and enforce role-based authorization. |
| FR02 | Manage users, account status, password operations, and linked student profiles. |
| FR03 | Manage academic years, semesters, departments, majors, and student generations. |
| FR04 | Maintain one student academic placement per student and academic year, including year level, major, and optional class group. |
| FR05 | Resolve student academic context using explicit placement when available and generation-based progression when appropriate, without silently clamping unsupported years. |
| FR06 | Manage course-to-major/year curriculum rules used to describe valid curriculum placement. |
| FR07 | Manage courses and course offerings, including lecturer, semester, year level, class type, section label, and explicit teaching group scopes. |
| FR08 | Treat `section_code` as a label only; group membership must come from explicit group-scope data. |
| FR09 | Enroll students individually and through server-side group preview plus exact confirmation. |
| FR10 | Group enrollment selection must be scoped by academic year and relevant generation/major/year context and must use ACTIVE eligible students. |
| FR11 | Confirmation must use the exact reviewed student identifiers; stale selection must fail rather than silently enrolling a broader/different set. |
| FR12 | Preserve existing enrollments and skip/prevent duplicates. |
| FR13 | Support deliberate enrollment reassignment between compatible offerings only after impact preview and confirmation. |
| FR14 | Reassignment must not silently move or delete frozen evaluation participants, drafts, submissions, or historical placements. |
| FR15 | Manage named surveys/question sets and their metadata. |
| FR16 | Manage versioned questionnaires so historical evaluations/responses retain the questionnaire version that applied to them. |
| FR17 | Allow question creation, editing, deletion, and reordering only while the survey version is editable. |
| FR18 | Support rating, text, and implemented selectable-question data with validation of bounds/options and display order. |
| FR19 | Prevent unsafe mutation/deletion/archive of survey/question data that is locked or in use. |
| FR20 | Apply a newer version of the same survey only to safe unfinished participants; completed participants and participants with drafts remain on their existing effective version. |
| FR21 | Create evaluations as DRAFT, schedule them, open them, and close them according to lifecycle rules. |
| FR22 | Preview evaluation participants using real enrollment plus explicit academic/group context. |
| FR23 | Confirm the exact reviewed participant identifiers and reject stale participant previews with conflict instead of falling back to all enrolled students. |
| FR24 | Freeze evaluation group targets and participant rows so later student placement/group changes do not rewrite historical evaluation scope. |
| FR25 | Require targeted evaluations to have valid frozen participants before opening. |
| FR26 | Allow a student to answer only when the student is a frozen participant, remains eligible for access, the evaluation is OPEN, the current time is inside the active window, and the student has not submitted. |
| FR27 | Support server-side assessment drafts tied to the participant's effective survey version. |
| FR28 | Validate and store final evaluation responses transactionally and anonymously. |
| FR29 | Prevent duplicate final submission, including concurrent duplicate attempts. |
| FR30 | Keep response/answer data separate from student identity while using participant state only to track completion. |
| FR31 | Provide student evaluation history and submission/completion status. |
| FR32 | Provide lecturer-owned evaluation metadata, response counts, aggregate dashboards, and anonymous comments. |
| FR33 | Provide administrative anonymous result access and result metadata. |
| FR34 | Report result data against the actual survey version used by responses/participants so mixed-version unfinished updates do not corrupt reporting. |
| FR35 | Include frozen group-target metadata in result/lecturer evaluation context when available, and explicitly report when frozen group metadata is unavailable. |
| FR36 | Import students in bulk while normalizing class-group values for new placement writes and skipping existing/conflicting identifiers without changing their passwords, access, or placement. |
| FR37 | Export students using academic/generation/major/group scope and label the academic year represented by exported placement data. |
| FR38 | Provide class-group options for a selected academic-year/generation/major scope. |
| FR39 | Allow ADMIN bulk class-group changes only for students with existing placements in the selected academic year; patch only the group value and do not invent missing placements. |
| FR40 | Normalize new class-group writes consistently by trimming, collapsing internal whitespace, uppercasing, treating empty input as null where nullable, and enforcing the 50-character limit. |
| FR41 | Preserve historical unknown class-group values unless an explicit write updates them. |
| FR42 | Validate semester number as 1 or 2 when supplied, while preserving historical null values rather than guessing/backfilling them. |
| FR43 | Exclude DRAFT evaluations from result reporting intended for released/meaningful evaluation outcomes. |
| FR44 | Calculate response counts/rates from the evaluation's frozen participant population and anonymous responses. |

## 5. Business rules

### Identity, access, and security

- Authentication and authorization are separate: a valid JWT identifies the caller; role/ownership/eligibility rules decide what the caller may do.
- ADMIN-only management endpoints are protected by role guards.
- Lecturer result access is limited to the lecturer's own teaching/evaluation context.
- Student endpoints operate on the authenticated student's own participant state.
- Password hashes are not returned by API responses.
- Password/session revocation uses the implemented authentication-version mechanism where applicable.

### Student placement and groups

- A student's group belongs to a specific academic-year placement; it is not a global property of the user.
- The same group label (for example `A`) can exist in different generations or majors and must not be treated as globally unique.
- Explicit academic records take precedence for the selected academic year.
- Generation progression can resolve an effective year only when the required academic-year data supports it.
- Unsupported progression is reported explicitly (`NOT_STARTED`, `BEYOND_PROGRAM`, or unavailable context) instead of being forced into Year 1–5.
- New class-group writes use one shared normalization rule.
- Missing placement rows are not created implicitly by bulk group updates.

### Course offerings and enrollment

- A course offering is a concrete delivery of a course by a lecturer in a semester.
- `section_code` is descriptive; it does not prove group assignment.
- Explicit course-offering group scopes identify the academic/group context served by the offering.
- Duplicate enrollment in the same offering is not allowed.
- Bulk/group enrollment is previewed before confirmation.
- Confirmation uses exact reviewed IDs and rechecks selection in a transaction.
- Selection drift is a conflict (`409`); the backend does not silently add newly matching students.
- Existing enrollments are preserved.
- Reassignment is deliberate and impact-aware; group changes alone do not move enrollments.

### Surveys, versions, and questions

- Survey is the named question set; survey version is the exact questionnaire snapshot.
- A version can be edited only while its lifecycle/use state allows editing.
- Question ordering is explicit.
- Versions referenced by protected evaluation history cannot be destructively changed.
- Completed response history remains tied to the effective version used for that response.
- A newer survey version can be applied only to safe unfinished participants of the same survey.
- Participants who already submitted or hold a draft are not silently migrated.

### Evaluations and participant targeting

- Evaluation lifecycle is `DRAFT → OPEN → CLOSED`.
- Schedule changes are allowed only while DRAFT.
- Opening requires a valid schedule, usable questionnaire, and confirmed participant state.
- Group-targeted evaluation selection intersects explicit group context with real offering enrollment.
- Group filters are never ignored and never fall back to `ALL_ENROLLED`.
- Confirmed evaluation participants and group targets are frozen historical scope.
- Later placement/group changes do not automatically alter frozen participants or historical results.
- Group selection does not itself grant evaluation access; participant/access rules still apply.

### Drafts, submission, anonymity, and results

- Drafts are identifiable unfinished work and remain tied to the effective survey version.
- Final responses are anonymous and do not store student/participant identity.
- Submission validates answers before write and rechecks critical state transactionally.
- A participant can submit only once.
- Partial final submissions must not remain after transaction failure.
- Lecturer/admin results expose aggregate/anonymous information, not student-response linkage.
- Results use the actual effective survey-version context so mixed-version data is not merged incorrectly.

## 6. Core data relationships

```text
User
 ├─ Student profile ─ Student Generation
 │                    └─ Student Academic Records
 │                       ├─ Academic Year
 │                       ├─ Major
 │                       └─ Class Group
 └─ Lecturer role

Course ─ Course Year Rules ─ Major + Year Level
  │
  └─ Course Offering
      ├─ Lecturer
      ├─ Semester ─ Academic Year
      ├─ Explicit Group Scopes
      ├─ Enrollments
      └─ Evaluations
          ├─ Survey Version ─ Questions
          ├─ Frozen Group Targets
          ├─ Frozen Participants ─ Assessment Draft
          └─ Anonymous Responses ─ Answers
```

## 7. Main workflows

### Academic and teaching setup

```text
Academic Year
→ Semester
→ Department / Major
→ Student Generation
→ Student Placement
→ Course + Course-Year Rule
→ Course Offering + Explicit Group Scope
```

### Enrollment

```text
Choose Offering + Academic Context + Group(s)
→ Preview Eligible ACTIVE Students
→ Review Exact IDs and Counts
→ Confirm Exact IDs
→ Transaction Rechecks Selection
→ Create Missing Enrollments / Preserve Existing
```

### Evaluation

```text
Choose Offering + Survey Version + Academic/Group Scope
→ Preview Eligible Enrolled Students
→ Review Exact Participant IDs
→ Create/Confirm Evaluation
→ Freeze Group Targets + Participants
→ Set Schedule
→ Open
→ Student Draft/Submission
→ Close
→ Lecturer/Admin Anonymous Results
```

### Safe questionnaire update

```text
Create New Version of Same Survey
→ Inspect Unfinished Participant State
→ Completed: keep existing version
→ Has Draft: keep existing version
→ Safe untouched unfinished: move to new version
→ Preserve response/reporting version history
```

### Enrollment reassignment

```text
Choose Source Offering + Target Offering + Student
→ Preview Target Placement/Group Compatibility
→ Report Frozen Participant/Draft/Submission Impact
→ Confirm
→ Recheck Exact State Transactionally
→ Block if protected work would be damaged
→ Move Enrollment Only
```

## 8. Acceptance scenarios

The implemented requirements are expected to preserve these behaviors:

- Group A and Group B students may share the same course while attending different TD/TP offering scopes.
- A Group A evaluation must not include Group B students through direct API use.
- The same group label in another generation or major must not leak into the selected scope.
- Changing a student's placement from A to B later does not rewrite already frozen evaluation participants or historical results.
- Exported group data identifies which academic-year placement the group represents.
- Stale enrollment/evaluation previews fail explicitly rather than broadening the confirmed population.
- Missing group metadata fails closed where exact targeting requires it.
- Duplicate enrollments and duplicate submissions are prevented.
- Completed and draft-holding participants are protected during survey-version reconciliation.

## 9. Verification baseline

The completed backend was validated with:

- TypeScript compilation (`tsc --noEmit`);
- Prisma schema validation;
- NestJS production build;
- automated Jest test suite;
- 39 passing test suites;
- 453 passing tests.

Swagger remains useful for manual integration/smoke testing, but the requirements above describe the implemented backend behavior rather than a manual test checklist.

## 10. Potential future enhancements

These are ideas for later review, not current requirements:

- machine-readable application error codes;
- stronger production HTTP hardening/rate limiting;
- broader pagination/search consistency across large list endpoints;
- richer audit logging for sensitive administrative changes;
- frontend-assisted impact visualization for enrollment reassignment;
- additional reporting dimensions while preserving anonymity;
- database-level constraints where service-level validation is currently the primary protection.

Future changes should be evaluated against the frozen-participant, historical-placement, questionnaire-version, and anonymity rules above.

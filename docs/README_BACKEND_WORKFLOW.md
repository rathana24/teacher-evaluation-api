# Teacher Evaluation API — Backend Workflow

This document explains how the completed backend works as one system. It is an operational/domain workflow reference, not a development timeline.

## 1. System model

```text
ADMIN configures academic + teaching context
                ↓
ADMIN enrolls the correct students
                ↓
ADMIN prepares a versioned question set
                ↓
ADMIN previews and confirms exact evaluation participants
                ↓
Evaluation freezes target scope and participants
                ↓
STUDENT saves draft or submits anonymously
                ↓
LECTURER / ADMIN views anonymous results
```

The central design rule is:

> **Preview → review exact identifiers → confirm → freeze historical scope.**

This avoids hidden changes between what an administrator reviewed and what the backend finally stores.

## 2. Academic structure workflow

```text
Academic Year
    ↓
Semester
    ↓
Department
    ↓
Major
    ↓
Student Generation
    ↓
Student Academic Record
    ├─ year_level
    ├─ major_id
    └─ class_group
```

A student academic record represents placement for one academic year. The class group is therefore contextual, not a permanent property of the student account.

When no explicit placement is available for a selected year, generation data may be used to calculate an effective year level only when the academic-year information supports that calculation. The backend reports not-started, beyond-program, or unavailable states instead of forcing an incorrect year.

## 3. Class-group normalization

For new/edited class-group values the backend uses one shared normalization rule:

```text
"  a  "       → "A"
" group   b " → "GROUP B"
empty input   → null where nullable
```

Rules:

- trim outer whitespace;
- collapse repeated internal whitespace;
- uppercase;
- maximum length 50;
- do not globally rewrite historical unknown values.

The same label such as `A` is not globally unique. Scope must include the relevant academic year, generation, major, and year context.

## 4. Curriculum workflow

```text
Course
  +
Major
  +
Year Level
  ↓
Course-Year Rule
```

Course-year rules describe which course belongs to which major/year curriculum context.

This is separate from a course offering. A course is the reusable subject; an offering is the concrete delivery.

## 5. Course-offering workflow

```text
Course
  +
Lecturer
  +
Semester
  +
Year Level / Class Type / Section Label
  ↓
Course Offering
  +
Explicit Group Scope(s)
```

`section_code` is a label only. It must not be interpreted as proof that the offering serves a particular student group.

Explicit group scopes store the actual teaching context:

```text
Academic Year
Generation
Major
Year Level
Class Group
```

An offering can serve one or multiple groups.

## 6. Enrollment workflow

### Individual enrollment

ADMIN can add a student directly to a course offering when the student is valid and eligible. Duplicate membership is prevented.

### Group enrollment

```text
Select offering
    ↓
Select academic year + generation/major/year + group(s)
    ↓
Backend selects ACTIVE eligible students
    ↓
Preview
    ├─ exact student/user IDs
    ├─ total eligible
    ├─ already enrolled
    └─ new candidates
    ↓
Frontend/admin reviews
    ↓
Confirm exact reviewed IDs
    ↓
Backend re-runs selection inside transaction
    ↓
Same set?
 ┌───────┴────────┐
Yes              No
 ↓                ↓
Create missing   409 Conflict
enrollments      (stale preview)
```

The backend never silently adds students who became newly eligible after preview.

Existing enrollments remain unchanged and duplicates are skipped/prevented.

## 7. Enrollment reassignment workflow

Changing a student's class group does **not** automatically move course enrollments.

A deliberate move between compatible offerings uses:

```text
Source Offering
    +
Target Offering
    +
Student
    ↓
Impact Preview
    ├─ target placement/group compatibility
    ├─ frozen evaluation participation
    ├─ draft impact
    └─ submitted-response impact
    ↓
Confirm
    ↓
Transactional recheck
```

Protected behavior:

- source enrollment must still exist;
- target placement/group must still match;
- target enrollment must not have appeared unexpectedly;
- drafts/submissions that would be damaged block the move;
- frozen evaluation participants are not moved/deleted;
- student placement history is not rewritten;
- only the enrollment row is moved when safe.

## 8. Survey and question-set workflow

```text
Survey (named question set)
    ↓
Survey Version
    ↓
Questions
    ├─ RATING
    ├─ TEXT
    └─ selectable options where configured
```

A survey version is the exact questionnaire snapshot used by an evaluation/participant/response context.

Editable versions support:

- add question;
- update question;
- delete question;
- reorder questions.

Lifecycle/usage rules prevent unsafe edits, archive, or deletion once history depends on the version.

## 9. Safe survey-version update workflow

A newer version of the **same survey** may be applied to safe unfinished participants.

```text
New version
    ↓
Inspect participant state
    ├─ submitted        → keep existing effective version
    ├─ has saved draft  → keep existing effective version
    └─ untouched        → may move safely
```

The evaluation's historical/base context is not used to overwrite completed response history. Result reporting respects the actual effective survey version.

## 10. Evaluation targeting workflow

```text
Course Offering
    +
Survey Version
    +
Academic / Group Scope
    ↓
Participant Preview
    ↓
Intersect with REAL offering enrollments
    ↓
Exclude inactive/ineligible students
    ↓
Return exact IDs + counts + scope metadata
    ↓
Confirm exact IDs
    ↓
Transactional recheck
    ↓
Freeze:
    ├─ evaluation_group_targets
    └─ evaluation_participants
```

Important rules:

- group filters cannot be ignored;
- targeted requests do not fall back to `ALL_ENROLLED`;
- same group label in another generation/major is excluded;
- group selection alone does not grant access;
- real enrollment is required;
- stale preview causes `409 Conflict`.

## 11. Evaluation lifecycle

```text
DRAFT
  │
  ├─ participant scope prepared/frozen
  ├─ schedule can be edited
  └─ questionnaire readiness checked
  ↓
OPEN
  │
  ├─ students may answer only inside active window
  ├─ question-set protection applies
  └─ participant population remains frozen
  ↓
CLOSED
  └─ lecturer/admin result access
```

An evaluation cannot open without valid schedule/question/participant readiness.

## 12. Student access workflow

```text
Student JWT
    ↓
Resolve linked student/account
    ↓
Find frozen participant assignment
    ↓
Check current access rules
    ├─ evaluation OPEN?
    ├─ inside time window?
    ├─ eligible/enrolled as required?
    └─ not submitted?
    ↓
Return questionnaire / status
```

Student routes also provide evaluation history, including completed/upcoming/closed context as implemented.

## 13. Draft workflow

```text
Student opens assigned evaluation
    ↓
Effective survey version resolved
    ↓
Student saves partial answers
    ↓
Backend validates
    ↓
Assessment Draft saved for participant + effective version
```

The student can load, update, or delete the draft.

A saved draft protects the participant from being silently moved to an incompatible/new questionnaire version.

## 14. Final submission workflow

```text
Student submits answers
    ↓
Validate question ownership/type/range/options/required fields
    ↓
Begin transaction
    ↓
Recheck evaluation + participant state
    ↓
Conditional "not submitted" → submitted
    ↓
Create anonymous response
    ↓
Create answers/options
    ↓
Remove draft
    ↓
Commit
```

If any required step fails, the transaction rolls back.

The participant row tracks whether the student submitted. The anonymous response does not store student or participant identity.

## 15. Result workflow

Results are derived from frozen evaluation context and anonymous responses.

The backend supports:

- administrative anonymous results;
- lecturer-owned anonymous results;
- response count and response rate;
- rating aggregates/distributions;
- anonymous text comments;
- actual survey-version grouping/context;
- frozen evaluation group metadata when available;
- explicit indication when frozen group metadata is unavailable.

DRAFT evaluations are excluded from result reporting intended for completed/released evaluation context.

## 16. Student import workflow

```text
Import row
    ↓
Validate identifiers + academic references
    ↓
Existing/conflicting student?
 ┌──────────┴──────────┐
Yes                   No
 ↓                     ↓
Skip safely           Normalize group
(no password/         ↓
placement/access      Transactionally create
changes)              user + student + placement
```

Import uses the same class-group normalization as other future writes.

## 17. Student export workflow

Exports can use academic/generation/major/group scope.

When a class group is used as a filter, the request must provide enough academic context to avoid treating a group label as globally unique.

Exported placement data identifies the academic year represented by the group/placement. All-history output therefore does not present a group without placement-year context.

## 18. Bulk class-group administration

ADMIN can update a class group for confirmed student IDs in a selected academic year.

```text
Selected Academic Year
    +
Confirmed Student IDs
    +
New Group
    ↓
Normalize Group
    ↓
Verify every student already has placement in that year
    ↓
Any placement missing?
 ┌────────┴────────┐
Yes               No
 ↓                 ↓
Reject all         Update class_group only
```

The operation does not rewrite major, year level, generation, enrollment, participant history, or passwords.

## 19. Lecturer workflow

```text
Lecturer Login
    ↓
Owned Teaching Assignments
    ├─ offering group scopes
    └─ nested evaluations
        └─ frozen evaluation group targets
    ↓
Owned Evaluation
    ↓
Anonymous Dashboard / Comments
```

Offering group scope and evaluation group targets are intentionally separate. Changing the offering configuration later must not rewrite an earlier evaluation's frozen target context.

## 20. Error behavior

Typical meaning:

| Status | Meaning |
|---|---|
| 400 | Invalid input or missing required business context |
| 401 | Missing/invalid authentication |
| 403 | Authenticated but not allowed/owned/eligible |
| 404 | Requested resource not found |
| 409 | State conflict, duplicate, locked state, stale preview, or protected historical impact |

The backend prefers explicit failure over broad fallback when exact academic/group scope cannot be proven.

## 21. Testing workflow

For code changes:

```text
Inspect current behavior
    ↓
Implement smallest complete change
    ↓
TypeScript compile
    ↓
Targeted Jest tests
    ↓
Full regression
    ↓
Build / Prisma validation
```

Use the project Jest script:

```bash
npm test -- <spec-path> --runInBand
```

Do not bypass the package script with direct `npx jest`, because the project test command supplies the required ESM VM flag.

## 22. Completed verification baseline

```text
TypeScript compile     PASS
Prisma validation      PASS
NestJS build           PASS
Jest test suites       39 / 39 PASS
Jest tests             453 / 453 PASS
```

Swagger can be used for final/manual API smoke checks, but automated verification is the primary regression baseline.

## 23. Regression scenarios to preserve

Any future backend change should preserve at least these domain behaviors:

- Group A evaluation excludes Group B even when both share the same course.
- Group A in another generation/major does not match by label alone.
- A later A→B placement change does not rewrite frozen evaluation participants/results.
- Enrollment/evaluation confirmation rejects stale preview state.
- Existing enrollment is preserved.
- Missing exact targeting metadata fails closed.
- Draft/submitted work blocks destructive reassignment.
- Completed responses retain their effective questionnaire version.
- Anonymous results do not expose student-response identity.
- Exported class-group data includes placement-year context.

These scenarios are useful starting points for finding future gaps without changing the meaning of the completed backend.

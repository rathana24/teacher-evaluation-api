# Proposals for the frontend team

From: backend (DIN Reaksa) · Date: 21 Oct 2026 · Backend branch: `frontend-alignment`

These items came out of the frontend–backend alignment check (`docs/ALIGNMENT_ANALYSIS.md`). They are fixed best in the frontend, because changing the backend would weaken a business rule or because the backend already provides the right contract. File references are to `teacher-evaluations-master/src`.

Fixed on the backend already, no frontend change needed:

- **M1:** `GET /evaluations` now returns `survey_versions.survey_id`.
- **M2:** `PUT /course-offerings/:id` now accepts `section_code: null` and clears the class label. Editing an unlabelled assignment no longer fails with 400. A label that is empty or only spaces is rejected with 400 (see section 5).

## 1. M3: student year must be required when creating an assignment

**Problem:** In the lecturer page's assignment form, "Student year" is marked *Optional*. Creating a new assignment with it empty sends `year_level: null`. The backend rejects that with **400**, because a new offering must have a student year (1–5) with an enabled curriculum approval (requirement H). Accepting null on the backend would reopen the curriculum bypass that H closes. Editing an existing legacy assignment that has no year is still allowed.

**Where:**
- `pages/admin_user/LecturerAssignments.jsx:207`: field labelled Optional
- `pages/admin_user/LecturerAssignments.jsx:152-158`: submit check only validates the year if one is entered
- `services/appDataSource.js:553`: sends `year_level: null` when empty

**Suggested fix:**
- When `!editing.id`, mark the field required, remove the "Optional" label, and block submit with "Choose a student year from 1 to 5" if it is empty.
- Keep it optional only for editing existing legacy rows.
- In `appDataSource.js:553`, omit `year_level` instead of sending `null` when it is empty. The backend then keeps the saved value.

## 2. M4: do not send `class_type: null` when editing

**Problem:** On edit, the class type select offers "Not assigned (legacy)". Choosing it sends `class_type: null`. If the assignment already has a known type, the backend rejects this with **400 `OFFERING_CLASS_TYPE_REQUIRED`**: a known class type is part of the assignment's identity (requirement J) and cannot be cleared.

**Where:**
- `pages/admin_user/LecturerAssignments.jsx:208`: the "Not assigned (legacy)" option
- `services/appDataSource.js:554`: `class_type: r.classType || null`

**Suggested fix:**
- In `appDataSource.js:554`, send `class_type` only when a type is selected (`...(r.classType ? { class_type: r.classType } : {})`). Omitting it keeps the saved value.
- In the form, show the "Not assigned (legacy)" option only when the saved assignment really has no type.

## 3. M5: new academic year: use `/academic-years/setup`; the client assignment copy is not redundant today

**Problem:** After `POST /academic-years`, the frontend creates semesters, copies student groups and copies teaching assignments with separate requests. These steps are not atomic and stop if the browser closes. What the backend's plain `POST /academic-years` actually does (verified by e2e test):

- It **already copies student group placements** in the same transaction and returns them in `rollover.groups`. The frontend's group copy (`copyPreviousYearGroups`) then finds them existing and only reports them as *preserved*. That is duplicate work with confusing counts.
- It **does not copy teaching assignments**, because it creates no semesters. Every predecessor assignment comes back in `rollover.assignments` as skipped with `INCOMPLETE_OR_UNAVAILABLE_CONTEXT`. So **the frontend's teaching-assignment copy is still needed** when the plain endpoint is used.

**Where:**
- `services/appDataSource.js:668-690`: academic-year create, then semesters (`:677`), groups (`:680`) and assignments (`:685`)
- `services/studentGroupRollover.js:48`: `copyPreviousYearGroups`
- `services/teachingAssignmentRollover.js:71`: `copyPreviousTeachingAssignments`
- `services/academicSetup.js:52`: `createMissingSemesters`

**Suggested fix (recommended):** when `/auth/me` has `capabilities.integrated_academic_year_rollover_v1 === true`, replace the whole sequence with one call:

- `POST /academic-years/setup`, with body `{ academic_year: { name, start_year, is_active }, semesters: [{ semester_number, semester_name, start_date?, end_date? }, ...] }` (Semester 1 and 2) and an `Idempotency-Key` header (a generated UUID kept for retries, with the same body).
- It creates the year, both semesters, the group placements and the teaching assignments **atomically and idempotently**, and returns the `rollover` counts and skip reasons to display.
- After a lost response, retry with the same key or read `GET /academic-years/setup/receipts/{key}`. Never create another year.
- Retire `copyPreviousYearGroups` / `copyPreviousTeachingAssignments` for that path.

**If the plain endpoint stays for now:**
- Skip the client group copy and show `rollover.groups` from the response instead.
- **Keep** the client semester creation and teaching-assignment copy. They are not redundant today.

Backend contract: `teacher-evaluation-api/docs/BACKEND_ALIGNMENT_CONTRACTS.md` (section M5) and Swagger for `POST /academic-years` and `POST /academic-years/setup`.

## 4. G2: detect "no saved draft" by status, not by the exact message

**Problem:** `findDraft` treats a 404 as "no draft" only if the message is exactly `"No saved draft was found for this evaluation"`. Any wording change on the backend (or a translated message) would turn a normal "no draft" into an error that breaks the student's whole evaluation list. The backend now has an e2e test that pins this message, but matching on text is fragile.

**Where:** `services/appDataSource.js:106-117` (`findDraft`, the message comparison at `:112`)

**Suggested fix:** treat `error.status === 404` from `GET /student/evaluations/:id/draft` as "no draft". The evaluation itself was already confirmed by `/student/evaluations/history`, so a 404 on this endpoint means no draft. The backend can also add a stable `code` (for example `DRAFT_NOT_FOUND`) for the frontend to check instead of the text. Tell us if you want it.

Related, low priority: after a final submission, the same endpoint returns **409** "You have already submitted this evaluation". The frontend only loads drafts for "Not Started" evaluations, so this happens only if a student submits between the list load and the draft load. In that case `appDataSource.js:217-225` counts it as a draft that "needs administrator review after the backend upgrade", which is misleading. Suggested: on that 409, refresh the history (the evaluation is now Completed) instead of showing the warning.

## 5. Trim the class label (`section_code`) before sending

**Problem:** Since backend commit `ab2a30e`, a `section_code` that is empty after trimming (`""` or only spaces) returns **400** on `POST /course-offerings`, `PUT /course-offerings/:id` and each row of `create-with-enrollments`. Before, a label of only spaces was saved as an empty label. The frontend sends the label exactly as typed. If an admin types only spaces into "Class label (optional)", saving now fails. Normal labels are not affected: the backend trims them before saving.

| Value sent as `section_code` | Create (`POST`) | Edit (`PUT`) |
|---|---|---|
| omitted | no label | keeps the saved label |
| `null` | 400 | clears the label |
| `""` / spaces only | 400 | 400 |
| `"A"` | saved `"A"` | saved `"A"` |

**Where:**
- `services/appDataSource.js:556`: edit sends `section_code: r.section || null`. A spaces-only label is truthy, so it is sent untrimmed.
- `services/appDataSource.js:557-558`: create sends `section_code: r.section` untrimmed whenever the field is non-empty.
- `pages/admin_user/CoursesByYear.jsx:112`: passes `section: teacher.section` as typed (input at `:170`).
- `pages/admin_user/LecturerAssignments.jsx:217-218`: stores the input as typed (`update("section", e.target.value)`).
- Already correct, no change: `services/teachingAssignmentRollover.js:29` trims and omits a blank label.

**Suggested fix** in `appDataSource.js:555-559`, trim once and then:
- **Create:** omit `section_code` when the trimmed label is blank; otherwise send the trimmed label.
- **Edit:** send `section_code: null` when the trimmed label is blank (clears it); otherwise send the trimmed label.

```js
const label = String(r.section ?? "").trim();
...(r.id
  ? { section_code: label || null }
  : label
    ? { section_code: label }
    : {}),
```

Backend contract: `teacher-evaluation-api/docs/BACKEND_ALIGNMENT_CONTRACTS.md` (section M2).

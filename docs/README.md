# Teacher Evaluation API

Backend API for an academic teaching-evaluation system. It supports administration of academic structure and teaching assignments, student enrollment and placement, versioned evaluation questionnaires, exact participant targeting, anonymous student submissions, and lecturer/admin result access.

## Core stack

- NestJS 12
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT + Passport
- Swagger / OpenAPI
- Jest + Supertest

## Roles

### ADMIN
Manages academic structure, users/students, placements, curriculum rules, courses, offerings, group scopes, enrollments, surveys, questions, evaluations, imports/exports, and administrative results.

### LECTURER
Views owned teaching assignments/evaluations and anonymous aggregate results/comments.

### STUDENT
Views assigned evaluations, manages an unfinished draft, submits once, and views evaluation history/status.

## Main backend flow

```text
Academic Setup
    ↓
Student Placement + Course Curriculum
    ↓
Course Offering + Explicit Group Scope
    ↓
Enrollment Preview → Exact Confirmation
    ↓
Survey → Version → Questions
    ↓
Evaluation Participant Preview → Exact Confirmation
    ↓
Frozen Group Targets + Frozen Participants
    ↓
DRAFT → OPEN → CLOSED
    ↓
Student Draft / Anonymous Submission
    ↓
Lecturer / Admin Anonymous Results
```

## Important domain rules

- A class group belongs to a student's academic-year placement, not globally to the user.
- Group labels are scoped by academic year, generation, major, and year context.
- `section_code` is only a display/section label; explicit group-scope records define offering groups.
- Enrollment and evaluation bulk selection use preview + exact-ID confirmation.
- Stale confirmation fails with conflict rather than silently including a changed population.
- Evaluation group targets and participants are frozen so later placement changes do not rewrite history.
- Student group changes do not automatically move enrollments or evaluation participants.
- Survey versions preserve questionnaire history.
- Completed participants and participants with saved drafts are protected from unsafe survey-version changes.
- Final responses are anonymous and separated from participant identity.
- Duplicate final submission is prevented transactionally.

## Main modules

```text
src/
├── auth/
├── users/
├── academic-years/
├── semesters/
├── departments/
├── majors/
├── student-generations/
├── students/
├── student-academic-records/
├── courses/
├── course-year-rules/
├── course-offerings/
├── enrollments/
├── surveys/
├── survey-versions/
├── questions/
├── evaluations/
├── student-access/
├── assessment-drafts/
├── submissions/
├── lecturer-dashboard/
├── comments/
└── results/
```

Shared infrastructure includes Prisma, role guards/decorators, BigInt parsing, DTO validation, and class-group normalization.

## Database concepts

Important persisted concepts include:

- users and student profiles;
- academic years, semesters, departments, majors, generations;
- student academic records (`year_level`, `major_id`, `class_group`);
- courses and course-year rules;
- course offerings and explicit `course_offering_group_scopes`;
- enrollments;
- surveys, survey versions, questions/options;
- evaluations, frozen `evaluation_group_targets`, and evaluation participants;
- assessment drafts;
- anonymous responses and answers.

## Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

Swagger is served by the application at:

```text
/api/docs
```

## Useful commands

```bash
npm run start:dev
npm run build
npm run lint
npm test
npm run test:e2e
npm run test:cov
npx tsc --noEmit
npx prisma validate
```

The Jest script already includes Node's `--experimental-vm-modules` flag, so targeted tests should be run through `npm test`, for example:

```bash
npm test -- src/enrollments/enrollments.service.spec.ts --runInBand
```

## Validation baseline

The completed backend has been checked with TypeScript compilation, Prisma validation, NestJS build, and the automated test suite.

```text
Test suites: 39 passed
Tests:       453 passed
```

## Documentation

- `Backend_Requirements.md` — functional requirements and business rules derived from the implemented backend.
- `README_BACKEND_WORKFLOW.md` — end-to-end operational/domain workflow and module responsibilities.
- `Assessment_System_Technical_Functional_Documentation.docx` — technical and functional reference for integration, review, and defense preparation.

## Design principle

The backend favors explicit, reviewable state over implicit inference:

```text
Preview → Review exact scope → Confirm → Freeze history
```

That principle is used for group enrollment, evaluation participants, group targets, questionnaire history, and protected reassignment.

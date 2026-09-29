# Assessment / Teaching Evaluation System — Backend

> **Backend status:** Core scope complete and tested  
> **Stack:** NestJS · TypeScript · PostgreSQL · Prisma · JWT/Passport · Swagger · Jest · ts-jest · Supertest  
> **Roles:** ADMIN · LECTURER · STUDENT  
> **API base path:** `/api`

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Current Development Progress](#2-current-development-progress)
3. [Technology Stack](#3-technology-stack)
4. [Roles and Permissions](#4-roles-and-permissions)
5. [Main Evaluation Workflow](#5-main-evaluation-workflow)
6. [Privacy and Anonymity](#6-privacy-and-anonymity)
7. [Important Business Rules](#7-important-business-rules)
8. [Project Structure](#8-project-structure)
9. [Main API Endpoints](#9-main-api-endpoints)
10. [API Conventions](#10-api-conventions)
11. [Swagger Documentation](#11-swagger-documentation)
12. [Backend Testing](#12-backend-testing)
13. [Setup and Run](#13-setup-and-run)
14. [Seed Accounts](#14-seed-accounts)
15. [Known Limitations / Future Improvements](#15-known-limitations--future-improvements)
16. [Differences From the Original Proposal](#16-differences-from-the-original-proposal)
17. [Final Backend Status](#17-final-backend-status)

---

# 1. Project Overview

This project is the backend API for an **Assessment / Teaching Evaluation System**.

The backend manages the complete teaching evaluation lifecycle from academic setup to anonymous student feedback and lecturer result viewing.

The system has three main roles:

- **ADMIN**
- **STUDENT**
- **LECTURER**

The Admin prepares academic data, course offerings, enrollments, surveys, questions, and evaluations.

Students can anonymously evaluate courses for which they are eligible.

After an evaluation is closed, lecturers can view aggregated rating results and anonymous written comments for their own course offerings.

The main workflow is:

```text
ADMIN
  │
  ├── Manage Academic Years
  ├── Manage Departments
  ├── Manage Users
  ├── Manage Courses
  ├── Manage Semesters
  ├── Create Course Offerings
  ├── Enroll Students
  ├── Create Surveys
  ├── Create Survey Versions
  ├── Create / Reorder Questions
  └── Create & Open Evaluations
             │
             ▼
          STUDENT
             │
             ├── View available evaluations
             ├── View survey questions
             ├── Submit one anonymous response
             └── View evaluation history
                        │
                        ▼
                     ADMIN
                        │
                        └── Close Evaluation
                                  │
                                  ▼
                              LECTURER
                                  │
                                  ├── View own evaluations
                                  ├── View aggregate dashboard
                                  ├── View results
                                  └── View anonymous comments
```

---

# 2. Current Development Progress

## 2.1 Original Core Scope

The original backend scope was divided into **13 main features**.

| # | Feature | Description | Status |
|---|---|---|---|
| 1 | Users | Manage users and account status | ✅ |
| 2 | Courses | Manage course information | ✅ |
| 3 | Semesters | Manage semesters | ✅ |
| 4 | Course Offerings | Connect course, semester, lecturer, and section | ✅ |
| 5 | Enrollments | Enroll students into course offerings | ✅ |
| 6 | Surveys | Manage reusable survey templates | ✅ |
| 7 | Survey Versions | Version surveys and copy questions | ✅ |
| 8 | Questions | Manage survey questions | ✅ |
| 9 | Evaluations | Create, schedule, open, close, and delete evaluations | ✅ |
| 10 | Student Access | Show evaluations available to a student | ✅ |
| 11 | Submission | Validate and save anonymous responses | ✅ |
| 12 | Lecturer Dashboard | Show aggregated evaluation results | ✅ |
| 13 | Comments | Show anonymous written feedback | ✅ |

### Original core scope status

```text
13 / 13 core backend features completed ✅
```

---

## 2.2 Additional Backend Enhancements

After completing the original scope, the backend was extended with additional academic management, results, workflow, and testing improvements.

### Academic Years

Academic years are now managed as their own database resource.

This allows semesters to reference an academic year using a proper relation instead of storing only a text value.

```text
Academic Year
     │
     └── Semesters
```

Status:

```text
Academic Years CRUD ✅
Semester → Academic Year relation ✅
```

---

### Departments

Departments are now managed as a separate resource.

Departments can be connected to courses and users.

```text
Department
   │
   ├── Courses
   │
   └── Users
```

Status:

```text
Departments CRUD ✅
Course → Department relation ✅
User ↔ Department assignment ✅
```

---

### User Department Assignment

Users can be associated with departments.

Supported operations include:

```text
GET    /api/users/:id/departments
POST   /api/users/:id/departments
DELETE /api/users/:id/departments/:departmentId
```

---

### Question Ordering

Question ordering was improved.

Questions can now be:

- inserted at a specific position;
- shifted automatically when a new question is inserted;
- deleted while keeping the remaining order continuous;
- reordered explicitly.

Example:

```text
Before:

1. Question A
2. Question B
3. Question C
```

Insert a new question at position `2`:

```text
After:

1. Question A
2. New Question
3. Question B
4. Question C
```

A dedicated reorder API is also supported:

```text
PUT /api/survey-versions/:versionId/questions/reorder
```

---

### Survey Version Copy Improvements

Survey version copying supports copying the question structure into a new version.

This allows an existing survey to evolve without modifying a version already being used by an evaluation.

---

### Student Evaluation History

Students can view their evaluation history.

The history can represent states such as:

```text
Completed
Upcoming
Not Started
Closed
```

This allows the frontend to distinguish current, future, completed, and unavailable evaluations.

---

### Results APIs

Additional results APIs are available for Admin and Lecturer workflows.

Examples:

```text
GET /api/admin/results
GET /api/admin/results/:lecturerId
GET /api/lecturer/results
```

These complement the lecturer evaluation dashboard and comments APIs.

---

### CORS Configuration

The backend supports configurable frontend origins through:

```env
FRONTEND_ORIGIN=http://localhost:5173
```

Multiple origins can be configured using comma-separated values.

This allows the frontend and backend to run on different origins while controlling which frontend applications can access the API.

---

### Automated Testing Improvements

The testing environment was updated for the current NestJS/Jest module setup.

Current testing configuration includes:

```text
Jest
ts-jest
Supertest
ESM-compatible test configuration
Dedicated tsconfig.spec.json
Unit tests
E2E tests
Full integration workflow test
```

Current verified E2E result:

```text
16 / 16 E2E test suites passed
303 / 303 E2E tests passed
```

---

# 3. Technology Stack

| Area | Technology |
|---|---|
| Backend Framework | NestJS |
| Language | TypeScript |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JWT + Passport |
| Password Hashing | bcrypt |
| Validation | class-validator + class-transformer |
| API Documentation | Swagger |
| Unit Testing | Jest + ts-jest |
| API / E2E Testing | Jest + Supertest |
| Database Testing | Prisma + PostgreSQL |

Swagger is available at:

```text
http://localhost:3000/api/docs
```

The API base path is:

```text
/api
```

---

# 4. Roles and Permissions

## ADMIN

The Admin prepares and controls the teaching evaluation process.

Admin responsibilities include:

- managing users;
- managing academic years;
- managing departments;
- assigning users to departments;
- managing courses;
- managing semesters;
- creating course offerings;
- enrolling students;
- creating surveys;
- creating survey versions;
- creating and managing questions;
- reordering questions;
- creating evaluations;
- scheduling evaluations;
- opening evaluations;
- closing evaluations;
- viewing administrative results.

---

## STUDENT

The Student participates in evaluations.

Students can:

- see evaluations they are eligible to answer;
- view evaluation surveys;
- check submission status;
- submit one anonymous response;
- view evaluation history.

A student cannot submit when:

- they are not eligible;
- they are not enrolled;
- the evaluation is not open;
- the evaluation is outside its allowed time period;
- they have already submitted.

---

## LECTURER

Lecturers can view evaluation information and results for their own course offerings.

Lecturers can:

- see their own evaluations;
- view aggregate results after an evaluation is closed;
- view rating statistics;
- view anonymous written comments;
- access lecturer results APIs.

Lecturers do not receive student identities with evaluation responses.

---

# 5. Main Evaluation Workflow

## Step 1 — Admin prepares academic data

The Admin prepares the academic structure:

```text
Academic Year
      │
      ▼
Semester

Department
      │
      ▼
Course

Users
      │
      ▼
Course Offering
      │
      ▼
Enrollments
```

A course offering connects:

```text
Course
   +
Semester
   +
Lecturer
   +
Section
```

---

## Step 2 — Admin prepares the survey

```text
Survey
   ↓
Survey Version
   ↓
Questions
```

Questions can then be ordered according to the survey structure.

The system supports question types such as:

```text
RATING
TEXT
```

A RATING question uses a numeric range, normally 1–5.

A TEXT question accepts written feedback.

Survey versions allow the question set to evolve without modifying a version already being used by an evaluation.

---

## Step 3 — Admin creates an evaluation

An evaluation connects:

```text
Course Offering
       +
Survey Version
       +
Schedule
```

A new evaluation starts as:

```text
DRAFT
```

While it is DRAFT, its configuration and schedule can still be prepared.

---

## Step 4 — Admin opens the evaluation

Before opening an evaluation, the backend verifies that the evaluation is ready.

When the evaluation opens, important state changes occur together:

```text
Evaluation → OPEN

Survey Version → LOCKED

Enrolled Students
        ↓
Evaluation Participants
```

Locking the survey version prevents questions from being changed after the evaluation has started.

---

## Step 5 — Student accesses the evaluation

A student can access an evaluation only when the backend confirms their eligibility.

The backend checks conditions such as:

```text
Student authenticated?
        ↓
Student role?
        ↓
Enrolled?
        ↓
Evaluation participant?
        ↓
Evaluation OPEN?
        ↓
Inside evaluation period?
        ↓
Already submitted?
```

Only an eligible student can continue to submission.

---

## Step 6 — Student submits

Before saving the response, the backend validates the answers.

Checks include:

- the question belongs to the correct survey version;
- the same question is not answered twice;
- required questions are answered;
- rating values are within the allowed range;
- TEXT answers are used only for TEXT questions;
- the student has not already submitted.

Submission is protected against duplicate and simultaneous submissions.

---

## Step 7 — Admin closes the evaluation

Evaluation state changes from:

```text
OPEN
 ↓
CLOSED
```

After closing, new responses are no longer accepted.

---

## Step 8 — Lecturer views results

Only after the evaluation is CLOSED can its lecturer view the protected evaluation results.

The lecturer dashboard can provide:

- eligible student count;
- response count;
- response rate;
- overall rating average;
- average per rating question;
- rating distribution;
- anonymous written comments.

Example:

```text
Eligible Students: 30
Responses:         27
Response Rate:     90%

Overall Average:   4.2 / 5
```

---

# 6. Privacy and Anonymity

Student anonymity is an important part of the backend design.

The system does **not** store the student's identity directly on the response or answer records.

Conceptually:

```text
Student
   │
   ├── Eligibility checked
   │      through participant data
   │
   └── Submit
          │
          ▼
       Response
          │
          ▼
        Answers

Response / Answer
      ✕ no student_id
      ✕ no participant_id
```

Additional protections include:

- lecturers can access only their own evaluations;
- lecturer results are available only after the evaluation is closed;
- lecturers receive aggregate statistics instead of student-level results;
- written comments are returned without student identity;
- comments can be sorted rather than returned in submission order;
- participant and response timestamps use reduced precision where appropriate to reduce identity matching risk;
- `password_hash` is excluded from API responses.

---

# 7. Important Business Rules

| Rule | Behaviour |
|---|---|
| Student eligibility | Student must be enrolled and an evaluation participant |
| Submit once | One submission per student per evaluation |
| Evaluation period | Submission is accepted only while evaluation is OPEN and within its time window |
| Question locking | Questions cannot be changed after the evaluation opens |
| Question ordering | Question positions must remain valid and continuous |
| Rating validation | Rating must be within the configured range |
| Lecturer ownership | Lecturer can access only evaluations belonging to their own offering |
| Lecturer result access | Protected lecturer results are available after the evaluation is CLOSED |
| Anonymous responses | Responses and answers contain no student identity |
| Admin control | Management operations are restricted to ADMIN where required |
| Closed evaluation | No new submissions are accepted |
| Course department | Courses belong to departments |
| Semester academic year | Semesters reference academic years |

---

# 8. Project Structure

The backend follows the NestJS modular structure.

```text
teacher-evaluation-api/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── src/
│   │
│   ├── main.ts
│   ├── app.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   │
│   ├── prisma/
│   │
│   ├── common/
│   │   ├── decorators/
│   │   ├── guards/
│   │   └── pipes/
│   │
│   ├── auth/
│   ├── users/
│   ├── academic-years/
│   ├── departments/
│   ├── courses/
│   ├── semesters/
│   ├── course-offerings/
│   ├── enrollments/
│   ├── surveys/
│   ├── survey-versions/
│   ├── questions/
│   ├── evaluations/
│   ├── student-access/
│   ├── submissions/
│   ├── lecturer-dashboard/
│   ├── comments/
│   └── results/
│
├── test/
│   ├── jest-e2e.json
│   ├── app.e2e-spec.ts
│   ├── assessment-drafts.e2e-spec.ts
│   ├── comments.e2e-spec.ts
│   ├── course-offerings.e2e-spec.ts
│   ├── enrollments.e2e-spec.ts
│   ├── evaluations.e2e-spec.ts
│   ├── integration.e2e-spec.ts
│   ├── lecturer-dashboard.e2e-spec.ts
│   ├── questions.e2e-spec.ts
│   ├── questions-reorder.e2e-spec.ts
│   ├── semesters.e2e-spec.ts
│   ├── student-access.e2e-spec.ts
│   ├── submissions.e2e-spec.ts
│   ├── survey-versions.e2e-spec.ts
│   ├── surveys.e2e-spec.ts
│   └── users.e2e-spec.ts
│
├── jest.config.ts
├── tsconfig.json
├── tsconfig.spec.json
├── package.json
└── README.md
```

Each NestJS feature generally contains:

```text
feature/
│
├── feature.module.ts
├── feature.controller.ts
├── feature.service.ts
└── dto/
```

### Controller

The controller handles HTTP routes.

```text
HTTP Request
     ↓
Controller
```

### DTO

DTOs validate incoming request data.

```text
Request Body
     ↓
DTO Validation
```

### Service

Services contain business logic and Prisma operations.

```text
Controller
    ↓
Service
    ↓
Prisma
    ↓
PostgreSQL
```

---

# 9. Main API Endpoints

Swagger should be used as the complete API reference.

The endpoints below summarize the main backend areas.

## Authentication

```text
POST /api/auth/login
GET  /api/auth/me
GET  /api/health
```

---

## Academic Years

```text
GET    /api/academic-years
GET    /api/academic-years/:id
POST   /api/academic-years
PUT    /api/academic-years/:id
DELETE /api/academic-years/:id
```

---

## Departments

```text
GET    /api/departments
GET    /api/departments/:id
POST   /api/departments
PUT    /api/departments/:id
DELETE /api/departments/:id
```

---

## Users

```text
GET  /api/users
GET  /api/users/:id
POST /api/users
PUT  /api/users/:id
```

Users are deactivated instead of being permanently removed where the current implementation requires that behaviour.

### User Departments

```text
GET    /api/users/:id/departments
POST   /api/users/:id/departments
DELETE /api/users/:id/departments/:departmentId
```

---

## Courses

```text
GET    /api/courses
POST   /api/courses
PUT    /api/courses/:id
DELETE /api/courses/:id
```

Courses are associated with departments.

---

## Semesters

```text
GET    /api/semesters
POST   /api/semesters
PUT    /api/semesters/:id
DELETE /api/semesters/:id
```

Semesters reference academic years.

---

## Course Offerings

```text
GET    /api/course-offerings
POST   /api/course-offerings
PUT    /api/course-offerings/:id
DELETE /api/course-offerings/:id
```

---

## Enrollments

```text
GET    /api/course-offerings/:offeringId/enrollments
POST   /api/course-offerings/:offeringId/enrollments
DELETE /api/course-offerings/:offeringId/enrollments/:studentId
```

---

## Surveys

```text
GET    /api/surveys
GET    /api/surveys/:id
POST   /api/surveys
PUT    /api/surveys/:id
DELETE /api/surveys/:id
```

---

## Survey Versions

```text
GET    /api/surveys/:surveyId/versions
POST   /api/surveys/:surveyId/versions
GET    /api/surveys/:surveyId/versions/:versionId
POST   /api/surveys/:surveyId/versions/:versionId/archive
DELETE /api/surveys/:surveyId/versions/:versionId
```

---

## Questions

```text
GET    /api/survey-versions/:versionId/questions
POST   /api/survey-versions/:versionId/questions
PUT    /api/questions/:questionId
DELETE /api/questions/:questionId
```

Question reordering:

```text
PUT /api/survey-versions/:versionId/questions/reorder
```

---

## Evaluations

```text
GET    /api/evaluations
GET    /api/evaluations/:id
POST   /api/evaluations
PUT    /api/evaluations/:id/schedule
POST   /api/evaluations/:id/open
POST   /api/evaluations/:id/close
DELETE /api/evaluations/:id
```

---

## Student

```text
GET  /api/student/evaluations
GET  /api/student/evaluations/:id/survey
GET  /api/student/evaluations/:id/submission-status
POST /api/student/evaluations/:id/responses
```

The backend also supports student evaluation history.

---

## Lecturer

```text
GET /api/lecturer/evaluations
GET /api/lecturer/evaluations/:id/dashboard
GET /api/lecturer/evaluations/:id/comments
GET /api/lecturer/results
```

---

## Admin Results

```text
GET /api/admin/results
GET /api/admin/results/:lecturerId
```

---

# 10. API Conventions

The backend follows these conventions:

- Base path: `/api`
- Authentication: `Authorization: Bearer <JWT>`
- PostgreSQL IDs use `BigInt`
- IDs are serialized safely for JSON
- Database/API fields generally use `snake_case`
- The authenticated user is obtained from the JWT
- Request bodies are validated using DTOs
- Unknown request fields are removed by the global validation pipe
- Role-based access is enforced using guards

Example authenticated request:

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Common HTTP status codes:

| Code | Meaning |
|---|---|
| 200 | Successful request |
| 201 | Resource created / response submitted |
| 204 | Successful delete with no response body |
| 400 | Invalid request data |
| 401 | Missing or invalid authentication |
| 403 | User does not have permission |
| 404 | Resource does not exist |
| 409 | Request conflicts with current state |

---

# 11. Swagger Documentation

Swagger provides interactive API documentation.

Start the backend:

```bash
npm run start:dev
```

Then open:

```text
http://localhost:3000/api/docs
```

Swagger can be used to:

- view endpoints;
- view DTO request structures;
- understand required fields;
- inspect response structures;
- test authentication;
- manually send requests;
- inspect HTTP status codes.

Swagger is useful for **manual API testing**, while Jest and Supertest are used for **automated testing**.

```text
Swagger
   ↓
Manual testing

Jest + Supertest
   ↓
Automated testing
```

---

# 12. Backend Testing

Testing is an important part of this backend.

The purpose of testing is to verify automatically that the backend behaves according to its expected rules.

Without automated tests, developers may need to repeatedly test every endpoint manually after making changes.

With automated testing:

```text
Change Backend Code
        ↓
Run Tests
        ↓
Do Tests Pass?
    ↙       ↘
  YES        NO
   ↓          ↓
Continue    Investigate
   ↓          ↓
Commit      Fix Problem
```

Tests act as a **safety net** when the backend changes.

---

## 12.1 What Is a Test?

A test normally has three basic ideas:

```text
Arrange
   ↓
Act
   ↓
Assert
```

### Arrange

Prepare the required data.

### Act

Run the code or send the API request.

### Assert

Check whether the actual result matches the expected result.

Example:

```ts
const response = await request(app.getHttpServer())
  .post('/api/auth/login')
  .send({
    email: 'admin@itc.edu.kh',
    password: 'Password123',
  });

expect(response.status).toBe(200);
```

The important part is:

```ts
expect(response.status).toBe(200);
```

It means:

```text
Expected = 200
Actual   = 200

PASS ✅
```

If the API unexpectedly returns:

```text
Expected = 200
Actual   = 401

FAIL ❌
```

The failed test tells the developer that something needs investigation.

---

## 12.2 Why Is Testing Important?

Backend features are connected.

For example:

```text
Department
   ↓
Course
   ↓
Course Offering
   ↓
Enrollment
   ↓
Evaluation
   ↓
Submission
   ↓
Results
```

Changing one part can accidentally affect another.

For example, Course creation now requires a department relation.

If old code sends:

```json
{
  "course_code": "AMS101",
  "course_name": "Mathematics"
}
```

but the current API requires:

```json
{
  "course_code": "AMS101",
  "course_name": "Mathematics",
  "department_id": 1
}
```

a test can detect the changed behaviour immediately.

This is especially important when several developers work on the same backend.

Testing helps the team:

- detect regressions;
- verify business rules;
- verify authentication;
- verify authorization;
- verify validation;
- verify database relationships;
- safely refactor code;
- understand expected behaviour;
- verify complete workflows;
- reduce repetitive manual testing.

---

## 12.3 Main Types of Backend Testing

There are many forms of software testing.

The most important categories for understanding this backend are:

| Type | Purpose |
|---|---|
| Unit Testing | Test one small part in isolation |
| Integration Testing | Test multiple parts working together |
| E2E Testing | Test the application/API from end to end |
| Validation Testing | Check invalid/valid request data |
| Authentication Testing | Check login/token behaviour |
| Authorization Testing | Check role/resource permissions |
| Database Testing | Check persistence, relations, and constraints |
| Performance Testing | Check behaviour under load |
| Security Testing | Check security-related weaknesses |

The current automated test suite focuses mainly on:

```text
Unit Testing
     +
E2E / API Testing
     +
Integration Workflow Testing
```

---

# 12.4 Unit Testing

A **Unit Test** checks a small part of the application independently.

Examples include:

```text
AcademicYearsService

AcademicYearsController

DepartmentsService

DepartmentsController

ResultsService

ResultsController

AppController
```

A unit test should focus on the behaviour of that specific component.

Conceptually:

```text
        Unit Test
            │
            ▼
      ResultsService
            │
            ▼
       Mock Prisma
```

The real database does not need to be involved in every unit test.

---

## 12.5 What Is Mocking?

A **mock** is a controlled fake replacement for a dependency.

For example, a service may normally use:

```text
ResultsService
     ↓
PrismaService
     ↓
PostgreSQL
```

For a unit test, Prisma can be replaced by a mock:

```text
ResultsService
     ↓
Mock PrismaService
```

Example concept:

```ts
const prismaMock = {
  users: {
    count: jest.fn<() => Promise<number>>(),
  },
};
```

Then the test can define what the fake database call should return.

For example:

```ts
prismaMock.users.count.mockResolvedValue(10);
```

This makes the unit test:

- faster;
- more isolated;
- easier to control;
- independent from database state.

---

## 12.6 E2E Testing

**E2E** means **End-to-End**.

An E2E test checks a much larger part of the real application.

Conceptually:

```text
Supertest
    ↓
HTTP Request
    ↓
NestJS Controller
    ↓
ValidationPipe
    ↓
Authentication / Guards
    ↓
Service
    ↓
Prisma
    ↓
PostgreSQL
    ↓
HTTP Response
    ↓
Jest Assertion
```

This is much closer to what happens when the frontend communicates with the backend.

Example:

```ts
const response = await request(app.getHttpServer())
  .post('/api/courses')
  .set(
    'Authorization',
    `Bearer ${adminToken}`,
  )
  .send({
    course_code: 'AMS101',
    course_name: 'Mathematics',
    department_id: 1,
  });

expect(response.status).toBe(201);
```

This can verify:

```text
Route exists?               ✅
Authentication works?       ✅
Admin permission works?     ✅
DTO validation works?       ✅
Service works?              ✅
Prisma operation works?     ✅
Database accepts data?      ✅
Correct status returned?    ✅
```

---

## 12.7 Integration Testing

Integration testing verifies that several backend features work together correctly.

This project contains a full workflow test:

```text
test/integration.e2e-spec.ts
```

The integration story verifies:

```text
ADMIN
  │
  ├── Login
  ├── Create Lecturer
  ├── Create Students
  ├── Create Course
  ├── Create Semester
  ├── Create Course Offering
  ├── Enroll Students
  ├── Create Survey
  ├── Create Survey Version
  ├── Create Questions
  ├── Create Evaluation
  └── Open Evaluation
             │
             ▼
          STUDENT A
             │
             ├── Login
             ├── View Evaluation
             ├── Read Questions
             └── Submit
             │
             ▼
          STUDENT B
             │
             ├── Login
             └── Submit
             │
             ▼
            ADMIN
             │
             └── Close Evaluation
                       │
                       ▼
                   LECTURER
                       │
                       ├── Login
                       ├── View Evaluation
                       ├── View Dashboard
                       └── View Anonymous Comments
```

The current integration flow contains:

```text
16 tests
```

Latest verified result:

```text
PASS test/integration.e2e-spec.ts

Test Suites: 1 passed, 1 total
Tests:       16 passed, 16 total
```

---

## 12.8 Unit vs Integration vs E2E

An easy way to remember the difference is:

```text
UNIT TEST

"Does this one part work?"

Example:
ResultsService
     ↓
Mock Prisma
```

```text
INTEGRATION TEST

"Do these parts work together?"

Example:
Evaluation
    +
Submission
    +
Results
```

```text
E2E TEST

"Does the real API flow work?"

HTTP Request
     ↓
Controller
     ↓
Service
     ↓
Prisma
     ↓
Database
     ↓
HTTP Response
```

In simple terms:

| Test | Question |
|---|---|
| Unit | Does this small piece work? |
| Integration | Do these pieces work together? |
| E2E | Does the application workflow work from beginning to end? |

---

# 12.9 Testing Tools

## Jest

Jest is the main **test runner and assertion framework**.

It executes tests containing:

```ts
describe(...)
it(...)
expect(...)
```

Example:

```ts
expect(response.status).toBe(201);
```

Jest reports:

```text
PASS ✅
```

or:

```text
FAIL ❌
```

---

## ts-jest

The backend and tests are written in TypeScript.

`ts-jest` allows Jest to execute TypeScript test files.

The project contains dedicated test TypeScript configuration:

```text
tsconfig.spec.json
```

---

## Supertest

Supertest is used to send HTTP requests directly to the NestJS application during API tests.

Instead of manually clicking Swagger:

```text
Swagger
   ↓
POST /api/auth/login
   ↓
Execute
```

Supertest can automate the same process:

```ts
await request(app.getHttpServer())
  .post('/api/auth/login')
  .send(...);
```

---

## Prisma / PostgreSQL

E2E tests can interact with the actual backend database layer.

This allows the test suite to verify behaviours such as:

- creation;
- updates;
- deletion;
- relationships;
- enrollment;
- evaluation participants;
- submissions;
- result calculations.

---

# 12.10 Current Unit Tests

Current unit-test files cover important application components including:

```text
Academic Years
Departments
Results
App Controller
```

Current verified unit-test result:

```text
Test Suites: 7 passed
Tests:       8 passed
```

---

# 12.11 Current E2E Test Suites

The project currently contains **16 E2E test suites**:

```text
test/
│
├── app.e2e-spec.ts
├── assessment-drafts.e2e-spec.ts
├── comments.e2e-spec.ts
├── course-offerings.e2e-spec.ts
├── enrollments.e2e-spec.ts
├── evaluations.e2e-spec.ts
├── integration.e2e-spec.ts
├── lecturer-dashboard.e2e-spec.ts
├── questions.e2e-spec.ts
├── questions-reorder.e2e-spec.ts
├── semesters.e2e-spec.ts
├── student-access.e2e-spec.ts
├── submissions.e2e-spec.ts
├── survey-versions.e2e-spec.ts
├── surveys.e2e-spec.ts
└── users.e2e-spec.ts
```

These tests cover major areas such as:

- authentication;
- authorization;
- courses;
- semesters;
- course offerings;
- enrollments;
- surveys;
- survey versions;
- questions;
- question ordering;
- evaluation lifecycle;
- assessment drafts;
- student access;
- submissions;
- lecturer dashboard;
- anonymous comments;
- complete Admin → Student → Lecturer workflow.

---

# 12.12 Current Verified Test Status

## Unit Tests

```text
Test Suites: 7 passed
Tests:       8 passed
```

## E2E Tests

Latest full verified E2E run:

```text
Test Suites: 16 passed, 16 total
Tests:       303 passed, 303 total
Snapshots:   0 total
```

Therefore:

```text
Unit Tests
────────────────────────
7 test suites passed
8 tests passed
              ✅

E2E Tests
────────────────────────
16 test suites passed
303 tests passed
              ✅
```

---

# 12.13 How to Run Tests

## Run Unit Tests

```bash
npm test
```

---

## Run E2E Tests

```bash
npm run test:e2e
```

---

## Run Test Coverage

```bash
npm run test:cov
```

---

## Run Tests in Watch Mode

```bash
npm run test:watch
```

---

## Run One E2E Test File

For example:

```bash
npm run test:e2e -- test/integration.e2e-spec.ts
```

Or:

```bash
npm run test:e2e -- test/questions.e2e-spec.ts
```

This is useful when developing or debugging one feature.

---

# 12.14 Recommended Development Testing Workflow

When changing the backend, the recommended workflow is:

```text
1. Modify Code
      ↓
2. Run relevant test
      ↓
3. Fix failures
      ↓
4. Run complete unit tests
      ↓
5. Run complete E2E tests
      ↓
6. Run build
      ↓
7. Review Git changes
      ↓
8. Commit
      ↓
9. Push
```

Example commands:

```bash
npm test
npm run test:e2e
npm run build
git status
```

Before pushing important backend changes, the goal is:

```text
Unit tests   → PASS ✅
E2E tests    → PASS ✅
Build        → PASS ✅
```

---

# 12.15 Why Both Swagger and Automated Tests Are Needed

Swagger and automated tests have different purposes.

## Swagger

Useful for:

- exploring APIs;
- manually trying endpoints;
- viewing DTO fields;
- checking responses during development;
- demonstrating the backend.

## Automated Tests

Useful for:

- repeating checks automatically;
- detecting regressions;
- checking many scenarios quickly;
- verifying business rules;
- supporting team collaboration;
- validating changes before commits.

Therefore:

```text
Swagger
   ↓
Manual verification

        +

Jest / Supertest
   ↓
Automated verification

        =

More reliable backend development
```

---

# 13. Setup and Run

## 13.1 Clone the Repository

```bash
git clone <repository-url>
cd teacher-evaluation-api
```

---

## 13.2 Install Dependencies

```bash
npm install
```

---

## 13.3 Configure Environment Variables

Create or configure the project's `.env`.

Important environment variables include database configuration, JWT configuration, and frontend origin configuration.

Example:

```env
DATABASE_URL="postgresql://..."
JWT_SECRET="..."
FRONTEND_ORIGIN=http://localhost:5173
```

Use the actual project environment values provided by the team.

Do not commit private production secrets.

---

## 13.4 Generate Prisma Client

```bash
npx prisma generate
```

This is important after:

- installing dependencies;
- changing `schema.prisma`;
- changing Prisma Client configuration.

---

## 13.5 Run Prisma Migrations

```bash
npx prisma migrate dev
```

This applies the project's database migrations.

---

## 13.6 Seed the Database

If a fresh development database requires seed data:

```bash
npx prisma db seed
```

---

## 13.7 Start the Backend

```bash
npm run start:dev
```

API:

```text
http://localhost:3000/api
```

Swagger:

```text
http://localhost:3000/api/docs
```

---

## 13.8 Verify the Project

After setup, a teammate should verify:

```bash
npm test
```

Then:

```bash
npm run test:e2e
```

Then:

```bash
npm run build
```

Expected verified test baseline:

```text
Unit:
7 suites / 8 tests passing

E2E:
16 suites / 303 tests passing
```

---

# 14. Seed Accounts

The current development seed uses test accounts for local development and testing.

Seed password:

```text
Password123
```

Example accounts:

| Role | Account |
|---|---|
| ADMIN | `admin@itc.edu.kh` |
| LECTURER | `sokdara@itc.edu.kh` |
| LECTURER | `chanthy@itc.edu.kh` |
| STUDENT | `student1@itc.edu.kh` through `student5@itc.edu.kh` |

These accounts are intended for local development/testing.

---

# 15. Known Limitations / Future Improvements

The current backend is complete for the implemented project scope, but several areas can be improved in future development.

Potential improvements include:

1. Add machine-readable application error codes.
2. Improve JWT invalidation after password/security changes.
3. Add pagination to large list endpoints.
4. Add additional production security configuration such as Helmet.
5. Add login rate limiting.
6. Strengthen production CORS configuration as deployment environments are finalized.
7. Add or verify database-level `CHECK` constraints for rules currently enforced by services.
8. Improve seed data consistency and evaluation windows.
9. Normalize login email before lookup where required.
10. Review long-term behaviour when enrollment changes after an evaluation has already opened.
11. Expand unit-test coverage across more services.
12. Add automated test coverage reporting targets.
13. Add performance/load testing if the system is prepared for larger deployment.
14. Add additional security testing before production deployment.
15. Add CI/CD test execution so tests run automatically on pull requests.

---

# 16. Differences From the Original Proposal

During implementation, several technical choices changed to match the actual project architecture.

| Original Proposal | Current Implementation |
|---|---|
| TypeORM | Prisma |
| UUID IDs | BigInt auto-increment IDs |
| `/api/v1/admin/...` | `/api/...` |
| PATCH updates | Current project uses PUT for applicable update endpoints |
| argon2 | bcrypt |
| Application error codes | Standard NestJS errors/messages |
| Enrollment status | Enrollment row can be removed |
| `first_name` + `last_name` | `full_name` |

These are implementation decisions and do not mean the corresponding backend feature is unfinished.

---

# 17. Final Backend Status

## Original Scope

```text
13 / 13 original core backend features implemented ✅
```

## Additional Work

```text
Academic Years                         ✅
Departments                            ✅
User ↔ Department assignment           ✅
Course → Department relation           ✅
Semester → Academic Year relation      ✅
Question insertion/order improvements  ✅
Question reorder API                   ✅
Survey version improvements            ✅
Student evaluation history             ✅
Admin results APIs                     ✅
Lecturer results API                   ✅
CORS configuration                     ✅
Testing configuration improvements     ✅
```

## Verification

```text
Core backend implementation            ✅
Manual Swagger verification            ✅
Swagger API documentation               ✅
Prisma Client generation                ✅
NestJS production build                 ✅

Unit test suites:
7 passed                                ✅

Unit tests:
8 passed                                ✅

E2E test suites:
16 / 16 passed                          ✅

E2E tests:
303 / 303 passed                        ✅

Full integration workflow:
16 / 16 passed                          ✅
```

The current backend supports the complete teaching evaluation lifecycle:

```text
ADMIN
prepares academic structure
        ↓
ADMIN
creates survey and evaluation
        ↓
ADMIN
opens evaluation
        ↓
STUDENTS
submit anonymous evaluations
        ↓
ADMIN
closes evaluation
        ↓
LECTURER
views aggregate results
        +
anonymous comments
```

---

# Quick Start for Teammates

For a teammate joining the backend project:

```bash
# 1. Install dependencies
npm install

# 2. Generate Prisma Client
npx prisma generate

# 3. Apply migrations
npx prisma migrate dev

# 4. Start backend
npm run start:dev
```

Open Swagger:

```text
http://localhost:3000/api/docs
```

Then verify tests:

```bash
npm test
npm run test:e2e
npm run build
```

Current expected testing baseline:

```text
Unit Tests:
7 suites / 8 tests passed

E2E Tests:
16 suites / 303 tests passed
```

If these tests pass, the teammate's environment is consistent with the current verified backend state.

---

# Summary

The backend currently provides:

- academic year management;
- department management;
- user and department relationships;
- course management;
- semester management;
- course offerings;
- student enrollments;
- survey management;
- survey versioning;
- question management and ordering;
- evaluation lifecycle management;
- anonymous student submission;
- student evaluation access/history;
- lecturer dashboards;
- anonymous comments;
- administrative and lecturer results;
- JWT authentication;
- role-based authorization;
- Swagger documentation;
- unit testing;
- E2E testing;
- integration workflow testing.

The project has moved beyond the original 13-feature scope while preserving the complete core teaching evaluation workflow.

Current verified automated testing state:

```text
Unit: 7 suites / 8 tests      ✅
E2E:  16 suites / 303 tests  ✅
```

This README should be updated whenever the database schema, API contracts, major features, or verified test baseline changes.
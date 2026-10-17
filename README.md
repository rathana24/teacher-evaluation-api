# Teacher Evaluation API

Backend for ITC's lecturer evaluation system. Administrators prepare the academic structure (years, semesters, departments, majors, student cohorts, courses and teaching assignments) and versioned question sets. Students answer the evaluations assigned to them inside a response window. Lecturers see their own results once an evaluation is closed, with no student names or IDs.

Built with **NestJS 12**, **Prisma 6** and **PostgreSQL**.

## Requirements

- Node.js 20.12 or newer (developed on Node 24)
- PostgreSQL 14 or newer (developed on PostgreSQL 18)

## Getting started

```bash
npm ci
cp .env.example .env          # then set DB credentials and a long random JWT_SECRET
```

Create an empty database named `teacher_evaluation`, then apply the migrations:

```bash
npx prisma migrate deploy
```

Create the first administrator (interactive, hidden password prompt):

```bash
npm run admin:bootstrap
```

The command only works on an empty installation and refuses to run if any account or school data already exists. For a local demo you can instead load sample data with `npx prisma db seed`; every sample account uses the password `Password123`, so never seed a real installation.

Run the API:

```bash
npm run start:dev             # http://localhost:3000/api
```

- Swagger documentation: `http://localhost:3000/api/docs`
- Health check: `GET /api/health`

## Configuration

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection URL used by Prisma |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | yes | Same connection as separate values |
| `JWT_SECRET` | yes | Long random secret for signing access tokens |
| `JWT_EXPIRES_IN` | no | Token lifetime, default `1d` |
| `PORT` | no | HTTP port, default `3000` |
| `FRONTEND_ORIGIN` | no | Allowed browser origins (comma-separated), default `http://localhost:5173` |
| `REQUIRE_REVIEWED_CONFIRMATION` | no | `true` rejects legacy writes that skip the preview/confirm review. Keep `false` until the frontend sends `review_id` everywhere |
| `REQUIRE_MAJOR_SCOPED_COHORTS` | no | `true` requires major-owned cohorts for new cohort writes. Enable only after legacy cohorts are mapped to majors |

## Databases

The application uses **one** database, `teacher_evaluation`, configured in `.env`.

The end-to-end tests use a separate database, `teacher_evaluation_test`, configured in `.env.test.local`. The tests delete and recreate their data on every run, so the test runner refuses to start against any other database name. The application itself never connects to the test database.

## Testing

```bash
npm test                      # unit tests, no database needed
npm run lint
npm run build
```

End-to-end API tests:

```bash
cp .env.test.example .env.test.local   # point it at teacher_evaluation_test
npm run test:e2e:migrate
npm run test:e2e:seed
npm run test:e2e
```

## Project structure

```
prisma/
  schema.prisma         data model
  migrations/           SQL migrations (apply with prisma migrate deploy)
  seed.ts               sample demo data
scripts/                operator commands (first admin, read-only preflights)
src/
  auth/                 login, JWT, /auth/me with capability flags, login rate limit
  common/               guards, decorators, pipes and shared utilities
  academic-years/ semesters/ departments/ majors/ courses/
  student-generations/ students/ student-academic-records/
  course-year-rules/ course-offerings/ enrollments/
  surveys/ survey-versions/ questions/
  evaluations/ reviewed-workflows/ submissions/ assessment-drafts/
  student-access/ results/ lecturer-dashboard/ comments/ users/
test/                   end-to-end tests and fixtures
```

## Design principles

- **Preview, then confirm.** Risky writes (evaluation creation, enrollment, group changes, assignment creation, bulk evaluations) first return a preview with a `review_id` and the exact affected students. The confirmation rechecks everything in one serializable transaction and either fully succeeds or changes nothing.
- **Safe retries.** Year setup and course creation accept an `Idempotency-Key` header, and reviewed operations store receipts, so repeating a request after a lost response returns the original result instead of creating duplicates.
- **History is frozen.** Participants, their placements, target labels and the question version are captured when an evaluation is created. Later changes to students or curricula never rewrite past results.
- **Anonymous answers.** Responses are stored without a student ID. Lecturer reports, comments and exports omit student identities and are available only for the lecturer's own CLOSED evaluations.
- **Capability flags.** `/auth/me` advertises a feature (for example `bulk_evaluations_v1`) only when the connected database schema supports it.
- **Predictable errors.** Invalid input returns 400 with a message, and prerequisite failures add a stable `code` (for example `OFFERING_CURRICULUM_APPROVAL_REQUIRED`). Malformed or out-of-range IDs are rejected before reaching the database.

## Security

- Passwords are hashed with bcrypt. Changing a password or disabling an account revokes existing tokens.
- Login allows 5 failed attempts per identifier and IP address within 15 minutes, then returns 429. A successful login resets the count. The count is kept in memory, so it resets when the API restarts.
- Only administrators change school data. Lecturers see results only for their own closed evaluations. Students see only the evaluations assigned to them. Reference lists (years, semesters, departments, majors, courses, cohorts and teaching assignments) are readable by any signed-in user.

## Operator scripts

| Command | Purpose |
| --- | --- |
| `npm run admin:bootstrap` | Create the first administrator on an empty installation (`--stdin` for a piped JSON input) |
| `npm run setup:first-admin` | Older non-interactive variant: reads `{ full_name, email, password }` JSON from stdin |
| `node scripts/alignment-preflight.cjs` | Read-only report of legacy duplicates, course-code collisions and unmapped cohorts in the `.env` database |
| `npm run cohorts:preflight` | Read-only cohort audit, test database only |

## API reference

Every endpoint, request body, response shape and error is documented in Swagger at `/api/docs` while the API is running.

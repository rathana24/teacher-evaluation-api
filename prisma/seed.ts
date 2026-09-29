import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const now = new Date();

async function main() {
  const password = await bcrypt.hash('Password123', 10);

  // ---------- ACADEMIC YEAR ----------
  const academicYear = await prisma.academic_years.create({
    data: {
      name: '2025-2026',
      start_date: new Date('2025-10-01'),
      end_date: new Date('2026-07-31'),
      is_active: true,
      created_at: now,
      updated_at: now,
    },
  });

  // ---------- DEPARTMENT ----------
  const department = await prisma.departments.create({
    data: {
      code: 'AMS',
      name: 'Applied Mathematics and Statistics',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    },
  });

  // ---------- USERS ----------
  const admin = await prisma.users.create({
    data: {
      email: 'admin@itc.edu.kh',
      password_hash: password,
      full_name: 'System Admin',
      role: 'ADMIN',
      created_at: now,
      updated_at: now,
    },
  });

  const lecturer1 = await prisma.users.create({
    data: {
      email: 'sokdara@itc.edu.kh',
      password_hash: password,
      full_name: 'Sok Dara',
      role: 'LECTURER',
      created_at: now,
      updated_at: now,
    },
  });

  const lecturer2 = await prisma.users.create({
    data: {
      email: 'chanthy@itc.edu.kh',
      password_hash: password,
      full_name: 'Chan Thy',
      role: 'LECTURER',
      created_at: now,
      updated_at: now,
    },
  });

  const students = [];

  for (let i = 1; i <= 5; i++) {
    students.push(
      await prisma.users.create({
        data: {
          email: `student${i}@itc.edu.kh`,
          password_hash: password,
          full_name: `Student ${i}`,
          role: 'STUDENT',
          created_at: now,
          updated_at: now,
        },
      }),
    );
  }

  // ---------- USER DEPARTMENTS ----------
  // Current deployment uses one department: AMS.
  // Admin and lecturers belong to AMS.
  await prisma.user_departments.createMany({
    data: [
      {
        user_id: admin.id,
        department_id: department.id,
        is_primary: true,
        created_at: now,
      },
      {
        user_id: lecturer1.id,
        department_id: department.id,
        is_primary: true,
        created_at: now,
      },
      {
        user_id: lecturer2.id,
        department_id: department.id,
        is_primary: true,
        created_at: now,
      },
    ],
  });

  // ---------- SEMESTER ----------
  const semester = await prisma.semesters.create({
    data: {
      semester_name: 'Semester 1',

      academic_year_id: academicYear.id,

      start_date: new Date('2025-10-01'),
      end_date: new Date('2026-02-28'),

      created_at: now,
      updated_at: now,
    },
  });

  // ---------- COURSES ----------
  const db = await prisma.courses.create({
    data: {
      course_code: 'CS301',
      course_name: 'Database Systems',
      description: 'Relational databases and SQL',

      department_id: department.id,

      created_at: now,
      updated_at: now,
    },
  });

  const ml = await prisma.courses.create({
    data: {
      course_code: 'CS402',
      course_name: 'Machine Learning',
      description: 'Supervised and unsupervised learning',

      department_id: department.id,

      created_at: now,
      updated_at: now,
    },
  });

  // ---------- COURSE OFFERINGS ----------
  const offering1 = await prisma.course_offerings.create({
    data: {
      course_id: db.id,
      lecturer_id: lecturer1.id,
      semester_id: semester.id,
      section_code: 'A',
      created_at: now,
      updated_at: now,
    },
  });

  const offering2 = await prisma.course_offerings.create({
    data: {
      course_id: ml.id,
      lecturer_id: lecturer2.id,
      semester_id: semester.id,
      section_code: 'A',
      created_at: now,
      updated_at: now,
    },
  });

  // ---------- ENROLLMENTS ----------
  // All 5 students are enrolled in both offerings.
  for (const student of students) {
    for (const offering of [offering1, offering2]) {
      await prisma.enrollments.create({
        data: {
          student_id: student.id,
          course_offering_id: offering.id,
          enrolled_at: now,
        },
      });
    }
  }

  // ---------- SURVEY ----------
  const survey = await prisma.surveys.create({
    data: {
      title: 'Teaching Quality Evaluation 2025-2026',
      description: 'Standard department evaluation form',
      created_by: admin.id,
      created_at: now,
      updated_at: now,
    },
  });

  const surveyVersion = await prisma.survey_versions.create({
    data: {
      survey_id: survey.id,
      version_no: 1,
      status: 'DRAFT',
      created_by: admin.id,
      created_at: now,
    },
  });

  // ---------- QUESTIONS ----------
  const questions = [
    {
      text: 'The lecturer explains concepts clearly.',
      type: 'RATING',
    },
    {
      text: 'The lecturer is well prepared for class.',
      type: 'RATING',
    },
    {
      text: 'Course materials are useful and relevant.',
      type: 'RATING',
    },
    {
      text: 'The lecturer is available to answer questions.',
      type: 'RATING',
    },
    {
      text: 'What did you like most about this course?',
      type: 'TEXT',
    },
    {
      text: 'What could be improved?',
      type: 'TEXT',
    },
  ];

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i];

    await prisma.questions.create({
      data: {
        survey_version_id: surveyVersion.id,
        question_text: question.text,
        question_type: question.type as any,
        category:
          question.type === 'RATING'
            ? 'Teaching'
            : 'Feedback',
        is_required: question.type === 'RATING',
        min_rating:
          question.type === 'RATING' ? 1 : null,
        max_rating:
          question.type === 'RATING' ? 5 : null,
        display_order: i + 1,
        created_at: now,
        updated_at: now,
      },
    });
  }

  // ---------- EVALUATIONS ----------
  // One OPEN evaluation and one DRAFT evaluation.
  const start = new Date();
  start.setDate(start.getDate() - 1);

  const end = new Date();
  end.setDate(end.getDate() + 14);

  const evalOpen = await prisma.evaluations.create({
    data: {
      course_offering_id: offering1.id,
      survey_version_id: surveyVersion.id,
      status: 'OPEN',
      start_at: start,
      end_at: end,
      created_by: admin.id,
      created_at: now,
      updated_at: now,
    },
  });

  await prisma.evaluations.create({
    data: {
      course_offering_id: offering2.id,
      survey_version_id: surveyVersion.id,
      status: 'DRAFT',
      created_by: admin.id,
      created_at: now,
      updated_at: now,
    },
  });

  // ---------- PARTICIPANTS ----------
  // Add all students to the OPEN evaluation.
  for (const student of students) {
    await prisma.evaluation_participants.create({
      data: {
        evaluation_id: evalOpen.id,
        student_id: student.id,
        has_submitted: false,
        created_at: now,
      },
    });
  }

  console.log('Seed complete.');
  console.log(
    'Login with any of these, password: Password123',
  );
  console.log(
    '  admin@itc.edu.kh      (ADMIN)',
  );
  console.log(
    '  sokdara@itc.edu.kh    (LECTURER)',
  );
  console.log(
    '  student1@itc.edu.kh   (STUDENT)',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
import { PrismaService } from '../../src/prisma/prisma.service';

export async function baseFixtures(prisma: PrismaService) {
  const [set, offering1, offering2] = await Promise.all([
    prisma.surveys.findFirstOrThrow({
      where: { title: 'E2E BASE PROTECTED' },
      include: {
        survey_versions: {
          where: { version_no: 1 },
          include: { questions: true },
        },
      },
    }),
    prisma.course_offerings.findFirstOrThrow({
      where: { courses: { course_code: 'E2E-BASE-1' } },
    }),
    prisma.course_offerings.findFirstOrThrow({
      where: { courses: { course_code: 'E2E-BASE-2' } },
    }),
  ]);
  return {
    survey: set.id.toString(),
    version: set.survey_versions[0].id.toString(),
    question: set.survey_versions[0].questions[0].id.toString(),
    offering1: offering1.id.toString(),
    offering2: offering2.id.toString(),
  };
}

import { jest } from '@jest/globals';
import {
  OfferingCurriculumPolicy,
  offeringScopeKeys,
} from './offering-curriculum.policy';

describe('Offering curriculum policy for new contexts', () => {
  const revision = (id = 100n, start = 2020, enabled = true) => ({
    id,
    effective_start_year: start,
    enabled,
  });
  const rule = (
    major = 10n,
    revisions = [revision()],
    level = 2,
    status = 'ACTIVE',
  ) => ({
    major_id: major,
    year_level: level,
    revisions,
    majors: { departments: { status } },
  });
  let db: any, policy: OfferingCurriculumPolicy;
  const scope = (extra: object = {}) => ({
    academic_year_id: '30',
    generation_id: '50',
    major_id: '10',
    year_level: 2,
    class_groups: ['A'],
    ...extra,
  });
  beforeEach(() => {
    db = {
      users: {
        findUnique: jest
          .fn<(...args: any[]) => Promise<any>>()
          .mockResolvedValue({ role: 'ADMIN', status: 'ACTIVE' }),
      },
      courses: {
        findUnique: jest
          .fn<(...args: any[]) => Promise<any>>()
          .mockResolvedValue({ id: 1n, departments: { status: 'ACTIVE' } }),
      },
      semesters: {
        findUnique: jest
          .fn<(...args: any[]) => Promise<any>>()
          .mockResolvedValue({
            id: 20n,
            academic_year_id: 30n,
            academic_years: { start_year: 2030 },
          }),
      },
      course_year_rules: {
        findMany: jest
          .fn<(...args: any[]) => Promise<any>>()
          .mockResolvedValue([rule()]),
      },
    };
    policy = new OfferingCurriculumPolicy(db);
  });
  it.each([undefined, null, 0, -1, 1.5, 6, '2', true])(
    'rejects an invalid new-context year %s before queries',
    async (level) => {
      await expect(policy.resolve(1n, 20n, level as any)).rejects.toMatchObject(
        { response: { code: 'OFFERING_YEAR_LEVEL_REQUIRED' } },
      );
      expect(db.course_year_rules.findMany).not.toHaveBeenCalled();
    },
  );
  it('allows an active ADMIN without a department-membership restriction', async () => {
    await expect(policy.requireAdmin(1n)).resolves.toBeUndefined();
  });
  it.each([
    null,
    { role: 'STUDENT', status: 'ACTIVE' },
    { role: 'ADMIN', status: 'INACTIVE' },
  ])('rejects a non-current ADMIN %j', async (actor) => {
    db.users.findUnique.mockResolvedValue(actor);
    await expect(policy.requireAdmin(1n)).rejects.toMatchObject({
      status: 403,
    });
  });
  it('rejects a missing authenticated actor', async () => {
    await expect(policy.requireAdmin(undefined as any)).rejects.toMatchObject({
      status: 403,
    });
  });
  it('requires a structured selected-semester year', async () => {
    db.semesters.findUnique.mockResolvedValue({
      academic_year_id: 30n,
      academic_years: { start_year: null },
    });
    await expect(policy.resolve(1n, 20n, 2)).rejects.toMatchObject({
      response: { code: 'OFFERING_ACADEMIC_YEAR_REQUIRED' },
    });
  });
  it('blocks an inactive course department on new contexts', async () => {
    db.courses.findUnique.mockResolvedValue({
      departments: { status: 'INACTIVE' },
    });
    await expect(policy.resolve(1n, 20n, 2)).rejects.toMatchObject({
      response: { code: 'OFFERING_DEPARTMENT_INACTIVE' },
    });
  });
  it.each([
    { name: 'no rule', rules: [] },
    { name: 'unversioned', rules: [rule(10n, [])] },
    { name: 'future only', rules: [rule(10n, [revision(101n, 2031)])] },
    {
      name: 'withdrawn',
      rules: [rule(10n, [revision(), revision(102n, 2029, false)])],
    },
    { name: 'wrong level', rules: [rule(10n, [revision()], 3)] },
    {
      name: 'inactive approval department',
      rules: [rule(10n, [revision()], 2, 'INACTIVE')],
    },
  ])('does not approve an unscoped offering with $name', async ({ rules }) => {
    db.course_year_rules.findMany.mockResolvedValue(rules);
    await expect(policy.resolve(1n, 20n, 2, [])).rejects.toMatchObject({
      response: { code: 'OFFERING_CURRICULUM_APPROVAL_REQUIRED' },
    });
  });
  it('uses the latest applicable revision and ignores future withdrawal', async () => {
    db.course_year_rules.findMany.mockResolvedValue([
      rule(10n, [revision(), revision(102n, 2031, false)]),
    ]);
    expect(await policy.resolve(1n, 20n, 2, [scope()])).toEqual(
      new Map([['10:2', 100n]]),
    );
  });
  it('accepts at least one enabled major for an unscoped context without manufacturing scope bindings', async () => {
    db.course_year_rules.findMany.mockResolvedValue([
      rule(11n, [revision(101n, 2020, false)]),
      rule(),
    ]);
    expect(await policy.resolve(1n, 20n, 2, [])).toEqual(new Map());
  });
  it('requires each targeted major rather than borrowing another major approval', async () => {
    await expect(
      policy.resolve(1n, 20n, 2, [scope(), scope({ major_id: '11' })]),
    ).rejects.toMatchObject({
      response: {
        code: 'OFFERING_CURRICULUM_APPROVAL_REQUIRED',
        major_id: '11',
      },
    });
  });
  it('rejects stale, wrong-owner or future selected revision IDs', async () => {
    await expect(
      policy.resolve(1n, 20n, 2, [scope({ curriculum_revision_id: '999' })]),
    ).rejects.toMatchObject({
      response: { code: 'OFFERING_CURRICULUM_REVISION_MISMATCH' },
    });
  });
  it.each([{ academic_year_id: '31' }, { year_level: 3 }])(
    'rejects scope context mismatches %j',
    async (extra) => {
      await expect(
        policy.resolve(1n, 20n, 2, [scope(extra)]),
      ).rejects.toMatchObject({ status: 400 });
    },
  );
  it('normalizes scope identity without depending on array order or labels', () => {
    expect(
      offeringScopeKeys([
        scope({ generation_id: '050', class_groups: [' b ', 'a'] }),
      ]),
    ).toEqual(offeringScopeKeys([scope({ class_groups: ['A', 'B'] })]));
  });
});

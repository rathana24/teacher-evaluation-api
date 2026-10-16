import { jest } from '@jest/globals';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  cohortWriteCapabilities,
  cohortWriteSchemaReady,
  majorScopedCohortsRequired,
  rejectUnscopedCohortWrite,
  requireCohortWriteSchema,
} from './cohort-write-policy';

describe('Controlled major-owned cohort write policy', () => {
  const original = process.env.REQUIRE_MAJOR_SCOPED_COHORTS;
  const query = jest.fn<(...args: unknown[]) => Promise<unknown>>();
  const db = { $queryRaw: query } as any;
  beforeEach(() => {
    delete process.env.REQUIRE_MAJOR_SCOPED_COHORTS;
    query.mockReset();
  });
  afterAll(() => {
    if (original === undefined) delete process.env.REQUIRE_MAJOR_SCOPED_COHORTS;
    else process.env.REQUIRE_MAJOR_SCOPED_COHORTS = original;
  });
  it.each([undefined, '', 'false', 'TRUE', '1', ' true '])(
    'keeps compatibility and omits capability for non-exact opt-in %s',
    async (value) => {
      if (value !== undefined) process.env.REQUIRE_MAJOR_SCOPED_COHORTS = value;
      expect(majorScopedCohortsRequired()).toBe(false);
      expect(() => rejectUnscopedCohortWrite()).not.toThrow();
      await expect(requireCohortWriteSchema(db)).resolves.toBeUndefined();
      await expect(cohortWriteCapabilities(db)).resolves.toEqual({});
      expect(query).not.toHaveBeenCalled();
    },
  );
  it('rejects unscoped writes only with the explicit strict switch', () => {
    process.env.REQUIRE_MAJOR_SCOPED_COHORTS = 'true';
    expect(majorScopedCohortsRequired()).toBe(true);
    expect(() => rejectUnscopedCohortWrite()).toThrow(BadRequestException);
    try {
      rejectUnscopedCohortWrite();
    } catch (error: any) {
      expect(error.getResponse().code).toBe('MAJOR_SCOPED_COHORT_REQUIRED');
    }
    expect(query).not.toHaveBeenCalled();
  });
  it('advertises supported write contracts with both deployment checks, independently of data', async () => {
    process.env.REQUIRE_MAJOR_SCOPED_COHORTS = 'true';
    query.mockResolvedValue([{ ready: true }]);
    expect(await cohortWriteCapabilities(db)).toEqual({
      major_scoped_generations: true,
    });
    expect(query).toHaveBeenCalledTimes(2);
  });
  it.each([
    { result: [] },
    { result: [{ ready: false }] },
    { result: [{ ready: null }] },
  ])(
    'does not read a missing ledger or advertise on incomplete catalog %j',
    async ({ result }) => {
      process.env.REQUIRE_MAJOR_SCOPED_COHORTS = 'true';
      query.mockResolvedValue(result);
      expect(await cohortWriteCapabilities(db)).toEqual({});
      expect(query).toHaveBeenCalledTimes(1);
    },
  );
  it('omits capability when the successful migration/checksum prerequisite is missing', async () => {
    process.env.REQUIRE_MAJOR_SCOPED_COHORTS = 'true';
    query
      .mockResolvedValueOnce([{ ready: true }])
      .mockResolvedValueOnce([{ ready: false }]);
    expect(await cohortWriteCapabilities(db)).toEqual({});
  });
  it('returns actionable 503 for strict writes against an incomplete schema', async () => {
    process.env.REQUIRE_MAJOR_SCOPED_COHORTS = 'true';
    query.mockResolvedValue([{ ready: false }]);
    await expect(requireCohortWriteSchema(db)).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    await expect(requireCohortWriteSchema(db)).rejects.toMatchObject({
      response: { code: 'COHORT_SCHEMA_NOT_READY' },
    });
  });
  it('allows strict writes with ready prerequisites', async () => {
    process.env.REQUIRE_MAJOR_SCOPED_COHORTS = 'true';
    query.mockResolvedValue([{ ready: true }]);
    await expect(requireCohortWriteSchema(db)).resolves.toBeUndefined();
  });
  it('rechecks readiness instead of caching a capability after drift', async () => {
    process.env.REQUIRE_MAJOR_SCOPED_COHORTS = 'true';
    query
      .mockResolvedValueOnce([{ ready: true }])
      .mockResolvedValueOnce([{ ready: true }])
      .mockResolvedValueOnce([{ ready: false }]);
    expect(await cohortWriteCapabilities(db)).toHaveProperty(
      'major_scoped_generations',
      true,
    );
    expect(await cohortWriteCapabilities(db)).toEqual({});
  });
  it('propagates database failures instead of returning a successful empty profile capability', async () => {
    process.env.REQUIRE_MAJOR_SCOPED_COHORTS = 'true';
    query.mockRejectedValue(new Error('Database unavailable'));
    await expect(cohortWriteCapabilities(db)).rejects.toThrow(
      'Database unavailable',
    );
  });
  it('checks readiness independently of whether the switch is active', async () => {
    query.mockResolvedValue([{ ready: true }]);
    expect(await cohortWriteSchemaReady(db)).toBe(true);
  });
});

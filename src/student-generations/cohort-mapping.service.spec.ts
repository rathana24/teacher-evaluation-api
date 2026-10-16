import { jest } from '@jest/globals';
import { JwtService } from '@nestjs/jwt';
import { CohortMappingService } from './cohort-mapping.service';

describe('Privileged cohort mapping gates (no database connection)', () => {
  const secret = 'Synthetic-unit-mapping-secret';
  const jwt = new JwtService();
  let enabled = 'true';
  const userLookup = jest.fn<(...args: any[]) => Promise<any>>();
  const contextQuery = jest.fn<(...args: any[]) => Promise<any>>();
  const reviewLookup = jest.fn<(...args: any[]) => Promise<any>>();
  const db: any = {
    users: { findUnique: userLookup },
    $queryRaw: contextQuery,
    reviewed_operations: { findUnique: reviewLookup },
  };
  db.$transaction = async (work: (tx: unknown) => Promise<unknown>) => work(db);
  const config: any = {
    get: (key: string) =>
      key === 'COHORT_MAPPING_ENABLED' ? enabled : undefined,
    getOrThrow: () => secret,
  };
  const service = new CohortMappingService(db, config);
  const token = (payload: object = { sub: '1', auth_version: 0 }) =>
    'Bearer ' + jwt.sign(payload, { secret, expiresIn: '15m' });
  const review = '12345678-1234-4123-8123-123456789abc';
  beforeEach(() => {
    enabled = 'true';
    jest.clearAllMocks();
    userLookup.mockResolvedValue({
      role: 'ADMIN',
      status: 'ACTIVE',
      auth_version: 0,
    });
    contextQuery.mockResolvedValue([
      { database: 'teacher_evaluation_test', schema: 'public' },
    ]);
    reviewLookup.mockResolvedValue(null);
  });
  it.each(['false', '', undefined])(
    'does not start mapping reads when disabled (%s)',
    async (value) => {
      enabled = value as any;
      await expect(service.inventory(1n, token())).rejects.toMatchObject({
        status: 503,
      });
      expect(contextQuery).not.toHaveBeenCalled();
      expect(userLookup).not.toHaveBeenCalled();
    },
  );
  it.each([undefined, '', 'Basic abc', 'Bearer malformed'])(
    'requires a valid signed bearer token (%s)',
    async (value) => {
      await expect(service.receipt(1n, value, review)).rejects.toMatchObject({
        status: 401,
      });
      expect(contextQuery).not.toHaveBeenCalled();
    },
  );
  it.each([
    { sub: '2', auth_version: 0 },
    { sub: '1', auth_version: -1 },
    { sub: '1', auth_version: '0' },
    { sub: '1' },
  ])(
    'rejects mismatched or invalid authenticated claims %#',
    async (claims) => {
      await expect(
        service.receipt(1n, token(claims), review),
      ).rejects.toMatchObject({ status: 401 });
      expect(userLookup).not.toHaveBeenCalled();
    },
  );
  it('rejects a token whose signature was issued under another secret', async () => {
    const header =
      'Bearer ' +
      jwt.sign(
        { sub: '1', auth_version: 0 },
        { secret: 'Another-synthetic-secret', expiresIn: '15m' },
      );
    await expect(service.receipt(1n, header, review)).rejects.toMatchObject({
      status: 401,
    });
    expect(contextQuery).not.toHaveBeenCalled();
  });
  it('requires an expiry even for a correctly signed token', async () => {
    const header =
      'Bearer ' + jwt.sign({ sub: '1', auth_version: 0 }, { secret });
    await expect(service.receipt(1n, header, review)).rejects.toMatchObject({
      status: 401,
    });
  });
  it('rejects expired signed tokens', async () => {
    const header =
      'Bearer ' + jwt.sign({ sub: '1', auth_version: 0, exp: 1 }, { secret });
    await expect(service.receipt(1n, header, review)).rejects.toMatchObject({
      status: 401,
    });
  });
  it.each([
    { role: 'ADMIN', status: 'ACTIVE', auth_version: 1 },
    { role: 'ADMIN', status: 'INACTIVE', auth_version: 0 },
    { role: 'LECTURER', status: 'ACTIVE', auth_version: 0 },
    null,
  ])(
    'rechecks role/status/token revision inside receipt transactions %#',
    async (user) => {
      userLookup.mockResolvedValue(user);
      await expect(service.receipt(1n, token(), review)).rejects.toMatchObject({
        status: 403,
      });
      expect(contextQuery).not.toHaveBeenCalled();
    },
  );
  it.each([
    { database: 'teacher_evaluation', schema: 'public' },
    { database: 'other_database', schema: 'public' },
    { database: 'teacher_evaluation_test', schema: 'arbitrary_schema' },
  ])(
    'rejects unsupported actual target context %# without accessing its reviews',
    async (context) => {
      contextQuery.mockResolvedValue([context]);
      await expect(service.receipt(1n, token(), review)).rejects.toMatchObject({
        status: 409,
      });
      expect(reviewLookup).not.toHaveBeenCalled();
    },
  );
  it('permits the isolated test public context but hides absent receipts', async () => {
    await expect(service.receipt(1n, token(), review)).rejects.toMatchObject({
      status: 404,
    });
    expect(reviewLookup).toHaveBeenCalledWith({ where: { id: review } });
  });
});

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { user_role, users } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

describe('Self-service password changes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;
  let databaseConfirmed = false;
  let passwordHash: string;
  let serial = 0;
  const marker = `E2E-PW-${Date.now()}`;
  const original = 'Password123';
  const replacement = 'ChangedPassword456';
  let fixtures:
    | { department: bigint; year: bigint; major: bigint; generation: bigint }
    | undefined;
  const api = () => request(app.getHttpServer());
  const authorization = (token: string) => ({
    Authorization: `Bearer ${token}`,
  });
  const payload = (current = original, next = replacement) => ({
    current_password: current,
    new_password: next,
  });
  const login = (user: users, password = original) =>
    api().post('/api/auth/login').send({ identifier: user.email, password });
  const change = (token: string, body: object = payload()) =>
    api().put('/api/auth/password').set(authorization(token)).send(body);
  const me = (token: string) =>
    api().get('/api/auth/me').set(authorization(token));
  const state = (user: users) =>
    prisma.users.findUniqueOrThrow({ where: { id: user.id } });

  async function actor(role: user_role = 'ADMIN', password = original) {
    const f = fixtures!;
    const suffix = `${marker.toLowerCase()}-${++serial}`;
    const user = await prisma.users.create({
      data: {
        email: `${suffix}@example.test`,
        full_name: `${marker} ${serial}`,
        role,
        status: 'ACTIVE',
        password_hash:
          password === original
            ? passwordHash
            : await bcrypt.hash(password, 10),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    await prisma.user_departments.create({
      data: { user_id: user.id, department_id: f.department, is_primary: true },
    });
    if (role === 'STUDENT') {
      await prisma.students.create({
        data: {
          user_id: user.id,
          student_code: suffix,
          generation_id: f.generation,
          notes: 'Owned synthetic password-test student',
          student_academic_records: {
            create: {
              academic_year_id: f.year,
              year_level: 1,
              major_id: f.major,
              class_group: 'A',
            },
          },
        },
      });
    }
    const response = await login(user, password);
    expect(response.status).toBe(200);
    expect(typeof response.body.access_token).toBe('string');
    return { user, token: response.body.access_token as string };
  }

  async function related(user: users) {
    return {
      memberships: await prisma.user_departments.findMany({
        where: { user_id: user.id },
      }),
      student: await prisma.students.findUnique({
        where: { user_id: user.id },
        include: { student_academic_records: true },
      }),
    };
  }

  async function cleanupUsers() {
    if (!databaseConfirmed) return;
    const owned = await prisma.users.findMany({
      where: { full_name: { startsWith: marker } },
      select: { id: true },
    });
    const ids = owned.map((user) => user.id);
    await prisma.$transaction(async (tx) => {
      const students = await tx.students.findMany({
        where: { user_id: { in: ids } },
        select: { id: true },
      });
      await tx.student_academic_records.deleteMany({
        where: { student_id: { in: students.map((student) => student.id) } },
      });
      await tx.students.deleteMany({ where: { user_id: { in: ids } } });
      await tx.user_departments.deleteMany({ where: { user_id: { in: ids } } });
      await tx.users.deleteMany({ where: { id: { in: ids } } });
    });
  }

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
    const [database] = await prisma.$queryRaw<Array<{ name: string }>>`
      SELECT current_database() AS name
    `;
    expect(database.name).toBe('teacher_evaluation_test');
    databaseConfirmed = true;
    passwordHash = await bcrypt.hash(original, 10);
    fixtures = await prisma.$transaction(async (tx) => {
      const department = await tx.departments.create({
        data: { code: marker, name: marker },
      });
      const year = await tx.academic_years.create({
        data: { name: `PW-${Date.now()}`, start_year: 2090, is_active: false },
      });
      const major = await tx.majors.create({
        data: { code: marker, name: marker, department_id: department.id },
      });
      const generation = await tx.student_generations.create({
        data: { name: marker, entry_academic_year_id: year.id },
      });
      return {
        department: department.id,
        year: year.id,
        major: major.id,
        generation: generation.id,
      };
    });
  }, 30000);

  afterEach(cleanupUsers);
  afterAll(async () => {
    try {
      await cleanupUsers();
      if (databaseConfirmed && fixtures) {
        const f = fixtures;
        await prisma.$transaction(async (tx) => {
          await tx.student_generations.delete({ where: { id: f.generation } });
          await tx.majors.delete({ where: { id: f.major } });
          await tx.academic_years.delete({ where: { id: f.year } });
          await tx.departments.delete({ where: { id: f.department } });
        });
      }
    } finally {
      await app?.close();
    }
  });

  it.each<user_role>(['ADMIN', 'LECTURER', 'STUDENT'])(
    '%s changes only its credentials and revokes all its old sessions',
    async (role) => {
      const { user, token } = await actor(role);
      const other = await actor();
      const otherBefore = await state(other.user);
      const before = await state(user);
      const relatedBefore = await related(user);
      const profileBefore = await me(token);
      expect(profileBefore.status).toBe(200);
      expect(profileBefore.body.capabilities.change_password).toBe(true);
      const secondSession = await jwt.signAsync({
        sub: user.id.toString(),
        auth_version: before.auth_version,
        jti: 'another-owned-session',
      });
      expect(secondSession).not.toBe(token);
      expect((await me(secondSession)).status).toBe(200);
      const response = await change(token);
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        message: 'Password changed successfully. Please sign in again.',
      });
      const after = await state(user);
      expect(after).toEqual({
        ...before,
        password_hash: after.password_hash,
        auth_version: before.auth_version + 1,
      });
      expect(after.password_hash).not.toBe(before.password_hash);
      expect(await bcrypt.compare(replacement, after.password_hash)).toBe(true);
      expect(await bcrypt.compare(original, after.password_hash)).toBe(false);
      expect(await related(user)).toEqual(relatedBefore);
      expect((await me(token)).status).toBe(401);
      expect((await me(secondSession)).status).toBe(401);
      expect((await change(token)).status).toBe(401);
      expect(await state(user)).toEqual(after);
      expect((await login(user)).status).toBe(401);
      const fresh = await login(user, replacement);
      expect(fresh.status).toBe(200);
      expect(jwt.decode(fresh.body.access_token)).toMatchObject({
        sub: user.id.toString(),
        auth_version: before.auth_version + 1,
      });
      const profileAfter = await me(fresh.body.access_token);
      expect(profileAfter.status).toBe(200);
      expect(profileAfter.body).toEqual(profileBefore.body);
      expect((await me(other.token)).status).toBe(200);
      expect(await state(other.user)).toEqual(otherBefore);
    },
  );

  it.each([
    ['six ASCII characters', 'New123'],
    ['72 ASCII bytes', 'N'.repeat(72)],
    ['72 UTF-8 bytes', '\u1780'.repeat(24)],
    ['literal surrounding spaces', ' NewPassword456 '],
  ])('accepts %s', async (_label, next) => {
    const { user, token } = await actor();
    expect((await change(token, payload(original, next))).status).toBe(200);
    expect((await login(user, next)).status).toBe(200);
    expect((await login(user)).status).toBe(401);
    if (next.trim() !== next) {
      expect((await login(user, next.trim())).status).toBe(401);
    }
  });

  const invalidBodies: Array<[string, Record<string, unknown>]> = [
    ['missing both fields', {}],
    ['missing current', { new_password: replacement }],
    ['missing new', { current_password: original }],
    ['empty current', payload('')],
    ['empty new', payload(original, '')],
    ['short current', payload('short')],
    ['short new', payload(original, 'short')],
    ['73-character current', payload('x'.repeat(73))],
    ['73-character new', payload(original, 'x'.repeat(73))],
    ['75-byte current', payload('\u1780'.repeat(25))],
    ['75-byte new', payload(original, '\u1780'.repeat(25))],
    ['null current', { ...payload(), current_password: null }],
    ['null new', { ...payload(), new_password: null }],
    ['number current', { ...payload(), current_password: 123456 }],
    ['number new', { ...payload(), new_password: 123456 }],
    ['object current', { ...payload(), current_password: {} }],
    ['array new', { ...payload(), new_password: ['New123'] }],
    ['wrong current', payload('WrongPassword123')],
    ['unchanged password', payload(original, original)],
  ];
  it.each(invalidBodies)(
    'rejects %s without mutation',
    async (_label, body) => {
      const { user, token } = await actor('STUDENT');
      const before = await state(user);
      const relatedBefore = await related(user);
      const response = await change(token, body);
      expect(response.status).toBe(400);
      expect(await state(user)).toEqual(before);
      expect(await related(user)).toEqual(relatedBefore);
      expect((await me(token)).status).toBe(200);
      expect((await login(user)).status).toBe(200);
    },
  );

  it.each([
    'missing',
    'malformed',
    'wrong signature',
    'expired',
    'missing version',
    'wrong version',
  ])('rejects %s authentication without changing credentials', async (kind) => {
    const { user } = await actor();
    const before = await state(user);
    const claims = { sub: user.id.toString(), auth_version: user.auth_version };
    let token = 'not-a-jwt';
    if (kind === 'wrong signature') {
      token = await jwt.signAsync(claims, {
        secret: 'owned-invalid-signature',
      });
    } else if (kind === 'expired') {
      token = await jwt.signAsync(claims, { expiresIn: -1 });
    } else if (kind === 'missing version') {
      token = await jwt.signAsync({ sub: claims.sub });
    } else if (kind === 'wrong version') {
      token = await jwt.signAsync({ ...claims, auth_version: 99 });
    }
    const response =
      kind === 'missing'
        ? await api().put('/api/auth/password').send(payload())
        : await change(token);
    expect(response.status).toBe(401);
    expect(await state(user)).toEqual(before);
  });

  it('rejects a previously authenticated account after deactivation', async () => {
    const { user, token } = await actor();
    await prisma.users.update({
      where: { id: user.id },
      data: { status: 'INACTIVE' },
    });
    const before = await state(user);
    expect((await change(token)).status).toBe(401);
    expect(await state(user)).toEqual(before);
  });

  it('ignores injected target IDs and privileges and changes only the JWT owner', async () => {
    const owner = await actor('STUDENT');
    const target = await actor('LECTURER');
    const before = await state(target.user);
    expect(
      (
        await change(owner.token, {
          ...payload(),
          id: target.user.id.toString(),
          user_id: target.user.id.toString(),
          target_id: target.user.id.toString(),
          role: 'ADMIN',
          status: 'INACTIVE',
          auth_version: 1000,
        })
      ).status,
    ).toBe(200);
    expect(await state(target.user)).toEqual(before);
    expect((await me(target.token)).status).toBe(200);
    expect((await state(owner.user)).role).toBe('STUDENT');
    expect((await state(owner.user)).status).toBe('ACTIVE');
    expect((await login(owner.user, replacement)).status).toBe(200);
  });

  it("limits the sixth attempt per user and shares the budget across that user's sessions", async () => {
    const owner = await actor();
    const other = await actor();
    const before = await state(owner.user);
    for (let attempt = 0; attempt < 5; attempt++) {
      expect(
        (await change(owner.token, payload('WrongPassword123'))).status,
      ).toBe(400);
    }
    const freshLogin = await login(owner.user);
    expect(freshLogin.status).toBe(200);
    expect((await change(freshLogin.body.access_token)).status).toBe(429);
    expect(await state(owner.user)).toEqual(before);
    expect((await change(other.token)).status).toBe(200);
  });

  it('counts validation failures toward the same rate limit', async () => {
    const { user, token } = await actor();
    const before = await state(user);
    for (let attempt = 0; attempt < 5; attempt++) {
      expect((await change(token, {})).status).toBe(400);
    }
    expect((await change(token)).status).toBe(429);
    expect(await state(user)).toEqual(before);
  });

  it('does not reset the rate limit after a successful password change', async () => {
    const { user, token } = await actor();
    for (let attempt = 0; attempt < 4; attempt++) {
      expect((await change(token, payload('WrongPassword123'))).status).toBe(
        400,
      );
    }
    expect((await change(token)).status).toBe(200);
    const fresh = await login(user, replacement);
    expect(fresh.status).toBe(200);
    const before = await state(user);
    expect(
      (
        await change(
          fresh.body.access_token,
          payload(replacement, 'Another123'),
        )
      ).status,
    ).toBe(429);
    expect(await state(user)).toEqual(before);
  });

  it('allows at most one competing change from the same credential state', async () => {
    const { user, token } = await actor();
    const alternatives = ['ConcurrentPasswordA', 'ConcurrentPasswordB'];
    const responses = await Promise.all(
      alternatives.map((next) => change(token, payload(original, next))),
    );
    expect(
      responses.filter((response) => response.status === 200),
    ).toHaveLength(1);
    const rejected = responses.find((response) => response.status !== 200)!;
    expect([400, 401]).toContain(rejected.status);
    expect((await state(user)).auth_version).toBe(user.auth_version + 1);
    for (let index = 0; index < alternatives.length; index++) {
      expect((await login(user, alternatives[index])).status).toBe(
        responses[index].status === 200 ? 200 : 401,
      );
    }
    expect((await me(token)).status).toBe(401);
  });
});

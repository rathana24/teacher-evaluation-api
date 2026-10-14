import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { throwKnownDatabaseConstraint } from './database-constraint.util';

describe('Owned database constraint errors', () => {
  it.each(['P2004', 'P2010'])(
    'maps a named CHECK violation from %s to 400',
    (code) => {
      expect(() =>
        throwKnownDatabaseConstraint({
          code,
          meta: { database_error: 'student_generations_starting_level_check' },
        }),
      ).toThrow(BadRequestException);
    },
  );
  it('maps the active-year uniqueness violation separately from duplicate names', () => {
    expect(() =>
      throwKnownDatabaseConstraint({
        code: 'P2002',
        meta: { modelName: 'academic_years', target: ['is_active'] },
      }),
    ).toThrow(ConflictException);
    expect(() =>
      throwKnownDatabaseConstraint({
        code: 'P2002',
        meta: { target: 'academic_years_one_active_idx' },
        message: 'academic_years_one_active_idx',
      }),
    ).toThrow(ConflictException);
    expect(() =>
      throwKnownDatabaseConstraint({
        code: 'P2002',
        meta: { modelName: 'academic_years', target: ['name'] },
      }),
    ).not.toThrow();
  });
  it('preserves unknown and historical-protection errors for domain handling', () => {
    expect(() =>
      throwKnownDatabaseConstraint({
        code: 'P2004',
        message: 'Curriculum academic year start_year is protected',
      }),
    ).not.toThrow();
    expect(() =>
      throwKnownDatabaseConstraint({
        code: 'P2003',
        message: 'foreign key failure',
      }),
    ).not.toThrow();
    expect(() =>
      throwKnownDatabaseConstraint(new Error('unrelated failure')),
    ).not.toThrow();
  });
  it('maps Prisma connector CHECK errors without rewriting unrelated connector failures', () => {
    const check = new Prisma.PrismaClientUnknownRequestError(
      'CheckConstraintViolation: academic_years_date_order_check',
      { clientVersion: '6.19.3' },
    );
    expect(() => throwKnownDatabaseConstraint(check)).toThrow(
      BadRequestException,
    );
    const other = new Prisma.PrismaClientUnknownRequestError(
      'unrelated connector failure',
      { clientVersion: '6.19.3' },
    );
    expect(() => throwKnownDatabaseConstraint(other)).not.toThrow();
  });
});

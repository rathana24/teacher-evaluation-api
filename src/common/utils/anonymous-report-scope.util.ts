import { BadRequestException } from '@nestjs/common';

/** Responses have no student/participant ownership to support arbitrary slices. */
export function assertWholeAnonymousAggregate(
  query: Record<string, unknown> = {},
) {
  if (Object.keys(query).length)
    throw new BadRequestException({
      code: 'UNSUPPORTED_ANONYMOUS_SCOPE',
      message:
        'This report contains whole evaluation aggregates. Generation/group query slicing is not supported; use the saved target context without attributing answers to students.',
    });
}

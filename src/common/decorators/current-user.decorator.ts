import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (property: string | undefined, ctx: ExecutionContext) => {
    const user = ctx
      .switchToHttp()
      .getRequest<{ user?: Record<string, unknown> }>().user;

    return property ? user?.[property] : user;
  },
);

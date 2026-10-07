import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const transactionClients = new WeakSet<object>();

/** Bind nested service operations to the existing transaction, never a new snapshot. */
function transactionClient(tx: Prisma.TransactionClient): PrismaService {
  const client = new Proxy(tx, {
    get(target, property, receiver) {
      if (property === '$transaction') {
        return async (
          operation:
            ((db: PrismaService) => Promise<unknown>) | Promise<unknown>[],
        ) =>
          typeof operation === 'function'
            ? operation(client)
            : Promise.all(operation);
      }
      const value = Reflect.get(target, property, receiver);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as PrismaService;
  transactionClients.add(client);
  return client;
}

/** Every read that authorizes a write must use this same serializable snapshot. */
export async function inSerializableTransaction<T>(
  prisma: PrismaService,
  operation: (db: PrismaService) => Promise<T>,
  mapError?: (error: any) => never,
): Promise<T> {
  if (transactionClients.has(prisma)) return operation(prisma);
  try {
    return await prisma.$transaction((tx) => operation(transactionClient(tx)), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5_000,
      timeout: 20_000,
    });
  } catch (error) {
    let failure = error;
    // Include commit-time errors in the service's existing domain error mapping.
    if (mapError) {
      try {
        mapError(error);
      } catch (mapped) {
        failure = mapped;
      }
    }
    if (
      failure instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2034', 'P2028'].includes(failure.code)
    ) {
      throw new ConflictException(
        'The operation conflicted with another change or could not finish atomically. Reload, review, and retry.',
      );
    }
    throw failure;
  }
}

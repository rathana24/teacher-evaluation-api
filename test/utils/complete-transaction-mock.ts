/** A transaction exposes the same read delegates as Prisma, plus transaction-specific writes. */
export function completeTransactionMock(prisma: any, transaction: any): any {
  const result = { ...prisma, ...transaction };
  for (const [name, delegate] of Object.entries(prisma)) {
    if (!name.startsWith('$') && delegate && typeof delegate === 'object') {
      result[name] = { ...delegate, ...transaction[name] };
    }
  }
  return result;
}

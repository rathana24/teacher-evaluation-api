/** Optional isolation for local synthetic tests; this never selects a normal database. */
function selectedTestDatabase() {
  const suffix = process.env.TEST_DATABASE_SUFFIX;
  if (suffix === undefined) return 'teacher_evaluation_test';
  if (!/^[a-z][a-z0-9_]{0,30}$/.test(suffix))
    throw new Error('Invalid TEST_DATABASE_SUFFIX');
  return `teacher_evaluation_test_${suffix}`;
}
module.exports = { selectedTestDatabase };

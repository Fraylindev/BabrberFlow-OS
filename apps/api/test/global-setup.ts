export default function () {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || (!dbUrl.includes('_test') && !dbUrl.includes('schema=test'))) {
    throw new Error(
      'E2E tests must be run with a DATABASE_URL pointing to an explicit test database (e.g. database name ending in "_test" or "schema=test"). Current URL: ' +
        dbUrl,
    );
  }
}

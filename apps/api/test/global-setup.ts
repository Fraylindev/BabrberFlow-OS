import { readFileSync } from 'fs';
import { join } from 'path';

export default function () {
  const envPath = join(__dirname, '..', '.env.test');
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.includes('test')) {
    throw new Error(
      'E2E tests must be run with a DATABASE_URL pointing to a test database (must include "test" in URL). Current URL: ' +
        dbUrl,
    );
  }
};

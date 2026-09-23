import { PrismaClient } from '@prisma/client';
import { setTimeout } from 'node:timers/promises';
import { EmailWorker } from './email-worker';
import { emailChannelConfig, ResendAdapter } from './resend.adapter';

async function main() {
  const config = emailChannelConfig(process.env);
  const db = new PrismaClient();
  let stopped = false;
  const stop = () => {
    stopped = true;
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
  const worker = new EmailWorker(
    db,
    config,
    new ResendAdapter(config),
    (code) => process.stderr.write(`${code}\n`),
  );
  try {
    await db.$connect();
    do {
      try {
        await worker.tick();
      } catch {
        process.stderr.write('EMAIL_WORKER_CYCLE_FAILED\n');
        if (process.argv.includes('--once')) {
          process.exitCode = 1;
          break;
        }
      }
      if (process.argv.includes('--once')) break;
      if (!stopped) await setTimeout(1000);
    } while (!stopped);
  } finally {
    await db.$disconnect();
    process.removeListener('SIGINT', stop);
    process.removeListener('SIGTERM', stop);
  }
}

if (require.main === module) {
  void main().catch(() => {
    process.stderr.write('EMAIL_WORKER_START_FAILED\n');
    process.exitCode = 1;
  });
}

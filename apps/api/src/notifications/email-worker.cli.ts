import { PrismaClient } from '@prisma/client';
import { setTimeout } from 'node:timers/promises';
import { EmailWorker } from './email-worker';
import { emailChannelConfig, ResendAdapter } from './resend.adapter';

async function main() {
  if (
    process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'true' &&
    process.env.NOTIFICATIONS_EMAIL_ENABLED !== 'false'
  ) {
    throw new Error('EMAIL_WORKER_SWITCH_REQUIRED');
  }
  const config = emailChannelConfig(process.env);
  const db = new PrismaClient();
  let stopped = false;
  let consecutiveFailures = 0;
  let lastHeartbeat = 0;
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
        const now = Date.now();
        if (now - lastHeartbeat >= 60_000 || process.argv.includes('--once')) {
          await db.$queryRaw`SELECT 1`;
          process.stdout.write('EMAIL_WORKER_HEARTBEAT\n');
          lastHeartbeat = now;
        }
        consecutiveFailures = 0;
      } catch {
        consecutiveFailures += 1;
        process.stderr.write('EMAIL_WORKER_CYCLE_FAILED\n');
        if (process.argv.includes('--once') || consecutiveFailures >= 5) {
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

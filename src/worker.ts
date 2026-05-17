import 'dotenv/config';
import { registerClickWorker } from './modules/queue/click.queue.js';
import { logger } from './shared/lib/logger.js';
import { prisma } from './shared/lib/prisma.js';

async function main() {
  await prisma.$connect();
  registerClickWorker();
  logger.info('Click worker started');
}

main().catch((err) => {
  logger.error(err);
  process.exit(1);
});

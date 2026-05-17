import { Queue, Worker } from 'bullmq';
import geoip from 'geoip-lite';
import { loadEnv } from '../../config/env.js';
import { prisma } from '../../shared/lib/prisma.js';
import { logger } from '../../shared/lib/logger.js';

const env = loadEnv();
const connection = { url: env.REDIS_URL };

export interface ClickJobData {
  linkId: string;
  ip?: string;
  userAgent?: string;
  referer?: string;
}

export const clickQueue = new Queue<ClickJobData>('clicks', {
  connection,
  prefix: env.BULL_PREFIX,
});

export async function enqueueClick(data: ClickJobData) {
  await clickQueue.add('record-click', data, {
    removeOnComplete: 1000,
    removeOnFail: 500,
  });
}

export function registerClickWorker() {
  new Worker<ClickJobData>(
    'clicks',
    async (job) => {
      const { linkId, ip, userAgent, referer } = job.data;
      const geo = ip ? geoip.lookup(ip) : null;

      await prisma.click.create({
        data: {
          linkId,
          ip,
          userAgent,
          referer,
          country: geo?.country ?? undefined,
        },
      });
    },
    { connection, prefix: env.BULL_PREFIX },
  );

  logger.info('Click worker registered');
}

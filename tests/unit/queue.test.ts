import { describe, it, expect, vi } from 'vitest';

vi.mock('bullmq', () => ({
  Queue: vi.fn(() => ({ add: vi.fn().mockResolvedValue({}) })),
  Worker: vi.fn(),
}));

vi.mock('../../src/shared/lib/redis.js', () => ({
  redis: {
    get: vi.fn(),
    setex: vi.fn(),
    del: vi.fn(),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn(),
  },
  linkCacheKey: (c: string) => `link:${c}`,
  ipCreateKey: (ip: string) => `ip:${ip}`,
}));

describe('click queue', () => {
  it('enqueues click without blocking', async () => {
    const { enqueueClick } = await import('../../src/modules/queue/click.queue.js');
    await expect(enqueueClick({ linkId: 'link-1', ip: '127.0.0.1' })).resolves.not.toThrow();
  });
});

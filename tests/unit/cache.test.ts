import { describe, it, expect, vi, beforeEach } from 'vitest';

const del = vi.fn().mockResolvedValue(1);
const setex = vi.fn().mockResolvedValue('OK');

vi.mock('../../src/shared/lib/redis.js', () => ({
  redis: { del, setex, get: vi.fn() },
  linkCacheKey: (code: string) => `link:${code}`,
  ipCreateKey: (ip: string) => `rate:${ip}`,
  invalidateLinkCache: (code: string) => del(`link:${code}`),
}));

vi.mock('../../src/modules/queue/click.queue.js', () => ({
  enqueueClick: vi.fn(),
}));

vi.mock('../../src/config/env.js', () => ({
  loadEnv: () => ({
    SHORT_URL_BASE: 'http://localhost:3001',
    CACHE_TTL_SECONDS: 300,
  }),
}));

describe('LinkService cache invalidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes redis cache key on update', async () => {
    const { prisma } = await import('../../src/shared/lib/prisma.js');
    const findUnique = vi.spyOn(prisma.link, 'findUnique').mockResolvedValue({
      id: '1',
      shortCode: 'abc',
      originalUrl: 'https://example.com',
      userId: 'u1',
      isActive: true,
      clickCount: 0,
      expiresAt: null,
      maxClicks: null,
      blockReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    const update = vi.spyOn(prisma.link, 'update').mockResolvedValue({
      id: '1',
      shortCode: 'abc',
      originalUrl: 'https://example.com',
      userId: 'u1',
      isActive: true,
      clickCount: 0,
      expiresAt: null,
      maxClicks: 10,
      blockReason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);

    const { LinkService } = await import('../../src/modules/links/link.service.js');
    const links = new LinkService();
    await links.update('abc', 'u1', { maxClicks: 10 });

    expect(del).toHaveBeenCalledWith('link:abc');
    findUnique.mockRestore();
    update.mockRestore();
  });
});

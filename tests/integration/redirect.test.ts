import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';

vi.mock('../../src/modules/queue/click.queue.js', () => ({
  enqueueClick: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src/shared/lib/prisma.js', () => ({
  prisma: {
    link: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'link-1',
        shortCode: 'abc',
        originalUrl: 'https://example.com',
        isActive: true,
        expiresAt: null,
        maxClicks: null,
        clickCount: 0,
      }),
      update: vi.fn().mockResolvedValue({ clickCount: 1 }),
    },
  },
}));

vi.mock('../../src/shared/lib/redis.js', () => ({
  redis: {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    incr: vi.fn(),
    expire: vi.fn(),
  },
  linkCacheKey: (c: string) => `link:${c}`,
  ipCreateKey: (ip: string) => `ip:${ip}`,
}));

describe('redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 302 redirect', async () => {
    const app = createApp();
    const res = await request(app).get('/api/v1/redirect/abc');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://example.com');
    expect(res.headers['cache-control']).toContain('max-age=300');
  });
});

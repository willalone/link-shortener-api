import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app.js';
import { prisma } from '../../src/shared/lib/prisma.js';

vi.mock('../../src/modules/queue/click.queue.js', () => ({
  enqueueClick: vi.fn().mockResolvedValue(undefined),
}));

const run = process.env.CI === 'true' || process.env.RUN_INTEGRATION === 'true';

describe.skipIf(!run)('API integration', () => {
  const app = createApp();
  let userToken: string;
  let adminToken: string;
  const shortCode = `e2e${Date.now().toString(36).slice(-4)}`;

  beforeAll(async () => {
    await prisma.$connect();
    const userLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@shortener.dev', password: 'Password123!' });
    userToken = userLogin.body.data.token;

    const adminLogin = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'admin@shortener.dev', password: 'Password123!' });
    adminToken = adminLogin.body.data.token;
  });

  const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

  describe('Auth', () => {
    it('POST /auth/register', async () => {
      const email = `u${Date.now()}@shortener.dev`;
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email, password: 'Password123!', name: 'New' });
      expect(res.status).toBe(201);
      expect(res.body.data.token).toBeTruthy();
    });

    it('POST /auth/login rejects bad password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'user@shortener.dev', password: 'wrong' });
      expect(res.status).toBe(401);
    });
  });

  describe('Links', () => {
    it('POST /links creates short link', async () => {
      const res = await request(app)
        .post('/api/v1/links')
        .set(bearer(userToken))
        .send({ originalUrl: 'https://example.com', customAlias: shortCode });
      expect(res.status).toBe(201);
      expect(res.body.data.shortCode).toBe(shortCode);
    });

    it('GET /links/:shortCode public', async () => {
      const res = await request(app).get(`/api/v1/links/${shortCode}`);
      expect(res.status).toBe(200);
    });

    it('GET /users/me/links', async () => {
      const res = await request(app)
        .get('/api/v1/users/me/links')
        .set(bearer(userToken));
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    });

    it('GET /redirect/:shortCode', async () => {
      const res = await request(app).get(`/api/v1/redirect/${shortCode}`);
      expect(res.status).toBe(302);
    });

    it('GET /links/:shortCode/stats', async () => {
      const res = await request(app)
        .get(`/api/v1/links/${shortCode}/stats`)
        .set(bearer(userToken));
      expect(res.status).toBe(200);
      expect(res.body.data.totalClicks).toBeGreaterThanOrEqual(1);
    });

    it('GET /links/:shortCode/stats/export', async () => {
      const res = await request(app)
        .get(`/api/v1/links/${shortCode}/stats/export`)
        .query({ format: 'csv' })
        .set(bearer(userToken));
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
    });

    it('GET /qr/:shortCode png', async () => {
      const res = await request(app).get(`/api/v1/qr/${shortCode}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('image/png');
    });

    it('PATCH /links/:shortCode', async () => {
      const res = await request(app)
        .patch(`/api/v1/links/${shortCode}`)
        .set(bearer(userToken))
        .send({ maxClicks: 100 });
      expect(res.status).toBe(200);
    });
  });

  describe('Admin', () => {
    it('GET /admin/links', async () => {
      const res = await request(app).get('/api/v1/admin/links').set(bearer(adminToken));
      expect(res.status).toBe(200);
    });

    it('GET /admin/links forbidden for user', async () => {
      const res = await request(app).get('/api/v1/admin/links').set(bearer(userToken));
      expect(res.status).toBe(403);
    });

    it('PATCH /admin/links/:shortCode/block', async () => {
      const res = await request(app)
        .patch(`/api/v1/admin/links/${shortCode}/block`)
        .set(bearer(adminToken))
        .send({ reason: 'spam test' });
      expect(res.status).toBe(200);
    });

    it('redirect blocked link returns 403', async () => {
      const res = await request(app).get(`/api/v1/redirect/${shortCode}`);
      expect(res.status).toBe(403);
    });
  });

  describe('Rate limit / validation', () => {
    it('POST /links invalid url', async () => {
      const res = await request(app)
        .post('/api/v1/links')
        .send({ originalUrl: 'not-a-url' });
      expect(res.status).toBe(400);
    });
  });
});

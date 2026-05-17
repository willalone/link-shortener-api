import 'dotenv/config';
import { afterAll } from 'vitest';
import { prisma } from '../src/shared/lib/prisma.js';

process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.APP_URL = 'http://localhost:3001';
process.env.SHORT_URL_BASE = 'http://localhost:3001';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
process.env.DATABASE_URL = process.env.DATABASE_URL ?? 'postgresql://x:x@localhost:5433/x';
process.env.REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6380';

afterAll(async () => {
  await prisma.$disconnect();
});

import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/shared/utils/password.js';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hashPassword('Password123!');

  const admin = await prisma.user.upsert({
    where: { email: 'admin@shortener.dev' },
    update: { role: UserRole.ADMIN },
    create: {
      email: 'admin@shortener.dev',
      name: 'Admin',
      passwordHash,
      role: UserRole.ADMIN,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@shortener.dev' },
    update: {},
    create: {
      email: 'user@shortener.dev',
      name: 'Regular User',
      passwordHash,
      role: UserRole.USER,
    },
  });

  await prisma.link.upsert({
    where: { shortCode: 'demo' },
    update: {},
    create: {
      shortCode: 'demo',
      originalUrl: 'https://github.com',
      userId: user.id,
    },
  });

  console.log('Seed completed:', { admin: admin.email, user: user.email });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

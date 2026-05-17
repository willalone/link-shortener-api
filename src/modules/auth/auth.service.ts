import { prisma } from '../../shared/lib/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { comparePassword, hashPassword } from '../../shared/utils/password.js';
import { signToken } from '../../shared/utils/jwt.js';

export class AuthService {
  async register(email: string, password: string, name?: string) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) throw AppError.conflict('Email already registered');

    const user = await prisma.user.create({
      data: { email, passwordHash: await hashPassword(password), name },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return { user, token: signToken(user.id, user.email, user.role) };
  }

  async login(email: string, password: string) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.passwordHash))) {
      throw AppError.unauthorized('Invalid credentials');
    }
    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token: signToken(user.id, user.email, user.role),
    };
  }
}

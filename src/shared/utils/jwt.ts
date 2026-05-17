import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { loadEnv } from '../../config/env.js';

const env = loadEnv();

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export function signToken(userId: string, email: string, role: UserRole): string {
  return jwt.sign({ sub: userId, email, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
}

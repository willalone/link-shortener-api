import type { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { verifyToken } from '../../shared/utils/jwt.js';
import { AppError } from '../../shared/errors/AppError.js';

export interface AuthRequest extends Request {
  user?: { id: string; email: string; role: UserRole };
}

function userFromBearer(header: string | undefined) {
  if (!header?.startsWith('Bearer ')) return undefined;
  try {
    const payload = verifyToken(header.slice(7));
    return { id: payload.sub, email: payload.email, role: payload.role };
  } catch {
    return undefined;
  }
}

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  const user = userFromBearer(req.headers.authorization);
  if (!user) {
    return next(AppError.unauthorized('Missing or invalid token'));
  }
  req.user = user;
  next();
}

export function optionalAuth(req: AuthRequest, _res: Response, next: NextFunction) {
  req.user = userFromBearer(req.headers.authorization);
  next();
}

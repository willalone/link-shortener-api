import { Router } from 'express';
import { z } from 'zod';
import { AuthService } from './auth.service.js';
import { validate } from '../../shared/middleware/validate.js';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';

const auth = new AuthService();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await auth.register(req.body.email, req.body.password, req.body.name);
    res.status(201).json({ success: true, data: result });
  }),
);

authRouter.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await auth.login(req.body.email, req.body.password);
    res.json({ success: true, data: result });
  }),
);

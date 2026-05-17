import { Router } from 'express';
import { LinkService } from '../links/link.service.js';
import { authenticate, type AuthRequest } from '../../shared/middleware/auth.js';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';

const links = new LinkService();
export const usersRouter = Router();

usersRouter.use(authenticate);

usersRouter.get(
  '/me/links',
  asyncHandler(async (req: AuthRequest, res) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await links.listForUser(req.user!.id, page, limit);
    res.json({ success: true, ...result });
  }),
);

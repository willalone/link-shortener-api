import { Router } from 'express';
import { z } from 'zod';
import { AdminService } from './admin.service.js';
import { authenticate, type AuthRequest } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { param } from '../../shared/utils/params.js';

const admin = new AdminService();
export const adminRouter = Router();

adminRouter.use(authenticate);

adminRouter.get(
  '/links',
  asyncHandler(async (req: AuthRequest, res) => {
    admin.requireAdmin(req.user!.role);
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = req.query.search ? String(req.query.search) : undefined;
    const result = await admin.listAllLinks(page, limit, search);
    res.json({ success: true, ...result });
  }),
);

const blockSchema = z.object({ reason: z.string().min(1).max(500) });

adminRouter.patch(
  '/links/:shortCode/block',
  validate(blockSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    admin.requireAdmin(req.user!.role);
    const link = await admin.blockLink(param(req, 'shortCode'), req.body.reason);
    res.json({ success: true, data: link });
  }),
);

adminRouter.patch(
  '/links/:shortCode/unblock',
  asyncHandler(async (req: AuthRequest, res) => {
    admin.requireAdmin(req.user!.role);
    const link = await admin.unblockLink(param(req, 'shortCode'));
    res.json({ success: true, data: link });
  }),
);

adminRouter.post(
  '/links/check',
  validate(z.object({ url: z.string().url() })),
  asyncHandler(async (req: AuthRequest, res) => {
    admin.requireAdmin(req.user!.role);
    const entry = await admin.flagUrl(req.body.url, req.user!.id);
    res.status(202).json({ success: true, data: entry });
  }),
);

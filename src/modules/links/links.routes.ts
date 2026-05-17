import { Router } from 'express';
import { z } from 'zod';
import { LinkService } from './link.service.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { authenticate, optionalAuth, type AuthRequest } from '../../shared/middleware/auth.js';
import { validate } from '../../shared/middleware/validate.js';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { AppError } from '../../shared/errors/AppError.js';
import { param } from '../../shared/utils/params.js';

const links = new LinkService();
const analytics = new AnalyticsService();

const createLinkSchema = z.object({
  originalUrl: z.string().url(),
  customAlias: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
  maxClicks: z.number().int().positive().optional(),
});

const updateLinkSchema = z.object({
  expiresAt: z.coerce.date().nullable().optional(),
  maxClicks: z.number().int().positive().nullable().optional(),
});

export const linksRouter = Router();

linksRouter.post(
  '/',
  optionalAuth,
  validate(createLinkSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip;
    const result = await links.create(
      req.body.originalUrl,
      {
        customAlias: req.body.customAlias,
        expiresAt: req.body.expiresAt,
        maxClicks: req.body.maxClicks,
        userId: req.user?.id,
      },
      ip,
    );
    res.status(201).json({ success: true, data: result });
  }),
);

linksRouter.get(
  '/:shortCode',
  asyncHandler(async (req, res) => {
    const info = await links.getPublic(param(req, 'shortCode'));
    res.json({ success: true, data: info });
  }),
);

linksRouter.use(authenticate);

linksRouter.patch(
  '/:shortCode',
  validate(updateLinkSchema),
  asyncHandler(async (req: AuthRequest, res) => {
    const link = await links.update(
      param(req, 'shortCode'),
      req.user!.id,
      req.body,
      req.user!.role,
    );
    res.json({ success: true, data: link });
  }),
);

linksRouter.delete(
  '/:shortCode',
  asyncHandler(async (req: AuthRequest, res) => {
    const result = await links.deactivate(param(req, 'shortCode'), req.user!.id, req.user!.role);
    res.json({ success: true, data: result });
  }),
);

linksRouter.get(
  '/:shortCode/stats',
  asyncHandler(async (req: AuthRequest, res) => {
    const stats = await analytics.getStats(param(req, 'shortCode'), req.user!.id, req.user!.role);
    res.json({ success: true, data: stats });
  }),
);

linksRouter.get(
  '/:shortCode/stats/export',
  asyncHandler(async (req: AuthRequest, res) => {
    const format = String(req.query.format ?? 'csv');
    if (format !== 'csv') {
      throw AppError.badRequest('Only csv export is supported');
    }
    const csv = await analytics.exportCsv(param(req, 'shortCode'), req.user!.id, req.user!.role);
    const shortCode = param(req, 'shortCode');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="clicks-${shortCode}.csv"`);
    res.send(csv);
  }),
);

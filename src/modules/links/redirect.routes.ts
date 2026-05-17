import { Router } from 'express';
import { LinkService } from './link.service.js';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { param } from '../../shared/utils/params.js';

const links = new LinkService();
export const redirectRouter = Router();

redirectRouter.get(
  '/:shortCode',
  asyncHandler(async (req, res) => {
    const url = await links.redirect(param(req, 'shortCode'), {
      ip: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip,
      userAgent: req.headers['user-agent'],
      referer: req.headers.referer,
    });
    res.set('Cache-Control', 'public, max-age=300');
    res.redirect(302, url);
  }),
);

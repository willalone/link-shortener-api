import { Router } from 'express';
import QRCode from 'qrcode';
import { loadEnv } from '../../config/env.js';
import { LinkService } from './link.service.js';
import { optionalAuth, type AuthRequest } from '../../shared/middleware/auth.js';
import { asyncHandler } from '../../shared/middleware/asyncHandler.js';
import { AppError } from '../../shared/errors/AppError.js';
import { param } from '../../shared/utils/params.js';

const env = loadEnv();
const links = new LinkService();
export const qrRouter = Router();

qrRouter.get(
  '/:shortCode',
  optionalAuth,
  asyncHandler(async (req: AuthRequest, res) => {
    const shortCode = param(req, 'shortCode');
    const link = await links.findByShortCode(shortCode);

    if (req.user && link.userId && link.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw AppError.forbidden();
    }

    const shortUrl = `${env.SHORT_URL_BASE}/${shortCode}`;
    const format = String(req.query.format ?? 'png');

    if (format === 'svg') {
      const svg = await QRCode.toString(shortUrl, { type: 'svg' });
      res.type('image/svg+xml');
      return res.send(svg);
    }

    const buffer = await QRCode.toBuffer(shortUrl);
    res.type('image/png');
    res.send(buffer);
  }),
);

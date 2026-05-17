import { UserRole } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma.js';
import { invalidateLinkCache } from '../../shared/lib/redis.js';
import { AppError } from '../../shared/errors/AppError.js';
import { logger } from '../../shared/lib/logger.js';
import { parsePagination, paginatedResponse } from '../../shared/utils/pagination.js';

export class AdminService {
  requireAdmin(role: UserRole) {
    if (role !== UserRole.ADMIN) throw AppError.forbidden('Admin access required');
  }

  async listAllLinks(page = 1, limit = 20, search?: string) {
    const { page: p, limit: l, skip } = parsePagination({ page, limit });
    const where = search
      ? {
          OR: [
            { shortCode: { contains: search, mode: 'insensitive' as const } },
            { originalUrl: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [links, total] = await Promise.all([
      prisma.link.findMany({
        where,
        skip,
        take: l,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, email: true } } },
      }),
      prisma.link.count({ where }),
    ]);
    return paginatedResponse(links, total, p, l);
  }

  async blockLink(shortCode: string, reason: string) {
    const link = await prisma.link.update({
      where: { shortCode },
      data: { isActive: false, blockReason: reason },
    });
    await invalidateLinkCache(shortCode);
    return link;
  }

  async unblockLink(shortCode: string) {
    const link = await prisma.link.update({
      where: { shortCode },
      data: { isActive: true, blockReason: null },
    });
    await invalidateLinkCache(shortCode);
    return link;
  }

  async flagUrl(url: string, adminId: string) {
    logger.info({ url, adminId }, 'URL flagged for review');
    return { url, status: 'queued' as const };
  }
}

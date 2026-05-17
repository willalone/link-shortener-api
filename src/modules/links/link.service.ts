import { UserRole } from '@prisma/client';
import validator from 'validator';
import { prisma } from '../../shared/lib/prisma.js';
import { redis, linkCacheKey, ipCreateKey } from '../../shared/lib/redis.js';
import { loadEnv } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { generateShortCode, isValidShortCode } from '../../shared/utils/alias.js';
import { checkUrlReachable } from './urlCheck.service.js';
import { enqueueClick } from '../queue/click.queue.js';
import { parsePagination, paginatedResponse } from '../../shared/utils/pagination.js';

const env = loadEnv();

interface CachedLink {
  id: string;
  originalUrl: string;
  isActive: boolean;
  expiresAt: string | null;
  maxClicks: number | null;
  clickCount: number;
}

export class LinkService {
  private formatResponse(link: {
    shortCode: string;
    originalUrl: string;
    expiresAt: Date | null;
    maxClicks: number | null;
    createdAt: Date;
  }) {
    return {
      shortCode: link.shortCode,
      shortUrl: `${env.SHORT_URL_BASE}/${link.shortCode}`,
      originalUrl: link.originalUrl,
      expiresAt: link.expiresAt,
      maxClicks: link.maxClicks,
      createdAt: link.createdAt,
    };
  }

  async create(
    originalUrl: string,
    options: {
      customAlias?: string;
      expiresAt?: Date;
      maxClicks?: number;
      userId?: string;
    },
    clientIp?: string,
  ) {
    if (!validator.isURL(originalUrl, { require_protocol: true })) {
      throw AppError.badRequest('URL must use http or https');
    }

    if (clientIp) {
      const key = ipCreateKey(clientIp);
      const count = await redis.incr(key);
      if (count === 1) await redis.expire(key, 3600);
      if (count > env.CREATE_LINK_IP_LIMIT) {
        throw AppError.badRequest('Too many links created from this IP. Try again later.');
      }
    }

    const shortCode = options.customAlias ?? generateShortCode();
    if (!isValidShortCode(shortCode)) {
      throw AppError.badRequest('Invalid short code format');
    }

    const existing = await prisma.link.findUnique({ where: { shortCode } });
    if (existing) throw AppError.conflict('Short code already taken');

    const urlCheck = await checkUrlReachable(originalUrl);

    const link = await prisma.link.create({
      data: {
        shortCode,
        originalUrl,
        userId: options.userId,
        expiresAt: options.expiresAt,
        maxClicks: options.maxClicks,
      },
    });

    await this.cacheLink(link);

    return {
      ...this.formatResponse(link),
      urlWarning: urlCheck.reachable ? undefined : 'Target URL may be unreachable',
    };
  }

  async cacheLink(link: {
    id: string;
    shortCode: string;
    originalUrl: string;
    isActive: boolean;
    expiresAt: Date | null;
    maxClicks: number | null;
    clickCount: number;
  }) {
    const payload: CachedLink = {
      id: link.id,
      originalUrl: link.originalUrl,
      isActive: link.isActive,
      expiresAt: link.expiresAt?.toISOString() ?? null,
      maxClicks: link.maxClicks,
      clickCount: link.clickCount,
    };
    await redis.setex(linkCacheKey(link.shortCode), env.CACHE_TTL_SECONDS, JSON.stringify(payload));
  }

  async getPublic(shortCode: string) {
    const link = await prisma.link.findUnique({
      where: { shortCode },
      select: {
        shortCode: true,
        originalUrl: true,
        expiresAt: true,
        maxClicks: true,
        clickCount: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!link || !link.isActive) throw AppError.notFound('Link not found');
    return {
      shortCode: link.shortCode,
      shortUrl: `${env.SHORT_URL_BASE}/${link.shortCode}`,
      originalUrl: link.originalUrl,
      expiresAt: link.expiresAt,
      maxClicks: link.maxClicks,
      clickCount: link.clickCount,
      createdAt: link.createdAt,
    };
  }

  private async resolveCached(shortCode: string): Promise<CachedLink> {
    const cached = await redis.get(linkCacheKey(shortCode));
    if (cached) return JSON.parse(cached) as CachedLink;

    const dbLink = await prisma.link.findUnique({ where: { shortCode } });
    if (!dbLink) throw AppError.notFound('Short link not found');

    const payload: CachedLink = {
      id: dbLink.id,
      originalUrl: dbLink.originalUrl,
      isActive: dbLink.isActive,
      expiresAt: dbLink.expiresAt?.toISOString() ?? null,
      maxClicks: dbLink.maxClicks,
      clickCount: dbLink.clickCount,
    };
    await redis.setex(linkCacheKey(shortCode), env.CACHE_TTL_SECONDS, JSON.stringify(payload));
    return payload;
  }

  private validateLinkActive(link: CachedLink) {
    if (!link.isActive) throw AppError.forbidden('This link has been blocked');
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      throw AppError.gone('Link has expired');
    }
    if (link.maxClicks != null && link.clickCount >= link.maxClicks) {
      throw AppError.gone('Link has reached maximum clicks');
    }
  }

  async redirect(shortCode: string, meta: { ip?: string; userAgent?: string; referer?: string }) {
    const link = await this.resolveCached(shortCode);
    this.validateLinkActive(link);

    const updated = await prisma.link.update({
      where: { id: link.id },
      data: { clickCount: { increment: 1 } },
    });

    link.clickCount = updated.clickCount;
    await redis.setex(linkCacheKey(shortCode), env.CACHE_TTL_SECONDS, JSON.stringify(link));

    await enqueueClick({
      linkId: link.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
      referer: meta.referer,
    });

    return link.originalUrl;
  }

  async listForUser(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [links, total] = await Promise.all([
      prisma.link.findMany({
        where: { userId, isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.link.count({ where: { userId, isActive: true } }),
    ]);
    return paginatedResponse(
      links.map((l) => ({ ...this.formatResponse(l), clickCount: l.clickCount })),
      total,
      page,
      limit,
    );
  }

  async update(
    shortCode: string,
    userId: string,
    data: { expiresAt?: Date | null; maxClicks?: number | null },
    role: UserRole = UserRole.USER,
  ) {
    const link = await prisma.link.findUnique({ where: { shortCode } });
    if (!link || !link.isActive) throw AppError.notFound('Link not found');
    if (role !== UserRole.ADMIN && link.userId !== userId) throw AppError.forbidden();

    const updated = await prisma.link.update({
      where: { shortCode },
      data: {
        expiresAt: data.expiresAt,
        maxClicks: data.maxClicks,
      },
    });
    await redis.del(linkCacheKey(shortCode));
    await this.cacheLink(updated);
    return this.formatResponse(updated);
  }

  async deactivate(shortCode: string, userId: string, role: UserRole = UserRole.USER) {
    const link = await prisma.link.findUnique({ where: { shortCode } });
    if (!link) throw AppError.notFound('Link not found');
    if (role !== UserRole.ADMIN && link.userId !== userId) throw AppError.forbidden();

    const updated = await prisma.link.update({
      where: { shortCode },
      data: { isActive: false },
    });
    await redis.del(linkCacheKey(shortCode));
    return { success: true, shortCode: updated.shortCode };
  }

  async findByShortCode(shortCode: string) {
    const link = await prisma.link.findUnique({ where: { shortCode } });
    if (!link) throw AppError.notFound('Link not found');
    return link;
  }
}

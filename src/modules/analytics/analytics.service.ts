import { UserRole } from '@prisma/client';
import { prisma } from '../../shared/lib/prisma.js';
import { AppError } from '../../shared/errors/AppError.js';
import { LinkService } from '../links/link.service.js';

export class AnalyticsService {
  private linkService = new LinkService();

  private async assertAccess(shortCode: string, userId: string, role: UserRole) {
    const link = await this.linkService.findByShortCode(shortCode);
    if (role !== UserRole.ADMIN && link.userId !== userId) {
      throw AppError.forbidden();
    }
    return link;
  }

  async getStats(shortCode: string, userId: string, role: UserRole) {
    const link = await this.assertAccess(shortCode, userId, role);

    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const [clicks, topReferers, topCountries] = await Promise.all([
      prisma.click.findMany({
        where: { linkId: link.id, clickedAt: { gte: since30 } },
        select: { clickedAt: true },
      }),
      prisma.click.groupBy({
        by: ['referer'],
        where: { linkId: link.id, referer: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      prisma.click.groupBy({
        by: ['country'],
        where: { linkId: link.id, country: { not: null } },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
    ]);

    const clicksByDay = this.aggregateByDay(clicks, 30);

    return {
      shortCode: link.shortCode,
      totalClicks: link.clickCount,
      clicksByDay,
      topReferrers: topReferers.map((r) => ({
        referer: r.referer ?? 'direct',
        count: r._count.id,
      })),
      topCountries: topCountries.map((c) => ({
        country: c.country ?? 'unknown',
        count: c._count.id,
      })),
    };
  }

  private aggregateByDay(clicks: { clickedAt: Date }[], days: number) {
    const map = new Map<string, number>();
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      map.set(d.toISOString().slice(0, 10), 0);
    }
    for (const click of clicks) {
      const key = click.clickedAt.toISOString().slice(0, 10);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async exportCsv(shortCode: string, userId: string, role: UserRole): Promise<string> {
    const link = await this.assertAccess(shortCode, userId, role);

    const clicks = await prisma.click.findMany({
      where: { linkId: link.id },
      orderBy: { clickedAt: 'desc' },
      take: 10_000,
    });

    const header = 'timestamp,ip,userAgent,referer,country\n';
    const rows = clicks
      .map(
        (c) =>
          `${c.clickedAt.toISOString()},${c.ip ?? ''},${JSON.stringify(c.userAgent ?? '')},${JSON.stringify(c.referer ?? '')},${c.country ?? ''}`,
      )
      .join('\n');

    return header + rows;
  }
}

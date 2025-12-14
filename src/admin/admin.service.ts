import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { AuditLog } from '../entities/audit-log.entity';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Trip } from '../entities/trip.entity';
import { Route } from '../entities/route.entity';
import { 
  AnalyticsQueryDto, 
  AnalyticsTimeframe, 
  BookingSummaryDto, 
  BookingTrendsDto, 
  RouteAnalyticsDto, 
  ConversionAnalyticsDto,
  BookingTrendDataPoint,
  RoutePerformanceDto,
  ConversionFunnelStep
} from './dto/analytics.dto';
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, subWeeks, subMonths, format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private usersRepository: Repository<User>,
    @InjectRepository(AuditLog) private auditRepository: Repository<AuditLog>,
    @InjectRepository(Booking) private bookingsRepository: Repository<Booking>,
    @InjectRepository(Trip) private tripsRepository: Repository<Trip>,
    @InjectRepository(Route) private routesRepository: Repository<Route>,
  ) {}

  async findAllUsers() {
    const users = await this.usersRepository.find();

    const sanitized = users.map((u) => ({
      userId: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
    }));

    return sanitized;
  }

  async updateUserRole(userId: string, newRole: string, actorId?: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    user.role = newRole as UserRole;
    await this.usersRepository.save(user);

    await this.auditRepository.save({
      actorId,
      targetUserId: userId,
      action: 'CHANGE_ROLE',
      details: `role -> ${newRole}`,
      metadata: { by: actorId, at: new Date().toISOString() },
    });

    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }

  // Analytics Methods
  private getDateRange(query: AnalyticsQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = endOfDay(now);

    if (query.startDate && query.endDate) {
      startDate = startOfDay(new Date(query.startDate));
      endDate = endOfDay(new Date(query.endDate));
    } else {
      switch (query.timeframe || AnalyticsTimeframe.MONTHLY) {
        case AnalyticsTimeframe.DAILY:
          startDate = startOfDay(now);
          break;
        case AnalyticsTimeframe.WEEKLY:
          startDate = startOfWeek(now);
          endDate = endOfWeek(now);
          break;
        case AnalyticsTimeframe.QUARTERLY:
          startDate = startOfMonth(subMonths(now, 3));
          break;
        case AnalyticsTimeframe.YEARLY:
          startDate = startOfMonth(subMonths(now, 12));
          break;
        default: // MONTHLY
          startDate = startOfMonth(subMonths(now, 1));
          break;
      }
    }

    return { startDate, endDate };
  }

  async getBookingsSummary(query: AnalyticsQueryDto): Promise<BookingSummaryDto> {
    const { startDate, endDate } = this.getDateRange(query);

    const bookings = await this.bookingsRepository.find({
      where: {
        bookedAt: Between(startDate, endDate),
      },
      relations: ['trip'],
    });

    const totalBookings = bookings.length;
    const paidBookings = bookings.filter(b => b.status === BookingStatus.PAID).length;
    const pendingBookings = bookings.filter(b => b.status === BookingStatus.PENDING).length;
    const cancelledBookings = bookings.filter(b => b.status === BookingStatus.CANCELLED).length;
    const expiredBookings = bookings.filter(b => b.status === BookingStatus.EXPIRED).length;

    const totalRevenue = bookings
      .filter(b => b.status === BookingStatus.PAID)
      .reduce((sum, b) => sum + b.totalAmount, 0);

    const averageBookingValue = paidBookings > 0 ? totalRevenue / paidBookings : 0;
    const conversionRate = totalBookings > 0 ? (paidBookings / totalBookings) * 100 : 0;

    return {
      totalBookings,
      paidBookings,
      pendingBookings,
      cancelledBookings,
      expiredBookings,
      totalRevenue,
      averageBookingValue,
      conversionRate,
      period: {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      },
    };
  }

  async getBookingsTrends(query: AnalyticsQueryDto): Promise<BookingTrendsDto> {
    const { startDate, endDate } = this.getDateRange(query);
    const timeframe = query.timeframe || AnalyticsTimeframe.DAILY;

    let intervals: Date[];
    let dateFormat: string;

    switch (timeframe) {
      case AnalyticsTimeframe.DAILY:
        intervals = eachDayOfInterval({ start: startDate, end: endDate });
        dateFormat = 'yyyy-MM-dd';
        break;
      case AnalyticsTimeframe.WEEKLY:
        intervals = eachWeekOfInterval({ start: startDate, end: endDate });
        dateFormat = 'yyyy-MM-dd';
        break;
      case AnalyticsTimeframe.MONTHLY:
        intervals = eachMonthOfInterval({ start: startDate, end: endDate });
        dateFormat = 'yyyy-MM';
        break;
      default:
        intervals = eachDayOfInterval({ start: startDate, end: endDate });
        dateFormat = 'yyyy-MM-dd';
    }

    const data: BookingTrendDataPoint[] = [];
    let totalBookings = 0;
    let totalRevenue = 0;
    let totalConversionRate = 0;

    for (const interval of intervals) {
      let intervalStart: Date;
      let intervalEnd: Date;

      if (timeframe === AnalyticsTimeframe.WEEKLY) {
        intervalStart = startOfWeek(interval);
        intervalEnd = endOfWeek(interval);
      } else if (timeframe === AnalyticsTimeframe.MONTHLY) {
        intervalStart = startOfMonth(interval);
        intervalEnd = endOfMonth(interval);
      } else {
        intervalStart = startOfDay(interval);
        intervalEnd = endOfDay(interval);
      }

      const bookings = await this.bookingsRepository.find({
        where: {
          bookedAt: Between(intervalStart, intervalEnd),
        },
      });

      const intervalBookings = bookings.length;
      const paidBookings = bookings.filter(b => b.status === BookingStatus.PAID).length;
      const revenue = bookings
        .filter(b => b.status === BookingStatus.PAID)
        .reduce((sum, b) => sum + b.totalAmount, 0);
      const conversionRate = intervalBookings > 0 ? (paidBookings / intervalBookings) * 100 : 0;

      data.push({
        date: format(interval, dateFormat),
        bookings: intervalBookings,
        revenue,
        conversionRate,
      });

      totalBookings += intervalBookings;
      totalRevenue += revenue;
      totalConversionRate += conversionRate;
    }

    const averageConversionRate = data.length > 0 ? totalConversionRate / data.length : 0;
    const growthRate = this.calculateGrowthRate(data);

    return {
      timeframe,
      data,
      period: {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      },
      summary: {
        totalBookings,
        totalRevenue,
        averageConversionRate,
        growthRate,
      },
    };
  }

  async getRouteAnalytics(query: AnalyticsQueryDto): Promise<RouteAnalyticsDto> {
    const { startDate, endDate } = this.getDateRange(query);

    const bookings = await this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.trip', 'trip')
      .leftJoinAndSelect('trip.route', 'route')
      .where('booking.bookedAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .getMany();

    const routeStats = new Map<string, {
      route: Route;
      totalBookings: number;
      totalRevenue: number;
      paidBookings: number;
    }>();

    for (const booking of bookings) {
      const routeId = booking.trip?.route?.id;
      if (!routeId || !booking.trip?.route) continue;

      if (!routeStats.has(routeId)) {
        routeStats.set(routeId, {
          route: booking.trip.route,
          totalBookings: 0,
          totalRevenue: 0,
          paidBookings: 0,
        });
      }

      const stats = routeStats.get(routeId)!;
      stats.totalBookings++;
      if (booking.status === BookingStatus.PAID) {
        stats.totalRevenue += booking.totalAmount;
        stats.paidBookings++;
      }
    }

    const totalRevenue = Array.from(routeStats.values())
      .reduce((sum, stats) => sum + stats.totalRevenue, 0);

    const routes: RoutePerformanceDto[] = Array.from(routeStats.entries())
      .map(([routeId, stats], index) => ({
        route: {
          id: stats.route.id,
          name: stats.route.name,
          origin: stats.route.origin,
          destination: stats.route.destination,
        },
        totalBookings: stats.totalBookings,
        totalRevenue: stats.totalRevenue,
        averageBookingValue: stats.paidBookings > 0 ? stats.totalRevenue / stats.paidBookings : 0,
        conversionRate: stats.totalBookings > 0 ? (stats.paidBookings / stats.totalBookings) * 100 : 0,
        popularityRank: index + 1,
        revenuePercentage: totalRevenue > 0 ? (stats.totalRevenue / totalRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue)
      .map((route, index) => ({ ...route, popularityRank: index + 1 }));

    return {
      routes,
      period: {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      },
      summary: {
        totalRoutes: routes.length,
        topPerformingRoute: routes[0] || null,
        lowestPerformingRoute: routes[routes.length - 1] || null,
      },
    };
  }

  async getConversionAnalytics(query: AnalyticsQueryDto): Promise<ConversionAnalyticsDto> {
    const { startDate, endDate } = this.getDateRange(query);

    // Simulate conversion funnel steps
    // In a real implementation, you'd track user interactions
    const allBookings = await this.bookingsRepository.find({
      where: {
        bookedAt: Between(startDate, endDate),
      },
    });

    const totalBookings = allBookings.length;
    const paidBookings = allBookings.filter(b => b.status === BookingStatus.PAID).length;
    const pendingBookings = allBookings.filter(b => b.status === BookingStatus.PENDING).length;
    const cancelledBookings = allBookings.filter(b => b.status === BookingStatus.CANCELLED).length;

    // Simulate funnel data
    const visitorsToSearch = Math.floor(totalBookings * 2.5); // Assume 2.5x visitors than bookings
    const searchToSelection = totalBookings + pendingBookings + cancelledBookings;
    const selectionToBooking = totalBookings;
    const bookingToPayment = paidBookings;

    const funnel: ConversionFunnelStep[] = [
      {
        step: 'Visitors',
        count: visitorsToSearch,
        conversionRate: 100,
        dropOffRate: 0,
      },
      {
        step: 'Search Results',
        count: searchToSelection,
        conversionRate: (searchToSelection / visitorsToSearch) * 100,
        dropOffRate: ((visitorsToSearch - searchToSelection) / visitorsToSearch) * 100,
      },
      {
        step: 'Route Selection',
        count: selectionToBooking,
        conversionRate: (selectionToBooking / searchToSelection) * 100,
        dropOffRate: ((searchToSelection - selectionToBooking) / searchToSelection) * 100,
      },
      {
        step: 'Booking Initiated',
        count: bookingToPayment,
        conversionRate: (bookingToPayment / selectionToBooking) * 100,
        dropOffRate: ((selectionToBooking - bookingToPayment) / selectionToBooking) * 100,
      },
    ];

    const overallConversionRate = visitorsToSearch > 0 ? (bookingToPayment / visitorsToSearch) * 100 : 0;
    
    // Find biggest drop-off
    const biggestDropOff = funnel
      .slice(1)
      .reduce((max, step) => step.dropOffRate > max.dropOffRate ? step : max);

    const improvementOpportunities: string[] = [];
    if (biggestDropOff.dropOffRate > 50) {
      improvementOpportunities.push(`High drop-off at ${biggestDropOff.step} (${biggestDropOff.dropOffRate.toFixed(1)}%)`);
    }
    if (overallConversionRate < 10) {
      improvementOpportunities.push('Overall conversion rate is below industry average');
    }

    return {
      funnel,
      overallConversionRate,
      period: {
        startDate: format(startDate, 'yyyy-MM-dd'),
        endDate: format(endDate, 'yyyy-MM-dd'),
      },
      insights: {
        biggestDropOff: `${biggestDropOff.step} (${biggestDropOff.dropOffRate.toFixed(1)}% drop-off)`,
        improvementOpportunities,
      },
    };
  }

  private calculateGrowthRate(data: BookingTrendDataPoint[]): number {
    if (data.length < 2) return 0;
    
    const firstPeriod = data[0];
    const lastPeriod = data[data.length - 1];
    
    if (firstPeriod.revenue === 0) return 0;
    
    return ((lastPeriod.revenue - firstPeriod.revenue) / firstPeriod.revenue) * 100;
  }
}

import { IsOptional, IsDateString, IsEnum } from 'class-validator';

export enum AnalyticsTimeframe {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly'
}

export class AnalyticsQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(AnalyticsTimeframe)
  timeframe?: AnalyticsTimeframe;
}

// Response DTOs
export interface BookingSummaryDto {
  totalBookings: number;
  paidBookings: number;
  pendingBookings: number;
  cancelledBookings: number;
  expiredBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  conversionRate: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface BookingTrendDataPoint {
  date: string;
  bookings: number;
  revenue: number;
  conversionRate: number;
}

export interface BookingTrendsDto {
  timeframe: AnalyticsTimeframe;
  data: BookingTrendDataPoint[];
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalBookings: number;
    totalRevenue: number;
    averageConversionRate: number;
    growthRate: number;
  };
}

export interface RoutePerformanceDto {
  route: {
    id: string;
    name: string;
    origin: string;
    destination: string;
  };
  totalBookings: number;
  totalRevenue: number;
  averageBookingValue: number;
  conversionRate: number;
  popularityRank: number;
  revenuePercentage: number;
}

export interface RouteAnalyticsDto {
  routes: RoutePerformanceDto[];
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRoutes: number;
    topPerformingRoute: RoutePerformanceDto | null;
    lowestPerformingRoute: RoutePerformanceDto | null;
  };
}

export interface ConversionFunnelStep {
  step: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface ConversionAnalyticsDto {
  funnel: ConversionFunnelStep[];
  overallConversionRate: number;
  period: {
    startDate: string;
    endDate: string;
  };
  insights: {
    biggestDropOff: string;
    improvementOpportunities: string[];
  };
}
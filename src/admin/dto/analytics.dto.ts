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
  completedBookings: number;
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

export interface BookingGrowthDto {
  currentPeriod: {
    totalBookings: number;
    revenue: number;
    period: string;
  };
  previousPeriod: {
    totalBookings: number;
    revenue: number;
    period: string;
  };
  growth: {
    bookingsGrowthRate: number;
    revenueGrowthRate: number;
    bookingsGrowthAbsolute: number;
    revenueGrowthAbsolute: number;
  };
  dailyGrowth: {
    date: string;
    bookings: number;
    growth: number;
  }[];
}

export interface PopularRoutesDto {
  routes: {
    route: {
      id: string;
      name: string;
      origin: string;
      destination: string;
    };
    bookingsCount: number;
    revenue: number;
    averagePrice: number;
    marketShare: number;
    rank: number;
    trend: 'up' | 'down' | 'stable';
  }[];
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalRoutes: number;
    topRoute: string;
    totalBookings: number;
  };
}

export interface SeatOccupancyDto {
  overall: {
    totalSeats: number;
    occupiedSeats: number;
    occupancyRate: number;
  };
  byRoute: {
    routeId: string;
    routeName: string;
    totalSeats: number;
    occupiedSeats: number;
    occupancyRate: number;
  }[];
  byTimeframe: {
    date: string;
    totalSeats: number;
    occupiedSeats: number;
    occupancyRate: number;
  }[];
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface PaymentMethodStats {
  provider: string;
  count: number;
  totalAmount: number;
  percentage: number;
}

export interface PaymentMethodAnalyticsDto {
  methods: PaymentMethodStats[];
  totalTransactions: number;
  totalRevenue: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

export interface DetailedConversionDto {
  searchToBooking: {
    searches: number;
    bookingAttempts: number;
    conversionRate: number;
  };
  bookingToPaid: {
    totalBookings: number;
    paidBookings: number;
    conversionRate: number;
  };
  overallConversion: {
    searches: number;
    paidBookings: number;
    conversionRate: number;
  };
  funnel: {
    step: string;
    count: number;
    conversionFromPrevious: number;
    conversionFromStart: number;
  }[];
  period: {
    startDate: string;
    endDate: string;
  };
}
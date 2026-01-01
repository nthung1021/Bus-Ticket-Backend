import {
  Controller,
  Patch,
  Get,
  UseGuards,
  Param,
  Body,
  Req,
  Query,
  Post,
} from '@nestjs/common';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { RolesGuard } from '../auth/roles/roles.guard';
import { ChangeRoleDto } from './dto/change-role.dto';
import { AdminCreateAccountDto } from './dto/create-account.dto';
import { AnalyticsQueryDto } from './dto/analytics.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles('admin')
  @Get('stats')
  getAdminStats() {}

  @Roles('admin')
  @Get('users')
  async getAllUsers() {
    return await this.adminService.findAllUsers();
  }

  @Roles('admin')
  @Patch('users/:userId/role')
  async changeUserRole(
    @Param('userId') userId: string,
    @Body() body: ChangeRoleDto,
    @Req() req: Request & { user?: { sub?: string } },
  ) {
    const actorId = req.user?.sub;
    const updated = await this.adminService.updateUserRole(
      userId,
      body.role,
      actorId,
    );
    return { ok: true, updated };
  }

  @Roles('admin')
  @Post('account')
  async createAccount(
    @Body() body: AdminCreateAccountDto,
    @Req() req: Request & { user?: { sub?: string } },
  ) {
    const actorId = req.user?.sub;
    const user = await this.adminService.createAccount(body, actorId);
    return {
      success: true,
      message: 'Account created successfully',
      data: user,
    };
  }

  // Analytics Endpoints
  @Roles('admin')
  @Get('analytics/bookings/summary')
  async getBookingsSummary(@Query() query: AnalyticsQueryDto) {
    return await this.adminService.getBookingsSummary(query);
  }

  @Roles('admin')
  @Get('analytics/bookings/trends')
  async getBookingsTrends(@Query() query: AnalyticsQueryDto) {
    return await this.adminService.getBookingsTrends(query);
  }

  @Roles('admin')
  @Get('analytics/bookings/routes')
  async getRouteAnalytics(@Query() query: AnalyticsQueryDto) {
    return await this.adminService.getRouteAnalytics(query);
  }

  @Roles('admin')
  @Get('analytics/conversion')
  async getConversionAnalytics(@Query() query: AnalyticsQueryDto) {
    return await this.adminService.getConversionAnalytics(query);
  }

  // D1.2 Metrics Calculation Endpoints
  @Roles('admin')
  @Get('analytics/metrics/total-bookings')
  async getTotalBookingsCount(@Query() query: AnalyticsQueryDto) {
    return await this.adminService.getTotalBookingsCount(query);
  }

  @Roles('admin')
  @Get('analytics/metrics/booking-growth')
  async getBookingGrowth(@Query() query: AnalyticsQueryDto) {
    return await this.adminService.getBookingGrowth(query);
  }

  @Roles('admin')
  @Get('analytics/metrics/popular-routes')
  async getMostPopularRoutes(@Query() query: AnalyticsQueryDto) {
    return await this.adminService.getMostPopularRoutes(query);
  }

  @Roles('admin')
  @Get('analytics/metrics/seat-occupancy')
  async getSeatOccupancyRate(@Query() query: AnalyticsQueryDto) {
    return await this.adminService.getSeatOccupancyRate(query);
  }

  @Roles('admin')
  @Get('analytics/metrics/conversion-detailed')
  async getDetailedConversionRate(@Query() query: AnalyticsQueryDto) {
    return await this.adminService.getDetailedConversionRate(query);
  }
}

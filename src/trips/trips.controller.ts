// src/trips/trips.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Query,
  BadRequestException,
  Param,
  NotFoundException,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { Trip } from '../entities/trip.entity';
import { TripsService } from './trips.service';
import { PayosService } from '../payos/payos.service';
import { SearchTripsDto } from './dto/search-trips.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { AssignBusDto, CheckAvailabilityDto, ScheduleQueryDto } from './dto/assign-bus.dto';

@Controller('trips')
export class TripsController {
  constructor(
    private readonly tripsService: TripsService,
    private readonly payosService: PayosService,
  ) { }

  // User - Searching trips and get detail trip info

  @Get('search')
  async search(@Query() query: any) {
    // validate DTO (Nest can validate automatically if ValidationPipe enabled;
    // this is explicit if you don't use global pipe)
    const dto = plainToInstance(SearchTripsDto, query);
    // optional: await validateOrReject(dto);

    // Basic required param check (the DTO has types, but keep friendly error)
    if (!dto.origin || !dto.destination) {
      throw new BadRequestException('origin and destination are required');
    }

    const result = await this.tripsService.search(dto);
    return {
      success: true,
      data: result.data,
      pagination: result.pagination,
    };
  }

  @Get(':tripId')
  async getTripById(
    @Param('tripId') tripId: string
  ) {
    const result = await this.tripsService.getTripById(tripId);

    if (!result) {
      throw new NotFoundException({
        success: false,
        error: { code: 'TRIP_001', message: 'trip not found' },
        timestamp: new Date().toISOString(),
      });
    }

    return {
      success: true,
      data: result,
      message: 'trip details retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }

  // Admin - internal CRUD & scheduling endpoints (merged from TripController) =====

  @Post()
  async create(@Body() createTripDto: CreateTripDto): Promise<Trip> {
    try {
      return await this.tripsService.create(createTripDto);
    } catch (err: any) {
      if (err && err.getStatus && typeof err.getStatus === 'function') {
        throw err;
      }
      throw new (require('@nestjs/common').InternalServerErrorException)({ message: err?.message || 'Failed to create trip' });
    }
  }

  @Get()
  findAll(@Query('deleted') deleted?: string): Promise<Trip[]> {
    const includeDeleted = deleted === 'true';
    return this.tripsService.findAll(includeDeleted);
  }

  // Refund payments for a trip and mark it deleted (admin)
  @Post(':id/refund')
  async refundAndDelete(@Param('id') id: string) {
    try {
      const refunds = await this.payosService.refundPaymentsByTrip(id);
      await this.tripsService.softDelete(id);

      return { success: true, refunds };
    } catch (err: any) {
      if (err && err.getStatus && typeof err.getStatus === 'function') {
        throw err;
      }
      throw new (require('@nestjs/common').InternalServerErrorException)({ message: err?.message || 'Failed to refund and delete trip' });
    }
  }

  @Get('admin/:id')
  findOne(@Param('id') id: string): Promise<Trip> {
    return this.tripsService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() updateTripDto: UpdateTripDto): Promise<Trip> {
    try {
      return await this.tripsService.update(id, updateTripDto);
    } catch (err: any) {
      if (err && err.getStatus && typeof err.getStatus === 'function') {
        throw err;
      }
      throw new (require('@nestjs/common').InternalServerErrorException)({ message: err?.message || 'Failed to update trip' });
    }
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    try {
      return await this.tripsService.remove(id);
    } catch (err: any) {
      if (err && err.getStatus && typeof err.getStatus === 'function') {
        throw err;
      }
      throw new (require('@nestjs/common').InternalServerErrorException)({ message: err?.message || 'Failed to remove trip' });
    }
  }

  // Get available buses for a specific time slot
  @Get('available-buses')
  async getAvailableBuses(
    @Query() query: CheckAvailabilityDto,
  ): Promise<string[]> {
    const { departureTime, arrivalTime } = query;

    if (!departureTime || !arrivalTime) {
      throw new BadRequestException('Both departureTime and arrivalTime are required');
    }

    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);

    if (isNaN(departure.getTime()) || isNaN(arrival.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format');
    }

    if (departure >= arrival) {
      throw new BadRequestException('Departure time must be before arrival time');
    }

    return this.tripsService.getAvailableBuses(departure, arrival);
  }

  // Get bus schedule for a specific date range
  @Get('bus/:busId/schedule')
  async getBusSchedule(
    @Param('busId') busId: string,
    @Query() query: ScheduleQueryDto,
  ): Promise<Trip[]> {
    const { startDate, endDate } = query;

    if (!startDate || !endDate) {
      throw new BadRequestException('Both startDate and endDate are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format');
    }

    if (start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    return this.tripsService.getBusSchedule(busId, start, end);
  }

  // Get route schedule for a specific date range
  @Get('route/:routeId/schedule')
  async getRouteSchedule(
    @Param('routeId') routeId: string,
    @Query() query: ScheduleQueryDto,
  ): Promise<Trip[]> {
    const { startDate, endDate } = query;

    if (!startDate || !endDate) {
      throw new BadRequestException('Both startDate and endDate are required');
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format');
    }

    if (start >= end) {
      throw new BadRequestException('Start date must be before end date');
    }

    return this.tripsService.getRouteSchedule(routeId, start, end);
  }

  // Admin: list payments for a trip
  @Get(':id/payments')
  async getPayments(@Param('id') id: string) {
    try {
      const payments = await this.payosService.getPaymentsByTrip(id);
      return { success: true, data: payments };
    } catch (err: any) {
      if (err && err.getStatus && typeof err.getStatus === 'function') {
        throw err;
      }
      throw new (require('@nestjs/common').InternalServerErrorException)({ message: err?.message || 'Failed to fetch payments' });
    }
  }

  // Assign a bus to a route with conflict checking
  @Post('assign-bus')
  async assignBusToRoute(
    @Body() assignBusDto: AssignBusDto,
  ): Promise<{ success: boolean; message: string; available?: boolean }> {
    const { routeId, busId, departureTime, arrivalTime } = assignBusDto;

    return this.tripsService.assignBusToRoute(
      routeId,
      busId,
      new Date(departureTime),
      new Date(arrivalTime),
    );
  }

  // Get conflicting trips for a specific bus and time slot
  @Get('conflicts/:busId')
  async getConflictingTrips(
    @Param('busId') busId: string,
    @Query() query: CheckAvailabilityDto,
  ): Promise<Trip[]> {
    const { departureTime, arrivalTime } = query;

    if (!departureTime || !arrivalTime) {
      throw new BadRequestException('Both departureTime and arrivalTime are required');
    }

    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);

    if (isNaN(departure.getTime()) || isNaN(arrival.getTime())) {
      throw new BadRequestException('Invalid date format. Use ISO 8601 format');
    }

    if (departure >= arrival) {
      throw new BadRequestException('Departure time must be before arrival time');
    }

    return this.tripsService.getConflictingTrips(busId, departure, arrival);
  }
}

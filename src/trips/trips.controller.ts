// src/trips/trips.controller.ts
import { Controller, Get, Query, BadRequestException, Param } from '@nestjs/common';
import { TripsService } from './trips.service';
import { SearchTripsDto } from './dto/search-trips.dto';
import { validateOrReject } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Controller('trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Get('search')
  async search(@Query() query: any) {
    // validate DTO (Nest can validate automatically if ValidationPipe enabled;
    // this is explicit if you don't use global pipe)
    const dto = plainToInstance(SearchTripsDto, query);
    // optional: await validateOrReject(dto);

    // Basic required param check (the DTO has types, but keep friendly error)
    if (!dto.origin || !dto.destination || !dto.date) {
      throw new BadRequestException('origin, destination and date are required');
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
    const trip = await this.tripsService.getTripById(tripId);

    return {
      success: true,
      data: trip,
      message: 'trip details retrieved successfully',
      timestamp: new Date().toISOString(),
    };
  }
}

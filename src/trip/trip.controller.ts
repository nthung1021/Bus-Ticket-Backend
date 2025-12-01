import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Put, 
  Delete,
  Query,
  BadRequestException,
  HttpStatus,
  HttpCode
} from '@nestjs/common';
import { TripService } from './trip.service';
import { Trip } from '../entities/trip.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { AssignBusDto } from './dto/assign-bus.dto';

@Controller('trips')
export class TripController {
  constructor(private readonly tripService: TripService) {}

  @Post()
  create(@Body() createTripDto: CreateTripDto): Promise<Trip> {
    return this.tripService.create(createTripDto);
  }

  @Get()
  findAll(): Promise<Trip[]> {
    return this.tripService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Trip> {
    return this.tripService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateTripDto: UpdateTripDto): Promise<Trip> {
    return this.tripService.update(id, updateTripDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string): Promise<void> {
    return this.tripService.remove(id);
  }

  /**
   * Get available buses for a specific time slot
   * GET /trips/available-buses?departureTime=2024-01-01T10:00:00Z&arrivalTime=2024-01-01T12:00:00Z
   */
  @Get('available-buses')
  async getAvailableBuses(
    @Query('departureTime') departureTime: string,
    @Query('arrivalTime') arrivalTime: string,
  ): Promise<string[]> {
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

    return this.tripService.getAvailableBuses(departure, arrival);
  }

  /**
   * Get bus schedule for a specific date range
   * GET /trips/bus/:busId/schedule?startDate=2024-01-01&endDate=2024-01-31
   */
  @Get('bus/:busId/schedule')
  async getBusSchedule(
    @Param('busId') busId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<Trip[]> {
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

    return this.tripService.getBusSchedule(busId, start, end);
  }

  /**
   * Get route schedule for a specific date range
   * GET /trips/route/:routeId/schedule?startDate=2024-01-01&endDate=2024-01-31
   */
  @Get('route/:routeId/schedule')
  async getRouteSchedule(
    @Param('routeId') routeId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ): Promise<Trip[]> {
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

    return this.tripService.getRouteSchedule(routeId, start, end);
  }

  /**
   * Check if a bus is available for a specific time slot
   * GET /trips/check-availability/:busId?departureTime=2024-01-01T10:00:00Z&arrivalTime=2024-01-01T12:00:00Z
   */
  @Get('check-availability/:busId')
  async checkBusAvailability(
    @Param('busId') busId: string,
    @Query('departureTime') departureTime: string,
    @Query('arrivalTime') arrivalTime: string,
  ): Promise<{ available: boolean; message?: string }> {
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

    // This is a simplified version - in reality, you'd call the private method
    // For now, we'll use the getAvailableBuses method to check
    const availableBuses = await this.tripService.getAvailableBuses(departure, arrival);
    const isAvailable = !availableBuses.includes(busId);

    return {
      available: isAvailable,
      message: isAvailable 
        ? 'Bus is available for the selected time slot' 
        : 'Bus is already scheduled during this time period'
    };
  }

  /**
   * Assign a bus to a route with conflict checking
   * POST /trips/assign-bus
   */
  @Post('assign-bus')
  async assignBusToRoute(@Body() assignBusDto: AssignBusDto): Promise<{ success: boolean; message: string; available?: boolean }> {
    const { routeId, busId, departureTime, arrivalTime } = assignBusDto;

    return this.tripService.assignBusToRoute(
      routeId,
      busId,
      new Date(departureTime),
      new Date(arrivalTime),
    );
  }

  /**
   * Get conflicting trips for a specific bus and time slot
   * GET /trips/conflicts/:busId?departureTime=2024-01-01T10:00:00Z&arrivalTime=2024-01-01T12:00:00Z
   */
  @Get('conflicts/:busId')
  async getConflictingTrips(
    @Param('busId') busId: string,
    @Query('departureTime') departureTime: string,
    @Query('arrivalTime') arrivalTime: string,
  ): Promise<Trip[]> {
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

    return this.tripService.getConflictingTrips(busId, departure, arrival);
  }
}

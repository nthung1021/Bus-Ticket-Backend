import { Injectable, NotFoundException, ConflictException, BadRequestException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, LessThanOrEqual, MoreThanOrEqual, And, Not } from 'typeorm';
import { Trip, TripStatus } from '../entities/trip.entity';
import { Route } from '../entities/route.entity';
import { Bus } from '../entities/bus.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
    @InjectRepository(Route)
    private readonly routeRepository: Repository<Route>,
    @InjectRepository(Bus)
    private readonly busRepository: Repository<Bus>,
  ) {}

  /**
   * Check if a bus is available for a specific time slot
   */
  private async checkBusAvailability(
    busId: string,
    departureTime: Date,
    arrivalTime: Date,
    excludeTripId?: string,
  ): Promise<boolean> {
    const conflictingTrips = await this.tripRepository.find({
      where: [
        // Trip that starts during our proposed time
        {
          busId,
          status: Not(TripStatus.CANCELLED),
          departureTime: And(LessThan(arrivalTime), MoreThanOrEqual(departureTime)),
        },
        // Trip that ends during our proposed time
        {
          busId,
          status: Not(TripStatus.CANCELLED),
          arrivalTime: And(LessThanOrEqual(arrivalTime), MoreThan(departureTime)),
        },
        // Trip that completely encompasses our proposed time
        {
          busId,
          status: Not(TripStatus.CANCELLED),
          departureTime: LessThanOrEqual(departureTime),
          arrivalTime: MoreThanOrEqual(arrivalTime),
        },
        // Our proposed time completely encompasses the trip
        {
          busId,
          status: Not(TripStatus.CANCELLED),
          departureTime: MoreThanOrEqual(departureTime),
          arrivalTime: LessThanOrEqual(arrivalTime),
        },
      ],
    });

    // Exclude the current trip if we're updating
    if (excludeTripId) {
      return conflictingTrips.every(trip => trip.id !== excludeTripId);
    }

    return conflictingTrips.length === 0;
  }

  /**
   * Validate that the route and bus are compatible (same operator)
   */
  private async validateRouteBusCompatibility(routeId: string, busId: string): Promise<void> {
    const route = await this.routeRepository.findOne({
      where: { id: routeId },
      select: ['operatorId'],
    });

    if (!route) {
      throw new NotFoundException(`Route with ID ${routeId} not found`);
    }

    const bus = await this.busRepository.findOne({
      where: { id: busId },
      select: ['operatorId'],
    });

    if (!bus) {
      throw new NotFoundException(`Bus with ID ${busId} not found`);
    }

    if (route.operatorId !== bus.operatorId) {
      throw new BadRequestException(
        `Bus and route must belong to the same operator. ` +
        `Route operator: ${route.operatorId}, Bus operator: ${bus.operatorId}`
      );
    }
  }

  /**
   * Validate time logic (departure must be before arrival, reasonable times)
   */
  private validateTripTiming(departureTime: Date, arrivalTime: Date): void {
    if (departureTime >= arrivalTime) {
      throw new BadRequestException('Departure time must be before arrival time');
    }

    const now = new Date();
    if (departureTime < now) {
      throw new BadRequestException('Departure time cannot be in the past');
    }

    // Check if the duration is reasonable (not too short or too long)
    const durationHours = (arrivalTime.getTime() - departureTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > 48) {
      throw new BadRequestException('Trip duration cannot exceed 48 hours');
    }

    // Check if duration is too short (at least 15 minutes)
    if (durationHours < 0.25) {
      throw new BadRequestException('Trip duration must be at least 15 minutes');
    }
  }

  async create(createTripDto: CreateTripDto): Promise<Trip> {
    const { routeId, busId, departureTime, arrivalTime } = createTripDto;

    // Validate timing
    this.validateTripTiming(new Date(departureTime), new Date(arrivalTime));

    // Validate route-bus compatibility
    await this.validateRouteBusCompatibility(routeId, busId);

    // Check for scheduling conflicts
    const isBusAvailable = await this.checkBusAvailability(
      busId,
      new Date(departureTime),
      new Date(arrivalTime),
    );
    // console.log(isBusAvailable)

    if (!isBusAvailable) {
      throw new ConflictException('Bus is already scheduled for this time period');
    }

    const trip = this.tripRepository.create(createTripDto);
    return await this.tripRepository.save(trip);
  }

  async findAll(): Promise<Trip[]> {
    return await this.tripRepository.find({
      relations: ['route', 'bus', 'bookings', 'seatStatuses', 'feedbacks'],
      order: { departureTime: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Trip> {
    const trip = await this.tripRepository.findOne({
      where: { id },
      relations: ['route', 'bus', 'bookings', 'seatStatuses', 'feedbacks'],
    });

    if (!trip) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }

    return trip;
  }

  async update(id: string, updateTripDto: UpdateTripDto): Promise<Trip> {
    const trip = await this.findOne(id);

    // If updating times, validate them
    if (updateTripDto.departureTime || updateTripDto.arrivalTime) {
      const newDepartureTime = updateTripDto.departureTime 
        ? new Date(updateTripDto.departureTime) 
        : trip.departureTime;
      const newArrivalTime = updateTripDto.arrivalTime 
        ? new Date(updateTripDto.arrivalTime) 
        : trip.arrivalTime;

      this.validateTripTiming(newDepartureTime, newArrivalTime);

      // If changing bus or times, check for conflicts
      const newBusId = updateTripDto.busId || trip.busId;
      if (newBusId !== trip.busId || updateTripDto.departureTime || updateTripDto.arrivalTime) {
        const isBusAvailable = await this.checkBusAvailability(
          newBusId,
          newDepartureTime,
          newArrivalTime,
          id, // Exclude current trip from conflict check
        );

        if (!isBusAvailable) {
          throw new ConflictException('Bus is already scheduled for this time period');
        }
      }
    }

    // If changing bus, validate compatibility
    if (updateTripDto.busId && updateTripDto.busId !== trip.busId) {
      const routeId = updateTripDto.routeId || trip.routeId;
      await this.validateRouteBusCompatibility(routeId, updateTripDto.busId);
    }

    Object.assign(trip, updateTripDto);
    return await this.tripRepository.save(trip);
  }

  async remove(id: string): Promise<void> {
    const trip = await this.findOne(id);
    
    // Check if trip has bookings
    if (trip.bookings && trip.bookings.length > 0) {
      throw new ConflictException('Cannot delete trip with existing bookings');
    }

    await this.tripRepository.remove(trip);
  }

  /**
   * Get available buses for a specific time slot
   */
  async getAvailableBuses(departureTime: Date, arrivalTime: Date): Promise<string[]> {
    // Get all buses
    const allBuses = await this.busRepository.find({
      select: ['id'],
    });

    // Get buses that are booked during this time
    const bookedBusIds = await this.getBookedBusIds(departureTime, arrivalTime);

    // Return buses that are NOT booked
    const availableBusIds = allBuses
      .filter(bus => !bookedBusIds.includes(bus.id))
      .map(bus => bus.id);

    return availableBusIds;
  }

  /**
   * Helper method to get bus IDs that are booked during a time period
   */
  private async getBookedBusIds(departureTime: Date, arrivalTime: Date): Promise<string[]> {
    const conflictingTrips = await this.tripRepository.find({
      where: [
        {
          status: Not(TripStatus.CANCELLED),
          departureTime: And(LessThan(arrivalTime), MoreThan(departureTime)),
        },
        {
          status: Not(TripStatus.CANCELLED),
          arrivalTime: And(LessThan(arrivalTime), MoreThan(departureTime)),
        },
        {
          status: Not(TripStatus.CANCELLED),
          departureTime: LessThan(departureTime),
          arrivalTime: MoreThan(arrivalTime),
        },
      ],
      select: ['busId'],
    });

    return [...new Set(conflictingTrips.map(trip => trip.busId))];
  }

  /**
   * Get trips for a specific bus within a date range
   */
  async getBusSchedule(busId: string, startDate: Date, endDate: Date): Promise<Trip[]> {
    return await this.tripRepository.find({
      where: {
        busId,
        departureTime: And(LessThan(endDate), MoreThan(startDate)),
        status: Not(TripStatus.CANCELLED),
      },
      relations: ['route'],
      order: { departureTime: 'ASC' },
    });
  }

  /**
   * Get trips for a specific route within a date range
   */
  async getRouteSchedule(routeId: string, startDate: Date, endDate: Date): Promise<Trip[]> {
    return await this.tripRepository.find({
      where: {
        routeId,
        departureTime: And(LessThan(endDate), MoreThan(startDate)),
        status: Not(TripStatus.CANCELLED),
      },
      relations: ['bus'],
      order: { departureTime: 'ASC' },
    });
  }

  /**
   * Assign a bus to a route with conflict checking
   */
  async assignBusToRoute(
    routeId: string,
    busId: string,
    departureTime: Date,
    arrivalTime: Date,
  ): Promise<{ success: boolean; message: string; available?: boolean }> {
    // Validate timing
    this.validateTripTiming(departureTime, arrivalTime);

    // Validate route-bus compatibility
    await this.validateRouteBusCompatibility(routeId, busId);

    // Check for scheduling conflicts
    const isBusAvailable = await this.checkBusAvailability(busId, departureTime, arrivalTime);

    if (!isBusAvailable) {
      return {
        success: false,
        message: 'Bus is already scheduled for this time period',
        available: false,
      };
    }

    return {
      success: true,
      message: 'Bus is available for assignment to this route',
      available: true,
    };
  }

  /**
   * Get all trips that conflict with a proposed time slot for a specific bus
   */
  async getConflictingTrips(
    busId: string,
    departureTime: Date,
    arrivalTime: Date,
  ): Promise<Trip[]> {
    return await this.tripRepository.find({
      where: [
        {
          busId,
          status: Not(TripStatus.CANCELLED),
          departureTime: And(LessThan(arrivalTime), MoreThan(departureTime)),
        },
        {
          busId,
          status: Not(TripStatus.CANCELLED),
          arrivalTime: And(LessThan(arrivalTime), MoreThan(departureTime)),
        },
        {
          busId,
          status: Not(TripStatus.CANCELLED),
          departureTime: LessThan(departureTime),
          arrivalTime: MoreThan(arrivalTime),
        },
      ],
      relations: ['route'],
      order: { departureTime: 'ASC' },
    });
  }
}

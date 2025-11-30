import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Trip } from '../entities/trip.entity';
import { CreateTripDto } from './dto/create-trip.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepository: Repository<Trip>,
  ) {}

  async create(createTripDto: CreateTripDto): Promise<Trip> {
    const trip = this.tripRepository.create(createTripDto);
    return await this.tripRepository.save(trip);
  }

  async findAll(): Promise<Trip[]> {
    return await this.tripRepository.find({
      relations: ['route', 'bus', 'bookings', 'seatStatuses', 'feedbacks'],
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
    Object.assign(trip, updateTripDto);
    return await this.tripRepository.save(trip);
  }

  async remove(id: string): Promise<void> {
    const result = await this.tripRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Trip with ID ${id} not found`);
    }
  }
}

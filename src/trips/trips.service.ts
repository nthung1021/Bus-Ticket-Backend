// src/trips/trips.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Trip } from '../entities/trip.entity';
import { SearchTripsDto } from './dto/search-trips.dto';

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(Trip)
    private readonly tripRepo: Repository<Trip>,
  ) {}

  // helper: convert "morning/afternoon/..." into a range of hours
  private getTimeRangeForBucket(bucket: string) {
    // local times (24h) considered for departureTime field
    switch (bucket) {
      case 'morning': return { start: '05:00:00', end: '11:59:59' }; // 5:00 - 11:59
      case 'afternoon': return { start: '12:00:00', end: '16:59:59' }; // 12:00 - 16:59
      case 'evening': return { start: '17:00:00', end: '20:59:59' }; // 17:00 - 20:59
      case 'night': return { start: '21:00:00', end: '04:59:59' }; // 21:00 - 04:59 (spans midnight)
      default: return null;
    }
  }

  async search(dto: SearchTripsDto) {
    const page = dto.page || 1;
    const limit = Math.min(dto.limit || 20, 100);
    const offset = (page - 1) * limit;

    const qb = this.tripRepo.createQueryBuilder('trip')
      // join route, bus, operator — adapt relation names to your entities
      .leftJoinAndSelect('trip.route', 'route')
      .leftJoinAndSelect('trip.bus', 'bus')
      .leftJoinAndSelect('bus.operator', 'operator');

    // Required: origin/destination/date - assume route has origin/destination,
    // trip has departureTime (timestamp)
    qb.andWhere('LOWER(route.origin) = LOWER(:origin)', { origin: dto.origin.trim() });
    qb.andWhere('LOWER(route.destination) = LOWER(:destination)', { destination: dto.destination.trim() });

    // date filter: trips whose departure date = dto.date (timezone note: store timestamps in UTC)
    // We compare date part by bounding between start and end of the day in UTC or DB timezone.
    const startOfDay = `${dto.date}T00:00:00.000Z`;
    const endOfDay = `${dto.date}T23:59:59.999Z`;
    qb.andWhere('trip.departureTime BETWEEN :startOfDay AND :endOfDay', { startOfDay, endOfDay });

    // optional filters
    if (dto.busType) {
      qb.andWhere('bus.busType = :busType', { busType: dto.busType });
    }

    if (dto.operatorId) {
      qb.andWhere('operator.id = :operatorId', { operatorId: dto.operatorId });
    }

    if (dto.minPrice != null) {
      qb.andWhere('trip.basePrice >= :minPrice', { minPrice: dto.minPrice });
    }

    if (dto.maxPrice != null) {
      qb.andWhere('trip.basePrice <= :maxPrice', { maxPrice: dto.maxPrice });
    }

    // departureTime bucket (morning/afternoon/evening/night)
    if (dto.departureTime) {
      const range = this.getTimeRangeForBucket(dto.departureTime);
      if (range) {
        if (dto.departureTime !== 'night') {
          qb.andWhere(`to_char(trip.departureTime::time, 'HH24:MI:SS') BETWEEN :start AND :end`, {
            start: range.start,
            end: range.end,
          });
        } else {
          // night spans midnight: accept times >= 21:00 OR <= 04:59:59
          qb.andWhere(new Brackets(q => {
            q.where(`to_char(trip.departureTime::time, 'HH24:MI:SS') >= :start`, { start: range.start })
             .orWhere(`to_char(trip.departureTime::time, 'HH24:MI:SS') <= :end`, { end: range.end });
          }));
        }
      }
    }

    // ordering — cheapest first as example, then departureTime
    qb.orderBy('trip.basePrice', 'ASC')
      .addOrderBy('trip.departureTime', 'ASC');

    // count total
    const [items, total] = await qb.skip(offset).take(limit).getManyAndCount();

    // Map each Trip entity to response shape required by README:
    const data = await Promise.all(items.map(async trip => {
      // availability calculation: count available seats from seats table OR derive from capacity - booked
      // This depends on your schema. Example: trip.seats relation or a bookings table.
      const totalSeats = trip.bus?.seatCapacity ?? null;
      // example: availableSeats calculation — implement according to your booking model
      // placeholder: assume a function getAvailableSeats(trip.id)
      const availableSeats = await this.getAvailableSeats(trip.id);

      return {
        tripId: trip.id,
        route: {
          routeId: trip.route?.id,
          origin: trip.route?.origin,
          destination: trip.route?.destination,
          distanceKm: trip.route?.distanceKm,
          estimatedMinutes: trip.route?.estimatedMinutes,
        },
        operator: {
          operatorId: trip.bus?.operator?.id,
          name: trip.bus?.operator?.name,
          rating: null, // not defined in entity
          logo: null, // not defined in entity
        },
        bus: {
          busId: trip.bus?.id,
          model: trip.bus?.model,
          plateNumber: trip.bus?.plateNumber,
          seatCapacity: trip.bus?.seatCapacity,
          busType: null, // not defined in entity
          amenities: trip.bus?.amenities ?? [],
        },
        schedule: {
          departureTime: trip.departureTime,
          arrivalTime: trip.arrivalTime,
          duration: trip.arrivalTime && trip.departureTime
            ? Math.round((new Date(trip.arrivalTime).getTime() - new Date(trip.departureTime).getTime()) / 60000)
            : null,
        },
        pricing: {
          basePrice: trip.basePrice,
          currency: 'VND', // not defined in entity
          serviceFee: 0, // not defined in entity
        },
        availability: {
          totalSeats,
          availableSeats,
          occupancyRate: totalSeats ? Math.round(((totalSeats - availableSeats) / totalSeats) * 10000) / 100 : null,
        },
        status: trip.status,
      };
    }));

    const pagination = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return { data, pagination };
  }

  // Example placeholder — implement with real query to bookings/seats table
  private async getAvailableSeats(tripId: string): Promise<number> {
    // Example logic (pseudo):
    // const total = await this.someRepo.count({ where: { trip: { id: tripId } }});
    // const booked = await this.bookingRepo.count({ where: { tripId, status: In(['pending','confirmed']) }});
    // return Math.max(0, total - booked);

    // For now return a dummy number (replace with real implementation)
    return 10;
  }
}

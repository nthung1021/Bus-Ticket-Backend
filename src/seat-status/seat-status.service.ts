import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeatStatus } from '../entities/seat-status.entity';

@Injectable()
export class SeatStatusService {
    constructor(
        @InjectRepository(SeatStatus)
        private readonly seatStatusRepository: Repository<SeatStatus>,
    ) {}

    /**
     * Get seat status information by seat ID
     * @param seatId - ID of the seat to find
     * @returns Array of SeatStatus or empty array if not found
     */
    async findBySeatId(seatId: string): Promise<SeatStatus[]> {
        return await this.seatStatusRepository.find({
            where: { seatId },
            relations: ['trip', 'seat', 'booking'],
        });
    }

    /**
     * Get seat status for a specific seat in a specific trip
     * @param seatId - ID of the seat
     * @param tripId - ID of the trip
     * @returns SeatStatus or null if not found
     */
    async findBySeatIdAndTripId(seatId: string, tripId: string): Promise<SeatStatus | null> {
        return await this.seatStatusRepository.findOne({
            where: { seatId, tripId },
            relations: ['trip', 'seat', 'booking'],
        });
    }

    /**
     * Get all seat statuses for a specific trip
     * @param tripId - ID of the trip
     * @returns Array of SeatStatus
     */
    async findByTripId(tripId: string): Promise<SeatStatus[]> {
        return await this.seatStatusRepository.find({
            where: { tripId },
            relations: ['trip', 'seat', 'booking'],
        });
    }
}

import { 
    Controller, 
    Get, 
    Param, 
    Post, 
    Body, 
    Patch, 
    Delete,
    HttpCode,
    HttpStatus,
    NotFoundException,
} from '@nestjs/common';
import { SeatStatusService } from './seat-status.service';
import { SeatStatus } from '../entities/seat-status.entity';

@Controller('seat-status')
export class SeatStatusController {
    constructor(private readonly seatStatusService: SeatStatusService) {}

    /**
     * Get seat status by seat ID
     * GET /seat-status/seat/:seatId
     */
    @Get('seat/:seatId')
    async findBySeatId(@Param('seatId') seatId: string): Promise<SeatStatus[]> {
        const seatStatuses = await this.seatStatusService.findBySeatId(seatId);
        
        if (!seatStatuses || seatStatuses.length === 0) {
            throw new NotFoundException(`Seat status not found for seat ID: ${seatId}`);
        }
        
        return seatStatuses;
    }

    /**
     * Get seat status by seat ID and trip ID
     * GET /seat-status/seat/:seatId/trip/:tripId
     */
    @Get('seat/:seatId/trip/:tripId')
    async findBySeatIdAndTripId(
        @Param('seatId') seatId: string,
        @Param('tripId') tripId: string
    ): Promise<SeatStatus> {
        const seatStatus = await this.seatStatusService.findBySeatIdAndTripId(seatId, tripId);
        
        if (!seatStatus) {
            throw new NotFoundException(`Seat status not found for seat ID: ${seatId} and trip ID: ${tripId}`);
        }
        
        return seatStatus;
    }

    /**
     * Get all seat statuses for a trip
     * GET /seat-status/trip/:tripId
     */
    @Get('trip/:tripId')
    async findByTripId(@Param('tripId') tripId: string): Promise<SeatStatus[]> {
        const seatStatuses = await this.seatStatusService.findByTripId(tripId);
        
        if (!seatStatuses || seatStatuses.length === 0) {
            throw new NotFoundException(`No seat statuses found for trip ID: ${tripId}`);
        }
        
        return seatStatuses;
    }
}

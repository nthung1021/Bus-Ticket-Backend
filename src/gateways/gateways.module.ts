import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SeatStatusGateway } from './seat-status.gateway';
import { SeatStatus } from '../entities/seat-status.entity';

@Module({
    imports: [ConfigModule, TypeOrmModule.forFeature([SeatStatus])],
    providers: [SeatStatusGateway],
    exports: [SeatStatusGateway],
})
export class GatewaysModule {
    constructor(private readonly seatStatusGateway: SeatStatusGateway) {
        // Start the lock cleanup process
        this.seatStatusGateway.startLockCleanup();
    }
}

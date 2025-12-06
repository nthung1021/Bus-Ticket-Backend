import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SeatStatusGateway } from './seat-status.gateway';

@Module({
    imports: [ConfigModule],
    providers: [SeatStatusGateway],
    exports: [SeatStatusGateway],
})
export class GatewaysModule {
    constructor(private readonly seatStatusGateway: SeatStatusGateway) {
        // Start the lock cleanup process
        this.seatStatusGateway.startLockCleanup();
    }
}

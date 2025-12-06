import { Module } from '@nestjs/common';
import { SeatStatusGateway } from './seat-status.gateway';

@Module({
    providers: [SeatStatusGateway],
    exports: [SeatStatusGateway],
})
export class GatewaysModule {
    constructor(private readonly seatStatusGateway: SeatStatusGateway) {
        // Start the lock cleanup process
        this.seatStatusGateway.startLockCleanup();
    }
}

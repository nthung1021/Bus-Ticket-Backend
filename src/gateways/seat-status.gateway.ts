import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

interface SeatLock {
    seatId: string;
    userId: string;
    socketId: string;
    tripId: string;
    expiresAt: Date;
}

interface SeatStatusUpdate {
    tripId: string;
    seatId: string;
    status: 'available' | 'locked' | 'booked';
    userId?: string;
}

@WebSocketGateway({
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:8000',
        credentials: true,
    },
    namespace: '/seats',
})
export class SeatStatusGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(SeatStatusGateway.name);
    private seatLocks: Map<string, SeatLock> = new Map();
    private readonly LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        // Release all locks held by this client
        this.releaseClientLocks(client.id);
    }

    @SubscribeMessage('joinTrip')
    handleJoinTrip(
        @MessageBody() data: { tripId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const { tripId } = data;
        client.join(`trip:${tripId}`);
        this.logger.log(`Client ${client.id} joined trip ${tripId}`);

        // Send current locked seats for this trip
        const lockedSeats = this.getLockedSeatsForTrip(tripId);
        client.emit('currentLocks', { tripId, lockedSeats });

        return { success: true, tripId };
    }

    @SubscribeMessage('leaveTrip')
    handleLeaveTrip(
        @MessageBody() data: { tripId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const { tripId } = data;
        client.leave(`trip:${tripId}`);
        this.logger.log(`Client ${client.id} left trip ${tripId}`);

        // Release locks for this trip by this client
        this.releaseClientLocksForTrip(client.id, tripId);

        return { success: true, tripId };
    }

    @SubscribeMessage('lockSeat')
    handleLockSeat(
        @MessageBody() data: { tripId: string; seatId: string; userId?: string },
        @ConnectedSocket() client: Socket,
    ) {
        const { tripId, seatId, userId } = data;
        const lockKey = `${tripId}:${seatId}`;

        // Check if seat is already locked by someone else
        const existingLock = this.seatLocks.get(lockKey);
        if (existingLock && existingLock.socketId !== client.id) {
            // Check if lock has expired
            if (existingLock.expiresAt > new Date()) {
                return {
                    success: false,
                    message: 'Seat is already locked by another user',
                };
            }
        }

        // Create or update lock
        const lock: SeatLock = {
            seatId,
            userId: userId || client.id,
            socketId: client.id,
            tripId,
            expiresAt: new Date(Date.now() + this.LOCK_DURATION),
        };

        this.seatLocks.set(lockKey, lock);

        // Notify all clients in the trip room
        this.server.to(`trip:${tripId}`).emit('seatLocked', {
            tripId,
            seatId,
            userId: lock.userId,
            expiresAt: lock.expiresAt,
        });

        this.logger.log(`Seat ${seatId} locked for trip ${tripId} by ${userId || client.id}`);

        return { success: true, lock };
    }

    @SubscribeMessage('unlockSeat')
    handleUnlockSeat(
        @MessageBody() data: { tripId: string; seatId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const { tripId, seatId } = data;
        const lockKey = `${tripId}:${seatId}`;

        const lock = this.seatLocks.get(lockKey);
        if (lock && lock.socketId === client.id) {
            this.seatLocks.delete(lockKey);

            // Notify all clients in the trip room
            this.server.to(`trip:${tripId}`).emit('seatUnlocked', {
                tripId,
                seatId,
            });

            this.logger.log(`Seat ${seatId} unlocked for trip ${tripId}`);

            return { success: true };
        }

        return { success: false, message: 'You do not hold this lock' };
    }

    @SubscribeMessage('refreshLock')
    handleRefreshLock(
        @MessageBody() data: { tripId: string; seatId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const { tripId, seatId } = data;
        const lockKey = `${tripId}:${seatId}`;

        const lock = this.seatLocks.get(lockKey);
        if (lock && lock.socketId === client.id) {
            lock.expiresAt = new Date(Date.now() + this.LOCK_DURATION);
            this.seatLocks.set(lockKey, lock);

            return { success: true, expiresAt: lock.expiresAt };
        }

        return { success: false, message: 'Lock not found or expired' };
    }

    // Method to be called when a booking is confirmed
    public notifySeatBooked(tripId: string, seatIds: string[]) {
        seatIds.forEach((seatId) => {
            const lockKey = `${tripId}:${seatId}`;
            this.seatLocks.delete(lockKey);

            this.server.to(`trip:${tripId}`).emit('seatBooked', {
                tripId,
                seatId,
            });
        });

        this.logger.log(`Seats ${seatIds.join(', ')} booked for trip ${tripId}`);
    }

    // Method to be called when seats become available again (e.g., booking cancelled)
    public notifySeatsAvailable(tripId: string, seatIds: string[]) {
        seatIds.forEach((seatId) => {
            this.server.to(`trip:${tripId}`).emit('seatAvailable', {
                tripId,
                seatId,
            });
        });

        this.logger.log(
            `Seats ${seatIds.join(', ')} now available for trip ${tripId}`,
        );
    }

    private releaseClientLocks(socketId: string) {
        const locksToRelease: string[] = [];

        this.seatLocks.forEach((lock, key) => {
            if (lock.socketId === socketId) {
                locksToRelease.push(key);
                this.server.to(`trip:${lock.tripId}`).emit('seatUnlocked', {
                    tripId: lock.tripId,
                    seatId: lock.seatId,
                });
            }
        });

        locksToRelease.forEach((key) => this.seatLocks.delete(key));

        if (locksToRelease.length > 0) {
            this.logger.log(
                `Released ${locksToRelease.length} locks for disconnected client ${socketId}`,
            );
        }
    }

    private releaseClientLocksForTrip(socketId: string, tripId: string) {
        const locksToRelease: string[] = [];

        this.seatLocks.forEach((lock, key) => {
            if (lock.socketId === socketId && lock.tripId === tripId) {
                locksToRelease.push(key);
                this.server.to(`trip:${lock.tripId}`).emit('seatUnlocked', {
                    tripId: lock.tripId,
                    seatId: lock.seatId,
                });
            }
        });

        locksToRelease.forEach((key) => this.seatLocks.delete(key));
    }

    private getLockedSeatsForTrip(tripId: string) {
        const lockedSeats: Array<{
            seatId: string;
            userId: string;
            expiresAt: Date;
        }> = [];

        this.seatLocks.forEach((lock) => {
            if (lock.tripId === tripId && lock.expiresAt > new Date()) {
                lockedSeats.push({
                    seatId: lock.seatId,
                    userId: lock.userId,
                    expiresAt: lock.expiresAt,
                });
            }
        });

        return lockedSeats;
    }

    // Cleanup expired locks periodically
    startLockCleanup() {
        setInterval(() => {
            const now = new Date();
            const expiredLocks: string[] = [];

            this.seatLocks.forEach((lock, key) => {
                if (lock.expiresAt <= now) {
                    expiredLocks.push(key);
                    this.server.to(`trip:${lock.tripId}`).emit('seatUnlocked', {
                        tripId: lock.tripId,
                        seatId: lock.seatId,
                    });
                }
            });

            expiredLocks.forEach((key) => this.seatLocks.delete(key));

            if (expiredLocks.length > 0) {
                this.logger.log(`Cleaned up ${expiredLocks.length} expired locks`);
            }
        }, 60000); // Check every minute
    }
}

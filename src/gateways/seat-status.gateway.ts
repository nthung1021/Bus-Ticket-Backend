/**
 * WebSocket Gateway for Real-Time Seat Status Management
 * 
 * This gateway handles real-time seat locking and status updates
 * to prevent multiple users from selecting the same seat simultaneously.
 * 
 * Features:
 * - Seat locking with expiration (5 minutes)
 * - Real-time seat status broadcasting
 * - Automatic cleanup of expired locks
 * - Trip-based room management
 */

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
import { ConfigService } from '@nestjs/config';

/**
 * Represents a temporary lock on a seat
 */
interface SeatLock {
    /** ID of the locked seat */
    seatId: string;
    /** ID of the user who locked the seat */
    userId: string;
    /** Socket connection ID of the user */
    socketId: string;
    /** ID of the trip the seat belongs to */
    tripId: string;
    /** When the lock expires (5 minutes from creation) */
    expiresAt: Date;
}

/**
 * Message structure for seat status updates
 */
interface SeatStatusUpdate {
    /** ID of the trip */
    tripId: string;
    /** ID of the seat */
    seatId: string;
    /** Current status of the seat */
    status: 'available' | 'locked' | 'booked';
    /** ID of the user who caused the status change */
    userId?: string;
}

/**
 * WebSocket Gateway Configuration
 * - Allows connections from frontend URL
 * - Uses '/seats' namespace for seat-related events
 * - Enables CORS for cross-origin requests
 */
@WebSocketGateway({
    cors: {
        origin: true,
        credentials: true,
    },
    namespace: '/seats',
})
export class SeatStatusGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    /** WebSocket server instance for broadcasting messages */
    @WebSocketServer()
    server: Server;

    /** Logger for debugging and monitoring */
    private readonly logger = new Logger(SeatStatusGateway.name);
    /** Storage for active seat locks (key: "tripId:seatId", value: SeatLock) */
    private seatLocks: Map<string, SeatLock> = new Map();
    /** How long locks last before expiring (5 minutes in milliseconds) */
    private readonly LOCK_DURATION = 5 * 60 * 1000; // 5 minutes

    constructor(private readonly configService: ConfigService) {
        // Configure CORS dynamically based on environment
        this.updateCorsConfiguration();
    }

    /**
     * Updates CORS configuration based on environment variables
     * This method is called in constructor after ConfigService is available
     */
    private updateCorsConfiguration() {
        const frontendUrl = this.configService.get('FRONTEND_URL');
        const allowedOrigins = [
            frontendUrl || 'http://localhost:3000',
            'http://localhost:3001',
            'http://localhost:8000',
        ].filter(Boolean); // Remove null/undefined values

        this.logger.log(`Frontend URL configured: ${frontendUrl || 'http://localhost:3000'}`);
        this.logger.log(`Allowed origins: ${allowedOrigins.join(', ')}`);

        // Update the server's CORS configuration dynamically
        if (this.server && this.server.httpServer) {
            const io = this.server as any;
            if (io.engine && io.engine.opts) {
                io.engine.opts.cors = {
                    origin: allowedOrigins,
                    credentials: true,
                };
            }
        }
    }

    /**
     * Called when a new client connects to the WebSocket
     * @param client - The connected socket client
     */
    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
        // Re-apply CORS configuration when first client connects
        // This ensures the configuration is active
        this.updateCorsConfiguration();
    }

    /**
     * Called when a client disconnects from the WebSocket
     * Automatically releases all locks held by the disconnected client
     * @param client - The disconnected socket client
     */
    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        // Release all locks held by this client
        this.releaseClientLocks(client.id);
    }

    /**
     * Handles client joining a trip room to receive seat updates
     * Client receives current locked seats immediately upon joining
     */
    @SubscribeMessage('joinTrip')
    handleJoinTrip(
        @MessageBody() data: { tripId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const { tripId } = data;
        // Add client to trip-specific room for targeted broadcasts
        client.join(`trip:${tripId}`);
        this.logger.log(`Client ${client.id} joined trip ${tripId}`);

        // Send current locked seats for this trip to the new client
        const lockedSeats = this.getLockedSeatsForTrip(tripId);
        client.emit('currentLocks', { tripId, lockedSeats });

        return { success: true, tripId };
    }

    /**
     * Handles client leaving a trip room
     * Releases all locks held by the client for that specific trip
     */
    @SubscribeMessage('leaveTrip')
    handleLeaveTrip(
        @MessageBody() data: { tripId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const { tripId } = data;
        // Remove client from trip room
        client.leave(`trip:${tripId}`);
        this.logger.log(`Client ${client.id} left trip ${tripId}`);

        // Release locks for this trip by this client
        this.releaseClientLocksForTrip(client.id, tripId);

        return { success: true, tripId };
    }

    /**
     * Handles seat locking requests
     * Prevents double locking and broadcasts lock status to all clients
     */
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

        // Create or update lock with 5-minute expiration
        const lock: SeatLock = {
            seatId,
            userId: userId || client.id,
            socketId: client.id,
            tripId,
            expiresAt: new Date(Date.now() + this.LOCK_DURATION),
        };

        this.seatLocks.set(lockKey, lock);

        // Notify all clients in the trip room about the new lock
        this.server.to(`trip:${tripId}`).emit('seatLocked', {
            tripId,
            seatId,
            userId: lock.userId,
            expiresAt: lock.expiresAt,
        });

        this.logger.log(`Seat ${seatId} locked for trip ${tripId} by ${userId || client.id}`);

        return { success: true, lock };
    }

    /**
     * Handles seat unlocking requests
     * Only the user who created the lock can unlock it
     */
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

            // Notify all clients in the trip room that seat is now available
            this.server.to(`trip:${tripId}`).emit('seatUnlocked', {
                tripId,
                seatId,
            });

            this.logger.log(`Seat ${seatId} unlocked for trip ${tripId}`);

            return { success: true };
        }

        return { success: false, message: 'You do not hold this lock' };
    }

    /**
     * Handles lock refresh requests to extend lock duration
     * Useful when user is still active but lock is about to expire
     */
    @SubscribeMessage('refreshLock')
    handleRefreshLock(
        @MessageBody() data: { tripId: string; seatId: string },
        @ConnectedSocket() client: Socket,
    ) {
        const { tripId, seatId } = data;
        const lockKey = `${tripId}:${seatId}`;

        const lock = this.seatLocks.get(lockKey);
        if (lock && lock.socketId === client.id) {
            // Extend lock by another 5 minutes
            lock.expiresAt = new Date(Date.now() + this.LOCK_DURATION);
            this.seatLocks.set(lockKey, lock);

            return { success: true, expiresAt: lock.expiresAt };
        }

        return { success: false, message: 'Lock not found or expired' };
    }

    /**
     * Called when seats are successfully booked
     * Removes locks and notifies all clients that seats are now booked
     * @param tripId - The trip ID
     * @param seatIds - Array of booked seat IDs
     */
    public notifySeatBooked(tripId: string, seatIds: string[]) {
        seatIds.forEach((seatId) => {
            const lockKey = `${tripId}:${seatId}`;
            this.seatLocks.delete(lockKey);

            // Notify all clients that seat is now booked
            this.server.to(`trip:${tripId}`).emit('seatBooked', {
                tripId,
                seatId,
            });
        });

        this.logger.log(`Seats ${seatIds.join(', ')} booked for trip ${tripId}`);
    }

    /**
     * Called when seats become available again (e.g., booking cancelled)
     * Notifies all clients that seats are now available for selection
     * @param tripId - The trip ID
     * @param seatIds - Array of now-available seat IDs
     */
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

    /**
     * Releases all locks held by a specific client (when they disconnect)
     * @param socketId - The socket ID of the disconnected client
     */
    private releaseClientLocks(socketId: string) {
        const locksToRelease: string[] = [];

        this.seatLocks.forEach((lock, key) => {
            if (lock.socketId === socketId) {
                locksToRelease.push(key);
                // Notify other clients that these seats are now available
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

    /**
     * Releases locks for a specific client and trip only
     * @param socketId - The socket ID of the client
     * @param tripId - The trip ID
     */
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

    /**
     * Gets all currently locked seats for a specific trip
     * @param tripId - The trip ID
     * @returns Array of locked seat information
     */
    private getLockedSeatsForTrip(tripId: string) {
        const lockedSeats: Array<{
            seatId: string;
            userId: string;
            expiresAt: Date;
        }> = [];

        this.seatLocks.forEach((lock) => {
            // Only include non-expired locks
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

    /**
     * Starts automatic cleanup of expired locks
     * Runs every minute to remove locks that have passed their expiration time
     */
    startLockCleanup() {
        setInterval(() => {
            const now = new Date();
            const expiredLocks: string[] = [];

            this.seatLocks.forEach((lock, key) => {
                if (lock.expiresAt <= now) {
                    expiredLocks.push(key);
                    // Notify clients that expired locks are now available
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

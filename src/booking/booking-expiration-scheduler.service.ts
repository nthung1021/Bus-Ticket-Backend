import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as cron from 'node-cron';
import { BookingService } from './booking.service';

@Injectable()
export class BookingExpirationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingExpirationScheduler.name);
  private cronJob: cron.ScheduledTask | null = null;

  constructor(private readonly bookingService: BookingService) {}

  onModuleInit() {
    this.startBookingExpirationJob();
  }

  onModuleDestroy() {
    this.stopBookingExpirationJob();
  }

  /**
   * Start the cron job for booking expiration
   * Runs every 2 minutes to check for expired bookings
   */
  private startBookingExpirationJob() {
    try {
      // Run every 2 minutes: "*/2 * * * *"
      // For testing, you can use "*/10 * * * * *" (every 10 seconds)
      this.cronJob = cron.schedule('*/2 * * * *', async () => {
        await this.processExpiredBookings();
      }, {
        timezone: 'UTC',
      });

      this.logger.log('🕒 Booking expiration cron job started - runs every 2 minutes');
    } catch (error) {
      this.logger.error('Failed to start booking expiration cron job:', error);
    }
  }

  /**
   * Stop the cron job
   */
  private stopBookingExpirationJob() {
    if (this.cronJob) {
      this.cronJob.destroy();
      this.cronJob = null;
      this.logger.log('🛑 Booking expiration cron job stopped');
    }
  }

  /**
   * Process expired bookings
   */
  private async processExpiredBookings() {
    const startTime = Date.now();
    
    try {
      this.logger.debug('🔍 Checking for expired bookings...');
      
      // Find expired bookings first for logging
      const expiredBookings = await this.bookingService.findExpiredBookings();
      
      if (expiredBookings.length === 0) {
        this.logger.debug('✅ No expired bookings found');
        return;
      }

      this.logger.log(`📋 Found ${expiredBookings.length} expired bookings to process`);
      
      // Log details of expired bookings
      expiredBookings.forEach(booking => {
        this.logger.log(
          `⏰ Expiring booking: ${booking.bookingReference} ` +
          `(Trip: ${booking.trip?.route?.origin || 'Unknown'} → ${booking.trip?.route?.destination || 'Unknown'}) ` +
          `expired at: ${booking.expiresAt?.toISOString()}`
        );
      });

      // Process expiration
      const result = await this.bookingService.expireBookings();
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      if (result.expiredCount > 0) {
        this.logger.log(
          `✅ Successfully expired ${result.expiredCount} bookings in ${processingTime}ms: ` +
          `[${result.bookings.join(', ')}]`
        );

        // Log seat release details
        this.logger.log(`🪑 Released seats for ${result.expiredCount} expired bookings`);
      } else {
        this.logger.warn('⚠️ No bookings were expired despite finding expired bookings');
      }

    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.logger.error(
        `❌ Failed to process expired bookings after ${processingTime}ms:`,
        error.stack || error.message
      );
    }
  }

  /**
   * Manually trigger expiration process (for testing/admin)
   */
  async triggerManualExpiration(): Promise<{ expiredCount: number; bookings: string[] }> {
    this.logger.log('🔧 Manual booking expiration triggered');
    await this.processExpiredBookings();
    return await this.bookingService.expireBookings();
  }

  /**
   * Get cron job status
   */
  getCronJobStatus(): { isRunning: boolean; nextRun: string | null } {
    if (!this.cronJob) {
      return { isRunning: false, nextRun: null };
    }

    return {
      isRunning: this.cronJob.getStatus() === 'scheduled',
      nextRun: 'Every 2 minutes',
    };
  }

  /**
   * Restart the cron job
   */
  restartCronJob() {
    this.logger.log('🔄 Restarting booking expiration cron job');
    this.stopBookingExpirationJob();
    this.startBookingExpirationJob();
  }
}
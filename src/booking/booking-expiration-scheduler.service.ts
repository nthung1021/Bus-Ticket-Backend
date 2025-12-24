import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import * as cron from 'node-cron';
import { BookingService } from './booking.service';

@Injectable()
export class BookingExpirationScheduler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BookingExpirationScheduler.name);
  private cronJob: cron.ScheduledTask | null = null;
  private isJobRunning = false;

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
      
      this.isJobRunning = true;
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
      this.cronJob.stop();
      this.cronJob = null;
      this.isJobRunning = false;
      this.logger.log('🛑 Booking expiration cron job stopped');
    }
  }

  /**
   * Process expired bookings with enhanced safety and idempotency
   */
  private async processExpiredBookings(): Promise<{ expiredCount: number; bookings: string[]; error?: string }> {
    const startTime = Date.now();
    const sessionId = `exp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      this.logger.log(`🚀 [${sessionId}] Starting booking expiration process...`);
      
      // Safety check: ensure service is healthy
      if (!this.bookingService) {
        this.logger.error(`❌ [${sessionId}] BookingService not available, skipping expiration`);
        return { expiredCount: 0, bookings: [], error: 'BookingService not available' };
      }

      // Find expired bookings first for logging
      const expiredBookings = await this.bookingService.findExpiredBookings();
      
      if (expiredBookings.length === 0) {
        this.logger.debug(`✅ [${sessionId}] No expired bookings found`);
        return { expiredCount: 0, bookings: [], error: undefined };
      }

      this.logger.warn(`📋 [${sessionId}] Found ${expiredBookings.length} expired bookings to process`);
      
      // Enhanced logging with booking details
      expiredBookings.forEach((booking, index) => {
        const expiredMinutes = Math.floor(
          (Date.now() - new Date(booking.expiresAt!).getTime()) / (1000 * 60)
        );
        this.logger.warn(
          `⏰ [${sessionId}][${index + 1}/${expiredBookings.length}] Expiring booking: ${booking.bookingReference} ` +
          `(User: ${booking.userId}, Trip: ${booking.trip?.route?.origin || 'Unknown'} → ${booking.trip?.route?.destination || 'Unknown'}) ` +
          `expired ${expiredMinutes}min ago (deadline: ${booking.expiresAt?.toISOString()})`
        );
      });

      // Process expiration with retry mechanism
      let retryCount = 0;
      const maxRetries = 2;
      let result: { expiredCount: number; bookings: string[] } = { expiredCount: 0, bookings: [] };

      while (retryCount <= maxRetries) {
        try {
          result = await this.bookingService.expireBookings();
          break; // Success, exit retry loop
        } catch (error) {
          retryCount++;
          if (retryCount > maxRetries) {
            throw error; // Final failure
          }
          this.logger.warn(`⚠️ [${sessionId}] Expiration attempt ${retryCount} failed, retrying... Error: ${error.message}`);
          await this.delay(1000 * retryCount); // Progressive delay
        }
      }
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      if (result.expiredCount > 0) {
        this.logger.log(
          `✅ [${sessionId}] Successfully expired ${result.expiredCount}/${expiredBookings.length} bookings in ${processingTime}ms: ` +
          `[${result.bookings.join(', ')}]`
        );

        // Enhanced seat release logging
        this.logger.log(`🪑 [${sessionId}] Released seats for ${result.expiredCount} expired bookings`);
        
        // Log performance metrics
        const avgProcessingTime = processingTime / result.expiredCount;
        this.logger.debug(`📊 [${sessionId}] Performance: ${avgProcessingTime.toFixed(2)}ms avg per booking`);
      } else {
        this.logger.error(`⚠️ [${sessionId}] No bookings were expired despite finding ${expiredBookings.length} expired bookings - possible race condition or data inconsistency`);
      }

      return result;

    } catch (error) {
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      this.logger.error(
        `❌ [${sessionId}] Failed to process expired bookings after ${processingTime}ms:`,
        error.stack || error.message
      );
      
      // Return error in result instead of throwing
      return { 
        expiredCount: 0, 
        bookings: [], 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }

  /**
   * Utility method for delays in retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manually trigger expiration process (for testing/admin)
   * Returns detailed results with idempotency safety
   */
  async triggerManualExpiration(): Promise<{ 
    processed: number; 
    errors: string[];
    sessionId: string;
    processingTimeMs: number;
  }> {
    const sessionId = `manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    
    this.logger.log(`🔧 [${sessionId}] Manual booking expiration triggered`);
    
    try {
      const result = await this.processExpiredBookings();
      const processingTime = Date.now() - startTime;
      
      if (result.error) {
        this.logger.error(`❌ [${sessionId}] Manual expiration failed after ${processingTime}ms: ${result.error}`);
        return {
          processed: 0,
          errors: [result.error],
          sessionId,
          processingTimeMs: processingTime,
        };
      }
      
      this.logger.log(`✅ [${sessionId}] Manual expiration completed: ${result.expiredCount} bookings processed in ${processingTime}ms`);
      
      return {
        processed: result.expiredCount,
        errors: [],
        sessionId,
        processingTimeMs: processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);
      
      return {
        processed: 0,
        errors: [errorMsg],
        sessionId,
        processingTimeMs: processingTime,
      };
    }
  }

  /**
   * Get comprehensive cron job status and health information
   */
  getCronJobStatus(): { 
    isRunning: boolean; 
    nextRun: string | null;
    schedule: string;
    timezone: string;
    serviceHealth: 'healthy' | 'degraded' | 'unavailable';
    lastCheck?: Date;
  } {
    const serviceHealth = this.bookingService ? 'healthy' : 'unavailable';
    
    if (!this.cronJob) {
      return { 
        isRunning: false, 
        nextRun: null,
        schedule: '*/2 * * * *',
        timezone: 'UTC',
        serviceHealth,
      };
    }

    return {
      isRunning: this.isJobRunning && !!this.cronJob,
      nextRun: 'Every 2 minutes',
      schedule: '*/2 * * * *',
      timezone: 'UTC',
      serviceHealth,
      lastCheck: new Date(),
    };
  }

  /**
   * Restart the cron job with safety checks
   */
  restartCronJob(): { success: boolean; message: string } {
    try {
      this.logger.log('🔄 Restarting booking expiration cron job');
      
      // Safety check: ensure we have BookingService
      if (!this.bookingService) {
        const errorMsg = 'Cannot restart cron job: BookingService not available';
        this.logger.error(errorMsg);
        return { success: false, message: errorMsg };
      }
      
      this.stopBookingExpirationJob();
      this.startBookingExpirationJob();
      
      const successMsg = 'Cron job restarted successfully';
      this.logger.log(`✅ ${successMsg}`);
      return { success: true, message: successMsg };
    } catch (error) {
      const errorMsg = `Failed to restart cron job: ${error.message}`;
      this.logger.error(errorMsg, error);
      return { success: false, message: errorMsg };
    }
  }
}
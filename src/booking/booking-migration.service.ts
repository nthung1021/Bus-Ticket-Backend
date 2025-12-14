import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Booking } from '../entities/booking.entity';

@Injectable()
export class BookingMigrationService {
  private readonly logger = new Logger(BookingMigrationService.name);

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  /**
   * Generate booking references for existing bookings that don't have one
   */
  async generateMissingBookingReferences(): Promise<void> {
    try {
      // Find all bookings without booking_reference
      const bookingsWithoutRef = await this.bookingRepository.find({
        where: { bookingReference: IsNull() },
      });

      if (bookingsWithoutRef.length === 0) {
        this.logger.log('All bookings already have booking references');
        return;
      }

      this.logger.log(`Found ${bookingsWithoutRef.length} bookings without booking references`);

      // Generate unique booking references for each
      for (const booking of bookingsWithoutRef) {
        const bookingRef = await this.generateUniqueBookingReference(booking);
        booking.bookingReference = bookingRef;
        await this.bookingRepository.save(booking);
        this.logger.log(`Generated booking reference ${bookingRef} for booking ${booking.id}`);
      }

      this.logger.log(`Successfully generated booking references for ${bookingsWithoutRef.length} bookings`);
    } catch (error) {
      this.logger.error('Failed to generate booking references:', error);
      throw error;
    }
  }

  /**
   * Generate a unique booking reference
   */
  private async generateUniqueBookingReference(booking: Booking): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      // Format: BK + YYYYMMDD + random 4-digit number
      const date = booking.bookedAt || new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const bookingRef = `BK${dateStr}${randomSuffix}`;

      // Check if this reference already exists
      const existing = await this.bookingRepository.findOne({
        where: { bookingReference: bookingRef },
      });

      if (!existing) {
        return bookingRef;
      }

      attempts++;
    }

    // Fallback to timestamp-based reference if all attempts failed
    const timestamp = Date.now();
    return `BK${timestamp}`;
  }
}
import { Injectable, BadRequestException } from '@nestjs/common';
import { Booking, BookingStatus } from '../entities/booking.entity';
import { Trip } from '../entities/trip.entity';

export interface BookingModificationRules {
  canModifyPassengerInfo: boolean;
  canModifySeats: boolean;
  canModifyContactInfo: boolean;
  reason?: string;
}

@Injectable()
export class BookingModificationPermissionService {
  /**
   * Check if a booking can be modified based on business rules
   * Rules:
   * 1. Status must be PENDING or PAID
   * 2. Must be at least 24 hours before departure time
   * 3. Specific fields allowed: passenger name, ID/CCCD, phone, seats (if available)
   */
  async checkModificationPermissions(
    booking: Booking,
    requestedModifications: {
      passengerInfo?: boolean;
      seats?: boolean;
      contactInfo?: boolean;
    }
  ): Promise<BookingModificationRules> {
    // Check status requirement
    if (!this.isStatusModifiable(booking.status)) {
      return {
        canModifyPassengerInfo: false,
        canModifySeats: false,
        canModifyContactInfo: false,
        reason: `Cannot modify booking with status: ${booking.status}. Only PENDING or PAID bookings can be modified.`
      };
    }

    // Check time requirement (24 hours before departure)
    if (!this.isDepartureTimeValid(booking.trip.departureTime)) {
      return {
        canModifyPassengerInfo: false,
        canModifySeats: false,
        canModifyContactInfo: false,
        reason: 'Cannot modify booking within 24 hours of departure time.'
      };
    }

    // All checks passed - determine which modifications are allowed
    return {
      canModifyPassengerInfo: true,
      canModifySeats: true,
      canModifyContactInfo: true,
    };
  }

  /**
   * Check if booking status allows modifications
   */
  private isStatusModifiable(status: BookingStatus): boolean {
    return status === BookingStatus.PENDING || status === BookingStatus.PAID;
  }

  /**
   * Check if departure time is at least 24 hours away
   */
  private isDepartureTimeValid(departureTime: Date): boolean {
    const now = new Date();
    const hoursUntilDeparture = (departureTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilDeparture >= 24;
  }

  /**
   * Validate modification permissions and throw error if not allowed
   */
  async validateModificationPermissions(
    booking: Booking,
    requestedModifications: {
      passengerInfo?: boolean;
      seats?: boolean;
      contactInfo?: boolean;
    }
  ): Promise<void> {
    const permissions = await this.checkModificationPermissions(booking, requestedModifications);

    if (requestedModifications.passengerInfo && !permissions.canModifyPassengerInfo) {
      throw new BadRequestException(permissions.reason || 'Cannot modify passenger information');
    }

    if (requestedModifications.seats && !permissions.canModifySeats) {
      throw new BadRequestException(permissions.reason || 'Cannot modify seat selection');
    }

    if (requestedModifications.contactInfo && !permissions.canModifyContactInfo) {
      throw new BadRequestException(permissions.reason || 'Cannot modify contact information');
    }
  }

  /**
   * Get human-readable modification rules for a booking
   */
  async getModificationRulesDescription(booking: Booking): Promise<string[]> {
    const rules: string[] = [];

    rules.push('Booking can be modified if:');
    rules.push('• Status is PENDING or PAID');
    rules.push('• At least 24 hours before departure time');
    rules.push('');
    rules.push('Modifiable fields:');
    rules.push('• Passenger name');
    rules.push('• ID/CCCD number');
    rules.push('• Contact phone');
    rules.push('• Seat selection (if seats are available)');

    const permissions = await this.checkModificationPermissions(booking, {
      passengerInfo: true,
      seats: true,
      contactInfo: true
    });

    if (!permissions.canModifyPassengerInfo) {
      rules.push('');
      rules.push(`⚠️ Current restriction: ${permissions.reason}`);
    }

    return rules;
  }
}
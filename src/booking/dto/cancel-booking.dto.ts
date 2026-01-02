import { BookingStatus } from '../../entities/booking.entity';

export class CancelBookingResponseDto {
  bookingId: string;
  bookingStatus: BookingStatus;
  refund: {
    amount: number;
    status: 'SUCCESS' | 'FAILED' | 'PENDING';
  };
}
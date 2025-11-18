import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Trip } from './trip.entity';
import { PassengerDetail } from './passenger-detail.entity';
import { SeatStatus } from './seat-status.entity';
import { Payment } from './payment.entity';
import { Notification } from './notification.entity';

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'trip_id' })
  tripId: string;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2 })
  totalAmount: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @CreateDateColumn({ name: 'booked_at' })
  bookedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.bookings)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Trip, (trip) => trip.bookings)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @OneToMany(
    () => PassengerDetail,
    (passengerDetail) => passengerDetail.booking,
  )
  passengerDetails: PassengerDetail[];

  @OneToMany(() => SeatStatus, (seatStatus) => seatStatus.booking)
  seatStatuses: SeatStatus[];

  @OneToMany(() => Payment, (payment) => payment.booking)
  payments: Payment[];

  @OneToMany(() => Notification, (notification) => notification.booking)
  notifications: Notification[];
}

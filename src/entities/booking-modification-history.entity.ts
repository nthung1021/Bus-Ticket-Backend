import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { Booking } from './booking.entity';
import { User } from './user.entity';

export enum ModificationType {
  PASSENGER_INFO = 'passenger_info',
  SEAT_CHANGE = 'seat_change',
  CONTACT_INFO = 'contact_info',
}

@Entity('booking_modification_history')
@Index('idx_modification_history_booking', ['bookingId'])
@Index('idx_modification_history_user', ['userId'])
@Index('idx_modification_history_type', ['modificationType'])
export class BookingModificationHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id' })
  @Index('idx_modification_history_booking_id')
  bookingId: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({
    type: 'enum',
    enum: ModificationType,
    name: 'modification_type',
  })
  modificationType: ModificationType;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'jsonb', nullable: true })
  changes: any; // Store the actual changes made

  @Column({ type: 'jsonb', nullable: true })
  previousValues: any; // Store previous values for rollback capability

  @CreateDateColumn({ name: 'modified_at', type: 'timestamp with time zone' })
  modifiedAt: Date;

  // Relations
  @ManyToOne(() => Booking)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
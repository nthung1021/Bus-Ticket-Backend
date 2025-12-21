import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Unique,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Trip } from './trip.entity';
import { Booking } from './booking.entity';

@Entity('reviews')
@Unique('UQ_booking_review', ['bookingId']) // Unique constraint: 1 booking → 1 review
@Index('idx_reviews_user_id', ['userId'])
@Index('idx_reviews_trip_id', ['tripId'])
@Index('idx_reviews_rating', ['rating'])
@Index('idx_reviews_created_at', ['createdAt'])
export class Review {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  @Index('idx_reviews_user_id_single')
  userId: string;

  @Column({ name: 'trip_id' })
  @Index('idx_reviews_trip_id_single')
  tripId: string;

  @Column({ name: 'booking_id', unique: true })
  @Index('idx_reviews_booking_id')
  bookingId: string;

  @Column('int', { comment: 'Rating from 1 to 5 stars' })
  rating: number;

  @Column({ type: 'text', nullable: true, comment: 'Optional review comment' })
  comment: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.reviews)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Trip, (trip) => trip.reviews)
  @JoinColumn({ name: 'trip_id' })
  trip: Trip;

  @ManyToOne(() => Booking, (booking) => booking.review)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;
}

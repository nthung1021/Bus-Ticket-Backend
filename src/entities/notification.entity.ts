import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { User } from './user.entity';

export enum NotificationChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app',
}

export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  DELIVERED = 'delivered',
  READ = 'read',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'booking_id', nullable: true })
  bookingId?: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ nullable: true })
  title: string;

  @Column()
  message: string;

  @Column({ nullable: true })
  type: string;

  @Column({ type: 'jsonb', nullable: true })
  data: any;

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    default: NotificationChannel.EMAIL,
  })
  channel: NotificationChannel;

  @Column()
  template: string;

  @Column({
    type: 'enum',
    enum: NotificationStatus,
    default: NotificationStatus.PENDING,
  })
  status: NotificationStatus;

  @CreateDateColumn({ name: 'sent_at', type: 'timestamp with time zone' })
  sentAt: Date;

  // Relations
  @ManyToOne(() => Booking, (booking) => booking.notifications)
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @ManyToOne(() => User, (user) => user.notifications)
  @JoinColumn({ name: 'user_id' })
  user: User;
}

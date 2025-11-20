import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Booking } from './booking.entity';
import { PaymentMethod } from './payment-method.entity';
import { Feedback } from './feedback.entity';

export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  OPERATOR = 'operator',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  googleId: string | null;

  @Column()
  email: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToMany(() => Booking, (booking) => booking.user)
  bookings: Booking[];

  @OneToMany(() => PaymentMethod, (paymentMethod) => paymentMethod.user)
  paymentMethods: PaymentMethod[];

  @OneToMany(() => Feedback, (feedback) => feedback.user)
  feedbacks: Feedback[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { Booking } from './booking.entity';
import { PaymentMethod } from './payment-method.entity';
import { Feedback } from './feedback.entity';
import { RefreshToken } from './refresh-token.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { Notification } from './notification.entity';
import { Review } from './review.entity';

export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer'
}

@Entity('users')
@Index('idx_users_role_created', ['role', 'createdAt'])
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  @Index('idx_users_google_id')
  googleId: string | null;

  @Column({
    type: 'varchar',
    nullable: true,
    unique: true,
  })
  @Index('idx_users_facebook_id')
  facebookId: string | null;

  @Column()
  @Index('idx_users_email') // Email is unique but also needs index for fast lookups
  email: string;

  @Column()
  @Index('idx_users_name')
  name: string;

  @Column({ nullable: true })
  @Index('idx_users_phone')
  phone: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'is_email_verified', type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ name: 'email_verification_code', type: 'varchar', length: 6, nullable: true })
  emailVerificationCode: string | null;

  @Column({ name: 'email_verification_expires_at', type: 'timestamp with time zone', nullable: true })
  emailVerificationExpiresAt: Date | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  @Index('idx_users_role')
  role: UserRole;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  // Relations
  @OneToMany(() => Booking, (booking) => booking.user)
  bookings: Booking[];

  @OneToMany(() => Review, (review) => review.user)
  reviews: Review[];

  @OneToMany(() => Feedback, (feedback) => feedback.user)
  feedbacks: Feedback[];

  @OneToMany(() => PaymentMethod, (paymentMethod) => paymentMethod.user)
  paymentMethods: PaymentMethod[];

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => PasswordResetToken, (prt) => prt.user)
  passwordResetTokens: PasswordResetToken[];

  @OneToMany(() => Notification, (notification) => notification.user)
  notifications: Notification[];
}

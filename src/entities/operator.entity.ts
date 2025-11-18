import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Bus } from './bus.entity';
import { Route } from './route.entity';

export enum OperatorStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  SUSPENDED = 'suspended',
}

@Entity('operators')
export class Operator {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ name: 'contact_email', unique: true })
  contactEmail: string;

  @Column({ name: 'contact_phone' })
  contactPhone: string;

  @Column({
    type: 'enum',
    enum: OperatorStatus,
    default: OperatorStatus.PENDING,
  })
  status: OperatorStatus;

  @Column({ name: 'approved_at', nullable: true })
  approvedAt: Date;

  // Relations
  @OneToMany(() => Bus, (bus) => bus.operator)
  buses: Bus[];

  @OneToMany(() => Route, (route) => route.operator)
  routes: Route[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Operator } from './operator.entity';
import { Trip } from './trip.entity';

@Entity('routes')
export class Route {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'operator_id' })
  operatorId: string;

  @Column()
  origin: string;

  @Column()
  destination: string;

  @Column({ name: 'distance_km' })
  distanceKm: number;

  @Column({ name: 'estimated_minutes' })
  estimatedMinutes: number;

  // Relations
  @ManyToOne(() => Operator, (operator) => operator.routes)
  operator: Operator;

  @OneToMany(() => Trip, (trip) => trip.route)
  trips: Trip[];
}

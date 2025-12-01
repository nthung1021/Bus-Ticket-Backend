import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { Operator } from './operator.entity';
import { Trip } from './trip.entity';
import { Seat } from './seat.entity';
import { SeatLayout } from './seat-layout.entity';

@Entity('buses')
export class Bus {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'operator_id' })
  operatorId: string;

  @Column({ name: 'plate_number', unique: true })
  plateNumber: string;

  @Column()
  model: string;

  @Column({ name: 'seat_capacity' })
  seatCapacity: number;

  @Column({ name: 'amenities_json', type: 'json', nullable: true })
  amenities: string[];

  // Relations
  @ManyToOne(() => Operator, (operator) => operator.buses)
  @JoinColumn({ name: 'operator_id' })
  operator: Operator;

  @OneToMany(() => Trip, (trip) => trip.bus)
  trips: Trip[];

  @OneToMany(() => Seat, (seat) => seat.bus)
  seats: Seat[];

  @OneToOne(() => SeatLayout, (seatLayout) => seatLayout.bus)
  seatLayout: SeatLayout;
}

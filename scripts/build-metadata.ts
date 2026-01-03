import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PassengerDetail } from '../src/entities/passenger-detail.entity';
import { Booking } from '../src/entities/booking.entity';

const ds = new DataSource({
  type: 'postgres' as any,
  host: 'localhost',
  username: 'x',
  password: 'x',
  database: 'x',
  entities: [PassengerDetail, Booking],
  synchronize: false,
});

try {
  (ds as any).buildMetadatas();
  const meta = ds.entityMetadatas.find((m: any) => m.name === 'PassengerDetail');
  if (!meta) {
    console.error('PassengerDetail metadata not found');
  } else {
    console.log('Found metadata for PassengerDetail');
    meta.columns.forEach((c: any) => console.log(c.propertyName, '->', c.type));
  }
} catch (err) {
  console.error('buildMetadatas error:', err);
}

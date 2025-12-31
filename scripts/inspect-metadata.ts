import 'reflect-metadata';
import { PassengerDetail } from '../src/entities/passenger-detail.entity';

const meta = Reflect.getMetadata('design:type', PassengerDetail.prototype, 'documentId');
console.log('design:type for PassengerDetail.documentId =', meta && meta.name ? meta.name : meta);

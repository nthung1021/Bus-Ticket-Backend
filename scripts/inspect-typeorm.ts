import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { PassengerDetail } from '../src/entities/passenger-detail.entity';

const storage = getMetadataArgsStorage();
const cols = storage.columns.filter(c => c.target === PassengerDetail);
console.log('columns metadata for PassengerDetail:');
cols.forEach(c => console.log(c.propertyName, '->', c.options && c.options.type ? c.options.type : '(no explicit type)'));

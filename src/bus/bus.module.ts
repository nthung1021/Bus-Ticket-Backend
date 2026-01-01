import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bus } from '../entities/bus.entity';
import { BusController } from './bus.controller';
import { BusService } from './bus.service';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Bus]),
    CloudinaryModule,
  ],
  controllers: [BusController],
  providers: [BusService],
  exports: [BusService],
})
export class BusModule {}

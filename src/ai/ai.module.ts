import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { TripsModule } from '../trips/trips.module';

@Module({
  imports: [TripsModule],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}

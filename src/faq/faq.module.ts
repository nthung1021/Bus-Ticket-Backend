
import { Module } from '@nestjs/common';
import { FaqService } from './faq.service';
import { FaqController } from './faq.controller';

@Module({
  providers: [FaqService],
  controllers: [FaqController],
  exports: [FaqService],
})
export class FaqModule {}

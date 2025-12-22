import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiService } from '../ai/ai.service';
import { AiModule } from '../ai/ai.module';
import { TripsModule } from '../trips/trips.module';
import { BookingModule } from '../booking/booking.module';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), TripsModule, BookingModule, AiModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}

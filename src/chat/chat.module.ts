import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AiService } from '../ai/ai.service';
import { ChatToolsService } from './chat-tools.service';
import { TripsModule } from '../trips/trips.module';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message]), TripsModule],
  controllers: [ChatController],
  providers: [ChatService, AiService, ChatToolsService],
  exports: [ChatService],
})
export class ChatModule {}

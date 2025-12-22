import { Injectable, Logger } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { SendMessageDto } from './dto/send-message.dto';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Conversation } from './entities/conversation.entity';
import { Message } from './entities/message.entity';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  constructor(
    private readonly aiService: AiService,
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
  ) {}

  async sendMessage(dto: SendMessageDto, userId?: string) {
    const conversationId =
      dto.conversationId ?? `conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    const now = new Date().toISOString();

    // find or create conversation
    let conversation: Conversation | null = null;
    if (dto.conversationId) {
      conversation = await this.convRepo.findOne({ where: { id: dto.conversationId }, relations: ['messages'] });
    }
    if (!conversation) {
      conversation = this.convRepo.create({});
      await this.convRepo.save(conversation);
    }

    // save user message
    const userMessage = this.msgRepo.create({
      conversation,
      role: 'human',
      content: dto.message,
    });
    await this.msgRepo.save(userMessage);


    // Chỉ lấy tin nhắn gần nhất của user
    const lastUserMessage = new HumanMessage({ content: dto.message });
    const llmInput = [lastUserMessage];

    let aiResponseText = '';
    try {
      const aiRes = await this.aiService.invoke(llmInput, { userId });

      // Clean up possible code fences (e.g. ```json ... ``` ) returned by the LLM
      let cleaned = aiRes == null ? '' : String(aiRes).trim();
      const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fenceMatch) cleaned = fenceMatch[1].trim();
      if (cleaned.startsWith('`') && cleaned.endsWith('`')) cleaned = cleaned.slice(1, -1).trim();

      try {
        const parsed = JSON.parse(cleaned);
        aiResponseText = parsed?.content ?? (typeof parsed === 'string' ? parsed : JSON.stringify(parsed));
      } catch (err) {
        this.logger.warn('Failed to parse AI response as JSON, returning cleaned text');
        aiResponseText = cleaned;
      }
    } catch (err) {
      this.logger.error('AI call failed', err as any);
      aiResponseText = 'Error: failed to get response from AI';
    }

    const aiMessage = this.msgRepo.create({
      conversation,
      role: 'ai',
      content: aiResponseText,
    });
    await this.msgRepo.save(aiMessage);

    const updatedHistory = await this.msgRepo.find({ where: { conversation: { id: conversation.id } }, order: { createdAt: 'ASC' } });

    return {
      conversationId: conversation.id,
      ai: { role: 'ai', content: aiResponseText, timestamp: aiMessage.createdAt?.toISOString?.() ?? new Date().toISOString() },
      history: updatedHistory.map((m) => ({ role: m.role, content: m.content, timestamp: m.createdAt.toISOString() })),
    };
  }

  getHistory(conversationId: string) {
    return this.msgRepo.find({ where: { conversation: { id: conversationId } }, order: { createdAt: 'ASC' } });
  }

  async deleteHistory(conversationId: string) {
    // Delete messages belonging to the conversation, then delete the conversation
    await this.msgRepo.createQueryBuilder().delete().where('"conversationId" = :id', { id: conversationId }).execute();
    await this.convRepo.delete(conversationId);
    return { deleted: true, conversationId };
  }
}

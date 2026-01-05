import { Injectable, Logger, NotFoundException, InternalServerErrorException } from '@nestjs/common';
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
    // Tạo hoặc lấy conversationId (nếu không có thì tạo mới dạng ngẫu nhiên)
    const conversationId =
      dto.conversationId ?? `conv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;
    // const now = new Date().toISOString(); // Biến này không sử dụng, có thể bỏ

    // Tìm kiếm hoặc tạo mới một cuộc hội thoại (conversation)
    let conversation: Conversation | null = null;
    if (dto.conversationId) {
      // Nếu có conversationId, tìm conversation tương ứng và lấy kèm các message liên quan
      conversation = await this.convRepo.findOne({ where: { id: dto.conversationId }, relations: ['messages'] });
    }
    if (!conversation) {
      // Nếu không tìm thấy, tạo mới conversation
      conversation = this.convRepo.create({});
      await this.convRepo.save(conversation);
    }

    // Lưu tin nhắn của người dùng vào database
    const userMessage = this.msgRepo.create({
      conversation, // liên kết với conversation vừa tìm hoặc tạo
      role: 'human', // phân biệt vai trò là người dùng
      content: dto.message, // nội dung tin nhắn
    });
    await this.msgRepo.save(userMessage);

    // Chỉ lấy tin nhắn gần nhất của user để gửi cho AI (không gửi toàn bộ lịch sử)
    const lastUserMessage = new HumanMessage({ content: dto.message });
    const llmInput = [lastUserMessage];

    let aiResponseText = '';
    try {
      // Gọi AI service để lấy phản hồi dựa trên tin nhắn cuối cùng của user
      const aiRes = await this.aiService.invoke(llmInput, { userId });

      // Làm sạch kết quả trả về từ AI (loại bỏ code fence như ```json ... ``` nếu có)
      let cleaned = aiRes == null ? '' : String(aiRes).trim();
      const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fenceMatch) cleaned = fenceMatch[1].trim();
      if (cleaned.startsWith('`') && cleaned.endsWith('`')) cleaned = cleaned.slice(1, -1).trim();

      // Lưu nội dung đã làm sạch vào biến kết quả
      aiResponseText = cleaned;
    } catch (err) {
      // Nếu gọi AI thất bại, log lỗi và trả về thông báo lỗi
      this.logger.error('AI call failed', err as any);
      aiResponseText = 'Error: failed to get response from AI';
    }

    // Lưu tin nhắn phản hồi của AI vào database
    const aiMessage = this.msgRepo.create({
      conversation,
      role: 'ai', // phân biệt vai trò là AI
      content: aiResponseText,
    });
    await this.msgRepo.save(aiMessage);

    // Lấy lại toàn bộ lịch sử tin nhắn của cuộc hội thoại sau khi đã thêm tin nhắn mới
    const updatedHistory = await this.msgRepo.find({ where: { conversation: { id: conversation.id } }, order: { createdAt: 'ASC' } });

    // Trả về kết quả gồm conversationId, phản hồi của AI và lịch sử hội thoại
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
    try {
      // Verify conversation exists
      const conv = await this.convRepo.findOne({ where: { id: conversationId } });
      if (!conv) {
        throw new NotFoundException(`Conversation with ID ${conversationId} not found`);
      }

      // Delete messages belonging to the conversation, then delete the conversation
      await this.msgRepo.createQueryBuilder().delete().where('"conversationId" = :id', { id: conversationId }).execute();
      await this.convRepo.delete(conversationId);

      return { deleted: true, conversationId };
    } catch (err) {
      this.logger.error(`Failed to delete conversation history for ${conversationId}`, err as any);
      throw new InternalServerErrorException('Failed to delete conversation history');
    }
  }
}

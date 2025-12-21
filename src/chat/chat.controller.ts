import { UseGuards, Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('chat')
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	@UseGuards(JwtAuthGuard)
	@Post('message')
	async sendMessage(@Body() dto: SendMessageDto, @Req() req) {
		const userId = req.user?.id;
		return this.chatService.sendMessage(dto, userId);
	}

	@Get('history/:id')
	getHistory(@Param('id') id: string) {
		return this.chatService.getHistory(id);
	}

	@Delete('history/:id')
	async deleteHistory(@Param('id') id: string) {
		return this.chatService.deleteHistory(id);
	}
}

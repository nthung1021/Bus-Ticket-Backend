import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
export class ChatController {
	constructor(private readonly chatService: ChatService) {}

	@Post('message')
	async sendMessage(@Body() dto: SendMessageDto) {
		return this.chatService.sendMessage(dto);
	}

	@Get('history/:id')
	getHistory(@Param('id') id: string) {
		return this.chatService.getHistory(id);
	}
}

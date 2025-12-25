import { IsString, IsOptional } from 'class-validator';

export class SendMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

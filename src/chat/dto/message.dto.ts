export class MessageDto {
  role: 'system' | 'human' | 'ai';
  content: string;
  timestamp?: string;
}

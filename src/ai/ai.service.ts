import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { ChatToolsService } from '../chat/chat-tools.service';

@Injectable()
export class AiService {
  private llm = new ChatOllama({
    baseUrl: 'http://localhost:11434',
    model: 'deepseek-r1:latest',
    temperature: 0.2,
  });

  private boundLlM: any | null = null;

  constructor(private readonly tools: ChatToolsService) {}

  private getBoundLLM() {
    if (!this.boundLlM) {
      const tools = this.tools.getTools();
      this.boundLlM = this.llm.bindTools(tools as any);
    }
    return this.boundLlM;
  }

  async invoke(messages: any) {
    const llm = this.getBoundLLM();
    return llm.invoke(messages);
  }
}
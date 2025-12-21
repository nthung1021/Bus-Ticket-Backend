import { Injectable } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';

@Injectable()
export class AiService {
  llm = new ChatOllama({
    baseUrl: 'http://localhost:11434',
    model: 'deepseek-r1:latest',
    temperature: 0.2,
  });
}
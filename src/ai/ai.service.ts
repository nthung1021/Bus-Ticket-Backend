import { Injectable, Logger } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { SystemMessage, AIMessage } from '@langchain/core/messages';
import { TripsService } from 'src/trips/trips.service';

@Injectable()
export class AiService {
  private llm: any;

  private readonly logger = new Logger(AiService.name);

  constructor(private readonly tripsService: TripsService) {
    this.llm = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b',
      temperature: 0.2,
      verbose: false
    });
  }

  async invoke(messages: any) {
    // Prepend system message to the messages array
    const systemMsg = new SystemMessage(`
      You are an AI assistant for a bus ticket booking service.
      Response to the user queries as a JSON object with the following schema:
      {
      "content": string, // The answer to the user's query
      "tool_calls: // Can be an empty array if no tool is needed
        [
          {
            "tool_name": string, // The name of the tool to use
            "parameters": object // The parameters to pass to the tool
          }
        ]
      }
      Tools you can use:
      1. search_trips: Use this tool to search for bus trips based on user criteria.
      Parameters for search_trips:
      {
        origin: string, // Optional, The starting location of the trip
        destination: string, // Optional, The ending location of the trip
        date: string, // Optional, The date of the trip in YYYY-MM-DD format
        passengers: number, // Optional, Number of passengers
        busType: string, // Optional, Type of bus (standard, limousine, sleeper)
        departureTime: string, // Optional, Preferred departure time (morning, afternoon, evening, night)
        minPrice: number, // Optional, Minimum price
        maxPrice: number, // Optional, Maximum price
        operatorId: string, // Optional, Bus operator ID
        page: number, // Optional, Pagination page number
        limit: number // Optional, Number of results per page
      }
    `);
    const msgs = [systemMsg, ...(Array.isArray(messages) ? messages : [messages])];
    const raw = await this.llm?.invoke(msgs);
    this.logger.log('LLM raw response:', raw);
    return raw;
  }
}
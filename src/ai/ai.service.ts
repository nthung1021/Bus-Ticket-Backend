import { Injectable, Logger } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { SystemMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
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
      Do not search for trips without using this tool.
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

      If after the tool call, you have enough information to answer the user's query, respond with the final answer in the "content" field and an empty "tool_calls" array.
      If you don't have enough information, output something like "I don't have enough information to answer that question."
    `);
    const msgs = [systemMsg, ...(Array.isArray(messages) ? messages : [messages])];
    const raw = await this.llm?.invoke(msgs);
    // this.logger.log('LLM raw response:', raw);
    const parsed = JSON.parse(raw.content);
    if (parsed.tool_calls && parsed.tool_calls.length > 0) {
      for (const toolCall of parsed.tool_calls) {
        if (toolCall.tool_name === 'search_trips') {
          const toolResult = await this.tripsService.search(toolCall.parameters);
          console.log("AI Service - Tool Result:", toolResult); 
          const aiMsg = new HumanMessage(JSON.stringify({
            content: `Here are the search results: ${JSON.stringify(toolResult)}`,  
          }));
          msgs.push(aiMsg);
        }
      }
    }
    const finalResponse = await this.llm?.invoke(msgs);
    const rawFinal = finalResponse.content;
    return rawFinal;
  }
}
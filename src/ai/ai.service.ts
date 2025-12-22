import { Injectable, Logger } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { SystemMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
import { TripsService } from 'src/trips/trips.service';
import { BookingService } from 'src/booking/booking.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../chat/entities/message.entity';
import { Repository } from 'typeorm';
import { push } from 'langchain/hub';

@Injectable()
export class AiService {
  private llm: any;
  private msgs: any[] = [];

  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly tripsService: TripsService,
    private readonly bookingService: BookingService,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
  ) {
    this.llm = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      model: 'llama3.1:8b',
      temperature: 0.2,
      verbose: false
    });
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
      If you already called this tool and got results, you can use that information to answer the user's query.
      Otherwise, call this tool with appropriate parameters.  
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

      2. book_ticket: Use this tool to book a bus ticket for the user.
      If the user hasn't provided all necessary information, ask for the missing details before calling this tool.
      Parameters for book_ticket:
      {
        tripId: string, // The ID of the trip to book
        seats: [{
          id: string, // Seat ID
          code: string, // Seat code
          type: 'normal' | 'vip' | 'business', // Seat type
          price: number // Seat price
        }], // Array of seat objects to book, each with id, code, type, price
        passengers: [{
          fullName: string, // Passenger's full name
          documentId: string, // Passenger's document ID
          seatCode: string, // Seat code assigned to the passenger
          documentType?: string, // Optional, Type of document (id, passport, license)
          phoneNumber?: string, // Optional, Passenger's phone number
          email?: string // Optional, Passenger's email address
        }], // Array of passenger objects with necessary details
        totalPrice: number, // Total price for the booking
        paymentMethod?: string, // Optional, Payment method (e.g., credit card, paypal)
        isGuestCheckout?: boolean, // Optional, Whether the user is checking out as a guest
        contactEmail?: string, // Optional, Contact email for booking confirmation
        contactPhone?: string // Optional, Contact phone number for booking confirmation
      }

      If after the tool call, you have enough information to answer the user's query, respond with the final answer in the "content" field and an empty "tool_calls" array.
      If you don't have enough information, output something like "I don't have enough information to answer that question."
    `);

    // Fetch all messages from DB and build LLM input
    this.msgRepo.find({ order: { createdAt: 'ASC' } }).then(messages => {
      this.msgs = messages.map((m: any) => {
        const contentStr = typeof m.content === 'string' ? m.content : String(m.content);
        if (m.role === 'human') return new HumanMessage({ content: contentStr });
        if (m.role === 'system') return new SystemMessage({ content: contentStr });
        return new AIMessage({ content: contentStr });
      });
    });
    this.msgs = [systemMsg, ...this.msgs];
  }

  async invoke(messages: any[], metadata?: { userId?: string }) {
    // Lấy userId từ metadata nếu có
    const userId = metadata?.userId;
    this.logger.log('AI invoked by user:', userId);
    // Prepend system message to the messages array
    
    this.msgs.push(...messages);
    const raw = await this.llm?.invoke(this.msgs);
    // this.logger.log('LLM raw response:', raw);
    const parsed = JSON.parse(raw.content);
    if (parsed.tool_calls && parsed.tool_calls.length > 0) {
      for (const toolCall of parsed.tool_calls) {
        if (toolCall.tool_name === 'search_trips') {
          const toolResult = await this.tripsService.search(toolCall.parameters);
          console.log("AI Service - Tool Result:", toolResult); 
          const aiMsg = new HumanMessage(JSON.stringify({
            content: `Here are the search results: ${JSON.stringify(toolResult, null, 2 )}`,  
          }));
          this.msgs.push(aiMsg);
        }
        else if (toolCall.tool_name === 'book_ticket') {
          // Book ticket using BookingService
          const bookingParams = toolCall.parameters;
          // userId from metadata
          const bookingUserId = userId || bookingParams.userId || null;
          try {
            const bookingResult = await this.bookingService.createBooking(bookingUserId, bookingParams);
            const aiMsg = new HumanMessage(JSON.stringify({
              content: `Booking successful! Details: ${JSON.stringify(bookingResult, null, 2)}`,
            }));
            this.msgs.push(aiMsg);
          } catch (err) {
            const aiMsg = new HumanMessage(JSON.stringify({
              content: `Booking failed: ${err.message}`,
            }));
            this.msgs.push(aiMsg);
          }
        }
      }
    }
    const finalResponse = await this.llm?.invoke(this.msgs);
    const rawFinal = finalResponse.content;
    console.log("AI Service - Final Response:", rawFinal);
    return rawFinal;
  }
}
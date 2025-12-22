import { Injectable, Logger } from '@nestjs/common';
import { ChatOllama } from '@langchain/ollama';
import { SystemMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
import { TripsService } from 'src/trips/trips.service';
import { BookingService } from 'src/booking/booking.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../chat/entities/message.entity';
import { Repository } from 'typeorm';
import { Seat } from '../entities/seat.entity';
import { SeatStatusService } from 'src/seat-status/seat-status.service';

@Injectable()
export class AiService {
  private llm: any;
  private msgs: any[] = [];

  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly tripsService: TripsService,
    private readonly bookingService: BookingService,
    private readonly seatStatusService: SeatStatusService,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,
  ) {
    this.llm = new ChatOllama({
      baseUrl: 'http://localhost:11434',
      // model: 'llama3.1:8b',
      model: 'deepseek-r1:latest',
      temperature: 0.2,
      verbose: false
    });
    const systemMsg = new SystemMessage(`
      You are an AI assistant for a bus ticket booking service.
      ALWAYS Response to the user queries as a JSON object with the following schema:
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
      2. search_seats: Use this tool to search for information about a seat.
      Parameters for search_seats:
      {
        busId: string, // The ID of the bus
        seatCode: string // The code of the seat
      }
      ** NOTE **:
      - busId is fetched from the selected trip in tool 'search_trips' results.
      - seatCode is provided by the user.
      3. calculate_total_price: Use this tool to calculate the total price for a booking.
      Parameters for calculate_total_price:
      {
        options: { tripBasePrice?: number; }, // The base price of the trip
        seats: {price: number}[], // Array of seat prices
      }
      4. search_seat_statuses: Use this tool to check the availability status of seats for a given trip.
      Parameters for search_seat_statuses:
      {
        tripId: string, // The ID of the trip
      }
      5. book_ticket: Use this tool to book a bus ticket for the user.
      If the user hasn't provided all necessary information, ALWAYS ask for the missing details before calling this tool. DO NOT make assumptions.
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
      ** NOTE **:
      - tripId is fetched from the selected trip in tool 'search_trips' results.
      - Each element in seats array only needs 'code' provided by user, other fields can be filled based on tool 'search_seats' results.
      - Each element in passengers array must have fullName, documentId, seatCode. Other fields are optional.
      - totalPrice is calculated using 'calculate_total_price' tool.
      - Other fields are optional based on user input.
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
      this.msgs = [systemMsg, ...this.msgs];
      // console.log("AI Service initialized with messages from DB:", this.msgs);
    });
    // console.log("AI Service initialized with messages:", this.msgs);
  }

  async invoke(messages: any[], metadata?: { userId?: string }) {
    // Lấy userId từ metadata nếu có
    const userId = metadata?.userId;
    // this.logger.log('AI invoked by user:', userId);
    // Prepend system message to the messages array
    
    this.msgs.push(...messages);
    // console.log("AI Service - Current Messages:", this.msgs);
    const raw = await this.llm?.invoke(this.msgs);
    // this.logger.log('LLM raw response:', raw);
    const parsed = JSON.parse(raw.content);
    if (parsed.tool_calls && parsed.tool_calls.length > 0) {
      for (const toolCall of parsed.tool_calls) {
        if (toolCall.tool_name === 'search_trips') {
          const toolResult = await this.tripsService.search(toolCall.parameters);
          // console.log("AI Service - Tool Result:", toolResult); 
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
        else if(toolCall.tool_name === 'search_seats') {
          const { busId, seatCode } = toolCall.parameters || {};
          if (!busId || !seatCode) {
            const aiMsg = new HumanMessage(JSON.stringify({ content: 'search_seats missing parameters: busId and seatCode required' }));
            this.msgs.push(aiMsg);
          } else {
            try {
              const seat = await this.seatRepo.findOne({ where: { busId, seatCode } });
              if (seat) {
                const aiMsg = new HumanMessage(JSON.stringify({ content: `Found seat: ${JSON.stringify(seat)}` }));
                this.msgs.push(aiMsg);
              } else {
                const aiMsg = new HumanMessage(JSON.stringify({ content: `Seat ${seatCode} not found on bus ${busId}` }));
                this.msgs.push(aiMsg);
              }
            } catch (err) {
              const aiMsg = new HumanMessage(JSON.stringify({ content: `Error searching seat: ${err.message}` }));
              this.msgs.push(aiMsg);
            }
          }
        }
        else if(toolCall.tool_name === 'calculate_total_price') {
          const { seats, options } = toolCall.parameters || {};
          if (!Array.isArray(seats)) {
            const aiMsg = new HumanMessage(JSON.stringify({ content: 'calculate_total_price missing or invalid `seats` array' }));
            this.msgs.push(aiMsg);
          } else {
            try {
              // Use bookingService helper to compute total
              const total = await this.bookingService.calculateTotalPrice(seats, options || {});
              const aiMsg = new HumanMessage(JSON.stringify({ content: `Calculated total price: ${total}`, totalPrice: total }));
              this.msgs.push(aiMsg);
            } catch (err) {
              const aiMsg = new HumanMessage(JSON.stringify({ content: `Error calculating price: ${err?.message || String(err)}` }));
              this.msgs.push(aiMsg);
            }
          }
        }
        else if(toolCall.tool_name === 'search_seat_statuses') {
          const { tripId } = toolCall.parameters || {};
          if (!tripId) {
            const aiMsg = new HumanMessage(JSON.stringify({ content: 'search_seat_statuses missing parameter: tripId required' }));
            this.msgs.push(aiMsg);
          } else {
            try {
              const seatStatuses = await this.seatStatusService.findByTripId(tripId);
              const aiMsg = new HumanMessage(JSON.stringify({ content: `Found seat statuses: ${JSON.stringify(seatStatuses)}` }));
              this.msgs.push(aiMsg);
            } catch (err) {
              const aiMsg = new HumanMessage(JSON.stringify({ content: `Error searching seat statuses: ${err.message}` }));
              this.msgs.push(aiMsg);
            }
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
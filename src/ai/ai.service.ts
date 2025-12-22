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
      model: 'llama3.1:8b',
      // model: 'deepseek-r1:latest',
      temperature: 0,
      verbose: false,
      think: false,      
    });
    const systemMsg = new SystemMessage(`
      You are an AI assistant for a bus ticket booking service.
      ALWAYS Response to the user queries as a JSON object with the following schema:
      {
      "content": string, 
      "tool_calls: 
        [
          {
            "tool_name": string, 
            "parameters": object 
          }
        ]
      }
      DO NOT include code comments.
      DO NOT output your thinking process.
      If you miss information that can be fetched from using one of the tools, use that tool to get information. 
      For example: If the user asks for seat status of a trip, you first need to call 'search_trips' to get the tripId, then use that tripId to call 'search_seat_statuses' tool to get the seat status information.
      If the information you miss is not available from the tools, ask the user for more details.
      If the user does not provide enough information to call a tool, ask the user again for more details.
      ---
      Here are some wrong outputs and reasons:
      WRONG:
      {
        "content": "I've found a trip from Ho Chi Minh to Nha Trang on December 14, 2025. I need more information about your seat preferences.",
        "tool_calls": [
          {
            "tool_name": "search_seats",
            "parameters": {
              "busId": "87bf7d3f-54c4-47de-9d6f-825a8e3e6fa0",
              "seatCode": "" // User needs to provide seat code
            }
          }
        ]
      }
      REASON: There is comment "// User needs to provide seat code" in the output, which is not allowed.
      
      WRONG: 
      {
        content: 'We have two available trips from Ho Chi Minh to Nha Trang.',  
        tooltips: [
          {
            tripId: 'af3f0f0a-78c2-4248-9de3-2d660c2ad395',
            departureTime: '2025-12-13T17:00:00.000Z',
            arrivalTime: '2025-12-14T13:00:00.000Z'
          },
          {
            tripId: '9d41d498-cdf5-433b-8d17-88cb7989c88e',
            departureTime: '2025-12-14T17:00:00.000Z',
            arrivalTime: '2025-12-15T13:00:00.000Z'
          }
        ]
      }
      REASON: Missing "tool_calls" field, and "tooltips" is not a valid field.

      WRONG: 
      {
        content: 'You have two options for trips: \n' +
          'Trip 1: Departing from Ho Chi Minh on December 13th at 17:00, arriving in Nha Trang on December 14th at 13:00. The base price is 20 VND.\n' +  
          'Trip 2: Departing from Ho Chi Minh on December 14th at 17:00, arriving in Nha Trang on December 15th at 13:00. The base price is 2000 VND.',   
        tool: 'trip_options',
        data: { trips: [ [Object], [Object] ] }
      }
      REASON: Missing "tool_calls" field, and "tool" and "data" are not valid fields.
      
      WRONG: 
      {
        "content": "You have two options for trips: 
      Trip 1: Departing from Ho Chi Minh on December 13th at 17:00, arriving in Nha Trang on December 14th at 13:00. The base price is 20 VND.
      Trip 2: Departing from Ho Chi Minh on December 14th at 17:00, arriving in Nha Trang on December 15th at 13:00. The base price is 2000 VND.",
        "tool_calls": [
          {
            "tool_name": "search_seat_statuses",
            "parameters": {
              "tripId": "af3f0f0a-78c2-4248-9de3-2d660c2ad395"
            }
          },
          {
            "tool_name": "search_seat_statuses",
            "parameters": {
              "tripId": "9d41d498-cdf5-433b-8d17-88cb7989c88e"
            }
          }
        ]
      }

      REASON: The content field contains multiple lines. It should be a single string using \\n for new lines.
      ---
      Here is a list of tools you can use:
      1. search_trips: Use this tool to search for bus trips based on user criteria.
      If you already called this tool and got results, you can use that information to answer the user's query.
      Otherwise, call this tool with appropriate parameters.  
      Parameters for search_trips:
      {
        origin: string, 
        destination: string, 
        date: string, 
        passengers: number, 
        departureTime: string,
        minPrice: number, 
        maxPrice: number, 
        operatorId: string,
        page: number,
        limit: number 
      }
      origin: Optional, The starting location of the trip
      destination: Optional, The ending location of the trip
      date: Optional, The date of the trip in YYYY-MM-DD format
      passengers: Optional, Number of passengers
      departureTime: Optional, Preferred departure time (morning, afternoon, evening, night)
      minPrice: Optional, Minimum price
      maxPrice: Optional, Maximum price
      operatorId: Optional, Bus operator ID
      page: Optional, Pagination page number
      limit: Optional, Number of results per page
      ---
      2. search_seats: Use this tool to search for information about a seat.
      Parameters for search_seats:
      {
        tripId
      }
      tripId: The ID of the trip
      ** NOTE **:
      - tripId is fetched from the selected trip in tool 'search_trips' results.
      ---
      3. calculate_total_price: Use this tool to calculate the total price for a booking.
      Parameters for calculate_total_price:
      {
        options: { tripBasePrice?: number; }, 
        seats: { price: number }[], 
      }
      options: Optional, Additional options for price calculation 
      seats: An array of seat objects, each containing a price field
      ** NOTE **: 
      - tripBasePrice in options can be fetched from the selected trip in tool 'search_trips' results.
      - Each element in seats array only needs 'price' field provided by user.
      ---
      4. book_ticket: Use this tool to book a bus ticket for the user.
      Parameters for book_ticket:
      {
        tripId: string, 
        seats: [{
          id: string, 
          code: string, 
          type: 'normal' | 'vip' | 'business', 
          price: number 
        }], 
        passengers: [{
          fullName: string, 
          documentId: string, 
          seatCode: string, 
          documentType?: string, 
          phoneNumber?: string, 
          email?: string 
        }], 
        totalPrice: number, 
        paymentMethod?: string, 
        isGuestCheckout?: boolean, 
        contactEmail?: string, 
        contactPhone?: string 
      }
      tripId: The ID of the trip to book
      seats: An array of seat objects to book, each with id, code, type, price
      passengers: An array of passenger objects with necessary details
      totalPrice: Total price for the booking
      paymentMethod: Optional, Payment method (e.g., credit card, paypal)
      isGuestCheckout: Optional, Whether the user is checking out as a guest
      contactEmail: Optional, Contact email for booking confirmation
      contactPhone: Optional, Contact phone number for booking confirmation
      ** NOTE **:
      - tripId is fetched from the selected trip in tool 'search_trips' results.
      - Each element in seats array only needs 'code' provided by user, other fields can be filled based on tool 'search_seats' results.
      - Each element in passengers array must have fullName, documentId, seatCode. Other fields are optional.
      - totalPrice is calculated using 'calculate_total_price' tool.
      - Other fields are optional based on user input.
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
    // Loop: invoke LLM, handle any tool_calls it returns, and repeat until no tool_calls remain.
    let finalRaw: string = '';
    let lastResponse: any = null;
    const MAX_ITERATIONS = 3;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      const response = await this.llm?.invoke(this.msgs);
      lastResponse = response;

      // Normalize and clean raw content (strip code fences like ```json ... ``` and surrounding backticks)
      let rawContent = '';
      if (response == null) {
        rawContent = '';
      } else if (typeof response === 'string') {
        rawContent = response;
      } else if (response.content != null) {
        rawContent = String(response.content);
      } else {
        rawContent = JSON.stringify(response);
      }

      rawContent = rawContent.trim();
      const fenceMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fenceMatch) rawContent = fenceMatch[1].trim();
      if (rawContent.startsWith('`') && rawContent.endsWith('`')) rawContent = rawContent.slice(1, -1).trim();

      let parsed: any;
      try {
        parsed = JSON.parse(rawContent);
      } catch (err) {
        this.logger.warn('Failed to parse LLM raw content as JSON, using raw text fallback');
        try {
          // Log helpful debug details to trace why parsing failed
          this.logger.debug('LLM rawContent (trimmed 2000 chars): ' + rawContent.slice(0, 2000));
        } catch (e) {
          // ignore
        }
        try {
          this.logger.debug('LLM rawContent (json-escaped): ' + JSON.stringify(rawContent));
        } catch (e) {
          // ignore
        }
        try {
          this.logger.debug('Full response object (trimmed): ' + JSON.stringify(response, null, 2).slice(0, 2000));
        } catch (e) {
          // ignore
        }
        this.logger.error('JSON.parse error while parsing LLM output', err as any);
        parsed = { content: rawContent };
      }

      // If the model requested tools, execute them and continue the loop.
      if (parsed.tool_calls && parsed.tool_calls.length > 0) {
        for (const toolCall of parsed.tool_calls) {
          console.log('AI Service - Tool Call Requested:', toolCall.tool_name);
          if (toolCall.tool_name === 'search_trips') {
            this.logger.log('AI Service - Invoking search_trips with params: ' + JSON.stringify(toolCall.parameters));
            const toolResult = await this.tripsService.search(toolCall.parameters);
            this.logger.log('AI Service - Tool Result: ' + JSON.stringify(toolResult));
            const aiMsg = new HumanMessage(JSON.stringify({ content: `Here are the search results: ${JSON.stringify(toolResult, null, 2)}` }));
            this.msgs.push(aiMsg);
          } else if (toolCall.tool_name === 'book_ticket') {
            this.logger.log('AI Service - Invoking book_ticket with params: ' + JSON.stringify(toolCall.parameters));
            const bookingParams = toolCall.parameters;
            const bookingUserId = userId || bookingParams.userId || null;
            try {
              const bookingResult = await this.bookingService.createBooking(bookingUserId, bookingParams);
              this.logger.log('AI Service - Booking Result: ' + JSON.stringify(bookingResult));
              const aiMsg = new HumanMessage(JSON.stringify({ content: `Booking successful! Details: ${JSON.stringify(bookingResult, null, 2)}` }));
              this.msgs.push(aiMsg);
            } catch (err) {
              const aiMsg = new HumanMessage(JSON.stringify({ content: `Booking failed: ${err?.message || String(err)}` }));
              this.msgs.push(aiMsg);
            }
          } else if (toolCall.tool_name === 'search_seats') {
            const { tripId } = toolCall.parameters || {};
            if (!tripId) {
              const aiMsg = new HumanMessage(JSON.stringify({ content: 'search_seats missing parameter: tripId required' }));
              this.msgs.push(aiMsg);
            } else {
              try {
                const seats = await this.seatStatusService.findByTripId(tripId);
                this.logger.log('AI Service - search_seats Result: ' + JSON.stringify(seats));
                if (seats && seats.length > 0) {
                  const aiMsg = new HumanMessage(JSON.stringify({ content: `Found seats: ${JSON.stringify(seats)}` }));
                  this.msgs.push(aiMsg);
                } else {
                  const aiMsg = new HumanMessage(JSON.stringify({ content: `No seats found on trip ${tripId}` }));
                  this.msgs.push(aiMsg);
                }
              } catch (err) {
                const aiMsg = new HumanMessage(JSON.stringify({ content: `Error searching seat: ${err?.message || String(err)}` }));
                this.msgs.push(aiMsg);
              }
            }
          } else if (toolCall.tool_name === 'calculate_total_price') {
            const { seats, options } = toolCall.parameters || {};
            if (!Array.isArray(seats)) {
              const aiMsg = new HumanMessage(JSON.stringify({ content: 'calculate_total_price missing or invalid `seats` array' }));
              this.msgs.push(aiMsg);
            } else {
              try {
                const total = await this.bookingService.calculateTotalPrice(seats, options || {});
                const aiMsg = new HumanMessage(JSON.stringify({ content: `Calculated total price: ${total}`, totalPrice: total }));
                this.msgs.push(aiMsg);
              } catch (err) {
                const aiMsg = new HumanMessage(JSON.stringify({ content: `Error calculating price: ${err?.message || String(err)}` }));
                this.msgs.push(aiMsg);
              }
            }
          }
        }

        // continue the loop so the model can respond to results of the tool calls
        iteration++;
        continue;
      }

      // No tool calls requested: use this response as the final answer
      finalRaw = rawContent || (typeof response === 'string' ? response : response?.content ?? JSON.stringify(response));
      break;
    }

    if (!finalRaw && lastResponse) {
      finalRaw = typeof lastResponse === 'string' ? lastResponse : lastResponse.content ?? JSON.stringify(lastResponse);
    }
    if (iteration >= MAX_ITERATIONS) {
      this.logger.warn('Max iterations reached while processing tool_calls; returning last model response');
    }

    console.log('AI Service - Final Response:', finalRaw);
    return finalRaw;
  }
}
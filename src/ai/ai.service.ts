import { Injectable, Logger } from '@nestjs/common';
// Note: switching from Ollama to Google Gemini via REST
import { SystemMessage, AIMessage, HumanMessage } from '@langchain/core/messages';
import { TripsService } from 'src/trips/trips.service';
import { BookingService } from 'src/booking/booking.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Message } from '../chat/entities/message.entity';
import { Repository } from 'typeorm';
import { Seat } from '../entities/seat.entity';
import { SeatStatusService } from 'src/seat-status/seat-status.service';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { PayosService } from 'src/payos/payos.service';
import { FaqService } from 'src/faq/faq.service';

@Injectable()
export class AiService {
  private llm: any;
  private msgs: any[] = [];
  private systemPrompt = `
    You are an AI assistant for a bus ticket booking service.
      You MUST ALWAYS respond to the user queries as a JSON object with the following schema:
      {
        "content": string, 
        "tool_calls: 
          [
            {
              "tool_name": string, 
              "parameters": object 
            },
            ...
          ]
      }
      The schema must be strictly followed. Example response:
      {
        "content": "I have found several bus trips that match your criteria.",  
        "tool_calls": [
          {
            "tool_name": "search_trips",
            "parameters": {
              "origin": "Ha Noi",
              "destination": "Da Nang",
              "date": "2024-12-25",
              "passengers": 2,
              "departureTime": "morning",
              "minPrice": 100,
              "maxPrice": 200,
              "page": 1,
              "limit": 5
            }
          }
        ]
      }
      You MUST ALWAYS use human's input language in your response.
      You MUST NOT output your thinking process.
      You MUST ALWAYS use tool 5 to answer questions related to the bus booking system. DO NOT try to answer FAQ-type questions from your own knowledge.
      If a booking requires payment and a payment link is available, you MUST include a clear, clickable payment URL in your response so the user can click to complete payment. Provide the link both inside 'content' and as a 'payment_url' field in the JSON output when applicable.
      You CAN use multiple tools in a single response if needed.
      You MUST NEVER assume any information about the user or their request that is not explicitly provided by the user. For example: if the user does not provide seat codes, you MUST NOT assume any seat codes. Ask the user for more details if needed.
      When the booking is completed successfully, you MUST use tool 'save_booking_data' to save the booking data into the user's session storage in the frontend.
      DO NOT include code comments. For example, do NOT include '//' or '/* ... */' in your response.
      If you miss information that can be fetched from using one of the tools, use that tool to get information. 
      For example: If the user asks for seat status of a trip, you first need to call 'search_trips' to get the tripId, then use that tripId to call 'search_seat_statuses' tool to get the seat status information.
      If the information you miss is not available from the tools, ask the user for more details.
      If the user does not provide enough information to call a tool, ask the user again for more details.
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
      origin and destination MUST be one of the available locations in the system:
        [
          'Ha Noi', 'Ho Chi Minh', 'Da Nang', 'Hai Phong', 'Can Tho',
          'Bien Hoa', 'Hue', 'Nha Trang', 'Buon Ma Thuot', 'Vung Tau',
          'Quy Nhon', 'Thu Dau Mot', 'Nam Dinh', 'Phan Thiet', 'Long Xuyen',
          'Ha Long', 'Thai Nguyen', 'Thanh Hoa', 'Rach Gia', 'Ca Mau',
          'Vinh', 'My Tho', 'Tay Ninh', 'Soc Trang', 'Kon Tum',
          'Hoi An', 'Sapa', 'Da Lat', 'Phu Quoc', 'Bac Lieu'
        ]
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
      ---
      ** NOTE **:
      - tripId is fetched from the selected trip in tool 'search_trips' results.
      - Each element in seats array only needs 'code' provided by user, other fields can be filled based on tool 'search_seats' results.
      - Each element in passengers array must have fullName, documentId, seatCode. Other fields are optional.
      - totalPrice is calculated using 'calculate_total_price' tool.
      - Other fields are optional based on user input.
      ---
      5. get_faqs: Use this tool to get list of frequently asked questions and answers.
      No parameters.
      --- 
      ** NOTE **: 
      - Always use this tool to answer FAQ-type questions instead of trying to answer from your own knowledge.
      ---
      6. save_booking_data: Use this tool to save booking related data into the user's session storage in the frontend. 
      Parameters for save_booking_data:
      {
        bookingId: string,
        bookingReference: string,
        tripId: string,
        seats: [
          {
            id: string,
            code: string,
            type: "normal" | "vip" | "business",
            price: number
          }
        ],
        passengers: [
          {
            seatCode: string,
            fullName: string,
            documentId: string,
            documentType?: string,
            phoneNumber?: string,
            email?: string
          }
        ],
        totalPrice: number,
        isGuestCheckout: boolean,
        contactEmail?: string | undefined,
        contactPhone?: string | undefined
      }
      ** NOTE **: 
      You MUST use this tool everytime a booking is completed successfully.
  `;

  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly tripsService: TripsService,
    private readonly bookingService: BookingService,
    private readonly payosService: PayosService,
    private readonly faqService: FaqService,
    private readonly seatStatusService: SeatStatusService,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    @InjectRepository(Seat)
    private readonly seatRepo: Repository<Seat>,
  ) {
    this.llm = new ChatGoogleGenerativeAI({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite',
      temperature: 0.2
    })
    // Gemini will be called via REST per-invoke using GOOGLE_API_KEY
    const systemMsg = new SystemMessage(this.systemPrompt);

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

  private robustParseJson(raw: string) {
    const sanitize = (s: string) => {
      if (!s) return '';
      let r = String(s).trim();
      const fenceMatch = r.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
      if (fenceMatch) r = fenceMatch[1].trim();
      if (r.startsWith('`') && r.endsWith('`')) r = r.slice(1, -1).trim();
      // remove control characters except common whitespace
      r = r.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]+/g, '');
      return r;
    };

    const tryJsonParse = (s: string) => {
      try {
        return JSON.parse(s);
      } catch (e) {
        return null;
      }
    };

    const s = sanitize(raw);

    // 1) strict JSON.parse
    let parsed = tryJsonParse(s);
    if (parsed !== null) return parsed;

    // 2) try strip-json-comments if available
    try {
      // dynamic require so package is optional
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const strip = require('strip-json-comments');
      const withoutComments = strip(s, { whitespace: false });
      parsed = tryJsonParse(withoutComments);
      if (parsed !== null) return parsed;
    } catch (e) {
      // ignore if package not installed
    }

    // 3) try JSON5 if available
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const JSON5 = require('json5');
      parsed = JSON5.parse(s);
      if (parsed !== null) return parsed;
    } catch (e) {
      // ignore
    }

    // 4) heuristic repairs: remove line comments, trailing commas, convert single quotes
    try {
      let t = s.replace(/\/\/.*$/gm, ''); // remove // comments
      t = t.replace(/,\s*([}\]])/g, '$1'); // remove trailing commas
      // naive single-quote -> double-quote for strings
      t = t.replace(/'([^']*)'/g, (_m, g1) => '"' + g1.replace(/"/g, '\\"') + '"');
      parsed = tryJsonParse(t);
      if (parsed !== null) return parsed;
    } catch (e) {
      // ignore
    }

    // fallback: return object with raw content so caller can handle it
    return { content: raw };
  }

  async invoke(messages: any[], metadata?: { userId?: string }) {
    // Lấy userId từ metadata nếu có
    const userId = metadata?.userId;
    // this.logger.log('AI invoked by user:', userId);
    // Prepend system message to the messages array
    
    // Build messages for this invocation and ensure system instruction is first
    this.msgs.push(...messages);
    // const messagesToSend = [...this.msgs, sys, ...messages];
    // console.log("AI Service - Current Messages:", this.msgs);
    // Loop: invoke LLM, handle any tool_calls it returns, and repeat until no tool_calls remain.
    let finalRaw: string = '';
    let lastResponse: any = null;
    const MAX_ITERATIONS = 3;
    let iteration = 0;

    while (iteration < MAX_ITERATIONS) {
      const response = await this.llm.invoke(this.msgs);
      console.log('AI Service - Gemini Response:', response);
      // break;
      // this.logger.log(`AI Service - LLM Response (iteration ${iteration + 1}): ${JSON.stringify(response, null, 2)}`);
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

      const parsed: any = this.robustParseJson(rawContent);
      if (parsed && typeof parsed === 'object' && parsed.content === rawContent) {
        this.logger.warn('LLM output could not be parsed as JSON; using raw text fallback');
        this.msgs.push(new HumanMessage({ content: `
          Your input could not be parsed as JSON. Please provide valid JSON. Example input:
          {
            "content": "I have found several bus trips that match your criteria.",  
            "tool_calls": [
              {
                "tool_name": "search_trips",
                "parameters": {
                  "origin": "Ha Noi",
                  "destination": "Da Nang",
                  "date": "2024-12-25",
                  "passengers": 2,
                  "departureTime": "morning",
                  "minPrice": 100,
                  "maxPrice": 200,
                  "page": 1,
                  "limit": 5
                }
              }
            ]
          }
          `}));
        try {
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
      }

      // If the model requested tools, execute them and continue the loop.
      if (parsed.tool_calls && parsed.tool_calls.length > 0) {
        console.log('AI Service - Tool Calls Detected:', parsed.tool_calls);
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
              const messageObj: any = {
                content: `Booking successful! Details: ${JSON.stringify(bookingResult, null, 2)}`,
              };
              if ((bookingResult as any).paymentUrl) {
                messageObj.payment_url = (bookingResult as any).paymentUrl;
                messageObj.content += `\n\nClick here to complete payment: ${(bookingResult as any).paymentUrl}`;
              }
              const aiMsg = new HumanMessage(JSON.stringify(messageObj));
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
                this.logger.log('AI Service - search_seats Result: \n' + JSON.stringify(seats, null, 2));
                if (seats && seats.length > 0) {
                  const aiMsg = new HumanMessage(JSON.stringify({ content: `Found seats: \n${JSON.stringify(seats, null, 2)}` }));
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
          else if (toolCall.tool_name === 'get_faqs') {
            console.log('AI Service - Invoking get_faqs');
            try {
              const faqs = await this.faqService.getAllFaqs();
              const aiMsg = new HumanMessage(JSON.stringify({ content: `Here are the frequently asked questions and answers: \n${JSON.stringify(faqs, null, 2)}` }));
              this.msgs.push(aiMsg);
            } 
            catch(err) {
              const aiMsg = new HumanMessage(JSON.stringify({ content: `Error fetching FAQs: ${err?.message || String(err)}` }));
              this.msgs.push(aiMsg);
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

    if (iteration >= MAX_ITERATIONS) {
      this.logger.warn('Max iterations reached while processing tool_calls; attempting one final LLM invoke to include tool results');
      try {
        const finalResponse = await this.llm.invoke(this.msgs);
        this.logger.debug('AI Service - Final LLM invoke after max iterations: ' + JSON.stringify(finalResponse));
        lastResponse = finalResponse;
        let finalRawCandidate = '';
        if (finalResponse == null) {
          finalRawCandidate = '';
        } else if (typeof finalResponse === 'string') {
          finalRawCandidate = finalResponse;
        } else if (finalResponse.content != null) {
          finalRawCandidate = String(finalResponse.content);
        } else {
          finalRawCandidate = JSON.stringify(finalResponse);
        }
        if (finalRawCandidate) {
          finalRaw = finalRawCandidate;
        }
      } catch (err) {
        this.logger.warn('Final LLM invoke failed: ' + (err?.message ?? String(err)));
      }
    }

    if (!finalRaw && lastResponse) {
      finalRaw = typeof lastResponse === 'string' ? lastResponse : lastResponse.content ?? JSON.stringify(lastResponse);
    }

    console.log('AI Service - Final Response:', finalRaw);
    return finalRaw;
  }
}
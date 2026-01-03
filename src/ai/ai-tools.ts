import { tool } from "@langchain/core/tools";
import { z } from "zod"

import { SearchTripsDto } from '../trips/dto/search-trips.dto';
import { TripsService } from '../trips/trips.service';

export function createSearchTripsTool(tripsService: TripsService) {
    return tool(
    async function(params: {
        origin?: string;
        destination?: string;
        date?: string;
        passengers?: number;
        busType?: string;
        departureTime?: string;
        minPrice?: number;
        maxPrice?: number;
        operatorId?: string;
        page?: number;
        limit?: number;
    }) {
        // Gọi hàm search của tripsService
        const dto = Object.assign(new SearchTripsDto(), params);
        return await tripsService.search(dto);
    },
    {
        name: "search_trips",
        description: "Search for bus trips based on various criteria such as origin, destination, date, number of passengers, bus type, departure time, price range, operator ID, pagination page, and limit.",
        schema: z.object({
            origin: z.string().optional(),  
            destination: z.string().optional(),
            date: z.string().describe("The date of the trip in YYYY-MM-DD format").optional(), 
            passengers: z.number().int().min(1).optional(),
            busType: z.enum(['standard', 'limousine', 'sleeper']).optional(),
            departureTime: z.enum(['morning', 'afternoon', 'evening', 'night']).optional(),
            minPrice: z.number().optional(),
            maxPrice: z.number().optional(),
            operatorId: z.string().optional(),
            page: z.number().int().min(1).optional(),
            limit: z.number().int().min(1).optional(),
        })
    }
  );
}
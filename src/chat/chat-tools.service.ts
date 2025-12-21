import { Injectable, Logger } from '@nestjs/common';
import { TripsService } from '../trips/trips.service';
import { tool } from '@langchain/core/tools';

@Injectable()
export class ChatToolsService {
  private readonly logger = new Logger(ChatToolsService.name);

  constructor(private readonly tripsService: TripsService) {}

  getTools() {
    const searchTrips = tool(async (input: string) => {
      // Expect input as JSON: { origin, destination, date }
      try {
        const params = JSON.parse(input);
        const dto = {
          origin: params.origin,
          destination: params.destination,
          date: params.date,
          page: params.page || 1,
          limit: params.limit || 5,
        };
        const results = await this.tripsService.search(dto as any);
        const items = Array.isArray(results.data) ? results.data : [];
        return JSON.stringify(items.slice(0, dto.limit));
      } catch (err) {
        this.logger.error('searchTrips tool error', err as any);
        return 'Invalid input for search_trips. Expected JSON {origin,destination,date}';
      }
    }, { name: 'search_trips', description: 'Search trips by origin,destination,date. Input JSON.' });

    const getRouteSchedule = tool(async (input: string) => {
      try {
        const params = JSON.parse(input);
        const start = new Date(params.startDate);
        const end = new Date(params.endDate);
        const data = await this.tripsService.getRouteSchedule(params.routeId, start, end);
        return JSON.stringify(data);
      } catch (err) {
        this.logger.error('getRouteSchedule tool error', err as any);
        return 'Invalid input for get_route_schedule. Expected JSON {routeId,startDate,endDate}';
      }
    }, { name: 'get_route_schedule', description: 'Get trips for a route between dates. Input JSON.' });

    const getBusSchedule = tool(async (input: string) => {
      try {
        const params = JSON.parse(input);
        const start = new Date(params.startDate);
        const end = new Date(params.endDate);
        const data = await this.tripsService.getBusSchedule(params.busId, start, end);
        return JSON.stringify(data);
      } catch (err) {
        this.logger.error('getBusSchedule tool error', err as any);
        return 'Invalid input for get_bus_schedule. Expected JSON {busId,startDate,endDate}';
      }
    }, { name: 'get_bus_schedule', description: 'Get trips for a bus between dates. Input JSON.' });

    return [searchTrips, getRouteSchedule, getBusSchedule];
  }
}

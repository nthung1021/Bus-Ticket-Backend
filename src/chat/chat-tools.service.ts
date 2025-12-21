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

        // Normalize helper
        const normalize = (s: string) =>
          String(s || '')
            .normalize('NFD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^\p{L}\p{N}\s]/gu, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();

        // Levenshtein distance for fuzzy matching
        const levenshtein = (a: string, b: string) => {
          const A = a || '';
          const B = b || '';
          const m = A.length;
          const n = B.length;
          const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
          for (let i = 0; i <= m; i++) dp[i][0] = i;
          for (let j = 0; j <= n; j++) dp[0][j] = j;
          for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
              const cost = A[i - 1] === B[j - 1] ? 0 : 1;
              dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
            }
          }
          return dp[m][n];
        };

        const similarity = (x: string, y: string) => {
          const xa = normalize(x);
          const ya = normalize(y);
          if (!xa && !ya) return 1;
          const dist = levenshtein(xa, ya);
          const maxLen = Math.max(xa.length, ya.length) || 1;
          return 1 - dist / maxLen;
        };

        const trySearch = async (searchDto: any) => {
          const results = await this.tripsService.search(searchDto as any);
          const items = Array.isArray(results.data) ? results.data : [];
          return { results, items };
        };

        // First try with raw input
        let { results, items } = await trySearch(dto);

        // If no results, try fuzzy matching on origin/destination
        if ((!items || items.length === 0) && (dto.origin || dto.destination)) {
          const candidates = await this.tripsService.listLocationNames();
          const normCandidates = candidates.map((c) => ({ raw: c, norm: normalize(c) }));

          const findBest = (val: string) => {
            const scored = normCandidates.map((c) => ({
              raw: c.raw,
              score: similarity(val, c.raw),
            }));
            scored.sort((a, b) => b.score - a.score);
            return scored.slice(0, 3);
          };

          const ambiguous: any = {};

          if (dto.origin) {
            const best = findBest(dto.origin)[0];
            if (best && best.score >= 0.6) {
              dto.origin = best.raw;
            } else {
              ambiguous.origin = findBest(dto.origin).map((s) => s.raw);
            }
          }

          if (dto.destination) {
            const best = findBest(dto.destination)[0];
            if (best && best.score >= 0.6) {
              dto.destination = best.raw;
            } else {
              ambiguous.destination = findBest(dto.destination).map((s) => s.raw);
            }
          }

          // If we corrected either origin or destination, try again
          if (!ambiguous.origin && !ambiguous.destination) {
            const retry = await trySearch(dto);
            results = retry.results;
            items = retry.items;
          } else {
            // return ambiguous candidates so LLM can ask follow-up
            return JSON.stringify({ data: [], ambiguous, message: 'Ambiguous location names' });
          }
        }

        return JSON.stringify((items || []).slice(0, dto.limit));
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

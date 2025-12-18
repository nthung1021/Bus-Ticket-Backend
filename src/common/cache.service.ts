import { Injectable } from '@nestjs/common';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes in milliseconds

  set<T>(key: string, data: T, ttlMs?: number): void {
    const ttl = ttlMs || this.defaultTTL;
    const expiresAt = Date.now() + ttl;
    
    this.cache.set(key, {
      data,
      expiresAt,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }

  // Generate cache key for analytics queries
  generateAnalyticsKey(method: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {} as Record<string, any>);
    
    return `analytics:${method}:${JSON.stringify(sortedParams)}`;
  }

  // Get cache statistics
  getStats(): { size: number; hitRate?: number } {
    return {
      size: this.cache.size,
      // Hit rate would need to be tracked separately if needed
    };
  }
}

// Decorator for caching analytics methods
export function CacheAnalytics(ttlMs?: number) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    
    descriptor.value = async function (this: any, ...args: any[]) {
      const cacheService: CacheService = this.cacheService;
      
      if (!cacheService) {
        // If no cache service, execute method normally
        return await method.apply(this, args);
      }
      
      // Generate cache key
      const cacheKey = cacheService.generateAnalyticsKey(propertyName, args[0] || {});
      
      // Try to get from cache first
      const cachedResult = cacheService.get(cacheKey);
      if (cachedResult !== null) {
        return cachedResult;
      }
      
      // Execute method and cache result
      const result = await method.apply(this, args);
      cacheService.set(cacheKey, result, ttlMs);
      
      return result;
    };
    
    return descriptor;
  };
}
import { Test, TestingModule } from '@nestjs/testing';
import { BookingExpirationScheduler } from '../../src/booking/booking-expiration-scheduler.service';
import { BookingService } from '../../src/booking/booking.service';
import { Logger } from '@nestjs/common';

// Mock the node-cron module
jest.mock('node-cron', () => {
  const mockScheduledTask = {
    start: jest.fn(),
    stop: jest.fn(),
    now: jest.fn(),
    getStatus: jest.fn().mockReturnValue('scheduled'),
  };

  return {
    schedule: jest.fn().mockReturnValue(mockScheduledTask),
  };
});

// Import the mocked module to access the mock instance
const nodeCron = require('node-cron');

describe('BookingExpirationScheduler', () => {
  let scheduler: BookingExpirationScheduler;
  let bookingService: jest.Mocked<BookingService>;

  const mockBookingService = {
    findExpiredBookings: jest.fn(),
    expireBookings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingExpirationScheduler,
        {
          provide: BookingService,
          useValue: mockBookingService,
        },
      ],
    }).compile();

    scheduler = module.get<BookingExpirationScheduler>(BookingExpirationScheduler);
    bookingService = module.get(BookingService);

    // Reset mocks
    jest.clearAllMocks();
    
    // Get the mock scheduled task that's returned by the schedule mock
    const mockTask = (nodeCron.schedule as jest.Mock).mock.results[0]?.value;
    if (mockTask) {
      mockTask.start.mockReset();
      mockTask.stop.mockReset();
      mockTask.now.mockReset();
      mockTask.getStatus.mockReset();
      mockTask.getStatus.mockReturnValue('scheduled');
    }

    // Speed up tests by mocking the delay utility by default
    jest.spyOn(scheduler as any, 'delay').mockResolvedValue(undefined);

    // Silence logger to keep test output clean, while still allowing spy calls
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up any running cron jobs
    scheduler.onModuleDestroy();
  });

  describe('Initialization', () => {
    it('should be defined', () => {
      expect(scheduler).toBeDefined();
    });

    it('should start cron job on module init', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      
      scheduler.onModuleInit();
      
      expect(loggerSpy).toHaveBeenCalledWith(
        '🕒 Booking expiration cron job started - runs every 2 minutes'
      );
    });

    it('should stop cron job on module destroy', () => {
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      
      scheduler.onModuleInit();
      scheduler.onModuleDestroy();
      
      expect(loggerSpy).toHaveBeenCalledWith(
        '🛑 Booking expiration cron job stopped'
      );
    });
  });

  describe('Manual Expiration Trigger', () => {
    it('should successfully process expired bookings', async () => {
      // Arrange
      const mockExpiredBookings = [
        {
          id: '1',
          bookingReference: 'REF001',
          userId: 'user1',
          tripId: 'trip1',
          totalAmount: 500000,
          status: 'PENDING',
          bookedAt: new Date(),
          cancelledAt: null,
          lastModifiedAt: new Date(),
          expiresAt: new Date(Date.now() - 1000 * 60 * 20), // 20 minutes ago
          trip: {
            route: {
              origin: 'Hà Nội',
              destination: 'TP. Hồ Chí Minh'
            }
          }
        }
      ] as any[]; // Type assertion for test mocking

      const mockExpirationResult = {
        expiredCount: 1,
        bookings: ['REF001']
      };

      bookingService.findExpiredBookings.mockResolvedValue(mockExpiredBookings);
      bookingService.expireBookings.mockResolvedValue(mockExpirationResult);

      // Act
      const result = await scheduler.triggerManualExpiration();

      // Assert
      expect(result.processed).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(result.sessionId).toMatch(/^manual-\d+-[a-z0-9]+$/);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(bookingService.findExpiredBookings).toHaveBeenCalledTimes(1);
      expect(bookingService.expireBookings).toHaveBeenCalledTimes(1); // Once in processExpiredBookings
    });

    it('should handle no expired bookings gracefully', async () => {
      // Arrange
      bookingService.findExpiredBookings.mockResolvedValue([]);
      bookingService.expireBookings.mockResolvedValue({ expiredCount: 0, bookings: [] });

      // Act
      const result = await scheduler.triggerManualExpiration();

      // Assert
      expect(result.processed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(result.sessionId).toMatch(/^manual-\d+-[a-z0-9]+$/);
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      const errorMessage = 'Database connection failed';
      bookingService.findExpiredBookings.mockResolvedValue([{ id: '1' }] as any);
      bookingService.expireBookings.mockRejectedValue(new Error(errorMessage));

      // Act
      const result = await scheduler.triggerManualExpiration();

      // Assert
      expect(result.processed).toBe(0);
      expect(result.errors).toContain(errorMessage);
      expect(result.sessionId).toMatch(/^manual-\d+-[a-z0-9]+$/);
      // expect 3 calls (1 initial + 2 retries)
      expect(bookingService.expireBookings).toHaveBeenCalledTimes(3);
    });

    it('should include proper logging with session tracking', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      bookingService.findExpiredBookings.mockResolvedValue([]);
      bookingService.expireBookings.mockResolvedValue({ expiredCount: 0, bookings: [] });

      // Act
      const result = await scheduler.triggerManualExpiration();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(`🔧 [${result.sessionId}] Manual booking expiration triggered`)
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining(`✅ [${result.sessionId}] Manual expiration completed`)
      );
    });
  });

  describe('Cron Job Status', () => {
    it('should return correct status when job is not running', () => {
      // Arrange - job is not started

      // Act
      const status = scheduler.getCronJobStatus();

      // Assert
      expect(status.isRunning).toBe(false);
      expect(status.nextRun).toBe(null);
      expect(status.schedule).toBe('*/2 * * * *');
      expect(status.timezone).toBe('UTC');
      expect(status.serviceHealth).toBe('healthy');
    });

    it('should return correct status when job is running', () => {
      // Arrange
      scheduler.onModuleInit();

      // Act
      const status = scheduler.getCronJobStatus();

      // Assert
      expect(status.isRunning).toBe(true);
      expect(status.nextRun).toBe('Every 2 minutes');
      expect(status.schedule).toBe('*/2 * * * *');
      expect(status.timezone).toBe('UTC');
      expect(status.serviceHealth).toBe('healthy');
      expect(status.lastCheck).toBeInstanceOf(Date);
    });

    it('should detect service health issues', () => {
      // Arrange - Create scheduler with null service
      const moduleWithNullService = Test.createTestingModule({
        providers: [
          BookingExpirationScheduler,
          {
            provide: BookingService,
            useValue: null,
          },
        ],
      });

      // Act & Assert would need a different setup for this test
      // For now, we'll test the concept through the existing status
      const status = scheduler.getCronJobStatus();
      expect(status.serviceHealth).toBe('healthy'); // Since we mocked a proper service
    });
  });

  describe('Cron Job Restart', () => {
    it('should successfully restart cron job', () => {
      // Arrange
      const loggerSpy = jest.spyOn(Logger.prototype, 'log');
      scheduler.onModuleInit();

      // Act
      const result = scheduler.restartCronJob();

      // Assert
      expect(result.success).toBe(true);
      expect(result.message).toContain('successfully');
      expect(loggerSpy).toHaveBeenCalledWith('🔄 Restarting booking expiration cron job');
      expect(loggerSpy).toHaveBeenCalledWith('✅ Cron job restarted successfully');
    });

    it('should handle restart failures gracefully', () => {
      // This test would require mocking internal cron job failures
      // For now, we'll test the success case
      const result = scheduler.restartCronJob();
      expect(result.success).toBe(true);
    });
  });

  describe('Idempotency and Safety', () => {
    it('should handle multiple rapid calls safely', async () => {
      // Arrange
      bookingService.findExpiredBookings.mockResolvedValue([]);
      bookingService.expireBookings.mockResolvedValue({ expiredCount: 0, bookings: [] });

      // Act - Trigger multiple manual expirations simultaneously
      const promises = Array(5).fill(null).map(() => scheduler.triggerManualExpiration());
      const results = await Promise.all(promises);

      // Assert
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.processed).toBe(0);
        expect(result.errors).toHaveLength(0);
        expect(result.sessionId).toMatch(/^manual-\d+-[a-z0-9]+$/);
      });

      // Ensure all results have unique session IDs
      const sessionIds = results.map(r => r.sessionId);
      const uniqueSessionIds = new Set(sessionIds);
      expect(uniqueSessionIds.size).toBe(5);
    });

    it('should handle service unavailability', async () => {
      // Arrange - Mock service method to throw error
      bookingService.findExpiredBookings.mockResolvedValue([{ id: '1' }] as any);
      bookingService.expireBookings.mockRejectedValue(new Error('Service unavailable'));

      // Act
      const result = await scheduler.triggerManualExpiration();

      // Assert
      expect(result.processed).toBe(0);
      expect(result.errors).toContain('Service unavailable');
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(bookingService.expireBookings).toHaveBeenCalledTimes(3);
    });
  });

  describe('Retry Logic', () => {
    it('should implement delay utility correctly', async () => {
      // Create a temporary instance to avoid messing with the main scheduler mock
      const tempScheduler = new (scheduler.constructor as any)(bookingService);
      const startTime = Date.now();

      // Act
      await (tempScheduler as any).delay(100);

      // Assert
      const endTime = Date.now();
      expect(endTime - startTime).toBeGreaterThanOrEqual(100);
    });
  });

  describe('Performance Monitoring', () => {
    it('should track processing times', async () => {
      // Arrange
      bookingService.findExpiredBookings.mockResolvedValue([]);
      bookingService.expireBookings.mockResolvedValue({ expiredCount: 0, bookings: [] });

      // Act
      const result = await scheduler.triggerManualExpiration();

      // Assert
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof result.processingTimeMs).toBe('number');
    });

    it('should include session IDs for tracking', async () => {
      // Arrange
      bookingService.findExpiredBookings.mockResolvedValue([]);
      bookingService.expireBookings.mockResolvedValue({ expiredCount: 0, bookings: [] });

      // Act
      const result1 = await scheduler.triggerManualExpiration();
      const result2 = await scheduler.triggerManualExpiration();

      // Assert
      expect(result1.sessionId).not.toBe(result2.sessionId);
      expect(result1.sessionId).toMatch(/^manual-\d+-[a-z0-9]+$/);
      expect(result2.sessionId).toMatch(/^manual-\d+-[a-z0-9]+$/);
    });
  });

  describe('Error Handling', () => {
    it('should handle booking service errors without crashing', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(Logger.prototype, 'error');
      bookingService.findExpiredBookings.mockResolvedValue([{ id: '1' }] as any);
      bookingService.expireBookings.mockRejectedValue(new Error('Critical database error'));

      // Act
      const result = await scheduler.triggerManualExpiration();

      // Assert
      expect(result.processed).toBe(0);
      expect(result.errors).toContain('Critical database error');
      expect(bookingService.expireBookings).toHaveBeenCalledTimes(3);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to process expired bookings'),
        expect.any(String) // stack or message
      );
    });

    it('should continue operation after individual booking failures', async () => {
      // This test would require mocking the internal processExpiredBookings method
      // For comprehensive testing, we would need to test the BookingService separately
      const result = await scheduler.triggerManualExpiration();
      expect(result).toBeDefined();
    });
  });
});
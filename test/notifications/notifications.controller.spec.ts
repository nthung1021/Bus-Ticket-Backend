import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from '../../src/notifications/notifications.controller';
import { NotificationsService } from '../../src/notifications/notifications.service';
import { JwtAuthGuard } from '../../src/auth/jwt-auth.guard';

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockNotificationsService = {
    getUserNotifications: jest.fn(),
    markAllAsRead: jest.fn(),
    markAsRead: jest.fn(),
  };

  const userId = 'user-1';
  const req = { user: { userId } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should call service.getUserNotifications', async () => {
      const mockResult = { data: [], pagination: {} };
      mockNotificationsService.getUserNotifications.mockResolvedValue(mockResult);

      const result = await controller.getNotifications(req, 'unread', 1, 10);

      expect(service.getUserNotifications).toHaveBeenCalledWith(userId, {
        status: 'unread',
        page: 1,
        limit: 10,
      });
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult.data);
    });
  });

  describe('markAllAsRead', () => {
    it('should call service.markAllAsRead', async () => {
      mockNotificationsService.markAllAsRead.mockResolvedValue({ success: true });

      const result = await controller.markAllAsRead(req);

      expect(service.markAllAsRead).toHaveBeenCalledWith(userId);
      expect(result.success).toBe(true);
    });
  });

  describe('markAsRead', () => {
    it('should call service.markAsRead', async () => {
      const notifId = 'notif-1';
      mockNotificationsService.markAsRead.mockResolvedValue({ success: true });

      const result = await controller.markAsRead(notifId, req);

      expect(service.markAsRead).toHaveBeenCalledWith(notifId, userId);
      expect(result.success).toBe(true);
    });
  });
});

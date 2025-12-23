import { Test, TestingModule } from '@nestjs/testing';
import { PayosController } from './payos.controller';
import { PayosService } from './payos.service';

describe('PayosController', () => {
  let controller: PayosController;
  let service: PayosService;

  const mockPayosService = {
    createPaymentLink: jest.fn(),
    getPaymentInformation: jest.fn(),
    cancelPayment: jest.fn(),
    verifyWebhookData: jest.fn(),
    handleWebhook: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayosController],
      providers: [
        {
          provide: PayosService,
          useValue: mockPayosService,
        },
      ],
    }).compile();

    controller = module.get<PayosController>(PayosController);
    service = module.get<PayosService>(PayosService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createPaymentLink', () => {
    it('should call service.createPaymentLink', async () => {
      const dto = { amount: 1000, description: 'test', bookingId: 'b1' } as any;
      mockPayosService.createPaymentLink.mockResolvedValue({ checkoutUrl: 'url' });
      const result = await controller.createPaymentLink(dto);
      expect(service.createPaymentLink).toHaveBeenCalledWith(dto);
      expect(result.checkoutUrl).toBe('url');
    });
  });

  describe('getPaymentInformation', () => {
    it('should call service.getPaymentInformation', async () => {
      const orderCode = 123;
      mockPayosService.getPaymentInformation.mockResolvedValue({ orderCode });
      const result = await controller.getPaymentInformation(orderCode);
      expect(service.getPaymentInformation).toHaveBeenCalledWith(orderCode);
      expect(result.orderCode).toBe(orderCode);
    });
  });

  describe('cancelPayment', () => {
    it('should call service.cancelPayment', async () => {
      const orderCode = 123;
      mockPayosService.cancelPayment.mockResolvedValue({ orderCode, status: 'CANCELLED' });
      const result = await controller.cancelPayment(orderCode);
      expect(service.cancelPayment).toHaveBeenCalledWith(orderCode);
      expect(result.status).toBe('CANCELLED');
    });
  });

  describe('handleWebhook', () => {
    it('should verify and handle webhook', async () => {
      const body = { data: 'test' };
      const verifiedData = { orderCode: 123 };
      mockPayosService.verifyWebhookData.mockResolvedValue(verifiedData);
      mockPayosService.handleWebhook.mockResolvedValue({ success: true });

      const result = await controller.handleWebhook(body);

      expect(service.verifyWebhookData).toHaveBeenCalledWith(body);
      expect(service.handleWebhook).toHaveBeenCalledWith(verifiedData);
      expect(result.success).toBe(true);
    });

    it('should return error if verification fails', async () => {
      mockPayosService.verifyWebhookData.mockRejectedValue(new Error('Invalid'));
      const result = await controller.handleWebhook({});
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid webhook data');
    });
  });
});

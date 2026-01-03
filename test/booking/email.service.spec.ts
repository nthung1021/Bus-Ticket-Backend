import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../../src/booking/email.service';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';

// Mock nodemailer and nodemailer-sendgrid
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue(true),
  })),
}));
jest.mock('nodemailer-sendgrid', () => (opts: any) => ({ sendgrid: true, opts }));

const nodemailer = require('nodemailer');

describe('EmailService', () => {
  let service: EmailService;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('throws when no email service configured', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: { get: (k: string) => undefined },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);

    await expect(
      service.sendEmail({ to: 'a@b.com', subject: 's', text: 't' }),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('configures sendgrid when keys are present and sends mail', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: (k: string) => {
              if (k === 'EMAIL_SERVICE') return 'sendgrid';
              if (k === 'SENDGRID_API_KEY') return 'sk_test_123';
              if (k === 'EMAIL_FROM') return 'noreply@example.com';
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);

    await expect(
      service.sendEmail({ to: 'a@b.com', subject: 's', text: 't' }),
    ).resolves.toBeUndefined();

    expect(nodemailer.createTransport).toHaveBeenCalled();
  });
});

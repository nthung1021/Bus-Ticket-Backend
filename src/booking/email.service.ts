import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: { filename: string; content: Buffer; cid?: string }[];
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const emailService = this.configService.get<string>('EMAIL_SERVICE');

    if (emailService === 'sendgrid') {
      const apiKey = this.configService.get<string>('SENDGRID_API_KEY');
      if (!apiKey) {
        throw new InternalServerErrorException('SENDGRID_API_KEY not provided. Cannot send email via SendGrid');
      }
      const nodemailerSendgrid = require('nodemailer-sendgrid');
      this.transporter = nodemailer.createTransport(
        nodemailerSendgrid({
          apiKey,
        }),
      );
      this.logger.log('EmailService configured with SendGrid');
      return;
    }

    // Fallback to SMTP if SMTP config provided
    const smtpHost = this.configService.get<string>('SMTP_HOST');
    const smtpPort = this.configService.get<number>('SMTP_PORT');
    const smtpUser = this.configService.get<string>('SMTP_USER');
    const smtpPass = this.configService.get<string>('SMTP_PASS');

    if (smtpHost && smtpPort) {
      const secure = this.configService.get<boolean>('SMTP_SECURE', smtpPort === 465);
      const transportOpts: any = {
        host: smtpHost,
        port: smtpPort,
        secure,
      };
      if (smtpUser && smtpPass) {
        transportOpts.auth = { user: smtpUser, pass: smtpPass };
      }
      this.transporter = nodemailer.createTransport(transportOpts);
      this.logger.log(`EmailService configured with SMTP (${smtpHost}:${smtpPort})`);
      return;
    }

    // As a last resort, use a JSON transport for development/testing
    if (this.configService.get<string>('NODE_ENV') !== 'production') {
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.logger.log('EmailService configured with jsonTransport (development)');
      return;
    }

    throw new InternalServerErrorException('No email service configuration provided. Cannot send email');
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const from = this.configService.get<string>('EMAIL_FROM') || 'no-reply@example.com';
      if (!this.configService.get<string>('EMAIL_FROM')) {
        this.logger.warn('EMAIL_FROM not set; using fallback no-reply@example.com');
      }
      this.logger.debug(`Attempting to send email from: ${from}`);

      await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        attachments: options.attachments,
      });

      this.logger.log(`E-ticket email sent to ${options.to}`);
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`);
      if (error.response) {
        this.logger.error(`SendGrid Error Response: ${JSON.stringify(error.response.body)}`);
      }
      throw new InternalServerErrorException('Failed to send e-ticket email');
    }
  }
}

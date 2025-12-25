import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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

  constructor() {
    // Configure transporter based on environment variables
    const service = process.env.EMAIL_SERVICE;

    if (service === 'sendgrid') {
      const nodemailerSendgrid = require('nodemailer-sendgrid');
      this.transporter = nodemailer.createTransport(
        nodemailerSendgrid({ apiKey: process.env.SENDGRID_API_KEY }),
      );
      this.logger.log('EmailService configured with SendGrid');
    } else if (service === 'smtp' || process.env.EMAIL_HOST) {
      // Support SMTP via env vars (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS)
      const host = process.env.EMAIL_HOST;
      const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : 587;
      const secure = (process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || port === 465;
      const user = process.env.EMAIL_USER;
      const pass = process.env.EMAIL_PASS;

      if (!host || !user) {
        throw new InternalServerErrorException('Incomplete SMTP configuration. Set EMAIL_HOST and EMAIL_USER');
      }

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
        tls: { rejectUnauthorized: false },
      });

      this.logger.log('EmailService configured with SMTP transport');
    } else {
      throw new InternalServerErrorException('No email service configuration provided. Cannot send email');
    }
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      const from = process.env.EMAIL_FROM;
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

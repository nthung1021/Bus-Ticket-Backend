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
    if (process.env.EMAIL_SERVICE === 'sendgrid') {
      const nodemailerSendgrid = require('nodemailer-sendgrid');
      this.transporter = nodemailer.createTransport(
        nodemailerSendgrid({
          apiKey: process.env.SENDGRID_API_KEY,
        }),
      );
      this.logger.log('EmailService configured with SendGrid');
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

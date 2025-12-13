import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import {
  PayOS,
  CreatePaymentLinkResponse,
  PaymentLinkStatus,
  PaymentLink,
} from '@payos/node';
import { Repository } from 'typeorm';
import { CreatePaymentDto } from './dto/create-payment.dto';

import {
  PaymentResponseDto,
  WebhookResponseDto,
} from './dto/payment-response.dto';
import { Payment, PaymentStatus } from '../entities/payment.entity';

@Injectable()
export class PayosService {
  private readonly logger = new Logger(PayosService.name);
  private readonly payos: PayOS;

  constructor(
    private configService: ConfigService,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID');
    const apiKey = this.configService.get<string>('PAYOS_API_KEY');
    const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');

    if (!clientId || !apiKey || !checksumKey) {
      throw new Error(
        'PayOS configuration is missing. Please check environment variables.',
      );
    }

    this.payos = new PayOS({
      clientId,
      apiKey,
      checksumKey,
    });
  }

  async createPaymentLink(
    createPaymentDto: CreatePaymentDto,
  ): Promise<PaymentResponseDto> {
    try {
      const orderCode = this.generateOrderCode();

      const paymentData = {
        orderCode,
        amount: createPaymentDto.amount,
        description: createPaymentDto.description,
        returnUrl:
          createPaymentDto.returnUrl ||
          this.configService.get<string>('PAYOS_RETURN_URL') ||
          'http://localhost:8000/payment/success',
        cancelUrl:
          createPaymentDto.cancelUrl ||
          this.configService.get<string>('PAYOS_CANCEL_URL') ||
          'http://localhost:8000/payment/cancel',
        items:
          createPaymentDto.items?.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            unit: item.unit,
            taxPercentage: item.taxPercentage as any,
          })) || [],
      };

      const paymentLink = (await this.payos.paymentRequests.create(
        paymentData,
      )) as CreatePaymentLinkResponse;

      this.logger.log(
        `Payment link created successfully for order ${orderCode}`,
      );

      // Create payment record in database
      const payment = this.paymentRepository.create({
        bookingId: createPaymentDto.bookingId,
        provider: 'PAYOS',
        transactionRef: paymentLink.paymentLinkId || '',
        payosOrderCode: orderCode,
        amount: createPaymentDto.amount,
        status: PaymentStatus.PENDING,
      });
      await this.paymentRepository.save(payment);

      return {
        checkoutUrl: paymentLink.checkoutUrl || '',
        orderCode: paymentLink.orderCode,
        accountNumber: paymentLink.accountNumber || '',
        accountName: paymentLink.accountName || '',
        amount: paymentLink.amount,
        description: paymentLink.description || '',
        transactionId: paymentLink.paymentLinkId || '',
        status: paymentLink.status || 'PENDING',
        paymentId: payment.id,
      };
    } catch (error) {
      this.logger.error('Failed to create payment link', error);
      throw error;
    }
  }

  async getPaymentInformation(orderCode: number): Promise<PaymentResponseDto> {
    try {
      const paymentInfo = (await this.payos.paymentRequests.get(
        orderCode,
      )) as PaymentLink;

      // Get account info from most recent transaction if available
      const latestTransaction =
        paymentInfo.transactions?.[paymentInfo.transactions.length - 1];

      return {
        checkoutUrl: '', // PaymentLink doesn't have checkoutUrl, need to reconstruct or store separately
        orderCode: paymentInfo.orderCode,
        accountNumber: latestTransaction?.accountNumber || '',
        accountName: latestTransaction?.virtualAccountName || '',
        amount: paymentInfo.amount,
        description: latestTransaction?.description || '',
        transactionId: paymentInfo.id,
        status: paymentInfo.status,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get payment information for order ${orderCode}`,
        error,
      );
      throw error;
    }
  }

  async cancelPayment(orderCode: number): Promise<PaymentResponseDto> {
    try {
      const cancelledPayment =
        await this.payos.paymentRequests.cancel(orderCode);

      this.logger.log(`Payment cancelled successfully for order ${orderCode}`);

      // The cancel response has different structure, so we need to construct the response
      // with available data and defaults for missing properties
      return {
        checkoutUrl: '', // Cancel operation doesn't return a checkout URL
        orderCode: cancelledPayment.orderCode || orderCode,
        accountNumber: '', // Cancel operation doesn't return account info
        accountName: '', // Cancel operation doesn't return account info
        amount: cancelledPayment.amount || 0,
        description: 'Payment cancelled', // Use default description since cancel response doesn't include it
        transactionId: cancelledPayment.id?.toString() || '',
        status: cancelledPayment.status || 'CANCELLED',
      };
    } catch (error) {
      this.logger.error(
        `Failed to cancel payment for order ${orderCode}`,
        error,
      );
      throw error;
    }
  }

  verifyWebhookData(webhookData: any): any {
    try {
      // Verify webhook signature using PayOS method
      const verifiedData = this.payos.webhooks.verify(webhookData);

      this.logger.log('Webhook data verified successfully');
      return verifiedData;
    } catch (error) {
      this.logger.error('Error verifying webhook data', error);
      throw error;
    }
  }

  async handleWebhook(webhookData: any): Promise<WebhookResponseDto> {
    try {
      const {
        code,
        desc,
        success,
        data: { orderCode },
      } = webhookData;

      this.logger.log(
        `Webhook received for order ${orderCode} with status ${success}`,
      );

      // Here you can implement business logic based on payment status
      // For example: update booking status, send confirmation email, etc.

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error('Error processing webhook', error);
      return {
        success: false,
        message: 'Failed to process webhook',
      };
    }
  }

  private generateOrderCode(): number {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return parseInt(`${timestamp}${random}`);
  }
}

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PayosService {
  private readonly logger = new Logger(PayosService.name);

  /**
   * Create a payment URL for PayOS (mock/simple implementation).
   * In real integration, this should call PayOS API to create a payment session
   * and return the hosted payment page URL or redirect link.
   */
  async createPaymentUrl(params: { amount: number; orderId: string; returnUrl?: string; description?: string; contactEmail?: string; contactPhone?: string; }): Promise<string> {
    const { amount, orderId, returnUrl, description } = params;
    // For now generate a simple URL that the frontend can use to redirect to a real payment flow.
    // Replace this with real API calls to PayOS when available.
    const base = process.env.PAYOS_BASE_URL || 'https://payos.example.com/pay';
    const token = Buffer.from(`${orderId}:${Date.now()}`).toString('base64').replace(/=+$/, '');
    const url = `${base}?order=${encodeURIComponent(orderId)}&amount=${encodeURIComponent(String(amount))}&t=${encodeURIComponent(token)}${returnUrl ? `&return=${encodeURIComponent(returnUrl)}` : ''}${description ? `&desc=${encodeURIComponent(description)}` : ''}`;
    this.logger.log(`Generated PayOS URL for order ${orderId}: ${url}`);
    return url;
  }
}

export default PayosService;

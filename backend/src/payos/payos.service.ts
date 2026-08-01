import { Injectable } from '@nestjs/common';
import { PayOS } from '@payos/node';

@Injectable()
export class PayosService {
  private readonly payos: PayOS;

  constructor() {
    const clientId = process.env.PAYOS_CLIENT_ID || '';
    const apiKey = process.env.PAYOS_API_KEY || '';
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY || '';

    this.payos = new PayOS({
      clientId,
      apiKey,
      checksumKey,
    });
  }

  /**
   * Tạo URL thanh toán PayOS
   * @param orderId Mã đơn hàng trong hệ thống
   * @param amount Tổng tiền (VND)
   */
  async createPaymentUrl(orderId: number, amount: number): Promise<string> {
    const returnUrl =
      process.env.PAYOS_RETURN_URL || 'http://localhost:3000/checkout/success';
    const cancelUrl =
      process.env.PAYOS_CANCEL_URL || 'http://localhost:3000/checkout/cancel';

    const paymentData = {
      orderCode: orderId, // PayOS yêu cầu mã đơn hàng là số nguyên
      amount,
      description: `FurniShop #${orderId}`,
      cancelUrl,
      returnUrl,
    };

    const paymentLink = await this.payos.paymentRequests.create(paymentData);
    return paymentLink.checkoutUrl;
  }

  /**
   * Xác thực dữ liệu webhook nhận từ PayOS
   * @param body Payload của request POST từ PayOS
   */
  async verifyWebhookData(body: any): Promise<any> {
    return this.payos.webhooks.verify(body);
  }
}

import { Injectable, Inject, forwardRef, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class MomoService {
  private readonly logger = new Logger(MomoService.name);

  constructor(
    @Inject(forwardRef(() => OrdersService))
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Tạo URL thanh toán MoMo
   * @param orderId Mã đơn hàng
   * @param amount Số tiền thanh toán
   */
  async createPaymentUrl(orderId: number, amount: number): Promise<string> {
    const partnerCode = process.env.MOMO_PARTNER_CODE || '';
    const accessKey = process.env.MOMO_ACCESS_KEY || '';
    const secretKey = process.env.MOMO_SECRET_KEY || '';
    const apiUrl = process.env.MOMO_API_URL || '';
    const redirectUrl = process.env.MOMO_REDIRECT_URL || '';
    const ipnUrl = process.env.MOMO_IPN_URL || '';

    const orderInfo = `Thanh toan don hang #${orderId} tai FurniShop`;
    const requestId = partnerCode + new Date().getTime();
    const momoOrderId = `${orderId}_${new Date().getTime()}`;
    const extraData = ''; // Dữ liệu bổ sung nếu muốn chuyển qua lại giữa FE và BE
    const orderGroupId = '';
    const autoCapture = true;
    const requestType = 'captureWallet'; // Loại thanh toán bằng ví MoMo

    // Tạo chuỗi signature theo yêu cầu của MoMo
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${momoOrderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode,
      partnerName: 'FurniShop Test',
      storeId: 'FurniShopStore',
      requestId,
      amount,
      orderId: momoOrderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      extraData,
      requestType,
      autoCapture,
      orderGroupId,
      signature,
    };

    try {
      this.logger.log(`--- MOMO API REQUEST DETAILS --- Endpoint: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      let responseData: any;
      try {
        responseData = await response.json();
        this.logger.log(
          `MoMo Response Data: ${JSON.stringify(responseData)}`,
        );
      } catch (jsonErr) {
        this.logger.error('Failed to parse MoMo response JSON:', jsonErr);
        const text = await response.text();
        this.logger.log(`MoMo Response Raw Text: ${text}`);
        throw new Error(`MoMo API error! status: ${response.status}`);
      }

      if (!response.ok || responseData.resultCode !== 0) {
        const errorMsg =
          responseData?.message ||
          `MoMo API error! status: ${response.status}, resultCode: ${responseData?.resultCode}`;
        throw new Error(errorMsg);
      }

      return responseData.payUrl; // Trả về payUrl để khách hàng click
    } catch (error) {
      this.logger.error('Error creating MoMo payment link:', error);
      throw new Error(
        `Kết nối tới cổng thanh toán MoMo thất bại! Chi tiết: ${error.message}`,
      );
    }
  }

  // Cập nhật: Kiểm tra tính hợp lệ của chữ ký số nhận được từ MoMo
  /**
   * Kiểm tra tính hợp lệ của Signature gửi từ MoMo (dùng cho IPN hoặc Redirect URL)
   * @param query Toàn bộ các tham số MoMo gửi về
   */
  verifySignature(query: any): boolean {
    const secretKey = process.env.MOMO_SECRET_KEY || '';
    const {
      partnerCode,
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      payType,
      responseTime,
      extraData,
      signature,
    } = query;

    // Chuỗi để tự tính toán chữ ký số trên Server
    const rawSignature = `accessKey=${process.env.MOMO_ACCESS_KEY}&amount=${amount}&extraData=${extraData || ''}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&paymentOption=${query.paymentOption || ''}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    const mySignature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    return mySignature === signature;
  }
}

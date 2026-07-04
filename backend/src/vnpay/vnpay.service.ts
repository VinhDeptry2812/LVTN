import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class VnpayService {
  private readonly tmnCode: string;
  private readonly hashSecret: string;
  private readonly vnpUrl: string;
  private readonly returnUrl: string;

  constructor() {
    this.tmnCode = process.env.VNPAY_TMN_CODE || '';
    this.hashSecret = process.env.VNPAY_HASH_SECRET || '';
    this.vnpUrl = process.env.VNPAY_URL || '';
    this.returnUrl = process.env.VNPAY_RETURN_URL || '';
  }

  /**
   * Tạo URL thanh toán VNPAY
   * @param orderId Mã đơn hàng trong hệ thống
   * @param amount Tổng tiền (VND) - VNPAY yêu cầu nhân 100
   * @param orderInfo Mô tả đơn hàng
   * @param ipAddr Địa chỉ IP của khách hàng
   */
  createPaymentUrl(
    orderId: number,
    amount: number,
    orderInfo: string,
    ipAddr: string,
  ): string {
    const date = new Date();
    const createDate = this.formatDate(date);
    // Mã giao dịch duy nhất: kết hợp timestamp + orderId
    const txnRef = `${orderId}_${Date.now()}`;

    const params: Record<string, string> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: txnRef,
      vnp_OrderInfo: orderInfo,
      vnp_OrderType: 'other',
      vnp_Amount: String(Math.round(amount * 100)), // VNPAY yêu cầu nhân 100
      vnp_ReturnUrl: this.returnUrl,
      vnp_IpAddr: ipAddr,
      vnp_CreateDate: createDate,
    };

    // Sắp xếp params theo thứ tự alphabet (yêu cầu bắt buộc của VNPAY)
    const sortedParams = this.sortObject(params);

    // Tạo chuỗi query string đã được mã hóa URL
    const signData = new URLSearchParams(sortedParams).toString();

    // Ký HMAC SHA512 với HashSecret
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    // Tạo URL thanh toán hoàn chỉnh
    return `${this.vnpUrl}?${signData}&vnp_SecureHash=${signed}`;
  }

  /**
   * Xác thực chữ ký bảo mật từ VNPAY trả về
   * Đây là bước quan trọng nhất để đảm bảo dữ liệu không bị giả mạo
   */
  verifyReturnUrl(query: Record<string, string>): {
    isValid: boolean;
    orderId: number | null;
    responseCode: string;
    transactionNo: string;
  } {
    const secureHash = query['vnp_SecureHash'];

    // Loại bỏ các tham số hash ra khỏi dữ liệu cần kiểm tra
    const verifyData = { ...query };
    delete verifyData['vnp_SecureHash'];
    delete verifyData['vnp_SecureHashType'];

    // Sắp xếp lại theo alphabet và tạo chuỗi ký
    const sortedParams = this.sortObject(verifyData);
    const signData = new URLSearchParams(sortedParams).toString();

    // Ký lại và so sánh với chữ ký VNPAY gửi về
    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    const isValid = secureHash === signed;

    // Trích xuất orderId từ vnp_TxnRef (format: orderId_timestamp)
    const txnRef = query['vnp_TxnRef'] || '';
    const orderId = parseInt(txnRef.split('_')[0], 10) || null;

    return {
      isValid,
      orderId,
      responseCode: query['vnp_ResponseCode'] || '',
      transactionNo: query['vnp_TransactionNo'] || '',
    };
  }

  /**
   * Sắp xếp object theo key alphabet - yêu cầu bắt buộc của VNPAY
   */
  private sortObject(obj: Record<string, string>): Record<string, string> {
    const sorted: Record<string, string> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      sorted[key] = obj[key];
    }
    return sorted;
  }

  /**
   * Format ngày giờ theo định dạng VNPAY: yyyyMMddHHmmss
   */
  private formatDate(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      date.getFullYear().toString() +
      pad(date.getMonth() + 1) +
      pad(date.getDate()) +
      pad(date.getHours()) +
      pad(date.getMinutes()) +
      pad(date.getSeconds())
    );
  }
}

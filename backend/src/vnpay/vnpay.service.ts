import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';
import axios from 'axios';

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
    txnRef: string;
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
      txnRef,
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

  /**
   * Gọi API hoàn tiền (Refund) của VNPAY
   * Tài liệu: https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr&refund.html
   *
   * @param txnRef       Mã TxnRef gốc lúc thanh toán (format: orderId_timestamp)
   * @param transactionNo Mã giao dịch VNPAY (vnp_TransactionNo từ khi thanh toán thành công)
   * @param transactionDate Ngày giao dịch gốc (vnp_PayDate, định dạng yyyyMMddHHmmss)
   * @param amount       Số tiền hoàn (VND) - sẽ nhân 100 trước khi gửi sang VNPAY
   * @param reason       Nội dung lý do hoàn tiền (không dấu)
   * @param ipAddr       Địa chỉ IP của người thực hiện hoàn tiền
   */
  async refundTransaction(params: {
    txnRef: string;
    transactionNo: string;
    transactionDate: string;
    amount: number;
    reason: string;
    ipAddr: string;
    transactionType?: '02' | '03'; // 02: Full Refund, 03: Partial Refund
  }): Promise<{ success: boolean; message: string; responseCode: string; rawData?: any }> {
    const apiUrl =
      process.env.VNPAY_API_URL ||
      'https://sandbox.vnpayment.vn/merchant_webapi/api/transaction';

    const requestId = Date.now().toString();
    const createDate = this.formatDate(new Date());

    const rawParams: Record<string, string> = {
      vnp_RequestId: requestId,
      vnp_Version: '2.1.0',
      vnp_Command: 'refund',
      vnp_TmnCode: this.tmnCode,
      vnp_TransactionType: params.transactionType || '02',
      vnp_TxnRef: params.txnRef,
      vnp_Amount: String(Math.round(params.amount * 100)),
      vnp_TransactionNo: params.transactionNo,
      vnp_TransactionDate: params.transactionDate,
      vnp_CreateBy: 'admin',
      vnp_CreateDate: createDate,
      vnp_IpAddr: params.ipAddr,
      vnp_OrderInfo: params.reason,
    };

    // Tạo chuỗi ký theo thứ tự VNPAY yêu cầu:
    // RequestId|Version|Command|TmnCode|TransactionType|TxnRef|Amount|TransactionNo|TransactionDate|CreateBy|CreateDate|IpAddr|OrderInfo
    const hashData = [
      rawParams.vnp_RequestId,
      rawParams.vnp_Version,
      rawParams.vnp_Command,
      rawParams.vnp_TmnCode,
      rawParams.vnp_TransactionType,
      rawParams.vnp_TxnRef,
      rawParams.vnp_Amount,
      rawParams.vnp_TransactionNo,
      rawParams.vnp_TransactionDate,
      rawParams.vnp_CreateBy,
      rawParams.vnp_CreateDate,
      rawParams.vnp_IpAddr,
      rawParams.vnp_OrderInfo,
    ].join('|');

    const hmac = crypto.createHmac('sha512', this.hashSecret);
    const secureHash = hmac.update(Buffer.from(hashData, 'utf-8')).digest('hex');

    const requestBody = { ...rawParams, vnp_SecureHash: secureHash };

    try {
      const response = await axios.post(apiUrl, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      });

      const data = response.data;
      const responseCode = data?.vnp_ResponseCode || '';
      const success = responseCode === '00';

      return {
        success,
        responseCode,
        message: success
          ? 'Hoàn tiền VNPAY thành công'
          : `Hoàn tiền VNPAY thất bại (Mã: ${responseCode})`,
        rawData: data,
      };
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || 'Lỗi kết nối VNPAY';
      return {
        success: false,
        responseCode: '99',
        message: `Lỗi khi gọi API hoàn tiền VNPAY: ${message}`,
      };
    }
  }
}

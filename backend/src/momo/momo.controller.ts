import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Res,
} from '@nestjs/common';
import { MomoService } from './momo.service';
import { OrdersService } from '../orders/orders.service';

@Controller('payment')
export class MomoController {
  constructor(
    private readonly momoService: MomoService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Endpoint nhận Webhook IPN từ MoMo gửi về (Môi trường Sandbox/Production gọi ngầm dưới nền)
   * Không có JWT guard để MoMo Server có thể gọi trực tiếp.
   */
  @Post('momo-ipn')
  @HttpCode(HttpStatus.OK)
  async handleMomoIPN(@Body() ipnData: any) {
    console.log('--- NHẬN WEBHOOK IPN TỪ MOMO ---', ipnData);

    // 1. Xác thực chữ ký số bảo mật của MoMo
    const isValid = this.momoService.verifySignature(ipnData);
    if (!isValid) {
      console.warn('Cảnh báo: Chữ ký số MoMo IPN không hợp lệ!');
      return { status: 'error', message: 'Signature mismatch' };
    }

    const orderId = parseInt(ipnData.orderId, 10);
    const resultCode = parseInt(ipnData.resultCode, 10);
    const transId = ipnData.transId;
    const paidAmount = Number(ipnData.amount);

    // 2. Cập nhật trạng thái thanh toán đơn hàng
    // resultCode = 0 là thanh toán thành công
    const isSuccess = resultCode === 0;

    try {
      await this.ordersService.updatePaymentStatus(
        orderId,
        isSuccess,
        transId || 'MOMO_PAYMENT',
        'momo',
        paidAmount,
      );
    } catch (error) {
      console.error('Lỗi khi cập nhật trạng thái đơn hàng từ MoMo IPN:', error);
      return { status: 'error', message: error.message || 'Payment update failed' };
    }

    // 3. Trả về đúng định dạng MoMo yêu cầu để xác nhận đã nhận IPN thành công
    // Nếu không trả về, MoMo sẽ gọi lại nhiều lần gây trùng lặp
    return {
      partnerCode: ipnData.partnerCode,
      orderId: ipnData.orderId,
      requestId: ipnData.requestId,
      resultCode: 0,
      message: 'Acknowledged',
      responseTime: new Date().getTime(),
    };
  }

  /**
   * API Helper hỗ trợ Frontend kiểm tra kết quả giao dịch thủ công qua API Redirect URL
   */
  @Get('momo-verify')
  async verifyMomoReturn(@Query() query: any) {
    const isValid = this.momoService.verifySignature(query);
    if (!isValid) {
      return { success: false, message: 'Chữ ký số không hợp lệ!' };
    }

    const orderId = parseInt(query.orderId, 10);
    const resultCode = parseInt(query.resultCode, 10);
    const isSuccess = resultCode === 0;
    const paidAmount = Number(query.amount);

    // Cập nhật trạng thái trong database
    try {
      const order = await this.ordersService.updatePaymentStatus(
        orderId,
        isSuccess,
        query.transId || 'MOMO_PAYMENT',
        'momo',
        paidAmount,
      );

      return {
        success: isSuccess,
        orderId,
        transId: query.transId,
        transactionNo: query.transId,
        message: query.message,
        order,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Xác thực thanh toán thất bại.',
      };
    }
  }
}

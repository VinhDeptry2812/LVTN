import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Query,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PayosService } from './payos.service';
import { OrdersService } from '../orders/orders.service';

@Controller('payment')
export class PayosController {
  private readonly logger = new Logger(PayosController.name);

  constructor(
    private readonly payosService: PayosService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Webhook xử lý thông báo thanh toán tự động từ PayOS (Server-to-Server)
   */
  @Post('payos-webhook')
  @HttpCode(HttpStatus.OK)
  async handlePayosWebhook(@Body() body: any) {
    this.logger.log(`--- NHẬN WEBHOOK TỪ PAYOS --- ${JSON.stringify(body)}`);

    try {
      // 1. Xác thực chữ ký số từ PayOS
      const webhookData = await this.payosService.verifyWebhookData(body);

      const orderId = webhookData.orderCode;
      const amount = webhookData.amount;
      const transactionNo = webhookData.reference;

      // PayOS webhook code: "00" nghĩa là thanh toán thành công
      // Nếu code khác hoặc success = false, có thể thanh toán bị thất bại/hủy
      const isSuccess =
        body.success === true ||
        body.code === '00' ||
        webhookData.code === '00';

      await this.ordersService.updatePaymentStatus(
        orderId,
        isSuccess,
        transactionNo || 'PAYOS_TRANSACTION',
        'payos',
        amount,
      );

      return {
        status: 'success',
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      this.logger.error('Lỗi khi xử lý PayOS Webhook:', error);
      return {
        status: 'error',
        message: error.message || 'Webhook verification failed',
      };
    }
  }

  /**
   * Callback xác thực sau khi người dùng được chuyển hướng về từ PayOS
   * Hỗ trợ frontend kiểm tra kết quả giao dịch và hiển thị UI
   */
  @Get('payos-verify')
  async verifyPayosReturn(@Query() query: any) {
    this.logger.log(`--- NHẬN CALLBACK REDIRECT TỪ PAYOS --- ${JSON.stringify(query)}`);

    const orderId = parseInt(query.orderCode, 10);
    if (isNaN(orderId)) {
      throw new BadRequestException('Mã đơn hàng không hợp lệ.');
    }

    // PayOS trả về query: orderCode, cancel, status, transactionDateTime, v.v.
    // cancel = 'true' nghĩa là khách hàng nhấn hủy thanh toán
    const isCancelled = query.cancel === 'true';
    const isSuccess =
      !isCancelled &&
      (query.status === 'PAID' ||
        query.status === 'SUCCESS' ||
        query.code === '00');

    try {
      // Cập nhật trạng thái thanh toán đơn hàng
      const order = await this.ordersService.updatePaymentStatus(
        orderId,
        isSuccess,
        query.id || 'PAYOS_PAYMENT',
        'payos',
      );

      return {
        success: isSuccess,
        orderId,
        transactionNo: query.id,
        status: query.status,
        message: isSuccess
          ? 'Thanh toán thành công!'
          : 'Thanh toán không thành công hoặc đã bị hủy.',
        order,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Xác thực thanh toán PayOS thất bại.',
      };
    }
  }
}

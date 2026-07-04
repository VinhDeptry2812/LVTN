import { Controller, Get, Query } from '@nestjs/common';
import { OrdersService } from '../orders/orders.service';
import { VnpayService } from './vnpay.service';
import { PaymentStatus } from '../orders/order.entity';

/**
 * Controller xử lý callback từ VNPAY
 * KHÔNG yêu cầu JWT vì đây là endpoint mà VNPAY redirect người dùng về
 */
@Controller('payment')
export class VnpayController {
  constructor(
    private readonly vnpayService: VnpayService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Endpoint nhận kết quả thanh toán khi VNPAY redirect người dùng về
   * Frontend sẽ gọi API này với toàn bộ query params từ URL
   */
  @Get('vnpay-return')
  async handleVnpayReturn(@Query() query: Record<string, string>) {
    const result = this.vnpayService.verifyReturnUrl(query);

    if (!result.isValid) {
      return {
        success: false,
        message: 'Chữ ký bảo mật không hợp lệ. Giao dịch có thể bị giả mạo.',
      };
    }

    // responseCode = '00' nghĩa là thanh toán thành công
    if (result.responseCode === '00' && result.orderId) {
      await this.ordersService.updatePaymentStatus(
        result.orderId,
        true,
        result.transactionNo,
        'vnpay',
      );

      return {
        success: true,
        message: 'Thanh toán thành công!',
        orderId: result.orderId,
        transactionNo: result.transactionNo,
      };
    }

    // Thanh toán thất bại hoặc bị hủy bởi người dùng
    if (result.orderId) {
      await this.ordersService.updatePaymentStatus(
        result.orderId,
        false,
        result.transactionNo,
        'vnpay',
      );
    }

    return {
      success: false,
      message: 'Thanh toán không thành công hoặc đã bị hủy.',
      responseCode: result.responseCode,
    };
  }
}

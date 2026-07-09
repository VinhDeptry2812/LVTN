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
      try {
        const paidAmount = Number(query['vnp_Amount']) / 100;
        await this.ordersService.updatePaymentStatus(
          result.orderId,
          true,
          result.transactionNo,
          'vnpay',
          paidAmount,
        );

        return {
          success: true,
          message: 'Thanh toán thành công!',
          orderId: result.orderId,
          transactionNo: result.transactionNo,
        };
      } catch (error) {
        return {
          success: false,
          message: error.message || 'Thanh toán thất bại do xác thực không hợp lệ.',
        };
      }
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

  /**
   * Endpoint nhận IPN (Instant Payment Notification) từ VNPAY (Server-to-Server)
   * VNPAY sẽ gọi ngầm để đảm bảo cập nhật trạng thái đơn hàng ngay cả khi người dùng tắt trình duyệt
   */
  @Get('vnpay-ipn')
  async handleVnpayIpn(@Query() query: Record<string, string>) {
    try {
      const result = this.vnpayService.verifyReturnUrl(query);

      if (!result.isValid) {
        return { RspCode: '97', Message: 'Invalid checksum' };
      }

      if (!result.orderId) {
        return { RspCode: '01', Message: 'Order not found' };
      }

      const order = await this.ordersService.findOne(result.orderId);
      if (!order) {
        return { RspCode: '01', Message: 'Order not found' };
      }

      // 1. Kiểm tra trạng thái đơn hàng đã được confirm chưa
      if (order.payment_status === PaymentStatus.PAID) {
        return { RspCode: '02', Message: 'Order already confirmed' };
      }

      // 2. Kiểm tra số tiền thanh toán có khớp không
      const vnpAmount = Number(query['vnp_Amount']) / 100;
      if (Math.abs(Number(order.total_amount) - vnpAmount) > 1) {
        return { RspCode: '04', Message: 'Invalid amount' };
      }

      const isSuccess = result.responseCode === '00';
      await this.ordersService.updatePaymentStatus(
        result.orderId,
        isSuccess,
        result.transactionNo,
        'vnpay',
        vnpAmount,
      );

      return { RspCode: '00', Message: 'Confirm success' };
    } catch (error) {
      console.error('Lỗi xử lý VNPAY IPN:', error);
      return { RspCode: '99', Message: 'Unknown error' };
    }
  }
}

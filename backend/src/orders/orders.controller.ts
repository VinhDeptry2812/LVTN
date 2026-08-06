import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { OrdersService } from './orders.service';
import { VnpayService } from '../vnpay/vnpay.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../users/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RequestReturnDto } from './dto/request-return.dto';
import { HandleReturnDto } from './dto/handle-return.dto';
import { OrderStatus, PaymentMethod, PaymentStatus } from './order.entity';

/**
 * Controller quản lý đơn hàng
 * Xử lý các request từ khách hàng (đặt hàng, tra cứu, hủy, thanh toán) và quản trị viên (danh sách, thống kê, duyệt trả hàng)
 */
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly vnpayService: VnpayService,
  ) {}

  // 1. APIs cho Khách hàng

  /**
   * Tính phí vận chuyển dự kiến dựa trên danh sách sản phẩm và tỉnh/thành phố
   * @param body Danh sách sản phẩm và tên tỉnh/thành phố giao hàng
   * @returns {Promise<{ shipping_fee: number; is_bulky: boolean }>} Phí vận chuyển và cờ hàng cồng kềnh
   */
  @Post('calculate-shipping')
  async calculateShipping(
    @Body() body: { items: { product_id: number; quantity: number }[]; province?: string },
  ) {
    if (!body.items || body.items.length === 0) {
      return { shipping_fee: 0, is_bulky: false };
    }
    const result = await this.ordersService.calculateShippingFeeInternal(
      body.items,
      body.province || '',
    );
    return {
      shipping_fee: result.shippingFee,
      is_bulky: result.isBulky,
    };
  }

  /**
   * Tạo đơn hàng mới cho người dùng đã đăng nhập (Khách hàng)
   * @param userId ID người dùng từ JWT Token
   * @param role Vai trò người dùng
   * @param createOrderDto Dữ liệu tạo đơn hàng
   * @param req Đối tượng Request từ Express
   * @returns {Promise<{ order: Order; paymentUrl: string | null }>} Thông tin đơn hàng và URL thanh toán (nếu là VNPAY)
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: Request,
  ) {
    if (role === UserRole.ADMIN || role === UserRole.STAFF) {
      throw new ForbiddenException(
        'Tài khoản Quản trị/Nhân viên không được phép đặt hàng mua sắm cá nhân. Vui lòng sử dụng tài khoản Khách hàng.',
      );
    }
    const order = await this.ordersService.createOrder(userId, createOrderDto);

    // Nếu phương thức thanh toán là VNPAY, tự động tạo URL thanh toán
    if (createOrderDto.payment_method === PaymentMethod.VNPAY) {
      const ipAddr =
        (req.headers['x-forwarded-for'] as string) ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const paymentUrl = this.vnpayService.createPaymentUrl(
        order.id,
        Number(order.total_amount),
        `Thanh toan don hang #${order.id} - FurniShop`,
        ipAddr,
      );

      return {
        order,
        paymentUrl,
      };
    }

    // Thanh toán COD: trả về đơn hàng bình thường
    return { order, paymentUrl: null };
  }

  /**
   * Tạo đơn hàng cho khách vãng lai (Guest Order - không cần đăng nhập)
   * @param createOrderDto Dữ liệu tạo đơn hàng của khách vãng lai
   * @param req Đối tượng Request từ Express
   * @returns {Promise<{ order: Order; paymentUrl: string | null }>} Thông tin đơn hàng và URL thanh toán
   */
  @Post('guest')
  async createGuestOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: Request,
  ) {
    const order = await this.ordersService.createGuestOrder(createOrderDto);

    if (createOrderDto.payment_method === PaymentMethod.VNPAY) {
      const ipAddr =
        (req.headers['x-forwarded-for'] as string) ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const paymentUrl = this.vnpayService.createPaymentUrl(
        order.id,
        Number(order.total_amount),
        `Thanh toan don hang #${order.id} - FurniShop`,
        ipAddr,
      );

      return {
        order,
        paymentUrl,
      };
    }

    return { order, paymentUrl: null };
  }

  /**
   * Lấy danh sách đơn hàng cá nhân của người dùng
   * @param userId ID người dùng từ Token
   * @param page Trang hiện tại (phân trang)
   * @param limit Số lượng đơn hàng trên mỗi trang
   * @param status Lọc theo trạng thái đơn hàng
   * @returns Danh sách đơn hàng phân trang
   */
  @Get('my-orders')
  @UseGuards(JwtAuthGuard)
  async getMyOrders(
    @GetUser('id') userId: number,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.ordersService.getMyOrders(userId, page, limit, status);
  }

  /**
   * Lấy thông tin chi tiết của 1 đơn hàng cá nhân
   * @param userId ID người dùng
   * @param role Vai trò người dùng
   * @param orderId ID đơn hàng
   * @returns Chi tiết đơn hàng bao gồm danh sách sản phẩm
   */
  @Get('my-orders/:id')
  @UseGuards(JwtAuthGuard)
  async getMyOrderDetails(
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.getOrderDetails(userId, orderId, role);
  }

  /**
   * Khách hàng yêu cầu hủy đơn hàng
   * @param userId ID người dùng
   * @param orderId ID đơn hàng cần hủy
   * @param body Lý do hủy đơn hàng (tùy chọn)
   * @returns Đơn hàng sau khi cập nhật trạng thái hủy
   */
  @Post('my-orders/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelMyOrder(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) orderId: number,
    @Body() body?: { reason?: string },
  ) {
    return this.ordersService.cancelOrder(userId, orderId, body?.reason);
  }

  /**
   * Khách hàng xác nhận đã nhận hàng thành công (Hoàn tất đơn hàng)
   * @param userId ID người dùng
   * @param orderId ID đơn hàng
   * @returns Đơn hàng sau khi cập nhật trạng thái COMPLETED
   */
  @Post('my-orders/:id/complete')
  @UseGuards(JwtAuthGuard)
  async completeMyOrder(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.completeOrder(userId, orderId);
  }

  /**
   * Tạo lại đường dẫn thanh toán trực tuyến VNPAY cho đơn hàng chưa thanh toán
   * @param userId ID người dùng
   * @param orderId ID đơn hàng
   * @param req Request từ Express
   * @returns {{ paymentUrl: string }} URL thanh toán VNPAY mới
   */
  @Post('my-orders/:id/repay')
  @UseGuards(JwtAuthGuard)
  async repayOrder(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) orderId: number,
    @Req() req: Request,
  ) {
    const order = await this.ordersService.getOrderDetails(
      userId,
      orderId,
      UserRole.CUSTOMER,
    );

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException(
        'Đơn hàng đã bị hủy, không thể thanh toán.',
      );
    }

    if (order.payment_status === PaymentStatus.PAID) {
      throw new BadRequestException('Đơn hàng này đã được thanh toán.');
    }

    if (order.payment_method === PaymentMethod.VNPAY) {
      const ipAddr =
        (req.headers['x-forwarded-for'] as string) ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const paymentUrl = this.vnpayService.createPaymentUrl(
        order.id,
        Number(order.total_amount),
        `Thanh toan don hang #${order.id} - FurniShop`,
        ipAddr,
      );

      return { paymentUrl };
    }

    throw new BadRequestException(
      'Phương thức thanh toán không hỗ trợ thanh toán trực tuyến.',
    );
  }

  /**
   * Khách hàng gửi yêu cầu trả hàng / hoàn tiền
   * @param userId ID người dùng
   * @param orderId ID đơn hàng
   * @param dto Lý do và hình ảnh đính kèm yêu cầu trả hàng
   * @returns Kết quả ghi nhận yêu cầu đổi trả
   */
  @Post('my-orders/:id/return')
  @UseGuards(JwtAuthGuard)
  async requestMyOrderReturn(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: RequestReturnDto,
  ) {
    return this.ordersService.requestOrderReturn(userId, orderId, dto);
  }

  // 2. APIs cho Admin

  /**
   * [Admin/Staff] Lấy danh sách toàn bộ đơn hàng trong hệ thống với bộ lọc đa năng
   * @param page Trang cần truy vấn
   * @param limit Số lượng bản ghi mỗi trang
   * @param status Trạng thái đơn hàng (PENDING, PROCESSING, SHIPPED, v.v.)
   * @param search Từ khóa tìm kiếm (tên, email, SĐT khách hàng, mã đơn)
   * @param paymentMethod Phương thức thanh toán (COD, VNPAY)
   * @param dateRange Khoảng thời gian
   * @param isReturn Lọc đơn hàng có yêu cầu trả hàng hay không
   * @returns Danh sách đơn hàng phân trang kèm tổng số lượng
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async getAllOrdersAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: OrderStatus,
    @Query('search') search?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('dateRange') dateRange?: string,
    @Query('isReturn') isReturn?: string,
  ) {
    return this.ordersService.getAllOrdersAdmin(
      page,
      limit,
      status,
      search,
      paymentMethod,
      dateRange,
      isReturn,
    );
  }

  /**
   * [Admin] Lấy dữ liệu thống kê tổng quan doanh thu, số đơn hàng cho Dashboard
   * @param timeframe Khung thời gian (day, week, month, year)
   * @param startDate Ngày bắt đầu tùy chọn
   * @param endDate Ngày kết thúc tùy chọn
   * @returns Dữ liệu thống kê doanh thu và chỉ số tăng trưởng
   */
  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getDashboardStatsAdmin(
    @Query('timeframe') timeframe?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.ordersService.getDashboardStatsAdmin(timeframe, startDate, endDate);
  }

  /**
   * [Admin/Staff] Cập nhật trạng thái đơn hàng (Ví dụ: Từ PENDING sang PROCESSING, SHIPPED, DELIVERED)
   * @param orderId ID đơn hàng
   * @param dto Trạng thái mới và ghi chú
   * @returns Đơn hàng đã được cập nhật
   */
  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async updateOrderStatusAdmin(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatusAdmin(orderId, dto);
  }

  /**
   * [Admin/Staff] Xử lý duyệt hoặc từ chối yêu cầu trả hàng của khách
   * @param orderId ID đơn hàng
   * @param dto Quyết định xử lý (chấp nhận/từ chối) và phương án xử lý kho/hoàn tiền
   * @returns Đơn hàng sau khi hoàn tất xử lý trả hàng
   */
  @Post('admin/:id/handle-return')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async handleOrderReturnAdmin(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: HandleReturnDto,
  ) {
    return this.ordersService.handleOrderReturnAdmin(orderId, dto);
  }

  /**
   * Tải về file hóa đơn PDF của đơn hàng
   * @param orderId ID đơn hàng
   * @param userId ID người dùng thực hiện tải
   * @param role Vai trò người dùng
   * @param res Response của Express để xuất luồng dữ liệu file PDF
   */
  @Get(':id/invoice')
  @UseGuards(JwtAuthGuard)
  async downloadInvoice(
    @Param('id', ParseIntPipe) orderId: number,
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
    @Res() res: Response,
  ) {
    // Kiểm tra quyền sở hữu đơn hàng
    await this.ordersService.getOrderDetails(userId, orderId, role);

    const pdfBuffer = await this.ordersService.generateInvoicePdf(orderId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=hoadon-${orderId}.pdf`,
      'Content-Length': pdfBuffer.length,
    });

    res.end(pdfBuffer);
  }
}


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

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly vnpayService: VnpayService,
  ) {}

  // 1. APIs cho Khách hàng

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

  // Guest order endpoint without JwtAuthGuard
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

  @Get('my-orders/:id')
  @UseGuards(JwtAuthGuard)
  async getMyOrderDetails(
    @GetUser('id') userId: number,
    @GetUser('role') role: UserRole,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.getOrderDetails(userId, orderId, role);
  }

  @Post('my-orders/:id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelMyOrder(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.cancelOrder(userId, orderId);
  }

  @Post('my-orders/:id/complete')
  @UseGuards(JwtAuthGuard)
  async completeMyOrder(
    @GetUser('id') userId: number,
    @Param('id', ParseIntPipe) orderId: number,
  ) {
    return this.ordersService.completeOrder(userId, orderId);
  }

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

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async updateOrderStatusAdmin(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatusAdmin(orderId, dto);
  }

  @Post('admin/:id/handle-return')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async handleOrderReturnAdmin(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: HandleReturnDto,
  ) {
    return this.ordersService.handleOrderReturnAdmin(orderId, dto);
  }

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

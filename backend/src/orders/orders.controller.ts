import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import { OrdersService } from './orders.service';
import { VnpayService } from '../vnpay/vnpay.service';
import { MomoService } from '../momo/momo.service';
import { Inject, forwardRef } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UserRole } from '../users/user.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus, PaymentMethod, PaymentStatus } from './order.entity';

@Controller('orders')
export class OrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly vnpayService: VnpayService,
    @Inject(forwardRef(() => MomoService))
    private readonly momoService: MomoService,
  ) {}

  // 1. APIs cho Khách hàng

  @Post()
  @UseGuards(JwtAuthGuard)
  async createOrder(
    @GetUser('id') userId: number,
    @Body() createOrderDto: CreateOrderDto,
    @Req() req: Request,
  ) {
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

    // Nếu phương thức thanh toán là MoMo, tự động tạo URL thanh toán MoMo
    if (createOrderDto.payment_method === PaymentMethod.MOMO) {
      const paymentUrl = await this.momoService.createPaymentUrl(
        order.id,
        Number(order.total_amount),
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

    if (createOrderDto.payment_method === PaymentMethod.MOMO) {
      const paymentUrl = await this.momoService.createPaymentUrl(
        order.id,
        Number(order.total_amount),
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
  async getMyOrders(@GetUser('id') userId: number) {
    return this.ordersService.getMyOrders(userId);
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
    const order = await this.ordersService.getOrderDetails(userId, orderId, UserRole.CUSTOMER);

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Đơn hàng đã bị hủy, không thể thanh toán.');
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

    if (order.payment_method === PaymentMethod.MOMO) {
      const paymentUrl = await this.momoService.createPaymentUrl(
        order.id,
        Number(order.total_amount),
      );

      return { paymentUrl };
    }

    throw new BadRequestException('Phương thức thanh toán không hỗ trợ thanh toán trực tuyến.');
  }

  // 2. APIs cho Admin

  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllOrdersAdmin(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('status') status?: OrderStatus,
    @Query('search') search?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('dateRange') dateRange?: string,
  ) {
    return this.ordersService.getAllOrdersAdmin(page, limit, status, search, paymentMethod, dateRange);
  }

  @Get('admin/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getDashboardStatsAdmin() {
    return this.ordersService.getDashboardStatsAdmin();
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateOrderStatusAdmin(
    @Param('id', ParseIntPipe) orderId: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatusAdmin(orderId, dto);
  }
}

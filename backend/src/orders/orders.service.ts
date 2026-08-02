import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, In, Raw, MoreThanOrEqual } from 'typeorm';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderReturn } from './order-return.entity';
import { CartService } from '../cart/cart.service';
import { ProductVariant } from '../products/product-variant.entity';
import { Product } from '../products/product.entity';
import { InventoryTransaction } from '../products/inventory-transaction.entity';
import { logInventoryTransaction } from '../products/inventory-transaction.helper';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { RequestReturnDto } from './dto/request-return.dto';
import { HandleReturnDto } from './dto/handle-return.dto';
import { UserRole, User } from '../users/user.entity';
import { VouchersService } from '../vouchers/vouchers.service';
import { Voucher, DiscountType } from '../vouchers/voucher.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { MailService } from '../auth/mail.service';
import { VnpayService } from '../vnpay/vnpay.service';
import { WarrantiesService } from '../warranties/warranties.service';
import * as path from 'path';
import PDFDocument from 'pdfkit';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(OrderReturn)
    private readonly orderReturnRepository: Repository<OrderReturn>,
    @InjectRepository(InventoryTransaction)
    private readonly transactionRepository: Repository<InventoryTransaction>,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
    private readonly vouchersService: VouchersService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly vnpayService: VnpayService,
    private readonly warrantiesService: WarrantiesService,
  ) { }

  onModuleInit() {
    // Chạy dọn dẹp đơn hàng chưa thanh toán định kỳ mỗi 5 phút
    setInterval(
      () => {
        this.cleanupUnpaidOrders().catch((err) => {
          this.logger.error('Lỗi khi chạy dọn dẹp đơn hàng chưa thanh toán:', err);
        });
      },
      5 * 60 * 1000,
    );
  }

  private generateShippingCode(): string {
    const chars = '0123456789';
    let code = 'GHN';
    for (let i = 0; i < 10; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private triggerOrderStatusEmailNotification(orderId: number, status: OrderStatus): void {
    this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        user: true,
        items: {
          product: true,
          variant: true,
        },
      },
    }).then(async (order) => {
      if (order && order.user?.email) {
        let pdfBuffer: Buffer | undefined = undefined;
        // Chỉ đính kèm hóa đơn khi mới tạo đơn hàng (PENDING) để tránh gửi lặp lại khi chuyển trạng thái
        if (status === OrderStatus.PENDING) {
          try {
            pdfBuffer = await this.generateInvoicePdf(order.id);
          } catch (pdfErr) {
            this.logger.error('Không thể tạo PDF hóa đơn để gửi kèm email:', pdfErr);
          }
        }

        this.mailService.sendOrderStatusEmail(order.user.email, order, status, pdfBuffer).catch((err) => {
          this.logger.error('Lỗi khi gửi email thông báo đơn hàng:', err);
        });
      }
    }).catch((err) => {
      this.logger.error('Lỗi khi lấy dữ liệu đơn hàng để gửi email:', err);
    });
  }

  async calculateShippingFeeInternal(
    items: { product_id: number; quantity: number }[],
    shippingAddress: string,
  ): Promise<{ shippingFee: number; isBulky: boolean }> {
    let isBulky = false;
    let totalItemsPrice = 0;

    if (items && items.length > 0) {
      const productIds = items.map((item) => item.product_id);
      const products = await this.dataSource.getRepository(Product).find({
        where: { id: In(productIds) },
      });

      const productsMap = new Map(products.map((p) => [p.id, p]));
      for (const item of items) {
        const prod = productsMap.get(item.product_id);
        if (prod) {
          isBulky = isBulky || prod.is_bulky;
          const price = prod.discount_price
            ? Number(prod.discount_price)
            : Number(prod.base_price);
          totalItemsPrice += price * item.quantity;
        }
      }
    }

    const addressLower = shippingAddress ? shippingAddress.toLowerCase() : '';
    const isInnerCity = [
      'hồ chí minh',
      'ho chi minh',
      'hcm',
      'hà nội',
      'ha noi',
      'hn',
    ].some((city) => addressLower.includes(city));

    let shippingFee = 0;
    if (isBulky) {
      if (totalItemsPrice >= 20000000) {
        shippingFee = 0;
      } else {
        shippingFee = isInnerCity ? 150000 : 350000;
      }
    } else {
      if (totalItemsPrice >= 5000000) {
        shippingFee = 0;
      } else {
        shippingFee = isInnerCity ? 30000 : 60000;
      }
    }

    return { shippingFee, isBulky };
  }

  async findOne(orderId: number): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: { variant: true } },
    });
  }

  private async processOrderCreation(
    dto: CreateOrderDto,
    userId?: number,
  ): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống, không thể đặt hàng.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];
      const stockChanges: {
        variantId: number;
        changeQty: number;
        prevStock: number;
        newStock: number;
      }[] = [];

      const order = new Order();
      if (userId) {
        order.user = { id: userId } as unknown as User;
      }
      order.shipping_address = dto.shipping_address;
      order.phone = dto.phone;
      order.notes = dto.notes || null;
      order.payment_method = dto.payment_method;
      order.status = OrderStatus.PENDING;
      order.payment_status = PaymentStatus.PENDING;

      // Tính phí vận chuyển
      const { shippingFee } = await this.calculateShippingFeeInternal(
        dto.items,
        dto.shipping_address,
      );
      order.shipping_fee = shippingFee;

      for (const item of dto.items) {
        if (item.variant_id) {
          const variant = await queryRunner.manager.findOne(ProductVariant, {
            where: { id: item.variant_id },
            lock: { mode: 'pessimistic_write' },
          });

          if (!variant) {
            throw new NotFoundException(`Biến thể sản phẩm không tồn tại.`);
          }

          if (variant.stock < item.quantity) {
            throw new BadRequestException(
              `Không đủ hàng tồn kho. Chỉ còn lại ${variant.stock} sản phẩm.`,
            );
          }

          const prevStock = variant.stock;
          variant.stock -= item.quantity;
          await queryRunner.manager.save(variant);

          this.checkLowStockAlert(
            variant.id,
            variant.stock,
            queryRunner.manager,
          ).catch((err) => {
            this.logger.error('Error triggering low stock warning:', err);
          });

          stockChanges.push({
            variantId: variant.id,
            changeQty: -item.quantity,
            prevStock,
            newStock: variant.stock,
          });
        }

        const itemSubtotal = item.price * item.quantity;
        totalAmount += itemSubtotal;

        const orderItem = new OrderItem();
        orderItem.product = { id: item.product_id } as unknown as Product;
        if (item.variant_id) {
          orderItem.variant = {
            id: item.variant_id,
          } as unknown as ProductVariant;
        }
        orderItem.quantity = item.quantity;
        orderItem.price = item.price;
        orderItems.push(orderItem);
      }

      if (dto.voucher_code) {
        const cleanCode = dto.voucher_code.trim().toUpperCase();
        const voucher = await queryRunner.manager.findOne(Voucher, {
          where: { code: cleanCode },
          lock: { mode: 'pessimistic_write' },
        });

        if (!voucher) {
          throw new BadRequestException('Mã giảm giá không tồn tại.');
        }

        const itemsForVoucher = dto.items.map((i) => ({
          productId: i.product_id,
          price: i.price,
          quantity: i.quantity,
        }));

        const { discountAmount } = await this.vouchersService.validateVoucher(
          dto.voucher_code,
          totalAmount,
          userId,
          queryRunner.manager,
          itemsForVoucher,
        );

        voucher.used_count += 1;
        await queryRunner.manager.save(voucher);

        order.voucher_code = voucher.code;
        order.discount_amount = discountAmount;
        order.total_amount = totalAmount - discountAmount + shippingFee;
      } else {
        order.total_amount = totalAmount + shippingFee;
        order.discount_amount = 0;
      }

      order.items = orderItems;

      const savedOrder = await queryRunner.manager.save(order);

      if (userId) {
        try {
          await this.cartService.clearCart(userId);
        } catch {
          // Ignore if cart doesn't exist
        }
      }

      const noteText = userId
        ? `Đơn hàng đặt bởi khách hàng #${userId}, đơn hàng #${savedOrder.id}`
        : `Khách vãng lai đặt hàng đơn #${savedOrder.id}`;

      for (const change of stockChanges) {
        await this.logTransaction(
          queryRunner.manager,
          change.variantId,
          change.changeQty,
          change.prevStock,
          change.newStock,
          'sale',
          noteText,
          savedOrder.id.toString(),
        );
      }

      await queryRunner.commitTransaction();
      this.triggerOrderStatusEmailNotification(savedOrder.id, savedOrder.status);
      try {
        await this.notificationsService.create({
          title: 'Đơn hàng mới',
          message: `Đơn hàng #${savedOrder.id} vừa được đặt thành công (${Number(savedOrder.total_amount)?.toLocaleString('vi-VN')}đ)`,
          type: 'info',
          reference_link: '/admin/orders',
        });
      } catch (e) {
        this.logger.error('Lỗi khi tạo thông báo đơn hàng mới:', e);
      }
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createGuestOrder(dto: CreateOrderDto): Promise<Order> {
    return this.processOrderCreation(dto);
  }

  async createOrder(userId: number, dto: CreateOrderDto): Promise<Order> {
    return this.processOrderCreation(dto, userId);
  }

  async getMyOrders(
    userId: number,
    page?: number,
    limit?: number,
    status?: string,
  ) {
    const where: any = { user: { id: userId } };
    if (status) {
      where.status = status;
    }

    if (page || limit) {
      const pageNum = Math.max(1, Number(page) || 1);
      const limitNum = Math.max(1, Number(limit) || 10);
      const skip = (pageNum - 1) * limitNum;

      const [orders, total] = await this.orderRepository.findAndCount({
        where,
        relations: {
          items: {
            product: {
              images: true,
            },
            variant: true,
          },
          return_request: true,
        },
        order: { created_at: 'DESC' },
        skip,
        take: limitNum,
      });

      return {
        data: orders,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      };
    }

    return this.orderRepository.find({
      where,
      relations: {
        items: {
          product: {
            images: true,
          },
          variant: true,
        },
        return_request: true,
      },
      order: { created_at: 'DESC' },
      take: 50,
    });
  }

  async getOrderDetails(
    userId: number,
    orderId: number,
    role: UserRole,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        user: true,
        items: {
          product: {
            images: true,
          },
          variant: true,
        },
        return_request: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Bảo mật: Khách hàng chỉ được xem đơn hàng của chính mình. Admin và Staff xem được tất cả.
    if (role !== UserRole.ADMIN && role !== UserRole.STAFF) {
      if (!order.user || order.user.id !== userId) {
        throw new ForbiddenException('Bạn không có quyền truy cập đơn hàng này.');
      }
    }

    return order;
  }

  async cancelOrder(userId: number, orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
      relations: {
        items: {
          variant: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng để hủy.');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Đơn hàng đang được xử lý hoặc đã giao hàng, không thể tự hủy.',
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Hoàn lại kho cho các biến thể
      for (const item of order.items) {
        if (item.variant) {
          const variant = await queryRunner.manager.findOne(ProductVariant, {
            where: { id: item.variant.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (variant) {
            const prevStock = variant.stock;
            variant.stock += item.quantity;
            await queryRunner.manager.save(variant);
            await this.logTransaction(
              queryRunner.manager,
              variant.id,
              item.quantity,
              prevStock,
              variant.stock,
              'return',
              `Khách hàng hủy đơn hàng #${order.id}`,
              order.id.toString(),
            );
          }
        }
      }

      // Hoàn lại lượt dùng voucher nếu có
      if (order.voucher_code) {
        const voucher = await queryRunner.manager.findOne(Voucher, {
          where: { code: order.voucher_code.trim().toUpperCase() },
          lock: { mode: 'pessimistic_write' },
        });
        if (voucher && voucher.used_count > 0) {
          voucher.used_count -= 1;
          await queryRunner.manager.save(voucher);
        }
      }

      order.status = OrderStatus.CANCELLED;
      order.cancelled_at = new Date();
      const updatedOrder = await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();
      this.triggerOrderStatusEmailNotification(order.id, OrderStatus.CANCELLED);
      return updatedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async completeOrder(userId: number, orderId: number): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    if (order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        'Đơn hàng chưa được giao thành công, không thể xác nhận hoàn thành.',
      );
    }

    order.status = OrderStatus.COMPLETED;
    order.completed_at = new Date();

    // Nếu là COD và chưa thanh toán, tự động chuyển sang PAID
    if (order.payment_status !== PaymentStatus.PAID) {
      order.payment_status = PaymentStatus.PAID;
    }

    const savedOrder = await this.orderRepository.save(order);
    this.triggerOrderStatusEmailNotification(order.id, OrderStatus.COMPLETED);

    try {
      await this.warrantiesService.generateForOrder(order.id);
    } catch (err) {
      this.logger.error('Lỗi khi tự động tạo phiếu bảo hành cho đơn hàng:', err);
    }

    return savedOrder;
  }

  async getAllOrdersAdmin(
    page = 1,
    limit = 10,
    status?: OrderStatus,
    search?: string,
    paymentMethod?: string,
    dateRange?: string,
    isReturn?: string,
  ): Promise<{ data: Order[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('items.variant', 'variant')
      .leftJoinAndSelect('order.return_request', 'return_request')
      .orderBy('order.created_at', 'DESC');

    queryBuilder.where('1=1');

    if (isReturn === 'true') {
      queryBuilder.andWhere('order.status IN (:...returnStatuses)', {
        returnStatuses: [
          OrderStatus.RETURN_PENDING,
          OrderStatus.RETURN_APPROVED,
          OrderStatus.RETURN_REJECTED,
        ],
      });
    } else if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (paymentMethod) {
      queryBuilder.andWhere('order.payment_method = :paymentMethod', {
        paymentMethod,
      });
    }

    if (dateRange) {
      const now = new Date();
      let startDate: Date;
      if (dateRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        queryBuilder.andWhere('order.created_at >= :startDate', { startDate });
      } else if (dateRange === '7days') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        queryBuilder.andWhere('order.created_at >= :startDate', { startDate });
      } else if (dateRange === '30days') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        queryBuilder.andWhere('order.created_at >= :startDate', { startDate });
      }
    }

    if (search) {
      const isNumeric = /^\d+$/.test(search);
      const searchId = isNumeric ? Number(search) : -1;

      queryBuilder.andWhere(
        '(order.id = :searchId OR user.name LIKE :searchKeyword OR user.email LIKE :searchKeyword OR order.phone LIKE :searchKeyword)',
        { searchId, searchKeyword: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async updateOrderStatusAdmin(
    orderId: number,
    dto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        items: {
          variant: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Trường hợp cập nhật trạng thái thành CANCELLED (Admin hủy đơn) và đơn trước đó chưa hủy
      if (
        dto.status === OrderStatus.CANCELLED &&
        order.status !== OrderStatus.CANCELLED
      ) {
        for (const item of order.items) {
          if (item.variant) {
            const variant = await queryRunner.manager.findOne(ProductVariant, {
              where: { id: item.variant.id },
              lock: { mode: 'pessimistic_write' },
            });
            if (variant) {
              const prevStock = variant.stock;
              variant.stock += item.quantity;
              await queryRunner.manager.save(variant);
              await this.logTransaction(
                queryRunner.manager,
                variant.id,
                item.quantity,
                prevStock,
                variant.stock,
                'return',
                `Quản trị viên hủy đơn hàng #${order.id}`,
                order.id.toString(),
              );
            }
          }
        }

        // Hoàn lại lượt dùng voucher nếu có
        if (order.voucher_code) {
          const voucher = await queryRunner.manager.findOne(Voucher, {
            where: { code: order.voucher_code.trim().toUpperCase() },
            lock: { mode: 'pessimistic_write' },
          });
          if (voucher && voucher.used_count > 0) {
            voucher.used_count -= 1;
            await queryRunner.manager.save(voucher);
          }
        }
      }

      if (dto.status) {
        order.status = dto.status;
        if (dto.status === OrderStatus.CONFIRMED) {
          order.confirmed_at = new Date();
        } else if (dto.status === OrderStatus.SHIPPING) {
          order.shipping_at = new Date();
        } else if (dto.status === OrderStatus.DELIVERED) {
          order.delivered_at = new Date();
        } else if (dto.status === OrderStatus.COMPLETED) {
          order.completed_at = new Date();
        } else if (dto.status === OrderStatus.CANCELLED) {
          order.cancelled_at = new Date();
        }
      }
      if (dto.payment_status) order.payment_status = dto.payment_status;

      const updatedOrder = await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();

      if (dto.status) {
        this.triggerOrderStatusEmailNotification(order.id, dto.status);
        if (dto.status === OrderStatus.COMPLETED) {
          try {
            await this.warrantiesService.generateForOrder(order.id);
          } catch (err) {
            this.logger.error('Lỗi khi tự động tạo phiếu bảo hành cho đơn hàng:', err);
          }
        } else if (
          [OrderStatus.CANCELLED, OrderStatus.RETURN_APPROVED].includes(dto.status)
        ) {
          try {
            await this.warrantiesService.voidWarrantiesForOrder(
              order.id,
              `Hủy phiếu bảo hành do trạng thái đơn hàng cập nhật thành ${dto.status}.`,
            );
          } catch (err) {
            this.logger.error('Lỗi khi hủy phiếu bảo hành cho đơn hàng:', err);
          }
        }
      }

      // Reload order with full relations to prevent frontend crashes
      const fullOrder = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: {
          user: true,
          items: {
            product: {
              images: true,
            },
            variant: true,
          },
          return_request: true,
        },
      });

      return fullOrder || updatedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getDashboardStatsAdmin(
    timeframe: string = '6months',
    startDate?: string,
    endDate?: string,
  ): Promise<any> {
    // 1. Thống kê tổng quan bằng SQL Aggregation
    const rawStats = await this.orderRepository
      .createQueryBuilder('o')
      .select('COUNT(o.id)', 'totalOrders')
      .addSelect(
        'SUM(CASE WHEN o.status = :pending THEN 1 ELSE 0 END)',
        'pendingOrders',
      )
      .addSelect(
        'SUM(CASE WHEN o.status = :completed THEN 1 ELSE 0 END)',
        'completedOrdersCount',
      )
      .addSelect(
        'SUM(CASE WHEN o.status = :completed THEN o.total_amount ELSE 0 END)',
        'revenue',
      )
      .addSelect('COUNT(DISTINCT o.user_id)', 'customerCount')
      .setParameters({
        pending: OrderStatus.PENDING,
        completed: OrderStatus.COMPLETED,
      })
      .getRawOne();

    const totalOrders = Number(rawStats?.totalOrders || 0);
    const pendingOrders = Number(rawStats?.pendingOrders || 0);
    const completedOrdersCount = Number(rawStats?.completedOrdersCount || 0);
    const revenue = Number(rawStats?.revenue || 0);
    const customerCount = Number(rawStats?.customerCount || 0);

    // 2. Tính danh mục bán chạy nhất bằng SQL Aggregation
    let topCategory = { name: 'Chưa có', percent: 0 };
    if (revenue > 0) {
      const topCatRaw = await this.dataSource
        .createQueryBuilder()
        .select('c.name', 'categoryName')
        .addSelect('SUM(oi.price * oi.quantity)', 'categoryRevenue')
        .from('order_items', 'oi')
        .innerJoin('orders', 'o', 'oi.order_id = o.id')
        .innerJoin('products', 'p', 'oi.product_id = p.id')
        .leftJoin('categories', 'c', 'p.category_id = c.id')
        .where('o.status = :completed', { completed: OrderStatus.COMPLETED })
        .groupBy('c.name')
        .orderBy('SUM(oi.price * oi.quantity)', 'DESC')
        .limit(1)
        .getRawOne();

      if (topCatRaw && topCatRaw.categoryName) {
        const catRev = Number(topCatRaw.categoryRevenue || 0);
        const percent = Math.round((catRev / revenue) * 100);
        topCategory = { name: topCatRaw.categoryName, percent };
      }
    }

    // 3. Tải danh sách đơn hoàn thành được giới hạn thời gian theo bộ lọc biểu đồ
    const now = new Date();
    let minDate: Date;

    if (startDate && endDate) {
      minDate = new Date(startDate);
      minDate.setHours(0, 0, 0, 0);
    } else if (timeframe === '7days') {
      minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    } else if (timeframe === '30days') {
      minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
    } else if (timeframe === 'year') {
      minDate = new Date(now.getFullYear(), 0, 1);
    } else {
      minDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
    }

    const completedOrders = await this.orderRepository.find({
      select: { id: true, total_amount: true, completed_at: true, created_at: true },
      where: {
        status: OrderStatus.COMPLETED,
        created_at: MoreThanOrEqual(minDate),
      },
    });

    const chartMap = new Map<string, number>();

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 31) {
        const cur = new Date(start);
        while (cur <= end) {
          const dayStr = `${String(cur.getDate()).padStart(2, '0')}/${String(cur.getMonth() + 1).padStart(2, '0')}`;
          chartMap.set(dayStr, 0);
          cur.setDate(cur.getDate() + 1);
        }

        completedOrders.forEach((o) => {
          const orderDate = new Date(o.completed_at || o.created_at);
          if (orderDate >= start && orderDate <= end) {
            const dayStr = `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
            if (chartMap.has(dayStr)) {
              chartMap.set(
                dayStr,
                (chartMap.get(dayStr) || 0) + Number(o.total_amount || 0),
              );
            }
          }
        });
      } else {
        const cur = new Date(start.getFullYear(), start.getMonth(), 1);
        const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
        while (cur <= endMonth) {
          const monthKey = `${String(cur.getMonth() + 1).padStart(2, '0')}/${cur.getFullYear()}`;
          chartMap.set(monthKey, 0);
          cur.setMonth(cur.getMonth() + 1);
        }

        completedOrders.forEach((o) => {
          const orderDate = new Date(o.completed_at || o.created_at);
          if (orderDate >= start && orderDate <= end) {
            const monthKey = `${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()}`;
            if (chartMap.has(monthKey)) {
              chartMap.set(
                monthKey,
                (chartMap.get(monthKey) || 0) + Number(o.total_amount || 0),
              );
            }
          }
        });
      }
    } else if (timeframe === '7days') {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        chartMap.set(dayStr, 0);
      }

      completedOrders.forEach((o) => {
        const orderDate = new Date(o.completed_at || o.created_at);
        const dayStr = `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        if (chartMap.has(dayStr)) {
          chartMap.set(
            dayStr,
            (chartMap.get(dayStr) || 0) + Number(o.total_amount || 0),
          );
        }
      });
    } else if (timeframe === '30days') {
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        chartMap.set(dayStr, 0);
      }

      completedOrders.forEach((o) => {
        const orderDate = new Date(o.completed_at || o.created_at);
        const dayStr = `${String(orderDate.getDate()).padStart(2, '0')}/${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        if (chartMap.has(dayStr)) {
          chartMap.set(
            dayStr,
            (chartMap.get(dayStr) || 0) + Number(o.total_amount || 0),
          );
        }
      });
    } else if (timeframe === 'year') {
      for (let m = 0; m < 12; m++) {
        const monthKey = `Tháng ${m + 1}`;
        chartMap.set(monthKey, 0);
      }

      completedOrders.forEach((o) => {
        const orderDate = new Date(o.completed_at || o.created_at);
        if (orderDate.getFullYear() === now.getFullYear()) {
          const monthKey = `Tháng ${orderDate.getMonth() + 1}`;
          if (chartMap.has(monthKey)) {
            chartMap.set(
              monthKey,
              (chartMap.get(monthKey) || 0) + Number(o.total_amount || 0),
            );
          }
        }
      });
    } else {
      // Mặc định: 6 tháng gần nhất
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = `Tháng ${d.getMonth() + 1}`;
        chartMap.set(monthKey, 0);
      }

      completedOrders.forEach((o) => {
        const orderDate = new Date(o.completed_at || o.created_at);
        const monthKey = `Tháng ${orderDate.getMonth() + 1}`;
        if (chartMap.has(monthKey)) {
          chartMap.set(
            monthKey,
            (chartMap.get(monthKey) || 0) + Number(o.total_amount || 0),
          );
        }
      });
    }

    const chartData = Array.from(chartMap.entries()).map(
      ([label, rev]) => ({
        label,
        month: label,
        revenue: rev,
      }),
    );

    // 4. Lấy 5 đơn hàng gần nhất có giới hạn (take: 5)
    const recentOrders = await this.orderRepository.find({
      order: { created_at: 'DESC' },
      take: 5,
      relations: {
        user: true,
        items: {
          product: {
            category: true,
          },
        },
      },
    });

    return {
      totalOrders,
      pendingOrders,
      completedOrdersCount,
      revenue,
      customerCount,
      topCategory,
      chartData,
      monthlyRevenue: chartData,
      recentOrders,
    };
  }

  /**
   * Cập nhật trạng thái thanh toán sau khi nhận kết quả từ VNPAY hoặc MoMo
   * - Nếu thành công: chuyển đơn hàng sang CONFIRMED
   * - Nếu thất bại: hoàn lại kho và chuyển trạng thái sang CANCELLED
   */
  async updatePaymentStatus(
    orderId: number,
    isSuccess: boolean,
    transactionNo: string,
    paymentMethod: 'vnpay' | 'momo' | 'payos' = 'vnpay',
    paidAmount?: number,
    paymentDate?: string | null,
    txnRefOrig?: string | null,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        items: {
          variant: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        'Không tìm thấy đơn hàng cần cập nhật thanh toán',
      );
    }

    // Nếu đơn hàng đã thanh toán trước đó hoặc (callback báo thất bại VÀ đơn đã ở trạng thái hủy/thất bại), bỏ qua
    if (
      order.payment_status === PaymentStatus.PAID ||
      (!isSuccess &&
        (order.payment_status === PaymentStatus.FAILED ||
          order.status === OrderStatus.CANCELLED))
    ) {
      return order;
    }

    // Xác thực số tiền thanh toán thực tế nếu thành công
    if (isSuccess && paidAmount !== undefined) {
      if (Math.abs(Number(order.total_amount) - paidAmount) > 1) {
        throw new BadRequestException(
          'Số tiền thanh toán không khớp với đơn hàng.',
        );
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wasPreviouslyCancelled =
        order.status === OrderStatus.CANCELLED ||
        order.payment_status === PaymentStatus.FAILED;

      const targetStatus = isSuccess
        ? PaymentStatus.PAID
        : PaymentStatus.FAILED;
      order.payment_status = targetStatus;

      if (paymentMethod === 'vnpay') {
        order.vnpay_transaction_no = transactionNo || null;
        if (paymentDate) order.vnpay_payment_date = paymentDate;
        if (txnRefOrig) order.vnpay_txn_ref = txnRefOrig;
      } else if (paymentMethod === 'momo') {
        order.momo_trans_id = transactionNo || null;
      } else if (paymentMethod === 'payos') {
        order.payos_transaction_no = transactionNo || null;
      }

      if (isSuccess) {
        // Thanh toán thành công → tự động xác nhận đơn hàng
        order.status = OrderStatus.CONFIRMED;
        order.confirmed_at = new Date();
        order.cancelled_at = null;

        if (wasPreviouslyCancelled) {
          this.logger.log(
            `[Order Payment] Khôi phục đơn hàng #${order.id} bị hủy trước đó do nhận thanh toán online thành công!`,
          );
          // Trừ lại kho vì trước đó đã hoàn kho khi hủy
          for (const item of order.items) {
            if (item.variant) {
              const variant = await queryRunner.manager.findOne(ProductVariant, {
                where: { id: item.variant.id },
                lock: { mode: 'pessimistic_write' },
              });
              if (variant) {
                const prevStock = variant.stock;
                variant.stock = Math.max(0, variant.stock - item.quantity);
                await queryRunner.manager.save(variant);
                await this.logTransaction(
                  queryRunner.manager,
                  variant.id,
                  -item.quantity,
                  prevStock,
                  variant.stock,
                  'sale',
                  `Khôi phục bán thành công sau khi nhận thanh toán online, đơn #${order.id}`,
                  order.id.toString(),
                );
              }
            }
          }

          // Ghi nhận lại lượt sử dụng voucher
          if (order.voucher_code) {
            const voucher = await queryRunner.manager.findOne(Voucher, {
              where: { code: order.voucher_code.trim().toUpperCase() },
              lock: { mode: 'pessimistic_write' },
            });
            if (voucher) {
              voucher.used_count += 1;
              await queryRunner.manager.save(voucher);
            }
          }
        }
      } else {
        // Thanh toán thất bại → hoàn lại kho và hủy đơn hàng
        for (const item of order.items) {
          if (item.variant) {
            const variant = await queryRunner.manager.findOne(ProductVariant, {
              where: { id: item.variant.id },
              lock: { mode: 'pessimistic_write' },
            });
            if (variant) {
              const prevStock = variant.stock;
              variant.stock += item.quantity;
              await queryRunner.manager.save(variant);
              await this.logTransaction(
                queryRunner.manager,
                variant.id,
                item.quantity,
                prevStock,
                variant.stock,
                'return',
                `Hủy tự động do giao dịch thanh toán online thất bại, đơn #${order.id}`,
                order.id.toString(),
              );
            }
          }
        }

        // Hoàn lại lượt dùng voucher nếu có
        if (order.voucher_code) {
          const voucher = await queryRunner.manager.findOne(Voucher, {
            where: { code: order.voucher_code.trim().toUpperCase() },
            lock: { mode: 'pessimistic_write' },
          });
          if (voucher && voucher.used_count > 0) {
            voucher.used_count -= 1;
            await queryRunner.manager.save(voucher);
          }
        }

        order.status = OrderStatus.CANCELLED;
        order.cancelled_at = new Date();
      }

      const savedOrder = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();
      this.triggerOrderStatusEmailNotification(order.id, order.status);
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Tự động quét và hủy các đơn hàng online chưa thanh toán quá 15 phút
   */
  async cleanupUnpaidOrders(): Promise<void> {
    const unpaidOrders = await this.orderRepository.find({
      where: {
        status: OrderStatus.PENDING,
        payment_status: PaymentStatus.PENDING,
        payment_method: In(['vnpay', 'momo', 'payos']),
        created_at: Raw((alias) => `${alias} < NOW() - INTERVAL '15 minutes'`),
      },
      relations: {
        items: {
          variant: true,
        },
      },
    });

    if (unpaidOrders.length === 0) {
      return;
    }

    this.logger.log(
      `[Order Cleanup] Phát hiện ${unpaidOrders.length} đơn hàng quá hạn thanh toán.`,
    );

    for (const order of unpaidOrders) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // Hoàn lại kho cho sản phẩm
        for (const item of order.items) {
          if (item.variant) {
            const variant = await queryRunner.manager.findOne(ProductVariant, {
              where: { id: item.variant.id },
              lock: { mode: 'pessimistic_write' },
            });
            if (variant) {
              const prevStock = variant.stock;
              variant.stock += item.quantity;
              await queryRunner.manager.save(variant);
              await this.logTransaction(
                queryRunner.manager,
                variant.id,
                item.quantity,
                prevStock,
                variant.stock,
                'return',
                `Hủy tự động do quá 15 phút chưa thanh toán, đơn #${order.id}`,
                order.id.toString(),
              );
            }
          }
        }

        // Hoàn lại lượt dùng voucher
        if (order.voucher_code) {
          const voucher = await queryRunner.manager.findOne(Voucher, {
            where: { code: order.voucher_code.trim().toUpperCase() },
            lock: { mode: 'pessimistic_write' },
          });
          if (voucher && voucher.used_count > 0) {
            voucher.used_count -= 1;
            await queryRunner.manager.save(voucher);
          }
        }

        // Hủy đơn hàng
        order.status = OrderStatus.CANCELLED;
        order.payment_status = PaymentStatus.FAILED;
        order.cancelled_at = new Date();
        await queryRunner.manager.save(order);

        await queryRunner.commitTransaction();
        this.logger.log(
          `[Order Cleanup] Hủy thành công đơn hàng ID ${order.id} do quá hạn thanh toán.`,
        );
      } catch (error) {
        await queryRunner.rollbackTransaction();
        this.logger.error(
          `[Order Cleanup] Lỗi khi hủy đơn hàng ID ${order.id}:`,
          error.stack,
        );
      } finally {
        await queryRunner.release();
      }
    }
  }

  async requestOrderReturn(
    userId: number,
    orderId: number,
    dto: RequestReturnDto,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user: { id: userId } },
      relations: { items: { product: true }, return_request: true },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng của bạn.');
    }

    if (order.return_request) {
      throw new BadRequestException(
        'Đơn hàng này đã có yêu cầu đổi trả được gửi trước đó.',
      );
    }

    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException(
        'Đơn hàng chưa hoàn thành, không thể yêu cầu đổi trả.',
      );
    }

    // Xác nhận các items lỗi gửi lên có nằm trong đơn hàng hay không
    const orderItemIds = order.items.map((item) => item.id);
    const invalidItems = dto.items.filter(
      (itemId) => !orderItemIds.includes(itemId),
    );
    if (invalidItems.length > 0) {
      throw new BadRequestException(
        `Một số sản phẩm yêu cầu đổi trả không thuộc về đơn hàng này.`,
      );
    }

    const updatedOrder = await this.dataSource.transaction(async (manager) => {
      const returnRequest = new OrderReturn();
      returnRequest.order = order;
      returnRequest.reason = dto.reason;
      returnRequest.description = dto.description || null;
      returnRequest.images = dto.images || [];
      returnRequest.items = dto.items;
      returnRequest.action_type = dto.action_type || 'refund';
      returnRequest.requested_at = new Date();

      const savedReturn = await manager.save(returnRequest);

      order.status = OrderStatus.RETURN_PENDING;
      order.return_request = savedReturn;
      return manager.save(order);
    });

    // Thông báo cho Admin về yêu cầu đổi trả mới
    await this.notificationsService.create({
      title: 'Yêu cầu đổi/trả hàng mới',
      message: `Đơn hàng #${order.id} vừa gửi yêu cầu đổi/trả hàng. Lý do: "${dto.reason}"`,
      type: 'warning',
      reference_link: '/admin/returns',
    });

    return updatedOrder;
  }

  async handleOrderReturnAdmin(
    orderId: number,
    dto: HandleReturnDto,
  ): Promise<Order> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        items: { product: true, variant: true },
        return_request: true,
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng để xử lý đổi trả.');
    }

    if (!order.return_request) {
      throw new BadRequestException(
        'Không tìm thấy thông tin yêu cầu đổi trả cho đơn hàng này.',
      );
    }

    if (order.status !== OrderStatus.RETURN_PENDING) {
      throw new BadRequestException(
        'Đơn hàng không ở trạng thái chờ xử lý đổi trả.',
      );
    }

    const savedOrder = await this.dataSource.transaction(async (manager) => {
      order.status = dto.status;
      order.return_request.handled_at = new Date();

      if (dto.status === OrderStatus.RETURN_REJECTED) {
        if (!dto.rejectReason) {
          throw new BadRequestException(
            'Vui lòng cung cấp lý do từ chối đổi trả.',
          );
        }
        order.return_request.rejected_reason = dto.rejectReason;
      } else if (dto.status === OrderStatus.RETURN_APPROVED) {
        order.return_request.rejected_reason = null;

        const actionType = dto.actionType || 'refund';
        const shouldRestock = dto.shouldRestock !== false;

        order.return_request.action_type = actionType;
        order.return_request.should_restock = shouldRestock;

        // 1. Nhận hàng trả về từ khách hàng
        const returnItemIds = order.return_request.items || [];
        for (const item of order.items) {
          if (returnItemIds.includes(item.id) && item.variant) {
            const variant = await manager.findOne(ProductVariant, {
              where: { id: item.variant.id },
              lock: { mode: 'pessimistic_write' },
            });
            if (variant) {
              const prevStock = variant.stock;
              if (shouldRestock) {
                variant.stock += item.quantity;
                await manager.save(variant);
                await this.logTransaction(
                  manager,
                  variant.id,
                  item.quantity,
                  prevStock,
                  variant.stock,
                  'return',
                  `Chấp nhận trả hàng cho đơn #${order.id} (Hoàn kho)`,
                  order.id.toString(),
                );
              } else {
                await this.logTransaction(
                  manager,
                  variant.id,
                  0,
                  prevStock,
                  prevStock,
                  'return',
                  `Nhận lại hàng lỗi cho đơn #${order.id} (Không hoàn kho)`,
                  order.id.toString(),
                );
              }
            }
          }
        }

        // 2. Nếu là ĐỔI HÀNG (exchange), tự động tạo đơn đổi mới 1-1
        if (actionType === 'exchange') {
          const exchangeOrder = new Order();
          exchangeOrder.user = order.user;
          exchangeOrder.shipping_address = order.shipping_address;
          exchangeOrder.phone = order.phone;
          exchangeOrder.notes = `Đơn đổi mới 1-1 cho đơn hàng bị lỗi #${order.id}`;
          exchangeOrder.payment_method = PaymentMethod.COD;
          exchangeOrder.status = OrderStatus.CONFIRMED;
          exchangeOrder.payment_status = PaymentStatus.PAID;
          exchangeOrder.total_amount = 0;
          exchangeOrder.shipping_fee = 0;

          const savedExchangeOrder = await manager.save(exchangeOrder);

          for (const item of order.items) {
            if (returnItemIds.includes(item.id)) {
              if (item.variant) {
                const variant = await manager.findOne(ProductVariant, {
                  where: { id: item.variant.id },
                  lock: { mode: 'pessimistic_write' },
                });
                if (!variant) {
                  throw new NotFoundException(`Biến thể sản phẩm đổi mới không tồn tại.`);
                }
                if (variant.stock < item.quantity) {
                  throw new BadRequestException(
                    `Không đủ hàng tồn kho để đổi mới sản phẩm ${item.product.name}. Chỉ còn lại ${variant.stock} sản phẩm.`,
                  );
                }
                const prevStock = variant.stock;
                variant.stock -= item.quantity;
                await manager.save(variant);

                await this.logTransaction(
                  manager,
                  variant.id,
                  -item.quantity,
                  prevStock,
                  variant.stock,
                  'order_sale',
                  `Xuất kho đổi mới 1-1 cho đơn #${order.id} (Đơn đổi mới #${savedExchangeOrder.id})`,
                  savedExchangeOrder.id.toString(),
                );

                const exchangeOrderItem = new OrderItem();
                exchangeOrderItem.order = savedExchangeOrder;
                exchangeOrderItem.product = item.product;
                exchangeOrderItem.variant = item.variant;
                exchangeOrderItem.quantity = item.quantity;
                exchangeOrderItem.price = 0;
                await manager.save(exchangeOrderItem);
              }
            }
          }
        }
      }

      await manager.save(order.return_request);
      return manager.save(order);
    });

    // 3. Nếu là HOÀN TIỀN (refund) và thanh toán bằng VNPAY → gọi API hoàn tiền tự động
    if (
      dto.status === OrderStatus.RETURN_APPROVED &&
      (dto.actionType || 'refund') === 'refund' &&
      order.payment_method === PaymentMethod.VNPAY &&
      order.vnpay_transaction_no &&
      order.vnpay_payment_date
    ) {
      const refundAmount = Number(order.total_amount);
      // Dùng TxnRef gốc của giao dịch thanh toán (nếu có), nếu không dùng format orderId_timestamp
      const txnRef = order.vnpay_txn_ref || `${order.id}_${Date.now()}`;

      this.logger.log(`[VNPAY Refund] Bắt đầu hoàn tiền đơn hàng #${order.id}, TxnRef gốc: ${txnRef}, số tiền: ${refundAmount}đ`);

      const refundResult = await this.vnpayService.refundTransaction({
        txnRef,
        transactionNo: order.vnpay_transaction_no,
        transactionDate: order.vnpay_payment_date,
        amount: refundAmount,
        reason: `Hoan tien don hang tra ${order.id}`,
        ipAddr: '127.0.0.1',
      });

      this.logger.log(`[VNPAY Refund] Kết quả: ${JSON.stringify(refundResult)}`);

      if (!refundResult.success) {
        throw new BadRequestException(
          `Duyệt đổi trả thành công nhưng hoàn tiền VNPAY thất bại: ${refundResult.message}. Vui lòng hoàn tiền thủ công qua cổng quản trị VNPAY.`,
        );
      }
    }

    if (dto.status === OrderStatus.RETURN_APPROVED) {
      const actionType = dto.actionType || 'refund';
      const voidReason =
        actionType === 'exchange'
          ? 'Hủy phiếu bảo hành cũ do sản phẩm đã được thu hồi đổi mới 1-1.'
          : 'Hủy phiếu bảo hành do sản phẩm đã được chấp nhận đổi trả & hoàn tiền.';
      try {
        await this.warrantiesService.voidWarrantiesForOrder(order.id, voidReason);
      } catch (err) {
        this.logger.error('Lỗi khi tự động hủy phiếu bảo hành:', err);
      }
    }

    this.triggerOrderStatusEmailNotification(order.id, dto.status);

    // Reload order with full relations to prevent frontend crashes
    const fullOrder = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        user: true,
        items: {
          product: {
            images: true,
          },
          variant: true,
        },
        return_request: true,
      },
    });

    return fullOrder || savedOrder;
  }

  async checkLowStockAlert(
    variantId: number,
    currentStock: number,
    manager?: any,
  ): Promise<void> {
    if (currentStock <= 5) {
      const repo = manager
        ? manager.getRepository(ProductVariant)
        : this.variantRepository;
      const variant = await repo.findOne({
        where: { id: variantId },
        relations: { product: true },
      });
      if (variant) {
        const skuStr = variant.sku ? ` (SKU: ${variant.sku})` : '';
        const attributesStr = variant.attributes
          ? ` [${Object.entries(variant.attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}]`
          : '';
        const title = 'Cảnh báo tồn kho thấp';
        const message = `Biến thể sản phẩm "${variant.product?.name}"${attributesStr}${skuStr} sắp hết hàng. Số lượng tồn kho hiện tại: ${currentStock}.`;

        await this.notificationsService.create({
          title,
          message,
          type: 'warning',
          reference_link: `/admin/inventory`,
        });
      }
    }
  }

  async logTransaction(
    manager: any,
    variantId: number,
    changeQty: number,
    prevStock: number,
    newStock: number,
    type: string,
    note?: string,
    referenceId?: string,
  ): Promise<void> {
    await logInventoryTransaction({
      manager,
      variantId,
      changeQty,
      prevStock,
      newStock,
      type,
      note,
      referenceId,
    });
  }

  // Hàm tạo hóa đơn PDF
  async generateInvoicePdf(orderId: number): Promise<Buffer> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        user: true,
        items: {
          product: true,
          variant: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng để xuất hóa đơn.');
    }

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const fontRegularPath = path.join(process.cwd(), 'src/assets/fonts/Roboto-Regular.ttf');
      const fontBoldPath = path.join(process.cwd(), 'src/assets/fonts/Roboto-Bold.ttf');

      try {
        const fs = require('fs');
        this.logger.debug(`[PDFGen] process.cwd(): ${process.cwd()}`);
        this.logger.debug(`[PDFGen] Regular Font Path: ${fontRegularPath}`);
        this.logger.debug(`[PDFGen] Regular Font Exists: ${fs.existsSync(fontRegularPath)}`);
        if (fs.existsSync(fontRegularPath)) {
          this.logger.debug(`[PDFGen] Regular Font Size: ${fs.statSync(fontRegularPath).size} bytes`);
        }
        this.logger.debug(`[PDFGen] Bold Font Path: ${fontBoldPath}`);
        this.logger.debug(`[PDFGen] Bold Font Exists: ${fs.existsSync(fontBoldPath)}`);
        if (fs.existsSync(fontBoldPath)) {
          this.logger.debug(`[PDFGen] Bold Font Size: ${fs.statSync(fontBoldPath).size} bytes`);
        }
      } catch (err) {
        this.logger.error(`[PDFGen] Font diagnostics failed: ${err.message}`);
      }

      doc.registerFont('Roboto-Regular', fontRegularPath);
      doc.registerFont('Roboto-Bold', fontBoldPath);

      // --- Header: Brand Info ---
      doc.font('Roboto-Bold').fontSize(10).fillColor('#4A5568').text('NỘI THẤT CAO CẤP & HIỆN ĐẠI', 40, 65);

      doc.font('Roboto-Regular').fontSize(9).fillColor('#718096')
        .text('Địa chỉ: 180 Cao Lỗ, Quận 8, TP. Hồ Chí Minh', 300, 40, { align: 'right', width: 255 })
        .text('Điện thoại: 0703201511 | Email: vinhimpact2812@gmail.com', 300, 52, { align: 'right', width: 255 })
        .text('Website: www.chuadeploy.com', 300, 64, { align: 'right', width: 255 });

      // Fine line separator
      doc.moveTo(40, 85).lineTo(555, 85).strokeColor('#E2E8F0').lineWidth(1).stroke();

      // --- Invoice Title ---
      doc.font('Roboto-Bold').fontSize(18).fillColor('#2D3748').text('HÓA ĐƠN BÁN HÀNG', 40, 105, { align: 'center' });
      doc.font('Roboto-Regular').fontSize(10).fillColor('#4A5568').text(`Số hóa đơn: #${order.id}`, 40, 125, { align: 'center' });

      const createdDate = new Date(order.created_at);
      const correctUtcTime = createdDate.getTime() - (createdDate.getTimezoneOffset() * 60 * 1000);
      const correctUtcDate = new Date(correctUtcTime);

      const timePart = correctUtcDate.toLocaleTimeString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const datePart = correctUtcDate.toLocaleDateString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      const formattedDate = `${timePart} ngày ${datePart}`;
      doc.text(`Ngày lập hóa đơn: ${formattedDate}`, 40, 138, { align: 'center' });

      // --- Customer & Order Info Section ---
      doc.rect(40, 160, 515, 80).fillColor('#F7FAFC').fill();

      doc.font('Roboto-Bold').fontSize(10).fillColor('#2D3748').text('THÔNG TIN KHÁCH HÀNG', 55, 170);
      doc.font('Roboto-Regular').fontSize(9).fillColor('#4A5568')
        .text(`Họ và tên: ${order.user?.name || 'Khách vãng lai'}`, 55, 185)
        .text(`Số điện thoại: ${order.phone}`, 55, 198)
        .text(`Địa chỉ nhận: ${order.shipping_address}`, 55, 211, { width: 220 });

      doc.font('Roboto-Bold').fontSize(10).fillColor('#2D3748').text('THÔNG TIN ĐƠN HÀNG', 320, 170);
      doc.font('Roboto-Regular').fontSize(9).fillColor('#4A5568')
        .text(`Thanh toán: ${order.payment_method.toUpperCase()}`, 320, 185)
        .text(`Trạng thái: ${order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}`, 320, 198)
        .text(`Hình thức giao hàng: Tiêu chuẩn`, 320, 211);

      // --- Table Section ---
      let y = 260;
      doc.rect(40, y, 515, 22).fillColor('#EDF2F7').fill();

      doc.font('Roboto-Bold').fontSize(9).fillColor('#2D3748')
        .text('STT', 45, y + 6, { width: 30 })
        .text('Tên sản phẩm', 75, y + 6, { width: 235 })
        .text('SL', 320, y + 6, { width: 40, align: 'right' })
        .text('Đơn giá', 370, y + 6, { width: 85, align: 'right' })
        .text('Thành tiền', 465, y + 6, { width: 85, align: 'right' });

      y += 22;
      doc.strokeColor('#CBD5E0').lineWidth(0.5);

      let index = 1;
      let itemsSubtotal = 0;

      for (const item of order.items) {
        const subtotal = Number(item.price) * item.quantity;
        itemsSubtotal += subtotal;

        let variantText = '';
        if (item.variant && item.variant.attributes) {
          const attrs = Object.entries(item.variant.attributes)
            .map(([_, v]) => `${v}`)
            .join(' / ');
          if (attrs) {
            variantText = ` (${attrs})`;
          }
        }
        const productName = `${item.product.name}${variantText}`;

        // Thiết lập font trước để đo đạc chiều cao chữ chính xác
        doc.font('Roboto-Regular').fontSize(8.5);
        const nameHeight = doc.heightOfString(productName, { width: 235 });
        const rowHeight = Math.max(24, nameHeight + 10); // Tối thiểu 24px, cộng 10px khoảng đệm (padding)

        // Vẽ nền dòng (xen kẽ màu xám nhạt và trắng)
        doc.rect(40, y, 515, rowHeight).fillColor(index % 2 === 0 ? '#F7FAFC' : '#FFFFFF').fill();

        doc.font('Roboto-Regular').fontSize(8.5).fillColor('#2D3748');

        // Draw STT
        doc.text(index.toString(), 45, y + 7, { width: 30 });

        // Draw Product Name + Variant
        doc.text(productName, 75, y + 7, { width: 235 });

        // Draw Quantity
        doc.text(item.quantity.toString(), 320, y + 7, { width: 40, align: 'right' });

        // Draw Price
        doc.text(Number(item.price).toLocaleString('vi-VN') + ' đ', 370, y + 7, { width: 85, align: 'right' });

        // Draw Subtotal
        doc.text(subtotal.toLocaleString('vi-VN') + ' đ', 465, y + 7, { width: 85, align: 'right' });

        // Kẻ đường ngăn cách dưới dòng sản phẩm
        doc.moveTo(40, y + rowHeight).lineTo(555, y + rowHeight).stroke();
        y += rowHeight;
        index++;
      }

      // --- Summary Section ---
      y += 10;
      doc.font('Roboto-Regular').fontSize(9).fillColor('#4A5568');

      const drawSummaryRow = (label: string, value: string, isBold = false) => {
        if (isBold) {
          doc.font('Roboto-Bold').fillColor('#1A1F2C');
        } else {
          doc.font('Roboto-Regular').fillColor('#4A5568');
        }
        doc.text(label, 320, y, { width: 130, align: 'right' });
        doc.text(value, 465, y, { width: 85, align: 'right' });
        y += 16;
      };

      drawSummaryRow('Cộng tiền hàng:', itemsSubtotal.toLocaleString('vi-VN') + ' đ');

      if (order.voucher_code) {
        drawSummaryRow(`Mã giảm giá (${order.voucher_code}):`, `-${Number(order.discount_amount).toLocaleString('vi-VN')} đ`);
      }

      drawSummaryRow('Phí vận chuyển:', Number(order.shipping_fee).toLocaleString('vi-VN') + ' đ');

      // Bottom border for summary
      doc.moveTo(350, y).lineTo(555, y).strokeColor('#E2E8F0').lineWidth(1).stroke();
      y += 6;

      drawSummaryRow('Tổng cộng thanh toán:', Number(order.total_amount).toLocaleString('vi-VN') + ' đ', true);

      // --- Footer Signatures ---
      y += 30;
      doc.font('Roboto-Bold').fontSize(10).fillColor('#2D3748')
        .text('KHÁCH HÀNG', 80, y, { width: 150, align: 'center' })
        .text('NGƯỜI LẬP HÓA ĐƠN', 360, y, { width: 150, align: 'center' });

      doc.font('Roboto-Regular').fontSize(8).fillColor('#718096')
        .text('(Ký và ghi rõ họ tên)', 80, y + 12, { width: 150, align: 'center' })
        .text('(Ký và ghi rõ họ tên)', 360, y + 12, { width: 150, align: 'center' });

      y += 60;
      if (order.user?.name) {
        doc.font('Roboto-Bold').fontSize(9).fillColor('#4A5568')
          .text(order.user.name, 80, y, { width: 150, align: 'center' });
      }
      doc.font('Roboto-Bold').fontSize(9).fillColor('#4A5568')
        .text('Nguyễn Lâm Chí Vinh', 360, y, { width: 150, align: 'center' });

      // Thank you message
      doc.font('Roboto-Bold').fontSize(10).fillColor('#4A5568')
        .text('Cảm ơn quý khách đã mua sắm tại Nội thất!', 40, y + 40, { align: 'center' });

      doc.end();
    });
  }
}

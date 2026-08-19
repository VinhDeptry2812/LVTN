import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, LessThanOrEqual, In, Raw, MoreThanOrEqual, Between } from 'typeorm';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from './order.entity';
import { OrderItem } from './order-item.entity';
import { OrderReturn } from './order-return.entity';
import { StockIssue, StockIssueReason, StockIssueStatus } from '../stock-issues/stock-issue.entity';
import { StockIssueItem } from '../stock-issues/stock-issue-item.entity';
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
import { ShippingSettingsService } from '../shipping-settings/shipping-settings.service';
import { OrderCancellationService } from './services/order-cancellation.service';
import { OrderInvoiceService } from './services/order-invoice.service';
import { OrderPaymentService } from './services/order-payment.service';
import { OrderReturnService } from './services/order-return.service';
import * as path from 'path';
import PDFDocument from 'pdfkit';

@Injectable()
export class OrdersService implements OnModuleInit {
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
    private readonly shippingSettingsService: ShippingSettingsService,
    private readonly orderCancellationService: OrderCancellationService,
    private readonly orderInvoiceService: OrderInvoiceService,
    private readonly orderPaymentService: OrderPaymentService,
    private readonly orderReturnService: OrderReturnService,
  ) { }

  onModuleInit() {
    // onModuleInit is empty now as the cleanup job is handled in OrderPaymentService
  }

  private generateShippingCode(): string {
    const chars = '0123456789';
    let code = 'GHN';
    for (let i = 0; i < 10; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  private triggerOrderStatusEmailNotification(
    orderId: number,
    status: OrderStatus,
    cancelledByRole?: 'user' | 'admin' | 'system' | string,
    cancelReason?: string,
  ): void {
    // Danh sách các trạng thái mốc quan trọng được phép gửi email thông báo
    const ALLOWED_EMAIL_STATUSES: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.SHIPPING,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
      OrderStatus.RETURN_APPROVED,
      OrderStatus.RETURN_REJECTED,
    ];

    // Nếu trạng thái mới không nằm trong danh sách được phép thì không gửi email
    if (!ALLOWED_EMAIL_STATUSES.includes(status)) {
      return;
    }

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
        // Chỉ đính kèm hóa đơn PDF khi thanh toán thành công (PAID) hoặc khi giao hàng/hoàn thành (DELIVERED/COMPLETED)
        const isPaid = order.payment_status === PaymentStatus.PAID;
        const isDeliveredOrCompleted = status === OrderStatus.DELIVERED || status === OrderStatus.COMPLETED;

        if ((isPaid || isDeliveredOrCompleted) && status !== OrderStatus.CANCELLED) {
          try {
            pdfBuffer = await this.generateInvoicePdf(order.id);
          } catch (pdfErr) {
            console.error('Không thể tạo PDF hóa đơn để gửi kèm email:', pdfErr);
          }
        }

        const effectiveReason = cancelReason || order.cancel_reason || undefined;
        this.mailService.sendOrderStatusEmail(order.user.email, order, status, pdfBuffer, cancelledByRole, effectiveReason).catch((err) => {
          console.error('Lỗi khi gửi email thông báo đơn hàng:', err);
        });
      }
    }).catch((err) => {
      console.error('Lỗi khi lấy dữ liệu đơn hàng để gửi email:', err);
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

    const settings = await this.shippingSettingsService.getSettings();
    const addressLower = shippingAddress ? shippingAddress.toLowerCase() : '';

    // 1. Kiểm tra từ khóa địa chỉ bị từ chối / không hỗ trợ giao hàng
    if (addressLower && settings.unsupported_keywords && settings.unsupported_keywords.length > 0) {
      const isUnsupported = settings.unsupported_keywords.some((keyword) => {
        const trimmed = keyword.trim().toLowerCase();
        return trimmed && addressLower.includes(trimmed);
      });

      if (isUnsupported) {
        throw new BadRequestException(
          'Rất tiếc, khu vực giao hàng này hiện chưa hỗ trợ vận chuyển tự động đồ nội thất cồng kềnh. Vui lòng liên hệ Hotline/CSKH để thỏa thuận vận chuyển riêng.',
        );
      }
    }

    // 2. Kiểm tra danh sách từ khóa khu vực Nội thành
    const innerKeywords =
      settings.inner_city_keywords && settings.inner_city_keywords.length > 0
        ? settings.inner_city_keywords
        : ['hồ chí minh', 'ho chi minh', 'hcm'];

    const isInnerCity = innerKeywords.some((city) => {
      const trimmed = city.trim().toLowerCase();
      return trimmed && addressLower.includes(trimmed);
    });

    // 3. Tính phí giao hàng động theo cấu hình hệ thống
    let shippingFee = 0;
    if (isBulky) {
      if (Number(totalItemsPrice) >= Number(settings.bulky_freeship_threshold)) {
        shippingFee = 0;
      } else {
        shippingFee = isInnerCity
          ? Number(settings.bulky_inner_fee)
          : Number(settings.bulky_outer_fee);
      }
    } else {
      if (Number(totalItemsPrice) >= Number(settings.standard_freeship_threshold)) {
        shippingFee = 0;
      } else {
        shippingFee = isInnerCity
          ? Number(settings.standard_inner_fee)
          : Number(settings.standard_outer_fee);
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
      
      // Load products for the items to calculate prices securely
      const productIds = dto.items.map((i) => i.product_id);
      const products = await queryRunner.manager.find(Product, {
        where: { id: In(productIds) },
      });
      const productsMap = new Map(products.map((p) => [p.id, p]));

      // Khóa bi quan (pessimistic lock) để kiểm tra tồn kho cho các sản phẩm
      for (const item of dto.items) {
        const product = productsMap.get(item.product_id);
        if (!product) {
          throw new NotFoundException(`Sản phẩm (ID: ${item.product_id}) không tồn tại.`);
        }

        let actualPrice = product.discount_price ? Number(product.discount_price) : Number(product.base_price);
        let variant: ProductVariant | null = null;

        if (item.variant_id) {
          variant = await queryRunner.manager.findOne(ProductVariant, {
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
          
          actualPrice += Number(variant.price_adjustment || 0);
        }

        const itemSubtotal = actualPrice * item.quantity;
        totalAmount += itemSubtotal;

        const orderItem = new OrderItem();
        orderItem.product = { id: item.product_id } as unknown as Product;
        if (item.variant_id) {
          orderItem.variant = {
            id: item.variant_id,
          } as unknown as ProductVariant;
        }
        orderItem.quantity = item.quantity;
        orderItem.price = actualPrice;
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

      // Trừ tồn kho ngay lập tức khi đặt hàng thành công (Giữ kho tránh over-selling)
      for (const item of dto.items) {
        if (item.variant_id) {
          const variant = await queryRunner.manager.findOne(ProductVariant, {
            where: { id: item.variant_id },
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
              `Trừ kho giữ hàng cho đơn hàng #${savedOrder.id}`,
              savedOrder.id.toString(),
            );
          }
        }
      }

      if (userId) {
        try {
          await this.cartService.clearCart(userId);
        } catch {
          // Ignore if cart doesn't exist
        }
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
        console.error('Lỗi khi tạo thông báo đơn hàng mới:', e);
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

  async cancelOrder(userId: number, orderId: number, reason?: string): Promise<Order> {
    return this.orderCancellationService.cancelOrder(userId, orderId, reason);
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
      console.error('Lỗi khi tự động tạo phiếu bảo hành cho đơn hàng:', err);
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
      .leftJoinAndSelect('order.return_request', 'return_request');

    if (isReturn === 'true') {
      queryBuilder
        .orderBy('return_request.requested_at', 'DESC')
        .addOrderBy('order.created_at', 'DESC');
    } else {
      queryBuilder.orderBy('order.created_at', 'DESC');
    }

    queryBuilder.where('1=1');

    if (isReturn === 'true') {
      if (status) {
        queryBuilder.andWhere('order.status = :status', { status });
      } else {
        queryBuilder.andWhere('order.status IN (:...returnStatuses)', {
          returnStatuses: [
            OrderStatus.RETURN_PENDING,
            OrderStatus.RETURN_APPROVED,
            OrderStatus.RETURN_REJECTED,
          ],
        });
      }
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

  /**
   * Đếm số lượng đơn hàng theo từng trạng thái (dùng cho Quick Filter Tabs phía Admin/Staff)
   */
  async getOrderStatusCountsAdmin(): Promise<Record<string, number>> {
    const counts = await this.orderRepository
      .createQueryBuilder('order')
      .select('order.status', 'status')
      .addSelect('COUNT(order.id)', 'count')
      .groupBy('order.status')
      .getRawMany();

    const result: Record<string, number> = {
      ALL: 0,
      PENDING: 0,
      CONFIRMED: 0,
      PROCESSING: 0,
      SHIPPING: 0,
      DELIVERED: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      RETURN_REQUEST: 0,
    };

    let total = 0;
    counts.forEach((item) => {
      const cnt = Number(item.count || 0);
      total += cnt;
      if (item.status) {
        result[item.status] = cnt;
      }
      if (
        item.status === OrderStatus.RETURN_PENDING ||
        item.status === OrderStatus.RETURN_APPROVED ||
        item.status === OrderStatus.RETURN_REJECTED
      ) {
        result.RETURN_REQUEST = (result.RETURN_REQUEST || 0) + cnt;
      }
    });

    result.ALL = total;
    return result;
  }

  async updateOrderStatusAdmin(
    orderId: number,
    dto: UpdateOrderStatusDto,
    adminId?: number,
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
        await this.cancelStockIssueForOrder(
          queryRunner.manager,
          order.id,
          `Quản trị viên hủy đơn hàng #${order.id}`,
        );

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
        // Ràng buộc: Không cho phép Admin tự ý chuyển sang SHIPPING / DELIVERED / COMPLETED nếu Phiếu xuất kho chưa được duyệt
        if (
          dto.status === OrderStatus.SHIPPING ||
          dto.status === OrderStatus.DELIVERED ||
          dto.status === OrderStatus.COMPLETED
        ) {
          const stockIssue = await queryRunner.manager.findOne(StockIssue, {
            where: { order_id: order.id },
          });
          if (stockIssue && stockIssue.status !== StockIssueStatus.COMPLETED) {
            throw new BadRequestException(
              `Không thể chuyển đơn hàng sang trạng thái '${dto.status}' vì Phiếu xuất kho chưa được duyệt xuất kho. Vui lòng duyệt phiếu xuất kho tại phần Quản lý xuất kho trước.`,
            );
          }
        }

        order.status = dto.status;
        if (dto.status === OrderStatus.CONFIRMED) {
          order.confirmed_at = new Date();
          await this.createStockIssueForOrder(queryRunner.manager, order, adminId);
        } else if (dto.status === OrderStatus.SHIPPING) {
          order.shipping_at = new Date();
        } else if (dto.status === OrderStatus.DELIVERED) {
          order.delivered_at = new Date();
        } else if (dto.status === OrderStatus.COMPLETED) {
          order.completed_at = new Date();
        } else if (dto.status === OrderStatus.CANCELLED) {
          order.cancelled_at = new Date();
          if (dto.cancel_reason) {
            order.cancel_reason = dto.cancel_reason;
          }
        }
      }
      if (dto.payment_status) order.payment_status = dto.payment_status;

      const updatedOrder = await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();

      if (dto.status) {
        this.triggerOrderStatusEmailNotification(order.id, dto.status, 'admin', dto.cancel_reason);
        if (dto.status === OrderStatus.COMPLETED) {
          try {
            await this.warrantiesService.generateForOrder(order.id);
          } catch (err) {
            console.error('Lỗi khi tự động tạo phiếu bảo hành cho đơn hàng:', err);
          }
        } else if (dto.status === OrderStatus.CANCELLED) {
          try {
            await this.warrantiesService.voidWarrantiesForOrder(
              order.id,
              `Hủy toàn bộ phiếu bảo hành do đơn hàng bị hủy.`,
            );
          } catch (err) {
            console.error('Lỗi khi hủy phiếu bảo hành cho đơn hàng:', err);
          }
        } else if (dto.status === OrderStatus.RETURN_APPROVED) {
          try {
            await this.warrantiesService.voidWarrantiesForReturnItems(
              order.id,
              order.return_request?.items || [],
              `Hủy phiếu bảo hành do sản phẩm được chấp nhận đổi trả.`,
            );
          } catch (err) {
            console.error('Lỗi khi hủy phiếu bảo hành cho đơn hàng:', err);
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
    // 1. Xác định mốc thời gian lọc (minDate -> maxDate)
    const now = new Date();
    let minDate: Date;
    let maxDate: Date | undefined;

    if (startDate && endDate) {
      minDate = new Date(startDate);
      minDate.setHours(0, 0, 0, 0);
      maxDate = new Date(endDate);
      maxDate.setHours(23, 59, 59, 999);
    } else if (timeframe === '7days') {
      minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      minDate.setHours(0, 0, 0, 0);
    } else if (timeframe === '30days') {
      minDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
      minDate.setHours(0, 0, 0, 0);
    } else if (timeframe === 'year') {
      minDate = new Date(now.getFullYear(), 0, 1);
      minDate.setHours(0, 0, 0, 0);
    } else {
      minDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      minDate.setHours(0, 0, 0, 0);
    }

    const completedStatuses = [
      OrderStatus.COMPLETED,
      OrderStatus.RETURN_PENDING,
      OrderStatus.RETURN_APPROVED,
      OrderStatus.RETURN_REJECTED,
    ];

    // 2. Thống kê tổng quan dựa trên khoảng thời gian lọc
    const statsQuery = this.orderRepository
      .createQueryBuilder('o')
      .select('COUNT(o.id)', 'totalOrders')
      .addSelect(
        'SUM(CASE WHEN o.status IN (:...completedStatuses) THEN 1 ELSE 0 END)',
        'completedOrdersCount',
      )
      .addSelect(
        'SUM(CASE WHEN o.status IN (:...completedStatuses) THEN o.total_amount ELSE 0 END)',
        'revenue',
      )
      .addSelect('COUNT(DISTINCT o.user_id)', 'customerCount')
      .where('o.created_at >= :minDate', { minDate });

    if (maxDate) {
      statsQuery.andWhere('o.created_at <= :maxDate', { maxDate });
    }

    const rawStats = await statsQuery
      .setParameters({
        completedStatuses,
        minDate,
        ...(maxDate ? { maxDate } : {}),
      })
      .getRawOne();

    // Số đơn chờ xử lý toàn hệ thống (không lọc theo ngày để Admin luôn thấy đơn cần xử lý ngay)
    const pendingOrdersRaw = await this.orderRepository
      .createQueryBuilder('o')
      .select('COUNT(o.id)', 'pendingOrders')
      .where('o.status = :pending', { pending: OrderStatus.PENDING })
      .setParameters({ pending: OrderStatus.PENDING })
      .getRawOne();

    const totalOrders = Number(rawStats?.totalOrders || 0);
    const pendingOrders = Number(pendingOrdersRaw?.pendingOrders || 0);
    const completedOrdersCount = Number(rawStats?.completedOrdersCount || 0);
    const revenue = Number(rawStats?.revenue || 0);
    const customerCount = Number(rawStats?.customerCount || 0);

    const totalRegisteredCustomers = await this.dataSource
      .getRepository(User)
      .count({ where: { role: UserRole.CUSTOMER } });

    // 3. Tính danh mục bán chạy nhất theo khoảng thời gian lọc
    let topCategory = { name: 'Chưa có', percent: 0 };
    if (revenue > 0) {
      const topCatQuery = this.dataSource
        .createQueryBuilder()
        .select('c.name', 'categoryName')
        .addSelect('SUM(oi.price * oi.quantity)', 'categoryRevenue')
        .from('order_items', 'oi')
        .innerJoin('orders', 'o', 'oi.order_id = o.id')
        .innerJoin('products', 'p', 'oi.product_id = p.id')
        .leftJoin('categories', 'c', 'p.category_id = c.id')
        .where('o.status IN (:...completedStatuses)', { completedStatuses })
        .andWhere('o.created_at >= :minDate', { minDate });

      if (maxDate) {
        topCatQuery.andWhere('o.created_at <= :maxDate', { maxDate });
      }

      const topCatRaw = await topCatQuery
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

    // 4. Tải danh sách đơn hoàn thành trong khoảng thời gian lọc để vẽ biểu đồ
    const completedOrders = await this.orderRepository.find({
      select: { id: true, total_amount: true, completed_at: true, created_at: true },
      where: {
        status: In(completedStatuses),
        created_at: maxDate ? Between(minDate, maxDate) : MoreThanOrEqual(minDate),
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

    // 5. Lấy danh sách sản phẩm/biến thể tồn kho thấp (<= 5) cho Low Stock Alert Widget
    const lowStockVariantsRaw = await this.dataSource
      .getRepository(ProductVariant)
      .find({
        where: { stock: LessThanOrEqual(5) },
        relations: { product: { images: true } },
        order: { stock: 'ASC' },
        take: 5,
      });

    const lowStockVariants = lowStockVariantsRaw.map((v) => ({
      id: v.id,
      sku: v.sku,
      stock: v.stock,
      attributes: v.attributes,
      product_id: v.product?.id,
      product_name: v.product?.name,
      image_url: v.image_url || v.product?.images?.[0]?.image_url || '',
    }));

    return {
      totalOrders,
      pendingOrders,
      completedOrdersCount,
      revenue,
      customerCount,
      totalRegisteredCustomers,
      topCategory,
      chartData,
      monthlyRevenue: chartData,
      recentOrders,
      lowStockVariants,
    };
  }

  /**
   * Cập nhật trạng thái thanh toán sau khi nhận kết quả từ VNPAY
   * - Nếu thành công: chuyển đơn hàng sang CONFIRMED
   * - Nếu thất bại: hoàn lại kho và chuyển trạng thái sang CANCELLED
   */
  async updatePaymentStatus(
    orderId: number,
    isSuccess: boolean,
    transactionNo: string,
    paymentMethod: 'vnpay' = 'vnpay',
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
      }

      if (isSuccess) {
        // Thanh toán thành công → tự động xác nhận đơn hàng và tạo phiếu xuất kho PENDING
        order.status = OrderStatus.CONFIRMED;
        order.confirmed_at = new Date();
        order.cancelled_at = null;
        await this.createStockIssueForOrder(queryRunner.manager, order);

        if (wasPreviouslyCancelled) {
          console.log(
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
      this.triggerOrderStatusEmailNotification(order.id, order.status, 'system');
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // Hàm cleanupUnpaidOrders đã được chuyển sang OrderPaymentService để tránh chạy đúp dẫn đến cộng dồn kho 2 lần

  async requestOrderReturn(
    userId: number,
    orderId: number,
    dto: RequestReturnDto,
  ): Promise<Order> {
    return this.orderReturnService.requestOrderReturn(userId, orderId, dto);
  }

  async handleOrderReturnAdmin(
    orderId: number,
    dto: HandleReturnDto,
  ): Promise<Order> {
    return this.orderReturnService.handleOrderReturnAdmin(orderId, dto);
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

  private async createStockIssueForOrder(
    manager: any,
    order: Order,
    userId?: number,
  ): Promise<StockIssue | null> {
    const existingIssue = await manager.findOne(StockIssue, {
      where: { order_id: order.id },
    });
    if (existingIssue) {
      return existingIssue;
    }

    const fullOrder = await manager.findOne(Order, {
      where: { id: order.id },
      relations: { user: true, items: { variant: { product: true } } },
    });

    if (!fullOrder || !fullOrder.items || fullOrder.items.length === 0) {
      return null;
    }

    const stockIssue = new StockIssue();
    stockIssue.reason = StockIssueReason.ORDER_SALE;
    stockIssue.status = StockIssueStatus.PENDING;
    stockIssue.order_id = fullOrder.id;
    stockIssue.notes = `Tự động tạo khi đơn hàng #${fullOrder.id} được xác nhận`;
    if (userId) {
      stockIssue.created_by = { id: userId } as unknown as User;
    } else {
      stockIssue.created_by = null;
    }

    let issueTotalAmount = 0;
    const issueItems: StockIssueItem[] = [];
    for (const item of fullOrder.items) {
      if (item.variant) {
        const issueItem = new StockIssueItem();
        issueItem.variant = item.variant;
        issueItem.quantity = item.quantity;
        issueItem.unit_price = item.price;
        issueItem.stock_issue = stockIssue;
        issueItems.push(issueItem);
        issueTotalAmount += item.quantity * Number(item.price);
      }
    }
    stockIssue.items = issueItems;
    stockIssue.total_amount = issueTotalAmount;

    const savedIssue = await manager.save(StockIssue, stockIssue);
    savedIssue.code = `PXK${savedIssue.id.toString().padStart(5, '0')}`;
    return await manager.save(StockIssue, savedIssue);
  }

  private async cancelStockIssueForOrder(
    manager: any,
    orderId: number,
    reasonNote: string,
  ): Promise<void> {
    const stockIssue = await manager.findOne(StockIssue, {
      where: { order_id: orderId },
      relations: { items: { variant: true } },
    });

    if (stockIssue) {
      if (
        stockIssue.status === StockIssueStatus.PENDING ||
        stockIssue.status === StockIssueStatus.COMPLETED
      ) {
        stockIssue.status = StockIssueStatus.CANCELLED;
        await manager.save(StockIssue, stockIssue);
        for (const item of stockIssue.items) {
          if (item.variant) {
            const variant = await manager.findOne(ProductVariant, {
              where: { id: item.variant.id },
              lock: { mode: 'pessimistic_write' },
            });
            if (variant) {
              const prevStock = variant.stock;
              variant.stock += item.quantity;
              await manager.save(variant);
              await this.logTransaction(
                manager,
                variant.id,
                item.quantity,
                prevStock,
                variant.stock,
                'return',
                `${reasonNote} (Hoàn kho từ phiếu xuất ${stockIssue.code || '#' + stockIssue.id})`,
                orderId.toString(),
              );
            }
          }
        }
      }
    } else {
      // Đơn hàng bị hủy ở trạng thái PENDING (chưa tạo Phiếu xuất kho)
      const order = await manager.findOne(Order, {
        where: { id: orderId },
        relations: { items: { variant: true } },
      });
      if (order && order.items) {
        for (const item of order.items) {
          if (item.variant) {
            const variant = await manager.findOne(ProductVariant, {
              where: { id: item.variant.id },
              lock: { mode: 'pessimistic_write' },
            });
            if (variant) {
              const prevStock = variant.stock;
              variant.stock += item.quantity;
              await manager.save(variant);
              await this.logTransaction(
                manager,
                variant.id,
                item.quantity,
                prevStock,
                variant.stock,
                'return',
                `${reasonNote} (Hoàn kho giữ hàng cho đơn hàng #${orderId})`,
                orderId.toString(),
              );
            }
          }
        }
      }
    }
  }

  // Hàm tạo hóa đơn PDF
  async generateInvoicePdf(orderId: number): Promise<Buffer> {
    return this.orderInvoiceService.generateInvoicePdf(orderId);
  }
}

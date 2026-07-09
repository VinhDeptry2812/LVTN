import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan, In } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { CartService } from '../cart/cart.service';
import { ProductVariant } from '../products/product-variant.entity';
import { Product } from '../products/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UserRole, User } from '../users/user.entity';
import { VouchersService } from '../vouchers/vouchers.service';
import { Voucher, DiscountType } from '../vouchers/voucher.entity';

@Injectable()
export class OrdersService implements OnModuleInit {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
    private readonly vouchersService: VouchersService,
  ) {}

  onModuleInit() {
    // Chạy dọn dẹp đơn hàng chưa thanh toán định kỳ mỗi 5 phút
    setInterval(() => {
      this.cleanupUnpaidOrders().catch((err) => {
        console.error('Lỗi khi chạy dọn dẹp đơn hàng chưa thanh toán:', err);
      });
    }, 5 * 60 * 1000);
  }

  async findOne(orderId: number): Promise<Order | null> {
    return this.orderRepository.findOne({
      where: { id: orderId },
      relations: { items: { variant: true } },
    });
  }

  async createGuestOrder(dto: CreateOrderDto): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống, không thể đặt hàng.');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      const order = new Order();
      order.shipping_address = dto.shipping_address;
      order.phone = dto.phone;
      order.notes = dto.notes || null;
      order.payment_method = dto.payment_method;
      order.status = OrderStatus.PENDING;
      order.payment_status = PaymentStatus.PENDING;

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

          variant.stock -= item.quantity;
          await queryRunner.manager.save(variant);
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
        // Fetch and lock inside transaction to avoid race conditions
        const cleanCode = dto.voucher_code.trim().toUpperCase();
        const voucher = await queryRunner.manager.findOne(Voucher, {
          where: { code: cleanCode },
          lock: { mode: 'pessimistic_write' },
        });

        if (!voucher) {
          throw new BadRequestException('Mã giảm giá không tồn tại.');
        }

        // Validate voucher inside transaction under the lock
        const { discountAmount } = await this.vouchersService.validateVoucher(
          dto.voucher_code,
          totalAmount,
          undefined,
          queryRunner.manager,
        );

        voucher.used_count += 1;
        await queryRunner.manager.save(voucher);

        order.voucher_code = voucher.code;
        order.discount_amount = discountAmount;
        order.total_amount = totalAmount - discountAmount;
      } else {
        order.total_amount = totalAmount;
        order.discount_amount = 0;
      }

      order.items = orderItems;

      const savedOrder = await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createOrder(userId: number, dto: CreateOrderDto): Promise<Order> {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống, không thể đặt hàng.');
    }

    // Sử dụng Transaction để đảm bảo tính toàn vẹn dữ liệu khi trừ kho và tạo đơn
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      let totalAmount = 0;
      const orderItems: OrderItem[] = [];

      const order = new Order();
      order.user = { id: userId } as unknown as User;
      order.shipping_address = dto.shipping_address;
      order.phone = dto.phone;
      order.notes = dto.notes || null;
      order.payment_method = dto.payment_method;
      order.status = OrderStatus.PENDING;
      order.payment_status = PaymentStatus.PENDING;

      for (const item of dto.items) {
        // 1. Kiểm tra tồn kho của biến thể nếu có
        if (item.variant_id) {
          const variant = await queryRunner.manager.findOne(ProductVariant, {
            where: { id: item.variant_id },
            lock: { mode: 'pessimistic_write' }, // Lock bản ghi để tránh Race Condition khi nhiều người mua cùng lúc
          });

          if (!variant) {
            throw new NotFoundException(`Biến thể sản phẩm không tồn tại.`);
          }

          if (variant.stock < item.quantity) {
            throw new BadRequestException(
              `Không đủ hàng tồn kho. Chỉ còn lại ${variant.stock} sản phẩm.`,
            );
          }

          // Trừ tồn kho
          variant.stock -= item.quantity;
          await queryRunner.manager.save(variant);
        }

        // 2. Tính giá bán thực tế của item
        const itemSubtotal = item.price * item.quantity;
        totalAmount += itemSubtotal;

        // 3. Tạo OrderItem
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
        // Fetch and lock inside transaction to avoid race conditions
        const cleanCode = dto.voucher_code.trim().toUpperCase();
        const voucher = await queryRunner.manager.findOne(Voucher, {
          where: { code: cleanCode },
          lock: { mode: 'pessimistic_write' },
        });

        if (!voucher) {
          throw new BadRequestException('Mã giảm giá không tồn tại.');
        }

        // Validate voucher inside transaction under the lock
        const { discountAmount } = await this.vouchersService.validateVoucher(
          dto.voucher_code,
          totalAmount,
          userId,
          queryRunner.manager,
        );

        voucher.used_count += 1;
        await queryRunner.manager.save(voucher);

        order.voucher_code = voucher.code;
        order.discount_amount = discountAmount;
        order.total_amount = totalAmount - discountAmount;
      } else {
        order.total_amount = totalAmount;
        order.discount_amount = 0;
      }

      order.items = orderItems;

      // Lưu đơn hàng
      const savedOrder = await queryRunner.manager.save(order);

      // (Optional) Clear database cart if it exists, though frontend uses local cart
      try {
        await this.cartService.clearCart(userId);
      } catch {
        // Ignore if cart doesn't exist
      }

      await queryRunner.commitTransaction();
      return savedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getMyOrders(userId: number): Promise<Order[]> {
    return this.orderRepository.find({
      where: { user: { id: userId } },
      relations: {
        items: {
          product: true,
          variant: true,
        },
      },
      order: { created_at: 'DESC' },
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
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Bảo mật: Khách hàng chỉ được xem đơn hàng của chính mình. Admin xem được tất cả.
    if (role !== UserRole.ADMIN && order.user.id !== userId) {
      throw new ForbiddenException('Bạn không có quyền truy cập đơn hàng này.');
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
            variant.stock += item.quantity;
            await queryRunner.manager.save(variant);
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

    return this.orderRepository.save(order);
  }

  async getAllOrdersAdmin(
    page = 1,
    limit = 10,
    status?: OrderStatus,
    search?: string,
    paymentMethod?: string,
    dateRange?: string,
  ): Promise<{ data: Order[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('items.variant', 'variant')
      .orderBy('order.created_at', 'DESC');

    queryBuilder.where('1=1');

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    if (paymentMethod) {
      queryBuilder.andWhere('order.payment_method = :paymentMethod', { paymentMethod });
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
              variant.stock += item.quantity;
              await queryRunner.manager.save(variant);
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
      return updatedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getDashboardStatsAdmin(): Promise<any> {
    const orders = await this.orderRepository.find({
      order: { created_at: 'DESC' },
      relations: { user: true },
    });

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(
      (o) => o.status === OrderStatus.PENDING,
    ).length;

    const revenue = orders
      .filter((o) => o.status === OrderStatus.COMPLETED)
      .reduce((sum, o) => sum + Number(o.total_amount), 0);

    const recentOrders = orders.slice(0, 5);

    return {
      totalOrders,
      pendingOrders,
      revenue,
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
    paymentMethod: 'vnpay' | 'momo' = 'vnpay',
    paidAmount?: number,
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

    // Nếu đơn hàng đã thanh toán trước đó hoặc đã ở trạng thái hủy/thất bại, không xử lý lại để tránh trùng lặp/hoàn kho nhiều lần
    if (
      order.payment_status === PaymentStatus.PAID ||
      order.payment_status === PaymentStatus.FAILED ||
      order.status === OrderStatus.CANCELLED
    ) {
      return order;
    }

    // Xác thực số tiền thanh toán thực tế nếu thành công
    if (isSuccess && paidAmount !== undefined) {
      if (Math.abs(Number(order.total_amount) - paidAmount) > 1) {
        throw new BadRequestException('Số tiền thanh toán không khớp với đơn hàng.');
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const targetStatus = isSuccess
        ? PaymentStatus.PAID
        : PaymentStatus.FAILED;
      order.payment_status = targetStatus;

      if (paymentMethod === 'vnpay') {
        order.vnpay_transaction_no = transactionNo || null;
      } else if (paymentMethod === 'momo') {
        order.momo_trans_id = transactionNo || null;
      }

      if (isSuccess) {
        // Thanh toán thành công → tự động xác nhận đơn hàng
        order.status = OrderStatus.CONFIRMED;
        order.confirmed_at = new Date();
      } else {
        // Thanh toán thất bại → hoàn lại kho và hủy đơn hàng
        for (const item of order.items) {
          if (item.variant) {
            const variant = await queryRunner.manager.findOne(ProductVariant, {
              where: { id: item.variant.id },
              lock: { mode: 'pessimistic_write' },
            });
            if (variant) {
              variant.stock += item.quantity;
              await queryRunner.manager.save(variant);
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
    const expirationTime = new Date(Date.now() - 15 * 60 * 1000); // 15 phút trước
    const unpaidOrders = await this.orderRepository.find({
      where: {
        status: OrderStatus.PENDING,
        payment_status: PaymentStatus.PENDING,
        payment_method: In(['vnpay', 'momo']),
        created_at: LessThan(expirationTime),
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

    console.log(`[Order Cleanup] Phát hiện ${unpaidOrders.length} đơn hàng quá hạn thanh toán.`);

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
              variant.stock += item.quantity;
              await queryRunner.manager.save(variant);
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
        console.log(`[Order Cleanup] Hủy thành công đơn hàng ID ${order.id} do quá hạn thanh toán.`);
      } catch (error) {
        await queryRunner.rollbackTransaction();
        console.error(`[Order Cleanup] Lỗi khi hủy đơn hàng ID ${order.id}:`, error);
      } finally {
        await queryRunner.release();
      }
    }
  }
}

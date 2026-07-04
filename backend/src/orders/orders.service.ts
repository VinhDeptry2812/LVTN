import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus, PaymentStatus } from './order.entity';
import { OrderItem } from './order-item.entity';
import { CartService } from '../cart/cart.service';
import { ProductVariant } from '../products/product-variant.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { UserRole } from '../users/user.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    private readonly cartService: CartService,
    private readonly dataSource: DataSource,
  ) {}

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
            throw new BadRequestException(`Không đủ hàng tồn kho. Chỉ còn lại ${variant.stock} sản phẩm.`);
          }

          variant.stock -= item.quantity;
          await queryRunner.manager.save(variant);
        }

        const itemSubtotal = item.price * item.quantity;
        totalAmount += itemSubtotal;

        const orderItem = new OrderItem();
        orderItem.product = { id: item.product_id } as any;
        if (item.variant_id) {
          orderItem.variant = { id: item.variant_id } as any;
        }
        orderItem.quantity = item.quantity;
        orderItem.price = item.price;
        orderItems.push(orderItem);
      }

      order.total_amount = totalAmount;
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
      order.user = { id: userId } as any;
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
            throw new BadRequestException(`Không đủ hàng tồn kho. Chỉ còn lại ${variant.stock} sản phẩm.`);
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
        orderItem.product = { id: item.product_id } as any;
        if (item.variant_id) {
          orderItem.variant = { id: item.variant_id } as any;
        }
        orderItem.quantity = item.quantity;
        orderItem.price = item.price;
        orderItems.push(orderItem);
      }

      order.total_amount = totalAmount;
      order.items = orderItems;

      // Lưu đơn hàng
      const savedOrder = await queryRunner.manager.save(order);

      // (Optional) Clear database cart if it exists, though frontend uses local cart
      try {
        await this.cartService.clearCart(userId);
      } catch (e) {
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

      order.status = OrderStatus.CANCELLED;
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

  async getAllOrdersAdmin(
    page = 1,
    limit = 10,
    status?: OrderStatus,
  ): Promise<{ data: Order[]; total: number; page: number; limit: number }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .leftJoinAndSelect('items.variant', 'variant')
      .orderBy('order.created_at', 'DESC');

    if (status) {
      queryBuilder.where('order.status = :status', { status });
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
      if (dto.status === OrderStatus.CANCELLED && order.status !== OrderStatus.CANCELLED) {
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
      }

      if (dto.status) order.status = dto.status;
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
    const pendingOrders = orders.filter((o) => o.status === OrderStatus.PENDING).length;

    const revenue = orders
      .filter((o) => o.status !== OrderStatus.CANCELLED)
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
      throw new NotFoundException('Không tìm thấy đơn hàng cần cập nhật thanh toán');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const targetStatus = isSuccess ? PaymentStatus.PAID : PaymentStatus.FAILED;
      order.payment_status = targetStatus;

      if (paymentMethod === 'vnpay') {
        order.vnpay_transaction_no = transactionNo || null;
      } else if (paymentMethod === 'momo') {
        order.momo_trans_id = transactionNo || null;
      }

      if (isSuccess) {
        // Thanh toán thành công → tự động xác nhận đơn hàng
        order.status = OrderStatus.CONFIRMED;
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
        order.status = OrderStatus.CANCELLED;
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
}


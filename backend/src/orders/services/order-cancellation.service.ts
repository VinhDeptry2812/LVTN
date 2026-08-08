import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Order, OrderStatus } from '../order.entity';
import { StockIssue, StockIssueStatus } from '../../stock-issues/stock-issue.entity';
import { ProductVariant } from '../../products/product-variant.entity';
import { Voucher } from '../../vouchers/voucher.entity';
import { logInventoryTransaction } from '../../products/inventory-transaction.helper';
import { MailService } from '../../auth/mail.service';

/**
 * Service xử lý nghiệp vụ hủy đơn hàng và hoàn lại kho/voucher
 */
@Injectable()
export class OrderCancellationService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
  ) {}

  /**
   * Gửi email thông báo khi đơn hàng chuyển trạng thái
   */
  private async triggerOrderStatusEmailNotification(
    orderId: number,
    status: OrderStatus,
    cancelledByRole?: 'user' | 'admin' | 'system' | string,
    cancelReason?: string,
  ): Promise<void> {
    const ALLOWED_EMAIL_STATUSES: OrderStatus[] = [
      OrderStatus.PENDING,
      OrderStatus.SHIPPING,
      OrderStatus.COMPLETED,
      OrderStatus.CANCELLED,
      OrderStatus.RETURN_APPROVED,
      OrderStatus.RETURN_REJECTED,
    ];

    if (!ALLOWED_EMAIL_STATUSES.includes(status)) {
      return;
    }

    try {
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

      if (order && order.user?.email) {
        const effectiveReason = cancelReason || order.cancel_reason || undefined;
        await this.mailService.sendOrderStatusEmail(
          order.user.email,
          order,
          status,
          undefined,
          cancelledByRole,
          effectiveReason,
        );
      }
    } catch (err) {
      console.error('Lỗi khi lấy dữ liệu hoặc gửi email đơn hàng:', err);
    }
  }

  /**
   * Hủy phiếu xuất kho liên quan đến đơn hàng và hoàn lại số lượng tồn kho
   * @param manager EntityManager trong transaction
   * @param orderId ID đơn hàng cần hủy phiếu xuất kho
   * @param reasonNote Ghi chú lý do hủy hoàn kho
   */
  async cancelStockIssueForOrder(
    manager: EntityManager,
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

              await logInventoryTransaction({
                manager,
                variantId: variant.id,
                changeQty: item.quantity,
                prevStock,
                newStock: variant.stock,
                type: 'return',
                note: `${reasonNote} (Hoàn kho từ phiếu xuất ${stockIssue.code || '#' + stockIssue.id})`,
                referenceId: orderId.toString(),
              });
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

              await logInventoryTransaction({
                manager,
                variantId: variant.id,
                changeQty: item.quantity,
                prevStock,
                newStock: variant.stock,
                type: 'return',
                note: `${reasonNote} (Hoàn kho giữ hàng cho đơn hàng #${orderId})`,
                referenceId: orderId.toString(),
              });
            }
          }
        }
      }
    }
  }

  /**
   * Khách hàng gửi yêu cầu tự hủy đơn hàng (chỉ dành cho đơn PENDING)
   * @param userId ID người dùng
   * @param orderId ID đơn hàng
   * @param reason Lý do hủy đơn (tùy chọn)
   */
  async cancelOrder(userId: number, orderId: number, reason?: string): Promise<Order> {
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
      // 1. Xử lý hủy phiếu xuất kho liên quan và hoàn tồn kho
      await this.cancelStockIssueForOrder(
        queryRunner.manager,
        order.id,
        `Khách hàng hủy đơn hàng #${order.id}`,
      );

      // 2. Hoàn lại lượt dùng voucher nếu có
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
      if (reason) {
        order.cancel_reason = reason;
      }
      const updatedOrder = await queryRunner.manager.save(order);

      await queryRunner.commitTransaction();

      this.triggerOrderStatusEmailNotification(
        order.id,
        OrderStatus.CANCELLED,
        'user',
        reason,
      ).catch((err) => console.error('Lỗi gửi email hủy đơn:', err));

      return updatedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../order.entity';
import { StockIssue, StockIssueStatus } from '../../stock-issues/stock-issue.entity';
import { StockIssueItem } from '../../stock-issues/stock-issue-item.entity';
import { ProductVariant } from '../../products/product-variant.entity';
import { Voucher } from '../../vouchers/voucher.entity';
import { logInventoryTransaction } from '../../products/inventory-transaction.helper';
import { MailService } from '../../auth/mail.service';
import { OrderInvoiceService } from './order-invoice.service';
import { OrderCancellationService } from './order-cancellation.service';

/**
 * Service xử lý thanh toán VNPAY và CronJob dọn dẹp đơn hàng quá hạn thanh toán
 */
@Injectable()
export class OrderPaymentService implements OnModuleInit {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly dataSource: DataSource,
    private readonly mailService: MailService,
    private readonly orderInvoiceService: OrderInvoiceService,
    private readonly orderCancellationService: OrderCancellationService,
  ) {}

  onModuleInit() {
    setInterval(() => {
      this.cleanupUnpaidOrders().catch((err) => {
        console.error('Lỗi khi chạy dọn dẹp đơn hàng chưa thanh toán:', err);
      });
    }, 5 * 60 * 1000);
  }

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
        let pdfBuffer: Buffer | undefined = undefined;
        const isPaid = order.payment_status === PaymentStatus.PAID;
        const isDeliveredOrCompleted =
          status === OrderStatus.DELIVERED || status === OrderStatus.COMPLETED;

        if ((isPaid || isDeliveredOrCompleted) && status !== OrderStatus.CANCELLED) {
          try {
            pdfBuffer = await this.orderInvoiceService.generateInvoicePdf(order.id);
          } catch (pdfErr) {
            console.error('Không thể tạo PDF hóa đơn để gửi kèm email:', pdfErr);
          }
        }

        const effectiveReason = cancelReason || order.cancel_reason || undefined;
        await this.mailService.sendOrderStatusEmail(
          order.user.email,
          order,
          status,
          pdfBuffer,
          cancelledByRole,
          effectiveReason,
        );
      }
    } catch (err) {
      console.error('Lỗi khi gửi email thông báo trạng thái đơn hàng:', err);
    }
  }

  /**
   * Cập nhật trạng thái thanh toán từ VNPAY Callback / IPN
   * @param orderId ID đơn hàng
   * @param paymentStatus Trạng thái thanh toán mới
   * @param transactionNo Mã giao dịch VNPAY (tùy chọn)
   */
  async updatePaymentStatus(
    orderId: number,
    paymentStatus: PaymentStatus,
    transactionNo?: string,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = await queryRunner.manager.findOne(Order, {
        where: { id: orderId },
        relations: {
          items: {
            variant: true,
          },
        },
        lock: { mode: 'pessimistic_write' },
      });

      if (!order) {
        throw new NotFoundException('Không tìm thấy đơn hàng');
      }

      order.payment_status = paymentStatus;
      if (transactionNo) {
        order.vnpay_transaction_no = transactionNo;
      }

      // Xử lý đơn hàng đã hủy trước đó nhưng thanh toán lại thành công
      if (paymentStatus === PaymentStatus.PAID) {
        if (order.status === OrderStatus.CANCELLED) {
          order.status = OrderStatus.CONFIRMED;
          order.cancel_reason = null;
          order.cancelled_at = null;

          // Kiểm tra và trừ lại tồn kho khi khôi phục đơn hàng
          for (const item of order.items) {
            if (item.variant) {
              const variant = await queryRunner.manager.findOne(ProductVariant, {
                where: { id: item.variant.id },
                lock: { mode: 'pessimistic_write' },
              });

              if (!variant || variant.stock < item.quantity) {
                throw new BadRequestException(
                  `Biến thể SKU "${item.variant.sku}" không đủ tồn kho để khôi phục đơn hàng #${order.id}.`,
                );
              }

              const prevStock = variant.stock;
              variant.stock -= item.quantity;
              await queryRunner.manager.save(variant);

              await logInventoryTransaction({
                manager: queryRunner.manager,
                variantId: variant.id,
                changeQty: -item.quantity,
                prevStock,
                newStock: variant.stock,
                type: 'export',
                note: `Khôi phục đơn hàng thanh toán lại VNPAY #${order.id}`,
                referenceId: order.id.toString(),
              });
            }
          }
        } else if (order.status === OrderStatus.PENDING) {
          order.status = OrderStatus.CONFIRMED;
        }

        // Tự động tạo Phiếu Xuất Kho ở trạng thái PENDING nếu chưa có
        const existingStockIssue = await queryRunner.manager.findOne(StockIssue, {
          where: { order_id: order.id },
        });

        if (!existingStockIssue) {
          const stockIssueCode = `PXK-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
          const stockIssue = queryRunner.manager.create(StockIssue, {
            code: stockIssueCode,
            order_id: order.id,
            status: StockIssueStatus.PENDING,
            note: `Tự động tạo phiếu xuất kho cho đơn hàng thanh toán thành công #${order.id}`,
          });
          const savedStockIssue = await queryRunner.manager.save(StockIssue, stockIssue);

          const stockIssueItems = order.items
            .filter((item) => item.variant)
            .map((item) =>
              queryRunner.manager.create(StockIssueItem, {
                stock_issue: savedStockIssue,
                variant: item.variant!,
                quantity: item.quantity,
                unit_price: Number(item.price),
                notes: 'Tự động tạo từ đơn hàng VNPAY',
              }),
            );
          if (stockIssueItems.length > 0) {
            await queryRunner.manager.save(StockIssueItem, stockIssueItems);
          }
        }
      }

      const updatedOrder = await queryRunner.manager.save(order);
      await queryRunner.commitTransaction();

      this.triggerOrderStatusEmailNotification(order.id, updatedOrder.status).catch((err) =>
        console.error('Lỗi khi gửi email sau khi cập nhật trạng thái thanh toán:', err),
      );

      return updatedOrder;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Tiến trình chạy ngầm quét dọn dẹp đơn hàng VNPAY quá hạn 15 phút chưa thanh toán
   */
  async cleanupUnpaidOrders() {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const expiredOrders = await this.orderRepository.find({
      where: {
        payment_method: PaymentMethod.VNPAY,
        payment_status: PaymentStatus.PENDING,
        status: OrderStatus.PENDING,
        created_at: LessThan(fifteenMinutesAgo),
      },
      relations: {
        items: {
          variant: true,
        },
      },
    });

    if (expiredOrders.length === 0) return;

    for (const order of expiredOrders) {
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await this.orderCancellationService.cancelStockIssueForOrder(
          queryRunner.manager,
          order.id,
          `Hệ thống tự động hủy đơn do quá hạn thanh toán VNPAY (15 phút)`,
        );

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
        order.cancel_reason = 'Quá thời hạn thanh toán VNPAY (15 phút)';
        await queryRunner.manager.save(order);

        await queryRunner.commitTransaction();

        this.triggerOrderStatusEmailNotification(
          order.id,
          OrderStatus.CANCELLED,
          'system',
          'Quá thời hạn thanh toán VNPAY (15 phút)',
        ).catch((err) => console.error('Lỗi khi gửi email hủy đơn tự động:', err));
      } catch (err) {
        await queryRunner.rollbackTransaction();
        console.error(`Lỗi khi dọn dẹp đơn hàng chưa thanh toán #${order.id}:`, err);
      } finally {
        await queryRunner.release();
      }
    }
  }
}

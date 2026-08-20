import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order, OrderStatus, PaymentStatus, PaymentMethod } from '../order.entity';
import { OrderItem } from '../order-item.entity';
import { OrderReturn } from '../order-return.entity';
import { RequestReturnDto } from '../dto/request-return.dto';
import { HandleReturnDto } from '../dto/handle-return.dto';
import { StockIssue, StockIssueReason, StockIssueStatus } from '../../stock-issues/stock-issue.entity';
import { StockIssueItem } from '../../stock-issues/stock-issue-item.entity';
import { ProductVariant } from '../../products/product-variant.entity';
import { logInventoryTransaction } from '../../products/inventory-transaction.helper';
import { VnpayService } from '../../vnpay/vnpay.service';
import { MailService } from '../../auth/mail.service';
import { OrderInvoiceService } from './order-invoice.service';
import { NotificationsService } from '../../notifications/notifications.service';
import { WarrantiesService } from '../../warranties/warranties.service';

/**
 * Service chuyên trách quản lý yêu cầu Đổi / Trả hàng và Hoàn tiền
 */
@Injectable()
export class OrderReturnService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderReturn)
    private readonly orderReturnRepository: Repository<OrderReturn>,
    private readonly dataSource: DataSource,
    private readonly vnpayService: VnpayService,
    private readonly mailService: MailService,
    private readonly orderInvoiceService: OrderInvoiceService,
    private readonly notificationsService: NotificationsService,
    private readonly warrantiesService: WarrantiesService,
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
   * Khách hàng gửi yêu cầu Đổi/Trả hàng cho đơn COMPLETED
   * @param userId ID người dùng
   * @param orderId ID đơn hàng
   * @param dto Thông tin yêu cầu trả hàng
   */
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

    const returnWindowDays = 7;
    if (order.completed_at) {
      const daysSinceCompleted =
        (new Date().getTime() - order.completed_at.getTime()) /
        (1000 * 3600 * 24);
      if (daysSinceCompleted > returnWindowDays) {
        throw new BadRequestException(
          `Đã quá thời hạn ${returnWindowDays} ngày để yêu cầu đổi/trả hàng.`,
        );
      }
    }

    // Helper lấy thông tin sản phẩm đổi trả và số lượng tương ứng
    const parseReturnItems = (rawItems: any[]): { itemId: number; quantity: number | null }[] => {
      if (!Array.isArray(rawItems)) return [];
      return rawItems
        .map((ri: any) => {
          if (typeof ri === 'number') {
            return { itemId: Number(ri), quantity: null };
          }
          if (typeof ri === 'object' && ri !== null) {
            const id = ri.itemId ?? ri.id;
            return { itemId: Number(id), quantity: ri.quantity ? Number(ri.quantity) : null };
          }
          return { itemId: 0, quantity: null };
        })
        .filter((i) => i.itemId > 0);
    };

    const returnItemsParsed = parseReturnItems(dto.items);

    // Xác nhận các items gửi lên có nằm trong đơn hàng hay không
    const orderItemMap = new Map(order.items.map((item) => [item.id, item]));
    for (const rItem of returnItemsParsed) {
      const orderItem = orderItemMap.get(rItem.itemId);
      if (!orderItem) {
        throw new BadRequestException(
          'Một số sản phẩm yêu cầu đổi trả không thuộc về đơn hàng này.',
        );
      }
      if (rItem.quantity !== null && (rItem.quantity < 1 || rItem.quantity > orderItem.quantity)) {
        throw new BadRequestException(
          `Số lượng đổi trả cho sản phẩm ${orderItem.product?.name || ''} không hợp lệ (Tối đa ${orderItem.quantity}).`,
        );
      }
    }

    const updatedOrder = await this.dataSource.transaction(async (manager) => {
      const returnRequest = new OrderReturn();
      returnRequest.order = order;
      returnRequest.reason = dto.reason;
      returnRequest.description = dto.description || null;
      returnRequest.items = returnItemsParsed;
      returnRequest.action_type = dto.action_type || 'refund';
      returnRequest.requested_at = new Date();
      returnRequest.images = dto.images || null;
      const savedReturn = await manager.save(returnRequest);

      order.status = OrderStatus.RETURN_PENDING;
      order.return_request = savedReturn;
      return manager.save(order);
    });

    // Thông báo cho Admin về yêu cầu đổi trả mới
    try {
      await this.notificationsService.create({
        title: 'Yêu cầu đổi/trả hàng mới',
        message: `Đơn hàng #${order.id} vừa gửi yêu cầu đổi/trả hàng. Lý do: "${dto.reason}"`,
        type: 'warning',
        reference_link: '/admin/returns',
      });
    } catch (notifErr) {
      console.error('Không thể tạo thông báo đổi trả cho Admin:', notifErr);
    }

    return updatedOrder;
  }

  /**
   * Admin duyệt hoặc từ chối yêu cầu Đổi/Trả hàng của khách hàng
   * @param orderId ID đơn hàng
   * @param dto Dữ liệu duyệt từ Admin
   */
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

        // Helper lấy thông tin số lượng đổi trả cho từng order item
        const parseReturnItemsHelper = (raw: any): { itemId: number; quantity: number | null }[] => {
          if (!raw) return [];
          let items = raw;
          while (typeof items === 'string') {
            try {
              const parsed = JSON.parse(items);
              if (parsed === items) break;
              items = parsed;
            } catch {
              break;
            }
          }
          if (!items) return [];
          if (typeof items === 'number' || typeof items === 'string') {
            const num = Number(items);
            return isNaN(num) || num <= 0 ? [] : [{ itemId: num, quantity: null }];
          }
          if (typeof items === 'object' && !Array.isArray(items)) {
            if (Array.isArray(items.items)) {
              return parseReturnItemsHelper(items.items);
            }
            const possibleId = items.itemId ?? items.id ?? items.productId ?? items.product_id;
            if (possibleId !== undefined && possibleId !== null) {
              const num = Number(possibleId);
              if (!isNaN(num) && num > 0) {
                return [{ itemId: num, quantity: items.quantity ? Number(items.quantity) : null }];
              }
            }
            return Object.entries(items)
              .map(([k, v]) => ({
                itemId: Number(k),
                quantity: typeof v === 'number' ? v : (v as any)?.quantity ? Number((v as any).quantity) : null,
              }))
              .filter((i) => !isNaN(i.itemId) && i.itemId > 0);
          }
          if (Array.isArray(items)) {
            return items
              .map((ri: any) => {
                if (typeof ri === 'number' || typeof ri === 'string') {
                  const num = Number(ri);
                  return { itemId: isNaN(num) ? 0 : num, quantity: null };
                }
                if (typeof ri === 'object' && ri !== null) {
                  const id = ri.itemId ?? ri.id;
                  const num = Number(id);
                  return {
                    itemId: isNaN(num) ? 0 : num,
                    quantity: ri.quantity ? Number(ri.quantity) : null,
                  };
                }
                return { itemId: 0, quantity: null };
              })
              .filter((i) => i.itemId > 0);
          }
          return [];
        };

        const parsedReturnItems = parseReturnItemsHelper(order.return_request?.items);

        const getReturnQty = (item: OrderItem) => {
          if (parsedReturnItems.length === 0 && order.return_request) {
            return { isReturned: true, qty: item.quantity };
          }

          const match = parsedReturnItems.find((ri) => Number(ri.itemId) === Number(item.id));

          if (match) {
            const qty = match.quantity
              ? Math.min(Math.max(Number(match.quantity), 1), item.quantity)
              : item.quantity;
            return { isReturned: true, qty };
          }

          return { isReturned: false, qty: 0 };
        };

        // 1. Nhận hàng trả về từ khách hàng (Hoàn kho nếu shouldRestock = true)
        if (shouldRestock) {
          for (const item of order.items) {
            const { isReturned, qty } = getReturnQty(item);
            if (isReturned && item.variant && qty > 0) {
              const variant = await manager.findOne(ProductVariant, {
                where: { id: item.variant.id },
                lock: { mode: 'pessimistic_write' },
              });
              if (variant) {
                const prevStock = variant.stock;
                variant.stock += qty;
                await manager.save(ProductVariant, variant);

                await logInventoryTransaction({
                  manager,
                  variantId: variant.id,
                  changeQty: qty,
                  prevStock,
                  newStock: variant.stock,
                  type: 'import',
                  note: `Nhập kho từ đơn hàng đổi/trả #${order.id}`,
                  referenceId: order.id.toString(),
                });
              }
            }
          }
        }

        // 2. Xử lý Phương án đổi hàng hoặc hoàn tiền
        if (actionType === 'exchange') {
          // Tạo đơn hàng đổi mới 1-1
          const newOrder = manager.create(Order, {
            user: order.user,
            phone: order.phone,
            shipping_address: order.shipping_address,
            payment_method: PaymentMethod.COD,
            payment_status: PaymentStatus.PAID,
            status: OrderStatus.CONFIRMED,
            total_amount: 0,
            discount_amount: 0,
            shipping_fee: 0,
            notes: `Đơn hàng đổi mới 1-1 cho đơn hàng cũ #${order.id}. Lý do đổi: ${order.return_request.reason}`,
            items: order.items.map((item) =>
              manager.create(OrderItem, {
                product: item.product,
                variant: item.variant,
                quantity: item.quantity,
                price: 0,
              }),
            ),
          });

          const savedNewOrder = await manager.save(Order, newOrder);

          // Trừ kho cho đơn hàng mới và tạo Phiếu xuất kho
          for (const item of order.items) {
            if (item.variant) {
              const variant = await manager.findOne(ProductVariant, {
                where: { id: item.variant.id },
                lock: { mode: 'pessimistic_write' },
              });

              if (!variant || variant.stock < item.quantity) {
                throw new BadRequestException(
                  `Biến thể "${item.variant.sku || item.variant.id}" không đủ tồn kho để đổi sản phẩm mới.`,
                );
              }

              const prevStock = variant.stock;
              variant.stock -= item.quantity;
              await manager.save(ProductVariant, variant);

              await logInventoryTransaction({
                manager,
                variantId: variant.id,
                changeQty: -item.quantity,
                prevStock,
                newStock: variant.stock,
                type: 'export',
                note: `Xuất kho cho đơn hàng đổi mới 1-1 #${savedNewOrder.id} (Từ đơn #${order.id})`,
                referenceId: savedNewOrder.id.toString(),
              });
            }
          }

          const newStockIssue = manager.create(StockIssue, {
            reason: StockIssueReason.OTHER,
            order_id: savedNewOrder.id,
            status: StockIssueStatus.PENDING,
            notes: `Phiếu xuất kho tự động cho đơn đổi trả 1-1 #${savedNewOrder.id}`,
          });
          let savedStockIssue = await manager.save(StockIssue, newStockIssue);
          savedStockIssue.code = `PXK${savedStockIssue.id.toString().padStart(5, '0')}`;
          savedStockIssue = await manager.save(StockIssue, savedStockIssue);

          const stockIssueItems = order.items
            .filter((item) => item.variant !== null)
            .map((item) =>
              manager.create(StockIssueItem, {
                stock_issue: savedStockIssue,
                variant: item.variant!,
                quantity: item.quantity,
                unit_price: 0,
                notes: `Đổi trả 1-1 từ đơn #${order.id}`,
              }),
            );
          if (stockIssueItems.length > 0) {
            await manager.save(StockIssueItem, stockIssueItems);
          }
        } else if (actionType === 'refund') {
          let returnedItemsPrice = 0;
          let totalItemsPrice = 0;

          for (const item of order.items) {
            const itemTotal = Number(item.price) * item.quantity;
            totalItemsPrice += itemTotal;

            const { isReturned, qty } = getReturnQty(item);
            if (isReturned && qty > 0) {
              returnedItemsPrice += Number(item.price) * qty;
            }
          }

          let calculatedRefundAmount = 0;
          // Nếu trả toàn bộ đơn hàng, hoàn trả 100% số tiền khách đã thanh toán (bao gồm cả phí ship)
          if (returnedItemsPrice >= totalItemsPrice) {
            calculatedRefundAmount = Number(order.total_amount);
          } else {
            // Phân bổ chiết khấu (Discount Proration) cho hàng trả một phần
            const discountAmount = Number(order.discount_amount) || 0;
            let proratedDiscount = 0;
            if (discountAmount > 0 && totalItemsPrice > 0) {
              const prorationRatio = returnedItemsPrice / totalItemsPrice;
              proratedDiscount = prorationRatio * discountAmount;
            }
            calculatedRefundAmount = returnedItemsPrice - proratedDiscount;
          }

          // Tránh trường hợp âm hoặc vượt quá tổng tiền
          if (calculatedRefundAmount <= 0) {
            calculatedRefundAmount = 0;
          } else if (calculatedRefundAmount > Number(order.total_amount)) {
            calculatedRefundAmount = Number(order.total_amount);
          }

          // Xử lý hoàn tiền trực tuyến VNPAY (nếu đơn thanh toán VNPAY)
          if (
            order.payment_method === PaymentMethod.VNPAY &&
            order.vnpay_transaction_no
          ) {
            try {
              const isFullRefund = calculatedRefundAmount >= Number(order.total_amount);
              const refundRes = await this.vnpayService.refundTransaction({
                txnRef: order.vnpay_txn_ref || `${order.id}`,
                transactionNo: order.vnpay_transaction_no,
                transactionDate: order.vnpay_payment_date || '',
                amount: Math.round(calculatedRefundAmount),
                reason: `Hoan tien don hang ${order.id}`,
                ipAddr: '127.0.0.1',
                transactionType: isFullRefund ? '02' : '03',
              });

              if (refundRes.responseCode === '00') {
                order.payment_status = PaymentStatus.FAILED;
              } else {
                throw new BadRequestException(
                  `Hoàn tiền VNPAY thất bại (Mã: ${refundRes.responseCode}). Lý do: ${refundRes.message || 'Lỗi không xác định'}`
                );
              }
            } catch (vnpErr) {
              if (vnpErr instanceof BadRequestException) {
                throw vnpErr;
              }
              throw new BadRequestException(`Lỗi hệ thống khi gọi API hoàn tiền VNPAY: ${(vnpErr as Error).message}`);
            }
          }
        }
      }

      await manager.save(OrderReturn, order.return_request);
      return manager.save(Order, order);
    });

    // Thao tác ngoài transaction
    this.triggerOrderStatusEmailNotification(
      order.id,
      dto.status,
      'admin',
      dto.rejectReason,
    ).catch((err) => console.error('Lỗi khi gửi email xử lý đổi trả:', err));

    if (dto.status === OrderStatus.RETURN_APPROVED) {
      this.warrantiesService.voidWarrantiesForReturnItems(
        order.id,
        order.return_request?.items || [],
        `Hủy phiếu bảo hành do sản phẩm được chấp nhận đổi trả.`
      ).catch((err) => console.error('Lỗi khi hủy phiếu bảo hành cho sản phẩm đổi trả:', err));
    }

    return savedOrder;
  }
}

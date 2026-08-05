import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockIssue, StockIssueStatus } from './stock-issue.entity';
import { StockIssueItem } from './stock-issue-item.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { InventoryTransaction } from '../products/inventory-transaction.entity';
import { logInventoryTransaction } from '../products/inventory-transaction.helper';
import { CreateStockIssueDto } from './dto/create-stock-issue.dto';
import { UpdateStockIssueStatusDto } from './dto/update-stock-issue-status.dto';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class StockIssuesService {

  constructor(
    @InjectRepository(StockIssue)
    private readonly issueRepository: Repository<StockIssue>,
    @InjectRepository(StockIssueItem)
    private readonly itemRepository: Repository<StockIssueItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(InventoryTransaction)
    private readonly transactionRepository: Repository<InventoryTransaction>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDto: CreateStockIssueDto,
    userId: number,
  ): Promise<StockIssue> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = new StockIssue();
      issue.reason = createDto.reason;
      issue.notes = createDto.notes || null;
      issue.created_by = { id: userId } as unknown as User;
      issue.status = StockIssueStatus.PENDING;

      let totalAmount = 0;
      const issueItems: StockIssueItem[] = [];

      for (const itemDto of createDto.items) {
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { id: itemDto.variant_id },
        });
        if (!variant) {
          throw new NotFoundException(
            `Không tìm thấy biến thể sản phẩm với ID ${itemDto.variant_id}`,
          );
        }

        const item = new StockIssueItem();
        item.variant = variant;
        item.quantity = itemDto.quantity;
        item.unit_price = itemDto.unit_price;
        item.notes = itemDto.notes || null;
        item.stock_issue = issue;

        issueItems.push(item);
        totalAmount += itemDto.quantity * itemDto.unit_price;
      }

      issue.items = issueItems;
      issue.total_amount = totalAmount;

      const savedIssue = await queryRunner.manager.save(issue);

      // Sinh mã PXK...
      savedIssue.code = `PXK${savedIssue.id.toString().padStart(5, '0')}`;
      await queryRunner.manager.save(savedIssue);

      await queryRunner.commitTransaction();
      return this.findOne(savedIssue.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(
    page = 1,
    limit = 10,
    status?: StockIssueStatus,
    reason?: string,
    search?: string,
  ): Promise<{
    data: StockIssue[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.issueRepository
      .createQueryBuilder('issue')
      .leftJoinAndSelect('issue.created_by', 'created_by')
      .leftJoinAndSelect('issue.reviewed_by', 'reviewed_by')
      .leftJoinAndSelect('issue.items', 'items')
      .leftJoinAndSelect('items.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .orderBy('issue.created_at', 'DESC');

    if (status) {
      queryBuilder.andWhere('issue.status = :status', { status });
    }

    if (reason) {
      queryBuilder.andWhere('issue.reason = :reason', { reason });
    }

    if (search) {
      queryBuilder.andWhere(
        '(issue.code LIKE :search OR issue.notes LIKE :search)',
        { search: `%${search}%` },
      );
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<StockIssue> {
    const issue = await this.issueRepository.findOne({
      where: { id },
      relations: {
        created_by: true,
        reviewed_by: true,
        items: {
          variant: {
            product: true,
          },
        },
      },
    });

    if (!issue) {
      throw new NotFoundException(`Không tìm thấy phiếu xuất kho với ID ${id}`);
    }

    return issue;
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdateStockIssueStatusDto,
    userId: number,
  ): Promise<StockIssue> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const issue = await queryRunner.manager.findOne(StockIssue, {
        where: { id },
        relations: { items: { variant: { product: true } } },
      });

      if (!issue) {
        throw new NotFoundException(
          `Không tìm thấy phiếu xuất kho với ID ${id}`,
        );
      }

      if (issue.status !== StockIssueStatus.PENDING) {
        throw new BadRequestException(
          `Không thể thay đổi trạng thái của phiếu xuất kho đã ${issue.status}`,
        );
      }

      issue.status = updateStatusDto.status;

      if (updateStatusDto.status === StockIssueStatus.COMPLETED) {
        issue.completed_at = new Date();
        issue.reviewed_by = { id: userId } as unknown as User;

        // Deduct inventory for each variant with pessimistic lock
        for (const item of issue.items) {
          const variant = await queryRunner.manager.findOne(ProductVariant, {
            where: { id: item.variant.id },
            lock: { mode: 'pessimistic_write' },
          });

          if (!variant) {
            throw new NotFoundException(
              `Không tìm thấy biến thể sản phẩm ID ${item.variant.id}`,
            );
          }

          if (variant.stock < item.quantity) {
            const productName = item.variant?.product?.name || 'Sản phẩm';
            throw new BadRequestException(
              `Số lượng tồn kho của "${productName} (${variant.sku})" không đủ để xuất (Tồn: ${variant.stock}, Yêu cầu xuất: ${item.quantity})`,
            );
          }

          const prevStock = variant.stock;
          variant.stock -= item.quantity;
          await queryRunner.manager.save(variant);

          // Log inventory transaction
          await this.logTransaction(
            queryRunner.manager,
            variant.id,
            -item.quantity,
            prevStock,
            variant.stock,
            'stock_out',
            `Xuất kho theo phiếu ${issue.code || '#' + issue.id} (${issue.reason})`,
            issue.id.toString(),
            userId,
          );

          // Check low stock and notify
          if (variant.stock <= 5 && this.notificationsService) {
            try {
              const productName = variant.product?.name || 'Sản phẩm';
              await this.notificationsService.create({
                title: 'Cảnh báo tồn kho thấp',
                message: `Sản phẩm ${productName} (${variant.sku}) sau khi xuất kho chỉ còn ${variant.stock} sản phẩm.`,
                type: 'warning',
                reference_link: '/admin/inventory',
              });
            } catch (err) {
              console.error('Lỗi khi gửi thông báo tồn kho thấp:', err);
            }
          }
        }
      }

      const savedIssue = await queryRunner.manager.save(issue);
      await queryRunner.commitTransaction();
      return this.findOne(savedIssue.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async logTransaction(
    manager: any,
    variantId: number,
    changeQty: number,
    prevStock: number,
    newStock: number,
    type: string,
    note?: string,
    referenceId?: string,
    userId?: number,
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
      userId,
    });
  }
}

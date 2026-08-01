import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryAudit, InventoryAuditStatus } from './inventory-audit.entity';
import { InventoryAuditItem } from './inventory-audit-item.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { InventoryTransaction } from '../products/inventory-transaction.entity';
import { logInventoryTransaction } from '../products/inventory-transaction.helper';
import { CreateInventoryAuditDto } from './dto/create-inventory-audit.dto';
import { UpdateInventoryAuditDto } from './dto/update-inventory-audit.dto';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class InventoryAuditsService {
  constructor(
    @InjectRepository(InventoryAudit)
    private readonly auditRepository: Repository<InventoryAudit>,
    @InjectRepository(InventoryAuditItem)
    private readonly auditItemRepository: Repository<InventoryAuditItem>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createDto: CreateInventoryAuditDto,
    userId: number,
  ): Promise<InventoryAudit> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const audit = new InventoryAudit();
      audit.created_by = { id: userId } as unknown as User;
      audit.notes = createDto.notes || null;
      audit.status = InventoryAuditStatus.PENDING;

      const auditItems: InventoryAuditItem[] = [];

      for (const variantId of createDto.variant_ids) {
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { id: variantId },
        });
        if (!variant) {
          throw new NotFoundException(
            `Không tìm thấy biến thể sản phẩm với ID ${variantId}`,
          );
        }

        const item = new InventoryAuditItem();
        item.variant = variant;
        item.system_quantity = variant.stock;
        item.actual_quantity = variant.stock; // Default to match system
        item.difference = 0;
        item.inventory_audit = audit;

        auditItems.push(item);
      }

      audit.items = auditItems;

      const savedAudit = await queryRunner.manager.save(audit);
      await queryRunner.commitTransaction();
      return this.findOne(savedAudit.id);
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
    status?: InventoryAuditStatus,
  ): Promise<{
    data: InventoryAudit[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.auditRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.created_by', 'created_by')
      .orderBy('audit.created_at', 'DESC');

    if (status) {
      queryBuilder.andWhere('audit.status = :status', { status });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<InventoryAudit> {
    const audit = await this.auditRepository.findOne({
      where: { id },
      relations: {
        created_by: true,
        items: {
          variant: {
            product: true,
          },
        },
      },
    });

    if (!audit) {
      throw new NotFoundException(`Không tìm thấy phiếu kiểm kê với ID ${id}`);
    }

    return audit;
  }

  async update(
    id: number,
    updateDto: UpdateInventoryAuditDto,
    userId: number,
  ): Promise<InventoryAudit> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const audit = await queryRunner.manager.findOne(InventoryAudit, {
        where: { id },
        relations: { items: { variant: { product: true } } },
      });

      if (!audit) {
        throw new NotFoundException(
          `Không tìm thấy phiếu kiểm kê với ID ${id}`,
        );
      }

      if (audit.status !== InventoryAuditStatus.PENDING) {
        throw new BadRequestException(
          `Không thể chỉnh sửa phiếu kiểm kê đã ${audit.status}`,
        );
      }

      if (updateDto.notes !== undefined) {
        audit.notes = updateDto.notes;
      }

      // Update actual quantities if provided
      if (updateDto.items) {
        for (const updateItem of updateDto.items) {
          const auditItem = audit.items.find(
            (item) => item.variant.id === updateItem.variant_id,
          );
          if (!auditItem) {
            throw new BadRequestException(
              `Biến thể sản phẩm ID ${updateItem.variant_id} không có trong phiếu kiểm kê này`,
            );
          }
          auditItem.actual_quantity = updateItem.actual_quantity;
          auditItem.difference =
            auditItem.actual_quantity - auditItem.system_quantity;
        }
      }

      // Handle status change
      if (updateDto.status) {
        audit.status = updateDto.status;

        if (updateDto.status === InventoryAuditStatus.COMPLETED) {
          audit.completed_at = new Date();

          // Apply stock adjustments
          for (const item of audit.items) {
            // Lock variant
            const variant = await queryRunner.manager.findOne(ProductVariant, {
              where: { id: item.variant.id },
              lock: { mode: 'pessimistic_write' },
            });

            if (!variant) {
              throw new NotFoundException(
                `Không tìm thấy biến thể sản phẩm ID ${item.variant.id}`,
              );
            }

            if (item.difference !== 0) {
              const prevStock = variant.stock;
              variant.stock += item.difference;
              if (variant.stock < 0) {
                variant.stock = 0; // Prevent negative stock
              }
              await queryRunner.manager.save(variant);

              // Log inventory transaction
              await this.logTransaction(
                queryRunner.manager,
                variant.id,
                item.difference,
                prevStock,
                variant.stock,
                'adjustment',
                `Kiểm kê kho: Điều chỉnh chênh lệch phiếu kiểm kê #${audit.id}`,
                audit.id.toString(),
                userId,
              );

              // Check for low stock alert
              await this.checkLowStockAlert(variant);
            }
          }
        }
      }

      const savedAudit = await queryRunner.manager.save(audit);
      await queryRunner.commitTransaction();
      return this.findOne(savedAudit.id);
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

  private async checkLowStockAlert(variant: ProductVariant): Promise<void> {
    if (variant.stock <= 5) {
      const skuStr = variant.sku ? ` (SKU: ${variant.sku})` : '';
      const attributesStr = variant.attributes
        ? ` [${Object.entries(variant.attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ')}]`
        : '';

      const isOutOfStock = variant.stock <= 0;
      const title = isOutOfStock
        ? 'Cảnh báo sản phẩm HẾT HÀNG'
        : 'Cảnh báo tồn kho thấp';
      const message = isOutOfStock
        ? `Biến thể sản phẩm "${variant.product?.name}"${attributesStr}${skuStr} đã hoàn toàn HẾT HÀNG (Tồn kho: 0).`
        : `Biến thể sản phẩm "${variant.product?.name}"${attributesStr}${skuStr} sắp hết hàng. Số lượng tồn kho hiện tại: ${variant.stock}.`;
      const type: 'warning' | 'error' = isOutOfStock ? 'error' : 'warning';

      await this.notificationsService.create({
        title,
        message,
        type,
        reference_link: `/admin/inventory`,
      });
    }
  }
}

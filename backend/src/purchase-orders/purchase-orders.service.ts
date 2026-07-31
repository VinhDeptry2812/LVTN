import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { PurchaseOrder, PurchaseOrderStatus } from './purchase-order.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { Supplier } from '../suppliers/supplier.entity';
import { ProductVariant } from '../products/product-variant.entity';
import { InventoryTransaction } from '../products/inventory-transaction.entity';
import { logInventoryTransaction } from '../products/inventory-transaction.helper';
import { CreatePurchaseOrderDto } from './dto/create-purchase-order.dto';
import { UpdatePurchaseOrderStatusDto } from './dto/update-purchase-order-status.dto';
import { User } from '../users/user.entity';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepository: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly poItemRepository: Repository<PurchaseOrderItem>,
    @InjectRepository(Supplier)
    private readonly supplierRepository: Repository<Supplier>,
    @InjectRepository(ProductVariant)
    private readonly variantRepository: Repository<ProductVariant>,
    @InjectRepository(InventoryTransaction)
    private readonly transactionRepository: Repository<InventoryTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createPoDto: CreatePurchaseOrderDto,
    userId: number,
  ): Promise<PurchaseOrder> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const supplier = await queryRunner.manager.findOne(Supplier, {
        where: { id: createPoDto.supplier_id },
      });
      if (!supplier) {
        throw new NotFoundException(
          `Không tìm thấy nhà cung cấp với ID ${createPoDto.supplier_id}`,
        );
      }

      const po = new PurchaseOrder();
      po.supplier = supplier;
      po.created_by = { id: userId } as unknown as User;
      po.notes = createPoDto.notes || null;
      po.status = PurchaseOrderStatus.PENDING;

      let totalAmount = 0;
      const poItems: PurchaseOrderItem[] = [];

      for (const item of createPoDto.items) {
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { id: item.variant_id },
        });
        if (!variant) {
          throw new NotFoundException(
            `Không tìm thấy biến thể sản phẩm với ID ${item.variant_id}`,
          );
        }

        const poItem = new PurchaseOrderItem();
        poItem.variant = variant;
        poItem.quantity = item.quantity;
        poItem.import_price = item.import_price;
        poItem.purchase_order = po;

        poItems.push(poItem);
        totalAmount += item.quantity * item.import_price;
      }

      po.items = poItems;
      po.total_amount = totalAmount;

      const savedPo = await queryRunner.manager.save(po);
      await queryRunner.commitTransaction();
      return this.findOne(savedPo.id);
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
    status?: PurchaseOrderStatus,
    supplierId?: number,
  ): Promise<{
    data: PurchaseOrder[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryBuilder = this.poRepository
      .createQueryBuilder('po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.created_by', 'created_by')
      .orderBy('po.created_at', 'DESC');

    if (status) {
      queryBuilder.andWhere('po.status = :status', { status });
    }

    if (supplierId) {
      queryBuilder.andWhere('po.supplier_id = :supplierId', { supplierId });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { data, total, page, limit };
  }

  async findOne(id: number): Promise<PurchaseOrder> {
    const po = await this.poRepository.findOne({
      where: { id },
      relations: {
        supplier: true,
        created_by: true,
        items: {
          variant: {
            product: true,
          },
        },
      },
    });

    if (!po) {
      throw new NotFoundException(`Không tìm thấy đơn nhập hàng với ID ${id}`);
    }

    return po;
  }

  async updateStatus(
    id: number,
    updateStatusDto: UpdatePurchaseOrderStatusDto,
    userId: number,
  ): Promise<PurchaseOrder> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const po = await queryRunner.manager.findOne(PurchaseOrder, {
        where: { id },
        relations: { items: { variant: true } },
      });

      if (!po) {
        throw new NotFoundException(
          `Không tìm thấy đơn nhập hàng với ID ${id}`,
        );
      }

      if (po.status !== PurchaseOrderStatus.PENDING) {
        throw new BadRequestException(
          `Không thể thay đổi trạng thái của đơn nhập hàng đã ${po.status}`,
        );
      }

      po.status = updateStatusDto.status;

      if (updateStatusDto.status === PurchaseOrderStatus.COMPLETED) {
        po.completed_at = new Date();

        // Increment inventory for each variant
        for (const item of po.items) {
          const variant = await queryRunner.manager.findOne(ProductVariant, {
            where: { id: item.variant.id },
            lock: { mode: 'pessimistic_write' },
          });

          if (!variant) {
            throw new NotFoundException(
              `Không tìm thấy biến thể sản phẩm ID ${item.variant.id}`,
            );
          }

          const prevStock = variant.stock;
          variant.stock += item.quantity;
          await queryRunner.manager.save(variant);

          // Log inventory transaction
          await this.logTransaction(
            queryRunner.manager,
            variant.id,
            item.quantity,
            prevStock,
            variant.stock,
            'purchase_order',
            `Nhập kho từ đơn hàng nhập khẩu #${po.id}`,
            po.id.toString(),
            userId,
          );
        }
      }

      const savedPo = await queryRunner.manager.save(po);
      await queryRunner.commitTransaction();
      return this.findOne(savedPo.id);
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

# Kế hoạch triển khai Backend - Quản lý Tồn kho (FurniShop)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bổ sung trọn bộ API quản lý nhà cung cấp, đơn nhập hàng, kiểm kê định kỳ và hệ thống thông báo tồn kho thấp cho trang quản trị.

**Architecture:** Tạo 4 module NestJS riêng biệt (`suppliers`, `purchase-orders`, `inventory-audits`, `notifications`) với Entity TypeORM tương ứng liên kết với các bảng hiện có (`product_variants`, `users`). Thực thi logic cập nhật tồn kho an toàn bằng Transaction Manager và Pessimistic Write Lock.

**Tech Stack:** NestJS, TypeORM, PostgreSQL, Class-Validator, Swagger.

---

### Task 1: Notifications Module & Cảnh báo Tồn kho thấp

**Files:**
- Create: `doantotnghiep/backend/src/notifications/notification.entity.ts`
- Create: `doantotnghiep/backend/src/notifications/dto/create-notification.dto.ts`
- Create: `doantotnghiep/backend/src/notifications/notifications.service.ts`
- Create: `doantotnghiep/backend/src/notifications/notifications.controller.ts`
- Create: `doantotnghiep/backend/src/notifications/notifications.module.ts`
- Modify: `doantotnghiep/backend/src/products/products.service.ts` (Tích hợp kích hoạt cảnh báo tồn kho thấp sau khi cập nhật kho)
- Modify: `doantotnghiep/backend/src/orders/orders.service.ts` (Tích hợp kích hoạt cảnh báo tồn kho thấp sau khi mua hàng)

**Step 1: Tạo Entity & DTO**
* `notification.entity.ts`:
```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', default: 'info' }) // 'info' | 'warning' | 'error' | 'success'
  type: string;

  @Column({ default: false })
  is_read: boolean;

  @Column({ nullable: true })
  reference_link: string;

  @CreateDateColumn()
  created_at: Date;
}
```

* `create-notification.dto.ts`:
```typescript
import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiProperty({ example: 'Cảnh báo hết hàng' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Biến thể SKU-123 có số lượng tồn kho còn 2.' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ example: 'warning' })
  @IsOptional()
  @IsIn(['info', 'warning', 'error', 'success'])
  type?: string;

  @ApiProperty({ example: '/admin/inventory' })
  @IsOptional()
  @IsString()
  reference_link?: string;
}
```

**Step 2: Tạo Service & Controller cho Notifications**
* `notifications.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepository.create(dto);
    return this.notificationRepository.save(notification);
  }

  async findAll(): Promise<Notification[]> {
    return this.notificationRepository.find({ orderBy: { created_at: 'DESC' } });
  }

  async markAsRead(id: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({ where: { id } });
    if (!notification) throw new NotFoundException('Không tìm thấy thông báo');
    notification.is_read = true;
    return this.notificationRepository.save(notification);
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationRepository.update({ is_read: false }, { is_read: true });
  }

  async triggerLowStockAlert(variantSku: string, stock: number, variantId: number) {
    await this.create({
      title: '⚠️ Cảnh báo tồn kho thấp',
      message: `Biến thể sản phẩm SKU: ${variantSku} hiện chỉ còn ${stock} sản phẩm trong kho.`,
      type: 'warning',
      reference_link: `/admin/inventory?search=${variantSku}`,
    });
  }
}
```

* `notifications.controller.ts`:
```typescript
import { Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Lấy danh sách tất cả thông báo (chỉ Admin/Staff)' })
  findAll() {
    return this.service.findAll();
  }

  @Put(':id/read')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Đánh dấu đã đọc thông báo' })
  markAsRead(@Param('id') id: number) {
    return this.service.markAsRead(id);
  }

  @Put('read-all')
  @Roles('admin', 'staff')
  @ApiOperation({ summary: 'Đánh dấu đã đọc toàn bộ thông báo' })
  markAllAsRead() {
    return this.service.markAllAsRead();
  }
}
```

* `notifications.module.ts`:
```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Notification])],
  providers: [NotificationsService],
  controllers: [NotificationsController],
  exports: [NotificationsService],
})
export class NotificationsModule {}
```

**Step 3: Nhúng Cảnh Báo Tồn Kho Thấp**
* Trong `products.service.ts`: Inject `NotificationsService` và gọi `triggerLowStockAlert` trong `updateVariantStock` nếu `stock <= 5`.
* Trong `orders.service.ts`: Tương tự, gọi `triggerLowStockAlert` nếu sau khi trừ kho đặt hàng tồn kho biến thể rơi xuống <= 5.

---

### Task 2: Suppliers Module (Quản lý Nhà cung cấp)

**Files:**
- Create: `doantotnghiep/backend/src/suppliers/supplier.entity.ts`
- Create: `doantotnghiep/backend/src/suppliers/dto/create-supplier.dto.ts`
- Create: `doantotnghiep/backend/src/suppliers/dto/update-supplier.dto.ts`
- Create: `doantotnghiep/backend/src/suppliers/suppliers.service.ts`
- Create: `doantotnghiep/backend/src/suppliers/suppliers.controller.ts`
- Create: `doantotnghiep/backend/src/suppliers/suppliers.module.ts`

**Step 1: Tạo Entity & DTO**
* `supplier.entity.ts`:
```typescript
import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { PurchaseOrder } from '../purchase-orders/purchase-order.entity';

@Entity('suppliers')
export class Supplier {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  tax_code: string;

  @OneToMany(() => PurchaseOrder, (po) => po.supplier)
  purchase_orders: PurchaseOrder[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

* `create-supplier.dto.ts`:
```typescript
import { IsNotEmpty, IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Công ty Cổ phần Gỗ Hòa Phát' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'contact@hoaphat.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @ApiProperty({ example: '02439748888' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'Khu công nghiệp Phố Nối A, Hưng Yên' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '0900123456' })
  @IsOptional()
  @IsString()
  tax_code?: string;
}
```

* `update-supplier.dto.ts`: Kế thừa `PartialType(CreateSupplierDto)`.

**Step 2: Viết CRUD Service & Controller cho Suppliers**
* Đảm bảo phân trang, tìm kiếm theo tên/email/phone.
* Đảm bảo xác thực vai trò `admin` hoặc `staff` để truy cập.

---

### Task 3: Purchase Orders Module (Nhập kho từ Nhà cung cấp)

**Files:**
- Create: `doantotnghiep/backend/src/purchase-orders/purchase-order.entity.ts`
- Create: `doantotnghiep/backend/src/purchase-orders/purchase-order-item.entity.ts`
- Create: `doantotnghiep/backend/src/purchase-orders/dto/create-purchase-order.dto.ts`
- Create: `doantotnghiep/backend/src/purchase-orders/dto/update-po-status.dto.ts`
- Create: `doantotnghiep/backend/src/purchase-orders/purchase-orders.service.ts`
- Create: `doantotnghiep/backend/src/purchase-orders/purchase-orders.controller.ts`
- Create: `doantotnghiep/backend/src/purchase-orders/purchase-orders.module.ts`

**Step 1: Định nghĩa các Thực thể (Entities)**
* Định nghĩa đúng quan hệ `PurchaseOrder` (1-n) `PurchaseOrderItem`.
* Thiết lập CASCADE khi xóa PO ở chế độ Draft.

**Step 2: Viết Logic Hoàn thành đơn nhập hàng (Transaction)**
* Khi chuyển trạng thái từ `pending` sang `completed`:
  1. Khởi tạo Database Transaction.
  2. Dùng `pessimistic_write` lock để khóa dòng của từng biến thể (`ProductVariant`).
  3. Cộng số lượng tồn kho: `variant.stock += item.quantity`.
  4. Ghi nhật ký biến động kho `InventoryTransaction` có loại là `'purchase_order'`, `reference_id` là mã PO.
  5. Đánh dấu đơn PO có `completed_at = new Date()`.
  6. Lưu và Commit Transaction.

---

### Task 4: Inventory Audits Module (Kiểm kê định kỳ)

**Files:**
- Create: `doantotnghiep/backend/src/inventory-audits/inventory-audit.entity.ts`
- Create: `doantotnghiep/backend/src/inventory-audits/inventory-audit-item.entity.ts`
- Create: `doantotnghiep/backend/src/inventory-audits/dto/create-inventory-audit.dto.ts`
- Create: `doantotnghiep/backend/src/inventory-audits/inventory-audits.service.ts`
- Create: `doantotnghiep/backend/src/inventory-audits/inventory-audits.controller.ts`
- Create: `doantotnghiep/backend/src/inventory-audits/inventory-audits.module.ts`

**Step 1: Tạo Entity & DTO**
* `InventoryAuditItem` lưu `system_qty`, `actual_qty`, và `discrepancy`.
* `discrepancy` = `actual_qty - system_qty`.

**Step 2: Viết Service Cân bằng kho khi Hoàn thành Kiểm kê (Transaction)**
* Khi hoàn thành phiếu kiểm kê:
  1. Khởi tạo Transaction.
  2. Khóa dòng của từng `ProductVariant` tương ứng.
  3. Tính toán lại chênh lệch `discrepancy`.
  4. Cập nhật `variant.stock = item.actual_qty`.
  5. Lưu nhật ký biến động kho `InventoryTransaction` với `change_qty = discrepancy`, loại là `'adjustment'` và note là "Cân bằng kho từ phiếu kiểm kê [audit_number]".
  6. Commit Transaction.

---

### Task 5: Đăng ký Modules trong App Module

**Files:**
- Modify: `doantotnghiep/backend/src/app.module.ts`

**Các thay đổi:**
* Import `NotificationsModule`, `SuppliersModule`, `PurchaseOrdersModule`, `InventoryAuditsModule` vào mảng `imports`.

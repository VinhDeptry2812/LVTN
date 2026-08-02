import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warranty, WarrantyStatus, ClaimStatus } from './warranty.entity';
import { Order } from '../orders/order.entity';
import { ClaimWarrantyDto, ProcessWarrantyDto } from './dto/warranty.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class WarrantiesService {
  private readonly logger = new Logger(WarrantiesService.name);

  constructor(
    @InjectRepository(Warranty)
    private readonly warrantyRepository: Repository<Warranty>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Trích xuất số tháng bảo hành từ chuỗi thông số kỹ thuật (vd: "24 tháng", "2 năm", "12") */
  private parseWarrantyMonths(warrantyStr?: string): number {
    if (!warrantyStr) return 12;
    const str = warrantyStr.toLowerCase();
    if (str.includes('năm') || str.includes('year')) {
      const match = str.match(/(\d+)/);
      if (match) return parseInt(match[1], 10) * 12;
    }
    const match = str.match(/(\d+)/);
    if (match) return parseInt(match[1], 10);
    return 12;
  }

  /** Tự động tạo phiếu bảo hành cho toàn bộ sản phẩm trong đơn hàng khi giao hàng thành công */
  async generateForOrder(orderId: number): Promise<Warranty[]> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        items: {
          product: {
            detail: true,
          },
          variant: true,
        },
        user: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }

    // Kiểm tra xem đơn hàng đã sinh phiếu bảo hành chưa
    const existing = await this.warrantyRepository.find({
      where: { order_id: orderId },
    });
    if (existing.length > 0) {
      return existing;
    }

    const createdWarranties: Warranty[] = [];
    const startDate = new Date();

    for (const item of order.items || []) {
      const qty = item.quantity || 1;
      const specs = item.product?.detail?.specifications || {};
      const warrantyStr =
        specs['Bảo hành'] || specs['bảo hành'] || specs['Warranty'] || '12 tháng';
      const months = this.parseWarrantyMonths(warrantyStr);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + months);

      // Tạo từng phiếu cho từng sản phẩm trong số lượng mua
      for (let i = 0; i < qty; i++) {
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const productId = item.product ? item.product.id : 0;
        const code = `BH${order.id}${productId}${i + 1}${randomSuffix}`;

        const warranty = this.warrantyRepository.create({
          code,
          order_id: order.id,
          product_id: productId,
          variant_id: item.variant ? item.variant.id : null,
          user_id: order.user ? order.user.id : null,
          warranty_months: months,
          start_date: startDate,
          end_date: endDate,
          status: WarrantyStatus.ACTIVE,
          claim_status: ClaimStatus.NONE,
        });

        createdWarranties.push(warranty);
      }
    }

    return await this.warrantyRepository.save(createdWarranties);
  }

  /** Tra cứu công khai phiếu bảo hành theo Mã phiếu, SĐT hoặc ID Đơn hàng */
  async lookup(queryStr: string): Promise<Warranty[]> {
    if (!queryStr || !queryStr.trim()) {
      return [];
    }
    const search = queryStr.trim();

    const query = this.warrantyRepository
      .createQueryBuilder('warranty')
      .leftJoinAndSelect('warranty.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('warranty.variant', 'variant')
      .leftJoinAndSelect('warranty.order', 'order')
      .leftJoinAndSelect('warranty.user', 'user')
      .where(
        '(warranty.code LIKE :search OR warranty.serial_number LIKE :search OR user.phone LIKE :search OR CAST(order.id AS CHAR) = :exactSearch)',
        {
          search: `%${search}%`,
          exactSearch: search,
        },
      )
      .orderBy('warranty.created_at', 'DESC');

    return await query.getMany();
  }

  /** Lấy danh sách phiếu bảo hành của khách hàng cá nhân */
  async findMyWarranties(userId: number): Promise<Warranty[]> {
    return await this.warrantyRepository.find({
      where: { user_id: userId },
      relations: { product: { images: true }, variant: true, order: true },
      order: { created_at: 'DESC' },
    });
  }

  /** Lấy thông tin chi tiết 1 phiếu bảo hành theo ID */
  async findById(id: number): Promise<Warranty> {
    const warranty = await this.warrantyRepository.findOne({
      where: { id },
      relations: { product: { images: true }, variant: true, order: true, user: true },
    });
    if (!warranty) {
      throw new NotFoundException('Phiếu bảo hành không tồn tại');
    }
    return warranty;
  }

  /** Khách hàng gửi yêu cầu bảo hành/sửa chữa */
  async claimWarranty(
    id: number,
    userId: number,
    dto: ClaimWarrantyDto,
  ): Promise<Warranty> {
    const warranty = await this.findById(id);

    if (warranty.user_id !== userId) {
      throw new BadRequestException('Bạn không có quyền yêu cầu bảo hành cho phiếu này');
    }

    if (warranty.status === WarrantyStatus.EXPIRED || new Date(warranty.end_date) < new Date()) {
      warranty.status = WarrantyStatus.EXPIRED;
      await this.warrantyRepository.save(warranty);
      throw new BadRequestException('Phiếu bảo hành này đã hết hạn');
    }

    if (warranty.status === WarrantyStatus.VOIDED) {
      throw new BadRequestException('Phiếu bảo hành này đã bị từ chối/hủy bỏ vĩnh viễn');
    }

    if (
      [ClaimStatus.CLAIMING, ClaimStatus.PROCESSING].includes(warranty.claim_status)
    ) {
      throw new BadRequestException('Phiếu bảo hành này đang trong quá trình tiếp nhận/sửa chữa');
    }

    warranty.claim_reason = dto.claim_reason;
    warranty.claim_images = dto.claim_images || null;
    warranty.claim_status = ClaimStatus.CLAIMING; // Cập nhật claim_status (status gốc ACTIVE vẫn giữ nguyên)

    const savedWarranty = await this.warrantyRepository.save(warranty);

    try {
      await this.notificationsService.create({
        title: 'Yêu cầu bảo hành mới',
        message: `Mã BH ${savedWarranty.code} vừa gửi yêu cầu: "${dto.claim_reason}"`,
        type: 'warning',
        reference_link: '/admin/warranties',
      });
    } catch (notiErr) {
      this.logger.error('Lỗi khi tạo thông báo yêu cầu bảo hành:', notiErr);
    }

    return savedWarranty;
  }

  /** Admin: Lấy danh sách toàn bộ phiếu bảo hành (Có phân trang, Lọc & Tìm kiếm) */
  async findAllAdmin(
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    claim_status?: string,
  ) {
    const query = this.warrantyRepository
      .createQueryBuilder('warranty')
      .leftJoinAndSelect('warranty.product', 'product')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('warranty.variant', 'variant')
      .leftJoinAndSelect('warranty.order', 'order')
      .leftJoinAndSelect('warranty.user', 'user');

    if (search) {
      query.andWhere(
        '(warranty.code LIKE :search OR warranty.serial_number LIKE :search OR user.name LIKE :search OR user.phone LIKE :search OR product.name LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status && status !== 'all') {
      query.andWhere('warranty.status = :status', { status });
    }

    if (claim_status && claim_status !== 'all') {
      query.andWhere('warranty.claim_status = :claim_status', { claim_status });
    }

    const [data, total] = await query
      .orderBy('warranty.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Tự động kiểm tra và cập nhật trạng thái expired nếu quá hạn end_date
    const now = new Date();
    for (const item of data) {
      if (item.status === WarrantyStatus.ACTIVE && new Date(item.end_date) < now) {
        item.status = WarrantyStatus.EXPIRED;
        await this.warrantyRepository.update(item.id, { status: WarrantyStatus.EXPIRED });
      }
    }

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data,
      meta: {
        totalItems: total,
        itemCount: data.length,
        itemsPerPage: limit,
        totalPages,
        currentPage: page,
      },
    };
  }

  /** Admin: Cập nhật trạng thái xử lý bảo hành & Ghi chú phương án */
  async processWarrantyAdmin(
    id: number,
    dto: ProcessWarrantyDto,
  ): Promise<Warranty> {
    const warranty = await this.findById(id);

    if (dto.status !== undefined) {
      warranty.status = dto.status;
    }
    if (dto.claim_status !== undefined) {
      warranty.claim_status = dto.claim_status;
    }
    if (dto.resolution_note !== undefined) {
      warranty.resolution_note = dto.resolution_note;
    }
    if (dto.serial_number !== undefined) {
      warranty.serial_number = dto.serial_number;
    }

    return await this.warrantyRepository.save(warranty);
  }

  /** Tự động hủy/vô hiệu hóa các phiếu bảo hành thuộc đơn hàng khi được chấp nhận đổi trả */
  async voidWarrantiesForOrder(
    orderId: number,
    reason: string,
  ): Promise<void> {
    const warranties = await this.warrantyRepository.find({
      where: { order_id: orderId },
    });

    if (!warranties || warranties.length === 0) return;

    for (const warranty of warranties) {
      if (warranty.status !== WarrantyStatus.VOIDED) {
        warranty.status = WarrantyStatus.VOIDED;
        warranty.resolution_note = reason;
        await this.warrantyRepository.save(warranty);
      }
    }
  }
}

import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not } from 'typeorm';
import { Voucher, DiscountType } from './voucher.entity';
import { Order, OrderStatus } from '../orders/order.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher)
    private readonly voucherRepository: Repository<Voucher>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  async create(createVoucherDto: CreateVoucherDto): Promise<Voucher> {
    const code = createVoucherDto.code.trim().toUpperCase();
    const existing = await this.voucherRepository.findOne({ where: { code } });
    if (existing) {
      throw new BadRequestException('Mã voucher này đã tồn tại.');
    }

    const voucher = this.voucherRepository.create({
      ...createVoucherDto,
      code,
    });
    return this.voucherRepository.save(voucher);
  }

  async findAll(): Promise<Voucher[]> {
    return this.voucherRepository.find({ order: { created_at: 'DESC' } });
  }

  async findOne(id: number): Promise<Voucher> {
    const voucher = await this.voucherRepository.findOne({ where: { id } });
    if (!voucher) {
      throw new NotFoundException('Không tìm thấy mã giảm giá.');
    }
    return voucher;
  }

  async update(
    id: number,
    updateVoucherDto: UpdateVoucherDto,
  ): Promise<Voucher> {
    const voucher = await this.findOne(id);
    if (updateVoucherDto.code) {
      const code = updateVoucherDto.code.trim().toUpperCase();
      if (code !== voucher.code) {
        const existing = await this.voucherRepository.findOne({
          where: { code },
        });
        if (existing) {
          throw new BadRequestException('Mã voucher này đã tồn tại.');
        }
        updateVoucherDto.code = code;
      }
    }
    Object.assign(voucher, updateVoucherDto);
    return this.voucherRepository.save(voucher);
  }

  async remove(id: number): Promise<void> {
    const voucher = await this.findOne(id);
    await this.voucherRepository.remove(voucher);
  }

  async validateVoucher(
    code: string,
    orderValue: number,
    userId?: number,
  ): Promise<{ voucher: Voucher; discountAmount: number }> {
    const cleanCode = code.trim().toUpperCase();
    const voucher = await this.voucherRepository.findOne({
      where: { code: cleanCode },
    });

    if (!voucher) {
      throw new NotFoundException('Mã giảm giá không tồn tại.');
    }

    if (!voucher.is_active) {
      throw new BadRequestException('Mã giảm giá này đã bị vô hiệu hóa.');
    }

    const now = new Date();
    if (now < new Date(voucher.start_date)) {
      throw new BadRequestException(
        'Mã giảm giá chưa đến thời hạn bắt đầu sử dụng.',
      );
    }
    if (now > new Date(voucher.end_date)) {
      throw new BadRequestException('Mã giảm giá đã hết hạn sử dụng.');
    }

    if (
      voucher.usage_limit !== null &&
      voucher.used_count >= voucher.usage_limit
    ) {
      throw new BadRequestException('Mã giảm giá đã hết lượt sử dụng.');
    }

    if (orderValue < Number(voucher.min_order_value)) {
      throw new BadRequestException(
        `Đơn hàng chưa đạt giá trị tối thiểu ${Number(voucher.min_order_value).toLocaleString('vi-VN')}₫ để áp dụng mã giảm giá này.`,
      );
    }

    if (userId) {
      const orderCount = await this.orderRepository.count({
        where: {
          user: { id: userId },
          voucher_code: voucher.code,
          status: Not(OrderStatus.CANCELLED),
        },
      });
      if (orderCount > 0) {
        throw new BadRequestException(
          'Bạn đã sử dụng mã giảm giá này cho một đơn hàng trước đó.',
        );
      }
    }

    let discountAmount = 0;
    if (voucher.discount_type === DiscountType.FIXED_AMOUNT) {
      discountAmount = Number(voucher.discount_value);
    } else {
      // PERCENTAGE
      discountAmount = orderValue * (Number(voucher.discount_value) / 100);
      if (voucher.max_discount_amount !== null) {
        const maxDiscount = Number(voucher.max_discount_amount);
        if (discountAmount > maxDiscount) {
          discountAmount = maxDiscount;
        }
      }
    }

    if (discountAmount > orderValue) {
      discountAmount = orderValue;
    }

    return { voucher, discountAmount };
  }
}

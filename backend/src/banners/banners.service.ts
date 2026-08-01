import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Banner } from './banner.entity';
import { CreateBannerDto } from './dto/create-banner.dto';
import { UpdateBannerDto } from './dto/update-banner.dto';

@Injectable()
export class BannersService {
  constructor(
    @InjectRepository(Banner)
    private readonly bannerRepository: Repository<Banner>,
  ) {}

  // Lấy danh sách banner active dành cho public/frontend user
  async findActive(): Promise<Banner[]> {
    return this.bannerRepository.find({
      where: { is_active: true },
      order: { position: 'ASC', created_at: 'DESC' },
    });
  }

  // Lấy tất cả banner dành cho admin quản lý
  async findAllAdmin(): Promise<Banner[]> {
    return this.bannerRepository.find({
      order: { position: 'ASC', created_at: 'DESC' },
    });
  }

  // Lấy chi tiết banner theo ID
  async findOne(id: number): Promise<Banner> {
    const banner = await this.bannerRepository.findOne({ where: { id } });
    if (!banner) {
      throw new NotFoundException(`Không tìm thấy banner có ID = ${id}`);
    }
    return banner;
  }

  // Tạo mới banner
  async create(createBannerDto: CreateBannerDto): Promise<Banner> {
    const banner = this.bannerRepository.create(createBannerDto);
    return this.bannerRepository.save(banner);
  }

  // Cập nhật banner
  async update(id: number, updateBannerDto: UpdateBannerDto): Promise<Banner> {
    const banner = await this.findOne(id);
    Object.assign(banner, updateBannerDto);
    return this.bannerRepository.save(banner);
  }

  // Bật/Tắt trạng thái hiển thị nhanh
  async toggleActive(id: number): Promise<Banner> {
    const banner = await this.findOne(id);
    banner.is_active = !banner.is_active;
    return this.bannerRepository.save(banner);
  }

  // Xóa banner
  async remove(id: number): Promise<void> {
    const banner = await this.findOne(id);
    await this.bannerRepository.remove(banner);
  }
}

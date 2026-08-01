import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Address } from './address.entity';
import { CreateAddressDto, UpdateAddressDto } from './dto/address.dto';

@Injectable()
export class AddressesService {
  constructor(
    @InjectRepository(Address)
    private addressesRepository: Repository<Address>,
  ) {}

  async findByUser(userId: number): Promise<Address[]> {
    return this.addressesRepository.find({
      where: { user_id: userId },
      order: { is_default: 'DESC', created_at: 'DESC' },
    });
  }

  async create(userId: number, dto: CreateAddressDto): Promise<Address> {
    // Nếu đặt làm mặc định, bỏ mặc định tất cả địa chỉ cũ
    if (dto.is_default) {
      await this.addressesRepository.update(
        { user_id: userId },
        { is_default: false },
      );
    }

    // Nếu chưa có địa chỉ nào, tự động đặt làm mặc định
    const existingCount = await this.addressesRepository.count({
      where: { user_id: userId },
    });
    if (existingCount === 0) {
      dto.is_default = true;
    }

    const address = this.addressesRepository.create({
      ...dto,
      user_id: userId,
    });
    return this.addressesRepository.save(address);
  }

  async update(
    userId: number,
    addressId: number,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.addressesRepository.findOne({
      where: { id: addressId, user_id: userId },
    });
    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    // Nếu đặt làm mặc định, bỏ mặc định tất cả địa chỉ cũ
    if (dto.is_default) {
      await this.addressesRepository.update(
        { user_id: userId },
        { is_default: false },
      );
    }

    Object.assign(address, dto);
    return this.addressesRepository.save(address);
  }

  async remove(userId: number, addressId: number): Promise<void> {
    const address = await this.addressesRepository.findOne({
      where: { id: addressId, user_id: userId },
    });
    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    const wasDefault = address.is_default;
    await this.addressesRepository.remove(address);

    // Nếu xóa địa chỉ mặc định, đặt địa chỉ đầu tiên còn lại làm mặc định
    if (wasDefault) {
      const remaining = await this.addressesRepository.findOne({
        where: { user_id: userId },
        order: { created_at: 'ASC' },
      });
      if (remaining) {
        remaining.is_default = true;
        await this.addressesRepository.save(remaining);
      }
    }
  }

  async setDefault(userId: number, addressId: number): Promise<Address> {
    const address = await this.addressesRepository.findOne({
      where: { id: addressId, user_id: userId },
    });
    if (!address) {
      throw new NotFoundException('Không tìm thấy địa chỉ');
    }

    // Bỏ mặc định tất cả
    await this.addressesRepository.update(
      { user_id: userId },
      { is_default: false },
    );

    // Đặt mặc định cho địa chỉ đã chọn
    address.is_default = true;
    return this.addressesRepository.save(address);
  }
}

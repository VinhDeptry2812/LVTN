import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async create(userData: Partial<User>): Promise<User> {
    const newUser = this.usersRepository.create(userData);
    return this.usersRepository.save(newUser);
  }

  async updateProfile(
    id: number,
    updateData: Partial<User>,
  ): Promise<User | null> {
    await this.usersRepository.update(id, updateData);
    return this.findById(id);
  }

  async updatePassword(id: number, password_hash: string): Promise<void> {
    await this.usersRepository.update(id, { password_hash });
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    search?: string,
  ): Promise<{ data: User[]; total: number; page: number; lastPage: number }> {
    const query = this.usersRepository.createQueryBuilder('user')
      .select([
        'user.id',
        'user.email',
        'user.name',
        'user.phone',
        'user.gender',
        'user.birthday',
        'user.role',
        'user.status',
        'user.created_at',
      ]);

    if (search) {
      query.where('user.name LIKE :search OR user.email LIKE :search OR user.phone LIKE :search', {
        search: `%${search}%`,
      });
    }

    const [data, total] = await query
      .orderBy('user.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async updateStatus(id: number, status: string): Promise<User | null> {
    await this.usersRepository.update(id, { status: status as any });
    return this.findById(id);
  }
}

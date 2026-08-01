import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subject, Observable, merge, interval, map } from 'rxjs';
import { Notification } from './notification.entity';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  private notificationSubject = new Subject<{ data: Notification }>();

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  getNotificationStream(): Observable<{ data: any }> {
    const heartbeat$ = interval(25000).pipe(
      map(() => ({ data: { type: 'ping', timestamp: new Date().toISOString() } })),
    );
    return merge(this.notificationSubject.asObservable(), heartbeat$);
  }

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    const notification = this.notificationRepository.create(
      createNotificationDto,
    );
    const saved = await this.notificationRepository.save(notification);

    // Phát sự kiện realtime tới tất cả client đang lắng nghe qua SSE Stream
    this.notificationSubject.next({ data: saved });

    return saved;
  }

  async findAll(page?: number, limit?: number): Promise<any> {
    if (page && limit && page > 0 && limit > 0) {
      const [data, total] = await this.notificationRepository.findAndCount({
        order: { created_at: 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });
      return {
        data,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    }
    return await this.notificationRepository.find({
      order: { created_at: 'DESC' },
    });
  }

  async getUnreadCount(): Promise<number> {
    return await this.notificationRepository.count({
      where: { is_read: false },
    });
  }

  async markAsRead(id: number): Promise<Notification> {
    const notification = await this.notificationRepository.findOne({
      where: { id },
    });
    if (!notification) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
    notification.is_read = true;
    return await this.notificationRepository.save(notification);
  }

  async markAllAsRead(): Promise<void> {
    await this.notificationRepository.update(
      { is_read: false },
      { is_read: true },
    );
  }

  async delete(id: number): Promise<void> {
    const result = await this.notificationRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Notification with ID ${id} not found`);
    }
  }
}

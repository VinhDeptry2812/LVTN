import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

/**
 * Controller khởi tạo ứng dụng gốc (Root Controller)
 * Đảm nhận phản hồi yêu cầu kiểm tra trạng thái hoạt động (Health check) của ứng dụng backend
 */
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * Endpoint kiểm tra phản hồi chào mừng / trạng thái khởi động của server
   * @returns {string} Chuỗi phản hồi từ AppService
   */
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * Endpoint kiểm tra phản hồi nhanh dành cho Cronjob Ping
   * Không truy vấn Database để tiết kiệm tài nguyên và giữ server luôn hoạt động
   */
  @Get('ping')
  getPing() {
    return {
      status: 'ok',
      message: 'Máy chủ backend đang hoạt động bình thường',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Endpoint Healthcheck chuẩn hệ thống
   */
  @Get('health')
  getHealth() {
    return {
      status: 'up',
      message: 'Hệ thống hoạt động tốt',
      timestamp: new Date().toISOString(),
    };
  }
}



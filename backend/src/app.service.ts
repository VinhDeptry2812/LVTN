import { Injectable } from '@nestjs/common';

/**
 * Service xử lý logic hệ thống gốc (Root Service)
 */
@Injectable()
export class AppService {
  /**
   * Trả về thông điệp chào mừng của hệ thống backend
   * @returns {string} Chuỗi thông điệp "Hello World!"
   */
  getHello(): string {
    return 'Hello World!';
  }
}


import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const port = parseInt(this.configService.get<string>('SMTP_PORT', '587'), 10);
    const secure = this.configService.get<string>('SMTP_SECURE') === 'true';

    // Tự động nhận diện cấu hình Gmail để sử dụng Service Gmail tối ưu của Nodemailer cho môi trường Cloud
    if (host === 'smtp.gmail.com' || (!host && user?.endsWith('@gmail.com'))) {
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass,
        },
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host: host || 'smtp.gmail.com',
        port,
        secure,
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false, // Ngăn ngừa lỗi tự ngắt kết nối TLS trên môi trường Cloud Server (Render/Vercel)
        },
      });
    }
  }

  async sendOtpEmail(to: string, otp: string, userName: string) {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4f46e5; text-align: center; margin-bottom: 20px;">Mã Xác Thực Khôi Phục Mật Khẩu</h2>
        <p>Xin chào <strong>${userName || 'Khách hàng'}</strong>,</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn tại <strong>Nội Thất</strong>. Vui lòng sử dụng mã OTP dưới đây để hoàn tất quá trình:</p>
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #1f2937; margin: 25px 0; border-radius: 4px; border: 1px solid #e5e7eb;">
          ${otp}
        </div>
        <p style="color: #ef4444; font-size: 13px;">* Lưu ý: Mã OTP này có hiệu lực trong vòng 5 phút. Vui lòng không chia sẻ mã này cho bất kỳ ai khác.</p>
        <p style="color: #6b7280; font-size: 13px;">Nếu bạn không yêu cầu thay đổi mật khẩu này, vui lòng bỏ qua email này.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">Đây là email tự động từ hệ thống Nội Thất. Vui lòng không phản hồi email này.</p>
      </div>
    `;

    try {
      await this.transporter.sendMail({
        from: `"Nội Thất Support" <${this.configService.get<string>('SMTP_USER')}>`,
        to,
        subject: '[Nội thất] Mã OTP khôi phục mật khẩu',
        html: htmlContent,
      });
    } catch (error) {
      this.logger.error('Lỗi gửi email OTP:', error);
      throw new InternalServerErrorException(
        'Không thể gửi email OTP, vui lòng kiểm tra cấu hình SMTP.',
      );
    }
  }

  async sendOrderStatusEmail(to: string, order: any, newStatus: string, pdfBuffer?: Buffer) {
    const statusMap: Record<string, string> = {
      pending: 'Chờ thanh toán / Chờ xử lý',
      confirmed: 'Đã xác nhận',
      processing: 'Đang chuẩn bị hàng',
      shipping: 'Đang giao hàng',
      delivered: 'Đã giao hàng',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      return_pending: 'Yêu cầu trả hàng đang chờ duyệt',
      return_approved: 'Đã chấp nhận yêu cầu trả hàng',
      return_rejected: 'Đã từ chối yêu cầu trả hàng',
    };

    const statusName = statusMap[newStatus] || newStatus;
    const subtotal = order.items.reduce((sum: number, item: any) => sum + Number(item.price) * item.quantity, 0);

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
        <h2 style="color: #4f46e5; text-align: center; margin-bottom: 20px;">Cập Nhật Trạng Thái Đơn Hàng #${order.id}</h2>
        <p>Xin chào <strong>${order.user?.name || 'Khách hàng'}</strong>,</p>
        <p>Đơn hàng <strong>#${order.id}</strong> của bạn đã được cập nhật trạng thái mới:</p>
        
        <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 20px; font-weight: bold; color: #4f46e5; margin: 20px 0; border-radius: 4px; border: 1px solid #e5e7eb;">
          ${statusName}
        </div>



        <h3 style="color: #374151; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 25px;">Chi tiết đơn hàng</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
              <th style="text-align: left; padding: 8px;">Sản phẩm</th>
              <th style="text-align: center; padding: 8px;">SL</th>
              <th style="text-align: right; padding: 8px;">Đơn giá</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map((item: any) => `
              <tr style="border-bottom: 1px solid #f3f4f6;">
                <td style="padding: 8px; color: #4b5563;">
                  ${item.product?.name || 'Sản phẩm'}
                  ${item.variant ? `<br/><span style="font-size: 12px; color: #9ca3af;">Phân loại: ${Object.values(item.variant.attributes || {}).map(v => String(v).split('|')[0]).join(', ')}</span>` : ''}
                </td>
                <td style="padding: 8px; text-align: center; color: #4b5563;">${item.quantity}</td>
                <td style="padding: 8px; text-align: right; color: #4b5563;">${Number(item.price).toLocaleString('vi-VN')} đ</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <table style="width: 100%; font-size: 14px; color: #4b5563; margin-top: 20px;">
          <tr>
            <td style="padding: 4px 0;">Tạm tính:</td>
            <td style="text-align: right; font-weight: bold; padding: 4px 0;">${Number(subtotal).toLocaleString('vi-VN')} đ</td>
          </tr>
          ${order.discount_amount > 0 ? `
          <tr style="color: #dc2626;">
            <td style="padding: 4px 0;">Giảm giá (Voucher):</td>
            <td style="text-align: right; font-weight: bold; padding: 4px 0;">-${Number(order.discount_amount).toLocaleString('vi-VN')} đ</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 4px 0;">Phí vận chuyển:</td>
            <td style="text-align: right; font-weight: bold; padding: 4px 0;">${Number(order.shipping_fee).toLocaleString('vi-VN')} đ</td>
          </tr>
          <tr style="font-size: 16px; color: #111827; font-weight: bold; border-top: 1px solid #e5e7eb;">
            <td style="padding: 8px 0 4px 0; border-top: 1px solid #e5e7eb;">Tổng cộng:</td>
            <td style="text-align: right; color: #4f46e5; padding: 8px 0 4px 0; border-top: 1px solid #e5e7eb;">${Number(order.total_amount).toLocaleString('vi-VN')} đ</td>
          </tr>
        </table>

        <div style="margin-top: 25px; font-size: 13px; color: #6b7280; background-color: #f9fafb; padding: 12px; border-radius: 4px; line-height: 1.6;">
          <strong>Địa chỉ nhận hàng:</strong> ${order.shipping_address}<br/>
          <strong>Số điện thoại:</strong> ${order.phone}<br/>
          <strong>Phương thức thanh toán:</strong> ${order.payment_method.toUpperCase()}
        </div>

        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 25px 0;" />
        <p style="font-size: 12px; color: #9ca3af; text-align: center;">Mọi thắc mắc vui lòng liên hệ hotline 1900 xxxx. Xin cảm ơn quý khách!</p>
      </div>
    `;

    try {
      const mailOptions: any = {
        from: `"Nội Thất Support" <${this.configService.get<string>('SMTP_USER')}>`,
        to,
        subject: `[Nội Thất] Cập nhật đơn hàng #${order.id} - Trạng thái: ${statusName}`,
        html: htmlContent,
      };

      if (pdfBuffer) {
        mailOptions.attachments = [
          {
            filename: `Hoa_Don_HD${order.id}.pdf`,
            content: pdfBuffer,
          },
        ];
      }

      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      this.logger.error('Lỗi gửi email thông báo đơn hàng:', error);
    }
  }
}

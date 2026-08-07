import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
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
        auth: { user, pass },
        family: 4,
      } as any);
    } else {
      this.transporter = nodemailer.createTransport({
        host: host || 'smtp.gmail.com',
        port,
        secure,
        auth: { user, pass },
        tls: { rejectUnauthorized: false },
        family: 4,
      } as any);
    }
  }

  // Header thương hiệu — Sage Green + Warm Cream
  private get brandHeader(): string {
    return `
      <div style="background-color:#536257;padding:24px 32px;text-align:center;">
        <h1 style="margin:0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:4px;text-transform:uppercase;">Nội Thất</h1>
        <p style="margin:6px 0 0;font-size:11px;color:#d6e7d9;letter-spacing:2px;text-transform:uppercase;">Nội Thất</p>
      </div>`;
  }

  // Footer thương hiệu dùng chung
  private get brandFooter(): string {
    return `
      <div style="border-top:1px solid #e4e2dd;margin-top:28px;padding-top:20px;text-align:center;">
        <p style="margin:0 0 6px;font-size:13px;color:#6b5c4c;">Mọi thắc mắc vui lòng liên hệ</p>
        <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#536257;">Hotline: 1900 xxxx</p>
        <p style="margin:0;font-size:11px;color:#c3c8c2;">&copy; ${new Date().getFullYear()} Nội Thất. Email tự động, vui lòng không phản hồi.</p>
      </div>`;
  }

  // Lấy cấu hình màu Badge trạng thái đơn hàng theo phong cách Nordic
  private getStatusColor(s: string): { bg: string; fg: string; border: string } {
    const m: Record<string, { bg: string; fg: string; border: string }> = {
      pending:         { bg: '#fbf9f4', fg: '#6b5c4c', border: '#e4e2dd' },
      confirmed:       { bg: '#d6e7d9', fg: '#243229', border: '#bacbbe' },
      processing:      { bg: '#f4dfcb', fg: '#524436', border: '#d7c3b0' },
      shipping:        { bg: '#d0e5fb', fg: '#1c3041', border: '#b4c9de' },
      delivered:       { bg: '#d6e7d9', fg: '#111e16', border: '#bacbbe' },
      completed:       { bg: '#536257', fg: '#ffffff', border: '#536257' },
      cancelled:       { bg: '#ffdad6', fg: '#93000a', border: '#ffdad6' },
      return_pending:  { bg: '#f4dfcb', fg: '#524436', border: '#d7c3b0' },
      return_approved: { bg: '#d6e7d9', fg: '#243229', border: '#bacbbe' },
      return_rejected: { bg: '#ffdad6', fg: '#93000a', border: '#ffdad6' },
    };
    return m[s] || { bg: '#f0eee9', fg: '#1b1c19', border: '#e4e2dd' };
  }

  // Wrapper email chung — Nordic Hearth style (sharp edges, warm cream bg)
  private wrapEmail(body: string): string {
    return `<div style="font-family:'Be Vietnam Pro',Arial,sans-serif;max-width:600px;margin:0 auto;background-color:#ffffff;border:1px solid #e4e2dd;">${this.brandHeader}<div style="padding:28px 32px;">${body}${this.brandFooter}</div></div>`;
  }

  async sendOtpEmail(
    to: string,
    otp: string,
    userName: string,
    type: 'register' | 'forgot_password' = 'register',
  ) {
    const isRegister = type === 'register';
    const title = isRegister
      ? 'Mã Xác Thực Kích Hoạt Tài Khoản'
      : 'Mã Xác Thực Khôi Phục Mật Khẩu';
    const description = isRegister
      ? 'Cảm ơn bạn đã đăng ký tài khoản tại <strong>Nội Thất</strong>. Vui lòng sử dụng mã OTP dưới đây để hoàn tất kích hoạt tài khoản của bạn:'
      : 'Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Vui lòng sử dụng mã OTP dưới đây:';
    const footerNote = isRegister
      ? 'Nếu bạn không thực hiện đăng ký tài khoản này, vui lòng bỏ qua email này.'
      : 'Nếu bạn không yêu cầu thay đổi mật khẩu, vui lòng bỏ qua email này.';
    const subject = isRegister
      ? '[Nội Thất] Mã OTP kích hoạt tài khoản'
      : '[Nội Thất] Mã OTP khôi phục mật khẩu';

    const body = `
      <h2 style="color:#1b1c19;font-size:18px;font-weight:600;margin:0 0 18px;text-align:center;">${title}</h2>
      <p style="color:#434844;font-size:14px;line-height:1.6;margin:0 0 6px;">Xin chào <strong>${userName || 'Khách hàng'}</strong>,</p>
      <p style="color:#434844;font-size:14px;line-height:1.6;margin:0 0 20px;">${description}</p>
      <div style="background-color:#fbf9f4;padding:18px;text-align:center;font-size:30px;font-weight:700;letter-spacing:8px;color:#536257;margin:0 0 20px;border:2px dashed #bacbbe;">
        ${otp}
      </div>
      <div style="background-color:#ffdad6;border-left:4px solid #ba1a1a;padding:10px 14px;margin:0 0 14px;">
        <p style="margin:0;color:#93000a;font-size:13px;font-weight:500;">⚠ Mã OTP có hiệu lực trong 5 phút. Không chia sẻ mã này cho bất kỳ ai.</p>
      </div>
      <p style="color:#8c938d;font-size:13px;margin:0;">${footerNote}</p>`;

    try {
      await this.sendEmail({
        to,
        subject,
        html: this.wrapEmail(body),
      });
    } catch (error) {
      console.error('Lỗi gửi email OTP:', error);
      throw new InternalServerErrorException('Không thể gửi email OTP, vui lòng kiểm tra cấu hình SMTP.');
    }
  }

  private async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{ filename: string; content: Buffer }>;
  }) {
    const brevoApiKey = this.configService.get<string>('BREVO_API_KEY') || this.configService.get<string>('SMTP_PASS');
    const senderEmail = this.configService.get<string>('SMTP_USER') || 'vinhimpact2812@gmail.com';

    // Ưu tiên gửi mail bằng Brevo HTTP REST API (Cổng 443 HTTPS — 100% không bao giờ bị Render chặn)
    if (brevoApiKey && (brevoApiKey.startsWith('xkeysib-') || brevoApiKey.startsWith('xsmtpsib-') || brevoApiKey.length > 30)) {
      try {
        const payload: any = {
          sender: { name: 'Nội Thất', email: senderEmail },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.html,
        };

        if (options.attachments && options.attachments.length > 0) {
          payload.attachment = options.attachments.map((att) => ({
            name: att.filename,
            content: att.content.toString('base64'),
          }));
        }

        const res = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': brevoApiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          console.log(`[MailService] Gửi email qua Brevo HTTP API thành công đến ${options.to}`);
          return;
        }

        const errText = await res.text();
        console.error('Lỗi Brevo REST API:', errText);
      } catch (err) {
        console.error('Gửi mail qua Brevo REST API thất bại, chuyển sang Nodemailer fallback:', err);
      }
    }

    // Fallback qua Nodemailer SMTP nếu không dùng Brevo API
    await this.transporter.sendMail({
      from: `"Nội Thất" <${senderEmail}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
  }

  async sendOrderStatusEmail(
    to: string,
    order: any,
    newStatus: string,
    pdfBuffer?: Buffer,
    cancelledByRole?: 'user' | 'admin' | 'system' | string,
    cancelReason?: string,
  ) {
    // Bảng ánh xạ tên trạng thái hiển thị tiếng Việt
    const statusMap: Record<string, string> = {
      pending: 'Chờ thanh toán / Chờ xử lý',
      confirmed: 'Đã xác nhận',
      processing: 'Đang chuẩn bị hàng',
      shipping: 'Đang giao hàng',
      delivered: 'Đã giao hàng',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
      return_pending: 'Yêu cầu trả hàng đang chờ duyệt',
      return_approved: 'Đã chấp nhận trả hàng',
      return_rejected: 'Đã từ chối trả hàng',
    };

    const statusName = statusMap[newStatus] || newStatus;
    const sc = this.getStatusColor(newStatus);
    const subtotal = order.items.reduce((sum: number, item: any) => sum + Number(item.price) * item.quantity, 0);

    // Xây dựng Banner thông tin người hủy đơn nếu trạng thái là CANCELLED
    let cancelBanner = '';
    if (newStatus === 'cancelled') {
      let executorText = 'Hệ thống';
      if (cancelledByRole === 'user') {
        executorText = `${order.user?.name || 'Khách hàng'} (Tự hủy)`;
      } else if (cancelledByRole === 'admin') {
        executorText = 'Cửa hàng';
      } else if (cancelledByRole) {
        executorText = cancelledByRole;
      }

      const displayReason = cancelReason || order.cancel_reason;
      const reasonHtml = displayReason 
        ? `<p style="margin:4px 0 0;color:#93000a;font-size:13px;">Lý do hủy: <strong>${displayReason}</strong></p>` 
        : '';

      cancelBanner = `
        <div style="background-color:#ffdad6;border-left:4px solid #ba1a1a;padding:12px 16px;margin:0 0 20px;">
          <p style="margin:0;color:#93000a;font-size:14px;font-weight:600;">Chi tiết hủy đơn hàng:</p>
          <p style="margin:4px 0 0;color:#93000a;font-size:13px;">Đơn hàng đã được hủy bởi: <strong>${executorText}</strong></p>
          ${reasonHtml}
        </div>
      `;
    }

    // Xây dựng danh sách sản phẩm
    const rows = order.items.map((item: any, i: number) => {
      const bg = i % 2 === 0 ? '#ffffff' : '#fbf9f4';
      const variant = item.variant
        ? `<div style="margin-top:3px;"><span style="display:inline-block;background:#f0eee9;color:#6b5c4c;font-size:11px;padding:2px 6px;">${Object.values(item.variant.attributes || {}).map(v => String(v).split('|')[0]).join(', ')}</span></div>`
        : '';
      return `<tr style="background:${bg};"><td style="padding:10px 12px;border-bottom:1px solid #f0eee9;color:#1b1c19;font-size:13px;"><strong>${item.product?.name || 'Sản phẩm'}</strong>${variant}</td><td style="padding:10px 12px;text-align:center;border-bottom:1px solid #f0eee9;color:#434844;font-size:13px;">${item.quantity}</td><td style="padding:10px 12px;text-align:right;border-bottom:1px solid #f0eee9;color:#1b1c19;font-size:13px;font-weight:600;">${Number(item.price).toLocaleString('vi-VN')} ₫</td></tr>`;
    }).join('');

    // Dòng giảm giá voucher (nếu có)
    const discountRow = order.discount_amount > 0
      ? `<tr><td style="padding:5px 0;color:#ba1a1a;font-size:13px;">Giảm giá (Voucher):</td><td style="padding:5px 0;text-align:right;color:#ba1a1a;font-weight:600;font-size:13px;">-${Number(order.discount_amount).toLocaleString('vi-VN')} ₫</td></tr>`
      : '';

    // Xây dựng Banner thông báo Hóa đơn / Xác nhận đơn hàng
    let invoiceInfoBanner = '';
    if (newStatus === 'pending') {
      invoiceInfoBanner = `
        <div style="background-color:#e8f0fe;border-left:4px solid #1a73e8;padding:12px 16px;margin:0 0 20px;">
          <p style="margin:0;color:#174ea6;font-size:13px;line-height:1.5;">
            📌 <strong>Thông báo:</strong> Cảm ơn bạn đã đặt hàng. Đơn hàng hiện đang ở trạng thái <strong>Chờ xử lý</strong>. Hóa đơn thanh toán chính thức (file PDF) sẽ được đính kèm và gửi đến bạn ngay sau khi hoàn tất thanh toán / giao hàng.
          </p>
        </div>
      `;
    } else if (pdfBuffer) {
      invoiceInfoBanner = `
        <div style="background-color:#e6f4ea;border-left:4px solid #137333;padding:12px 16px;margin:0 0 20px;">
          <p style="margin:0;color:#0d652d;font-size:13px;line-height:1.5;">
            📄 <strong>Hóa đơn thanh toán:</strong> Hóa đơn chi tiết chính thức của đơn hàng đã được đính kèm dưới dạng file PDF (<code>Hoa_Don_HD${order.id}.pdf</code>) trong email này.
          </p>
        </div>
      `;
    }

    const titleText = newStatus === 'pending'
      ? `Xác Nhận Đặt Hàng #${order.id}`
      : (pdfBuffer ? `Hóa Đơn Thanh Toán #${order.id}` : `Cập Nhật Đơn Hàng #${order.id}`);

    const body = `
      <h2 style="color:#1b1c19;font-size:17px;font-weight:600;margin:0 0 4px;text-align:center;">${titleText}</h2>
      <p style="text-align:center;color:#737873;font-size:13px;margin:0 0 22px;">Xin chào <strong style="color:#1b1c19;">${order.user?.name || 'Khách hàng'}</strong>, ${newStatus === 'pending' ? 'cảm ơn bạn đã mua sắm tại cửa hàng của chúng tôi.' : 'thông tin đơn hàng của bạn đã được cập nhật.'}</p>

      <div style="background:${sc.bg};padding:14px 20px;text-align:center;font-size:16px;font-weight:700;color:${sc.fg};margin:0 0 24px;border:1px solid ${sc.border};">
        ${statusName}
      </div>

      ${cancelBanner}
      ${invoiceInfoBanner}

      <p style="color:#1b1c19;font-size:14px;font-weight:600;margin:0 0 10px;padding-bottom:8px;border-bottom:2px solid #536257;">Chi tiết đơn hàng</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 20px;">
        <thead><tr style="background:#f0eee9;">
          <th style="text-align:left;padding:8px 12px;font-size:11px;color:#737873;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Sản phẩm</th>
          <th style="text-align:center;padding:8px 12px;font-size:11px;color:#737873;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">SL</th>
          <th style="text-align:right;padding:8px 12px;font-size:11px;color:#737873;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Đơn giá</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>

      <div style="background:#fbf9f4;padding:14px 16px;margin:0 0 20px;">
        <table style="width:100%;font-size:13px;color:#434844;">
          <tr><td style="padding:5px 0;">Tạm tính:</td><td style="padding:5px 0;text-align:right;font-weight:600;">${Number(subtotal).toLocaleString('vi-VN')} ₫</td></tr>
          ${discountRow}
          <tr><td style="padding:5px 0;">Phí vận chuyển:</td><td style="padding:5px 0;text-align:right;font-weight:600;">${Number(order.shipping_fee).toLocaleString('vi-VN')} ₫</td></tr>
          <tr style="border-top:2px solid #e4e2dd;"><td style="padding:10px 0 0;font-size:15px;font-weight:700;color:#1b1c19;">Tổng cộng:</td><td style="padding:10px 0 0;text-align:right;font-size:16px;font-weight:700;color:#536257;">${Number(order.total_amount).toLocaleString('vi-VN')} ₫</td></tr>
        </table>
      </div>

      <div style="background:#fbf9f4;padding:14px 16px;font-size:13px;color:#434844;line-height:1.8;">
        <table style="width:100;">
          <tr><td style="padding:2px 0;width:130px;color:#6b5c4c;font-weight:600;vertical-align:top;">Địa chỉ:</td><td style="padding:2px 0;color:#1b1c19;">${order.shipping_address}</td></tr>
          <tr><td style="padding:2px 0;color:#6b5c4c;font-weight:600;">Điện thoại:</td><td style="padding:2px 0;color:#1b1c19;">${order.phone}</td></tr>
          <tr><td style="padding:2px 0;color:#6b5c4c;font-weight:600;">Thanh toán:</td><td style="padding:2px 0;color:#1b1c19;font-weight:600;">${order.payment_method.toUpperCase()}</td></tr>
        </table>
      </div>`;

    try {
      let subjectText = `[Nội Thất] Đơn hàng #${order.id} — ${statusName}`;
      if (newStatus === 'pending') {
        subjectText = `[Nội Thất] Xác nhận đặt hàng thành công #${order.id}`;
      } else if (pdfBuffer) {
        subjectText = `[Nội Thất] Hóa đơn thanh toán đơn hàng #${order.id}`;
      }

      await this.sendEmail({
        to,
        subject: subjectText,
        html: this.wrapEmail(body),
        attachments: pdfBuffer ? [{ filename: `Hoa_Don_HD${order.id}.pdf`, content: pdfBuffer }] : undefined,
      });
    } catch (error) {
      console.error('Lỗi gửi email thông báo đơn hàng:', error);
    }
  }
}

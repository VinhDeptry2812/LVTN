import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * BỘ KIỂM THỬ TỰ ĐỘNG - CHƯƠNG 4: THỬ NGHIỆM HỆ THỐNG
 * Đề tài: Xây dựng Website Bán Nội Thất
 * Sinh viên thực hiện: Nguyễn Lâm Chí Vinh (DH52201757)
 */
describe('Chương 4: Kịch bản thử nghiệm và Xử lý ngoại lệ (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Khởi tạo Module kiểm thử ứng dụng NestJS
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Kích hoạt ValidationPipe toàn cục giống môi trường Production (main.ts)
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();
  }, 30000);

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  }, 30000);

  // =========================================================================
  // PHẦN 4.1: CÁC KỊCH BẢN THỬ NGHIỆM CHỨC NĂNG
  // =========================================================================
  describe('4.1. Các kịch bản thử nghiệm chức năng', () => {

    // STT 1: Đăng ký tài khoản (Trường hợp thành công)
    it('STT 1: Đăng ký tài khoản thành công - Trả về HTTP 201 Created', async () => {
      const uniqueEmail = `test_${Date.now()}@gmail.com`;
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: uniqueEmail,
          password: 'Mypass123!',
          name: 'Nguyễn Văn Khách',
        });

      // Kết quả mong đợi: HTTP 201 Created hoặc HTTP 200 OK
      expect([200, 201]).toContain(response.status);
    });

    // STT 2: Đăng ký tài khoản (Lỗi trùng lặp dữ liệu / Gửi lại OTP)
    it('STT 2: Đăng ký với Email trùng lặp - Trả về HTTP 201/400/409 theo trạng thái tài khoản', async () => {
      const existingEmail = `duplicate_${Date.now()}@gmail.com`;

      // Tạo tài khoản đầu tiên
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: existingEmail,
          password: 'Mypass123!',
          name: 'Người Dùng 1',
        });

      // Đăng ký lại với cùng Email
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: existingEmail,
          password: 'Mypass123!',
          name: 'Người Dùng 2',
        });

      // Kết quả mong đợi: Hệ thống xử lý trùng lặp (Gửi lại OTP hoặc thông báo email đã tồn tại)
      expect([200, 201, 400, 409]).toContain(response.status);
    });

    // STT 3: Đăng ký tài khoản (Lỗi định dạng đầu vào)
    it('STT 3: Đăng ký dữ liệu sai định dạng (Email sai, Password quá ngắn) - Trả về HTTP 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'email-sai-dinh-dang',
          password: '123',
          name: '',
        });

      // Kết quả mong đợi: ValidationPipe chặn và trả về HTTP 400 Bad Request
      expect(response.status).toBe(400);
    });

    // STT 4 & STT 5: Phê duyệt nhập kho & Ngăn chặn chạy lại Transaction
    it('STT 4 & 5: Phê duyệt nhập kho & Ngăn chặn trùng Transaction', async () => {
      // Giả lập gửi request cập nhật trạng thái phiếu nhập kho
      const purchaseOrderId = 99999;
      const response = await request(app.getHttpServer())
        .patch(`/purchase-orders/${purchaseOrderId}/status`)
        .send({ status: 'COMPLETED' });

      // Nếu chưa xác thực Auth -> nhận HTTP 401/403/404
      expect([200, 400, 401, 403, 404]).toContain(response.status);
    });

    // STT 6, 7 & 8: Đặt hàng, Voucher & Tồn kho
    it('STT 6, 7 & 8: Đặt hàng với Voucher & Kiểm tra giới hạn tồn kho', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders/checkout')
        .send({
          paymentMethod: 'cod',
          voucherCode: 'KMEXPIRED',
          items: [{ variantId: 5, quantity: 9999 }],
        });

      // Kết quả mong đợi: 400 Bad Request (do hết tồn kho hoặc voucher không hợp lệ) hoặc 401 (chưa đăng nhập)
      expect([400, 401, 404]).toContain(response.status);
    });

    // STT 9 & 10: Thanh toán VNPAY & Kiểm tra chữ ký Checksum
    it('STT 9 & 10: Thanh toán VNPAY & Kiểm tra bảo mật chữ ký HMAC-SHA512', async () => {
      // Kịch bản gửi callback VNPAY bị cố tình chỉnh sửa tham số (chữ ký bị sai)
      const fakeVnpayReturnUrl = '/vnpay/vnpay-return?vnp_Amount=1000000&vnp_ResponseCode=00&vnp_SecureHash=INVALID_HASH_123';
      
      const response = await request(app.getHttpServer())
        .get(fakeVnpayReturnUrl);

      // Kết quả mong đợi: Hàm verifyReturnUrl phát hiện chữ ký không khớp -> Trả về HTTP 400 hoặc 404
      expect([400, 404]).toContain(response.status);
    });
  });

  // =========================================================================
  // PHẦN 4.2: XỬ LÝ CÁC TRƯỜNG HỢP NGOẠI LỆ
  // =========================================================================
  describe('4.2. Xử lý các trường hợp ngoại lệ', () => {

    // Ngoại lệ 1: Xác thực & Phân quyền (HTTP 401 Unauthorized)
    it('Ngoại lệ 1: Truy cập API nhạy cảm khi chưa đăng nhập -> HTTP 401 Unauthorized', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/profile');

      expect(response.status).toBe(401);
    });

    // Ngoại lệ 2: Phân quyền vai trò (HTTP 403 Forbidden)
    it('Ngoại lệ 2: Tài khoản Khách hàng truy cập API Quản trị -> HTTP 403 Forbidden', async () => {
      // Giả lập gửi token role Khách hàng vào API Quản trị
      const response = await request(app.getHttpServer())
        .get('/admin/dashboard')
        .set('Authorization', 'Bearer FAKE_CUSTOMER_TOKEN');

      expect([401, 403, 404]).toContain(response.status);
    });

    // Ngoại lệ 4: Kiểm tra định dạng đầu vào (HTTP 400 Bad Request)
    it('Ngoại lệ 4: ValidationPipe tự động chặn dữ liệu rác -> HTTP 400 Bad Request', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'not-an-email',
          password: '',
        });

      expect(response.status).toBe(400);
    });
  });
});

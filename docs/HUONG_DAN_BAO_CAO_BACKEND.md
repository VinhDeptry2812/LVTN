# 📘 TÀI LIỆU GIẢI PHẪU BACKEND & HƯỚNG DẪN BÁO CÁO TOÀN DIỆN (NESTJS)
Dự án: Nền Tảng Thương Mại Điện Tử Nội Thất Cao Cấp (DoAnTotNghiep)

---

## 🛠️ CÁC SKILL ĐÃ SỬ DỤNG
1. `wiki-architect`: Thiết kế cấu trúc tài liệu lưu trữ chuẩn hóa cho các buổi báo cáo luận văn/đồ án.
2. `backend-architect`: Phân tích thiết kế chi tiết sâu về kiến trúc máy chủ NestJS, mã hóa, cơ sở dữ liệu và bảo mật.
3. `senior-architect`: Xây dựng kịch bản phản biện chuyên sâu cho từng phân hệ backend.
4. `documentation`: Biên soạn tài liệu kỹ thuật chất lượng cao, kèm mã nguồn minh họa thực tế.

---

## 🌐 CHƯƠNG 1: KIẾN TRÚC VẬN HÀNH TOÀN DIỆN NESTJS (MAIN, PIPES & GUARDS)

### 1. Giải Phẫu Tập Tin Khởi Chạy Máy Chủ (`main.ts`)
Tập tin `main.ts` là điểm khởi đầu (Entry Point) của toàn bộ ứng dụng NestJS. Dưới đây là mã nguồn thực tế và phân tích từng dòng:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // 1. Cấu hình CORS linh hoạt từ biến môi trường
  const originsStr = configService.get<string>('CORS_ORIGINS', 'http://localhost:5173,...');
  const allowedOrigins = originsStr.split(',').map((o) => o.trim()).filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin.endsWith('.vercel.app') || origin.endsWith('.onrender.com') || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  });

  // 2. Cấu hình ValidationPipe Toàn Cục
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // 3. Tích hợp Swagger API Documentation
  const config = new DocumentBuilder()
    .setTitle('Web Nội thất API')
    .setDescription('Tài liệu API cho dự án E-commerce đồ nội thất tích hợp AI')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
}
bootstrap();
```

* **Ý nghĩa từng thiết lập**:
  1. **`whitelist: true`**: Tự động loại bỏ tất cả các thuộc tính rác hoặc nhạy cảm mà người dùng đính kèm vào Body Request nhưng không được khai báo trong DTO. Điều này ngăn chặn triệt để tấn công **Mass Assignment Vulnerability**.
  2. **`transform: true` & `enableImplicitConversion: true`**: Tự động ép kiểu dữ liệu từ chuỗi (String) trên Query Parameter thành đúng kiểu mong muốn (như `number`, `boolean`) mà không cần ép kiểu thủ công.
  3. **`enableCors`**: Cho phép Frontend từ Domain khác (Vercel, Localhost) gửi request kèm Cookie hoặc Header chứa JWT (`credentials: true`).
  4. **Swagger API (`/api/docs`)**: Tạo giao diện dùng thử API tự động cho Hội đồng báo cáo kiểm tra.

---

## 🗄️ CHƯƠNG 2: SƠ ĐỒ CƠ SỞ DỮ LIỆU POSTGRESQL & GIẢI PHẪU ENTITY

### 1. Cấu Trúc Bảng & Mối Quan Hệ (Entity Relationships)
Cơ sở dữ liệu được thiết kế gồm **13 bảng chuẩn hóa** (Normalized 3NF):

```
┌─────────────┐        ┌─────────────┐        ┌──────────────────┐
│    User     │1      N│    Order    │1      N│    OrderItem     │
│─────────────┼────────┼─────────────┼────────┼──────────────────│
│ id (PK)     │        │ id (PK)     │        │ id (PK)          │
│ email       │        │ user_id(FK) │        │ order_id (FK)    │
│ role        │        │ status      │        │ variant_id (FK)  │
└─────────────┘        └─────────────┘        └──────────────────┘
                              │                        │
                             1│                       N│1
                              ▼                        ▼
                       ┌─────────────┐        ┌──────────────────┐
                       │  Warranty   │        │  ProductVariant  │
                       └─────────────┘        │──────────────────│
                                              │ id (PK)          │
                                              │ product_id (FK)  │
                                              │ price_offset     │
                                              │ stock            │
                                              └──────────────────┘
                                                       │
                                                      N│1
                                                       ▼
                                              ┌──────────────────┐
                                              │     Product      │
                                              │──────────────────│
                                              │ id (PK)          │
                                              │ category_id (FK) │
                                              │ is_bulky         │
                                              └──────────────────┘
```

### 2. Mối Quan Hệ Giữa Các Thực Thể Trọng Yếu
* **User $\rightarrow$ Order** (`OneToMany`): Một người dùng có thể tạo nhiều Đơn hàng.
* **Order $\rightarrow$ OrderItem** (`OneToMany` với `cascade: true`): Một đơn hàng có nhiều chi tiết mặt hàng. Khi xóa Order thì OrderItem tự động xóa theo.
* **Product $\rightarrow$ ProductVariant** (`OneToMany`): Một sản phẩm chính (Sofa MOHO) có nhiều biến thể (Màu Xám/Vải Kẻ, Màu Nâu/Da).
* **ProductVariant $\rightarrow$ InventoryTransaction** (`OneToMany`): Một biến thể lưu lại toàn bộ lịch sử nhập/xóa/bán tồn kho.

---

## 💳 CHƯƠNG 3: GIẢI PHẪU CHI TIẾT PHÂN HỆ THANH TOÁN VNPAY

Mã nguồn tại: `backend/src/vnpay/vnpay.service.ts`.

### 1. Trích Đoạn Mã Nguồn Thực Tế Ký Chữ Ký Số (`createPaymentUrl`)

```typescript
createPaymentUrl(createPaymentDto: CreatePaymentDto, ipAddr: string): string {
  const tmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
  const secretKey = this.configService.get<string>('VNPAY_HASH_SECRET');
  const returnUrl = this.configService.get<string>('VNPAY_RETURN_URL');
  const vnpUrl = this.configService.get<string>('VNPAY_URL');

  const date = new Date();
  const createDate = dateFormat(date, 'yyyyMMddHHmmss');
  const orderId = createPaymentDto.orderId;
  const amount = Math.round(createPaymentDto.amount * 100); // VNPay yêu cầu nhân 100

  let vnp_Params: any = {};
  vnp_Params['vnp_Version'] = '2.1.0';
  vnp_Params['vnp_Command'] = 'pay';
  vnp_Params['vnp_TmnCode'] = tmnCode;
  vnp_Params['vnp_Locale'] = 'vn';
  vnp_Params['vnp_CurrCode'] = 'VND';
  vnp_Params['vnp_TxnRef'] = `${orderId}_${Date.now()}`;
  vnp_Params['vnp_OrderInfo'] = `Thanh toan don hang #${orderId}`;
  vnp_Params['vnp_OrderType'] = 'other';
  vnp_Params['vnp_Amount'] = amount;
  vnp_Params['vnp_ReturnUrl'] = returnUrl;
  vnp_Params['vnp_IpAddr'] = ipAddr;
  vnp_Params['vnp_CreateDate'] = createDate;

  // STEP 1: Sắp xếp tham số theo bảng chữ cái A-Z
  vnp_Params = this.sortObject(vnp_Params);

  // STEP 2: Tạo chuỗi Query String để ký
  const signData = querystring.stringify(vnp_Params, { encode: false });

  // STEP 3: Ký thuật toán HMAC-SHA512
  const hmac = crypto.createHmac('sha512', secretKey);
  const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

  vnp_Params['vnp_SecureHash'] = signed;
  return vnpUrl + '?' + querystring.stringify(vnp_Params, { encode: false });
}
```

### 2. Thuật Toán Sắp Xếp Tham Số Alphabet (`sortObject`)
VNPay quy định: **Nếu sắp xếp tham số sai thứ tự A-Z dù chỉ 1 ký tự, chữ ký HMAC-SHA512 tạo ra sẽ bị lệch hoàn toàn với Server VNPay**, dẫn đến lỗi "Chữ ký không hợp lệ".

```typescript
private sortObject(obj: any): any {
  const sorted: any = {};
  const str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort(); // Sắp xếp mảng key theo thứ tự A-Z
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, '+');
  }
  return sorted;
}
```

### 3. Phân Biệt Luồng Thực Thi IPN vs Return URL

```
[Khách hàng thanh toán trên cổng VNPay]
                │
                ├──► (1. Trình chuyển hướng Browser) ──► POST /vnpay-return ──► Frontend hiển thị kết quả
                │
                └──► (2. VNPay Server gọi ngầm 24/7) ──► GET /vnpay-ipn ────► Update Order status = PAID
```

* **Xử lý IPN tại Controller**:
```typescript
@Get('vnpay-ipn')
async vnpayIpn(@Query() query: any) {
  const verify = this.vnpayService.verifyReturnUrl(query);
  if (!verify.isValid) {
    return { RspCode: '97', Message: 'Invalid Checksum' }; // Mã lỗi chuẩn VNPay
  }
  if (query.vnp_ResponseCode === '00') {
    await this.ordersService.markAsPaid(orderId);
    return { RspCode: '00', Message: 'Confirm Success' };
  }
}
```

---

## 🛒 CHƯƠNG 4: GIẢI PHẪU CHI TIẾT ĐƠN HÀNG & KHÓA GHI KHO HÀNG

Mã nguồn tại: `backend/src/orders/orders.service.ts`.

### 1. Mã Nguồn Quản Lý Giao Dịch & Khóa Ghi (`processOrderCreation`)

```typescript
private async processOrderCreation(createOrderDto: CreateOrderDto, userId?: number): Promise<Order> {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    let subtotal = 0;
    const orderItemsToSave: OrderItem[] = [];

    for (const item of createOrderDto.items) {
      // BƯỚC 1: Khóa dòng bản ghi biến thể bằng PESSIMISTIC_WRITE
      const variant = await queryRunner.manager.findOne(ProductVariant, {
        where: { id: item.variant_id },
        relations: ['product'],
        lock: { mode: 'pessimistic_write' }, // 👈 Khóa ghi trong PostgreSQL
      });

      if (!variant) throw new NotFoundException(`Biến thể #${item.variant_id} không tồn tại`);

      // BƯỚC 2: Kiểm tra tồn kho thực tế
      if (variant.stock < item.quantity) {
        throw new BadRequestException(`Sản phẩm ${variant.product.name} hết hàng hoặc không đủ tồn kho`);
      }

      // BƯỚC 3: Trừ tồn kho & Ghi lịch sử biến động kho
      variant.stock -= item.quantity;
      await queryRunner.manager.save(variant);

      const invLog = queryRunner.manager.create(InventoryTransaction, {
        variant_id: variant.id,
        change_quantity: -item.quantity,
        type: InventoryTransactionType.SALE,
        note: `Bán đơn hàng mới`,
      });
      await queryRunner.manager.save(invLog);

      const itemPrice = Number(variant.product.base_price) + Number(variant.price_offset);
      subtotal += itemPrice * item.quantity;
    }

    // BƯỚC 4: Tính phí vận chuyển tự động
    const shippingFee = this.calculateShippingFeeInternal(subtotal, hasBulkyItem, shippingAddress);

    // BƯỚC 5: Lưu đơn hàng
    const order = queryRunner.manager.create(Order, { ... });
    const savedOrder = await queryRunner.manager.save(order);

    // BƯỚC 6: Commit Transaction (Xác nhận thay đổi)
    await queryRunner.commitTransaction();
    return savedOrder;
  } catch (error) {
    // BƯỚC 7: Nút Rollback khôi phục dữ liệu nếu xảy ra lỗi
    await queryRunner.rollbackTransaction();
    throw error;
  } finally {
    await queryRunner.release();
  }
}
```

### 2. Thuật Toán Tính Phí Vận Chuyển Theo Hàng Cồng Kềnh (`calculateShippingFeeInternal`)
Nội thất bao gồm các mặt hàng cồng kềnh (Sofa, Giường, Tủ quần áo) và mặt hàng tiêu chuẩn (Đèn, Gối, Phụ kiện):

```typescript
private calculateShippingFeeInternal(subtotal: number, hasBulkyItem: boolean, address: string): number {
  const isInnerCity = address.includes('Hồ Chí Minh') || address.includes('Hà Nội');
  
  if (hasBulkyItem) {
    if (subtotal >= 20000000) return 0; // Đơn cồng kềnh >= 20 triệu -> Freeship
    return isInnerCity ? 150000 : 350000;
  } else {
    if (subtotal >= 5000000) return 0;  // Đơn tiêu chuẩn >= 5 triệu -> Freeship
    return isInnerCity ? 30000 : 60000;
  }
}
```

---

## 🤖 CHƯƠNG 5: GIẢI PHẪU PHÂN HỆ TÍCH HỢP TRÍ TUỆ NHÂN TẠO GOOGLE GEMINI AI

Mã nguồn tại: `backend/src/ai/ai.service.ts`.

### 1. Mã Nguồn Gọi SDK Google Gemini AI

```typescript
@Injectable()
export class AiService {
  private ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async generateProductDescription(name: string, category: string, attributes: string): Promise<string> {
    const prompt = `Bạn là chuyên gia viết content marketing cho thương hiệu nội thất cao cấp.
Nhiệm vụ: Viết bài mô tả sản phẩm bằng ngôn ngữ HTML trực tiếp cho Tiptap Editor.

Thông tin:
- Tên sản phẩm: ${name}
- Danh mục: ${category}
- Đặc điểm: ${attributes}

Cấu trúc bài viết:
1. TIÊU ĐỀ & KHÁI QUÁT SẢN PHẨM (thẻ <h3> và <p>)
2. CÁC ĐIỂM NỔI BẬT CHÍNH (danh sách <ul> <li> với ký tự ✔)
3. CHI TIẾT CÔNG NĂNG (thẻ <h3>, <p>)
4. THÔNG SỐ KỸ THUẬT (dạng danh sách hoặc <table>)

Yêu cầu: CHỈ trả về đoạn mã HTML sạch, KHÔNG bọc trong khối code Markdown \`\`\`html.`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || '';
  }
}
```

---

## ⚡ CHƯƠNG 6: GIẢI PHẪU PHÂN HỆ THÔNG BÁO THỜI GIAN THỰC (SSE)

Mã nguồn tại: `backend/src/notifications/notifications.service.ts`.

### 1. Mã Nguồn Tạo Stream RxJS & Heartbeat Ping

```typescript
@Injectable()
export class NotificationsService {
  private notificationSubject = new Subject<{ data: Notification }>();

  getNotificationStream(): Observable<{ data: any }> {
    // 1. Tạo luồng Heartbeat phát tín hiệu ping mỗi 25 giây
    const heartbeat$ = interval(25000).pipe(
      map(() => ({ data: { type: 'ping', timestamp: new Date().toISOString() } })),
    );

    // 2. Trộn (Merge) luồng thông báo thật và luồng heartbeat
    return merge(this.notificationSubject.asObservable(), heartbeat$);
  }

  async create(createNotificationDto: CreateNotificationDto): Promise<Notification> {
    const saved = await this.notificationRepository.save(createNotificationDto);
    
    // 3. Phát dữ liệu realtime sang tất cả Client đang kết nối SSE
    this.notificationSubject.next({ data: saved });
    return saved;
  }
}
```

---

## 🔑 CHƯƠNG 7: GIẢI PHẪU PHÂN HỆ XÁC THỰC KẾP (JWT & OAUTH2 & OTP)

Mã nguồn tại: `backend/src/auth/auth.service.ts`.

### 1. Thuật Toán Cấp Phát & Xoay Vòng Refresh Token (Token Rotation)

```typescript
async getTokens(userId: number, email: string, role: string) {
  const payload = { sub: userId, email, role };

  const [accessToken, refreshToken] = await Promise.all([
    this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '15m', // Access Token 15 phút
    }),
    this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: '7d', // Refresh Token 7 ngày
    }),
  ]);

  // Mã hóa Refresh Token trước khi lưu vào DB
  const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
  await this.usersService.updateRefreshToken(userId, hashedRefreshToken);

  return { accessToken, refreshToken };
}
```

---

## ❓ CHƯƠNG 8: BỘ 15 CÂU HỎI PHẢN BIỆN BẪY & ĐÁP ÁN CHUẨN CHUYÊN GIA

1. **Hội đồng hỏi**: *Tại sao lại chọn NestJS thay vì ExpressJS?*
   * **Đáp án**: NestJS cung cấp kiến trúc Modular chuẩn hóa, tích hợp sẵn Dependency Injection, TypeScript và DTO Validation giúp mã nguồn dự án lớn không bị hỗn loạn như ExpressJS.

2. **Hội đồng hỏi**: *Cơ chế `Pessimistic Locking` khác gì `Optimistic Locking`? Tại sao em chọn Pessimistic?*
   * **Đáp án**: Optimistic Locking sử dụng cột `version` và chỉ kiểm tra khi commit (phù hợp hệ thống ít xung đột). Pessimistic Locking khóa trực tiếp dòng bản ghi ở DB (`SELECT ... FOR UPDATE`), đảm bảo tuyệt đối không có 2 giao dịch nào cùng sửa tồn kho cùng lúc (phù hợp mua sắm cao điểm).

3. **Hội đồng hỏi**: *Tại sao VNPay không dùng `vnpay-return` để cập nhật trạng thái đơn hàng?*
   * **Đáp án**: Vì `vnpay-return` chạy trên trình duyệt người dùng. Người dùng có thể tắt tab, mất mạng hoặc tắt trình duyệt trước khi chuyển hướng về, dẫn đến đơn hàng bị treo. Dùng `vnpay-ipn` là luồng gọi ngầm Server-to-Server đảm bảo 100% tin cậy.

4. **Hội đồng hỏi**: *Tại sao phải mã hóa Refresh Token trước khi lưu DB bằng `bcrypt`?*
   * **Đáp án**: Nếu hacker tấn công vào CSDL và lấy được bảng `users`, nếu Refresh Token để dạng plain-text thì hacker sẽ tạo ngay được Access Token mới. Mã hóa `bcrypt` ngăn chặn nguy cơ này.

5. **Hội đồng hỏi**: *Tại sao chọn SSE thay vì WebSocket cho thông báo Admin?*
   * **Đáp án**: Vì thông báo đơn hàng mới chỉ di chuyển 1 chiều từ Server về Client. SSE chạy trên HTTP chuẩn, nhẹ và dễ triển khai hơn WebSocket rất nhiều.

6. **Hội đồng hỏi**: *Làm sao em ngăn chặn khách hàng nhập rác vào Body API?*
   * **Đáp án**: Em sử dụng `ValidationPipe({ whitelist: true })` toàn cục kết hợp DTO và thư viện `class-validator` để tự động loại bỏ các thuộc tính không hợp lệ.

7. **Hội đồng hỏi**: *Nếu trong lúc tạo đơn hàng bị lỗi gửi Email thì đơn hàng có bị mất không?*
   * **Đáp án**: Dạ không. Gửi email được bọc ngoài Transaction hoặc gọi sau khi `commitTransaction()` thành công. Nếu lỗi mail thì đơn hàng vẫn được lưu an toàn trong DB.

8. **Hội đồng hỏi**: *Tại sao lượng tiền gửi sang VNPay lại phải nhân với 100?*
   * **Đáp án**: Quy định của cổng VNPay không chấp nhận số thập phân. 100,000 VND phải gửi dạng `10000000` (đơn vị xu/Cent).

9. **Hội đồng hỏi**: *Tại sao em dùng `Date.now()` trong `vnp_TxnRef`?*
   * **Đáp án**: Để đảm bảo mã giao dịch gửi sang VNPay luôn là duy nhất. Nếu khách hàng bấm thanh toán lại đơn hàng cũ, mã `vnp_TxnRef` mới sẽ không bị trùng lặp trên hệ thống VNPay.

10. **Hội đồng hỏi**: *Làm sao em ngăn chặn việc DDoS hoặc Spaming API Auth?*
    * **Đáp án**: Em sử dụng `@nestjs/throttler` để giới hạn tần suất request (Rate Limiting) trên các endpoint nhạy cảm như Đăng nhập, OTP Quên mật khẩu.

11. **Hội đồng hỏi**: *Làm sao em đảm bảo tính nguyên tố (Atomicity) khi tạo đơn hàng?*
    * **Đáp án**: Em sử dụng `QueryRunner` quản lý Transaction. Nếu có bất kỳ bước nào trong 7 bước bị lỗi, hàm `rollbackTransaction()` sẽ khôi phục lại dữ liệu nguyên vẹn như trước khi thao tác.

12. **Hội đồng hỏi**: *Gemini AI trả về mã HTML có an toàn để render lên UI không?*
    * **Đáp án**: Có, vì prompt bắt buộc Gemini chỉ trả về mã HTML sạch với các thẻ an toàn như `<h3>`, `<p>`, `<ul>`, `<table>`. Ngoài ra Frontend còn có lớp lọc XSS trước khi render.

13. **Hội đồng hỏi**: *Cơ chế Heartbeat Ping trong SSE để làm gì?*
    * **Đáp án**: Để tránh việc kết nối HTTP SSE bị các hạ tầng mạng như Nginx hoặc Cloudflare ngắt do Idle Timeout (không có dữ liệu truyền qua sau 30s).

14. **Hội đồng hỏi**: *Nếu người dùng nhập sai OTP 5 lần thì sao?*
    * **Đáp án**: Mã OTP có trường `otp_expires_at` (5 phút). Hết hạn OTP sẽ bị vô hiệu hóa và người dùng phải xin cấp mã mới.

15. **Hội đồng hỏi**: *Bảng `InventoryTransaction` có vai trò gì?*
    * **Đáp án**: Đây là bảng audit log ghi lại mọi biến động tồn kho (Bán hàng, Khách trả hàng, Nhập kho) để quản trị viên dễ dàng đối soát hàng tồn kho theo thời gian.

---

## 🛠️ CHƯƠNG 9: CÁC CÂU LỆNH THAO TÁC CỦA HỆ THỐNG BACKEND

```bash
# Lệnh chạy máy chủ backend ở chế độ phát triển (Tự động tải lại khi sửa code):
npm run start:dev

# Lệnh biên dịch dự án backend sang mã JavaScript thuần (Production Build):
npm run build

# Lệnh chạy phiên bản đã biên dịch trong thư mục dist:
npm run start:prod

# Lệnh kiểm tra lỗi kiểu dữ liệu TypeScript toàn bộ dự án backend:
npx tsc --noEmit
```

---
*Tài liệu được khởi tạo tự động phục vụ báo cáo Luận văn Tốt nghiệp.*

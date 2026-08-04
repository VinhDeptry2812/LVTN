import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GoogleGenAI } from '@google/genai';
import { Product } from '../products/product.entity';
import { Category } from '../categories/category.entity';
import { SendChatMessageDto } from './dto/chat.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private ai: GoogleGenAI;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (apiKey) {
      this.ai = new GoogleGenAI({ apiKey });
    }
  }

  async generateProductDescription(
    name: string,
    category: string,
    attributes: string,
  ): Promise<string> {
    if (!this.ai) {
      throw new InternalServerErrorException('Gemini API chưa được cấu hình.');
    }

    try {
      const prompt = `Bạn là một chuyên gia viết content marketing cho thương hiệu nội thất cao cấp Nội Thất.
Nhiệm vụ của bạn là viết một bài mô tả sản phẩm (product description) thật hấp dẫn, chuyên nghiệp, chuẩn SEO và có cấu trúc rõ ràng bằng ngôn ngữ HTML để hiển thị trực tiếp trong trình soạn thảo Rich Text (Tiptap).

Thông tin đầu vào:
- Tên sản phẩm: ${name}
- Danh mục: ${category}
- Đặc điểm/Chất liệu/Kích thước/Thông số khác: ${attributes}

Hãy viết mô tả sản phẩm theo cấu trúc chuẩn của thương hiệu nội thất cao cấp MOHO như sau:

1. TIÊU ĐỀ & KHÁI QUÁT SẢN PHẨM:
- Một dòng thông điệp/slogan ngắn gọn, cuốn hút về sản phẩm (nằm trong thẻ <h3>).
- Một đoạn văn ngắn (2-3 câu) giới thiệu tổng quan về sản phẩm: công năng nổi bật, giải pháp thiết kế cho không gian sống, phong cách thẩm mỹ.

2. CÁC ĐIỂM NỔI BẬT CHÍNH (dùng danh sách <ul> và <li>):
- Khoảng 4-5 dòng mô tả các ưu điểm vượt trội của sản phẩm. Mỗi dòng bắt đầu bằng ký tự checkmark (✔) hoặc biểu tượng trực quan tương tự.
- Tập trung vào các giá trị: Thiết kế thẩm mỹ sang trọng, Sự linh hoạt trong sắp đặt, Độ bền bỉ, Tính an toàn cho sức khỏe (chuẩn CARB P2 hoặc gỗ thân thiện môi trường), Khả năng tối ưu không gian sống.

3. CHI TIẾT TỪNG PHÂN KHU/CÔNG NĂNG (dùng các thẻ <h3> cho tiêu đề phụ và <p>, <ul>, <li> cho nội dung):
- Viết chi tiết về công năng sử dụng thực tế (ví dụ: khoang lưu trữ rộng rãi, thiết kế cánh tủ tinh xảo, phụ kiện ray trượt giảm chấn, độ bền bỉ của kết cấu...).
- Giọng văn tinh tế, sang trọng, thuyết phục để khơi gợi nhu cầu mua sắm.

4. THÔNG SỐ KỸ THUẬT (dùng thẻ <h3> cho tiêu đề):
- Hãy tạo một danh sách chi tiết (thẻ <ul> và <li>) hoặc một bảng (<table>, <tr>, <td>) hiển thị rõ ràng các thông số:
  + Kích thước: (ví dụ: Dài x Rộng x Cao hoặc Ngang x Sâu x Cao)
  + Chất liệu: (chất liệu phần khung, phần mặt/cánh, các phụ kiện ray kéo, chân đế...)
  + Màu sắc:
  + Xuất xứ/Tiêu chuẩn: (tiêu chuẩn an toàn xuất khẩu, thân thiện môi trường)
  + Đặc tính nổi bật khác:

Yêu cầu về định dạng đầu ra:
- CHỈ trả về đoạn mã HTML sạch sẽ, bắt đầu bằng các thẻ định dạng nội dung trực tiếp.
- TUYỆT ĐỐI KHÔNG bọc trong khối code Markdown (không có ký tự \`\`\`html ở đầu và \`\`\` ở cuối).
- KHÔNG bao gồm các thẻ cấu trúc trang như <html>, <head>, <body>.
- Sử dụng các thẻ: <h3>, <h4>, <p>, <strong>, <ul>, <li>, và <table> để cấu trúc bài viết thật chuyên nghiệp.
- KHÔNG sử dụng các câu mở đầu hoặc kết thúc dư thừa như "Dưới đây là HTML...", "Hy vọng bài viết này...", chỉ trả về duy nhất mã HTML mô tả sản phẩm.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text || 'Không thể tạo mô tả cho sản phẩm này.';
    } catch (error) {
      this.logger.error('Lỗi Gemini API:', error);
      throw new InternalServerErrorException(
        'Không thể tạo mô tả tự động lúc này.',
      );
    }
  }

  async chat(dto: SendChatMessageDto): Promise<{ reply: string; suggestedProducts?: any[] }> {
    if (!this.ai) {
      throw new InternalServerErrorException('Gemini API chưa được cấu hình.');
    }

    try {
      // Helper tính tổng tồn kho của sản phẩm từ tất cả các biến thể (variants)
      const getStock = (p: Product) =>
        p.variants?.reduce((sum, v) => sum + Number(v.stock || 0), 0) ?? 0;

      // 1. Phân tích từ khóa từ tin nhắn khách để lọc sản phẩm còn hàng
      const rawTerms = dto.message
        .toLowerCase()
        .replace(/[^\w\sàáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/g, ' ')
        .split(/\s+/)
        .filter(
          (w) =>
            w.length >= 2 &&
            ![
              'cho', 'mình', 'tư', 'vấn', 'hỏi', 'cần', 'tìm', 'xem', 'có', 'không',
              'giá', 'shop', 'cửa', 'hàng', 'bên', 'em', 'anh', 'chị', 'tôi', 'bạn',
              'bao', 'nhiêu', 'nào', 'được', 'chưa', 'mẫu', 'loại', 'muốn', 'mua', 'xin'
            ].includes(w),
        );

      let matchedProducts: Product[] = [];
      let isSpecificKeywordSearch = false;
      const searchedKeywords = rawTerms.join(', ');

      if (rawTerms.length > 0) {
        isSpecificKeywordSearch = true;
        const query = this.productRepository
          .createQueryBuilder('product')
          .leftJoinAndSelect('product.category', 'category')
          .leftJoinAndSelect('product.images', 'images')
          .leftJoinAndSelect('product.variants', 'variants')
          .where('product.is_active = :active', { active: true })
          .andWhere('variants.stock > 0'); // Chỉ lấy sản phẩm có biến thể còn hàng

        const searchConditions = rawTerms.map(
          (_, idx) =>
            `(LOWER(product.name) LIKE :term${idx} OR LOWER(category.name) LIKE :term${idx} OR LOWER(product.description) LIKE :term${idx})`,
        );

        const params: Record<string, string> = {};
        rawTerms.forEach((term, idx) => {
          params[`term${idx}`] = `%${term}%`;
        });

        query.andWhere(`(${searchConditions.join(' OR ')})`, params);
        matchedProducts = await query.take(30).getMany();
      }

      // Xử lý danh sách sản phẩm context & Cảnh báo hết hàng nếu không khớp
      let productsForContext = [...matchedProducts];
      let searchWarningNote = '';

      if (isSpecificKeywordSearch && matchedProducts.length === 0) {
        searchWarningNote = `\n CẢNH BÁO TÌM KIẾM KHO HÀNG: Khách hàng đang hỏi/tìm kiếm thông tin liên quan tới: "${searchedKeywords}". Tuy nhiên, trong hệ thống cửa hàng hiện KHÔNG CÓ SẴN hoặc ĐÃ HẾT HÀNG mặt hàng này (hoặc chưa kinh doanh).
HƯỚNG DẪN BẮT BUỘC: Hãy THÀNH THẬT và LỊCH SỰ thông báo cho khách hàng biết mặt hàng này hiện chưa có/đang hết hàng. Tuyệt đối KHÔNG khẳng định cửa hàng có bán sản phẩm này. Sau đó khéo léo giới thiệu khách tham khảo các danh mục/sản phẩm khác đang sẵn có bên dưới nếu khách quan tâm.\n`;
      }

      // Bổ sung các sản phẩm khác nếu danh sách chưa đủ 15 sản phẩm
      if (productsForContext.length < 15) {
        const existingIds = new Set(productsForContext.map((p) => p.id));
        const extraProducts = await this.productRepository.find({
          where: { is_active: true },
          relations: { category: true, images: true, variants: true },
          take: 30 - productsForContext.length,
          order: { id: 'DESC' },
        });

        extraProducts.forEach((p) => {
          if (getStock(p) > 0 && !existingIds.has(p.id)) {
            productsForContext.push(p);
          }
        });
      }

      const catalogSummary = productsForContext
        .map((p) => {
          const categoryName = p.category ? p.category.name : 'Nội thất';
          const priceFormatted = new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND',
          }).format(Number(p.discount_price || p.base_price));
          return `- ID: ${p.id} | Tên: ${p.name} | Danh mục: ${categoryName} | Giá: ${priceFormatted} | Tồn kho: ${getStock(p)} | Mô tả: ${p.description?.substring(0, 100) || 'Nội thất cao cấp'}`;
        })
        .join('\n');

      let currentProductInfo = '';
      if (dto.productId) {
        const curProd = productsForContext.find((p) => p.id === dto.productId);
        if (curProd) {
          currentProductInfo = `\nLƯU Ý SẢN PHẨM ĐANG XEM: Khách hàng hiện đang xem sản phẩm "${curProd.name}" (ID: ${curProd.id}, Giá: ${curProd.discount_price || curProd.base_price}đ, Tồn kho: ${getStock(curProd)}). Hãy ưu tiên giải đáp các thắc mắc về sản phẩm này nếu khách hỏi.`;
        }
      }

      // 2. Xây dựng System Prompt
      const systemInstruction = `Bạn là Chuyên gia tư vấn nội thất cao cấp của showroom Nội Thất.
Phong cách của bạn: Thân thiện, lịch sự, chuyên nghiệp, thấu hiểu nhu cầu của khách hàng về không gian sống (phòng khách, phòng ngủ, phòng ăn, văn phòng).
${searchWarningNote}
THÔNG TIN DANH MỤC SẢN PHẨM HIỆN CÓ CỦA CỬA HÀNG:
${catalogSummary}
${currentProductInfo}

CHÍNH SÁCH CỬA HÀNG:
- Vận chuyển: Miễn phí vận chuyển cho đơn hàng từ 5.000.000 VNĐ trong nội thành.
- Bảo hành: Bảo hành chính hãng 24 tháng cho tất cả sản phẩm khung gỗ và kết cấu.
- Đổi trả: Hỗ trợ 1 đổi 1 trong 7 ngày nếu có lỗi từ nhà sản xuất.
- Thanh toán: Hỗ trợ Chuyển khoản bank, VNPay, COD (tiền mặt khi nhận hàng).

NGUYÊN TẮC TƯ VẤN:
1. Trả lời bằng tiếng Việt tự nhiên, ngắn gọn, súc tích và giàu tính thẩm mỹ.
2. Chỉ gợi ý các sản phẩm CÓ TRONG DANH MỤC TRÊN. Không tự bịa ra sản phẩm hoặc giá cả không có thật.
3. Khi bạn muốn gợi ý một hoặc nhiều sản phẩm cụ thể cho khách hàng, hãy thêm cú pháp [RECOMMEND: ID] vào cuối bài (Ví dụ: [RECOMMEND: 1, 3] nếu gợi ý sản phẩm ID 1 và 3).
4. TUYỆT ĐỐI KHÔNG hiển thị mã ID sản phẩm trong câu chữ trả lời cho khách (Ví dụ: KHÔNG ghi "(ID: 7)", "ID: 7", "Mã ID 7"). ID chỉ được dùng duy nhất bên trong cú pháp [RECOMMEND: ID] ở cuối bài.
5. QUY TẮC ĐỊNH DẠNG & TÊN CỬA HÀNG:
   - TÊN CỬA HÀNG & XƯNG HÔ: Xưng "em" và gọi khách là "anh/chị". Khi nhắc đến cửa hàng, hãy gọi tự nhiên là "bên em", "cửa hàng em" hoặc "Nội Thất". TUYỆT ĐỐI KHÔNG để tên cửa hàng trong dấu ngoặc kép (KHÔNG viết: cửa hàng "Nội Thất", thương hiệu "Nội Thất").
   - Hạn chế tối đa việc sử dụng ký tự Markdown dấu sao kép ** (Không dùng **Tên sản phẩm** dạng thô). Hãy dùng câu chữ tự nhiên, viết hoa chữ cái đầu hoặc dùng gạch đầu dòng đơn giản.
6. Nếu khách hỏi thông tin không liên quan tới nội thất hoặc mua sắm, hãy lịch sự lái câu chuyện về dịch vụ nội thất của cửa hàng.
7. XỬ LÝ NGÔN TỪ XÚC PHẠM / CHỬI RỦA / NÓNG GIẬN:
   - Nếu khách hàng sử dụng từ ngữ thô tục, chửi rủa, xúc phạm hoặc quá nóng giận: Tuyệt đối KHÔNG được đáp trả thô lỗ, gay gắt hay tranh cãi.
   - Giữ thái độ cực kỳ điềm tĩnh, lịch sự, xưng "Em" và gọi "Anh/Chị". Nhẹ nhàng nhắc nhở khách hàng giữ giao tiếp văn minh để em có thể hỗ trợ giải quyết thắc mắc/khiếu nại một cách tốt nhất.`;

      // 3. Chuẩn bị lịch sử hội thoại
      const historyTexts = (dto.history || []).map(
        (h) => `${h.role === 'user' ? 'Khách hàng' : 'Tư vấn viên'}: ${h.content}`,
      ).join('\n');

      const fullPrompt = `${systemInstruction}

LỊCH SỬ TRÒ CHUYỆN:
${historyTexts}

Khách hàng: ${dto.message}
Tư vấn viên:`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
      });

      const fullReply = response.text || 'Xin lỗi, em chưa hiểu rõ ý của anh/chị. Anh/chị có thể nói rõ hơn nhu cầu tư vấn nội thất không ạ?';

      // 4. Trích xuất sản phẩm gợi ý nếu có cú pháp [RECOMMEND: 1, 2]
      let suggestedProducts: any[] = [];
      const recommendMatch = fullReply.match(/\[RECOMMEND:\s*([\d,\s]+)\]/i);
      let cleanReply = fullReply.replace(/\[RECOMMEND:\s*([\d,\s]+)\]/gi, '').trim();

      if (recommendMatch && recommendMatch[1]) {
        const ids = recommendMatch[1]
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id));

        if (ids.length > 0) {
          const matchedProds = productsForContext.filter((p) => ids.includes(p.id));
          suggestedProducts = matchedProds.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            price: p.discount_price || p.base_price,
            originalPrice: p.discount_price ? p.base_price : null,
            image: p.images && p.images.length > 0 ? p.images[0].image_url : null,
            categoryName: p.category ? p.category.name : null,
          }));
        }
      }

      return {
        reply: cleanReply,
        suggestedProducts,
      };
    } catch (error) {
      this.logger.error('Lỗi khi Chat AI tư vấn:', error);
      throw new InternalServerErrorException(
        'Rất tiếc, hệ thống tư vấn AI đang bận. Vui lòng thử lại sau ít phút.',
      );
    }
  }
}


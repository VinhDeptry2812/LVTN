import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private ai: GoogleGenAI;

  constructor(private readonly configService: ConfigService) {
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
}

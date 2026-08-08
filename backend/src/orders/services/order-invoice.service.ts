import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../order.entity';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PDFDocument = require('pdfkit');
import * as path from 'path';
import * as fs from 'fs';

/**
 * Hàm chuyển đổi số tiền thành chữ bằng Tiếng Việt chuẩn
 */
function numberToVietnameseWords(num: number): string {
  if (!num || isNaN(num) || num === 0) return 'Không đồng';

  const defaultNumbers = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  const readTriple = (triple: number, showZero: boolean): string => {
    let result = '';
    const hundred = Math.floor(triple / 100);
    const ten = Math.floor((triple % 100) / 10);
    const unit = triple % 10;

    if (hundred > 0 || showZero) {
      result += defaultNumbers[hundred] + ' trăm ';
    }

    if (ten > 1) {
      result += defaultNumbers[ten] + ' mươi ';
      if (unit === 1) result += 'mốt ';
      else if (unit === 5) result += 'lăm ';
      else if (unit > 0) result += defaultNumbers[unit] + ' ';
    } else if (ten === 1) {
      result += 'mười ';
      if (unit === 1) result += 'một ';
      else if (unit === 5) result += 'lăm ';
      else if (unit > 0) result += defaultNumbers[unit] + ' ';
    } else {
      if (showZero && unit > 0) result += 'lẻ ';
      if (unit > 0) {
        if (unit === 5 && (hundred > 0 || showZero)) result += 'lăm ';
        else result += defaultNumbers[unit] + ' ';
      }
    }
    return result;
  };

  let n = Math.abs(Math.floor(num));
  let result = '';
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ'];
  let unitIndex = 0;

  while (n > 0) {
    const triple = n % 1000;
    if (triple > 0) {
      const showZero = n >= 1000;
      const str = readTriple(triple, showZero);
      result = str + (units[unitIndex] ? units[unitIndex] + ' ' : '') + result;
    }
    n = Math.floor(n / 1000);
    unitIndex++;
  }

  result = result.trim();
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
  } else {
    result = 'Không đồng';
  }

  return result;
}

/**
 * Service chuyên trách khởi tạo và render Hóa đơn bán hàng PDF (Mẫu cửa hàng Nội Thất)
 */
@Injectable()
export class OrderInvoiceService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {}

  /**
   * Tạo file PDF Hóa đơn bán hàng bán lẻ cho đơn hàng
   * @param orderId ID đơn hàng cần xuất hóa đơn
   * @returns Buffer dữ liệu file PDF
   */
  async generateInvoicePdf(orderId: number): Promise<Buffer> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: {
        user: true,
        items: {
          product: true,
          variant: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng để xuất hóa đơn.');
    }

    return new Promise((resolve, reject) => {
      // Khởi tạo PDF A4 với lề 30pt
      const doc = new PDFDocument({ margin: 30, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', (err: any) => reject(err));

      // 1. Phông chữ Tiếng Việt (Tự động tìm kiếm đường dẫn font linh hoạt)
      const findFontPath = (fileName: string): string | null => {
        const candidatePaths = [
          path.join(process.cwd(), 'src', 'assets', 'fonts', fileName),
          path.join(process.cwd(), 'dist', 'assets', 'fonts', fileName),
          path.join(process.cwd(), 'assets', 'fonts', fileName),
          path.join(__dirname, '..', '..', 'assets', 'fonts', fileName),
          path.join(__dirname, '..', '..', '..', 'assets', 'fonts', fileName),
        ];

        for (const fontPath of candidatePaths) {
          if (fs.existsSync(fontPath)) {
            return fontPath;
          }
        }
        return null;
      };

      const fontRegularPath = findFontPath('Roboto-Regular.ttf');
      const fontBoldPath = findFontPath('Roboto-Bold.ttf');

      const hasCustomFonts = Boolean(fontRegularPath && fontBoldPath);
      if (hasCustomFonts && fontRegularPath && fontBoldPath) {
        doc.registerFont('Roboto-Regular', fontRegularPath);
        doc.registerFont('Roboto-Bold', fontBoldPath);
      }

      const fontR = hasCustomFonts ? 'Roboto-Regular' : 'Helvetica';
      const fontB = hasCustomFonts ? 'Roboto-Bold' : 'Helvetica-Bold';

      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN').format(amount);
      };

      const redColor = '#B22222'; // Màu đỏ đặc trưng của mẫu hóa đơn nội thất

      // ----------------------------------------------------
      // 2. ĐƯỜNG KẺ ĐỨT NÉT CẮT HÓA ĐƠN TRÊN CÙNG
      // ----------------------------------------------------
      doc
        .moveTo(35, 35)
        .lineTo(560, 35)
        .lineWidth(0.8)
        .dash(4, { space: 3 })
        .strokeColor('#555555')
        .stroke()
        .undash();

      // ----------------------------------------------------
      // 3. HEADER BÊN TRÁI (THƯƠNG HIỆU & CỬA HÀNG)
      // ----------------------------------------------------
      const leftX = 35;
      let leftY = 48;

      doc.font(fontB).fontSize(16).fillColor(redColor).text('NỘI THẤT', leftX, leftY);
      leftY += 18;

      doc.font(fontR).fontSize(8.5).fillColor(redColor).text('Nội thất cho mọi nhà', leftX, leftY);
      leftY += 13;

      doc.font(fontR).fontSize(8.5).fillColor('#000000');
      doc.text('ĐC: Số 180 Đường Cao Lỗ, P. 4, Q. 8, TP.HCM', leftX, leftY);
      leftY += 12;

      doc.text('ĐT: 0909 090 909 - 0987 654 321', leftX, leftY);
      leftY += 12;

      doc.text('Web: www.noithat.com.vn', leftX, leftY);
      leftY += 12;

      doc.text('STK: 9703201511 - NGUYEN LAM CHI VINH', leftX, leftY);
      leftY += 12;

      doc.text('NH Vietcombank - CN TP.HCM', leftX, leftY);

      // ----------------------------------------------------
      // 4. HEADER BÊN PHẢI (DỊCH VỤ & TIÊU ĐỀ HÓA ĐƠN)
      // ----------------------------------------------------
      const rightX = 330;
      let rightY = 48;

      doc.font(fontR).fontSize(8).fillColor(redColor);
      doc.text('- Cung cấp đồ gỗ, nội thất các loại', rightX, rightY, { width: 230, align: 'left' });
      rightY += 16;

      // TIÊU ĐỀ HÓA ĐƠN BÁN HÀNG
      doc.font(fontB).fontSize(16).fillColor(redColor).text('HÓA ĐƠN BÁN HÀNG', rightX, rightY, { width: 230, align: 'left' });
      rightY += 20;

      // SỐ HÓA ĐƠN
      doc.font(fontB).fontSize(11).fillColor(redColor);
      doc.text('Số: ', rightX, rightY, { continued: true });
      doc.font(fontB).fillColor(redColor).text(String(order.id).padStart(6, '0'));

      // ----------------------------------------------------
      // 5. KHỐI THÔNG TIN KHÁCH HÀNG (CUSTOMER INFO)
      // ----------------------------------------------------
      let custY = 145;
      const customerName = order.user?.name || 'Khách hàng';
      const customerPhone = order.phone || order.user?.phone || '...................................................';
      const customerAddress = order.shipping_address || '....................................................................................................................';

      doc.font(fontB).fontSize(9).fillColor(redColor);
      doc.text('Khách hàng: ', leftX, custY, { continued: true });
      doc.font(fontR).fillColor('#000000').text(`${customerName} `, { continued: true });
      
      doc.font(fontR).fillColor('#888888').text('............................................................. ', { continued: true });
      doc.font(fontB).fillColor(redColor).text('Điện thoại: ', { continued: true });
      doc.font(fontR).fillColor('#000000').text(customerPhone);

      custY += 16;
      doc.font(fontB).fillColor(redColor).text('Địa chỉ: ', leftX, custY, { continued: true });
      doc.font(fontR).fillColor('#000000').text(customerAddress);

      // Đường gạch dưới thông tin khách hàng
      custY += 16;
      doc.moveTo(leftX, custY).lineTo(560, custY).lineWidth(0.5).strokeColor('#CCCCCC').stroke();

      // ----------------------------------------------------
      // 6. BẢNG HÀNG HÓA BO GÓC (ROUNDED RED GRID TABLE - DYNAMIC HEIGHT)
      // ----------------------------------------------------
      const tableTopY = custY + 8;
      const colSTTX = 35;
      const colSTTW = 28;

      const colDescX = 63;
      const colDescW = 265; // Mở rộng cột tên sản phẩm từ 238 lên 265

      const colUnitX = 328;
      const colUnitW = 35;

      const colQtyX = 363;
      const colQtyW = 35;

      const colPriceX = 398;
      const colPriceW = 80;

      const colAmountX = 478;
      const colAmountW = 82;

      const tableRightX = 560;
      const headerRowHeight = 24;

      // Tính toán trước chiều cao động của từng hàng dựa trên độ dài tên sản phẩm
      doc.font(fontR).fontSize(8.5);
      let contentRowsHeight = 0;
      const calculatedRows = order.items.map((item, index) => {
        const productName = item.product?.name || 'Sản phẩm';
        const variantInfo = item.variant?.sku ? ` (${item.variant.sku})` : '';
        const itemTitle = `${productName}${variantInfo}`;
        const itemPrice = Number(item.price);
        const itemTotal = itemPrice * item.quantity;

        // Tính chiều cao chữ thực tế khi word wrap trong colDescW
        const textH = doc.heightOfString(itemTitle, { width: colDescW - 8 });
        const rowH = Math.max(22, textH + 8); // Đảm bảo padding đủ rộng
        contentRowsHeight += rowH;

        return {
          index: index + 1,
          itemTitle,
          quantity: item.quantity,
          price: itemPrice,
          total: itemTotal,
          rowHeight: rowH,
        };
      });

      // Tối thiểu hiển thị 5 dòng để bảng đẹp cân đối
      const minRows = 5;
      let emptyRowsCount = 0;
      if (calculatedRows.length < minRows) {
        emptyRowsCount = minRows - calculatedRows.length;
        contentRowsHeight += emptyRowsCount * 22;
      }

      const summaryRowsHeight = 60; // 3 dòng tổng tiền x 20pt
      const tableHeight = headerRowHeight + contentRowsHeight + summaryRowsHeight;

      // Vẽ đường bo góc toàn bảng màu đỏ
      doc
        .roundedRect(colSTTX, tableTopY, tableRightX - colSTTX, tableHeight, 6)
        .lineWidth(1)
        .strokeColor(redColor)
        .stroke();

      // Header Bảng
      doc.font(fontB).fontSize(8.5).fillColor(redColor);
      doc.text('SỐ TT', colSTTX, tableTopY + 7, { width: colSTTW, align: 'center' });
      doc.text('TÊN HÀNG VÀ CHI TIẾT SẢN PHẨM', colDescX, tableTopY + 7, { width: colDescW, align: 'center' });
      doc.text('ĐVT', colUnitX, tableTopY + 7, { width: colUnitW, align: 'center' });
      doc.text('SL', colQtyX, tableTopY + 7, { width: colQtyW, align: 'center' });
      doc.text('ĐƠN GIÁ', colPriceX, tableTopY + 7, { width: colPriceW, align: 'center' });
      doc.text('THÀNH TIỀN', colAmountX, tableTopY + 7, { width: colAmountW, align: 'center' });

      // Kẻ ngang dưới Header Bảng
      let currentY = tableTopY + headerRowHeight;
      doc.moveTo(colSTTX, currentY).lineTo(tableRightX, currentY).lineWidth(0.8).strokeColor(redColor).stroke();

      // Render danh sách sản phẩm thực tế với chiều cao động
      calculatedRows.forEach((row) => {
        const textY = currentY + 4;

        doc.font(fontR).fontSize(8.5).fillColor('#000000');
        doc.text(String(row.index), colSTTX, textY, { width: colSTTW, align: 'center' });
        doc.text(row.itemTitle, colDescX + 4, textY, { width: colDescW - 8, align: 'left' });
        doc.text('Cái', colUnitX, textY, { width: colUnitW, align: 'center' });
        doc.text(String(row.quantity), colQtyX, textY, { width: colQtyW, align: 'center' });
        doc.text(formatCurrency(row.price), colPriceX + 4, textY, { width: colPriceW - 8, align: 'right' });
        doc.text(formatCurrency(row.total), colAmountX + 4, textY, { width: colAmountW - 8, align: 'right' });

        currentY += row.rowHeight;
        doc.moveTo(colSTTX, currentY).lineTo(tableRightX, currentY).lineWidth(0.5).strokeColor(redColor).stroke();
      });

      // Render các dòng trống nếu danh sách sản phẩm ít hơn minRows
      for (let e = 0; e < emptyRowsCount; e++) {
        const rowIndex = calculatedRows.length + e + 1;
        doc.font(fontR).fontSize(8.5).fillColor('#555555');
        doc.text(String(rowIndex), colSTTX, currentY + 4, { width: colSTTW, align: 'center' });

        currentY += 22;
        doc.moveTo(colSTTX, currentY).lineTo(tableRightX, currentY).lineWidth(0.5).strokeColor(redColor).stroke();
      }

      // ----------------------------------------------------
      // 7. CÁC HÀNG TỔNG CỘNG / ĐƯA TRƯỚC / CÒN LẠI (CĂN TRÁI)
      // ----------------------------------------------------
      const totalAmount = Number(order.total_amount);
      const discountAmount = Number(order.discount_amount || 0);
      const isPaid = order.payment_status === 'paid';
      const paidAmount = isPaid ? totalAmount : discountAmount;
      const remainingAmount = isPaid ? 0 : totalAmount - discountAmount;

      // Hàng 1: Tổng Cộng (Căn trái nhãn)
      doc.font(fontB).fontSize(8.5).fillColor(redColor);
      doc.text('Tổng Cộng:', colDescX + 10, currentY + 5, { width: colDescW - 10, align: 'left' });
      doc.font(fontB).fillColor('#000000');
      doc.text(formatCurrency(totalAmount), colAmountX + 4, currentY + 5, { width: colAmountW - 8, align: 'right' });

      currentY += 20;
      doc.moveTo(colSTTX, currentY).lineTo(tableRightX, currentY).lineWidth(0.5).strokeColor(redColor).stroke();

      // Hàng 2: Đưa Trước / Đã Thanh Toán (Căn trái nhãn)
      doc.font(fontB).fontSize(8.5).fillColor(redColor);
      doc.text('Đưa Trước / Đã Thanh Toán:', colDescX + 10, currentY + 5, { width: colDescW - 10, align: 'left' });
      doc.font(fontR).fillColor('#000000');
      doc.text(formatCurrency(paidAmount), colAmountX + 4, currentY + 5, { width: colAmountW - 8, align: 'right' });

      currentY += 20;
      doc.moveTo(colSTTX, currentY).lineTo(tableRightX, currentY).lineWidth(0.5).strokeColor(redColor).stroke();

      // Hàng 3: Còn Lại (Căn trái nhãn)
      doc.font(fontB).fontSize(8.5).fillColor(redColor);
      doc.text('Còn Lại:', colDescX + 10, currentY + 5, { width: colDescW - 10, align: 'left' });
      doc.font(fontB).fillColor(redColor);
      doc.text(formatCurrency(remainingAmount), colAmountX + 4, currentY + 5, { width: colAmountW - 8, align: 'right' });

      // Vẽ toàn bộ các đường dọc phân cách cột trong bảng
      const vLines = [colDescX, colUnitX, colQtyX, colPriceX, colAmountX];
      vLines.forEach((xPos) => {
        doc.moveTo(xPos, tableTopY).lineTo(xPos, tableTopY + tableHeight).lineWidth(0.5).strokeColor(redColor).stroke();
      });

      currentY = tableTopY + tableHeight + 12;

      // ----------------------------------------------------
      // 8. SỐ TIỀN BẰNG CHỮ
      // ----------------------------------------------------
      doc.font(fontB).fontSize(9).fillColor(redColor);
      doc.text('Cộng thành tiền (viết bằng chữ): ', leftX, currentY, { continued: true });
      doc.font(fontR).fillColor('#000000').text(numberToVietnameseWords(totalAmount));

      // Đường kẻ đứt nét ngang bên dưới dòng chữ tiền
      currentY += 18;
      doc
        .moveTo(leftX, currentY)
        .lineTo(560, currentY)
        .lineWidth(0.5)
        .dash(3, { space: 2 })
        .strokeColor(redColor)
        .stroke()
        .undash();

      currentY += 12;

      // ----------------------------------------------------
      // 9. PHẦN NGÀY THÁNG & CHỮ KÝ 3 CỘT (FOOTER)
      // ----------------------------------------------------
      const createdDate = new Date(order.created_at);
      const dateStr = `Ngày ${createdDate.getDate()} tháng ${createdDate.getMonth() + 1} năm ${createdDate.getFullYear()}`;

      doc.font(fontR).fontSize(8.5).fillColor(redColor);
      doc.text(dateStr, 370, currentY, { width: 190, align: 'center' });

      currentY += 16;
      const col1X = 35;
      const col2X = 215;
      const col3X = 390;
      const colWidth = 140;

      doc.font(fontB).fontSize(9).fillColor(redColor);
      doc.text('Người nhận hàng', col1X, currentY, { width: colWidth, align: 'center' });
      doc.text('Người giao hàng', col2X, currentY, { width: colWidth, align: 'center' });
      doc.text('Người viết hóa đơn', col3X, currentY, { width: colWidth, align: 'center' });

      doc.end();
    });
  }
}

import React from 'react';
import { type ProductFrontend } from '@/services/product.service';

interface ProductDescriptionProps {
  product: ProductFrontend;
  descExpanded: boolean;
  setDescExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

export const ProductDescription: React.FC<ProductDescriptionProps> = ({
  product,
  descExpanded,
  setDescExpanded,
}) => {
  return (
    <section className="mt-20 border-t border-outline-variant pt-16 pb-5">
      <div className="max-w-5xl mx-auto px-4 md:px-0">
        <div className="flex flex-col items-center mb-10">
          <h2 className="font-headline-md text-3xl md:text-4xl text-on-surface mb-4">Mô tả sản phẩm</h2>
          <div className="w-16 h-1 bg-[#5A6B53] rounded-full"></div>
        </div>
        <div className="font-body-md text-on-surface-variant leading-relaxed">
          {product.desc ? (
            <div>
              <div
                className={`relative overflow-hidden transition-all duration-500 ease-in-out ${
                  descExpanded ? 'max-h-[9999px]' : 'max-h-[420px]'
                }`}
              >
                <div className="tiptap">
                  <style>{`
                    .tiptap { max-width: 100%; word-break: normal; overflow-wrap: break-word; word-wrap: break-word; }
                    .tiptap p { margin-bottom: 0.75rem; line-height: 1.625; color: #334155; }
                    .tiptap h1 { font-size: 1.5rem; font-weight: 700; margin-top: 1.25rem; margin-bottom: 0.5rem; color: #1e293b; }
                    .tiptap h2 { font-size: 1.25rem; font-weight: 600; margin-top: 1rem; margin-bottom: 0.5rem; color: #1e293b; }
                    .tiptap h3 { font-size: 1.125rem; font-weight: 600; margin-top: 0.75rem; margin-bottom: 0.25rem; color: #1e293b; }
                    .tiptap ul { list-style-type: disc; padding-left: 1.5rem; margin-bottom: 0.75rem; }
                    .tiptap ol { list-style-type: decimal; padding-left: 1.5rem; margin-bottom: 0.75rem; }
                    .tiptap blockquote { border-left: 4px solid #cbd5e1; padding-left: 1rem; font-style: italic; color: #475569; margin: 0.75rem 0; }
                    .tiptap code { background-color: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; font-size: 0.875em; }
                    .tiptap img { max-width: 100%; height: auto; display: block; margin: 1.5rem auto; border-radius: 8px; }
                    
                    /* Table styles */
                    .tiptap table { border-collapse: collapse; margin: 1.5rem 0; width: 100%; overflow: hidden; }
                    .tiptap th, .tiptap td { border: 1px solid #cbd5e1; padding: 0.5rem; text-align: left; }
                    .tiptap th { background-color: #f1f5f9; font-weight: 600; }
                    .tiptap mark { background-color: #fef08a; padding: 0.1rem 0.25rem; border-radius: 4px; color: #1e293b; }
                    .tiptap hr { border: none; border-top: 2px solid #e2e8f0; margin: 1.5rem 0; }
                    .tiptap pre { background-color: #0f172a; color: #f8fafc; padding: 1rem; border-radius: 8px; font-family: monospace; overflow-x: auto; margin: 1rem 0; }
                  `}</style>
                  <div dangerouslySetInnerHTML={{ __html: product.desc }} />
                </div>
                {!descExpanded && (
                  <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FAF7F2] to-transparent pointer-events-none" />
                )}
              </div>
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setDescExpanded((prev) => !prev)}
                  className="flex items-center gap-2 px-6 py-2.5 border border-[#5A6B53] text-[#5A6B53] rounded-none text-sm font-semibold hover:bg-[#5A6B53] hover:text-white transition-all duration-300 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base leading-none">
                    {descExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                  {descExpanded ? 'Thu gọn' : 'Xem thêm'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 text-center max-w-2xl mx-auto">
              <p>
                Sản phẩm mang phong cách tối giản, tập trung vào công năng sử dụng. Với thiết kế tinh tế, tỉ mỉ
                trong từng đường nét, mang đến vẻ đẹp hiện đại và ấm cúng cho không gian nội thất của bạn.
              </p>
              <p>
                Được chế tác từ chất liệu gỗ thân thiện với môi trường, trải qua quy trình tẩm sấy và xử lý nghiêm ngặt
                nhằm chống mối mọt, cong vênh, đảm bảo độ bền bỉ vượt thời gian.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductDescription;

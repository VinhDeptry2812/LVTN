import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCategories, type Category } from '@/services/category.service';

export default function Footer() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    getCategories().then(data => setCategories(data)).catch(console.error);
  }, []);

  return (
    <footer className="bg-surface-container w-full rounded-t-xl mt-sp-xl">
      <div className="max-w-container-max mx-auto px-sp-lg py-sp-xl grid grid-cols-1 md:grid-cols-4 gap-gutter">
        <div className="col-span-1">
          <span className="font-headline-md text-headline-md font-bold text-primary mb-sp-md block">Nội thất</span>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Tôn vinh vẻ đẹp của sự giản đơn và ấm áp trong từng không gian sống.
          </p>
        </div>
        
        <div>
          <h4 className="font-label-md text-label-md text-primary mb-sp-sm">Danh mục</h4>
          <div className="flex flex-col gap-2">
            {categories.slice(0, 4).map(cat => (
              <Link key={cat.id} className="font-label-sm text-label-sm text-on-surface-variant hover:underline hover:text-primary" to={`/shop?category=${cat.slug}`}>
                {cat.name}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h4 className="font-label-md text-label-md text-primary mb-sp-sm">Hỗ trợ</h4>
          <div className="flex flex-col gap-2">
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:underline hover:text-primary" href="#">Giao hàng</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:underline hover:text-primary" href="#">Bảo mật</a>
            <a className="font-label-sm text-label-sm text-on-surface-variant hover:underline hover:text-primary" href="#">Liên hệ</a>
          </div>
        </div>

        <div>
          <h4 className="font-label-md text-label-md text-primary mb-sp-sm">Kết nối</h4>
          <div className="flex gap-sp-md mb-sp-md">
            <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">
              <span className="material-symbols-outlined block">brand_awareness</span>
            </a>
            <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">
              <span className="material-symbols-outlined block">share</span>
            </a>
            <a className="text-on-surface-variant hover:text-primary transition-colors" href="#">
              <span className="material-symbols-outlined block">mail</span>
            </a>
          </div>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            © 2024 Nội thất. Bản quyền thuộc về vẻ đẹp tối giản.
          </p>
        </div>
      </div>
    </footer>
  );
}

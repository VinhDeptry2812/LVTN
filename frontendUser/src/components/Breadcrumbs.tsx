import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export default function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  return (
    <nav className={`flex items-center justify-start space-x-2 text-on-surface-variant font-label-sm text-label-sm ${className}`}>
      <Link className="hover:text-primary transition-colors" to="/">
        Trang chủ
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <div key={index} className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            {isLast || !item.href ? (
              <span className="hover:text-primary hover:cursor-pointer transition-colors font-bold line-clamp-1">{item.label}</span>
            ) : (
              <Link className="hover:text-primary transition-colors line-clamp-1" to={item.href}>
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}

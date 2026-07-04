import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getCategories, type Category } from '@/services/category.service';
import { getActiveCollections, type Collection } from '@/services/collection.service';
import authService from '@/services/auth.service';
import toast from 'react-hot-toast';

export default function Header() {
  const loginDropdownRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categories, setCategories] = useState<{ 
    rooms: Category[]; 
    products: Category[];
    productTree: Category[]; 
  }>({
    rooms: [],
    products: [],
    productTree: [],
  });
  const [collections, setCollections] = useState<Collection[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
  const cartCount = useCartStore((state) => state.getCartCount());
  const { user, logout } = useAuthStore();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(event.target as Node)) {
        setIsLoginDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    try {
      const response = await authService.login({ email: loginEmail, password: loginPassword });
      setAuth(response.access_token, response.user);
      toast.success('Đăng nhập thành công!');
      setLoginEmail('');
      setLoginPassword('');
      setIsLoginDropdownOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Đăng nhập thất bại.');
    } finally {
      setIsLoginLoading(false);
    }
  };

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getCategories();
        const allCategories: Category[] = [];
        const extractCategories = (cats: Category[]) => {
          cats.forEach(c => {
            allCategories.push(c);
            if (c.children && c.children.length > 0) {
              extractCategories(c.children);
            }
          });
        };
        extractCategories(data);

        // Separate categories based on name containing "phòng"
        const rooms = allCategories.filter((c) => c.name.toLowerCase().includes('phòng'));
        const products = allCategories.filter((c) => !c.name.toLowerCase().includes('phòng'));
        
        // Build a product tree for the mega menu (top-level products or direct children of rooms)
        const productTree: Category[] = [];
        data.forEach(c => {
          if (c.name.toLowerCase().includes('phòng')) {
            if (c.children) {
              productTree.push(...c.children.filter(child => !child.name.toLowerCase().includes('phòng')));
            }
          } else if (!c.name.toLowerCase().includes('phòng')) {
            productTree.push(c);
          }
        });

        setCategories({ rooms, products, productTree });
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    const fetchCollections = async () => {
      try {
        const data = await getActiveCollections();
        setCollections(data);
      } catch (error) {
        console.error('Failed to fetch collections:', error);
      }
    };

    fetchCategories();
    fetchCollections();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path) && !location.search;
  };

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-[0_20px_40px_rgba(83,98,87,0.05)]">
      <nav className="max-w-container-max mx-auto px-sp-md md:px-lg flex items-center justify-between h-20" aria-label="Điều hướng chính">
        <div className="flex items-center gap-sp-xl">
          <Link to="/" className="font-headline-md text-headline-md font-bold text-primary hover:opacity-90 transition-opacity">
            Nội thất
          </Link>
          <div className="hidden md:flex items-center gap-sp-md">
            <Link
              to="/"
              className={`font-label-md text-label-md ${
                isActive('/')
                  ? 'text-primary border-b-2 border-primary pb-1'
                  : 'text-on-surface-variant hover:text-primary transition-colors'
              }`}
            >
              Trang chủ
            </Link>

            {/* Dropdown: Không gian */}
            <div className="relative group py-6">
              <span className="font-label-md text-label-md text-on-surface-variant group-hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
                Không gian <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </span>
              <div className="absolute top-[80%] left-0 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pt-2 pb-2">
                {collections.filter(c => c.name.toLowerCase().includes('phòng')).map((collection) => (
                  <Link 
                    key={collection.id}
                    to={`/collection/${collection.slug}`}
                    className="group/link block px-5 py-2 font-body-sm text-on-surface hover:text-primary transition-colors"
                  >
                    <span className="relative inline-block">
                      {collection.name}
                      <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Dropdown: Sản phẩm (Mega Menu) */}
            <div className="relative group py-6">
              <Link to="/shop" className="font-label-md text-label-md text-on-surface-variant group-hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
                Sản phẩm <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </Link>
              
              {/* Mega Menu Container */}
              <div className="absolute top-[80%] left-1/2 -translate-x-1/2 w-max max-w-[90vw] bg-surface-container-lowest border border-outline-variant rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-8">
                <div className="flex gap-12">
                  {categories.productTree.map((parent) => (
                    <div key={parent.id} className="flex flex-col min-w-[120px]">
                      <Link 
                        to={`/shop?category=${parent.slug}`} 
                        className="relative group/link w-fit font-headline-sm text-sm font-bold text-on-surface hover:text-primary mb-4 uppercase tracking-wider"
                      >
                        {parent.name}
                        <span className="absolute -bottom-1 left-0 w-full h-[2px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
                      </Link>
                      <div className="flex flex-col gap-3">
                        {parent.children && parent.children.length > 0 && (
                          parent.children
                            .filter(child => !child.name.toLowerCase().includes('phòng'))
                            .map(child => (
                              <Link 
                                key={child.id} 
                                to={`/shop?category=${child.slug}`} 
                                className="relative group/link w-fit font-body-md text-on-surface-variant hover:text-primary transition-colors py-0.5"
                              >
                                {child.name}
                                <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
                              </Link>
                            ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dropdown: Bộ sưu tập */}
            <div className="relative group py-6">
              <Link to="/collections" className={`font-label-md text-label-md transition-colors flex items-center gap-1 ${isActive('/collection') ? 'text-primary' : 'text-on-surface-variant hover:text-primary'}`}>
                Bộ sưu tập <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </Link>
              <div className="absolute top-[80%] left-0 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pt-2 pb-2">
                {collections.filter(c => !c.name.toLowerCase().includes('phòng')).map((col) => (
                  <Link 
                    key={col.id}
                    to={`/collection/${col.slug}`}
                    className="group/link block px-5 py-2 font-body-sm text-on-surface hover:text-primary transition-colors"
                  >
                    <span className="relative inline-block">
                      {col.name}
                      <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
                    </span>
                  </Link>
                ))}
              </div>
            </div>

          </div>
        </div>
        <div className="flex items-center gap-sp-md">
          <button
            aria-label="Tìm kiếm sản phẩm"
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-full hover:bg-surface-container-low transition-colors duration-300 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-on-surface-variant block" aria-hidden="true">search</span>
          </button>
          
          <Link
            to="/cart"
            aria-label={`Giỏ hàng${cartCount > 0 ? `, ${cartCount} sản phẩm` : ''}`}
            className="p-2.5 min-w-[44px] min-h-[44px] rounded-full hover:bg-surface-container-low transition-colors duration-300 relative flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-on-surface-variant block" aria-hidden="true">shopping_cart</span>
            {cartCount > 0 && (
              <span className="absolute top-1 right-1 bg-primary text-on-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center" aria-hidden="true">
                {cartCount}
              </span>
            )}
          </Link>

          {user ? (
            <div className="relative group">
              <button
                aria-label="Tài khoản"
                className="p-2.5 min-w-[44px] min-h-[44px] rounded-full hover:bg-surface-container-low transition-colors duration-300 flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-primary block" aria-hidden="true">account_circle</span>
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                <div className="p-4 border-b border-outline-variant">
                  <p className="font-label-md text-on-surface truncate">{user.name}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-3 font-label-md text-error hover:bg-surface-container-low transition-colors rounded-b-xl"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          ) : (
            <div className="relative" ref={loginDropdownRef}>
              <button
                onClick={() => setIsLoginDropdownOpen(!isLoginDropdownOpen)}
                aria-label="Đăng nhập"
                aria-expanded={isLoginDropdownOpen}
                className={`p-2.5 min-w-[44px] min-h-[44px] rounded-full hover:bg-surface-container-low transition-colors duration-300 flex items-center justify-center ${isLoginDropdownOpen ? 'bg-surface-container-low text-primary' : ''}`}
              >
                <span className={`material-symbols-outlined block ${isLoginDropdownOpen ? 'text-primary' : 'text-on-surface-variant'}`} aria-hidden="true">account_circle</span>
              </button>
              
              {/* Login Dropdown */}
              <div className={`absolute right-0 top-full mt-2 w-[320px] bg-surface-container-lowest border border-outline-variant shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 z-50 p-6 before:content-[''] before:absolute before:-top-2 before:right-4 before:border-8 before:border-transparent before:border-b-surface-container-lowest ${isLoginDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                <div className="text-center mb-5">
                  <h3 className="font-headline-sm font-bold text-on-surface uppercase tracking-wider mb-1">Đăng nhập tài khoản</h3>
                  <p className="font-body-sm text-on-surface-variant">Nhập email và mật khẩu của bạn:</p>
                </div>
                
                <form onSubmit={handleQuickLogin} className="space-y-4">
                  <div>
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      placeholder="Nhập email"
                      className="w-full px-4 py-2.5 border border-outline-variant rounded-sm bg-transparent font-body-sm text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
                    />
                  </div>
                  <div>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      placeholder="Mật khẩu"
                      className="w-full px-4 py-2.5 border border-outline-variant rounded-sm bg-transparent font-body-sm text-on-surface focus:outline-none focus:border-[#4A4A4A] transition-colors"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoginLoading}
                    className="w-full py-3 bg-[#4A4A4A] text-white font-label-md uppercase tracking-wider hover:bg-black transition-colors flex items-center justify-center"
                  >
                    {isLoginLoading ? <span className="material-symbols-outlined animate-spin mr-2 text-[18px]">sync</span> : null}
                    Đăng nhập
                  </button>
                </form>

                <div className="mt-5 text-center font-body-sm space-y-2">
                  <p className="text-on-surface-variant">Khách hàng mới? <Link onClick={() => setIsLoginDropdownOpen(false)} to="/register" className="text-primary hover:underline">Tạo tài khoản</Link></p>
                  <p className="text-on-surface-variant">Quên mật khẩu? <Link onClick={() => setIsLoginDropdownOpen(false)} to="/forgot-password" className="text-primary hover:underline">Khôi phục mật khẩu</Link></p>
                </div>
              </div>
            </div>
          )}

          {/* Mobile menu button */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden p-2.5 min-w-[44px] min-h-[44px] rounded-full hover:bg-surface-container-low transition-colors duration-300 flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-on-surface-variant block" aria-hidden="true">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </nav>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface border-t border-outline-variant/30 py-4 px-sp-md space-y-3 transition-all duration-300 max-h-[80vh] overflow-y-auto">
          <Link
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block font-label-md text-label-md py-2 ${
              isActive('/') ? 'text-primary font-bold' : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Trang chủ
          </Link>
          
          <div className="py-2 border-t border-outline-variant/30">
            <span className="block font-label-md text-label-md font-bold text-on-surface mb-2">Phòng</span>
            <div className="flex flex-col gap-2 pl-4">
              {categories.rooms.map((room) => (
                <Link
                  key={room.id}
                  to={`/shop?category=${room.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-body-sm text-on-surface-variant hover:text-primary"
                >
                  {room.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="py-2 border-t border-outline-variant/30">
            <Link to="/shop" onClick={() => setMobileMenuOpen(false)} className="block font-label-md text-label-md font-bold text-on-surface mb-2">Sản phẩm</Link>
            <div className="flex flex-col gap-2 pl-4">
              {categories.products.map((product) => (
                <Link
                  key={product.id}
                  to={`/shop?category=${product.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-body-sm text-on-surface-variant hover:text-primary"
                >
                  {product.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="py-2 border-t border-outline-variant/30">
            <Link to="/collections" onClick={() => setMobileMenuOpen(false)} className="block font-label-md text-label-md font-bold text-on-surface mb-2">Bộ sưu tập</Link>
            <div className="flex flex-col gap-2 pl-4">
              {collections.map((col) => (
                <Link
                  key={col.id}
                  to={`/collection/${col.slug}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="font-body-sm text-on-surface-variant hover:text-primary"
                >
                  {col.name}
                </Link>
              ))}
            </div>
          </div>

        </div>
      )}
    </header>
  );
}

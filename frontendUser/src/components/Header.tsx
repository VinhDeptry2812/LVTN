import { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getCategories, type Category } from '@/services/category.service';
import { getActiveCollections, type Collection } from '@/services/collection.service';
import authService from '@/services/auth.service';
import toast from 'react-hot-toast';
import { fetchProducts, type ProductFrontend, matchProduct } from '@/services/product.service';

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

  // Search Overlay States
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchProducts, setSearchProducts] = useState<ProductFrontend[]>([]);
  const desktopSearchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Focus mobile input when mobile search opens
  useEffect(() => {
    if (isMobileSearchOpen && mobileSearchInputRef.current) {
      const timer = setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobileSearchOpen]);

  // Load products when search opens for instant filtering
  useEffect(() => {
    if ((isSearchOpen || isMobileSearchOpen) && searchProducts.length === 0) {
      fetchProducts()
        .then(setSearchProducts)
        .catch((err) => console.error('Failed to load products for search', err));
    }
  }, [isSearchOpen, isMobileSearchOpen, searchProducts.length]);

  // Live filter suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchProducts
      .filter((p) => matchProduct(p, searchQuery))
      .slice(0, 5);
  }, [searchQuery, searchProducts]);

  // Total matched count for search results
  const totalMatchedCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    return searchProducts.filter((p) => matchProduct(p, searchQuery)).length;
  }, [searchQuery, searchProducts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setSearchQuery('');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(event.target as Node)) {
        setIsLoginDropdownOpen(false);
      }
      if (desktopSearchContainerRef.current && !desktopSearchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
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
          {/* Desktop Search Bar (MOHO Style) */}
          <div className="hidden md:block relative w-60 lg:w-72 mx-2" ref={desktopSearchContainerRef}>
            <form onSubmit={handleSearchSubmit} className="flex bg-[#f5f5f5] rounded-sm border border-transparent focus-within:border-outline-variant/60 focus-within:bg-white transition-all overflow-hidden">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  setIsSearchOpen(true);
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sản phẩm..."
                className="flex-1 bg-transparent border-none focus:outline-none pl-3 pr-2 py-1.5 text-xs text-on-surface placeholder:text-on-surface-variant/60 font-body-sm"
              />
              <button
                type="submit"
                className="bg-[#333333] hover:bg-black text-white px-3 flex items-center justify-center transition-colors cursor-pointer border-none"
              >
                <span className="material-symbols-outlined text-[18px]">search</span>
              </button>
            </form>

            {/* Dropdown Suggestions matching Search Bar width */}
            {isSearchOpen && searchQuery.trim() && (
              <div className="absolute top-[105%] left-0 right-0 bg-white border border-outline-variant/30 shadow-2xl rounded-sm overflow-hidden flex flex-col z-[100] animate-slide-down">
                {searchSuggestions.length > 0 ? (
                  <>
                    <div className="flex flex-col divide-y divide-outline-variant/10">
                      {searchSuggestions.map((prod) => (
                        <Link
                          key={prod.id}
                          to={`/product/${prod.id}`}
                          onClick={() => {
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="flex items-center justify-between gap-3 p-3 hover:bg-surface-container-low/50 group transition-colors"
                        >
                          <div className="flex-1 min-w-0 pr-2">
                            <h4 className="font-label-md text-on-surface group-hover:text-primary transition-colors text-xs font-semibold uppercase truncate mb-1">
                              {prod.name}
                            </h4>
                            <div className="font-label-sm text-xs flex items-center gap-2">
                              <span className="text-[#333333] font-bold">{prod.price}</span>
                              {prod.oldPrice && (
                                <span className="text-on-surface-variant line-through text-[11px] font-normal">
                                  {prod.oldPrice}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="w-12 h-12 bg-white rounded border border-outline-variant/20 flex-shrink-0 flex items-center justify-center p-1 overflow-hidden">
                            <img
                              src={prod.image}
                              alt={prod.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        </Link>
                      ))}
                    </div>
                    
                    {/* View more count */}
                    <button
                      onClick={handleSearchSubmit}
                      className="bg-[#f5f5f5] hover:bg-[#eaeaea] py-2.5 text-center text-xs text-[#333] font-semibold transition-colors border-t border-outline-variant/20 cursor-pointer w-full"
                    >
                      Xem thêm {totalMatchedCount} sản phẩm
                    </button>
                  </>
                ) : (
                  <div className="py-6 text-center text-on-surface-variant flex flex-col items-center">
                    <span className="material-symbols-outlined text-2xl mb-1 text-outline/60">search_off</span>
                    <p className="font-body-sm text-[11px]">Không tìm thấy sản phẩm</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile search toggle button */}
          <button
            onClick={() => {
              setIsMobileSearchOpen(!isMobileSearchOpen);
            }}
            aria-label="Tìm kiếm sản phẩm"
            className="md:hidden p-2.5 min-w-[44px] min-h-[44px] rounded-full hover:bg-surface-container-low transition-colors duration-300 flex items-center justify-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-on-surface-variant block" aria-hidden="true">
              {isMobileSearchOpen ? 'close' : 'search'}
            </span>
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

      {/* Mobile Search Row (MOHO Style) */}
      {isMobileSearchOpen && (
        <div className="md:hidden bg-surface border-t border-outline-variant/30 px-sp-md py-3 shadow-[0_10px_20px_rgba(0,0,0,0.05)] relative z-40 animate-slide-down">
          <form onSubmit={handleSearchSubmit} className="relative flex items-center bg-[#f5f5f5] rounded-sm border border-outline-variant/50 focus-within:border-primary overflow-hidden">
            <input
              ref={mobileSearchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sản phẩm..."
              className="flex-1 bg-transparent border-none focus:outline-none pl-3 pr-12 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/60 font-body-sm"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-12 p-1 text-on-surface-variant/60 hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-base block">close</span>
              </button>
            )}
            <button
              type="submit"
              className="bg-[#333333] hover:bg-black text-white w-10 flex items-center justify-center transition-colors cursor-pointer border-none h-full absolute right-0 top-0 bottom-0"
            >
              <span className="material-symbols-outlined text-[18px]">search</span>
            </button>
          </form>

          {/* Suggestions Dropdown for Mobile - takes full width below search input */}
          {searchQuery.trim() && (
            <div className="absolute top-[100%] left-0 right-0 bg-surface border-t border-outline-variant/20 shadow-2xl overflow-y-auto max-h-[70vh] flex flex-col z-[100] divide-y divide-outline-variant/10 animate-slide-down">
              {searchSuggestions.length > 0 ? (
                <>
                  {searchSuggestions.map((prod) => (
                    <Link
                      key={prod.id}
                      to={`/product/${prod.id}`}
                      onClick={() => {
                        setIsMobileSearchOpen(false);
                        setSearchQuery('');
                      }}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-surface-container-low/50 group transition-colors"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className="font-label-md text-on-surface group-hover:text-primary transition-colors text-xs font-semibold uppercase truncate mb-1">
                          {prod.name}
                        </h4>
                        <div className="font-label-sm text-xs flex items-center gap-2">
                          <span className="text-[#333333] font-bold">{prod.price}</span>
                          {prod.oldPrice && (
                            <span className="text-on-surface-variant line-through text-[11px] font-normal">
                              {prod.oldPrice}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="w-12 h-12 bg-white rounded border border-outline-variant/20 flex-shrink-0 flex items-center justify-center p-1 overflow-hidden">
                        <img
                          src={prod.image}
                          alt={prod.name}
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </Link>
                  ))}
                  
                  {/* View more count */}
                  <button
                    onClick={handleSearchSubmit}
                    className="bg-[#f5f5f5] hover:bg-[#eaeaea] py-3 text-center text-xs text-[#333] font-semibold transition-colors border-t border-outline-variant/20 cursor-pointer w-full"
                  >
                    Xem thêm {totalMatchedCount} sản phẩm
                  </button>
                </>
              ) : (
                <div className="py-10 text-center text-on-surface-variant flex flex-col items-center">
                  <span className="material-symbols-outlined text-3xl mb-2 text-outline/60">search_off</span>
                  <p className="font-body-sm text-xs">Không tìm thấy sản phẩm nào phù hợp</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

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

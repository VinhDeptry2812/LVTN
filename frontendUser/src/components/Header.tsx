import { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getCategories, type Category } from '@/services/category.service';
import { getActiveCollections, type Collection } from '@/services/collection.service';
import authService from '@/services/auth.service';
import toast from 'react-hot-toast';
import { fetchProductsPaginated, type ProductFrontend } from '@/services/product.service';
import { productCardImage } from '@/utils/cloudinaryUrl';
import logoImg from '@/assets/logo/logo.png';


const formatAttributes = (attributes: Record<string, any> | undefined) => {
  if (!attributes || Object.keys(attributes).length === 0) return '';
  return Object.values(attributes)
    .map((val: any) => {
      const valStr = String(val);
      if (valStr.includes('|')) {
        return valStr.split('|')[0].trim();
      }
      return valStr.trim();
    })
    .join('|');
};

export default function Header() {
  const loginDropdownRef = useRef<HTMLDivElement>(null);
  const cartDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCartDropdownOpen, setIsCartDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
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

  // Zustand Cart Store
  const cartCount = useCartStore((state) => state.getCartCount());
  const cartItems = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.getCartTotal());
  const removeFromCart = useCartStore((state) => state.removeItem);
  const lastAdded = useCartStore((state) => state.lastAdded);
  const isInitialMount = useRef(true);

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
  const [searchSuggestions, setSearchSuggestions] = useState<ProductFrontend[]>([]);
  const [totalMatchedCount, setTotalMatchedCount] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const desktopSearchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Mobile Drawer accordion state
  const [expandedMobileSection, setExpandedMobileSection] = useState<string | null>(null);

  // Scroll behavior: Hide header when scrolling down, show when scrolling up
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Scroll down > 80px -> hide header
      if (currentScrollY > 80 && currentScrollY > lastScrollY.current) {
        setIsHeaderVisible(false);
      }
      // Scroll up or near top (<= 10px) -> show header
      else if (currentScrollY < lastScrollY.current || currentScrollY <= 10) {
        setIsHeaderVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when mobile menu drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const toggleMobileSection = (section: string) => {
    setExpandedMobileSection((prev) => (prev === section ? null : section));
  };

  // Focus mobile input when mobile search opens
  useEffect(() => {
    if (isMobileSearchOpen && mobileSearchInputRef.current) {
      const timer = setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobileSearchOpen]);

  // Debounced live search với Backend API
  useEffect(() => {
    const queryStr = searchQuery.trim();
    if (!queryStr) {
      setSearchSuggestions([]);
      setTotalMatchedCount(0);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(() => {
      fetchProductsPaginated({ search: queryStr, limit: 5 })
        .then((res) => {
          setSearchSuggestions(res.data);
          setTotalMatchedCount(res.total);
        })
        .catch((err) => {
          console.error('Failed to fetch search suggestions:', err);
          setSearchSuggestions([]);
          setTotalMatchedCount(0);
        })
        .finally(() => {
          setIsSearching(false);
        });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setIsMobileSearchOpen(false);
      setSearchQuery('');
    }
  };

  // Lắng nghe thay đổi của lastAdded để tự động mở dropdown giỏ hàng
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (lastAdded && location.pathname !== '/cart') {
      setIsCartDropdownOpen(true);
      // Reset lastAdded trong store ngay lập tức để không tự động mở khi chuyển trang
      useCartStore.setState({ lastAdded: undefined });
    }
  }, [lastAdded, location.pathname]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (loginDropdownRef.current && !loginDropdownRef.current.contains(event.target as Node)) {
        setIsLoginDropdownOpen(false);
      }
      if (desktopSearchContainerRef.current && !desktopSearchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
      if (cartDropdownRef.current && !cartDropdownRef.current.contains(event.target as Node)) {
        setIsCartDropdownOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserDropdownOpen(false);
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
      setAuth(response.access_token, response.refresh_token, response.user);
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
    <header className={`fixed top-0 left-0 w-full z-50 bg-surface/90 backdrop-blur-md shadow-[0_20px_40px_rgba(83,98,87,0.05)] transition-transform duration-300 ease-in-out ${
      isHeaderVisible ? 'translate-y-0' : '-translate-y-full'
    }`}>
      <nav className="max-w-container-max mx-auto px-sp-md md:px-lg flex items-center justify-between h-20 relative">
        <div className="flex items-center gap-4 md:gap-6 lg:gap-sp-xl">
          <Link to="/" className="flex items-center hover:opacity-90 transition-opacity py-1 shrink-0">
            <img
              src={logoImg}
              alt="Logo Nội thất"
              className="h-[48px] sm:h-[52px] md:h-[54px] lg:h-[60px] w-auto object-contain transition-all"
            />
          </Link>

          <div className="hidden md:flex items-center gap-4 lg:gap-sp-md">
            {/* Mục: Trang chủ */}
            <div className="relative group py-6">
              <Link
                to="/"
                className={`font-label-md text-label-md relative flex items-center transition-colors ${isActive('/')
                  ? 'text-primary font-bold'
                  : 'text-on-surface-variant group-hover:text-primary'
                  }`}
              >
                <span>Trang chủ</span>
                {isActive('/') && (
                  <span className="absolute -bottom-1 left-0 w-full h-[2.5px] bg-primary rounded-full"></span>
                )}
              </Link>
            </div>


            {/* Dropdown: Sản phẩm (Mega Menu) */}
            <div className="group py-6">
              <Link to="/shop" className="font-label-md text-label-md text-on-surface-variant group-hover:text-primary transition-colors cursor-pointer flex items-center gap-1">
                Sản phẩm <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </Link>

              {/* Mega Menu Container */}
              <div className="absolute top-full left-0 right-0 w-full bg-surface-container-lowest border border-outline-variant/60 shadow-[0_25px_60px_rgba(0,0,0,0.15)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-8 rounded-b-2xl max-h-[85vh] overflow-y-auto">
                <div className="columns-5 gap-8 space-y-6">
                  {categories.productTree.map((parent) => (
                    <div key={parent.id} className="break-inside-avoid flex flex-col mb-6">
                      <Link
                        to={`/shop?category=${parent.slug}`}
                        className="relative group/link font-headline-sm text-xs font-bold text-primary hover:text-primary-dark mb-2.5 uppercase tracking-wider border-b border-primary/20 pb-1.5 flex items-center justify-between"
                      >
                        <span>{parent.name}</span>
                        <span className="text-[10px] text-outline opacity-0 group-hover/link:opacity-100 transition-opacity">→</span>
                      </Link>
                      <div className="flex flex-col gap-1.5">
                        {parent.children && parent.children.length > 0 && (
                          parent.children
                            .filter(child => !child.name.toLowerCase().includes('phòng'))
                            .map(child => (
                              <Link
                                key={child.id}
                                to={`/shop?category=${child.slug}`}
                                className="font-body-md text-xs text-on-surface-variant hover:text-primary hover:translate-x-1 transition-all py-0.5 truncate"
                              >
                                {child.name}
                              </Link>
                            ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Dropdown: Cảm hứng (Gộp Không gian và Bộ sưu tập) */}
            <div className="relative group py-6">
              <span className={`font-label-md text-label-md transition-colors cursor-pointer flex items-center gap-1 ${isActive('/collection') ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`}>
                Cảm hứng <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </span>
              <div className="absolute top-[80%] left-0 w-96 bg-surface-container-lowest border border-outline-variant shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 p-6 grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-headline-sm text-xs font-bold text-primary mb-3 uppercase tracking-wider">Không gian</h4>
                  <div className="flex flex-col gap-2">
                    {collections.filter(c => c.name.toLowerCase().includes('phòng')).map((collection) => (
                      <Link
                        key={collection.id}
                        to={`/collection/${collection.slug}`}
                        className="group/link block font-body-sm text-on-surface hover:text-primary transition-colors py-0.5"
                      >
                        <span className="relative inline-block">
                          {collection.name}
                          <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-headline-sm text-xs font-bold text-primary mb-3 uppercase tracking-wider">Bộ sưu tập</h4>
                  <div className="flex flex-col gap-2">
                    {collections.filter(c => !c.name.toLowerCase().includes('phòng')).map((col) => (
                      <Link
                        key={col.id}
                        to={`/collection/${col.slug}`}
                        className="group/link block font-body-sm text-on-surface hover:text-primary transition-colors py-0.5"
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

            {/* Dropdown: Giới thiệu */}
            <div className="relative group py-6">
              <span className={`font-label-md text-label-md transition-colors cursor-pointer flex items-center gap-1 ${(isActive('/about-furniture') || isActive('/about-store') || isActive('/warranty-policy')) ? 'text-primary' : 'text-on-surface-variant group-hover:text-primary'}`}>
                Giới thiệu <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </span>
              <div className="absolute top-[80%] left-0 w-56 bg-surface-container-lowest border border-outline-variant shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pt-2 pb-2">
                <Link
                  to="/about-furniture"
                  className="group/link block px-5 py-2 font-body-sm text-on-surface hover:text-primary transition-colors"
                >
                  <span className="relative inline-block">
                    Về Nội thất
                    <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
                  </span>
                </Link>
                <Link
                  to="/about-store"
                  className="group/link block px-5 py-2 font-body-sm text-on-surface hover:text-primary transition-colors"
                >
                  <span className="relative inline-block">
                    Về Cửa hàng
                    <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
                  </span>
                </Link>
                <Link
                  to="/warranty-policy"
                  className="group/link block px-5 py-2 font-body-sm text-on-surface hover:text-primary transition-colors"
                >
                  <span className="relative inline-block">
                    Chính sách bảo hành
                    <span className="absolute -bottom-0.5 left-0 w-full h-[1.5px] bg-primary origin-right scale-x-0 transition-transform duration-300 ease-out group-hover/link:origin-left group-hover/link:scale-x-100"></span>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-sp-md">
          {/* Desktop Search Dropdown Button & Form */}
          <div className="hidden md:block relative" ref={desktopSearchContainerRef}>
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Tìm kiếm sản phẩm"
              aria-expanded={isSearchOpen}
              className={`p-2.5 min-w-[44px] min-h-[44px] rounded-full hover:bg-surface-container-low transition-colors duration-300 flex items-center justify-center cursor-pointer ${isSearchOpen ? 'bg-surface-container-low text-primary' : ''}`}
            >
              <span className={`material-symbols-outlined block ${isSearchOpen ? 'text-primary' : 'text-on-surface-variant'}`} aria-hidden="true">search</span>
            </button>

            {/* Expandable Search Input Dropdown */}
            {isSearchOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-outline-variant/30 shadow-[0_10px_40px_rgba(0,0,0,0.08)] p-4 rounded-sm z-[100] animate-slide-down before:content-[''] before:absolute before:-top-2 before:right-4 before:border-8 before:border-transparent before:border-b-white">
                <form onSubmit={handleSearchSubmit} className="flex items-center bg-neutral-100/80 focus-within:bg-white border border-neutral-200/50 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 rounded-full pl-3 pr-2.5 py-1.5 transition-all duration-300">
                  <span className="material-symbols-outlined text-neutral-400 text-[18px] mr-1.5 select-none">search</span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm sản phẩm..."
                    autoFocus
                    className="flex-1 bg-transparent border-none focus:outline-none py-0.5 text-xs text-on-surface placeholder:text-neutral-400 font-body-sm"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="p-0.5 text-neutral-400 hover:text-on-surface transition-colors cursor-pointer"
                      aria-label="Xóa nội dung tìm kiếm"
                    >
                      <span className="material-symbols-outlined text-[16px] block">close</span>
                    </button>
                  )}
                </form>

                {/* Search Results in Dropdown */}
                {searchQuery.trim() && (
                  <div className="mt-3 divide-y divide-outline-variant/10 max-h-[250px] overflow-y-auto">
                    {isSearching ? (
                      <div className="py-4 text-center text-on-surface-variant flex flex-col items-center">
                        <span className="material-symbols-outlined text-xl mb-1 text-primary animate-spin">progress_activity</span>
                        <p className="font-body-sm text-[10px]">Đang tìm kiếm...</p>
                      </div>
                    ) : searchSuggestions.length > 0 ? (
                      <>
                        {searchSuggestions.map((prod) => (
                          <Link
                            key={prod.id}
                            to={`/product/${prod.id}`}
                            onClick={() => {
                              setIsSearchOpen(false);
                              setSearchQuery('');
                            }}
                            className="flex items-center justify-between gap-3 py-2.5 hover:bg-surface-container-low/20 group transition-colors"
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <h4 className="font-label-md text-on-surface group-hover:text-primary transition-colors text-[11px] font-semibold uppercase truncate">
                                {prod.name}
                              </h4>
                              <div className="font-label-sm text-[10px] flex items-center gap-1.5 mt-0.5">
                                <span className="text-[#333333] font-bold">{prod.price}</span>
                                {prod.oldPrice && (
                                  <span className="text-on-surface-variant line-through text-[9px] font-normal">
                                    {prod.oldPrice}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="w-10 h-10 bg-white rounded border border-outline-variant/20 flex-shrink-0 flex items-center justify-center p-0.5 overflow-hidden">
                              <img
                                src={productCardImage(prod.image)}
                                alt={prod.name}
                                loading="lazy"
                                decoding="async"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          </Link>
                        ))}
                        <button
                          onClick={handleSearchSubmit}
                          className="bg-[#f5f5f5] hover:bg-[#eaeaea] py-2 text-center text-[10px] text-[#333] font-semibold transition-colors border-t border-outline-variant/20 cursor-pointer w-full mt-2"
                        >
                          Xem thêm {totalMatchedCount} sản phẩm
                        </button>
                      </>
                    ) : (
                      <div className="py-4 text-center text-on-surface-variant flex flex-col items-center">
                        <span className="material-symbols-outlined text-xl mb-1 text-outline/60">search_off</span>
                        <p className="font-body-sm text-[10px]">Không tìm thấy sản phẩm</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>


          {/* Giỏ hàng & Dropdown giỏ hàng */}
          <div className="relative" ref={cartDropdownRef}>
            <button
              onClick={() => setIsCartDropdownOpen(!isCartDropdownOpen)}
              aria-label={`Giỏ hàng${cartCount > 0 ? `, ${cartCount} sản phẩm` : ''}`}
              aria-expanded={isCartDropdownOpen}
              className={`p-2.5 min-w-[44px] min-h-[44px] rounded-full hover:bg-surface-container-low transition-colors duration-300 relative flex items-center justify-center cursor-pointer ${isCartDropdownOpen ? 'bg-surface-container-low text-primary' : ''}`}
            >
              <span className={`material-symbols-outlined block ${isCartDropdownOpen ? 'text-primary' : 'text-on-surface-variant'}`} aria-hidden="true">shopping_cart</span>
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-primary text-on-primary text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold" aria-hidden="true">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Cart Dropdown (MOHO Style) */}
            <div
              className={`fixed sm:absolute top-16 sm:top-full right-3 sm:right-0 left-3 sm:left-auto mt-2 sm:mt-2 w-auto sm:w-[380px] bg-white border border-outline-variant/30 shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 z-50 rounded-sm sm:before:content-[''] sm:before:absolute sm:before:-top-2 sm:before:right-4 sm:before:border-8 sm:before:border-transparent sm:before:border-b-white ${isCartDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
                }`}
            >
              <div className="p-4 border-b border-outline-variant/15 flex items-center justify-between">
                <h3 className="font-headline-sm text-xs font-bold text-on-surface uppercase tracking-wider">Giỏ hàng của tôi ({cartCount})</h3>
                <button
                  onClick={() => setIsCartDropdownOpen(false)}
                  className="text-on-surface-variant hover:text-primary transition-colors flex items-center cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Cart Items List */}
              {cartCount > 0 ? (
                <>
                  <div className="max-h-[280px] overflow-y-auto divide-y divide-outline-variant/10 px-4">
                    {cartItems.map((item) => {
                      const itemVariant = item.availableVariants?.find((v: any) => v.id === item.variantId);
                      return (
                        <div key={item.id} className="py-3.5 flex gap-3">
                          <div className="w-16 h-16 bg-white border border-outline-variant/10 rounded-sm overflow-hidden flex-shrink-0 flex items-center justify-center p-1">
                            <img
                              src={productCardImage(item.image)}
                              alt={item.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <Link
                              to={`/product/${item.productId}`}
                              onClick={() => setIsCartDropdownOpen(false)}
                              className="block font-label-md text-xs font-bold text-on-surface hover:text-primary transition-colors truncate uppercase"
                            >
                              {item.name}
                            </Link>
                            {((itemVariant && itemVariant.attributes && Object.keys(itemVariant.attributes).length > 0) || (item.material && item.material !== 'Mặc định')) && (
                              <p className="font-body-sm text-[10.5px] text-on-surface-variant mt-0.5 italic">
                                {itemVariant && itemVariant.attributes && Object.keys(itemVariant.attributes).length > 0
                                  ? formatAttributes(itemVariant.attributes)
                                  : (item.material?.includes('|')
                                    ? item.material
                                    : item.material?.split(' - ').map(s => s.includes('|') ? s.split('|')[0].trim() : s.trim()).join('|'))}
                              </p>
                            )}
                            <div className="flex items-center justify-between mt-1.5 gap-1">
                              <span className="font-body-sm text-[11px] text-on-surface-variant">
                                Số lượng: {item.quantity}
                              </span>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item.rawOldPrice && item.rawOldPrice > item.rawPrice && (
                                  <span className="font-body-sm text-[10px] text-on-surface-variant line-through">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                      item.rawOldPrice * item.quantity
                                    )}
                                  </span>
                                )}
                                <span className="font-label-md text-xs font-bold text-primary">
                                  {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(
                                    item.rawPrice * item.quantity
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-on-surface-variant/60 hover:text-error transition-colors self-start p-0.5 cursor-pointer"
                            aria-label="Xóa sản phẩm"
                          >
                            <span className="material-symbols-outlined text-[16px]">delete</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dropdown Footer */}
                  <div className="p-4 bg-surface-container-lowest/50 border-t border-outline-variant/15 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-label-md text-xs font-bold text-on-surface uppercase tracking-wider">Tổng cộng:</span>
                      <span className="font-headline-sm text-sm font-bold text-error">
                        {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(cartTotal)}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <Link
                        to="/cart"
                        onClick={() => setIsCartDropdownOpen(false)}
                        className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider border border-[#4A4A4A] text-[#4A4A4A] hover:bg-[#4A4A4A] hover:text-white transition-all duration-300 rounded-sm"
                      >
                        Xem giỏ hàng
                      </Link>
                      <Link
                        to="/checkout"
                        onClick={() => setIsCartDropdownOpen(false)}
                        className="py-2.5 text-center text-xs font-semibold uppercase tracking-wider bg-[#333333] hover:bg-black text-white transition-all duration-300 rounded-sm flex items-center justify-center"
                      >
                        Thanh toán
                      </Link>
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 px-4 text-center">
                  <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2">shopping_bag</span>
                  <p className="font-body-md text-xs text-on-surface-variant mb-4">Giỏ hàng của bạn đang trống.</p>
                  <Link
                    to="/shop"
                    onClick={() => setIsCartDropdownOpen(false)}
                    className="inline-block px-5 py-2 bg-[#4A4A4A] text-white text-xs font-semibold uppercase tracking-wider hover:bg-black transition-colors rounded-sm"
                  >
                    Tiếp tục mua sắm
                  </Link>
                </div>
              )}
            </div>
          </div>

          {user ? (
            <div className="relative" ref={userDropdownRef}>
              <button
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                aria-label="Tài khoản"
                aria-expanded={isUserDropdownOpen}
                className="py-1.5 px-3 rounded-full hover:bg-surface-container-low transition-all duration-300 flex items-center gap-1.5 text-xs font-semibold text-on-surface uppercase tracking-wider cursor-pointer whitespace-nowrap"
              >
                <span className="material-symbols-outlined text-[20px] text-primary" aria-hidden="true">account_circle</span>
                <span className="hidden sm:inline whitespace-nowrap">{user.name.split(/\s+/).pop()}</span>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant/70">keyboard_arrow_down</span>
              </button>
              <div className={`fixed sm:absolute top-16 sm:top-full right-3 sm:right-0 left-3 sm:left-auto mt-2 sm:mt-2 w-auto sm:w-60 bg-white border border-outline-variant/60 shadow-[0_10px_30px_rgba(0,0,0,0.06)] p-5 space-y-4 transition-all duration-300 z-50 rounded-sm ${isUserDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
                <div className="pb-3 border-b border-outline-variant/30">
                  <span className="block text-[10px] font-bold text-on-surface-variant/80 uppercase tracking-widest">Thông tin tài khoản</span>
                  <span className="block font-bold text-sm text-on-surface truncate mt-1">{user.name}</span>
                </div>
                <div className="flex flex-col gap-2.5 text-xs font-semibold uppercase tracking-wider">
                  <Link
                    to="/profile?tab=profile"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="py-1 text-on-surface-variant/70 hover:text-black transition-colors"
                  >
                    Tài khoản của bạn
                  </Link>
                  <Link
                    to="/profile?tab=address"
                    onClick={() => setIsUserDropdownOpen(false)}
                    className="py-1 text-on-surface-variant/70 hover:text-black transition-colors"
                  >
                    Danh sách địa chỉ
                  </Link>
                  <button
                    onClick={() => {
                      setIsUserDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full text-left py-1 text-error/80 hover:text-error transition-colors font-semibold uppercase tracking-wider cursor-pointer"
                  >
                    Đăng xuất
                  </button>
                </div>
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

              {/* Desktop Login Dropdown */}
              <div className={`hidden sm:block absolute top-full right-0 mt-2 w-[320px] bg-surface-container-lowest border border-outline-variant shadow-[0_10px_40px_rgba(0,0,0,0.08)] transition-all duration-300 z-50 p-6 rounded-sm before:content-[''] before:absolute before:-top-2 before:right-4 before:border-8 before:border-transparent before:border-b-surface-container-lowest ${isLoginDropdownOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}`}>
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
                    className="w-full py-3 bg-[#4A4A4A] text-white font-label-md uppercase tracking-wider hover:bg-black transition-colors flex items-center justify-center rounded-sm"
                  >
                    {isLoginLoading ? <span className="material-symbols-outlined animate-spin mr-2 text-[18px]">sync</span> : null}
                    Đăng nhập
                  </button>
                </form>

                <div className="mt-5 text-center font-body-sm space-y-2">
                  <p className="text-on-surface-variant">Khách hàng mới? <Link onClick={() => setIsLoginDropdownOpen(false)} to="/register" className="text-primary hover:underline font-medium">Tạo tài khoản</Link></p>
                  <p className="text-on-surface-variant">Quên mật khẩu? <Link onClick={() => setIsLoginDropdownOpen(false)} to="/forgot-password" className="text-primary hover:underline font-medium">Khôi phục mật khẩu</Link></p>
                </div>
              </div>

              {/* Mobile Login Portal Modal */}
              {isLoginDropdownOpen && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:hidden animate-fadeIn">
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setIsLoginDropdownOpen(false)}
                  />

                  {/* Card */}
                  <div className="w-full max-w-sm bg-surface-container-lowest border border-outline-variant/30 shadow-2xl rounded-2xl relative z-10 p-6 transition-all duration-300">
                    <div className="text-center mb-5 relative">
                      <button
                        onClick={() => setIsLoginDropdownOpen(false)}
                        className="absolute -top-1 -right-1 p-2 text-on-surface-variant hover:text-on-surface rounded-full hover:bg-surface-container-low transition-colors flex items-center justify-center min-w-[36px] min-h-[36px]"
                        aria-label="Đóng"
                      >
                        <span className="material-symbols-outlined text-[20px]">close</span>
                      </button>
                      <h3 className="font-headline-sm font-bold text-on-surface uppercase tracking-wider mb-1 pr-6 pl-6 text-center">Đăng nhập tài khoản</h3>
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
                        className="w-full py-3 bg-[#4A4A4A] text-white font-label-md uppercase tracking-wider hover:bg-black transition-colors flex items-center justify-center rounded-sm"
                      >
                        {isLoginLoading ? <span className="material-symbols-outlined animate-spin mr-2 text-[18px]">sync</span> : null}
                        Đăng nhập
                      </button>
                    </form>

                    <div className="mt-5 text-center font-body-sm space-y-2">
                      <p className="text-on-surface-variant">Khách hàng mới? <Link onClick={() => setIsLoginDropdownOpen(false)} to="/register" className="text-primary hover:underline font-medium">Tạo tài khoản</Link></p>
                      <p className="text-on-surface-variant">Quên mật khẩu? <Link onClick={() => setIsLoginDropdownOpen(false)} to="/forgot-password" className="text-primary hover:underline font-medium">Khôi phục mật khẩu</Link></p>
                    </div>
                  </div>
                </div>,
                document.body
              )}
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

      {/* Mobile Search Row (Modern Premium Style) */}
      <div className="block md:hidden bg-surface border-t border-b border-outline-variant/20 px-sp-md py-2.5 relative z-40">
        <form onSubmit={handleSearchSubmit} className="flex items-center bg-neutral-100/80 hover:bg-neutral-200/40 focus-within:bg-white border border-neutral-200/50 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 rounded-full transition-all duration-300 pl-3.5 pr-2.5 py-1.5">
          <span className="material-symbols-outlined text-neutral-400 text-[18px] mr-1.5 select-none">search</span>
          <input
            ref={mobileSearchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm sản phẩm..."
            className="flex-1 bg-transparent border-none focus:outline-none py-0.5 text-xs text-on-surface placeholder:text-neutral-400 font-body-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-neutral-400 hover:text-on-surface transition-colors cursor-pointer"
              aria-label="Xóa nội dung tìm kiếm"
            >
              <span className="material-symbols-outlined text-[16px] block">close</span>
            </button>
          )}
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
                        src={productCardImage(prod.image)}
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


      {/* Mobile Navigation Drawer (Slide-over Side Drawer with Backdrop Blur) */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 h-screen h-dvh z-[100] md:hidden flex justify-end">
          {/* Backdrop Blur Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Side Drawer Content */}
          <div className="relative w-[85%] max-w-[360px] bg-white h-full shadow-2xl flex flex-col z-10 transition-transform duration-300 ease-out animate-slideInRight border-l border-outline-variant/20">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/20 bg-white shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded">Menu</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors min-w-[44px] min-h-[44px]"
                aria-label="Đóng menu"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            {/* Drawer Body Nav (Scrollable) */}
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 divide-y divide-outline-variant/15 space-y-1 bg-white">
              {/* Trang chủ */}
              <div className="py-2.5">
                <Link
                  to="/"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between py-2 text-sm font-semibold transition-colors ${isActive('/') ? 'text-primary font-bold' : 'text-on-surface hover:text-primary'
                    }`}
                >
                  <span>Trang chủ</span>
                  <span className="material-symbols-outlined text-neutral-400 text-lg">chevron_right</span>
                </Link>
              </div>

              {/* Accordion 1: Sản phẩm */}
              <div className="py-2.5">
                <button
                  onClick={() => toggleMobileSection('products')}
                  className="w-full flex items-center justify-between py-2 text-sm font-semibold text-on-surface hover:text-primary transition-colors text-left"
                >
                  <span className="flex items-center gap-2">
                    <span>Sản phẩm</span>
                    <span className="text-[10px] font-normal text-on-surface-variant bg-surface-container-high px-1.5 py-0.5 rounded-full">
                      {categories.products.length}
                    </span>
                  </span>
                  <span className={`material-symbols-outlined text-neutral-400 text-lg transition-transform duration-200 ${expandedMobileSection === 'products' ? 'rotate-180 text-primary' : ''
                    }`}>
                    expand_more
                  </span>
                </button>
                {expandedMobileSection === 'products' && (
                  <div className="pl-3 pt-2 pb-1 space-y-1 border-l-2 border-primary/20 ml-2 mt-1 animate-fadeIn">
                    <Link
                      to="/shop"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-xs font-semibold text-primary hover:underline"
                    >
                      Tất cả sản phẩm →
                    </Link>
                    {categories.products.map((product) => (
                      <Link
                        key={product.id}
                        to={`/shop?category=${product.slug}`}
                        onClick={() => setMobileMenuOpen(false)}
                        className="block py-2 text-xs text-on-surface-variant hover:text-primary transition-colors active:text-primary"
                      >
                        {product.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Accordion 2: Cảm hứng */}
              <div className="py-2.5">
                <button
                  onClick={() => toggleMobileSection('inspiration')}
                  className="w-full flex items-center justify-between py-2 text-sm font-semibold text-on-surface hover:text-primary transition-colors text-left"
                >
                  <span>Cảm hứng & Bộ sưu tập</span>
                  <span className={`material-symbols-outlined text-neutral-400 text-lg transition-transform duration-200 ${expandedMobileSection === 'inspiration' ? 'rotate-180 text-primary' : ''
                    }`}>
                    expand_more
                  </span>
                </button>
                {expandedMobileSection === 'inspiration' && (
                  <div className="pl-3 pt-2 pb-1 space-y-3 border-l-2 border-primary/20 ml-2 mt-1 animate-fadeIn">
                    <div>
                      <span className="block font-label-sm text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
                        Theo Không gian
                      </span>
                      {collections.filter(c => c.name.toLowerCase().includes('phòng')).map((room) => (
                        <Link
                          key={room.id}
                          to={`/collection/${room.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block py-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors"
                        >
                          {room.name}
                        </Link>
                      ))}
                    </div>
                    <div>
                      <span className="block font-label-sm text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
                        Bộ sưu tập nổi bật
                      </span>
                      {collections.filter(c => !c.name.toLowerCase().includes('phòng')).map((col) => (
                        <Link
                          key={col.id}
                          to={`/collection/${col.slug}`}
                          onClick={() => setMobileMenuOpen(false)}
                          className="block py-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors"
                        >
                          {col.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Accordion 3: Giới thiệu */}
              <div className="py-2.5">
                <button
                  onClick={() => toggleMobileSection('about')}
                  className="w-full flex items-center justify-between py-2 text-sm font-semibold text-on-surface hover:text-primary transition-colors text-left"
                >
                  <span>Giới thiệu</span>
                  <span className={`material-symbols-outlined text-neutral-400 text-lg transition-transform duration-200 ${expandedMobileSection === 'about' ? 'rotate-180 text-primary' : ''
                    }`}>
                    expand_more
                  </span>
                </button>
                {expandedMobileSection === 'about' && (
                  <div className="pl-3 pt-2 pb-1 space-y-1 border-l-2 border-primary/20 ml-2 mt-1 animate-fadeIn">
                    <Link
                      to="/about-furniture"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-xs text-on-surface-variant hover:text-primary transition-colors"
                    >
                      Về Nội thất
                    </Link>
                    <Link
                      to="/about-store"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-xs text-on-surface-variant hover:text-primary transition-colors"
                    >
                      Về Cửa hàng
                    </Link>
                    <Link
                      to="/warranty-policy"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-2 text-xs text-on-surface-variant hover:text-primary transition-colors"
                    >
                      Chính sách bảo hành
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Drawer Footer (User Info & Quick Actions) */}
            <div className="p-5 border-t border-outline-variant/20 bg-white shrink-0 space-y-3">
              {user ? (
                <div className="flex items-center justify-between bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="truncate max-w-[150px]">
                      <p className="text-xs font-bold text-on-surface truncate">{user.name}</p>
                      <p className="text-[10px] text-on-surface-variant truncate">{user.email}</p>
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-2 text-primary hover:bg-primary/10 rounded-full transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                    aria-label="Tài khoản cá nhân"
                  >
                    <span className="material-symbols-outlined text-lg">person</span>
                  </Link>
                </div>
              ) : null}

              <div className="text-center pt-1">
                <p className="text-[10px] text-on-surface-variant font-body-sm">
                  Hotline hỗ trợ: <a href="tel:19001234" className="text-primary font-semibold hover:underline">1900 1234</a>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

    </header>
  );
}

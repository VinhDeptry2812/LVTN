import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { getCategories, type Category } from '@/services/category.service';
import { getActiveCollections, type Collection } from '@/services/collection.service';
import authService from '@/services/auth.service';
import { fetchProductsPaginated, type ProductFrontend } from '@/services/product.service';

export interface CategoriesState {
  rooms: Category[];
  products: Category[];
  productTree: Category[];
}

export function useHeader() {
  const loginDropdownRef = useRef<HTMLDivElement>(null);
  const mobileLoginModalRef = useRef<HTMLDivElement>(null);
  const cartDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const desktopSearchContainerRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);
  const lastScrollY = useRef(0);
  const isInitialMount = useRef(true);

  const location = useLocation();
  const navigate = useNavigate();

  // State quản lý dropdown & modal UI
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCartDropdownOpen, setIsCartDropdownOpen] = useState(false);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isLoginDropdownOpen, setIsLoginDropdownOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  // State mở rộng accordion trên di động
  const [expandedMobileParents, setExpandedMobileParents] = useState<Record<string, boolean>>({});
  const [isMobileInspirationOpen, setIsMobileInspirationOpen] = useState(false);
  const [isMobileAboutOpen, setIsMobileAboutOpen] = useState(false);

  // State đăng nhập
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoginLoading, setIsLoginLoading] = useState(false);

  // State tìm kiếm
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState<ProductFrontend[]>([]);
  const [totalMatchedCount, setTotalMatchedCount] = useState<number>(0);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // State danh mục & bộ sưu tập
  const [categories, setCategories] = useState<CategoriesState>({
    rooms: [],
    products: [],
    productTree: [],
  });
  const [collections, setCollections] = useState<Collection[]>([]);

  // Zustand Stores
  const cartCount = useCartStore((state) => state.getCartCount());
  const cartItems = useCartStore((state) => state.items);
  const cartTotal = useCartStore((state) => state.getCartTotal());
  const removeFromCart = useCartStore((state) => state.removeItem);
  const lastAdded = useCartStore((state) => state.lastAdded);

  const { user, logout } = useAuthStore();
  const setAuth = useAuthStore((state) => state.setAuth);

  const isAdmin = Boolean(
    user && (user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'staff')
  );
  const adminUrl =
    import.meta.env.VITE_ADMIN_URL ||
    (window.location.hostname === 'localhost'
      ? 'http://localhost:5173'
      : 'https://noithat-admin.onrender.com');

  // Xử lý cuộn trang để ẩn/hiện Header & đổi style khi scrolled
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      setIsScrolled(currentScrollY > 10);

      if (currentScrollY > 80 && currentScrollY > lastScrollY.current) {
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY.current || currentScrollY <= 10) {
        setIsHeaderVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Khóa cuộn trang khi mở Mobile Menu Drawer
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Focus vào input tìm kiếm trên di động khi mở
  useEffect(() => {
    if (isMobileSearchOpen && mobileSearchInputRef.current) {
      const timer = setTimeout(() => {
        mobileSearchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobileSearchOpen]);

  // Live search tìm kiếm gợi ý với debounce 300ms
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

  // Tự động mở dropdown giỏ hàng khi sản phẩm được thêm thành công
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (lastAdded && location.pathname !== '/cart') {
      setIsCartDropdownOpen(true);
      useCartStore.setState({ lastAdded: undefined });
    }
  }, [lastAdded, location.pathname]);

  // Đóng các dropdown khi click ra ngoài (Click Outside Handler)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        loginDropdownRef.current &&
        !loginDropdownRef.current.contains(event.target as Node) &&
        (!mobileLoginModalRef.current ||
          !mobileLoginModalRef.current.contains(event.target as Node))
      ) {
        setIsLoginDropdownOpen(false);
      }
      if (
        desktopSearchContainerRef.current &&
        !desktopSearchContainerRef.current.contains(event.target as Node)
      ) {
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

  // Lấy dữ liệu danh mục & bộ sưu tập từ Backend API
  useEffect(() => {
    const fetchCategoriesData = async () => {
      try {
        const data = await getCategories();
        const allCategories: Category[] = [];
        const extractCategories = (cats: Category[]) => {
          cats.forEach((c) => {
            allCategories.push(c);
            if (c.children && c.children.length > 0) {
              extractCategories(c.children);
            }
          });
        };
        extractCategories(data);

        const rooms = allCategories.filter((c) => c.name.toLowerCase().includes('phòng'));
        const products = allCategories.filter((c) => !c.name.toLowerCase().includes('phòng'));

        const productTree: Category[] = [];
        data.forEach((c) => {
          if (c.name.toLowerCase().includes('phòng')) {
            if (c.children) {
              productTree.push(
                ...c.children.filter((child) => !child.name.toLowerCase().includes('phòng'))
              );
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

    const fetchCollectionsData = async () => {
      try {
        const data = await getActiveCollections();
        setCollections(data);
      } catch (error) {
        console.error('Failed to fetch collections:', error);
      }
    };

    fetchCategoriesData();
    fetchCollectionsData();
  }, []);

  const toggleMobileParentExpand = (slug: string) => {
    setExpandedMobileParents((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
      setIsMobileSearchOpen(false);
      setSearchQuery('');
    }
  };

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoginLoading(true);
    try {
      const response = await authService.login({
        email: loginEmail,
        password: loginPassword,
      });
      setAuth(response.access_token, response.refresh_token, response.user);
      await useCartStore.getState().syncCartOnLogin();
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

  return {
    loginDropdownRef,
    mobileLoginModalRef,
    cartDropdownRef,
    userDropdownRef,
    desktopSearchContainerRef,
    mobileSearchInputRef,

    isMobileMenuOpen,
    setIsMobileMenuOpen,
    isCartDropdownOpen,
    setIsCartDropdownOpen,
    isUserDropdownOpen,
    setIsUserDropdownOpen,
    isLoginDropdownOpen,
    setIsLoginDropdownOpen,
    isSearchOpen,
    setIsSearchOpen,
    isMobileSearchOpen,
    setIsMobileSearchOpen,
    isScrolled,
    isHeaderVisible,

    expandedMobileParents,
    toggleMobileParentExpand,
    isMobileInspirationOpen,
    setIsMobileInspirationOpen,
    isMobileAboutOpen,
    setIsMobileAboutOpen,

    loginEmail,
    setLoginEmail,
    loginPassword,
    setLoginPassword,
    isLoginLoading,

    searchQuery,
    setSearchQuery,
    searchSuggestions,
    totalMatchedCount,
    isSearching,

    categories,
    collections,

    cartCount,
    cartItems,
    cartTotal,
    removeFromCart,

    user,
    isAdmin,
    adminUrl,

    handleSearchSubmit,
    handleQuickLogin,
    handleLogout,
    isActive,
  };
}

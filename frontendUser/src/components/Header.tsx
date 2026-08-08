import React from 'react';
import { useHeader } from '@/hooks/useHeader';
import { HeaderNavMenu } from '@/components/header/HeaderNavMenu';
import { DesktopSearchBar, MobileSearchBar } from '@/components/header/HeaderSearchBar';
import { HeaderCartDropdown } from '@/components/header/HeaderCartDropdown';
import { HeaderUserMenu } from '@/components/header/HeaderUserMenu';
import { HeaderMobileDrawer } from '@/components/header/HeaderMobileDrawer';

export const Header: React.FC = () => {
  const header = useHeader();

  return (
    <header className="w-full bg-surface">
      {/* Main Header Bar */}
      <nav
        className={`sticky top-0 z-40 transition-all duration-300 ${
          header.isScrolled
            ? 'bg-surface/95 backdrop-blur-md border-b border-outline-variant/40 shadow-sm py-2 sm:py-2.5'
            : 'bg-surface border-b border-outline-variant/40 py-3 sm:py-4'
        }`}
      >
        <div className="max-w-7xl mx-auto px-sp-sm sm:px-sp-md md:px-sp-lg flex items-center justify-between">
          {/* Logo & Desktop Nav Menu */}
          <HeaderNavMenu
            categories={header.categories}
            collections={header.collections}
            isActive={header.isActive}
          />

          {/* Right Action Icons (Search, User, Cart, Hamburger) */}
          <div className="flex items-center gap-1 sm:gap-2 md:gap-sp-md">
            {/* Desktop Search */}
            <DesktopSearchBar
              desktopSearchContainerRef={header.desktopSearchContainerRef}
              isSearchOpen={header.isSearchOpen}
              setIsSearchOpen={header.setIsSearchOpen}
              searchQuery={header.searchQuery}
              setSearchQuery={header.setSearchQuery}
              searchSuggestions={header.searchSuggestions}
              totalMatchedCount={header.totalMatchedCount}
              isSearching={header.isSearching}
              handleSearchSubmit={header.handleSearchSubmit}
            />

            {/* Account Menu (User Info or Quick Login) */}
            <HeaderUserMenu
              user={header.user}
              userDropdownRef={header.userDropdownRef}
              isUserDropdownOpen={header.isUserDropdownOpen}
              setIsUserDropdownOpen={header.setIsUserDropdownOpen}
              isAdmin={header.isAdmin}
              adminUrl={header.adminUrl}
              handleLogout={header.handleLogout}
              loginDropdownRef={header.loginDropdownRef}
              mobileLoginModalRef={header.mobileLoginModalRef}
              isLoginDropdownOpen={header.isLoginDropdownOpen}
              setIsLoginDropdownOpen={header.setIsLoginDropdownOpen}
              loginEmail={header.loginEmail}
              setLoginEmail={header.setLoginEmail}
              loginPassword={header.loginPassword}
              setLoginPassword={header.setLoginPassword}
              isLoginLoading={header.isLoginLoading}
              handleQuickLogin={header.handleQuickLogin}
            />

            {/* Shopping Cart */}
            <HeaderCartDropdown
              cartDropdownRef={header.cartDropdownRef}
              isCartDropdownOpen={header.isCartDropdownOpen}
              setIsCartDropdownOpen={header.setIsCartDropdownOpen}
              cartCount={header.cartCount}
              cartItems={header.cartItems}
              cartTotal={header.cartTotal}
              removeFromCart={header.removeFromCart}
            />

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => header.setIsMobileMenuOpen(!header.isMobileMenuOpen)}
              className="md:hidden p-2 rounded-full hover:bg-surface-container-low transition-colors duration-300 text-on-surface cursor-pointer flex items-center justify-center min-w-[44px] min-h-[44px]"
              aria-label="Mở danh mục điều hướng"
            >
              <span className="material-symbols-outlined block text-[24px]">
                {header.isMobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Search Bar Row */}
      <MobileSearchBar
        mobileSearchInputRef={header.mobileSearchInputRef}
        searchQuery={header.searchQuery}
        setSearchQuery={header.setSearchQuery}
        searchSuggestions={header.searchSuggestions}
        totalMatchedCount={header.totalMatchedCount}
        handleSearchSubmit={header.handleSearchSubmit}
      />

      {/* Mobile Navigation Drawer */}
      <HeaderMobileDrawer
        isMobileMenuOpen={header.isMobileMenuOpen}
        setIsMobileMenuOpen={header.setIsMobileMenuOpen}
        user={header.user}
        isAdmin={header.isAdmin}
        adminUrl={header.adminUrl}
        categories={header.categories}
        expandedMobileParents={header.expandedMobileParents}
        toggleMobileParentExpand={header.toggleMobileParentExpand}
        isMobileInspirationOpen={header.isMobileInspirationOpen}
        setIsMobileInspirationOpen={header.setIsMobileInspirationOpen}
        isMobileAboutOpen={header.isMobileAboutOpen}
        setIsMobileAboutOpen={header.setIsMobileAboutOpen}
        collections={header.collections}
        handleLogout={header.handleLogout}
      />
    </header>
  );
};

export default Header;

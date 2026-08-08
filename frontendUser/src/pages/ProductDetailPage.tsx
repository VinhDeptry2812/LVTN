import React from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProductSectionCarousel from '@/components/ProductSectionCarousel';

import { useProductDetail } from '@/hooks/useProductDetail';
import { ProductGallery } from '@/components/product-detail/ProductGallery';
import { ProductInfoSection } from '@/components/product-detail/ProductInfoSection';
import { ProductDescription } from '@/components/product-detail/ProductDescription';
import { ProductReviewsSection } from '@/components/product-detail/ProductReviewsSection';
import { ProductZoomModal } from '@/components/product-detail/ProductZoomModal';

gsap.registerPlugin(useGSAP, ScrollTrigger);

export const ProductDetailPage: React.FC = () => {
  const {
    product,
    loading,
    reviewsData,
    reviewRatingFilter,
    reviewSort,
    reviewsLoading,
    reviewsSectionRef,
    reviewsDrag,
    recommendedProducts,
    frequentlyBoughtProducts,
    recentlyViewedProducts,
    activeImage,
    setActiveImage,
    selectedVariantId,
    setSelectedVariantId,
    selectedAttributes,
    quantity,
    setQuantity,
    descExpanded,
    setDescExpanded,
    isAdding,
    isShippingOpen,
    setIsShippingOpen,
    isZoomOpen,
    setIsZoomOpen,
    zoomImage,
    setZoomImage,
    zoomType,
    setZoomType,
    isSimpleProduct,
    currentVariant,
    displayPrice,
    displayOldPrice,
    attributeGroups,
    filteredGallery,
    handleRatingFilterChange,
    handleSortChange,
    handleLoadMoreReviews,
    handleAttributeSelect,
    handleAddToCart,
    handleBuyNow,
    detailContainerRef,
    recommendedRef,
    thumbnailDrag,
    handleQuantityChange,
    handleNextImage,
    handlePrevImage,
  } = useProductDetail();

  useGSAP(
    () => {
      if (!loading && product) {
        const tl = gsap.timeline();
        tl.from('.detail-gallery', { opacity: 0, x: -50, duration: 0.8, ease: 'power3.out' })
          .from('.detail-info-block', { opacity: 0, x: 50, duration: 0.8, ease: 'power3.out' }, '-=0.6');
      }

      if (recommendedProducts.length > 0 && recommendedRef.current) {
        gsap.from('.recom-card', {
          opacity: 0,
          y: 40,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: recommendedRef.current,
            start: 'top 80%',
          },
        });
      }
    },
    { scope: detailContainerRef, dependencies: [loading] }
  );

  const scrollToReviews = () => {
    if (reviewsSectionRef.current) {
      reviewsSectionRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (loading) {
    return (
      <div className="bg-[#FAF7F2] text-on-surface min-h-screen flex flex-col font-body">
        <Header />
        <main className="flex-1 flex items-center justify-center pt-6 md:pt-8 pb-20">
          <div className="flex flex-col items-center gap-3">
            <span className="material-symbols-outlined animate-spin text-4xl text-[#5A6B53]">
              progress_activity
            </span>
            <p className="font-body-md font-medium text-[#5A6B53]">Đang tải chi tiết sản phẩm...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product || product.is_active === false) {
    return (
      <div className="bg-[#FAF7F2] text-on-surface min-h-screen flex flex-col font-body">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center pt-6 md:pt-8 pb-20">
          <span className="material-symbols-outlined text-6xl text-rose-500 mb-2">error</span>
          <p className="text-on-surface-variant font-medium mb-4">
            Sản phẩm này tạm thời ngưng kinh doanh hoặc không tồn tại.
          </p>
          <Link
            to="/products"
            className="px-6 py-3 bg-[#5A6B53] text-white rounded-none font-bold hover:bg-[#465440] transition-colors"
          >
            Quay lại cửa hàng
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div ref={detailContainerRef} className="bg-[#FAF7F2] text-on-surface min-h-screen font-body flex flex-col">
      <Header />

      <main className="pt-6 md:pt-8 pb-16 flex-1">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-sm text-on-surface-variant mb-8">
            <Link to="/" className="hover:text-primary transition-colors">
              Trang chủ
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <Link to="/products" className="hover:text-primary transition-colors">
              Sản phẩm
            </Link>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-on-surface font-medium truncate max-w-[200px]">
              {product.name}
            </span>
          </nav>

          {/* Main Product Layout: Gallery & Info */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start w-full min-w-0">
            <ProductGallery
              product={product}
              activeImage={activeImage}
              setActiveImage={setActiveImage}
              filteredGallery={filteredGallery}
              thumbnailDrag={thumbnailDrag}
              setZoomImage={setZoomImage}
              setZoomType={setZoomType}
              setIsZoomOpen={setIsZoomOpen}
              handlePrevImage={handlePrevImage}
              handleNextImage={handleNextImage}
            />

            <ProductInfoSection
              product={product}
              currentVariant={currentVariant}
              selectedVariantId={selectedVariantId}
              setSelectedVariantId={setSelectedVariantId}
              selectedAttributes={selectedAttributes}
              isSimpleProduct={isSimpleProduct}
              displayPrice={displayPrice}
              displayOldPrice={displayOldPrice}
              attributeGroups={attributeGroups}
              quantity={quantity}
              setQuantity={setQuantity}
              handleQuantityChange={handleQuantityChange}
              isAdding={isAdding}
              reviewsData={reviewsData}
              isShippingOpen={isShippingOpen}
              setIsShippingOpen={setIsShippingOpen}
              handleAttributeSelect={handleAttributeSelect}
              handleAddToCart={handleAddToCart}
              handleBuyNow={handleBuyNow}
              scrollToReviews={scrollToReviews}
              setActiveImage={setActiveImage}
            />
          </div>

          {/* Product Description */}
          <ProductDescription
            product={product}
            descExpanded={descExpanded}
            setDescExpanded={setDescExpanded}
          />

          {/* Product Reviews */}
          <ProductReviewsSection
            reviewsSectionRef={reviewsSectionRef}
            reviewsData={reviewsData}
            reviewsLoading={reviewsLoading}
            reviewRatingFilter={reviewRatingFilter}
            reviewSort={reviewSort}
            reviewsDrag={reviewsDrag}
            handleRatingFilterChange={handleRatingFilterChange}
            handleSortChange={handleSortChange}
            handleLoadMoreReviews={handleLoadMoreReviews}
            setZoomImage={setZoomImage}
            setZoomType={setZoomType}
            setIsZoomOpen={setIsZoomOpen}
          />

          {/* Carousel Sản phẩm liên quan */}
          {recommendedProducts.length > 0 && (
            <div ref={recommendedRef} className="mt-16 border-t border-outline-variant/20 pt-10">
              <ProductSectionCarousel
                title="Sản phẩm liên quan"
                subtitle="Các sản phẩm cùng danh mục được nhiều khách hàng yêu thích"
                products={recommendedProducts}
                bgClass="bg-transparent"
                sectionPaddingClass="py-0"
                contentPaddingClass="px-0"
                viewAllLink="/products"
              />
            </div>
          )}

          {/* Carousel Thường được mua cùng nhau */}
          {frequentlyBoughtProducts.length > 0 && (
            <div className="mt-12 border-t border-outline-variant/20 pt-10">
              <ProductSectionCarousel
                title="Thường được mua cùng nhau"
                subtitle="Gợi ý các sản phẩm hay được chọn mua kèm"
                products={frequentlyBoughtProducts}
                bgClass="bg-transparent"
                sectionPaddingClass="py-0"
                contentPaddingClass="px-0"
                viewAllLink="/products"
              />
            </div>
          )}

          {/* Carousel Sản phẩm vừa xem */}
          {recentlyViewedProducts.length > 0 && (
            <div className="mt-12 border-t border-outline-variant/20 pt-10">
              <ProductSectionCarousel
                title="Sản phẩm vừa xem"
                subtitle="Danh sách các sản phẩm bạn đã tham khảo gần đây"
                products={recentlyViewedProducts}
                bgClass="bg-transparent"
                sectionPaddingClass="py-0"
                contentPaddingClass="px-0"
                viewAllLink="/products"
              />
            </div>
          )}
        </div>
      </main>

      {/* Image Zoom Modal */}
      <ProductZoomModal
        isZoomOpen={isZoomOpen}
        setIsZoomOpen={setIsZoomOpen}
        zoomImage={zoomImage}
        activeImage={activeImage}
        zoomType={zoomType}
        product={product}
        handlePrevImage={handlePrevImage}
        handleNextImage={handleNextImage}
      />

      <Footer />
    </div>
  );
};

export default ProductDetailPage;

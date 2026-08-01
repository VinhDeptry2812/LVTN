import React, { forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { heroBannerImage } from '@/utils/cloudinaryUrl';

export interface SlideItem {
  image: string;
  badge: string;
  title: string;
  description: string;
  btnText: string;
  btnUrl: string;
}

interface HeroBannerSectionProps {
  slides: SlideItem[];
  currentSlide: number;
  progress: number;
  isLoading?: boolean;
  setIsHovered: (hovered: boolean) => void;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  onDotClick: (index: number) => void;
  onDragStart: (x: number, y?: number) => void;
  onDragMove: (x: number, y?: number) => void;
  onDragEnd: () => void;
}

export const HeroBannerSection = forwardRef<HTMLElement, HeroBannerSectionProps>((props, ref) => {
  const {
    slides,
    currentSlide,
    progress,
    isLoading = false,
    setIsHovered,
    onPrevSlide,
    onNextSlide,
    onDotClick,
    onDragStart,
    onDragMove,
    onDragEnd,
  } = props;
  const navigate = useNavigate();

  if (isLoading || slides.length === 0) {
    return (
      <section
        ref={ref}
        className="relative mt-20 h-[400px] sm:h-[460px] md:h-[540px] lg:h-[calc(100vh-80px)] min-h-[400px] w-full overflow-hidden flex items-end pb-10 md:items-center md:pb-0 bg-slate-900 animate-pulse"
      >
        <div className="relative z-20 max-w-container-max mx-auto px-4 md:px-8 lg:px-12 w-full">
          <div className="max-w-lg md:max-w-2xl space-y-4">
            <div className="h-6 w-28 bg-slate-700/60 rounded-full"></div>
            <div className="h-10 sm:h-12 w-3/4 bg-slate-700/80 rounded-lg"></div>
            <div className="h-4 sm:h-5 w-full max-w-lg bg-slate-700/50 rounded"></div>
            <div className="h-4 sm:h-5 w-2/3 max-w-md bg-slate-700/40 rounded"></div>
            <div className="pt-2">
              <div className="h-11 w-36 bg-slate-700/70 rounded-xl"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      ref={ref}
      className="relative mt-20 h-[400px] sm:h-[460px] md:h-[540px] lg:h-[calc(100vh-80px)] min-h-[400px] w-full overflow-hidden flex items-end pb-10 md:items-center md:pb-0 bg-surface-container cursor-grab active:cursor-grabbing select-none touch-pan-y"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        onDragEnd();
      }}
      onTouchStart={(e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={onDragEnd}
      onMouseDown={(e) => onDragStart(e.clientX)}
      onMouseMove={(e) => onDragMove(e.clientX)}
      onMouseUp={onDragEnd}
    >
      {/* Background Slides */}
      <div className="absolute inset-0 z-0 w-full h-full">
        {slides.map((slide, idx) => {
          const isActive = idx === currentSlide;
          return (
            <div
              key={idx}
              className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              {/* Background Image with Ken Burns effect when active */}
              <img
                alt={slide.title}
                className={`w-full h-full object-cover transition-transform duration-[6000ms] ease-out ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
                src={heroBannerImage(slide.image)}
              />
              {/* Responsive Dark Overlay tailored for Mobile, Tablet & Desktop */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent md:bg-gradient-to-r md:from-black/70 md:via-black/40 md:to-transparent z-10"></div>
            </div>
          );
        })}
      </div>

      {/* Foreground Text Layer */}
      {slides[currentSlide] && (
        <div className="relative z-20 max-w-container-max mx-auto px-4 md:px-8 lg:px-12 w-full text-white">
          <div className="max-w-lg md:max-w-2xl">
            <span className="hero-badge inline-block px-3 py-1 md:px-4 md:py-1.5 mb-2 md:mb-4 rounded-full bg-white/20 backdrop-blur-md text-white font-semibold text-[10px] sm:text-xs md:text-sm uppercase tracking-wider border border-white/30">
              {slides[currentSlide].badge}
            </span>
            <h1 className="hero-title text-xl sm:text-2xl md:text-4xl lg:text-5xl mb-2 md:mb-4 text-white leading-tight font-bold tracking-tight drop-shadow-md">
              {slides[currentSlide].title}
            </h1>
            <p className="hero-desc text-xs sm:text-sm md:text-base lg:text-lg text-white/90 mb-4 md:mb-6 max-w-md md:max-w-xl leading-relaxed line-clamp-2 md:line-clamp-none">
              {slides[currentSlide].description}
            </p>
            <div className="flex flex-wrap gap-3 md:gap-4">
              <button
                onClick={() => navigate(slides[currentSlide].btnUrl)}
                className="relative overflow-hidden group hero-btn px-5 py-2.5 md:px-8 md:py-3.5 bg-white text-black hover:text-white rounded-none md:rounded-xl font-bold text-xs md:text-sm active:scale-95 cursor-pointer shadow-lg shadow-black/20 transition-colors duration-200"
              >
                <span className="absolute inset-0 w-full h-full bg-primary origin-left scale-x-0 transition-transform duration-200 ease-out group-hover:scale-x-100"></span>
                <span className="relative z-10 transition-colors duration-200">
                  {slides[currentSlide].btnText}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Arrows (Hỗ trợ Tablet md:flex & Desktop) */}
      <button
        onClick={onPrevSlide}
        aria-label="Previous Slide"
        className="hidden md:flex absolute left-4 md:left-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white hover:bg-white hover:text-black hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group shadow-lg"
      >
        <ChevronLeft className="w-5 h-5 md:w-6 md:h-6 group-hover:-translate-x-0.5 transition-transform" />
      </button>
      <button
        onClick={onNextSlide}
        aria-label="Next Slide"
        className="hidden md:flex absolute right-4 md:right-6 top-1/2 -translate-y-1/2 z-30 w-10 h-10 md:w-12 md:h-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md border border-white/30 text-white hover:bg-white hover:text-black hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer group shadow-lg"
      >
        <ChevronRight className="w-5 h-5 md:w-6 md:h-6 group-hover:translate-x-0.5 transition-transform" />
      </button>

      {/* Indicators / Progress Bar */}
      <div className="absolute bottom-3 md:bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 md:gap-3">
        {slides.map((_, idx) => {
          const isActive = idx === currentSlide;
          return (
            <button
              key={idx}
              onClick={() => onDotClick(idx)}
              className="group relative flex items-center justify-center w-7 md:w-12 h-5 cursor-pointer"
              aria-label={`Go to slide ${idx + 1}`}
            >
              <span className={`w-full h-[3px] md:h-[2px] rounded-full transition-colors ${isActive ? 'bg-white/40' : 'bg-white/20 group-hover:bg-white/40'}`}></span>
              {isActive && (
                <span
                  className="absolute left-0 h-[3px] md:h-[2px] rounded-full bg-white transition-all duration-75"
                  style={{ width: `${progress}%` }}
                ></span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
});

HeroBannerSection.displayName = 'HeroBannerSection';

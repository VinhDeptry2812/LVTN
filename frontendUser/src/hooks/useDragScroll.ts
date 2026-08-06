import { useRef, useState, useCallback, useEffect } from 'react';

/**
 * Custom Hook cho phép cuộn ngang bằng cách kéo thả chuột (Mouse Drag to Scroll) trên Desktop.
 * Tích hợp kiểm tra vị trí để hiện/ẩn nút điều hướng Trái/Phải và ngăn sự kiện Click khi đang kéo.
 */
export function useDragScroll() {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const dragDistance = useRef(0);

  // Kiểm tra khả năng cuộn Trái / Phải của container
  const updateScrollButtons = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 2);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    updateScrollButtons();
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    window.addEventListener('resize', updateScrollButtons);

    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      window.removeEventListener('resize', updateScrollButtons);
    };
  }, [updateScrollButtons]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    setIsMouseDown(true);
    setIsDragging(false);
    dragDistance.current = 0;
    startX.current = e.pageX - ref.current.offsetLeft;
    scrollLeft.current = ref.current.scrollLeft;
  }, []);

  const onMouseLeave = useCallback(() => {
    setIsMouseDown(false);
    setTimeout(() => setIsDragging(false), 50);
  }, []);

  const onMouseUp = useCallback(() => {
    setIsMouseDown(false);
    setTimeout(() => setIsDragging(false), 50);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isMouseDown || !ref.current) return;
    const x = e.pageX - ref.current.offsetLeft;
    const walk = (x - startX.current) * 1.5;
    dragDistance.current = Math.abs(walk);

    if (dragDistance.current > 5) {
      setIsDragging(true);
    }
    ref.current.scrollLeft = scrollLeft.current - walk;
  }, [isMouseDown]);

  // Hàm cuộn mượt bằng nút bấm Mũi tên (← / →)
  const scrollBy = useCallback((distance: number) => {
    if (ref.current) {
      ref.current.scrollBy({ left: distance, behavior: 'smooth' });
    }
  }, []);

  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (isDragging || dragDistance.current > 5) {
      e.stopPropagation();
      e.preventDefault();
    }
  }, [isDragging]);

  return {
    ref,
    isMouseDown,
    isDragging,
    canScrollLeft,
    canScrollRight,
    scrollBy,
    events: {
      onMouseDown,
      onMouseLeave,
      onMouseUp,
      onMouseMove,
      onClickCapture,
    },
  };
}

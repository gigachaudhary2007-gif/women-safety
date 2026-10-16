import React, { useState, useRef, useEffect } from 'react';
import { ChevronsRight } from 'lucide-react';
import { soundManager } from '../../utils/audio';

interface SwipeButtonProps {
  onSuccess: () => void;
  label?: string;
  className?: string;
}

export const SwipeButton: React.FC<SwipeButtonProps> = ({
  onSuccess,
  label = 'Swipe To Start',
  className = '',
}) => {
  const [dragProgress, setDragProgress] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef<number>(0);

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    startXRef.current = clientX;
  };

  const handleTouchMove = (e: TouchEvent | MouseEvent) => {
    if (!isDragging || !trackRef.current) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const deltaX = clientX - startXRef.current;
    const trackWidth = trackRef.current.clientWidth;
    const thumbWidth = 56;
    const maxDrag = trackWidth - thumbWidth;

    const progress = Math.max(0, Math.min(1, deltaX / maxDrag));
    setDragProgress(progress);

    if (progress >= 0.92) {
      setIsDragging(false);
      setDragProgress(1);
      soundManager.triggerHaptic(40);
      soundManager.playBeep(880, 0.15);
      onSuccess();
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragProgress < 0.92) {
      setDragProgress(0);
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleTouchMove);
      window.addEventListener('mouseup', handleTouchEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleTouchMove);
      window.removeEventListener('mouseup', handleTouchEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging, dragProgress]);

  const thumbOffset = trackRef.current
    ? dragProgress * (trackRef.current.clientWidth - 56)
    : 0;

  return (
    <div
      ref={trackRef}
      className={`relative w-full h-15 rounded-full bg-white dark:bg-slate-900 backdrop-blur-md border border-slate-300 dark:border-indigo-900/60 p-1.5 shadow-lg select-none overflow-hidden ${className}`}
      style={{ touchAction: 'none' }}
    >
      {/* Background completed fill */}
      <div
        className="absolute left-0 top-0 bottom-0 bg-indigo-500/20 rounded-full transition-all duration-75"
        style={{ width: `${Math.max(10, dragProgress * 100)}%` }}
      />

      {/* Center Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          className="text-xs font-black tracking-wider text-slate-900 dark:text-white transition-opacity duration-200"
          style={{ opacity: Math.max(0.2, 1 - dragProgress * 1.5) }}
        >
          {label}
        </span>
      </div>

      {/* Chevrons background hints */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center text-indigo-400 pointer-events-none">
        <ChevronsRight className="w-5 h-5 animate-pulse" />
      </div>

      {/* Draggable Thumb Knob */}
      <div
        onMouseDown={handleTouchStart}
        onTouchStart={handleTouchStart}
        className="relative z-10 w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-md cursor-grab active:cursor-grabbing active:scale-95 transition-transform"
        style={{
          transform: `translateX(${thumbOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        <ChevronsRight className="w-5 h-5" />
      </div>
    </div>
  );
};

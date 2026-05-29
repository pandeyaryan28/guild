import * as React from 'react';
import { motion } from 'motion/react';
import { X, Download, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MediaFile {
  url: string;
  name: string;
  type: string;
  size?: number;
}

interface MediaLightboxProps {
  isOpen: boolean;
  onClose: () => void;
  mediaList: MediaFile[];
  initialIndex: number;
}

export function MediaLightbox({
  isOpen,
  onClose,
  mediaList,
  initialIndex,
}: MediaLightboxProps) {
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);

  const activeMedia = mediaList[currentIndex];

  const handlePrev = React.useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleNext = React.useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentIndex < mediaList.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [currentIndex, mediaList.length]);

  // Handle Keyboard triggers
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrev();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    // Disable scroll behind lightbox
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, handlePrev, handleNext]);

  if (!isOpen || !activeMedia) return null;

  const isImage = activeMedia.type.startsWith('image/');
  const isVideo = activeMedia.type.startsWith('video/');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-9999 flex flex-col justify-between bg-black/90 dark:bg-black/95 backdrop-blur-lg select-none cursor-default"
    >
      {/* ─── Top Control Header Bar ─── */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent z-10"
      >
        <div className="flex flex-col min-w-0 max-w-xl">
          <span className="text-sm font-bold text-white truncate drop-shadow-sm">
            {activeMedia.name}
          </span>
          {activeMedia.size && (
            <span className="text-[10px] text-zinc-400 font-semibold font-mono mt-0.5">
              {(activeMedia.size / 1024).toFixed(1)} KB · {activeMedia.type.split('/')[1]?.toUpperCase() || 'FILE'}
            </span>
          )}
        </div>

        {/* Toolbar Button Controls */}
        <div className="flex items-center gap-2">
          <a
            href={activeMedia.url}
            target="_blank"
            rel="noreferrer"
            className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/15 text-white/90 hover:text-white border border-white/5 transition-all shadow active:scale-95 cursor-pointer"
            title="View Original"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
          <a
            href={activeMedia.url}
            download={activeMedia.name}
            target="_blank"
            rel="noreferrer"
            className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-white/15 text-white/90 hover:text-white border border-white/5 transition-all shadow active:scale-95 cursor-pointer"
            title="Download"
          >
            <Download className="h-4 w-4" />
          </a>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-xl flex items-center justify-center bg-white/10 hover:bg-red-500/20 text-white/90 hover:text-red-400 border border-white/5 hover:border-red-500/10 transition-all shadow active:scale-95 cursor-pointer"
            title="Close"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>

      {/* ─── Centered Media Stage Content ─── */}
      <div className="flex-1 relative flex items-center justify-center px-4 overflow-hidden">
        {/* Navigation Sidebar Arrows */}
        {currentIndex > 0 && (
          <button
            onClick={handlePrev}
            className="absolute left-6 z-20 h-12 w-12 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/5 hover:border-white/10 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}

        {/* Dynamic media presentation */}
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="relative max-w-[90vw] max-h-[80vh] flex items-center justify-center"
        >
          {isImage && (
            <img
              src={activeMedia.url}
              alt={activeMedia.name}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl select-none"
              draggable="false"
            />
          )}

          {isVideo && (
            <video
              src={activeMedia.url}
              controls
              autoPlay
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl focus:outline-none"
            />
          )}

          {!isImage && !isVideo && (
            <div className="flex flex-col items-center gap-3 p-8 rounded-2xl bg-zinc-900 border border-zinc-800 text-center">
              <span className="text-sm font-semibold text-zinc-300">Preview Unsupported</span>
              <a
                href={activeMedia.url}
                download={activeMedia.name}
                className="px-4 py-2 bg-white text-black font-bold text-xs rounded-xl hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                Download File
              </a>
            </div>
          )}
        </motion.div>

        {currentIndex < mediaList.length - 1 && (
          <button
            onClick={handleNext}
            className="absolute right-6 z-20 h-12 w-12 rounded-full bg-white/10 hover:bg-white/15 text-white border border-white/5 hover:border-white/10 shadow-lg flex items-center justify-center hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* ─── Bottom Pagination Info Rail ─── */}
      <div 
        onClick={(e) => e.stopPropagation()}
        className="w-full flex items-center justify-center p-5 bg-gradient-to-t from-black/60 to-transparent z-10"
      >
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 font-mono bg-white/5 border border-white/5 px-3 py-1 rounded-full shadow-inner">
          {currentIndex + 1} / {mediaList.length}
        </span>
      </div>
    </div>
  );
}

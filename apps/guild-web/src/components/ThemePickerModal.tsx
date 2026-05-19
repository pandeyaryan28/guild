import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, X, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { THEMES, type ThemeId } from '../lib/themes';
import { useTheme } from '../hooks/useTheme';

interface ThemePickerModalProps {
  onClose: () => void;
}

// Tiny preview pane — shows a miniature representation of the theme
function ThemePreview({ themeId }: { themeId: ThemeId }) {
  const theme = THEMES.find((t) => t.id === themeId)!;
  return (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl"
      style={{ background: theme.bgSwatch }}
    >
      {/* Fake sidebar */}
      <div
        className="absolute left-0 top-0 h-full w-[28%] flex flex-col gap-1.5 p-2"
        style={{ background: `${theme.bgSwatch}cc`, borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Org pill */}
        <div className="flex items-center gap-1 mb-1">
          <div className="h-3 w-3 rounded-md" style={{ background: theme.swatch }} />
          <div className="h-1.5 w-10 rounded-full bg-white/15" />
        </div>
        {/* Nav items */}
        {[true, false, false, false].map((active, i) => (
          <div
            key={i}
            className="flex items-center gap-1 rounded px-1 py-0.5"
            style={active ? { background: `${theme.swatch}22` } : {}}
          >
            <div
              className="h-2 w-2 rounded-sm"
              style={{ background: active ? theme.swatch : 'rgba(255,255,255,0.12)' }}
            />
            <div className="h-1 w-8 rounded-full" style={{ background: active ? theme.swatch + '99' : 'rgba(255,255,255,0.10)' }} />
          </div>
        ))}
      </div>
      {/* Fake message area */}
      <div className="absolute left-[28%] right-0 top-0 bottom-0 flex flex-col p-2 gap-1.5">
        {/* Header */}
        <div className="flex items-center gap-1 pb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="h-3 w-3 rounded-lg" style={{ background: `${theme.swatch}33` }} />
          <div className="h-1.5 w-14 rounded-full bg-white/20" />
        </div>
        {/* Messages */}
        <div className="flex items-start gap-1">
          <div className="h-4 w-4 shrink-0 rounded-full" style={{ background: `${theme.swatch}40` }} />
          <div className="flex flex-col gap-0.5">
            <div className="h-1.5 w-16 rounded-full bg-white/30" />
            <div className="h-4 w-24 rounded-lg bg-white/[0.07]" />
          </div>
        </div>
        <div className="flex items-start gap-1">
          <div className="h-4 w-4 shrink-0 rounded-full" style={{ background: `${theme.swatch}40` }} />
          <div className="flex flex-col gap-0.5">
            <div className="h-1.5 w-12 rounded-full bg-white/30" />
            <div className="h-4 w-20 rounded-lg bg-white/[0.07]" />
            <div className="h-3 w-16 rounded-lg bg-white/[0.05]" />
          </div>
        </div>
        {/* Own message bubble */}
        <div className="flex justify-end mt-auto">
          <div className="h-4 w-20 rounded-xl" style={{ background: `${theme.swatch}55` }} />
        </div>
        {/* Input bar */}
        <div
          className="flex items-center gap-1 rounded-xl px-2 py-1 mt-0.5"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex-1 h-1 rounded-full bg-white/10" />
          <div className="h-3 w-3 rounded-lg shrink-0" style={{ background: theme.swatch }} />
        </div>
      </div>
    </div>
  );
}

export function ThemePickerModal({ onClose }: ThemePickerModalProps) {
  const { themeId, setTheme } = useTheme();
  const [hoveredId, setHoveredId] = React.useState<ThemeId | null>(null);
  const previewId = hoveredId ?? themeId;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto w-full max-w-2xl rounded-2xl border border-border-default bg-card shadow-2xl shadow-black/50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-default px-6 py-5">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
                <Palette className="h-4.5 w-4.5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground">Appearance</h2>
                <p className="text-[11px] text-muted-foreground mt-0.5">Choose your workspace color theme</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex gap-0 divide-x divide-border/30">
            {/* Left — Theme Swatches */}
            <div className="flex-1 p-6">
              <p className="mb-4 text-[10px] font-bold uppercase tracking-widest text-text-muted">Themes</p>
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((theme) => {
                  const isActive = themeId === theme.id;
                  const isHovered = hoveredId === theme.id;
                  return (
                    <motion.button
                      key={theme.id}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setTheme(theme.id)}
                      onMouseEnter={() => setHoveredId(theme.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      className={cn(
                        'relative flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                        isActive
                          ? 'border-primary/60 bg-primary/8 shadow-lg shadow-primary/10'
                          : 'border-border-default bg-bg-tertiary hover:border-border-default hover:bg-bg-tertiary',
                      )}
                    >
                      {/* Color swatch */}
                      <div className="relative shrink-0">
                        <div
                          className="h-8 w-8 rounded-lg shadow-lg"
                          style={{
                            background: `radial-gradient(circle at 30% 30%, ${theme.swatch}dd, ${theme.swatch}77)`,
                            boxShadow: isActive || isHovered ? `0 0 16px ${theme.swatch}55` : 'none',
                          }}
                        />
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-card"
                            style={{ background: theme.swatch }}
                          >
                            <Check className="h-2 w-2 text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                      </div>

                      {/* Label */}
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-xs font-semibold', isActive ? 'text-foreground' : 'text-foreground/80')}>
                          {theme.name}
                        </p>
                        <p className="text-[10px] text-text-muted leading-tight mt-0.5 line-clamp-1">
                          {theme.description}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Right — Live Preview */}
            <div className="w-[260px] shrink-0 p-6 flex flex-col gap-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Preview</p>
              <motion.div
                key={previewId}
                initial={{ opacity: 0.6, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2 }}
                className="flex-1 rounded-xl border border-border-default overflow-hidden"
                style={{ minHeight: '220px' }}
              >
                <ThemePreview themeId={previewId} />
              </motion.div>
              <div className="space-y-1">
                {(() => {
                  const t = THEMES.find((x) => x.id === previewId)!;
                  return (
                    <>
                      <p className="text-xs font-semibold text-foreground">{t.name}</p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{t.description}</p>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={() => { setTheme(previewId); onClose(); }}
                className="w-full rounded-xl py-2 text-xs font-semibold transition-all"
                style={{
                  background: THEMES.find((t) => t.id === previewId)!.swatch,
                  color: '#fff',
                  boxShadow: `0 4px 16px ${THEMES.find((t) => t.id === previewId)!.swatch}55`,
                }}
              >
                Apply Theme
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

import * as React from 'react';
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react';
import {
  Sparkles,
  Smile,
  Trash2,
  Copy,
  Palette,
  Check,
  ChevronDown
} from 'lucide-react';
import { cn } from '@guild/utils';

export type CalloutTint = 'amber' | 'indigo' | 'emerald' | 'rose' | 'purple' | 'slate';

interface TintConfig {
  id: CalloutTint;
  label: string;
  dotBg: string;
  containerClass: string;
  iconBg: string;
}

const TINT_CONFIGS: Record<CalloutTint, TintConfig> = {
  amber: {
    id: 'amber',
    label: 'Warm Amber',
    dotBg: 'bg-amber-500',
    containerClass: 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30 dark:border-amber-500/35 text-foreground',
    iconBg: 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
  },
  indigo: {
    id: 'indigo',
    label: 'Electric Indigo',
    dotBg: 'bg-indigo-500',
    containerClass: 'bg-indigo-500/10 dark:bg-indigo-500/15 border-indigo-500/30 dark:border-indigo-500/35 text-foreground',
    iconBg: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30'
  },
  emerald: {
    id: 'emerald',
    label: 'Mint Emerald',
    dotBg: 'bg-emerald-500',
    containerClass: 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 dark:border-emerald-500/35 text-foreground',
    iconBg: 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
  },
  rose: {
    id: 'rose',
    label: 'Vibrant Rose',
    dotBg: 'bg-rose-500',
    containerClass: 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30 dark:border-rose-500/35 text-foreground',
    iconBg: 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30'
  },
  purple: {
    id: 'purple',
    label: 'Deep Purple',
    dotBg: 'bg-purple-500',
    containerClass: 'bg-purple-500/10 dark:bg-purple-500/15 border-purple-500/30 dark:border-purple-500/35 text-foreground',
    iconBg: 'bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30'
  },
  slate: {
    id: 'slate',
    label: 'Neutral Slate',
    dotBg: 'bg-slate-500',
    containerClass: 'bg-secondary/70 dark:bg-secondary/35 border-border dark:border-border-strong text-foreground',
    iconBg: 'bg-secondary dark:bg-secondary/70 text-foreground border-border'
  }
};

const EMOJI_OPTIONS = ['💡', '🚀', '⚠️', '📌', '🎯', 'ℹ️', '⚡', '🔔', '🔒', '📝', '✨', '🔥'];

export function CalloutBlock({ node, updateAttributes, deleteNode }: NodeViewProps) {
  const icon = node.attrs.icon || '💡';
  const tint: CalloutTint = node.attrs.tint || 'amber';
  const title = node.attrs.title ?? '';
  const text = node.attrs.text ?? '';

  const [localTitle, setLocalTitle] = React.useState(title);
  const [localText, setLocalText] = React.useState(text);
  const [showPicker, setShowPicker] = React.useState(false);

  const pickerRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setLocalTitle(node.attrs.title ?? '');
  }, [node.attrs.title]);

  React.useEffect(() => {
    setLocalText(node.attrs.text ?? '');
  }, [node.attrs.text]);

  // Outside click to close picker
  React.useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPicker]);

  // Auto-resize textarea
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(28, textareaRef.current.scrollHeight)}px`;
    }
  }, [localText]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setLocalTitle(val);
    updateAttributes({ title: val });
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalText(val);
    updateAttributes({ text: val });
  };

  const handleSetIcon = (selectedIcon: string) => {
    updateAttributes({ icon: selectedIcon });
  };

  const handleSetTint = (selectedTint: CalloutTint) => {
    updateAttributes({ tint: selectedTint });
  };

  const config = TINT_CONFIGS[tint] || TINT_CONFIGS.amber;

  return (
    <NodeViewWrapper className="my-3 not-prose block w-full select-text">
      <div
        className={cn(
          'group/callout relative flex items-start gap-3.5 p-4 rounded-2xl border backdrop-blur-xl shadow-xs transition-all duration-200 hover:shadow-md',
          config.containerClass
        )}
      >
        {/* Left Icon Button (triggers icon & color picker) */}
        <div className="relative shrink-0 mt-0.5">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className={cn(
              'w-9 h-9 rounded-xl border flex items-center justify-center text-lg shadow-2xs hover:scale-105 active:scale-95 transition-all cursor-pointer',
              config.iconBg
            )}
            title="Change Callout Icon & Color"
          >
            <span>{icon}</span>
          </button>

          {/* Icon & Color Tint Palette Popover */}
          {showPicker && (
            <div
              ref={pickerRef}
              className="absolute left-0 top-full mt-2 w-64 p-3 rounded-2xl bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong shadow-2xl z-40 space-y-3 animate-in fade-in zoom-in-95 duration-150 select-none"
            >
              {/* Tint Selection */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Color Tint
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.values(TINT_CONFIGS).map((item) => {
                    const isSelected = item.id === tint;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSetTint(item.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium border transition-all text-left',
                          isSelected
                            ? 'bg-secondary/90 border-primary font-semibold'
                            : 'border-border/60 hover:bg-secondary/60'
                        )}
                      >
                        <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', item.dotBg)} />
                        <span className="truncate text-[11px]">{item.label.split(' ')[1] || item.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-primary ml-auto" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Emoji Icons */}
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                  Preset Icons
                </span>
                <div className="grid grid-cols-6 gap-1">
                  {EMOJI_OPTIONS.map((em) => (
                    <button
                      key={em}
                      type="button"
                      onClick={() => handleSetIcon(em)}
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center text-sm border hover:scale-110 active:scale-95 transition-all cursor-pointer',
                        icon === em ? 'border-primary bg-primary/10' : 'border-border/60 hover:bg-secondary'
                      )}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Optional Title Field */}
          <input
            type="text"
            value={localTitle}
            onChange={handleTitleChange}
            placeholder="Callout title (optional)"
            className="w-full text-sm font-bold bg-transparent outline-none placeholder:text-muted-foreground/50 text-foreground transition-colors"
          />

          {/* Message Textarea with auto-height */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={localText}
            onChange={handleTextChange}
            placeholder="Type your callout note or guidance..."
            className="w-full resize-none text-xs leading-relaxed bg-transparent outline-none placeholder:text-muted-foreground/60 text-foreground/90 transition-colors custom-scrollbar"
          />
        </div>

        {/* Quick Floating Action Controls on Hover */}
        <div className="opacity-0 group-hover/callout:opacity-100 transition-opacity flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowPicker(!showPicker)}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/80 transition-colors"
            title="Change Tint / Icon"
          >
            <Palette className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={deleteNode}
            className="p-1 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            title="Delete Callout"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

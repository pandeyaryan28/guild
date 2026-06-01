import * as React from 'react';
import { Search, ChevronDown, Check, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  detail?: string;
  photoURL?: string;
}

interface SearchableSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  className,
  triggerClassName,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search when opening/closing
  React.useEffect(() => {
    if (!isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = React.useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.detail && opt.detail.toLowerCase().includes(q))
    );
  }, [options, search]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className={cn('relative w-full text-left', className)} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center justify-between bg-surface border border-border-default rounded-xl px-3.5 py-2.5 text-xs text-foreground outline-none hover:border-accent/30 focus:border-accent/40 font-semibold transition-all cursor-pointer shadow-xs',
          triggerClassName
        )}
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedOption ? (
            <>
              {selectedOption.photoURL ? (
                <img
                  src={selectedOption.photoURL}
                  alt={selectedOption.label}
                  className="w-5 h-5 rounded-full object-cover shrink-0 border border-white/10 dark:border-black/20"
                />
              ) : (
                <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-[8px] text-primary shrink-0">
                  {getInitials(selectedOption.label)}
                </div>
              )}
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.detail && (
                <span className="text-[10px] text-muted-foreground truncate font-normal">
                  ({selectedOption.detail})
                </span>
              )}
            </>
          ) : (
            <span className="text-muted-foreground font-normal">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200',
            isOpen ? 'rotate-180 text-foreground' : ''
          )}
        />
      </button>

      {/* Dropdown Card */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-surface/95 dark:bg-neutral-900/95 border border-border-default/80 dark:border-neutral-800 rounded-2xl shadow-xl backdrop-blur-xl py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Search Box */}
          <div className="px-2.5 pb-2 pt-1 border-b border-border-default/45 dark:border-neutral-800/60 flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground font-semibold"
            />
          </div>

          {/* Options Scroll Container */}
          <div className="max-h-56 overflow-y-auto pr-0.5 aether-scroll mt-1.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-xs font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800/80 text-left transition-colors cursor-pointer',
                      isSelected ? 'text-primary bg-primary/[0.03] dark:bg-primary/[0.05]' : 'text-foreground'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {opt.photoURL ? (
                        <img
                          src={opt.photoURL}
                          alt={opt.label}
                          className="w-5.5 h-5.5 rounded-full object-cover shrink-0 border border-white/10 dark:border-black/20"
                        />
                      ) : (
                        <div className="w-5.5 h-5.5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center font-bold text-[8px] text-primary shrink-0">
                          {getInitials(opt.label)}
                        </div>
                      )}
                      <div className="leading-tight overflow-hidden">
                        <p className="truncate">{opt.label}</p>
                        {opt.detail && (
                          <p className="text-[10px] text-muted-foreground truncate font-normal mt-0.5">
                            {opt.detail}
                          </p>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0 stroke-[2.5]" />}
                  </button>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground italic text-center py-6">
                No items match your search.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

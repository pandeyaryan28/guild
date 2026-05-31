import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, CheckSquare, Hash, User, MessageSquare,
  ArrowUpDown, CornerDownLeft, X, Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useChannels, useOrgMembers } from '../hooks/useChat';
import {
  searchTasks, searchChannels, searchPeople, searchMessages,
  highlightSegments, EMPTY_RESULTS,
  type SearchResultItem, type SearchResults,
} from '../lib/search';
import { STATUS_CONFIG } from '../lib/tasks';

// ─── Props ────────────────────────────────────────────────────────────────────

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

// ─── Result type icon ─────────────────────────────────────────────────────────

const TYPE_ICON: Record<string, React.ElementType> = {
  task: CheckSquare,
  channel: Hash,
  person: User,
  message: MessageSquare,
};

const TYPE_LABEL: Record<string, string> = {
  task: 'Tasks',
  channel: 'Channels',
  person: 'People',
  message: 'Messages',
};

// ─── Highlight span ───────────────────────────────────────────────────────────

function Highlight({ text, query }: { text: string; query: string }) {
  const segments = highlightSegments(text, query);
  return (
    <>
      {segments.map(([seg, isMatch], i) =>
        isMatch ? (
          <mark key={i} className="bg-primary/20 text-primary rounded px-0.5">
            {seg}
          </mark>
        ) : (
          <span key={i}>{seg}</span>
        ),
      )}
    </>
  );
}

// ─── Single result row ────────────────────────────────────────────────────────

function ResultRow({
  item,
  query,
  active,
  onClick,
}: {
  item: SearchResultItem;
  query: string;
  active: boolean;
  onClick: () => void;
}) {
  const Icon = TYPE_ICON[item.type] ?? Search;

  return (
    <button
      className={cn(
        'flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
        active ? 'bg-accent/60 text-foreground' : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground',
      )}
      onClick={onClick}
    >
      <div className={cn(
        'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
        active ? 'bg-primary/20 text-primary' : 'bg-bg-tertiary text-muted-foreground',
      )}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          <Highlight text={item.title} query={query} />
        </p>
        {item.subtitle && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            <Highlight text={item.subtitle} query={query} />
          </p>
        )}
      </div>
      {item.meta && item.type === 'task' && (
        <span className={cn(
          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
          STATUS_CONFIG[item.meta as keyof typeof STATUS_CONFIG]?.color ?? 'text-muted-foreground',
          'bg-bg-tertiary',
        )}>
          {STATUS_CONFIG[item.meta as keyof typeof STATUS_CONFIG]?.label ?? item.meta}
        </span>
      )}
      {item.meta && item.type === 'person' && (
        <span className="shrink-0 rounded-full bg-bg-tertiary px-2 py-0.5 text-[10px] font-medium capitalize text-muted-foreground">
          {item.meta}
        </span>
      )}
    </button>
  );
}

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({
  type,
  items,
  query,
  activeIndex,
  baseIndex,
  onSelect,
}: {
  type: string;
  items: SearchResultItem[];
  query: string;
  activeIndex: number;
  baseIndex: number;
  onSelect: (item: SearchResultItem) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="mb-2">
      <div className="mb-1 flex items-center gap-2 px-3 py-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          {TYPE_LABEL[type] ?? type}
        </span>
      </div>
      {items.map((item, i) => (
        <ResultRow
          key={item.id}
          item={item}
          query={query}
          active={activeIndex === baseIndex + i}
          onClick={() => onSelect(item)}
        />
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResults>(EMPTY_RESULTS);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Tasks come as a flat array directly
  const { tasks: allTasks } = useTasks(orgId);

  const { channels } = useChannels(orgId);
  const members = useOrgMembers(orgId);
  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  // Run search when debounced query changes
  React.useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(EMPTY_RESULTS);
      return;
    }
    const q = debouncedQuery;
    setResults({
      tasks: searchTasks(allTasks, q),
      channels: searchChannels(channels, q),
      people: searchPeople(members, q),
      messages: [],
    });

    // Also fetch messages async
    if (orgId && q.length >= 2) {
      setLoadingMessages(true);
      searchMessages(orgId, q)
        .then((msgs) => setResults((prev) => ({ ...prev, messages: msgs })))
        .catch(console.error)
        .finally(() => setLoadingMessages(false));
    }
  }, [debouncedQuery, allTasks, channels, members, orgId]);

  // Reset on close/open
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setDebouncedQuery('');
      setResults(EMPTY_RESULTS);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard shortcut to open (Cmd+K / Ctrl+K) — registered externally in Layout
  // Escape to close
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Build flat list for keyboard navigation
  const flatItems = React.useMemo(
    () => [
      ...results.tasks,
      ...results.channels,
      ...results.people,
      ...results.messages,
    ],
    [results],
  );

  // Section base indices for active tracking
  const sectionBases = React.useMemo(() => ({
    tasks: 0,
    channels: results.tasks.length,
    people: results.tasks.length + results.channels.length,
    messages: results.tasks.length + results.channels.length + results.people.length,
  }), [results]);

  // Arrow key navigation
  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' && flatItems[activeIndex]) {
        handleSelect(flatItems[activeIndex]);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, flatItems, activeIndex]);

  // Reset activeIndex when results change
  React.useEffect(() => setActiveIndex(0), [results]);

  function handleSelect(item: SearchResultItem) {
    navigate(item.href);
    onClose();
  }

  const hasResults = flatItems.length > 0;
  const showEmpty = debouncedQuery.length >= 1 && !hasResults && !loadingMessages;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-[12vh] z-[60] w-[calc(100%-2rem)] sm:w-full sm:max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border-default/80 aether-glass-elevated shadow-2xl backdrop-blur-3xl"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border-default px-4 py-3.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks, channels, people, messages…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-text-muted outline-none"
              />
              {query && (
                <button
                  onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              {!query && (
                <div className="flex items-center gap-1 rounded-md border border-border-default bg-bg-tertiary px-2 py-1">
                  <span className="text-[10px] text-text-muted">ESC</span>
                </div>
              )}
            </div>

            {/* Results */}
            <div className="max-h-[60vh] overflow-y-auto p-2 scrollbar-hide">
              {!debouncedQuery && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-border-default bg-bg-tertiary">
                    <Search className="h-5 w-5 text-text-muted" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Start typing to search</p>
                  <p className="mt-1 text-xs text-text-muted">Tasks, channels, people, and messages</p>
                </div>
              )}

              {hasResults && (
                <>
                  <Section type="tasks" items={results.tasks} query={debouncedQuery} activeIndex={activeIndex} baseIndex={sectionBases.tasks} onSelect={handleSelect} />
                  <Section type="channels" items={results.channels} query={debouncedQuery} activeIndex={activeIndex} baseIndex={sectionBases.channels} onSelect={handleSelect} />
                  <Section type="people" items={results.people} query={debouncedQuery} activeIndex={activeIndex} baseIndex={sectionBases.people} onSelect={handleSelect} />
                  <Section type="messages" items={results.messages} query={debouncedQuery} activeIndex={activeIndex} baseIndex={sectionBases.messages} onSelect={handleSelect} />
                </>
              )}

              {loadingMessages && !hasResults && (
                <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Searching messages…</span>
                </div>
              )}

              {showEmpty && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm font-medium text-muted-foreground">No results for "{debouncedQuery}"</p>
                  <p className="mt-1 text-xs text-text-muted">Try a different search term</p>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 border-t border-border-default bg-bg-tertiary px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <CornerDownLeft className="h-3 w-3" />
                <span>to select</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                <ArrowUpDown className="h-3 w-3" />
                <span>to navigate</span>
              </div>
              <div className="ml-auto text-[11px] text-text-muted">
                {flatItems.length > 0 && `${flatItems.length} result${flatItems.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

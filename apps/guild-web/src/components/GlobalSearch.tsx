import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  CheckSquare,
  Hash,
  User,
  MessageSquare,
  ArrowUpDown,
  CornerDownLeft,
  X,
  Loader2,
  LayoutDashboard,
  BookOpen,
  FileCheck,
  Calendar,
  BarChart3,
  Settings,
  Sun,
  Moon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useTasks } from '../hooks/useTasks';
import { useChannels, useOrgMembers } from '../hooks/useChat';
import {
  searchTasks,
  searchChannels,
  searchPeople,
  searchMessages,
  highlightSegments,
  EMPTY_RESULTS,
  type SearchResultItem,
  type SearchResults,
} from '../lib/search';
import { STATUS_CONFIG } from '../lib/tasks';

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

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
      type="button"
      className={cn(
        'flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors cursor-pointer',
        active
          ? 'bg-secondary text-foreground'
          : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg',
          active ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground',
        )}
      >
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
        <span
          className={cn(
            'shrink-0 text-xs font-medium capitalize',
            STATUS_CONFIG[item.meta as keyof typeof STATUS_CONFIG]?.color ?? 'text-muted-foreground',
          )}
        >
          {STATUS_CONFIG[item.meta as keyof typeof STATUS_CONFIG]?.label ?? item.meta}
        </span>
      )}
      {item.meta && item.type === 'person' && (
        <span className="shrink-0 text-xs font-medium capitalize text-muted-foreground">
          {item.meta}
        </span>
      )}
    </button>
  );
}

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
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
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

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { mode, toggleMode } = useTheme();
  const orgId = userProfile?.organizationId;

  const inputRef = React.useRef<HTMLInputElement>(null);
  const [query, setQuery] = React.useState('');
  const [debouncedQuery, setDebouncedQuery] = React.useState('');
  const [results, setResults] = React.useState<SearchResults>(EMPTY_RESULTS);
  const [loadingMessages, setLoadingMessages] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(0);

  const { tasks: allTasks } = useTasks(orgId);
  const { channels, memberships } = useChannels(orgId);
  const members = useOrgMembers(orgId);

  const accessibleChannels = React.useMemo(
    () => channels.filter((c) => !c.isPrivate || memberships.has(c.id)),
    [channels, memberships],
  );

  const allowedChannelIds = React.useMemo(
    () => new Set(accessibleChannels.map((c) => c.id)),
    [accessibleChannels],
  );

  const quickActions = React.useMemo(
    () => [
      { id: 'act-workspace', label: 'Open Execution Workspace', subtitle: 'Tasks, Kanban board, projects, and goals', icon: CheckSquare, action: () => navigate('/workspace') },
      { id: 'act-chat', label: 'Open Team Chat', subtitle: 'Channels and direct messages', icon: MessageSquare, action: () => navigate('/chat') },
      { id: 'act-studio', label: 'Open Studio & Docs', subtitle: 'Cycles, issues, and workspace documents', icon: BookOpen, action: () => navigate('/studio') },
      { id: 'act-requests', label: 'Open Operational Requests', subtitle: 'Review and submit approvals', icon: FileCheck, action: () => navigate('/requests') },
      { id: 'act-calendar', label: 'Open Schedule & Calendar', subtitle: 'Deadlines and milestones', icon: Calendar, action: () => navigate('/calendar') },
      { id: 'act-people', label: 'Open People & Directory', subtitle: 'Team members and workload', icon: User, action: () => navigate('/people') },
      { id: 'act-reports', label: 'Open Analytics & Reports', subtitle: 'Execution metrics and velocity', icon: BarChart3, action: () => navigate('/reports') },
      { id: 'act-dashboard', label: 'Go to Workspace Overview', subtitle: 'Daily focus and team activity', icon: LayoutDashboard, action: () => navigate('/') },
      { id: 'act-settings', label: 'Open Workspace Settings', subtitle: 'Profile, notifications, and organization', icon: Settings, action: () => navigate('/settings') },
      {
        id: 'act-theme',
        label: mode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        subtitle: 'Toggle workspace color mode',
        icon: mode === 'dark' ? Sun : Moon,
        action: () => toggleMode(),
      },
    ],
    [navigate, mode, toggleMode],
  );

  React.useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 180);
    return () => clearTimeout(t);
  }, [query]);

  React.useEffect(() => {
    if (!debouncedQuery.trim()) {
      setResults(EMPTY_RESULTS);
      return;
    }
    const q = debouncedQuery;
    setResults({
      tasks: searchTasks(allTasks, q),
      channels: searchChannels(accessibleChannels, q),
      people: searchPeople(members, q),
      messages: [],
    });

    if (orgId && q.length >= 2) {
      setLoadingMessages(true);
      searchMessages(orgId, q, {
        allowedChannelIds,
        userId: userProfile?.uid,
      })
        .then((msgs) => setResults((prev) => ({ ...prev, messages: msgs })))
        .catch(console.error)
        .finally(() => setLoadingMessages(false));
    }
  }, [debouncedQuery, allTasks, accessibleChannels, members, orgId, allowedChannelIds, userProfile?.uid]);

  React.useEffect(() => {
    if (open) {
      setQuery('');
      setDebouncedQuery('');
      setResults(EMPTY_RESULTS);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const flatItems = React.useMemo(
    () => [
      ...results.tasks,
      ...results.channels,
      ...results.people,
      ...results.messages,
    ],
    [results],
  );

  const sectionBases = React.useMemo(
    () => ({
      tasks: 0,
      channels: results.tasks.length,
      people: results.tasks.length + results.channels.length,
      messages: results.tasks.length + results.channels.length + results.people.length,
    }),
    [results],
  );

  const totalNavigableCount = debouncedQuery.trim() ? flatItems.length : quickActions.length;

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(0, totalNavigableCount - 1)));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        if (debouncedQuery.trim() && flatItems[activeIndex]) {
          e.preventDefault();
          handleSelect(flatItems[activeIndex]);
        } else if (!debouncedQuery.trim() && quickActions[activeIndex]) {
          e.preventDefault();
          quickActions[activeIndex].action();
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, debouncedQuery, flatItems, quickActions, activeIndex, totalNavigableCount]);

  React.useEffect(() => setActiveIndex(0), [results, debouncedQuery]);

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
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: 'spring', stiffness: 400, damping: 32 }}
            className="fixed left-1/2 top-[12vh] z-[60] w-[calc(100%-2rem)] sm:w-full sm:max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search tasks, channels, people, messages, or run a command…"
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <kbd className="rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  ESC
                </kbd>
              )}
            </div>

            {/* Results or Quick Actions */}
            <div className="max-h-[58vh] overflow-y-auto p-2 aether-scroll">
              {!debouncedQuery && (
                <div>
                  <div className="mb-1 px-3 py-1">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Quick Actions
                    </span>
                  </div>
                  {quickActions.map((act, idx) => {
                    const Icon = act.icon;
                    const isActive = activeIndex === idx;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        onClick={() => {
                          act.action();
                          onClose();
                        }}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors cursor-pointer',
                          isActive
                            ? 'bg-secondary text-foreground'
                            : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
                            isActive ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground',
                          )}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{act.label}</p>
                          <p className="truncate text-xs text-muted-foreground">{act.subtitle}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {hasResults && (
                <>
                  <Section
                    type="tasks"
                    items={results.tasks}
                    query={debouncedQuery}
                    activeIndex={activeIndex}
                    baseIndex={sectionBases.tasks}
                    onSelect={handleSelect}
                  />
                  <Section
                    type="channels"
                    items={results.channels}
                    query={debouncedQuery}
                    activeIndex={activeIndex}
                    baseIndex={sectionBases.channels}
                    onSelect={handleSelect}
                  />
                  <Section
                    type="people"
                    items={results.people}
                    query={debouncedQuery}
                    activeIndex={activeIndex}
                    baseIndex={sectionBases.people}
                    onSelect={handleSelect}
                  />
                  <Section
                    type="messages"
                    items={results.messages}
                    query={debouncedQuery}
                    activeIndex={activeIndex}
                    baseIndex={sectionBases.messages}
                    onSelect={handleSelect}
                  />
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
                  <p className="text-sm font-medium text-foreground">No results for "{debouncedQuery}"</p>
                  <p className="mt-1 text-xs text-muted-foreground">Try a different search term</p>
                </div>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 border-t border-border bg-secondary/50 px-4 py-2.5">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <CornerDownLeft className="h-3 w-3" />
                <span>to select</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <ArrowUpDown className="h-3 w-3" />
                <span>to navigate</span>
              </div>
              <div className="ml-auto text-[11px] text-muted-foreground">
                {flatItems.length > 0 && `${flatItems.length} result${flatItems.length !== 1 ? 's' : ''}`}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

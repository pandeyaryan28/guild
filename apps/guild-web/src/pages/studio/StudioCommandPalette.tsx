import * as React from 'react';
import { Search, FileText, CheckCircle2, Plus, Sparkles, X, Compass, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { WorkspaceDocument, WorkspaceIssue } from '@guild/types';
import { cn } from '@/lib/utils';

interface StudioCommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  documents: WorkspaceDocument[];
  issues: WorkspaceIssue[];
  onSelectDoc: (docId: string) => void;
  onSelectIssue: (issueId: string) => void;
  onCreateDoc: () => void;
  onCreateIssue: () => void;
}

export function StudioCommandPalette({
  isOpen,
  onClose,
  documents,
  issues,
  onSelectDoc,
  onSelectIssue,
  onCreateDoc,
  onCreateIssue
}: StudioCommandPaletteProps) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filteredDocs = React.useMemo(() => {
    if (!query.trim()) return documents.slice(0, 5);
    return documents
      .filter((d) => d.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 5);
  }, [documents, query]);

  const filteredIssues = React.useMemo(() => {
    if (!query.trim()) return issues.slice(0, 5);
    return issues
      .filter(
        (i) =>
          i.title.toLowerCase().includes(query.toLowerCase()) ||
          i.identifier.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 5);
  }, [issues, query]);

  const allItems = React.useMemo(() => {
    const list: Array<
      | { type: 'action'; label: string; icon: any; action: () => void }
      | { type: 'doc'; doc: WorkspaceDocument }
      | { type: 'issue'; issue: WorkspaceIssue }
    > = [
      {
        type: 'action',
        label: 'Create New Document',
        icon: Plus,
        action: () => {
          onCreateDoc();
          onClose();
        }
      },
      {
        type: 'action',
        label: 'Create New Linear Issue',
        icon: Sparkles,
        action: () => {
          onCreateIssue();
          onClose();
        }
      }
    ];

    filteredDocs.forEach((doc) => list.push({ type: 'doc', doc }));
    filteredIssues.forEach((issue) => list.push({ type: 'issue', issue }));
    return list;
  }, [filteredDocs, filteredIssues, onCreateDoc, onCreateIssue, onClose]);

  // Key navigation
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + allItems.length) % Math.max(1, allItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = allItems[selectedIndex];
        if (!selected) return;
        if (selected.type === 'action') {
          selected.action();
        } else if (selected.type === 'doc') {
          onSelectDoc(selected.doc.id);
          onClose();
        } else if (selected.type === 'issue') {
          onSelectIssue(selected.issue.id);
          onClose();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, allItems, selectedIndex, onClose, onSelectDoc, onSelectIssue]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
        {/* Dimming Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="relative w-full max-w-xl bg-surface/90 dark:bg-surface/85 backdrop-blur-2xl border border-border dark:border-border-strong rounded-3xl shadow-2xl overflow-hidden z-10"
        >
          {/* Search Header */}
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/80">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder="Search documents, issues, or run commands..."
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none font-medium"
            />
            <span className="text-[10px] uppercase font-bold text-muted-foreground/60 border border-border px-1.5 py-0.5 rounded-md">
              ESC
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-[380px] overflow-y-auto p-2 space-y-1">
            {allItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              if (item.type === 'action') {
                const Icon = item.icon;
                return (
                  <div
                    key={`action-${item.label}`}
                    onClick={() => {
                      item.action();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-semibold transition-all',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-foreground/80 hover:bg-secondary/60'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-mono">Action</span>
                  </div>
                );
              }

              if (item.type === 'doc') {
                return (
                  <div
                    key={`doc-${item.doc.id}`}
                    onClick={() => {
                      onSelectDoc(item.doc.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-semibold transition-all',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'text-foreground/80 hover:bg-secondary/60'
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-base">{item.doc.icon || '📄'}</span>
                      <span className="truncate">{item.doc.title || 'Untitled Document'}</span>
                    </div>
                    <span className="text-[10px] opacity-75 font-mono shrink-0">Doc</span>
                  </div>
                );
              }

              return (
                <div
                  key={`issue-${item.issue.id}`}
                  onClick={() => {
                    onSelectIssue(item.issue.id);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={cn(
                    'flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs font-semibold transition-all',
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'text-foreground/80 hover:bg-secondary/60'
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-muted/60 text-muted-foreground">
                      {item.issue.identifier}
                    </span>
                    <span className="truncate">{item.issue.title}</span>
                  </div>
                  <span className="text-[10px] opacity-75 capitalize font-mono shrink-0">
                    {item.issue.status}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Footer Shortcuts */}
          <div className="flex items-center justify-between px-4 py-2 bg-secondary/30 border-t border-border text-[11px] text-muted-foreground font-medium">
            <div className="flex items-center gap-2">
              <span>↑↓ Navigate</span>
              <span>•</span>
              <span>↵ Open</span>
            </div>
            <span>Studio Engine</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

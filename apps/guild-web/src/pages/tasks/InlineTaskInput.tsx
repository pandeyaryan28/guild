import * as React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { createTask, type ActorInfo, type TaskStatus } from '../../lib/tasks';

interface InlineTaskInputProps {
  orgId: string;
  actor: ActorInfo;
  defaultStatus?: TaskStatus;
  defaultProjectId?: string | null;
  defaultGoalId?: string | null;
  placeholder?: string;
  /** Called after a task is successfully created */
  onCreated?: () => void;
}

/**
 * Floating bottom "Add task" bar — Google Tasks style.
 * - Click the + area to start typing
 * - Press Enter → saves task, input clears, focus stays (ready for next task)
 * - Press Escape → collapses back to the subtle prompt
 */
export function InlineTaskInput({
  orgId,
  actor,
  defaultStatus = 'todo',
  defaultProjectId = null,
  defaultGoalId = null,
  placeholder = 'Add a task',
  onCreated,
}: InlineTaskInputProps) {
  const [active, setActive] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const activate = () => {
    setActive(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const collapse = () => {
    setActive(false);
    setTitle('');
  };

  const save = async () => {
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await createTask({
        orgId,
        title: trimmed,
        description: '',
        status: defaultStatus,
        priority: 'none',
        assigneeIds: [],
        labelIds: [],
        dueDate: null,
        actor,
        projectId: defaultProjectId,
        goalId: defaultGoalId,
      });
      setTitle('');
      onCreated?.();
      // Keep focus for rapid-entry mode
      requestAnimationFrame(() => inputRef.current?.focus());
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') collapse();
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 px-4 pb-5 pt-2 pointer-events-none">
      <div
        className={cn(
          'pointer-events-auto relative rounded-xl border transition-all duration-200 overflow-hidden',
          active
            ? 'border-primary/30 bg-card/95 shadow-lg shadow-black/10 backdrop-blur-sm ring-1 ring-primary/10'
            : 'border-border/30 bg-card/80 backdrop-blur-sm hover:border-border/60 hover:bg-card/90 shadow-sm cursor-text',
        )}
        onClick={!active ? activate : undefined}
      >
        <div className="flex items-center gap-2.5 px-4 py-3">
          {/* Plus icon */}
          <div className={cn(
            'flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors',
            active ? 'border-primary/50 bg-primary/10' : 'border-border/40',
          )}>
            <Plus className={cn('h-2.5 w-2.5 transition-colors', active ? 'text-primary' : 'text-muted-foreground/40')} />
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setActive(true)}
            onBlur={() => { if (!title.trim()) collapse(); }}
            placeholder={active ? 'Task title…' : placeholder}
            disabled={saving}
            className={cn(
              'flex-1 bg-transparent text-sm outline-none placeholder:transition-colors',
              active
                ? 'text-foreground placeholder:text-muted-foreground/40'
                : 'text-muted-foreground/50 placeholder:text-muted-foreground/40 cursor-text',
            )}
          />

          {/* Hint text */}
          {active && title.trim() && (
            <span className="flex-shrink-0 text-[10px] text-muted-foreground/40 select-none">
              Enter to save · Esc to cancel
            </span>
          )}

          {/* Saving indicator */}
          {saving && (
            <div className="flex-shrink-0 h-3.5 w-3.5 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          )}
        </div>
      </div>
    </div>
  );
}

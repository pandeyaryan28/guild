import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus, CheckCircle2, ArrowRight, UserPlus, UserMinus,
  Tag, TagIcon, Calendar, Pencil, MessageSquare, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TaskActivity, type ActivityType, STATUS_CONFIG, PRIORITY_CONFIG } from '../../lib/tasks';

const ICON_MAP: Record<ActivityType, React.ElementType> = {
  created: Zap,
  status_changed: ArrowRight,
  assigned: UserPlus,
  unassigned: UserMinus,
  priority_changed: CheckCircle2,
  edited: Pencil,
  commented: MessageSquare,
  label_added: Tag,
  label_removed: TagIcon,
  due_date_set: Calendar,
};

function activityText(a: TaskActivity): string {
  switch (a.type) {
    case 'created': return 'created this task';
    case 'status_changed':
      return `moved from ${STATUS_CONFIG[a.payload.from as keyof typeof STATUS_CONFIG]?.label ?? a.payload.from} → ${STATUS_CONFIG[a.payload.to as keyof typeof STATUS_CONFIG]?.label ?? a.payload.to}`;
    case 'assigned': {
      const ids = a.payload.assigneeIds as string[] | undefined;
      return `assigned ${(ids?.length ?? 0) > 1 ? `${ids!.length} members` : 'a member'}`;
    }
    case 'unassigned': return 'removed an assignee';
    case 'priority_changed':
      return `changed priority: ${PRIORITY_CONFIG[a.payload.from as keyof typeof PRIORITY_CONFIG]?.label ?? a.payload.from} → ${PRIORITY_CONFIG[a.payload.to as keyof typeof PRIORITY_CONFIG]?.label ?? a.payload.to}`;
    case 'edited': return 'edited the task';
    case 'commented': return `commented: "${a.payload.preview}"`;
    case 'label_added': return 'added a label';
    case 'label_removed': return 'removed a label';
    case 'due_date_set': {
      const dd = a.payload.dueDate as string | null | undefined;
      return dd ? `set due date to ${new Date(dd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'removed due date';
    }
    default: return 'made a change';
  }
}

interface TaskActivityProps {
  activities: TaskActivity[];
}

export function TaskActivityFeed({ activities }: TaskActivityProps) {
  if (activities.length === 0) {
    return <p className="text-xs text-muted-foreground py-6 text-center">No activity yet.</p>;
  }

  return (
    <div className="space-y-1 py-2">
      {activities.map((a) => {
        const Icon = ICON_MAP[a.type] ?? Zap;
        const ts = a.createdAt?.toDate ? a.createdAt.toDate() : new Date();
        return (
          <div key={a.id} className="flex items-start gap-3 py-2">
            <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-bg-tertiary">
              <Icon className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-foreground/80 leading-relaxed">
                <span className="font-medium text-foreground">{a.actorName}</span>
                {' '}{activityText(a)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {formatDistanceToNow(ts, { addSuffix: true })}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

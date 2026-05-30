import React from 'react';
import type { TaskActivity, UserProfile, Organization, Task } from '@guild/types';
import { format } from 'date-fns';
import {
  PlusCircle,
  RefreshCw,
  MessageSquare,
  Tag,
  UserPlus,
  UserMinus,
  Calendar,
  AlertOctagon,
  Edit2,
  FileText,
  Clock,
  Building
} from 'lucide-react';

interface ActivityFeedProps {
  activities: TaskActivity[];
  users: UserProfile[];
  orgs: Organization[];
  tasks: Task[];
  
  // Filters
  orgFilter: string;
  userFilter: string;
  dateFilter: string; // "7d" | "30d" | "all"
}

export function ActivityFeed({
  activities,
  users,
  orgs,
  tasks,
  orgFilter,
  userFilter,
  dateFilter,
}: ActivityFeedProps) {
  const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]));
  const userMap = Object.fromEntries(users.map(u => [u.uid, u.fullName || u.username]));
  const taskMap = Object.fromEntries(tasks.map(t => [t.id, t.title]));

  // Date formatter
  function fmtTime(ts: any) {
    if (!ts) return '';
    try {
      return format(ts.toDate(), 'MMM d, yyyy h:mm a');
    } catch {
      return '';
    }
  }

  // Filter activities
  const filteredActivities = activities.filter(act => {
    const matchesOrg = orgFilter === 'all' || act.orgId === orgFilter;
    const matchesUser = userFilter === 'all' || act.actorId === userFilter;
    
    let matchesDate = true;
    if (dateFilter !== 'all') {
      const now = new Date().getTime();
      let activityMs = 0;
      try {
        activityMs = act.createdAt.toDate().getTime();
      } catch {}
      
      const filterDays = dateFilter === '7d' ? 7 : 30;
      matchesDate = (now - activityMs) < filterDays * 24 * 60 * 60 * 1000;
    }

    return matchesOrg && matchesUser && matchesDate;
  });

  // Render icons and texts based on activity type
  function renderEventDetails(act: TaskActivity) {
    const payload = (act.payload || {}) as any;
    const taskTitle = (taskMap[act.taskId] || payload.title || 'Unknown Task') as string;
    const actorName = (act.actorName || userMap[act.actorId] || 'Someone') as string;

    let icon = <FileText className="w-4 h-4 text-zinc-400" />;
    let message = <span>performed an action.</span>;
    let bgColor = 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20';

    switch (act.type) {
      case 'created':
        icon = <PlusCircle className="w-4 h-4 text-emerald-400" />;
        bgColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
        message = (
          <span>
            created task <strong className="text-[--foreground]">{taskTitle}</strong>
          </span>
        );
        break;

      case 'status_changed':
        icon = <RefreshCw className="w-4 h-4 text-blue-400" />;
        bgColor = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        const fromStatus = String(payload.from || 'unknown').replace('_', ' ');
        const toStatus = String(payload.to || 'unknown').replace('_', ' ');
        message = (
          <span>
            changed status of <strong className="text-[--foreground]">{taskTitle}</strong> from{' '}
            <span className="px-1.5 py-0.5 rounded-md bg-zinc-800 text-[10px] font-semibold uppercase">{fromStatus}</span> to{' '}
            <span className="px-1.5 py-0.5 rounded-md bg-[--primary]/10 text-[--primary] text-[10px] font-semibold uppercase">{toStatus}</span>
          </span>
        );
        break;

      case 'priority_changed':
        icon = <AlertOctagon className="w-4 h-4 text-amber-400" />;
        bgColor = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
        const fromPri = String(payload.from || 'none');
        const toPri = String(payload.to || 'none');
        message = (
          <span>
            updated priority of <strong className="text-[--foreground]">{taskTitle}</strong> from{' '}
            <strong className="text-zinc-400">{fromPri}</strong> to <strong className="text-amber-400">{toPri}</strong>
          </span>
        );
        break;

      case 'assigned':
        icon = <UserPlus className="w-4 h-4 text-indigo-400" />;
        bgColor = 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
        const assignedIds = payload.assigneeIds as string[] | undefined;
        const assignedNames = assignedIds?.map(uid => userMap[uid]).filter(Boolean).join(', ') || 'new members';
        message = (
          <span>
            assigned <strong className="text-[--foreground]">{taskTitle}</strong> to <strong className="text-[--foreground]">{assignedNames}</strong>
          </span>
        );
        break;

      case 'unassigned':
        icon = <UserMinus className="w-4 h-4 text-rose-400" />;
        bgColor = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
        const unassignedIds = payload.assigneeIds as string[] | undefined;
        const unassignedNames = unassignedIds?.map(uid => userMap[uid]).filter(Boolean).join(', ') || 'members';
        message = (
          <span>
            unassigned <strong className="text-[--foreground]">{unassignedNames}</strong> from <strong className="text-[--foreground]">{taskTitle}</strong>
          </span>
        );
        break;

      case 'commented':
        icon = <MessageSquare className="w-4 h-4 text-purple-400" />;
        bgColor = 'bg-purple-500/10 text-purple-400 border-purple-500/20';
        const preview = String(payload.preview || '');
        message = (
          <span>
            commented on <strong className="text-[--foreground]">{taskTitle}</strong>:{' '}
            <em className="text-[--muted-foreground] block mt-1 pl-3.5 border-l border-white/10 dark:border-white/5">
              "{preview.length > 80 ? `${preview.slice(0, 80)}...` : preview}"
            </em>
          </span>
        );
        break;

      case 'due_date_set':
        icon = <Calendar className="w-4 h-4 text-sky-400" />;
        bgColor = 'bg-sky-500/10 text-sky-400 border-sky-500/20';
        const dueVal = payload.dueDate ? format(new Date(payload.dueDate as string), 'MMM d, yyyy') : 'none';
        message = (
          <span>
            set due date for <strong className="text-[--foreground]">{taskTitle}</strong> to <strong className="text-[--foreground]">{dueVal}</strong>
          </span>
        );
        break;

      case 'label_added':
        icon = <Tag className="w-4 h-4 text-teal-400" />;
        bgColor = 'bg-teal-500/10 text-teal-400 border-teal-500/20';
        message = (
          <span>
            added label to task <strong className="text-[--foreground]">{taskTitle}</strong>
          </span>
        );
        break;

      case 'label_removed':
        icon = <Tag className="w-4 h-4 text-zinc-500" />;
        bgColor = 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
        message = (
          <span>
            removed label from task <strong className="text-[--foreground]">{taskTitle}</strong>
          </span>
        );
        break;

      case 'edited':
        icon = <Edit2 className="w-4 h-4 text-yellow-400" />;
        bgColor = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
        message = (
          <span>
            edited details of <strong className="text-[--foreground]">{taskTitle}</strong>
          </span>
        );
        break;
    }

    return { icon, message, bgColor, actorName };
  }

  return (
    <div className="glass rounded-2xl p-5 space-y-6">
      <div className="flex items-center justify-between border-b border-white/5 pb-3">
        <h3 className="text-sm font-bold uppercase tracking-wider text-[--muted-foreground]">
          Recent System Activity Feed
        </h3>
        <span className="text-[10px] font-bold text-[--muted-foreground]/60 uppercase tracking-widest tabular-nums">
          Showing {filteredActivities.length} logs
        </span>
      </div>

      {filteredActivities.length === 0 ? (
        <div className="text-center py-12 text-xs text-[--muted-foreground]">
          No audit logs or task activity matched the current query.
        </div>
      ) : (
        <div className="relative border-l border-white/10 dark:border-white/5 ml-3 pl-6 space-y-6 py-2">
          {filteredActivities.map((act, index) => {
            const { icon, message, bgColor, actorName } = renderEventDetails(act);
            
            return (
              <div key={act.id} className="relative group animate-fade-up" style={{ animationDelay: `${index * 30}ms` }}>
                {/* Timeline Dot Indicator */}
                <div
                  className={`absolute -left-[35px] top-0.5 w-6 h-6 rounded-full border flex items-center justify-center transition-transform duration-200 group-hover:scale-110 shadow-lg ${bgColor}`}
                >
                  {icon}
                </div>

                {/* Event Details */}
                <div className="space-y-1">
                  <div className="text-xs text-[--muted-foreground] leading-relaxed">
                    <strong className="text-[--foreground] font-semibold hover:text-[--primary] transition-all cursor-pointer">
                      {actorName}
                    </strong>{' '}
                    {message}
                  </div>
                  
                  {/* Meta (Time and Org) */}
                  <div className="flex items-center gap-3 text-[9px] text-[--muted-foreground] font-semibold opacity-60">
                    <span className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {fmtTime(act.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Building className="w-2.5 h-2.5" />
                      {orgMap[act.orgId] || 'HQ'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

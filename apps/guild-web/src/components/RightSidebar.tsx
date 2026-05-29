import * as React from "react";
import { useNavigate } from "react-router-dom";
import { 
  MessageSquare, 
  Plus, 
  ArrowRight,
  TrendingUp,
  UserPlus,
  ArrowUpRight,
  Loader2,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from '../hooks/useAuth';
import { useOrgMembers } from '../hooks/useChat';
import { useTasks } from '../hooks/useTasks';
import { useRightSidebar } from '../hooks/useRightSidebar';
import { type Task } from '../lib/tasks';

// ─── Sub-components ───────────────────────────────────────────────────────────

const QuickAction = ({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick?: () => void;
}) => (
  <Button
    variant="outline"
    className="h-10 justify-start gap-2.5 bg-bg-tertiary border-border-default hover:bg-bg-tertiary hover:border-primary/30 transition-all text-xs group"
    onClick={onClick}
  >
    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
    <span className="text-foreground font-medium">{label}</span>
    <ArrowRight className="ml-auto h-3 w-3 text-text-muted group-hover:text-primary/50 group-hover:translate-x-0.5 transition-all" />
  </Button>
);

function relTime(ts: any): string {
  if (!ts?.toDate) return '';
  const diff = Date.now() - ts.toDate().getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ─── Collapsed sliver shown when sidebar is hidden ────────────────────────────

export function RightSidebarToggle() {
  const { collapsed, toggle } = useRightSidebar();

  if (!collapsed) return null;

  return (
    <div className="hidden lg:flex fixed right-0 top-1/2 -translate-y-1/2 z-40">
      <button
        onClick={toggle}
        title="Expand panel"
        className="flex items-center justify-center w-6 h-14 bg-surface border border-r-0 border-border-default rounded-l-lg text-text-muted hover:text-foreground hover:bg-accent/40 transition-all shadow-sm"
      >
        <PanelRightOpen className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── RightSidebar ─────────────────────────────────────────────────────────────

export function RightSidebar() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { toggle } = useRightSidebar();
  const orgId = userProfile?.organizationId;

  const members = useOrgMembers(orgId);
  const { tasks, loading: tasksLoading } = useTasks(orgId);

  // Recent task activity: tasks sorted by updatedAt desc
  const recentActivity = React.useMemo((): { task: Task; actor: string }[] => {
    return [...tasks]
      .sort((a, b) => (b.updatedAt?.toMillis() ?? 0) - (a.updatedAt?.toMillis() ?? 0))
      .slice(0, 5)
      .map((task) => ({
        task,
        actor: task.assigneeIds[0] ?? task.creatorId ?? '',
      }));
  }, [tasks]);

  const getMemberName = (uid: string) => {
    if (!uid) return 'Someone';
    const m = members.find((mem) => mem.uid === uid);
    return m?.fullName ?? 'A teammate';
  };
  const getMemberInitials = (uid: string) => {
    const name = getMemberName(uid);
    return name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  };
  const getMemberPhotoURL = (uid: string) => {
    if (!uid) return undefined;
    const m = members.find((mem) => mem.uid === uid);
    return m?.photoURL;
  };

  const STATUS_LABEL: Record<string, string> = {
    todo: 'created',
    in_progress: 'started working on',
    review: 'sent for review',
    done: 'completed',
  };

  return (
    <aside className="flex h-full w-[300px] flex-col border-l border-border-default bg-surface transition-colors duration-300 flex-shrink-0">
      {/* Header with collapse button */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border-default flex-shrink-0">
        <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Panel</span>
        <button
          onClick={toggle}
          title="Collapse panel"
          className="p-1.5 rounded-md text-text-muted hover:text-foreground hover:bg-accent/40 transition-all"
        >
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Online Team Members */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Team Online</h3>
              <TrendingUp className="h-3 w-3 text-text-muted" />
            </div>
            {members.length === 0 ? (
              <p className="text-[10px] text-text-muted px-1">No team members yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {members.slice(0, 8).map((member) => {
                  const initials = member.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
                  return (
                    <div key={member.uid} className="relative group cursor-pointer" title={member.fullName}>
                      <Avatar className="h-8 w-8 border-2 border-border-default group-hover:border-primary transition-colors">
                        {member.photoURL && (
                          <AvatarImage src={member.photoURL} alt={member.fullName} />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-bold">
                          {initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                    </div>
                  );
                })}
                {members.length > 8 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-tertiary border-2 border-border-default text-[9px] font-bold text-muted-foreground">
                    +{members.length - 8}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Quick Actions */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <QuickAction icon={Plus}          label="Create Task"      onClick={() => navigate('/tasks')} />
              <QuickAction icon={ArrowUpRight}  label="New Request"      onClick={() => navigate('/tasks')} />
              <QuickAction icon={MessageSquare} label="Send Message"     onClick={() => navigate('/chat')} />
              <QuickAction icon={UserPlus}      label="Invite Teammate"  onClick={() => {}} />
            </div>
          </section>

          {/* Activity Feed */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Recent Activity</h3>
              <TrendingUp className="h-3 w-3 text-text-muted" />
            </div>
            {tasksLoading ? (
              <div className="flex items-center gap-2 py-4">
                <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                <span className="text-[10px] text-text-muted">Loading activity…</span>
              </div>
            ) : recentActivity.length === 0 ? (
              <p className="text-[10px] text-text-muted px-1">No recent activity yet.</p>
            ) : (
              <div className="space-y-1">
                {recentActivity.map(({ task, actor }) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-3 py-3 border-b border-border-default last:border-0 hover:bg-bg-tertiary transition-colors px-2 rounded-lg -mx-2 cursor-pointer group"
                    onClick={() => navigate(`/tasks?task=${task.id}`)}
                  >
                    <Avatar className="h-6 w-6 border border-border-default shrink-0">
                      {getMemberPhotoURL(actor) && (
                        <AvatarImage src={getMemberPhotoURL(actor)} alt={getMemberName(actor)} />
                      )}
                      <AvatarFallback className="text-[10px] bg-zinc-800">{getMemberInitials(actor)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-0.5 overflow-hidden">
                      <p className="text-[11px] leading-relaxed text-muted-foreground">
                        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {getMemberName(actor)}
                        </span>{' '}
                        {STATUS_LABEL[task.status] ?? 'updated'}{' '}
                        <span className="text-foreground line-clamp-1">"{task.title}"</span>
                      </p>
                      <span className="text-[9px] text-text-muted">{relTime(task.updatedAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}

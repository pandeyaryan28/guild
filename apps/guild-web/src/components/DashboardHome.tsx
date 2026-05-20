import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Users, 
  MoreHorizontal,
  Plus,
  Filter,
  Loader2,
  Check,
} from "lucide-react";
import { motion } from "motion/react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from '../hooks/useAuth';
import { useTasks } from '../hooks/useTasks';
import { useChannels, useOrgMembers } from '../hooks/useChat';
import { useNotifications } from '../hooks/useNotifications';
import { useRequests } from '../hooks/useRequests';
import { updateRequestStatus, REQUEST_TYPE_ICONS, REQUEST_TYPE_LABELS, type OrgRequest } from '../lib/requests';
import { type Task, moveTask } from '../lib/tasks';

// ─── Sub-components ───────────────────────────────────────────────────────────

const MetricCard = ({ title, value, subtitle, icon: Icon, color, delay, loading }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -4 }}
    className="group"
  >
    <Card className="overflow-hidden border-border-default bg-surface transition-all hover:bg-surface hover:shadow-2xl hover:shadow-primary/5">
      <CardContent className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className={`p-2.5 rounded-xl bg-opacity-10 ${color} shadow-inner`}>
            <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">{title}</p>
        </div>
        <div>
          {loading ? (
            <div className="h-8 w-12 rounded bg-bg-tertiary animate-pulse" />
          ) : (
            <h3 className="text-3xl font-bold tracking-tight text-foreground">{value}</h3>
          )}
          <p className="text-xs text-muted-foreground mt-1 font-medium">{subtitle}</p>
        </div>
        <div className="h-1 w-full bg-bg-tertiary rounded-full overflow-hidden">
          <div className={`h-full ${color} opacity-60 w-1/3`} />
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'text-red-400 border-red-400/30',
  high:   'text-orange-400 border-orange-400/30',
  medium: 'text-amber-400 border-amber-400/30',
  low:    'text-blue-400 border-blue-400/30',
  none:   'text-muted-foreground border-border-default',
};

const TaskItem = ({ 
  task, 
  memberMap,
  orgId,
  actor,
}: { 
  task: Task; 
  memberMap: Map<string, { fullName: string }>;
  orgId: string | undefined;
  actor: { uid: string; name: string };
}) => {
  const [completing, setCompleting] = React.useState(false);
  const firstAssignee = task.assigneeIds[0];
  const assigneeName = firstAssignee ? (memberMap.get(firstAssignee)?.fullName ?? 'Unknown') : '—';
  const dueStr = task.dueDate ? task.dueDate.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'No due date';
  const priorityClass = PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.none;

  const handleComplete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (completing || !orgId) return;
    setCompleting(true);
    try {
      const newStatus = task.creatorId !== actor.uid ? 'review' : 'done';
      await moveTask(task.id, orgId, newStatus, task.orderIndex, task.status, actor);
    } catch (err) {
      console.error(err);
    } finally {
      setCompleting(false);
    }
  };

  return (
    <div className="group flex items-center justify-between py-4 border-b border-border-default last:border-0 hover:bg-bg-tertiary px-4 -mx-4 rounded-xl transition-all cursor-pointer">
      <div className="flex items-center gap-4">
        <button
          onClick={handleComplete}
          disabled={completing}
          className="h-5 w-5 rounded-full border border-border-default/80 flex items-center justify-center hover:border-primary hover:bg-primary/10 transition-all relative shrink-0 disabled:opacity-50"
        >
          {completing ? (
            <Loader2 className="h-3 w-3 animate-spin text-primary" />
          ) : (
            <Check className="h-3 w-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </button>
        <div>
          <h4 className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">{task.title}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className={`h-4 text-[9px] px-1.5 font-bold uppercase tracking-wider bg-bg-tertiary ${priorityClass}`}>
              {task.priority}
            </Badge>
            <span className="text-[10px] text-muted-foreground">{dueStr}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Avatar className="h-6 w-6 border border-border-default">
          <AvatarImage src={`https://i.pravatar.cc/100?u=${firstAssignee}`} />
          <AvatarFallback className="text-[8px] bg-zinc-800">{assigneeName[0] ?? '?'}</AvatarFallback>
        </Avatar>
        <MoreHorizontal className="h-4 w-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

// ─── Pending Request Card (for dashboard) ─────────────────────────────────────

const PendingRequestCard = ({
  req, currentUid, currentName, orgId,
}: { req: OrgRequest; currentUid: string; currentName: string; orgId: string }) => {
  const [acting, setActing] = React.useState(false);

  async function act(status: 'approved' | 'rejected') {
    setActing(true);
    await updateRequestStatus(req.id, orgId, status, currentUid, currentName, req.creatorId, req.title);
    setActing(false);
  }

  return (
    <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 space-y-2.5 hover:bg-amber-400/8 transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-xl">{REQUEST_TYPE_ICONS[req.type]}</span>
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-foreground truncate">{req.title}</p>
          <p className="text-[10px] text-muted-foreground">{REQUEST_TYPE_LABELS[req.type]} · from {req.creatorName}</p>
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">{req.description}</p>
      <div className="flex gap-2 pt-1">
        <button
          disabled={acting}
          onClick={() => act('approved')}
          className="flex-1 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/25 transition-colors disabled:opacity-50"
        >
          {acting ? '…' : '✓ Approve'}
        </button>
        <button
          disabled={acting}
          onClick={() => act('rejected')}
          className="flex-1 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-[11px] font-bold hover:bg-red-500/20 transition-colors disabled:opacity-50"
        >
          ✕ Reject
        </button>
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export function DashboardHome() {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  const { tasks, loading: tasksLoading } = useTasks(orgId);
  const { channels, hasUnread } = useChannels(orgId);
  const members = useOrgMembers(orgId);
  const { unreadCount, loading: notifsLoading } = useNotifications(orgId);
  const { received: receivedRequests } = useRequests(orgId);
  const pendingRequests = receivedRequests.filter((r) => r.status === 'pending').slice(0, 3);

  const memberMap = React.useMemo(() => {
    const m = new Map<string, { fullName: string }>();
    members.forEach((mem) => m.set(mem.uid, { fullName: mem.fullName || '' }));
    return m;
  }, [members]);

  const actor = React.useMemo(() => ({
    uid: userProfile?.uid ?? '',
    name: userProfile?.fullName || 'Unknown',
  }), [userProfile]);

  // Task metrics
  const myTasks = React.useMemo(() => {
    if (!userProfile?.uid) return [];
    return tasks.filter((t) => t.assigneeIds.includes(userProfile.uid) && t.status !== 'done' && t.status !== 'review');
  }, [tasks, userProfile?.uid]);

  const todayTasks = React.useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return myTasks.filter((t) => t.dueDate && t.dueDate.toDate() <= today);
  }, [myTasks]);

  const inProgressTasks = React.useMemo(() => myTasks.filter((t) => t.status === 'in_progress'), [myTasks]);
  const todoTasks      = React.useMemo(() => myTasks.filter((t) => t.status === 'todo'),        [myTasks]);

  const [taskTab, setTaskTab] = React.useState<'all' | 'today' | 'progress'>('all');

  const displayedTasks = React.useMemo(() => {
    const base = taskTab === 'today'    ? todayTasks
               : taskTab === 'progress' ? inProgressTasks
               : myTasks;
    return base.slice(0, 5);
  }, [taskTab, myTasks, todayTasks, inProgressTasks]);

  // Greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const displayName = userProfile?.fullName?.split(' ')[0] ?? 'there';

  // Org name
  const [orgName, setOrgName] = React.useState('your organization');
  React.useEffect(() => {
    if (!orgId) return;
    import('../lib/firestore').then(({ getOrgById }) =>
      getOrgById(orgId).then((org) => { if (org) setOrgName(org.name); })
    );
  }, [orgId]);

  // Channels with unread badge — take top 4 with most recent activity
  const recentChannels = React.useMemo(() => {
    return [...channels]
      .sort((a, b) => (b.lastMessageAt?.toMillis() ?? 0) - (a.lastMessageAt?.toMillis() ?? 0))
      .slice(0, 4);
  }, [channels]);

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

  return (
    <div className="space-y-10 p-10 pb-20">
      {/* Hero */}
      <section className="flex items-end justify-between">
        <div className="space-y-1">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-bold tracking-tight text-foreground transition-all duration-700"
          >
            {greeting}, {displayName} <span className="inline-block animate-bounce-subtle">👋</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-sm font-medium"
          >
            Here's what is happening in {orgName} today.
          </motion.p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-10 bg-bg-tertiary border-border-default text-xs font-bold gap-2">
            <Filter className="h-3.5 w-3.5" /> Filter
          </Button>
          <Button
            className="h-10 shadow-lg shadow-primary/20 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground border-none"
            onClick={() => navigate('/tasks')}
          >
            <Plus className="h-4 w-4" /> New Task
          </Button>
        </div>
      </section>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="My Tasks" 
          value={myTasks.length} 
          subtitle={`${todayTasks.length} due today`}
          icon={CheckCircle2} 
          color="bg-indigo-500" 
          delay={0.2}
          loading={tasksLoading}
        />
        <MetricCard 
          title="In Progress" 
          value={inProgressTasks.length}
          subtitle="Active right now"
          icon={Clock} 
          color="bg-amber-500" 
          delay={0.3}
          loading={tasksLoading}
        />
        <MetricCard 
          title="Team Members" 
          value={members.length}
          subtitle="In your workspace"
          icon={Users} 
          color="bg-emerald-500" 
          delay={0.4}
          loading={false}
        />
        <MetricCard 
          title="Unread" 
          value={notifsLoading ? '—' : unreadCount}
          subtitle="Notifications pending"
          icon={MessageSquare} 
          color="bg-blue-500" 
          delay={0.5}
          loading={notifsLoading}
        />
      </div>

      {/* Pending Approvals — only shown when there are requests */}
      {pendingRequests.length > 0 && (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-bold text-foreground">Pending Approvals</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Requests waiting for your action</p>
            </div>
            <button onClick={() => navigate('/requests')}
              className="text-xs font-semibold text-primary hover:underline">
              View all →
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pendingRequests.map((req) => (
              <PendingRequestCard
                key={req.id}
                req={req}
                currentUid={userProfile!.uid}
                currentName={userProfile!.fullName}
                orgId={orgId!}
              />
            ))}
          </div>
        </motion.section>
      )}

      {/* Grid Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Tasks Section */}
        <Card className="border-border-default bg-surface backdrop-blur-sm shadow-xl shadow-black/5 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-foreground">My Tasks</CardTitle>
              <CardDescription className="text-xs font-medium">Tasks assigned to you</CardDescription>
            </div>
            <Button
              variant="ghost" size="sm"
              className="h-8 text-[11px] font-bold text-primary hover:bg-primary/5"
              onClick={() => navigate('/tasks')}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs value={taskTab} onValueChange={(v) => setTaskTab(v as any)} className="w-full">
              <TabsList className="bg-bg-tertiary border border-border-default h-8 p-1 mb-4">
                <TabsTrigger value="all"      className="text-[10px] font-bold px-4 h-6">ALL ({myTasks.length})</TabsTrigger>
                <TabsTrigger value="today"    className="text-[10px] font-bold px-4 h-6">DUE TODAY ({todayTasks.length})</TabsTrigger>
                <TabsTrigger value="progress" className="text-[10px] font-bold px-4 h-6">IN PROGRESS ({inProgressTasks.length})</TabsTrigger>
              </TabsList>
              <div className="mt-4">
                {tasksLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
                  </div>
                ) : displayedTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <CheckCircle2 className="h-8 w-8 text-text-muted mb-2" />
                    <p className="text-xs text-muted-foreground">No tasks here 🎉</p>
                  </div>
                ) : (
                  displayedTasks.map((task) => (
                    <TaskItem key={task.id} task={task} memberMap={memberMap} orgId={orgId} actor={actor} />
                  ))
                )}
              </div>
              <Button
                variant="ghost"
                className="w-full mt-4 h-10 border-dashed border border-border-default text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-bg-tertiary transition-all"
                onClick={() => navigate('/tasks')}
              >
                <Plus className="h-3.5 w-3.5 mr-2" /> Add new task
              </Button>
            </Tabs>
          </CardContent>
        </Card>

        {/* Team Members Panel */}
        <Card className="border-border-default bg-surface backdrop-blur-sm shadow-xl shadow-black/5">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-foreground">Team Members</CardTitle>
              <CardDescription className="text-xs font-medium">Everyone in {orgName}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Users className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-xs text-muted-foreground">No team members yet.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {members.slice(0, 6).map((member) => {
                  const initials = member.fullName?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() ?? '?';
                  return (
                    <div key={member.uid} className="group flex items-center justify-between py-3 border-b border-border-default last:border-0 hover:bg-bg-tertiary px-4 -mx-4 rounded-xl transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8 border border-border-default">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{member.fullName}</p>
                          <p className="text-[10px] text-muted-foreground">@{member.username} · {member.designation || member.role}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="h-4 text-[9px] px-1.5 capitalize bg-bg-tertiary border-border-default text-muted-foreground">
                        {member.role}
                      </Badge>
                    </div>
                  );
                })}
                {members.length > 6 && (
                  <p className="text-center text-[10px] text-muted-foreground pt-2">+{members.length - 6} more</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card className="border-border-default bg-surface backdrop-blur-sm shadow-xl shadow-black/5 xl:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-foreground">Recent Channels</CardTitle>
              <CardDescription className="text-xs font-medium">Latest activity across channels</CardDescription>
            </div>
            <Button
              variant="ghost" size="sm"
              className="h-8 text-[11px] font-bold text-primary hover:bg-primary/5"
              onClick={() => navigate('/chat')}
            >
              Open Chat
            </Button>
          </CardHeader>
          <CardContent>
            {recentChannels.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <MessageSquare className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-xs text-muted-foreground">No channels yet. Go to Chat to get started.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recentChannels.map((ch, i) => {
                  const unread = hasUnread(ch);
                  return (
                    <div
                      key={ch.id}
                      onClick={() => navigate(`/chat/c/${ch.id}`)}
                      className="group relative flex items-center justify-between py-5 border-b border-border-default last:border-0 hover:bg-bg-tertiary px-4 -mx-4 rounded-xl transition-all cursor-pointer"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-xl bg-bg-tertiary flex items-center justify-center border border-border-default shrink-0">
                          <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                        <div className="space-y-1 overflow-hidden">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">#{ch.name}</span>
                            <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                            <span className="text-[10px] text-muted-foreground font-medium">{ch.memberCount} members</span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">
                            {ch.lastMessagePreview ?? ch.description ?? 'No messages yet'}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[10px] text-text-muted">
                          {ch.lastMessageAt ? relTime(ch.lastMessageAt) : ''}
                        </span>
                        {unread && (
                          <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

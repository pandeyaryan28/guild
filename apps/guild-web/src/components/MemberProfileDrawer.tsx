import * as React from 'react';
import { motion } from 'motion/react';
import {
  Crown, ShieldCheck, User, Mail, Briefcase, Hash, Calendar, X, Workflow, ListTodo
} from 'lucide-react';
import { type UserProfile, type UserRole, type Team, type Task } from '@guild/types';
import { STATUS_CONFIG, PRIORITY_CONFIG } from '../lib/tasks';

export const ROLE_META: Record<UserRole, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  owner: {
    label: 'Owner',
    icon: Crown,
    color: 'text-amber-400',
    bg: 'bg-amber-400/10 border-amber-400/25',
  },
  admin: {
    label: 'Admin',
    icon: ShieldCheck,
    color: 'text-violet-400',
    bg: 'bg-violet-400/10 border-violet-400/25',
  },
  manager: {
    label: 'Manager',
    icon: Briefcase,
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10 border-emerald-400/25',
  },
  member: {
    label: 'Member',
    icon: User,
    color: 'text-sky-400',
    bg: 'bg-sky-400/10 border-sky-400/25',
  },
};

export function avatarInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function avatarHue(uid: string) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

interface MemberProfileDrawerProps {
  isOpen: boolean;
  member: UserProfile | null;
  onClose: () => void;
  tasks: Task[];
  teams: Team[];
  members: UserProfile[];
}

export function MemberProfileDrawer({ isOpen, member, onClose, tasks, teams }: MemberProfileDrawerProps) {
  React.useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen || !member) return null;

  const hue = avatarHue(member.uid);
  const initials = avatarInitials(member.fullName || member.username || '?');
  const meta = ROLE_META[member.role] ?? ROLE_META.member;
  const RoleIcon = meta.icon;

  // Filter tasks assigned to this member
  const memberTasks = tasks.filter(t => t.assigneeIds?.includes(member.uid));
  
  // Categorize tasks
  const activeTasks = memberTasks.filter(t => t.status !== 'done');
  const completedTasks = memberTasks.filter(t => t.status === 'done');

  // Find teams this member belongs to
  const memberTeams = teams.filter(t => t.memberIds?.includes(member.uid) || t.managerId === member.uid);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-background/60 backdrop-blur-sm"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="relative w-full sm:w-[480px] bg-surface border-l border-border-default h-full shadow-2xl flex flex-col z-10"
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border-default flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Member Details</h3>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6 scrollbar-thin">
          
          {/* Profile Overview */}
          <div className="flex items-center gap-4 p-4 rounded-2xl border border-border-default/60 bg-accent/5">
            <div
              className="h-16 w-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg shrink-0"
              style={{ background: `hsl(${hue} 60% 45%)` }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-bold text-foreground truncate leading-tight">{member.fullName}</h4>
              <p className="text-xs text-muted-foreground truncate mt-0.5">@{member.username}</p>
              
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${meta.bg} ${meta.color}`}>
                  <RoleIcon className="h-2.5 w-2.5" />
                  {meta.label}
                </span>
              </div>
            </div>
          </div>

          {/* Details list */}
          <div className="space-y-3.5">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Contact & Org Info</h5>
            
            <div className="rounded-2xl border border-border-default bg-surface p-4 divide-y divide-border-default/45 text-xs text-foreground/80 space-y-3">
              <div className="flex items-center gap-3 pt-0 pb-3">
                <Mail className="h-4 w-4 text-text-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Email Address</p>
                  <p className="font-semibold text-foreground truncate mt-0.5">{member.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3 pb-3">
                <Briefcase className="h-4 w-4 text-text-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Designation / Role</p>
                  <p className="font-semibold text-foreground truncate mt-0.5">{member.designation || 'Not specified'}</p>
                </div>
              </div>

              {member.employeeId && (
                <div className="flex items-center gap-3 pt-3 pb-3">
                  <Hash className="h-4 w-4 text-text-muted shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Employee ID</p>
                    <p className="font-semibold text-foreground truncate mt-0.5">{member.employeeId}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3 pb-0">
                <Calendar className="h-4 w-4 text-text-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Joined Organization</p>
                  <p className="font-semibold text-foreground truncate mt-0.5">
                    {member.createdAt?.toDate ? member.createdAt.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Squad memberships */}
          <div className="space-y-3">
            <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Squads & Teams</h5>
            {memberTeams.length === 0 ? (
              <p className="text-xs text-muted-foreground italic px-1">Not assigned to any squad yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {memberTeams.map(t => {
                  const isLead = t.managerId === member.uid;
                  return (
                    <div key={t.id} className="flex items-center justify-between p-3 rounded-xl border border-border-default/60 bg-bg-primary text-xs">
                      <div className="flex items-center gap-2">
                        <Workflow className="h-3.5 w-3.5 text-primary" />
                        <span className="font-semibold text-foreground">{t.name}</span>
                      </div>
                      {isLead ? (
                        <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                          Lead
                        </span>
                      ) : (
                        <span className="text-[9px] font-semibold text-muted-foreground px-2 py-0.5 rounded bg-accent/20 border border-border-default/45">
                          Member
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Tasks section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h5 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Assigned Tasks ({memberTasks.length})</h5>
              <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-blue-400" /> {activeTasks.length} Active</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {completedTasks.length} Done</span>
              </div>
            </div>

            {memberTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 rounded-2xl border border-dashed border-border-default text-center">
                <ListTodo className="h-8 w-8 text-text-muted mb-2" />
                <p className="text-xs font-semibold text-foreground">No tasks assigned</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">This member currently has no tasks assigned to them.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Active Tasks first */}
                {activeTasks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Active</p>
                    {activeTasks.map(task => {
                      const statusCfg = STATUS_CONFIG[task.status];
                      const priorityCfg = PRIORITY_CONFIG[task.priority];
                      const due = task.dueDate?.toDate?.();
                      return (
                        <div key={task.id} className="p-3 rounded-xl border border-border-default bg-surface hover:border-border-default/80 transition-all flex flex-col gap-2 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-semibold text-foreground line-clamp-2 leading-tight">{task.title}</span>
                            <span
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold border shrink-0"
                              style={{ borderColor: `${statusCfg.dot}40`, color: statusCfg.dot, backgroundColor: `${statusCfg.dot}10` }}
                            >
                              <span className="h-1 w-1 rounded-full" style={{ backgroundColor: statusCfg.dot }} />
                              {statusCfg.label}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium" style={{ color: priorityCfg.color }}>
                                {priorityCfg.label} Priority
                              </span>
                            </div>
                            {due && (
                              <span className="flex items-center gap-1 shrink-0">
                                <Calendar className="h-3 w-3" />
                                {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Completed Tasks */}
                {completedTasks.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-1">Completed</p>
                    {completedTasks.map(task => {
                      const statusCfg = STATUS_CONFIG[task.status];
                      return (
                        <div key={task.id} className="p-3 rounded-xl border border-border-default/40 bg-accent/5 opacity-70 flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-xs font-semibold text-foreground line-clamp-2 leading-tight line-through">{task.title}</span>
                            <span
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-bold border shrink-0"
                              style={{ borderColor: `${statusCfg.dot}40`, color: statusCfg.dot, backgroundColor: `${statusCfg.dot}10` }}
                            >
                              <span className="h-1 w-1 rounded-full" style={{ backgroundColor: statusCfg.dot }} />
                              {statusCfg.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}

import React, { useState } from 'react';
import type { Task, Goal, UserProfile, Team, Organization } from '@guild/types';
import { HealthBadge } from './HealthBadge';
import { format } from 'date-fns';
import { ClipboardList, Target, AlertTriangle, AlertCircle, Calendar, ShieldCheck } from 'lucide-react';

interface WorkItemsTableProps {
  tasks: Task[];
  goals: Goal[];
  users: UserProfile[];
  teams: Team[];
  orgs: Organization[];
  
  // Filters state
  searchQuery: string;
  statusFilter: string;
  priorityFilter: string;
  assigneeFilter: string;
  teamFilter: string;
  orgFilter: string;
}

export function WorkItemsTable({
  tasks,
  goals,
  users,
  teams,
  orgs,
  searchQuery,
  statusFilter,
  priorityFilter,
  assigneeFilter,
  teamFilter,
  orgFilter,
}: WorkItemsTableProps) {
  const [activeTab, setActiveTab] = useState<'tasks' | 'goals'>('tasks');

  const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]));
  const userMap = Object.fromEntries(users.map(u => [u.uid, u.fullName || u.username]));

  // Date formatter
  function fmtDate(ts: any) {
    if (!ts) return '—';
    try {
      return format(ts.toDate(), 'MMM d, yyyy');
    } catch {
      return '—';
    }
  }

  // Filter Tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || t.priority === priorityFilter;
    const matchesOrg = orgFilter === 'all' || t.orgId === orgFilter;
    const matchesAssignee = assigneeFilter === 'all' || t.assigneeIds?.includes(assigneeFilter);
    
    // Team filter: matches if task assignee is in the team
    let matchesTeam = true;
    if (teamFilter !== 'all') {
      const selectedTeam = teams.find(tm => tm.id === teamFilter);
      if (selectedTeam) {
        const teamUids = [selectedTeam.managerId, ...selectedTeam.memberIds];
        matchesTeam = t.assigneeIds?.some(uid => teamUids.includes(uid)) ?? false;
      } else {
        matchesTeam = false;
      }
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesOrg && matchesAssignee && matchesTeam;
  });

  // Filter Goals
  const filteredGoals = goals.filter(g => {
    const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          g.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    const matchesOrg = orgFilter === 'all' || g.orgId === orgFilter;
    const matchesOwner = assigneeFilter === 'all' || g.ownerId === assigneeFilter;

    let matchesTeam = true;
    if (teamFilter !== 'all') {
      const selectedTeam = teams.find(tm => tm.id === teamFilter);
      if (selectedTeam) {
        const teamUids = [selectedTeam.managerId, ...selectedTeam.memberIds];
        matchesTeam = teamUids.includes(g.ownerId);
      } else {
        matchesTeam = false;
      }
    }

    return matchesSearch && matchesStatus && matchesOrg && matchesOwner && matchesTeam;
  });

  return (
    <div className="space-y-4">
      {/* Sub Tabs */}
      <div className="flex border-b border-[--border]">
        <button
          onClick={() => setActiveTab('tasks')}
          className="flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all relative"
          style={{ color: activeTab === 'tasks' ? 'var(--primary)' : 'var(--muted-foreground)' }}
        >
          <ClipboardList className="w-4 h-4" />
          <span>Tasks ({filteredTasks.length})</span>
          {activeTab === 'tasks' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[--primary]" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className="flex items-center gap-2 px-5 py-3 text-xs font-bold transition-all relative"
          style={{ color: activeTab === 'goals' ? 'var(--primary)' : 'var(--muted-foreground)' }}
        >
          <Target className="w-4 h-4" />
          <span>Goals ({filteredGoals.length})</span>
          {activeTab === 'goals' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[--primary]" />
          )}
        </button>
      </div>

      {activeTab === 'tasks' ? (
        /* Tasks List Table */
        <div className="overflow-x-auto rounded-2xl border border-[--border] bg-black/10">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[--border] text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground]" style={{ background: 'oklch(from var(--muted) l c h / 40%)' }}>
                <th className="text-left px-5 py-4 first:rounded-tl-2xl">Task Details</th>
                <th className="text-left px-4 py-4">Organization</th>
                <th className="text-left px-4 py-4">Status</th>
                <th className="text-left px-4 py-4">Priority</th>
                <th className="text-left px-4 py-4">Assignees</th>
                <th className="text-left px-4 py-4">Due Date</th>
                <th className="text-right px-5 py-4 last:rounded-tr-2xl">Operational Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border]/40">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[--muted-foreground] text-xs">
                    No active tasks match the filters.
                  </td>
                </tr>
              ) : (
                filteredTasks.map((t, i) => {
                  const isDone = t.status === 'done';
                  
                  // Overdue check
                  let isOverdue = false;
                  if (!isDone && t.dueDate) {
                    try { isOverdue = t.dueDate.toDate() < new Date(); } catch {}
                  }

                  // Stale check (not updated in 14 days)
                  let isStale = false;
                  if (!isDone && t.updatedAt) {
                    try {
                      const ageInMs = new Date().getTime() - t.updatedAt.toDate().getTime();
                      isStale = ageInMs > 14 * 24 * 60 * 60 * 1000;
                    } catch {}
                  }

                  return (
                    <tr
                      key={t.id}
                      className="transition-colors hover:bg-[--accent]/30 group"
                      style={{ background: i % 2 === 0 ? 'transparent' : 'oklch(from var(--card) l c h / 15%)' }}
                    >
                      {/* Title */}
                      <td className="px-5 py-3.5">
                        <div>
                          <span className={`font-bold text-sm text-[--foreground] ${isDone ? 'line-through opacity-50' : ''}`}>
                            {t.title}
                          </span>
                          {t.description && (
                            <p className="text-[10px] text-[--muted-foreground] line-clamp-1 max-w-[280px] mt-0.5">
                              {t.description}
                            </p>
                          )}
                        </div>
                      </td>
                      {/* Organization */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-[--muted-foreground] font-medium">
                          {orgMap[t.orgId] || t.orgId?.slice(0, 8)}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <HealthBadge type="status" value={t.status} />
                      </td>
                      {/* Priority */}
                      <td className="px-4 py-3.5">
                        <HealthBadge type="priority" value={t.priority} />
                      </td>
                      {/* Assignees */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {t.assigneeIds && t.assigneeIds.length > 0 ? (
                            t.assigneeIds.map(uid => (
                              <span
                                key={uid}
                                className="inline-block px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/10 text-indigo-400"
                                title={userMap[uid] || 'Unknown user'}
                              >
                                {userMap[uid]?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-[--muted-foreground] italic opacity-60">Unassigned</span>
                          )}
                        </div>
                      </td>
                      {/* Due Date */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-xs text-[--muted-foreground]">
                          <Calendar className="w-3.5 h-3.5 text-[--muted-foreground]/60" />
                          <span className={isOverdue ? 'text-red-400 font-bold' : ''}>{fmtDate(t.dueDate)}</span>
                        </div>
                      </td>
                      {/* Health state */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20">
                              <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />
                              OVERDUE
                            </span>
                          )}
                          {isStale && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20">
                              <AlertCircle className="w-3 h-3 text-amber-400" />
                              STALE (14d+)
                            </span>
                          )}
                          {!isOverdue && !isStale && !isDone && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold text-emerald-400 bg-emerald-500/10">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              ON TRACK
                            </span>
                          )}
                          {isDone && (
                            <span className="text-xs text-emerald-400 font-bold tracking-wider">DONE</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Goals List Table */
        <div className="overflow-x-auto rounded-2xl border border-[--border] bg-black/10">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-[--border] text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground]" style={{ background: 'oklch(from var(--muted) l c h / 40%)' }}>
                <th className="text-left px-5 py-4 first:rounded-tl-2xl">Goal Details</th>
                <th className="text-left px-4 py-4">Organization</th>
                <th className="text-left px-4 py-4">Status</th>
                <th className="text-left px-4 py-4">Owner / Lead</th>
                <th className="text-left px-4 py-4">Target Date</th>
                <th className="text-right px-5 py-4 last:rounded-tr-2xl">Operational Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border]/40">
              {filteredGoals.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[--muted-foreground] text-xs">
                    No active goals match the filters.
                  </td>
                </tr>
              ) : (
                filteredGoals.map((g, i) => {
                  const isCompleted = g.status === 'completed';
                  
                  // Overdue check
                  let isOverdue = false;
                  if (!isCompleted && g.targetDate) {
                    try { isOverdue = g.targetDate.toDate() < new Date(); } catch {}
                  }

                  return (
                    <tr
                      key={g.id}
                      className="transition-colors hover:bg-[--accent]/30 group"
                      style={{ background: i % 2 === 0 ? 'transparent' : 'oklch(from var(--card) l c h / 15%)' }}
                    >
                      {/* Title */}
                      <td className="px-5 py-3.5">
                        <div>
                          <span className={`font-bold text-sm text-[--foreground] ${isCompleted ? 'line-through opacity-50' : ''}`}>
                            {g.title}
                          </span>
                          {g.description && (
                            <p className="text-[10px] text-[--muted-foreground] line-clamp-1 max-w-[280px] mt-0.5">
                              {g.description}
                            </p>
                          )}
                        </div>
                      </td>
                      {/* Organization */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-[--muted-foreground] font-medium">
                          {orgMap[g.orgId] || g.orgId?.slice(0, 8)}
                        </span>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3.5">
                        <HealthBadge type="status" value={g.status} />
                      </td>
                      {/* Owner */}
                      <td className="px-4 py-3.5">
                        <span className="text-xs text-[--muted-foreground] font-semibold">
                          {userMap[g.ownerId] || '—'}
                        </span>
                      </td>
                      {/* Target Date */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1 text-xs text-[--muted-foreground]">
                          <Calendar className="w-3.5 h-3.5 text-[--muted-foreground]/60" />
                          <span className={isOverdue ? 'text-red-400 font-bold' : ''}>{fmtDate(g.targetDate)}</span>
                        </div>
                      </td>
                      {/* Health */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20">
                              <AlertTriangle className="w-3 h-3 text-red-400 animate-pulse" />
                              OVERDUE
                            </span>
                          )}
                          {!isOverdue && !isCompleted && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold text-emerald-400 bg-emerald-500/10">
                              <ShieldCheck className="w-3 h-3 text-emerald-400" />
                              ACTIVE
                            </span>
                          )}
                          {isCompleted && (
                            <span className="text-xs text-emerald-400 font-bold tracking-wider">COMPLETED</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

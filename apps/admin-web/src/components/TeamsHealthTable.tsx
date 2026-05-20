import React, { useState } from 'react';
import type { UserProfile, Task, Goal, Team, Organization } from '@guild/types';
import { HealthBadge } from './HealthBadge';
import { Users2, ShieldAlert, Award, ChevronDown, ChevronUp, UserPlus, CheckCircle, AlertCircle, CornerDownRight } from 'lucide-react';

interface TeamsHealthTableProps {
  teams: Team[];
  users: UserProfile[];
  tasks: Task[];
  goals: Goal[];
  orgs: Organization[];
}

export function TeamsHealthTable({ teams, users, tasks, goals, orgs }: TeamsHealthTableProps) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]));
  const userMap = Object.fromEntries(users.map(u => [u.uid, u]));

  // Calculate team metrics
  const teamsWithMetrics = teams.map(team => {
    const manager = userMap[team.managerId];
    const teamMembers = team.memberIds.map(uid => userMap[uid]).filter(Boolean) as UserProfile[];
    const allMembers = [manager, ...teamMembers].filter(Boolean) as UserProfile[];

    // Collect all tasks assigned to team members
    const allUids = allMembers.map(m => m.uid);
    const teamTasks = tasks.filter(t => t.assigneeIds?.some(id => allUids.includes(id)));
    const completedTasks = teamTasks.filter(t => t.status === 'done').length;
    const overdueTasks = teamTasks.filter(t => {
      if (t.status === 'done' || !t.dueDate) return false;
      try {
        return t.dueDate.toDate() < new Date();
      } catch {
        return false;
      }
    }).length;

    // Collect all goals owned by team members
    const teamGoals = goals.filter(g => allUids.includes(g.ownerId));
    const completedGoals = teamGoals.filter(g => g.status === 'completed').length;

    // Combined ratio
    const totalItems = teamTasks.length + teamGoals.length;
    const completedItems = completedTasks + completedGoals;
    const completionPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      ...team,
      managerName: manager ? manager.fullName : '—',
      managerRole: manager ? manager.designation : '—',
      membersCount: allMembers.length,
      teamMembers,
      allMembers,
      totalTasks: teamTasks.length,
      completedTasks,
      overdueTasks,
      completionPct,
    };
  });

  function toggleExpand(teamId: string) {
    setExpandedTeamId(expandedTeamId === teamId ? null : teamId);
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-2xl border border-[--border] bg-black/10">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-[--border] text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground]" style={{ background: 'oklch(from var(--muted) l c h / 40%)' }}>
              <th className="w-8"></th>
              <th className="text-left px-5 py-4">Team Name</th>
              <th className="text-left px-4 py-4">Manager / Lead</th>
              <th className="text-center px-4 py-4">Members</th>
              <th className="text-center px-4 py-4">Tasks (Done/Total)</th>
              <th className="text-center px-4 py-4">Overdue Tasks</th>
              <th className="text-center px-4 py-4">Completion %</th>
              <th className="text-right px-5 py-4 last:rounded-tr-2xl">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--border]/40">
            {teamsWithMetrics.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-[--muted-foreground] text-xs">
                  No active teams found in this organization.
                </td>
              </tr>
            ) : (
              teamsWithMetrics.map((t, i) => {
                const isExpanded = expandedTeamId === t.id;
                const healthState = t.overdueTasks > 3 ? 'stale' : t.overdueTasks > 0 ? 'medium' : 'healthy';

                return (
                  <React.Fragment key={t.id}>
                    <tr
                      className="transition-colors hover:bg-[--accent]/30 group cursor-pointer"
                      onClick={() => toggleExpand(t.id)}
                      style={{ background: i % 2 === 0 ? 'transparent' : 'oklch(from var(--card) l c h / 15%)' }}
                    >
                      {/* Expand Arrow */}
                      <td className="pl-4 text-center">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-[--muted-foreground]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[--muted-foreground]" />
                        )}
                      </td>
                      {/* Team Name */}
                      <td className="px-5 py-3.5">
                        <div>
                          <div className="font-bold text-sm text-[--foreground] flex items-center gap-2">
                            {t.name}
                          </div>
                          <div className="text-[10px] text-[--muted-foreground] line-clamp-1 max-w-[200px] mt-0.5">
                            {t.description || 'No description provided.'}
                          </div>
                        </div>
                      </td>
                      {/* Manager */}
                      <td className="px-4 py-3.5">
                        <div>
                          <div className="font-semibold text-xs text-[--foreground]">{t.managerName}</div>
                          <div className="text-[9px] text-[--muted-foreground]">{t.managerRole}</div>
                        </div>
                      </td>
                      {/* Members count */}
                      <td className="px-4 py-3.5 text-center font-bold text-xs tabular-nums text-[--foreground]">
                        {t.membersCount}
                      </td>
                      {/* Tasks */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-xs font-semibold tabular-nums text-[--foreground]">
                          {t.completedTasks} / {t.totalTasks}
                        </span>
                      </td>
                      {/* Overdue */}
                      <td className="px-4 py-3.5 text-center">
                        {t.overdueTasks > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 tabular-nums">
                            <ShieldAlert className="w-3.5 h-3.5 animate-pulse" />
                            {t.overdueTasks}
                          </span>
                        ) : (
                          <span className="text-xs text-[--muted-foreground]/50">—</span>
                        )}
                      </td>
                      {/* Completion Pct */}
                      <td className="px-4 py-3.5 text-center">
                        <span className="text-xs font-extrabold tabular-nums text-[--foreground]">
                          {t.totalTasks > 0 ? `${t.completionPct}%` : '—'}
                        </span>
                      </td>
                      {/* Action */}
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(t.id);
                          }}
                          className="text-xs font-semibold text-[--primary] hover:underline"
                        >
                          {isExpanded ? 'Collapse' : 'View Workload Split'}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED MEMBER WORKLOAD & STRUCTURE TREE */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-6 py-5 bg-black/35 border-t border-b border-[--border]">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
                            
                            {/* Member Workload Split */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-[--muted-foreground]">
                                Member Workload Split
                              </h4>
                              <div className="space-y-2">
                                {t.allMembers.map(member => {
                                  const memTasks = tasks.filter(tk => tk.assigneeIds?.includes(member.uid));
                                  const memDone = memTasks.filter(tk => tk.status === 'done').length;
                                  const memOverdue = memTasks.filter(tk => {
                                    if (tk.status === 'done' || !tk.dueDate) return false;
                                    return tk.dueDate.toDate() < new Date();
                                  }).length;
                                  const memGoals = goals.filter(gl => gl.ownerId === member.uid);
                                  const memGoalsDone = memGoals.filter(gl => gl.status === 'completed').length;

                                  const memTotal = memTasks.length + memGoals.length;
                                  const memCompleted = memDone + memGoalsDone;
                                  const memPct = memTotal > 0 ? Math.round((memCompleted / memTotal) * 100) : 0;

                                  const isLead = member.uid === t.managerId;

                                  return (
                                    <div
                                      key={member.uid}
                                      className="flex items-center justify-between p-3 rounded-xl bg-[--card]/60 border border-[--border] text-xs"
                                    >
                                      <div className="flex items-center gap-2.5">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                                          {isLead ? 'L' : 'M'}
                                        </div>
                                        <div>
                                          <span className="font-bold text-[--foreground]">{member.fullName}</span>
                                          {isLead && <span className="ml-1.5 text-[9px] font-semibold text-[--primary] uppercase">Lead</span>}
                                          <div className="text-[10px] text-[--muted-foreground]">{member.designation}</div>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-4 text-right tabular-nums">
                                        <div>
                                          <span className="text-[--muted-foreground]">Tasks:</span>{' '}
                                          <span className="font-semibold text-[--foreground]">{memTasks.length}</span>
                                        </div>
                                        <div>
                                          <span className="text-[--muted-foreground]">Overdue:</span>{' '}
                                          <span className={`font-semibold ${memOverdue > 0 ? 'text-red-400' : 'text-[--muted-foreground]/60'}`}>
                                            {memOverdue}
                                          </span>
                                        </div>
                                        <div>
                                          <span className="text-[--muted-foreground]">Done:</span>{' '}
                                          <span className="font-semibold text-emerald-400">{memPct}%</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Simple Visual Tree Mapping */}
                            <div className="space-y-3">
                              <h4 className="text-xs font-bold uppercase tracking-wider text-[--muted-foreground]">
                                Team Reporting Hierarchy
                              </h4>
                              <div className="p-4 rounded-xl bg-[--card]/60 border border-[--border] space-y-2.5">
                                {/* Manager Node */}
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full bg-[--primary] animate-pulse" />
                                  <div className="text-xs">
                                    <span className="font-bold text-[--foreground]">{t.managerName}</span>
                                    <span className="text-[9px] text-[--muted-foreground] ml-1.5">({t.managerRole || 'Team Manager'})</span>
                                  </div>
                                </div>

                                {/* Member Nodes */}
                                <div className="space-y-2">
                                  {t.teamMembers.length === 0 ? (
                                    <div className="flex items-center gap-2 pl-4 text-[10px] text-[--muted-foreground]/70 italic">
                                      <CornerDownRight className="w-3.5 h-3.5" />
                                      No direct reports registered yet.
                                    </div>
                                  ) : (
                                    t.teamMembers.map(member => (
                                      <div key={member.uid} className="flex items-center gap-2 pl-5 text-xs text-[--foreground]">
                                        <CornerDownRight className="w-4 h-4 text-[--muted-foreground] shrink-0" />
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-medium text-[--foreground]">{member.fullName}</span>
                                          <span className="text-[9px] text-[--muted-foreground]">({member.designation})</span>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </div>
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

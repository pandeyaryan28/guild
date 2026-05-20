import React from 'react';
import type { UserProfile, Task, Goal, Team, Organization } from '@guild/types';
import { HealthBadge } from './HealthBadge';
import { Shield, Sparkles, CheckCircle2, AlertTriangle, Target, Star } from 'lucide-react';

interface PeopleWorkloadTableProps {
  users: UserProfile[];
  tasks: Task[];
  goals: Goal[];
  teams: Team[];
  orgs: Organization[];
  searchQuery: string;
  roleFilter: string;
  orgFilter: string;
}

export function PeopleWorkloadTable({
  users,
  tasks,
  goals,
  teams,
  orgs,
  searchQuery,
  roleFilter,
  orgFilter,
}: PeopleWorkloadTableProps) {
  const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]));
  const userMap = Object.fromEntries(users.map(u => [u.uid, u.fullName || u.username]));

  // Calculate workloads
  const usersWithWorkload = users.map(user => {
    // 1. Associated Team
    const userTeam = teams.find(t => t.memberIds.includes(user.uid) || t.managerId === user.uid);
    
    // 2. Manager
    let managerName = '—';
    if (user.managerId && userMap[user.managerId]) {
      managerName = userMap[user.managerId];
    } else if (userTeam && userTeam.managerId !== user.uid && userMap[userTeam.managerId]) {
      managerName = userMap[userTeam.managerId];
    }

    // 3. Tasks
    const userTasks = tasks.filter(t => t.assigneeIds?.includes(user.uid));
    const completedTasks = userTasks.filter(t => t.status === 'done').length;
    const overdueTasks = userTasks.filter(t => {
      if (t.status === 'done' || !t.dueDate) return false;
      try {
        return t.dueDate.toDate() < new Date();
      } catch {
        return false;
      }
    }).length;

    // 4. Goals
    const userGoals = goals.filter(g => g.ownerId === user.uid);
    const completedGoals = userGoals.filter(g => g.status === 'completed').length;

    // 5. Completion %
    const totalItems = userTasks.length + userGoals.length;
    const completedItems = completedTasks + completedGoals;
    const completionPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

    return {
      ...user,
      teamName: userTeam ? userTeam.name : '—',
      managerName,
      totalTasks: userTasks.length,
      completedTasks,
      overdueTasks,
      totalGoals: userGoals.length,
      completedGoals,
      completionPct,
      totalItems,
    };
  });

  // Filter users
  const filteredUsers = usersWithWorkload.filter(u => {
    const matchesSearch =
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.designation.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesOrg = orgFilter === 'all' || u.organizationId === orgFilter;

    return matchesSearch && matchesRole && matchesOrg;
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-[--border] bg-black/10">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b border-[--border] text-[10px] font-bold uppercase tracking-wider text-[--muted-foreground]" style={{ background: 'oklch(from var(--muted) l c h / 40%)' }}>
            <th className="text-left px-5 py-4 first:rounded-tl-2xl">Name</th>
            <th className="text-left px-4 py-4">Role</th>
            <th className="text-left px-4 py-4">Organization</th>
            <th className="text-left px-4 py-4">Team</th>
            <th className="text-left px-4 py-4">Manager</th>
            <th className="text-center px-4 py-4">Tasks (Done/Total)</th>
            <th className="text-center px-4 py-4">Overdue Tasks</th>
            <th className="text-center px-4 py-4">Goals (Done/Total)</th>
            <th className="text-center px-4 py-4 last:rounded-tr-2xl">Completion</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[--border]/40">
          {filteredUsers.length === 0 ? (
            <tr>
              <td colSpan={9} className="text-center py-12 text-[--muted-foreground] text-xs">
                No organization members match the filters.
              </td>
            </tr>
          ) : (
            filteredUsers.map((u, i) => {
              const overdue = u.overdueTasks > 0;
              const highCompleter = u.completionPct >= 80 && u.totalItems > 0;

              return (
                <tr
                  key={u.uid}
                  className="transition-colors hover:bg-[--accent]/30 group"
                  style={{ background: i % 2 === 0 ? 'transparent' : 'oklch(from var(--card) l c h / 15%)' }}
                >
                  {/* Name */}
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-transform duration-200 group-hover:scale-105"
                        style={{
                          background: 'oklch(from var(--primary) l c h / 18%)',
                          color: 'var(--primary)',
                        }}
                      >
                        {(u.fullName || u.username || '?').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-[--foreground] flex items-center gap-1.5">
                          {u.fullName || '—'}
                          {highCompleter && (
                            <span title="Star Performer (>=80% Completion)">
                              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-[--muted-foreground] font-mono leading-none mt-0.5">
                          @{u.username} · {u.designation || 'Member'}
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Role */}
                  <td className="px-4 py-3.5">
                    <HealthBadge type="role" value={u.role} />
                  </td>
                  {/* Organization */}
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-medium text-[--muted-foreground]">
                      {orgMap[u.organizationId] || u.organizationId?.slice(0, 8) || '—'}
                    </span>
                  </td>
                  {/* Team */}
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-semibold text-[--muted-foreground]">
                      {u.teamName}
                    </span>
                  </td>
                  {/* Manager */}
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-[--muted-foreground]">
                      {u.managerName}
                    </span>
                  </td>
                  {/* Tasks */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-[--foreground] tabular-nums">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{u.completedTasks}</span>
                      <span className="text-[--muted-foreground]/60">/</span>
                      <span className="text-[--muted-foreground]">{u.totalTasks}</span>
                    </div>
                  </td>
                  {/* Overdue */}
                  <td className="px-4 py-3.5 text-center">
                    {overdue ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 tabular-nums">
                        <AlertTriangle className="w-3 h-3 animate-pulse" />
                        {u.overdueTasks}
                      </span>
                    ) : (
                      <span className="text-xs text-[--muted-foreground]/50">—</span>
                    )}
                  </td>
                  {/* Goals */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="inline-flex items-center gap-1 text-xs font-semibold text-[--foreground] tabular-nums">
                      <Target className="w-3.5 h-3.5 text-blue-400" />
                      <span>{u.completedGoals}</span>
                      <span className="text-[--muted-foreground]/60">/</span>
                      <span className="text-[--muted-foreground]">{u.totalGoals}</span>
                    </div>
                  </td>
                  {/* Completion Pct */}
                  <td className="px-4 py-3.5 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-extrabold text-[--foreground] tabular-nums">
                        {u.totalItems > 0 ? `${u.completionPct}%` : '—'}
                      </span>
                      {u.totalItems > 0 && (
                        <div className="w-16 h-1 bg-[--border] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${u.completionPct}%`,
                              backgroundColor: u.completionPct >= 70 ? 'var(--status-done)' : u.completionPct >= 40 ? 'var(--status-review)' : 'var(--destructive)'
                            }}
                          />
                        </div>
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
  );
}

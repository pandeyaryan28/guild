import React from 'react';
import { format } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import type { Organization, UserProfile, Task, Channel } from '@guild/types';

function fmtDate(ts: Timestamp | undefined | null): string {
  if (!ts) return '—';
  try { return format(ts.toDate(), 'MMM d, yyyy'); } catch { return '—'; }
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}

function StatCard({ label, value, icon, color, sub }: StatCardProps) {
  return (
    <div
      className="glass rounded-2xl p-5 card-hover animate-fade-up"
      style={{ borderColor: `${color}22` }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: `${color}18`, color }}
        >
          {icon}
        </div>
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${color}15`, color }}
        >
          LIVE
        </span>
      </div>
      <p className="text-2xl font-bold text-[--foreground] tabular-nums">{value.toLocaleString()}</p>
      <p className="text-xs text-[--muted-foreground] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[--muted-foreground] mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <h2 className="text-base font-semibold text-[--foreground]">{title}</h2>
      <span
        className="text-xs font-medium px-2 py-0.5 rounded-full"
        style={{
          background: 'oklch(from var(--primary) l c h / 12%)',
          color: 'var(--primary)',
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ─── Table Shell ─────────────────────────────────────────────────────────────

function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[--border]">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'oklch(from var(--muted) l c h / 60%)' }}>
            {headers.map(h => (
              <th key={h} className="text-left text-[10px] font-semibold uppercase tracking-wider text-[--muted-foreground] px-4 py-2.5 first:rounded-tl-xl last:rounded-tr-xl">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function Tr({ children, i }: { children: React.ReactNode; i: number }) {
  return (
    <tr
      className="border-t border-[--border] transition-colors duration-100"
      style={{ background: i % 2 === 0 ? 'transparent' : 'oklch(from var(--card) l c h / 30%)' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'oklch(from var(--accent) l c h / 40%)')}
      onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'oklch(from var(--card) l c h / 30%)')}
    >
      {children}
    </tr>
  );
}

function Td({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-4 py-3 text-[--foreground] ${mono ? 'font-mono text-xs' : 'text-sm'}`}>
      {children}
    </td>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  owner:  'oklch(0.65 0.26 300)',
  admin:  'oklch(0.62 0.18 265)',
  member: 'oklch(0.62 0.02 265)',
};

const STATUS_COLORS: Record<string, string> = {
  todo:        'oklch(0.62 0.02 265)',
  in_progress: 'oklch(0.62 0.18 235)',
  review:      'oklch(0.80 0.18 75)',
  done:        'oklch(0.70 0.19 155)',
};

const STATUS_LABELS: Record<string, string> = {
  todo: 'Todo', in_progress: 'In Progress', review: 'Review', done: 'Done',
};

const PRIORITY_COLORS: Record<string, string> = {
  none: 'oklch(0.62 0.02 265)',
  low: 'oklch(0.68 0.16 235)',
  medium: 'oklch(0.80 0.18 75)',
  high: 'oklch(0.72 0.20 45)',
  urgent: 'oklch(0.65 0.22 25)',
};

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ background: `${color}18`, color }}
    >
      {label}
    </span>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

interface DashboardPageProps {
  orgs:     Organization[];
  users:    UserProfile[];
  tasks:    Task[];
  channels: Channel[];
  loading:  boolean;
  error:    string | null;
  refresh:  () => void;
}

export function DashboardPage({ orgs, users, tasks, channels, loading, error, refresh }: DashboardPageProps) {
  // Build a quick org-id → org-name lookup
  const orgMap = Object.fromEntries(orgs.map(o => [o.id, o.name]));

  // ── Overview stats ──────────────────────────────────────────────────────────
  const doneTasks     = tasks.filter(t => t.status === 'done').length;
  const openTasks     = tasks.length - doneTasks;
  const activeMembers = users.filter(u => u.organizationId).length;

  const STATS = [
    {
      label: 'Organizations',
      value: orgs.length,
      color: 'oklch(0.65 0.26 300)',
      sub: 'All registered workspaces',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      label: 'Total Members',
      value: users.length,
      color: 'oklch(0.62 0.18 265)',
      sub: `${activeMembers} in an org`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      ),
    },
    {
      label: 'Total Tasks',
      value: tasks.length,
      color: 'oklch(0.70 0.19 155)',
      sub: `${openTasks} open · ${doneTasks} done`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
        </svg>
      ),
    },
    {
      label: 'Channels',
      value: channels.length,
      color: 'oklch(0.80 0.18 75)',
      sub: 'Across all organizations',
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      ),
    },
  ];

  // ── Skeleton ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto">
        <div className="h-8 w-40 rounded-lg animate-shimmer" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-2xl animate-shimmer" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <div className="h-64 rounded-2xl animate-shimmer" />
        <div className="h-64 rounded-2xl animate-shimmer" />
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center p-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'oklch(0.65 0.22 25 / 15%)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="oklch(0.65 0.22 25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-[--foreground]">Failed to load data</p>
          <p className="text-xs text-[--muted-foreground] mt-1">{error}</p>
        </div>
        <button
          onClick={refresh}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-[--primary] text-[--primary-foreground] hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-10 max-w-7xl mx-auto pb-20">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div id="overview" className="flex items-center justify-between animate-fade-up">
        <div>
          <h1 className="text-xl font-bold text-[--foreground] tracking-tight">Dashboard</h1>
          <p className="text-sm text-[--muted-foreground] mt-0.5">
            Live overview of all Guild data · {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                     border border-[--border] text-[--muted-foreground]
                     hover:text-[--foreground] hover:border-[--ring] transition-all"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
          Refresh
        </button>
      </div>

      {/* ── Stat grid ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((s, i) => (
          <div key={s.label} style={{ animationDelay: `${i * 60}ms` }}>
            <StatCard {...s} />
          </div>
        ))}
      </div>

      {/* ── Organizations ────────────────────────────────────────────────── */}
      <section id="organizations" className="animate-fade-up">
        <SectionHeader title="Organizations" count={orgs.length} />
        {orgs.length === 0 ? (
          <EmptyState message="No organizations found." />
        ) : (
          <Table headers={['Name', 'Slug', 'Industry', 'Size', 'Owner ID', 'Created']}>
            {orgs.map((org, i) => (
              <Tr key={org.id} i={i}>
                <Td><span className="font-medium">{org.name}</span></Td>
                <Td mono>{org.slug}</Td>
                <Td><span className="text-[--muted-foreground]">{org.industry || '—'}</span></Td>
                <Td><span className="text-[--muted-foreground]">{org.companySize || '—'}</span></Td>
                <Td mono>{org.ownerId.slice(0, 8)}…</Td>
                <Td><span className="text-[--muted-foreground] text-xs">{fmtDate(org.createdAt)}</span></Td>
              </Tr>
            ))}
          </Table>
        )}
      </section>

      {/* ── Members ──────────────────────────────────────────────────────── */}
      <section id="members" className="animate-fade-up">
        <SectionHeader title="Members" count={users.length} />
        {users.length === 0 ? (
          <EmptyState message="No members found." />
        ) : (
          <Table headers={['Name', 'Username', 'Organization', 'Role', 'Designation', 'Joined']}>
            {users.map((user, i) => (
              <Tr key={user.uid} i={i}>
                <Td>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{
                        background: 'oklch(from var(--primary) l c h / 18%)',
                        color: 'var(--primary)',
                      }}
                    >
                      {(user.fullName || user.username || '?').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="font-medium text-sm">{user.fullName || '—'}</span>
                  </div>
                </Td>
                <Td mono>@{user.username}</Td>
                <Td><span className="text-[--muted-foreground] text-xs">{orgMap[user.organizationId] || user.organizationId?.slice(0, 8) || '—'}</span></Td>
                <Td><Badge label={user.role} color={ROLE_COLORS[user.role] || ROLE_COLORS.member} /></Td>
                <Td><span className="text-[--muted-foreground] text-xs">{user.designation || '—'}</span></Td>
                <Td><span className="text-[--muted-foreground] text-xs">{fmtDate(user.createdAt)}</span></Td>
              </Tr>
            ))}
          </Table>
        )}
      </section>

      {/* ── Tasks ────────────────────────────────────────────────────────── */}
      <section id="tasks" className="animate-fade-up">
        <SectionHeader title="Tasks" count={tasks.length} />
        {tasks.length === 0 ? (
          <EmptyState message="No tasks found." />
        ) : (
          <Table headers={['Title', 'Organization', 'Status', 'Priority', 'Assignees', 'Created']}>
            {tasks.map((task, i) => (
              <Tr key={task.id} i={i}>
                <Td>
                  <span className="font-medium line-clamp-1 max-w-[220px] block">{task.title}</span>
                </Td>
                <Td><span className="text-[--muted-foreground] text-xs">{orgMap[task.orgId] || task.orgId?.slice(0, 8)}</span></Td>
                <Td>
                  <Badge
                    label={STATUS_LABELS[task.status] || task.status}
                    color={STATUS_COLORS[task.status] || STATUS_COLORS.todo}
                  />
                </Td>
                <Td>
                  <Badge
                    label={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    color={PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.none}
                  />
                </Td>
                <Td>
                  <span className="text-[--muted-foreground] text-xs">
                    {task.assigneeIds?.length ? `${task.assigneeIds.length} assigned` : 'Unassigned'}
                  </span>
                </Td>
                <Td><span className="text-[--muted-foreground] text-xs">{fmtDate(task.createdAt)}</span></Td>
              </Tr>
            ))}
          </Table>
        )}
      </section>

      {/* ── Channels ─────────────────────────────────────────────────────── */}
      <section id="channels" className="animate-fade-up">
        <SectionHeader title="Channels" count={channels.length} />
        {channels.length === 0 ? (
          <EmptyState message="No channels found." />
        ) : (
          <Table headers={['Name', 'Organization', 'Members', 'Description', 'Created']}>
            {channels.map((ch, i) => (
              <Tr key={ch.id} i={i}>
                <Td>
                  <span className="font-medium text-[--primary]"># {ch.name}</span>
                </Td>
                <Td><span className="text-[--muted-foreground] text-xs">{orgMap[ch.orgId] || ch.orgId?.slice(0, 8)}</span></Td>
                <Td>
                  <span className="text-xs font-medium tabular-nums">{ch.memberCount ?? 0}</span>
                </Td>
                <Td>
                  <span className="text-[--muted-foreground] text-xs line-clamp-1 max-w-[260px] block">
                    {ch.description || '—'}
                  </span>
                </Td>
                <Td><span className="text-[--muted-foreground] text-xs">{fmtDate(ch.createdAt)}</span></Td>
              </Tr>
            ))}
          </Table>
        )}
      </section>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-[--border] text-center">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3 opacity-50">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p className="text-sm text-[--muted-foreground]">{message}</p>
    </div>
  );
}

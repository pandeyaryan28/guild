import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { OrgRequest, UserProfile, Team, RequestType, RequestStatus } from '@guild/types';
import { 
  REQUEST_TYPE_LABELS,
  REQUEST_TYPE_ICONS
} from '@guild/types';
import { 
  updateRequestStatus, 
  auth 
} from '@guild/firebase';
import {
  GitPullRequest,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  Home,
  Laptop,
  Receipt,
  Stethoscope,
  ClipboardList,
  ChevronRight,
  Filter,
  X,
  Check,
  User,
  Briefcase,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  Info
} from 'lucide-react';

interface RequestsMappingTableProps {
  requests: OrgRequest[];
  users: UserProfile[];
  teams: Team[];
  activeOrgId: string;
  refresh: () => void;
}

// Icon component wrapper matching Lucide mappings
function RequestTypeIcon({ type, className = "w-4 h-4" }: { type: RequestType; className?: string }) {
  switch (type) {
    case 'sick_leave':     return <Stethoscope className={`${className} text-rose-400`} />;
    case 'work_from_home': return <Home className={`${className} text-cyan-400`} />;
    case 'time_off':       return <Calendar className={`${className} text-indigo-400`} />;
    case 'equipment':      return <Laptop className={`${className} text-amber-400`} />;
    case 'expense':        return <Receipt className={`${className} text-emerald-400`} />;
    default:               return <ClipboardList className={`${className} text-slate-400`} />;
  }
}

export function RequestsMappingTable({
  requests,
  users,
  teams,
  activeOrgId,
  refresh
}: RequestsMappingTableProps) {
  // Current authenticated user
  const currentUser = useMemo(() => {
    const uid = auth.currentUser?.uid;
    return users.find(u => u.uid === uid);
  }, [users]);

  // ─── STATE HANDLERS ─────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [teamFilter, setTeamFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<string>('latest');

  // Slide-out details drawer
  const [selectedRequest, setSelectedRequest] = useState<OrgRequest | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [approverNote, setApproverNote] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // ─── KPI COUNTS ─────────────────────────────────────────────────────────────
  const kpiStats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const approved = requests.filter(r => r.status === 'approved').length;
    const rejected = requests.filter(r => r.status === 'rejected').length;
    const wfhCount = requests.filter(r => r.type === 'work_from_home').length;
    const leaveCount = requests.filter(r => r.type === 'sick_leave' || r.type === 'time_off').length;

    const rate = total > 0 ? Math.round(((approved + rejected) / total) * 100) : 0;

    return { total, pending, approved, rejected, wfhCount, leaveCount, rate };
  }, [requests]);

  // User map for names
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.uid, u.fullName || u.username])), [users]);
  const userRoleMap = useMemo(() => Object.fromEntries(users.map(u => [u.uid, u.role])), [users]);
  const userDesignationMap = useMemo(() => Object.fromEntries(users.map(u => [u.uid, u.designation])), [users]);

  // Team options
  const teamOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Teams' },
      ...teams.map(t => ({ value: t.id, label: t.name }))
    ];
  }, [teams]);

  // User options
  const userOptions = useMemo(() => {
    return [
      { value: 'all', label: 'All Members' },
      ...users.map(u => ({ value: u.uid, label: u.fullName || u.username }))
    ];
  }, [users]);

  // ─── DERIVED FILTERED REQUESTS ──────────────────────────────────────────────
  const filteredRequests = useMemo(() => {
    let list = [...requests];

    // 1. Text Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r => 
        r.title.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.creatorName || '').toLowerCase().includes(q) ||
        (r.creatorUsername || '').toLowerCase().includes(q)
      );
    }

    // 2. Status Filter
    if (statusFilter !== 'all') {
      list = list.filter(r => r.status === statusFilter);
    }

    // 3. Request Type Filter
    if (typeFilter !== 'all') {
      list = list.filter(r => r.type === typeFilter);
    }

    // 4. Creator/User Filter
    if (userFilter !== 'all') {
      list = list.filter(r => r.creatorId === userFilter);
    }

    // 5. Team Filter (filter by requests from members of that team)
    if (teamFilter !== 'all') {
      const selectedTeam = teams.find(t => t.id === teamFilter);
      if (selectedTeam) {
        const teamUids = new Set([selectedTeam.managerId, ...selectedTeam.memberIds]);
        list = list.filter(r => teamUids.has(r.creatorId));
      }
    }

    // 6. Sorting
    list.sort((a, b) => {
      const getMillis = (ts: any) => {
        if (!ts) return 0;
        if (typeof ts.toMillis === 'function') return ts.toMillis();
        if (typeof ts.toDate === 'function') return ts.toDate().getTime();
        if (ts.seconds) return ts.seconds * 1000;
        return 0;
      };

      if (sortKey === 'latest') {
        return getMillis(b.createdAt) - getMillis(a.createdAt);
      } else if (sortKey === 'oldest') {
        return getMillis(a.createdAt) - getMillis(b.createdAt);
      } else if (sortKey === 'creator') {
        return (a.creatorName || '').localeCompare(b.creatorName || '');
      } else if (sortKey === 'type') {
        return a.type.localeCompare(b.type);
      }
      return 0;
    });

    return list;
  }, [requests, searchQuery, statusFilter, typeFilter, userFilter, teamFilter, sortKey, teams]);

  // ─── ACTION IMPLEMENTATION ──────────────────────────────────────────────────
  const handleOpenDrawer = (req: OrgRequest) => {
    setSelectedRequest(req);
    setApproverNote(req.approverNote || '');
    setActionError(null);
    setActionSuccess(null);
    setIsDrawerOpen(true);
  };

  const handleAction = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest || !currentUser) return;
    setIsSubmittingAction(true);
    setActionError(null);
    setActionSuccess(null);

    try {
      await updateRequestStatus(
        selectedRequest.id,
        activeOrgId,
        status,
        currentUser.uid,
        currentUser.fullName || currentUser.username,
        currentUser.username,
        selectedRequest.creatorId,
        selectedRequest.title,
        approverNote.trim() || null
      );

      setActionSuccess(`Request successfully ${status}!`);
      setTimeout(() => {
        setIsDrawerOpen(false);
        setSelectedRequest(null);
        refresh();
      }, 1500);
    } catch (err: any) {
      setActionError(err.message || `Failed to ${status} request.`);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || typeFilter !== 'all' || userFilter !== 'all' || teamFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setTypeFilter('all');
    setUserFilter('all');
    setTeamFilter('all');
    setSortKey('latest');
  };

  return (
    <div className="space-y-6 animate-fade-up">
      {/* ─── KPI METRICS CARD DOCK ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Requests */}
        <div className="aether-glass p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[--muted-foreground]">All Requests</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <GitPullRequest className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-[--foreground] tracking-tight leading-none tabular-nums">{kpiStats.total}</h3>
            <p className="text-[9px] text-[--muted-foreground] font-semibold mt-1.5">{kpiStats.wfhCount} WFH · {kpiStats.leaveCount} Leaves submitted</p>
          </div>
        </div>

        {/* Pending Approvals */}
        <div className="aether-glass p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[--muted-foreground]">Pending Approvals</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-amber-400 tracking-tight leading-none tabular-nums">{kpiStats.pending}</h3>
            <p className="text-[9px] text-[--muted-foreground] font-semibold mt-1.5">Needs action from admin or manager</p>
          </div>
        </div>

        {/* Resolved Requests */}
        <div className="aether-glass p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[--muted-foreground]">Approved Requests</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-emerald-400 tracking-tight leading-none tabular-nums">{kpiStats.approved}</h3>
            <p className="text-[9px] text-[--muted-foreground] font-semibold mt-1.5">{kpiStats.rejected} rejected claims registered</p>
          </div>
        </div>

        {/* Resolution Velocity */}
        <div className="aether-glass p-5 flex flex-col justify-between h-32 relative overflow-hidden group hover:scale-[1.01] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[--muted-foreground]">Resolution Velocity</span>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <span className="text-xs font-black">%</span>
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-3xl font-black text-cyan-400 tracking-tight leading-none tabular-nums">{kpiStats.rate}%</h3>
            <p className="text-[9px] text-[--muted-foreground] font-semibold mt-1.5">Percentage of requests currently processed</p>
          </div>
        </div>
      </div>

      {/* ─── SEARCH & FILTER PANEL ─── */}
      <div className="aether-glass p-5 space-y-4">
        {/* Row 1: Search and Clear */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search requests by title, description, or submitter..."
              className="w-full pl-10 pr-4 py-3 aether-glass-input text-xs font-semibold placeholder:text-[--muted-foreground]/50 outline-none transition-all"
            />
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 active:scale-95 text-[--muted-foreground] border border-white/10 flex items-center gap-2 cursor-pointer transition-all"
            >
              <X className="w-3.5 h-3.5" />
              Reset Filters
            </button>
          )}
        </div>

        {/* Row 2: Select Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3.5">
          {/* Status */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-[--muted-foreground]/80 px-1">Status</label>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.04] border border-white/10 dark:border-white/5 text-[--foreground] outline-none cursor-pointer"
            >
              <option value="all" className="bg-[--background]">All Statuses</option>
              <option value="pending" className="bg-[--background]">⌛ Pending</option>
              <option value="approved" className="bg-[--background]">✓ Approved</option>
              <option value="rejected" className="bg-[--background]">✗ Rejected</option>
            </select>
          </div>

          {/* Request Type */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-[--muted-foreground]/80 px-1">Request Type</label>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.04] border border-white/10 dark:border-white/5 text-[--foreground] outline-none cursor-pointer"
            >
              <option value="all" className="bg-[--background]">All Types</option>
              {Object.entries(REQUEST_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val} className="bg-[--background]">{label}</option>
              ))}
            </select>
          </div>

          {/* Member */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-[--muted-foreground]/80 px-1">Submitter</label>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.04] border border-white/10 dark:border-white/5 text-[--foreground] outline-none cursor-pointer"
            >
              {userOptions.map(u => (
                <option key={u.value} value={u.value} className="bg-[--background]">{u.label}</option>
              ))}
            </select>
          </div>

          {/* Squad Team */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-[--muted-foreground]/80 px-1">Squad Team</label>
            <select
              value={teamFilter}
              onChange={e => setTeamFilter(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.04] border border-white/10 dark:border-white/5 text-[--foreground] outline-none cursor-pointer"
            >
              {teamOptions.map(t => (
                <option key={t.value} value={t.value} className="bg-[--background]">{t.label}</option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex flex-col gap-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-[--muted-foreground]/80 px-1">Sort Orders</label>
            <select
              value={sortKey}
              onChange={e => setSortKey(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl text-xs font-semibold bg-white/[0.04] border border-white/10 dark:border-white/5 text-[--foreground] outline-none cursor-pointer"
            >
              <option value="latest" className="bg-[--background]">Latest to Oldest</option>
              <option value="oldest" className="bg-[--background]">Oldest to Latest</option>
              <option value="creator" className="bg-[--background]">Submitter Name (A-Z)</option>
              <option value="type" className="bg-[--background]">Request Type (A-Z)</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── REQUESTS DATA CONTAINER ─── */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 dark:border-white/5 bg-white/[0.02] dark:bg-white/[0.02]">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-[10px] font-extrabold uppercase tracking-wider text-[--muted-foreground]" style={{ background: 'oklch(from var(--muted) l c h / 30%)' }}>
              <th className="text-left px-5 py-4 first:rounded-tl-2xl">Submitter</th>
              <th className="text-left px-4 py-4">Request Type</th>
              <th className="text-left px-4 py-4">Description Detail</th>
              <th className="text-center px-4 py-4">Created Date</th>
              <th className="text-center px-4 py-4">Request Window</th>
              <th className="text-center px-4 py-4">Status</th>
              <th className="text-center px-4 py-4 last:rounded-tr-2xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--border]/40">
            {filteredRequests.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16 text-[--muted-foreground]/70 italic">
                  No requests matched your filter configuration.
                </td>
              </tr>
            ) : (
              filteredRequests.map((r, i) => {
                // Color configuration of status
                const isPending = r.status === 'pending';
                const isApproved = r.status === 'approved';
                const statusBadgeStyle = isApproved
                  ? { bg: 'oklch(0.70 0.19 155 / 12%)', text: 'oklch(0.70 0.19 155)', border: 'oklch(0.70 0.19 155 / 20%)', label: 'Approved' }
                  : r.status === 'rejected'
                  ? { bg: 'oklch(0.65 0.22 25 / 12%)', text: 'oklch(0.65 0.22 25)', border: 'oklch(0.65 0.22 25 / 20%)', label: 'Rejected' }
                  : { bg: 'oklch(0.80 0.18 75 / 12%)', text: 'oklch(0.80 0.18 75)', border: 'oklch(0.80 0.18 75 / 20%)', label: 'Pending' };

                const creatorRole = userRoleMap[r.creatorId] || 'member';
                const creatorDesignation = userDesignationMap[r.creatorId] || 'Teammate';
                const submitterName = r.creatorName || userMap[r.creatorId] || r.creatorUsername || 'Unknown';

                return (
                  <tr
                    key={r.id}
                    className="transition-colors hover:bg-[--accent]/5 group"
                    style={{ background: i % 2 === 0 ? 'transparent' : 'oklch(from var(--card) l c h / 10%)' }}
                  >
                    {/* Submitter */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-inner"
                          style={{
                            background: 'oklch(from var(--primary) l c h / 18%)',
                            color: 'var(--primary)',
                          }}
                        >
                          {submitterName.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[--foreground] leading-none">
                            {submitterName}
                          </div>
                          <div className="text-[9px] text-[--muted-foreground] font-semibold mt-1">
                            {creatorDesignation} · <span className="capitalize text-[--primary]/80 font-mono">@{r.creatorUsername || 'user'}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Request Type */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                          <RequestTypeIcon type={r.type} />
                        </div>
                        <span className="font-bold text-[--foreground]">
                          {REQUEST_TYPE_LABELS[r.type] || r.type}
                        </span>
                      </div>
                    </td>

                    {/* Description Detail */}
                    <td className="px-4 py-3.5 max-w-xs md:max-w-sm">
                      <div className="space-y-0.5">
                        <div className="font-bold text-[--foreground] truncate">{r.title}</div>
                        <div className="text-[10px] text-[--muted-foreground] line-clamp-1">{r.description || 'No reason provided.'}</div>
                      </div>
                    </td>

                    {/* Created Date */}
                    <td className="px-4 py-3.5 text-center text-[--muted-foreground] font-semibold tabular-nums">
                      {r.createdAt ? format(r.createdAt.toDate(), "MMM dd, yyyy · h:mm a") : '—'}
                    </td>

                    {/* Request Window */}
                    <td className="px-4 py-3.5 text-center font-bold text-[--foreground] tabular-nums">
                      {r.startDate ? (
                        <div className="flex flex-col items-center">
                          <span className="text-xs">{format(new Date(r.startDate), "MMM dd")}</span>
                          {r.endDate && r.endDate !== r.startDate && (
                            <span className="text-[9px] text-[--muted-foreground] font-semibold mt-0.5">to {format(new Date(r.endDate), "MMM dd, yyyy")}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[--muted-foreground]/60 italic font-semibold">—</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="px-4 py-3.5 text-center">
                      <span
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border"
                        style={{
                          backgroundColor: statusBadgeStyle.bg,
                          color: statusBadgeStyle.text,
                          borderColor: statusBadgeStyle.border
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusBadgeStyle.text }} />
                        {statusBadgeStyle.label}
                      </span>
                    </td>

                    {/* Action button */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleOpenDrawer(r)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer transition-all shadow-sm
                          ${isPending 
                            ? 'border-indigo-500/20 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/15 hover:border-indigo-500/35' 
                            : 'border-white/10 dark:border-white/5 bg-white/5 hover:bg-white/10 text-[--muted-foreground] hover:text-[--foreground]'
                          }`}
                      >
                        {isPending ? 'Action Required' : 'View Details'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MAC-STYLE GLASS ACTION DETAILS SIDE SHEET DRAWER ─── */}
      {isDrawerOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex justify-end select-none">
          {/* Backdrop overlay */}
          <div
            onClick={() => {
              if (!isSubmittingAction) {
                setIsDrawerOpen(false);
                setSelectedRequest(null);
              }
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          />

          {/* Frosted Glass Side Drawer */}
          <div
            className="relative w-full sm:w-[500px] h-full aether-glass border-y-0 border-r-0 border-l border-white/10 shadow-2xl flex flex-col z-10 p-6 overflow-hidden bg-surface/95 dark:bg-surface/90 backdrop-blur-3xl"
            style={{
              animation: 'slide-left 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[--foreground]">Request Operations Console</h3>
                <p className="text-[9px] text-[--muted-foreground] mt-0.5 leading-none">Map, audit, and action organizational workspace requests</p>
              </div>
              <button
                onClick={() => {
                  setIsDrawerOpen(false);
                  setSelectedRequest(null);
                }}
                disabled={isSubmittingAction}
                className="h-8 w-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-[--muted-foreground] hover:text-[--foreground] active:scale-95 transition-all cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Drawer Content */}
            <div className="flex-1 overflow-y-auto aether-scroll space-y-6 pt-5 pr-1 pb-6">
              {actionError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}
              {actionSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{actionSuccess}</span>
                </div>
              )}

              {/* Submitter Info banner card */}
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] shadow-inner">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-black text-white shrink-0 shadow-lg border border-white/10"
                  style={{
                    background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
                  }}
                >
                  {(selectedRequest.creatorName || selectedRequest.creatorUsername || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <h4 className="text-sm font-black text-[--foreground] truncate">{selectedRequest.creatorName}</h4>
                  <p className="text-[10px] text-[--muted-foreground] truncate mt-1">
                    @{selectedRequest.creatorUsername} · {userDesignationMap[selectedRequest.creatorId] || 'Squad Member'}
                  </p>
                </div>
              </div>

              {/* Request Core Details */}
              <div className="space-y-4">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-[--muted-foreground]/60 px-1">Request Details</h5>

                {/* Title */}
                <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.04]">
                  <div className="text-[9px] font-bold text-[--muted-foreground] uppercase tracking-wider">Request Header</div>
                  <div className="text-sm font-bold text-[--foreground] mt-1">{selectedRequest.title}</div>
                </div>

                {/* Grid Type & Dates */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Type */}
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.04]">
                    <div className="text-[9px] font-bold text-[--muted-foreground] uppercase tracking-wider">Type</div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <RequestTypeIcon type={selectedRequest.type} className="w-4 h-4 shrink-0" />
                      <span className="font-bold text-xs text-[--foreground]">{REQUEST_TYPE_LABELS[selectedRequest.type]}</span>
                    </div>
                  </div>

                  {/* Window */}
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.04]">
                    <div className="text-[9px] font-bold text-[--muted-foreground] uppercase tracking-wider">Duration Window</div>
                    <div className="font-bold text-xs text-[--foreground] mt-1.5 tabular-nums">
                      {selectedRequest.startDate ? (
                        <>
                          {format(new Date(selectedRequest.startDate), "MMM dd")}
                          {selectedRequest.endDate && selectedRequest.endDate !== selectedRequest.startDate && (
                            <> - {format(new Date(selectedRequest.endDate), "MMM dd, yyyy")}</>
                          )}
                        </>
                      ) : (
                        <span className="text-[--muted-foreground]/60 italic font-semibold">Immediate / None</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Reason description */}
                <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.04] space-y-1.5">
                  <div className="text-[9px] font-bold text-[--muted-foreground] uppercase tracking-wider">Detailed Statement / Reason</div>
                  <div className="text-xs text-[--foreground] font-medium leading-relaxed max-h-36 overflow-y-auto aether-scroll pr-1 whitespace-pre-wrap">
                    {selectedRequest.description || 'No detailed statement provided.'}
                  </div>
                </div>
              </div>

              {/* Status & Audit timeline details */}
              <div className="space-y-4">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-[--muted-foreground]/60 px-1">Audit timeline</h5>
                <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.04] space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[--muted-foreground]">Current Status</span>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border bg-white/5"
                      style={{
                        color: selectedRequest.status === 'approved' ? 'oklch(0.70 0.19 155)' : selectedRequest.status === 'rejected' ? 'oklch(0.65 0.22 25)' : 'oklch(0.80 0.18 75)',
                        borderColor: selectedRequest.status === 'approved' ? 'oklch(0.70 0.19 155 / 20%)' : selectedRequest.status === 'rejected' ? 'oklch(0.65 0.22 25 / 20%)' : 'oklch(0.80 0.18 75 / 20%)'
                      }}
                    >
                      {selectedRequest.status}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs font-semibold text-[--muted-foreground] tabular-nums">
                    <span>Submitted At</span>
                    <span>{selectedRequest.createdAt ? format(selectedRequest.createdAt.toDate(), "MMM dd, yyyy · h:mm a") : '—'}</span>
                  </div>

                  {selectedRequest.status !== 'pending' && (
                    <>
                      <div className="flex justify-between items-center text-xs font-semibold text-[--muted-foreground]">
                        <span>Handled By</span>
                        <span className="text-[--foreground] font-bold">{selectedRequest.approverName || 'Workspace Admin'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-semibold text-[--muted-foreground] tabular-nums">
                        <span>Updated At</span>
                        <span>{selectedRequest.updatedAt ? format(selectedRequest.updatedAt.toDate(), "MMM dd, yyyy · h:mm a") : '—'}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Approval Notes Form section */}
              <div className="space-y-4">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-[--muted-foreground]/60 px-1">
                  {selectedRequest.status === 'pending' ? 'Decision Notes' : 'Approver Comments'}
                </h5>
                <div className="space-y-1.5">
                  {selectedRequest.status === 'pending' ? (
                    <textarea
                      value={approverNote}
                      onChange={e => setApproverNote(e.target.value)}
                      placeholder="Add an optional explanation or feedback for your decision (approving or rejecting)..."
                      className="w-full h-24 p-3.5 border border-white/10 bg-white/[0.05] text-xs font-medium text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all resize-none placeholder:text-[--muted-foreground]/40 leading-relaxed"
                      disabled={isSubmittingAction}
                    />
                  ) : (
                    <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.04] text-xs font-medium leading-relaxed italic text-[--muted-foreground]">
                      {selectedRequest.approverNote || 'No additional comments provided.'}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Decision Actions Panel (Footer) */}
            <div className="flex items-center justify-between pt-5 border-t border-white/10 shrink-0 font-semibold">
              <button
                type="button"
                onClick={() => {
                  setIsDrawerOpen(false);
                  setSelectedRequest(null);
                }}
                disabled={isSubmittingAction}
                className="px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-[--foreground] transition-colors disabled:opacity-50"
              >
                Close Panel
              </button>

              {selectedRequest.status === 'pending' && (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => handleAction('rejected')}
                    disabled={isSubmittingAction}
                    className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                    Reject Claim
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction('approved')}
                    disabled={isSubmittingAction}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white rounded-xl text-xs font-bold transition-all shadow-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    Approve Request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

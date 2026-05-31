import React, { useMemo, useState } from 'react';
import type { UserProfile, Task, Goal, Team, Organization, UserRole } from '@guild/types';
import { HealthBadge } from './HealthBadge';
import { 
  Shield, Sparkles, CheckCircle2, AlertTriangle, Target, Star, 
  Settings, UserPlus, X, Mail, Crown, ShieldCheck, User, Briefcase, 
  Trash2, Link, RefreshCw, Check
} from 'lucide-react';
import { 
  updateUserProfile, 
  updateUserRole, 
  removeUserFromOrg, 
  createPendingEmailInvite, 
  getOrCreateGlobalInviteLink, 
  resetGlobalInviteLink,
  auth
} from '@guild/firebase';

interface PeopleWorkloadTableProps {
  users: UserProfile[];
  tasks: Task[];
  goals: Goal[];
  teams: Team[];
  orgs: Organization[];
  searchQuery: string;
  roleFilter: string;
  orgFilter: string;
  refresh: () => void;
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
  refresh,
}: PeopleWorkloadTableProps) {
  const orgMap = useMemo(() => Object.fromEntries(orgs.map(o => [o.id, o.name])), [orgs]);
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.uid, u.fullName || u.username])), [users]);

  // Current logged in admin profile
  const currentUser = useMemo(() => {
    const uid = auth.currentUser?.uid;
    return users.find(u => u.uid === uid);
  }, [users]);

  // ─── COMPONENT STATES ──────────────────────────────────────────────────────────
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isManageDrawerOpen, setIsManageDrawerOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Edit fields state
  const [editFullName, setEditFullName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editAge, setEditAge] = useState(0);
  const [editRole, setEditRole] = useState<UserRole>('member');
  const [editManagerId, setEditManagerId] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Invite states
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('member');
  const [globalInviteLink, setGlobalInviteLink] = useState<string>('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // ─── DERIVED WORKLOAD DATA ────────────────────────────────────────────────────
  const usersWithWorkload = useMemo(() => {
    return users.map(user => {
      // 1. Associated Team
      const userTeam = teams.find(t => t.memberIds.includes(user.uid) || t.managerId === user.uid);

      // 2. Manager Name
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
  }, [users, tasks, goals, teams, userMap]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return usersWithWorkload.filter(u => {
      const matchesSearch =
        (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.username || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.designation || '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesOrg = orgFilter === 'all' || u.organizationId === orgFilter;

      return matchesSearch && matchesRole && matchesOrg;
    });
  }, [usersWithWorkload, searchQuery, roleFilter, orgFilter]);

  // ─── HANDLERS ────────────────────────────────────────────────────────────────
  const handleOpenManage = (user: UserProfile) => {
    setSelectedUser(user);
    setEditFullName(user.fullName || '');
    setEditDesignation(user.designation || '');
    setEditEmployeeId(user.employeeId || '');
    setEditAge(user.age || 0);
    setEditRole(user.role);
    setEditManagerId(user.managerId || '');
    setSaveError(null);
    setIsManageDrawerOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      // 1. Update basic profile info
      await updateUserProfile(selectedUser.uid, {
        fullName: editFullName.trim(),
        designation: editDesignation.trim(),
        employeeId: editEmployeeId.trim(),
        age: Number(editAge),
        managerId: editManagerId || null,
      });

      // 2. Update role hierarchy if changed
      if (editRole !== selectedUser.role) {
        await updateUserRole(selectedUser.uid, editRole);
      }

      refresh();
      setIsManageDrawerOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!selectedUser) return;
    const msg = `Are you sure you want to deactivate and remove "${selectedUser.fullName || selectedUser.username}" from the organization? They will immediately lose all workspace access.`;
    if (!window.confirm(msg)) return;

    setIsSaving(true);
    setSaveError(null);
    try {
      await removeUserFromOrg(selectedUser.uid);
      refresh();
      setIsManageDrawerOpen(false);
      setSelectedUser(null);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to remove member');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !currentUser?.organizationId) return;
    setIsInviting(true);
    setInviteError(null);
    setInviteSuccess(null);

    try {
      const token = await createPendingEmailInvite(
        inviteEmail.toLowerCase().trim(),
        currentUser.organizationId,
        inviteRole,
        currentUser.uid
      );
      setInviteSuccess(`Invitation successfully created for ${inviteEmail.toLowerCase().trim()}`);
      setInviteEmail('');
    } catch (err: any) {
      setInviteError(err.message || 'Failed to create invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleGetGlobalLink = async () => {
    if (!currentUser?.organizationId) return;
    setIsGeneratingLink(true);
    setInviteError(null);
    try {
      const token = await getOrCreateGlobalInviteLink(currentUser.organizationId, currentUser.uid);
      const url = `${window.location.origin}/join/${token}`;
      setGlobalInviteLink(url);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to fetch global link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleResetGlobalLink = async () => {
    if (!currentUser?.organizationId) return;
    const confirm = window.confirm('Are you sure you want to revoke the active link and generate a new token? The old link will stop working immediately.');
    if (!confirm) return;

    setIsGeneratingLink(true);
    setInviteError(null);
    try {
      const token = await resetGlobalInviteLink(currentUser.organizationId, currentUser.uid);
      const url = `${window.location.origin}/join/${token}`;
      setGlobalInviteLink(url);
      setCopiedLink(false);
    } catch (err: any) {
      setInviteError(err.message || 'Failed to reset global link');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(globalInviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Table Title and Invite Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-black uppercase text-[--foreground] tracking-wide">Workspace Directory</h2>
          <p className="text-[10px] text-[--muted-foreground] font-semibold">Monitor workload and coordinate member privileges</p>
        </div>
        {currentUser?.organizationId && (
          <button
            onClick={() => {
              setIsInviteModalOpen(true);
              setInviteSuccess(null);
              setInviteError(null);
              setGlobalInviteLink('');
            }}
            className="flex items-center gap-2 self-start sm:self-center px-4 py-2 rounded-xl text-xs font-semibold
                       bg-[--primary] text-[--primary-foreground] hover:opacity-90 transition-all cursor-pointer shadow-md"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite Member
          </button>
        )}
      </div>

      {/* Directory Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/10 dark:border-white/5 bg-white/[0.02] dark:bg-white/[0.02]">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-[10px] font-extrabold uppercase tracking-wider text-[--muted-foreground]" style={{ background: 'oklch(from var(--muted) l c h / 30%)' }}>
              <th className="text-left px-5 py-4 first:rounded-tl-2xl">Name</th>
              <th className="text-left px-4 py-4">Role</th>
              <th className="text-left px-4 py-4">Organization</th>
              <th className="text-left px-4 py-4">Team</th>
              <th className="text-left px-4 py-4">Manager</th>
              <th className="text-center px-4 py-4">Tasks</th>
              <th className="text-center px-4 py-4">Goals</th>
              <th className="text-center px-4 py-4">Completion</th>
              <th className="text-center px-4 py-4 last:rounded-tr-2xl">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[--border]/40">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-12 text-[--muted-foreground] italic">
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
                    className="transition-colors hover:bg-[--accent]/5 group"
                    style={{ background: i % 2 === 0 ? 'transparent' : 'oklch(from var(--card) l c h / 10%)' }}
                  >
                    {/* Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-inner"
                          style={{
                            background: 'oklch(from var(--primary) l c h / 18%)',
                            color: 'var(--primary)',
                          }}
                        >
                          {(u.fullName || u.username || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-sm text-[--foreground] flex items-center gap-1.5 leading-none">
                            {u.fullName || '—'}
                            {highCompleter && (
                              <span title="Star Performer (>=80% Completion)">
                                <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400 shrink-0" />
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-[--muted-foreground] font-mono leading-none mt-1">
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
                      <span className="text-xs font-semibold text-[--muted-foreground]">
                        {orgMap[u.organizationId] || u.organizationId?.slice(0, 8) || '—'}
                      </span>
                    </td>
                    
                    {/* Team */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-bold text-[--muted-foreground]">
                        {u.teamName}
                      </span>
                    </td>
                    
                    {/* Manager */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold text-[--muted-foreground]">
                        {u.managerName}
                      </span>
                    </td>
                    
                    {/* Tasks */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1 font-bold text-[--foreground] tabular-nums">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{u.completedTasks}</span>
                        <span className="text-[--muted-foreground]/50">/</span>
                        <span className="text-[--muted-foreground]/80">{u.totalTasks}</span>
                        {overdue && (
                          <span className="ml-1.5 inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-black bg-red-500/15 text-red-400 border border-red-500/20 animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            {u.overdueTasks}
                          </span>
                        )}
                      </div>
                    </td>
                    
                    {/* Goals */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex items-center gap-1 font-bold text-[--foreground] tabular-nums">
                        <Target className="w-3.5 h-3.5 text-blue-400" />
                        <span>{u.completedGoals}</span>
                        <span className="text-[--muted-foreground]/50">/</span>
                        <span className="text-[--muted-foreground]/80">{u.totalGoals}</span>
                      </div>
                    </td>
                    
                    {/* Completion Pct */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        <span className="font-extrabold text-[--foreground] tabular-nums leading-none">
                          {u.totalItems > 0 ? `${u.completionPct}%` : '—'}
                        </span>
                        {u.totalItems > 0 && (
                          <div className="w-14 h-1 bg-white/5 border border-white/5 rounded-full overflow-hidden shrink-0">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${u.completionPct}%`,
                                backgroundColor: u.completionPct >= 80 ? 'var(--status-done)' : u.completionPct >= 40 ? 'var(--status-review)' : 'var(--destructive)'
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions Button */}
                    <td className="px-4 py-3.5 text-center">
                      <button
                        onClick={() => handleOpenManage(u)}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider
                                   border border-white/10 dark:border-white/5 text-[--muted-foreground] bg-white/[0.03] hover:bg-white/[0.08]
                                   hover:text-[--foreground] hover:border-[--ring] transition-all cursor-pointer shadow-sm"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── MAC-STYLE FROSTED GLASS EDIT DIRECTORY DRAWER ─────────────────────── */}
      {isManageDrawerOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex justify-end select-none">
          {/* Backdrop overlay */}
          <div
            onClick={() => {
              setIsManageDrawerOpen(false);
              setSelectedUser(null);
            }}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          />

          {/* Frosted Glass Side Sheet */}
          <div
            className="relative w-full sm:w-[480px] h-full aether-glass border-y-0 border-r-0 border-l border-white/10 shadow-2xl flex flex-col z-10 p-6 overflow-hidden bg-white/85 dark:bg-white/[0.05] backdrop-blur-3xl animate-slide-left"
            style={{
              animation: 'slide-left 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[--foreground]">Edit Profile</h3>
                <p className="text-[9px] text-[--muted-foreground] mt-0.5 leading-none">Manage employee profile and platform permissions</p>
              </div>
              <button
                onClick={() => {
                  setIsManageDrawerOpen(false);
                  setSelectedUser(null);
                }}
                className="h-8 w-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-[--muted-foreground] hover:text-[--foreground] active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrolling Settings Panel */}
            <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto aether-scroll space-y-6 pt-5 pr-1 pb-6">
              {saveError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{saveError}</span>
                </div>
              )}

              {/* Cockpit Card banner */}
              <div className="flex items-center gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02] shadow-inner">
                <div
                  className="h-14 w-14 rounded-2xl flex items-center justify-center text-lg font-black text-white shrink-0 shadow-lg border border-white/10"
                  style={{
                    background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
                  }}
                >
                  {(editFullName || selectedUser.username || '?').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 leading-tight">
                  <h4 className="text-sm font-black text-[--foreground] truncate">{editFullName || selectedUser.username}</h4>
                  <p className="text-[10px] text-[--muted-foreground] truncate mt-1">@{selectedUser.username} · {selectedUser.email}</p>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="space-y-4">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-[--muted-foreground]/60 px-1">Profile Info</h5>

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editFullName}
                    onChange={e => setEditFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all"
                  />
                </div>

                {/* Designation / Job Title */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Job Designation</label>
                  <input
                    type="text"
                    value={editDesignation}
                    onChange={e => setEditDesignation(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all"
                    placeholder="e.g. Lead Logistics, Operation Specialist, Member"
                  />
                </div>

                {/* Employee ID */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Employee ID</label>
                  <input
                    type="text"
                    value={editEmployeeId}
                    onChange={e => setEditEmployeeId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all"
                    placeholder="e.g. EMP-1092"
                  />
                </div>

                {/* Age */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Age</label>
                  <input
                    type="number"
                    value={editAge || ''}
                    onChange={e => setEditAge(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all"
                    placeholder="e.g. 28"
                  />
                </div>
              </div>

              {/* Role hierarchy selection */}
              <div className="space-y-4">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-[--muted-foreground]/60 px-1">Role & Reporting</h5>

                {/* Role Switch */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">User Role</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] cursor-pointer"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                  <p className="text-[9px] text-[--muted-foreground] font-semibold mt-1 px-1">
                    Roles define user access privileges: Owner, Admin, Manager, or Member.
                  </p>
                </div>

                {/* Manager Link */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Manager</label>
                  <select
                    value={editManagerId}
                    onChange={e => setEditManagerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] cursor-pointer"
                  >
                    <option value="">No Manager</option>
                    {users
                      .filter(u => u.uid !== selectedUser.uid) // anyone else
                      .map(u => (
                        <option key={u.uid} value={u.uid}>
                          {u.fullName || u.username} ({u.designation || 'Member'}) — {u.role}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Danger Actions Area */}
              <div className="pt-4 border-t border-white/10 space-y-4">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-red-400 px-1">Danger Zone</h5>
                <button
                  type="button"
                  onClick={handleDeactivate}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 hover:border-red-500/40 text-red-400 py-3 text-xs font-black tracking-wide transition-all active:scale-98 cursor-pointer shadow-sm select-none"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  Remove Member
                </button>
              </div>

              {/* Footer Save Operations */}
              <div className="flex justify-end gap-2.5 pt-5 border-t border-white/10 font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsManageDrawerOpen(false);
                    setSelectedUser(null);
                  }}
                  className="px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-[--foreground] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-[--primary] text-[--primary-foreground] hover:opacity-90 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MAC-STYLE GLASS INVITE MEMBER MODAL ──────────────────────────────── */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsInviteModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          />

          {/* Modal Container Card */}
          <div
            className="w-full max-w-lg overflow-hidden aether-glass border border-white/10 shadow-2xl p-6 relative flex flex-col max-h-[90vh] bg-white/85 dark:bg-white/[0.05] backdrop-blur-3xl animate-scale-up"
            style={{
              animation: 'scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[--foreground]">Invite New Workspace Member</h3>
                <p className="text-[9px] text-[--muted-foreground] mt-0.5 leading-none">Add new employees or generate invite links</p>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="h-8 w-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-[--muted-foreground] hover:text-[--foreground] active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto aether-scroll space-y-6 pt-4 pr-1">
              
              {/* Alert Feedback notifications */}
              {inviteError && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{inviteError}</span>
                </div>
              )}
              {inviteSuccess && (
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{inviteSuccess}</span>
                </div>
              )}

              {/* OPTION 1: EMAIL DIRECT INVITATION */}
              <form onSubmit={handleSendInvite} className="space-y-4">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-[--muted-foreground]/60 px-1">Option 1: Direct Email Invite</h5>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[--muted-foreground]" />
                    <input
                       type="email"
                       required
                       value={inviteEmail}
                       onChange={e => setInviteEmail(e.target.value)}
                       className="w-full pl-9 pr-3.5 py-2.5 border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all placeholder:text-[--muted-foreground]/60"
                       placeholder="e.g. employee@company.com"
                    />
                  </div>
                </div>

                {/* Role Switch */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">User Role</label>
                  <select
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as UserRole)}
                    className="w-full px-3.5 py-2.5 border border-white/10 bg-white/[0.05] text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] cursor-pointer"
                  >
                    <option value="member">Member</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isInviting}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[--primary] text-[--primary-foreground] hover:opacity-90 py-3 text-xs font-black tracking-wide transition-all active:scale-98 cursor-pointer shadow-md select-none"
                >
                  {isInviting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Send Invitation
                </button>
              </form>

              <div className="h-[1px] bg-white/10 my-4 shrink-0" />

              {/* OPTION 2: SHAREABLE GLOBAL LINK */}
              <div className="space-y-4 pb-2">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-[--muted-foreground]/60 px-1">Option 2: Global Shareable Link</h5>
                <p className="text-[10px] text-[--muted-foreground] px-1 font-semibold">
                  Generate a multi-use token link that lets any teammate join your organization immediately upon registering.
                </p>

                {globalInviteLink ? (
                  <div className="space-y-3">
                    {/* Render global link */}
                    <div className="flex items-center gap-2 p-2 px-3 border border-white/10 bg-white/[0.08] rounded-xl">
                      <input
                        type="text"
                        readOnly
                        value={globalInviteLink}
                        className="flex-1 min-w-0 bg-transparent text-xs font-mono text-[--foreground] outline-none border-none select-all"
                      />
                      <button
                        onClick={handleCopyLink}
                        className="h-8 px-3 rounded-lg text-[10px] font-black uppercase tracking-wider bg-white/10 hover:bg-white/15 text-[--foreground] active:scale-95 transition-all cursor-pointer"
                      >
                        {copiedLink ? 'Copied' : 'Copy'}
                      </button>
                    </div>

                    <div className="flex justify-between items-center px-1">
                      <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                        <Star className="w-3 h-3 fill-emerald-400" /> Active Multi-use Token
                      </span>
                      <button
                        onClick={handleResetGlobalLink}
                        disabled={isGeneratingLink}
                        className="text-[9px] font-black text-red-400 hover:underline flex items-center gap-1 cursor-pointer bg-transparent border-none outline-none"
                      >
                        Revoke & Reset Link
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleGetGlobalLink}
                    disabled={isGeneratingLink}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 hover:border-white/20 text-[--foreground] py-3 text-xs font-black tracking-wide transition-all active:scale-98 cursor-pointer shadow-sm select-none"
                  >
                    {isGeneratingLink && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <Link className="w-3.5 h-3.5" />
                    Activate / View Global Invite Link
                  </button>
                )}
              </div>

            </div>

            {/* Footer close */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-white/10 font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-[--foreground] transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Embedded Animations CSS style block */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes slide-left {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        @keyframes scale-up {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease forwards;
        }
        .animate-scale-up {
          animation: scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Crown, ShieldCheck, User, Mail,
  Briefcase, Hash, Calendar, Users, SlidersHorizontal, UserPlus,
  Plus, Trash2, Edit3, X, AlertCircle, Loader2, Workflow, Shield,
  ListTodo
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOrgMembers } from '../../hooks/useChat';
import { type UserProfile, type UserRole } from '../../lib/firestore';
import { getOrgById } from '../../lib/firestore';
import { InviteModal } from './InviteModal';
import { useTeams, type Team } from '../../hooks/useTeams';
import { createTeam, updateTeam, deleteTeam } from '../../lib/teams';
import { useTasks } from '../../hooks/useTasks';
import { STATUS_CONFIG, PRIORITY_CONFIG, type Task } from '../../lib/tasks';
import { MemberProfileDrawer } from '../../components/MemberProfileDrawer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_META: Record<UserRole, { label: string; icon: React.ElementType; color: string; bg: string }> = {
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

function avatarInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// Deterministic pastel hue from uid for avatar background
function avatarHue(uid: string) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

function timeAgo(ts: any) {
  if (!ts?.toMillis) return 'Unknown';
  const diff = Date.now() - ts.toMillis();
  const d = Math.floor(diff / 86400000);
  if (d < 1) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

// ─── Member Card ──────────────────────────────────────────────────────────────

interface MemberCardProps {
  member: UserProfile;
  isSelf: boolean;
  onClick?: () => void;
  hasAccess?: boolean;
}

function MemberCard({ member, isSelf, onClick, hasAccess = false }: MemberCardProps) {
  const meta = ROLE_META[member.role] ?? ROLE_META.member;
  const RoleIcon = meta.icon;
  const hue = avatarHue(member.uid);
  const initials = avatarInitials(member.fullName || member.username || '?');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hasAccess ? { y: -2 } : undefined}
      transition={{ duration: 0.18 }}
      onClick={onClick}
      className={`group relative rounded-2xl border p-3.5 sm:p-5 flex flex-col gap-3.5 sm:gap-4 transition-all duration-200 ${
        hasAccess
          ? 'border-border-default hover:border-primary/40 hover:shadow-xl hover:shadow-black/10 cursor-pointer'
          : 'border-border-default/60 cursor-default'
      }`}
    >
      {/* Self indicator */}
      {isSelf && (
        <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
          You
        </span>
      )}

      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        {member.photoURL ? (
          <img
            src={member.photoURL}
            alt={member.fullName}
            className="h-11 w-11 rounded-xl object-cover shrink-0 shadow-lg border border-white/10 dark:border-black/20"
          />
        ) : (
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-lg"
            style={{ background: `hsl(${hue} 60% 45%)` }}
          >
            {initials}
          </div>
        )}
        <div className="overflow-hidden">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">
            {member.fullName}
          </p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            @{member.username}
          </p>
        </div>
      </div>

      {/* Role badge */}
      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${meta.bg} ${meta.color}`}>
          <RoleIcon className="h-3 w-3" />
          {meta.label}
        </span>
      </div>

      {/* Details grid */}
      <div className="space-y-2">
        {member.designation && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Briefcase className="h-3 w-3 shrink-0 text-text-muted" />
            <span className="truncate">{member.designation}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Mail className="h-3 w-3 shrink-0 text-text-muted" />
          <span className="truncate">{member.email}</span>
        </div>
        {member.employeeId && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Hash className="h-3 w-3 shrink-0 text-text-muted" />
            <span>ID: {member.employeeId}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0 text-text-muted" />
          <span>Joined {timeAgo(member.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Team Form Modal ─────────────────────────────────────────────────────────

interface TeamFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  orgId: string;
  members: UserProfile[];
  editingTeam: Team | null;
}

function TeamFormModal({ isOpen, onClose, orgId, members, editingTeam }: TeamFormModalProps) {
  const [name, setName] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [managerId, setManagerId] = React.useState('');
  const [memberIds, setMemberIds] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (editingTeam) {
      setName(editingTeam.name);
      setDesc(editingTeam.description || '');
      setManagerId(editingTeam.managerId);
      setMemberIds(editingTeam.memberIds || []);
    } else {
      setName('');
      setDesc('');
      setManagerId('');
      setMemberIds([]);
    }
    setError(null);
  }, [editingTeam, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Team name is required');
      return;
    }
    if (!managerId) {
      setError('Please assign a Team Lead');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, {
          name: name.trim(),
          description: desc.trim(),
          managerId,
          memberIds,
        });
      } else {
        await createTeam({
          orgId,
          name: name.trim(),
          description: desc.trim(),
          managerId,
          memberIds,
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save team');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckboxChange = (userId: string, isChecked: boolean) => {
    if (isChecked) {
      setMemberIds((prev) => [...prev, userId]);
    } else {
      setMemberIds((prev) => prev.filter((id) => id !== userId));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-border-default/80 bg-surface shadow-2xl p-6 relative flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-default shrink-0">
          <h2 className="text-base font-bold text-foreground">
            {editingTeam ? 'Edit Team & Squad' : 'Create Team & Squad'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent/45 hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 pt-4 pr-1 scrollbar-thin">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Team Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 border border-border-default bg-bg-primary text-sm text-foreground rounded-xl outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-text-muted"
              placeholder="e.g. Engineering, Logistics Group, Marketing"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Description (Optional)
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3.5 py-2 border border-border-default bg-bg-primary text-sm text-foreground rounded-xl outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all min-h-[80px] placeholder:text-text-muted resize-none"
              placeholder="What does this team focus on?"
            />
          </div>

          {/* Team Lead */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Team Lead / Manager
            </label>
            <select
              value={managerId}
              required
              onChange={(e) => setManagerId(e.target.value)}
              className="w-full px-3.5 py-2 border border-border-default bg-bg-primary text-sm text-foreground rounded-xl outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all cursor-pointer"
            >
              <option value="">Select a Manager...</option>
              {members.map((m) => (
                <option key={m.uid} value={m.uid}>
                  {m.fullName || m.username} ({m.designation || 'Member'})
                </option>
              ))}
            </select>
          </div>

          {/* Members Checklist */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Squad Members
            </label>
            <div className="border border-border-default bg-bg-primary rounded-xl p-3 max-h-[160px] overflow-y-auto space-y-2.5">
              {members.map((m) => {
                const initials = avatarInitials(m.fullName || m.username || '?');
                const hue = avatarHue(m.uid);
                return (
                  <label key={m.uid} className="flex items-center justify-between cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={memberIds.includes(m.uid)}
                        onChange={(e) => handleCheckboxChange(m.uid, e.target.checked)}
                        className="rounded border-border-default bg-surface text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                      />
                      {m.photoURL ? (
                        <img
                          src={m.photoURL}
                          alt={m.fullName}
                          className="h-7 w-7 rounded-lg object-cover shrink-0 shadow-sm border border-white/10 dark:border-black/20"
                        />
                      ) : (
                        <div
                          className="h-7 w-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
                          style={{ background: `hsl(${hue} 60% 45%)` }}
                        >
                          {initials}
                        </div>
                      )}
                      <div className="leading-tight">
                        <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                          {m.fullName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">@{m.username}</p>
                      </div>
                    </div>
                    {m.designation && (
                      <span className="text-[9px] font-medium bg-accent/35 text-muted-foreground px-2 py-0.5 rounded border border-border-default/45">
                        {m.designation}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-border-default shrink-0 font-medium">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-border-default hover:bg-accent/40 rounded-xl text-xs font-semibold text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-2"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {editingTeam ? 'Save Changes' : 'Create Squad'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// MemberProfileDrawer is now imported from '../../components/MemberProfileDrawer'

// ─── People Page ──────────────────────────────────────────────────────────────

type FilterRole = 'all' | UserRole;

export function PeoplePage() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const members = useOrgMembers(orgId);
  const { teams, loading: teamsLoading } = useTeams(orgId);
  const { tasks } = useTasks(orgId);

  const [activeTab, setActiveTab] = React.useState<'people' | 'teams'>('people');
  const [selectedMember, setSelectedMember] = React.useState<UserProfile | null>(null);
  const [orgName, setOrgName] = React.useState('');
  
  // Search states
  const [search, setSearch] = React.useState('');
  const [teamSearch, setTeamSearch] = React.useState('');
  
  // Filter states
  const [roleFilter, setRoleFilter] = React.useState<FilterRole>('all');
  
  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = React.useState(false);
  const [editingTeam, setEditingTeam] = React.useState<Team | null>(null);

  const canInvite = userProfile?.role === 'owner' || userProfile?.role === 'admin';
  const isAdminOrOwner = userProfile?.role === 'owner' || userProfile?.role === 'admin';

  const hasAccess = React.useCallback((memberUid: string) => {
    if (!userProfile) return false;
    
    // 1. Owner and Admin can see everyone
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    
    // 2. Can see own profile
    if (userProfile.uid === memberUid) return true;
    
    // 3. Manager can see members of their own squad
    const isManagerForThisUser = teams.some(t => 
      t.managerId === userProfile.uid && t.memberIds?.includes(memberUid)
    );
    
    return isManagerForThisUser;
  }, [userProfile, teams]);

  React.useEffect(() => {
    if (!orgId) return;
    getOrgById(orgId).then((org) => { if (org) setOrgName(org.name); });
  }, [orgId]);

  // Sort: owner → admin → manager → member, then alpha
  const sorted = React.useMemo(() => {
    const order: Record<UserRole, number> = { owner: 0, admin: 1, manager: 2, member: 3 };
    return [...members].sort((a, b) => {
      const ro = (order[a.role] ?? 3) - (order[b.role] ?? 3);
      if (ro !== 0) return ro;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
  }, [members]);

  const filtered = React.useMemo(() => {
    let list = sorted;
    if (roleFilter !== 'all') list = list.filter((m) => m.role === roleFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) =>
          m.fullName?.toLowerCase().includes(q) ||
          m.username?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.designation?.toLowerCase().includes(q) ||
          m.employeeId?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [sorted, search, roleFilter]);

  const counts = React.useMemo(() => ({
    all: members.length,
    owner: members.filter((m) => m.role === 'owner').length,
    admin: members.filter((m) => m.role === 'admin').length,
    member: members.filter((m) => m.role === 'member').length,
  }), [members]);

  const filteredTeams = React.useMemo(() => {
    if (!teams) return [];
    if (!teamSearch.trim()) return teams;
    const q = teamSearch.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
    );
  }, [teams, teamSearch]);

  const handleDeleteTeamClick = async (teamId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the team "${name}"?`)) return;
    try {
      await deleteTeam(teamId);
    } catch (err) {
      console.error('Failed to delete team', err);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 sm:px-8 sm:pt-8 pb-3 border-b border-border-default shrink-0 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              People & Org
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {activeTab === 'people' 
                ? `${members.length} members in ${orgName || 'your organization'}`
                : `${teams.length} functional teams / squads configured`
              }
            </p>
          </div>

          {/* Search & Actions (Dynamic based on tab) */}
          {activeTab === 'people' ? (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <input
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-default bg-bg-primary text-sm text-foreground placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  placeholder="Search directory…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              {canInvite && (
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                >
                  <UserPlus className="h-4 w-4" />
                  Invite
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                <input
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-border-default bg-bg-primary text-sm text-foreground placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  placeholder="Search squads…"
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                />
              </div>
              
              {isAdminOrOwner && (
                <button
                  onClick={() => {
                    setEditingTeam(null);
                    setIsTeamModalOpen(true);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
                >
                  <Plus className="h-4 w-4" />
                  Create Squad
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 text-sm font-semibold pt-1 border-t border-border-default/20">
          <button
            onClick={() => setActiveTab('people')}
            className={`pb-2.5 px-0.5 border-b-2 transition-all relative ${
              activeTab === 'people'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Members Directory
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`pb-2.5 px-0.5 border-b-2 transition-all relative flex items-center gap-1.5 ${
              activeTab === 'teams'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Teams & Squads
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
              activeTab === 'teams' ? 'bg-primary text-primary-foreground' : 'bg-accent/40 text-muted-foreground'
            }`}>
              {teams.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
        
        {/* TAB 1: MEMBERS DIRECTORY */}
        {activeTab === 'people' && (
          <div className="space-y-5 h-full flex flex-col">
            {/* Role Filter tabs inside Directory body */}
            <div className="flex items-center gap-1 shrink-0">
              <SlidersHorizontal className="h-3.5 w-3.5 text-text-muted mr-1" />
              {([
                { id: 'all', label: 'All' },
                { id: 'owner', label: 'Owners' },
                { id: 'admin', label: 'Admins' },
                { id: 'member', label: 'Members' },
              ] as { id: FilterRole; label: string }[]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setRoleFilter(id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all
                    ${roleFilter === id
                      ? 'bg-primary/15 text-primary border border-primary/20'
                      : 'text-muted-foreground hover:text-foreground hover:bg-bg-tertiary border border-transparent'
                    }`}
                >
                  {label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                    ${roleFilter === id ? 'bg-primary text-primary-foreground' : 'bg-bg-tertiary text-muted-foreground'}`}>
                    {counts[id]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pt-2">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <Users className="h-12 w-12 text-text-muted mb-4" />
                  <p className="text-base font-semibold text-foreground">No members found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {search ? `No results for "${search}"` : 'No members match the selected filter.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filtered.map((member) => {
                    const accessible = hasAccess(member.uid);
                    return (
                      <MemberCard
                        key={member.uid}
                        member={member}
                        isSelf={member.uid === userProfile?.uid}
                        onClick={accessible ? () => setSelectedMember(member) : undefined}
                        hasAccess={accessible}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: TEAMS & SQUADS */}
        {activeTab === 'teams' && (
          <div className="h-full">
            {teamsLoading ? (
              <div className="flex items-center justify-center py-24 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-semibold">Loading Teams...</span>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <Workflow className="h-12 w-12 text-text-muted mb-4" />
                <p className="text-base font-semibold text-foreground">No squads found</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                  {teamSearch 
                    ? `No squads matching "${teamSearch}"` 
                    : 'There are no functional teams configured. Let\'s create one to group members and assign managers.'
                  }
                </p>
                {isAdminOrOwner && !teamSearch && (
                  <button
                    onClick={() => {
                      setEditingTeam(null);
                      setIsTeamModalOpen(true);
                    }}
                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm"
                  >
                    <Plus className="h-4.5 w-4.5" />
                    Create First Squad
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTeams.map((t) => {
                  const manager = members.find((m) => m.uid === t.managerId);
                  const squadMembers = members.filter((m) => t.memberIds?.includes(m.uid));
                  
                  const managerHue = manager ? avatarHue(manager.uid) : 0;
                  const managerInitials = manager ? avatarInitials(manager.fullName || manager.username || '?') : '?';

                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex flex-col rounded-2xl border border-border-default/60 bg-surface shadow-sm overflow-hidden hover:shadow-xl hover:shadow-black/10 hover:border-border-default transition-all duration-200"
                    >
                      {/* Top Team Header */}
                      <div className="p-4 sm:p-5 border-b border-border-default/40 bg-accent/10 flex items-start justify-between gap-4">
                        <div>
                          <h3 className="text-sm font-bold text-foreground tracking-wide">{t.name}</h3>
                          {t.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                              {t.description}
                            </p>
                          )}
                        </div>
                        {isAdminOrOwner && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingTeam(t);
                                setIsTeamModalOpen(true);
                              }}
                              title="Edit Squad"
                              className="p-1 rounded-lg hover:bg-accent/40 text-muted-foreground hover:text-primary transition-all"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeamClick(t.id, t.name)}
                              title="Delete Squad"
                              className="p-1 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Content Card Body */}
                      <div className="p-4 sm:p-5 flex-1 flex flex-col gap-4">
                        
                        {/* Designated Manager */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1">
                            <Shield className="h-3 w-3 text-amber-500" /> Team Lead / Manager
                          </span>
                          
                          {manager ? (
                            <div className="flex items-center gap-3 p-2.5 rounded-xl border border-amber-500/15 bg-amber-500/5 shadow-sm">
                              {manager.photoURL ? (
                                <img
                                  src={manager.photoURL}
                                  alt={manager.fullName}
                                  className="h-9 w-9 rounded-lg object-cover shrink-0 shadow-md border border-white/10 dark:border-black/20"
                                />
                              ) : (
                                <div
                                  className="h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-md"
                                  style={{ background: `hsl(${managerHue} 60% 45%)` }}
                                >
                                  {managerInitials}
                                </div>
                              )}
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-foreground truncate">{manager.fullName}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {manager.designation || 'Squad Lead'} • @{manager.username}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-medium">
                              <AlertCircle className="h-4 w-4 shrink-0" />
                              <span>No manager assigned</span>
                            </div>
                          )}
                        </div>

                        {/* Members section */}
                        <div className="space-y-2 flex-1 flex flex-col">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1 shrink-0">
                            <Users className="h-3 w-3 text-sky-500" /> Squad Members ({squadMembers.length})
                          </span>

                          <div className="flex-1 overflow-y-auto max-h-[140px] pr-1 space-y-1.5 scrollbar-thin">
                            {squadMembers.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground italic py-3 text-center">
                                No members assigned to this squad yet.
                              </p>
                            ) : (
                              squadMembers.map((m) => {
                                const subHue = avatarHue(m.uid);
                                const subInit = avatarInitials(m.fullName || m.username || '?');
                                const accessible = hasAccess(m.uid);
                                return (
                                  <div
                                    key={m.uid}
                                    onClick={accessible ? () => setSelectedMember(m) : undefined}
                                    className={`flex items-center gap-2.5 py-1 px-1.5 rounded-lg transition-all ${
                                      accessible
                                        ? 'hover:bg-primary/10 hover:text-primary cursor-pointer'
                                        : 'hover:bg-accent/20 cursor-default'
                                    }`}
                                  >
                                    {m.photoURL ? (
                                      <img
                                        src={m.photoURL}
                                        alt={m.fullName}
                                        className="h-6 w-6 rounded-md object-cover shrink-0 shadow-sm border border-white/10 dark:border-black/20"
                                      />
                                    ) : (
                                      <div
                                        className="h-6 w-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0 shadow-sm"
                                        style={{ background: `hsl(${subHue} 60% 45%)` }}
                                      >
                                        {subInit}
                                      </div>
                                    )}
                                    <div className="overflow-hidden flex-1 leading-none">
                                      <p className="text-xs font-semibold text-foreground truncate">{m.fullName}</p>
                                      <p className="text-[9px] text-muted-foreground truncate mt-0.5">@{m.username}</p>
                                    </div>
                                    {m.designation && (
                                      <span className="text-[9px] text-muted-foreground shrink-0 truncate max-w-[100px] border border-border-default/45 px-1.5 py-0.5 rounded bg-accent/15">
                                        {m.designation}
                                      </span>
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

      </div>

      {/* Invite Modal */}
      {orgId && userProfile && (
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          orgId={orgId}
          userId={userProfile.uid}
        />
      )}

      {/* Team Form Modal */}
      {orgId && (
        <TeamFormModal
          isOpen={isTeamModalOpen}
          onClose={() => {
            setIsTeamModalOpen(false);
            setEditingTeam(null);
          }}
          orgId={orgId}
          members={members}
          editingTeam={editingTeam}
        />
      )}

      {/* Member Profile Drawer */}
      <AnimatePresence>
        {selectedMember && (
          <MemberProfileDrawer
            isOpen={!!selectedMember}
            member={selectedMember}
            onClose={() => setSelectedMember(null)}
            tasks={tasks}
            teams={teams}
            members={members}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


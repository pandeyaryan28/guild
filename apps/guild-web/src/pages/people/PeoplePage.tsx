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
import { SearchableSelect } from '../../components/SearchableSelect';
import { useTeams, type Team } from '../../hooks/useTeams';
import { createTeam, updateTeam, deleteTeam } from '../../lib/teams';
import { useTasks } from '../../hooks/useTasks';
import { STATUS_CONFIG, PRIORITY_CONFIG, type Task } from '../../lib/tasks';
import { MemberProfileDrawer } from '../../components/MemberProfileDrawer';
import { cn } from '@/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLE_META: Record<UserRole, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  owner: {
    label: 'Owner',
    icon: Crown,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/25',
  },
  admin: {
    label: 'Admin',
    icon: ShieldCheck,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/25',
  },
  manager: {
    label: 'Manager',
    icon: Briefcase,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/25',
  },
  member: {
    label: 'Member',
    icon: User,
    color: 'text-sky-600 dark:text-sky-400',
    bg: 'bg-sky-500/10 border-sky-500/25',
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

function timeAgo(ts: any): string | null {
  const ms =
    typeof ts?.toMillis === 'function'
      ? ts.toMillis()
      : typeof ts === 'number'
      ? ts
      : ts instanceof Date
      ? ts.getTime()
      : null;
  if (!ms) return null;
  const diff = Date.now() - ms;
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={hasAccess ? { y: -2 } : undefined}
      transition={{ duration: 0.16 }}
      onClick={onClick}
      className={cn(
        "group relative rounded-xl border p-3 flex flex-col justify-between gap-2.5 transition-all duration-150 bg-surface/50 dark:bg-card/40 backdrop-blur-sm",
        hasAccess
          ? "border-border/60 hover:border-primary/40 hover:bg-surface/80 dark:hover:bg-card/70 hover:shadow-md cursor-pointer"
          : "border-border/40 opacity-90 cursor-default"
      )}
    >
      {/* Top row: Avatar + Name + Role/Self */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {member.photoURL ? (
            <img
              src={member.photoURL}
              alt={member.fullName}
              className="h-8 w-8 rounded-lg object-cover shrink-0 border border-border"
            />
          ) : (
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
              style={{ background: `hsl(${hue} 60% 45%)` }}
            >
              {initials}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-bold text-foreground truncate leading-tight group-hover:text-primary transition-colors">
              {member.fullName}
            </p>
            <p className="text-[10px] text-muted-foreground truncate font-medium">
              {member.designation || `@${member.username || member.email?.split('@')[0] || 'member'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {isSelf && (
            <span className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
              You
            </span>
          )}
          <span className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold border", meta.bg, meta.color)}>
            <RoleIcon className="h-2.5 w-2.5" />
            {meta.label}
          </span>
        </div>
      </div>

      {/* Meta Row: Email / Details */}
      <div className="flex items-center justify-between text-[10px] text-muted-foreground border-t border-border/40 pt-2 mt-0.5 gap-2">
        <div className="flex items-center gap-1.5 truncate">
          <Mail className="h-3 w-3 shrink-0 opacity-60" />
          <span className="truncate">{member.email}</span>
        </div>
        {timeAgo(member.createdAt) && (
          <span className="shrink-0 text-[9px] opacity-75 font-medium">{timeAgo(member.createdAt)}</span>
        )}
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
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl p-5 relative flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border/60 shrink-0">
          <h2 className="text-sm font-bold text-foreground">
            {editingTeam ? 'Edit Team & Squad' : 'Create Team & Squad'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-3.5 pt-3.5 pr-1 scrollbar-thin">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Team Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 border border-border bg-secondary/40 text-xs text-foreground rounded-xl outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground"
              placeholder="e.g. Engineering, Logistics Group, Marketing"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Description (Optional)
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3.5 py-2 border border-border bg-secondary/40 text-xs text-foreground rounded-xl outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all min-h-[70px] placeholder:text-muted-foreground resize-none"
              placeholder="What does this team focus on?"
            />
          </div>

          {/* Team Lead */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Team Lead / Manager
            </label>
            <SearchableSelect
              value={managerId}
              onChange={setManagerId}
              options={members.map((m) => ({
                value: m.uid,
                label: m.fullName || m.username,
                detail: m.designation || 'Member',
                photoURL: m.photoURL,
              }))}
              placeholder="Select a Manager..."
              triggerClassName="py-2 bg-secondary/40 border-border hover:border-primary/50 text-xs focus:ring-1 focus:ring-primary/20 text-foreground"
            />
          </div>

          {/* Members Checklist */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Squad Members
            </label>
            <div className="border border-border/60 bg-muted/20 rounded-xl p-2.5 max-h-[160px] overflow-y-auto space-y-2">
              {members.map((m) => {
                const initials = avatarInitials(m.fullName || m.username || '?');
                const hue = avatarHue(m.uid);
                return (
                  <label key={m.uid} className="flex items-center justify-between cursor-pointer group hover:bg-muted/40 p-1 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={memberIds.includes(m.uid)}
                        onChange={(e) => handleCheckboxChange(m.uid, e.target.checked)}
                        className="rounded border-border text-primary focus:ring-primary h-3.5 w-3.5 cursor-pointer"
                      />
                      {m.photoURL ? (
                        <img
                          src={m.photoURL}
                          alt={m.fullName}
                          className="h-6 w-6 rounded-md object-cover shrink-0 border border-border"
                        />
                      ) : (
                        <div
                          className="h-6 w-6 rounded-md flex items-center justify-center text-[9px] font-bold text-white shrink-0"
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
                      <span className="text-[9px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border/50">
                        {m.designation}
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-2 pt-3 border-t border-border/60 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 border border-border hover:bg-muted rounded-xl text-xs font-semibold text-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
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
    manager: members.filter((m) => m.role === 'manager').length,
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
      <div className="px-5 py-3 border-b border-border/50 bg-surface/50 dark:bg-card/40 backdrop-blur-md shrink-0 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-bold text-foreground tracking-tight flex items-center gap-2">
              <Users className="h-4.5 w-4.5 text-primary" />
              People & Org
            </h1>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'people' 
                ? `${members.length} members in ${orgName || 'organization'}`
                : `${teams.length} functional teams / squads`
              }
            </p>
          </div>

          {/* Search & Actions (Dynamic based on tab) */}
          {activeTab === 'people' ? (
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60 sm:flex-initial">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-secondary/40 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-medium"
                  placeholder="Search directory…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              
              {canInvite && (
                <button
                  onClick={() => setIsInviteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm cursor-pointer shrink-0"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-60 sm:flex-initial">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-secondary/40 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-medium"
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
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm cursor-pointer shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create Squad
                </button>
              )}
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-4 text-xs font-semibold pt-1 border-t border-border/40">
          <button
            onClick={() => setActiveTab('people')}
            className={`pb-2 px-0.5 border-b-2 transition-all relative cursor-pointer ${
              activeTab === 'people'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Members Directory
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`pb-2 px-0.5 border-b-2 transition-all relative flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'teams'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Teams & Squads
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
              activeTab === 'teams' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {teams.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5">
        
        {/* TAB 1: MEMBERS DIRECTORY */}
        {activeTab === 'people' && (
          <div className="space-y-4 h-full flex flex-col">
            {/* Role Filter tabs inside Directory body */}
            <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 scrollbar-none">
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground mr-1 shrink-0" />
              {([
                { id: 'all', label: 'All' },
                { id: 'owner', label: 'Owners' },
                { id: 'admin', label: 'Admins' },
                { id: 'manager', label: 'Managers' },
                { id: 'member', label: 'Members' },
              ] as { id: FilterRole; label: string }[]).map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setRoleFilter(id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap
                    ${roleFilter === id
                      ? 'bg-primary/15 text-primary border border-primary/25'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent'
                    }`}
                >
                  {label}
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold
                    ${roleFilter === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {counts[id]}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto pt-1">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Users className="h-10 w-10 text-muted-foreground opacity-40 mb-3" />
                  <p className="text-sm font-semibold text-foreground">No members found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search ? `No results for "${search}"` : 'No members match the selected filter.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
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
              <div className="flex items-center justify-center py-20 gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-xs font-semibold">Loading Teams...</span>
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Workflow className="h-10 w-10 text-muted-foreground opacity-40 mb-3" />
                <p className="text-sm font-semibold text-foreground">No squads found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
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
                    className="mt-4 flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Create First Squad
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredTeams.map((t) => {
                  const manager = members.find((m) => m.uid === t.managerId);
                  const squadMembers = members.filter((m) => t.memberIds?.includes(m.uid));
                  
                  const managerHue = manager ? avatarHue(manager.uid) : 0;
                  const managerInitials = manager ? avatarInitials(manager.fullName || manager.username || '?') : '?';

                  return (
                    <motion.div
                      key={t.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="group flex flex-col rounded-xl border border-border/60 bg-surface/50 dark:bg-card/40 shadow-sm overflow-hidden hover:border-border transition-all duration-200"
                    >
                      {/* Top Team Header */}
                      <div className="p-3 sm:px-4 border-b border-border/40 bg-accent/5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-xs font-bold text-foreground tracking-wide truncate">{t.name}</h3>
                          {t.description && (
                            <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                              {t.description}
                            </p>
                          )}
                        </div>
                        {isAdminOrOwner && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setEditingTeam(t);
                                setIsTeamModalOpen(true);
                              }}
                              title="Edit Squad"
                              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-primary transition-all cursor-pointer"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeamClick(t.id, t.name)}
                              title="Delete Squad"
                              className="p-1 rounded-md hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-all cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Content Card Body */}
                      <div className="p-3 sm:px-4 flex-1 flex flex-col gap-3">
                        
                        {/* Designated Manager */}
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                            <Shield className="h-3 w-3 text-amber-500" /> Team Lead / Manager
                          </span>
                          
                          {manager ? (
                            <div className="flex items-center gap-2.5 p-2 rounded-lg border border-amber-500/20 bg-amber-500/5">
                              {manager.photoURL ? (
                                <img
                                  src={manager.photoURL}
                                  alt={manager.fullName}
                                  className="h-7 w-7 rounded-md object-cover shrink-0 border border-border"
                                />
                              ) : (
                                <div
                                  className="h-7 w-7 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm"
                                  style={{ background: `hsl(${managerHue} 60% 45%)` }}
                                >
                                  {managerInitials}
                                </div>
                              )}
                              <div className="overflow-hidden">
                                <p className="text-xs font-bold text-foreground truncate">{manager.fullName}</p>
                                <p className="text-[10px] text-muted-foreground truncate font-medium">
                                  {manager.designation || 'Squad Lead'} • @{manager.username}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 p-2 rounded-lg border border-red-500/20 bg-red-500/5 text-red-500 text-xs font-medium">
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                              <span>No manager assigned</span>
                            </div>
                          )}
                        </div>

                        {/* Members section */}
                        <div className="space-y-1.5 flex-1 flex flex-col">
                          <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 shrink-0">
                            <Users className="h-3 w-3 text-sky-500" /> Squad Members ({squadMembers.length})
                          </span>

                          <div className="flex-1 overflow-y-auto max-h-[130px] pr-1 space-y-1 scrollbar-thin">
                            {squadMembers.length === 0 ? (
                              <p className="text-[10px] text-muted-foreground italic py-2 text-center">
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
                                    className={`flex items-center gap-2 py-1 px-1.5 rounded-lg transition-all ${
                                      accessible
                                        ? 'hover:bg-primary/10 hover:text-primary cursor-pointer'
                                        : 'hover:bg-muted/40 cursor-default'
                                    }`}
                                  >
                                    {m.photoURL ? (
                                      <img
                                        src={m.photoURL}
                                        alt={m.fullName}
                                        className="h-5 w-5 rounded object-cover shrink-0 border border-border"
                                      />
                                    ) : (
                                      <div
                                        className="h-5 w-5 rounded flex items-center justify-center text-[8px] font-bold text-white shrink-0"
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
                                      <span className="text-[9px] text-muted-foreground shrink-0 truncate max-w-[90px] border border-border/50 px-1 py-0.2 rounded bg-muted/30">
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


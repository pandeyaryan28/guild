import * as React from 'react';
import { motion } from 'motion/react';
import {
  Search, Crown, ShieldCheck, User, Mail,
  Briefcase, Hash, Calendar, Users, SlidersHorizontal, UserPlus
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useOrgMembers } from '../../hooks/useChat';
import { type UserProfile, type UserRole } from '../../lib/firestore';
import { getOrgById } from '../../lib/firestore';
import { InviteModal } from './InviteModal';

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

function MemberCard({ member, isSelf }: { member: UserProfile; isSelf: boolean }) {
  const meta = ROLE_META[member.role] ?? ROLE_META.member;
  const RoleIcon = meta.icon;
  const hue = avatarHue(member.uid);
  const initials = avatarInitials(member.fullName || member.username || '?');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      className="group relative rounded-2xl border border-border/40 bg-card/50 p-5 flex flex-col gap-4 hover:bg-card/80 hover:border-border/70 hover:shadow-xl hover:shadow-black/10 transition-all duration-200 cursor-default"
    >
      {/* Self indicator */}
      {isSelf && (
        <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
          You
        </span>
      )}

      {/* Avatar + name */}
      <div className="flex items-center gap-3">
        <div
          className="h-11 w-11 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0 shadow-lg"
          style={{ background: `hsl(${hue} 60% 45%)` }}
        >
          {initials}
        </div>
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
            <Briefcase className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            <span className="truncate">{member.designation}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Mail className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          <span className="truncate">{member.email}</span>
        </div>
        {member.employeeId && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Hash className="h-3 w-3 shrink-0 text-muted-foreground/50" />
            <span>ID: {member.employeeId}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <Calendar className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          <span>Joined {timeAgo(member.createdAt)}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── People Page ──────────────────────────────────────────────────────────────

type FilterRole = 'all' | UserRole;

export function PeoplePage() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const members = useOrgMembers(orgId);
  const [orgName, setOrgName] = React.useState('');
  const [search, setSearch] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<FilterRole>('all');
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);

  const canInvite = userProfile?.role === 'owner' || userProfile?.role === 'admin';

  React.useEffect(() => {
    if (!orgId) return;
    getOrgById(orgId).then((org) => { if (org) setOrgName(org.name); });
  }, [orgId]);

  // Sort: owner → admin → member, then alpha
  const sorted = React.useMemo(() => {
    const order: Record<UserRole, number> = { owner: 0, admin: 1, member: 2 };
    return [...members].sort((a, b) => {
      const ro = (order[a.role] ?? 2) - (order[b.role] ?? 2);
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

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border/20 shrink-0">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              People
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {members.length} {members.length === 1 ? 'member' : 'members'} in {orgName || 'your organization'}
            </p>
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-border/50 bg-background/50 text-sm text-foreground placeholder:text-muted-foreground/40 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                placeholder="Search name, role, ID…"
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
        </div>

        {/* Role Filter Tabs */}
        <div className="flex items-center gap-1 mt-5">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground/40 mr-1" />
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
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/20 border border-transparent'
                }`}
            >
              {label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                ${roleFilter === id ? 'bg-primary text-primary-foreground' : 'bg-muted/40 text-muted-foreground'}`}>
                {counts[id]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Users className="h-12 w-12 text-muted-foreground/15 mb-4" />
            <p className="text-base font-semibold text-foreground">No members found</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search ? `No results for "${search}"` : 'No members match the selected filter.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((member) => (
              <MemberCard
                key={member.uid}
                member={member}
                isSelf={member.uid === userProfile?.uid}
              />
            ))}
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
    </div>
  );
}

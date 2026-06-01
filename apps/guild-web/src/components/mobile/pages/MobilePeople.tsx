import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Crown, ShieldCheck, User, Mail,
  Briefcase, Hash, Calendar, Users, SlidersHorizontal, UserPlus,
  Plus, Trash2, Edit3, X, AlertCircle, Loader2, Workflow, Shield
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useOrgMembers } from '../../../hooks/useChat';
import { type UserProfile, type UserRole } from '../../../lib/firestore';
import { InviteModal } from '../../../pages/people/InviteModal';
import { useTeams, type Team } from '../../../hooks/useTeams';
import { createTeam, updateTeam, deleteTeam } from '../../../lib/teams';
import { useTasks } from '../../../hooks/useTasks';
import { MemberProfileDrawer, avatarInitials, avatarHue } from '../../MemberProfileDrawer';
import { cn } from '@/lib/utils';

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

export function MobilePeople() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const members = useOrgMembers(orgId);
  const { teams, loading: teamsLoading } = useTeams(orgId);
  const { tasks } = useTasks(orgId);

  const [activeTab, setActiveTab] = React.useState<'people' | 'teams'>('people');
  const [selectedMember, setSelectedMember] = React.useState<UserProfile | null>(null);
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState<'all' | UserRole>('all');

  // Modals trigger
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = React.useState(false);
  const [editingTeam, setEditingTeam] = React.useState<Team | null>(null);

  // Form states for Squad creation bottom sheet
  const [teamName, setTeamName] = React.useState('');
  const [teamDesc, setTeamDesc] = React.useState('');
  const [managerId, setManagerId] = React.useState('');
  const [selectedMembers, setSelectedMembers] = React.useState<string[]>([]);
  const [submittingSquad, setSubmittingSquad] = React.useState(false);
  const [squadError, setSquadError] = React.useState('');

  const isAdminOrOwner = userProfile?.role === 'owner' || userProfile?.role === 'admin';
  const canInvite = userProfile?.role === 'owner' || userProfile?.role === 'admin';

  React.useEffect(() => {
    if (editingTeam) {
      setTeamName(editingTeam.name);
      setTeamDesc(editingTeam.description || '');
      setManagerId(editingTeam.managerId);
      setSelectedMembers(editingTeam.memberIds || []);
    } else {
      setTeamName('');
      setTeamDesc('');
      setManagerId('');
      setSelectedMembers([]);
    }
    setSquadError('');
  }, [editingTeam, isTeamModalOpen]);

  const hasAccess = React.useCallback((memberUid: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'owner' || userProfile.role === 'admin') return true;
    if (userProfile.uid === memberUid) return true;
    return teams.some(t => t.managerId === userProfile.uid && t.memberIds?.includes(memberUid));
  }, [userProfile, teams]);

  const filteredMembers = React.useMemo(() => {
    let list = [...members];
    if (roleFilter !== 'all') list = list.filter((m) => m.role === roleFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (m) =>
          m.fullName?.toLowerCase().includes(q) ||
          m.username?.toLowerCase().includes(q) ||
          m.designation?.toLowerCase().includes(q)
      );
    }
    // Sort: owner -> admin -> manager -> member
    const order: Record<UserRole, number> = { owner: 0, admin: 1, manager: 2, member: 3 };
    return list.sort((a, b) => (order[a.role] ?? 3) - (order[b.role] ?? 3));
  }, [members, roleFilter, searchQuery]);

  const filteredTeams = React.useMemo(() => {
    if (!searchQuery.trim()) return teams;
    const q = searchQuery.toLowerCase();
    return teams.filter(t => t.name.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q));
  }, [teams, searchQuery]);

  const handleDeleteTeamClick = async (teamId: string, name: string) => {
    if (!window.confirm(`Delete the squad "${name}"?`)) return;
    try {
      await deleteTeam(teamId);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSquadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim() || !managerId || !orgId) {
      setSquadError('Squad name and Manager are required.');
      return;
    }
    setSubmittingSquad(true);
    setSquadError('');
    try {
      if (editingTeam) {
        await updateTeam(editingTeam.id, {
          name: teamName.trim(),
          description: teamDesc.trim(),
          managerId,
          memberIds: selectedMembers,
        });
      } else {
        await createTeam({
          orgId,
          name: teamName.trim(),
          description: teamDesc.trim(),
          managerId,
          memberIds: selectedMembers,
        });
      }
      setIsTeamModalOpen(false);
    } catch (err: any) {
      setSquadError(err.message || 'Squad configuration failed.');
    } finally {
      setSubmittingSquad(false);
    }
  };

  const handleMemberCheck = (uid: string, checked: boolean) => {
    if (checked) setSelectedMembers(prev => [...prev, uid]);
    else setSelectedMembers(prev => prev.filter(id => id !== uid));
  };

  return (
    <div className="flex flex-col space-y-5 animate-fluid-pop pb-6">
      
      {/* 1. Directory Search and Invite header */}
      <div className="aether-glass p-4 bg-white/2 border border-white/5 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder={activeTab === 'people' ? "Search directory..." : "Search squads..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-xl pl-9 pr-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground font-bold focus:outline-none focus:border-primary/50"
            />
          </div>

          {activeTab === 'people' && canInvite && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-white text-xs font-black tracking-widest cursor-pointer shadow-md hover:bg-primary/95 active:scale-95"
            >
              <UserPlus className="w-4 h-4 stroke-[2]" />
              <span>INVITE</span>
            </button>
          )}

          {activeTab === 'teams' && isAdminOrOwner && (
            <button
              onClick={() => {
                setEditingTeam(null);
                setIsTeamModalOpen(true);
              }}
              className="flex items-center gap-1.5 h-10 px-4 rounded-xl bg-primary text-white text-xs font-black tracking-widest cursor-pointer shadow-md hover:bg-primary/95 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2]" />
              <span>SQUAD</span>
            </button>
          )}
        </div>

        {/* Tab switchers */}
        <div className="aether-glass p-1 flex bg-white/2 border border-white/5 shadow-inner" style={{ borderRadius: '14px' }}>
          {[
            { id: 'people', label: `Directory (${members.length})` },
            { id: 'teams', label: `Squads (${teams.length})` }
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as any);
                  setSearchQuery('');
                }}
                className={cn(
                  "relative flex-1 py-1.5 text-center text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer",
                  isActive ? "text-white" : "text-muted-foreground"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="peopleActiveTab"
                    className="absolute inset-0 bg-primary rounded-xl shadow-lg z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Content view streams */}
      <div className="space-y-4">
        
        {/* PEOPLE TAB */}
        {activeTab === 'people' && (
          <div className="space-y-4">
            
            {/* Filter tags bar */}
            <div className="flex gap-1 overflow-x-auto pr-1 pb-1 scrollbar-hide">
              {(['all', 'owner', 'admin', 'manager', 'member'] as const).map((r) => {
                const isSel = roleFilter === r;
                return (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-wider cursor-pointer capitalize shrink-0 select-none",
                      isSel ? "border-primary bg-primary/10 text-primary" : "border-white/5 bg-white/2 text-muted-foreground"
                    )}
                  >
                    {r}s
                  </button>
                );
              })}
            </div>

            {/* List */}
            {filteredMembers.length === 0 ? (
              <div className="aether-glass p-8 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-xl">
                <span className="text-xs font-bold text-foreground">No teammates match search</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMembers.map((member) => {
                  const initials = avatarInitials(member.fullName || '?');
                  const roleMeta = ROLE_META[member.role] || ROLE_META.member;
                  const isSelf = member.uid === userProfile?.uid;
                  const accessible = hasAccess(member.uid);

                  return (
                    <div
                      key={member.uid}
                      onClick={accessible ? () => setSelectedMember(member) : undefined}
                      className={cn(
                        "aether-glass p-3.5 bg-white/2 border border-white/5 flex items-center justify-between shadow-xs relative overflow-hidden",
                        accessible ? "active:scale-98 transition-all cursor-pointer hover:border-primary/20" : "opacity-75 cursor-default"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {member.photoURL ? (
                          <img
                            src={member.photoURL}
                            alt={member.fullName}
                            className="h-10 w-10 rounded-xl object-cover shrink-0 border border-white/10"
                          />
                        ) : (
                          <div
                            className="h-10 w-10 rounded-xl flex items-center justify-center font-bold text-[10px] text-white shrink-0 shadow-md"
                            style={{ background: `hsl(${avatarHue(member.uid)} 55% 45%)` }}
                          >
                            {initials}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black text-foreground block truncate">{member.fullName}</span>
                            {isSelf && (
                              <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.2 rounded border border-primary/20 bg-primary/5 text-primary shrink-0 leading-none">
                                You
                              </span>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground block truncate mt-0.5 font-bold">
                            {member.designation || 'Active Member'}
                          </span>
                        </div>
                      </div>

                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-widest leading-none shrink-0", roleMeta.bg, roleMeta.color)}>
                        {roleMeta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SQUADS TAB */}
        {activeTab === 'teams' && (
          <div className="space-y-4">
            {teamsLoading ? (
              <div className="flex py-10 justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : filteredTeams.length === 0 ? (
              <div className="aether-glass p-8 text-center bg-white/[0.01] border border-dashed border-white/5 rounded-xl">
                <span className="text-xs font-bold text-foreground">No squads configured</span>
              </div>
            ) : (
              <div className="space-y-3.5">
                {filteredTeams.map((team) => {
                  const manager = members.find((m) => m.uid === team.managerId);
                  const squadMembers = members.filter((m) => team.memberIds?.includes(m.uid));

                  return (
                    <div key={team.id} className="aether-glass p-4 bg-white/2 border border-white/5 space-y-3.5 shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-xs font-black text-foreground block truncate leading-tight">{team.name}</span>
                          {team.description && (
                            <p className="text-[9px] text-muted-foreground mt-1 font-semibold leading-relaxed line-clamp-2">
                              {team.description}
                            </p>
                          )}
                        </div>

                        {isAdminOrOwner && (
                          <div className="flex gap-1.5 shrink-0 ml-2">
                            <button
                              onClick={() => {
                                setEditingTeam(team);
                                setIsTeamModalOpen(true);
                              }}
                              className="h-7 w-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-muted-foreground cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteTeamClick(team.id, team.name)}
                              className="h-7 w-7 rounded-lg bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Lead card */}
                      <div className="p-2.5 rounded-xl bg-white/[0.01] border border-white/5 space-y-1">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>Squad Lead / Lead manager</span>
                        </span>
                        {manager ? (
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[8px]" style={{ background: `hsl(${avatarHue(manager.uid)} 55% 45%)` }}>
                              {avatarInitials(manager.fullName || '?')}
                            </div>
                            <span className="text-[10px] font-bold text-foreground">{manager.fullName}</span>
                          </div>
                        ) : (
                          <span className="text-[9px] text-red-400 font-bold block">No lead manager assigned.</span>
                        )}
                      </div>

                      {/* Members horizontal block */}
                      <div className="space-y-1.5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60 block">
                          Squad Teammates ({squadMembers.length})
                        </span>
                        <div className="flex items-center -space-x-1.5 overflow-hidden">
                          {squadMembers.slice(0, 8).map((m) => (
                            <div
                              key={m.uid}
                              className="w-5.5 h-5.5 rounded-full flex items-center justify-center font-bold text-white text-[7px] ring-2 ring-surface border border-white/10 shrink-0"
                              style={{ background: `hsl(${avatarHue(m.uid)} 55% 45%)` }}
                              title={m.fullName}
                            >
                              {avatarInitials(m.fullName || '?')}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {isInviteModalOpen && orgId && (
        <InviteModal 
          isOpen={isInviteModalOpen} 
          onClose={() => setIsInviteModalOpen(false)} 
          orgId={orgId} 
          userId={userProfile?.uid || ''}
        />
      )}

      {/* Profile Details Popover Drawer */}
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

      {/* sliding drawer bottom sheet for Squad Config */}
      <AnimatePresence>
        {isTeamModalOpen && orgId && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 backdrop-blur-xs">
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="w-full max-h-[92vh] aether-glass rounded-t-[32px] border-x-0 border-b-0 border-t border-white/10 px-6 pb-6 pt-3 flex flex-col bg-surface/98 backdrop-blur-3xl overflow-hidden"
            >
              <div className="w-10 h-1.5 rounded-full bg-white/10 mx-auto mb-4 shrink-0" />
              <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
                <span className="text-xs font-black text-foreground flex items-center gap-2">
                  <Workflow className="w-4.5 h-4.5 text-primary" />
                  <span>{editingTeam ? 'EDIT SQUAD CONFIGURATION' : 'CREATE NEW FUNCTIONAL SQUAD'}</span>
                </span>
                <button onClick={() => setIsTeamModalOpen(false)} className="h-7 w-7 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground cursor-pointer active:scale-90">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSquadSubmit} className="flex-1 overflow-y-auto aether-scroll py-4 space-y-4 pr-1">
                {squadError && <span className="text-xs text-red-400 font-bold block bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{squadError}</span>}

                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">SQUAD NAME</span>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Frontend Core, logistics group"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/5 bg-white/2 text-xs text-foreground placeholder:text-muted-foreground outline-none font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">LEAD SQUAD MANAGER</span>
                  <select
                    value={managerId}
                    required
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-white/5 bg-white/2 text-xs text-foreground outline-none cursor-pointer [color-scheme:dark] font-bold"
                  >
                    <option value="" className="bg-surface text-foreground font-bold">Select lead lead...</option>
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid} className="bg-surface text-foreground font-bold">
                        {m.fullName} ({m.designation || 'Teammate'})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">SQUAD DESCRIPTION</span>
                  <textarea
                    rows={2}
                    placeholder="Brief group charter description..."
                    value={teamDesc}
                    onChange={(e) => setTeamDesc(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-white/5 bg-white/2 text-xs text-foreground placeholder:text-muted-foreground outline-none font-bold resize-none"
                  />
                </div>

                {/* Checklist members */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest block">Squad members</span>
                  <div className="border border-white/5 bg-white/2 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2.5 aether-scroll">
                    {members.map((m) => (
                      <label key={m.uid} className="flex items-center gap-3 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(m.uid)}
                          onChange={(e) => handleMemberCheck(m.uid, e.target.checked)}
                          className="rounded border-white/10 bg-white/5 text-primary focus:ring-0 h-4 w-4 cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-foreground truncate">{m.fullName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </form>

              <div className="pt-3 border-t border-white/5 flex gap-3 shrink-0">
                <button onClick={() => setIsTeamModalOpen(false)} className="flex-1 py-3 text-xs font-black text-muted-foreground rounded-xl border border-white/5 cursor-pointer bg-white/2">
                  CANCEL
                </button>
                <button
                  onClick={handleSquadSubmit}
                  disabled={submittingSquad}
                  className="flex-1 py-3 text-xs font-black text-white bg-primary rounded-xl active:scale-95 transition-all shadow-md cursor-pointer flex items-center justify-center"
                >
                  {submittingSquad ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTeam ? 'SAVE CHANGES' : 'CREATE SQUAD'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
export default MobilePeople;

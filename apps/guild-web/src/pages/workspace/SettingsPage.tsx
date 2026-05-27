import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Bell, Paintbrush, Users, Link2, Building2,
  Check, Loader2, ShieldAlert, Trash2, Crown, ShieldCheck,
  UserMinus, Copy, AlertCircle, Info,
  Plus, Workflow, MessageSquare, AtSign, CheckSquare, MessagesSquare, UserPlus
} from 'lucide-react';
import { createTeam, updateTeam, deleteTeam } from '../../lib/teams';
import { useTeams } from '../../hooks/useTeams';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { THEMES } from '../../lib/themes';
import {
  updateUserProfile,
  updateUserRole,
  removeUserFromOrg,
  updateOrganizationDetails,
  deleteOrganization,
  revokeInviteLink,
  transferOrgOwnership,
  checkUsernameUnique,
  checkOrgSlugUnique,
  deleteUserProfile
} from '../../lib/firestore';
import { useOrgMembers } from '../../hooks/useChat';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { InviteLink, UserProfile, Organization } from '@guild/types';
import { InviteModal } from '../people/InviteModal';
import { cn } from '@/lib/utils';

// ─── Invite Links Hook ────────────────────────────────────────────────────────
function useInviteLinks(orgId: string | undefined) {
  const [links, setLinks] = React.useState<InviteLink[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!orgId) return;
    const q = query(collection(db, 'inviteLinks'), where('orgId', '==', orgId));
    const unsub = onSnapshot(q, (snap) => {
      setLinks(snap.docs.map((d) => d.data() as InviteLink));
      setLoading(false);
    }, (err) => {
      console.error('Failed to fetch invite links', err);
      setLoading(false);
    });
    return unsub;
  }, [orgId]);

  return { links, loading };
}

// ─── Settings Page ────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { user, userProfile, logout } = useAuth();
  const { themeId, setTheme } = useTheme();
  
  // Real-time user profile listener
  const [localProfile, setLocalProfile] = React.useState<UserProfile | null>(null);
  React.useEffect(() => {
    if (!user?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', user.uid), (snap) => {
      if (snap.exists()) {
        setLocalProfile(snap.data() as UserProfile);
      }
    });
    return unsub;
  }, [user?.uid]);

  // Real-time org listener
  const [localOrg, setLocalOrg] = React.useState<Organization | null>(null);
  React.useEffect(() => {
    if (!localProfile?.organizationId) return;
    const unsub = onSnapshot(doc(db, 'organizations', localProfile.organizationId), (snap) => {
      if (snap.exists()) {
        setLocalOrg({ ...snap.data(), id: snap.id } as Organization);
      }
    });
    return unsub;
  }, [localProfile?.organizationId]);

  const orgId = localProfile?.organizationId;
  const role = localProfile?.role ?? 'member';

  const members = useOrgMembers(orgId);
  const { links: inviteLinks, loading: invitesLoading } = useInviteLinks(orgId);

  // Tab state
  const [activeTab, setActiveTab] = React.useState<string>('profile');
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);

  // Dynamic Tabs definition
  const tabs = React.useMemo(() => {
    const list = [
      { id: 'profile', label: 'My Profile', icon: User, allowed: ['member', 'admin', 'owner'], group: 'personal' },
      { id: 'notifications', label: 'Notifications', icon: Bell, allowed: ['member', 'admin', 'owner'], group: 'personal' },
      { id: 'appearance', label: 'Appearance', icon: Paintbrush, allowed: ['member', 'admin', 'owner'], group: 'personal' },
      { id: 'members', label: 'Workspace Members', icon: Users, allowed: ['admin', 'owner'], group: 'workspace' },
      { id: 'teams', label: 'Teams & Org', icon: Workflow, allowed: ['admin', 'owner'], group: 'workspace' },
      { id: 'invites', label: 'Invite Links', icon: Link2, allowed: ['admin', 'owner'], group: 'workspace' },
      { id: 'workspace', label: 'Workspace Info', icon: Building2, allowed: ['owner'], group: 'workspace' },
    ];
    return list.filter((t) => t.allowed.includes(role));
  }, [role]);

  // Ensure active tab is allowed if role changes
  React.useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab)) {
      setActiveTab('profile');
    }
  }, [tabs, activeTab]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] min-h-0 md:min-h-[600px] overflow-hidden bg-transparent w-full">
      {/* Header Overhaul */}
      <div className="px-4 md:px-8 pt-4 pb-3 border-b border-white/5 bg-transparent shrink-0">
        <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          Settings
        </h1>
      </div>

      {/* Main Split Grid Workspace */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-5 overflow-hidden px-4 md:px-8 py-2 min-h-0">
        
        {/* Navigation Sidebar (Frosted glass) */}
        <div className="w-full md:w-64 shrink-0 aether-glass bg-white/[0.01] border-white/5 p-3 md:p-4 overflow-x-auto md:overflow-y-auto scrollbar-hide aether-scroll flex flex-row md:flex-col gap-4 md:gap-5 h-auto md:h-full shrink-0">
          
          {/* Personal Group */}
          {tabs.filter(t => t.group === 'personal').length > 0 && (
            <div className="flex flex-row md:flex-col gap-2 md:gap-2 items-center md:items-stretch shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 pb-1 select-none font-heading hidden md:block">
                Personal
              </p>
              <div className="flex flex-row md:flex-col gap-1 md:space-y-1 shrink-0">
                {tabs.filter(t => t.group === 'personal').map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex w-auto md:w-full items-center gap-3 px-3 py-2 md:py-2.5 rounded-xl text-[11px] font-bold transition-all relative group select-none cursor-pointer shrink-0",
                        isActive ? "text-white" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeSettingsTabBG"
                          className="absolute inset-0 bg-accent/20 border border-accent/30 rounded-xl z-0"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          style={{ backgroundColor: 'oklch(from var(--accent) l c h / 12%)', borderColor: 'oklch(from var(--accent) l c h / 20%)' }}
                        />
                      )}
                      <TabIcon className={cn("h-4 w-4 shrink-0 z-10 transition-colors", isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} style={isActive ? { color: 'var(--accent)' } : undefined} />
                      <span className="truncate z-10 tracking-wide">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workspace Group */}
          {tabs.filter(t => t.group === 'workspace').length > 0 && (
            <div className="flex flex-row md:flex-col gap-2 md:gap-2 items-center md:items-stretch shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 pb-1 select-none font-heading hidden md:block">
                Workspace
              </p>
              <div className="flex flex-row md:flex-col gap-1 md:space-y-1 shrink-0">
                {tabs.filter(t => t.group === 'workspace').map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "flex w-auto md:w-full items-center gap-3 px-3 py-2 md:py-2.5 rounded-xl text-[11px] font-bold transition-all relative group select-none cursor-pointer shrink-0",
                        isActive ? "text-white" : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeSettingsTabBG"
                          className="absolute inset-0 bg-accent/20 border border-accent/30 rounded-xl z-0"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                          style={{ backgroundColor: 'oklch(from var(--accent) l c h / 12%)', borderColor: 'oklch(from var(--accent) l c h / 20%)' }}
                        />
                      )}
                      <TabIcon className={cn("h-4 w-4 shrink-0 z-10 transition-colors", isActive ? "text-accent" : "text-muted-foreground group-hover:text-foreground")} style={isActive ? { color: 'var(--accent)' } : undefined} />
                      <span className="truncate z-10 tracking-wide">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Tab Content Area (Frosted Canvas) */}
        <div className="flex-1 overflow-hidden aether-glass bg-white/[0.005] border-white/5 p-4 md:p-6 flex flex-col h-full">
          <div className="flex-grow overflow-y-auto aether-scroll pr-1">
            <div className="max-w-2xl mx-auto w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {activeTab === 'profile' && localProfile && (
                    <ProfileSettingsView profile={localProfile} logout={logout} />
                  )}
                  {activeTab === 'notifications' && localProfile && (
                    <NotificationSettingsView profile={localProfile} />
                  )}
                  {activeTab === 'appearance' && localProfile && (
                    <AppearanceSettingsView profile={localProfile} themeId={themeId} setTheme={setTheme} />
                  )}
                  {activeTab === 'members' && localProfile && (
                    <MembersSettingsView
                      profile={localProfile}
                      members={members}
                      onOpenInvite={() => setIsInviteModalOpen(true)}
                    />
                  )}
                  {activeTab === 'invites' && localProfile && (
                    <InviteLinksSettingsView
                      profile={localProfile}
                      inviteLinks={inviteLinks}
                      loading={invitesLoading}
                      members={members}
                    />
                  )}
                  {activeTab === 'teams' && localProfile && (
                    <TeamsSettingsView
                      profile={localProfile}
                      members={members}
                    />
                  )}
                  {activeTab === 'workspace' && localOrg && localProfile && (
                    <WorkspaceSettingsView
                      org={localOrg}
                      profile={localProfile}
                      logout={logout}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {orgId && user?.uid && (
        <InviteModal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          orgId={orgId}
          userId={user.uid}
        />
      )}
    </div>
  );
}

// ─── TAB VIEW: PROFILE SETTINGS ──────────────────────────────────────────────
interface FormError {
  fullName?: string;
  username?: string;
  age?: string;
}

function ProfileSettingsView({ profile, logout }: { profile: UserProfile; logout: () => Promise<void> }) {
  const [fullName, setFullName] = React.useState(profile.fullName || '');
  const [username, setUsername] = React.useState(profile.username || '');
  const [designation, setDesignation] = React.useState(profile.designation || '');
  const [employeeId, setEmployeeId] = React.useState(profile.employeeId || '');
  const [age, setAge] = React.useState(profile.age ? String(profile.age) : '');

  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [errors, setErrors] = React.useState<FormError>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  // Profile deletion states
  const [deletingProfile, setDeletingProfile] = React.useState(false);
  const [confirmUsername, setConfirmUsername] = React.useState('');
  const [profileDeleteError, setProfileDeleteError] = React.useState<string | null>(null);

  const handleDeleteProfile = async () => {
    if (confirmUsername !== profile.username) {
      alert('Confirmation failed. Please type your username exactly.');
      return;
    }
    setDeletingProfile(true);
    setProfileDeleteError(null);
    try {
      await deleteUserProfile(profile.uid, profile.username, profile.organizationId);
      await logout();
      window.location.href = '/signup';
    } catch (err: any) {
      console.error('Failed to delete profile', err);
      setProfileDeleteError(err.message || 'Failed to delete profile.');
      setDeletingProfile(false);
    }
  };

  // Sync profile update if edited elsewhere
  React.useEffect(() => {
    setFullName(profile.fullName || '');
    setUsername(profile.username || '');
    setDesignation(profile.designation || '');
    setEmployeeId(profile.employeeId || '');
    setAge(profile.age ? String(profile.age) : '');
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setErrors({});
    setGeneralError(null);

    const nextErrors: FormError = {};
    if (!fullName.trim()) nextErrors.fullName = 'Full Name is required';
    if (!username.trim()) nextErrors.username = 'Username is required';
    if (age && (isNaN(Number(age)) || Number(age) <= 0)) nextErrors.age = 'Age must be a valid positive number';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSaving(false);
      return;
    }

    try {
      // Validate unique username if changed
      if (username.toLowerCase() !== profile.username.toLowerCase()) {
        const isUnique = await checkUsernameUnique(username);
        if (!isUnique) {
          setErrors({ username: 'This username is already taken.' });
          setSaving(false);
          return;
        }
      }

      await updateUserProfile(profile.uid, {
        fullName: fullName.trim(),
        username: username.trim(),
        designation: designation.trim(),
        employeeId: employeeId.trim(),
        age: age ? Number(age) : 0,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setGeneralError(err.message || 'An error occurred while updating profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-sm font-bold text-foreground">My Profile</h2>
      </div>

      {generalError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] rounded-xl flex items-start gap-2 animate-fluid-pop">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      {/* Forms block */}
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl border bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-white/[0.04] transition-all font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]",
                errors.fullName ? "border-red-500/40 focus:border-red-500/40" : "border-white/10"
              )}
              placeholder="Aryan Pandey"
            />
            {errors.fullName && <p className="text-[9px] text-red-500 font-bold">{errors.fullName}</p>}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl border bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-white/[0.04] transition-all font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]",
                errors.username ? "border-red-500/40 focus:border-red-500/40" : "border-white/10"
              )}
              placeholder="aryan_p"
            />
            {errors.username && <p className="text-[9px] text-red-500 font-bold">{errors.username}</p>}
          </div>

          {/* Designation */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Designation / Role</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-white/[0.04] transition-all font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]"
              placeholder="Lead Engineer"
            />
          </div>

          {/* Employee ID */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Employee ID</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-white/[0.04] transition-all font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]"
              placeholder="G-1025"
            />
          </div>

          {/* Age */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl border bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-white/[0.04] transition-all font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]",
                errors.age ? "border-red-500/40 focus:border-red-500/40" : "border-white/10"
              )}
              placeholder="26"
            />
            {errors.age && <p className="text-[9px] text-red-500 font-bold">{errors.age}</p>}
          </div>

          {/* Email (Read-Only) */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
              Email Address <Info className="h-3 w-3 text-muted-foreground" />
            </label>
            <input
              type="email"
              disabled
              value={profile.email}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/5 bg-white/[0.005] text-xs text-muted-foreground cursor-not-allowed outline-none font-semibold"
            />
          </div>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-between gap-4">
          <span className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1.5 select-none">
            Account Privilege: <span className="font-extrabold text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-md text-[9px] uppercase tracking-wider">{profile.role}</span>
          </span>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all shadow-lg hover:shadow-accent/15 cursor-pointer text-xs"
            style={{ background: 'var(--accent)' }}
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
              </>
            ) : success ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" /> Saved!
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="aether-glass bg-red-500/[0.01] border border-red-500/20 shadow-[0_4px_24px_rgba(239,68,68,0.06),inset_0_1px_1px_rgba(255,255,255,0.02)] rounded-3xl p-6 space-y-4 relative overflow-hidden mt-8 text-left">
        {/* Crimson pulse accent glow */}
        <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full pointer-events-none opacity-[0.08] filter blur-xl bg-red-500" />
        
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h2 className="text-xs font-black text-red-500 uppercase tracking-wider">Danger Zone</h2>
            <p className="text-[10px] text-red-500/80 mt-0.5 leading-relaxed font-semibold">
              Deleting your profile is permanent. Your personal details, account settings, and workspace presence will be deleted. Your unique username will be released.
            </p>
          </div>
        </div>

        {profile.role === 'owner' ? (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
            <p className="text-[10px] text-red-500 font-bold leading-normal">
              CRITICAL: You are currently the Owner of this workspace. You cannot delete your profile until you either transfer workspace ownership to another teammate (via Workspace Members tab) or delete the workspace entirely (via Workspace Info tab).
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-w-md">
            <p className="text-[10px] text-muted-foreground font-semibold">
              To confirm profile deletion, please type your exact username <span className="font-bold text-foreground select-all">"{profile.username}"</span> below:
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-red-500/20 bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10 transition-all font-semibold"
                placeholder="Type your username"
              />
              <button
                type="button"
                onClick={handleDeleteProfile}
                disabled={deletingProfile || confirmUsername !== profile.username}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-650 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {deletingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Delete Profile
              </button>
            </div>
            {profileDeleteError && (
              <p className="text-[10px] text-red-500 font-bold mt-1.5">{profileDeleteError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── TAB VIEW: NOTIFICATIONS ────────────────────────────────────────────────
// ─── TAB VIEW: NOTIFICATIONS ────────────────────────────────────────────────
function NotificationSettingsView({ profile }: { profile: UserProfile }) {
  const [saving, setSaving] = React.useState<string | null>(null);

  // Load defaults
  const settings = React.useMemo(() => ({
    dm: profile.notificationSettings?.dm !== false,
    mention: profile.notificationSettings?.mention !== false,
    taskAssigned: profile.notificationSettings?.taskAssigned !== false,
    taskCommented: profile.notificationSettings?.taskCommented !== false,
    channelInvite: profile.notificationSettings?.channelInvite !== false,
  }), [profile.notificationSettings]);

  const handleToggle = async (key: keyof typeof settings) => {
    setSaving(key);
    try {
      const nextSettings = {
        ...settings,
        [key]: !settings[key],
      };
      await updateUserProfile(profile.uid, {
        notificationSettings: nextSettings,
      });
    } catch (err) {
      console.error('Failed to update notification settings', err);
    } finally {
      setSaving(null);
    }
  };

  const notificationOptions = [
    { key: 'dm' as const, label: 'Direct Messages', desc: 'Notify me when I receive private direct messages.', icon: MessageSquare, colors: 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400' },
    { key: 'mention' as const, label: 'Mentions & Tags', desc: 'Notify me when someone mentions me (@username) in channels.', icon: AtSign, colors: 'bg-violet-500/10 border-violet-500/20 text-violet-400' },
    { key: 'taskAssigned' as const, label: 'Tasks Assigned to Me', desc: 'Send alerts when a workspace manager assigns a task to me.', icon: CheckSquare, colors: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
    { key: 'taskCommented' as const, label: 'Task Activities & Comments', desc: 'Notify me when colleagues comment or update tasks I created or belong to.', icon: MessagesSquare, colors: 'bg-teal-500/10 border-teal-500/20 text-teal-400' },
    { key: 'channelInvite' as const, label: 'Channel Invitations', desc: 'Notify me when I am invited or added to a new communication channel.', icon: UserPlus, colors: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
  ];

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-sm font-bold text-foreground">Notification Preferences</h2>
      </div>

      <div className="space-y-3">
        {notificationOptions.map((opt) => {
          const isChecked = settings[opt.key];
          const isToggling = saving === opt.key;
          const OptIcon = opt.icon;

          return (
            <motion.div 
              key={opt.key} 
              whileHover={{ x: 2 }}
              className="p-4 flex items-center justify-between gap-6 aether-glass bg-gradient-to-r from-white/[0.015] to-transparent border-white/5 hover:border-white/10 rounded-2xl transition-all shadow-sm"
            >
              <div className="flex items-start gap-3.5 overflow-hidden">
                {/* Icon sphere */}
                <div className={cn("h-8.5 w-8.5 rounded-xl border flex items-center justify-center shrink-0 shadow-sm", opt.colors)}>
                  <OptIcon className="h-4 w-4" />
                </div>
                
                <div className="space-y-0.5 overflow-hidden">
                  <span className="text-[11px] font-extrabold text-foreground tracking-wide leading-tight">{opt.label}</span>
                  <p className="text-[10px] text-muted-foreground leading-relaxed truncate max-w-[420px] font-medium">{opt.desc}</p>
                </div>
              </div>

              {/* Bouncy Custom Switch */}
              <button
                onClick={() => handleToggle(opt.key)}
                disabled={isToggling}
                className={cn(
                  "relative inline-flex h-5.5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-all duration-300 ease-in-out outline-none shadow-md",
                  isChecked 
                    ? "bg-accent shadow-[0_0_12px_oklch(from_var(--accent)_l_c_h_/_30%)]" 
                    : "bg-white/5 hover:bg-white/10 border-white/10",
                  isToggling && "opacity-50 cursor-not-allowed"
                )}
                style={isChecked ? { backgroundColor: 'var(--accent)' } : undefined}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-4.5 w-4.5 transform rounded-full bg-white shadow-sm transition-all duration-300 ease-in-out flex items-center justify-center mt-[1px]",
                    isChecked ? "translate-x-4.5 bg-white" : "translate-x-0.5 bg-muted-foreground/60"
                  )}
                >
                  {isToggling && <Loader2 className="h-2.5 w-2.5 animate-spin text-accent" />}
                </span>
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB VIEW: APPEARANCE & THEMES ───────────────────────────────────────────
interface AppearanceProps {
  profile: UserProfile;
  themeId: string;
  setTheme: (id: any) => void;
}

function AppearanceSettingsView({ profile, themeId, setTheme }: AppearanceProps) {
  const handleThemeChange = async (id: string) => {
    setTheme(id);
    try {
      await updateUserProfile(profile.uid, { themeId: id as any });
    } catch (err) {
      console.error('Failed to update user profile theme', err);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fluid-pop">
      <div>
        <h2 className="text-sm font-bold text-foreground">Visual Theme & Appearance</h2>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {THEMES.map((theme) => {
          const isActive = themeId === theme.id;
          return (
            <motion.button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              whileHover={{ scale: 1.02, y: -4, rotateY: 2, rotateX: -2 }}
              className={cn(
                "flex flex-col text-left p-4 rounded-2xl border relative overflow-hidden group cursor-pointer transition-all duration-300 shadow-sm",
                isActive
                  ? "border-accent/40 bg-accent/[0.04] shadow-[0_4px_24px_oklch(from_var(--accent)_l_c_h_/_12%),inset_0_1px_1px_rgba(255,255,255,0.05)]"
                  : "border-white/10 bg-white/[0.015] dark:bg-white/[0.005] hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)]"
              )}
              style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
            >
              {/* Top Swatch Row */}
              <div className="flex items-center justify-between gap-3 w-full mb-3 z-10">
                <div className="flex items-center gap-1.5 relative">
                  <div
                    className="h-6 w-6 rounded-full border border-white/10 shrink-0 shadow-md relative z-10 overflow-hidden"
                    style={{ backgroundColor: theme.swatch }}
                  >
                    <span className="absolute top-0 left-0 right-0 h-[40%] bg-white/10 rounded-t-full pointer-events-none" />
                  </div>
                  <div
                    className="h-6 w-6 rounded-full border border-white/10 shrink-0 shadow-md -ml-2.5 relative z-0 overflow-hidden"
                    style={{ backgroundColor: theme.bgSwatch }}
                  >
                    <span className="absolute top-0 left-0 right-0 h-[40%] bg-white/10 rounded-t-full pointer-events-none" />
                  </div>
                </div>
                {isActive && (
                  <span className="p-1 rounded-full text-white bg-accent shadow-[0_0_12px_rgba(255,255,255,0.2)]" style={{ backgroundColor: 'var(--accent)' }}>
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>

              {/* Labels */}
              <span className="text-xs font-black text-foreground tracking-wide z-10">{theme.name}</span>
              <p className="text-[10px] text-muted-foreground mt-1.5 font-semibold leading-relaxed z-10">{theme.description}</p>
              
              {/* Orbit ambient light glow behind active card */}
              {isActive && (
                <div 
                  className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full pointer-events-none opacity-20 filter blur-xl"
                  style={{ backgroundColor: theme.swatch }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB VIEW: MEMBERS MANAGEMENT ────────────────────────────────────────────
interface MembersViewProps {
  profile: UserProfile;
  members: UserProfile[];
  onOpenInvite: () => void;
}

function MembersSettingsView({ profile, members, onOpenInvite }: MembersViewProps) {
  const [updatingId, setUpdatingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Sorting
  const sorted = React.useMemo(() => {
    const order = { owner: 0, admin: 1, member: 2 };
    return [...members].sort((a, b) => {
      const ro = (order[a.role] ?? 2) - (order[b.role] ?? 2);
      if (ro !== 0) return ro;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
  }, [members]);

  const handleRoleChange = async (targetId: string, nextRole: 'admin' | 'member') => {
    setUpdatingId(targetId);
    setError(null);
    try {
      await updateUserRole(targetId, nextRole);
    } catch (err: any) {
      setError(err.message || 'Failed to update member role.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemoveMember = async (targetId: string) => {
    if (!window.confirm('Are you absolutely sure you want to remove this member from the workspace?')) return;
    setUpdatingId(targetId);
    setError(null);
    try {
      await removeUserFromOrg(targetId);
    } catch (err: any) {
      setError(err.message || 'Failed to remove member.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTransfer = async (targetId: string, name: string) => {
    if (!window.confirm(`CRITICAL WARNING:\nYou are about to transfer complete workspace ownership to ${name}.\nThis action CANNOT be undone and will demote your account to an Admin. Do you want to proceed?`)) return;
    setUpdatingId(targetId);
    setError(null);
    try {
      await transferOrgOwnership(profile.organizationId, profile.uid, targetId);
    } catch (err: any) {
      setError(err.message || 'Failed to transfer ownership.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Workspace Members</h2>
        </div>
        <button
          onClick={onOpenInvite}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-accent text-accent-foreground rounded-xl text-xs font-bold hover:bg-accent/90 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
          style={{ background: 'var(--accent)' }}
        >
          <Plus className="h-3.5 w-3.5" /> Invite Teammate
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Redesigned Members Cards List */}
      <div className="space-y-3">
        {sorted.map((member) => {
          const isSelf = member.uid === profile.uid;
          const isOwner = member.role === 'owner';
          const isAdmin = member.role === 'admin';
          
          const canManage = profile.role === 'owner' ? !isSelf : (profile.role === 'admin' && member.role === 'member');
          const isProcessing = updatingId === member.uid;

          return (
            <motion.div
              key={member.uid}
              whileHover={{ x: 3 }}
              className="p-4 flex flex-wrap items-center justify-between gap-4 aether-glass bg-gradient-to-r from-white/[0.015] to-transparent border-white/5 hover:border-white/10 rounded-2xl transition-all shadow-sm"
            >
              {/* Left Column: Teammate profile */}
              <div className="flex items-center gap-3.5 overflow-hidden min-w-[240px] flex-1">
                {/* Teammate avatar initials badge */}
                <div className="shrink-0">
                  <div 
                    className="h-9 w-9 rounded-xl flex items-center justify-center font-black text-white text-xs relative overflow-hidden shadow-sm"
                    style={{
                      background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
                    }}
                  >
                    <span className="absolute top-0 left-0 right-0 h-[45%] bg-white/10 rounded-t-full pointer-events-none" />
                    {member.fullName ? member.fullName[0].toUpperCase() : '?'}
                  </div>
                </div>

                <div className="overflow-hidden">
                  <p className="text-xs font-black text-foreground truncate leading-tight flex items-center gap-1.5">
                    {member.fullName}
                    {isSelf && <span className="text-[8px] font-black uppercase tracking-widest bg-accent/15 border border-accent/25 text-accent px-1.5 py-0.5 rounded">You</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate mt-1.5 font-semibold">
                    @{member.username} · {member.designation || 'Teammate'}
                  </p>
                </div>
              </div>

              {/* Middle Column: Role badging */}
              <div className="flex items-center shrink-0">
                {isOwner ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-[9px] font-extrabold uppercase tracking-wider text-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.15)]">
                    <Crown className="h-3 w-3 shrink-0" /> Owner
                  </span>
                ) : isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-violet-500/20 bg-violet-500/10 text-[9px] font-extrabold uppercase tracking-wider text-violet-500 shadow-[0_0_8px_rgba(139,92,246,0.15)]">
                    <ShieldCheck className="h-3 w-3 shrink-0" /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-sky-500/20 bg-sky-500/10 text-[9px] font-extrabold uppercase tracking-wider text-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.15)]">
                    <User className="h-3 w-3 shrink-0" /> Member
                  </span>
                )}
              </div>

              {/* Right Column: Actions */}
              <div className="flex items-center gap-2 shrink-0">
                {isProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : canManage ? (
                  <div className="flex items-center gap-1.5">
                    {/* Demote Admin / Promote Member */}
                    {isAdmin ? (
                      <button
                        onClick={() => handleRoleChange(member.uid, 'member')}
                        className="px-2.5 py-1.5 border border-white/10 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-extrabold text-foreground transition-all cursor-pointer shadow-sm"
                        title="Demote to standard Member"
                      >
                        Demote
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRoleChange(member.uid, 'admin')}
                        className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-750 text-white rounded-xl text-[9px] font-extrabold transition-all cursor-pointer shadow-md"
                        title="Promote to Workspace Admin"
                      >
                        Promote Admin
                      </button>
                    )}

                    {/* Transfer Ownership (Owner Only) */}
                    {profile.role === 'owner' && !isOwner && (
                      <button
                        onClick={() => handleTransfer(member.uid, member.fullName)}
                        className="px-2.5 py-1.5 border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/15 text-amber-500 rounded-xl text-[9px] font-extrabold transition-all cursor-pointer shadow-sm"
                        title="Transfer Ownership"
                      >
                        Transfer Owner
                      </button>
                    )}

                    {/* Remove from workspace */}
                    <button
                      onClick={() => handleRemoveMember(member.uid)}
                      className="p-2 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-500/20"
                      title="Remove from Workspace"
                    >
                      <UserMinus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic select-none px-2">—</span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── TAB VIEW: INVITE LINKS ──────────────────────────────────────────────────
interface InviteLinksProps {
  profile: UserProfile;
  inviteLinks: InviteLink[];
  loading: boolean;
  members: UserProfile[];
}

function InviteLinksSettingsView({ inviteLinks, loading, members }: InviteLinksProps) {
  const [revoking, setRevoking] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/join/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (token: string) => {
    if (!window.confirm('Are you sure you want to revoke and delete this single-use invite link?')) return;
    setRevoking(token);
    try {
      await revokeInviteLink(token);
    } catch (err) {
      console.error('Failed to revoke invite link', err);
    } finally {
      setRevoking(null);
    }
  };

  // Find creator name
  const getCreatorName = (uid: string) => {
    const found = members.find((m) => m.uid === uid);
    return found ? found.fullName : 'Teammate';
  };

  return (
    <div className="space-y-6 text-left animate-fluid-pop">
      <div>
        <h2 className="text-sm font-bold text-foreground">Invite Links</h2>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span className="text-xs font-bold">Synchronizing links…</span>
        </div>
      ) : inviteLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
          <Link2 className="h-7 w-7 text-muted-foreground opacity-50 mb-2" />
          <p className="text-xs font-bold text-foreground">No active invite tokens</p>
          <p className="text-[10px] text-muted-foreground mt-1 max-w-[240px] leading-relaxed font-semibold">
            Generate invite tokens on the Teammates directory or from the Members tab
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inviteLinks.map((link) => {
            const now = Date.now();
            const isExpired = link.expiresAt.toMillis() < now;
            const isActive = !link.used && !isExpired;
            const isRevoking = revoking === link.token;

            return (
              <motion.div
                key={link.token}
                whileHover={{ y: -2 }}
                className="p-4 flex flex-col justify-between gap-4 aether-glass bg-gradient-to-br from-white/[0.015] to-transparent border-white/5 hover:border-white/10 rounded-2xl transition-all shadow-sm relative overflow-hidden"
              >
                <div className="space-y-3.5 z-10">
                  <div className="flex items-center justify-between gap-2 w-full">
                    {/* Status Badge */}
                    {link.used ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded border border-white/5 bg-white/5 text-[8px] font-black uppercase tracking-wider text-muted-foreground">Used</span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded border border-red-500/10 bg-red-500/10 text-[8px] font-black uppercase tracking-wider text-red-400">Expired</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded border border-emerald-500/15 bg-emerald-500/10 text-[8px] font-black uppercase tracking-wider text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]">Active</span>
                    )}

                    {/* Actions */}
                    {isRevoking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    ) : (
                      <button
                        onClick={() => handleRevoke(link.token)}
                        className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-500/10"
                        title="Delete link"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Token link box */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-white/5 bg-white/[0.01] shadow-inner w-full overflow-hidden">
                    <span className="text-[11px] font-mono text-foreground font-semibold truncate flex-1">/join/{link.token}</span>
                    {isActive && (
                      <button
                        onClick={() => handleCopy(link.token)}
                        className="p-1.5 hover:bg-white/10 text-accent rounded-lg transition-all"
                        title="Copy link"
                      >
                        {copiedId === link.token ? <Check className="h-3.5 w-3.5 text-emerald-400 animate-fluid-pop" /> : <Copy className="h-3.5 w-3.5 text-accent" />}
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[9px] font-semibold text-muted-foreground border-t border-white/5 pt-3 z-10">
                  <span>Created By</span>
                  <span className="text-foreground font-bold">{getCreatorName(link.createdBy)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TAB VIEW: WORKSPACE GENERAL INFO ─────────────────────────────────────────
interface WorkspaceViewProps {
  org: Organization;
  profile: UserProfile;
  logout: () => Promise<void>;
}

function WorkspaceSettingsView({ org, profile, logout }: WorkspaceViewProps) {
  const [name, setName] = React.useState(org.name || '');
  const [slug, setSlug] = React.useState(org.slug || '');
  const [deleting, setDeleting] = React.useState(false);
  const [confirmName, setConfirmName] = React.useState('');

  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [slugError, setSlugError] = React.useState<string | null>(null);

  // Sync state
  React.useEffect(() => {
    setName(org.name || '');
    setSlug(org.slug || '');
  }, [org]);

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);
    setSlugError(null);

    if (!name.trim()) {
      setError('Workspace Name is required');
      setSaving(false);
      return;
    }
    if (!slug.trim()) {
      setSlugError('Workspace Slug is required');
      setSaving(false);
      return;
    }

    try {
      // Validate unique slug if changed
      if (slug.toLowerCase() !== org.slug.toLowerCase()) {
        const isUnique = await checkOrgSlugUnique(slug);
        if (!isUnique) {
          setSlugError('This Workspace URL Slug is already taken.');
          setSaving(false);
          return;
        }
      }

      await updateOrganizationDetails(org.id, {
        name: name.trim(),
        slug: slug.trim().toLowerCase(),
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (confirmName !== org.name) {
      alert('Confirmation failed. Please type the organization name exactly.');
      return;
    }
    setDeleting(true);
    try {
      await deleteOrganization(org.id);
      await logout();
      window.location.href = '/signup';
    } catch (err) {
      console.error('Failed to delete organization', err);
      alert('Failed to delete workspace.');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fluid-pop">
      <div className="space-y-6">
        <div>
          <h2 className="text-sm font-bold text-foreground">Workspace General Info</h2>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-[11px] rounded-xl flex items-start gap-2 animate-fluid-pop">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdateWorkspace} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Workspace Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-white/[0.04] transition-all font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]"
                placeholder="Google Deepmind"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Workspace URL Slug</label>
              <div className="flex items-center gap-1 p-1 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]">
                <span className="text-xs text-muted-foreground font-bold pl-2.5 select-none truncate">guild.com/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 bg-transparent px-1.5 py-1.5 text-xs text-foreground outline-none font-bold"
                  placeholder="deepmind"
                />
              </div>
              {slugError && <p className="text-[9px] text-red-500 font-bold">{slugError}</p>}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold hover:bg-accent/90 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 transition-all shadow-lg hover:shadow-accent/15 cursor-pointer text-xs"
              style={{ background: 'var(--accent)' }}
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : success ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Updated Workspace!
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone Overhaul */}
      <div className="aether-glass bg-red-500/[0.01] border border-red-500/20 shadow-[0_4px_24px_rgba(239,68,68,0.06),inset_0_1px_1px_rgba(255,255,255,0.02)] rounded-3xl p-6 space-y-4 relative overflow-hidden mt-6">
        {/* Crimson pulse accent glow */}
        <div className="absolute -bottom-10 -right-10 w-28 h-28 rounded-full pointer-events-none opacity-[0.08] filter blur-xl bg-red-500" />
        
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5 animate-pulse" />
          <div>
            <h2 className="text-xs font-black text-red-500 uppercase tracking-wider">Danger Zone</h2>
            <p className="text-[10px] text-red-500/80 mt-0.5 leading-relaxed font-semibold">
              Deleting your workspace is a permanent action. All channels, chats, goals, projects, and task records will be permanently erased.
            </p>
          </div>
        </div>

        <div className="space-y-3 max-w-md">
          <p className="text-[10px] text-muted-foreground font-semibold">
            To confirm deletion, please type the workspace name exactly <span className="font-bold text-foreground select-all">"{org.name}"</span> below:
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-red-500/20 bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10 transition-all font-semibold"
              placeholder="Type workspace name"
            />
            <button
              onClick={handleDelete}
              disabled={deleting || confirmName !== org.name}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-650 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── TAB VIEW: TEAMS & ORG MANAGEMENT ─────────────────────────────────────────
interface TeamsSettingsViewProps {
  profile: UserProfile;
  members: UserProfile[];
}

function TeamsSettingsView({ profile, members }: TeamsSettingsViewProps) {
  const orgId = profile.organizationId;
  const { teams, loading: teamsLoading } = useTeams(orgId);
  const [subTab, setSubTab] = React.useState<'teams' | 'hierarchy'>('teams');

  // For Creating a Team
  const [isCreating, setIsCreating] = React.useState(false);
  const [teamName, setTeamName] = React.useState('');
  const [teamDesc, setTeamDesc] = React.useState('');
  const [teamManager, setTeamManager] = React.useState('');
  const [teamMembers, setTeamMembers] = React.useState<string[]>([]);
  const [createSaving, setCreateSaving] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  // For Editing a Team
  const [editingTeamId, setEditingTeamId] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editDesc, setEditDesc] = React.useState('');
  const [editManager, setEditManager] = React.useState('');
  const [editMembers, setEditMembers] = React.useState<string[]>([]);
  const [editSaving, setEditSaving] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  // For Line Reporting updates
  const [updatingUserId, setUpdatingUserId] = React.useState<string | null>(null);
  const [hierarchyError, setHierarchyError] = React.useState<string | null>(null);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) {
      setCreateError('Team name is required');
      return;
    }
    if (!teamManager) {
      setCreateError('Please assign a Team Lead');
      return;
    }
    setCreateSaving(true);
    setCreateError(null);
    try {
      await createTeam({
        orgId,
        name: teamName.trim(),
        description: teamDesc.trim(),
        managerId: teamManager,
        memberIds: teamMembers,
      });
      setTeamName('');
      setTeamDesc('');
      setTeamManager('');
      setTeamMembers([]);
      setIsCreating(false);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create team');
    } finally {
      setCreateSaving(false);
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeamId) return;
    if (!editName.trim()) {
      setEditError('Team name is required');
      return;
    }
    if (!editManager) {
      setEditError('Please assign a Team Lead');
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      await updateTeam(editingTeamId, {
        name: editName.trim(),
        description: editDesc.trim(),
        managerId: editManager,
        memberIds: editMembers,
      });
      setEditingTeamId(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update team');
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the team "${name}"?`)) return;
    try {
      await deleteTeam(teamId);
    } catch (err) {
      console.error('Failed to delete team', err);
    }
  };

  const handleManagerToggle = async (userId: string, currentVal: boolean) => {
    setUpdatingUserId(userId);
    setHierarchyError(null);
    try {
      await updateUserProfile(userId, { isManager: !currentVal });
    } catch (err: any) {
      setHierarchyError(err.message || 'Failed to update manager designation');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleLineManagerChange = async (userId: string, managerId: string) => {
    setUpdatingUserId(userId);
    setHierarchyError(null);
    try {
      const value = managerId === 'none' ? null : managerId;
      await updateUserProfile(userId, { managerId: value });
    } catch (err: any) {
      setHierarchyError(err.message || 'Failed to update line manager');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleMemberCheckboxChange = (userId: string, isChecked: boolean, isEdit: boolean) => {
    if (isEdit) {
      if (isChecked) {
        setEditMembers((prev) => [...prev, userId]);
      } else {
        setEditMembers((prev) => prev.filter((id) => id !== userId));
      }
    } else {
      if (isChecked) {
        setTeamMembers((prev) => [...prev, userId]);
      } else {
        setTeamMembers((prev) => prev.filter((id) => id !== userId));
      }
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Title */}
      <div>
        <h2 className="text-sm font-bold text-foreground">Teams & Org Management</h2>
      </div>

      {/* Internal Sub-Tabs */}
      <div className="flex gap-1.5 p-1 bg-white/[0.02] dark:bg-white/[0.01] rounded-xl border border-white/10 self-start w-fit shadow-[inset_0_1px_2px_rgba(255,255,255,0.02)]">
        <button
          onClick={() => setSubTab('teams')}
          className={cn(
            "px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer",
            subTab === 'teams'
              ? "bg-accent text-accent-foreground shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
              : "text-muted-foreground hover:text-foreground"
          )}
          style={subTab === 'teams' ? { backgroundColor: 'var(--accent)' } : undefined}
        >
          Functional Teams
        </button>
        <button
          onClick={() => setSubTab('hierarchy')}
          className={cn(
            "px-4 py-1.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider transition-all cursor-pointer",
            subTab === 'hierarchy'
              ? "bg-accent text-accent-foreground shadow-[0_2px_8px_rgba(0,0,0,0.15)]"
              : "text-muted-foreground hover:text-foreground"
          )}
          style={subTab === 'hierarchy' ? { backgroundColor: 'var(--accent)' } : undefined}
        >
          Reporting Hierarchy
        </button>
      </div>

      {/* TAB 1: FUNCTIONAL TEAMS */}
      {subTab === 'teams' && (
        <div className="space-y-6">
          {/* Create Team Overlay/Form */}
          {isCreating ? (
            <form onSubmit={handleCreateTeam} className="p-5 border border-accent/30 bg-accent/[0.02] rounded-2xl space-y-4 shadow-sm animate-fluid-pop">
              <h3 className="text-xs font-black text-accent uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Create Functional Team
              </h3>
              
              {createError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Team Name</label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Growth Squad"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground outline-none focus:border-accent/40 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Team Lead / Manager</label>
                  <select
                    required
                    value={teamManager}
                    onChange={(e) => setTeamManager(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground outline-none focus:border-accent/40 font-bold"
                  >
                    <option value="" className="bg-surface font-bold text-foreground">-- Assign Lead --</option>
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid} className="bg-surface font-bold text-foreground">
                        {m.fullName} ({m.designation || 'Member'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Description</label>
                <input
                  type="text"
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  placeholder="e.g. Responsible for user acquisition..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground outline-none focus:border-accent/40 font-semibold"
                />
              </div>

              {/* Members Selection List */}
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Assign Members</label>
                <div className="border border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto bg-white/[0.01] dark:bg-white/[0.005] grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-inner custom-scrollbar">
                  {members.map((m) => (
                    <label key={m.uid} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer text-xs font-semibold">
                      <input
                        type="checkbox"
                        checked={teamMembers.includes(m.uid)}
                        onChange={(e) => handleMemberCheckboxChange(m.uid, e.target.checked, false)}
                        className="rounded border-white/20 text-accent focus:ring-accent/15"
                      />
                      <span className="truncate text-foreground font-semibold">{m.fullName}</span>
                      <span className="text-[10px] text-muted-foreground font-normal">@{m.username}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 border border-white/10 bg-white/5 rounded-xl text-xs font-bold text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-foreground rounded-xl text-xs font-bold hover:bg-accent/90 disabled:opacity-50 cursor-pointer shadow-md"
                  style={{ background: 'var(--accent)' }}
                >
                  {createSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Create Team
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center justify-center gap-2 w-full p-4 border border-dashed border-white/15 hover:border-accent/30 hover:bg-accent/[0.02] rounded-2xl text-xs font-bold text-muted-foreground hover:text-accent transition-all duration-305 cursor-pointer shadow-sm"
            >
              <Plus className="h-4 w-4" /> Add Functional Team
            </button>
          )}

          {/* Teams Grid */}
          {teamsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
              <Users className="h-7 w-7 mx-auto text-muted-foreground opacity-50 mb-2" />
              <h4 className="text-xs font-bold text-foreground">No Teams Defined</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-semibold">Create your first functional squad above</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((t) => {
                const isEditing = editingTeamId === t.id;
                const lead = members.find((m) => m.uid === t.managerId);
                const assignedCount = t.memberIds?.length ?? 0;

                if (isEditing) {
                  return (
                    <form
                      key={t.id}
                      onSubmit={handleUpdateTeam}
                      className="p-5 border border-accent bg-accent/[0.02] rounded-2xl space-y-4 col-span-1 md:col-span-2 shadow-sm animate-fluid-pop"
                    >
                      <h3 className="text-xs font-black text-accent uppercase tracking-wider">Edit Functional Team: {t.name}</h3>

                      {editError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{editError}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Team Name</label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g. Growth Squad"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground outline-none focus:border-accent/40 font-semibold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Team Lead / Manager</label>
                          <select
                            required
                            value={editManager}
                            onChange={(e) => setEditManager(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground outline-none focus:border-accent/40 font-bold"
                          >
                            <option value="" className="bg-surface font-bold text-foreground">-- Select Lead --</option>
                            {members.map((m) => (
                              <option key={m.uid} value={m.uid} className="bg-surface font-bold text-foreground">
                                {m.fullName} ({m.designation || 'Member'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Description</label>
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Team description..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.02] dark:bg-white/[0.01] text-xs text-foreground outline-none focus:border-accent/40 font-semibold"
                        />
                      </div>

                      {/* Members Selection List */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Assign Members</label>
                        <div className="border border-white/10 rounded-xl p-3 max-h-40 overflow-y-auto bg-white/[0.01] dark:bg-white/[0.005] grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-inner custom-scrollbar">
                          {members.map((m) => (
                            <label key={m.uid} className="flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 rounded-lg cursor-pointer text-xs font-semibold">
                              <input
                                type="checkbox"
                                checked={editMembers.includes(m.uid)}
                                onChange={(e) => handleMemberCheckboxChange(m.uid, e.target.checked, true)}
                                className="rounded border-white/20 text-accent focus:ring-accent/15"
                              />
                              <span className="truncate text-foreground font-semibold">{m.fullName}</span>
                              <span className="text-[10px] text-muted-foreground">@{m.username}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingTeamId(null)}
                          className="px-4 py-2 border border-white/10 bg-white/5 rounded-xl text-xs font-bold text-foreground cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={editSaving}
                          className="flex items-center gap-1.5 px-4 py-2 bg-accent text-accent-foreground rounded-xl text-xs font-bold hover:bg-accent/90 disabled:opacity-50 cursor-pointer shadow-md"
                          style={{ background: 'var(--accent)' }}
                        >
                          {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Save Changes
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <motion.div
                    key={t.id}
                    whileHover={{ y: -3, scale: 1.01 }}
                    className="p-5 border border-white/10 bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl shadow-sm hover:shadow-[0_4px_20px_oklch(from_var(--accent)_l_c_h_/_8%)] hover:border-accent/30 transition-all duration-300 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h4 className="font-bold text-xs text-foreground truncate">{t.name}</h4>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => {
                              setEditingTeamId(t.id);
                              setEditName(t.name);
                              setEditDesc(t.description || '');
                              setEditManager(t.managerId);
                              setEditMembers(t.memberIds || []);
                              setEditError(null);
                            }}
                            className="px-2.5 py-1.5 text-[9px] font-extrabold border border-white/10 rounded-xl hover:bg-white/10 text-foreground transition-all cursor-pointer shadow-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(t.id, t.name)}
                            className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-xl transition-all cursor-pointer border border-transparent hover:border-red-500/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {t.description && (
                        <p className="text-[11px] text-muted-foreground mb-4 line-clamp-2 leading-relaxed font-semibold">{t.description}</p>
                      )}

                      <div className="space-y-2 border-t border-white/5 pt-3.5 mt-3">
                        <div className="flex justify-between items-center text-[10px] font-semibold">
                          <span className="text-muted-foreground font-medium">Team Lead:</span>
                          <span className="text-foreground font-bold">{lead?.fullName ?? 'Unassigned'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-semibold">
                          <span className="text-muted-foreground font-medium">Members Count:</span>
                          <span className="text-accent font-extrabold bg-accent/15 border border-accent/20 px-2 py-0.5 rounded-md text-[9px]">{assignedCount}</span>
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

      {/* TAB 2: REPORTING LINES & HIERARCHY */}
      {subTab === 'hierarchy' && (
        <div className="space-y-6">
          {hierarchyError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{hierarchyError}</span>
            </div>
          )}

          {/* Overhauled Hierarchy List */}
          <div className="space-y-3">
            {members.map((m) => {
              const isProcessing = updatingUserId === m.uid;
              const potentialManagers = members.filter((pm) => pm.uid !== m.uid);

              return (
                <motion.div
                  key={m.uid}
                  whileHover={{ x: 2 }}
                  className="p-4 flex flex-wrap items-center justify-between gap-4 aether-glass bg-gradient-to-r from-white/[0.015] to-transparent border-white/5 hover:border-white/10 rounded-2xl transition-all shadow-sm"
                >
                  {/* Member Details */}
                  <div className="flex items-center gap-3.5 min-w-[200px] flex-1 overflow-hidden">
                    <div 
                      className="h-8.5 w-8.5 rounded-xl flex items-center justify-center font-black text-white text-xs shrink-0 relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
                      }}
                    >
                      <span className="absolute top-0 left-0 right-0 h-[45%] bg-white/10 rounded-t-full pointer-events-none" />
                      {m.fullName ? m.fullName[0].toUpperCase() : '?'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-black text-foreground truncate leading-tight">
                        {m.fullName}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate mt-1.5 font-semibold">@{m.username}</p>
                    </div>
                  </div>

                  {/* Designation */}
                  <div className="text-xs text-foreground font-semibold min-w-[130px] shrink-0">
                    {m.designation || 'Teammate'}
                  </div>

                  {/* Manager Privilege Toggle */}
                  <div className="shrink-0 min-w-[130px] flex items-center">
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleManagerToggle(m.uid, !!m.isManager)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-[9px] font-extrabold uppercase tracking-wider border cursor-pointer transition-all shadow-sm",
                          m.isManager
                            ? "bg-accent/15 text-accent border-accent/25"
                            : "bg-white/5 text-muted-foreground border-white/10 hover:bg-white/10"
                        )}
                        style={m.isManager ? { color: 'var(--accent)', borderColor: 'oklch(from var(--accent) l c h / 25%)' } : undefined}
                      >
                        {m.isManager ? 'Is Manager' : 'Standard'}
                      </button>
                    )}
                  </div>
                  {/* Direct Line Manager Selector */}
                  <div className="shrink-0">
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    ) : (
                      <select
                        value={m.managerId || 'none'}
                        onChange={(e) => handleLineManagerChange(m.uid, e.target.value)}
                        className="bg-white/[0.02] dark:bg-white/[0.01] border border-white/10 text-[11px] font-bold text-foreground rounded-lg px-2.5 py-1.5 outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 transition-all max-w-[170px] truncate cursor-pointer shadow-inner"
                      >
                        <option value="none" className="bg-surface font-bold text-foreground">No Manager</option>
                        {potentialManagers.map((pm) => (
                          <option key={pm.uid} value={pm.uid} className="bg-surface font-bold text-foreground">
                            {pm.fullName}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

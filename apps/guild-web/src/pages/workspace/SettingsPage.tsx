import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Bell, Paintbrush, Users, Link2, Building2, CreditCard,
  Check, Loader2, ShieldAlert, Trash2, Crown, ShieldCheck,
  UserCheck, UserMinus, Copy, CheckSquare, AlertCircle, Info, RefreshCw,
  Plus, Workflow
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
  getOrgById
} from '../../lib/firestore';
import { useOrgMembers } from '../../hooks/useChat';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { InviteLink, UserProfile, Organization } from '@guild/types';
import { InviteModal } from '../people/InviteModal';

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
      console.error('Failed to fetch invite links');
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
    if (!userProfile?.organizationId) return;
    const unsub = onSnapshot(doc(db, 'organizations', userProfile.organizationId), (snap) => {
      if (snap.exists()) {
        setLocalOrg({ ...snap.data(), id: snap.id } as Organization);
      }
    });
    return unsub;
  }, [userProfile?.organizationId]);

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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-8 pb-6 border-b border-border-default shrink-0">
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your personal details, visual theme, notification preferences, and workspace settings.
        </p>
      </div>

      {/* Main Layout Grid */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Navigation Sidebar */}
        <div className="w-64 border-r border-border-default bg-sidebar p-5 overflow-y-auto space-y-5">
          {/* Personal Group */}
          {tabs.filter(t => t.group === 'personal').length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-text-muted/40 px-3 pb-1 select-none">
                Personal
              </p>
              <div className="space-y-1">
                {tabs.filter(t => t.group === 'personal').map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group select-none cursor-pointer
                        ${isActive
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeSettingsTabBG"
                          className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl z-0"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <TabIcon className={`h-4 w-4 shrink-0 z-10 transition-colors ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-foreground'}`} />
                      <span className="truncate z-10 tracking-wide">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workspace Group */}
          {tabs.filter(t => t.group === 'workspace').length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[9px] font-extrabold uppercase tracking-widest text-text-muted/40 px-3 pb-1 select-none">
                Workspace
              </p>
              <div className="space-y-1">
                {tabs.filter(t => t.group === 'workspace').map((tab) => {
                  const TabIcon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative group select-none cursor-pointer
                        ${isActive
                          ? 'text-primary'
                          : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeSettingsTabBG"
                          className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-xl z-0"
                          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        />
                      )}
                      <TabIcon className={`h-4 w-4 shrink-0 z-10 transition-colors ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-foreground'}`} />
                      <span className="truncate z-10 tracking-wide">{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Tab Content Area */}
        <div className="flex-1 overflow-y-auto bg-bg-primary p-8">
          <div className="max-w-3xl mx-auto">
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
                  <ProfileSettingsView profile={localProfile} />
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

function ProfileSettingsView({ profile }: { profile: UserProfile }) {
  const [fullName, setFullName] = React.useState(profile.fullName || '');
  const [username, setUsername] = React.useState(profile.username || '');
  const [designation, setDesignation] = React.useState(profile.designation || '');
  const [employeeId, setEmployeeId] = React.useState(profile.employeeId || '');
  const [age, setAge] = React.useState(profile.age ? String(profile.age) : '');

  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [errors, setErrors] = React.useState<FormError>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);

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
    <div className="bg-surface border border-border-default/60 rounded-3xl p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">My Profile</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Customize your personal identity cards and details.</p>
      </div>

      {generalError && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{generalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl border bg-bg-primary text-sm text-foreground placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all
                ${errors.fullName ? 'border-red-500/60 focus:border-red-500/50' : 'border-border-default'}`}
              placeholder="Aryan Pandey"
            />
            {errors.fullName && <p className="text-[10px] text-red-500 font-medium">{errors.fullName}</p>}
          </div>

          {/* Username */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl border bg-bg-primary text-sm text-foreground placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all
                ${errors.username ? 'border-red-500/60 focus:border-red-500/50' : 'border-border-default'}`}
              placeholder="aryan_p"
            />
            {errors.username && <p className="text-[10px] text-red-500 font-medium">{errors.username}</p>}
          </div>

          {/* Designation */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Designation / Role</label>
            <input
              type="text"
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary text-sm text-foreground placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="Lead Engineer"
            />
          </div>

          {/* Employee ID */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Employee ID</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary text-sm text-foreground placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="G-1025"
            />
          </div>

          {/* Age */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Age</label>
            <input
              type="number"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className={`w-full px-3.5 py-2 rounded-xl border bg-bg-primary text-sm text-foreground placeholder:text-text-muted outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all
                ${errors.age ? 'border-red-500/60 focus:border-red-500/50' : 'border-border-default'}`}
              placeholder="26"
            />
            {errors.age && <p className="text-[10px] text-red-500 font-medium">{errors.age}</p>}
          </div>

          {/* Email (Read-Only) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              Email Address <Info className="h-3 w-3 text-text-muted" />
            </label>
            <input
              type="email"
              disabled
              value={profile.email}
              className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-bg-tertiary text-sm text-muted-foreground cursor-not-allowed outline-none"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between gap-4">
          <span className="text-[11px] text-muted-foreground">
            Account Role: <span className="font-bold text-foreground capitalize">{profile.role}</span>
          </span>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm shadow-primary/20 text-sm"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Saving…
              </>
            ) : success ? (
              <>
                <Check className="h-4 w-4" /> Saved Successfully!
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

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
      console.error('Failed to update notification settings');
    } finally {
      setSaving(null);
    }
  };

  const notificationOptions = [
    { key: 'dm' as const, label: 'Direct Messages', desc: 'Notify me when I receive private direct messages.' },
    { key: 'mention' as const, label: 'Mentions & Tags', desc: 'Notify me when someone mentions me (@username) in channels.' },
    { key: 'taskAssigned' as const, label: 'Tasks Assigned to Me', desc: 'Send alerts when a workspace manager assigns a task to me.' },
    { key: 'taskCommented' as const, label: 'Task Activities & Comments', desc: 'Notify me when colleagues comment or update tasks I created or belong to.' },
    { key: 'channelInvite' as const, label: 'Channel Invitations', desc: 'Notify me when I am invited or added to a new communication channel.' },
  ];

  return (
    <div className="bg-surface border border-border-default/60 rounded-3xl p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Notification Preferences</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Control which activities trigger real-time banners and notifications.</p>
      </div>

      <div className="divide-y divide-border-default/40">
        {notificationOptions.map((opt) => {
          const isChecked = settings[opt.key];
          const isToggling = saving === opt.key;
          return (
            <div key={opt.key} className="py-4 flex items-center justify-between gap-6 first:pt-0 last:pb-0">
              <div className="space-y-0.5">
                <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>

              {/* Smooth Switch */}
              <button
                onClick={() => handleToggle(opt.key)}
                disabled={isToggling}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none
                  ${isChecked ? 'bg-primary' : 'bg-bg-tertiary'}
                  ${isToggling ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out flex items-center justify-center
                    ${isChecked ? 'translate-x-5' : 'translate-x-0'}`}
                >
                  {isToggling && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                </span>
              </button>
            </div>
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
    // 1. Instantly trigger visual change
    setTheme(id);
    // 2. Persist in database
    try {
      await updateUserProfile(profile.uid, { themeId: id as any });
    } catch (err) {
      console.error('Failed to update user profile theme');
    }
  };

  return (
    <div className="bg-surface border border-border-default/60 rounded-3xl p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Visual Theme & Appearance</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Choose your preferred workspace aesthetic. Syncs across devices.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {THEMES.map((theme) => {
          const isActive = themeId === theme.id;
          return (
            <button
              key={theme.id}
              onClick={() => handleThemeChange(theme.id)}
              className={`flex flex-col text-left p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group hover:shadow-md
                ${isActive
                  ? 'border-primary bg-primary/5 shadow-sm shadow-primary/5'
                  : 'border-border-default bg-bg-primary hover:border-border-default hover:bg-accent/10'
                }`}
            >
              {/* Top Banner Colors */}
              <div className="flex items-center justify-between gap-3 w-full mb-3">
                <div className="flex items-center gap-1.5">
                  <div
                    className="h-5 w-5 rounded-full border border-white/10 shrink-0 shadow"
                    style={{ backgroundColor: theme.swatch }}
                  />
                  <div
                    className="h-5 w-5 rounded-full border border-white/10 shrink-0 shadow -ml-2.5"
                    style={{ backgroundColor: theme.bgSwatch }}
                  />
                </div>
                {isActive && (
                  <span className="p-1 rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>

              {/* Theme Labels */}
              <span className="text-sm font-semibold text-foreground">{theme.name}</span>
              <p className="text-[11px] text-muted-foreground mt-0.5">{theme.description}</p>
            </button>
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
    <div className="bg-surface border border-border-default/60 rounded-3xl p-6 shadow-sm space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">Workspace Members</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage permissions, invite new teammates, or update roles.</p>
        </div>
        <button
          onClick={onOpenInvite}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 transition-all shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" /> Invite Teammate
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Members List Table */}
      <div className="border border-border-default rounded-2xl overflow-hidden bg-bg-primary">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border-default bg-surface/50 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default/50">
            {sorted.map((member) => {
              const isSelf = member.uid === profile.uid;
              const isOwner = member.role === 'owner';
              const isAdmin = member.role === 'admin';
              
              // Dynamic rules:
              // Admins cannot change owners or other admins.
              // Owners can change anyone.
              const canManage = profile.role === 'owner' ? !isSelf : (profile.role === 'admin' && member.role === 'member');
              const isProcessing = updatingId === member.uid;

              return (
                <tr key={member.uid} className="hover:bg-accent/5 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary font-bold text-xs">
                        {member.fullName ? member.fullName[0].toUpperCase() : '?'}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-sm font-semibold text-foreground truncate leading-tight flex items-center gap-1.5">
                          {member.fullName}
                          {isSelf && <span className="text-[9px] uppercase tracking-wider bg-primary/15 text-primary px-1.5 py-0.5 rounded-full border border-primary/25">You</span>}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">@{member.username} · {member.designation || 'Teammate'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {isOwner ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-[10px] font-semibold text-amber-500">
                        <Crown className="h-3 w-3" /> Owner
                      </span>
                    ) : isAdmin ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/25 text-[10px] font-semibold text-violet-500">
                        <ShieldCheck className="h-3 w-3" /> Admin
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/10 border border-sky-500/25 text-[10px] font-semibold text-sky-500">
                        <User className="h-3 w-3" /> Member
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 animate-spin text-primary inline" />
                    ) : canManage ? (
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Demote Admin / Promote Member */}
                        {isAdmin ? (
                          <button
                            onClick={() => handleRoleChange(member.uid, 'member')}
                            className="px-2 py-1 border border-border-default bg-bg-primary hover:bg-accent/20 rounded-lg text-[10px] font-semibold text-foreground transition-all"
                            title="Demote to standard Member"
                          >
                            Demote Member
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRoleChange(member.uid, 'admin')}
                            className="px-2 py-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-[10px] font-semibold transition-all shadow-sm"
                            title="Promote to Workspace Admin"
                          >
                            Promote Admin
                          </button>
                        )}

                        {/* Transfer Ownership (Owner Only, can only transfer to Admins/Members) */}
                        {profile.role === 'owner' && !isOwner && (
                          <button
                            onClick={() => handleTransfer(member.uid, member.fullName)}
                            className="px-2 py-1 border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/20 text-amber-500 rounded-lg text-[10px] font-semibold transition-all"
                            title="Transfer complete Ownership"
                          >
                            Transfer Owner
                          </button>
                        )}

                        {/* Remove from workspace */}
                        <button
                          onClick={() => handleRemoveMember(member.uid)}
                          className="p-1.5 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-text-muted transition-all"
                          title="Remove from Workspace"
                        >
                          <UserMinus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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

function InviteLinksSettingsView({ profile, inviteLinks, loading, members }: InviteLinksProps) {
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
      console.error('Failed to revoke invite link');
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
    <div className="bg-surface border border-border-default/60 rounded-3xl p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Invite Links</h2>
        <p className="text-xs text-muted-foreground mt-0.5">View or revoke active single-use invitation links.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-semibold">Loading invite links…</span>
        </div>
      ) : inviteLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border-default rounded-2xl bg-bg-primary">
          <Link2 className="h-8 w-8 text-text-muted mb-2" />
          <p className="text-sm font-bold text-foreground">No invite links active</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            Generate invite tokens on the Teammates directory or from the Members tab.
          </p>
        </div>
      ) : (
        <div className="border border-border-default rounded-2xl overflow-hidden bg-bg-primary">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border-default bg-surface/50 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                <th className="px-4 py-3">Link / Token</th>
                <th className="px-4 py-3">Created By</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/50">
              {inviteLinks.map((link) => {
                const now = Date.now();
                const isExpired = link.expiresAt.toMillis() < now;
                const isActive = !link.used && !isExpired;
                const isRevoking = revoking === link.token;

                return (
                  <tr key={link.token} className="hover:bg-accent/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 overflow-hidden max-w-[240px]">
                        <span className="text-xs font-mono text-foreground truncate">/join/{link.token}</span>
                        {isActive && (
                          <button
                            onClick={() => handleCopy(link.token)}
                            className="p-1 hover:bg-primary/10 text-primary rounded"
                            title="Copy link"
                          >
                            {copiedId === link.token ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground font-medium">
                      {getCreatorName(link.createdBy)}
                    </td>
                    <td className="px-4 py-3">
                      {link.used ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-border-default text-[9px] font-bold text-muted-foreground">Used</span>
                      ) : isExpired ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/10 text-[9px] font-bold text-red-500">Expired</span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/10 text-[9px] font-bold text-emerald-500">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isRevoking ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary inline" />
                      ) : (
                        <button
                          onClick={() => handleRevoke(link.token)}
                          className="p-1 hover:bg-red-500/10 hover:text-red-500 rounded-lg text-text-muted transition-all"
                          title="Delete / Revoke Link"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
      console.error('Failed to delete organization');
      alert('Failed to delete workspace.');
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-border-default/60 rounded-3xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-foreground">Workspace General Info</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Customize your company name, logo initials, and public URLs.</p>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpdateWorkspace} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspace Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary text-sm text-foreground outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                placeholder="Google Deepmind"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Workspace URL Slug</label>
              <div className="flex items-center gap-1.5 p-1 rounded-xl border border-border-default bg-bg-primary">
                <span className="text-xs text-muted-foreground font-medium pl-2.5 select-none truncate">guild.com/</span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  className="flex-1 bg-transparent px-1.5 py-1 text-sm text-foreground outline-none font-semibold"
                  placeholder="deepmind"
                />
              </div>
              {slugError && <p className="text-[10px] text-red-500 font-medium">{slugError}</p>}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 disabled:opacity-50 transition-all shadow-sm text-sm"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                </>
              ) : success ? (
                <>
                  <Check className="h-4 w-4" /> Updated Workspace!
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 space-y-6">
        <div className="flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-base font-bold text-red-500">Danger Zone</h2>
            <p className="text-xs text-red-500/80 mt-0.5">
              Deleting your workspace is a permanent action. All channels, chats, goals, projects, and task records will be permanently erased.
            </p>
          </div>
        </div>

        <div className="space-y-3 max-w-md">
          <p className="text-xs text-muted-foreground">
            To confirm deletion, please type the workspace name exactly <span className="font-bold text-foreground select-all">"{org.name}"</span> below:
          </p>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              className="flex-1 px-3.5 py-2 rounded-xl border border-red-500/20 bg-bg-primary text-sm text-foreground outline-none focus:border-red-500/50 focus:ring-1 focus:ring-red-500/10 transition-all"
              placeholder="Type workspace name"
            />
            <button
              onClick={handleDelete}
              disabled={deleting || confirmName !== org.name}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
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
      // Reset
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
      console.error('Failed to delete team');
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
    <div className="bg-surface border border-border-default/60 rounded-3xl p-6 shadow-sm space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-lg font-bold text-foreground">Teams & Org Management</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure line reporting (managers & reports) and create functional teams/squads.
        </p>
      </div>

      {/* Internal Sub-Tabs */}
      <div className="flex gap-2 p-1 bg-bg-primary rounded-xl border border-border-default/50 self-start w-fit">
        <button
          onClick={() => setSubTab('teams')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTab === 'teams'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Functional Teams
        </button>
        <button
          onClick={() => setSubTab('hierarchy')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            subTab === 'hierarchy'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Reporting Lines & Hierarchy
        </button>
      </div>

      {/* TAB 1: FUNCTIONAL TEAMS */}
      {subTab === 'teams' && (
        <div className="space-y-6">
          {/* Create Team Overlay/Form */}
          {isCreating ? (
            <form onSubmit={handleCreateTeam} className="p-5 border border-primary/20 bg-primary/5 rounded-2xl space-y-4">
              <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
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
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Name</label>
                  <input
                    type="text"
                    required
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="e.g. Growth Squad"
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary text-sm text-foreground outline-none focus:border-primary/50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Lead / Manager</label>
                  <select
                    required
                    value={teamManager}
                    onChange={(e) => setTeamManager(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary text-sm text-foreground outline-none focus:border-primary/50"
                  >
                    <option value="">-- Select Team Lead --</option>
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.fullName} ({m.designation || 'Member'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                <input
                  type="text"
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  placeholder="e.g. Responsible for user acquisition, conversion rate optimization..."
                  className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary text-sm text-foreground outline-none focus:border-primary/50"
                />
              </div>

              {/* Members Selection List */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign Members</label>
                <div className="border border-border-default rounded-xl p-3 max-h-40 overflow-y-auto bg-bg-primary grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {members.map((m) => (
                    <label key={m.uid} className="flex items-center gap-2 px-2 py-1 hover:bg-accent/10 rounded-lg cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={teamMembers.includes(m.uid)}
                        onChange={(e) => handleMemberCheckboxChange(m.uid, e.target.checked, false)}
                        className="rounded border-border-default text-primary focus:ring-primary/20"
                      />
                      <span className="truncate text-foreground font-medium">{m.fullName}</span>
                      <span className="text-[10px] text-muted-foreground">@{m.username}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 border border-border-default bg-bg-primary hover:bg-accent/20 rounded-xl text-xs font-semibold text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSaving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                >
                  {createSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                  Create Team
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center justify-center gap-2 w-full p-4 border border-dashed border-border-default hover:border-primary/40 hover:bg-primary/5 rounded-2xl text-xs font-bold text-muted-foreground hover:text-primary transition-all duration-200"
            >
              <Plus className="h-4 w-4" /> Add Functional Team
            </button>
          )}

          {/* Teams Grid */}
          {teamsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border-default rounded-2xl">
              <Users className="h-8 w-8 mx-auto text-text-muted opacity-50 mb-2" />
              <h4 className="text-sm font-semibold text-foreground">No Teams Defined</h4>
              <p className="text-xs text-muted-foreground mt-0.5">Create your first functional squad above.</p>
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
                      className="p-5 border border-primary bg-primary/5 rounded-2xl space-y-4 col-span-1 md:col-span-2"
                    >
                      <h3 className="text-sm font-bold text-primary">Edit Functional Team: {t.name}</h3>

                      {editError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          <span>{editError}</span>
                        </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Name</label>
                          <input
                            type="text"
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="e.g. Growth Squad"
                            className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary text-sm text-foreground outline-none focus:border-primary/50"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Team Lead / Manager</label>
                          <select
                            required
                            value={editManager}
                            onChange={(e) => setEditManager(e.target.value)}
                            className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary text-sm text-foreground outline-none focus:border-primary/50"
                          >
                            <option value="">-- Select Team Lead --</option>
                            {members.map((m) => (
                              <option key={m.uid} value={m.uid}>
                                {m.fullName} ({m.designation || 'Member'})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</label>
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Team description..."
                          className="w-full px-3.5 py-2 rounded-xl border border-border-default bg-bg-primary text-sm text-foreground outline-none focus:border-primary/50"
                        />
                      </div>

                      {/* Members Selection List */}
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Assign Members</label>
                        <div className="border border-border-default rounded-xl p-3 max-h-40 overflow-y-auto bg-bg-primary grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {members.map((m) => (
                            <label key={m.uid} className="flex items-center gap-2 px-2 py-1 hover:bg-accent/10 rounded-lg cursor-pointer text-xs">
                              <input
                                type="checkbox"
                                checked={editMembers.includes(m.uid)}
                                onChange={(e) => handleMemberCheckboxChange(m.uid, e.target.checked, true)}
                                className="rounded border-border-default text-primary focus:ring-primary/20"
                              />
                              <span className="truncate text-foreground font-medium">{m.fullName}</span>
                              <span className="text-[10px] text-muted-foreground">@{m.username}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setEditingTeamId(null)}
                          className="px-4 py-2 border border-border-default bg-bg-primary hover:bg-accent/20 rounded-xl text-xs font-semibold text-foreground"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={editSaving}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-semibold hover:bg-primary/90 disabled:opacity-50"
                        >
                          {editSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                          Save Changes
                        </button>
                      </div>
                    </form>
                  );
                }

                return (
                  <div
                    key={t.id}
                    className="p-5 border border-border-default/60 bg-bg-primary rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2">
                        <h4 className="font-bold text-sm text-foreground truncate">{t.name}</h4>
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              setEditingTeamId(t.id);
                              setEditName(t.name);
                              setEditDesc(t.description || '');
                              setEditManager(t.managerId);
                              setEditMembers(t.memberIds || []);
                              setEditError(null);
                            }}
                            className="px-2 py-1 text-[10px] font-semibold border border-border-default rounded-lg hover:bg-accent/10 text-foreground transition-all"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(t.id, t.name)}
                            className="p-1 hover:bg-red-500/10 text-text-muted hover:text-red-500 rounded-lg transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {t.description && (
                        <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{t.description}</p>
                      )}

                      <div className="space-y-1.5 border-t border-border-default/50 pt-3 mt-3">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted-foreground font-medium">Team Lead:</span>
                          <span className="text-foreground font-semibold">{lead?.fullName ?? 'Unassigned'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-muted-foreground font-medium">Members Count:</span>
                          <span className="text-foreground font-semibold bg-muted px-1.5 py-0.5 rounded-md">{assignedCount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
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

          <div className="border border-border-default rounded-2xl overflow-hidden bg-bg-primary">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border-default bg-surface/50 text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Designation</th>
                  <th className="px-4 py-3">Manager Privilege</th>
                  <th className="px-4 py-3">Direct Line Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default/50">
                {members.map((m) => {
                  const isProcessing = updatingUserId === m.uid;
                  
                  // Filter out this member to prevent circular reports
                  const potentialManagers = members.filter((pm) => pm.uid !== m.uid);

                  return (
                    <tr key={m.uid} className="hover:bg-accent/5 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg flex items-center justify-center bg-primary/10 text-primary font-bold text-xs shrink-0">
                            {m.fullName ? m.fullName[0].toUpperCase() : '?'}
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-sm font-semibold text-foreground truncate leading-tight">
                              {m.fullName}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate mt-0.5">@{m.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-foreground font-medium">
                        {m.designation || 'Teammate'}
                      </td>
                      <td className="px-4 py-3.5">
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleManagerToggle(m.uid, !!m.isManager)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${
                              m.isManager
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-muted text-muted-foreground border-transparent hover:bg-accent/20'
                            }`}
                          >
                            {m.isManager ? 'Is Manager' : 'Standard Member'}
                          </button>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <select
                            value={m.managerId || 'none'}
                            onChange={(e) => handleLineManagerChange(m.uid, e.target.value)}
                            className="bg-bg-primary border border-border-default text-xs text-foreground rounded-lg px-2 py-1 outline-none focus:border-primary/50 transition-all max-w-[180px] truncate"
                          >
                            <option value="none">No Manager</option>
                            {potentialManagers.map((pm) => (
                              <option key={pm.uid} value={pm.uid}>
                                {pm.fullName}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

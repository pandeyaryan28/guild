import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Bell, Paintbrush, Users, Link2, Building2, CreditCard,
  Check, Loader2, ShieldAlert, Trash2, Crown, ShieldCheck,
  UserCheck, UserMinus, Copy, CheckSquare, AlertCircle, Info, RefreshCw,
  Plus
} from 'lucide-react';
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
      console.error(err);
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
      { id: 'profile', label: 'My Profile', icon: User, allowed: ['member', 'admin', 'owner'] },
      { id: 'notifications', label: 'Notifications', icon: Bell, allowed: ['member', 'admin', 'owner'] },
      { id: 'appearance', label: 'Appearance', icon: Paintbrush, allowed: ['member', 'admin', 'owner'] },
      { id: 'members', label: 'Workspace Members', icon: Users, allowed: ['admin', 'owner'] },
      { id: 'invites', label: 'Invite Links', icon: Link2, allowed: ['admin', 'owner'] },
      { id: 'workspace', label: 'Workspace Info', icon: Building2, allowed: ['owner'] },
      { id: 'billing', label: 'Billing & Plan', icon: CreditCard, allowed: ['owner'] },
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
        <div className="w-64 border-r border-border-default bg-sidebar p-4 overflow-y-auto space-y-1">
          {tabs.map((tab) => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all relative group
                  ${isActive
                    ? 'bg-primary/15 text-primary shadow-sm'
                    : 'text-muted-foreground hover:bg-accent/30 hover:text-foreground'
                  }`}
              >
                <TabIcon className={`h-4 w-4 shrink-0 ${isActive ? 'text-primary' : 'text-text-muted group-hover:text-foreground'}`} />
                <span className="truncate">{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="activeSettingsTab"
                    className="absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-md bg-primary"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
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
                {activeTab === 'workspace' && localOrg && localProfile && (
                  <WorkspaceSettingsView
                    org={localOrg}
                    profile={localProfile}
                    logout={logout}
                  />
                )}
                {activeTab === 'billing' && localOrg && localProfile && (
                  <BillingSettingsView org={localOrg} />
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
      console.error('Failed to update notification settings', err);
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
      console.error(err);
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
      console.error('Failed to delete organization', err);
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

// ─── TAB VIEW: BILLING & PLANS ───────────────────────────────────────────────
function BillingSettingsView({ org }: { org: Organization }) {
  const [loading, setLoading] = React.useState(false);
  const [autoRenew, setAutoRenew] = React.useState(true);

  const plan = org.billingPlan || 'premium';

  const handleUpgrade = async (tier: 'free' | 'premium' | 'enterprise') => {
    setLoading(true);
    try {
      await updateOrganizationDetails(org.id, { billingPlan: tier });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface border border-border-default/60 rounded-3xl p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground">Billing & Plan</h2>
        <p className="text-xs text-muted-foreground mt-0.5">View your current subscription tier, renew cycles, and plan details.</p>
      </div>

      {/* Plan Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Free Plan */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between text-left transition-all duration-200
          ${plan === 'free' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border-default bg-bg-primary'}`}>
          <div>
            <span className="text-xs uppercase font-bold text-muted-foreground">Standard</span>
            <h3 className="text-lg font-extrabold text-foreground mt-1">Free Tier</h3>
            <p className="text-xs text-muted-foreground mt-1">Basic tasks and messaging for smaller startups.</p>
            <div className="text-2xl font-black text-foreground mt-4">$0 <span className="text-xs font-medium text-muted-foreground">/mo</span></div>
          </div>
          {plan === 'free' ? (
            <span className="w-full text-center py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary mt-6">Active Plan</span>
          ) : (
            <button
              onClick={() => handleUpgrade('free')}
              disabled={loading}
              className="w-full text-center py-2 rounded-xl border border-border-default hover:bg-accent/20 text-xs font-semibold text-foreground mt-6 transition-all"
            >
              Downgrade
            </button>
          )}
        </div>

        {/* Premium Plan */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between text-left transition-all duration-200 relative overflow-hidden
          ${plan === 'premium' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border-default bg-bg-primary'}`}>
          <div className="absolute top-2.5 right-2.5 text-[9px] font-bold uppercase bg-primary text-primary-foreground px-2 py-0.5 rounded-full">POPULAR</div>
          <div>
            <span className="text-xs uppercase font-bold text-primary">Advanced</span>
            <h3 className="text-lg font-extrabold text-foreground mt-1">Premium Plan</h3>
            <p className="text-xs text-muted-foreground mt-1">Unlimited project planning, channels, and visual themes.</p>
            <div className="text-2xl font-black text-foreground mt-4">$29 <span className="text-xs font-medium text-muted-foreground">/mo</span></div>
          </div>
          {plan === 'premium' ? (
            <span className="w-full text-center py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary mt-6">Active Plan</span>
          ) : (
            <button
              onClick={() => handleUpgrade('premium')}
              disabled={loading}
              className="w-full text-center py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/95 text-xs font-semibold mt-6 transition-all"
            >
              Select Plan
            </button>
          )}
        </div>

        {/* Enterprise Plan */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between text-left transition-all duration-200
          ${plan === 'enterprise' ? 'border-primary bg-primary/5 shadow-sm' : 'border-border-default bg-bg-primary'}`}>
          <div>
            <span className="text-xs uppercase font-bold text-purple-400">Scale</span>
            <h3 className="text-lg font-extrabold text-foreground mt-1">Enterprise</h3>
            <p className="text-xs text-muted-foreground mt-1">Dedicated customer support, custom databases, and workspace limits removal.</p>
            <div className="text-2xl font-black text-foreground mt-4">$99 <span className="text-xs font-medium text-muted-foreground">/mo</span></div>
          </div>
          {plan === 'enterprise' ? (
            <span className="w-full text-center py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs font-bold text-primary mt-6">Active Plan</span>
          ) : (
            <button
              onClick={() => handleUpgrade('enterprise')}
              disabled={loading}
              className="w-full text-center py-2 rounded-xl border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/20 text-purple-400 text-xs font-semibold mt-6 transition-all"
            >
              Upgrade Tier
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-border-default/45 pt-4 flex items-center justify-between gap-6">
        <div>
          <span className="text-sm font-semibold text-foreground">Auto-Renew Subscription</span>
          <p className="text-xs text-muted-foreground mt-0.5">Toggle whether your payment card will be automatically charged next cycle.</p>
        </div>
        <button
          onClick={() => setAutoRenew(!autoRenew)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none
            ${autoRenew ? 'bg-primary' : 'bg-bg-tertiary'}`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
              ${autoRenew ? 'translate-x-5' : 'translate-x-0'}`}
          />
        </button>
      </div>
    </div>
  );
}

import * as React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User, Bell, Paintbrush, Users, Link2, Building2,
  Check, Loader2, ShieldAlert, Trash2, Crown, ShieldCheck,
  UserMinus, Copy, AlertCircle, Info, Mail,
  Plus, Workflow, MessageSquare, AtSign, CheckSquare, MessagesSquare, UserPlus, Camera,
  Download, Share2, CreditCard, Folder, Target, ArrowLeft, ArrowRight, X
} from 'lucide-react';
import { BillingSettingsView } from './BillingSettingsView';
import { createTeam, updateTeam, deleteTeam } from '../../lib/teams';
import { useTeams } from '../../hooks/useTeams';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { usePwaInstall } from '../../hooks/usePwaInstall';
import { THEMES } from '../../lib/themes';
import { sendPasswordReset, reauthenticatePassword, reauthenticateGoogle, getCurrentUser, deleteCurrentUser } from '../../lib/auth';
import {
  updateUserProfile,
  removeUserFromOrg,
  updateOrganizationDetails,
  deleteOrganization,
  revokeInviteLink,
  checkUsernameUnique,
  deleteUserProfile
} from '../../lib/firestore';
import { uploadProfileImage, uploadOrganizationPhoto } from '../../lib/storage';
import { useOrgMembers } from '../../hooks/useChat';
import { SearchableSelect } from '../../components/SearchableSelect';
import { collection, query, where, onSnapshot, doc, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { InviteLink, UserProfile, Organization } from '@guild/types';
import { InviteModal } from '../people/InviteModal';
import { cn } from '@/lib/utils';
import { isValidPhoneNumber } from '../../lib/validation';

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

// ─── Client-side Image Compression Helper ────────────────────────────────────
const compressImage = (file: File, maxWidth = 250, maxHeight = 250, quality = 0.85): Promise<File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// ─── Settings Page ────────────────────────────────────────────────────────────
export function SettingsPage() {
  const { user, userProfile, logout } = useAuth();
  const { themeId, setTheme } = useTheme();
  const { isInstallable, isStandalone, install } = usePwaInstall();
  
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
  const [loadingOrg, setLoadingOrg] = React.useState(true);
  React.useEffect(() => {
    if (!localProfile?.organizationId) {
      setLocalOrg(null);
      setLoadingOrg(false);
      return;
    }
    setLoadingOrg(true);
    const unsub = onSnapshot(doc(db, 'organizations', localProfile.organizationId), (snap) => {
      if (snap.exists()) {
        setLocalOrg({ ...snap.data(), id: snap.id } as Organization);
      } else {
        setLocalOrg(null);
      }
      setLoadingOrg(false);
    }, (err) => {
      console.error('Failed to load organization', err);
      setLocalOrg(null);
      setLoadingOrg(false);
    });
    return unsub;
  }, [localProfile?.organizationId]);

  const orgId = localProfile?.organizationId;
  const role = localProfile?.role ?? 'member';

  const members = useOrgMembers(orgId);
  const { links: inviteLinks, loading: invitesLoading } = useInviteLinks(orgId);

  // Tab state - 4 Clean Apple Tabs
  const [activeTab, setActiveTab] = React.useState<string>('general');
  const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);

  // Dynamic Tabs definition
  const tabs = React.useMemo(() => [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'members', label: 'Members & Roles', icon: Users },
    { id: 'billing', label: 'Subscriptions & Billing', icon: CreditCard },
    { id: 'danger', label: 'Danger Zone', icon: ShieldAlert },
  ], []);

  // Auto-switch tab if url params specify
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('confirmDelete') === 'true') {
      setActiveTab('danger');
      setIsDeleteModalOpen(true);
    } else {
      const tabParam = params.get('tab');
      if (tabParam && ['general', 'members', 'billing', 'danger'].includes(tabParam)) {
        setActiveTab(tabParam);
      }
    }
  }, []);

  // Ensure active tab is valid
  React.useEffect(() => {
    if (!tabs.find((t) => t.id === activeTab)) {
      setActiveTab('general');
    }
  }, [tabs, activeTab]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] min-h-0 md:min-h-[600px] overflow-hidden bg-transparent w-full">
      {/* Header */}
      <div className="px-4 md:px-8 pt-4 pb-3 border-b border-border/60 bg-transparent shrink-0">
        <h1 className="text-lg font-bold text-foreground tracking-tight flex items-center gap-2">
          Settings
        </h1>
      </div>

      {/* Main Split Grid Workspace */}
      <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-5 overflow-hidden px-4 md:px-8 py-3 min-h-0">
        
        {/* Navigation Sidebar (Apple SwiftUI Frosted Glass) */}
        <div className="w-full md:w-64 shrink-0 rounded-3xl p-3 md:p-4 bg-surface/80 dark:bg-card/60 backdrop-blur-2xl border border-border dark:border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-x-auto md:overflow-y-auto scrollbar-hide aether-scroll flex flex-row md:flex-col gap-1.5 md:gap-2 h-auto md:h-full">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-3 pb-1 select-none hidden md:block">
            Workspace Settings
          </p>
          <div className="flex flex-row md:flex-col gap-1 shrink-0 w-full">
            {tabs.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeTab === tab.id;
              const isDanger = tab.id === 'danger';
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex w-auto md:w-full items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold transition-all relative select-none cursor-pointer shrink-0 active:scale-[0.98]",
                    isActive
                      ? isDanger
                        ? "text-destructive font-bold"
                        : "text-primary dark:text-primary font-bold"
                      : isDanger
                        ? "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeSettingsTabBG"
                      className={cn(
                        "absolute inset-0 border rounded-2xl z-0",
                        isDanger
                          ? "bg-destructive/10 border-destructive/20"
                          : "bg-primary/10 border-primary/20"
                      )}
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                  <TabIcon className={cn("h-4 w-4 shrink-0 z-10 transition-colors", isActive ? (isDanger ? "text-destructive" : "text-primary") : "text-muted-foreground")} />
                  <span className="truncate z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Dynamic PWA Install CTA (Desktop only) */}
          {isInstallable && !isStandalone && (
            <div className="hidden md:flex flex-col gap-2.5 p-3.5 mt-auto rounded-2xl bg-secondary/40 border border-border relative overflow-hidden shrink-0">
              <div className="flex items-center gap-2 z-10">
                <Download className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-[10px] font-bold text-foreground">Desktop App</span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-normal mt-0.5 z-10 font-medium">Run in a dedicated borderless workspace.</p>
              <button
                onClick={install}
                className="w-full py-2 rounded-xl bg-primary hover:opacity-95 text-primary-foreground text-xs font-semibold transition-all active:scale-[0.98] cursor-pointer shadow-xs z-10"
              >
                Install App
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Tab Content Area (Frosted Canvas) */}
        <div className="flex-1 overflow-hidden rounded-3xl bg-surface/90 dark:bg-card/75 backdrop-blur-2xl border border-border dark:border-white/10 shadow-[0_4px_24px_rgba(0,0,0,0.03)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-4 md:p-6 flex flex-col h-full">
          <div className="flex-grow overflow-y-auto aether-scroll pr-1">
            <div className="max-w-3xl mx-auto w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-6"
                >
                  {activeTab === 'general' && localProfile && (
                    <GeneralSettingsView
                      org={localOrg}
                      profile={localProfile}
                      logout={logout}
                      themeId={themeId}
                      setTheme={setTheme}
                      loadingOrg={loadingOrg}
                    />
                  )}

                  {activeTab === 'members' && localProfile && (
                    <MembersRolesSettingsView
                      profile={localProfile}
                      members={members}
                      inviteLinks={inviteLinks}
                      invitesLoading={invitesLoading}
                      onOpenInvite={() => setIsInviteModalOpen(true)}
                    />
                  )}

                  {activeTab === 'billing' && localProfile && (
                    <BillingSettingsView profile={localProfile} />
                  )}

                  {activeTab === 'danger' && localProfile && (
                    <DangerZoneSettingsView
                      org={localOrg}
                      profile={localProfile}
                      logout={logout}
                      onOpenDeleteModal={() => setIsDeleteModalOpen(true)}
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

      {/* Workspace Deletion Safe Two-Step Confirmation Modal */}
      {localOrg && localProfile && (
        <WorkspaceDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          org={localOrg}
          profile={localProfile}
          logout={logout}
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
  phoneNumber?: string;
}

function ProfileSettingsView({ profile, logout }: { profile: UserProfile; logout: () => Promise<void> }) {
  const [fullName, setFullName] = React.useState(profile.fullName || '');
  const [username, setUsername] = React.useState(profile.username || '');
  const [designation, setDesignation] = React.useState(profile.designation || '');
  const [employeeId, setEmployeeId] = React.useState(profile.employeeId || '');
  const [age, setAge] = React.useState(profile.age ? String(profile.age) : '');
  const [phoneNumber, setPhoneNumber] = React.useState(profile.phoneNumber || '');

  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [errors, setErrors] = React.useState<FormError>({});
  const [generalError, setGeneralError] = React.useState<string | null>(null);

  // Password reset states
  const [resetLoading, setResetLoading] = React.useState(false);
  const [resetCooldown, setResetCooldown] = React.useState(0);
  const [resetMessage, setResetMessage] = React.useState('');
  const [resetMessageType, setResetMessageType] = React.useState<'success' | 'error'>('success');

  // Password reset cooldown countdown
  React.useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

  const handleSendPasswordReset = async () => {
    if (resetCooldown > 0) return;
    setResetLoading(true);
    setResetMessage('');
    try {
      await sendPasswordReset(profile.email);
      setResetCooldown(60);
      setResetMessageType('success');
      setResetMessage('Reset email sent.');
    } catch (err: any) {
      setResetMessageType('error');
      if (err?.code === 'auth/too-many-requests') {
        setResetMessage('Too many requests. Please wait.');
      } else {
        setResetMessage('Failed to send link.');
      }
    } finally {
      setResetLoading(false);
    }
  };

  // Profile photo states
  const [uploadingPhoto, setUploadingPhoto] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Profile deletion states
  const [deletingProfile, setDeletingProfile] = React.useState(false);
  const [confirmUsername, setConfirmUsername] = React.useState('');
  const [profileDeleteError, setProfileDeleteError] = React.useState<string | null>(null);

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert("Profile photo must be less than 5MB.");
      return;
    }
    setUploadingPhoto(true);
    setGeneralError(null);
    try {
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(file, 250, 250, 0.85);
        } catch (compressErr) {
          console.warn("Image compression failed, using original file:", compressErr);
        }
      }
      const url = await uploadProfileImage(profile.uid, fileToUpload);
      await updateUserProfile(profile.uid, { photoURL: url });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to upload photo:", err);
      alert(err.message || "Failed to upload profile photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = async () => {
    if (!confirm("Are you sure you want to remove your profile photo?")) return;
    setUploadingPhoto(true);
    setGeneralError(null);
    try {
      await updateUserProfile(profile.uid, { photoURL: "" });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to remove photo:", err);
      alert(err.message || "Failed to remove profile photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleDeleteProfile = async () => {
    if (confirmUsername !== profile.username) {
      alert('Confirmation failed. Please type your username exactly.');
      return;
    }
    setDeletingProfile(true);
    setProfileDeleteError(null);
    try {
      // 1. Delete Firestore user records
      await deleteUserProfile(profile.uid, profile.username, profile.organizationId);
      
      // 2. Attempt to delete Firebase Auth user
      try {
        await deleteCurrentUser();
      } catch (authErr: any) {
        console.warn('Failed to delete Auth user (may require recent login):', authErr);
      }
      
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
    setPhoneNumber(profile.phoneNumber || '');
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
    if (phoneNumber && !isValidPhoneNumber(phoneNumber)) nextErrors.phoneNumber = 'Please enter a valid phone number';

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
        phoneNumber: phoneNumber.trim(),
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

      {/* Premium Profile Photo Upload Block */}
      <div className="flex flex-col sm:flex-row items-center gap-5 p-5 rounded-3xl border border-border/60 bg-surface/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)] backdrop-blur-md">
        <div className="relative group shrink-0">
          <div
            onClick={() => !uploadingPhoto && fileInputRef.current?.click()}
            className="h-20 w-20 rounded-full flex items-center justify-center font-black text-white text-xl relative overflow-hidden shadow-lg border-2 border-white/15 cursor-pointer select-none transition-all hover:border-accent group-hover:scale-102"
            style={{
              background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.2) c h) 100%)`
            }}
          >
            <span className="absolute top-0 left-0 right-0 h-[45%] bg-white/10 rounded-t-full pointer-events-none" />
            {profile.photoURL ? (
              <img src={profile.photoURL} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              fullName ? fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
            )}

            {/* Hover Camera Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1 text-white">
              <Camera className="h-4 w-4" />
              <span className="text-[8px] font-black uppercase tracking-wider">Upload</span>
            </div>

            {/* Uploading Spinner */}
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-accent" />
              </div>
            )}
          </div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/*"
            className="hidden"
          />
        </div>

        <div className="space-y-1.5 text-center sm:text-left">
          <h3 className="text-xs font-bold text-foreground">Profile Picture</h3>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="px-3 py-1.5 bg-secondary border border-border rounded-lg text-[10px] font-black uppercase tracking-wider text-foreground hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer disabled:opacity-50"
            >
              Choose Photo
            </button>
            {profile.photoURL && (
              <button
                type="button"
                onClick={handleRemovePhoto}
                disabled={uploadingPhoto}
                className="px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-[10px] font-black uppercase tracking-wider text-red-400 hover:bg-red-500/20 hover:border-red-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                Remove Photo
              </button>
            )}
          </div>
        </div>
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
                "w-full px-3.5 py-2.5 rounded-xl border bg-secondary/40 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-white/[0.04] transition-all font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]",
                errors.fullName ? "border-red-500/40 focus:border-red-500/40" : "border-border"
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
                "w-full px-3.5 py-2.5 rounded-xl border bg-secondary/40 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-white/[0.04] transition-all font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]",
                errors.username ? "border-red-500/40 focus:border-red-500/40" : "border-border"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/40 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-white/[0.04] transition-all font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]"
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/40 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-white/[0.04] transition-all font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]"
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
                "w-full px-3.5 py-2.5 rounded-xl border bg-secondary/40 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-white/[0.04] transition-all font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]",
                errors.age ? "border-red-500/40 focus:border-red-500/40" : "border-border"
              )}
              placeholder="26"
            />
            {errors.age && <p className="text-[9px] text-red-500 font-bold">{errors.age}</p>}
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className={cn(
                "w-full px-3.5 py-2.5 rounded-xl border bg-secondary/40 text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-accent/40 focus:ring-2 focus:ring-accent/10 focus:bg-white/[0.04] transition-all font-semibold shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]",
                errors.phoneNumber ? "border-red-500/40 focus:border-red-500/40" : "border-border"
              )}
              placeholder="+1 (555) 000-0000"
            />
            {errors.phoneNumber && <p className="text-[9px] text-red-500 font-bold">{errors.phoneNumber}</p>}
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
              className="w-full px-3.5 py-2.5 rounded-xl border border-border/60 bg-white/[0.005] text-xs text-muted-foreground cursor-not-allowed outline-none font-semibold"
            />
          </div>

          {/* Password Security Block */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <div className="space-y-1.5">
              <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">
                Account Password
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={resetLoading || resetCooldown > 0}
                  className="px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-[11px] font-bold hover:bg-white/10 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 h-10"
                >
                  {resetLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  ) : resetCooldown > 0 ? (
                    <span>Reset Link Sent ({resetCooldown}s)</span>
                  ) : (
                    <span>Reset Password</span>
                  )}
                </button>
                {resetMessage && (
                  <span className={cn(
                    "text-[10px] font-bold transition-all",
                    resetMessageType === 'success' ? "text-emerald-400" : "text-red-400"
                  )}>
                    {resetMessage}
                  </span>
                )}
              </div>
            </div>
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
      {profile.role !== 'owner' && (
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

          <div className="space-y-3 max-w-md">
            <p className="text-[10px] text-muted-foreground font-semibold">
              To confirm profile deletion, please type your exact username <span className="font-bold text-foreground select-all">"{profile.username}"</span> below:
            </p>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={confirmUsername}
                onChange={(e) => setConfirmUsername(e.target.value)}
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-red-500/20 bg-secondary/40 text-xs text-foreground outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/10 transition-all font-semibold"
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
        </div>
      )}
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
              className="p-4 flex items-center justify-between gap-6 aether-glass bg-gradient-to-r from-white/[0.015] to-transparent border-border/60 hover:border-border rounded-2xl transition-all shadow-sm"
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
                    : "bg-secondary hover:bg-white/10 border-border",
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
                  : "border-border bg-surface/60 hover:border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.01)]"
              )}
              style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
            >
              {/* Top Swatch Row */}
              <div className="flex items-center justify-between gap-3 w-full mb-3 z-10">
                <div className="flex items-center gap-1.5 relative">
                  <div
                    className="h-6 w-6 rounded-full border border-border shrink-0 shadow-md relative z-10 overflow-hidden"
                    style={{ backgroundColor: theme.swatch }}
                  >
                    <span className="absolute top-0 left-0 right-0 h-[40%] bg-white/10 rounded-t-full pointer-events-none" />
                  </div>
                  <div
                    className="h-6 w-6 rounded-full border border-border shrink-0 shadow-md -ml-2.5 relative z-0 overflow-hidden"
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

      <div className="h-[1px] bg-white/10 my-6" />

      <div className="aether-glass border border-border dark:border-border/60 bg-surface/60 rounded-3xl p-6 text-left relative overflow-hidden">
        {/* Glow ambient light */}
        <div className="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-accent/5 blur-xl pointer-events-none" />
        
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <Info className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div className="space-y-1.5 flex-1">
            <h3 className="text-xs font-black uppercase text-foreground tracking-wider leading-none">Product Tour</h3>
            <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
              Need a quick refresher on how to navigate Guild and use its core operational features? You can restart the onboarding product tour at any time.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await updateUserProfile(profile.uid, { tourCompleted: false });
                    window.location.href = '/';
                  } catch (err) {
                    console.error('Failed to reset product tour status:', err);
                  }
                }}
                className="px-4 py-2 bg-accent text-accent-foreground rounded-xl text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-md"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                Restart Product Tour
              </button>
            </div>
          </div>
        </div>
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
    const order: Record<string, number> = { owner: 0, admin: 1, manager: 2, member: 3 };
    return [...members].sort((a, b) => {
      const ro = (order[a.role] ?? 3) - (order[b.role] ?? 3);
      if (ro !== 0) return ro;
      return (a.fullName || '').localeCompare(b.fullName || '');
    });
  }, [members]);

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
              className="p-4 flex flex-wrap items-center justify-between gap-4 aether-glass bg-gradient-to-r from-white/[0.015] to-transparent border-border/60 hover:border-border rounded-2xl transition-all shadow-sm"
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
                    {member.photoURL ? (
                      <img src={member.photoURL} alt={member.fullName} className="h-full w-full object-cover" />
                    ) : (
                      member.fullName ? member.fullName[0].toUpperCase() : '?'
                    )}
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-amber-500/20 bg-amber-500/10 text-[9px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                    <Crown className="h-3 w-3 shrink-0" /> Owner
                  </span>
                ) : isAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-violet-500/20 bg-violet-500/10 text-[9px] font-extrabold uppercase tracking-wider text-violet-600 dark:text-violet-400">
                    <ShieldCheck className="h-3 w-3 shrink-0" /> Admin
                  </span>
                ) : member.role === 'manager' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-emerald-500/20 bg-emerald-500/10 text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    <Users className="h-3 w-3 shrink-0" /> Manager
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded border border-sky-500/20 bg-sky-500/10 text-[9px] font-extrabold uppercase tracking-wider text-sky-600 dark:text-sky-400">
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
  onOpenInvite: () => void;
}

function InviteLinksSettingsView({ profile, inviteLinks, loading, members, onOpenInvite }: InviteLinksProps) {
  const [revoking, setRevoking] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (token: string) => {
    const url = `${window.location.origin}/join/${token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(token);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRevoke = async (token: string) => {
    if (!window.confirm('Are you sure you want to revoke this invite link?')) return;
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-foreground">Invite Links</h2>
        </div>
        <button
          onClick={onOpenInvite}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-accent text-accent-foreground rounded-xl text-xs font-bold hover:bg-accent/90 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
          style={{ background: 'var(--accent)' }}
        >
          <Plus className="h-3.5 w-3.5" /> Create Invite Link
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          <span className="text-xs font-bold">Synchronizing links…</span>
        </div>
      ) : inviteLinks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center border border-dashed border-border rounded-2xl bg-white/[0.01]">
          <Link2 className="h-7 w-7 text-muted-foreground opacity-50 mb-2" />
          <p className="text-xs font-bold text-foreground">No active invite tokens</p>
          <p className="text-[10px] text-muted-foreground mt-1 max-w-[240px] leading-relaxed font-semibold mb-4">
            Generate invite tokens on the Teammates directory or directly below
          </p>
          <button
            onClick={onOpenInvite}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-accent text-accent-foreground rounded-xl text-xs font-bold hover:bg-accent/90 hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer"
            style={{ background: 'var(--accent)' }}
          >
            <Plus className="h-3.5 w-3.5" /> Create Invite Link
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {inviteLinks.map((link) => {
            const now = Date.now();
            const isExpired = link.expiresAt.toMillis() < now;
            const isFullyUsed = link.maxUses !== null && link.useCount >= link.maxUses;
            const isActive = link.isActive && !isExpired && !isFullyUsed;
            const isRevoking = revoking === link.token;

            return (
              <motion.div
                key={link.token}
                whileHover={{ y: -2 }}
                className="p-4 flex flex-col justify-between gap-4 aether-glass bg-gradient-to-br from-white/[0.015] to-transparent border-border/60 hover:border-border rounded-2xl transition-all shadow-sm relative overflow-hidden"
              >
                <div className="space-y-3.5 z-10">
                  <div className="flex items-center justify-between gap-2 w-full">
                    {/* Status Badge */}
                    {!link.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded border border-border/60 bg-secondary text-[8px] font-black uppercase tracking-wider text-muted-foreground">Revoked</span>
                    ) : isFullyUsed ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded border border-border/60 bg-secondary text-[8px] font-black uppercase tracking-wider text-muted-foreground">Fully Used</span>
                    ) : isExpired ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded border border-red-500/10 bg-red-500/10 text-[8px] font-black uppercase tracking-wider text-red-400">Expired</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded border border-emerald-500/15 bg-emerald-500/10 text-[8px] font-black uppercase tracking-wider text-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.1)]">Active</span>
                    )}

                    {/* Actions */}
                    {isRevoking ? (
                      <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    ) : (
                      link.isActive && (
                        <button
                          onClick={() => handleRevoke(link.token)}
                          className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 rounded-lg transition-all cursor-pointer border border-transparent hover:border-red-500/10"
                          title="Revoke invite link"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )
                    )}
                  </div>

                  {/* Details about email / role */}
                  <div className="space-y-1 text-xs">
                    {link.email ? (
                      <div className="font-semibold text-foreground truncate">
                        Email Invite: <span className="font-mono text-accent">{link.email}</span>
                      </div>
                    ) : (
                      <div className="font-semibold text-foreground">
                        Shareable Link
                      </div>
                    )}
                    <div className="text-[10px] text-muted-foreground flex gap-3">
                      <span>Uses: <strong className="text-foreground">{link.useCount} / {link.maxUses !== null ? link.maxUses : '∞'}</strong></span>
                      <span>Expires: <strong className="text-foreground">{new Date(link.expiresAt.toMillis()).toLocaleDateString()}</strong></span>
                    </div>
                  </div>

                  {/* Token link box */}
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl border border-border/60 bg-white/[0.01] shadow-inner w-full overflow-hidden">
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

                <div className="flex justify-between items-center text-[9px] font-semibold text-muted-foreground border-t border-border/60 pt-3 z-10">
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
  const [domainAutoJoin, setDomainAutoJoin] = React.useState(!!org.domainAutoJoin);
  const [saving, setSaving] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isPublicDomain = React.useMemo(() => {
    const PUBLIC_DOMAINS = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
      'aol.com', 'icloud.com', 'mail.com', 'zoho.com', 'protonmail.com',
      'yandex.com', 'gmx.com'
    ];
    const domain = org.emailDomain || profile.email.substring(profile.email.lastIndexOf('@') + 1).toLowerCase();
    return PUBLIC_DOMAINS.includes(domain);
  }, [org.emailDomain, profile.email]);

  // Org logo states
  const [uploadingLogo, setUploadingLogo] = React.useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      alert("Workspace logo must be less than 5MB.");
      return;
    }
    setUploadingLogo(true);
    setError(null);
    try {
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        try {
          fileToUpload = await compressImage(file, 250, 250, 0.85);
        } catch (compressErr) {
          console.warn("Logo compression failed, using original file:", compressErr);
        }
      }
      const url = await uploadOrganizationPhoto(org.id, fileToUpload);
      await updateOrganizationDetails(org.id, { photoURL: url });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to upload organization logo:", err);
      alert(err.message || "Failed to upload workspace logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleRemoveLogo = async () => {
    if (!confirm("Are you sure you want to remove the Workspace logo?")) return;
    setUploadingLogo(true);
    setError(null);
    try {
      await updateOrganizationDetails(org.id, { photoURL: "" });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to remove logo:", err);
      alert(err.message || "Failed to remove workspace logo.");
    } finally {
      setUploadingLogo(false);
    }
  };

  // Sync state
  React.useEffect(() => {
    setName(org.name || '');
    setDomainAutoJoin(!!org.domainAutoJoin);
  }, [org]);

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setError(null);

    if (!name.trim()) {
      setError('Workspace Name is required');
      setSaving(false);
      return;
    }

    try {
      const computedDomain = org.emailDomain || profile.email.substring(profile.email.lastIndexOf('@') + 1).toLowerCase();
      await updateOrganizationDetails(org.id, {
        name: name.trim(),
        domainAutoJoin,
        emailDomain: computedDomain
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fluid-pop">
      <div>
        <h2 className="text-sm font-bold text-foreground">Workspace General Info</h2>
        <p className="text-xs text-muted-foreground mt-0.5 font-medium">Manage your workspace branding and sign-up domains</p>
      </div>

      {/* Workspace Logo Upload Block */}
      <div className="flex flex-col sm:flex-row items-center gap-5 p-6 rounded-3xl border border-border bg-secondary/30 dark:bg-card/50 backdrop-blur-md">
        <div className="relative group shrink-0">
          <div
            onClick={() => !uploadingLogo && logoInputRef.current?.click()}
            className="h-20 w-20 rounded-2xl flex items-center justify-center font-bold text-white text-xl relative overflow-hidden shadow-sm border border-border cursor-pointer select-none transition-all hover:opacity-90 active:scale-[0.98] bg-primary"
          >
            {org.photoURL ? (
              <img src={org.photoURL} alt={org.name} className="h-full w-full object-cover" />
            ) : (
              org.name ? org.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'
            )}

            {/* Hover Camera Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center gap-1 text-white">
              <Camera className="h-4 w-4" />
              <span className="text-[9px] font-bold uppercase tracking-wider">Change</span>
            </div>

            {/* Uploading Spinner */}
            {uploadingLogo && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </div>
          <input
            type="file"
            ref={logoInputRef}
            onChange={handleLogoSelect}
            accept="image/*"
            className="hidden"
          />
        </div>

        <div className="space-y-1.5 text-center sm:text-left">
          <h3 className="text-xs font-bold text-foreground">Workspace Logo</h3>
          <p className="text-xs text-muted-foreground font-medium">Recommended size: 250x250px (PNG, JPG, SVG)</p>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1.5">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              disabled={uploadingLogo}
              className="px-3.5 py-1.5 bg-secondary hover:bg-secondary/80 border border-border rounded-xl text-xs font-semibold text-foreground transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
            >
              Choose Logo
            </button>
            {org.photoURL && (
              <button
                type="button"
                onClick={handleRemoveLogo}
                disabled={uploadingLogo}
                className="px-3.5 py-1.5 bg-destructive/10 border border-destructive/20 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/20 transition-all cursor-pointer disabled:opacity-50 active:scale-[0.98]"
              >
                Remove Logo
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3.5 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-2xl flex items-start gap-2.5 animate-fluid-pop font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleUpdateWorkspace} className="space-y-5">
        <div className="grid grid-cols-1 gap-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/80 pl-1">Workspace Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-4 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none focus:ring-2 focus:ring-primary/25 focus:border-primary/50 transition-all"
              placeholder="e.g. Acme Corp"
            />
          </div>

          {/* Domain Auto-Join Toggle */}
          <div className="p-4 rounded-2xl border border-border bg-secondary/30 dark:bg-white/[0.02]">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={domainAutoJoin}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (checked && isPublicDomain) {
                    const domain = org.emailDomain || profile.email.substring(profile.email.lastIndexOf('@') + 1).toLowerCase();
                    const confirm = window.confirm(
                      `WARNING: You are enabling domain-based auto-join for a public email domain (${domain}). ` +
                      `This means ANYONE with a verified email ending in @${domain} can join your organization. ` +
                      `Are you sure you want to proceed?`
                    );
                    if (!confirm) return;
                  }
                  setDomainAutoJoin(checked);
                }}
                className="mt-0.5 h-4 w-4 rounded-md border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer"
              />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-foreground">Domain-based Auto-Join</span>
                <span className="text-xs text-muted-foreground font-medium leading-relaxed">
                  Allow users signing up with verified emails ending in <strong className="text-foreground">@{org.emailDomain || profile.email.substring(profile.email.lastIndexOf('@') + 1).toLowerCase()}</strong> to join this workspace automatically.
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 h-11 rounded-2xl bg-primary text-primary-foreground font-semibold text-xs hover:opacity-95 active:scale-[0.98] disabled:opacity-50 transition-all shadow-sm cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary-foreground" /> Saving…
              </>
            ) : success ? (
              <>
                <Check className="h-3.5 w-3.5 text-primary-foreground" /> Updated Workspace!
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── TAB VIEW: DANGER ZONE ───────────────────────────────────────────────────
interface DangerZoneProps {
  org: Organization | null;
  profile: UserProfile;
  logout: () => Promise<void>;
  onOpenDeleteModal: () => void;
}

function DangerZoneSettingsView({ org, profile, logout, onOpenDeleteModal }: DangerZoneProps) {
  const isOwner = profile.role === 'owner';
  const [stats, setStats] = React.useState<{
    members: number;
    channels: number;
    tasks: number;
    goals: number;
    projects: number;
    teams: number;
  } | null>(null);

  // Profile deletion states
  const [confirmUsername, setConfirmUsername] = React.useState('');
  const [deletingProfile, setDeletingProfile] = React.useState(false);
  const [profileDeleteError, setProfileDeleteError] = React.useState<string | null>(null);

  // Leaving workspace state
  const [leavingOrg, setLeavingOrg] = React.useState(false);

  React.useEffect(() => {
    if (!org?.id) return;
    const fetchStats = async () => {
      try {
        const [membersSnap, channelsSnap, tasksSnap, goalsSnap, projectsSnap, teamsSnap] = await Promise.all([
          getDocs(query(collection(db, 'organizationMembers'), where('orgId', '==', org.id))),
          getDocs(query(collection(db, 'channels'), where('orgId', '==', org.id))),
          getDocs(query(collection(db, 'tasks'), where('orgId', '==', org.id))),
          getDocs(query(collection(db, 'goals'), where('orgId', '==', org.id))),
          getDocs(query(collection(db, 'projects'), where('orgId', '==', org.id))),
          getDocs(query(collection(db, 'teams'), where('orgId', '==', org.id))),
        ]);
        setStats({
          members: membersSnap.size,
          channels: channelsSnap.size,
          tasks: tasksSnap.size,
          goals: goalsSnap.size,
          projects: projectsSnap.size,
          teams: teamsSnap.size,
        });
      } catch (err) {
        console.error('Failed to fetch workspace statistics:', err);
      }
    };
    fetchStats();
  }, [org?.id]);

  const handleDeleteProfile = async () => {
    if (confirmUsername !== profile.username) return;
    setDeletingProfile(true);
    setProfileDeleteError(null);
    try {
      await deleteUserProfile(profile.uid, profile.username, profile.organizationId);
      try {
        await deleteCurrentUser();
      } catch (authErr) {
        console.warn('Failed to delete Auth user:', authErr);
      }
      await logout();
      window.location.href = '/signup';
    } catch (err: any) {
      console.error('Failed to delete profile', err);
      setProfileDeleteError(err.message || 'Failed to delete profile.');
    } finally {
      setDeletingProfile(false);
    }
  };

  const handleLeaveWorkspace = async () => {
    if (!window.confirm('Are you sure you want to leave this workspace? You will need an invite link to rejoin.')) return;
    setLeavingOrg(true);
    try {
      await removeUserFromOrg(profile.uid);
      window.location.href = '/onboarding';
    } catch (err: any) {
      alert('Failed to leave workspace. Please try again.');
    } finally {
      setLeavingOrg(false);
    }
  };

  return (
    <div className="space-y-6 text-left animate-fluid-pop">
      <div>
        <h2 className="text-sm font-bold text-foreground">Danger Zone</h2>
        <p className="text-xs text-muted-foreground mt-0.5 font-medium">
          Destructive operations and permanent workspace management
        </p>
      </div>

      {/* Owner Workspace Deletion Card */}
      {isOwner && org && (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/[0.03] dark:bg-destructive/[0.08] p-6 sm:p-7 relative overflow-hidden shadow-xs">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center shrink-0">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground">Delete Workspace</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-medium">
                Permanently delete <strong className="text-foreground">{org.name}</strong>, including all channels, projects, tasks, goals, teams, and member records. This cannot be undone.
              </p>

              {/* Items preview */}
              {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 my-4">
                  <div className="p-2.5 rounded-xl border border-border bg-surface/70 dark:bg-card/70 flex items-center gap-2">
                    <Folder className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="text-xs font-semibold text-foreground">{stats.projects} Projects</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border bg-surface/70 dark:bg-card/70 flex items-center gap-2">
                    <CheckSquare className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="text-xs font-semibold text-foreground">{stats.tasks} Tasks</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border bg-surface/70 dark:bg-card/70 flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="text-xs font-semibold text-foreground">{stats.goals} Goals</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border bg-surface/70 dark:bg-card/70 flex items-center gap-2">
                    <Workflow className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="text-xs font-semibold text-foreground">{stats.teams} Teams</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border bg-surface/70 dark:bg-card/70 flex items-center gap-2">
                    <MessageSquare className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="text-xs font-semibold text-foreground">{stats.channels} Channels</span>
                  </div>
                  <div className="p-2.5 rounded-xl border border-border bg-surface/70 dark:bg-card/70 flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="text-xs font-semibold text-foreground">{stats.members} Members</span>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onOpenDeleteModal}
                  className="px-5 py-2.5 rounded-2xl bg-destructive text-destructive-foreground hover:opacity-95 text-xs font-semibold transition-all shadow-xs flex items-center gap-2 active:scale-[0.98] cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Workspace…
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Non-Owner: Leave Workspace Card */}
      {!isOwner && (
        <div className="rounded-3xl border border-border bg-secondary/30 p-6 relative overflow-hidden">
          <div className="flex items-start gap-4">
            <div className="h-11 w-11 rounded-2xl bg-secondary border border-border text-foreground flex items-center justify-center shrink-0">
              <UserMinus className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-foreground">Leave Workspace</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-medium">
                Remove your account from this organization. You will lose access to team channels, tasks, and documents until invited again.
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleLeaveWorkspace}
                  disabled={leavingOrg}
                  className="px-5 py-2.5 rounded-2xl border border-border bg-surface hover:bg-secondary text-foreground text-xs font-semibold transition-all shadow-xs flex items-center gap-2 active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {leavingOrg ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserMinus className="h-4 w-4" />}
                  Leave Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Personal Profile Deletion Card */}
      <div className="rounded-3xl border border-destructive/20 bg-surface/80 dark:bg-card/60 p-6 relative overflow-hidden">
        <div className="flex items-start gap-4">
          <div className="h-11 w-11 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center shrink-0">
            <Trash2 className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-foreground">Delete Personal Profile</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed font-medium">
              Permanently remove your account details, identity, and personal records from Guild. Your username will become available for others.
            </p>

            <div className="space-y-3 max-w-md mt-4">
              <p className="text-xs text-muted-foreground font-medium">
                To confirm, type your username <code className="font-mono text-foreground font-bold bg-secondary px-1.5 py-0.5 rounded-md">"{profile.username}"</code>:
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={confirmUsername}
                  onChange={(e) => setConfirmUsername(e.target.value)}
                  className="flex-1 h-11 px-4 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] text-xs font-medium text-foreground outline-none focus:border-destructive/50 focus:ring-2 focus:ring-destructive/20 transition-all"
                  placeholder="Type your username"
                />
                <button
                  type="button"
                  onClick={handleDeleteProfile}
                  disabled={deletingProfile || confirmUsername !== profile.username}
                  className="h-11 px-5 bg-destructive hover:opacity-95 disabled:opacity-40 text-destructive-foreground rounded-2xl text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0 active:scale-[0.98]"
                >
                  {deletingProfile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete Profile
                </button>
              </div>
              {profileDeleteError && (
                <p className="text-xs text-destructive font-semibold mt-1.5">{profileDeleteError}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── WORKSPACE DELETION MODAL (SAFE TWO-STEP CONFIRMATION) ───────────────────
interface WorkspaceDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  org: Organization;
  profile: UserProfile;
  logout: () => Promise<void>;
  stats?: {
    members: number;
    channels: number;
    tasks: number;
    goals: number;
    projects: number;
    teams: number;
  } | null;
}

function WorkspaceDeleteModal({ isOpen, onClose, org, profile, logout, stats: initialStats }: WorkspaceDeleteModalProps) {
  const [step, setStep] = React.useState<1 | 2>(1);
  const [confirmName, setConfirmName] = React.useState('');
  const [passwordInput, setPasswordInput] = React.useState('');
  const [reauthError, setReauthError] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [stats, setStats] = React.useState(initialStats || null);

  const currentUser = getCurrentUser();
  const isGoogleUser = currentUser?.providerData.some(p => p.providerId === 'google.com') ?? false;

  React.useEffect(() => {
    if (isOpen) {
      setStep(1);
      setConfirmName('');
      setPasswordInput('');
      setReauthError(null);
      setDeleting(false);

      if (!initialStats && org?.id) {
        Promise.all([
          getDocs(query(collection(db, 'organizationMembers'), where('orgId', '==', org.id))),
          getDocs(query(collection(db, 'channels'), where('orgId', '==', org.id))),
          getDocs(query(collection(db, 'tasks'), where('orgId', '==', org.id))),
          getDocs(query(collection(db, 'goals'), where('orgId', '==', org.id))),
          getDocs(query(collection(db, 'projects'), where('orgId', '==', org.id))),
          getDocs(query(collection(db, 'teams'), where('orgId', '==', org.id))),
        ]).then(([membersSnap, channelsSnap, tasksSnap, goalsSnap, projectsSnap, teamsSnap]) => {
          setStats({
            members: membersSnap.size,
            channels: channelsSnap.size,
            tasks: tasksSnap.size,
            goals: goalsSnap.size,
            projects: projectsSnap.size,
            teams: teamsSnap.size,
          });
        }).catch(err => console.error('Failed to load stats for deletion modal:', err));
      }
    }
  }, [isOpen, org?.id, initialStats]);

  if (!isOpen) return null;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmName !== org.name) {
      setReauthError('Please type the workspace name exactly as shown.');
      return;
    }

    setDeleting(true);
    setReauthError(null);

    try {
      if (isGoogleUser) {
        await reauthenticateGoogle();
      } else {
        if (!passwordInput.trim()) {
          setReauthError('Owner account password is required.');
          setDeleting(false);
          return;
        }
        await reauthenticatePassword(passwordInput);
      }

      await deleteOrganization(org.id, profile.uid);
      await logout();
      window.location.href = '/signup';
    } catch (err: any) {
      console.error('Failed to delete organization:', err);
      setReauthError(err.message || 'Re-authentication failed. Please check your credentials.');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="w-full max-w-lg rounded-3xl bg-surface dark:bg-card border border-destructive/30 shadow-[0_20px_60px_rgba(0,0,0,0.5)] p-6 sm:p-8 relative overflow-hidden"
      >
        {/* Step 1: Impact review */}
        {step === 1 && (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center">
              <div className="h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mb-4">
                <ShieldAlert className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Delete "{org.name}"?
              </h2>
              <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                Step 1 of 2: Impact Review
              </div>
              <p className="text-xs text-muted-foreground mt-3 font-medium leading-relaxed max-w-sm">
                This action is immediate and completely permanent. All workspace resources will be wiped and cannot be recovered.
              </p>
            </div>

            {/* Impact Grid */}
            {stats && (
              <div className="p-4 rounded-2xl border border-destructive/20 bg-destructive/[0.03] space-y-2.5 text-left">
                <span className="text-[11px] font-semibold text-foreground/80 block uppercase tracking-wider">
                  Items to be permanently erased:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface/80 dark:bg-card/80 border border-border">
                    <Folder className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="font-semibold text-foreground">{stats.projects} Projects</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface/80 dark:bg-card/80 border border-border">
                    <CheckSquare className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="font-semibold text-foreground">{stats.tasks} Tasks</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface/80 dark:bg-card/80 border border-border">
                    <Target className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="font-semibold text-foreground">{stats.goals} Goals</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface/80 dark:bg-card/80 border border-border">
                    <Workflow className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="font-semibold text-foreground">{stats.teams} Teams</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface/80 dark:bg-card/80 border border-border">
                    <MessageSquare className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="font-semibold text-foreground">{stats.channels} Channels</span>
                  </div>
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-surface/80 dark:bg-card/80 border border-border">
                    <Users className="h-3.5 w-3.5 text-destructive shrink-0" />
                    <span className="font-semibold text-foreground">{stats.members} Members</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-11 rounded-2xl border border-border bg-transparent hover:bg-secondary text-foreground text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 h-11 rounded-2xl bg-destructive text-destructive-foreground hover:opacity-95 text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.98]"
              >
                I Understand, Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Verification and typing name */}
        {step === 2 && (
          <form onSubmit={handleDelete} className="space-y-5">
            <div className="flex flex-col items-center text-center">
              <div className="h-12 w-12 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-center mb-3">
                <Trash2 className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-foreground">
                Authorize Deletion
              </h2>
              <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs font-semibold">
                Step 2 of 2: Final Authorization
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium leading-relaxed">
                Confirm your identity and type the organization name exactly to authorize deletion.
              </p>
            </div>

            {reauthError && (
              <div className="p-3.5 rounded-2xl border border-destructive/20 bg-destructive/10 text-destructive text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{reauthError}</span>
              </div>
            )}

            <div className="space-y-4">
              {/* Reauthentication field */}
              {!isGoogleUser ? (
                <div className="space-y-1.5 text-left">
                  <label htmlFor="owner-auth-password" className="text-xs font-semibold text-foreground/80 pl-1">
                    Owner Password
                  </label>
                  <input
                    id="owner-auth-password"
                    type="password"
                    required
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    disabled={deleting}
                    placeholder="Enter your account password"
                    className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-destructive/30 focus:border-destructive transition-all"
                  />
                </div>
              ) : (
                <div className="p-3 rounded-2xl border border-border bg-secondary/40 text-xs text-muted-foreground font-medium text-left">
                  You will be prompted to re-authenticate with your connected Google account.
                </div>
              )}

              {/* Type org name confirmation */}
              <div className="space-y-1.5 text-left">
                <label htmlFor="confirm-org-name" className="text-xs font-semibold text-foreground/80 pl-1">
                  Type <span className="font-mono font-bold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md select-all">{org.name}</span> to confirm:
                </label>
                <input
                  id="confirm-org-name"
                  type="text"
                  required
                  value={confirmName}
                  onChange={(e) => setConfirmName(e.target.value)}
                  disabled={deleting}
                  placeholder="Type workspace name exactly"
                  className="w-full h-11 rounded-2xl border border-border bg-secondary/50 dark:bg-white/[0.04] px-4 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-destructive/30 focus:border-destructive transition-all"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={deleting}
                className="h-11 px-4 rounded-2xl border border-border bg-transparent hover:bg-secondary text-foreground text-xs font-semibold transition-all cursor-pointer active:scale-[0.98]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={deleting || confirmName !== org.name || (!isGoogleUser && !passwordInput.trim())}
                className="flex-1 h-11 rounded-2xl bg-destructive text-destructive-foreground hover:opacity-95 text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-destructive-foreground" />
                    Deleting Workspace…
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    Permanently Delete Workspace
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

// ─── TAB VIEW: GENERAL (UNIFIED SUITE) ────────────────────────────────────────
interface GeneralSettingsProps {
  org: Organization | null;
  profile: UserProfile;
  logout: () => Promise<void>;
  themeId: string;
  setTheme: (id: any) => void;
  loadingOrg: boolean;
}

function GeneralSettingsView({ org, profile, logout, themeId, setTheme, loadingOrg }: GeneralSettingsProps) {
  const isAdminOrOwner = profile.role === 'admin' || profile.role === 'owner';
  const [subTab, setSubTab] = React.useState<'workspace' | 'profile' | 'preferences'>(
    isAdminOrOwner ? 'workspace' : 'profile'
  );

  return (
    <div className="space-y-6">
      {/* Sub-navigation segmented control */}
      <div className="flex items-center gap-1.5 p-1 bg-secondary/60 dark:bg-white/[0.04] rounded-2xl border border-border w-fit max-w-full overflow-x-auto scrollbar-hide">
        {isAdminOrOwner && (
          <button
            type="button"
            onClick={() => setSubTab('workspace')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 active:scale-[0.98]",
              subTab === 'workspace'
                ? "bg-surface dark:bg-card text-foreground shadow-xs font-bold"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Workspace Info
          </button>
        )}
        <button
          type="button"
          onClick={() => setSubTab('profile')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 active:scale-[0.98]",
            subTab === 'profile'
              ? "bg-surface dark:bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          My Profile
        </button>
        <button
          type="button"
          onClick={() => setSubTab('preferences')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 active:scale-[0.98]",
            subTab === 'preferences'
              ? "bg-surface dark:bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Appearance & Notifications
        </button>
      </div>

      {subTab === 'workspace' && isAdminOrOwner && (
        loadingOrg ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-xs font-bold">Synchronizing workspace details…</span>
          </div>
        ) : org ? (
          <WorkspaceSettingsView org={org} profile={profile} logout={logout} />
        ) : (
          <div className="rounded-3xl p-6 border border-destructive/20 bg-destructive/5 text-destructive text-xs">
            Workspace details not found.
          </div>
        )
      )}

      {subTab === 'profile' && (
        <ProfileSettingsView profile={profile} logout={logout} />
      )}

      {subTab === 'preferences' && (
        <div className="space-y-6">
          <AppearanceSettingsView profile={profile} themeId={themeId} setTheme={setTheme} />
          <NotificationSettingsView profile={profile} />
        </div>
      )}
    </div>
  );
}

// ─── TAB VIEW: MEMBERS & ROLES ───────────────────────────────────────────────
interface MembersRolesProps {
  profile: UserProfile;
  members: UserProfile[];
  inviteLinks: InviteLink[];
  invitesLoading: boolean;
  onOpenInvite: () => void;
}

function MembersRolesSettingsView({ profile, members, inviteLinks, invitesLoading, onOpenInvite }: MembersRolesProps) {
  const [subTab, setSubTab] = React.useState<'members' | 'invites' | 'teams'>('members');

  return (
    <div className="space-y-6">
      {/* Sub-navigation segmented control */}
      <div className="flex items-center gap-1.5 p-1 bg-secondary/60 dark:bg-white/[0.04] rounded-2xl border border-border w-fit max-w-full overflow-x-auto scrollbar-hide">
        <button
          type="button"
          onClick={() => setSubTab('members')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 active:scale-[0.98]",
            subTab === 'members'
              ? "bg-surface dark:bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Directory & Roles
        </button>
        <button
          type="button"
          onClick={() => setSubTab('invites')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 active:scale-[0.98]",
            subTab === 'invites'
              ? "bg-surface dark:bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Invite Links
        </button>
        <button
          type="button"
          onClick={() => setSubTab('teams')}
          className={cn(
            "px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shrink-0 active:scale-[0.98]",
            subTab === 'teams'
              ? "bg-surface dark:bg-card text-foreground shadow-xs font-bold"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Teams & Structure
        </button>
      </div>

      {subTab === 'members' && (
        <MembersSettingsView
          profile={profile}
          members={members}
          onOpenInvite={onOpenInvite}
        />
      )}

      {subTab === 'invites' && (
        <InviteLinksSettingsView
          profile={profile}
          inviteLinks={inviteLinks}
          loading={invitesLoading}
          members={members}
          onOpenInvite={onOpenInvite}
        />
      )}

      {subTab === 'teams' && (
        <TeamsSettingsView
          profile={profile}
          members={members}
        />
      )}
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
      <div className="flex gap-1.5 p-1 bg-secondary/40 rounded-xl border border-border self-start w-fit shadow-[inset_0_1px_2px_rgba(255,255,255,0.02)]">
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
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/40 text-xs text-foreground outline-none focus:border-accent/40 font-semibold"
                  />
                </div>
                <div className="space-y-1.5">
                  <SearchableSelect
                    value={teamManager}
                    onChange={setTeamManager}
                    options={members.map((m) => ({
                      value: m.uid,
                      label: m.fullName || m.username,
                      detail: m.designation || 'Member',
                      photoURL: m.photoURL,
                    }))}
                    placeholder="-- Assign Lead --"
                    triggerClassName="border-border bg-secondary/40 hover:border-accent/40 font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Description</label>
                <input
                  type="text"
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  placeholder="e.g. Responsible for user acquisition..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/40 text-xs text-foreground outline-none focus:border-accent/40 font-semibold"
                />
              </div>

              {/* Members Selection List */}
              <div className="space-y-2">
                <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Assign Members</label>
                <div className="border border-border rounded-xl p-3 max-h-40 overflow-y-auto bg-white/[0.01] dark:bg-white/[0.005] grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-inner custom-scrollbar">
                  {members.map((m) => (
                    <label key={m.uid} className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary rounded-lg cursor-pointer text-xs font-semibold">
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
                  className="px-4 py-2 border border-border bg-secondary rounded-xl text-xs font-bold text-foreground cursor-pointer"
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
            <div className="text-center py-10 border border-dashed border-border rounded-2xl bg-white/[0.01]">
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
                            className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/40 text-xs text-foreground outline-none focus:border-accent/40 font-semibold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <SearchableSelect
                            value={editManager}
                            onChange={setEditManager}
                            options={members.map((m) => ({
                              value: m.uid,
                              label: m.fullName || m.username,
                              detail: m.designation || 'Member',
                              photoURL: m.photoURL,
                            }))}
                            placeholder="-- Select Lead --"
                            triggerClassName="border-border bg-secondary/40 hover:border-accent/40 font-bold"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Description</label>
                        <input
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          placeholder="Team description..."
                          className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-secondary/40 text-xs text-foreground outline-none focus:border-accent/40 font-semibold"
                        />
                      </div>

                      {/* Members Selection List */}
                      <div className="space-y-2">
                        <label className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Assign Members</label>
                        <div className="border border-border rounded-xl p-3 max-h-40 overflow-y-auto bg-white/[0.01] dark:bg-white/[0.005] grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-inner custom-scrollbar">
                          {members.map((m) => (
                            <label key={m.uid} className="flex items-center gap-2 px-2 py-1.5 hover:bg-secondary rounded-lg cursor-pointer text-xs font-semibold">
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
                          className="px-4 py-2 border border-border bg-secondary rounded-xl text-xs font-bold text-foreground cursor-pointer"
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
                    className="p-5 border border-border bg-gradient-to-br from-white/[0.02] to-transparent rounded-2xl shadow-sm hover:shadow-[0_4px_20px_oklch(from_var(--accent)_l_c_h_/_8%)] hover:border-accent/30 transition-all duration-300 flex flex-col justify-between"
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
                            className="px-2.5 py-1.5 text-[9px] font-extrabold border border-border rounded-xl hover:bg-white/10 text-foreground transition-all cursor-pointer shadow-sm"
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

                      <div className="space-y-2 border-t border-border/60 pt-3.5 mt-3">
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
                  className="p-4 flex flex-wrap items-center justify-between gap-4 aether-glass bg-gradient-to-r from-white/[0.015] to-transparent border-border/60 hover:border-border rounded-2xl transition-all shadow-sm"
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
                            : "bg-secondary text-muted-foreground border-border hover:bg-white/10"
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
                      <SearchableSelect
                        value={m.managerId || 'none'}
                        onChange={(val) => handleLineManagerChange(m.uid, val)}
                        options={[
                          { value: 'none', label: 'No Manager' },
                          ...potentialManagers.map((pm) => ({
                            value: pm.uid,
                            label: pm.fullName || pm.username,
                            detail: pm.designation || 'Member',
                            photoURL: pm.photoURL,
                          })),
                        ]}
                        placeholder="No Manager"
                        triggerClassName="bg-secondary/40 border border-border text-[11px] font-bold text-foreground rounded-lg px-2.5 py-1.5 hover:border-accent/40 max-w-[170px] truncate cursor-pointer shadow-inner"
                      />
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

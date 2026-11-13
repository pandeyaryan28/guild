import * as React from 'react';
import {
  Lock,
  Users,
  Globe,
  UserPlus,
  X,
  Check,
  Shield,
  Edit3,
  Eye,
  Trash2,
  Copy,
  Search,
  GitBranch,
  Crown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@guild/utils';
import type {
  WorkspaceDocument,
  CanvasVisibility,
  CanvasAccessRole,
  UserProfile
} from '@guild/types';

interface CanvasAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: WorkspaceDocument;
  currentUserId: string;
  canManageAccess: boolean;
  orgMembers: UserProfile[];
  childCount: number;
  onUpsertCollaborator: (
    docId: string,
    targetUser: {
      uid: string;
      fullName: string;
      email: string;
      photoURL?: string;
      designation?: string;
    },
    role: CanvasAccessRole,
    cascadeToChildren?: boolean
  ) => Promise<void>;
  onRemoveCollaborator: (
    docId: string,
    targetUid: string,
    cascadeToChildren?: boolean
  ) => Promise<void>;
  onSetVisibility: (
    docId: string,
    visibility: CanvasVisibility,
    cascadeToChildren?: boolean
  ) => Promise<void>;
}

const ROLE_OPTIONS: {
  value: CanvasAccessRole;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: 'admin',
    label: 'Full Access',
    desc: 'Can edit content and manage who has access',
    icon: Shield
  },
  {
    value: 'edit',
    label: 'Can Edit',
    desc: 'Can edit blocks, sub-pages, and databases, but cannot change sharing',
    icon: Edit3
  },
  {
    value: 'view',
    label: 'Can View',
    desc: 'Read-only access to this canvas and its databases',
    icon: Eye
  }
];

export function CanvasAccessModal({
  isOpen,
  onClose,
  document,
  currentUserId,
  canManageAccess,
  orgMembers,
  childCount,
  onUpsertCollaborator,
  onRemoveCollaborator,
  onSetVisibility
}: CanvasAccessModalProps) {
  const [memberSearch, setMemberSearch] = React.useState('');
  const [selectedRole, setSelectedRole] = React.useState<CanvasAccessRole>('edit');
  const [cascadeToChildren, setCascadeToChildren] = React.useState(true);
  const [busyUid, setBusyUid] = React.useState<string | null>(null);
  const [copiedLink, setCopiedLink] = React.useState(false);

  const visibility: CanvasVisibility = document.visibility || 'private';

  // Collaborators list excluding creator
  const collaborators = React.useMemo(() => {
    const list = document.collaborators || [];
    return list.filter((c) => c.uid !== document.createdBy);
  }, [document.collaborators, document.createdBy]);

  // Creator profile from orgMembers or fallback
  const creatorProfile = React.useMemo(() => {
    const found = orgMembers.find((m) => m.uid === document.createdBy);
    if (found) return found;
    const fromCollab = (document.collaborators || []).find((c) => c.uid === document.createdBy);
    return {
      uid: document.createdBy,
      fullName: fromCollab?.fullName || document.createdByName || 'Canvas Creator',
      email: fromCollab?.email || '',
      photoURL: fromCollab?.photoURL || document.createdByAvatar,
      designation: fromCollab?.designation || 'Owner'
    };
  }, [orgMembers, document]);

  // Filter org members available to invite
  const inviteCandidates = React.useMemo(() => {
    const existingUids = new Set<string>([
      document.createdBy,
      ...collaborators.map((c) => c.uid)
    ]);
    const available = orgMembers.filter((m) => !existingUids.has(m.uid));
    if (!memberSearch.trim()) return available.slice(0, 6);
    const q = memberSearch.toLowerCase();
    return available
      .filter(
        (m) =>
          m.fullName?.toLowerCase().includes(q) ||
          m.email?.toLowerCase().includes(q) ||
          m.designation?.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [orgMembers, document.createdBy, collaborators, memberSearch]);

  const handleInviteMember = async (member: UserProfile) => {
    if (!canManageAccess) return;
    setBusyUid(member.uid);
    try {
      await onUpsertCollaborator(
        document.id,
        {
          uid: member.uid,
          fullName: member.fullName || member.username || 'Member',
          email: member.email || '',
          photoURL: member.photoURL,
          designation: member.designation
        },
        selectedRole,
        cascadeToChildren
      );
      setMemberSearch('');
    } finally {
      setBusyUid(null);
    }
  };

  const handleChangeRole = async (
    collab: {
      uid: string;
      fullName: string;
      email: string;
      photoURL?: string;
      designation?: string;
    },
    nextRole: CanvasAccessRole
  ) => {
    if (!canManageAccess) return;
    setBusyUid(collab.uid);
    try {
      await onUpsertCollaborator(document.id, collab, nextRole, cascadeToChildren);
    } finally {
      setBusyUid(null);
    }
  };

  const handleRemove = async (uid: string) => {
    if (!canManageAccess) return;
    setBusyUid(uid);
    try {
      await onRemoveCollaborator(document.id, uid, cascadeToChildren);
    } finally {
      setBusyUid(null);
    }
  };

  const handleVisibilityChange = async (nextVis: CanvasVisibility) => {
    if (!canManageAccess) return;
    await onSetVisibility(document.id, nextVis, cascadeToChildren);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?docId=${document.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/45 dark:bg-black/65 backdrop-blur-sm"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 360, damping: 28 }}
            className="relative w-full max-w-lg rounded-3xl bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong shadow-2xl overflow-hidden z-10 select-none"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'w-9 h-9 rounded-2xl flex items-center justify-center border shrink-0',
                    visibility === 'private'
                      ? 'bg-amber-500/10 border-amber-500/25 text-amber-600 dark:text-amber-400'
                      : visibility === 'shared'
                      ? 'bg-primary/10 border-primary/25 text-primary'
                      : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {visibility === 'private' ? (
                    <Lock className="w-4 h-4" />
                  ) : visibility === 'shared' ? (
                    <Users className="w-4 h-4" />
                  ) : (
                    <Globe className="w-4 h-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">
                    Share &ldquo;{document.title || 'Untitled Canvas'}&rdquo;
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {visibility === 'private'
                      ? 'Private — Only you can access this canvas'
                      : visibility === 'shared'
                      ? `Shared with ${collaborators.length} selected ${
                          collaborators.length === 1 ? 'person' : 'people'
                        }`
                      : 'Visible to everyone in your organization'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
              {/* Visibility Level Segmented Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Canvas Access Level
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-secondary/60 dark:bg-secondary/35 border border-border">
                  {(
                    [
                      {
                        id: 'private' as const,
                        label: 'Private',
                        sub: 'Only Creator',
                        icon: Lock
                      },
                      {
                        id: 'shared' as const,
                        label: 'Selected People',
                        sub: 'Invite List',
                        icon: Users
                      },
                      {
                        id: 'workspace' as const,
                        label: 'Organization',
                        sub: 'All Members',
                        icon: Globe
                      }
                    ] as const
                  ).map((item) => {
                    const Icon = item.icon;
                    const active = visibility === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        disabled={!canManageAccess}
                        onClick={() => handleVisibilityChange(item.id)}
                        className={cn(
                          'flex flex-col items-start gap-0.5 p-2.5 rounded-xl text-left transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed',
                          active
                            ? 'bg-surface text-foreground shadow-sm border border-border'
                            : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        <div className="flex items-center gap-1.5 text-xs font-bold">
                          <Icon className={cn('w-3.5 h-3.5', active && 'text-primary')} />
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{item.sub}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Add People Search & Role Selector */}
              {canManageAccess && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <UserPlus className="w-3 h-3 text-primary" />
                      Add People to Canvas
                    </label>

                    {/* Default Role Pill */}
                    <div className="flex items-center gap-1 bg-secondary/70 dark:bg-secondary/40 p-0.5 rounded-lg border border-border">
                      {ROLE_OPTIONS.map((r) => (
                        <button
                          key={r.value}
                          type="button"
                          onClick={() => setSelectedRole(r.value)}
                          className={cn(
                            'px-2 py-0.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer',
                            selectedRole === r.value
                              ? 'bg-surface text-primary shadow-2xs'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Input */}
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search teammates by name, email, or role..."
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-secondary/50 dark:bg-secondary/30 border border-border text-xs text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Candidate Suggestions List */}
                  {inviteCandidates.length > 0 && (
                    <div className="rounded-2xl border border-border bg-secondary/25 dark:bg-secondary/15 divide-y divide-border/50 max-h-44 overflow-y-auto custom-scrollbar">
                      {inviteCandidates.map((member) => (
                        <div
                          key={member.uid}
                          className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-secondary/60 transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                              {member.photoURL ? (
                                <img
                                  src={member.photoURL}
                                  alt={member.fullName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <span>{(member.fullName || 'U').charAt(0).toUpperCase()}</span>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground truncate">
                                {member.fullName}
                              </div>
                              <div className="text-[10px] text-muted-foreground truncate">
                                {member.designation || member.email}
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={busyUid === member.uid}
                            onClick={() => handleInviteMember(member)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary text-primary-foreground text-[11px] font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Grant {ROLE_OPTIONS.find((r) => r.value === selectedRole)?.label}</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* People with Access List */}
              <div className="space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  People with Access ({1 + collaborators.length})
                </div>

                <div className="rounded-2xl border border-border bg-surface/60 divide-y divide-border/60">
                  {/* Creator Row */}
                  <div className="flex items-center justify-between gap-2 px-3.5 py-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                        {creatorProfile.photoURL ? (
                          <img
                            src={creatorProfile.photoURL}
                            alt={creatorProfile.fullName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span>{(creatorProfile.fullName || 'O').charAt(0).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-foreground truncate">
                            {creatorProfile.fullName}
                          </span>
                          {creatorProfile.uid === currentUserId && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-semibold">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {creatorProfile.email || creatorProfile.designation || 'Canvas Creator'}
                        </div>
                      </div>
                    </div>

                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold shrink-0">
                      <Crown className="w-3 h-3" />
                      Creator • Owner
                    </span>
                  </div>

                  {/* Invited Collaborators */}
                  {collaborators.map((collab) => {
                    const currentRole =
                      document.permissions?.[collab.uid] || collab.role || 'view';
                    return (
                      <div
                        key={collab.uid}
                        className="flex items-center justify-between gap-2 px-3.5 py-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0 overflow-hidden">
                            {collab.photoURL ? (
                              <img
                                src={collab.photoURL}
                                alt={collab.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{(collab.fullName || 'U').charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground truncate">
                                {collab.fullName}
                              </span>
                              {collab.uid === currentUserId && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-primary/10 text-primary font-semibold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {collab.designation || collab.email}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {canManageAccess ? (
                            <>
                              <select
                                value={currentRole}
                                disabled={busyUid === collab.uid}
                                onChange={(e) =>
                                  handleChangeRole(collab, e.target.value as CanvasAccessRole)
                                }
                                className="text-[11px] font-semibold bg-secondary/70 dark:bg-secondary/40 border border-border rounded-lg px-2 py-1 text-foreground outline-none focus:border-primary cursor-pointer"
                              >
                                {ROLE_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={busyUid === collab.uid}
                                onClick={() => handleRemove(collab.uid)}
                                className="p-1.5 rounded-lg text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Revoke access"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <span className="text-[11px] font-semibold text-muted-foreground px-2 py-1 rounded-lg bg-secondary/50">
                              {ROLE_OPTIONS.find((r) => r.value === currentRole)?.label ||
                                'Can View'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cascade to Child Sub-Canvases Toggle */}
              {canManageAccess && childCount > 0 && (
                <label className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-secondary/40 dark:bg-secondary/20 border border-border cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <GitBranch className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-foreground">
                        Inherit permissions to {childCount} nested sub-canvas
                        {childCount === 1 ? '' : 'es'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        Automatically sync access rules down to child pages & databases
                      </div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={cascadeToChildren}
                    onChange={(e) => setCascadeToChildren(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </label>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-border/60 bg-secondary/30 dark:bg-secondary/15 flex items-center justify-between">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-surface hover:bg-secondary text-xs font-semibold text-foreground transition-all active:scale-95 cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Copy Canvas Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

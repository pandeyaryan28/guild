import * as React from 'react';
import { X, Settings, Users, AlertTriangle, Trash2, ShieldAlert, Loader2, Save, Lock, ArrowLeft, Search, UserPlus } from 'lucide-react';
import { updateChannelSettings, removeChannelMember, deleteChannel, addChannelMembers, type Channel } from '../../lib/chat';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { type UserProfile } from '../../lib/firestore';
import { useOrgMembers } from '../../hooks/useChat';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface ChannelSettingsModalProps {
  channel: Channel;
  orgId: string;
  currentUserProfile: UserProfile | null;
  onClose: () => void;
  onUpdated: () => void;
  inline?: boolean;
}

type TabType = 'general' | 'members' | 'danger';

export function ChannelSettingsModal({ channel, orgId, currentUserProfile, onClose, onUpdated, inline = false }: ChannelSettingsModalProps) {
  const navigate = useNavigate();
  const orgMembers = useOrgMembers(orgId);
  const [activeTab, setActiveTab] = React.useState<TabType>('general');
  const [name, setName] = React.useState(channel.name);
  const [description, setDescription] = React.useState(channel.description || '');
  const [isRestricted, setIsRestricted] = React.useState(channel.isRestricted || false);
  const [isPrivate, setIsPrivate] = React.useState(channel.isPrivate || false);
  
  // Members tab states
  const [channelMembers, setChannelMembers] = React.useState<UserProfile[]>([]);
  const [loadingMembers, setLoadingMembers] = React.useState(false);
  const [isAddingMembers, setIsAddingMembers] = React.useState(false);
  const [memberSearch, setMemberSearch] = React.useState('');

  // Danger zone states
  const [deleteConfirm, setDeleteConfirm] = React.useState('');
  
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  // Fetch channel members when entering members tab
  React.useEffect(() => {
    if (activeTab !== 'members') return;
    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const snap = await getDocs(
          query(collection(db, 'channelMembers'), where('channelId', '==', channel.id))
        );
        const memberIds = new Set(snap.docs.map((d) => d.data().userId as string));
        const matched = orgMembers.filter((m) => memberIds.has(m.uid));
        setChannelMembers(matched);
      } catch (err) {
        console.error('Failed to fetch channel members:', err);
      } finally {
        setLoadingMembers(false);
      }
    };
    fetchMembers();
  }, [activeTab, channel.id, orgMembers]);

  const handleSaveGeneral = async () => {
    if (!slug) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await updateChannelSettings(channel.id, {
        name: slug,
        description,
        isRestricted,
        isPrivate,
      });
      setSuccess('Settings updated successfully');
      onUpdated();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (userId === channel.createdBy) return; // Cannot remove creator
    setError('');
    try {
      await removeChannelMember(channel.id, userId);
      setChannelMembers((prev) => prev.filter((m) => m.uid !== userId));
      onUpdated();
    } catch (err: any) {
      setError(err.message || 'Failed to remove member');
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm.trim().toLowerCase() !== channel.name.toLowerCase()) return;
    setSaving(true);
    setError('');
    try {
      await deleteChannel(channel.id);
      onClose();
      navigate('/chat');
    } catch (err: any) {
      setError(err.message || 'Failed to delete channel');
      setSaving(false);
    }
  };

  if (inline) {
    return (
      <div className="h-full border-l border-white/10 dark:border-white/5 bg-surface/95 dark:bg-zinc-950/60 backdrop-blur-xl flex flex-col z-30 overflow-hidden absolute inset-y-0 right-0 w-full sm:w-[420px] lg:relative shadow-2xl lg:shadow-none shrink-0 animate-in slide-in-from-right duration-200">
        <div className="w-full sm:w-[420px] h-full flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-default px-6 py-4 shrink-0">
            <div>
              <h2 className="text-sm font-bold text-foreground">Channel settings</h2>
              <p className="text-xs text-text-muted mt-0.5">Configure #{channel.name}</p>
            </div>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-bg-tertiary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-border-default px-4 shrink-0 bg-surface/50">
            <button
              onClick={() => setActiveTab('general')}
              className={cn(
                'flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-all outline-none',
                activeTab === 'general'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Settings className="h-3.5 w-3.5" />
              General
            </button>
            <button
              onClick={() => setActiveTab('members')}
              className={cn(
                'flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-all outline-none',
                activeTab === 'members'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Members
            </button>
            <button
              onClick={() => setActiveTab('danger')}
              className={cn(
                'flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-all outline-none',
                activeTab === 'danger'
                  ? 'border-destructive text-destructive'
                  : 'border-transparent text-muted-foreground hover:text-destructive/80'
              )}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Danger Zone
            </button>
          </div>

          {/* Tab Content Area */}
          <div className="flex-1 overflow-y-auto p-6 min-h-0 aether-scroll">
            {error && <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">{error}</div>}
            {success && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-400">{success}</div>}

            {/* TAB 1: GENERAL */}
            {activeTab === 'general' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Channel name</label>
                  <div className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-tertiary px-3 py-2.5 focus-within:border-primary/40 transition-colors">
                    <span className="text-sm text-text-muted select-none">#</span>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. general"
                      maxLength={40}
                      className="flex-1 bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none"
                    />
                  </div>
                  {slug && slug !== name && (
                    <p className="text-[10px] text-text-muted">Will be renamed as <span className="text-primary">#{slug}</span></p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Description</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Tell people what this channel is about..."
                    maxLength={200}
                    rows={3}
                    className="w-full resize-none rounded-xl border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary/40 transition-colors"
                  />
                </div>

                {/* Private Channel Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border-default bg-bg-tertiary px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <Lock className="h-4 w-4 text-text-muted shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Private (Invite Only)</p>
                      <p className="text-[10px] text-text-muted">Only invited members can find and join this channel</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPrivate(!isPrivate)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      isPrivate ? "bg-primary border-primary" : "bg-black/25 border-border-default"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        isPrivate ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                {/* Announcements Restrict Toggle */}
                <div className="flex items-center justify-between rounded-xl border border-border-default bg-bg-tertiary px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="h-4 w-4 text-text-muted shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-foreground">Restrict posting</p>
                      <p className="text-[10px] text-text-muted">Only administrators and the channel creator can send messages</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsRestricted(!isRestricted)}
                    className={cn(
                      "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                      isRestricted ? "bg-primary border-primary" : "bg-black/25 border-border-default"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                        isRestricted ? "translate-x-4" : "translate-x-0"
                      )}
                    />
                  </button>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveGeneral}
                    disabled={saving || !slug}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all',
                      slug && !saving
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90'
                        : 'bg-bg-tertiary text-muted-foreground cursor-not-allowed'
                    )}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: MEMBERS LIST */}
            {activeTab === 'members' && (() => {
              const isCreatorOrAdmin = currentUserProfile?.uid && (
                currentUserProfile.uid === channel.createdBy ||
                currentUserProfile.role === 'owner' ||
                currentUserProfile.role === 'admin'
              );

              const availableMembers = orgMembers.filter(
                (om) => !channelMembers.some((cm) => cm.uid === om.uid)
              );

              const filteredAvailable = availableMembers.filter((m) => {
                if (!memberSearch.trim()) return true;
                const lower = memberSearch.toLowerCase();
                return (
                  m.fullName.toLowerCase().includes(lower) ||
                  m.username.toLowerCase().includes(lower)
                );
              });

              const handleInviteTeammate = async (member: UserProfile) => {
                if (!currentUserProfile) return;
                setError('');
                try {
                  await addChannelMembers(
                    channel.id,
                    orgId,
                    [member.uid],
                    currentUserProfile.uid,
                    currentUserProfile.fullName
                  );
                  setChannelMembers((prev) => [...prev, member]);
                  onUpdated();
                } catch (err: any) {
                  setError(err.message || 'Failed to add teammate');
                }
              };

              if (isAddingMembers) {
                return (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between shrink-0">
                      <button
                        onClick={() => { setIsAddingMembers(false); setMemberSearch(''); }}
                        className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer bg-transparent border-none outline-none"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        Back to members
                      </button>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                        Add Teammates
                      </span>
                    </div>

                    {/* Search bar */}
                    <div className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-tertiary px-3 py-2 focus-within:border-primary/40 transition-colors">
                      <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
                      <input
                        value={memberSearch}
                        onChange={(e) => setMemberSearch(e.target.value)}
                        placeholder="Search teammates by name..."
                        className="flex-1 bg-transparent text-xs text-foreground placeholder:text-text-muted focus:outline-none"
                      />
                    </div>

                    {/* Available list */}
                    <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                      {filteredAvailable.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
                          <p className="text-xs font-semibold">No teammates available</p>
                          <p className="text-[10px] mt-0.5">All workspace members are in this channel or match no results</p>
                        </div>
                      ) : (
                        filteredAvailable.map((m) => {
                          const initials = m.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                          return (
                            <div key={m.uid} className="flex items-center gap-3 rounded-xl border border-border-default/45 bg-bg-tertiary/40 px-3.5 py-2">
                              <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-[10px] font-bold text-primary border border-primary/15 shrink-0">
                                {initials}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-semibold text-foreground truncate">{m.fullName}</p>
                                <p className="text-[9px] text-text-muted truncate">@{m.username}</p>
                              </div>
                              <button
                                onClick={() => handleInviteTeammate(m)}
                                className="flex items-center gap-1 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-lg px-2.5 py-1.5 border border-primary/20 transition-colors shrink-0 cursor-pointer"
                              >
                                <UserPlus className="h-3 w-3" />
                                Add
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Active members</span>
                    <span className="text-xs font-semibold text-foreground">{channelMembers.length} members</span>
                  </div>

                  {/* Add member trigger button for admins */}
                  {isCreatorOrAdmin && (
                    <button
                      onClick={() => setIsAddingMembers(true)}
                      className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 hover:border-primary/65 bg-primary/5 hover:bg-primary/10 text-xs font-bold text-primary py-2.5 transition-all cursor-pointer"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      Add Teammates
                    </button>
                  )}

                  {loadingMembers ? (
                    <div className="flex flex-col items-center justify-center py-16 gap-2 text-text-muted">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="text-xs">Loading channel roster...</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                      {channelMembers.map((m) => {
                        const isCreator = m.uid === channel.createdBy;
                        const initials = m.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                        return (
                          <div key={m.uid} className="flex items-center gap-3 rounded-xl border border-border-default/45 bg-bg-tertiary/40 px-3.5 py-2">
                            <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-[10px] font-bold text-primary border border-primary/15 shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground truncate">
                                {m.fullName}
                                {m.uid === currentUserProfile?.uid && <span className="ml-1 text-text-muted font-normal">(you)</span>}
                              </p>
                              <p className="text-[9px] text-text-muted truncate">@{m.username}</p>
                            </div>
                            {isCreator ? (
                              <span className="rounded-lg bg-primary/10 border border-primary/15 px-2 py-0.5 text-[9px] font-medium text-primary select-none">
                                Creator
                              </span>
                            ) : (
                              isCreatorOrAdmin && (
                                <button
                                  onClick={() => handleRemoveMember(m.uid)}
                                  className="text-[10px] font-bold text-destructive hover:bg-destructive/10 rounded-lg px-2.5 py-1 transition-colors shrink-0 cursor-pointer"
                                >
                                  Remove
                                </button>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TAB 3: DANGER ZONE */}
            {activeTab === 'danger' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-foreground">Extreme Caution Required</p>
                    <p className="text-[10px] text-text-muted leading-relaxed">
                      Deleting a channel removes all message history, shared files, and member integrations permanently.
                      This action is immediate and cannot be undone.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider block">
                    Type <span className="text-primary font-mono select-all">#{channel.name}</span> to confirm deletion:
                  </label>
                  <input
                    value={deleteConfirm}
                    onChange={(e) => setDeleteConfirm(e.target.value)}
                    placeholder={`Type #${channel.name}`}
                    className="w-full rounded-xl border border-border-default bg-bg-tertiary px-3.5 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-destructive/40 transition-colors"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleDelete}
                    disabled={saving || deleteConfirm.trim().toLowerCase() !== channel.name.toLowerCase()}
                    className={cn(
                      'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all',
                      deleteConfirm.trim().toLowerCase() === channel.name.toLowerCase() && !saving
                        ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 hover:bg-destructive/95'
                        : 'bg-bg-tertiary text-muted-foreground cursor-not-allowed'
                    )}
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Delete Channel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border-default bg-surface backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-6 py-4 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground">Channel settings</h2>
            <p className="text-xs text-text-muted mt-0.5">Configure #{channel.name}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-bg-tertiary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border-default px-4 shrink-0 bg-surface/50">
          <button
            onClick={() => setActiveTab('general')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-all outline-none',
              activeTab === 'general'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Settings className="h-3.5 w-3.5" />
            General
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-all outline-none',
              activeTab === 'members'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Users className="h-3.5 w-3.5" />
            Members
          </button>
          <button
            onClick={() => setActiveTab('danger')}
            className={cn(
              'flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-all outline-none',
              activeTab === 'danger'
                ? 'border-destructive text-destructive'
                : 'border-transparent text-muted-foreground hover:text-destructive/80'
            )}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            Danger Zone
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
          {error && <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">{error}</div>}
          {success && <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-400">{success}</div>}

          {/* TAB 1: GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Channel name</label>
                <div className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-tertiary px-3 py-2.5 focus-within:border-primary/40 transition-colors">
                  <span className="text-sm text-text-muted select-none">#</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. general"
                    maxLength={40}
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none"
                  />
                </div>
                {slug && slug !== name && (
                  <p className="text-[10px] text-text-muted">Will be renamed as <span className="text-primary">#{slug}</span></p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell people what this channel is about..."
                  maxLength={200}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary/40 transition-colors"
                />
              </div>

              {/* Private Channel Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border-default bg-bg-tertiary px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <Lock className="h-4 w-4 text-text-muted shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Private (Invite Only)</p>
                    <p className="text-[10px] text-text-muted">Only invited members can find and join this channel</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsPrivate(!isPrivate)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    isPrivate ? "bg-primary border-primary" : "bg-black/25 border-border-default"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      isPrivate ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              {/* Announcements Restrict Toggle */}
              <div className="flex items-center justify-between rounded-xl border border-border-default bg-bg-tertiary px-4 py-3">
                <div className="flex items-center gap-2.5">
                  <ShieldAlert className="h-4 w-4 text-text-muted shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-foreground">Restrict posting</p>
                    <p className="text-[10px] text-text-muted">Only administrators and the channel creator can send messages</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRestricted(!isRestricted)}
                  className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    isRestricted ? "bg-primary border-primary" : "bg-black/25 border-border-default"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      isRestricted ? "translate-x-4" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleSaveGeneral}
                  disabled={saving || !slug}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all',
                    slug && !saving
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90'
                      : 'bg-bg-tertiary text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: MEMBERS LIST */}
          {activeTab === 'members' && (() => {
            const isCreatorOrAdmin = currentUserProfile?.uid && (
              currentUserProfile.uid === channel.createdBy ||
              currentUserProfile.role === 'owner' ||
              currentUserProfile.role === 'admin'
            );

            const availableMembers = orgMembers.filter(
              (om) => !channelMembers.some((cm) => cm.uid === om.uid)
            );

            const filteredAvailable = availableMembers.filter((m) => {
              if (!memberSearch.trim()) return true;
              const lower = memberSearch.toLowerCase();
              return (
                m.fullName.toLowerCase().includes(lower) ||
                m.username.toLowerCase().includes(lower)
              );
            });

            const handleInviteTeammate = async (member: UserProfile) => {
              if (!currentUserProfile) return;
              setError('');
              try {
                await addChannelMembers(
                  channel.id,
                  orgId,
                  [member.uid],
                  currentUserProfile.uid,
                  currentUserProfile.fullName
                );
                setChannelMembers((prev) => [...prev, member]);
                onUpdated();
              } catch (err: any) {
                setError(err.message || 'Failed to add teammate');
              }
            };

            if (isAddingMembers) {
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between shrink-0">
                    <button
                      onClick={() => { setIsAddingMembers(false); setMemberSearch(''); }}
                      className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer bg-transparent border-none outline-none"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                      Back to members
                    </button>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                      Add Teammates
                    </span>
                  </div>

                  {/* Search bar */}
                  <div className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-tertiary px-3 py-2 focus-within:border-primary/40 transition-colors">
                    <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                      placeholder="Search teammates by name..."
                      className="flex-1 bg-transparent text-xs text-foreground placeholder:text-text-muted focus:outline-none"
                    />
                  </div>

                  {/* Available list */}
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                    {filteredAvailable.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center text-text-muted">
                        <p className="text-xs font-semibold">No teammates available</p>
                        <p className="text-[10px] mt-0.5">All workspace members are in this channel or match no results</p>
                      </div>
                    ) : (
                      filteredAvailable.map((m) => {
                        const initials = m.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                        return (
                          <div key={m.uid} className="flex items-center gap-3 rounded-xl border border-border-default/45 bg-bg-tertiary/40 px-3.5 py-2">
                            <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-[10px] font-bold text-primary border border-primary/15 shrink-0">
                              {initials}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground truncate">{m.fullName}</p>
                              <p className="text-[9px] text-text-muted truncate">@{m.username}</p>
                            </div>
                            <button
                              onClick={() => handleInviteTeammate(m)}
                              className="flex items-center gap-1 text-[10px] font-bold text-primary hover:bg-primary/10 rounded-lg px-2.5 py-1.5 border border-primary/20 transition-colors shrink-0 cursor-pointer"
                            >
                              <UserPlus className="h-3 w-3" />
                              Add
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Active members</span>
                  <span className="text-xs font-semibold text-foreground">{channelMembers.length} members</span>
                </div>

                {/* Add member trigger button for admins */}
                {isCreatorOrAdmin && (
                  <button
                    onClick={() => setIsAddingMembers(true)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 hover:border-primary/65 bg-primary/5 hover:bg-primary/10 text-xs font-bold text-primary py-2.5 transition-all cursor-pointer"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Teammates
                  </button>
                )}

                {loadingMembers ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-2 text-text-muted">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="text-xs">Loading channel roster...</p>
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                    {channelMembers.map((m) => {
                      const isCreator = m.uid === channel.createdBy;
                      const initials = m.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

                      return (
                        <div key={m.uid} className="flex items-center gap-3 rounded-xl border border-border-default/45 bg-bg-tertiary/40 px-3.5 py-2">
                          <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-[10px] font-bold text-primary border border-primary/15 shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-foreground truncate">
                              {m.fullName}
                              {m.uid === currentUserProfile?.uid && <span className="ml-1 text-text-muted font-normal">(you)</span>}
                            </p>
                            <p className="text-[9px] text-text-muted truncate">@{m.username}</p>
                          </div>
                          {isCreator ? (
                            <span className="rounded-lg bg-primary/10 border border-primary/15 px-2 py-0.5 text-[9px] font-medium text-primary select-none">
                              Creator
                            </span>
                          ) : (
                            isCreatorOrAdmin && (
                              <button
                                onClick={() => handleRemoveMember(m.uid)}
                                className="text-[10px] font-bold text-destructive hover:bg-destructive/10 rounded-lg px-2.5 py-1 transition-colors shrink-0 cursor-pointer"
                              >
                                Remove
                              </button>
                            )
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 3: DANGER ZONE */}
          {activeTab === 'danger' && (
            <div className="space-y-4">
              <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                <div className="space-y-1">
                  <p className="text-xs font-bold text-foreground">Extreme Caution Required</p>
                  <p className="text-[10px] text-text-muted leading-relaxed">
                    Deleting a channel removes all message history, shared files, and member integrations permanently.
                    This action is immediate and cannot be undone.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider block">
                  Type <span className="text-primary font-mono select-all">#{channel.name}</span> to confirm deletion:
                </label>
                <input
                  value={deleteConfirm}
                  onChange={(e) => setDeleteConfirm(e.target.value)}
                  placeholder={`Type #${channel.name}`}
                  className="w-full rounded-xl border border-border-default bg-bg-tertiary px-3.5 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-destructive/40 transition-colors"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={handleDelete}
                  disabled={saving || deleteConfirm.trim().toLowerCase() !== channel.name.toLowerCase()}
                  className={cn(
                    'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all',
                    deleteConfirm.trim().toLowerCase() === channel.name.toLowerCase() && !saving
                      ? 'bg-destructive text-destructive-foreground shadow-lg shadow-destructive/20 hover:bg-destructive/95'
                      : 'bg-bg-tertiary text-muted-foreground cursor-not-allowed'
                  )}
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Delete Channel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

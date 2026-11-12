import * as React from 'react';
import {
  X, Settings, Users, AlertTriangle, Trash2, ShieldAlert, Loader2, Save, Lock,
  ArrowLeft, Search, UserPlus, Webhook, Copy, Check, Eye, EyeOff, Send,
  FileDown, Download, Bot, CheckCircle2, AlertCircle, Info, CheckSquare
} from 'lucide-react';
import {
  updateChannelSettings, removeChannelMember, deleteChannel, addChannelMembers,
  generateChannelWebhook, revokeChannelWebhook, updateChannelWebhookSettings,
  type Channel
} from '../../lib/chat';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { type UserProfile } from '../../lib/firestore';
import { useOrgMembers } from '../../hooks/useChat';
import { generateWebhookDocsPdf } from '../../utils/generateWebhookPdf';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export type TabType = 'general' | 'members' | 'integrations' | 'danger';

interface ChannelSettingsModalProps {
  channel: Channel;
  orgId: string;
  currentUserProfile: UserProfile | null;
  onClose: () => void;
  onUpdated: () => void;
  inline?: boolean;
  initialTab?: TabType;
}

export function ChannelSettingsModal({
  channel,
  orgId,
  currentUserProfile,
  onClose,
  onUpdated,
  inline = false,
  initialTab = 'general',
}: ChannelSettingsModalProps) {
  const navigate = useNavigate();
  const orgMembers = useOrgMembers(orgId);
  const [activeTab, setActiveTab] = React.useState<TabType>(initialTab);

  React.useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  const isCreatorOrAdmin = Boolean(
    currentUserProfile?.uid && (
      currentUserProfile.uid === channel.createdBy ||
      currentUserProfile.role === 'owner' ||
      currentUserProfile.role === 'admin'
    )
  );

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

  // Integrations tab states
  const [webhookToken, setWebhookToken] = React.useState<string | null>(channel.webhookToken || null);
  const [webhookBotName, setWebhookBotName] = React.useState<string>(channel.webhookBotName || 'Inbound Bot');
  const [webhookAutoCreateTask, setWebhookAutoCreateTask] = React.useState<boolean>(channel.webhookAutoCreateTask || false);
  const [showToken, setShowToken] = React.useState(false);
  const [copiedUrl, setCopiedUrl] = React.useState(false);
  const [downloadingPdf, setDownloadingPdf] = React.useState(false);
  const [generatingWebhook, setGeneratingWebhook] = React.useState(false);
  const [savingWebhookSettings, setSavingWebhookSettings] = React.useState(false);
  const [sendingTestMessage, setSendingTestMessage] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ success: boolean; message: string } | null>(null);
  const [showRevokeConfirm, setShowRevokeConfirm] = React.useState(false);

  React.useEffect(() => {
    setWebhookToken(channel.webhookToken || null);
    setWebhookBotName(channel.webhookBotName || 'Inbound Bot');
    setWebhookAutoCreateTask(channel.webhookAutoCreateTask || false);
  }, [channel.webhookToken, channel.webhookBotName, channel.webhookAutoCreateTask]);

  const origin = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'https://guildorbit.com';

  const webhookUrl = React.useMemo(() => {
    if (!webhookToken) return '';
    return `${origin}/api/webhooks/channel?channelId=${channel.id}&token=${webhookToken}`;
  }, [channel.id, webhookToken, origin]);

  const displayUrl = React.useMemo(() => {
    if (!webhookToken) return '';
    if (showToken) return webhookUrl;
    return `${origin}/api/webhooks/channel?channelId=${channel.id}&token=••••••••••••••••••••••••`;
  }, [webhookUrl, showToken, channel.id, webhookToken, origin]);

  const handleCopyUrl = async () => {
    if (!webhookUrl) return;
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy webhook URL:', err);
    }
  };

  const handleDownloadPdf = () => {
    setDownloadingPdf(true);
    try {
      generateWebhookDocsPdf({
        channelName: channel.name,
        channelId: channel.id,
        webhookUrl: webhookUrl || `${origin}/api/webhooks/channel?channelId=${channel.id}&token=${webhookToken || 'YOUR_TOKEN'}`,
        webhookToken: webhookToken || '',
        botName: webhookBotName,
        autoCreateTask: webhookAutoCreateTask,
        origin,
      });
    } catch (err) {
      console.error('Failed to generate webhook documentation PDF:', err);
    } finally {
      setTimeout(() => setDownloadingPdf(false), 600);
    }
  };

  const handleGenerateWebhook = async () => {
    if (!isCreatorOrAdmin) return;
    setGeneratingWebhook(true);
    setError('');
    setSuccess('');
    try {
      const res = await generateChannelWebhook(channel.id, webhookBotName, currentUserProfile?.uid);
      setWebhookToken(res.token);
      setSuccess('Webhook endpoint generated successfully');
      onUpdated();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to generate webhook');
    } finally {
      setGeneratingWebhook(false);
    }
  };

  const handleRevokeWebhook = async () => {
    if (!isCreatorOrAdmin) return;
    setGeneratingWebhook(true);
    setError('');
    setSuccess('');
    try {
      await revokeChannelWebhook(channel.id);
      setWebhookToken(null);
      setShowRevokeConfirm(false);
      setTestResult(null);
      setSuccess('Webhook revoked successfully');
      onUpdated();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to revoke webhook');
    } finally {
      setGeneratingWebhook(false);
    }
  };

  const handleSaveWebhookSettings = async (updates?: { botName?: string; autoCreateTask?: boolean }) => {
    if (!isCreatorOrAdmin) return;
    setSavingWebhookSettings(true);
    setError('');
    try {
      const newBotName = updates?.botName !== undefined ? updates.botName : webhookBotName;
      const newAutoTask = updates?.autoCreateTask !== undefined ? updates.autoCreateTask : webhookAutoCreateTask;
      await updateChannelWebhookSettings(channel.id, {
        webhookBotName: newBotName,
        webhookAutoCreateTask: newAutoTask,
      });
      setSuccess('Integration settings saved');
      onUpdated();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save integration settings');
    } finally {
      setSavingWebhookSettings(false);
    }
  };

  const handleSendTestMessage = async () => {
    if (!webhookUrl) return;
    setSendingTestMessage(true);
    setTestResult(null);
    try {
      const testPayload = {
        name: currentUserProfile?.fullName || 'Guild Orbit Tester',
        email: currentUserProfile?.email || 'tester@guildorbit.com',
        phone: '+1 (555) 234-5678',
        subject: 'Webhook Integration Test Inquiry',
        message: 'This is an automated test message sent from the Channel Settings Integrations panel to verify connectivity.',
        metadata: {
          testOrigin: 'ChannelSettingsModal',
          channelName: channel.name,
          timestamp: new Date().toLocaleTimeString(),
        },
      };

      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testPayload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: 'Test message delivered! Open this channel feed to view the new inquiry card.',
        });
        onUpdated();
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to deliver test message to webhook endpoint.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Network error delivering test message.',
      });
    } finally {
      setSendingTestMessage(false);
    }
  };

  // Fetch channel members when entering members tab
  React.useEffect(() => {
    if (activeTab !== 'members') return;
    const fetchMembers = async () => {
      setLoadingMembers(true);
      try {
        const snap = await getDocs(
          query(
            collection(db, 'channelMembers'),
            where('orgId', '==', orgId),
            where('channelId', '==', channel.id),
          )
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
  }, [activeTab, channel.id, orgMembers, orgId]);

  const handleSaveGeneral = async () => {
    if (!isCreatorOrAdmin || !slug) return;
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
    if (!isCreatorOrAdmin || userId === channel.createdBy) return;
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
    if (!isCreatorOrAdmin || deleteConfirm.trim().toLowerCase() !== channel.name.toLowerCase()) return;
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

  // ─── TAB RENDERING ─────────────────────────────────────────────────────────

  const renderGeneralTab = () => (
    <div className="space-y-4">
      {!isCreatorOrAdmin && (
        <div className="rounded-xl border border-border dark:border-border-strong bg-secondary/50 p-3 text-xs text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-primary" />
          <span>Viewing channel details. Channel settings can be modified by channel creators and workspace administrators.</span>
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Channel name</label>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 dark:bg-secondary/40 px-3 py-2.5 focus-within:border-primary/40 transition-colors">
          <span className="text-sm text-muted-foreground select-none">#</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. general"
            maxLength={40}
            readOnly={!isCreatorOrAdmin}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
          />
        </div>
        {isCreatorOrAdmin && slug && slug !== name && (
          <p className="text-[10px] text-muted-foreground">Will be renamed as <span className="text-primary font-mono">#{slug}</span></p>
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
          readOnly={!isCreatorOrAdmin}
          className="w-full resize-none rounded-xl border border-border bg-secondary/60 dark:bg-secondary/40 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors disabled:opacity-60"
        />
      </div>

      {/* Private Channel Toggle */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/60 dark:bg-secondary/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-bold text-foreground">Private (Invite Only)</p>
            <p className="text-[10px] text-muted-foreground">Only invited members can find and join this channel</p>
          </div>
        </div>
        <button
          type="button"
          disabled={!isCreatorOrAdmin}
          onClick={() => setIsPrivate(!isPrivate)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
            isPrivate ? "bg-primary border-primary" : "bg-black/25 dark:bg-muted border-border"
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
      <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/60 dark:bg-secondary/40 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="h-4 w-4 text-muted-foreground shrink-0" />
          <div>
            <p className="text-xs font-bold text-foreground">Restrict posting</p>
            <p className="text-[10px] text-muted-foreground">Only administrators and the channel creator can send messages</p>
          </div>
        </div>
        <button
          type="button"
          disabled={!isCreatorOrAdmin}
          onClick={() => setIsRestricted(!isRestricted)}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
            isRestricted ? "bg-primary border-primary" : "bg-black/25 dark:bg-muted border-border"
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

      {isCreatorOrAdmin && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={handleSaveGeneral}
            disabled={saving || !slug}
            className={cn(
              'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-[0.98]',
              slug && !saving
                ? 'bg-primary text-primary-foreground shadow-sm hover:opacity-90'
                : 'bg-secondary text-muted-foreground cursor-not-allowed'
            )}
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save Changes
          </button>
        </div>
      )}
    </div>
  );

  const renderMembersTab = () => {
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
      if (!currentUserProfile || !isCreatorOrAdmin) return;
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
              type="button"
              onClick={() => { setIsAddingMembers(false); setMemberSearch(''); }}
              className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline cursor-pointer bg-transparent border-none outline-none"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to members
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Add Teammates
            </span>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2 rounded-xl border border-border bg-secondary/60 dark:bg-secondary/40 px-3 py-2 focus-within:border-primary/40 transition-colors">
            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search teammates by name..."
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Available list */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 aether-scroll">
            {filteredAvailable.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                <p className="text-xs font-semibold">No teammates available</p>
                <p className="text-[10px] mt-0.5">All workspace members are in this channel or match no results</p>
              </div>
            ) : (
              filteredAvailable.map((m) => {
                const initials = m.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
                return (
                  <div key={m.uid} className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/40 px-3.5 py-2">
                    <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary border border-primary/20 shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">{m.fullName}</p>
                      <p className="text-[9px] text-muted-foreground truncate">@{m.username}</p>
                    </div>
                    <button
                      type="button"
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
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Active members</span>
          <span className="text-xs font-semibold text-foreground">{channelMembers.length} members</span>
        </div>

        {/* Add member trigger button for admins */}
        {isCreatorOrAdmin && (
          <button
            type="button"
            onClick={() => setIsAddingMembers(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 hover:border-primary/65 bg-primary/5 hover:bg-primary/10 text-xs font-bold text-primary py-2.5 transition-all cursor-pointer active:scale-[0.98]"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Add Teammates
          </button>
        )}

        {loadingMembers ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-xs">Loading channel roster...</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1 aether-scroll">
            {channelMembers.map((m) => {
              const isCreator = m.uid === channel.createdBy;
              const initials = m.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

              return (
                <div key={m.uid} className="flex items-center gap-3 rounded-xl border border-border/70 bg-secondary/40 px-3.5 py-2">
                  <div className="flex h-7.5 w-7.5 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary border border-primary/20 shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {m.fullName}
                      {m.uid === currentUserProfile?.uid && <span className="ml-1 text-muted-foreground font-normal">(you)</span>}
                    </p>
                    <p className="text-[9px] text-muted-foreground truncate">@{m.username}</p>
                  </div>
                  {isCreator ? (
                    <span className="rounded-lg bg-primary/10 border border-primary/15 px-2 py-0.5 text-[9px] font-medium text-primary select-none">
                      Creator
                    </span>
                  ) : (
                    isCreatorOrAdmin && (
                      <button
                        type="button"
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
  };

  const renderIntegrationsTab = () => (
    <div className="space-y-6">
      {/* Overview card */}
      <div className="rounded-2xl border border-border bg-secondary/50 dark:bg-secondary/30 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Webhook className="h-4 w-4" />
          </div>
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-foreground">Inbound Channel Webhook & Plugins</h3>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              Connect external contact forms, landing pages, and systems directly to #{channel.name}. Incoming requests post structured cards in the chat feed.
            </p>
          </div>
        </div>
      </div>

      {!isCreatorOrAdmin && (
        <div className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-primary" />
          <span>You are viewing channel integrations as a member. Key generation and settings are managed by channel creators and workspace administrators.</span>
        </div>
      )}

      {/* When no webhook is active */}
      {!webhookToken ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 dark:bg-secondary/15 p-6 text-center space-y-4">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-surface border border-border text-muted-foreground">
            <Webhook className="h-5 w-5" />
          </div>
          <div className="space-y-1 max-w-sm mx-auto">
            <h4 className="text-xs font-bold text-foreground">No webhook generated yet</h4>
            <p className="text-[11px] text-muted-foreground">
              Generate a secure 32-byte webhook endpoint to start receiving inquiries and leads in #{channel.name}.
            </p>
          </div>

          {isCreatorOrAdmin ? (
            <>
              <div className="max-w-xs mx-auto space-y-2 text-left">
                <label className="text-[10px] font-semibold text-foreground/70 uppercase tracking-wider block">
                  Sender / Bot Name
                </label>
                <div className="flex items-center rounded-2xl border border-border bg-surface px-3 py-2 focus-within:border-primary/40 transition-colors">
                  <Bot className="h-3.5 w-3.5 text-muted-foreground mr-2 shrink-0" />
                  <input
                    type="text"
                    value={webhookBotName}
                    onChange={(e) => setWebhookBotName(e.target.value)}
                    placeholder="Inbound Bot"
                    className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleGenerateWebhook}
                  disabled={generatingWebhook}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {generatingWebhook ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Webhook className="h-3.5 w-3.5" />}
                  Generate Webhook URL
                </button>
              </div>
            </>
          ) : (
            <div className="pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-muted-foreground text-[11px] font-medium border border-border">
                <Info className="h-3 w-3" />
                Contact a channel creator or admin to generate webhook keys.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Webhook URL Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-2">
                <span>Endpoint URL</span>
                <span className="rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[10px] px-1.5 py-0.5 border border-emerald-500/20 font-bold">
                  POST
                </span>
              </label>
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{showToken ? 'Hide token' : 'Show token'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center rounded-2xl border border-border bg-secondary/60 dark:bg-secondary/40 px-3.5 py-2.5 overflow-hidden focus-within:border-primary/40 transition-colors">
                <input
                  type="text"
                  readOnly
                  value={displayUrl}
                  className="w-full bg-transparent font-mono text-xs text-foreground select-all focus:outline-none truncate"
                />
              </div>
              <button
                type="button"
                onClick={handleCopyUrl}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border cursor-pointer active:scale-[0.98]",
                  copiedUrl
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-surface hover:bg-secondary border-border text-foreground"
                )}
              >
                {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedUrl ? 'Copied' : 'Copy URL'}</span>
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Keep this URL secret. Any HTTP POST sent to this endpoint with valid JSON will appear in this channel.
            </p>
          </div>

          {/* Bot Display Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider flex items-center gap-1.5">
              <Bot className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Bot Display Name</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center rounded-2xl border border-border bg-secondary/60 dark:bg-secondary/40 px-3.5 py-2 focus-within:border-primary/40 transition-colors">
                <input
                  type="text"
                  value={webhookBotName}
                  onChange={(e) => setWebhookBotName(e.target.value)}
                  placeholder="e.g. UniCare Enquiries, Nullwave Leads"
                  maxLength={50}
                  readOnly={!isCreatorOrAdmin}
                  className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
                />
              </div>
              {isCreatorOrAdmin && (
                <button
                  type="button"
                  onClick={() => handleSaveWebhookSettings({ botName: webhookBotName })}
                  disabled={savingWebhookSettings || webhookBotName === (channel.webhookBotName || 'Inbound Bot')}
                  className="px-3.5 py-2 rounded-2xl text-xs font-semibold bg-surface hover:bg-secondary border border-border text-foreground disabled:opacity-40 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {savingWebhookSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
                </button>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground">
              Name displayed as the message sender when incoming inquiries arrive.
            </p>
          </div>

          {/* Task Auto-creation toggle */}
          <div className="flex items-start justify-between rounded-2xl border border-border bg-secondary/60 dark:bg-secondary/40 p-3.5 gap-3">
            <div className="flex items-start gap-2.5">
              <CheckSquare className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">Also create an operational task for new inquiries</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Automatically inserts a high-priority task in your workspace task board assigned to the channel admin.
                </p>
              </div>
            </div>
            <button
              type="button"
              disabled={!isCreatorOrAdmin}
              onClick={() => {
                const nextVal = !webhookAutoCreateTask;
                setWebhookAutoCreateTask(nextVal);
                handleSaveWebhookSettings({ autoCreateTask: nextVal });
              }}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed",
                webhookAutoCreateTask ? "bg-primary border-primary" : "bg-black/25 dark:bg-muted border-border"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                  webhookAutoCreateTask ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>

          {/* Send Test Message */}
          <div className="rounded-2xl border border-border bg-secondary/60 dark:bg-secondary/40 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-foreground">Send Test Message</p>
                <p className="text-[10px] text-muted-foreground">Trigger a sample payload to verify this channel integration.</p>
              </div>
              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={sendingTestMessage}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-sm"
              >
                {sendingTestMessage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                <span>Send Test</span>
              </button>
            </div>

            {testResult && (
              <div
                className={cn(
                  "rounded-lg p-3 text-xs flex items-start gap-2 border",
                  testResult.success
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                    : "bg-destructive/10 border-destructive/20 text-destructive"
                )}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Developer Documentation & PDF Download */}
          <div className="rounded-2xl border border-border bg-surface/80 dark:bg-surface/50 backdrop-blur-xl p-4 shadow-sm transition-all">
            <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <FileDown className="h-4.5 w-4.5" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-foreground">Integration Guide & Documentation</h4>
                    <span className="rounded-md bg-primary/10 text-primary font-mono text-[9px] px-1.5 py-0.5 border border-primary/20 font-bold uppercase tracking-wider">
                      PDF
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Download complete API specs, payload schemas, serverless setup notes, and copy-paste code snippets (cURL, TypeScript, Next.js, Python).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-[0.98] transition-all shadow-sm shrink-0 disabled:opacity-50 cursor-pointer"
              >
                {downloadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>{downloadingPdf ? 'Generating...' : 'Download Guide'}</span>
              </button>
            </div>
          </div>

          {/* Revoke Webhook Section */}
          {isCreatorOrAdmin ? (
            <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-foreground">Revoke Webhook</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Revoking invalidates this webhook URL immediately. Any external websites or services posting to it will receive 401 Unauthorized errors.
                  </p>
                </div>
              </div>

              {!showRevokeConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowRevokeConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10 border border-destructive/30 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Revoke Webhook URL</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleRevokeWebhook}
                    disabled={generatingWebhook}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    {generatingWebhook ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    <span>Yes, Revoke Now</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRevokeConfirm(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-surface hover:bg-secondary border border-border text-foreground active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-secondary/30 p-3 text-[11px] text-muted-foreground flex items-center gap-2">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>Revoking active webhooks requires channel creator or administrator privileges.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderDangerTab = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-foreground">Extreme Caution Required</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Deleting a channel removes all message history, shared files, and member integrations permanently.
            This action is immediate and cannot be undone.
          </p>
        </div>
      </div>

      {isCreatorOrAdmin ? (
        <>
          <div className="space-y-2">
            <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider block">
              Type <span className="text-primary font-mono select-all">#{channel.name}</span> to confirm deletion:
            </label>
            <input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder={`Type #${channel.name}`}
              className="w-full rounded-xl border border-border bg-secondary/60 dark:bg-secondary/40 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-destructive/40 transition-colors"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving || deleteConfirm.trim().toLowerCase() !== channel.name.toLowerCase()}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-[0.98]',
                deleteConfirm.trim().toLowerCase() === channel.name.toLowerCase() && !saving
                  ? 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/95 cursor-pointer'
                  : 'bg-secondary text-muted-foreground cursor-not-allowed'
              )}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete Channel
            </button>
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-border bg-secondary/30 p-4 text-xs text-muted-foreground">
          Channel deletion is restricted to channel creators and workspace administrators.
        </div>
      )}
    </div>
  );

  const renderTabNavigation = () => (
    <div className="flex border-b border-border px-4 shrink-0 bg-surface/50 overflow-x-auto no-scrollbar">
      <button
        type="button"
        onClick={() => setActiveTab('general')}
        className={cn(
          'flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-all outline-none shrink-0 cursor-pointer',
          activeTab === 'general'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        )}
      >
        <Settings className="h-3.5 w-3.5" />
        General
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('members')}
        className={cn(
          'flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-all outline-none shrink-0 cursor-pointer',
          activeTab === 'members'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        )}
      >
        <Users className="h-3.5 w-3.5" />
        Members
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('integrations')}
        className={cn(
          'flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-all outline-none shrink-0 cursor-pointer',
          activeTab === 'integrations'
            ? 'border-primary text-primary'
            : 'border-transparent text-muted-foreground hover:text-foreground'
        )}
      >
        <Webhook className="h-3.5 w-3.5" />
        Integrations & API
      </button>
      {isCreatorOrAdmin && (
        <button
          type="button"
          onClick={() => setActiveTab('danger')}
          className={cn(
            'flex items-center gap-2 border-b-2 px-3 py-3 text-xs font-semibold transition-all outline-none shrink-0 cursor-pointer',
            activeTab === 'danger'
              ? 'border-destructive text-destructive'
              : 'border-transparent text-muted-foreground hover:text-destructive/80'
          )}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          Danger Zone
        </button>
      )}
    </div>
  );

  const renderContentBody = () => (
    <div className="flex-1 overflow-y-auto p-6 min-h-0 aether-scroll">
      {error && (
        <div className="mb-4 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-600 dark:text-emerald-400">
          {success}
        </div>
      )}

      {activeTab === 'general' && renderGeneralTab()}
      {activeTab === 'members' && renderMembersTab()}
      {activeTab === 'integrations' && renderIntegrationsTab()}
      {activeTab === 'danger' && renderDangerTab()}
    </div>
  );

  if (inline) {
    return (
      <div className="h-full border-l border-border bg-surface/95 dark:bg-surface/85 backdrop-blur-2xl flex flex-col z-30 overflow-hidden absolute inset-y-0 right-0 w-full sm:w-[480px] lg:relative shadow-2xl lg:shadow-none shrink-0 animate-in slide-in-from-right duration-200">
        <div className="w-full sm:w-[480px] h-full flex flex-col min-h-0">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                {isCreatorOrAdmin ? 'Channel settings' : 'Channel details'}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">#{channel.name}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer active:scale-95"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {renderTabNavigation()}
          {renderContentBody()}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div className="relative w-full max-w-xl sm:max-w-2xl rounded-3xl border border-border dark:border-border-strong bg-surface/95 dark:bg-surface/85 backdrop-blur-2xl shadow-2xl shadow-black/30 dark:shadow-black/70 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground">
              {isCreatorOrAdmin ? 'Channel settings' : 'Channel details'}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">#{channel.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer active:scale-95"
            title="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {renderTabNavigation()}
        {renderContentBody()}
      </div>
    </div>
  );
}

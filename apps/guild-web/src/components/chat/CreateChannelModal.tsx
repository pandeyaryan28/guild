import * as React from 'react';
import { X, Hash, Loader2, Lock, Megaphone } from 'lucide-react';
import { createChannel } from '../../lib/chat';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '@/lib/utils';

interface CreateChannelModalProps {
  orgId: string;
  onClose: () => void;
  onCreated: (channelId: string) => void;
}

export function CreateChannelModal({ orgId, onClose, onCreated }: CreateChannelModalProps) {
  const { user } = useAuth();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [isRestricted, setIsRestricted] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleCreate = async () => {
    if (!slug || !user) return;
    setLoading(true);
    setError('');
    try {
      const id = await createChannel(orgId, name, description, user.uid, { isPrivate, isRestricted });
      onCreated(id);
    } catch (e: any) {
      setError(e.message || 'Failed to create channel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-border-default bg-surface backdrop-blur-xl shadow-2xl shadow-black/60 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
          <div>
            <h2 className="text-sm font-bold text-foreground">Create a channel</h2>
            <p className="text-xs text-text-muted mt-0.5">Channels are where your team communicates</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:bg-bg-tertiary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Channel name</label>
            <div className="flex items-center gap-2 rounded-xl border border-border-default bg-bg-tertiary px-3 py-2.5 focus-within:border-primary/40 transition-colors">
              <Hash className="h-4 w-4 text-text-muted shrink-0" />
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="e.g. design-reviews"
                maxLength={40}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none"
              />
            </div>
            {slug && slug !== name && (
              <p className="text-[10px] text-text-muted">Will be created as <span className="text-primary">#{slug}</span></p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Description <span className="text-text-muted normal-case font-normal">(optional)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this channel about?"
              maxLength={200}
              rows={2}
              className="w-full resize-none rounded-xl border border-border-default bg-bg-tertiary px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-primary/40 transition-colors"
            />
          </div>

          {/* Toggles for Privacy and Restrictions */}
          <div className="grid grid-cols-1 gap-2.5 pt-1">
            {/* Private Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border-default bg-bg-tertiary px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <Lock className="h-4 w-4 text-text-muted shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">Private Channel</p>
                  <p className="text-[10px] text-text-muted">Only invited members can view or join</p>
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

            {/* Announcement Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-border-default bg-bg-tertiary px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <Megaphone className="h-4 w-4 text-text-muted shrink-0" />
                <div>
                  <p className="text-xs font-bold text-foreground">Restrict Posting</p>
                  <p className="text-[10px] text-text-muted">Only administrators can send messages</p>
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
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border-default px-6 py-4">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-bg-tertiary transition-colors">
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!slug || loading}
            className={cn(
              'flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all',
              slug && !loading
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90'
                : 'bg-bg-tertiary text-muted-foreground cursor-not-allowed',
            )}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Create Channel
          </button>
        </div>
      </div>
    </div>
  );
}

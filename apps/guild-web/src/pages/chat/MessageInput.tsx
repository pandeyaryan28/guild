import * as React from 'react';
import { Send, Loader2, Paperclip, X, File, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentionDropdown } from './MentionDropdown';
import { CommandDropdown } from './CommandDropdown';
import { type UserProfile } from '../../lib/firestore';
import { uploadMessageAttachment } from '../../lib/storage';
import { type MessageAttachment, type Message } from '@guild/types';

interface MessageInputProps {
  onSend: (
    body: string,
    mentions: string[],
    files?: MessageAttachment[],
    parentMessageId?: string,
    parentMessage?: { id: string; senderName: string; body: string }
  ) => Promise<void>;
  placeholder?: string;
  members: UserProfile[];
  disabled?: boolean;
  chatId: string;
  quotedMessage?: Message | null;
  onClearQuote?: () => void;
}

export function MessageInput({
  onSend,
  placeholder = 'Message...',
  members,
  disabled,
  chatId,
  quotedMessage,
  onClearQuote,
}: MessageInputProps) {
  const [body, setBody] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const [mentionStart, setMentionStart] = React.useState<number>(-1);
  const [commandQuery, setCommandQuery] = React.useState<string | null>(null);
  const [commandStart, setCommandStart] = React.useState<number>(-1);
  const [pendingMentions, setPendingMentions] = React.useState<Map<string, string>>(new Map()); // username → uid
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }, [body]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mentionQuery !== null || commandQuery !== null) return; // dropdowns are handling Enter
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);

    const cursor = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);

    // Detect / command trigger at start of message
    const slashMatch = textBeforeCursor.match(/^\/(\w*)$/);
    if (slashMatch) {
      setCommandQuery(slashMatch[1]);
      setCommandStart(0);
      setMentionQuery(null);
      setMentionStart(-1);
      return;
    } else {
      setCommandQuery(null);
      setCommandStart(-1);
    }

    // Detect @ trigger
    const atMatch = textBeforeCursor.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursor - atMatch[0].length);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
  };

  const insertCommand = (cmdName: string) => {
    const inserted = `/${cmdName} `;
    setBody(inserted);
    setCommandQuery(null);
    setCommandStart(-1);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const insertMention = (member: UserProfile) => {
    const before = body.slice(0, mentionStart);
    const after = body.slice(textareaRef.current?.selectionStart ?? body.length);
    const inserted = `@${member.username} `;
    setBody(before + inserted + after);
    setPendingMentions((prev) => new Map(prev).set(member.username, member.uid));
    setMentionQuery(null);
    setMentionStart(-1);
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files);
    // Limit files to under 50MB
    const validFiles = files.filter((file) => {
      if (file.size > 50 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Maximum allowed size is 50MB.`);
        return false;
      }
      return true;
    });
    setSelectedFiles((prev) => [...prev, ...validFiles]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSend = async () => {
    const trimmed = body.trim();
    if ((!trimmed && selectedFiles.length === 0) || sending || disabled || uploading) return;
    setSending(true);

    let uploadedAttachments: MessageAttachment[] = [];
    if (selectedFiles.length > 0) {
      setUploading(true);
      try {
        const uploadPromises = selectedFiles.map((file) => uploadMessageAttachment(chatId, file));
        uploadedAttachments = await Promise.all(uploadPromises);
      } catch (err) {
        console.error('Failed to upload files:', err);
        alert('Failed to upload one or more files. Please try again.');
        setSending(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    setBody('');
    setSelectedFiles([]);
    setMentionQuery(null);
    setPendingMentions(new Map());

    // Resolve mention uids from body
    const mentionUids: string[] = [];
    pendingMentions.forEach((uid, username) => {
      if (trimmed.includes(`@${username}`)) mentionUids.push(uid);
    });

    try {
      if (quotedMessage) {
        await onSend(
          trimmed,
          mentionUids,
          uploadedAttachments,
          quotedMessage.id,
          {
            id: quotedMessage.id,
            senderName: quotedMessage.senderName,
            body: quotedMessage.body,
          }
        );
      } else {
        await onSend(trimmed, mentionUids, uploadedAttachments);
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="relative px-4 pb-4">
      {/* Quoted Message Preview Banner */}
      {quotedMessage && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border-default bg-surface/90 backdrop-blur-md px-4 py-2 mb-2 shadow-sm animate-in slide-in-from-bottom-2 duration-150">
          <div className="flex-1 min-w-0 border-l-2 border-primary/50 pl-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
              Replying to {quotedMessage.senderName}
            </p>
            <p className="text-xs text-text-muted truncate mt-0.5">
              {quotedMessage.body}
            </p>
          </div>
          <button
            type="button"
            onClick={onClearQuote}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-text-muted hover:text-foreground hover:bg-bg-tertiary transition-colors"
            title="Cancel reply"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {mentionQuery !== null && (
        <MentionDropdown
          query={mentionQuery}
          members={members}
          onSelect={insertMention}
          onClose={() => setMentionQuery(null)}
        />
      )}

      {commandQuery !== null && (
        <CommandDropdown
          query={commandQuery}
          onSelect={insertCommand}
          onClose={() => setCommandQuery(null)}
        />
      )}

      {/* Selected Files Preview Deck */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 max-h-40 overflow-y-auto px-1 py-1 scrollbar-hide">
          {selectedFiles.map((file, idx) => {
            const isImg = file.type.startsWith('image/');
            return (
              <div
                key={idx}
                className="relative flex items-center gap-2 rounded-xl border border-border-default bg-surface/80 backdrop-blur-md pl-2 pr-8 py-1.5 shadow-sm max-w-[200px] group transition-all hover:border-primary/30 animate-in fade-in zoom-in-95 duration-150"
              >
                {isImg ? (
                  <div className="h-8 w-8 rounded-lg overflow-hidden border border-border-default bg-bg-tertiary shrink-0">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary border border-primary/10">
                    <File className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-foreground truncate">{file.name}</p>
                  <p className="text-[9px] text-text-muted font-medium">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-lg bg-bg-tertiary text-text-muted hover:text-foreground hover:bg-zinc-500/20 transition-all opacity-80 hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-end gap-3 rounded-2xl border border-border-default bg-surface backdrop-blur-xl px-4 py-3 shadow-xl shadow-black/20 focus-within:border-primary/40 transition-colors">
        {/* Attachment Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || disabled || uploading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-text-muted hover:text-foreground hover:bg-bg-tertiary transition-colors"
          title="Attach files or media"
        >
          <Paperclip className="h-4.5 w-4.5" />
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />

        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={sending || disabled || uploading}
          maxLength={2000}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none disabled:opacity-50 leading-relaxed scrollbar-hide"
          style={{ minHeight: '24px', maxHeight: '160px' }}
        />
        <button
          onClick={handleSend}
          disabled={(!body.trim() && selectedFiles.length === 0) || sending || disabled || uploading}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
            (body.trim() || selectedFiles.length > 0) && !sending && !uploading
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90'
              : 'bg-bg-tertiary text-text-muted cursor-not-allowed',
          )}
        >
          {sending || uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      <p className="mt-1.5 px-1 text-[10px] text-text-muted">
        <kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Shift+Enter</kbd> for new line · <kbd className="font-mono">@</kbd> to mention · Max 50MB per file
      </p>
    </div>
  );
}

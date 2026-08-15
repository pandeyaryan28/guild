import * as React from 'react';
import {
  Send, Loader2, Paperclip, X, File,
  CheckSquare, Target, ClipboardList, Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentionDropdown } from './MentionDropdown';
import { CommandDropdown } from './CommandDropdown';
import { type UserProfile } from '../../lib/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { uploadMessageAttachment } from '../../lib/storage';
import { type MessageAttachment, type Message } from '@guild/types';

interface MessageInputProps {
  onSend: (
    body: string,
    mentions: string[],
    files?: MessageAttachment[],
    parentMessageId?: string,
    parentMessage?: { id: string; senderName: string; body: string },
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
  placeholder = 'Type a message or "/" for commands...',
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
  const [pendingMentions, setPendingMentions] = React.useState<Map<string, string>>(new Map());
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
      if (mentionQuery !== null || commandQuery !== null) return;
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

    const mentionUids: string[] = [];
    pendingMentions.forEach((uid, username) => {
      if (trimmed.includes(`@${username}`)) mentionUids.push(uid);
    });

    try {
      if (quotedMessage) {
        await onSend(trimmed, mentionUids, uploadedAttachments, quotedMessage.id, {
          id: quotedMessage.id,
          senderName: quotedMessage.senderName,
          body: quotedMessage.body,
        });
      } else {
        await onSend(trimmed, mentionUids, uploadedAttachments);
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const hasContent = body.trim().length > 0 || selectedFiles.length > 0;

  return (
    <div className="relative px-4 pb-4 select-none">
      {/* Quoted Message Preview Banner */}
      <AnimatePresence>
        {quotedMessage && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border-default/80 dark:border-white/10 bg-surface/95 dark:bg-surface-elevated/95 backdrop-blur-xl px-4 py-2 mb-2 shadow-sm border-l-4 border-l-primary"
          >
            <div className="flex-1 min-w-0 pl-1">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-primary">
                Replying to {quotedMessage.senderName}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{quotedMessage.body}</p>
            </div>
            <button
              type="button"
              onClick={onClearQuote}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover dark:hover:bg-white/10 transition-colors cursor-pointer"
              title="Cancel reply"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Autocomplete Dropdowns */}
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

      {/* Quick Action Slash Command Chips */}
      {!disabled && !quotedMessage && (
        <div className="flex items-center gap-1.5 mb-2 px-1 overflow-x-auto scrollbar-hide py-0.5">
          <button
            type="button"
            onClick={() => insertCommand('task')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface/80 dark:bg-surface-elevated/60 hover:bg-primary/10 border border-border-default/80 dark:border-white/10 hover:border-primary/40 text-muted-foreground hover:text-primary transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <CheckSquare className="h-3.5 w-3.5 text-primary" />
            <span>/task</span>
          </button>
          <button
            type="button"
            onClick={() => insertCommand('goal')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface/80 dark:bg-surface-elevated/60 hover:bg-emerald-500/10 border border-border-default/80 dark:border-white/10 hover:border-emerald-500/40 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400 transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <Target className="h-3.5 w-3.5 text-emerald-500" />
            <span>/goal</span>
          </button>
          <button
            type="button"
            onClick={() => insertCommand('request')}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface/80 dark:bg-surface-elevated/60 hover:bg-amber-500/10 border border-border-default/80 dark:border-white/10 hover:border-amber-500/40 text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 transition-all cursor-pointer shrink-0 shadow-xs"
          >
            <ClipboardList className="h-3.5 w-3.5 text-amber-500" />
            <span>/request</span>
          </button>
        </div>
      )}

      {/* Selected Files Staging Deck */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2.5 max-h-40 overflow-y-auto px-1 py-1 scrollbar-hide">
          {selectedFiles.map((file, idx) => {
            const isImg = file.type.startsWith('image/');
            return (
              <div
                key={idx}
                className="relative flex items-center gap-2 rounded-2xl border border-border-default/80 dark:border-white/10 bg-surface/90 dark:bg-surface-elevated/80 backdrop-blur-md pl-2 pr-8 py-1.5 shadow-sm max-w-[200px] group transition-all"
              >
                {isImg ? (
                  <div className="h-8 w-8 rounded-xl overflow-hidden border border-border-subtle bg-surface shrink-0">
                    <img src={URL.createObjectURL(file)} alt={file.name} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
                    <File className="h-4 w-4" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(idx)}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-surface-elevated/80 text-muted-foreground hover:text-foreground hover:bg-red-500/20 hover:text-red-500 transition-all cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modern Floating Island Composer Dock */}
      <div className="flex items-end gap-3 rounded-2xl border border-border-default/80 dark:border-white/15 bg-surface/95 dark:bg-surface-elevated/90 backdrop-blur-2xl px-4 py-3 shadow-xl focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        {/* Attachment Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || disabled || uploading}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover dark:hover:bg-white/10 transition-colors cursor-pointer border border-transparent"
          title="Attach files or media"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={sending || disabled || uploading}
          maxLength={2000}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 leading-relaxed scrollbar-hide py-1"
          style={{ minHeight: '24px', maxHeight: '160px' }}
        />

        {/* Send Button */}
        <motion.button
          whileHover={hasContent && !sending && !uploading ? { scale: 1.05 } : {}}
          whileTap={hasContent && !sending && !uploading ? { scale: 0.95 } : {}}
          onClick={handleSend}
          disabled={!hasContent || sending || disabled || uploading}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all border mb-0.5',
            hasContent && !sending && !uploading
              ? 'bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/90 cursor-pointer'
              : 'bg-surface-elevated text-muted-foreground border-border-subtle dark:border-white/5 cursor-not-allowed opacity-50',
          )}
        >
          {sending || uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </motion.button>
      </div>

      <div className="mt-1.5 px-3 text-[11px] text-muted-foreground flex items-center justify-between">
        <span className="flex items-center gap-1.5 flex-wrap">
          <span><kbd className="font-mono bg-surface-elevated px-1.5 py-0.5 rounded-md border border-border-default/80 text-[10px]">Enter</kbd> send</span>
          <span>·</span>
          <span><kbd className="font-mono bg-surface-elevated px-1.5 py-0.5 rounded-md border border-border-default/80 text-[10px]">Shift+Enter</kbd> newline</span>
          <span>·</span>
          <span><kbd className="font-mono bg-surface-elevated px-1.5 py-0.5 rounded-md border border-border-default/80 text-[10px]">/</kbd> commands</span>
        </span>
        <span className="font-mono text-[10px] opacity-75">Max 50MB</span>
      </div>
    </div>
  );
}

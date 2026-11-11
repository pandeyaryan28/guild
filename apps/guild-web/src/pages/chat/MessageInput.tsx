import * as React from 'react';
import {
  Send, Loader2, Paperclip, X, File, CheckSquare, Target, ClipboardList,
  ArrowUp, Mic, Square, Volume2, Sparkles, AudioWaveform as WaveformIcon
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

function FilePreviewItem({ file, onRemove }: { file: File; onRemove: () => void }) {
  const isImg = file.type.startsWith('image/');
  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isImg) return;
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file, isImg]);

  return (
    <div className="relative flex items-center gap-2 rounded-2xl border border-border bg-surface/90 dark:bg-surface/80 backdrop-blur-md pl-2 pr-8 py-1.5 shadow-xs max-w-[200px] group transition-all">
      {isImg && objectUrl ? (
        <div className="h-8 w-8 rounded-xl overflow-hidden border border-border bg-surface shrink-0">
          <img src={objectUrl} alt={file.name} className="h-full w-full object-cover" />
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
        onClick={onRemove}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-muted-foreground hover:text-foreground hover:bg-red-500/20 hover:text-red-500 transition-all cursor-pointer"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MessageInput({
  onSend,
  placeholder = 'Type a message or "/" for commands...',
  members,
  disabled,
  chatId,
  quotedMessage,
  onClearQuote,
}: MessageInputProps) {
  const [activeCommand, setActiveCommand] = React.useState<'task' | 'goal' | 'request' | null>(null);
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

  // ─── Voice Recording / Audio Waveform State ─────────────────────────────────
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordSeconds, setRecordSeconds] = React.useState(0);
  const recordTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  React.useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  }, [body]);

  // Handle voice recording timer
  React.useEffect(() => {
    if (isRecording) {
      setRecordSeconds(0);
      recordTimerRef.current = setInterval(() => {
        setRecordSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    }
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    };
  }, [isRecording]);

  const handleStartVoice = () => {
    setIsRecording(true);
  };

  const handleCancelVoice = () => {
    setIsRecording(false);
    setRecordSeconds(0);
  };

  const handleSendVoiceNote = async () => {
    const duration = recordSeconds;
    setIsRecording(false);
    setRecordSeconds(0);

    const minutes = Math.floor(duration / 60);
    const secs = duration % 60;
    const formatted = `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
    const voiceMessageBody = `🎙️ Voice Note (${formatted})`;

    try {
      setSending(true);
      await onSend(voiceMessageBody, []);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Backspace' && body === '' && activeCommand) {
      e.preventDefault();
      setActiveCommand(null);
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (mentionQuery !== null || commandQuery !== null) return;
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;

    // Detect command pill conversion when user types "/task ", "/goal ", or "/request "
    const commandPillMatch = val.match(/^\/(task|goal|request)(\s+|$)(.*)/i);
    if (commandPillMatch && (commandPillMatch[2] || commandPillMatch[3])) {
      const cmd = commandPillMatch[1].toLowerCase() as 'task' | 'goal' | 'request';
      const remaining = commandPillMatch[3] || '';
      setActiveCommand(cmd);
      setBody(remaining);
      setCommandQuery(null);
      setCommandStart(-1);
      return;
    }

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
    const lower = cmdName.toLowerCase();
    if (lower === 'task' || lower === 'goal' || lower === 'request') {
      setActiveCommand(lower as 'task' | 'goal' | 'request');
      setBody('');
      setCommandQuery(null);
      setCommandStart(-1);
      setTimeout(() => textareaRef.current?.focus(), 0);
      return;
    }
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

    const commandToExecute = activeCommand;
    setBody('');
    setActiveCommand(null);
    setSelectedFiles([]);
    setMentionQuery(null);
    setPendingMentions(new Map());

    const mentionUids: string[] = [];
    pendingMentions.forEach((uid, username) => {
      if (trimmed.includes(`@${username}`)) mentionUids.push(uid);
    });

    const fullBody = commandToExecute ? `/${commandToExecute} ${trimmed}` : trimmed;

    try {
      if (quotedMessage) {
        await onSend(fullBody, mentionUids, uploadedAttachments, quotedMessage.id, {
          id: quotedMessage.id,
          senderName: quotedMessage.senderName,
          body: quotedMessage.body,
        });
      } else {
        await onSend(fullBody, mentionUids, uploadedAttachments);
      }
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  const hasContent = body.trim().length > 0 || selectedFiles.length > 0;

  const dynamicPlaceholder = activeCommand === 'task'
    ? 'Task title... (e.g. "Fix signin bug @john")'
    : activeCommand === 'goal'
    ? 'Goal objective... (e.g. "Ship v2 beta")'
    : activeCommand === 'request'
    ? 'Request title... (e.g. "Signoff needed @manager")'
    : placeholder;

  return (
    <div className="relative px-3 sm:px-4 pb-3 sm:pb-4 select-none">
      {/* Quoted Message Preview Banner */}
      <AnimatePresence>
        {quotedMessage && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface/90 dark:bg-surface/80 backdrop-blur-xl px-4 py-2 mb-2 shadow-xs border-l-4 border-l-primary"
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
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
              title="Cancel reply"
            >
              <X className="h-3.5 w-3.5" />
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

      {/* Selected Files Staging Deck */}
      {selectedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 max-h-40 overflow-y-auto px-1 py-1 scrollbar-hide">
          {selectedFiles.map((file, idx) => (
            <FilePreviewItem key={`${file.name}-${idx}`} file={file} onRemove={() => removeFile(idx)} />
          ))}
        </div>
      )}

      {/* ─── Apple-Style Floating Frosted Pill Composer ──────────────────────── */}
      <div className="flex items-end gap-2 sm:gap-2.5 rounded-full border border-border bg-surface/85 dark:bg-surface/75 backdrop-blur-2xl px-3 sm:px-4 py-1.5 sm:py-2 shadow-lg focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        {/* Attachment Upload Button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || disabled || uploading || isRecording}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
          title="Attach files or media"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" />

        {/* Active Command Pill Box */}
        <AnimatePresence>
          {activeCommand && !isRecording && (
            <motion.div
              initial={{ opacity: 0, scale: 0.88, x: -6 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.88, x: -6 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold shrink-0 select-none shadow-xs border transition-all mb-0.5',
                activeCommand === 'task' && 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
                activeCommand === 'goal' && 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
                activeCommand === 'request' && 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
              )}
            >
              {activeCommand === 'task' && <CheckSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
              {activeCommand === 'goal' && <Target className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />}
              {activeCommand === 'request' && <ClipboardList className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />}
              <span className="capitalize">{activeCommand}</span>
              <button
                type="button"
                onClick={() => {
                  setActiveCommand(null);
                  textareaRef.current?.focus();
                }}
                className="ml-0.5 p-0.5 rounded-full hover:bg-secondary transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                title="Cancel command"
              >
                <X className="h-3 w-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Interactive Voice Waveform Recording View */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between gap-3 px-2 py-1">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-xs font-bold text-foreground">
                {Math.floor(recordSeconds / 60)}:{(recordSeconds % 60).toString().padStart(2, '0')}
              </span>
            </div>

            {/* Dynamic Waveform Visualizer */}
            <div className="flex items-center gap-1 h-6">
              {[8, 16, 24, 14, 20, 10, 22, 12, 18, 9].map((height, i) => (
                <motion.div
                  key={i}
                  animate={{
                    height: [
                      height * 0.4,
                      Math.max(6, Math.sin(i + recordSeconds) * 20 + 8),
                      height * 0.8,
                    ],
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6 + (i % 3) * 0.2,
                    ease: 'easeInOut',
                  }}
                  className="w-1 rounded-full bg-primary"
                  style={{ minHeight: '4px' }}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCancelVoice}
                className="p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
                title="Cancel recording"
              >
                <X className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleSendVoiceNote}
                className="px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer flex items-center gap-1"
              >
                <span>Send Note</span>
              </button>
            </div>
          </div>
        ) : (
          /* Auto-expanding Textarea */
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={dynamicPlaceholder}
            disabled={sending || disabled || uploading}
            maxLength={2000}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50 leading-relaxed scrollbar-hide py-1.5"
            style={{ minHeight: '24px', maxHeight: '140px' }}
          />
        )}

        {/* Voice Waveform Recording Trigger Button */}
        {!isRecording && !hasContent && (
          <button
            type="button"
            onClick={handleStartVoice}
            disabled={sending || disabled || uploading}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer mb-0.5"
            title="Record voice note"
          >
            <Mic className="h-4 w-4" />
          </button>
        )}

        {/* Circular Apple-Style Send Button */}
        {!isRecording && (
          <motion.button
            whileHover={hasContent && !sending && !uploading ? { scale: 1.06 } : {}}
            whileTap={hasContent && !sending && !uploading ? { scale: 0.94 } : {}}
            onClick={handleSend}
            disabled={!hasContent || sending || disabled || uploading}
            className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all mb-0.5',
              hasContent && !sending && !uploading
                ? 'bg-primary text-primary-foreground shadow-xs hover:opacity-90 cursor-pointer'
                : 'bg-secondary text-muted-foreground/50 cursor-not-allowed opacity-50',
            )}
            title={activeCommand ? `Send ${activeCommand}` : 'Send message'}
          >
            {sending || uploading ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
            ) : (
              <ArrowUp className="h-4 w-4 stroke-[2.75]" />
            )}
          </motion.button>
        )}
      </div>
    </div>
  );
}

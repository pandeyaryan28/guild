import * as React from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MentionDropdown } from './MentionDropdown';
import { type UserProfile } from '../../lib/firestore';

interface MessageInputProps {
  onSend: (body: string, mentions: string[]) => Promise<void>;
  placeholder?: string;
  members: UserProfile[];
  disabled?: boolean;
}

export function MessageInput({ onSend, placeholder = 'Message...', members, disabled }: MessageInputProps) {
  const [body, setBody] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [mentionQuery, setMentionQuery] = React.useState<string | null>(null);
  const [mentionStart, setMentionStart] = React.useState<number>(-1);
  const [pendingMentions, setPendingMentions] = React.useState<Map<string, string>>(new Map()); // username → uid
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

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
      if (mentionQuery !== null) return; // dropdown is handling Enter
      handleSend();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);

    // Detect @ trigger
    const cursor = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const atMatch = textBeforeCursor.match(/@(\w*)$/);

    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setMentionStart(cursor - atMatch[0].length);
    } else {
      setMentionQuery(null);
      setMentionStart(-1);
    }
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

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending || disabled) return;
    setSending(true);
    setBody('');
    setMentionQuery(null);
    setPendingMentions(new Map());

    // Resolve mention uids from body
    const mentionUids: string[] = [];
    pendingMentions.forEach((uid, username) => {
      if (trimmed.includes(`@${username}`)) mentionUids.push(uid);
    });

    try {
      await onSend(trimmed, mentionUids);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  };

  return (
    <div className="relative px-4 pb-4">
      {mentionQuery !== null && (
        <MentionDropdown
          query={mentionQuery}
          members={members}
          onSelect={insertMention}
          onClose={() => setMentionQuery(null)}
        />
      )}

      <div className="flex items-end gap-3 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-xl px-4 py-3 shadow-xl shadow-black/20 focus-within:border-primary/40 transition-colors">
        <textarea
          ref={textareaRef}
          value={body}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={sending || disabled}
          maxLength={2000}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none disabled:opacity-50 leading-relaxed scrollbar-hide"
          style={{ minHeight: '24px', maxHeight: '160px' }}
        />
        <button
          onClick={handleSend}
          disabled={!body.trim() || sending || disabled}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-all',
            body.trim() && !sending
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90'
              : 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed',
          )}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

      <p className="mt-1.5 px-1 text-[10px] text-muted-foreground/40">
        <kbd className="font-mono">Enter</kbd> to send · <kbd className="font-mono">Shift+Enter</kbd> for new line · <kbd className="font-mono">@</kbd> to mention
      </p>
    </div>
  );
}

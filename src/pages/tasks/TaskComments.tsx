import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, Pencil, Trash2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TaskComment, type ActorInfo, addComment, editComment, deleteComment } from '../../lib/tasks';
import { useTaskComments } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';

interface TaskCommentsProps {
  taskId: string;
  orgId: string;
  actor: ActorInfo;
  authorUsername: string;
}

export function TaskComments({ taskId, orgId, actor, authorUsername }: TaskCommentsProps) {
  const comments = useTaskComments(taskId);
  const members = useOrgMembers(orgId);
  const [body, setBody] = React.useState('');
  const [sending, setSending] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editBody, setEditBody] = React.useState('');
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Mention state
  const [mentionQuery, setMentionQuery] = React.useState('');
  const [mentionStart, setMentionStart] = React.useState(-1);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const filteredMembers = members.filter((m) =>
    (m.username || '').toLowerCase().includes(mentionQuery.toLowerCase()) ||
    (m.displayName || '').toLowerCase().includes(mentionQuery.toLowerCase()),
  );

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setBody(val);
    const cursor = e.target.selectionStart;
    const lastAt = val.lastIndexOf('@', cursor - 1);
    if (lastAt !== -1 && (lastAt === 0 || /\s/.test(val[lastAt - 1]))) {
      const query = val.slice(lastAt + 1, cursor);
      if (!/\s/.test(query)) {
        setMentionStart(lastAt);
        setMentionQuery(query);
        setShowSuggestions(true);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const insertMention = (username: string) => {
    const before = body.slice(0, mentionStart);
    const after = body.slice(textareaRef.current?.selectionStart ?? mentionStart + mentionQuery.length + 1);
    setBody(`${before}@${username} ${after}`);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  };

  const extractMentions = (text: string): string[] => {
    const matches = text.match(/@(\w+)/g) ?? [];
    const usernames = matches.map((m) => m.slice(1));
    return members.filter((m) => usernames.includes(m.username)).map((m) => m.uid);
  };

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      await addComment({ taskId, orgId, authorId: actor.uid, authorName: actor.name, authorUsername, body: body.trim(), mentions: extractMentions(body) });
      setBody('');
      setShowSuggestions(false);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') setShowSuggestions(false);
  };

  const startEdit = (c: TaskComment) => { setEditingId(c.id); setEditBody(c.body); };
  const saveEdit = async () => {
    if (!editingId || !editBody.trim()) return;
    await editComment(editingId, editBody.trim());
    setEditingId(null);
  };
  const cancelEdit = () => setEditingId(null);

  const highlightMentions = (text: string) => {
    const parts = text.split(/(@\w+)/g);
    return parts.map((p, i) =>
      p.startsWith('@')
        ? <span key={i} className="text-primary font-medium">{p}</span>
        : <React.Fragment key={i}>{p}</React.Fragment>,
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Comments list */}
      <div className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
        {comments.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-6">No comments yet. Be the first.</p>
        )}
        {comments.map((c) => {
          const ts = c.createdAt?.toDate ? c.createdAt.toDate() : new Date();
          const isOwn = c.authorId === actor.uid;
          return (
            <div key={c.id} className="group flex gap-3">
              <div className="h-7 w-7 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                {(c.authorName || c.authorUsername || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground">{c.authorName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(ts, { addSuffix: true })}
                    {c.editedAt && ' · edited'}
                  </span>
                  {isOwn && editingId !== c.id && (
                    <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button onClick={() => startEdit(c)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                      <button onClick={() => deleteComment(c.id)} className="text-muted-foreground hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                    </div>
                  )}
                </div>
                {editingId === c.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={2}
                      autoFocus
                      className="w-full resize-none rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-sm text-foreground outline-none focus:border-primary/50"
                    />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="flex items-center gap-1 text-xs text-primary hover:text-primary/80"><Check className="h-3 w-3" />Save</button>
                      <button onClick={cancelEdit} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><X className="h-3 w-3" />Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{highlightMentions(c.body)}</p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="relative mt-3 pt-3 border-t border-border/30">
        {showSuggestions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full mb-1 left-0 right-0 rounded-lg border border-border/40 bg-popover/95 backdrop-blur shadow-xl overflow-hidden z-10">
            {filteredMembers.slice(0, 5).map((m) => (
              <button
                key={m.uid}
                onMouseDown={(e) => { e.preventDefault(); insertMention(m.username); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent/40 transition-colors"
              >
                <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                  {(m.displayName || m.username || '?')[0].toUpperCase()}
                </div>
                <span className="font-medium">{m.displayName}</span>
                <span className="text-muted-foreground">@{m.username}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment… (@ to mention)"
            rows={1}
            className="flex-1 resize-none rounded-lg border border-border/30 bg-background/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors max-h-32"
            style={{ overflowY: body.split('\n').length > 3 ? 'auto' : 'hidden' }}
          />
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className="flex-shrink-0 rounded-lg bg-primary px-3 py-2 text-primary-foreground disabled:opacity-40 hover:bg-primary/90 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground/50">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  );
}

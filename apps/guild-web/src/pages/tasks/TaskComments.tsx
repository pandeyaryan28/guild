import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Send, Pencil, Trash2, Check, X, MessageSquare, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type TaskComment, type ActorInfo, addComment, editComment, deleteComment } from '../../lib/tasks';
import { useTaskComments } from '../../hooks/useTasks';
import { useOrgMembers } from '../../hooks/useChat';

interface TaskCommentsProps {
  taskId: string;
  orgId: string;
  actor: ActorInfo;
  authorUsername: string;
  /** UIDs to notify when a new comment is posted (creator + assignees minus commenter) */
  notifyIds?: string[];
  taskTitle?: string;
}

export function TaskComments({ taskId, orgId, actor, authorUsername, notifyIds, taskTitle }: TaskCommentsProps) {
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
    (m.fullName || '').toLowerCase().includes(mentionQuery.toLowerCase()),
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
    requestAnimationFrame(() => textareaRef.current?.focus());
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
      await addComment({
        taskId, orgId,
        authorId: actor.uid, authorName: actor.name, authorUsername,
        body: body.trim(),
        mentions: extractMentions(body),
        notifyIds: (notifyIds ?? []).filter((id) => id !== actor.uid),
        taskTitle,
      });
      setBody('');
      setShowSuggestions(false);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      handleSend(); 
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const startEdit = (c: TaskComment) => { 
    setEditingId(c.id); 
    setEditBody(c.body); 
  };
  
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
        ? <span key={i} className="text-primary font-bold">{p}</span>
        : <React.Fragment key={i}>{p}</React.Fragment>,
    );
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      
      {/* Comments List Grid */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[300px]">
        {comments.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground select-none">
            <MessageSquare className="h-6 w-6 opacity-40 mb-2" />
            <p className="text-xs font-semibold">Start the discussion</p>
            <p className="text-[10px] opacity-75 mt-0.5">Post updates or tag members using @username</p>
          </div>
        )}
        {comments.map((c) => {
          const ts = c.createdAt?.toDate ? c.createdAt.toDate() : new Date();
          const isOwn = c.authorId === actor.uid;
          return (
            <div 
              key={c.id} 
              className="group flex gap-3.5 p-4 aether-glass border border-border-default/25 hover:bg-surface-hover hover:border-border-default transition-all shadow-sm relative overflow-hidden animate-in fade-in duration-200"
            >
              {/* Initials Avatar Badge */}
              <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-extrabold text-primary shadow-sm">
                {(c.authorName || c.authorUsername || '?')[0].toUpperCase()}
              </div>

              {/* Comment Body Area */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-xs font-bold text-foreground truncate max-w-[120px]">{c.authorName}</span>
                  <span className="text-[9px] font-mono text-muted-foreground">
                    {formatDistanceToNow(ts, { addSuffix: true })}
                    {c.editedAt && ' · edited'}
                  </span>
                  
                  {/* Actions Toggle Overlay */}
                  {isOwn && editingId !== c.id && (
                    <div className="ml-auto opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button 
                        onClick={() => startEdit(c)} 
                        className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all cursor-pointer"
                        title="Edit Comment"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={() => deleteComment(c.id)} 
                        className="p-1 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all cursor-pointer"
                        title="Delete Comment"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>

                {editingId === c.id ? (
                  <div className="space-y-2 pt-1 animate-in fade-in duration-200">
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={2}
                      autoFocus
                      className="w-full resize-none rounded-xl border border-primary/45 bg-bg-primary px-3 py-2 text-xs text-foreground outline-none focus:border-primary/50 transition-colors shadow-inner"
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={saveEdit} 
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:text-primary/80 transition-colors cursor-pointer"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Save</span>
                      </button>
                      <button 
                        onClick={cancelEdit} 
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {highlightMentions(c.body)}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input area wrapper */}
      <div className="relative mt-2 pt-3 border-t border-border-default/80">
        
        {/* Mentions Autocomplete Suggester popup */}
        {showSuggestions && filteredMembers.length > 0 && (
          <div className="absolute bottom-full mb-2 left-0 right-0 rounded-2xl border border-border-default bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl shadow-2xl overflow-hidden z-40 max-h-48 overflow-y-auto py-1 animate-in fade-in slide-in-from-bottom-1.5 duration-200">
            {filteredMembers.slice(0, 5).map((m) => (
              <button
                key={m.uid}
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  insertMention(m.username); 
                }}
                className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold hover:bg-accent/40 transition-colors text-left"
              >
                <div className="h-5.5 w-5.5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                  {(m.fullName || m.username || '?')[0].toUpperCase()}
                </div>
                <span className="font-bold text-foreground truncate">{m.fullName}</span>
                <span className="text-[10px] text-muted-foreground">@{m.username}</span>
              </button>
            ))}
          </div>
        )}

        {/* Textarea comment box */}
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={body}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Add to discussion… (@ to tag team members)"
            rows={2}
            className="flex-1 resize-none rounded-2xl border border-border-default/60 bg-surface/30 dark:bg-surface/10 px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/70 outline-none focus:border-primary/50 focus:bg-surface/40 transition-all shadow-inner max-h-24 leading-relaxed"
            style={{ overflowY: body.split('\n').length > 3 ? 'auto' : 'hidden' }}
          />
          <button
            onClick={handleSend}
            disabled={!body.trim() || sending}
            className="flex-shrink-0 h-9 w-9 rounded-2xl bg-foreground hover:bg-foreground/90 disabled:opacity-30 disabled:hover:bg-foreground text-background flex items-center justify-center transition-all shadow-md active:scale-95 cursor-pointer"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin text-background" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        
        <div className="flex items-center justify-between mt-2 text-[9px] font-mono text-muted-foreground/80 select-none uppercase tracking-wide">
          <span>Press Enter to send · Shift+Enter for newline</span>
          {body.length > 0 && <span>{body.length} characters</span>}
        </div>
      </div>
    </div>
  );
}

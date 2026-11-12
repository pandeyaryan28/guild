import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import {
  Heading1,
  Heading2,
  List,
  ListTodo,
  Quote,
  Code,
  Minus,
  Zap,
  CheckSquare,
  Table as TableIcon,
  FileCheck2,
  ArrowRight,
  User,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@guild/utils';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaceData } from '../../context/WorkspaceDataContext';
import {
  SprintCycleBlockNode,
  InlineIssueBlockNode,
  InlineRequestBlockNode,
  DatabaseTableBlockNode
} from './canvasExtensions';

export interface CanvasBlockEditorProps {
  initialContent?: string;
  onChange?: (jsonString: string, htmlString: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  category: 'guild' | 'basic';
  shortcut?: string;
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  // Interactive Guild Blocks
  {
    id: 'sprint',
    label: 'Sprint Cycle',
    description: 'Active sprint progress, velocity burn, & task backlog',
    icon: Zap,
    category: 'guild',
    shortcut: '/sprint'
  },
  {
    id: 'issue',
    label: 'Inline Issue',
    description: 'Trackable issue with status, priority, points, & assignee',
    icon: CheckSquare,
    category: 'guild',
    shortcut: '/issue'
  },
  {
    id: 'table',
    label: 'Database Table',
    description: 'Spreadsheet database with dynamic property columns',
    icon: TableIcon,
    category: 'guild',
    shortcut: '/table'
  },
  {
    id: 'request',
    label: 'Approval Requisition',
    description: 'Operational requisition with manager 1-click approvals',
    icon: FileCheck2,
    category: 'guild',
    shortcut: '/request'
  },
  // Basic Blocks
  {
    id: 'h1',
    label: 'Heading 1',
    description: 'Large title section header',
    icon: Heading1,
    category: 'basic',
    shortcut: '/h1'
  },
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Medium sub-section header',
    icon: Heading2,
    category: 'basic',
    shortcut: '/h2'
  },
  {
    id: 'bullet',
    label: 'Bulleted List',
    description: 'Classic bulleted list points',
    icon: List,
    category: 'basic',
    shortcut: '/bullet'
  },
  {
    id: 'todo',
    label: 'Todo Checklist',
    description: 'Track quick checkbox action items',
    icon: ListTodo,
    category: 'basic',
    shortcut: '/todo'
  },
  {
    id: 'quote',
    label: 'Quote Block',
    description: 'Capture quotation or callout',
    icon: Quote,
    category: 'basic',
    shortcut: '/quote'
  },
  {
    id: 'code',
    label: 'Code Block',
    description: 'Syntax-friendly code snippet',
    icon: Code,
    category: 'basic',
    shortcut: '/code'
  },
  {
    id: 'divider',
    label: 'Divider Line',
    description: 'Clean horizontal partition',
    icon: Minus,
    category: 'basic',
    shortcut: '/divider'
  }
];

export function CanvasBlockEditor({
  initialContent,
  onChange,
  placeholder = 'Type / for commands, @ for mentions...',
  autoFocus = false
}: CanvasBlockEditorProps) {
  const { userProfile } = useAuth();
  const workspace = useWorkspaceData();
  const members = workspace?.members || [];

  // Slash menu state
  const [slashOpen, setSlashOpen] = React.useState(false);
  const [slashFilter, setSlashFilter] = React.useState('');
  const [slashIndex, setSlashIndex] = React.useState(0);
  const [slashPos, setSlashPos] = React.useState<{ top: number; left: number } | null>(null);

  // Mention menu state
  const [mentionOpen, setMentionOpen] = React.useState(false);
  const [mentionFilter, setMentionFilter] = React.useState('');
  const [mentionIndex, setMentionIndex] = React.useState(0);
  const [mentionPos, setMentionPos] = React.useState<{ top: number; left: number } | null>(null);

  // Text highlight selection state
  const [highlightPos, setHighlightPos] = React.useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = React.useState('');

  // Real workspace users for mentions
  const userList = React.useMemo(() => {
    if (members && members.length > 0) {
      return members.map((m) => ({
        id: m.uid,
        name: m.fullName || m.email || 'Teammate',
        username: m.username || (m.fullName || m.email || 'teammate').toLowerCase().replace(/\s+/g, '.'),
        avatar: m.photoURL || '',
        status: (m.availabilityStatus || 'active') as 'active' | 'focus' | 'away',
        role: m.designation || m.role || 'Member'
      }));
    }
    if (userProfile) {
      return [{
        id: userProfile.uid,
        name: userProfile.fullName || userProfile.email || 'Me',
        username: userProfile.username || 'me',
        avatar: userProfile.photoURL || '',
        status: (userProfile.availabilityStatus || 'active') as 'active' | 'focus' | 'away',
        role: userProfile.designation || userProfile.role || 'Member'
      }];
    }
    return [];
  }, [members, userProfile]);

  const filteredMembers = React.useMemo(() => {
    const q = mentionFilter.toLowerCase();
    return userList.filter(
      (u) => u.name.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    );
  }, [userList, mentionFilter]);

  const filteredSlash = React.useMemo(() => {
    const q = slashFilter.toLowerCase();
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.id.includes(q) ||
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q)
    );
  }, [slashFilter]);

  // TipTap Instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true }
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight as any,
      SprintCycleBlockNode,
      InlineIssueBlockNode,
      InlineRequestBlockNode,
      DatabaseTableBlockNode
    ],
    content: (() => {
      if (!initialContent) return '<p></p>';
      try {
        return JSON.parse(initialContent);
      } catch {
        return initialContent;
      }
    })(),
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class:
          'canvas-tiptap-content focus:outline-none min-h-[500px] select-text text-foreground prose dark:prose-invert max-w-none px-1 py-2'
      },
      handleKeyDown: (view, event) => {
        // Handle Slash command navigation
        if (slashOpen) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSlashIndex((prev) => (prev + 1) % Math.max(1, filteredSlash.length));
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSlashIndex((prev) => (prev - 1 + filteredSlash.length) % Math.max(1, filteredSlash.length));
            return true;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            if (filteredSlash[slashIndex]) {
              executeSlash(filteredSlash[slashIndex].id);
            }
            return true;
          }
          if (event.key === 'Escape') {
            setSlashOpen(false);
            return true;
          }
        }

        // Handle Mention navigation
        if (mentionOpen) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setMentionIndex((prev) => (prev + 1) % Math.max(1, filteredMembers.length));
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setMentionIndex((prev) => (prev - 1 + filteredMembers.length) % Math.max(1, filteredMembers.length));
            return true;
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
            event.preventDefault();
            if (filteredMembers[mentionIndex]) {
              insertMention(filteredMembers[mentionIndex]);
            }
            return true;
          }
          if (event.key === 'Escape') {
            setMentionOpen(false);
            return true;
          }
        }

        return false;
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { selection } = editor.state;
      if (!selection.empty) {
        const text = editor.state.doc.textBetween(selection.from, selection.to, ' ').trim();
        if (text.length > 0) {
          const coords = editor.view.coordsAtPos(selection.from);
          setHighlightPos({ top: coords.top - 46, left: coords.left });
          setSelectedText(text);
          return;
        }
      }
      setHighlightPos(null);
      setSelectedText('');
    },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      const html = editor.getHTML();
      onChange?.(json, html);

      const { selection } = editor.state;
      const { $from } = selection;
      const lineText = $from.parent.textContent;
      const posInLine = $from.parentOffset;
      const textBefore = lineText.slice(0, posInLine);

      // Check for Slash command
      if (textBefore.startsWith('/')) {
        const coords = editor.view.coordsAtPos(selection.from);
        setSlashPos({ top: coords.bottom + 8, left: coords.left });
        setSlashFilter(textBefore.slice(1));
        setSlashIndex(0);
        setSlashOpen(true);
      } else {
        setSlashOpen(false);
      }

      // Check for @ Mention
      const lastAt = textBefore.lastIndexOf('@');
      if (lastAt !== -1 && (lastAt === 0 || textBefore[lastAt - 1] === ' ')) {
        const query = textBefore.slice(lastAt + 1);
        if (!query.includes(' ')) {
          const coords = editor.view.coordsAtPos(selection.from);
          setMentionPos({ top: coords.bottom + 8, left: coords.left });
          setMentionFilter(query);
          setMentionIndex(0);
          setMentionOpen(true);
        } else {
          setMentionOpen(false);
        }
      } else {
        setMentionOpen(false);
      }
    }
  });

  // Execute Slash command
  const executeSlash = (cmdId: string) => {
    if (!editor) return;

    // Delete the slash query
    const { selection } = editor.state;
    const { $from } = selection;
    const lineText = $from.parent.textContent;
    const startPos = selection.from - lineText.length;

    editor.chain().focus().deleteRange({ from: startPos, to: selection.from }).run();

    switch (cmdId) {
      case 'sprint':
        editor.chain().focus().insertContent({
          type: 'sprintCycleBlock',
          attrs: {
            title: '',
            cycleNumber: null
          }
        }).run();
        break;

      case 'issue':
        editor.chain().focus().insertContent({
          type: 'inlineIssueBlock',
          attrs: {
            identifier: `TASK-${Math.floor(Math.random() * 800 + 100)}`,
            title: '',
            status: 'todo',
            priority: 'medium',
            estimatePoints: null
          }
        }).run();
        break;

      case 'table':
        editor.chain().focus().insertContent({
          type: 'databaseTableBlock',
          attrs: {
            title: ''
          }
        }).run();
        break;

      case 'request':
        editor.chain().focus().insertContent({
          type: 'inlineRequestBlock',
          attrs: {
            type: 'equipment',
            title: '',
            amount: '',
            department: 'Engineering',
            status: 'pending'
          }
        }).run();
        break;

      case 'h1':
        editor.chain().focus().setHeading({ level: 1 }).run();
        break;

      case 'h2':
        editor.chain().focus().setHeading({ level: 2 }).run();
        break;

      case 'bullet':
        editor.chain().focus().toggleBulletList().run();
        break;

      case 'todo':
        editor.chain().focus().toggleTaskList().run();
        break;

      case 'quote':
        editor.chain().focus().toggleBlockquote().run();
        break;

      case 'code':
        editor.chain().focus().toggleCodeBlock().run();
        break;

      case 'divider':
        editor.chain().focus().setHorizontalRule().run();
        break;
    }

    setSlashOpen(false);
  };

  // Insert Mention
  const insertMention = (user: { name: string; username: string }) => {
    if (!editor) return;

    const { selection } = editor.state;
    const { $from } = selection;
    const lineText = $from.parent.textContent;
    const lastAt = lineText.lastIndexOf('@');
    if (lastAt !== -1) {
      const startPos = selection.from - (lineText.length - lastAt);
      editor
        .chain()
        .focus()
        .deleteRange({ from: startPos, to: selection.from })
        .insertContent(`@${user.name} `)
        .run();
    }
    setMentionOpen(false);
  };

  // Convert selected text into an Issue
  const convertSelectionToIssue = () => {
    if (!editor || !selectedText) return;

    const num = Math.floor(Math.random() * 800 + 100);
    const identifier = `ENG-${num}`;

    editor.chain().focus().insertContent({
      type: 'inlineIssueBlock',
      attrs: {
        identifier,
        title: selectedText,
        status: 'todo',
        priority: 'medium',
        estimatePoints: 3,
        assigneeName: userProfile?.fullName || 'Assignee'
      }
    }).run();

    setHighlightPos(null);
    setSelectedText('');
  };

  return (
    <div className="relative w-full">
      {/* TipTap Rich Text Surface */}
      <EditorContent editor={editor} />

      {/* ─── 1. Slash Command Menu Popover ─── */}
      <AnimatePresence>
        {slashOpen && slashPos && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: `${Math.min(slashPos.top, window.innerHeight - 340)}px`,
              left: `${Math.min(slashPos.left, window.innerWidth - 320)}px`
            }}
            className="w-72 max-h-80 overflow-y-auto bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-2xl p-1.5 z-50 select-none custom-scrollbar"
          >
            {/* Interactive Guild Blocks Section */}
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1 flex items-center justify-between">
              <span>Interactive Guild Blocks</span>
              <span className="text-primary font-mono text-[9px]">ENGINE</span>
            </div>

            {filteredSlash.filter((c) => c.category === 'guild').map((cmd) => {
              const Icon = cmd.icon;
              const globalIndex = filteredSlash.indexOf(cmd);
              const isSelected = globalIndex === slashIndex;

              return (
                <div
                  key={cmd.id}
                  onClick={() => executeSlash(cmd.id)}
                  onMouseEnter={() => setSlashIndex(globalIndex)}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer text-xs font-medium transition-all',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-foreground hover:bg-secondary/70'
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center border shrink-0',
                      isSelected
                        ? 'border-white/30 bg-white/20 text-white'
                        : 'border-border bg-secondary/60 text-primary'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate">{cmd.label}</span>
                    <span
                      className={cn(
                        'text-[10px] truncate',
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      )}
                    >
                      {cmd.description}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Standard Typography Section */}
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 my-1">
              Basic Blocks
            </div>

            {filteredSlash.filter((c) => c.category === 'basic').map((cmd) => {
              const Icon = cmd.icon;
              const globalIndex = filteredSlash.indexOf(cmd);
              const isSelected = globalIndex === slashIndex;

              return (
                <div
                  key={cmd.id}
                  onClick={() => executeSlash(cmd.id)}
                  onMouseEnter={() => setSlashIndex(globalIndex)}
                  className={cn(
                    'flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer text-xs font-medium transition-all',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                      : 'text-foreground hover:bg-secondary/70'
                  )}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-lg flex items-center justify-center border shrink-0',
                      isSelected
                        ? 'border-white/30 bg-white/20 text-white'
                        : 'border-border bg-secondary/60 text-foreground'
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate">{cmd.label}</span>
                    <span
                      className={cn(
                        'text-[10px] truncate',
                        isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                      )}
                    >
                      {cmd.description}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 2. Mention Autocomplete Popover ─── */}
      <AnimatePresence>
        {mentionOpen && mentionPos && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: `${Math.min(mentionPos.top, window.innerHeight - 280)}px`,
              left: `${Math.min(mentionPos.left, window.innerWidth - 260)}px`
            }}
            className="w-64 max-h-64 overflow-y-auto bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-2xl p-1.5 z-50 select-none custom-scrollbar"
          >
            <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
              Mention Teammate
            </div>

            {filteredMembers.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground text-center">No teammates found</div>
            ) : (
              filteredMembers.map((user, idx) => {
                const isSelected = idx === mentionIndex;
                return (
                  <div
                    key={user.id}
                    onClick={() => insertMention(user)}
                    onMouseEnter={() => setMentionIndex(idx)}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer text-xs font-medium transition-all',
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'text-foreground hover:bg-secondary/70'
                    )}
                  >
                    <div className="relative">
                      <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span
                        className={cn(
                          'absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-surface',
                          user.status === 'active' && 'bg-emerald-500',
                          user.status === 'focus' && 'bg-purple-500',
                          user.status === 'away' && 'bg-amber-500'
                        )}
                      />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate">{user.name}</span>
                        <span
                          className={cn(
                            'text-[9px] font-mono px-1 rounded',
                            isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground'
                          )}
                        >
                          @{user.username}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── 3. Text Highlight Popover [ Convert to Issue ] ─── */}
      <AnimatePresence>
        {highlightPos && selectedText && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: `${highlightPos.top}px`,
              left: `${Math.min(highlightPos.left, window.innerWidth - 220)}px`
            }}
            className="z-50 select-none"
          >
            <button
              type="button"
              onClick={convertSelectionToIssue}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-primary/40 dark:border-primary/50 text-foreground hover:bg-primary hover:text-primary-foreground text-xs font-semibold shadow-2xl transition-all duration-200 active:scale-95 group cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-primary group-hover:text-primary-foreground transition-colors fill-primary/20" />
              <span>Convert to Issue</span>
              <ArrowRight className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground transition-colors" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

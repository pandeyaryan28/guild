import * as React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import {
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Quote,
  Code,
  Minus,
  AlertCircle,
  Sparkles,
  Smile,
  ImageIcon,
  Check,
  Loader2,
  Bold,
  Italic,
  Strikethrough
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { WorkspaceDocument } from '@guild/types';
import { cn } from '@/lib/utils';

interface StudioEditorProps {
  document: WorkspaceDocument;
  onSaveContent: (contentJson: string, contentHtml: string, title?: string) => void;
  onUpdateMeta: (patch: Partial<WorkspaceDocument>) => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
}

const SLASH_COMMANDS = [
  { id: 'h1', label: 'Heading 1', description: 'Large section header', icon: Heading1 },
  { id: 'h2', label: 'Heading 2', description: 'Medium section header', icon: Heading2 },
  { id: 'h3', label: 'Heading 3', description: 'Small section header', icon: Heading3 },
  { id: 'bullet', label: 'Bulleted List', description: 'Simple bulleted list', icon: List },
  { id: 'ordered', label: 'Numbered List', description: 'Ordered sequential list', icon: ListOrdered },
  { id: 'task', label: 'To-do List', description: 'Track tasks with checkboxes', icon: ListTodo },
  { id: 'quote', label: 'Quote', description: 'Capture a quote or citation', icon: Quote },
  { id: 'code', label: 'Code Block', description: 'Display formatted code', icon: Code },
  { id: 'divider', label: 'Divider', description: 'Visual horizontal line', icon: Minus }
];

export function StudioEditor({
  document,
  onSaveContent,
  onUpdateMeta,
  saveStatus
}: StudioEditorProps) {
  const [title, setTitle] = React.useState(document.title || '');
  const [slashMenuOpen, setSlashMenuOpen] = React.useState(false);
  const [slashMenuIndex, setSlashMenuIndex] = React.useState(0);
  const [slashFilter, setSlashFilter] = React.useState('');
  const [menuPosition, setMenuPosition] = React.useState<{ top: number; left: number } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);

  // Keep local title in sync with document changes
  React.useEffect(() => {
    setTitle(document.title || '');
  }, [document.id, document.title]);

  // TipTap Editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true },
        orderedList: { keepMarks: true }
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight as any
    ],
    content: (() => {
      try {
        if (document.contentJson) {
          return JSON.parse(document.contentJson);
        }
      } catch (e) {
        // Fallback to empty doc
      }
      return document.contentHtml || '';
    })(),
    editorProps: {
      attributes: {
        class:
          'studio-tiptap-content focus:outline-none min-h-[420px] select-text text-foreground prose dark:prose-invert max-w-none'
      },
      handleKeyDown: (view, event) => {
        if (slashMenuOpen) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSlashMenuIndex((prev) => (prev + 1) % filteredCommands.length);
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSlashMenuIndex(
              (prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length
            );
            return true;
          }
          if (event.key === 'Enter') {
            event.preventDefault();
            executeSlashCommand(filteredCommands[slashMenuIndex]?.id);
            return true;
          }
          if (event.key === 'Escape') {
            setSlashMenuOpen(false);
            return true;
          }
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      const html = editor.getHTML();
      onSaveContent(json, html, title);

      // Check for Slash command trigger
      const { selection } = editor.state;
      const { $from } = selection;
      const currentLineText = $from.parent.textContent;

      if (currentLineText.startsWith('/')) {
        const coords = editor.view.coordsAtPos(selection.from);
        setMenuPosition({ top: coords.bottom + 8, left: coords.left });
        setSlashFilter(currentLineText.slice(1).toLowerCase());
        setSlashMenuOpen(true);
      } else {
        setSlashMenuOpen(false);
      }
    }
  }, [document.id]);

  // Filter commands
  const filteredCommands = React.useMemo(() => {
    if (!slashFilter) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (c) =>
        c.label.toLowerCase().includes(slashFilter) ||
        c.description.toLowerCase().includes(slashFilter)
    );
  }, [slashFilter]);

  const executeSlashCommand = (commandId?: string) => {
    if (!editor || !commandId) return;

    // Delete the slash trigger text
    const { selection } = editor.state;
    const { $from } = selection;
    const lineStart = $from.start();
    editor.commands.deleteRange({ from: lineStart, to: selection.from });

    // Apply chosen block
    switch (commandId) {
      case 'h1':
        editor.chain().focus().toggleHeading({ level: 1 }).run();
        break;
      case 'h2':
        editor.chain().focus().toggleHeading({ level: 2 }).run();
        break;
      case 'h3':
        editor.chain().focus().toggleHeading({ level: 3 }).run();
        break;
      case 'bullet':
        editor.chain().focus().toggleBulletList().run();
        break;
      case 'ordered':
        editor.chain().focus().toggleOrderedList().run();
        break;
      case 'task':
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

    setSlashMenuOpen(false);
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onUpdateMeta({ title: newTitle });
    if (editor) {
      onSaveContent(JSON.stringify(editor.getJSON()), editor.getHTML(), newTitle);
    }
  };

  const quickEmojis = ['📄', '⚡', '🚀', '🎯', '✨', '💡', '🔥', '📊', '🛠️', '📝', '📌', '📦'];

  return (
    <div className="relative w-full max-w-4xl mx-auto px-6 py-8">
      {/* Header Bar with Save Status Pill */}
      <div className="flex items-center justify-between mb-6 pb-2 border-b border-border/40">
        <div className="flex items-center gap-2">
          {/* Document Icon / Emoji Trigger */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-3xl p-1 rounded-xl hover:bg-secondary/70 transition-all cursor-pointer"
              title="Change icon"
            >
              {document.icon || '📄'}
            </button>

            {/* Quick Emoji Picker Popover */}
            <AnimatePresence>
              {showEmojiPicker && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 5 }}
                  className="absolute top-full left-0 mt-2 p-2 bg-surface/95 dark:bg-surface/90 backdrop-blur-xl border border-border dark:border-border-strong rounded-2xl shadow-xl flex items-center gap-1.5 z-30"
                >
                  {quickEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => {
                        onUpdateMeta({ icon: emoji });
                        setShowEmojiPicker(false);
                      }}
                      className="text-xl p-1.5 rounded-lg hover:bg-secondary/80 hover:scale-110 active:scale-95 transition-all"
                    >
                      {emoji}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/50 border border-border/60 text-[11px] font-medium text-muted-foreground select-none">
          {saveStatus === 'saving' && (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-primary" />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>Saved</span>
            </>
          )}
          {saveStatus === 'unsaved' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span>Unsaved changes</span>
            </>
          )}
        </div>
      </div>

      {/* Document Title Input */}
      <input
        type="text"
        value={title}
        onChange={(e) => handleTitleChange(e.target.value)}
        placeholder="Untitled Document"
        className="w-full text-3xl sm:text-4xl font-extrabold text-foreground placeholder:text-muted-foreground/40 bg-transparent outline-none tracking-tight mb-6"
      />

      {/* TipTap Editor Surface */}
      <div className="relative">
        <EditorContent editor={editor} />
      </div>

      {/* Floating Slash Command Popover Menu */}
      <AnimatePresence>
        {slashMenuOpen && menuPosition && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'fixed',
              top: `${menuPosition.top}px`,
              left: `${Math.min(menuPosition.left, window.innerWidth - 300)}px`
            }}
            className="w-64 max-h-72 overflow-y-auto bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-2xl p-1.5 z-50 select-none"
          >
            <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
              Basic Blocks
            </div>

            {filteredCommands.length === 0 ? (
              <div className="p-3 text-xs text-muted-foreground text-center">No blocks found</div>
            ) : (
              filteredCommands.map((cmd, idx) => {
                const Icon = cmd.icon;
                const isSelected = idx === slashMenuIndex;
                return (
                  <div
                    key={cmd.id}
                    onClick={() => executeSlashCommand(cmd.id)}
                    onMouseEnter={() => setSlashMenuIndex(idx)}
                    className={cn(
                      'flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl cursor-pointer text-xs font-medium transition-all',
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                        : 'text-foreground/80 hover:bg-secondary/70 hover:text-foreground'
                    )}
                  >
                    <div
                      className={cn(
                        'w-6 h-6 rounded-lg flex items-center justify-center border',
                        isSelected
                          ? 'border-white/20 bg-white/20 text-white'
                          : 'border-border bg-secondary/50 text-foreground'
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0">
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
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

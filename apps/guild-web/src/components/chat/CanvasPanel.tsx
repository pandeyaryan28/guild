import * as React from 'react';
import { 
  X, Check, Loader2, FileText, 
  Bold, Italic, Strikethrough, Highlighter, 
  Heading1, Heading2, Heading3, 
  List, ListOrdered, ListTodo, 
  Quote, Code, Minus, Undo, Redo, Copy, Sparkles, Trash2, Clock,
  MoreVertical
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { useCanvas } from '../../hooks/useCanvas';
import { exportHtmlToMarkdown } from '../../utils/markdownConverter';
import { CanvasTemplatesModal, type CanvasTemplate, CANVAS_TEMPLATES } from './CanvasTemplatesModal';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface CanvasPanelProps {
  chatId: string;
  onClose: () => void;
}

export function CanvasPanel({ chatId, onClose }: CanvasPanelProps) {
  const {
    canvas,
    loading: canvasLoading,
    saveStatus,
    localTitle,
    localContent,
    setLocalTitle,
    updateCanvas,
    forceSave,
    lastEditedInfo,
  } = useCanvas(chatId);

  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  // Close 3-dot menu on click outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  // TipTap Editor instance
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Highlight as any,
    ],
    content: localContent || '',
    editorProps: {
      attributes: {
        class: 'canvas-editor-content focus:outline-none min-h-[300px] select-text',
      },
    },
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed) return;
      const html = editor.getHTML();
      updateCanvas(html, localTitle);
    },
  }, []);

  // Sync editor content with remote updates when not focused
  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.isFocused) return;

    const currentHtml = editor.getHTML();
    const targetHtml = localContent || '';
    if (currentHtml !== targetHtml) {
      editor.commands.setContent(targetHtml, { emitUpdate: false });
    }
  }, [localContent, editor]);

  // Handle template selection
  const handleSelectTemplate = (template: CanvasTemplate) => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setContent(template.content);
    const newTitle = template.id === 'blank' ? 'Untitled Canvas' : template.title;
    setLocalTitle(newTitle);
    updateCanvas(template.content, newTitle);
  };

  // Handle copy as Markdown
  const handleCopyMarkdown = async () => {
    if (!editor) return;
    const html = editor.getHTML();
    const markdown = exportHtmlToMarkdown(html);
    const textToCopy = `# ${localTitle || 'Untitled Canvas'}\n\n${markdown}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  // Handle clear canvas
  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear this canvas? This action cannot be undone.')) {
      if (editor && !editor.isDestroyed) {
        editor.commands.clearContent(true);
      }
      setLocalTitle('Untitled Canvas');
      updateCanvas('', 'Untitled Canvas');
    }
  };

  if (canvasLoading) {
    return (
      <div className="h-full border-l border-border-default bg-surface/95 dark:bg-bg-primary/95 backdrop-blur-3xl flex flex-col items-center justify-center z-30 overflow-hidden absolute inset-y-0 right-0 w-full sm:w-[520px] lg:relative lg:w-[480px] xl:w-[580px] 2xl:w-[680px] shadow-2xl lg:shadow-none shrink-0 animate-fade-in">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground mt-3 font-semibold tracking-wider uppercase">Loading Canvas...</span>
      </div>
    );
  }

  const isCanvasEmpty = !localContent || localContent.trim() === '' || localContent === '<p></p>';

  return (
    <div className="h-full border-l border-border-default bg-surface dark:bg-bg-primary backdrop-blur-3xl flex flex-col z-30 overflow-hidden absolute inset-y-0 right-0 w-full sm:w-[520px] lg:relative lg:w-[480px] xl:w-[580px] 2xl:w-[680px] shadow-2xl lg:shadow-none shrink-0 transition-all duration-300">
      
      {/* ─── Top Header Bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border-default bg-surface-elevated/50 dark:bg-bg-secondary/40 shrink-0 gap-3">
        
        {/* Title Input & Save Status */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <FileText className="h-4 w-4" />
          </div>
          
          <input
            ref={titleInputRef}
            type="text"
            value={localTitle}
            onChange={(e) => updateCanvas(localContent, e.target.value)}
            onBlur={() => forceSave(localContent, localTitle)}
            placeholder="Untitled Canvas"
            className="text-sm font-bold text-foreground bg-transparent border-none outline-none focus:ring-0 p-0 truncate flex-1 hover:bg-bg-tertiary/40 focus:bg-bg-tertiary/60 rounded px-1.5 py-0.5 transition-colors"
          />

          {/* Compact Save Status */}
          <div className="shrink-0 flex items-center">
            {saveStatus === 'saving' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary animate-pulse" title="Saving changes...">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span className="hidden sm:inline">Saving</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500" title="All changes saved">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="hidden sm:inline text-muted-foreground text-[10px]">Saved</span>
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500" title="Unsaved changes">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-[10px] font-semibold text-danger" title="Failed to save">
                Sync error
              </span>
            )}
          </div>
        </div>

        {/* Right Actions: 3-dot dropdown menu + Close button */}
        <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
          
          {/* Three-dot Trigger Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className={cn(
              "h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-bg-tertiary transition-colors cursor-pointer",
              isMenuOpen && "bg-bg-tertiary text-foreground"
            )}
            title="More Options"
          >
            <MoreVertical className="h-4 w-4" />
          </button>

          {/* Dropdown Menu Popover */}
          {isMenuOpen && (
            <div className="absolute right-0 top-9 z-50 w-48 rounded-xl bg-surface border border-border-default shadow-xl py-1 animate-scale-in">
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsTemplatesModalOpen(true);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-bg-secondary flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Templates</span>
              </button>

              <button
                onClick={() => {
                  handleCopyMarkdown();
                  setIsMenuOpen(false);
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-foreground hover:bg-bg-secondary flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-emerald-500">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Copy Markdown</span>
                  </>
                )}
              </button>

              <div className="h-[1px] bg-border-subtle my-1" />

              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  handleClearCanvas();
                }}
                className="w-full px-3.5 py-2 text-left text-xs font-semibold text-danger hover:bg-danger/10 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear Canvas</span>
              </button>
            </div>
          )}

          {/* Close Panel Button */}
          <button
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-bg-tertiary transition-colors cursor-pointer"
            title="Close Canvas"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── Collaborator Presence & Last Edited Bar (Without "Live") ────────── */}
      {lastEditedInfo && (
        <div className="px-4 py-1.5 bg-bg-secondary/40 border-b border-border-subtle flex items-center text-[11px] text-muted-foreground shrink-0 select-none">
          <Clock className="h-3 w-3 text-muted-foreground/70 mr-1.5 shrink-0" />
          <span className="truncate">
            Last edited by <strong className="font-semibold text-foreground">{lastEditedInfo.name}</strong>{' '}
            {formatDistanceToNow(lastEditedInfo.time, { addSuffix: true })}
          </span>
        </div>
      )}

      {/* ─── Rich Text Formatting Ribbon ─────────────────────────────────── */}
      {editor && (
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-1.5 border-b border-border-default bg-surface-elevated/40 dark:bg-bg-secondary/30 shrink-0 select-none">
          {/* Bold */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer",
              editor.isActive('bold') && "bg-primary/20 text-primary hover:bg-primary/25"
            )}
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>

          {/* Italic */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer",
              editor.isActive('italic') && "bg-primary/20 text-primary hover:bg-primary/25"
            )}
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>

          {/* Strike */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer",
              editor.isActive('strike') && "bg-primary/20 text-primary hover:bg-primary/25"
            )}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          {/* Highlight */}
          <button
            type="button"
            onClick={() => (editor.chain().focus() as any).toggleHighlight().run()}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer",
              editor.isActive('highlight') && "bg-amber-400/20 text-amber-500 dark:text-amber-300 hover:bg-amber-400/25"
            )}
            title="Highlight"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-border-default mx-1 shrink-0" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer",
              editor.isActive('heading', { level: 1 }) && "bg-primary/20 text-primary hover:bg-primary/25"
            )}
            title="Heading 1"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer",
              editor.isActive('heading', { level: 2 }) && "bg-primary/20 text-primary hover:bg-primary/25"
            )}
            title="Heading 2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer",
              editor.isActive('heading', { level: 3 }) && "bg-primary/20 text-primary hover:bg-primary/25"
            )}
            title="Heading 3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-border-default mx-1 shrink-0" />

          {/* Bullet List */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer",
              editor.isActive('bulletList') && "bg-primary/20 text-primary hover:bg-primary/25"
            )}
            title="Bullet List"
          >
            <List className="w-3.5 h-3.5" />
          </button>

          {/* Numbered List */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer",
              editor.isActive('orderedList') && "bg-primary/20 text-primary hover:bg-primary/25"
            )}
            title="Numbered List"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>

          {/* Task Checklist */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer",
              editor.isActive('taskList') && "bg-primary/20 text-primary hover:bg-primary/25"
            )}
            title="Action Checklist"
          >
            <ListTodo className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-border-default mx-1 shrink-0" />

          {/* Blockquote */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer",
              editor.isActive('blockquote') && "bg-primary/20 text-primary hover:bg-primary/25"
            )}
            title="Quote / Callout"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>

          {/* Code Block */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={cn(
              "p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer",
              editor.isActive('codeBlock') && "bg-primary/20 text-primary hover:bg-primary/25"
            )}
            title="Code Block"
          >
            <Code className="w-3.5 h-3.5" />
          </button>

          {/* Horizontal Rule */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground transition-all cursor-pointer"
            title="Horizontal Divider"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-border-default mx-1 shrink-0" />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Undo"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-bg-tertiary hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="Redo"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── Main Document Body ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 scrollbar-thin">
        {isCanvasEmpty ? (
          <div className="space-y-5 py-4 max-w-lg mx-auto animate-fade-in">
            <div className="text-center space-y-1">
              <div className="inline-flex p-2.5 rounded-xl bg-primary/10 text-primary mb-1">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-extrabold tracking-wide text-foreground uppercase">Empty Canvas</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Collaborate with your channel on notes, sprint plans, or specifications.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              {CANVAS_TEMPLATES.slice(0, 4).map((tmpl) => {
                const Icon = tmpl.icon;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className="w-full text-left p-3 rounded-xl border border-border-default bg-surface hover:bg-bg-secondary hover:border-primary/40 transition-all flex items-start gap-3 group cursor-pointer shadow-xs hover:shadow-sm"
                  >
                    <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform mt-0.5">
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-foreground truncate">{tmpl.title}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed break-words">{tmpl.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-center pt-1">
              <button
                onClick={() => {
                  if (editor) {
                    editor.commands.setContent('<p></p>');
                    editor.commands.focus();
                  }
                }}
                className="text-xs font-bold text-primary hover:underline cursor-pointer"
              >
                Or start with a blank document →
              </button>
            </div>
          </div>
        ) : (
          <div className="canvas-container w-full h-full max-h-full">
            {editor && !editor.isDestroyed && <EditorContent editor={editor} />}
          </div>
        )}
      </div>

      {/* ─── Templates Modal ─────────────────────────────────────────────── */}
      <CanvasTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
        hasExistingContent={!isCanvasEmpty}
      />

      {/* ─── Scoped CSS for TipTap Editor Content in Light & Dark Mode ────── */}
      <style>{`
        .canvas-editor-content {
          color: var(--text-primary);
          font-family: var(--font-sans);
          line-height: 1.7;
          font-size: 0.9375rem;
        }
        
        .canvas-editor-content h1 {
          font-size: 1.4rem;
          font-weight: 800;
          letter-spacing: -0.025em;
          color: var(--text-primary);
          margin-top: 1.25rem;
          margin-bottom: 0.65rem;
          padding-bottom: 0.35rem;
          border-bottom: 1px solid var(--border-subtle);
        }

        .canvas-editor-content h2 {
          font-size: 1.15rem;
          font-weight: 700;
          letter-spacing: -0.015em;
          color: var(--text-primary);
          margin-top: 1.1rem;
          margin-bottom: 0.45rem;
        }

        .canvas-editor-content h3 {
          font-size: 0.95rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-top: 0.9rem;
          margin-bottom: 0.3rem;
        }

        .canvas-editor-content p {
          margin-bottom: 0.65rem;
          color: var(--text-primary);
          opacity: 0.95;
        }

        .canvas-editor-content strong {
          font-weight: 700;
          color: var(--text-primary);
        }

        .canvas-editor-content em {
          font-style: italic;
        }

        .canvas-editor-content s {
          text-decoration: line-through;
          opacity: 0.7;
        }

        .canvas-editor-content mark {
          background-color: rgba(234, 179, 8, 0.3);
          color: inherit;
          padding: 0.1rem 0.25rem;
          border-radius: 0.25rem;
        }

        .canvas-editor-content blockquote {
          border-left: 3px solid var(--accent, #6366f1);
          padding-left: 1rem;
          margin: 0.85rem 0;
          color: var(--text-secondary);
          background-color: var(--bg-tertiary);
          border-radius: 0 0.5rem 0.5rem 0;
          padding-top: 0.45rem;
          padding-bottom: 0.45rem;
        }

        .canvas-editor-content blockquote p {
          margin-bottom: 0;
        }

        .canvas-editor-content pre {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-default);
          padding: 0.75rem 1rem;
          border-radius: 0.5rem;
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          margin: 0.85rem 0;
          overflow-x: auto;
        }

        .canvas-editor-content code {
          background-color: var(--bg-tertiary);
          color: var(--text-primary);
          padding: 0.125rem 0.35rem;
          border-radius: 0.25rem;
          font-family: var(--font-mono);
          font-size: 0.8125rem;
          border: 1px solid var(--border-subtle);
        }

        .canvas-editor-content hr {
          border: none;
          border-top: 1px solid var(--border-default);
          margin: 1.25rem 0;
        }

        .canvas-editor-content ul:not([data-type="taskList"]) {
          list-style-type: disc;
          padding-left: 1.35rem;
          margin: 0.65rem 0;
        }

        .canvas-editor-content ol {
          list-style-type: decimal;
          padding-left: 1.35rem;
          margin: 0.65rem 0;
        }

        .canvas-editor-content li {
          margin-bottom: 0.2rem;
        }

        .canvas-editor-content li p {
          margin-bottom: 0;
        }

        /* Task List Checklist styling */
        .canvas-editor-content ul[data-type="taskList"] {
          list-style: none;
          padding-left: 0;
          margin: 0.65rem 0;
        }

        .canvas-editor-content ul[data-type="taskList"] li {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          margin-bottom: 0.35rem;
        }

        .canvas-editor-content ul[data-type="taskList"] li > label {
          margin-top: 0.2rem;
          user-select: none;
          cursor: pointer;
        }

        .canvas-editor-content ul[data-type="taskList"] li > label input[type="checkbox"] {
          appearance: none;
          width: 1rem;
          height: 1rem;
          border-radius: 0.25rem;
          border: 1.5px solid var(--border-strong);
          background-color: var(--surface);
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.15s ease-in-out;
        }

        .canvas-editor-content ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
          background-color: var(--accent, #6366f1);
          border-color: var(--accent, #6366f1);
        }

        .canvas-editor-content ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after {
          content: '';
          display: block;
          width: 4px;
          height: 8px;
          border: solid white;
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
          margin-bottom: 2px;
        }

        .canvas-editor-content ul[data-type="taskList"] li[data-checked="true"] > div > p {
          text-decoration: line-through;
          opacity: 0.6;
        }

        .canvas-editor-content ul[data-type="taskList"] li > div {
          flex: 1;
        }
      `}</style>
    </div>
  );
}

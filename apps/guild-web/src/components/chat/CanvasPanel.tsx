import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  X, Check, Plus, Loader2, Sparkles, AlertCircle, Play, 
  HelpCircle, ChevronRight, ChevronLeft, ListTodo, FileText, Layout,
  Layers, Users, Star, Settings, CheckSquare, ClipboardList,
  Target, Send, PlusCircle, ArrowRight, BookOpen, Calendar,
  CheckCircle2, Flame, UserPlus, Info, AlertTriangle, ListChecks,
  ChevronDown,
  Bold, Italic, Highlighter, List, ListOrdered, Code
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { WorkspaceCardNode, CanvasContext } from './WorkspaceCardNode';
import { markdownToHtml, htmlToMarkdown } from '../../utils/markdownConverter';
import { WorkspaceCard } from './WorkspaceCard';
import { useCanvas } from '../../hooks/useCanvas';
import { useTasks } from '../../hooks/useTasks';
import { useGoals } from '../../hooks/useGoals';
import { useRequests } from '../../hooks/useRequests';
import { updateTask } from '../../lib/tasks';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '@/lib/utils';

interface CanvasPanelProps {
  chatId: string;
  onClose: () => void;
}

interface Block {
  type: 'header' | 'list' | 'table' | 'callout' | 'code' | 'paragraph';
  startLine: number;
  endLine: number;
  content: string;
}

const TEMPLATES = [
  {
    name: 'Blank Canvas',
    icon: FileText,
    description: 'Start with a clean slate.',
    content: '# Untitled Canvas\n\nClick here to start typing...'
  },
  {
    name: 'Project Kickoff 🚀',
    icon: Play,
    description: 'Kickoff a new project with your team.',
    content: `# 🚀 Project Kickoff: [Project Name]\n\n> [!TIP]\n> Use this canvas to centralize goals, tasks, and documentation for the project.\n\n## 🎯 Goals\n- [ ] Define project scope and deliverables\n- [ ] Align with key stakeholders\n- [ ] Launch MVP by end of quarter\n\n## 👥 Core Team\n| Role | Member |\n| --- | --- |\n| Project Lead | @user |\n| Engineering | @user |\n| Design | @user |\n\n## 📅 Milestones\n- **Milestone 1**: Requirements Doc (Target: Week 2)\n- **Milestone 2**: Design Prototype (Target: Week 4)\n- **Milestone 3**: Beta Launch (Target: Week 8)`
  },
  {
    name: 'Weekly Team Sync 📅',
    icon: ClipboardList,
    description: 'Plan your weekly agendas and align.',
    content: `# 📅 Weekly Team Sync\n\n> [!NOTE]\n> Meeting time: Every Monday at 10 AM. Use this canvas to track agendas and action items.\n\n## 📝 Agenda\n- Status updates from engineering, design, and product\n- Roadmap review and blockers\n- Feedback session\n\n## 📋 Action Items\n- [ ] Update project dashboard with Q3 targets\n- [ ] Schedule follow-up with marketing team\n- [ ] Review design drafts for the main page`
  },
  {
    name: 'Sprint Planning 🏃',
    icon: ListTodo,
    description: 'Set your sprint goals and backlog.',
    content: `# 🏃 Sprint Planning\n\n> [!IMPORTANT]\n> Sprint Cycle: 2 Weeks.\n\n## 🎯 Sprint Focus\nBuild and launch the new canvas feature in chat.\n\n## 📋 Sprint Backlog\n- [ ] Setup canvas database models in Firestore\n- [ ] Implement canvas toggle in chat header\n- [ ] Build rich-text editor with markdown rendering\n- [ ] Integrate workspace tasks/goals panel`
  },
  {
    name: 'Out of Office (OOO) Planner 🏖️',
    icon: Sparkles,
    description: 'Designate coverages and handovers.',
    content: `# 🏖️ Out of Office Planner\n\n## 📅 Coverage Details\n- **Dates**: [Start Date] to [End Date]\n- **Primary Contact**: @user\n- **Secondary Contact**: @user\n\n## 📝 Handover Tasks\n- [ ] Handover active client support tickets\n- [ ] Complete code review for PR #104\n- [ ] Send status update to management`
  }
];

const customEditorStyles = `
.ProseMirror {
  outline: none;
}
.ProseMirror h1 {
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--color-foreground, #0f172a);
  padding-bottom: 0.25rem;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}
.dark .ProseMirror h1 {
  color: #ffffff;
  border-bottom-color: rgba(255, 255, 255, 0.05);
}
.ProseMirror h2 {
  font-size: 1rem;
  font-weight: 700;
  color: rgba(15, 23, 42, 0.9);
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}
.dark .ProseMirror h2 {
  color: rgba(255, 255, 255, 0.9);
}
.ProseMirror h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.8);
  margin-top: 1rem;
  margin-bottom: 0.375rem;
}
.dark .ProseMirror h3 {
  color: rgba(255, 255, 255, 0.8);
}
.ProseMirror p {
  font-size: 0.75rem;
  color: rgba(15, 23, 42, 0.85);
  line-height: 1.625;
  margin-bottom: 0.5rem;
}
.dark .ProseMirror p {
  color: rgba(255, 255, 255, 0.85);
}
.ProseMirror ul[data-type="taskList"] {
  list-style: none;
  padding: 0;
  margin: 0.5rem 0;
}
.ProseMirror ul[data-type="taskList"] li {
  display: flex;
  align-items: start;
  gap: 0.625rem;
  margin-bottom: 0.375rem;
}
.ProseMirror ul[data-type="taskList"] li > label {
  margin-top: 0.125rem;
  user-select: none;
}
.ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
  appearance: none;
  width: 1rem;
  height: 1rem;
  border-radius: 0.25rem;
  border: 1px solid rgba(15, 23, 42, 0.2);
  background-color: rgba(15, 23, 42, 0.02);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
}
.dark .ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"] {
  border-color: rgba(255, 255, 255, 0.2);
  background-color: rgba(255, 255, 255, 0.02);
}
.ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked {
  background-color: #6366f1;
  border-color: #6366f1;
}
.ProseMirror ul[data-type="taskList"] li > label input[type="checkbox"]:checked::after {
  content: '';
  display: block;
  width: 0.25rem;
  height: 0.5rem;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  position: absolute;
  top: 15%;
  left: 35%;
}
.ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
  text-decoration: line-through;
  color: rgba(15, 23, 42, 0.4);
}
.dark .ProseMirror ul[data-type="taskList"] li[data-checked="true"] > div {
  color: rgba(255, 255, 255, 0.4);
}
.ProseMirror ul:not([data-type="taskList"]) {
  list-style-type: disc;
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}
.ProseMirror ul:not([data-type="taskList"]) li {
  font-size: 0.75rem;
  color: rgba(15, 23, 42, 0.85);
  margin-bottom: 0.25rem;
}
.dark .ProseMirror ul:not([data-type="taskList"]) li {
  color: rgba(255, 255, 255, 0.85);
}
.ProseMirror ol {
  list-style-type: decimal;
  padding-left: 1.25rem;
  margin: 0.5rem 0;
}
.ProseMirror ol li {
  font-size: 0.75rem;
  color: rgba(15, 23, 42, 0.85);
  margin-bottom: 0.25rem;
}
.dark .ProseMirror ol li {
  color: rgba(255, 255, 255, 0.85);
}
.ProseMirror blockquote {
  border-left: 4px solid #6366f1;
  padding-left: 1rem;
  margin: 1rem 0;
  font-style: italic;
  background-color: rgba(99, 102, 241, 0.03);
  border-radius: 0 0.75rem 0.75rem 0;
  padding: 0.75rem 1rem;
}
.ProseMirror blockquote[data-type="callout"] {
  border-radius: 0.75rem;
  border: 1px solid rgba(99, 102, 241, 0.1);
  border-left: 4px solid #6366f1;
  background-color: rgba(99, 102, 241, 0.05);
}
.ProseMirror blockquote[data-type="callout"][data-callout-type="note"] {
  border-color: rgba(59, 130, 246, 0.1);
  border-left-color: #3b82f6;
  background-color: rgba(59, 130, 246, 0.05);
}
.ProseMirror blockquote[data-type="callout"][data-callout-type="important"] {
  border-color: rgba(16, 185, 129, 0.1);
  border-left-color: #10b981;
  background-color: rgba(16, 185, 129, 0.05);
}
.ProseMirror blockquote[data-type="callout"][data-callout-type="warning"] {
  border-color: rgba(245, 158, 11, 0.1);
  border-left-color: #f59e0b;
  background-color: rgba(245, 158, 11, 0.05);
}
.ProseMirror pre {
  background-color: #0f172a;
  color: #e2e8f0;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  font-family: monospace;
  font-size: 0.7rem;
  overflow-x: auto;
  margin: 1rem 0;
}
.ProseMirror code {
  font-family: monospace;
  font-size: 0.7rem;
  background-color: rgba(99, 102, 241, 0.08);
  color: #818cf8;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
}
.ProseMirror pre code {
  background-color: transparent;
  color: inherit;
  padding: 0;
  border-radius: 0;
}
.ProseMirror table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
  font-size: 0.75rem;
}
.ProseMirror th, .ProseMirror td {
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0.5rem 0.75rem;
  text-align: left;
}
.ProseMirror th {
  background-color: rgba(255, 255, 255, 0.02);
  font-weight: 700;
}
.ProseMirror mark {
  background-color: rgba(234, 179, 8, 0.25);
  color: #eab308;
  border-radius: 0.25rem;
  padding: 0.05rem 0.15rem;
}
.dark .ProseMirror mark {
  background-color: rgba(234, 179, 8, 0.2);
  color: #fef08a;
}
`;

export function CanvasPanel({ chatId, onClose }: CanvasPanelProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const actor = React.useMemo(() => ({
    uid: user?.uid ?? '',
    name: userProfile?.fullName ?? 'User',
  }), [user, userProfile]);

  const {
    canvas,
    loading: canvasLoading,
    isSaving,
    localTitle,
    localContent,
    setLocalTitle,
    updateCanvas,
    forceSave
  } = useCanvas(chatId);

  // Fetch workspace items for the Sidebar and Card lookup
  const { tasks } = useTasks(orgId);
  const { goals } = useGoals(orgId);
  const { received, sent } = useRequests(orgId);
  const allRequests = React.useMemo(() => [...received, ...sent], [received, sent]);
  const [viewMode, setViewMode] = React.useState<'document' | 'workspace'>('document');
  const [sidebarTab, setSidebarTab] = React.useState<'tasks' | 'goals' | 'requests'>('tasks');

  // TipTap Editor instance
  const editor = useEditor({
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      WorkspaceCardNode,
      Highlight,
    ],
    content: markdownToHtml(localContent),
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert focus:outline-none max-w-none text-xs text-foreground/85 leading-relaxed min-h-[200px] select-text',
      },
      handleClick: (view, pos, event) => {
        const target = event.target as HTMLElement;
        const anchor = target.closest('a');
        if (anchor) {
          event.preventDefault();
          const isCard = anchor.hasAttribute('data-workspace-card');
          if (isCard) {
            const type = anchor.getAttribute('data-type');
            const id = anchor.getAttribute('data-id');
            if (type && id) {
              const params = new URLSearchParams(searchParams);
              params.set(type.toLowerCase(), id);
              setSearchParams(params);
            }
          } else {
            const href = anchor.getAttribute('href');
            if (href) {
              window.open(href, '_blank', 'noopener,noreferrer');
            }
          }
          return true;
        }
        return false;
      }
    },
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed) return;
      const html = editor.getHTML();
      const markdown = htmlToMarkdown(html);
      updateCanvas(markdown, localTitle);
    },
  }, []);

  // Sync editor content with external changes (e.g. from database)
  React.useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    
    // Prevent overwriting the editor content while the user is actively typing/focused
    if (editor.isFocused) return;

    const currentHtml = editor.getHTML();
    const targetHtml = markdownToHtml(localContent);
    const norm = (html: string) => html.replace(/\s+/g, '').toLowerCase();
    if (norm(currentHtml) !== norm(targetHtml)) {
      editor.commands.setContent(targetHtml, { emitUpdate: false });
    }
  }, [localContent, editor]);

  // Insert workspace item tag into the editor selection
  const handleInsertItem = (type: 'Task' | 'Goal' | 'Request', title: string, id: string) => {
    if (!editor) return;
    editor.chain()
      .focus()
      .insertContent({
        type: 'workspaceCard',
        attrs: {
          type,
          id,
          title,
        },
      })
      .run();
  };
  const handleApplyTemplate = (content: string) => {
    if (editor) {
      editor.commands.setContent(markdownToHtml(content));
    }
    updateCanvas(content, localTitle);
  };

  if (canvasLoading) {
    return (
      <div className="h-full border-l border-white/10 dark:border-white/5 bg-surface/95 dark:bg-zinc-950/70 backdrop-blur-3xl flex flex-col items-center justify-center z-30 overflow-hidden absolute inset-y-0 right-0 w-full sm:w-[500px] lg:relative lg:w-[480px] xl:w-[600px] 2xl:w-[700px] shadow-2xl lg:shadow-none shrink-0">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground mt-3 font-semibold tracking-wider">LOADING CANVAS...</span>
      </div>
    );
  }

  const isCanvasEmpty = !localContent || localContent.trim() === '';

  return (
    <div className="h-full border-l border-white/10 dark:border-white/5 bg-surface/95 dark:bg-zinc-950/70 backdrop-blur-3xl flex z-30 overflow-hidden absolute inset-y-0 right-0 w-full sm:w-[500px] lg:relative lg:w-[480px] xl:w-[600px] 2xl:w-[700px] shadow-2xl lg:shadow-none shrink-0">
      
      {viewMode === 'document' ? (
        /* Main Canvas Document Editor */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Canvas Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 flex-1 mr-3">
              <div className="h-7 w-7 rounded-lg bg-indigo-500/10 flex items-center justify-center text-primary">
                <FileText className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={localTitle}
                onChange={(e) => updateCanvas(localContent, e.target.value)}
                placeholder="Untitled Canvas"
                className="text-sm font-bold text-foreground bg-transparent border-none outline-none focus:ring-0 p-0 truncate flex-1"
              />
            </div>
            
            <div className="flex items-center gap-2">
              {isSaving && (
                <span className="text-[10px] text-primary/70 font-semibold uppercase tracking-wider animate-pulse flex items-center gap-1.5 mr-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving
                </span>
              )}
              
              <button
                onClick={() => setViewMode('workspace')}
                className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-semibold cursor-pointer border border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground transition-colors"
                title="Open Workspace Items"
              >
                <Layout className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Workspace</span>
              </button>

              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Rich Text Editor Formatting Toolbar */}
          {!isCanvasEmpty && editor && (
            <div className="flex flex-wrap items-center gap-1 px-4 py-1.5 border-b border-white/5 bg-white/[0.01] shrink-0 select-none">
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(
                  "p-1.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all cursor-pointer",
                  editor.isActive('bold') && "bg-primary/20 text-primary hover:bg-primary/25"
                )}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(
                  "p-1.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all cursor-pointer",
                  editor.isActive('italic') && "bg-primary/20 text-primary hover:bg-primary/25"
                )}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={cn(
                  "p-1.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all cursor-pointer",
                  editor.isActive('highlight') && "bg-primary/20 text-primary hover:bg-primary/25"
                )}
                title="Highlight"
              >
                <Highlighter className="w-3.5 h-3.5" />
              </button>

              <div className="w-[1px] h-4 bg-white/10 mx-1" />

              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                className={cn(
                  "px-2 py-1 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all font-black text-[10px] tracking-tight cursor-pointer",
                  editor.isActive('heading', { level: 1 }) && "bg-primary/20 text-primary hover:bg-primary/25"
                )}
                title="Heading 1"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                className={cn(
                  "px-2 py-1 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all font-black text-[10px] tracking-tight cursor-pointer",
                  editor.isActive('heading', { level: 2 }) && "bg-primary/20 text-primary hover:bg-primary/25"
                )}
                title="Heading 2"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                className={cn(
                  "px-2 py-1 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all font-black text-[10px] tracking-tight cursor-pointer",
                  editor.isActive('heading', { level: 3 }) && "bg-primary/20 text-primary hover:bg-primary/25"
                )}
                title="Heading 3"
              >
                H3
              </button>

              <div className="w-[1px] h-4 bg-white/10 mx-1" />

              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={cn(
                  "p-1.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all cursor-pointer",
                  editor.isActive('bulletList') && "bg-primary/20 text-primary hover:bg-primary/25"
                )}
                title="Bullet List"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={cn(
                  "p-1.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all cursor-pointer",
                  editor.isActive('orderedList') && "bg-primary/20 text-primary hover:bg-primary/25"
                )}
                title="Numbered List"
              >
                <ListOrdered className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleTaskList().run()}
                className={cn(
                  "p-1.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all cursor-pointer",
                  editor.isActive('taskList') && "bg-primary/20 text-primary hover:bg-primary/25"
                )}
                title="Checklist"
              >
                <ListTodo className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={cn(
                  "p-1.5 rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground transition-all cursor-pointer",
                  editor.isActive('codeBlock') && "bg-primary/20 text-primary hover:bg-primary/25"
                )}
                title="Code Block"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Canvas Body Pane */}
          <div className="flex-1 overflow-y-auto aether-scroll p-6 space-y-3.5">
            {isCanvasEmpty ? (
              <div className="space-y-6 py-6 animate-fluid-pop">
                <div className="text-center">
                  <h3 className="text-sm font-black tracking-wide text-foreground uppercase">Choose a Canvas Template</h3>
                  <p className="text-[11px] text-muted-foreground mt-1">Get started quickly with standard document outlines</p>
                </div>
                <div className="grid grid-cols-1 gap-3.5">
                  {TEMPLATES.map((tmpl, idx) => {
                    const Icon = tmpl.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleApplyTemplate(tmpl.content)}
                        className="w-full text-left aether-glass p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/5 hover:border-primary/20 transition-all flex items-start gap-4 group cursor-pointer"
                      >
                        <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-foreground leading-snug">{tmpl.name}</h4>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{tmpl.description}</p>
                        </div>
                        <div className="h-6 w-6 rounded-lg bg-white/5 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors mt-1">
                          <ArrowRight className="h-3.5 w-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="select-text font-sans w-full h-full max-h-full overflow-y-auto">
                <style dangerouslySetInnerHTML={{ __html: customEditorStyles }} />
                <CanvasContext.Provider value={{
                  orgId: orgId ?? '',
                  actor,
                  tasks,
                  goals,
                  requests: allRequests,
                  onOpenCard: (paramKey, val) => {
                    const params = new URLSearchParams(searchParams);
                    params.set(paramKey, val);
                    setSearchParams(params);
                  }
                }}>
                  {editor && !editor.isDestroyed && <EditorContent editor={editor} />}
                </CanvasContext.Provider>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Workspace Active Items Panel (Replaces Document Editor) */
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0 bg-white/2">
            <button
              onClick={() => setViewMode('document')}
              className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-bold text-muted-foreground hover:bg-white/5 hover:text-foreground cursor-pointer transition-colors border border-white/5"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Canvas</span>
            </button>
            
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-white/5 hover:text-foreground cursor-pointer transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-white/5 p-1.5 bg-white/2 shrink-0">
            {(['tasks', 'goals', 'requests'] as const).map((tab) => {
              const config = {
                tasks: { label: 'Active Tasks', icon: ListTodo },
                goals: { label: 'Workspace Goals', icon: Target },
                requests: { label: 'Approval Requests', icon: ClipboardList }
              }[tab];
              
              const Icon = config.icon;
              const isActive = sidebarTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className={cn(
                    "flex-1 flex items-center justify-center py-2.5 rounded-lg text-[10px] font-extrabold uppercase tracking-widest gap-2 cursor-pointer transition-colors border",
                    isActive 
                      ? "bg-primary border-primary/20 text-white shadow-lg shadow-primary/15" 
                      : "border-transparent text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto aether-scroll p-5 space-y-3">
            
            {/* TASKS TAB */}
            {sidebarTab === 'tasks' && (
              <>
                {tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic text-center pt-12">No active tasks found in this organization.</p>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="aether-glass p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/2 hover:border-white/10 transition-all flex items-center justify-between gap-4 group">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-foreground/95 block truncate leading-snug">{task.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border",
                            task.status === 'done' ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" :
                            task.status === 'in_progress' ? "bg-blue-500/10 border-blue-500/25 text-blue-400" :
                            task.status === 'review' ? "bg-amber-500/10 border-amber-500/25 text-amber-400" :
                            "bg-zinc-500/10 border-white/5 text-zinc-400"
                          )}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider">{task.priority} priority</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleInsertItem('Task', task.title, task.id);
                          setViewMode('document');
                        }}
                        className="text-[10px] font-black uppercase text-primary hover:text-primary-foreground hover:bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/20 transition-all cursor-pointer shadow-sm"
                      >
                        Insert Card
                      </button>
                    </div>
                  ))
                )}
              </>
            )}

            {/* GOALS TAB */}
            {sidebarTab === 'goals' && (
              <>
                {goals.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic text-center pt-12">No active goals found in this organization.</p>
                ) : (
                  goals.map((goal) => (
                    <div key={goal.id} className="aether-glass p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/2 hover:border-white/10 transition-all flex items-center justify-between gap-4 group">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-foreground/95 block truncate leading-snug">{goal.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-black uppercase">Goal</span>
                          <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider">
                            {goal.horizon.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleInsertItem('Goal', goal.title, goal.id);
                          setViewMode('document');
                        }}
                        className="text-[10px] font-black uppercase text-primary hover:text-primary-foreground hover:bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/20 transition-all cursor-pointer shadow-sm"
                      >
                        Insert Card
                      </button>
                    </div>
                  ))
                )}
              </>
            )}

            {/* REQUESTS TAB */}
            {sidebarTab === 'requests' && (
              <>
                {allRequests.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 italic text-center pt-12">No active requests found in this organization.</p>
                ) : (
                  allRequests.map((req) => (
                    <div key={req.id} className="aether-glass p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/2 hover:border-white/10 transition-all flex items-center justify-between gap-4 group">
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-foreground/95 block truncate leading-snug">{req.title}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={cn(
                            "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border",
                            req.status === 'approved' ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" :
                            req.status === 'rejected' ? "bg-red-500/10 border-red-500/25 text-red-400" :
                            "bg-amber-500/10 border-amber-500/25 text-amber-400"
                          )}>
                            {req.status}
                          </span>
                          <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider">Submitted by {req.creatorName}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          handleInsertItem('Request', req.title, req.id);
                          setViewMode('document');
                        }}
                        className="text-[10px] font-black uppercase text-primary hover:text-primary-foreground hover:bg-primary/20 px-2.5 py-1 rounded-lg border border-primary/20 transition-all cursor-pointer shadow-sm"
                      >
                        Insert Card
                      </button>
                    </div>
                  ))
                )}
              </>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

// ─── Workspace Live Interactive Card Component ─────────────────────────────────



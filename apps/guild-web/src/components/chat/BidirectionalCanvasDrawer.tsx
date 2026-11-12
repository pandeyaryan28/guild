import * as React from 'react';
import { 
  X, Check, Loader2, FileText, Layers, MessageSquare, 
  Bold, Italic, Strikethrough, Highlighter, 
  Heading1, Heading2, Heading3, 
  List, ListOrdered, ListTodo, 
  Quote, Code, Copy, Trash2, Clock, 
  ArrowUpRight, Link2, Unlink, Plus, Search, 
  CheckSquare, ChevronDown, User, ExternalLink,
  Flame, RefreshCw
} from 'lucide-react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { motion, AnimatePresence } from 'motion/react';
import { useCanvas } from '../../hooks/useCanvas';
import { useWorkspaceDocuments, useWorkspaceDocument } from '../../hooks/useWorkspaceDocuments';
import { useAuth } from '../../hooks/useAuth';
import { createWorkspaceIssue } from '../../lib/workspaceIssues';
import { updateWorkspaceDocumentContent } from '../../lib/workspaceDocuments';
import { exportHtmlToMarkdown } from '../../utils/markdownConverter';
import { CanvasTemplatesModal, type CanvasTemplate } from './CanvasTemplatesModal';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { type UserProfile } from '../../lib/firestore';
import type { WorkspaceDocument, IssuePriority } from '@guild/types';

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Layers,
  CheckSquare,
  MessageSquare,
};

function DocIcon({ icon, className = 'w-4 h-4' }: { icon?: string; className?: string }) {
  if (icon && ICON_MAP[icon]) {
    const Comp = ICON_MAP[icon];
    return <Comp className={className} />;
  }
  return <FileText className={className} />;
}

export interface BidirectionalCanvasDrawerProps {
  chatId: string;
  chatName?: string;
  isDM?: boolean;
  members?: UserProfile[];
  onClose: () => void;
}

export function BidirectionalCanvasDrawer({
  chatId,
  chatName = 'Channel',
  isDM = false,
  members = [],
  onClose,
}: BidirectionalCanvasDrawerProps) {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;

  // Active drawer mode: 'scratchpad' (ephemeral channel notes) or 'linked_doc' (live workspace doc)
  const [mode, setMode] = React.useState<'scratchpad' | 'linked_doc'>('scratchpad');

  // Persistence of linked doc ID per chat
  const storageKey = `guild-chat-linked-doc-${chatId}`;
  const [linkedDocId, setLinkedDocId] = React.useState<string | null>(() => {
    return localStorage.getItem(storageKey) || null;
  });

  const handleSetLinkedDocId = React.useCallback((id: string | null) => {
    setLinkedDocId(id);
    if (id) {
      localStorage.setItem(storageKey, id);
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  // Toast banner state
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);
  const showToast = React.useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3200);
  }, []);

  // ─── Channel Scratchpad Data ────────────────────────────────────────────────
  const {
    canvas,
    loading: scratchpadLoading,
    saveStatus: scratchpadSaveStatus,
    localTitle: scratchpadTitle,
    localContent: scratchpadContent,
    setLocalTitle: setScratchpadTitle,
    updateCanvas: updateScratchpad,
    forceSave: forceSaveScratchpad,
    lastEditedInfo,
  } = useCanvas(chatId);

  // ─── Workspace Documents Data ───────────────────────────────────────────────
  const {
    documents: allWorkspaceDocs,
    loading: workspaceDocsLoading,
    createDocument,
  } = useWorkspaceDocuments(orgId);

  const {
    document: linkedDocument,
    loading: linkedDocLoading,
    saveStatus: linkedDocSaveStatus,
    saveContent: saveLinkedDocContent,
  } = useWorkspaceDocument(linkedDocId || undefined);

  // Modals & Popovers
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = React.useState(false);
  const [isDocPickerOpen, setIsDocPickerOpen] = React.useState(false);
  const [docSearchQuery, setDocSearchQuery] = React.useState('');
  const [copied, setCopied] = React.useState(false);
  const [isPromoting, setIsPromoting] = React.useState(false);

  // ─── Action Extraction State ("Convert to Issue") ───────────────────────────
  const [showConvertModal, setShowConvertModal] = React.useState(false);
  const [issueTitle, setIssueTitle] = React.useState('');
  const [issueAssigneeId, setIssueAssigneeId] = React.useState<string>('');
  const [issuePriority, setIssuePriority] = React.useState<IssuePriority>('medium');
  const [isCreatingIssue, setIsCreatingIssue] = React.useState(false);
  const [selectedText, setSelectedText] = React.useState('');
  const [toolbarPos, setToolbarPos] = React.useState<{ top: number; left: number } | null>(null);

  // ─── TipTap Editor for Scratchpad ───────────────────────────────────────────
  const scratchpadEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight as any,
    ],
    content: scratchpadContent || '',
    editorProps: {
      attributes: {
        class: 'canvas-editor-content focus:outline-none min-h-[300px] select-text px-4 py-3 leading-relaxed text-sm text-foreground',
      },
    },
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed) return;
      const html = editor.getHTML();
      updateScratchpad(html, scratchpadTitle);
    },
  }, []);

  // Sync scratchpad content from remote updates
  React.useEffect(() => {
    if (!scratchpadEditor || scratchpadEditor.isDestroyed) return;
    if (scratchpadEditor.isFocused) return;

    const currentHtml = scratchpadEditor.getHTML();
    const targetHtml = scratchpadContent || '';
    if (currentHtml !== targetHtml) {
      scratchpadEditor.commands.setContent(targetHtml, { emitUpdate: false });
    }
  }, [scratchpadContent, scratchpadEditor]);

  // ─── TipTap Editor for Linked Workspace Document ────────────────────────────
  const linkedDocEditor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight as any,
    ],
    content: linkedDocument?.contentHtml || '',
    editorProps: {
      attributes: {
        class: 'canvas-editor-content focus:outline-none min-h-[300px] select-text px-4 py-3 leading-relaxed text-sm text-foreground',
      },
    },
    onUpdate: ({ editor }) => {
      if (editor.isDestroyed || !linkedDocument) return;
      const html = editor.getHTML();
      saveLinkedDocContent(
        linkedDocument.contentJson || JSON.stringify(editor.getJSON()),
        html,
        linkedDocument.title
      );
    },
  }, [linkedDocument?.id]);

  // Sync linked doc content from remote updates
  React.useEffect(() => {
    if (!linkedDocEditor || linkedDocEditor.isDestroyed || !linkedDocument) return;
    if (linkedDocEditor.isFocused) return;

    const currentHtml = linkedDocEditor.getHTML();
    const targetHtml = linkedDocument.contentHtml || '';
    if (currentHtml !== targetHtml) {
      linkedDocEditor.commands.setContent(targetHtml, { emitUpdate: false });
    }
  }, [linkedDocument?.contentHtml, linkedDocEditor]);

  // Active editor helper
  const activeEditor = mode === 'scratchpad' ? scratchpadEditor : linkedDocEditor;

  // ─── Text Selection Listener for Action Extraction ───────────────────────────
  React.useEffect(() => {
    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setToolbarPos(null);
        return;
      }

      const text = selection.toString().trim();
      if (text.length > 2) {
        try {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          // Position floating pill above selection
          setToolbarPos({
            top: Math.max(70, rect.top - 46),
            left: Math.max(20, rect.left + rect.width / 2 - 80),
          });
          setSelectedText(text);
        } catch {
          setToolbarPos(null);
        }
      } else {
        setToolbarPos(null);
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    return () => document.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Open Issue conversion dialog from selection
  const handleOpenConvertModal = (initialTitle?: string) => {
    setIssueTitle(initialTitle || selectedText || '');
    if (members.length > 0 && !issueAssigneeId) {
      setIssueAssigneeId(members[0].uid);
    }
    setToolbarPos(null);
    setShowConvertModal(true);
  };

  // Convert highlighted text into a real Workspace Issue
  const handleCreateIssue = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!issueTitle.trim() || !orgId || !userProfile || isCreatingIssue) return;

    setIsCreatingIssue(true);
    try {
      const assignee = members.find((m) => m.uid === issueAssigneeId);
      const issueId = await createWorkspaceIssue({
        orgId,
        title: issueTitle.trim(),
        priority: issuePriority,
        assigneeId: assignee?.uid || null,
        assigneeName: assignee?.fullName || null,
        assigneeAvatar: assignee?.photoURL || null,
        teamPrefix: 'ENG',
        userId: userProfile.uid,
        userName: userProfile.fullName || 'Teammate',
      });

      // Insert issue token into current editor
      if (activeEditor && !activeEditor.isDestroyed) {
        const tokenHtml = ` <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-semibold select-none">⚡ Issue #${issueId.slice(-4).toUpperCase()}: ${issueTitle.trim()}</span> `;
        activeEditor.commands.insertContent(tokenHtml);
      }

      showToast(`Created issue #${issueId.slice(-4).toUpperCase()} assigned to @${assignee?.username || 'team'}`);
      setShowConvertModal(false);
      setIssueTitle('');
    } catch (err) {
      console.error('Failed to create issue:', err);
      showToast('Error creating issue. Please try again.');
    } finally {
      setIsCreatingIssue(false);
    }
  };

  // ─── Promote Scratchpad to Workspace Document ───────────────────────────────
  const handlePromoteToWorkspaceDoc = async () => {
    if (!orgId || !userProfile || isPromoting) return;
    setIsPromoting(true);

    try {
      const docTitle = scratchpadTitle.trim() && scratchpadTitle !== 'Untitled Canvas'
        ? scratchpadTitle.trim()
        : `${chatName} Notes`;

      const newDocId = await createDocument({
        title: docTitle,
        icon: isDM ? 'MessageSquare' : 'FileText',
      });

      await updateWorkspaceDocumentContent({
        docId: newDocId,
        contentJson: JSON.stringify({ type: 'doc', content: [] }),
        contentHtml: scratchpadContent,
        title: docTitle,
        userId: userProfile.uid,
        userName: userProfile.fullName || 'Teammate',
      });

      handleSetLinkedDocId(newDocId);
      setMode('linked_doc');
      showToast(`Promoted to Workspace Document "${docTitle}"`);
    } catch (err) {
      console.error('Failed to promote scratchpad:', err);
      showToast('Failed to promote document');
    } finally {
      setIsPromoting(false);
    }
  };

  // Handle template selection
  const handleSelectTemplate = (template: CanvasTemplate) => {
    if (!activeEditor || activeEditor.isDestroyed) return;
    activeEditor.commands.setContent(template.content);
    const newTitle = template.id === 'blank' ? 'Untitled Canvas' : template.title;
    if (mode === 'scratchpad') {
      setScratchpadTitle(newTitle);
      updateScratchpad(template.content, newTitle);
    } else if (linkedDocument) {
      saveLinkedDocContent(
        JSON.stringify(activeEditor.getJSON()),
        template.content,
        newTitle
      );
    }
    setIsTemplatesModalOpen(false);
  };

  // Copy as Markdown
  const handleCopyMarkdown = async () => {
    if (!activeEditor) return;
    const html = activeEditor.getHTML();
    const title = mode === 'scratchpad' ? scratchpadTitle : linkedDocument?.title;
    const markdown = exportHtmlToMarkdown(html);
    const textToCopy = `# ${title || 'Notes'}\n\n${markdown}`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Copied as Markdown to clipboard');
    } catch (err) {
      console.error('Failed to copy markdown:', err);
    }
  };

  // Filtered documents for picker modal
  const filteredWorkspaceDocs = React.useMemo(() => {
    if (!docSearchQuery.trim()) return allWorkspaceDocs;
    const q = docSearchQuery.toLowerCase();
    return allWorkspaceDocs.filter((d) => d.title.toLowerCase().includes(q));
  }, [allWorkspaceDocs, docSearchQuery]);

  return (
    <motion.aside
      initial={{ x: '100%', opacity: 0.7 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 350 }}
      className="absolute inset-y-0 right-0 z-30 w-full sm:w-[480px] lg:w-[540px] flex flex-col bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border-l border-border dark:border-border-strong shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)] overflow-hidden select-none"
    >
      {/* ─── Top Segmented Control & Navigation Header ─────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface/80 dark:bg-surface/60 shrink-0 gap-3">
        {/* Apple macOS Segmented Pill Switcher */}
        <div className="flex items-center p-0.5 rounded-full bg-secondary/80 border border-border text-xs">
          <button
            type="button"
            onClick={() => setMode('scratchpad')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              mode === 'scratchpad'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <FileText className="h-3.5 w-3.5 text-primary" />
            <span>Scratchpad</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('linked_doc')}
            className={cn(
              'px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5',
              mode === 'linked_doc'
                ? 'bg-surface text-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Link2 className="h-3.5 w-3.5 text-indigo-500" />
            <span>Workspace Doc</span>
            {linkedDocId && (
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
            )}
          </button>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-1.5">
          {/* Quick Issue Extraction Button */}
          <button
            type="button"
            onClick={() => handleOpenConvertModal()}
            className="flex h-8 px-2.5 items-center gap-1.5 rounded-xl border border-border bg-secondary/60 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title="Extract selected text to Issue"
          >
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span className="hidden sm:inline">Issue</span>
          </button>

          {/* Close Drawer Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
            title="Close Canvas (Cmd+\)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ─── Mode Specific Subheader Bar ───────────────────────────────────── */}
      {mode === 'scratchpad' ? (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30 shrink-0 gap-2">
          {/* Scratchpad Title Input */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <input
              type="text"
              value={scratchpadTitle}
              onChange={(e) => updateScratchpad(scratchpadContent, e.target.value)}
              onBlur={() => forceSaveScratchpad(scratchpadContent, scratchpadTitle)}
              placeholder="Channel Scratchpad"
              className="text-sm font-bold text-foreground bg-transparent border-none outline-none p-0 truncate flex-1 hover:bg-secondary/40 focus:bg-secondary/60 rounded px-1.5 py-0.5 transition-colors"
            />
            {/* Save Status Dot */}
            <div className="shrink-0 flex items-center">
              {scratchpadSaveStatus === 'saving' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary animate-pulse">
                  <Loader2 className="h-2.5 w-2.5 animate-spin" />
                  <span className="hidden sm:inline">Saving</span>
                </span>
              )}
              {scratchpadSaveStatus === 'saved' && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="hidden sm:inline text-muted-foreground text-[10px]">Saved</span>
                </span>
              )}
              {scratchpadSaveStatus === 'unsaved' && (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
              )}
            </div>
          </div>

          {/* Promote to Workspace Document Action */}
          <button
            type="button"
            onClick={handlePromoteToWorkspaceDoc}
            disabled={isPromoting || !scratchpadContent}
            className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
            title="Convert channel scratchpad into a permanent Workspace Document"
          >
            {isPromoting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowUpRight className="h-3.5 w-3.5" />
            )}
            <span>Promote to Doc</span>
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-secondary/30 shrink-0 gap-2">
          {/* Linked Doc Title & Switcher */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <DocIcon icon={linkedDocument?.icon} className="w-4 h-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-foreground truncate">
              {linkedDocument?.title || (linkedDocLoading ? 'Loading document…' : 'No document linked')}
            </span>
            {linkedDocument && (
              <span className="text-[10px] text-muted-foreground font-mono">
                {linkedDocSaveStatus === 'saving' ? 'Saving…' : 'Synced'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {linkedDocument && (
              <a
                href={`/workspace?doc=${linkedDocument.id}`}
                target="_blank"
                rel="noreferrer"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                title="Open in Workspace Canvas"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
            <button
              type="button"
              onClick={() => setIsDocPickerOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl border border-border bg-surface text-xs font-semibold text-muted-foreground hover:text-foreground transition-all cursor-pointer"
            >
              <Link2 className="h-3 w-3" />
              <span>{linkedDocId ? 'Switch' : 'Attach Doc'}</span>
            </button>
            {linkedDocId && (
              <button
                type="button"
                onClick={() => handleSetLinkedDocId(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                title="Unlink document from chat"
              >
                <Unlink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── Rich Text Formatting Ribbon ─────────────────────────────────── */}
      {activeEditor && (
        <div className="flex flex-wrap items-center gap-0.5 px-3 py-1 border-b border-border bg-surface/50 shrink-0 select-none text-xs">
          <button
            type="button"
            onClick={() => activeEditor.chain().focus().toggleBold().run()}
            className={cn(
              'p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer',
              activeEditor.isActive('bold') && 'bg-primary/15 text-primary font-bold'
            )}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => activeEditor.chain().focus().toggleItalic().run()}
            className={cn(
              'p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer',
              activeEditor.isActive('italic') && 'bg-primary/15 text-primary'
            )}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => activeEditor.chain().focus().toggleStrike().run()}
            className={cn(
              'p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer',
              activeEditor.isActive('strike') && 'bg-primary/15 text-primary'
            )}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => activeEditor.chain().focus().toggleHighlight().run()}
            className={cn(
              'p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer',
              activeEditor.isActive('highlight') && 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
            )}
            title="Highlight"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-border mx-1" />

          <button
            type="button"
            onClick={() => activeEditor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              'p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer',
              activeEditor.isActive('heading', { level: 1 }) && 'bg-primary/15 text-primary'
            )}
            title="Heading 1"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => activeEditor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              'p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer',
              activeEditor.isActive('heading', { level: 2 }) && 'bg-primary/15 text-primary'
            )}
            title="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-border mx-1" />

          <button
            type="button"
            onClick={() => activeEditor.chain().focus().toggleBulletList().run()}
            className={cn(
              'p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer',
              activeEditor.isActive('bulletList') && 'bg-primary/15 text-primary'
            )}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => activeEditor.chain().focus().toggleOrderedList().run()}
            className={cn(
              'p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer',
              activeEditor.isActive('orderedList') && 'bg-primary/15 text-primary'
            )}
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => activeEditor.chain().focus().toggleTaskList().run()}
            className={cn(
              'p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer',
              activeEditor.isActive('taskList') && 'bg-primary/15 text-primary'
            )}
            title="Task Checklist"
          >
            <ListTodo className="h-3.5 w-3.5" />
          </button>

          <div className="w-[1px] h-4 bg-border mx-1" />

          <button
            type="button"
            onClick={() => activeEditor.chain().focus().toggleCodeBlock().run()}
            className={cn(
              'p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer',
              activeEditor.isActive('codeBlock') && 'bg-primary/15 text-primary'
            )}
            title="Code Block"
          >
            <Code className="h-3.5 w-3.5" />
          </button>

          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsTemplatesModalOpen(true)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary transition-all cursor-pointer"
            >
              <FileText className="h-3 w-3 text-primary" />
              <span>Templates</span>
            </button>
            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="p-1.5 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all cursor-pointer"
              title="Copy as Markdown"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      )}

      {/* ─── Main Editor View ──────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto relative aether-scroll">
        {mode === 'scratchpad' ? (
          scratchpadLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs font-semibold tracking-wider uppercase">Loading Scratchpad…</span>
            </div>
          ) : (
            <EditorContent editor={scratchpadEditor} />
          )
        ) : (
          !linkedDocId ? (
            <div className="flex flex-col items-center justify-center p-8 text-center h-full gap-4">
              <div className="h-16 w-16 rounded-3xl bg-secondary/80 border border-border flex items-center justify-center text-primary shadow-lg">
                <Link2 className="h-8 w-8 text-indigo-500" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-foreground">No Document Linked</h3>
                <p className="text-xs text-muted-foreground max-w-xs">
                  Attach an existing workspace document or create a new spec to co-edit inside this chat in real time.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsDocPickerOpen(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:opacity-90 active:scale-95 transition-all shadow-md cursor-pointer"
                >
                  <Search className="h-3.5 w-3.5" />
                  <span>Select Workspace Doc</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!orgId || !userProfile) return;
                    const newId = await createDocument({ title: `${chatName} Spec`, icon: 'FileText' });
                    handleSetLinkedDocId(newId);
                    showToast('Created new Workspace Document');
                  }}
                  className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-bold border border-border bg-surface hover:bg-secondary active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create Blank Doc</span>
                </button>
              </div>
            </div>
          ) : linkedDocLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-xs font-semibold tracking-wider uppercase">Loading Document…</span>
            </div>
          ) : (
            <EditorContent editor={linkedDocEditor} />
          )
        )}
      </div>

      {/* ─── Floating Text Highlight "Convert to Issue" Pill ────────────────── */}
      <AnimatePresence>
        {toolbarPos && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 5 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 5 }}
            style={{ position: 'fixed', top: toolbarPos.top, left: toolbarPos.left, zIndex: 9999 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface/95 dark:bg-surface-elevated/95 border border-border shadow-2xl backdrop-blur-2xl"
          >
            <button
              type="button"
              onClick={() => handleOpenConvertModal(selectedText)}
              className="flex items-center gap-1.5 text-xs font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <Layers className="h-3.5 w-3.5 text-primary" />
              <span>Convert to Issue</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Quick Issue Conversion Modal / Popover ────────────────────────── */}
      {showConvertModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  ⚡
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Extract Action to Issue</h3>
                  <p className="text-[11px] text-muted-foreground">Creates a tracked Linear-style issue</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConvertModal(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  Issue Title
                </label>
                <input
                  type="text"
                  value={issueTitle}
                  onChange={(e) => setIssueTitle(e.target.value)}
                  placeholder="e.g. Fix authentication token refresh"
                  autoFocus
                  required
                  className="w-full rounded-xl border border-border bg-secondary/50 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Assignee Selection */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Assignee
                  </label>
                  <select
                    value={issueAssigneeId}
                    onChange={(e) => setIssueAssigneeId(e.target.value)}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {members.map((m) => (
                      <option key={m.uid} value={m.uid}>
                        {m.fullName} (@{m.username})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                    Priority
                  </label>
                  <select
                    value={issuePriority}
                    onChange={(e) => setIssuePriority(e.target.value as IssuePriority)}
                    className="w-full rounded-xl border border-border bg-secondary/50 px-2.5 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                  >
                    <option value="none">None</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowConvertModal(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-secondary cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!issueTitle.trim() || isCreatingIssue}
                  className="px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 active:scale-95 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  {isCreatingIssue ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckSquare className="h-3 w-3" />}
                  <span>Create Issue</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* ─── Attach Existing Workspace Document Modal ──────────────────────── */}
      {isDocPickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-border pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Attach Workspace Document</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDocPickerOpen(false)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative shrink-0">
              <Search className="h-3.5 w-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={docSearchQuery}
                onChange={(e) => setDocSearchQuery(e.target.value)}
                placeholder="Search documents…"
                className="w-full rounded-xl border border-border bg-secondary/50 pl-9 pr-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto space-y-1 max-h-[300px] aether-scroll pr-1">
              {filteredWorkspaceDocs.map((doc) => {
                const isSelected = linkedDocId === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      handleSetLinkedDocId(doc.id);
                      setIsDocPickerOpen(false);
                      showToast(`Linked "${doc.title}" to this chat`);
                    }}
                    className={cn(
                      'flex items-center gap-2.5 w-full p-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-primary/15 text-primary border border-primary/25 font-bold'
                        : 'text-foreground hover:bg-secondary'
                    )}
                  >
                    <DocIcon icon={doc.icon} className="w-4 h-4 text-primary shrink-0" />
                    <span className="truncate flex-1 font-medium">{doc.title}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                );
              })}

              {filteredWorkspaceDocs.length === 0 && (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No documents found matching "{docSearchQuery}".
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* ─── Templates Modal ───────────────────────────────────────────────── */}
      <CanvasTemplatesModal
        isOpen={isTemplatesModalOpen}
        onClose={() => setIsTemplatesModalOpen(false)}
        onSelectTemplate={handleSelectTemplate}
      />

      {/* ─── Toast Notification Banner ─────────────────────────────────────── */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="px-4 py-2 rounded-full border border-border bg-surface-elevated/95 dark:bg-surface/95 text-foreground shadow-2xl backdrop-blur-xl text-xs font-semibold flex items-center gap-2">
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

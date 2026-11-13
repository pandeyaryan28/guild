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
  Zap,
  CheckSquare,
  Table as TableIcon,
  Kanban,
  LayoutGrid,
  List as ListIcon,
  FileCheck2,
  Plus,
  GripVertical,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Bold,
  Italic,
  Strikethrough,
  Highlighter,
  MessageSquareQuote,
  Sparkles,
  ChevronRight,
  FilePlus2,
  Columns2,
  Columns3,
  ListTree,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@guild/utils';
import { useAuth } from '../../hooks/useAuth';
import { useWorkspaceData } from '../../context/WorkspaceDataContext';
import type { WorkspaceDocument } from '@guild/types';
import {
  SprintCycleBlockNode,
  InlineIssueBlockNode,
  InlineRequestBlockNode,
  DatabaseTableBlockNode,
  CalloutBlockNode,
  SubCanvasBlockNode,
  ToggleBlockNode,
  ColumnsBlockNode,
  TableOfContentsBlockNode,
  BookmarkEmbedBlockNode
} from './canvasExtensions';
import { CanvasEditorContext, type HeadingItem } from './CanvasEditorContext';
import './CanvasBlockEditor.css';

export interface CanvasBlockEditorProps {
  initialContent?: string;
  onChange?: (jsonString: string, htmlString: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  smallText?: boolean;
  activeDoc?: WorkspaceDocument | null;
  documents?: WorkspaceDocument[];
  onSelectDoc?: (docId: string) => void;
  onOpenSidePeek?: (docId: string) => void;
  createSubCanvas?: (params?: {
    title?: string;
    icon?: string;
    parentDatabaseRowId?: string | null;
    contentJson?: string;
  }) => Promise<string>;
  onHeadingsChange?: (headings: HeadingItem[]) => void;
}

interface SlashCommandItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  category: 'hierarchy' | 'guild' | 'layout' | 'basic';
  shortcut?: string;
  keywords?: string[];
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  // ─── Hierarchy & Databases (Notion Core) ───
  {
    id: 'page',
    label: 'Sub-Canvas / Nested Page',
    description: 'Create and embed a nested canvas page inside this canvas',
    icon: FilePlus2,
    category: 'hierarchy',
    shortcut: '/page',
    keywords: ['subpage', 'canvas', 'page', 'nested', 'child', 'doc']
  },
  {
    id: 'table',
    label: 'Database — Table View',
    description: 'Relational database with dynamic columns & sub-page rows',
    icon: TableIcon,
    category: 'hierarchy',
    shortcut: '/table',
    keywords: ['database', 'grid', 'spreadsheet', 'rows', 'columns', 'db']
  },
  {
    id: 'board',
    label: 'Database — Kanban Board',
    description: 'Kanban status board backed by a multi-view database',
    icon: Kanban,
    category: 'hierarchy',
    shortcut: '/board',
    keywords: ['kanban', 'board', 'database', 'columns', 'status']
  },
  {
    id: 'gallery',
    label: 'Database — Gallery View',
    description: 'Visual card grid database with sub-canvas pages',
    icon: LayoutGrid,
    category: 'hierarchy',
    shortcut: '/gallery',
    keywords: ['gallery', 'cards', 'grid', 'database']
  },
  {
    id: 'list_db',
    label: 'Database — List View',
    description: 'Compact minimal list database with quick page open',
    icon: ListIcon,
    category: 'hierarchy',
    shortcut: '/list',
    keywords: ['list', 'database', 'compact', 'items']
  },

  // ─── Interactive Linear & Guild Execution Blocks ───
  {
    id: 'sprint',
    label: 'Sprint Cycle',
    description: 'Active sprint progress, velocity burn, & task backlog',
    icon: Zap,
    category: 'guild',
    shortcut: '/sprint',
    keywords: ['cycle', 'scrum', 'agile', 'points', 'velocity']
  },
  {
    id: 'issue',
    label: 'Inline Issue',
    description: 'Linear-style trackable issue with status, priority, & points',
    icon: CheckSquare,
    category: 'guild',
    shortcut: '/issue',
    keywords: ['task', 'linear', 'bug', 'ticket', 'work', 'todo']
  },
  {
    id: 'request',
    label: 'Approval Requisition',
    description: 'Operational requisition with manager 1-click approvals',
    icon: FileCheck2,
    category: 'guild',
    shortcut: '/request',
    keywords: ['approval', 'expense', 'equipment', 'leave', 'access', 'signoff']
  },

  // ─── Layout, Columns & Disclosure (Space Utilization) ───
  {
    id: '2col',
    label: '2-Column Split Layout',
    description: 'Place two content cards side-by-side across the canvas',
    icon: Columns2,
    category: 'layout',
    shortcut: '/2col',
    keywords: ['columns', 'split', 'grid', 'side', 'layout', '2col']
  },
  {
    id: '3col',
    label: '3-Column Split Layout',
    description: 'Place three content cards side-by-side across the canvas',
    icon: Columns3,
    category: 'layout',
    shortcut: '/3col',
    keywords: ['columns', 'split', 'grid', '3col', 'layout']
  },
  {
    id: 'toggle',
    label: 'Toggle Collapsible Section',
    description: 'Expandable disclosure header to organize detailed notes',
    icon: ChevronRight,
    category: 'layout',
    shortcut: '/toggle',
    keywords: ['toggle', 'collapse', 'accordion', 'dropdown', 'hide']
  },
  {
    id: 'callout',
    label: 'Callout Box',
    description: 'Highlighted note with emoji & color tint',
    icon: MessageSquareQuote,
    category: 'layout',
    shortcut: '/callout',
    keywords: ['callout', 'note', 'box', 'alert', 'info', 'highlight', 'tip']
  },
  {
    id: 'toc',
    label: 'Table of Contents',
    description: 'Auto-updating jump outline of all headings in this canvas',
    icon: ListTree,
    category: 'layout',
    shortcut: '/toc',
    keywords: ['toc', 'outline', 'contents', 'index', 'navigation']
  },
  {
    id: 'bookmark',
    label: 'Web Bookmark / Embed',
    description: 'Embed a clickable link card for Figma, GitHub, or docs',
    icon: Globe,
    category: 'layout',
    shortcut: '/bookmark',
    keywords: ['bookmark', 'link', 'embed', 'url', 'figma', 'github']
  },

  // ─── Basic Notion Typography Blocks ───
  {
    id: 'h1',
    label: 'Heading 1',
    description: 'Large title section header',
    icon: Heading1,
    category: 'basic',
    shortcut: '# ',
    keywords: ['h1', 'title', 'header', 'big']
  },
  {
    id: 'h2',
    label: 'Heading 2',
    description: 'Medium sub-section header',
    icon: Heading2,
    category: 'basic',
    shortcut: '## ',
    keywords: ['h2', 'sub', 'header', 'medium']
  },
  {
    id: 'h3',
    label: 'Heading 3',
    description: 'Small section header',
    icon: Heading3,
    category: 'basic',
    shortcut: '### ',
    keywords: ['h3', 'sub2', 'header', 'small']
  },
  {
    id: 'bullet',
    label: 'Bulleted List',
    description: 'Classic bulleted list points',
    icon: List,
    category: 'basic',
    shortcut: '- ',
    keywords: ['ul', 'unordered', 'bullet', 'point']
  },
  {
    id: 'number',
    label: 'Numbered List',
    description: 'Ordered sequence list',
    icon: ListOrdered,
    category: 'basic',
    shortcut: '1. ',
    keywords: ['ol', 'ordered', 'numbered', 'sequence', 'count']
  },
  {
    id: 'todo',
    label: 'To-do Checklist',
    description: 'Track quick checkbox action items',
    icon: ListTodo,
    category: 'basic',
    shortcut: '[] ',
    keywords: ['task', 'check', 'checkbox', 'checklist', 'action']
  },
  {
    id: 'quote',
    label: 'Quote Block',
    description: 'Capture quotation or callout excerpt',
    icon: Quote,
    category: 'basic',
    shortcut: '> ',
    keywords: ['quote', 'blockquote', 'citation', 'excerpt']
  },
  {
    id: 'code',
    label: 'Code Block',
    description: 'Syntax-friendly code snippet',
    icon: Code,
    category: 'basic',
    shortcut: '```',
    keywords: ['code', 'snippet', 'syntax', 'programming', 'script']
  },
  {
    id: 'divider',
    label: 'Divider Line',
    description: 'Clean horizontal partition rule',
    icon: Minus,
    category: 'basic',
    shortcut: '---',
    keywords: ['hr', 'line', 'divider', 'separator', 'partition']
  }
];

interface HoveredBlockState {
  pos: number;
  node: any;
  top: number;
  height: number;
  dom: HTMLElement;
}

export function CanvasBlockEditor({
  initialContent,
  onChange,
  placeholder = 'Type / for blocks, pages & databases, or @ to mention...',
  autoFocus = false,
  readOnly = false,
  smallText = false,
  activeDoc = null,
  documents = [],
  onSelectDoc = () => {},
  onOpenSidePeek,
  createSubCanvas = async () => '',
  onHeadingsChange
}: CanvasBlockEditorProps) {
  const { userProfile } = useAuth();
  const workspace = useWorkspaceData();
  const members = workspace?.members || [];

  const containerRef = React.useRef<HTMLDivElement>(null);
  const blockMenuRef = React.useRef<HTMLDivElement>(null);

  // Headings state for Table of Contents
  const [headings, setHeadings] = React.useState<HeadingItem[]>([]);

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

  // Text selection toolbar state
  const [selectionPos, setSelectionPos] = React.useState<{ top: number; left: number } | null>(null);
  const [selectedText, setSelectedText] = React.useState('');

  // Gutter Handle & Block Options State
  const [hoveredBlock, setHoveredBlock] = React.useState<HoveredBlockState | null>(null);
  const [blockMenuOpen, setBlockMenuOpen] = React.useState(false);
  const [turnIntoOpen, setTurnIntoOpen] = React.useState(false);

  // Drag-and-drop reorder state
  const [isDragging, setIsDragging] = React.useState(false);
  const [draggedBlock, setDraggedBlock] = React.useState<HoveredBlockState | null>(null);
  const [dropIndicatorTop, setDropIndicatorTop] = React.useState<number | null>(null);
  const [dropTargetPos, setDropTargetPos] = React.useState<number | null>(null);

  // Real workspace users for mentions
  const userList = React.useMemo(() => {
    if (members && members.length > 0) {
      return members.map((m) => ({
        id: m.uid,
        name: m.fullName || m.email || 'Teammate',
        username:
          m.username || (m.fullName || m.email || 'teammate').toLowerCase().replace(/\s+/g, '.'),
        avatar: m.photoURL || '',
        status: (m.availabilityStatus || 'active') as 'active' | 'focus' | 'away',
        role: m.designation || m.role || 'Member'
      }));
    }
    if (userProfile) {
      return [
        {
          id: userProfile.uid,
          name: userProfile.fullName || userProfile.email || 'Me',
          username: userProfile.username || 'me',
          avatar: userProfile.photoURL || '',
          status: (userProfile.availabilityStatus || 'active') as 'active' | 'focus' | 'away',
          role: userProfile.designation || userProfile.role || 'Member'
        }
      ];
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
    const q = slashFilter.toLowerCase().trim();
    if (!q) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (cmd) =>
        cmd.id.includes(q) ||
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        (cmd.keywords && cmd.keywords.some((k) => k.includes(q)))
    );
  }, [slashFilter]);

  const extractHeadings = React.useCallback(
    (docNode: any) => {
      const extracted: HeadingItem[] = [];
      docNode.descendants((node: any, pos: number) => {
        if (node.type.name === 'heading') {
          const level = (node.attrs.level || 1) as 1 | 2 | 3;
          const text = node.textContent || '';
          if (text.trim()) {
            extracted.push({
              id: `h-${pos}`,
              text: text.trim(),
              level,
              pos
            });
          }
        }
      });
      setHeadings(extracted);
      onHeadingsChange?.(extracted);
    },
    [onHeadingsChange]
  );

  // TipTap Instance
  const editor = useEditor({
    editable: !readOnly,
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
      DatabaseTableBlockNode,
      CalloutBlockNode,
      SubCanvasBlockNode,
      ToggleBlockNode,
      ColumnsBlockNode,
      TableOfContentsBlockNode,
      BookmarkEmbedBlockNode
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
        class: cn(
          'canvas-tiptap-content focus:outline-none min-h-[460px] select-text text-foreground prose dark:prose-invert max-w-none py-1',
          smallText && 'text-[13px] leading-relaxed'
        ),
        'data-placeholder': placeholder
      },
      handleKeyDown: (_view, event) => {
        if (slashOpen) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setSlashIndex((prev) => (prev + 1) % Math.max(1, filteredSlash.length));
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setSlashIndex(
              (prev) => (prev - 1 + filteredSlash.length) % Math.max(1, filteredSlash.length)
            );
            return true;
          }
          if (event.key === 'Enter' || event.key === 'Tab') {
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

        if (mentionOpen) {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setMentionIndex((prev) => (prev + 1) % Math.max(1, filteredMembers.length));
            return true;
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setMentionIndex(
              (prev) => (prev - 1 + filteredMembers.length) % Math.max(1, filteredMembers.length)
            );
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

        if (event.key === 'Tab') {
          if (editor?.isActive('listItem')) {
            event.preventDefault();
            if (event.shiftKey) {
              editor.chain().focus().liftListItem('listItem').run();
            } else {
              editor.chain().focus().sinkListItem('listItem').run();
            }
            return true;
          }
          if (editor?.isActive('taskItem')) {
            event.preventDefault();
            if (event.shiftKey) {
              editor.chain().focus().liftListItem('taskItem').run();
            } else {
              editor.chain().focus().sinkListItem('taskItem').run();
            }
            return true;
          }
        }

        if (event.key === 'Backspace') {
          if (editor) {
            const { selection } = editor.state;
            if (selection.empty && selection.$from.parentOffset === 0) {
              if (editor.isActive('heading')) {
                event.preventDefault();
                editor.chain().focus().setParagraph().run();
                return true;
              }
              if (editor.isActive('blockquote')) {
                event.preventDefault();
                editor.chain().focus().toggleBlockquote().run();
                return true;
              }
              if (editor.isActive('codeBlock')) {
                event.preventDefault();
                editor.chain().focus().toggleCodeBlock().run();
                return true;
              }
            }
          }
        }

        return false;
      }
    },
    onCreate: ({ editor }) => {
      extractHeadings(editor.state.doc);
    },
    onSelectionUpdate: ({ editor }) => {
      if (readOnly) return;
      const { selection } = editor.state;
      if (!selection.empty) {
        const text = editor.state.doc.textBetween(selection.from, selection.to, ' ').trim();
        if (text.length > 0) {
          const coords = editor.view.coordsAtPos(selection.from);
          setSelectionPos({ top: coords.top - 48, left: Math.max(16, coords.left) });
          setSelectedText(text);
          return;
        }
      }
      setSelectionPos(null);
      setSelectedText('');
    },
    onUpdate: ({ editor }) => {
      const json = JSON.stringify(editor.getJSON());
      const html = editor.getHTML();
      onChange?.(json, html);
      extractHeadings(editor.state.doc);

      if (readOnly) return;

      const { selection } = editor.state;
      const { $from } = selection;
      const lineText = $from.parent.textContent;
      const posInLine = $from.parentOffset;
      const textBefore = lineText.slice(0, posInLine);

      // Slash command trigger
      const lastSlashIndex = textBefore.lastIndexOf('/');
      if (
        lastSlashIndex !== -1 &&
        (lastSlashIndex === 0 || textBefore[lastSlashIndex - 1] === ' ')
      ) {
        const query = textBefore.slice(lastSlashIndex + 1);
        if (!query.includes(' ')) {
          const coords = editor.view.coordsAtPos(selection.from);
          setSlashPos({ top: coords.bottom + 8, left: coords.left });
          setSlashFilter(query);
          setSlashIndex(0);
          setSlashOpen(true);
        } else {
          setSlashOpen(false);
        }
      } else {
        setSlashOpen(false);
      }

      // @ Mention trigger
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

  // Keep editable synced if readOnly prop changes
  React.useEffect(() => {
    if (editor && editor.isEditable === readOnly) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  const scrollToPos = React.useCallback(
    (pos: number) => {
      if (!editor) return;
      try {
        const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
        if (dom && typeof dom.scrollIntoView === 'function') {
          dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          editor.commands.focus(pos);
        }
      } catch {
        // Safe catch
      }
    },
    [editor]
  );

  // Execute Slash command cleanly
  const executeSlash = (cmdId: string) => {
    if (!editor || readOnly) return;

    const { selection } = editor.state;
    const { $from } = selection;
    const lineText = $from.parent.textContent;
    const posInLine = $from.parentOffset;
    const textBefore = lineText.slice(0, posInLine);
    const lastSlashIndex = textBefore.lastIndexOf('/');

    if (lastSlashIndex !== -1) {
      const startPos = selection.from - (posInLine - lastSlashIndex);
      editor.chain().focus().deleteRange({ from: startPos, to: selection.from }).run();
    }

    switch (cmdId) {
      case 'page':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'subCanvasBlock',
            attrs: { childDocId: null, title: 'Untitled Sub-Canvas', icon: 'FileText' }
          })
          .run();
        break;

      case 'table':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'databaseTableBlock',
            attrs: { title: '', activeView: 'table' }
          })
          .run();
        break;

      case 'board':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'databaseTableBlock',
            attrs: { title: 'Kanban Board', activeView: 'board' }
          })
          .run();
        break;

      case 'gallery':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'databaseTableBlock',
            attrs: { title: 'Gallery Database', activeView: 'gallery' }
          })
          .run();
        break;

      case 'list_db':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'databaseTableBlock',
            attrs: { title: 'Quick List Database', activeView: 'list' }
          })
          .run();
        break;

      case 'sprint':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'sprintCycleBlock',
            attrs: { title: '', cycleNumber: null }
          })
          .run();
        break;

      case 'issue':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'inlineIssueBlock',
            attrs: {
              identifier: `TASK-${Math.floor(Math.random() * 800 + 100)}`,
              title: '',
              status: 'todo',
              priority: 'medium',
              estimatePoints: null
            }
          })
          .run();
        break;

      case 'request':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'inlineRequestBlock',
            attrs: {
              type: 'equipment',
              title: '',
              amount: '',
              department: 'Engineering',
              status: 'pending'
            }
          })
          .run();
        break;

      case '2col':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'columnsBlock',
            attrs: { columnCount: 2, items: [] }
          })
          .run();
        break;

      case '3col':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'columnsBlock',
            attrs: { columnCount: 3, items: [] }
          })
          .run();
        break;

      case 'toggle':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'toggleBlock',
            attrs: { title: '', body: '', isOpen: true }
          })
          .run();
        break;

      case 'callout':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'calloutBlock',
            attrs: {
              icon: '💡',
              tint: 'amber',
              title: '',
              text: ''
            }
          })
          .run();
        break;

      case 'toc':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'tableOfContentsBlock'
          })
          .run();
        break;

      case 'bookmark':
        editor
          .chain()
          .focus()
          .insertContent({
            type: 'bookmarkEmbedBlock',
            attrs: { url: '', title: '', description: '' }
          })
          .run();
        break;

      case 'h1':
        editor.chain().focus().setHeading({ level: 1 }).run();
        break;

      case 'h2':
        editor.chain().focus().setHeading({ level: 2 }).run();
        break;

      case 'h3':
        editor.chain().focus().setHeading({ level: 3 }).run();
        break;

      case 'bullet':
        editor.chain().focus().toggleBulletList().run();
        break;

      case 'number':
        editor.chain().focus().toggleOrderedList().run();
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
    if (!editor || readOnly) return;

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
    if (!editor || !selectedText || readOnly) return;

    const num = Math.floor(Math.random() * 800 + 100);
    const identifier = `ENG-${num}`;

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'inlineIssueBlock',
        attrs: {
          identifier,
          title: selectedText,
          status: 'todo',
          priority: 'medium',
          estimatePoints: 3,
          assigneeName: userProfile?.fullName || 'Assignee'
        }
      })
      .run();

    setSelectionPos(null);
    setSelectedText('');
  };

  // Convert selected text into a Sub-Canvas Page
  const convertSelectionToSubCanvas = () => {
    if (!editor || !selectedText || readOnly) return;

    editor
      .chain()
      .focus()
      .insertContent({
        type: 'subCanvasBlock',
        attrs: {
          childDocId: null,
          title: selectedText,
          icon: 'FileText'
        }
      })
      .run();

    setSelectionPos(null);
    setSelectedText('');
  };

  // Close block menu on outside click
  React.useEffect(() => {
    if (!blockMenuOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (blockMenuRef.current && !blockMenuRef.current.contains(e.target as Node)) {
        setBlockMenuOpen(false);
        setTurnIntoOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [blockMenuOpen]);

  // Mouse move handler to position Gutter Handle next to hovered block
  const handleContainerMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!editor || blockMenuOpen || isDragging || readOnly) return;
    if (!containerRef.current) return;

    const target = e.target as HTMLElement;
    const proseMirror = editor.view.dom;
    if (!proseMirror) return;

    let blockEl: HTMLElement | null = target;
    while (
      blockEl &&
      blockEl.parentElement !== proseMirror &&
      blockEl !== proseMirror &&
      blockEl !== document.body
    ) {
      blockEl = blockEl.parentElement;
    }

    if (blockEl && blockEl.parentElement === proseMirror) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const blockRect = blockEl.getBoundingClientRect();
      const top = blockRect.top - containerRect.top;

      try {
        const pos = editor.view.posAtDOM(blockEl, 0);
        const $pos = editor.state.doc.resolve(pos);
        const blockPos = $pos.start(1) - 1;
        const node = editor.state.doc.nodeAt(blockPos);

        if (node) {
          setHoveredBlock({
            pos: blockPos,
            node,
            top: Math.max(0, top + (blockRect.height > 40 ? 4 : 2)),
            height: blockRect.height,
            dom: blockEl
          });
        }
      } catch {
        // Safe catch
      }
    }
  };

  const handleQuickAddBelow = () => {
    if (!editor || !hoveredBlock || readOnly) return;
    const insertPos = hoveredBlock.pos + hoveredBlock.node.nodeSize;
    editor
      .chain()
      .focus()
      .insertContentAt(insertPos, { type: 'paragraph' })
      .setTextSelection(insertPos + 1)
      .run();

    setTimeout(() => {
      const coords = editor.view.coordsAtPos(insertPos + 1);
      setSlashPos({ top: coords.bottom + 8, left: coords.left });
      setSlashFilter('');
      setSlashIndex(0);
      setSlashOpen(true);
    }, 50);
  };

  const handleDuplicateBlock = () => {
    if (!editor || !hoveredBlock || readOnly) return;
    const insertPos = hoveredBlock.pos + hoveredBlock.node.nodeSize;
    editor.chain().focus().insertContentAt(insertPos, hoveredBlock.node.toJSON()).run();
    setBlockMenuOpen(false);
  };

  const handleDeleteBlock = () => {
    if (!editor || !hoveredBlock || readOnly) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: hoveredBlock.pos, to: hoveredBlock.pos + hoveredBlock.node.nodeSize })
      .run();
    setBlockMenuOpen(false);
    setHoveredBlock(null);
  };

  const handleMoveBlockUp = () => {
    if (!editor || !hoveredBlock || readOnly) return;
    const { doc } = editor.state;
    const currentPos = hoveredBlock.pos;
    const $pos = doc.resolve(currentPos);
    const index = $pos.index(0);

    if (index > 0) {
      let prevPos = 0;
      for (let i = 0; i < index - 1; i++) {
        prevPos += doc.child(i).nodeSize;
      }
      const nodeJSON = hoveredBlock.node.toJSON();
      const nodeSize = hoveredBlock.node.nodeSize;

      editor
        .chain()
        .focus()
        .deleteRange({ from: currentPos, to: currentPos + nodeSize })
        .insertContentAt(prevPos, nodeJSON)
        .run();
    }
    setBlockMenuOpen(false);
  };

  const handleMoveBlockDown = () => {
    if (!editor || !hoveredBlock || readOnly) return;
    const { doc } = editor.state;
    const currentPos = hoveredBlock.pos;
    const $pos = doc.resolve(currentPos);
    const index = $pos.index(0);

    if (index < doc.childCount - 1) {
      const nextNode = doc.child(index + 1);
      const nextPos = currentPos + hoveredBlock.node.nodeSize + nextNode.nodeSize;
      const nodeJSON = hoveredBlock.node.toJSON();
      const nodeSize = hoveredBlock.node.nodeSize;

      editor
        .chain()
        .focus()
        .deleteRange({ from: currentPos, to: currentPos + nodeSize })
        .insertContentAt(nextPos - nodeSize, nodeJSON)
        .run();
    }
    setBlockMenuOpen(false);
  };

  // Turn block into another type (including Sub-Canvas Page & Toggle)
  const handleTurnInto = (targetType: string) => {
    if (!editor || !hoveredBlock || readOnly) return;
    const textContent = hoveredBlock.node.textContent || '';
    const currentPos = hoveredBlock.pos;
    const nodeSize = hoveredBlock.node.nodeSize;

    let targetContent: any;
    switch (targetType) {
      case 'page':
        targetContent = {
          type: 'subCanvasBlock',
          attrs: {
            childDocId: null,
            title: textContent || 'Untitled Sub-Canvas',
            icon: 'FileText'
          }
        };
        break;
      case 'toggle':
        targetContent = {
          type: 'toggleBlock',
          attrs: {
            title: textContent,
            body: '',
            isOpen: true
          }
        };
        break;
      case 'h1':
        targetContent = {
          type: 'heading',
          attrs: { level: 1 },
          content: textContent ? [{ type: 'text', text: textContent }] : []
        };
        break;
      case 'h2':
        targetContent = {
          type: 'heading',
          attrs: { level: 2 },
          content: textContent ? [{ type: 'text', text: textContent }] : []
        };
        break;
      case 'h3':
        targetContent = {
          type: 'heading',
          attrs: { level: 3 },
          content: textContent ? [{ type: 'text', text: textContent }] : []
        };
        break;
      case 'bullet':
        targetContent = {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: textContent ? [{ type: 'text', text: textContent }] : []
                }
              ]
            }
          ]
        };
        break;
      case 'number':
        targetContent = {
          type: 'orderedList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: textContent ? [{ type: 'text', text: textContent }] : []
                }
              ]
            }
          ]
        };
        break;
      case 'todo':
        targetContent = {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [
                {
                  type: 'paragraph',
                  content: textContent ? [{ type: 'text', text: textContent }] : []
                }
              ]
            }
          ]
        };
        break;
      case 'callout':
        targetContent = {
          type: 'calloutBlock',
          attrs: {
            icon: '💡',
            tint: 'amber',
            title: '',
            text: textContent
          }
        };
        break;
      case 'quote':
        targetContent = {
          type: 'blockquote',
          content: [
            {
              type: 'paragraph',
              content: textContent ? [{ type: 'text', text: textContent }] : []
            }
          ]
        };
        break;
      case 'code':
        targetContent = {
          type: 'codeBlock',
          content: textContent ? [{ type: 'text', text: textContent }] : []
        };
        break;
      default:
        targetContent = {
          type: 'paragraph',
          content: textContent ? [{ type: 'text', text: textContent }] : []
        };
    }

    editor
      .chain()
      .focus()
      .deleteRange({ from: currentPos, to: currentPos + nodeSize })
      .insertContentAt(currentPos, targetContent)
      .run();

    setTurnIntoOpen(false);
    setBlockMenuOpen(false);
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (!hoveredBlock || readOnly) return;
    setIsDragging(true);
    setDraggedBlock(hoveredBlock);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', hoveredBlock.node.textContent);
  };

  const handleContainerDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isDragging || !draggedBlock || !containerRef.current || !editor) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const proseMirror = editor.view.dom;
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    if (!target) return;

    let blockEl: HTMLElement | null = target;
    while (
      blockEl &&
      blockEl.parentElement !== proseMirror &&
      blockEl !== proseMirror &&
      blockEl !== document.body
    ) {
      blockEl = blockEl.parentElement;
    }

    if (blockEl && blockEl.parentElement === proseMirror) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const blockRect = blockEl.getBoundingClientRect();
      const midY = blockRect.top + blockRect.height / 2;
      const isBottom = e.clientY > midY;

      try {
        const pos = editor.view.posAtDOM(blockEl, 0);
        const $pos = editor.state.doc.resolve(pos);
        const targetBlockPos = $pos.start(1) - 1;
        const targetNode = editor.state.doc.nodeAt(targetBlockPos);

        if (targetNode) {
          const indicatorTop = isBottom
            ? blockRect.bottom - containerRect.top
            : blockRect.top - containerRect.top;
          setDropIndicatorTop(indicatorTop);
          setDropTargetPos(isBottom ? targetBlockPos + targetNode.nodeSize : targetBlockPos);
        }
      } catch {
        // Safe catch
      }
    }
  };

  const handleContainerDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (!isDragging || !draggedBlock || dropTargetPos === null || !editor) return;
    e.preventDefault();

    const fromPos = draggedBlock.pos;
    const toPos = dropTargetPos;

    if (fromPos !== toPos) {
      const nodeJSON = draggedBlock.node.toJSON();
      const nodeSize = draggedBlock.node.nodeSize;

      editor
        .chain()
        .focus()
        .deleteRange({ from: fromPos, to: fromPos + nodeSize })
        .insertContentAt(toPos > fromPos ? toPos - nodeSize : toPos, nodeJSON)
        .run();
    }

    setIsDragging(false);
    setDraggedBlock(null);
    setDropIndicatorTop(null);
    setDropTargetPos(null);
  };

  const handleContainerDragEnd = () => {
    setIsDragging(false);
    setDraggedBlock(null);
    setDropIndicatorTop(null);
    setDropTargetPos(null);
  };

  const contextValue = React.useMemo(
    () => ({
      activeDoc,
      documents,
      canEdit: !readOnly,
      headings,
      onSelectDoc,
      onOpenSidePeek,
      createSubCanvas,
      scrollToPos
    }),
    [activeDoc, documents, readOnly, headings, onSelectDoc, onOpenSidePeek, createSubCanvas, scrollToPos]
  );

  return (
    <CanvasEditorContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        onMouseMove={handleContainerMouseMove}
        onDragOver={handleContainerDragOver}
        onDrop={handleContainerDrop}
        onDragEnd={handleContainerDragEnd}
        className={cn('relative w-full', !readOnly && 'pl-6 sm:pl-7')}
      >
        {/* ─── Notion & Linear Floating Gutter Handle ─── */}
        {!readOnly && hoveredBlock && (
          <div
            style={{
              position: 'absolute',
              top: `${hoveredBlock.top}px`,
              left: '0px',
              transform: 'translateX(-4px)'
            }}
            className={cn(
              'flex items-center gap-0.5 select-none transition-all duration-150 z-20',
              isDragging ? 'opacity-0 pointer-events-none' : 'opacity-100'
            )}
          >
            <button
              type="button"
              onClick={handleQuickAddBelow}
              className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-secondary border border-transparent hover:border-border transition-all active:scale-90 cursor-pointer"
              title="Click to add block below (/)"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <div
              draggable
              onDragStart={handleDragStart}
              onClick={() => setBlockMenuOpen(!blockMenuOpen)}
              className="w-5 h-5 rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-secondary border border-transparent hover:border-border transition-all cursor-grab active:cursor-grabbing active:scale-90"
              title="Drag to reorder or click for options"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          </div>
        )}

        {/* ─── Drag Insertion Drop Indicator Line ─── */}
        {isDragging && dropIndicatorTop !== null && (
          <div
            style={{ top: `${dropIndicatorTop}px` }}
            className="absolute left-6 right-0 h-0.5 bg-primary shadow-sm rounded-full pointer-events-none z-30 animate-pulse"
          />
        )}

        {/* ─── Block Options Contextual Menu ─── */}
        <AnimatePresence>
          {blockMenuOpen && hoveredBlock && !readOnly && (
            <motion.div
              ref={blockMenuRef}
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute',
                top: `${hoveredBlock.top + 28}px`,
                left: '8px'
              }}
              className="w-56 p-1.5 rounded-2xl bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong shadow-2xl z-40 select-none custom-scrollbar"
            >
              <div className="space-y-0.5">
                <button
                  type="button"
                  onClick={handleDuplicateBlock}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Duplicate Block</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTurnIntoOpen(!turnIntoOpen)}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Turn into...</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-muted-foreground" />
                </button>

                {turnIntoOpen && (
                  <div className="my-1 p-1 bg-secondary/50 dark:bg-secondary/30 rounded-xl border border-border/60 space-y-0.5 max-h-52 overflow-y-auto custom-scrollbar">
                    <button
                      type="button"
                      onClick={() => handleTurnInto('page')}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] font-semibold text-primary hover:bg-surface transition-colors"
                    >
                      <FilePlus2 className="w-3 h-3" />
                      <span>Sub-Canvas / Page</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTurnInto('toggle')}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-foreground hover:bg-surface transition-colors"
                    >
                      <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      <span>Toggle Section</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTurnInto('paragraph')}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-foreground hover:bg-surface transition-colors"
                    >
                      <span>Text / Paragraph</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTurnInto('h1')}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-foreground hover:bg-surface transition-colors"
                    >
                      <Heading1 className="w-3 h-3 text-muted-foreground" />
                      <span>Heading 1</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTurnInto('h2')}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-foreground hover:bg-surface transition-colors"
                    >
                      <Heading2 className="w-3 h-3 text-muted-foreground" />
                      <span>Heading 2</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTurnInto('h3')}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-foreground hover:bg-surface transition-colors"
                    >
                      <Heading3 className="w-3 h-3 text-muted-foreground" />
                      <span>Heading 3</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTurnInto('bullet')}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-foreground hover:bg-surface transition-colors"
                    >
                      <List className="w-3 h-3 text-muted-foreground" />
                      <span>Bulleted List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTurnInto('number')}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-foreground hover:bg-surface transition-colors"
                    >
                      <ListOrdered className="w-3 h-3 text-muted-foreground" />
                      <span>Numbered List</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTurnInto('todo')}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-foreground hover:bg-surface transition-colors"
                    >
                      <ListTodo className="w-3 h-3 text-muted-foreground" />
                      <span>To-do Checklist</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTurnInto('callout')}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-foreground hover:bg-surface transition-colors"
                    >
                      <MessageSquareQuote className="w-3 h-3 text-amber-500" />
                      <span>Callout Box</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTurnInto('quote')}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-foreground hover:bg-surface transition-colors"
                    >
                      <Quote className="w-3 h-3 text-muted-foreground" />
                      <span>Quote Block</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTurnInto('code')}
                      className="w-full flex items-center gap-2 px-2 py-1 rounded-lg text-[11px] text-foreground hover:bg-surface transition-colors"
                    >
                      <Code className="w-3 h-3 text-muted-foreground" />
                      <span>Code Block</span>
                    </button>
                  </div>
                )}

                <div className="h-px bg-border/60 my-1" />

                <button
                  type="button"
                  onClick={handleMoveBlockUp}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Move Up</span>
                </button>

                <button
                  type="button"
                  onClick={handleMoveBlockDown}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-foreground hover:bg-secondary transition-colors text-left"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Move Down</span>
                </button>

                <div className="h-px bg-border/60 my-1" />

                <button
                  type="button"
                  onClick={handleDeleteBlock}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors text-left"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Block</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TipTap Rich Text Surface */}
        <EditorContent editor={editor} />

        {/* ─── 1. Slash Command Menu Popover ─── */}
        <AnimatePresence>
          {slashOpen && slashPos && !readOnly && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                top: `${Math.min(slashPos.top, window.innerHeight - 400)}px`,
                left: `${Math.min(slashPos.left, window.innerWidth - 340)}px`
              }}
              className="w-80 max-h-96 overflow-y-auto bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-2xl p-2 z-50 select-none custom-scrollbar"
            >
              {(
                [
                  { key: 'hierarchy', title: 'Pages & Multi-View Databases', badge: 'NOTION' },
                  { key: 'guild', title: 'Linear & Guild Execution', badge: 'LINEAR' },
                  { key: 'layout', title: 'Columns, Toggles & Layout', badge: 'LAYOUT' },
                  { key: 'basic', title: 'Typography & Lists' }
                ] as const
              ).map((sec) => {
                const items = filteredSlash.filter((c) => c.category === sec.key);
                if (items.length === 0) return null;

                return (
                  <React.Fragment key={sec.key}>
                    <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 my-1 flex items-center justify-between">
                      <span>{sec.title}</span>
                      {'badge' in sec && sec.badge && (
                        <span className="text-primary font-mono text-[9px] bg-primary/10 px-1.5 py-0.5 rounded">
                          {sec.badge}
                        </span>
                      )}
                    </div>

                    {items.map((cmd) => {
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
                                ? 'border-primary-foreground/30 bg-primary-foreground/20 text-primary-foreground'
                                : 'border-border bg-secondary/60 text-primary'
                            )}
                          >
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="truncate">{cmd.label}</span>
                              {cmd.shortcut && (
                                <span
                                  className={cn(
                                    'text-[10px] font-mono',
                                    isSelected
                                      ? 'text-primary-foreground/70'
                                      : 'text-muted-foreground'
                                  )}
                                >
                                  {cmd.shortcut}
                                </span>
                              )}
                            </div>
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
                  </React.Fragment>
                );
              })}

              {filteredSlash.length === 0 && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  No matching blocks found
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── 2. Mention Autocomplete Popover ─── */}
        <AnimatePresence>
          {mentionOpen && mentionPos && !readOnly && (
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
              className="w-68 max-h-64 overflow-y-auto bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-2xl p-1.5 z-50 select-none custom-scrollbar"
            >
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/50 mb-1">
                Mention Teammate
              </div>

              {filteredMembers.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground text-center">
                  No teammates found
                </div>
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
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-6 h-6 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/15 border border-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
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

        {/* ─── 3. Floating Text Selection Bubble Toolbar ─── */}
        <AnimatePresence>
          {selectionPos && selectedText && editor && !readOnly && (
            <motion.div
              initial={{ opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'fixed',
                top: `${selectionPos.top}px`,
                left: `${Math.min(selectionPos.left, window.innerWidth - 380)}px`
              }}
              className="z-50 select-none flex items-center gap-1 p-1 rounded-full bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl border border-border dark:border-border-strong shadow-2xl"
            >
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors',
                  editor.isActive('bold')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                )}
                title="Bold (⌘B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors',
                  editor.isActive('italic')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                )}
                title="Italic (⌘I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors',
                  editor.isActive('strike')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                )}
                title="Strikethrough"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors',
                  editor.isActive('code')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                )}
                title="Inline Code"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleHighlight().run()}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center text-xs transition-colors',
                  editor.isActive('highlight')
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-secondary'
                )}
                title="Highlight"
              >
                <Highlighter className="w-3.5 h-3.5" />
              </button>

              <div className="w-px h-4 bg-border/60 mx-1" />

              {/* Convert selection to Sub-Canvas Page */}
              <button
                type="button"
                onClick={convertSelectionToSubCanvas}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                title="Turn selected text into a nested Sub-Canvas"
              >
                <FilePlus2 className="w-3 h-3 text-primary" />
                <span>Sub-Page</span>
              </button>

              {/* Convert to Linear Issue */}
              <button
                type="button"
                onClick={convertSelectionToIssue}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-all active:scale-95 shadow-xs cursor-pointer"
              >
                <Zap className="w-3 h-3 fill-current" />
                <span>Issue</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </CanvasEditorContext.Provider>
  );
}

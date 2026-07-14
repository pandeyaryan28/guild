import * as React from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  X, Check, Plus, Loader2, Sparkles, AlertCircle, Play, 
  HelpCircle, ChevronRight, ListTodo, FileText, Layout,
  Layers, Users, Star, Settings, CheckSquare, ClipboardList,
  Target, Send, PlusCircle, ArrowRight, BookOpen, Calendar,
  CheckCircle2, Flame, UserPlus, Info, AlertTriangle, ListChecks,
  ChevronDown
} from 'lucide-react';
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

  const [showWorkspaceSidebar, setShowWorkspaceSidebar] = React.useState(true);
  const [sidebarTab, setSidebarTab] = React.useState<'tasks' | 'goals' | 'requests'>('tasks');
  const [focusedBlockIndex, setFocusedBlockIndex] = React.useState<number | null>(null);

  const blockRefs = React.useRef<(HTMLTextAreaElement | null)[]>([]);

  // Split content into blocks
  const blocks = React.useMemo(() => {
    if (!localContent) return [];
    
    const lines = localContent.split('\n');
    const parsedBlocks: Block[] = [];
    let i = 0;
    
    while (i < lines.length) {
      const line = lines[i];
      
      // Code block
      if (line.trim().startsWith('```')) {
        const start = i;
        let content = line;
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          content += '\n' + lines[i];
          i++;
        }
        if (i < lines.length) {
          content += '\n' + lines[i];
          i++;
        }
        parsedBlocks.push({ type: 'code', startLine: start, endLine: i - 1, content });
        continue;
      }
      
      // Table block
      if (line.trim().startsWith('|')) {
        const start = i;
        let content = line;
        i++;
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          content += '\n' + lines[i];
          i++;
        }
        parsedBlocks.push({ type: 'table', startLine: start, endLine: i - 1, content });
        continue;
      }
      
      // Callout block
      if (line.trim().startsWith('>')) {
        const start = i;
        let content = line;
        i++;
        while (i < lines.length && lines[i].trim().startsWith('>')) {
          content += '\n' + lines[i];
          i++;
        }
        parsedBlocks.push({ type: 'callout', startLine: start, endLine: i - 1, content });
        continue;
      }
      
      // Header block
      if (line.trim().startsWith('#')) {
        parsedBlocks.push({ type: 'header', startLine: i, endLine: i, content: line });
        i++;
        continue;
      }
      
      // List block (single-line items for checkboxes or bullets)
      if (line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\.\s/.test(line.trim())) {
        parsedBlocks.push({ type: 'list', startLine: i, endLine: i, content: line });
        i++;
        continue;
      }
      
      // Regular paragraph
      parsedBlocks.push({ type: 'paragraph', startLine: i, endLine: i, content: line });
      i++;
    }
    
    return parsedBlocks;
  }, [localContent]);

  // Handle in-place editing of a block
  const handleBlockChange = (block: Block, newContent: string) => {
    const originalLines = localContent.split('\n');
    const before = originalLines.slice(0, block.startLine);
    const after = originalLines.slice(block.endLine + 1);
    const updated = before.concat(newContent.split('\n')).concat(after);
    updateCanvas(updated.join('\n'), localTitle);
  };

  // Keyboard navigation inside block row textareas
  const handleBlockKeyDown = (
    index: number,
    block: Block,
    e: React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === 'Enter' && !e.shiftKey && block.type !== 'code' && block.type !== 'table') {
      e.preventDefault();
      // Split the block
      const textarea = e.currentTarget;
      const caretPos = textarea.selectionStart;
      const text = textarea.value;
      const leftPart = text.slice(0, caretPos);
      const rightPart = text.slice(caretPos);

      const originalLines = localContent.split('\n');
      const before = originalLines.slice(0, block.startLine);
      const after = originalLines.slice(block.endLine + 1);
      
      // If we are splitting a list block, preserve list prefix
      let nextLinePrefix = '';
      if (block.type === 'list') {
        const matchChecklist = leftPart.match(/^(\s*-\s*\[[ x]\]\s*)/);
        const matchBullet = leftPart.match(/^(\s*[-\*]\s*)/);
        const matchNumbered = leftPart.match(/^(\s*\d+\.\s*)/);
        if (matchChecklist) nextLinePrefix = '- [ ] ';
        else if (matchBullet) nextLinePrefix = '- ';
        else if (matchNumbered) {
          const num = parseInt(matchNumbered[1]);
          nextLinePrefix = `${num + 1}. `;
        }
      }

      const updated = before
        .concat(leftPart.split('\n'))
        .concat([nextLinePrefix + rightPart])
        .concat(after);

      updateCanvas(updated.join('\n'), localTitle);
      
      // Delay focus to let React re-render
      setTimeout(() => {
        setFocusedBlockIndex(index + 1);
        const nextTextarea = blockRefs.current[index + 1];
        if (nextTextarea) {
          nextTextarea.focus();
          nextTextarea.setSelectionRange(nextLinePrefix.length, nextLinePrefix.length);
        }
      }, 50);

    } else if (e.key === 'Backspace' && e.currentTarget.selectionStart === 0) {
      // Merge with block above if allowed
      if (index > 0) {
        e.preventDefault();
        const prevBlock = blocks[index - 1];
        if (prevBlock.type === 'code' || prevBlock.type === 'table') return;

        const currentVal = e.currentTarget.value;
        const prevVal = prevBlock.content;

        const originalLines = localContent.split('\n');
        const before = originalLines.slice(0, prevBlock.startLine);
        const after = originalLines.slice(block.endLine + 1);
        
        // Merge texts
        const mergedLines = (prevVal + currentVal).split('\n');
        const updated = before.concat(mergedLines).concat(after);

        updateCanvas(updated.join('\n'), localTitle);

        setTimeout(() => {
          setFocusedBlockIndex(index - 1);
          const prevTextarea = blockRefs.current[index - 1];
          if (prevTextarea) {
            prevTextarea.focus();
            prevTextarea.setSelectionRange(prevVal.length, prevVal.length);
          }
        }, 50);
      }
    } else if (e.key === 'ArrowUp' && e.currentTarget.selectionStart === 0) {
      if (index > 0) {
        e.preventDefault();
        setFocusedBlockIndex(index - 1);
        setTimeout(() => blockRefs.current[index - 1]?.focus(), 20);
      }
    } else if (e.key === 'ArrowDown' && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      if (index < blocks.length - 1) {
        e.preventDefault();
        setFocusedBlockIndex(index + 1);
        setTimeout(() => blockRefs.current[index + 1]?.focus(), 20);
      }
    }
  };

  // Checklist checkbox clicking
  const toggleCheckbox = async (block: Block, checked: boolean) => {
    let newContent = block.content;
    if (checked) {
      newContent = newContent.replace('- [ ]', '- [x]').replace('* [ ]', '* [x]');
    } else {
      newContent = newContent.replace('- [x]', '- [ ]').replace('* [x]', '* [ ]');
    }
    const originalLines = localContent.split('\n');
    const before = originalLines.slice(0, block.startLine);
    const after = originalLines.slice(block.endLine + 1);
    const updated = before.concat(newContent.split('\n')).concat(after);
    
    // Save to Firestore immediately
    await forceSave(updated.join('\n'), localTitle);
  };

  // Insert workspace item tag into the focused block (or append)
  const handleInsertItem = (type: 'Task' | 'Goal' | 'Request', title: string, id: string) => {
    const tag = `[${type}: ${title}](/chat?${type.toLowerCase()}=${id})`;
    
    let newContent = '';
    if (focusedBlockIndex !== null && focusedBlockIndex >= 0 && focusedBlockIndex < blocks.length) {
      const block = blocks[focusedBlockIndex];
      newContent = block.content + ' ' + tag;
      handleBlockChange(block, newContent);
    } else {
      // Append as a new paragraph block
      const updatedContent = localContent ? `${localContent}\n${tag}` : tag;
      updateCanvas(updatedContent, localTitle);
    }
  };

  // Parse inline elements (bold, italic, code, interactive cards)
  const parseInlineElements = (text: string) => {
    // Regex for workspace cards: [Task: Title](/chat?task=XYZ)
    const cardRegex = /\[(Task|Goal|Request):\s*([^\]]+)\]\(([^)]+)\)/g;
    
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = cardRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      // Add text before the card
      if (matchIndex > lastIndex) {
        parts.push(parseTextFormatting(text.substring(lastIndex, matchIndex)));
      }

      const type = match[1] as 'Task' | 'Goal' | 'Request';
      const title = match[2];
      const url = match[3];

      // Extract ID
      const urlObj = new URL(url, window.location.origin);
      const taskId = urlObj.searchParams.get('task');
      const goalId = urlObj.searchParams.get('goal');
      const requestId = urlObj.searchParams.get('request');
      const id = taskId || goalId || requestId || '';

      parts.push(
        <WorkspaceCard
          key={`${type}-${id}-${matchIndex}`}
          type={type}
          id={id}
          title={title}
          orgId={orgId ?? ''}
          actor={actor}
          tasks={tasks}
          goals={goals}
          requests={allRequests}
          onOpenCard={(paramKey, val) => {
            const params = new URLSearchParams(searchParams);
            params.set(paramKey, val);
            setSearchParams(params);
          }}
        />
      );

      lastIndex = cardRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(parseTextFormatting(text.substring(lastIndex)));
    }

    return parts.length > 0 ? parts : text;
  };

  // Bold, italic, code formatting
  const parseTextFormatting = (text: string) => {
    // Escape standard HTML first
    const parts: React.ReactNode[] = [];
    
    // Simplistic markdown parsing for bold (**), italic (*), code (`)
    const regex = /(\*\*|`|\*)(.*?)\1/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      const token = match[1];
      const innerText = match[2];

      if (token === '**') {
        parts.push(<strong key={matchIndex} className="font-extrabold text-foreground">{innerText}</strong>);
      } else if (token === '*') {
        parts.push(<em key={matchIndex} className="italic text-foreground/90">{innerText}</em>);
      } else if (token === '`') {
        parts.push(
          <code key={matchIndex} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[11px] text-indigo-300">
            {innerText}
          </code>
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? <React.Fragment>{parts}</React.Fragment> : text;
  };

  // Render a single block in views
  const renderBlockContent = (block: Block) => {
    const cleaned = block.content.trim();

    // 1. Headers
    if (block.type === 'header') {
      const match = block.content.match(/^(#{1,6})\s+(.*)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2];
        const formatted = parseInlineElements(text);

        if (level === 1) return <h1 className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent pb-1 mb-2 border-b border-white/5">{formatted}</h1>;
        if (level === 2) return <h2 className="text-base font-bold text-foreground/90 mt-4 mb-2">{formatted}</h2>;
        return <h3 className="text-sm font-semibold text-foreground/80 mt-3 mb-1.5">{formatted}</h3>;
      }
    }

    // 2. Checklists or bullet lists
    if (block.type === 'list') {
      // Check for checklist: - [ ] or - [x]
      const matchChecklist = block.content.match(/^(\s*-\s*\[([ x])\]\s*)(.*)$/);
      if (matchChecklist) {
        const checked = matchChecklist[2].toLowerCase() === 'x';
        const text = matchChecklist[3];
        return (
          <div className="flex items-start gap-2.5 py-0.5 group">
            <button
              onClick={() => toggleCheckbox(block, !checked)}
              className={cn(
                "flex h-4 w-4 shrink-0 items-center justify-center rounded border mt-0.5 transition-all cursor-pointer",
                checked 
                  ? "bg-primary border-primary text-white shadow-md shadow-primary/20" 
                  : "border-white/20 hover:border-white/40 bg-white/2"
              )}
            >
              {checked && <Check className="h-3 w-3 stroke-[3]" />}
            </button>
            <span className={cn(
              "text-xs leading-relaxed transition-all",
              checked ? "text-muted-foreground line-through decoration-white/20" : "text-foreground/85"
            )}>
              {parseInlineElements(text)}
            </span>
          </div>
        );
      }

      // Standard bullets
      const matchBullet = block.content.match(/^(\s*[-\*]\s*)(.*)$/);
      if (matchBullet) {
        const text = matchBullet[2];
        return (
          <div className="flex items-start gap-2.5 py-0.5 pl-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400/80 mt-1.5 shrink-0" />
            <span className="text-xs text-foreground/85 leading-relaxed">{parseInlineElements(text)}</span>
          </div>
        );
      }

      // Numbered items
      const matchNumbered = block.content.match(/^(\s*\d+\.\s*)(.*)$/);
      if (matchNumbered) {
        const prefix = matchNumbered[1];
        const text = matchNumbered[2];
        return (
          <div className="flex items-start gap-2 py-0.5 pl-1">
            <span className="text-xs font-bold text-indigo-400/60 font-mono mt-0.5 shrink-0 select-none">{prefix}</span>
            <span className="text-xs text-foreground/85 leading-relaxed">{parseInlineElements(text)}</span>
          </div>
        );
      }
    }

    // 3. Callouts
    if (block.type === 'callout') {
      const lines = block.content.split('\n');
      const headerLine = lines[0].trim();
      
      // Determine callout type
      let calloutType: 'note' | 'tip' | 'important' | 'warning' = 'note';
      let cleanContentLines = lines;

      const typeMatch = headerLine.match(/^>\s*\[!(NOTE|TIP|IMPORTANT|WARNING)\]/i);
      if (typeMatch) {
        calloutType = typeMatch[1].toLowerCase() as any;
        cleanContentLines = lines.slice(1);
      }

      const bodyText = cleanContentLines.map(l => l.replace(/^>\s?/, '')).join('\n');

      const config = {
        note: { icon: Info, border: 'border-blue-500/20 bg-blue-500/5', text: 'text-blue-400' },
        tip: { icon: Sparkles, border: 'border-indigo-500/20 bg-indigo-500/5', text: 'text-indigo-400' },
        important: { icon: CheckCircle2, border: 'border-emerald-500/20 bg-emerald-500/5', text: 'text-emerald-400' },
        warning: { icon: AlertTriangle, border: 'border-amber-500/20 bg-amber-500/5', text: 'text-amber-400' }
      }[calloutType];

      const IconComponent = config.icon;

      return (
        <div className={cn("my-3 p-3.5 rounded-xl border flex gap-3 aether-glass", config.border)}>
          <IconComponent className={cn("h-4 w-4 shrink-0 mt-0.5", config.text)} />
          <div className="text-xs text-foreground/80 leading-relaxed min-w-0 flex-1 whitespace-pre-wrap">
            {parseInlineElements(bodyText)}
          </div>
        </div>
      );
    }

    // 4. Code Blocks
    if (block.type === 'code') {
      const lines = block.content.split('\n');
      const language = lines[0].replace('```', '').trim() || 'code';
      const code = lines.slice(1, lines.length - 1).join('\n');

      return (
        <div className="my-3 rounded-xl border border-white/5 bg-[#030712]/60 overflow-hidden font-mono">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 bg-white/2">
            <span className="text-[10px] uppercase font-bold text-muted-foreground/80">{language}</span>
          </div>
          <pre className="p-3.5 text-xs text-indigo-200/90 overflow-x-auto whitespace-pre">
            <code>{code}</code>
          </pre>
        </div>
      );
    }

    // 5. Tables
    if (block.type === 'table') {
      const rows = block.content.split('\n');
      const tableRows = rows
        .map(row => row.split('|').map(cell => cell.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1))
        .filter(row => row.length > 0);

      // Check if separator exists
      const hasSeparator = tableRows[1] && tableRows[1].every(cell => /^:-*-*:?|^-+$/.test(cell));
      const headers = tableRows[0];
      const dataRows = hasSeparator ? tableRows.slice(2) : tableRows.slice(1);

      return (
        <div className="my-3.5 overflow-x-auto rounded-xl border border-white/5 aether-glass bg-white/[0.01]">
          <table className="min-w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/2">
                {headers.map((h, idx) => (
                  <th key={idx} className="px-4 py-2 font-bold text-foreground/80">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className="border-b border-white/5 hover:bg-white/[0.02] last:border-b-0">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-4 py-2 text-foreground/75 whitespace-pre-wrap">{parseInlineElements(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    // 6. Regular Paragraph
    return (
      <p className="text-xs text-foreground/85 leading-relaxed min-h-[1rem]">
        {cleaned ? parseInlineElements(block.content) : '\u200B'}
      </p>
    );
  };

  const handleApplyTemplate = (content: string) => {
    updateCanvas(content, localTitle);
  };

  if (canvasLoading) {
    return (
      <div className="w-[450px] border-l border-white/5 bg-surface/95 dark:bg-surface/90 backdrop-blur-xl flex flex-col items-center justify-center shrink-0 h-full z-45">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground mt-3 font-semibold tracking-wider">LOADING CANVAS...</span>
      </div>
    );
  }

  const isCanvasEmpty = !localContent || localContent.trim() === '';

  return (
    <div className="w-[480px] md:w-[650px] border-l border-white/5 bg-surface/95 dark:bg-surface/90 backdrop-blur-2xl flex shrink-0 h-full z-40 relative">
      
      {/* Main Canvas Document Editor */}
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
              onClick={() => setShowWorkspaceSidebar(!showWorkspaceSidebar)}
              className={cn(
                "h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors border",
                showWorkspaceSidebar 
                  ? "bg-primary/10 border-primary/20 text-primary hover:bg-primary/15" 
                  : "border-white/5 text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
              title="Toggle Workspace Items"
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
            <div className="space-y-2 select-text font-sans">
              {blocks.map((block, idx) => {
                const isFocused = focusedBlockIndex === idx;
                
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (!isFocused) {
                        setFocusedBlockIndex(idx);
                        // Delay to let React render textarea
                        setTimeout(() => blockRefs.current[idx]?.focus(), 20);
                      }
                    }}
                    className={cn(
                      "rounded-lg px-2 py-1.5 transition-all group relative border border-transparent",
                      isFocused 
                        ? "bg-white/5 border-primary/20 shadow-inner" 
                        : "hover:bg-white/[0.01] hover:border-white/5"
                    )}
                  >
                    {isFocused ? (
                      <textarea
                        ref={(el) => { blockRefs.current[idx] = el; }}
                        value={block.content}
                        onChange={(e) => handleBlockChange(block, e.target.value)}
                        onBlur={() => {
                          // Allow cursor clicks on sidebar items to not immediately blur
                          setTimeout(() => setFocusedBlockIndex(null), 150);
                        }}
                        onKeyDown={(e) => handleBlockKeyDown(idx, block, e)}
                        className="w-full bg-transparent resize-none border-none outline-none font-mono text-[11px] leading-relaxed focus:ring-0 p-0 text-indigo-200"
                        rows={Math.max(1, block.content.split('\n').length)}
                        placeholder="Type markdown..."
                      />
                    ) : (
                      renderBlockContent(block)
                    )}
                    
                    {/* Tiny Edit Tip Overlay */}
                    {!isFocused && (
                      <span className="absolute right-2.5 top-1.5 text-[8px] font-bold text-muted-foreground/30 opacity-0 group-hover:opacity-100 transition-opacity select-none uppercase tracking-wider">
                        Click to edit
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Workspace Active Items Panel (Right Sidebar) */}
      {showWorkspaceSidebar && (
        <div className="w-[200px] border-l border-white/5 bg-surface/98 flex flex-col h-full shrink-0 overflow-hidden animate-slide-in">
          
          {/* Tabs */}
          <div className="flex border-b border-white/5 p-1.5 bg-white/2 shrink-0">
            {(['tasks', 'goals', 'requests'] as const).map((tab) => {
              const config = {
                tasks: { label: 'Tasks', icon: ListTodo },
                goals: { label: 'Goals', icon: Target },
                requests: { label: 'Requests', icon: ClipboardList }
              }[tab];
              
              const Icon = config.icon;
              const isActive = sidebarTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center py-2 rounded-lg text-[9px] font-extrabold uppercase tracking-wider gap-1 cursor-pointer transition-colors border",
                    isActive 
                      ? "bg-primary border-primary/20 text-white shadow-md shadow-primary/15" 
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
          <div className="flex-1 overflow-y-auto aether-scroll p-3 space-y-2.5">
            
            {/* TASKS TAB */}
            {sidebarTab === 'tasks' && (
              <>
                {tasks.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/60 italic text-center pt-8">No active tasks</p>
                ) : (
                  tasks.map((task) => (
                    <div key={task.id} className="aether-glass p-2.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/2 hover:border-white/10 transition-all flex flex-col gap-1.5 group">
                      <span className="text-[10px] font-bold text-foreground/90 truncate leading-snug">{task.title}</span>
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border",
                          task.status === 'done' ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" :
                          task.status === 'in_progress' ? "bg-blue-500/10 border-blue-500/25 text-blue-400" :
                          task.status === 'review' ? "bg-amber-500/10 border-amber-500/25 text-amber-400" :
                          "bg-zinc-500/10 border-white/5 text-zinc-400"
                        )}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => handleInsertItem('Task', task.title, task.id)}
                          className="text-[8px] font-black uppercase text-primary hover:text-primary-foreground hover:bg-primary/20 px-1.5 py-0.5 rounded border border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          Insert Card
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* GOALS TAB */}
            {sidebarTab === 'goals' && (
              <>
                {goals.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/60 italic text-center pt-8">No active goals</p>
                ) : (
                  goals.map((goal) => (
                    <div key={goal.id} className="aether-glass p-2.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/2 hover:border-white/10 transition-all flex flex-col gap-1.5 group">
                      <span className="text-[10px] font-bold text-foreground/90 truncate leading-snug">{goal.title}</span>
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] text-muted-foreground uppercase font-black tracking-wider">
                          {goal.horizon.replace('_', ' ')}
                        </span>
                        <button
                          onClick={() => handleInsertItem('Goal', goal.title, goal.id)}
                          className="text-[8px] font-black uppercase text-primary hover:text-primary-foreground hover:bg-primary/20 px-1.5 py-0.5 rounded border border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          Insert Card
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {/* REQUESTS TAB */}
            {sidebarTab === 'requests' && (
              <>
                {allRequests.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground/60 italic text-center pt-8">No active requests</p>
                ) : (
                  allRequests.map((req) => (
                    <div key={req.id} className="aether-glass p-2.5 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/2 hover:border-white/10 transition-all flex flex-col gap-1.5 group">
                      <span className="text-[10px] font-bold text-foreground/90 truncate leading-snug">{req.title}</span>
                      <div className="flex items-center justify-between">
                        <span className={cn(
                          "text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border",
                          req.status === 'approved' ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" :
                          req.status === 'rejected' ? "bg-red-500/10 border-red-500/25 text-red-400" :
                          "bg-amber-500/10 border-amber-500/25 text-amber-400"
                        )}>
                          {req.status}
                        </span>
                        <button
                          onClick={() => handleInsertItem('Request', req.title, req.id)}
                          className="text-[8px] font-black uppercase text-primary hover:text-primary-foreground hover:bg-primary/20 px-1.5 py-0.5 rounded border border-primary/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        >
                          Insert Card
                        </button>
                      </div>
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

interface WorkspaceCardProps {
  type: 'Task' | 'Goal' | 'Request';
  id: string;
  title: string;
  orgId: string;
  actor: any;
  tasks: any[];
  goals: any[];
  requests: any[];
  onOpenCard: (paramKey: string, val: string) => void;
}

function WorkspaceCard({
  type,
  id,
  title,
  orgId,
  actor,
  tasks,
  goals,
  requests,
  onOpenCard
}: WorkspaceCardProps) {
  
  if (type === 'Task') {
    const taskObj = tasks.find(t => t.id === id);
    const checked = taskObj ? taskObj.status === 'done' : false;

    const handleCheckboxToggle = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (!taskObj) return;
      const nextStatus = checked ? 'todo' : 'done';
      try {
        await updateTask(taskObj.id, orgId, { status: nextStatus }, actor);
      } catch (err) {
        console.error('Failed to toggle card task status:', err);
      }
    };

    return (
      <div 
        onClick={() => onOpenCard('task', id)}
        className="my-2 p-3.5 rounded-xl border border-white/5 aether-glass bg-indigo-500/[0.02] hover:bg-indigo-500/[0.04] hover:border-primary/20 transition-all flex items-start gap-3 cursor-pointer shadow-md select-none group"
      >
        <button
          onClick={handleCheckboxToggle}
          className={cn(
            "flex h-4 w-4 shrink-0 items-center justify-center rounded border mt-0.5 transition-all cursor-pointer",
            checked 
              ? "bg-primary border-primary text-white" 
              : "border-white/20 hover:border-white/30 bg-white/2"
          )}
        >
          {checked && <Check className="h-3 w-3 stroke-[3]" />}
        </button>
        <div className="flex-1 min-w-0">
          <span className={cn(
            "text-xs font-bold leading-snug block truncate",
            checked ? "text-muted-foreground line-through decoration-white/10" : "text-foreground"
          )}>
            {title}
          </span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[8px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Task</span>
            {taskObj && (
              <span className={cn(
                "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                taskObj.priority === 'urgent' ? "text-red-400 bg-red-500/10" :
                taskObj.priority === 'high' ? "text-orange-400 bg-orange-500/10" :
                taskObj.priority === 'medium' ? "text-amber-400 bg-amber-500/10" : "text-muted-foreground bg-white/5"
              )}>
                {taskObj.priority} priority
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors self-center" />
      </div>
    );
  }

  if (type === 'Goal') {
    const goalObj = goals.find(g => g.id === id);
    return (
      <div 
        onClick={() => onOpenCard('goal', id)}
        className="my-2 p-3.5 rounded-xl border border-white/5 aether-glass bg-emerald-500/[0.02] hover:bg-emerald-500/[0.04] hover:border-primary/20 transition-all flex items-start gap-3 cursor-pointer shadow-md select-none group"
      >
        <div className="h-7 w-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
          <Target className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold leading-snug text-foreground block truncate">{title}</span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Goal</span>
            {goalObj && (
              <span className="text-[8px] font-bold text-muted-foreground uppercase">{goalObj.horizon.replace('_', ' ')}</span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors self-center" />
      </div>
    );
  }

  if (type === 'Request') {
    const reqObj = requests.find(r => r.id === id);
    const status = reqObj ? reqObj.status : 'pending';

    return (
      <div 
        onClick={() => onOpenCard('request', id)}
        className="my-2 p-3.5 rounded-xl border border-white/5 aether-glass bg-amber-500/[0.02] hover:bg-amber-500/[0.04] hover:border-primary/20 transition-all flex items-start gap-3 cursor-pointer shadow-md select-none group"
      >
        <div className="h-7 w-7 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
          <ClipboardList className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold leading-snug text-foreground block truncate">{title}</span>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">Request</span>
            <span className={cn(
              "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border",
              status === 'approved' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
              status === 'rejected' ? "bg-red-500/10 border-red-500/20 text-red-400" :
              "bg-amber-500/10 border-amber-500/20 text-amber-400 animate-pulse"
            )}>
              {status}
            </span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors self-center" />
      </div>
    );
  }

  return null;
}

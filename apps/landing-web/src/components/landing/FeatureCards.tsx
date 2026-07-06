import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  CheckSquare, 
  FileCheck, 
  Shield, 
  ArrowRight, 
  Terminal,
  Check,
  ChevronDown,
  Play,
  Pause,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { ScrollReveal } from './ScrollReveal';
import { useNavigation } from '../../context/NavigationContext';

const features = [
  {
    icon: MessageSquare,
    title: 'Real-time Chat',
    description: 'Centralize communication in department channels, secure DMs, and task comments.',
    bullets: ['Department #channels', 'Contextual task comments', 'Type `/task` command shortcut'],
    color: 'text-cyan-600',
    bg: 'bg-cyan-50 border border-cyan-100/30',
    hoverBorder: 'hover:border-cyan-305',
    path: '/features/team-chat',
    activeClass: {
      bg: 'bg-cyan-50/60',
      bgIcon: 'bg-cyan-100',
      border: 'border-cyan-200/60',
      glow: 'shadow-[0_0_30px_rgba(6,182,212,0.08)]',
      progress: 'bg-cyan-500',
      color: 'text-cyan-600'
    }
  },
  {
    icon: CheckSquare,
    title: 'Work Tracking',
    description: 'Empower managers and owners to map, track, and monitor every task and its live status assigned to teammates.',
    bullets: ['Oversight for managers & owners', 'Team-wide task mapping', 'Live status updates for assignees'],
    color: 'text-indigo-650',
    bg: 'bg-indigo-50 border border-indigo-100/30',
    hoverBorder: 'hover:border-indigo-305',
    path: '/features/work-tracking',
    activeClass: {
      bg: 'bg-indigo-50/60',
      bgIcon: 'bg-indigo-100',
      border: 'border-indigo-200/60',
      glow: 'shadow-[0_0_30px_rgba(99,102,241,0.08)]',
      progress: 'bg-indigo-500',
      color: 'text-indigo-600'
    }
  },
  {
    icon: FileCheck,
    title: 'Requests & Approvals Log',
    description: 'Standardize administrative requests. Review expense quotes, authorize leaves of absence, and track procurement files in a secure sign-off inbox.',
    bullets: ['Expense reimbursement queues', 'Leave of absence forms', 'Procurement audit logs'],
    color: 'text-purple-600',
    bg: 'bg-purple-50 border border-purple-100/30',
    hoverBorder: 'hover:border-purple-305',
    path: '/features/approvals',
    activeClass: {
      bg: 'bg-purple-50/60',
      bgIcon: 'bg-purple-100',
      border: 'border-purple-200/60',
      glow: 'shadow-[0_0_30px_rgba(168,85,247,0.08)]',
      progress: 'bg-purple-500',
      color: 'text-purple-600'
    }
  },
  {
    icon: Shield,
    title: 'Admin Console',
    description: 'Monitor capacity, workload allocations, project goal health, and overdue tasks.',
    bullets: ['Resource workload allocation', 'Project health tracking', 'Overdue task triage'],
    color: 'text-rose-600',
    bg: 'bg-rose-50 border border-rose-100/30',
    hoverBorder: 'hover:border-rose-305',
    path: '/features/admin-console',
    activeClass: {
      bg: 'bg-rose-50/60',
      bgIcon: 'bg-rose-100',
      border: 'border-rose-200/60',
      glow: 'shadow-[0_0_30px_rgba(244,63,94,0.08)]',
      progress: 'bg-rose-500',
      color: 'text-rose-600'
    }
  },
];

// Simulated custom dark cursor for light-theme preview canvas
const MouseCursor = ({ x, y, isGrabbing }: { x: number; y: number; isGrabbing: boolean }) => (
  <motion.div
    style={{ x, y, position: 'absolute', zIndex: 50, pointerEvents: 'none' }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.2 }}
    className="hidden lg:block"
  >
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`drop-shadow-md transition-transform duration-100 ${isGrabbing ? 'scale-90 rotate-[-5deg]' : ''}`}
    >
      <path
        d="M5.65376 12.3825L19.346 5.65376C19.7845 5.43797 20.3015 5.61732 20.5173 6.05581C20.597 6.2177 20.6273 6.40114 20.6033 6.57945L18.7303 20.5794C18.6653 21.0672 18.2163 21.4111 17.7286 21.3461C17.5855 21.327 17.4497 21.2678 17.3361 21.175L12.5024 17.2282L9.64731 20.1037C9.30206 20.4514 8.73977 20.4578 8.38676 20.118C8.24357 19.9802 8.15065 19.7997 8.12573 19.6043L7.29177 13.0617L5.32791 11.2334C4.96541 10.8957 4.94272 10.3271 5.2774 9.96144C5.38541 9.84343 5.51478 9.75485 5.65997 9.70059L5.65376 12.3825Z"
        fill={isGrabbing ? '#6366f1' : '#0f172a'}
        stroke="white"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  </motion.div>
);

// Animation Subcomponent 1: Real-time Chat (Light Glass)
function ChatPreview() {
  const [messages, setMessages] = useState<Array<{ sender: string; avatar: string; text: string; time: string; type?: 'system' | 'message' }>>([]);
  const [typingName, setTypingName] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');

  useEffect(() => {
    let active = true;
    const runAnimation = async () => {
      if (!active) return;
      setMessages([]);
      setTypingName(null);
      setChatInput('');

      // 1.0s: Message 1 from Sarah
      await new Promise(r => setTimeout(r, 1000));
      if (!active) return;
      setMessages([{ sender: 'Sarah Jenkins', avatar: 'SJ', text: 'Hey team, did we confirm the shipping contract for this month?', time: '10:24 AM' }]);

      // 2.5s: Message 2 from Alex
      await new Promise(r => setTimeout(r, 1500));
      if (!active) return;
      setMessages(prev => [
        ...prev,
        { sender: 'Alex Rivera', avatar: 'AR', text: 'Yes, just waiting on final operations protocol sign-off.', time: '10:25 AM' }
      ]);

      // 4.0s: Marcus starts typing
      await new Promise(r => setTimeout(r, 1500));
      if (!active) return;
      setTypingName('Marcus Chen');

      // 5.5s: Marcus sends message
      await new Promise(r => setTimeout(r, 1500));
      if (!active) return;
      setTypingName(null);
      setMessages(prev => [
        ...prev,
        { sender: 'Marcus Chen', avatar: 'MC', text: "I'll inspect the dock gates first thing tomorrow morning.", time: '10:28 AM' }
      ]);

      // 7.5s: Auto-typing /task command
      await new Promise(r => setTimeout(r, 1500));
      if (!active) return;
      const cmd = '/task Create dock gates inspection ticket';
      for (let i = 1; i <= cmd.length; i++) {
        await new Promise(r => setTimeout(r, 45));
        if (!active) return;
        setChatInput(cmd.slice(0, i));
      }

      // 10.0s: Enter command -> creates task ticket
      await new Promise(r => setTimeout(r, 700));
      if (!active) return;
      setChatInput('');
      setMessages(prev => [
        ...prev,
        {
          sender: 'Guild Bot',
          avatar: 'GB',
          text: 'Created task: Inspect dock gates (Assignee: Marcus Chen)',
          time: '10:29 AM',
          type: 'system'
        }
      ]);

      // 14.0s: Wait before loop
      await new Promise(r => setTimeout(r, 4000));
      if (active) {
        runAnimation();
      }
    };

    runAnimation();
    return () => { active = false; };
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-50/20 text-slate-800 font-sans text-xs">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-200/50 bg-white/40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">#ops-dispatch</span>
          <span className="text-[10px] text-slate-500 font-semibold hidden sm:inline">Daily logistics coordination</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-655 font-bold">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>3 active</span>
        </div>
      </div>
      
      {/* Message List */}
      <div className="flex-grow p-4 space-y-3.5 overflow-y-auto custom-scroll min-h-0">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-2.5 ${msg.type === 'system' ? 'bg-indigo-50/60 border border-indigo-100/50 p-2.5 rounded-xl' : ''}`}
            >
              {msg.type === 'system' ? (
                <div className="h-6 w-6 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
                  <Terminal className="h-3.5 w-3.5" />
                </div>
              ) : (
                <div className="h-6 w-6 rounded-lg bg-white flex items-center justify-center font-bold text-[10px] text-slate-700 border border-slate-200 shrink-0 select-none shadow-sm">
                  {msg.avatar}
                </div>
              )}
              
              <div className="flex-1 space-y-0.5 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className={`font-bold text-[10.5px] ${msg.type === 'system' ? 'text-indigo-700' : 'text-slate-800'}`}>{msg.sender}</span>
                  <span className="text-[9px] text-slate-400 font-semibold">{msg.time}</span>
                </div>
                <p className={`text-[11px] leading-normal break-words ${msg.type === 'system' ? 'text-indigo-950 font-semibold' : 'text-slate-600'}`}>{msg.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {typingName && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1 text-[10px] text-slate-500 pl-8 font-bold"
          >
            <span>{typingName}</span>
            <span>is typing</span>
            <span className="flex gap-0.5 ml-0.5">
              <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </motion.div>
        )}
      </div>
      
      {/* Input Box */}
      <div className="p-3 border-t border-slate-200/50 bg-white/40 shrink-0">
        <div className="flex items-center gap-2 p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
          <span className="text-slate-400 select-none">/</span>
          <div className="flex-1 text-[11px] text-slate-700 min-h-[16px] relative select-none">
            {chatInput ? (
              <span>{chatInput}</span>
            ) : (
              <span className="text-slate-400">Message #ops-dispatch...</span>
            )}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="inline-block w-1 h-3.5 bg-indigo-500 ml-0.5 align-middle"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Animation Subcomponent 2: Work Tracking (Kanban - Light Glass)
function WorkTrackingPreview() {
  const [column1, setColumn1] = useState<any[]>([]);
  const [column2, setColumn2] = useState<any[]>([]);
  
  const [cursorX, setCursorX] = useState(250);
  const [cursorY, setCursorY] = useState(180);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [draggingCardId, setDraggingCardId] = useState<string | null>(null);
  const [showSparkles, setShowSparkles] = useState(false);

  useEffect(() => {
    let active = true;
    const runAnimation = async () => {
      if (!active) return;
      setColumn1([
        { id: 't1', title: 'Review operations protocol', assignee: 'Sarah Jenkins', avatar: 'SJ', priority: 'High', progress: 60, status: 'In Progress' },
        { id: 't2', title: 'Inspect dock gates', assignee: 'Marcus Chen', avatar: 'MC', priority: 'Medium', progress: 0, status: 'To Do' },
      ]);
      setColumn2([
        { id: 't3', title: 'Verify clearance logs', assignee: 'Alex Rivera', avatar: 'AR', priority: 'Low', progress: 100, status: 'Done' }
      ]);
      setCursorX(280);
      setCursorY(160);
      setIsGrabbing(false);
      setDraggingCardId(null);
      setShowSparkles(false);

      // 1.5s: Move cursor to Card t1 (X: 110, Y: 105 relative to card area)
      await new Promise(r => setTimeout(r, 1500));
      if (!active) return;

      const steps = 30;
      const startX = 280, startY = 160;
      const endX = 110, endY = 105;
      
      for (let i = 1; i <= steps; i++) {
        await new Promise(r => setTimeout(r, 18));
        if (!active) return;
        const ratio = i / steps;
        const t = ratio * ratio * (3 - 2 * ratio);
        setCursorX(startX + (endX - startX) * t);
        setCursorY(startY + (endY - startY) * t);
      }

      // 3.0s: Grab Card t1
      await new Promise(r => setTimeout(r, 450));
      if (!active) return;
      setIsGrabbing(true);
      setDraggingCardId('t1');

      // 3.5s: Drag card from column 1 to column 2 (X: 250, Y: 105)
      const dragSteps = 40;
      const dStartX = 110, dStartY = 105;
      const dEndX = 250, dEndY = 105;
      for (let i = 1; i <= dragSteps; i++) {
        await new Promise(r => setTimeout(r, 18));
        if (!active) return;
        const ratio = i / dragSteps;
        const t = ratio * ratio * (3 - 2 * ratio);
        setCursorX(dStartX + (dEndX - dStartX) * t);
        setCursorY(dStartY + (dEndY - dStartY) * t);
      }

      // 4.5s: Drop card
      await new Promise(r => setTimeout(r, 350));
      if (!active) return;
      setIsGrabbing(false);
      setDraggingCardId(null);

      // Perform state updates
      setColumn1(prev => prev.filter(c => c.id !== 't1'));
      setColumn2(prev => [
        ...prev,
        { id: 't1', title: 'Review operations protocol', assignee: 'Sarah Jenkins', avatar: 'SJ', priority: 'High', progress: 60, status: 'Done' }
      ]);
      setShowSparkles(true);

      // 5.2s: Animate progress bar to 100%
      await new Promise(r => setTimeout(r, 650));
      if (!active) return;
      setColumn2(prev =>
        prev.map(c => c.id === 't1' ? { ...c, progress: 100 } : c)
      );

      // 8.0s: Reset loop
      await new Promise(r => setTimeout(r, 4000));
      if (active) {
        runAnimation();
      }
    };

    runAnimation();
    return () => { active = false; };
  }, []);

  return (
    <div className="h-full bg-slate-50/20 text-slate-800 p-4 font-sans text-xs relative overflow-hidden flex flex-col">
      <MouseCursor x={cursorX} y={cursorY} isGrabbing={isGrabbing} />
      
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200/50 mb-4 shrink-0">
        <span className="font-bold text-slate-800 select-none">Operations Tracking Board</span>
        <div className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-0.5 rounded text-[10px] text-slate-500 font-bold select-none shadow-sm">
          <span>Active Board</span>
        </div>
      </div>
      
      {/* Columns */}
      <div className="flex-1 min-h-0 grid grid-cols-2 gap-4 relative">
        {/* Column 1: In Progress */}
        <div className="bg-slate-100/40 border border-slate-200/40 rounded-2xl p-2.5 flex flex-col h-full overflow-hidden select-none">
          <div className="flex justify-between items-center mb-2 px-1 shrink-0">
            <span className="font-bold text-[9px] text-indigo-600 tracking-wider uppercase">In Progress ({column1.length})</span>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto custom-scroll">
            {column1.map(card => (
              <motion.div
                key={card.id}
                layoutId={card.id}
                style={{ opacity: draggingCardId === card.id ? 0.35 : 1 }}
                className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-sm space-y-2 relative"
              >
                <h4 className="font-bold text-[10.5px] leading-tight text-slate-800">{card.title}</h4>
                {card.progress > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[8px] text-slate-400 font-bold">
                      <span>Progress</span>
                      <span>{card.progress}%</span>
                    </div>
                    <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${card.progress}%` }} />
                    </div>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 text-[8px] font-extrabold">
                  <span className="px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500 font-bold uppercase">{card.priority}</span>
                  <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center text-[8.5px] text-indigo-650 font-bold border border-slate-200 shadow-sm">{card.avatar}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        
        {/* Column 2: Done */}
        <div className="bg-slate-100/40 border border-slate-200/40 rounded-2xl p-2.5 flex flex-col h-full overflow-hidden relative select-none">
          {showSparkles && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-40">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: [1, 1.25, 0.8], opacity: [0, 1, 0] }}
                transition={{ duration: 0.8 }}
                className="text-indigo-600 flex gap-2"
              >
                <Sparkles className="h-5 w-5 animate-spin" />
                <Sparkles className="h-4 w-4 animate-bounce" />
              </motion.div>
            </div>
          )}
          
          <div className="flex justify-between items-center mb-2 px-1 shrink-0">
            <span className="font-bold text-[9px] text-emerald-600 tracking-wider uppercase">Done ({column2.length})</span>
          </div>
          <div className="space-y-2 flex-grow overflow-y-auto custom-scroll">
            {column2.map(card => (
              <motion.div
                key={card.id}
                layoutId={card.id}
                className="bg-white border border-slate-200/80 rounded-xl p-2.5 shadow-sm space-y-2 relative"
              >
                <h4 className="font-bold text-[10.5px] leading-tight text-slate-800">{card.title}</h4>
                <div className="space-y-1">
                  <div className="flex justify-between text-[8px] text-slate-400 font-bold">
                    <span>Progress</span>
                    <span className="text-emerald-600 font-bold">{card.progress}%</span>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${card.progress}%` }} />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 text-[8px] font-extrabold">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-150 text-emerald-600 font-bold uppercase flex items-center gap-0.5">
                    <Check className="h-2.5 w-2.5" />
                    <span>Done</span>
                  </span>
                  <div className="h-4 w-4 rounded-full bg-white flex items-center justify-center text-[8.5px] text-indigo-650 font-bold border border-slate-200 shadow-sm">{card.avatar}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Animation Subcomponent 3: Approvals Log (Light Glass)
function ApprovalsPreview() {
  const [cursorX, setCursorX] = useState(180);
  const [cursorY, setCursorY] = useState(210);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [budgetPercent, setBudgetPercent] = useState(88);
  const [activeItem, setActiveItem] = useState(1);
  const [showStamp, setShowStamp] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    let active = true;
    const runAnimation = async () => {
      if (!active) return;
      setIsApproved(false);
      setBudgetPercent(88);
      setActiveItem(1);
      setShowStamp(false);
      setIsExiting(false);
      setCursorX(180);
      setCursorY(210);

      // 1.5s: Move cursor to "Approve" button (Roughly X: 275, Y: 182)
      await new Promise(r => setTimeout(r, 1500));
      if (!active) return;

      const steps = 30;
      const startX = 180, startY = 210;
      const endX = 275, endY = 182;
      for (let i = 1; i <= steps; i++) {
        await new Promise(r => setTimeout(r, 18));
        if (!active) return;
        const ratio = i / steps;
        const t = ratio * ratio * (3 - 2 * ratio);
        setCursorX(startX + (endX - startX) * t);
        setCursorY(startY + (endY - startY) * t);
      }

      // Click Approve
      await new Promise(r => setTimeout(r, 350));
      if (!active) return;
      setIsGrabbing(true);

      await new Promise(r => setTimeout(r, 120));
      if (!active) return;
      setIsGrabbing(false);
      setIsApproved(true);
      setShowStamp(true);

      // 3.0s: Budget updates
      await new Promise(r => setTimeout(r, 700));
      if (!active) return;
      setBudgetPercent(100);

      // 4.5s: Card slides out
      await new Promise(r => setTimeout(r, 1500));
      if (!active) return;
      setIsExiting(true);

      // 5.3s: Transition to next request
      await new Promise(r => setTimeout(r, 800));
      if (!active) return;
      setActiveItem(2);
      setIsApproved(false);
      setShowStamp(false);
      setIsExiting(false);
      setCursorX(180);
      setCursorY(210);

      // 8.5s: Loop reset
      await new Promise(r => setTimeout(r, 3500));
      if (active) {
        runAnimation();
      }
    };

    runAnimation();
    return () => { active = false; };
  }, []);

  return (
    <div className="h-full bg-slate-50/20 text-slate-800 p-4 font-sans text-xs relative overflow-hidden flex gap-3">
      <MouseCursor x={cursorX} y={cursorY} isGrabbing={isGrabbing} />
      
      {/* Left Column: Inbox List */}
      <div className="w-[30%] border-r border-slate-200/50 pr-3 flex flex-col gap-2 shrink-0 select-none">
        <span className="font-bold text-[9px] text-purple-600 uppercase tracking-wider mb-1">Queue (2)</span>
        
        {/* Item 1 */}
        <div className={`p-2 rounded-xl border text-left transition-all ${
          activeItem === 1
            ? 'bg-purple-50 border-purple-200 text-purple-950 shadow-sm'
            : 'bg-white/65 border-slate-200/50 text-slate-400'
        }`}>
          <div className="font-bold text-[9.5px] truncate">Forklift Repair</div>
          <div className="text-[8px] font-bold mt-0.5 text-slate-500">$1,200 · Marcus</div>
        </div>
        
        {/* Item 2 */}
        <div className={`p-2 rounded-xl border text-left transition-all ${
          activeItem === 2
            ? 'bg-purple-50 border-purple-200 text-purple-950 shadow-sm'
            : 'bg-white/65 border-slate-200/50 text-slate-400'
        }`}>
          <div className="font-bold text-[9.5px] truncate">Phoenix Flights</div>
          <div className="text-[8px] font-bold mt-0.5 text-slate-500">$450 · Alex</div>
        </div>
      </div>
      
      {/* Right Column: Request details */}
      <div className="flex-1 flex flex-col h-full justify-between min-w-0 select-none">
        <AnimatePresence mode="wait">
          {!isExiting && (
            <motion.div
              key={activeItem}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              className="flex-1 flex flex-col justify-between relative min-h-0"
            >
              {/* Approval stamp */}
              {showStamp && (
                <motion.div
                  initial={{ scale: 2.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, rotate: -12 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 200 }}
                  className="absolute inset-0 m-auto h-9 w-28 border-[3px] border-emerald-500 rounded bg-white text-emerald-600 font-extrabold text-[11px] flex items-center justify-center tracking-widest rotate-[-12deg] shadow-[0_0_15px_rgba(16,185,129,0.18)] z-30 select-none"
                >
                  APPROVED
                </motion.div>
              )}
              
              <div className="space-y-2.5 min-h-0 overflow-y-auto pr-1">
                {/* Header */}
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-purple-700 font-bold uppercase">Purchase Request</span>
                    <h4 className="font-bold text-slate-900 text-xs mt-1 leading-tight">
                      {activeItem === 1 ? 'Forklift Hydraulic Cylinder' : 'Operations Flight & Lodging'}
                    </h4>
                  </div>
                  <span className="text-xs font-extrabold text-slate-800 shrink-0">
                    {activeItem === 1 ? '$1,200' : '$450'}
                  </span>
                </div>
                
                {/* Description */}
                <p className="text-[9.5px] leading-relaxed text-slate-600 font-medium">
                  {activeItem === 1 
                    ? 'Hydraulic cylinder replacement for secondary Warehouse Unit B forklift. Essential for morning loading dock logistics.'
                    : 'Flight expenses and 2 nights lodging in Phoenix for logistics expo.'
                  }
                </p>
                
                {/* Meta details */}
                <div className="grid grid-cols-2 gap-2 text-[8px] border-t border-slate-200/50 pt-2 text-slate-450 font-bold">
                  <div>
                    <span>REQUESTED BY</span>
                    <div className="text-slate-700 mt-0.5">{activeItem === 1 ? 'Marcus Chen' : 'Alex Rivera'}</div>
                  </div>
                  <div>
                    <span>BUDGET ALLOC</span>
                    <div className="text-slate-700 mt-0.5">{activeItem === 1 ? 'Q2 Maintenance' : 'Travel & Conference'}</div>
                  </div>
                </div>
              </div>
              
              {/* Actions & Budget Indicator */}
              <div className="space-y-3 pt-2.5 border-t border-slate-200/50 shrink-0">
                {/* Budget utilization */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[7.5px] text-slate-500 font-bold">
                    <span>BUDGET UTILIZATION</span>
                    <span>{activeItem === 1 ? `$${(budgetPercent * 100).toLocaleString()}` : '$3,400'} / $10,000</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        budgetPercent >= 100 ? 'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.3)]' : 'bg-purple-500'
                      }`}
                      style={{ width: `${budgetPercent}%` }}
                    />
                  </div>
                </div>
                
                {/* Action buttons */}
                <div className="flex justify-end gap-2 text-[10px] font-bold">
                  <button className="px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-500 cursor-default">Reject</button>
                  <button 
                    className={`px-3 py-1 rounded font-extrabold cursor-default transition-all ${
                      isApproved 
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' 
                        : 'bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.15)] animate-pulse'
                    }`}
                  >
                    {isApproved ? 'Approved' : 'Approve'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Animation Subcomponent 4: Admin Console (Our biggest moat - Light Glass Control Tower)
function AdminPreview() {
  const [cursorX, setCursorX] = useState(150);
  const [cursorY, setCursorY] = useState(210);
  const [isGrabbing, setIsGrabbing] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  
  // Moat states: Marcus overloaded at 120%
  const [marcusLoad, setMarcusLoad] = useState(120);
  const [alexLoad, setAlexLoad] = useState(40);
  const [triageResolved, setTriageResolved] = useState(false);
  const [auditLog, setAuditLog] = useState<string[]>([
    'Sarah Jenkins approved $1,200 expense',
    'System audit: Goal status healthy (94%)'
  ]);

  useEffect(() => {
    let active = true;
    const runAnimation = async () => {
      if (!active) return;
      setMarcusLoad(120);
      setAlexLoad(40);
      setTriageResolved(false);
      setDropdownOpen(false);
      setIsGrabbing(false);
      setCursorX(160);
      setCursorY(210);
      setAuditLog([
        'Sarah Jenkins approved $1,200 expense',
        'System audit: Goal status healthy (94%)'
      ]);

      // 1.5s: Move cursor to "Accept Auto-Triage" button (Roughly X: 240, Y: 215)
      await new Promise(r => setTimeout(r, 1500));
      if (!active) return;

      const steps1 = 30;
      const startX = 160, startY = 210;
      const endX = 240, endY = 215;
      for (let i = 1; i <= steps1; i++) {
        await new Promise(r => setTimeout(r, 18));
        if (!active) return;
        const ratio = i / steps1;
        const t = ratio * ratio * (3 - 2 * ratio);
        setCursorX(startX + (endX - startX) * t);
        setCursorY(startY + (endY - startY) * t);
      }

      // Click to accept triage recommendation
      await new Promise(r => setTimeout(r, 450));
      if (!active) return;
      setIsGrabbing(true);
      await new Promise(r => setTimeout(r, 120));
      if (!active) return;
      setIsGrabbing(false);
      setTriageResolved(true);

      // Animate workload shift (Marcus 120% -> 80%, Alex 40% -> 60%)
      const transitionSteps = 25;
      for (let i = 1; i <= transitionSteps; i++) {
        await new Promise(r => setTimeout(r, 25));
        if (!active) return;
        const ratio = i / transitionSteps;
        setMarcusLoad(120 - (120 - 80) * ratio);
        setAlexLoad(40 + (60 - 40) * ratio);
      }

      // Add audit log entry
      await new Promise(r => setTimeout(r, 400));
      if (!active) return;
      setAuditLog(prev => [
        'AI Triage: Inspect Dock Gates reallocated to Alex',
        ...prev
      ]);

      // Move cursor back to rest
      setCursorX(160);
      setCursorY(210);

      // 8.5s: Reset loop
      await new Promise(r => setTimeout(r, 4500));
      if (active) {
        runAnimation();
      }
    };

    runAnimation();
    return () => { active = false; };
  }, []);

  return (
    <div className="h-full bg-slate-50/20 text-slate-800 p-4 font-sans text-xs relative overflow-hidden flex flex-col justify-between select-none">
      <MouseCursor x={cursorX} y={cursorY} isGrabbing={isGrabbing} />
      
      {/* Dashboard Top Widgets */}
      <div className="grid grid-cols-12 gap-3 shrink-0">
        {/* Widget 1: Capacity Allocator */}
        <div className="col-span-7 bg-white/70 border border-slate-200/80 rounded-2xl p-2.5 flex flex-col gap-2 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="font-bold text-[8.5px] text-slate-500 uppercase tracking-wider">Workload Balancer</span>
            {!triageResolved && (
              <span className="text-[7.5px] px-1 bg-red-50 text-red-600 border border-red-200 rounded font-extrabold animate-pulse">1 Risk</span>
            )}
          </div>
          <div className="space-y-1.5">
            {/* Marcus */}
            <div className="flex justify-between items-center text-[9px] font-bold">
              <span className="text-slate-600">Marcus (Logistics)</span>
              <span className={`transition-colors font-extrabold ${marcusLoad > 90 ? 'text-red-600 animate-pulse' : 'text-emerald-600'}`}>
                {Math.round(marcusLoad)}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  marcusLoad > 90 ? 'bg-red-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${marcusLoad / 1.3}%` }} // Adjusted ratio for 120% capacity visual
              />
            </div>
            
            {/* Alex */}
            <div className="flex justify-between items-center text-[9px] font-bold">
              <span className="text-slate-600">Alex (Product Ops)</span>
              <span className="text-slate-500 font-extrabold">{Math.round(alexLoad)}%</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-300" style={{ width: `${alexLoad}%` }} />
            </div>
          </div>
        </div>
        
        {/* Widget 2: Goal progress circle */}
        <div className="col-span-5 bg-white/70 border border-slate-200/80 rounded-2xl p-2.5 flex flex-col justify-between shadow-sm">
          <span className="font-bold text-[8.5px] text-slate-500 uppercase tracking-wider block">Goal Target</span>
          <div className="flex items-center gap-2.5">
            <div className="relative h-10 w-10 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <path className="text-slate-100" strokeWidth="3.5" stroke="currentColor" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <motion.path
                  initial={{ strokeDasharray: '0, 100' }}
                  animate={{ strokeDasharray: '94, 100' }}
                  transition={{ duration: 1.5 }}
                  className="text-emerald-500"
                  strokeWidth="3.5"
                  strokeDasharray="94, 100"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute font-bold text-[9px] text-slate-800">94%</div>
            </div>
            <div className="min-w-0">
              <div className="text-[9.5px] font-extrabold text-emerald-600 truncate">Q2 Fleet</div>
              <div className="text-[7.5px] text-slate-400 font-bold">On Track</div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Triage Copilot Center - Moat representation */}
      <div className="flex-1 mt-3 bg-white/70 border border-slate-200/80 rounded-2xl p-2.5 flex flex-col justify-between shadow-sm min-h-0">
        <div className="flex justify-between items-start mb-1 shrink-0">
          <div className="flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-indigo-500" />
            <span className="font-bold text-[8.5px] text-slate-500 uppercase tracking-wider">Control Tower Triage</span>
          </div>
          <span className="text-[8px] text-slate-400 font-bold">AI Autopilot Suggestion</span>
        </div>

        {/* Triage card content */}
        <div className="flex-grow flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {!triageResolved ? (
              <motion.div
                key="alert"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="bg-red-50/80 border border-red-200 rounded-xl p-2 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-[9.5px] text-red-950 truncate">Marcus Chen Overcapacity</div>
                    <div className="text-[8px] text-red-700 font-semibold mt-0.5 leading-tight">
                      Reallocate task 'Inspect gates' to Alex Rivera (40% capacity)
                    </div>
                  </div>
                </div>
                
                {/* Suggestion action button */}
                <button className="px-2 py-1 bg-indigo-600 border border-indigo-500 text-white rounded-lg text-[9px] font-extrabold shadow-sm shrink-0 flex items-center gap-0.5 cursor-default hover:bg-indigo-500">
                  <span>Rebalance</span>
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="resolved"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50/80 border border-emerald-250 rounded-xl p-2 flex items-center justify-between gap-2.5"
              >
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="font-bold text-[9.5px] text-emerald-950">Workloads Fully Balanced</div>
                    <div className="text-[8px] text-emerald-700 font-semibold mt-0.5">Alert resolved. Load balanced smoothly.</div>
                  </div>
                </div>
                <span className="text-[7.5px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-600 font-bold border border-emerald-200">Balanced</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Audit Log Feed */}
        <div className="border-t border-slate-100 pt-1.5 mt-1.5 shrink-0">
          <div className="flex items-center justify-between text-[7px] text-slate-400 font-bold uppercase mb-1">
            <span>Live Audit Trail</span>
            <span className="h-1 w-1 bg-slate-300 rounded-full animate-ping" />
          </div>
          <div className="space-y-1 max-h-[30px] overflow-hidden">
            {auditLog.map((log, index) => (
              <motion.div 
                key={log} 
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-1.5 text-[8.5px] text-slate-500 font-semibold truncate"
              >
                <div className="h-1 w-1 rounded-full bg-slate-350" />
                <span className="truncate">{log}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function FeatureCards() {
  const { navigate } = useNavigation();
  const [activeTab, setActiveTab] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  
  // Coordinates for mouse glow variable tracking
  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    e.currentTarget.style.setProperty('--mouse-x', `${x}px`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}px`);
  };

  // Autoplay progression effect
  useEffect(() => {
    if (!isPlaying) return;
    
    const interval = 80; // Update progress bar every 80ms
    const totalTime = 8000; // 8 seconds per feature
    const increment = (interval / totalTime) * 100;
    
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setActiveTab((current) => (current + 1) % features.length);
          return 0;
        }
        return prev + increment;
      });
    }, interval);
    
    return () => clearInterval(timer);
  }, [isPlaying, activeTab]);

  const handleTabSelect = (index: number) => {
    setActiveTab(index);
    setProgress(0);
    setIsPlaying(false); // Pause autoplay once clicked
  };

  return (
    <section className="px-6 py-28 relative overflow-hidden bg-slate-50/10 grid-pattern">
      {/* Background ambient light blobs */}
      <div className="absolute top-[20%] left-[-10%] w-[450px] h-[450px] rounded-full bg-indigo-500/5 blur-[110px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[450px] h-[450px] rounded-full bg-cyan-500/5 blur-[110px] pointer-events-none" />
      
      <div className="max-w-6xl mx-auto">
        <ScrollReveal>
          <div className="text-center mb-16 flex flex-col items-center">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight font-sans">
              Engineered for <span className="text-gradient">Operational Speed</span>
            </h2>
            <p className="text-slate-500 text-xs md:text-sm font-semibold max-w-lg mx-auto leading-relaxed mt-3">
              Consolidate your coordination. Guild Orbit unifies task lists, chat channels, expense approvals, and admin workload boards.
            </p>
          </div>
        </ScrollReveal>

        {/* Desktop Layout (lg screens and up) */}
        <div className="hidden lg:grid grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Interactive Feature Selector Cards */}
          <div className="col-span-5 flex flex-col gap-4 select-none">
            {features.map((f, i) => {
              const Icon = f.icon;
              const isActive = activeTab === i;
              
              return (
                <div
                  key={f.title}
                  onClick={() => handleTabSelect(i)}
                  onMouseMove={handleMouseMove}
                  className={`group relative rounded-3xl p-6 transition-all duration-300 cursor-pointer border shadow-sm overflow-hidden flex flex-col justify-between ${
                    isActive 
                      ? `${f.activeClass.bg} ${f.activeClass.border} ${f.activeClass.glow} scale-[1.01]` 
                      : 'bg-white/40 border-slate-155 hover:bg-white/75 hover:scale-[1.005]'
                  } mouse-glow-card mouse-glow-border`}
                >
                  <div className="flex gap-4">
                    {/* Icon Container */}
                    <div
                      className={`inline-flex items-center justify-center h-11 w-11 rounded-2xl shrink-0 transition-transform ${
                        isActive 
                          ? `${f.activeClass.bgIcon} ${f.activeClass.color}` 
                          : `${f.bg} ${f.color} group-hover:scale-105`
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="space-y-1.5 font-sans">
                      <h3 className={`text-base font-bold transition-colors ${
                        isActive ? 'text-slate-900' : 'text-slate-800'
                      }`}>
                        {f.title}
                      </h3>
                      
                      <p className="text-xs text-slate-505 leading-relaxed font-semibold">
                        {f.description}
                      </p>

                      {/* Expandable Bullets on Active */}
                      <AnimatePresence initial={false}>
                        {isActive && (
                          <motion.ul 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-1.5 pt-2"
                          >
                            {f.bullets.map((bullet) => (
                              <li key={bullet} className="flex items-center gap-2 text-[10.5px] font-bold text-slate-600">
                                <Check className={`h-3 w-3 ${f.color}`} />
                                <span>{bullet}</span>
                              </li>
                            ))}
                          </motion.ul>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Auto-rotation Progress bar */}
                  {isActive && isPlaying && (
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-slate-200/20 overflow-hidden pointer-events-none">
                      <div 
                        className={`h-full ${f.activeClass.progress} rounded-full`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Right Column: Light-Glass Mockup Terminal Showcase */}
          <div className="col-span-7 relative h-[360px] flex">
            <div className="absolute inset-0 rounded-3xl bg-indigo-500/5 blur-[45px] pointer-events-none" />
            
            {/* Main Light Glass Frame */}
            <div className="w-full h-full glass rounded-3xl border border-white/60 shadow-2xl relative flex flex-col overflow-hidden">
              {/* macOS Control Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200/50 bg-white/60 shrink-0 select-none">
                <div className="flex items-center gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-[#FF5F56] border border-[#E0443E]/20" />
                  <div className="h-3 w-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]/20" />
                  <div className="h-3 w-3 rounded-full bg-[#27C93F] border border-[#1AAB29]/20" />
                </div>
                
                {/* Mock Browser URL */}
                <div className="text-[10px] text-slate-600 font-bold font-mono px-4 py-0.5 rounded-md bg-slate-200/40 border border-slate-300/30 flex items-center gap-1 max-w-[200px] truncate">
                  <span>guild.orbit</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-655 font-semibold">{features[activeTab].title.toLowerCase().replace(/\s+/g, '-')}</span>
                </div>
                
                {/* Play/Pause Control toggle */}
                <button 
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="p-1 rounded bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-sm"
                >
                  {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                </button>
              </div>

              {/* Dynamic Animated Preview Canvas (Light Glass Canvas background) */}
              <div className="flex-grow min-h-0 bg-white/35 backdrop-blur-md">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, scale: 0.985 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.985 }}
                    transition={{ duration: 0.25 }}
                    className="w-full h-full"
                  >
                    {activeTab === 0 && <ChatPreview />}
                    {activeTab === 1 && <WorkTrackingPreview />}
                    {activeTab === 2 && <ApprovalsPreview />}
                    {activeTab === 3 && <AdminPreview />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Layout (screen width < lg) */}
        <div className="lg:hidden flex flex-col gap-6 select-none">
          {features.map((f, i) => {
            const Icon = f.icon;
            const isSelected = activeTab === i;
            
            return (
              <div 
                key={f.title}
                onMouseMove={handleMouseMove}
                className={`group relative rounded-3xl p-6 transition-all duration-300 border bg-white/40 border-slate-150 shadow-sm overflow-hidden flex flex-col ${
                  isSelected ? 'border-indigo-200 shadow-md bg-white/70 animate-none' : 'hover:scale-[1.005]'
                } mouse-glow-card mouse-glow-border`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`inline-flex items-center justify-center h-11 w-11 rounded-2xl ${f.bg} ${f.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <button 
                      onClick={() => setActiveTab(isSelected ? -1 : i)}
                      className="text-[10px] font-extrabold text-indigo-650 px-3 py-1 rounded-full bg-indigo-50 hover:bg-indigo-100/70 transition-colors cursor-pointer"
                    >
                      {isSelected ? 'Hide Preview' : 'Show Live Preview'}
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 mb-2">
                    {f.title}
                  </h3>
                  
                  <p className="text-xs text-slate-500 leading-relaxed font-semibold mb-4">
                    {f.description}
                  </p>

                  <ul className="space-y-1.5 mb-4">
                    {f.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-center gap-2 text-[10.5px] font-bold text-slate-600">
                        <Check className={`h-3 w-3 ${f.color}`} />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Inline mobile drawer for previewing animated canvas */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 280 }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden w-full border border-slate-200/50 rounded-2xl relative shadow-inner mt-2 flex flex-col"
                    >
                      {/* Inside mobile drawer, render light glass canvas */}
                      <div className="flex-grow min-h-0 bg-white/35 backdrop-blur-md rounded-2xl overflow-hidden">
                        {i === 0 && <ChatPreview />}
                        {i === 1 && <WorkTrackingPreview />}
                        {i === 2 && <ApprovalsPreview />}
                        {i === 3 && <AdminPreview />}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Learn More link */}
                <div 
                  onClick={() => navigate(f.path)}
                  className="pt-4 flex items-center gap-1 text-[11px] font-extrabold text-indigo-600 opacity-90 hover:opacity-100 transition-all cursor-pointer w-fit"
                >
                  <span>Learn more about {f.title}</span>
                  <ArrowRight className="h-3 w-3" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Explore all button footer */}
        <ScrollReveal delay={0.25}>
          <div className="text-center mt-12">
            <button
              onClick={() => navigate('/features')}
              className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer group"
            >
              Explore all premium features
              <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}

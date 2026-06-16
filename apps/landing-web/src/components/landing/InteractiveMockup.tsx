import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  List, 
  KanbanSquare, 
  FileCheck, 
  MessageSquare,
  CheckCircle2, 
  ChevronRight, 
  Send,
  Sparkles,
  Check,
  X,
  Hash,
  Users,
  Paperclip,
  Smile,
  Clock,
  ArrowRight,
  Bot
} from 'lucide-react';

type TabType = 'list' | 'kanban' | 'approvals' | 'chat';
type ChatTargetType = 'operations' | 'general' | 'marketing-ops' | 'sarah' | 'alex' | 'marcus';

interface TaskItem {
  id: string;
  title: string;
  assignee: string;
  avatar: string;
  priority: 'High' | 'Medium' | 'Low';
  status: 'Done' | 'In Progress' | 'To Do';
}

interface ApprovalItem {
  id: string;
  title: string;
  type: 'Purchase' | 'Leave';
  requester: string;
  amount?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  date: string;
  description: string;
  comment?: string;
  actionedBy?: string;
}

interface ChatMessage {
  id: string;
  sender: string;
  avatar: string;
  text: string;
  time: string;
  isSystem?: boolean;
}

export function InteractiveMockup() {
  const [activeTab, setActiveTab] = useState<TabType>('list');

  // Interactive Task List State
  const [tasks, setTasks] = useState<TaskItem[]>([
    { id: '1', title: 'Review operations protocol for Q3', assignee: 'Sarah Jenkins', avatar: 'SJ', priority: 'High', status: 'In Progress' },
    { id: '2', title: 'Prepare onboarding documentation', assignee: 'Alex Rivera', avatar: 'AR', priority: 'Medium', status: 'To Do' },
    { id: '3', title: 'Procure warehouse asset trackers', assignee: 'Marcus Chen', avatar: 'MC', priority: 'High', status: 'To Do' },
    { id: '4', title: 'Sign contract with shipping agency', assignee: 'Sarah Jenkins', avatar: 'SJ', priority: 'Low', status: 'Done' },
  ]);

  // Interactive Approvals State
  const [approvals, setApprovals] = useState<ApprovalItem[]>([
    { 
      id: '1', 
      title: 'Forklift Maintenance Expense', 
      type: 'Purchase', 
      requester: 'Marcus Chen', 
      amount: '$1,200', 
      status: 'Pending',
      date: 'Today, 9:15 AM',
      description: 'Hydraulic cylinder replacement and safety inspection for the primary Warehouse Unit B forklift. Critical for loading dock ops.'
    },
    { 
      id: '2', 
      title: 'Annual Leave Request (5 Days)', 
      type: 'Leave', 
      requester: 'Alex Rivera', 
      status: 'Pending',
      date: 'Today, 8:40 AM',
      description: 'Requesting 5 consecutive working days off for family vacation from June 20 to June 25. Core cover will be managed by Marcus.'
    },
    { 
      id: '3', 
      title: 'Office Supplies Bulk Order', 
      type: 'Purchase', 
      requester: 'Sarah Jenkins', 
      amount: '$340', 
      status: 'Approved',
      date: 'Yesterday, 2:10 PM',
      description: 'Bulk order of standard printing paper, department logbooks, and office whiteboard markers for the main operations room.',
      comment: 'Approved. Proceed with vendor checkout.',
      actionedBy: 'Sarah Jenkins'
    },
  ]);

  // Selected Approval Detail state
  const [selectedApprovalId, setSelectedApprovalId] = useState<string | null>(null);
  const [approvalComment, setApprovalComment] = useState('');

  // Active Chat Target state
  const [activeChatTarget, setActiveChatTarget] = useState<ChatTargetType>('operations');

  // Interactive Chat Channels & DMs Store
  const [chatStore, setChatStore] = useState<Record<ChatTargetType, ChatMessage[]>>({
    operations: [
      { id: '1', sender: 'Sarah Jenkins', avatar: 'SJ', text: 'Hey team, did we confirm the shipping contract for this month?', time: '10:24 AM' },
      { id: '2', sender: 'Alex Rivera', avatar: 'AR', text: 'Yes, just waiting on final operations protocol sign-off.', time: '10:25 AM' },
      { id: '3', sender: 'Marcus Chen', avatar: 'MC', text: 'Great. Also, we need to inspect the shipping dock soon.', time: '10:28 AM' },
    ],
    general: [
      { id: 'g1', sender: 'Sarah Jenkins', avatar: 'SJ', text: 'Welcome to the new Guild Orbit operations workspace! 🚀', time: 'Yesterday, 9:00 AM' },
      { id: 'g2', sender: 'Alex Rivera', avatar: 'AR', text: 'Stunning interface! Onboarding was literally under 5 minutes.', time: 'Yesterday, 9:02 AM' },
      { id: 'g3', sender: 'Marcus Chen', avatar: 'MC', text: 'Excited to coordinate forklift maintenance and sign-offs here.', time: 'Yesterday, 9:05 AM' }
    ],
    'marketing-ops': [
      { id: 'm1', sender: 'Sarah Jenkins', avatar: 'SJ', text: 'Alex, did you get around to exporting the new onboarding banner images?', time: 'Today, 8:12 AM' },
      { id: 'm2', sender: 'Alex Rivera', avatar: 'AR', text: 'Yep! Exported the assets. Let me know if we need changes.', time: 'Today, 8:15 AM' }
    ],
    sarah: [
      { id: 's1', sender: 'Sarah Jenkins', avatar: 'SJ', text: 'Hey there! Let me know if you need help assigning permissions by department.', time: 'Yesterday, 4:10 PM' },
      { id: 's2', sender: 'You', avatar: 'ME', text: 'Thanks Sarah, the admin settings panel is super intuitive.', time: 'Yesterday, 4:15 PM' }
    ],
    alex: [
      { id: 'a1', sender: 'Alex Rivera', avatar: 'AR', text: 'Hey, I just submitted my annual leave request in the approvals tab. Could you take a look?', time: 'Today, 8:41 AM' },
      { id: 'a2', sender: 'You', avatar: 'ME', text: 'On it! I will review the leave approvals side panel and sign off.', time: 'Today, 8:43 AM' }
    ],
    marcus: [
      { id: 'c1', sender: 'Marcus Chen', avatar: 'MC', text: 'Forklift maintenance is finished. Staged the invoice receipt for $1,200.', time: 'Today, 9:16 AM' },
      { id: 'c2', sender: 'You', avatar: 'ME', text: 'Awesome Marcus. I see the expense approval on my dashboard. Approving now.', time: 'Today, 9:20 AM' }
    ]
  });

  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Active chat details
  const activeChatDetails = {
    operations: { title: 'operations', desc: 'Company daily logistics and administrative coordination' },
    general: { title: 'general', desc: 'Company-wide announcements and team updates' },
    'marketing-ops': { title: 'marketing-ops', desc: 'Marketing campaign briefs, banner assets, and scheduling' },
    sarah: { title: 'Sarah Jenkins', desc: 'Direct Message (Operations Director)' },
    alex: { title: 'Alex Rivera', desc: 'Direct Message (Product Lead)' },
    marcus: { title: 'Marcus Chen', desc: 'Direct Message (Logistics Ops Manager)' }
  }[activeChatTarget];

  // Auto-typing Chat Demo Simulator
  const runChatDemo = () => {
    if (isTyping) return;
    setIsTyping(true);
    setChatInput('');
    setActiveChatTarget('operations'); // Force operations channel for simulation
    
    const commandText = '/task Inspect the shipping dock assign @marcus';
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      setChatInput(prev => prev + commandText[currentIndex]);
      currentIndex++;
      
      if (currentIndex === commandText.length) {
        clearInterval(interval);
        
        // Send message after a slight delay
        setTimeout(() => {
          const userMsgId = Math.random().toString();
          const userMsg = {
            id: userMsgId,
            sender: 'You',
            avatar: 'ME',
            text: commandText,
            time: '11:15 AM'
          };
          
          setChatStore(prev => ({
            ...prev,
            operations: [...prev.operations, userMsg]
          }));
          setChatInput('');
          
          // Show bot created response
          setTimeout(() => {
            const systemMsg = {
              id: Math.random().toString(),
              sender: 'System Bot',
              avatar: 'GO',
              text: '✅ Task created: "Inspect the shipping dock" (Assigned to Marcus Chen, Priority: High)',
              time: '11:15 AM',
              isSystem: true
            };
            
            setChatStore(prev => ({
              ...prev,
              operations: [...prev.operations, systemMsg]
            }));
            
            // Add to tasks list state so they see it in List/Board tabs!
            setTasks(prev => [...prev, {
              id: Math.random().toString(),
              title: 'Inspect the shipping dock',
              assignee: 'Marcus Chen',
              avatar: 'MC',
              priority: 'High',
              status: 'To Do'
            }]);
            setIsTyping(false);
          }, 800);
          
        }, 400);
      }
    }, 45);
  };

  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;
    
    const text = chatInput.trim();
    const newUserMsg = {
      id: Math.random().toString(),
      sender: 'You',
      avatar: 'ME',
      text: text,
      time: '11:16 AM'
    };
    
    setChatStore(prev => ({
      ...prev,
      [activeChatTarget]: [...prev[activeChatTarget], newUserMsg]
    }));
    setChatInput('');
    
    if (text.startsWith('/task ')) {
      const taskTitle = text.replace('/task ', '').split('assign')[0].trim();
      const hasAssign = text.includes('assign @');
      let assigneeName = 'Sarah Jenkins';
      let assigneeAvatar = 'SJ';
      
      if (hasAssign) {
        const parts = text.split('assign @');
        const candidate = parts[parts.length - 1].toLowerCase().trim();
        if (candidate.startsWith('marcus') || candidate.startsWith('mc')) {
          assigneeName = 'Marcus Chen';
          assigneeAvatar = 'MC';
        } else if (candidate.startsWith('alex') || candidate.startsWith('ar')) {
          assigneeName = 'Alex Rivera';
          assigneeAvatar = 'AR';
        }
      }
      
      setTimeout(() => {
        const systemMsg = {
          id: Math.random().toString(),
          sender: 'System Bot',
          avatar: 'GO',
          text: `✅ Task created: "${taskTitle}" (Assigned to ${assigneeName})`,
          time: '11:16 AM',
          isSystem: true
        };
        
        setChatStore(prev => ({
          ...prev,
          [activeChatTarget]: [...prev[activeChatTarget], systemMsg]
        }));
        
        setTasks(prev => [...prev, {
          id: Math.random().toString(),
          title: taskTitle,
          assignee: assigneeName,
          avatar: assigneeAvatar,
          priority: 'Medium',
          status: 'To Do'
        }]);
      }, 700);
    }
  };

  const toggleTaskStatus = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'Done' ? 'To Do' : 'Done';
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const moveTaskNext = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus: Record<string, TaskItem['status']> = {
          'To Do': 'In Progress',
          'In Progress': 'Done',
          'Done': 'To Do'
        };
        return { ...t, status: nextStatus[t.status] };
      }
      return t;
    }));
  };

  const handleApprovalSubmit = (id: string, action: 'Approved' | 'Rejected') => {
    setApprovals(prev => prev.map(a => {
      if (a.id === id) {
        return { 
          ...a, 
          status: action,
          comment: approvalComment.trim() || undefined,
          actionedBy: 'Sarah Jenkins (You)'
        };
      }
      return a;
    }));
    setApprovalComment('');
    setSelectedApprovalId(null);
  };

  // Color mappings
  const priorityColor = {
    High: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
    Medium: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    Low: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  };

  const activeApproval = approvals.find(a => a.id === selectedApprovalId);
  const currentChatMessages = chatStore[activeChatTarget] || [];

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl border border-indigo-100 bg-white shadow-[0_24px_70px_rgba(99,102,241,0.08)] overflow-hidden relative">
      {/* Header controls for switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50 gap-4">
        {/* Switcher Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl max-w-max self-center">
          <button
            onClick={() => { setActiveTab('list'); setSelectedApprovalId(null); }}
            className={`inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'list' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="h-4 w-4" />
            List View
          </button>
          <button
            onClick={() => { setActiveTab('kanban'); setSelectedApprovalId(null); }}
            className={`inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'kanban' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KanbanSquare className="h-4 w-4" />
            Board View
          </button>
          <button
            onClick={() => { setActiveTab('approvals'); setSelectedApprovalId(null); }}
            className={`inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'approvals' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            Approvals
          </button>
          <button
            onClick={() => { setActiveTab('chat'); setSelectedApprovalId(null); }}
            className={`inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all cursor-pointer ${
              activeTab === 'chat' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            Team Chat
          </button>
        </div>

        {/* Browser indicator info */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-400 bg-white border border-slate-100 rounded-lg px-3 py-1.5 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Simulator
        </div>
      </div>

      {/* Main Sandbox Area */}
      <div className="relative min-h-[400px] bg-white overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'list' && (
            <motion.div
              key="list-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Active Operations Tasks</h3>
                <span className="text-[11px] text-slate-400 font-semibold">{tasks.length} tasks open</span>
              </div>
              <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4 w-12 text-center">Status</th>
                      <th className="py-3 px-4">Task Name</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs font-medium text-slate-700">
                    {tasks.map((task) => (
                      <tr 
                        key={task.id} 
                        className={`hover:bg-slate-50/50 transition-colors ${
                          task.status === 'Done' ? 'opacity-60' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          <button 
                            onClick={() => toggleTaskStatus(task.id)}
                            className="text-slate-300 hover:text-indigo-600 transition-colors focus:outline-none cursor-pointer"
                          >
                            <CheckCircle2 
                              className={`h-4.5 w-4.5 ${
                                task.status === 'Done' ? 'text-emerald-500 fill-emerald-50' : 'text-slate-300'
                              }`} 
                            />
                          </button>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`${task.status === 'Done' ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                            {task.title}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-indigo-50 border border-indigo-100 text-[10px] font-bold text-indigo-600 flex items-center justify-center">
                              {task.avatar}
                            </div>
                            <span className="text-slate-600 font-semibold">{task.assignee}</span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${priorityColor[task.priority]}`}>
                            {task.priority}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <button
                            onClick={() => moveTaskNext(task.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200/50 transition-colors cursor-pointer"
                          >
                            <span>Cycle</span>
                            <ChevronRight className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'kanban' && (
            <motion.div
              key="kanban-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 font-sans">Operational Kanban Board</h3>
                <span className="text-[11px] text-slate-400 font-semibold">Click cards to shift columns</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4 h-full items-start">
                {/* TO DO COLUMN */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 min-h-[280px]">
                  <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">To Do</span>
                    <span className="h-5 px-2 bg-slate-200/50 rounded-full text-[10px] font-bold text-slate-600 flex items-center justify-center">
                      {tasks.filter(t => t.status === 'To Do').length}
                    </span>
                  </div>
                  <AnimatePresence mode="popLayout">
                    {tasks.filter(t => t.status === 'To Do').map(task => (
                      <motion.div
                        layoutId={`card-${task.id}`}
                        key={task.id}
                        onClick={() => moveTaskNext(task.id)}
                        className="bg-white border border-slate-150 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group"
                      >
                        <h4 className="text-xs font-bold text-slate-950 leading-snug group-hover:text-indigo-600 transition-colors">
                          {task.title}
                        </h4>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${priorityColor[task.priority]}`}>
                              {task.priority}
                            </span>
                          </div>
                          <div className="h-5 w-5 rounded-full bg-slate-100 text-[9px] font-bold text-slate-600 flex items-center justify-center border border-slate-200">
                            {task.avatar}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* IN PROGRESS COLUMN */}
                <div className="bg-indigo-50/20 border border-indigo-100/50 rounded-2xl p-4 flex flex-col gap-3 min-h-[280px]">
                  <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">In Progress</span>
                    <span className="h-5 px-2 bg-indigo-100/50 rounded-full text-[10px] font-bold text-indigo-600 flex items-center justify-center">
                      {tasks.filter(t => t.status === 'In Progress').length}
                    </span>
                  </div>
                  <AnimatePresence mode="popLayout">
                    {tasks.filter(t => t.status === 'In Progress').map(task => (
                      <motion.div
                        layoutId={`card-${task.id}`}
                        key={task.id}
                        onClick={() => moveTaskNext(task.id)}
                        className="bg-white border border-indigo-100 rounded-xl p-3 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group"
                      >
                        <h4 className="text-xs font-bold text-slate-950 leading-snug group-hover:text-indigo-600 transition-colors">
                          {task.title}
                        </h4>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${priorityColor[task.priority]}`}>
                              {task.priority}
                            </span>
                          </div>
                          <div className="h-5 w-5 rounded-full bg-indigo-50 text-[9px] font-bold text-indigo-600 flex items-center justify-center border border-indigo-100">
                            {task.avatar}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* DONE COLUMN */}
                <div className="bg-emerald-50/20 border border-emerald-100/30 rounded-2xl p-4 flex flex-col gap-3 min-h-[280px]">
                  <div className="flex items-center justify-between px-1 mb-1">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Done</span>
                    <span className="h-5 px-2 bg-emerald-100/50 rounded-full text-[10px] font-bold text-emerald-600 flex items-center justify-center">
                      {tasks.filter(t => t.status === 'Done').length}
                    </span>
                  </div>
                  <AnimatePresence mode="popLayout">
                    {tasks.filter(t => t.status === 'Done').map(task => (
                      <motion.div
                        layoutId={`card-${task.id}`}
                        key={task.id}
                        onClick={() => moveTaskNext(task.id)}
                        className="bg-white border border-emerald-100 rounded-xl p-3 shadow-sm opacity-70 hover:opacity-100 hover:shadow-md transition-all cursor-pointer group"
                      >
                        <h4 className="text-xs font-bold text-slate-500 leading-snug line-through group-hover:text-emerald-600 transition-colors">
                          {task.title}
                        </h4>
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${priorityColor[task.priority]}`}>
                              {task.priority}
                            </span>
                          </div>
                          <div className="h-5 w-5 rounded-full bg-emerald-50 text-[9px] font-bold text-emerald-600 flex items-center justify-center border border-emerald-100">
                            {task.avatar}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'approvals' && (
            <motion.div
              key="approvals-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex h-[400px]"
            >
              {/* Left Column: Approvals List */}
              <div className={`flex flex-col p-6 h-full overflow-y-auto custom-scroll transition-all duration-300 ${
                selectedApprovalId ? 'w-1/2 border-r border-slate-100' : 'w-full'
              }`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900">One-Click Operational Sign-offs</h3>
                  <span className="text-[11px] text-slate-400 font-semibold">
                    {approvals.filter(a => a.status === 'Pending').length} pending approvals
                  </span>
                </div>
                <div className="space-y-3">
                  {approvals.map((approval) => (
                    <div 
                      key={approval.id} 
                      onClick={() => {
                        setSelectedApprovalId(approval.id);
                        setApprovalComment(approval.comment || '');
                      }}
                      className={`border rounded-2xl p-4 bg-white shadow-sm flex items-center justify-between gap-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all ${
                        selectedApprovalId === approval.id ? 'border-indigo-500 shadow-md ring-2 ring-indigo-50' : 'border-slate-100'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`h-9 w-9 rounded-xl flex items-center justify-center mt-0.5 shrink-0 ${
                          approval.type === 'Purchase' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                        }`}>
                          <FileCheck className="h-4.5 w-4.5" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-slate-950">{approval.title}</h4>
                          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold">
                            <span>Req: {approval.requester}</span>
                            <span>•</span>
                            <span className="text-indigo-600">{approval.amount || 'Leave'}</span>
                          </div>
                        </div>
                      </div>

                      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 ${
                        approval.status === 'Approved' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : approval.status === 'Rejected'
                          ? 'bg-rose-50 text-rose-700 border border-rose-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {approval.status === 'Approved' ? (
                          <Check className="h-3 w-3" />
                        ) : approval.status === 'Rejected' ? (
                          <X className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {approval.status}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Approval Detail View Panel */}
              <AnimatePresence>
                {selectedApprovalId && activeApproval && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="w-1/2 h-full bg-slate-50/70 p-6 flex flex-col justify-between overflow-y-auto custom-scroll"
                  >
                    <div>
                      {/* Close Header */}
                      <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Request details</span>
                        <button 
                          onClick={() => setSelectedApprovalId(null)}
                          className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Request Content */}
                      <div className="space-y-3.5">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                            activeApproval.type === 'Purchase' 
                              ? 'bg-indigo-50 text-indigo-600 border-indigo-150' 
                              : 'bg-purple-50 text-purple-600 border-purple-150'
                          }`}>
                            {activeApproval.type} Request
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">{activeApproval.date}</span>
                        </div>

                        <h4 className="text-sm font-extrabold text-slate-900 leading-snug">{activeApproval.title}</h4>

                        {/* Requester Profile card */}
                        <div className="flex items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                          <div className="h-7 w-7 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-indigo-100">
                            {activeApproval.requester.split(' ').map(n=>n[0]).join('')}
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-slate-800 leading-none">{activeApproval.requester}</p>
                            <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Operations Coordinator</p>
                          </div>
                        </div>

                        <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm text-xs text-slate-600 leading-relaxed font-semibold">
                          <p>{activeApproval.description}</p>
                          {activeApproval.amount && (
                            <p className="mt-2 text-indigo-600 font-bold">Total Amount: {activeApproval.amount}</p>
                          )}
                        </div>

                        {/* Logs and Action Comments */}
                        {activeApproval.comment && (
                          <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-xl text-xs">
                            <p className="font-bold text-emerald-800 flex items-center gap-1">
                              <Check className="h-3.5 w-3.5" />
                              Action Taken by {activeApproval.actionedBy}
                            </p>
                            <p className="text-slate-600 italic mt-1 font-semibold">"{activeApproval.comment}"</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Panel */}
                    <div className="mt-6 border-t border-slate-200 pt-4 bg-slate-50/70">
                      {activeApproval.status === 'Pending' ? (
                        <div className="space-y-3">
                          <textarea
                            value={approvalComment}
                            onChange={(e) => setApprovalComment(e.target.value)}
                            placeholder="Add approval or rejection comment..."
                            className="w-full border border-slate-200 hover:border-slate-300 focus:border-indigo-500 rounded-xl p-3 text-xs focus:outline-none bg-white font-medium resize-none shadow-inner"
                            rows={3}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => handleApprovalSubmit(activeApproval.id, 'Rejected')}
                              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl border border-rose-200 text-rose-600 bg-white hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
                            >
                              <X className="h-4 w-4" />
                              Reject
                            </button>
                            <button
                              onClick={() => handleApprovalSubmit(activeApproval.id, 'Approved')}
                              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl text-white bg-emerald-600 hover:bg-emerald-750 text-xs font-bold shadow-md shadow-emerald-200 transition-all cursor-pointer active:scale-95 animate-pulse"
                            >
                              <Check className="h-4 w-4" />
                              Approve
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-2">
                          <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-wide">
                            Approval Logged Successfully
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'chat' && (
            <motion.div
              key="chat-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex h-[400px]"
            >
              {/* Left Column: Chat Sidebar (Slack-like) */}
              <div className="w-1/4 bg-slate-900 text-slate-400 flex flex-col justify-between py-4 border-r border-slate-950 shrink-0">
                <div className="space-y-6">
                  {/* Channels Section */}
                  <div className="px-3">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block mb-2 px-2">
                      Channels
                    </span>
                    <div className="space-y-0.5">
                      <button 
                        onClick={() => setActiveChatTarget('operations')}
                        className={`flex items-center gap-1.5 text-xs font-bold w-full text-left py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors ${
                          activeChatTarget === 'operations' ? 'bg-slate-800 text-white' : 'hover:text-slate-100 hover:bg-slate-800/40'
                        }`}
                      >
                        <Hash className="h-3.5 w-3.5 text-indigo-400" />
                        operations
                      </button>
                      <button 
                        onClick={() => setActiveChatTarget('general')}
                        className={`flex items-center gap-1.5 text-xs font-bold w-full text-left py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors ${
                          activeChatTarget === 'general' ? 'bg-slate-800 text-white' : 'hover:text-slate-100 hover:bg-slate-800/40'
                        }`}
                      >
                        <Hash className="h-3.5 w-3.5 text-slate-500" />
                        general
                      </button>
                      <button 
                        onClick={() => setActiveChatTarget('marketing-ops')}
                        className={`flex items-center gap-1.5 text-xs font-bold w-full text-left py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors ${
                          activeChatTarget === 'marketing-ops' ? 'bg-slate-800 text-white' : 'hover:text-slate-100 hover:bg-slate-800/40'
                        }`}
                      >
                        <Hash className="h-3.5 w-3.5 text-slate-500" />
                        marketing-ops
                      </button>
                    </div>
                  </div>

                  {/* Direct Messages Section */}
                  <div className="px-3">
                    <span className="text-[9px] font-extrabold uppercase tracking-widest text-slate-500 block mb-2 px-2">
                      Direct Messages
                    </span>
                    <div className="space-y-0.5">
                      <button 
                        onClick={() => setActiveChatTarget('sarah')}
                        className={`flex items-center gap-2.5 text-xs font-bold w-full text-left py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors ${
                          activeChatTarget === 'sarah' ? 'bg-slate-800 text-white' : 'hover:text-slate-100 hover:bg-slate-800/40'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 block shrink-0" />
                        Sarah Jenkins
                      </button>
                      <button 
                        onClick={() => setActiveChatTarget('alex')}
                        className={`flex items-center gap-2.5 text-xs font-bold w-full text-left py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors ${
                          activeChatTarget === 'alex' ? 'bg-slate-800 text-white' : 'hover:text-slate-100 hover:bg-slate-800/40'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 block shrink-0" />
                        Alex Rivera
                      </button>
                      <button 
                        onClick={() => setActiveChatTarget('marcus')}
                        className={`flex items-center gap-2.5 text-xs font-bold w-full text-left py-1.5 px-2.5 rounded-lg cursor-pointer transition-colors ${
                          activeChatTarget === 'marcus' ? 'bg-slate-800 text-white' : 'hover:text-slate-100 hover:bg-slate-800/40'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-500 block shrink-0" />
                        Marcus Chen
                      </button>
                    </div>
                  </div>
                </div>

                {/* Active user status tag */}
                <div className="px-4 border-t border-slate-850 pt-3 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-indigo-600 border border-indigo-700 text-[10px] font-extrabold text-white flex items-center justify-center shrink-0">
                    SJ
                  </div>
                  <div className="leading-none overflow-hidden text-ellipsis">
                    <p className="text-[10px] font-extrabold text-slate-100">Sarah Jenkins</p>
                    <span className="text-[8px] text-emerald-400 font-semibold mt-0.5 block">Active (You)</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Chat Conversation Interface */}
              <div className="w-3/4 flex flex-col justify-between h-full bg-slate-50/30 relative">
                {/* Chat Column Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-white shadow-sm z-10 shrink-0">
                  <div className="min-w-0">
                    <h3 className="text-xs font-extrabold text-slate-850 flex items-center gap-1 truncate">
                      {['sarah', 'alex', 'marcus'].includes(activeChatTarget) ? (
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0 inline-block mr-1" />
                      ) : (
                        <Hash className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      )}
                      {activeChatDetails.title}
                    </h3>
                    <p className="text-[9.5px] text-slate-400 font-semibold truncate mt-0.5">
                      {activeChatDetails.desc}
                    </p>
                  </div>

                  {/* Simulate Command Action - only enabled for operations channel */}
                  {activeChatTarget === 'operations' && (
                    <button
                      onClick={runChatDemo}
                      disabled={isTyping}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-extrabold border transition-all cursor-pointer shrink-0 shadow-sm ${
                        isTyping 
                          ? 'bg-slate-50 text-slate-400 border-slate-200' 
                          : 'bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 border-indigo-150 hover:from-indigo-100 hover:to-purple-100'
                      }`}
                    >
                      <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
                      Simulate `/task` shortcut
                    </button>
                  )}
                </div>

                {/* Messages Stream */}
                <div className="flex-grow overflow-y-auto px-5 py-4 space-y-4 custom-scroll bg-slate-50/10">
                  {currentChatMessages.map((msg) => {
                    const isMe = msg.sender === 'You' || msg.avatar === 'ME';
                    const isSystem = msg.isSystem;

                    if (isSystem) {
                      return (
                        <div key={msg.id} className="w-full my-3 flex justify-center">
                          <div className="bg-indigo-950 text-indigo-50 border border-indigo-900/40 px-4 py-3 rounded-2xl flex items-start gap-3 shadow-md max-w-[90%] select-none">
                            <Bot className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0 animate-bounce" />
                            <div>
                              <p className="text-[10px] font-extrabold text-indigo-300 uppercase tracking-widest leading-none">System Automation</p>
                              <p className="text-xs font-semibold mt-1.5 leading-relaxed text-indigo-100">{msg.text}</p>
                              <span className="text-[8px] text-indigo-400 font-semibold block mt-1.5">{msg.time} • Action Audited</span>
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div 
                        key={msg.id} 
                        className={`flex gap-3 max-w-[85%] ${
                          isMe ? 'flex-row-reverse ml-auto' : 'mr-auto'
                        }`}
                      >
                        {/* Avatar */}
                        <div className={`h-8 w-8 rounded-xl text-[10px] font-extrabold flex items-center justify-center border shrink-0 shadow-sm ${
                          isMe 
                            ? 'bg-indigo-50 text-indigo-600 border-indigo-100' 
                            : 'bg-white text-slate-600 border-slate-150'
                        }`}>
                          {msg.avatar}
                        </div>

                        {/* Content */}
                        <div className="space-y-1">
                          {/* Name & Time */}
                          <div className={`flex items-center gap-1.5 text-[9px] text-slate-400 font-extrabold ${
                            isMe ? 'flex-row-reverse' : ''
                          }`}>
                            <span className="text-slate-800">{msg.sender}</span>
                            <span>•</span>
                            <span>{msg.time}</span>
                          </div>

                          {/* Bubble */}
                          <div className={`px-4 py-2.5 text-xs font-semibold shadow-sm leading-relaxed ${
                            isMe 
                              ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none border border-indigo-700/30' 
                              : 'bg-white text-slate-700 rounded-2xl rounded-tl-none border border-slate-150'
                          }`}>
                            <p>{msg.text}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Form Input Bar */}
                <form onSubmit={handleSendManual} className="px-5 py-3 border-t border-slate-100 bg-white flex items-center gap-3 shrink-0 shadow-inner">
                  <div className="flex-grow flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-within:border-indigo-500 focus-within:bg-white transition-all">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      disabled={isTyping}
                      placeholder={
                        isTyping 
                          ? "Simulating typing..." 
                          : activeChatTarget === 'operations' 
                          ? "Type message, or try '/task [task name] assign @marcus'..."
                          : "Send a message..."
                      }
                      className="flex-grow text-xs focus:outline-none font-semibold bg-transparent disabled:text-slate-400"
                    />
                    <div className="flex items-center gap-1.5 text-slate-400 ml-2">
                      <Smile className="h-4.5 w-4.5 hover:text-slate-650 cursor-pointer" />
                      <Paperclip className="h-4.5 w-4.5 hover:text-slate-650 cursor-pointer" />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    disabled={isTyping || !chatInput.trim()}
                    className="h-9 w-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-md shadow-indigo-150 disabled:opacity-40 disabled:shadow-none transition-all cursor-pointer active:scale-95"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

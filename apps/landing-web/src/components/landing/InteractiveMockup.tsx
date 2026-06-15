import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  List, 
  KanbanSquare, 
  FileCheck, 
  Folder, 
  CheckCircle2, 
  Clock, 
  User, 
  ChevronRight, 
  ArrowRight,
  Plus, 
  CornerDownRight, 
  FileText, 
  Image as ImageIcon, 
  Paperclip,
  Check,
  X
} from 'lucide-react';

type TabType = 'list' | 'kanban' | 'approvals' | 'files';

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
  type: string;
  requester: string;
  amount?: string;
  status: 'Pending' | 'Approved' | 'Rejected';
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
    { id: '1', title: 'Forklift Maintenance Expense', type: 'Purchase', requester: 'Marcus Chen', amount: '$1,200', status: 'Pending' },
    { id: '2', title: 'Annual Leave Request (5 Days)', type: 'Leave', requester: 'Alex Rivera', status: 'Pending' },
    { id: '3', title: 'Office Supplies Bulk Order', type: 'Purchase', requester: 'Sarah Jenkins', amount: '$340', status: 'Approved' },
  ]);

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

  const handleApproval = (id: string, action: 'Approved' | 'Rejected') => {
    setApprovals(prev => prev.map(a => {
      if (a.id === id) {
        return { ...a, status: action };
      }
      return a;
    }));
  };

  // Color mappings
  const priorityColor = {
    High: 'bg-rose-500/10 text-rose-600 border border-rose-500/20',
    Medium: 'bg-amber-500/10 text-amber-600 border border-amber-500/20',
    Low: 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20',
  };

  const statusColor = {
    'To Do': 'bg-slate-100 text-slate-600 border border-slate-200',
    'In Progress': 'bg-indigo-50 text-indigo-600 border border-indigo-100',
    'Done': 'bg-emerald-50 text-emerald-600 border border-emerald-100',
  };

  return (
    <div className="w-full max-w-4xl mx-auto rounded-3xl border border-indigo-100 bg-white shadow-[0_24px_70px_rgba(99,102,241,0.08)] overflow-hidden">
      {/* Header controls for switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50 gap-4">
        {/* Switcher Tab Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl max-w-max self-center">
          <button
            onClick={() => setActiveTab('list')}
            className={`inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all ${
              activeTab === 'list' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <List className="h-4 w-4" />
            List View
          </button>
          <button
            onClick={() => setActiveTab('kanban')}
            className={`inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all ${
              activeTab === 'kanban' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KanbanSquare className="h-4 w-4" />
            Board View
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all ${
              activeTab === 'approvals' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileCheck className="h-4 w-4" />
            Approvals
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`inline-flex items-center gap-2 text-[13px] font-semibold px-4 py-2 rounded-lg transition-all ${
              activeTab === 'files' 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Folder className="h-4 w-4" />
            Files
          </button>
        </div>

        {/* Browser indicator info */}
        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-slate-400 bg-white border border-slate-100 rounded-lg px-3 py-1.5 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Simulator
        </div>
      </div>

      {/* Main Sandbox Area */}
      <div className="relative min-h-[380px] p-6 bg-white overflow-hidden custom-scroll">
        <AnimatePresence mode="wait">
          {activeTab === 'list' && (
            <motion.div
              key="list-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
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
                            className="text-slate-300 hover:text-indigo-600 transition-colors focus:outline-none"
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
              className="flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900 font-sans">Operational Kanban Board</h3>
                <span className="text-[11px] text-slate-400 font-semibold">Click cards to shift columns</span>
              </div>
              <div className="grid md:grid-cols-3 gap-4 h-full items-start">
                {/* TO DO COLUMN */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex flex-col gap-3 min-h-[260px]">
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
                <div className="bg-indigo-50/20 border border-indigo-100/50 rounded-2xl p-4 flex flex-col gap-3 min-h-[260px]">
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
                <div className="bg-emerald-50/20 border border-emerald-100/30 rounded-2xl p-4 flex flex-col gap-3 min-h-[260px]">
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
              className="flex flex-col h-full"
            >
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
                    className="border border-slate-100 rounded-2xl p-4 bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`h-9 w-9 rounded-xl flex items-center justify-center mt-0.5 ${
                        approval.type === 'Purchase' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-purple-50 text-purple-600 border border-purple-100'
                      }`}>
                        <FileCheck className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-950">{approval.title}</h4>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-400 font-semibold">
                          <span className="text-slate-600">Req: {approval.requester}</span>
                          <span>•</span>
                          <span>Type: {approval.type}</span>
                          {approval.amount && (
                            <>
                              <span>•</span>
                              <span className="text-indigo-600">{approval.amount}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {approval.status === 'Pending' ? (
                        <>
                          <button
                            onClick={() => handleApproval(approval.id, 'Rejected')}
                            className="inline-flex items-center justify-center h-8 px-3.5 rounded-xl border border-rose-100 text-rose-600 bg-rose-50/50 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer active:scale-95"
                          >
                            <X className="h-3.5 w-3.5 mr-1" />
                            Reject
                          </button>
                          <button
                            onClick={() => handleApproval(approval.id, 'Approved')}
                            className="inline-flex items-center justify-center h-8 px-4 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 text-xs font-bold shadow-md shadow-indigo-200 transition-all cursor-pointer active:scale-95"
                          >
                            <Check className="h-3.5 w-3.5 mr-1" />
                            Approve
                          </button>
                        </>
                      ) : (
                        <div className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold ${
                          approval.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {approval.status === 'Approved' ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                          {approval.status}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'files' && (
            <motion.div
              key="files-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-900">Shared Files View</h3>
                <span className="text-[11px] text-slate-400 font-semibold">Shared company assets</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="border border-slate-100 rounded-2xl p-4 bg-white hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer text-center group">
                  <div className="h-12 w-12 rounded-xl bg-rose-50 text-rose-500 border border-rose-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">Q3_Logistics_Budget.xlsx</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">1.4 MB • Excel</p>
                </div>
                <div className="border border-slate-100 rounded-2xl p-4 bg-white hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer text-center group">
                  <div className="h-12 w-12 rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    <ImageIcon className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">warehouse_layout_mockup.png</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">4.2 MB • Image</p>
                </div>
                <div className="border border-slate-100 rounded-2xl p-4 bg-white hover:border-indigo-100 hover:shadow-md transition-all cursor-pointer text-center group">
                  <div className="h-12 w-12 rounded-xl bg-amber-50 text-amber-500 border border-amber-100 flex items-center justify-center mx-auto mb-3 group-hover:scale-105 transition-transform">
                    <FileText className="h-6 w-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 line-clamp-1">Shipping_Terms_2026.pdf</h4>
                  <p className="text-[10px] text-slate-400 font-semibold mt-1">820 KB • PDF</p>
                </div>
                <div className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 hover:bg-slate-50 border-dashed border-slate-200 flex flex-col items-center justify-center min-h-[110px] rounded-2xl transition-all cursor-pointer text-slate-400 hover:text-indigo-600 hover:border-indigo-200">
                  <Plus className="h-5 w-5 mb-1.5" />
                  <span className="text-[11px] font-bold">Upload File</span>
                </div>
              </div>
              
              <div className="mt-5 border border-dashed border-slate-150 rounded-2xl p-4 bg-slate-50/30 flex items-center gap-3">
                <div className="h-6 w-6 rounded-full bg-indigo-50 flex items-center justify-center border border-indigo-100 text-indigo-600">
                  <Paperclip className="h-3 w-3" />
                </div>
                <span className="text-[11px] text-slate-500 font-medium leading-normal">
                  You can upload invoices, leave forms, or layout files directly within direct chats or task tickets, automatically storing them here in the shared files list.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

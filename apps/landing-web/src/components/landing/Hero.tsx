import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Sparkles, 
  Play, 
  Check, 
  CheckSquare, 
  MessageSquare, 
  FileCheck, 
  Send, 
  Users, 
  X,
  ShieldAlert,
  Clock,
  Briefcase
} from 'lucide-react';
import { useNavigation } from '../../context/NavigationContext';

export function Hero() {
  const { navigate } = useNavigation();
  const [showTourModal, setShowTourModal] = useState(false);
  
  // States for interactive mockup
  const [chatMessages, setChatMessages] = useState([
    { id: 1, sender: 'Sarah K. (Ops)', text: 'Hey team, the Q3 logistics invoice needs an approval before we dispatch cargo.', time: '10:42 AM' },
    { id: 2, sender: 'Alex M. (Finance)', text: 'Ready on my end. Need the owner signature in the approvals log.', time: '10:43 AM' }
  ]);
  const [quickReplies, setQuickReplies] = useState([
    'I will sign off now',
    'Just approved it!',
    'Let me check the logs'
  ]);
  
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [isTyping, setIsTyping] = useState(false);

  // Active tour step in modal
  const [tourStep, setTourStep] = useState(0);

  // Handle quick reply click
  const handleQuickReply = (replyText: string) => {
    // Add user message
    const newMsg = {
      id: Date.now(),
      sender: 'You (Owner)',
      text: replyText,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setChatMessages(prev => [...prev, newMsg]);
    setQuickReplies(prev => prev.filter(r => r !== replyText));

    // Side effects based on what they click
    if (replyText.includes('sign') || replyText.includes('approved') || replyText.includes('approve')) {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        setApprovalStatus('approved');
        // Add response from Sarah
        setChatMessages(prev => [...prev, {
          id: Date.now() + 1,
          sender: 'Sarah K. (Ops)',
          text: 'Awesome! Stamp received. Updating task status.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        
        // Auto-complete task shortly after
        setTimeout(() => {
          setTaskCompleted(true);
        }, 1200);
      }, 1500);
    }
  };

  const resetSimulator = () => {
    setChatMessages([
      { id: 1, sender: 'Sarah K. (Ops)', text: 'Hey team, the Q3 logistics invoice needs an approval before we dispatch cargo.', time: '10:42 AM' },
      { id: 2, sender: 'Alex M. (Finance)', text: 'Ready on my end. Need the owner signature in the approvals log.', time: '10:43 AM' }
    ]);
    setQuickReplies([
      'I will sign off now',
      'Just approved it!',
      'Let me check the logs'
    ]);
    setTaskCompleted(false);
    setApprovalStatus('pending');
    setIsTyping(false);
  };

  // Tour steps data
  const tourSteps = [
    {
      title: 'Operational Communication',
      desc: 'Move team chats out of noisy social apps and into structured department channels. Keep discussions tied directly to real operations.',
      badge: 'Team Chat',
      icon: MessageSquare,
      color: 'from-cyan-500 to-blue-500',
      illustration: (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl h-full flex flex-col text-slate-100 font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="font-bold text-xs tracking-tight">#ops-logistics</span>
            </div>
            <span className="text-[10px] bg-cyan-950/80 border border-cyan-800 text-cyan-400 px-2 py-0.5 rounded-full font-semibold">Live Channel</span>
          </div>
          <div className="flex-grow space-y-3.5 max-h-[180px] overflow-y-auto custom-scroll pr-1">
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded-lg bg-cyan-600 flex items-center justify-center font-bold text-xs text-white">SK</div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-300">Sarah K.</span>
                  <span className="text-[9px] text-slate-500">10:42 AM</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Hey guys, cargo dispatch is waiting on invoice approval. Can we expedite?</p>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-xs text-white">AM</div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-300">Alex M.</span>
                  <span className="text-[9px] text-slate-500">10:43 AM</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Sure, it is already submitted. Needs approval stamp from Owner.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-800 pt-3 flex items-center justify-between gap-2">
            <div className="flex-grow bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-500">
              Type /task or type message...
            </div>
            <button className="h-7 w-7 rounded-lg bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center text-white transition-colors">
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )
    },
    {
      title: 'Structured Work Tracking',
      desc: 'Map every business task to boards. Provide absolute oversight for managers, while giving team members a clutter-free view of their daily responsibilities.',
      badge: 'Work Tracking',
      icon: CheckSquare,
      color: 'from-indigo-500 to-purple-500',
      illustration: (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl h-full flex flex-col text-slate-100 font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-indigo-400" />
              <span className="font-bold text-xs tracking-tight">Active Work board</span>
            </div>
            <span className="text-[10px] bg-indigo-950/80 border border-indigo-800 text-indigo-400 px-2 py-0.5 rounded-full font-semibold">Sprint Mode</span>
          </div>
          <div className="space-y-3">
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 hover:border-slate-700 transition-colors">
              <div className="flex items-start justify-between">
                <h4 className="text-xs font-bold text-slate-200">Submit cargo dispatch invoice</h4>
                <span className="text-[9px] bg-slate-800 text-emerald-400 border border-slate-700/50 px-1.5 py-0.5 rounded-md font-semibold">Done</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Upload the validated quote receipt and routing slip.</p>
            </div>
            <div className="bg-slate-950 border border-indigo-950 rounded-xl p-3.5 shadow-indigo-950/20 shadow-md">
              <div className="flex items-start justify-between">
                <h4 className="text-xs font-bold text-slate-200">Approve logistics invoice ($4,250)</h4>
                <span className="text-[9px] bg-indigo-950/50 text-indigo-400 border border-indigo-900/50 px-1.5 py-0.5 rounded-md font-semibold">In Progress</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Needs review and official owner sign-off inside operations board.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Requests & Approvals Log',
      desc: 'Standardize procurement, expense reimbursements, and leave requests. Centralize sign-offs into a secure, single-approval ledger.',
      badge: 'Approvals',
      icon: FileCheck,
      color: 'from-purple-500 to-pink-500',
      illustration: (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl h-full flex flex-col text-slate-100 font-sans">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-purple-400" />
              <span className="font-bold text-xs tracking-tight">Pending Sign-off Inbox</span>
            </div>
            <span className="text-[10px] text-yellow-400 bg-yellow-950/50 border border-yellow-800/60 px-2 py-0.5 rounded-full font-semibold">1 Pending</span>
          </div>
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-purple-400">Expense Quote Request</span>
                <h4 className="text-xs font-bold text-slate-200 mt-0.5">Logistics Dispatch Invoice</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Requested by Sarah K. • $4,250.00</p>
              </div>
              <div className="h-8 w-8 rounded bg-slate-800 flex items-center justify-center text-slate-400 text-xs font-bold">$</div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors">Approve</button>
              <button className="flex-grow text-[11px] font-bold py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors">Reject</button>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <section className="relative pt-32 pb-20 px-6 overflow-hidden hero-glow">
      {/* Dynamic Ambient Background Canvas */}
      <div className="absolute inset-0 grid-pattern pointer-events-none" />
      
      {/* Floating Ambient Glowing Spheres */}
      <div className="absolute top-[10%] left-[12%] w-[450px] h-[450px] rounded-full bg-indigo-500/10 blur-[130px] animate-drift pointer-events-none" />
      <div className="absolute bottom-[20%] right-[10%] w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-[120px] animate-drift-reverse pointer-events-none" />
      
      <div className="max-w-6xl mx-auto flex flex-col items-center relative z-10">
        
        {/* Shimmering Pill Badge */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full glass border-white/70 shadow-lg shadow-indigo-100/5 mb-8 hover:scale-[1.02] transition-transform cursor-pointer"
        >
          <div className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
          <span className="text-[11px] md:text-xs font-bold text-ink-light tracking-tight flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-indigo-500" />
            Introducing Guild 1.0 — The Operations OS for SMB Teams
          </span>
          <ArrowRight className="h-3 w-3 text-indigo-500" />
        </motion.div>

        {/* Hero Headings */}
        <div className="text-center max-w-4xl">
          <motion.h1 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.08] mb-6"
          >
            One Workspace. <br className="sm:hidden" />
            <span className="text-gradient-cosmic">Total Operational Clarity.</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
            className="text-[15px] sm:text-lg md:text-[19px] text-slate-500 max-w-2xl mx-auto leading-relaxed mb-10"
          >
            Ditch the fragmented chat groups, chaotic spreadsheets, and messy emails. Guild fuses 
            channel communication, task management, and operational approvals into a single, beautifully simple workspace.
          </motion.p>
        </div>

        {/* Premium CTA Buttons */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3, ease: 'easeOut' }}
          className="flex flex-col sm:flex-row items-center gap-4 mb-20 w-full justify-center"
        >
          <button 
            onClick={() => navigate('/onboarding')}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm tracking-tight shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            Start free trial
            <ArrowRight className="h-4 w-4" />
          </button>
          
          <button 
            onClick={() => setShowTourModal(true)}
            className="w-full sm:w-auto px-7 py-3.5 rounded-2xl glass hover:bg-white/60 text-indigo-950 border-white/90 font-bold text-sm tracking-tight flex items-center justify-center gap-2.5 transition-all duration-300 hover:scale-[1.02] cursor-pointer"
          >
            <div className="h-5 w-5 rounded-full bg-indigo-50 flex items-center justify-center">
              <Play className="h-2.5 w-2.5 text-indigo-600 fill-indigo-600" />
            </div>
            Watch 2-min demo
          </button>
        </motion.div>

        {/* Interactive Workspace Simulator */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-5xl relative"
        >
          {/* Main App Mockup Canvas */}
          <div className="glass rounded-[32px] p-2 md:p-3 shadow-2xl border-white/80 overflow-hidden shadow-indigo-200/20 bg-white/30 backdrop-blur-3xl relative">
            <div className="bg-slate-900 rounded-[22px] overflow-hidden border border-slate-800 shadow-inner flex flex-col md:grid md:grid-cols-[200px_1fr] h-[450px] md:h-[500px]">
              
              {/* Sidebar */}
              <div className="hidden md:flex flex-col border-r border-slate-800 bg-slate-950 p-4">
                <div className="flex items-center gap-2 px-1 mb-8">
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center font-bold text-white text-xs">G</div>
                  <span className="font-bold text-xs tracking-tight text-white">Guild HQ</span>
                </div>
                
                <div className="space-y-5">
                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2.5">Channels</span>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800 text-cyan-400 text-xs font-semibold">
                        <span>#</span> ops-logistics
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-medium cursor-pointer transition-colors">
                        <span>#</span> general
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-medium cursor-pointer transition-colors">
                        <span>#</span> design-system
                      </div>
                    </div>
                  </div>

                  <div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest px-2.5">Core Modules</span>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 px-2.5 py-1.5 text-slate-400 text-xs font-medium">
                        <CheckSquare className="h-3.5 w-3.5" />
                        Tasks
                      </div>
                      <div className="flex items-center gap-2 px-2.5 py-1.5 text-slate-400 text-xs font-medium">
                        <FileCheck className="h-3.5 w-3.5" />
                        Approvals Log
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex items-center gap-2 px-1 border-t border-slate-800 pt-3">
                  <div className="h-7 w-7 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-300">YO</div>
                  <div>
                    <h5 className="text-[10px] font-bold text-white leading-none">Your Org</h5>
                    <span className="text-[8px] text-slate-500">Owner Access</span>
                  </div>
                </div>
              </div>

              {/* Main Preview Work area */}
              <div className="flex flex-col h-full bg-slate-900 relative">
                {/* Header bar of Dashboard */}
                <div className="h-12 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white">Interactive Preview Simulator</span>
                    <span className="text-[8px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-400 border border-indigo-900/60">Demo Workspace</span>
                  </div>
                  
                  {/* Reset button */}
                  {(chatMessages.length > 2 || taskCompleted || approvalStatus !== 'pending') && (
                    <button 
                      onClick={resetSimulator}
                      className="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 px-2 py-1 rounded-md hover:bg-slate-700 transition-colors font-semibold"
                    >
                      Reset Sim
                    </button>
                  )}
                </div>

                {/* Dashboard Inner Grid */}
                <div className="flex-grow grid grid-rows-2 md:grid-cols-2 md:grid-rows-1 p-4 md:p-6 gap-4 overflow-hidden relative">
                  
                  {/* Chat widget pane */}
                  <div className="flex flex-col bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 overflow-hidden h-[180px] md:h-full justify-between">
                    <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-[11px] font-bold text-slate-200">#ops-logistics chat</span>
                      </div>
                      {isTyping && (
                        <span className="text-[9px] text-cyan-400 animate-pulse font-medium">Sarah typing...</span>
                      )}
                    </div>

                    <div className="flex-grow my-3 space-y-3 overflow-y-auto custom-scroll pr-1">
                      {chatMessages.map(msg => (
                        <div key={msg.id} className="flex gap-2">
                          <div className={`h-6 w-6 rounded-md flex items-center justify-center font-bold text-[10px] text-white ${msg.sender.startsWith('Sarah') ? 'bg-cyan-600' : msg.sender.startsWith('Alex') ? 'bg-indigo-600' : 'bg-amber-600'}`}>
                            {msg.sender.substring(0, 2)}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-300">{msg.sender}</span>
                              <span className="text-[8px] text-slate-500">{msg.time}</span>
                            </div>
                            <p className="text-[10.5px] text-slate-400 mt-0.5 leading-normal">{msg.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Replies selection */}
                    <div className="border-t border-slate-800 pt-2.5">
                      {quickReplies.length > 0 ? (
                        <div className="space-y-1.5">
                          <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wider">Quick actions:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {quickReplies.map(reply => (
                              <button
                                key={reply}
                                onClick={() => handleQuickReply(reply)}
                                className="text-[9.5px] bg-slate-900 border border-slate-800 hover:border-indigo-500 text-indigo-300 hover:text-indigo-200 px-2.5 py-1 rounded-md transition-all duration-200 font-semibold cursor-pointer active:scale-95"
                              >
                                {reply}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[9px] text-slate-500 italic text-center">Simulation complete. Try Reset Sim.</p>
                      )}
                    </div>
                  </div>

                  {/* Task & Approvals pane */}
                  <div className="flex flex-col gap-3.5 h-[180px] md:h-full overflow-y-auto custom-scroll pr-1">
                    
                    {/* Task Card Widget */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
                          <span className="text-[11px] font-bold text-slate-200">Linked Task</span>
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 border rounded-md uppercase tracking-wider ${taskCompleted ? 'bg-emerald-950 text-emerald-400 border-emerald-900/60' : 'bg-indigo-950 text-indigo-400 border-indigo-900/60'}`}>
                          {taskCompleted ? 'Completed' : 'In Progress'}
                        </span>
                      </div>
                      
                      <div className="flex items-start gap-2.5">
                        <button 
                          onClick={() => setTaskCompleted(!taskCompleted)}
                          className={`h-4 w-4 rounded-md border flex items-center justify-center mt-0.5 transition-all duration-250 cursor-pointer ${taskCompleted ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 hover:border-indigo-400'}`}
                        >
                          {taskCompleted && <Check className="h-2.5 w-2.5" />}
                        </button>
                        <div>
                          <h4 className={`text-[11px] font-bold text-slate-200 transition-all ${taskCompleted ? 'line-through text-slate-500' : ''}`}>
                            Finalize Cargo Dispatch Invoice
                          </h4>
                          <p className="text-[9px] text-slate-500 mt-0.5">Assigned to Sarah K. • Due Today</p>
                        </div>
                      </div>
                    </div>

                    {/* Approvals Card Widget */}
                    <div className="bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 flex flex-col justify-between">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                        <div className="flex items-center gap-1.5">
                          <FileCheck className="h-3.5 w-3.5 text-purple-400" />
                          <span className="text-[11px] font-bold text-slate-200">Owner Signature Required</span>
                        </div>
                        <span className={`text-[8px] font-bold px-1.5 py-0.5 border rounded-md uppercase tracking-wider ${approvalStatus === 'approved' ? 'bg-emerald-950 text-emerald-400 border-emerald-900/60' : approvalStatus === 'rejected' ? 'bg-rose-950 text-rose-400 border-rose-900/60' : 'bg-amber-950 text-amber-400 border-amber-900/60'}`}>
                          {approvalStatus}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-start gap-1">
                        <div>
                          <span className="text-[8px] text-purple-400 uppercase tracking-widest font-bold">Ref: #RQ-88402</span>
                          <h4 className="text-[11px] font-bold text-slate-200 mt-0.5">Cargo Invoice Quote Review</h4>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">Value: <b className="text-slate-300">$4,250.00</b> • Sarah K.</p>
                        </div>
                        <div className="h-8 w-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-xs text-slate-400">$</div>
                      </div>

                      <div className="mt-3.5 pt-2 border-t border-slate-800/60 flex gap-2">
                        {approvalStatus === 'pending' ? (
                          <>
                            <button 
                              onClick={() => {
                                setApprovalStatus('approved');
                                setChatMessages(prev => [...prev, {
                                  id: Date.now(),
                                  sender: 'You (Owner)',
                                  text: 'I have signed the cargo quote. Ready to dispatch.',
                                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                }]);
                                setTimeout(() => setTaskCompleted(true), 800);
                              }}
                              className="flex-1 text-[10px] py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-colors cursor-pointer text-center"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => setApprovalStatus('rejected')}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-300 border border-slate-800 text-[10px] font-bold rounded-lg transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <div className="w-full py-1 text-center bg-slate-900 border border-slate-850 rounded-lg">
                            <span className={`text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 ${approvalStatus === 'approved' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              <Check className="h-3 w-3" />
                              Stamps Synchronized
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Interactive Floating Spark/Guide elements around simulator */}
          <div className="hidden lg:block absolute -top-8 -left-14 w-[190px] glass p-3 rounded-2xl shadow-xl hover:scale-105 transition-transform duration-300 pointer-events-none">
            <div className="flex gap-2">
              <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-indigo-500">Live Status</span>
                <p className="text-[10.5px] font-bold text-ink tracking-tight mt-0.5">Whole Team Aligned</p>
              </div>
            </div>
          </div>

          <div className="hidden lg:block absolute -bottom-6 -right-14 w-[210px] glass p-3.5 rounded-2xl shadow-xl hover:scale-105 transition-transform duration-300 pointer-events-none">
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                <Clock className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-500">Fast Approvals</span>
                <p className="text-[10.5px] font-bold text-ink tracking-tight mt-0.5">Done in under 5 mins</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Logoline of Trusted Brands */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-24 border-t border-slate-200/80 pt-8 w-full max-w-4xl text-center"
        >
          <p className="text-[10px] uppercase tracking-widest font-extrabold text-ink-faint mb-6">
            Trusted by operators at modern, high-growth companies
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-35 hover:opacity-50 transition-opacity duration-300 select-none">
            {/* Stripe SVG */}
            <svg className="h-6 text-ink-light" viewBox="0 0 80 34" fill="currentColor">
              <path d="M4.6 20.3c0-2.3 1.8-3.4 4.8-3.4 1.7 0 3.3.4 4.3.9V14c0-2.5-1.5-3.5-3.9-3.5-2.2 0-4.3.7-5.5 1.3v-4c1.6-.7 3.9-1.2 6.1-1.2 5.1 0 7.8 2.2 7.8 7.3v14.5c-1 .4-2.8.9-4.7.9-5.1-.1-9-2.7-9-9.1zm9.1-.6v-1.7c-.8-.4-1.9-.7-3.1-.7-1.7 0-2.6.6-2.6 1.7 0 1.2 1 1.8 2.8 1.8 1.4 0 2.5-.4 2.9-.9zM25.7 30c-1.3 0-2.2-.4-2.7-1v-4.1h2.7c3.3 0 5-1.5 5-4.1v-.8c0-3.3-2.1-5-6-5-1.5 0-2.8.3-3.6.7v18.7h-4.5V11c1.6-.7 3.9-1.2 6.4-1.2 6.6 0 11.2 3.1 11.2 9.1v.9c0 6.6-4.5 10.2-11.2 10.2h-2.3zM46.8 10.1v4.3c-.9-.4-2.1-.7-3.4-.7-2.9 0-4.7 1.8-4.7 4.9v9.7H34V10.6h4.3v2.8c1-1.8 2.8-3.1 5.3-3.1 1.4-.1 2.5.2 3.2.8zM51 1.4c1.6 0 2.8 1.2 2.8 2.8 0 1.5-1.2 2.8-2.8 2.8-1.5 0-2.8-1.3-2.8-2.8 0-1.6 1.3-2.8 2.8-2.8zm2.2 9.2v17.7h-4.5V10.6h4.5zM58.2 24.3c0-3.6 2.3-5.2 5.9-5.2 1.4 0 2.6.3 3.3.7V14c0-2.4-1.3-3.4-3.7-3.4-2.1 0-4.2.6-5.5 1.3v-4c1.5-.7 3.8-1.2 6.1-1.2 5 0 7.6 2.2 7.6 7.3v14.5c-1 .4-2.6.9-4.5.9-5.1-.1-9.2-2.7-9.2-9.1zm9.2-.6v-1.7c-.8-.4-1.8-.7-3-.7-1.7 0-2.7.6-2.7 1.7 0 1.2 1 1.8 2.8 1.8 1.4 0 2.5-.4 2.9-.9zM76.4 20.8h-7.6c.1 2.3 1.5 3.5 3.8 3.5 1.7 0 3-.4 3.9-.9V27c-1 .5-2.8.9-4.8.9-5.2 0-8.9-3.4-8.9-8.9s3.5-9.1 8.6-9.1c5 0 7.8 3.2 7.8 8.6v2.3zm-7.6-3h3.5c0-1.8-.9-2.9-2.3-2.9-1.5-.1-2.4 1.1-2.4 2.9z" />
            </svg>
            {/* Vercel SVG */}
            <svg className="h-4.5 text-ink-light" viewBox="0 0 76 22" fill="currentColor">
              <path d="M8.6 0L17.2 15H0L8.6 0Z" />
              <path fillRule="evenodd" clipRule="evenodd" d="M26.8 5.7h2.2l3.4 9.1h-2.3l-.7-2.1H26l-.7 2.1H23l3.8-9.1zm1.7 5.2l-.9-2.9-.9 2.9h1.8zm11-5.2h4.5v1.8h-3.4v1.8h3.1v1.8h-3.1v1.9h3.4v1.8h-4.5V5.7zm11.7 0h2.4c1.6 0 2.5.7 2.5 1.8 0 .9-.6 1.5-1.5 1.7L60 14.8H57.7l-2.4-5.3V14.8h-2.1V5.7zm2.4 3.7c.4 0 .6-.2.6-.7v-.5c0-.4-.2-.6-.6-.6H58v1.8h1.3zm10.7-3.7c2.6 0 4.1 1.8 4.1 4.5 0 2.8-1.5 4.5-4.1 4.5-2.6 0-4.1-1.7-4.1-4.5 0-2.7 1.5-4.5 4.1-4.5zm0 1.8c-1.3 0-2 1-2 2.7 0 1.7.7 2.7 2 2.7 1.3 0 2-1 2-2.7 0-1.7-.7-2.7-2-2.7zM71 5.7h2.1v9.1H71V5.7z" />
            </svg>
            {/* Linear SVG */}
            <span className="font-bold tracking-tight text-ink-light text-sm flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-ink-light" />
              LINEAR
            </span>
            {/* Figma SVG */}
            <span className="font-bold tracking-tight text-ink-light text-sm flex items-center gap-2">
              <Users className="h-4 w-4 text-ink-light" />
              FIGMA
            </span>
            {/* Retool SVG */}
            <span className="font-bold tracking-tight text-ink-light text-sm flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-ink-light" />
              RETOOL
            </span>
          </div>
        </motion.div>

      </div>

      {/* Interactive Tour Modal Overlay */}
      <AnimatePresence>
        {showTourModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Modal Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTourModal(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
            />
            
            {/* Modal Box */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="bg-white rounded-3xl overflow-hidden max-w-4xl w-full border border-slate-100 shadow-2xl relative z-10 grid md:grid-cols-[1.1fr_1fr] min-h-[460px]"
            >
              
              {/* Close Button */}
              <button 
                onClick={() => setShowTourModal(false)}
                className="absolute top-4 right-4 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors z-20 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Left Column: Info & Tour Steps */}
              <div className="p-8 md:p-10 flex flex-col justify-between h-full bg-white">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs text-indigo-600 font-bold uppercase tracking-wider mb-5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Product Walkthrough
                  </div>
                  
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={tourStep}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.25 }}
                    >
                      <span className="text-[10px] bg-slate-100 border border-slate-200/50 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                        Step {tourStep + 1} of 3
                      </span>
                      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mt-3.5 tracking-tight">
                        {tourSteps[tourStep].title}
                      </h2>
                      <p className="text-slate-500 text-xs md:text-[13px] leading-relaxed mt-3.5">
                        {tourSteps[tourStep].desc}
                      </p>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Tour navigation dots & controls */}
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <div className="flex items-center justify-between">
                    {/* Dots */}
                    <div className="flex gap-2">
                      {tourSteps.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setTourStep(idx)}
                          className={`h-2.5 rounded-full transition-all duration-300 ${tourStep === idx ? 'w-6 bg-indigo-600' : 'w-2.5 bg-slate-200 hover:bg-slate-300'}`}
                        />
                      ))}
                    </div>
                    
                    {/* Prev/Next actions */}
                    <div className="flex gap-2.5">
                      {tourStep > 0 ? (
                        <button
                          onClick={() => setTourStep(prev => prev - 1)}
                          className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors bg-slate-50 hover:bg-slate-100 rounded-xl cursor-pointer"
                        >
                          Prev
                        </button>
                      ) : (
                        <button
                          onClick={() => setShowTourModal(false)}
                          className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      
                      {tourStep < tourSteps.length - 1 ? (
                        <button
                          onClick={() => setTourStep(prev => prev + 1)}
                          className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-md shadow-indigo-100 cursor-pointer"
                        >
                          Next Step
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setShowTourModal(false);
                            navigate('/onboarding');
                          }}
                          className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-md shadow-indigo-100 flex items-center gap-1.5 cursor-pointer"
                        >
                          Get Started
                          <ArrowRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Visual Component Preview */}
              <div className="p-8 bg-slate-950/95 border-l border-slate-900/60 flex items-center justify-center relative min-h-[280px]">
                {/* Backdrop Glow */}
                <div className={`absolute inset-0 bg-gradient-to-br ${tourSteps[tourStep].color} opacity-5 blur-[80px] transition-all duration-500`} />
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={tourStep}
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="w-full h-full max-w-[320px] relative z-10"
                  >
                    {tourSteps[tourStep].illustration}
                  </motion.div>
                </AnimatePresence>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </section>
  );
}

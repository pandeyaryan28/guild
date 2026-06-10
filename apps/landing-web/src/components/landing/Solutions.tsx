import React from 'react';
import { 
  MessageSquare, 
  CheckSquare, 
  FileCheck, 
  Folder, 
  Check, 
  Eye, 
  Target, 
  Settings, 
  LayoutDashboard 
} from 'lucide-react';

export function Solutions() {
  return (
    <section id="solutions" className="py-20 px-6 max-w-[1200px] mx-auto scroll-mt-20">
      
      {/* Section Header */}
      <div className="text-center max-w-[750px] mx-auto mb-16">
        <h2 className="text-2xl md:text-3.5xl font-black text-text-primary tracking-tight uppercase">
          Simple Operations. Zero Noise.
        </h2>
        <p className="text-xs text-text-secondary mt-3 font-semibold leading-relaxed">
          Stop switching between WhatsApp group chats, Excel spreadsheets, and email request trails. Guild Orbit brings your daily team operations under one roof.
        </p>
      </div>

      {/* 4 Core Features Grid */}
      <div className="mb-20">
        <div className="flex items-center gap-2 mb-6">
          <span className="h-[1px] bg-border-default/60 flex-grow" />
          <h3 className="text-[10px] font-black uppercase text-text-muted tracking-widest px-3">
            The 4 Core Platform Features
          </h3>
          <span className="h-[1px] bg-border-default/60 flex-grow" />
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Feature 1: Chat */}
          <div className="aether-glass p-5 flex flex-col h-full rounded-[24px] overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600 mb-4 shadow-sm">
              <MessageSquare className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-1">1. Team Chat</h4>
            <p className="text-[10px] text-text-secondary leading-relaxed font-medium mb-4">
              Structured channels and direct messages for clean work context.
            </p>
            
            {/* Mini Chat Widget */}
            <div className="mt-auto bg-white/75 border border-violet-100/50 rounded-xl p-3 space-y-2.5 shadow-sm text-[9px] select-none">
              <div className="flex items-center gap-1.5 border-b border-black/5 pb-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                <span className="font-bold text-text-secondary">#ops-dispatch</span>
              </div>
              <div className="space-y-2 text-left">
                <div className="flex items-start gap-1.5">
                  <div className="h-5 w-5 rounded-md bg-indigo-500 text-white font-black flex items-center justify-center text-[7px] shrink-0">K</div>
                  <div className="bg-white px-2 py-1 rounded-lg rounded-tl-none border border-black/5 max-w-[85%] text-text-primary leading-tight">
                    Audit the dispatch count before shipping?
                  </div>
                </div>
                <div className="flex items-start gap-1.5">
                  <div className="h-5 w-5 rounded-md bg-emerald-500 text-white font-black flex items-center justify-center text-[7px] shrink-0">R</div>
                  <div className="bg-white px-2 py-1 rounded-lg rounded-tl-none border border-black/5 max-w-[85%] text-text-primary leading-tight">
                    Done. Created task in #inventory.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 2: Tasks */}
          <div className="aether-glass p-5 flex flex-col h-full rounded-[24px] overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 mb-4 shadow-sm">
              <CheckSquare className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-1">2. Task Boards</h4>
            <p className="text-[10px] text-text-secondary leading-relaxed font-medium mb-4">
              Kanban tracking showing exactly who is working on what.
            </p>
            
            {/* Mini Task Widget */}
            <div className="mt-auto bg-white/75 border border-indigo-100/50 rounded-xl p-3 space-y-2 shadow-sm text-[9px] select-none">
              <div className="flex items-center justify-between border-b border-black/5 pb-1.5">
                <span className="font-bold text-text-secondary">In Progress</span>
                <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[7px] font-black">2 Active</span>
              </div>
              
              {/* Task 1: Completed */}
              <div className="bg-white p-2 rounded-lg border border-black/5 flex items-center justify-between shadow-sm opacity-60">
                <div className="flex items-center gap-1.5 line-through text-text-muted">
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span>Audit Dispatch</span>
                </div>
                <div className="h-4 w-4 rounded-full bg-slate-200 flex items-center justify-center text-[7px] font-bold">R</div>
              </div>
              
              {/* Task 2: In progress */}
              <div className="bg-white p-2 rounded-lg border border-indigo-100/50 flex flex-col gap-1.5 shadow-sm text-left">
                <div className="flex items-center justify-between font-bold text-text-primary">
                  <span>Review Order Logs</span>
                  <div className="h-4 w-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[7px] font-bold">K</div>
                </div>
                <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full w-[70%]" />
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3: Approvals */}
          <div className="aether-glass p-5 flex flex-col h-full rounded-[24px] overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-100 text-cyan-600 mb-4 shadow-sm">
              <FileCheck className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-1">3. Approvals</h4>
            <p className="text-[10px] text-text-secondary leading-relaxed font-medium mb-4">
              Structured forms to request leaves, purchases, or expense claims.
            </p>
            
            {/* Mini Approvals Widget */}
            <div className="mt-auto bg-white/75 border border-cyan-100/50 rounded-xl p-3 space-y-2 shadow-sm text-[9px] select-none">
              <div className="flex items-center justify-between border-b border-black/5 pb-1.5">
                <span className="font-bold text-text-secondary">Pending Request</span>
                <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded text-[7px] font-black uppercase">Review</span>
              </div>
              
              <div className="bg-white p-2 rounded-lg border border-black/5 space-y-2 shadow-sm text-left">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-extrabold text-text-primary text-[10px]">MacBook Air M3</p>
                    <p className="text-[8px] text-text-muted mt-0.5">Asset Request • Logistics</p>
                  </div>
                  <span className="font-black text-indigo-600">₹99k</span>
                </div>
                <div className="flex gap-1.5 pt-1">
                  <button className="flex-1 py-1 rounded bg-slate-50 border border-black/5 hover:bg-slate-100 text-text-secondary text-[8px] font-bold transition-all">
                    Decline
                  </button>
                  <button className="flex-1 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-500 text-[8px] font-bold transition-all shadow-sm">
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 4: File Hub */}
          <div className="aether-glass p-5 flex flex-col h-full rounded-[24px] overflow-hidden group hover:scale-[1.02] transition-all duration-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 mb-4 shadow-sm">
              <Folder className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-1">4. Shared File Hub</h4>
            <p className="text-[10px] text-text-secondary leading-relaxed font-medium mb-4">
              Central library for documents, sheets, and operational manuals.
            </p>
            
            {/* Mini File Hub Widget */}
            <div className="mt-auto bg-white/75 border border-emerald-100/50 rounded-xl p-3 space-y-2 shadow-sm text-[9px] select-none">
              <div className="flex items-center justify-between border-b border-black/5 pb-1.5">
                <span className="font-bold text-text-secondary">Recent Uploads</span>
                <span className="text-[8px] text-text-muted">3 Files</span>
              </div>
              
              <div className="space-y-1.5 text-left">
                <div className="flex items-center justify-between p-1.5 rounded bg-white hover:bg-slate-50 border border-black/5 transition-all">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-5 w-5 bg-red-50 text-red-600 font-extrabold rounded flex items-center justify-center text-[7px] border border-red-100 shrink-0">PDF</div>
                    <span className="text-text-primary text-[8px] font-semibold truncate">dispatch_invoice.pdf</span>
                  </div>
                  <span className="text-[7px] text-text-muted shrink-0">1.2 MB</span>
                </div>
                
                <div className="flex items-center justify-between p-1.5 rounded bg-white hover:bg-slate-50 border border-black/5 transition-all">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="h-5 w-5 bg-green-50 text-green-600 font-extrabold rounded flex items-center justify-center text-[7px] border border-green-100 shrink-0">XLS</div>
                    <span className="text-text-primary text-[8px] font-semibold truncate">q2_budget.xlsx</span>
                  </div>
                  <span className="text-[7px] text-text-muted shrink-0">450 KB</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Strategic business benefits (Owner Visibility, Employee Focus Boost, Admin Control) */}
      <div className="mb-24">
        <div className="flex items-center gap-2 mb-6">
          <span className="h-[1px] bg-border-default/60 flex-grow" />
          <h3 className="text-[10px] font-black uppercase text-text-muted tracking-widest px-3">
            How Guild Orbit Boosts Your Business
          </h3>
          <span className="h-[1px] bg-border-default/60 flex-grow" />
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Owner Visibility */}
          <div className="aether-glass border border-indigo-100 bg-indigo-50/[0.02] p-6 flex flex-col h-full rounded-[24px] group hover:scale-[1.02] transition-all duration-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500 text-white mb-4 shadow-md shadow-indigo-500/25">
              <Eye className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-1">
              Owner Visibility
            </h4>
            <p className="text-[10px] text-text-secondary leading-relaxed font-medium mb-4">
              Real-time activity pulse shows exactly who is completing what across teams.
            </p>
            
            {/* Activity Pulse Widget */}
            <div className="mt-auto bg-white/75 border border-indigo-100/50 rounded-xl p-3.5 space-y-2.5 shadow-sm text-[9px] select-none text-left">
              <div className="flex items-center justify-between border-b border-black/5 pb-2">
                <span className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
                  Live Audit Trail
                </span>
                <span className="text-[7px] text-text-muted font-mono">Real-time</span>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2 border-b border-dashed border-black/5 pb-2">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <div className="h-4 w-4 rounded bg-indigo-500 text-white text-[7px] font-black flex items-center justify-center shrink-0">RS</div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-text-primary text-[8px] truncate">Rahul S. completed task</p>
                      <p className="text-[7px] text-text-muted truncate">Audit Dispatch Inventory</p>
                    </div>
                  </div>
                  <span className="text-[7px] text-text-muted font-medium whitespace-nowrap shrink-0">2m ago</span>
                </div>

                <div className="flex items-start justify-between gap-2 border-b border-dashed border-black/5 pb-2">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <div className="h-4 w-4 rounded bg-cyan-500 text-white text-[7px] font-black flex items-center justify-center shrink-0">AP</div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-text-primary text-[8px] truncate">MacBook Air Request</p>
                      <p className="text-[7px] text-text-muted truncate">Approved by Owner</p>
                    </div>
                  </div>
                  <span className="text-[7px] text-text-muted font-medium whitespace-nowrap shrink-0">15m ago</span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <div className="h-4 w-4 rounded bg-emerald-500 text-white text-[7px] font-black flex items-center justify-center shrink-0">AG</div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-text-primary text-[8px] truncate">Aarav G. uploaded file</p>
                      <p className="text-[7px] text-text-muted truncate">q2_budget.xlsx</p>
                    </div>
                  </div>
                  <span className="text-[7px] text-text-muted font-medium whitespace-nowrap shrink-0">1h ago</span>
                </div>
              </div>
            </div>
          </div>

          {/* Employee Focus Boost */}
          <div className="aether-glass border border-violet-100 bg-violet-50/[0.02] p-6 flex flex-col h-full rounded-[24px] group hover:scale-[1.02] transition-all duration-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500 text-white mb-4 shadow-md shadow-violet-500/25">
              <Target className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-1">
              Focus Boost
            </h4>
            <p className="text-[10px] text-text-secondary leading-relaxed font-medium mb-4">
              Saves hours of context-switching by keeping chat, tasks, and requests unified.
            </p>
            
            {/* Flowchart comparison Widget */}
            <div className="mt-auto bg-white/75 border border-violet-100/50 rounded-xl p-3.5 space-y-3.5 shadow-sm text-[9px] select-none text-left">
              {/* Chaos Flow */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[7px] font-bold text-red-500 uppercase">
                  <span>The Noise: Scattered Tools</span>
                  <span>❌</span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="px-1.5 py-0.5 bg-red-50 border border-red-100 rounded text-[7px] text-text-muted">WhatsApp</span>
                  <span className="text-text-muted font-bold">➔</span>
                  <span className="px-1.5 py-0.5 bg-red-50 border border-red-100 rounded text-[7px] text-text-muted">Email</span>
                  <span className="text-text-muted font-bold">➔</span>
                  <span className="px-1.5 py-0.5 bg-red-50 border border-red-100 rounded text-[7px] text-text-muted">Excel</span>
                </div>
              </div>
              
              {/* Guild Orbit Flow */}
              <div className="space-y-1 border-t border-dashed border-black/5 pt-2">
                <div className="flex items-center justify-between text-[7px] font-bold text-emerald-600 uppercase">
                  <span>The Sync: Guild Orbit Monolith</span>
                  <span>✓</span>
                </div>
                <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 p-1.5 rounded-lg">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-indigo-600 text-[8px]">Chat</span>
                    <span className="text-indigo-400 font-bold">➔</span>
                    <span className="font-extrabold text-indigo-600 text-[8px]">Task</span>
                    <span className="text-indigo-400 font-bold">➔</span>
                    <span className="font-extrabold text-indigo-600 text-[8px]">Approval</span>
                  </div>
                  <span className="text-[7px] bg-emerald-500 text-white px-1 py-0.2 rounded font-black uppercase shrink-0">Unified</span>
                </div>
              </div>
            </div>
          </div>

          {/* Central Admin Panel */}
          <div className="aether-glass border border-cyan-100 bg-cyan-50/[0.02] p-6 flex flex-col h-full rounded-[24px] group hover:scale-[1.02] transition-all duration-300">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500 text-white mb-4 shadow-md shadow-cyan-500/25">
              <Settings className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-black text-text-primary uppercase tracking-wider mb-1">
              Unified Admin Control
            </h4>
            <p className="text-[10px] text-text-secondary leading-relaxed font-medium mb-4">
              Maintain oversight of company resources, tasks, and team availability.
            </p>
            
            {/* Admin Dashboard Mockup */}
            <div className="mt-auto bg-white/75 border border-cyan-100/50 rounded-xl p-3.5 space-y-2.5 shadow-sm text-[9px] select-none text-left">
              <div className="flex items-center justify-between border-b border-black/5 pb-2">
                <span className="font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutDashboard className="h-3.5 w-3.5 text-cyan-600" />
                  Admin Console
                </span>
                <span className="px-1.5 py-0.5 bg-cyan-50 text-cyan-600 border border-cyan-100 rounded text-[7px] font-black uppercase">Live</span>
              </div>
              
              {/* Metrics Row */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="bg-slate-50 border border-black/5 p-1.5 rounded">
                  <p className="text-[7px] font-bold text-text-muted uppercase">Total Tasks</p>
                  <p className="text-[11px] font-black text-indigo-600 mt-0.5">24 <span className="text-[7px] text-text-muted font-normal">/ 4 Projects</span></p>
                </div>
                <div className="bg-slate-50 border border-black/5 p-1.5 rounded">
                  <p className="text-[7px] font-bold text-text-muted uppercase">Available Staff</p>
                  <p className="text-[11px] font-black text-emerald-600 mt-0.5">8 <span className="text-[7px] text-text-muted font-normal">Online</span></p>
                </div>
              </div>

              {/* Overdue alerts */}
              <div className="space-y-1">
                <p className="text-[7px] font-bold text-red-500 uppercase tracking-wide flex items-center gap-1">
                  <span className="h-1 w-1 rounded-full bg-red-500 animate-pulse shrink-0" />
                  Overdue Operational Items
                </p>
                <div className="space-y-1">
                  <div className="flex items-center justify-between p-1 bg-red-50/50 border border-red-100 rounded-[6px] text-[8px]">
                    <span className="font-bold text-text-primary truncate max-w-[80px]">Logistics Team</span>
                    <span className="text-red-600 font-extrabold whitespace-nowrap bg-white px-1 py-0.2 rounded border border-red-100">Aarav G. • 2 Overdue</span>
                  </div>
                  <div className="flex items-center justify-between p-1 bg-red-50/50 border border-red-100 rounded-[6px] text-[8px]">
                    <span className="font-bold text-text-primary truncate max-w-[80px]">Ops Dispatch</span>
                    <span className="text-red-600 font-extrabold whitespace-nowrap bg-white px-1 py-0.2 rounded border border-red-100">Rahul S. • 1 Overdue</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

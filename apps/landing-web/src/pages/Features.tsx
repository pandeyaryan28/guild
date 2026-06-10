import React from 'react';
import { motion } from 'motion/react';
import { MessageSquare, CheckSquare, FileCheck, Folder, ArrowRight, ShieldCheck, RefreshCw, Layers } from 'lucide-react';
import { APP_URL } from '../config/landingData';

export function Features() {
  return (
    <div className="pt-28 pb-16 px-6 max-w-[1100px] mx-auto space-y-28">
      {/* Page Header */}
      <section className="text-center max-w-[750px] mx-auto space-y-4">
        <h1 className="text-4xl md:text-5xl font-black text-text-primary tracking-tight uppercase">
          Unified Operations Platform
        </h1>
        <p className="text-sm md:text-base text-text-secondary font-medium leading-relaxed">
          Stop context-switching. Guild Orbit unites team communication, task management, and structured requests into one clear dashboard.
        </p>
      </section>

      {/* Feature Row 1: Chat */}
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 uppercase tracking-widest bg-violet-50 px-3 py-1 rounded-md">
            <MessageSquare className="h-4 w-4" />
            Module 01
          </div>
          <h2 className="text-2xl md:text-3.5xl font-black text-text-primary uppercase tracking-tight">
            Team Chat with Real Work Context
          </h2>
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed font-medium">
            Keep conversation aligned with operations. Guild Orbit features public channels for team discussions, private direct messages, and secure file sharing. No more scattered groups on personal chat platforms.
          </p>
          <ul className="space-y-2 text-xs font-semibold text-text-secondary">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Department channels (e.g. #ops, #inventory)
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Direct messages and group chats
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
              Instant file attachments and message history
            </li>
          </ul>
        </div>
        
        {/* Visual Card */}
        <div className="aether-glass p-6 bg-violet-50/20 border-violet-100 shadow-xl rounded-[24px] space-y-4">
          <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
            <span className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              #ops-dispatch
            </span>
            <span className="text-[10px] font-black uppercase text-violet-600 bg-violet-50 px-2 py-0.5 rounded">Active Chat</span>
          </div>
          <div className="space-y-3">
            <div className="flex gap-2.5 items-start">
              <div className="h-7 w-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">RS</div>
              <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-black/5 shadow-sm">
                <p className="text-[11px] text-text-secondary font-medium">
                  Have we dispatched the client order invoices?
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 items-start">
              <div className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">AG</div>
              <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-black/5 shadow-sm">
                <p className="text-[11px] text-text-secondary font-medium">
                  Done. Uploaded `invoice_dispatch.pdf` to the #files folder.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Row 2: Tasks */}
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1 aether-glass p-6 bg-indigo-50/20 border-indigo-100 shadow-xl rounded-[24px] space-y-4">
          <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
            <span className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
              <CheckSquare className="h-4 w-4 text-indigo-500" />
              Work Kanban Board
            </span>
            <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">In Progress</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/80 p-3 rounded-xl border border-black/5 shadow-sm space-y-2">
              <span className="text-[9px] font-black uppercase text-indigo-600 tracking-wider">To Do</span>
              <div className="bg-slate-50 p-2 rounded-lg border border-black/5">
                <p className="text-[10px] font-bold text-text-primary">Dispatch Audit</p>
                <p className="text-[8px] text-text-muted mt-1">Due: Today</p>
              </div>
            </div>
            <div className="bg-white/80 p-3 rounded-xl border border-indigo-100 shadow-sm space-y-2">
              <span className="text-[9px] font-black uppercase text-emerald-600 tracking-wider">In Progress</span>
              <div className="bg-indigo-50/20 p-2 rounded-lg border border-indigo-100">
                <p className="text-[10px] font-bold text-text-primary">Invoice Upload</p>
                <div className="w-full bg-slate-100 h-1 rounded-full mt-2 overflow-hidden">
                  <div className="bg-indigo-600 h-full w-[65%]" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 md:order-2 space-y-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-md">
            <CheckSquare className="h-4 w-4" />
            Module 02
          </div>
          <h2 className="text-2xl md:text-3.5xl font-black text-text-primary uppercase tracking-tight">
            Simple Tasks & Kanban Boards
          </h2>
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed font-medium">
            Maintain visual oversight of ongoing work. Create tasks, assign owners, set deadlines, and manage progress via clean Kanban boards. Avoid the complexity of engineering tools while keeping execution clear.
          </p>
          <ul className="space-y-2 text-xs font-semibold text-text-secondary">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Easy-to-use Kanban columns
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Assignees, due dates, and priority tags
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
              Task activity logs and comment histories
            </li>
          </ul>
        </div>
      </section>

      {/* Feature Row 3: Approvals */}
      <section className="grid md:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-600 uppercase tracking-widest bg-cyan-50 px-3 py-1 rounded-md">
            <FileCheck className="h-4 w-4" />
            Module 03
          </div>
          <h2 className="text-2xl md:text-3.5xl font-black text-text-primary uppercase tracking-tight">
            Structured Approvals in Seconds
          </h2>
          <p className="text-xs md:text-sm text-text-secondary leading-relaxed font-medium">
            Stop sorting through email approvals. Employees can submit structured requests for purchases, leaves, or admin permissions. Workspace managers receive clean notifications and can approve or decline instantly.
          </p>
          <ul className="space-y-2 text-xs font-semibold text-text-secondary">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              Standardized request templates
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              Track budget costs and date selections
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
              Audit records of all approved requests
            </li>
          </ul>
        </div>

        {/* Visual Card (Newly Generated Showcase image) */}
        <div className="aether-glass p-2 bg-cyan-50/20 border-cyan-100 shadow-xl rounded-[24px]">
          <img 
            src="/guild_feature_showcase.png" 
            alt="Approvals Card Interface Mockup" 
            className="w-full h-auto object-cover rounded-[18px] select-none"
          />
        </div>
      </section>

      {/* Extra Highlights Grid */}
      <section className="pt-12 text-center space-y-12">
        <h3 className="text-lg md:text-2xl font-black text-text-primary uppercase tracking-tight">
          Additional Platform Modules
        </h3>
        <div className="grid sm:grid-cols-2 gap-8 text-left">
          <div className="aether-glass p-6 space-y-3">
            <div className="h-9 w-9 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
              <Folder className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-wide">Shared File Hub</h4>
            <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
              Upload invoices, templates, and company booklets to a central directory. Access files from any device.
            </p>
          </div>

          <div className="aether-glass p-6 space-y-3">
            <div className="h-9 w-9 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Layers className="h-4.5 w-4.5" />
            </div>
            <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-wide">Global Search</h4>
            <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
              Retrieve chat messages, files, task titles, or team profiles instantly using our unified database search.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

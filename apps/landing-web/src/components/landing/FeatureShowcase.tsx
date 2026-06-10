import React from 'react';
import { 
  Workflow, 
  ArrowRight, 
  MessageSquare, 
  CheckSquare, 
  TrendingUp, 
  Settings, 
  Users 
} from 'lucide-react';
import { APP_URL } from '../../config/landingData';

export function FeatureShowcase() {
  return (
    <div id="features" className="space-y-24 max-w-[1000px] mx-auto scroll-mt-20 py-12">
      
      {/* Showcase 1: Request approvals (with generated image) */}
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-md">
            <Workflow className="h-3 w-3" />
            Streamlined Approvals
          </div>
          <h3 className="text-xl md:text-2xl font-black text-text-primary uppercase tracking-tight">
            Submit leaves and purchase orders in 10 seconds
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed font-medium">
            Say goodbye to email folders and spreadsheet records. Employees can submit structured requests with amounts, reasons, and files. Managers receive immediate notifications and can approve or decline instantly, logging the transaction automatically.
          </p>
          <div className="pt-2">
            <a 
              href={`${APP_URL}/signup`} 
              className="inline-flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-500 hover:translate-x-1 transition-all"
            >
              Start free workspace
              <ArrowRight className="h-4.5 w-4.5" />
            </a>
          </div>
        </div>

        <div className="aether-glass p-2 bg-indigo-50/20 border-indigo-100 shadow-xl rounded-[24px]">
          <img 
            src="/guild_feature_showcase.png" 
            alt="Approvals system detail view" 
            className="w-full h-auto object-cover rounded-[18px] select-none"
          />
        </div>
      </div>

      {/* Showcase 2: Chat-to-Task Sync (CSS Rendered Chat Flow) */}
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div className="order-2 md:order-1 aether-glass p-6 bg-slate-50/30 border-slate-100 shadow-xl rounded-[24px] space-y-4 select-none">
          <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
            <span className="text-xs font-bold text-text-secondary flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5 text-violet-500" />
              #ops-dispatch
            </span>
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
          
          <div className="space-y-3.5">
            <div className="flex gap-2.5 items-start">
              <div className="h-7 w-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">K</div>
              <div className="bg-white/80 p-3 rounded-2xl rounded-tl-none border border-indigo-50 shadow-sm max-w-[85%]">
                <p className="text-[11px] text-text-secondary font-medium leading-relaxed">
                  We need to inspect the dispatch inventory count before shipping the packages.
                </p>
              </div>
            </div>

            <div className="flex gap-2.5 items-start">
              <div className="h-7 w-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0">R</div>
              <div className="bg-white/80 p-3 rounded-2xl rounded-tl-none border border-emerald-50 shadow-sm max-w-[85%]">
                <p className="text-[11px] text-text-secondary font-medium leading-relaxed mb-2">
                  Understood. I will spin off a checklist task right here so it doesn't get lost.
                </p>
                <div className="aether-glass bg-emerald-50/10 border-emerald-100 p-2.5 rounded-xl flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <CheckSquare className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                    <span className="text-[9px] font-bold text-text-primary uppercase">Inventory Audit</span>
                  </div>
                  <span className="text-[8px] font-black uppercase text-white bg-emerald-600 px-2 py-0.5 rounded">Created</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="order-1 md:order-2 space-y-4">
          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-600 uppercase tracking-widest bg-violet-50 px-2.5 py-1 rounded-md">
            <TrendingUp className="h-3 w-3" />
            Actionable Conversations
          </div>
          <h3 className="text-xl md:text-2xl font-black text-text-primary uppercase tracking-tight">
            Turn chats into tracked tasks instantly
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed font-medium">
            Work conversations can easily get buried under hundreds of messages. Guild Orbit lets you convert messages directly into task cards. Assign an owner, set a deadline, and keep the task linked to the chat thread so the full context is preserved.
          </p>
          <div className="pt-2">
            <a 
              href={`${APP_URL}/signup`} 
              className="inline-flex items-center gap-2 text-xs font-black text-violet-600 hover:text-violet-500 hover:translate-x-1 transition-all"
            >
              Create tasks from chat
              <ArrowRight className="h-4.5 w-4.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Showcase 3: CSS-rendered Admin Panel Mockup */}
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-cyan-600 uppercase tracking-widest bg-cyan-50 px-2.5 py-1 rounded-md">
            <Settings className="h-3 w-3" />
            Admin Dashboard
          </div>
          <h3 className="text-xl md:text-2xl font-black text-text-primary uppercase tracking-tight">
            Centralized user management & role control
          </h3>
          <p className="text-xs text-text-secondary leading-relaxed font-medium">
            Keep security tight. The Guild Orbit Admin panel allows workspace owners to invite members, deactivate accounts, assign departments, and configure system permissions. Maintain clear operational borders without complex configurations.
          </p>
          <div className="pt-2">
            <a 
              href={`${APP_URL}/signup`} 
              className="inline-flex items-center gap-2 text-xs font-black text-cyan-600 hover:text-cyan-500 hover:translate-x-1 transition-all"
            >
              Open admin console
              <ArrowRight className="h-4.5 w-4.5" />
            </a>
          </div>
        </div>

        <div className="aether-glass p-5 bg-cyan-50/20 border-cyan-100 shadow-xl rounded-[24px] space-y-4 select-none">
          <div className="flex items-center justify-between border-b border-border-default/60 pb-3">
            <span className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-cyan-500" />
              Workspace Members
            </span>
            <span className="text-[9px] font-black uppercase text-cyan-600 bg-cyan-50 border border-cyan-100 px-2 py-0.5 rounded">
              Admin Active
            </span>
          </div>

          {/* User row mockup */}
          <div className="space-y-2">
            {[
              { name: "Aryan Pandey", role: "Owner", dept: "Operations" },
              { name: "Rahul Sharma", role: "Manager", dept: "Logistics" },
              { name: "Aarav Gupta", role: "Member", dept: "Marketing" }
            ].map((user, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/70 border border-border-default/40 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="h-7 w-7 rounded-full bg-cyan-500 text-white font-black text-[10px] flex items-center justify-center">
                    {user.name.split(' ').map(n=>n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-extrabold text-text-primary text-[11px]">{user.name}</p>
                    <p className="text-[9px] text-text-muted mt-0.5 font-medium">{user.dept}</p>
                  </div>
                </div>
                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${
                  user.role === 'Owner' ? 'bg-indigo-500 text-white' : user.role === 'Manager' ? 'bg-violet-500 text-white' : 'bg-slate-100 text-text-secondary'
                }`}>
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}

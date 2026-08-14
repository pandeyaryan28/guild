import * as React from 'react';
import { 
  X, FileText, Play, ClipboardList, ListTodo, Bug, Sparkles, 
  ArrowRight, Check, AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CanvasTemplate {
  id: string;
  title: string;
  category: 'General' | 'Project' | 'Meetings' | 'Engineering';
  description: string;
  icon: React.ElementType;
  badge?: string;
  content: string;
}

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'blank',
    title: 'Blank Canvas',
    category: 'General',
    description: 'Start fresh with an empty document for freeform notes and ideas.',
    icon: FileText,
    content: '<h1>Untitled Canvas</h1><p>Start typing or take notes...</p>'
  },
  {
    id: 'project-kickoff',
    title: 'Project Kickoff',
    category: 'Project',
    description: 'Centralize mission, scope, stakeholders, deliverables, and timeline milestones.',
    icon: Play,
    badge: 'Popular',
    content: `<h1>🚀 Project Kickoff: [Project Name]</h1>
<blockquote><p>💡 <strong>Overview:</strong> Define the core mission, target outcomes, and delivery milestones for this project initiative.</p></blockquote>
<h2>🎯 Key Objectives</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Define product scope and technical architecture</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Align core milestones with leadership stakeholders</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Launch Beta release to early access cohort</p></div></li>
</ul>
<h2>👥 Core Team & Roles</h2>
<ul>
  <li><p><strong>Project Lead:</strong> @lead</p></li>
  <li><p><strong>Engineering:</strong> @engineer</p></li>
  <li><p><strong>Design:</strong> @designer</p></li>
</ul>
<h2>📅 Key Milestones</h2>
<ol>
  <li><p><strong>Phase 1 (Week 1-2):</strong> Requirements & UI Architecture</p></li>
  <li><p><strong>Phase 2 (Week 3-5):</strong> Core Implementation & Integration</p></li>
  <li><p><strong>Phase 3 (Week 6):</strong> QA, Security Review & Deployment</p></li>
</ol>`
  },
  {
    id: 'sprint-planning',
    title: 'Sprint Planning',
    category: 'Project',
    description: 'Set sprint goals, prioritized backlog deliverables, and capacity notes.',
    icon: ListTodo,
    badge: 'Agile',
    content: `<h1>🏃 Sprint Planning: [Sprint #]</h1>
<blockquote><p>⚡ <strong>Sprint Cadence:</strong> 2-Week Sprint | Goal: Ship core real-time collaboration milestones.</p></blockquote>
<h2>🎯 Sprint Focus</h2>
<p>Focus on optimizing user interaction speed, stabilizing state sync, and refining mobile UX.</p>
<h2>📋 Sprint Backlog & Action Items</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Implement TipTap collaborative document sync</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Build light and dark mode theme palettes</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Add template gallery for fast team kickoff</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Perform load test and network latency checks</p></div></li>
</ul>
<h2>⚠️ Risks & Blockers</h2>
<p>Ensure Firebase security rules and indexes are deployed before production cutover.</p>`
  },
  {
    id: 'team-sync',
    title: 'Weekly Team Sync',
    category: 'Meetings',
    description: 'Structure agenda, department updates, discussions, and follow-up action items.',
    icon: ClipboardList,
    content: `<h1>📅 Weekly Team Sync — [Date]</h1>
<blockquote><p>🕒 <strong>Schedule:</strong> Mondays at 10:00 AM | Facilitator: @lead</p></blockquote>
<h2>📝 Agenda</h2>
<ul>
  <li><p>Team check-ins and wins from last week</p></li>
  <li><p>Key roadmap priorities and blockers review</p></li>
  <li><p>Open discussion & product demos</p></li>
</ul>
<h2>🚀 Updates by Area</h2>
<h3>Engineering</h3>
<p>Backend performance optimization in review. Production database migration scheduled.</p>
<h3>Design</h3>
<p>Finalizing high-fidelity mockups for redesigned dashboard navigation.</p>
<h2>✅ Action Items</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Publish sprint velocity report</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Schedule architecture review with team leads</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Update documentation with release notes</p></div></li>
</ul>`
  },
  {
    id: 'incident-postmortem',
    title: 'Incident Postmortem',
    category: 'Engineering',
    description: 'Document incident summary, timeline, root cause, resolution, and action items.',
    icon: Bug,
    content: `<h1>🐞 Incident Postmortem: [Incident Summary]</h1>
<blockquote><p>🚨 <strong>Severity:</strong> P1 / Critical | Date: [Date] | Lead Responder: @responder</p></blockquote>
<h2>📊 Executive Summary</h2>
<p>Brief 2-3 sentence overview of the incident, impact on users, and time to resolution.</p>
<h2>⏱️ Timeline of Events</h2>
<ul>
  <li><p><strong>14:02 UTC:</strong> Automated alerts trigger on increased API latency.</p></li>
  <li><p><strong>14:10 UTC:</strong> On-call engineer initiates incident bridge.</p></li>
  <li><p><strong>14:28 UTC:</strong> Root cause identified as connection pool exhaustion.</p></li>
  <li><p><strong>14:45 UTC:</strong> Mitigation deployed; services recover to nominal latency.</p></li>
</ul>
<h2>🔍 Root Cause Analysis (5 Whys)</h2>
<p>Describe the technical root cause and contributing factors that led to this degradation.</p>
<h2>🛡️ Preventive Action Items</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Adjust max connection pool threshold</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Add proactive warning alert at 75% pool utilization</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Update runbook with emergency scale-out steps</p></div></li>
</ul>`
  },
  {
    id: 'ooo-handover',
    title: 'Out of Office (OOO) Handover',
    category: 'General',
    description: 'Coverage dates, primary contacts, ongoing responsibilities, and emergency escalations.',
    icon: Sparkles,
    content: `<h1>🏖️ Out of Office Handover: @name</h1>
<blockquote><p>📅 <strong>Away Dates:</strong> [Start Date] to [End Date] | Primary Coverage: @coverage</p></blockquote>
<h2>👥 Key Contacts & Coverage</h2>
<ul>
  <li><p><strong>Primary Backup:</strong> @backup-lead (Handles active PRs and reviews)</p></li>
  <li><p><strong>Secondary Backup:</strong> @backup-secondary (Handles escalation channels)</p></li>
</ul>
<h2>📋 Ongoing Tasks & Status</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><label><input type="checkbox" checked><span></span></label><div><p>Merged PR #204 for auth rate limiting</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Monitor staging metrics following release</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Respond to customer feedback in #support channel</p></div></li>
</ul>`
  }
];

interface CanvasTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: CanvasTemplate) => void;
  hasExistingContent?: boolean;
}

export function CanvasTemplatesModal({
  isOpen,
  onClose,
  onSelectTemplate,
  hasExistingContent = false,
}: CanvasTemplatesModalProps) {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
  const [selectedTemplate, setSelectedTemplate] = React.useState<CanvasTemplate>(CANVAS_TEMPLATES[1]);
  const [confirmReplace, setConfirmReplace] = React.useState(false);

  if (!isOpen) return null;

  const categories = ['All', 'General', 'Project', 'Meetings', 'Engineering'];

  const filteredTemplates = CANVAS_TEMPLATES.filter(
    (t) => selectedCategory === 'All' || t.category === selectedCategory
  );

  const handleApply = () => {
    if (hasExistingContent && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    onSelectTemplate(selectedTemplate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="w-full max-w-3xl rounded-2xl bg-surface border border-border-default shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default bg-surface/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Canvas Templates</h2>
              <p className="text-xs text-muted-foreground">Choose a starter template for your channel canvas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-bg-tertiary transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 border-b border-border-default bg-bg-secondary/40 shrink-0 overflow-x-auto">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => {
                setSelectedCategory(cat);
                setConfirmReplace(false);
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-bg-tertiary"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Modal Body: Split view (List on left, Preview on right) */}
        <div className="flex-1 flex min-h-0 divide-x divide-border-default overflow-hidden">
          {/* Templates List */}
          <div className="w-1/2 overflow-y-auto p-4 space-y-2 scrollbar-thin">
            {filteredTemplates.map((template) => {
              const Icon = template.icon;
              const isSelected = selectedTemplate.id === template.id;
              return (
                <button
                  key={template.id}
                  onClick={() => {
                    setSelectedTemplate(template);
                    setConfirmReplace(false);
                  }}
                  className={cn(
                    "w-full text-left p-3 rounded-xl border transition-all flex items-start gap-3 cursor-pointer group",
                    isSelected
                      ? "bg-primary/10 border-primary/40 text-foreground shadow-sm"
                      : "bg-surface border-border-subtle hover:border-border-default hover:bg-bg-secondary/60 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                    isSelected ? "bg-primary text-primary-foreground" : "bg-bg-tertiary text-muted-foreground"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground truncate">{template.title}</span>
                      {template.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-primary/20 text-primary uppercase">
                          {template.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                      {template.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Template Preview Pane */}
          <div className="w-1/2 flex flex-col overflow-hidden bg-bg-secondary/20">
            <div className="px-5 py-3 border-b border-border-default/60 flex items-center justify-between shrink-0 bg-surface/30">
              <span className="text-xs font-bold text-foreground uppercase tracking-wider">Preview</span>
              <span className="text-[11px] text-muted-foreground">{selectedTemplate.category}</span>
            </div>
            <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
              <div 
                className="prose prose-sm dark:prose-invert max-w-none text-xs text-foreground/90 space-y-2 pointer-events-none opacity-90"
                dangerouslySetInnerHTML={{ __html: selectedTemplate.content }}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-border-default bg-surface/80 flex items-center justify-between shrink-0">
          <div>
            {confirmReplace && (
              <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>This will overwrite current canvas text. Click again to confirm.</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-bg-tertiary transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md",
                confirmReplace
                  ? "bg-amber-500 hover:bg-amber-600 text-white animate-pulse"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              )}
            >
              <Check className="h-3.5 w-3.5" />
              <span>{confirmReplace ? 'Confirm Overwrite' : 'Apply Template'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

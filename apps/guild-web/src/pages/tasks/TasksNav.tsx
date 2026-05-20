import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Plus, ChevronDown, ChevronRight, LayoutList, Sun, CalendarDays, CheckCircle2, FolderOpen, Target, ArrowLeft, Send, Eye, Users } from 'lucide-react';
import { useProjects } from '../../hooks/useProjects';
import { useGoals } from '../../hooks/useGoals';
import { useAuth } from '../../hooks/useAuth';
import { useTeams } from '../../hooks/useTeams';
import { createProject } from '../../lib/projects';
import { createGoal } from '../../lib/goals';
import type { ActorInfo } from '../../lib/tasks';

export type NavView =
  | { type: 'all' }
  | { type: 'today' }
  | { type: 'upcoming' }
  | { type: 'completed' }
  | { type: 'assigned' }
  | { type: 'review' }
  | { type: 'team' }
  | { type: 'project'; id: string }
  | { type: 'goal'; id: string };

interface TasksNavProps {
  orgId: string;
  actor: ActorInfo;
  activeView: NavView;
  onViewChange: (view: NavView) => void;
  actorName: string;
}

function NavItem({
  icon,
  label,
  active,
  count,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  count?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-sm transition-all text-left',
        active
          ? 'bg-primary/15 text-primary font-medium'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
      )}
    >
      <span className={cn('flex-shrink-0', active ? 'text-primary' : 'text-text-muted group-hover:text-foreground/60')}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && count > 0 && (
        <span className={cn('text-[10px] font-medium rounded-full px-1.5 py-0.5 min-w-[18px] text-center', active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground')}>
          {count}
        </span>
      )}
    </button>
  );
}

function SectionHeader({ label, collapsed, onToggle }: { label: string; collapsed: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-1.5 w-full px-3 py-1.5 text-[10px] uppercase tracking-widest font-semibold text-text-muted hover:text-muted-foreground transition-colors"
    >
      {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      {label}
    </button>
  );
}

export function TasksNav({ orgId, actor, activeView, onViewChange, actorName }: TasksNavProps) {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { teams } = useTeams(orgId);
  const { projects } = useProjects(orgId);
  const { goals } = useGoals(orgId);

  const isManager =
    userProfile?.isManager ||
    userProfile?.role === 'owner' ||
    (userProfile?.uid ? teams.some((t) => t.managerId === userProfile.uid) : false);

  const [projectsCollapsed, setProjectsCollapsed] = React.useState(false);
  const [goalsCollapsed, setGoalsCollapsed] = React.useState(false);
  const [creatingProject, setCreatingProject] = React.useState(false);
  const [creatingGoal, setCreatingGoal] = React.useState(false);
  const [newProjectName, setNewProjectName] = React.useState('');
  const [newGoalName, setNewGoalName] = React.useState('');
  const projectInputRef = React.useRef<HTMLInputElement>(null);
  const goalInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { if (creatingProject) projectInputRef.current?.focus(); }, [creatingProject]);
  React.useEffect(() => { if (creatingGoal) goalInputRef.current?.focus(); }, [creatingGoal]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) { setCreatingProject(false); return; }
    await createProject({ orgId, name: newProjectName.trim(), description: '', actor });
    setNewProjectName('');
    setCreatingProject(false);
  };

  const handleCreateGoal = async () => {
    if (!newGoalName.trim()) { setCreatingGoal(false); return; }
    await createGoal({ orgId, title: newGoalName.trim(), description: '', targetDate: null, actor });
    setNewGoalName('');
    setCreatingGoal(false);
  };

  const isActive = (view: NavView): boolean => {
    if (activeView.type !== view.type) return false;
    if (view.type === 'project' && activeView.type === 'project') return activeView.id === view.id;
    if (view.type === 'goal' && activeView.type === 'goal') return activeView.id === view.id;
    return true;
  };

  return (
    <div className="flex flex-col h-full select-none">
      {/* App title / logo area */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-border-default flex-shrink-0">
        <div className="h-7 w-7 rounded-lg bg-primary/20 flex items-center justify-center">
          <LayoutList className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold text-foreground truncate">Guild Tasks</span>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {/* My Tasks section */}
        <div className="mb-3">
          <NavItem
            icon={<LayoutList className="h-3.5 w-3.5" />}
            label="My Tasks"
            active={isActive({ type: 'all' })}
            onClick={() => onViewChange({ type: 'all' })}
          />
          <NavItem
            icon={<Sun className="h-3.5 w-3.5" />}
            label="Today"
            active={isActive({ type: 'today' })}
            onClick={() => onViewChange({ type: 'today' })}
          />
          <NavItem
            icon={<CalendarDays className="h-3.5 w-3.5" />}
            label="Upcoming"
            active={isActive({ type: 'upcoming' })}
            onClick={() => onViewChange({ type: 'upcoming' })}
          />
          <NavItem
            icon={<Send className="h-3.5 w-3.5" />}
            label="Assigned to Others"
            active={isActive({ type: 'assigned' })}
            onClick={() => onViewChange({ type: 'assigned' })}
          />
          <NavItem
            icon={<Eye className="h-3.5 w-3.5" />}
            label="In Review"
            active={isActive({ type: 'review' })}
            onClick={() => onViewChange({ type: 'review' })}
          />
          <NavItem
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Completed"
            active={isActive({ type: 'completed' })}
            onClick={() => onViewChange({ type: 'completed' })}
          />
          {isManager && (
            <NavItem
              icon={<Users className="h-3.5 w-3.5" />}
              label="Team Tasks"
              active={isActive({ type: 'team' })}
              onClick={() => onViewChange({ type: 'team' })}
            />
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/20 mx-1 mb-3" />

        {/* Projects */}
        <div className="mb-1">
          <SectionHeader label="Projects" collapsed={projectsCollapsed} onToggle={() => setProjectsCollapsed((v) => !v)} />
          {!projectsCollapsed && (
            <div className="space-y-0.5 mt-0.5">
              {projects.map((p) => (
                <NavItem
                  key={p.id}
                  icon={<FolderOpen className="h-3.5 w-3.5" />}
                  label={p.name}
                  active={isActive({ type: 'project', id: p.id })}
                  onClick={() => onViewChange({ type: 'project', id: p.id })}
                />
              ))}
              {creatingProject ? (
                <div className="px-3 py-1.5">
                  <input
                    ref={projectInputRef}
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="Project name…"
                    onBlur={handleCreateProject}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateProject();
                      if (e.key === 'Escape') { setNewProjectName(''); setCreatingProject(false); }
                    }}
                    className="w-full bg-accent/30 rounded-md px-2 py-1 text-sm text-foreground placeholder:text-text-muted outline-none focus:ring-1 focus:ring-primary/40 border border-primary/20"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setCreatingProject(true)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-muted-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  New project
                </button>
              )}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-border/20 mx-1 my-2" />

        {/* Goals */}
        <div>
          <SectionHeader label="Goals" collapsed={goalsCollapsed} onToggle={() => setGoalsCollapsed((v) => !v)} />
          {!goalsCollapsed && (
            <div className="space-y-0.5 mt-0.5">
              {goals.map((g) => (
                <NavItem
                  key={g.id}
                  icon={<Target className="h-3.5 w-3.5" />}
                  label={g.title}
                  active={isActive({ type: 'goal', id: g.id })}
                  onClick={() => onViewChange({ type: 'goal', id: g.id })}
                />
              ))}
              {creatingGoal ? (
                <div className="px-3 py-1.5">
                  <input
                    ref={goalInputRef}
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    placeholder="Goal name…"
                    onBlur={handleCreateGoal}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateGoal();
                      if (e.key === 'Escape') { setNewGoalName(''); setCreatingGoal(false); }
                    }}
                    className="w-full bg-accent/30 rounded-md px-2 py-1 text-sm text-foreground placeholder:text-text-muted outline-none focus:ring-1 focus:ring-primary/40 border border-primary/20"
                  />
                </div>
              ) : (
                <button
                  onClick={() => setCreatingGoal(true)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-muted-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  New goal
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-border-default">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 w-full px-4 py-3 text-xs text-text-muted hover:text-foreground hover:bg-accent/30 transition-colors group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Dashboard</span>
        </button>
        <div className="px-4 pb-3">
          <p className="text-xs text-text-muted truncate">{actorName}</p>
        </div>
      </div>
    </div>
  );
}

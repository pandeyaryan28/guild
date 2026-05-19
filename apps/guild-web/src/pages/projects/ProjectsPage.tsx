import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderKanban, Plus, Calendar, Users, CheckSquare, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import { useProjects } from '../../hooks/useProjects';
import { CreateProjectModal } from './CreateProjectModal';
import type { Project } from '../../lib/projects';

const STATUS_CONFIG: Record<Project['status'], { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'text-emerald-400', dot: '#34d399' },
  paused:    { label: 'Paused',    color: 'text-amber-400',   dot: '#fbbf24' },
  completed: { label: 'Completed', color: 'text-blue-400',    dot: '#60a5fa' },
  archived:  { label: 'Archived',  color: 'text-zinc-500',    dot: '#52525b' },
};

function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate();
  const config = STATUS_CONFIG[project.status];
  const due = project.dueDate?.toDate();
  const now = new Date();
  const isOverdue = due && due < now && project.status !== 'completed';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative rounded-xl border border-border-default bg-card p-5 cursor-pointer',
        'hover:border-primary/40 hover:bg-surface transition-all duration-200',
        'hover:shadow-lg hover:shadow-black/20',
      )}
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      {/* Status dot */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: config.dot }} />
          <span className={cn('text-[10px] font-semibold uppercase tracking-wider', config.color)}>
            {config.label}
          </span>
        </div>
        {/* Members */}
        <div className="flex -space-x-1.5">
          {project.memberIds.slice(0, 4).map((_, i) => (
            <div
              key={i}
              className="h-5 w-5 rounded-full bg-primary/20 ring-1 ring-background flex items-center justify-center text-[8px] font-bold text-primary"
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
          {project.memberIds.length > 4 && (
            <div className="h-5 w-5 rounded-full bg-muted ring-1 ring-background flex items-center justify-center text-[8px] text-muted-foreground">
              +{project.memberIds.length - 4}
            </div>
          )}
        </div>
      </div>

      {/* Name */}
      <h3 className="text-sm font-semibold text-foreground mb-1 leading-snug group-hover:text-primary transition-colors">
        {project.name}
      </h3>

      {/* Description */}
      {project.description && (
        <p className="text-[11px] text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
          {project.description}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-default">
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {project.memberIds.length}
          </span>
        </div>
        {due && (
          <span className={cn(
            'flex items-center gap-1 text-[10px] font-medium',
            isOverdue ? 'text-red-400' : 'text-muted-foreground',
          )}>
            <Calendar className="h-2.5 w-2.5" />
            {due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>

      {/* Hover arrow */}
      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="text-primary text-xs">→</span>
      </div>
    </motion.div>
  );
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
        <FolderKanban className="h-6 w-6 text-primary/60" />
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-medium text-foreground">No projects yet</p>
        <p className="text-[11px] text-muted-foreground">Create a project to scope tasks into a focused execution flow.</p>
      </div>
      <Button size="sm" onClick={onNew} className="gap-1.5 text-xs h-8">
        <Plus className="h-3.5 w-3.5" />
        New Project
      </Button>
    </div>
  );
}

export function ProjectsPage() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.organizationId;
  const { projects, loading } = useProjects(orgId);
  const [createOpen, setCreateOpen] = React.useState(false);

  const active = projects.filter((p) => p.status !== 'archived');
  const archived = projects.filter((p) => p.status === 'archived');

  if (!orgId) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No organization found.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-default flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <FolderKanban className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-foreground">Projects</h1>
            <p className="text-[11px] text-muted-foreground">
              {loading ? 'Loading…' : `${active.length} active project${active.length !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)} className="h-8 gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          New Project
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
          </div>
        ) : active.length === 0 && archived.length === 0 ? (
          <EmptyState onNew={() => setCreateOpen(true)} />
        ) : (
          <div className="space-y-8">
            {/* Active / Paused / Completed */}
            {active.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Active
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <AnimatePresence>
                    {active.map((p) => <ProjectCard key={p.id} project={p} />)}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Archived */}
            {archived.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-3">
                  Archived
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
                  <AnimatePresence>
                    {archived.map((p) => <ProjectCard key={p.id} project={p} />)}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <CreateProjectModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        orgId={orgId}
      />
    </div>
  );
}

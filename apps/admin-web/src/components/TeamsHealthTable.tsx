import React, { useState, useMemo } from 'react';
import type { UserProfile, Task, Goal, Team, Organization, Project, ProjectStatus } from '@guild/types';
import { HealthBadge } from './HealthBadge';
import { 
  Users2, ShieldAlert, Award, ChevronDown, ChevronUp, UserPlus, 
  CheckCircle, AlertCircle, CornerDownRight, Plus, X, Trash2, 
  Edit3, Briefcase, Calendar, FolderHeart, Shield, Workflow, 
  RefreshCw, Check
} from 'lucide-react';
import { 
  createTeam, 
  updateTeam, 
  deleteTeam, 
  createProject, 
  updateProject, 
  deleteProject, 
  auth 
} from '@guild/firebase';
import { Timestamp } from 'firebase/firestore';

interface TeamsHealthTableProps {
  teams: Team[];
  projects: Project[];
  users: UserProfile[];
  tasks: Task[];
  goals: Goal[];
  orgs: Organization[];
  refresh: () => void;
}

export function TeamsHealthTable({
  teams,
  projects,
  users,
  tasks,
  goals,
  orgs,
  refresh
}: TeamsHealthTableProps) {
  const [activeTab, setActiveTab] = useState<'squads' | 'projects'>('squads');
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);

  const orgMap = useMemo(() => Object.fromEntries(orgs.map(o => [o.id, o.name])), [orgs]);
  const userMap = useMemo(() => Object.fromEntries(users.map(u => [u.uid, u])), [users]);

  // Current logged in admin profile
  const currentUser = useMemo(() => {
    const uid = auth.currentUser?.uid;
    return users.find(u => u.uid === uid);
  }, [users]);

  // ─── SQUAD MODAL STATE ───────────────────────────────────────────────────────
  const [isSquadModalOpen, setIsSquadModalOpen] = useState(false);
  const [editingSquad, setEditingSquad] = useState<Team | null>(null);
  const [squadName, setSquadName] = useState('');
  const [squadDesc, setSquadDesc] = useState('');
  const [squadManagerId, setSquadManagerId] = useState('');
  const [squadMemberIds, setSquadMemberIds] = useState<string[]>([]);
  
  // ─── PROJECT MODAL STATE ─────────────────────────────────────────────────────
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [projectOwnerId, setProjectOwnerId] = useState('');
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>('active');
  const [projectStartDate, setProjectStartDate] = useState('');
  const [projectDueDate, setProjectDueDate] = useState('');

  // Common loader / error states
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ─── SQUAD METRICS CALCULATIONS ──────────────────────────────────────────────
  const teamsWithMetrics = useMemo(() => {
    return teams.map(team => {
      const manager = userMap[team.managerId];
      const teamMembers = (team.memberIds || []).map(uid => userMap[uid]).filter(Boolean) as UserProfile[];
      const allMembers = [manager, ...teamMembers].filter(Boolean) as UserProfile[];

      // Collect all tasks assigned to team members
      const allUids = allMembers.map(m => m.uid);
      const teamTasks = tasks.filter(t => t.assigneeIds?.some(id => allUids.includes(id)));
      const completedTasks = teamTasks.filter(t => t.status === 'done').length;
      const overdueTasks = teamTasks.filter(t => {
        if (t.status === 'done' || !t.dueDate) return false;
        try {
          return t.dueDate.toDate() < new Date();
        } catch {
          return false;
        }
      }).length;

      // Combined completion ratio
      const teamGoals = goals.filter(g => allUids.includes(g.ownerId));
      const completedGoals = teamGoals.filter(g => g.status === 'completed').length;

      const totalItems = teamTasks.length + teamGoals.length;
      const completedItems = completedTasks + completedGoals;
      const completionPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        ...team,
        managerName: manager ? (manager.fullName || manager.username) : '—',
        managerRole: manager ? (manager.designation || 'Squad Lead') : '—',
        membersCount: allMembers.length,
        teamMembers,
        allMembers,
        totalTasks: teamTasks.length,
        completedTasks,
        overdueTasks,
        completionPct,
      };
    });
  }, [teams, users, tasks, goals, userMap]);

  // ─── SQUAD HANDLERS ─────────────────────────────────────────────────────────
  const handleOpenCreateSquad = () => {
    setEditingSquad(null);
    setSquadName('');
    setSquadDesc('');
    setSquadManagerId('');
    setSquadMemberIds([]);
    setErrorMsg(null);
    setIsSquadModalOpen(true);
  };

  const handleOpenEditSquad = (team: Team) => {
    setEditingSquad(team);
    setSquadName(team.name);
    setSquadDesc(team.description || '');
    setSquadManagerId(team.managerId);
    setSquadMemberIds(team.memberIds || []);
    setErrorMsg(null);
    setIsSquadModalOpen(true);
  };

  const handleSaveSquad = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!squadName.trim() || !squadManagerId || !currentUser?.organizationId) return;
    setIsSaving(true);
    setErrorMsg(null);

    try {
      if (editingSquad) {
        await updateTeam(editingSquad.id, {
          name: squadName.trim(),
          description: squadDesc.trim(),
          managerId: squadManagerId,
          memberIds: squadMemberIds,
        });
      } else {
        await createTeam({
          orgId: currentUser.organizationId,
          name: squadName.trim(),
          description: squadDesc.trim(),
          managerId: squadManagerId,
          memberIds: squadMemberIds,
        });
      }
      refresh();
      setIsSquadModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save squad');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSquad = async (team: Team) => {
    const confirm = window.confirm(`Are you sure you want to delete the squad "${team.name}"? This action is permanent.`);
    if (!confirm) return;

    try {
      await deleteTeam(team.id);
      refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete squad');
    }
  };

  const handleSquadCheckboxChange = (userId: string, isChecked: boolean) => {
    if (isChecked) {
      setSquadMemberIds(prev => [...prev, userId]);
    } else {
      setSquadMemberIds(prev => prev.filter(id => id !== userId));
    }
  };

  // ─── PROJECT HANDLERS ───────────────────────────────────────────────────────
  const handleOpenCreateProject = () => {
    setEditingProject(null);
    setProjectName('');
    setProjectDesc('');
    setProjectOwnerId(currentUser?.uid || '');
    setProjectStatus('active');
    setProjectStartDate('');
    setProjectDueDate('');
    setErrorMsg(null);
    setIsProjectModalOpen(true);
  };

  const handleOpenEditProject = (project: Project) => {
    setEditingProject(project);
    setProjectName(project.name);
    setProjectDesc(project.description || '');
    setProjectOwnerId(project.ownerId);
    setProjectStatus(project.status);
    
    // Formatting date to yyyy-MM-dd for HTML input
    const formatStamp = (stamp: Timestamp | null) => {
      if (!stamp) return '';
      try {
        return stamp.toDate().toISOString().split('T')[0];
      } catch {
        return '';
      }
    };
    
    setProjectStartDate(formatStamp(project.startDate));
    setProjectDueDate(formatStamp(project.dueDate));
    setErrorMsg(null);
    setIsProjectModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectOwnerId || !currentUser?.organizationId) return;
    setIsSaving(true);
    setErrorMsg(null);

    const start = projectStartDate ? new Date(projectStartDate) : null;
    const due = projectDueDate ? new Date(projectDueDate) : null;

    try {
      if (editingProject) {
        await updateProject(editingProject.id, {
          name: projectName.trim(),
          description: projectDesc.trim(),
          status: projectStatus,
          memberIds: [projectOwnerId], // simplified admin assignment roster
          startDate: start ? Timestamp.fromDate(start) : null,
          dueDate: due ? Timestamp.fromDate(due) : null,
        });
      } else {
        await createProject({
          orgId: currentUser.organizationId,
          name: projectName.trim(),
          description: projectDesc.trim(),
          memberIds: [projectOwnerId],
          startDate: start,
          dueDate: due,
          actor: {
            uid: currentUser.uid,
            name: currentUser.fullName || currentUser.username,
          }
        });
      }
      refresh();
      setIsProjectModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save project');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteProject = async (project: Project) => {
    const confirm = window.confirm(`Are you sure you want to delete the project "${project.name}"? All relational tasks will remain but lose their project binding.`);
    if (!confirm) return;

    try {
      await deleteProject(project.id);
      refresh();
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Toggle tabs */}
        <div className="flex items-center bg-black/25 border border-white/5 p-1 rounded-xl text-xs font-semibold shrink-0">
          <button
            onClick={() => setActiveTab('squads')}
            className="px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2"
            style={{
              background: activeTab === 'squads' ? 'oklch(from var(--primary) l c h / 12%)' : 'transparent',
              color: activeTab === 'squads' ? 'var(--primary)' : 'var(--text-muted)'
            }}
          >
            <Users2 className="w-3.5 h-3.5" />
            Squads & Hierarchy
          </button>
          <button
            onClick={() => setActiveTab('projects')}
            className="px-4 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-2"
            style={{
              background: activeTab === 'projects' ? 'oklch(from var(--primary) l c h / 12%)' : 'transparent',
              color: activeTab === 'projects' ? 'var(--primary)' : 'var(--text-muted)'
            }}
          >
            <FolderHeart className="w-3.5 h-3.5" />
            Projects & Pipelines
          </button>
        </div>

        {/* Dynamic creation button based on active tab */}
        {currentUser?.organizationId && (
          <div>
            {activeTab === 'squads' ? (
              <button
                onClick={handleOpenCreateSquad}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                           bg-[--primary] text-[--primary-foreground] hover:opacity-90 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Squad
              </button>
            ) : (
              <button
                onClick={handleOpenCreateProject}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold
                           bg-[--primary] text-[--primary-foreground] hover:opacity-90 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Project
              </button>
            )}
          </div>
        )}
      </div>

      {/* ─── TAB 1: SQUADS & HIERARCHY ────────────────────────────────────────── */}
      {activeTab === 'squads' && (
        <div className="overflow-x-auto rounded-2xl border border-white/10 dark:border-white/5 bg-black/10 select-none">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[10px] font-extrabold uppercase tracking-wider text-[--muted-foreground]" style={{ background: 'oklch(from var(--muted) l c h / 30%)' }}>
                <th className="w-10"></th>
                <th className="text-left px-5 py-4">Squad Name</th>
                <th className="text-left px-4 py-4">Squad Manager / Lead</th>
                <th className="text-center px-4 py-4">Members count</th>
                <th className="text-center px-4 py-4">Tasks Load</th>
                <th className="text-center px-4 py-4">Overdue items</th>
                <th className="text-center px-4 py-4">Completion</th>
                <th className="text-right px-5 py-4 last:rounded-tr-2xl">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[--border]/40">
              {teamsWithMetrics.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-[--muted-foreground] italic">
                    No functional squads configured. Click "Create Squad" to group members.
                  </td>
                </tr>
              ) : (
                teamsWithMetrics.map((t, i) => {
                  const isExpanded = expandedTeamId === t.id;
                  return (
                    <React.Fragment key={t.id}>
                      {/* Squad Row */}
                      <tr
                        className="transition-colors hover:bg-[--accent]/5 group cursor-pointer"
                        onClick={() => setExpandedTeamId(isExpanded ? null : t.id)}
                        style={{ background: i % 2 === 0 ? 'transparent' : 'oklch(from var(--card) l c h / 10%)' }}
                      >
                        {/* Expand Icon */}
                        <td className="text-center pl-3.5">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[--muted-foreground]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[--muted-foreground]" />
                          )}
                        </td>
                        {/* Squad Name */}
                        <td className="px-5 py-3.5">
                          <div>
                            <div className="font-bold text-sm text-[--foreground] leading-none">{t.name}</div>
                            <div className="text-[10px] text-[--muted-foreground] line-clamp-1 max-w-[240px] mt-1">
                              {t.description || 'No description provided.'}
                            </div>
                          </div>
                        </td>
                        {/* Manager */}
                        <td className="px-4 py-3.5">
                          <div>
                            <div className="font-bold text-xs text-[--foreground] leading-none">{t.managerName}</div>
                            <div className="text-[9px] text-[--muted-foreground] mt-0.5">{t.managerRole}</div>
                          </div>
                        </td>
                        {/* Members count */}
                        <td className="px-4 py-3.5 text-center font-bold tabular-nums text-[--foreground]">
                          {t.membersCount}
                        </td>
                        {/* Tasks */}
                        <td className="px-4 py-3.5 text-center">
                          <div className="inline-flex items-center gap-1 font-bold text-[--foreground] tabular-nums">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{t.completedTasks}</span>
                            <span className="text-[--muted-foreground]/50">/</span>
                            <span className="text-[--muted-foreground]">{t.totalTasks}</span>
                          </div>
                        </td>
                        {/* Overdue */}
                        <td className="px-4 py-3.5 text-center">
                          {t.overdueTasks > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-red-500/15 text-red-400 border border-red-500/20 tabular-nums animate-pulse">
                              <ShieldAlert className="w-3 h-3" />
                              {t.overdueTasks} Overdue
                            </span>
                          ) : (
                            <span className="text-[10px] text-[--muted-foreground]/50">—</span>
                          )}
                        </td>
                        {/* Completion */}
                        <td className="px-4 py-3.5 text-center">
                          <span className="font-extrabold text-[--foreground] tabular-nums">
                            {t.totalTasks > 0 ? `${t.completionPct}%` : '—'}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="px-5 py-3.5 text-right space-x-1.5" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenEditSquad(t)}
                            title="Edit Squad"
                            className="p-1.5 rounded-lg border border-white/5 bg-white/5 text-[--muted-foreground] hover:text-[--ring] hover:border-[--ring] active:scale-95 transition-all cursor-pointer inline-flex items-center"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSquad(t)}
                            title="Delete Squad"
                            className="p-1.5 rounded-lg border border-red-500/10 bg-red-500/5 text-red-400/80 hover:text-red-400 hover:border-red-500/30 active:scale-95 transition-all cursor-pointer inline-flex items-center"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>

                      {/* Expandable Squad Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={8} className="px-6 py-5 bg-black/25 border-y border-white/5">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-up">
                              
                              {/* Member Workload Split */}
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-wider text-[--muted-foreground]">
                                  Member Workload Split
                                </h4>
                                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 aether-scroll">
                                  {t.allMembers.map(member => {
                                    const memTasks = tasks.filter(tk => tk.assigneeIds?.includes(member.uid));
                                    const memDone = memTasks.filter(tk => tk.status === 'done').length;
                                    const memOverdue = memTasks.filter(tk => {
                                      if (tk.status === 'done' || !tk.dueDate) return false;
                                      try { return tk.dueDate.toDate() < new Date(); } catch { return false; }
                                    }).length;
                                    const memGoals = goals.filter(gl => gl.ownerId === member.uid);
                                    const memGoalsDone = memGoals.filter(gl => gl.status === 'completed').length;

                                    const memTotal = memTasks.length + memGoals.length;
                                    const memCompleted = memDone + memGoalsDone;
                                    const memPct = memTotal > 0 ? Math.round((memCompleted / memTotal) * 100) : 0;
                                    const isLead = member.uid === t.managerId;

                                    return (
                                      <div
                                        key={member.uid}
                                        className="flex items-center justify-between p-3 rounded-xl bg-white/[0.01] border border-white/5 text-xs shadow-inner"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] shadow-sm shrink-0"
                                            style={{
                                              background: isLead ? 'oklch(from var(--primary) l c h / 20%)' : 'rgba(255, 255, 255, 0.05)',
                                              color: isLead ? 'var(--primary)' : 'var(--text-secondary)'
                                            }}
                                          >
                                            {isLead ? 'L' : 'M'}
                                          </div>
                                          <div>
                                            <span className="font-bold text-[--foreground]">{member.fullName}</span>
                                            {isLead && <span className="ml-1.5 text-[9px] font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1 rounded uppercase">Lead</span>}
                                            <div className="text-[10px] text-[--muted-foreground] mt-0.5">{member.designation || 'Member'}</div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-right font-medium tabular-nums text-[--muted-foreground]">
                                          <div>
                                            Tasks: <span className="font-bold text-[--foreground]">{memTasks.length}</span>
                                          </div>
                                          {memOverdue > 0 && (
                                            <div className="text-red-400 font-bold">
                                              Overdue: <span>{memOverdue}</span>
                                            </div>
                                          )}
                                          <div className="font-bold text-emerald-400">
                                            {memPct}%
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Visual Reporting Tree */}
                              <div className="space-y-3">
                                <h4 className="text-[10px] font-black uppercase tracking-wider text-[--muted-foreground]">
                                  Squad Reporting Lines
                                </h4>
                                <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-3 shadow-inner">
                                  {/* Manager Node */}
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-2.5 h-2.5 rounded-full bg-[--primary] animate-pulse" />
                                    <div className="text-xs leading-none">
                                      <span className="font-bold text-[--foreground]">{t.managerName}</span>
                                      <span className="text-[9px] text-[--muted-foreground] ml-2 font-mono">({t.managerRole})</span>
                                    </div>
                                  </div>

                                  {/* Member Nodes */}
                                  <div className="space-y-2.5">
                                    {t.teamMembers.length === 0 ? (
                                      <div className="flex items-center gap-2 pl-4 text-[10px] text-[--muted-foreground]/60 italic font-medium">
                                        <CornerDownRight className="w-3.5 h-3.5" />
                                        No direct reports registered yet.
                                      </div>
                                    ) : (
                                      t.teamMembers.map(member => (
                                        <div key={member.uid} className="flex items-center gap-2 pl-5 text-xs text-[--foreground]">
                                          <CornerDownRight className="w-4 h-4 text-white/20 shrink-0" />
                                          <div className="flex items-center gap-1.5 leading-none">
                                            <span className="font-bold text-[--foreground]">{member.fullName}</span>
                                            <span className="text-[9px] text-[--muted-foreground] font-mono">({member.designation || 'Member'})</span>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── TAB 2: PROJECTS & PIPELINES ──────────────────────────────────────── */}
      {activeTab === 'projects' && (
        <div className="space-y-4 select-none">
          {projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center aether-glass bg-black/10 border border-white/5">
              <FolderHeart className="h-12 w-12 text-[--muted-foreground] mb-4 opacity-50" />
              <p className="text-base font-bold text-[--foreground]">No active projects</p>
              <p className="text-xs text-[--muted-foreground] mt-1 max-w-sm font-semibold">
                There are no core project initiatives configured. Click "Create Project" to setup a pipeline.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {projects.map(project => {
                // Calculate completion metrics
                const projectTasks = tasks.filter(t => t.projectId === project.id);
                const completedTasks = projectTasks.filter(t => t.status === 'done').length;
                const completionPct = projectTasks.length > 0 ? Math.round((completedTasks / projectTasks.length) * 100) : 0;
                
                const owner = userMap[project.ownerId];
                const ownerName = owner ? (owner.fullName || owner.username) : 'System';

                const due = project.dueDate;
                const dueText = due 
                  ? due.toDate().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : 'No deadline';

                return (
                  <div
                    key={project.id}
                    className="glass rounded-2xl p-5 border border-white/5 card-hover animate-fade-up flex flex-col justify-between min-h-[180px]"
                  >
                    {/* Top title and Edit controls */}
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-sm text-[--foreground] leading-tight truncate">{project.name}</h3>
                          <p className="text-[10px] text-[--muted-foreground] font-semibold mt-0.5 truncate">
                            Owner: <span className="text-[--foreground] font-bold">{ownerName}</span>
                          </p>
                        </div>
                        <HealthBadge type="status" value={project.status} />
                      </div>
                      <p className="text-[10px] text-[--muted-foreground] font-medium line-clamp-2 leading-relaxed">
                        {project.description || 'No description provided.'}
                      </p>
                    </div>

                    {/* Progress Bar & due dates */}
                    <div className="space-y-3 pt-3 border-t border-white/5 mt-4">
                      {/* completion ratio */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-[--muted-foreground] uppercase">Progression Rate</span>
                          <span className="text-[--foreground] tabular-nums font-extrabold">{completionPct}% ({completedTasks}/{projectTasks.length} tasks)</span>
                        </div>
                        <div className="w-full h-1.5 bg-white/5 border border-white/5 rounded-full overflow-hidden shrink-0">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${completionPct}%`,
                              backgroundColor: completionPct >= 80 ? 'var(--status-done)' : completionPct >= 40 ? 'var(--status-review)' : 'var(--destructive)'
                            }}
                          />
                        </div>
                      </div>

                      {/* Dates and Actions */}
                      <div className="flex items-center justify-between gap-3 pt-1">
                        <div className="flex items-center gap-1.5 text-[9px] font-mono text-[--muted-foreground] font-bold">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>Due: {dueText}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditProject(project)}
                            title="Edit Project"
                            className="p-1 rounded-lg border border-white/5 bg-white/5 text-[--muted-foreground] hover:text-[--ring] hover:border-[--ring] active:scale-95 transition-all cursor-pointer inline-flex items-center"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project)}
                            title="Delete Project"
                            className="p-1 rounded-lg border border-red-500/10 bg-red-500/5 text-red-400/80 hover:text-red-400 hover:border-red-500/30 active:scale-95 transition-all cursor-pointer inline-flex items-center"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── MAC-STYLE GLASS CREATE / EDIT SQUAD MODAL ───────────────────────── */}
      {isSquadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsSquadModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          />

          {/* Modal Container */}
          <div
            className="w-full max-w-lg overflow-hidden aether-glass border border-white/10 shadow-2xl p-6 relative flex flex-col max-h-[90vh] bg-surface/95 dark:bg-surface/90 backdrop-blur-3xl animate-scale-up"
            style={{
              animation: 'scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[--foreground]">
                  {editingSquad ? 'Modify Squad Details' : 'Configure New Squad'}
                </h3>
                <p className="text-[9px] text-[--muted-foreground] mt-0.5 leading-none">Group teammates and establish manager reporting lines</p>
              </div>
              <button
                onClick={() => setIsSquadModalOpen(false)}
                className="h-8 w-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-[--muted-foreground] hover:text-[--foreground] active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSaveSquad} className="flex-1 overflow-y-auto aether-scroll space-y-4 pt-4 pr-1">
              {errorMsg && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Squad Name</label>
                <input
                  type="text"
                  required
                  value={squadName}
                  onChange={e => setSquadName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-white/10 bg-black/20 text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all placeholder:text-[--muted-foreground]/60"
                  placeholder="e.g. Engineering, Operations Group, Logistics Team"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Description (Optional)</label>
                <textarea
                  value={squadDesc}
                  onChange={e => setSquadDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-white/10 bg-black/20 text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all min-h-[70px] placeholder:text-[--muted-foreground]/60 resize-none"
                  placeholder="Describe the squad's functional operational scope..."
                />
              </div>

              {/* Team Lead Manager dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Team Lead / Squad Manager</label>
                <select
                  value={squadManagerId}
                  required
                  onChange={e => setSquadManagerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-white/10 bg-black/20 text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] cursor-pointer"
                >
                  <option value="">Choose reporting manager lead...</option>
                  {users
                    .filter(u => u.role === 'owner' || u.role === 'admin' || u.role === 'manager')
                    .map(u => (
                      <option key={u.uid} value={u.uid}>
                        {u.fullName || u.username} ({u.designation || 'Squad Lead'}) — {u.role}
                      </option>
                    ))}
                </select>
              </div>

              {/* Squad members checklist */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1"> Roster Squad Members</label>
                <div className="border border-white/10 bg-black/20 rounded-xl p-3 max-h-[140px] overflow-y-auto space-y-2.5 aether-scroll">
                  {users.map(u => (
                    <label key={u.uid} className="flex items-center justify-between cursor-pointer group select-none">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={squadMemberIds.includes(u.uid)}
                          onChange={e => handleSquadCheckboxChange(u.uid, e.target.checked)}
                          className="rounded border-white/10 bg-black/30 text-[--primary] focus:ring-[--ring] h-4 w-4 cursor-pointer"
                        />
                        <div className="leading-tight">
                          <p className="text-xs font-bold text-[--foreground] group-hover:text-[--primary] transition-colors">
                            {u.fullName || u.username}
                          </p>
                          <p className="text-[9px] text-[--muted-foreground]">@{u.username}</p>
                        </div>
                      </div>
                      {u.designation && (
                        <span className="text-[9px] font-semibold text-[--muted-foreground] border border-white/5 bg-white/5 px-2 py-0.5 rounded">
                          {u.designation}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/10 font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setIsSquadModalOpen(false)}
                  className="px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-[--foreground] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-[--primary] text-[--primary-foreground] hover:opacity-90 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingSquad ? 'Save Changes' : 'Create Squad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MAC-STYLE GLASS CREATE / EDIT PROJECT MODAL ─────────────────────── */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsProjectModalOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-fade-in"
          />

          {/* Modal Container */}
          <div
            className="w-full max-w-lg overflow-hidden aether-glass border border-white/10 shadow-2xl p-6 relative flex flex-col max-h-[90vh] bg-surface/95 dark:bg-surface/90 backdrop-blur-3xl animate-scale-up"
            style={{
              animation: 'scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[--foreground]">
                  {editingProject ? 'Modify Project Parameters' : 'Configure New Project'}
                </h3>
                <p className="text-[9px] text-[--muted-foreground] mt-0.5 leading-none">Designate project ownership, statuses, and milestone deadlines</p>
              </div>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="h-8 w-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-[--muted-foreground] hover:text-[--foreground] active:scale-95 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Form Content */}
            <form onSubmit={handleSaveProject} className="flex-1 overflow-y-auto aether-scroll space-y-4 pt-4 pr-1">
              {errorMsg && (
                <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Project Name */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Project Title</label>
                <input
                  type="text"
                  required
                  value={projectName}
                  onChange={e => setProjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-white/10 bg-black/20 text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all placeholder:text-[--muted-foreground]/60"
                  placeholder="e.g. Design Redesign, Alpha Deployment, Logistics Q3 Audit"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Description (Optional)</label>
                <textarea
                  value={projectDesc}
                  onChange={e => setProjectDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-white/10 bg-black/20 text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] transition-all min-h-[70px] placeholder:text-[--muted-foreground]/60 resize-none"
                  placeholder="Describe the project parameters and goals..."
                />
              </div>

              {/* Project Owner dropdown */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Project Owner</label>
                <select
                  value={projectOwnerId}
                  required
                  onChange={e => setProjectOwnerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-white/10 bg-black/20 text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] cursor-pointer"
                >
                  <option value="">Choose project owner...</option>
                  {users.map(u => (
                    <option key={u.uid} value={u.uid}>
                      {u.fullName || u.username} ({u.designation || 'Member'}) — {u.role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Project status</label>
                <select
                  value={projectStatus}
                  onChange={e => setProjectStatus(e.target.value as ProjectStatus)}
                  className="w-full px-3.5 py-2.5 border border-white/10 bg-black/20 text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] cursor-pointer"
                >
                  <option value="active">Active (Currently tracking)</option>
                  <option value="paused">Paused (On Hold)</option>
                  <option value="completed">Completed (Pipeline Finished)</option>
                  <option value="archived">Archived (Closed)</option>
                </select>
              </div>

              {/* Start & Due Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Start Date</label>
                  <input
                    type="date"
                    value={projectStartDate}
                    onChange={e => setProjectStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-white/10 bg-black/20 text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] cursor-pointer"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[--muted-foreground] uppercase tracking-wider px-1">Due Date</label>
                  <input
                    type="date"
                    value={projectDueDate}
                    onChange={e => setProjectDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-white/10 bg-black/20 text-xs font-semibold text-[--foreground] rounded-xl outline-none focus:border-[--ring] cursor-pointer"
                  />
                </div>
              </div>

              {/* Footer buttons */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-white/10 font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-[--foreground] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2.5 bg-[--primary] text-[--primary-foreground] hover:opacity-90 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  {editingProject ? 'Save Changes' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Embedded Animations CSS style block */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scale-up {
          from { transform: scale(0.95); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease forwards;
        }
        .animate-scale-up {
          animation: scale-up 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
    </div>
  );
}

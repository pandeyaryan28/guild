import React, { useState, useMemo } from 'react';
import { useAdminData } from '../../hooks/useAdminData';
import { MobileAdminLayout } from './MobileAdminLayout';
import { 
  Users, 
  Users2, 
  ClipboardList, 
  AlertTriangle, 
  Percent, 
  Loader2, 
  ShieldAlert, 
  Crown,
  Building,
  RefreshCw,
  Search,
  CheckCircle,
  Copy,
  ChevronRight
} from 'lucide-react';
import { type UserProfile, type Task, type Organization, type Team } from '@guild/types';
import { updateOrganizationDetails, getOrCreateGlobalInviteLink } from '@guild/firebase';
import { cn } from '../../lib/utils';

interface MobileAdminAppProps {
  profile: UserProfile;
}

export function MobileAdminApp({ profile }: MobileAdminAppProps) {
  const data = useAdminData(profile.organizationId);
  const [activeSection, setActiveSection] = useState('overview');

  // Overview Date Range
  const [overviewRange, setOverviewRange] = useState('30d');

  // Search queries
  const [searchQuery, setSearchQuery] = useState('');

  const orgMap = useMemo(() => {
    return Object.fromEntries(data.orgs.map(o => [o.id, o.name]));
  }, [data.orgs]);

  // Stat Card calculations
  const activeMembers = data.users.filter(u => u.organizationId).length;
  const doneGoalsCount = data.goals.filter(g => g.status === 'completed').length;
  
  const overdueTasksCount = data.tasks.filter(t => {
    if (t.status === 'done' || !t.dueDate) return false;
    try { return t.dueDate.toDate() < new Date(); } catch { return false; }
  }).length;

  const overdueGoalsCount = data.goals.filter(g => {
    if (g.status === 'completed' || !g.targetDate) return false;
    try { return g.targetDate.toDate() < new Date(); } catch { return false; }
  }).length;

  const totalOverdue = overdueTasksCount + overdueGoalsCount;

  const pendingRequests = useMemo(() => {
    return data.requests.filter(r => r.status === 'pending');
  }, [data.requests]);

  const STATS_CARDS = [
    { label: 'Teammates', value: data.users.length, detail: `${activeMembers} active in orgs`, icon: Users, color: 'text-indigo-400' },
    { label: 'Squads & Teams', value: data.teams.length, detail: 'Active squads', icon: Users2, color: 'text-violet-400' },
    { label: 'Hotspots', value: totalOverdue, detail: `${overdueTasksCount} overdue tasks`, icon: AlertTriangle, color: 'text-red-400 animate-pulse' },
    { label: 'Execution', value: `${data.tasks.length > 0 ? Math.round((data.tasks.filter(t => t.status === 'done').length / data.tasks.length) * 100) : 0}%`, detail: 'Completion rate', icon: Percent, color: 'text-emerald-400' }
  ];

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return data.users;
    return data.users.filter(u => 
      u.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data.users, searchQuery]);

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return data.tasks;
    return data.tasks.filter(t => 
      t.title?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data.tasks, searchQuery]);

  if (data.loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground font-bold uppercase tracking-wider">Syncing Admin HQ...</span>
      </div>
    );
  }

  return (
    <MobileAdminLayout 
      profile={profile} 
      activeSection={activeSection} 
      onNavigate={setActiveSection}
    >
      <div className="flex flex-col space-y-5">
        
        {/* Section rendering */}
        {activeSection === 'overview' && (
          <>
            {/* KPI grid cards */}
            <div className="grid grid-cols-2 gap-3">
              {STATS_CARDS.map((card) => (
                <div key={card.label} className="aether-glass p-4 bg-white/2 border border-white/5 flex flex-col justify-between h-28">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">{card.label}</span>
                    <card.icon className={cn("w-4 h-4 shrink-0", card.color)} />
                  </div>
                  <div className="mt-2">
                    <span className="text-xl font-black text-foreground block">{card.value}</span>
                    <span className="text-[9px] text-muted-foreground block mt-0.5 leading-none">{card.detail}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Overloaded Alert section */}
            <div className="aether-glass p-5 bg-white/2 border border-white/5 space-y-4">
              <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
                <AlertTriangle className="w-4.5 h-4.5 text-red-400 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Operational Alerts</span>
              </div>

              {totalOverdue === 0 && pendingRequests.length === 0 ? (
                <div className="py-4 text-center">
                  <span className="text-xs font-bold text-emerald-400 block">Workspace on Track</span>
                  <span className="text-[9px] text-muted-foreground mt-0.5 block">Zero overdue items or pending requests.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {/* Overdue Tasks */}
                  {data.tasks.filter(t => t.status !== 'done' && t.dueDate).slice(0, 3).map((t) => (
                    <div key={t.id} className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 text-xs flex justify-between items-center animate-fade-in">
                      <span className="font-bold text-foreground truncate flex-1 mr-2">{t.title}</span>
                      <span className="text-[8px] font-black px-2 py-0.5 rounded bg-red-500/20 text-red-400 shrink-0">OVERDUE</span>
                    </div>
                  ))}
                  {/* Pending Approvals */}
                  {pendingRequests.slice(0, 3).map((r) => (
                    <div key={r.id} className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/10 text-xs flex justify-between items-center animate-fade-in">
                      <div className="flex-1 min-w-0 mr-2">
                        <span className="font-bold text-foreground block truncate">{r.creatorName}</span>
                        <span className="text-[9px] text-muted-foreground block truncate mt-0.5">{r.title}</span>
                      </div>
                      <span className="text-[8px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 shrink-0 uppercase tracking-wide">
                        {r.type.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {activeSection === 'people' && (
          <div className="space-y-4">
            <div className="aether-glass p-3 flex gap-2 bg-white/2 border border-white/5">
              <Search className="w-4 h-4 text-muted-foreground shrink-0 self-center ml-1" />
              <input
                type="text"
                placeholder="Search teammates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground focus:ring-0 focus:outline-none font-bold"
              />
            </div>

            <div className="space-y-2">
              {filteredUsers.map((u) => {
                const orgName = orgMap[u.organizationId] || 'No Org';
                return (
                  <div key={u.uid} className="aether-glass p-4 bg-white/2 border border-white/5 flex justify-between items-center shadow-sm">
                    <div>
                      <span className="text-xs font-black text-foreground block truncate">{u.fullName || u.username}</span>
                      <span className="text-[9px] text-muted-foreground block font-bold tracking-wider mt-1">{orgName} · {u.role}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-muted-foreground font-black uppercase">
                      ACTIVE
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeSection === 'teams' && (
          <div className="space-y-3">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block px-1">ACTIVE SQUADS</span>
            {data.teams.map((t) => (
              <div key={t.id} className="aether-glass p-4 bg-white/2 border border-white/5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-foreground block">{t.name}</span>
                  <span className="text-[9px] text-muted-foreground block font-bold mt-1 tracking-wider">
                    {t.memberIds?.length || 0} members · Manager: {data.users.find(u => u.uid === t.managerId)?.fullName || 'N/A'}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30" />
              </div>
            ))}
          </div>
        )}

        {activeSection === 'work' && (
          <div className="space-y-4">
            <div className="aether-glass p-3 flex gap-2 bg-white/2 border border-white/5">
              <Search className="w-4 h-4 text-muted-foreground shrink-0 self-center ml-1" />
              <input
                type="text"
                placeholder="Search initiatives..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent border-none text-xs text-foreground placeholder:text-muted-foreground focus:ring-0 focus:outline-none font-bold"
              />
            </div>

            <div className="space-y-2">
              {filteredTasks.slice(0, 8).map((t) => (
                <div key={t.id} className="aether-glass p-4 bg-white/2 border border-white/5 space-y-1">
                  <span className="text-xs font-black text-foreground block leading-snug">{t.title}</span>
                  <span className="text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-primary/10 border border-primary/20 text-primary inline-block">
                    {t.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeSection === 'settings' && (
          <div className="aether-glass p-5 bg-white/2 border border-white/5 space-y-4">
            <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
              <Building className="w-4.5 h-4.5 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">HQ Administrative Settings</span>
            </div>
            
            <p className="text-[10px] text-muted-foreground leading-normal font-semibold">
              You are signed in as an administrator for the operations center. Use the desktop portal for full multi-workspace configurations and analytics tools.
            </p>
          </div>
        )}

      </div>
    </MobileAdminLayout>
  );
}
export default MobileAdminApp;

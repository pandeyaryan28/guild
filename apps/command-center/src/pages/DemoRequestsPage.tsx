import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarClock,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Calendar,
  Archive,
  Mail,
  Building2,
  Users,
  MessageSquare,
  ChevronRight,
  ExternalLink,
  Plus,
  RefreshCw,
  Trash2,
  Edit3,
  X,
  FileText,
  AlertCircle,
  Copy,
  Check,
  Radio,
} from 'lucide-react';
import {
  superAdminService,
  AdminDemoRequest,
  DemoRequestStatus,
  DemoRequestPriority,
} from '../services/superAdminService';
import { useSuperAdminAuth } from '../context/AuthContext';

const STATUS_CONFIG: Record<
  DemoRequestStatus,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  pending: {
    label: 'Pending',
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    text: 'text-amber-700 dark:text-amber-400',
    border: 'border-amber-500/30',
    icon: Clock,
  },
  contacted: {
    label: 'Contacted',
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    text: 'text-blue-700 dark:text-blue-400',
    border: 'border-blue-500/30',
    icon: Mail,
  },
  scheduled: {
    label: 'Scheduled',
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    text: 'text-purple-700 dark:text-purple-400',
    border: 'border-purple-500/30',
    icon: Calendar,
  },
  completed: {
    label: 'Completed',
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    text: 'text-emerald-700 dark:text-emerald-400',
    border: 'border-emerald-500/30',
    icon: CheckCircle2,
  },
  archived: {
    label: 'Archived',
    bg: 'bg-secondary',
    text: 'text-muted-foreground',
    border: 'border-border',
    icon: Archive,
  },
};

const PRIORITY_CONFIG: Record<
  DemoRequestPriority,
  { label: string; bg: string; text: string; border: string }
> = {
  high: {
    label: 'High Priority',
    bg: 'bg-rose-500/10 dark:bg-rose-500/20',
    text: 'text-rose-700 dark:text-rose-400',
    border: 'border-rose-500/30',
  },
  medium: {
    label: 'Medium',
    bg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    text: 'text-indigo-700 dark:text-indigo-400',
    border: 'border-indigo-500/30',
  },
  low: {
    label: 'Standard',
    bg: 'bg-secondary',
    text: 'text-muted-foreground',
    border: 'border-border',
  },
};

export function DemoRequestsPage() {
  const { adminProfile } = useSuperAdminAuth();
  const actorEmail = adminProfile?.email || 'pandeyaryan28@gmail.com';

  const [requests, setRequests] = useState<AdminDemoRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AdminDemoRequest | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DemoRequestStatus>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | string>('all');

  // Modal states
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [editNotes, setEditNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSaveMessage, setNotesSaveMessage] = useState<string | null>(null);

  // Manual Lead Form state
  const [manualForm, setManualForm] = useState({
    name: '',
    email: '',
    company: '',
    teamSize: '5-20',
    message: '',
    priority: 'medium' as DemoRequestPriority,
  });

  // Real-time synchronization subscription
  useEffect(() => {
    return superAdminService.subscribeToDemoRequests((data) => {
      setRequests(data);
      if (selectedRequest) {
        const updated = data.find((d) => d.id === selectedRequest.id);
        if (updated) setSelectedRequest(updated);
      }
    });
  }, [selectedRequest]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await superAdminService.refresh();
    setTimeout(() => setIsRefreshing(false), 350);
  };

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Status transition handler
  const handleStatusChange = async (id: string, newStatus: DemoRequestStatus) => {
    await superAdminService.updateDemoRequestStatus(id, newStatus, undefined, undefined, undefined, actorEmail);
  };

  // Open detail modal
  const handleOpenDetail = (req: AdminDemoRequest) => {
    setSelectedRequest(req);
    setEditNotes(req.notes || '');
    setNotesSaveMessage(null);
    setIsDetailModalOpen(true);
  };

  // Save notes from modal
  const handleSaveNotes = async () => {
    if (!selectedRequest) return;
    setIsSavingNotes(true);
    setNotesSaveMessage(null);
    try {
      await superAdminService.updateDemoRequestStatus(
        selectedRequest.id,
        selectedRequest.status,
        editNotes,
        selectedRequest.priority,
        selectedRequest.assignedTo,
        actorEmail
      );
      setNotesSaveMessage('Notes saved successfully');
      setTimeout(() => setNotesSaveMessage(null), 2500);
    } catch (e) {
      console.error(e);
      setNotesSaveMessage('Failed to save notes');
    } finally {
      setIsSavingNotes(false);
    }
  };

  // Delete demo request
  const handleDeleteRequest = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this demo request?')) return;
    await superAdminService.deleteDemoRequest(id, actorEmail);
    if (selectedRequest?.id === id) {
      setIsDetailModalOpen(false);
      setSelectedRequest(null);
    }
  };

  // Submit manual lead
  const handleManualLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name || !manualForm.email) return;

    await superAdminService.createDemoRequest({
      ...manualForm,
      actorEmail,
    });

    setManualForm({
      name: '',
      email: '',
      company: '',
      teamSize: '5-20',
      message: '',
      priority: 'medium',
    });
    setIsManualModalOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Company', 'Team Size', 'Source', 'Status', 'Priority', 'Created At', 'Message', 'Notes'];
    const rows = filteredRequests.map((r) => [
      r.id,
      `"${r.name.replace(/"/g, '""')}"`,
      `"${r.email.replace(/"/g, '""')}"`,
      `"${(r.company || '').replace(/"/g, '""')}"`,
      `"${r.teamSize || ''}"`,
      r.source,
      r.status,
      r.priority,
      r.createdAt,
      `"${(r.message || '').replace(/"/g, '""')}"`,
      `"${(r.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `guild_orbit_demo_requests_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Compute Metrics
  const metrics = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === 'pending').length;
    const scheduled = requests.filter((r) => r.status === 'scheduled').length;
    const completed = requests.filter((r) => r.status === 'completed').length;
    const highPriority = requests.filter((r) => r.priority === 'high').length;
    return { total, pending, scheduled, completed, highPriority };
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
      const matchesSource = sourceFilter === 'all' || r.source === sourceFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.company && r.company.toLowerCase().includes(q)) ||
        (r.message && r.message.toLowerCase().includes(q));

      return matchesStatus && matchesSource && matchesQuery;
    });
  }, [requests, statusFilter, sourceFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Demo Requests & Inbound Leads
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
              <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-500" />
              LIVE_STREAM
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Real-time inbound demo bookings from the Guild Orbit marketing website and contact forms.
          </p>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh leads from Firestore"
            className="p-2 rounded-xl border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border-strong transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3 py-1.5 rounded-xl border border-border bg-secondary/50 text-foreground hover:bg-surface-hover text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => setIsManualModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-95 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Lead</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Inbound Leads */}
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-mono">
              Total Inbound
            </span>
            <p className="text-2xl font-black text-foreground mt-1">{metrics.total}</p>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              {metrics.highPriority} high-priority
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <CalendarClock className="w-5 h-5" />
          </div>
        </div>

        {/* Action Required (Pending) */}
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider font-mono">
              Action Required
            </span>
            <p className="text-2xl font-black text-foreground mt-1">{metrics.pending}</p>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Awaiting outreach
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        {/* Demos Scheduled */}
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider font-mono">
              Scheduled Demos
            </span>
            <p className="text-2xl font-black text-foreground mt-1">{metrics.scheduled}</p>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Calls placed on calendar
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
        </div>

        {/* Converted / Completed */}
        <div className="p-4 rounded-2xl bg-surface border border-border shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider font-mono">
              Completed / Won
            </span>
            <p className="text-2xl font-black text-foreground mt-1">{metrics.completed}</p>
            <span className="text-[11px] text-muted-foreground mt-0.5 block">
              Successful demo calls
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control Toolbar: Search + Status Tabs + Source Filter */}
      <div className="p-4 rounded-2xl bg-surface border border-border space-y-3.5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by lead name, email, company, or message..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-secondary/50 border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-mono font-medium">Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl bg-secondary/50 border border-border text-xs text-foreground font-medium focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="all">All Channels</option>
              <option value="demo_page">Demo Page (/demo)</option>
              <option value="contact_page">Contact Page (/contact)</option>
              <option value="command_center">Direct Entry</option>
            </select>
          </div>
        </div>

        {/* Status Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-border/50 pt-3">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              statusFilter === 'all'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
            }`}
          >
            All Leads ({requests.length})
          </button>

          {(['pending', 'contacted', 'scheduled', 'completed', 'archived'] as DemoRequestStatus[]).map((st) => {
            const count = requests.filter((r) => r.status === st).length;
            const active = statusFilter === st;
            return (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                }`}
              >
                <span>{STATUS_CONFIG[st].label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    active ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-secondary text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Leads Table / List */}
      <div className="rounded-2xl bg-surface border border-border shadow-xs overflow-hidden">
        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-secondary mx-auto flex items-center justify-center text-muted-foreground">
              <CalendarClock className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-foreground">No demo requests found</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'all' || sourceFilter !== 'all'
                ? 'Try adjusting your filters or search keywords.'
                : 'Demo requests submitted on the marketing website will appear here in real time.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono bg-secondary/30">
                  <th className="py-3 px-4">Lead Contact</th>
                  <th className="py-3 px-4">Company & Team</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredRequests.map((req) => {
                  const statusInfo = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                  const priorityInfo = PRIORITY_CONFIG[req.priority || 'medium'];
                  const StatusIcon = statusInfo.icon;
                  const dateFormatted = new Date(req.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr
                      key={req.id}
                      className="hover:bg-surface-hover/60 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetail(req)}
                    >
                      {/* Contact Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                            {req.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-foreground block truncate group-hover:text-primary transition-colors">
                              {req.name}
                            </span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[180px]">
                                {req.email}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyEmail(req.email);
                                }}
                                title="Copy Email"
                                className="p-0.5 rounded text-muted-foreground hover:text-foreground"
                              >
                                {copiedEmail === req.email ? (
                                  <Check className="w-3 h-3 text-emerald-500" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Company & Team Size */}
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 font-medium text-foreground">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="truncate">{req.company || 'Enterprise Prospect'}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                            <Users className="w-3 h-3" />
                            <span>{req.teamSize} seats</span>
                          </div>
                        </div>
                      </td>

                      {/* Source */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-lg bg-secondary border border-border text-muted-foreground font-medium uppercase">
                          {req.source === 'demo_page' ? 'Demo Page' : req.source === 'contact_page' ? 'Contact Us' : req.source}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${priorityInfo.bg} ${priorityInfo.text} ${priorityInfo.border}`}
                        >
                          {priorityInfo.label}
                        </span>
                      </td>

                      {/* Submission Date */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {dateFormatted}
                        </span>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={req.status}
                          onChange={(e) => handleStatusChange(req.id, e.target.value as DemoRequestStatus)}
                          className={`text-xs font-bold px-2.5 py-1 rounded-xl border cursor-pointer focus:outline-none transition-colors ${statusInfo.bg} ${statusInfo.text} ${statusInfo.border}`}
                        >
                          <option value="pending">Pending</option>
                          <option value="contacted">Contacted</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="archived">Archived</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Direct Mailto */}
                          <a
                            href={`mailto:${req.email}?subject=Guild%20Orbit%20Demo%20Schedule&body=Hi%20${encodeURIComponent(req.name)},%0D%0A%0D%0AThank%20you%20for%20requesting%20a%20demo%20of%20Guild%20Orbit!`}
                            title="Send Email"
                            className="p-1.5 rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border-strong transition-all"
                          >
                            <Mail className="w-3.5 h-3.5" />
                          </a>

                          {/* Detail Button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(req)}
                            title="View Details & Notes"
                            className="p-1.5 rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border-strong transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => handleDeleteRequest(req.id)}
                            title="Delete Request"
                            className="p-1.5 rounded-lg border border-border bg-secondary/50 text-muted-foreground hover:text-rose-600 hover:border-rose-500/30 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail & Notes Drawer / Modal */}
      {isDetailModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="font-mono text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  DEMO REQUEST #{selectedRequest.id.slice(-8)}
                </span>
                <h2 className="text-lg font-bold text-foreground mt-0.5">{selectedRequest.name}</h2>
                <p className="text-xs text-muted-foreground">{selectedRequest.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="p-1.5 rounded-xl border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-secondary/50 border border-border text-xs">
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Company</span>
                <p className="font-semibold text-foreground">{selectedRequest.company || 'Not Specified'}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Team Size</span>
                <p className="font-semibold text-foreground">{selectedRequest.teamSize} users</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Source Channel</span>
                <p className="font-semibold text-foreground font-mono">{selectedRequest.source}</p>
              </div>
              <div>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">Submitted At</span>
                <p className="font-semibold text-foreground">
                  {new Date(selectedRequest.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Customer Message */}
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-foreground">Customer Message / Inquiry</span>
              <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                {selectedRequest.message ? selectedRequest.message : <span className="text-muted-foreground italic">No message provided with this request.</span>}
              </div>
            </div>

            {/* Status & Priority Controls */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Status</label>
                <select
                  value={selectedRequest.status}
                  onChange={(e) => {
                    const st = e.target.value as DemoRequestStatus;
                    handleStatusChange(selectedRequest.id, st);
                    setSelectedRequest({ ...selectedRequest, status: st });
                  }}
                  className="w-full p-2 rounded-xl bg-secondary/50 border border-border text-xs text-foreground font-semibold cursor-pointer focus:outline-none focus:border-primary"
                >
                  <option value="pending">Pending Review</option>
                  <option value="contacted">Contacted</option>
                  <option value="scheduled">Demo Scheduled</option>
                  <option value="completed">Completed / Won</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-foreground">Priority</label>
                <select
                  value={selectedRequest.priority || 'medium'}
                  onChange={async (e) => {
                    const pr = e.target.value as DemoRequestPriority;
                    await superAdminService.updateDemoRequestStatus(
                      selectedRequest.id,
                      selectedRequest.status,
                      undefined,
                      pr,
                      undefined,
                      actorEmail
                    );
                    setSelectedRequest({ ...selectedRequest, priority: pr });
                  }}
                  className="w-full p-2 rounded-xl bg-secondary/50 border border-border text-xs text-foreground font-semibold cursor-pointer focus:outline-none focus:border-primary"
                >
                  <option value="high">High (Enterprise)</option>
                  <option value="medium">Medium</option>
                  <option value="low">Standard</option>
                </select>
              </div>
            </div>

            {/* Internal Admin Notes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-foreground">Internal Follow-Up Notes</label>
                {notesSaveMessage && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    {notesSaveMessage}
                  </span>
                )}
              </div>
              <textarea
                rows={3}
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Log demo notes, scheduled date, team requirements, or lead qualification details..."
                className="w-full p-3 rounded-2xl bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:border-primary resize-none"
              />
              <button
                type="button"
                onClick={handleSaveNotes}
                disabled={isSavingNotes}
                className="px-3.5 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-xs hover:opacity-95 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSavingNotes ? 'Saving...' : 'Save Notes'}
              </button>
            </div>

            {/* Action Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <a
                href={`mailto:${selectedRequest.email}?subject=Guild%20Orbit%20Demo%20Schedule&body=Hi%20${encodeURIComponent(selectedRequest.name)},%0D%0A%0D%0AThank%20you%20for%20requesting%20a%20demo%20of%20Guild%20Orbit!`}
                className="px-4 py-2 rounded-xl bg-secondary hover:bg-surface-hover text-foreground text-xs font-bold flex items-center gap-2 transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-primary" />
                <span>Open Email Client</span>
              </a>

              <button
                type="button"
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Lead Entry Modal */}
      {isManualModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-foreground">Add Inbound Lead</h2>
                <p className="text-xs text-muted-foreground">
                  Record a demo request or direct inquiry received via phone, conference, or email.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="p-1 rounded-xl text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualLeadSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={manualForm.name}
                    onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                    placeholder="Jane Doe"
                    className="w-full p-2.5 rounded-xl bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={manualForm.email}
                    onChange={(e) => setManualForm({ ...manualForm, email: e.target.value })}
                    placeholder="jane@company.com"
                    className="w-full p-2.5 rounded-xl bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">Company Name</label>
                  <input
                    type="text"
                    value={manualForm.company}
                    onChange={(e) => setManualForm({ ...manualForm, company: e.target.value })}
                    placeholder="Acme Corp"
                    className="w-full p-2.5 rounded-xl bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-foreground">Team Size</label>
                  <select
                    value={manualForm.teamSize}
                    onChange={(e) => setManualForm({ ...manualForm, teamSize: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:border-primary cursor-pointer"
                  >
                    <option value="1-5">1-5 users</option>
                    <option value="5-20">5-20 users</option>
                    <option value="20-100">20-100 users</option>
                    <option value="100+">100+ Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-foreground">Lead Notes / Requirements</label>
                <textarea
                  rows={3}
                  value={manualForm.message}
                  onChange={(e) => setManualForm({ ...manualForm, message: e.target.value })}
                  placeholder="Notes from initial conversation..."
                  className="w-full p-2.5 rounded-xl bg-secondary/50 border border-border text-xs text-foreground focus:outline-none focus:border-primary resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsManualModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold cursor-pointer"
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

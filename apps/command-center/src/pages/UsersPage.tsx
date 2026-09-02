import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  Shield,
  UserCheck,
  Ban,
  Search,
  Key,
  ChevronDown,
  ChevronUp,
  Building2,
  Calendar,
  Clock,
  ShieldAlert,
} from 'lucide-react';
import {
  superAdminService,
  AdminUser,
} from '../services/superAdminService';
import { FilterToolbar, SelectOption } from '../components/common/FilterToolbar';
import { StatusBadge } from '../components/common/StatusBadge';
import { UserDetailDrawer } from '../components/users/UserDetailDrawer';

const ROLE_OPTIONS: SelectOption[] = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'member', label: 'Member' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'active', label: 'Active' },
  { value: 'banned', label: 'Banned' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'invited', label: 'Invited' },
];

type SortField = 'fullName' | 'email' | 'role' | 'organizationName' | 'createdAt' | 'lastLoginAt';
type SortOrder = 'asc' | 'desc';

export function UsersPage() {
  const [searchParams] = useSearchParams();
  const initialUserId = searchParams.get('id');

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Selected User for Drawer
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Subscribe to real-time users
  useEffect(() => {
    const unsub = superAdminService.subscribeToUsers((data) => {
      setUsers(data);
      if (initialUserId) {
        const found = data.find((u) => u.uid === initialUserId);
        if (found) {
          setSelectedUser(found);
          setIsDrawerOpen(true);
        }
      }
    });
    return () => unsub();
  }, [initialUserId]);

  // Keep selectedUser in sync with state updates
  useEffect(() => {
    if (selectedUser) {
      const updated = users.find((u) => u.uid === selectedUser.uid);
      if (updated) setSelectedUser(updated);
    }
  }, [users]);

  // Search & Filters
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.organizationName.toLowerCase().includes(q) ||
          u.uid.toLowerCase().includes(q) ||
          u.designation.toLowerCase().includes(q);
        if (!match) return false;
      }

      if (roleFilter !== 'all' && u.role !== roleFilter) {
        return false;
      }

      if (statusFilter !== 'all') {
        const userStatus = u.isBanned ? 'banned' : (u.status || 'active');
        if (userStatus !== statusFilter) return false;
      }

      return true;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Sorting
  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'createdAt') {
        valA = new Date(a.createdAt as any).getTime();
        valB = new Date(b.createdAt as any).getTime();
      } else if (sortField === 'lastLoginAt') {
        valA = a.lastLoginAt ? new Date(a.lastLoginAt as any).getTime() : 0;
        valB = b.lastLoginAt ? new Date(b.lastLoginAt as any).getTime() : 0;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredUsers, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleRowClick = (user: AdminUser) => {
    setSelectedUser(user);
    setIsDrawerOpen(true);
  };

  // Summary counts
  const totalOwners = users.filter((u) => u.role === 'owner').length;
  const totalAdmins = users.filter((u) => u.role === 'admin').length;
  const totalMembers = users.filter((u) => u.role === 'member' || u.role === 'manager').length;
  const totalBanned = users.filter((u) => u.isBanned || u.status === 'banned').length;

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Platform Users Directory
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Cross-tenant user registry, authentication providers, and access enforcement.
          </p>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-surface/80 border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Registered Users</span>
            <div className="text-lg font-extrabold text-foreground font-mono">{users.length}</div>
          </div>
          <Users className="w-5 h-5 text-primary opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-surface/80 border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Org Owners & Admins</span>
            <div className="text-lg font-extrabold text-foreground font-mono">
              {totalOwners + totalAdmins}
            </div>
          </div>
          <Shield className="w-5 h-5 text-accent opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-surface/80 border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Active Members</span>
            <div className="text-lg font-extrabold text-success font-mono">{totalMembers}</div>
          </div>
          <UserCheck className="w-5 h-5 text-success opacity-80" />
        </div>

        <div className="p-3.5 rounded-2xl bg-surface/80 border border-border flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase">Banned Accounts</span>
            <div className={`text-lg font-extrabold font-mono ${totalBanned > 0 ? 'text-danger' : 'text-foreground'}`}>
              {totalBanned}
            </div>
          </div>
          <Ban className={`w-5 h-5 opacity-80 ${totalBanned > 0 ? 'text-danger' : 'text-muted-foreground'}`} />
        </div>
      </div>

      {/* Filter Toolbar */}
      <FilterToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search users by name, email, username, org, UID..."
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        roleOptions={ROLE_OPTIONS}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        statusOptions={STATUS_OPTIONS}
        itemCount={sortedUsers.length}
        totalCount={users.length}
        itemLabel="users"
        hasActiveFilters={searchQuery !== '' || roleFilter !== 'all' || statusFilter !== 'all'}
        onClearFilters={() => {
          setSearchQuery('');
          setRoleFilter('all');
          setStatusFilter('all');
        }}
      />

      {/* High-Density Users Table */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono select-none">
                <th
                  onClick={() => toggleSort('fullName')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>User Profile</span>
                    {sortField === 'fullName' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('organizationName')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Workspace Tenancy</span>
                    {sortField === 'organizationName' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('role')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Role</span>
                    {sortField === 'role' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Provider</th>
                <th
                  onClick={() => toggleSort('createdAt')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>Joined</span>
                    {sortField === 'createdAt' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('lastLoginAt')}
                  className="py-3 px-4 cursor-pointer hover:text-foreground transition-colors text-right"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Last Login</span>
                    {sortField === 'lastLoginAt' && (sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-sans">
              {sortedUsers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-xs text-muted-foreground">
                    No users matched the specified search and filter criteria.
                  </td>
                </tr>
              ) : (
                sortedUsers.map((u) => {
                  const isBanned = u.isBanned || u.status === 'banned';

                  const joinedDateStr = u.createdAt
                    ? new Date(u.createdAt as any).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : '—';

                  const lastLoginStr = u.lastLoginAt
                    ? new Date(u.lastLoginAt as any).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    : 'Never';

                  return (
                    <tr
                      key={u.uid}
                      onClick={() => handleRowClick(u)}
                      className={`hover:bg-muted/40 transition-colors cursor-pointer group ${
                        isBanned ? 'bg-danger/5' : ''
                      }`}
                    >
                      {/* User Profile */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5 min-w-[200px]">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 border ${
                              isBanned
                                ? 'bg-danger/10 text-danger border-danger/30'
                                : 'bg-primary/10 text-primary border-primary/20'
                            }`}
                          >
                            {u.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-1.5">
                              <span>{u.fullName}</span>
                              {u.isPlatformAdmin && (
                                <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                  ADMIN
                                </span>
                              )}
                            </div>
                            <div className="font-mono text-[10px] text-muted-foreground truncate">
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Workspace Linkage */}
                      <td className="py-3 px-4">
                        <div className="min-w-[140px]">
                          <div className="font-semibold text-foreground truncate flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">{u.organizationName || 'Unassigned'}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground truncate">
                            {u.designation || 'Guild Member'}
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary text-foreground border border-border uppercase">
                          {u.role}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <StatusBadge status={isBanned ? 'banned' : u.status} />
                      </td>

                      {/* Auth Provider */}
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                          <Key className="w-3 h-3 text-muted-foreground" />
                          <span>{u.authProvider}</span>
                        </span>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3 px-4 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {joinedDateStr}
                      </td>

                      {/* Last Login */}
                      <td className="py-3 px-4 text-right font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {lastLoginStr}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(u);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-secondary hover:bg-surface-hover border border-border text-[11px] font-semibold text-foreground transition-all cursor-pointer shadow-xs"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Drawer */}
      <UserDetailDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        user={selectedUser}
      />
    </div>
  );
}

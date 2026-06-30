import * as React from "react";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  ChevronDown,
  ChevronLeft,
  Hash,
  LayoutDashboard,
  MessageSquare,
  Layers,
  CheckSquare,
  FileText,
  Calendar,
  Users,
  BarChart3,
  Bell,
  Settings,
  Plus,
  Terminal,
  LogOut,
  Loader2,
  FolderKanban,
  Target,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "../hooks/useAuth";
import { useChannels } from "../hooks/useChat";
import { useNotifications } from "../hooks/useNotifications";
import { useRequests } from "../hooks/useRequests";
import { getOrgById } from "../lib/firestore";
import { Organization } from "@guild/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  badge?: string | number;
  active?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}

// ─── NavItem ─────────────────────────────────────────────────────────────────

const NavItem = ({ icon: Icon, label, badge, active, collapsed, onClick }: NavItemProps) => {
  const inner = (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center rounded-xl text-xs font-semibold transition-all duration-300 ease-out relative group select-none",
        collapsed ? "justify-center px-0 py-2.5 h-9" : "justify-between px-3.5 py-2.5 h-10",
        active
          ? "bg-gradient-to-r from-primary/12 via-primary/3 to-transparent text-foreground border-l-2 border-primary shadow-[0_0_12px_color-mix(in_srgb,var(--accent)_5%,transparent)]"
          : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground hover:translate-x-0.5 border-l-2 border-transparent"
      )}
    >
      <div className={cn("flex items-center", collapsed ? "" : "gap-3")}>
        <Icon className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-300",
          active ? "text-primary" : "text-text-secondary group-hover:text-foreground group-hover:scale-105"
        )} />
        {!collapsed && <span className="truncate tracking-wide">{label}</span>}
      </div>
      {!collapsed && badge !== undefined && (
        <Badge
          variant="secondary"
          className="h-5 min-w-[20px] justify-center px-1 text-[9px] bg-primary text-primary-foreground font-bold shadow-[0_2px_6px_color-mix(in_srgb,var(--accent)_30%,transparent)] border-none rounded-lg"
        >
          {badge}
        </Badge>
      )}
      {/* Badge dot in collapsed mode */}
      {collapsed && badge !== undefined && (
        <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_color-mix(in_srgb,var(--accent)_60%,transparent)]" />
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={inner} />
        <TooltipContent side="right" className="font-semibold flex items-center gap-1.5 border border-border-default/50 bg-surface backdrop-blur-md">
          {label}
          {badge !== undefined && (
            <span className="bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return inner;
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { userProfile, logout } = useAuth();
  const orgId = userProfile?.organizationId;

  const { channels, hasUnread, loading: channelsLoading } = useChannels(orgId);
  const { unreadCount } = useNotifications(orgId);
  const { pendingCount: requestsPending } = useRequests(orgId);

  const [collapsed, setCollapsed] = React.useState(false);
  const [isChannelsOpen, setIsChannelsOpen] = React.useState(false);
  const [localOrg, setLocalOrg] = React.useState<Organization | null>(null);

  // Fetch org details
  React.useEffect(() => {
    if (!orgId) return;
    getOrgById(orgId).then((org) => { if (org) setLocalOrg(org); });
  }, [orgId]);

  const orgName = localOrg?.name || "";
  const orgPhotoURL = localOrg?.photoURL;
  const orgInitial = (orgName || "G")[0].toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const unreadChannels = channels.filter((ch) => hasUnread(ch)).length;

  return (
    <TooltipProvider delay={100}>
      <div
        className={cn(
          "group/sidebar relative flex h-full flex-col border-r border-border-default/35 bg-surface/10 backdrop-blur-3xl transition-all duration-300 ease-in-out overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.3)]",
          collapsed ? "w-[64px]" : "w-[260px]"
        )}
      >
        {/* Ambient mesh background glows */}
        <div className="absolute top-1/4 -left-12 h-36 w-36 rounded-full bg-primary/4 blur-[65px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-12 h-44 w-44 rounded-full bg-primary/5 blur-[85px] pointer-events-none" />

        {/* ── Header / Workspace ──────────────────────────────────────────── */}
        <div className={cn("shrink-0 pt-2.5 z-10", collapsed ? "px-2.5 pb-2" : "px-4 pb-2 pt-3")}>
          {collapsed ? (
            <div className="flex flex-col items-center gap-2">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-lg overflow-hidden bg-gradient-to-br from-primary to-primary/60 text-[11px] font-black text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer select-none border border-white/10">
                      {orgPhotoURL ? (
                        <img src={orgPhotoURL} alt={orgName} className="h-full w-full object-cover" />
                      ) : (
                        orgInitial
                      )}
                    </div>
                  }
                />
                <TooltipContent side="right" className="font-semibold border border-border-default/50 bg-surface backdrop-blur-md">
                  {orgName || "Organization"}
                </TooltipContent>
              </Tooltip>
              
              <button
                onClick={() => setCollapsed(false)}
                title="Expand sidebar"
                className="h-9 w-9 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/25 hover:bg-white/[0.04] text-text-secondary hover:text-foreground transition-all duration-300 shadow-md cursor-pointer outline-none"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <div className="flex-1 min-w-0">
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className={cn(
                      buttonVariants({ variant: "ghost" }),
                      "h-11 w-full justify-between gap-2 px-3 hover:bg-white/[0.04] border border-white/5 hover:border-primary/25 rounded-xl shadow-lg shadow-black/10 flex items-center transition-all duration-300 select-none outline-none cursor-pointer"
                    )}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg overflow-hidden bg-gradient-to-br from-primary to-primary/60 text-[10px] font-black text-primary-foreground shadow-lg shadow-primary/30 border border-white/10">
                        {orgPhotoURL ? (
                          <img src={orgPhotoURL} alt={orgName} className="h-full w-full object-cover" />
                        ) : (
                          orgInitial
                        )}
                      </div>
                      <div className="flex flex-col items-start leading-none overflow-hidden text-left">
                        <span className="text-xs font-extrabold text-foreground truncate max-w-[110px]">
                          {orgName || "Loading…"}
                        </span>
                        <span className="text-[9px] font-bold text-text-muted mt-0.5 tracking-wider uppercase">Premium</span>
                      </div>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-text-secondary transition-transform duration-300" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="start"
                    className="w-[200px] border-border-default/40 bg-surface/90 backdrop-blur-xl"
                  >
                    <DropdownMenuItem className="gap-2 font-semibold">
                      <div className="h-5 w-5 rounded overflow-hidden bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary border border-white/5">
                        {orgPhotoURL ? (
                          <img src={orgPhotoURL} alt={orgName} className="h-full w-full object-cover" />
                        ) : (
                          orgInitial
                        )}
                      </div>
                      {orgName}
                    </DropdownMenuItem>
                    <Separator className="my-1 bg-border/40" />
                    <DropdownMenuItem className="gap-2 text-text-muted font-medium" disabled>
                      <Plus className="h-4 w-4" /> Create Workspace
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <button
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-white/[0.02] border border-white/5 hover:border-primary/25 hover:bg-white/[0.04] text-text-secondary hover:text-foreground transition-all duration-300 shadow-lg shadow-black/10 cursor-pointer outline-none"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* ── Scrollable Nav ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide min-h-0 z-10">
          <nav className={cn("py-2.5 space-y-1", collapsed ? "px-2" : "px-3")}>

            {/* CATEGORY: MAIN HUB */}
            {!collapsed && (
              <p className="text-[8px] font-extrabold uppercase tracking-widest text-text-muted/40 px-3.5 pt-2.5 pb-1 select-none">
                Main Hub
              </p>
            )}
            <NavLink to="/" end>
              {({ isActive }) => (
                <NavItem icon={LayoutDashboard} label="Dashboard" active={isActive} collapsed={collapsed} />
              )}
            </NavLink>
            <NavLink to="/chat">
              {({ isActive }) => (
                <NavItem
                  icon={MessageSquare}
                  label="Chat"
                  active={isActive}
                  badge={unreadChannels > 0 ? unreadChannels : undefined}
                  collapsed={collapsed}
                />
              )}
            </NavLink>

            {/* Channels section — hidden when collapsed */}
            {!collapsed && (
              <div className="mt-2.5">
                <button
                  onClick={() => setIsChannelsOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-3.5 py-1.5 text-[9px] font-extrabold uppercase tracking-wider text-text-muted/50 transition-colors hover:text-foreground rounded-lg hover:bg-white/[0.02]"
                >
                  <span>Channels</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      !isChannelsOpen && "-rotate-90"
                    )}
                  />
                </button>
                <div className="mt-0.5 space-y-0.5 ml-1">
                  {channelsLoading ? (
                    <div className="flex items-center gap-2 px-3.5 py-2">
                      <Loader2 className="h-3 w-3 animate-spin text-text-muted" />
                      <span className="text-[9px] text-text-muted">Loading…</span>
                    </div>
                  ) : channels.length === 0 ? (
                    <p className="px-3.5 py-2 text-[9px] text-text-muted font-medium">No channels yet</p>
                  ) : (
                    channels.map((ch) => {
                      const unread = hasUnread(ch);
                      const isActive = location.pathname === `/chat/c/${ch.id}`;
                      
                      if (!isChannelsOpen && !isActive && !unread) return null;

                      return (
                        <NavLink
                          key={ch.id}
                          to={`/chat/c/${ch.id}`}
                          className={({ isActive }) =>
                            cn(
                              "group flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border-l-2 border-transparent select-none",
                              isActive
                                ? "bg-accent/40 text-foreground font-bold"
                                : unread
                                ? "text-foreground font-bold hover:bg-white/[0.02]"
                                : "text-muted-foreground hover:bg-white/[0.02] hover:text-foreground"
                            )
                          }
                        >
                          <Hash className={cn("h-3.5 w-3.5 shrink-0 transition-colors", isActive ? "text-primary" : "text-text-secondary group-hover:text-foreground")} />
                          <span className="flex-1 truncate tracking-wide">{ch.name}</span>
                          {unread && (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                          )}
                        </NavLink>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* Collapsed: single indicator for chat channels */}
            {collapsed && unreadChannels > 0 && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <div className="flex justify-center py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--accent)]" />
                    </div>
                  }
                />
                <TooltipContent side="right" className="border border-border-default/50 bg-surface backdrop-blur-md">
                  {unreadChannels} unread channel{unreadChannels > 1 ? "s" : ""}
                </TooltipContent>
              </Tooltip>
            )}

            {/* CATEGORY: PRODUCTIVITY */}
            {!collapsed && (
              <p className="text-[8px] font-extrabold uppercase tracking-widest text-text-muted/40 px-3.5 pt-4 pb-1 select-none">
                Productivity
              </p>
            )}
            <NavLink to="/workspace">
              {({ isActive }) => (
                <NavItem icon={LayoutGrid} label="Workspace" active={isActive} collapsed={collapsed} />
              )}
            </NavLink>
            <NavLink to="/requests">
              {({ isActive }) => (
                <NavItem
                  icon={Layers}
                  label="Requests"
                  active={isActive}
                  badge={requestsPending > 0 ? requestsPending : undefined}
                  collapsed={collapsed}
                />
              )}
            </NavLink>
            <NavLink to="/calendar">
              {({ isActive }) => (
                <NavItem icon={Calendar} label="Calendar" active={isActive} collapsed={collapsed} />
              )}
            </NavLink>

            {/* CATEGORY: DIRECTORY & DATA */}
            {!collapsed && (
              <p className="text-[8px] font-extrabold uppercase tracking-widest text-text-muted/40 px-3.5 pt-4 pb-1 select-none">
                Directory & Data
              </p>
            )}
            <NavLink to="/people">
              {({ isActive }) => (
                <NavItem icon={Users} label="People" active={isActive} collapsed={collapsed} />
              )}
            </NavLink>
            <NavLink to="/reports">
              {({ isActive }) => (
                <NavItem icon={BarChart3} label="Reports" active={isActive} collapsed={collapsed} />
              )}
            </NavLink>
          </nav>
        </div>

        {/* ── Bottom Section (Cockpit Tray) ────────────────────────────────── */}
        <div className={cn(
          "shrink-0 z-10",
          collapsed 
            ? "px-2 py-3 space-y-1.5 border-t border-border-default/35" 
            : "p-3 border-t border-border-default/20 bg-white/[0.01] dark:bg-black/10 backdrop-blur-md rounded-2xl m-2.5 shadow-xl shadow-black/10 border border-white/5 space-y-2"
        )}>
          {/* Notifications + Settings */}
          <div className={cn("space-y-0.5", collapsed && "flex flex-col items-center gap-0.5")}>
            <NavItem
              icon={Bell}
              label="Notifications"
              badge={unreadCount > 0 ? unreadCount : undefined}
              collapsed={collapsed}
            />
            <NavLink to="/settings">
              {({ isActive }) => (
                <NavItem icon={Settings} label="Settings" active={isActive} collapsed={collapsed} />
              )}
            </NavLink>
            {(userProfile?.role === 'owner' || userProfile?.role === 'admin') && (
              <NavItem 
                icon={Shield} 
                label="Admin Panel" 
                collapsed={collapsed} 
                onClick={() => window.open("https://admin.guildorbit.com", "_blank", "noopener,noreferrer")}
              />
            )}
          </div>

          {/* User Profile Card */}
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="relative h-8 w-8 rounded-full overflow-hidden border border-white/10 mx-auto cursor-pointer shadow-md mt-1 mb-1">
                    {userProfile?.photoURL ? (
                      <img src={userProfile.photoURL} alt={userProfile.fullName || 'User'} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                        {(userProfile?.fullName || 'U')[0].toUpperCase()}
                      </div>
                    )}
                  </div>
                }
              />
              <TooltipContent side="right" className="border border-border-default/50 bg-surface backdrop-blur-md">
                <div className="flex flex-col">
                  <span className="text-xs font-bold">{userProfile?.fullName}</span>
                  <span className="text-[9px] text-text-muted">@{userProfile?.username}</span>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-white/[0.02] dark:bg-white/[0.01] border border-white/5 shadow-inner mt-1 mb-1">
              <div className="relative h-8 w-8 rounded-full overflow-hidden border border-white/10 shrink-0">
                {userProfile?.photoURL ? (
                  <img src={userProfile.photoURL} alt={userProfile.fullName || 'User'} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {(userProfile?.fullName || 'U')[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0 leading-none">
                <span className="text-xs font-extrabold text-foreground truncate">{userProfile?.fullName}</span>
                <span className="text-[9px] text-text-muted mt-1 truncate">@{userProfile?.username || 'user'}</span>
              </div>
            </div>
          )}

          {!collapsed && <Separator className="bg-border/25" />}

          {/* Footer row */}
          <div
            className={cn(
              "flex items-center",
              collapsed ? "flex-col gap-2 pt-1" : "justify-between px-2 py-1"
            )}
          >
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.55)]" />
                <span className="text-[10px] font-bold text-text-muted">Guild v1.0.0</span>
              </div>
            )}
            <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button className="text-text-secondary hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-white/[0.04] outline-none border border-transparent hover:border-white/5 cursor-pointer">
                      <Terminal className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                {collapsed && <TooltipContent side="right" className="border border-border-default/50 bg-surface backdrop-blur-md">Console</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={handleLogout}
                      className="text-text-secondary hover:text-destructive transition-colors p-1.5 rounded-lg hover:bg-destructive/10 outline-none border border-transparent hover:border-destructive/10 cursor-pointer"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                {collapsed && <TooltipContent side="right" className="border border-border-default/50 bg-surface backdrop-blur-md">Sign out</TooltipContent>}
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  badge?: string | number;
  active?: boolean;
  collapsed?: boolean;
}

// ─── NavItem ─────────────────────────────────────────────────────────────────

const NavItem = ({ icon: Icon, label, badge, active, collapsed }: NavItemProps) => {
  const inner = (
    <button
      className={cn(
        "flex w-full items-center rounded-lg text-sm font-medium transition-all duration-150 relative group",
        collapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2",
        active
          ? "bg-primary/15 text-primary shadow-sm"
          : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
      )}
    >
      <div className={cn("flex items-center", collapsed ? "" : "gap-3")}>
        <Icon className={cn("h-4 w-4 shrink-0", active && "text-primary")} />
        {!collapsed && <span className="truncate">{label}</span>}
      </div>
      {!collapsed && badge !== undefined && (
        <Badge
          variant="secondary"
          className="h-5 min-w-[20px] justify-center px-1 text-[10px] bg-primary/20 border-none text-primary font-bold"
        >
          {badge}
        </Badge>
      )}
      {/* Badge dot in collapsed mode */}
      {collapsed && badge !== undefined && (
        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-primary" />
      )}
    </button>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger render={inner} />
        <TooltipContent side="right" className="font-medium flex items-center gap-1.5">
          {label}
          {badge !== undefined && (
            <span className="bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
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
  const [orgName, setOrgName] = React.useState<string>("");

  // Fetch org name
  React.useEffect(() => {
    if (!orgId) return;
    getOrgById(orgId).then((org) => { if (org) setOrgName(org.name); });
  }, [orgId]);

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
          "group/sidebar relative flex h-full flex-col border-r border-border-default bg-sidebar transition-all duration-300 ease-in-out",
          collapsed ? "w-[60px]" : "w-[260px]"
        )}
      >
        {/* ── Collapse Toggle ─────────────────────────────────────────────── */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={cn(
            "absolute top-6 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border-default bg-background shadow-sm text-muted-foreground hover:text-foreground hover:bg-accent hover:border-border transition-all duration-300",
            collapsed ? "-right-3" : "-right-3 opacity-0 group-hover/sidebar:opacity-100"
          )}
        >
          <ChevronLeft
            className={cn(
              "h-3.5 w-3.5 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
        </button>

        {/* ── Header / Workspace ──────────────────────────────────────────── */}
        <div className={cn("shrink-0 pt-2", collapsed ? "px-2 pb-2" : "px-4 pb-2 pt-3")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger
                render={
                  <div className="flex h-9 w-9 mx-auto items-center justify-center rounded-lg bg-primary text-[11px] font-bold text-primary-foreground shadow-lg shadow-primary/20 cursor-pointer select-none">
                    {orgInitial}
                  </div>
                }
              />
              <TooltipContent side="right" className="font-semibold">
                {orgName || "Organization"}
              </TooltipContent>
            </Tooltip>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger
                className={cn(
                  buttonVariants({ variant: "ghost" }),
                  "h-10 w-full justify-between gap-2 px-2 hover:bg-accent/30 flex items-center"
                )}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground shadow-lg shadow-primary/20">
                    {orgInitial}
                  </div>
                  <div className="flex flex-col items-start leading-none overflow-hidden">
                    <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                      {orgName || "Loading…"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Premium Plan</span>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[200px] border-border-default bg-popover/90 backdrop-blur-md"
              >
                <DropdownMenuItem className="gap-2">
                  <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    {orgInitial}
                  </div>
                  {orgName}
                </DropdownMenuItem>
                <Separator className="my-1 bg-border/40" />
                <DropdownMenuItem className="gap-2 text-muted-foreground" disabled>
                  <Plus className="h-4 w-4" /> Create Workspace
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* ── Scrollable Nav ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide min-h-0">
          <nav className={cn("py-2 space-y-0.5", collapsed ? "px-2" : "px-3")}>

            {/* Primary nav */}
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
              <div className="mt-3">
                <button
                  onClick={() => setIsChannelsOpen((v) => !v)}
                  className="flex w-full items-center justify-between px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground rounded-md hover:bg-accent/20"
                >
                  <span>Channels</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform duration-200",
                      !isChannelsOpen && "-rotate-90"
                    )}
                  />
                </button>
                <div className="mt-1 space-y-0.5 ml-1">
                  {channelsLoading ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <Loader2 className="h-3 w-3 animate-spin text-text-muted" />
                      <span className="text-[10px] text-text-muted">Loading…</span>
                    </div>
                  ) : channels.length === 0 ? (
                    <p className="px-3 py-2 text-[10px] text-text-muted">No channels yet</p>
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
                                "group flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                                isActive
                                  ? "bg-accent/50 text-foreground"
                                  : unread
                                  ? "text-foreground font-semibold hover:bg-accent/20"
                                  : "text-muted-foreground hover:bg-accent/20 hover:text-foreground"
                              )
                            }
                          >
                            <Hash className="h-3 w-3 shrink-0 group-hover:text-primary transition-colors" />
                            <span className="flex-1 truncate">{ch.name}</span>
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

            {/* Collapsed: single icon for chat channels */}
            {collapsed && unreadChannels > 0 && (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <div className="flex justify-center py-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>
                  }
                />
                <TooltipContent side="right">
                  {unreadChannels} unread channel{unreadChannels > 1 ? "s" : ""}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Divider */}
            <div className={cn("my-2", collapsed ? "px-1" : "")}>
              <Separator className="bg-border/20" />
            </div>

            {/* Secondary nav */}
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

        {/* ── Bottom Section ──────────────────────────────────────────────── */}
        <div className={cn("shrink-0 border-t border-border-default", collapsed ? "px-2 py-3 space-y-1" : "p-4 space-y-3")}>
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
          </div>

          {!collapsed && <Separator className="bg-border/20" />}

          {/* Footer row */}
          <div
            className={cn(
              "flex items-center",
              collapsed ? "flex-col gap-2 pt-1" : "justify-between px-2 py-1"
            )}
          >
            {!collapsed && (
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                <span className="text-[10px] font-medium text-muted-foreground">Guild v1.0.0</span>
              </div>
            )}
            <div className={cn("flex items-center gap-2", collapsed && "flex-col")}>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-accent/30">
                      <Terminal className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                {collapsed && <TooltipContent side="right">Console</TooltipContent>}
              </Tooltip>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <button
                      onClick={handleLogout}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1 rounded-md hover:bg-destructive/10"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  }
                />
                {collapsed && <TooltipContent side="right">Sign out</TooltipContent>}
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

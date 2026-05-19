import * as React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  ChevronDown, 
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
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from '../hooks/useAuth';
import { useChannels } from '../hooks/useChat';
import { useNotifications } from '../hooks/useNotifications';
import { useRequests } from '../hooks/useRequests';
import { getOrgById } from '../lib/firestore';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  badge?: string | number;
  active?: boolean;
}

const NavItem = ({ icon: Icon, label, badge, active }: NavItemProps) => (
  <button
    className={cn(
      "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-all duration-200",
      active 
        ? "bg-accent/50 text-accent-foreground shadow-sm" 
        : "text-muted-foreground hover:bg-accent/30 hover:text-foreground"
    )}
  >
    <div className="flex items-center gap-3">
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
    {badge !== undefined && (
      <Badge variant="secondary" className="h-5 min-w-[20px] justify-center px-1 text-[10px] bg-accent/50 border-none text-foreground">
        {badge}
      </Badge>
    )}
  </button>
);

export function Sidebar() {
  const navigate = useNavigate();
  const { userProfile, logout } = useAuth();
  const orgId = userProfile?.organizationId;

  const { channels, hasUnread, loading: channelsLoading } = useChannels(orgId);
  const { unreadCount } = useNotifications(orgId);
  const { pendingCount: requestsPending } = useRequests(orgId);

  const [isChannelsOpen, setIsChannelsOpen] = React.useState(true);
  const [orgName, setOrgName] = React.useState<string>('');

  // Fetch org name
  React.useEffect(() => {
    if (!orgId) return;
    getOrgById(orgId).then((org) => { if (org) setOrgName(org.name); });
  }, [orgId]);

  const orgInitial = (orgName || 'G')[0].toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Total unread channels count
  const unreadChannels = channels.filter((ch) => hasUnread(ch)).length;

  return (
    <div className="flex h-full w-[260px] flex-col border-r border-border/40 bg-sidebar transition-colors duration-300">
      {/* Header/Workspace Switcher */}
      <div className="p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost" }), "h-10 w-full justify-between gap-2 px-2 hover:bg-accent/30 flex items-center justify-between gap-2")}>
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground shadow-lg shadow-primary/20">
                  {orgInitial}
                </div>
                <div className="flex flex-col items-start leading-none">
                  <span className="text-sm font-semibold text-foreground truncate max-w-[140px]">
                    {orgName || 'Loading…'}
                  </span>
                  <span className="text-[10px] text-muted-foreground text-left">Premium Plan</span>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[200px] border-border/40 bg-popover/90 backdrop-blur-md">
            <DropdownMenuItem className="gap-2">
              <div className="h-5 w-5 rounded bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">{orgInitial}</div>
              {orgName}
            </DropdownMenuItem>
            <Separator className="my-1 bg-border/40" />
            <DropdownMenuItem className="gap-2 text-muted-foreground" disabled>
              <Plus className="h-4 w-4" /> Create Workspace
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1 py-4">
          <NavLink to="/" end>
            {({ isActive }) => <NavItem icon={LayoutDashboard} label="Dashboard" active={isActive} />}
          </NavLink>
          <NavLink to="/chat">
            {({ isActive }) => (
              <NavItem
                icon={MessageSquare}
                label="Chat"
                active={isActive}
                badge={unreadChannels > 0 ? unreadChannels : undefined}
              />
            )}
          </NavLink>
          
          {/* Channels Section */}
          <div className="mt-4">
            <button 
              onClick={() => setIsChannelsOpen(!isChannelsOpen)}
              className="flex w-full items-center justify-between px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
            >
              <span>Channels</span>
              <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", !isChannelsOpen && "-rotate-90")} />
            </button>
            {isChannelsOpen && (
              <div className="mt-1 space-y-0.5 ml-1">
                {channelsLoading ? (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground/30" />
                    <span className="text-[10px] text-muted-foreground/30">Loading…</span>
                  </div>
                ) : channels.length === 0 ? (
                  <p className="px-3 py-2 text-[10px] text-muted-foreground/40">No channels yet</p>
                ) : (
                  channels.map((ch) => {
                    const unread = hasUnread(ch);
                    return (
                      <NavLink
                        key={ch.id}
                        to={`/chat/c/${ch.id}`}
                        className={({ isActive }) => cn(
                          "group flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium transition-all",
                          isActive
                            ? "bg-accent/50 text-foreground"
                            : unread
                            ? "text-foreground font-semibold hover:bg-accent/20"
                            : "text-muted-foreground hover:bg-accent/20 hover:text-foreground"
                        )}
                      >
                        <Hash className="h-3 w-3 transition-colors group-hover:text-primary" />
                        <span className="flex-1">{ch.name}</span>
                        {unread && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                        )}
                      </NavLink>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-1">
            <NavLink to="/tasks">
              {({ isActive }) => <NavItem icon={CheckSquare} label="Tasks" active={isActive} />}
            </NavLink>
            <NavLink to="/requests">
              {({ isActive }) => (
                <NavItem
                  icon={Layers}
                  label="Requests"
                  active={isActive}
                  badge={requestsPending > 0 ? requestsPending : undefined}
                />
              )}
            </NavLink>
            <NavItem icon={FileText} label="Files" />
            <NavItem icon={Calendar} label="Calendar" />
            <NavLink to="/people">
              {({ isActive }) => <NavItem icon={Users} label="People" active={isActive} />}
            </NavLink>
            <NavItem icon={BarChart3} label="Reports" />
          </div>
        </nav>
      </ScrollArea>

      {/* Bottom Sidebar */}
      <div className="p-4 space-y-4">
        {/* Upgrade Card */}
        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-primary/5 p-4 transition-all hover:bg-primary/10">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-foreground">Guild Pro</p>
            <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">Unlock advanced ops and team controls.</p>
            <Button size="sm" className="mt-3 h-7 w-full rounded-md text-[10px] font-bold">
              Upgrade Now
            </Button>
          </div>
          <Sparkles className="absolute -right-2 -top-2 h-12 w-12 text-primary/10" />
        </div>

        <div className="space-y-1">
          <NavItem icon={Bell} label="Notifications" badge={unreadCount > 0 ? unreadCount : undefined} />
          <NavItem icon={Settings} label="Settings" />
        </div>

        <Separator className="bg-border/20" />
        
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-medium text-muted-foreground">Guild v1.0.0</span>
          </div>
          <div className="flex items-center gap-2">
             <button className="text-muted-foreground hover:text-foreground transition-colors">
               <Terminal className="h-3 w-3" />
             </button>
             <button
               onClick={handleLogout}
               className="text-muted-foreground hover:text-destructive transition-colors"
               title="Sign out"
             >
               <LogOut className="h-3 w-3" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import * as React from "react";
import { 
  Calendar, 
  MessageSquare, 
  Plus, 
  ArrowRight,
  TrendingUp,
  Clock,
  UserPlus,
  ArrowUpRight,
  Upload
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const ScheduleItem = ({ time, title, tag, color }: { time: string, title: string, tag: string, color: string }) => (
  <div className="group relative flex gap-4 pb-6 last:pb-0">
    <div className="absolute bottom-0 left-1.5 top-0 w-px bg-border group-last:hidden" />
    <div className={`mt-1.5 h-3 w-3 rounded-full border-2 border-zinc-950 ring-2 ring-zinc-950 ${color} z-10`} />
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{time}</span>
      <span className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors cursor-pointer">{title}</span>
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" className="px-1.5 py-0 text-[9px] font-medium bg-muted/20 border-border/40 text-muted-foreground lowercase">
          #{tag}
        </Badge>
      </div>
    </div>
  </div>
);

const ActivityItem = ({ user, action, target, time }: { user: string, action: string, target: string, time: string }) => (
  <div className="flex items-start gap-3 py-3 border-b border-border/20 last:border-0 hover:bg-muted/10 transition-colors px-2 rounded-lg -mx-2 cursor-pointer group">
    <Avatar className="h-6 w-6 border border-border/40 shrink-0">
      <AvatarImage src={`https://i.pravatar.cc/100?u=${user}`} referrerPolicy="no-referrer" />
      <AvatarFallback className="text-[10px] bg-zinc-800">{user[0]}</AvatarFallback>
    </Avatar>
    <div className="flex flex-col gap-0.5 overflow-hidden">
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground group-hover:text-primary transition-colors">{user}</span> {action} <span className="text-foreground">{target}</span>
      </p>
      <span className="text-[9px] text-muted-foreground/60">{time}</span>
    </div>
  </div>
);

const QuickAction = ({ icon: Icon, label }: { icon: React.ElementType, label: string }) => (
  <Button variant="outline" className="h-10 justify-start gap-2.5 bg-muted/10 border-border/40 hover:bg-muted/30 hover:border-primary/30 transition-all text-xs grup">
    <Icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
    <span className="text-foreground font-medium">{label}</span>
    <ArrowRight className="ml-auto h-3 w-3 text-muted-foreground/30 group-hover:text-primary/50 group-hover:translate-x-0.5 transition-all" />
  </Button>
);

export function RightSidebar() {
  return (
    <aside className="flex h-full w-[300px] flex-col border-l border-border/40 bg-card/20 transition-colors duration-300">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-8">
          {/* Upcoming Schedule */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Schedule</h3>
              <Button variant="ghost" size="sm" className="h-6 text-[10px] text-primary hover:bg-primary/5">
                View Calendar
              </Button>
            </div>
            <div className="space-y-1">
              <ScheduleItem time="10:00 AM" title="Team Standup" tag="general" color="bg-indigo-500" />
              <ScheduleItem time="11:30 AM" title="Product Roadmap Review" tag="product" color="bg-orange-500" />
              <ScheduleItem time="02:00 PM" title="Client Discovery Call" tag="sales" color="bg-emerald-500" />
              <ScheduleItem time="04:30 PM" title="Design Peer Review" tag="design" color="bg-blue-500" />
            </div>
          </section>

          {/* Quick Actions */}
          <section>
             <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <QuickAction icon={Plus} label="Create Task" />
              <QuickAction icon={ArrowUpRight} label="New Request" />
              <QuickAction icon={MessageSquare} label="Send Message" />
              <QuickAction icon={Upload} label="Upload File" />
              <QuickAction icon={UserPlus} label="Invite Teammate" />
            </div>
          </section>

          {/* Activity Feed */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground">Activity</h3>
              <TrendingUp className="h-3 w-3 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <ActivityItem user="Sarah Chen" action="completed" target="v2 Landing Page" time="15m ago" />
              <ActivityItem user="Leo Park" action="uploaded" target="Design Systems.pdf" time="2h ago" />
              <ActivityItem user="Elena" action="commented on" target="Sprint #4" time="4h ago" />
              <ActivityItem user="Marcus" action="joined" target="Ops Team" time="1d ago" />
            </div>
          </section>
        </div>
      </ScrollArea>
    </aside>
  );
}

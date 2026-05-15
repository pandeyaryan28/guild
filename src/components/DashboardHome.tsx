import { 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  Users, 
  ArrowUpRight,
  MoreHorizontal,
  Plus,
  Filter,
  Search
} from "lucide-react";
import { motion } from "motion/react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const MetricCard = ({ title, value, subtitle, icon: Icon, color, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ y: -4 }}
    className="group"
  >
    <Card className="overflow-hidden border-border/40 bg-card/40 transition-all hover:bg-card/60 hover:shadow-2xl hover:shadow-primary/5">
      <CardContent className="p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className={`p-2.5 rounded-xl bg-opacity-10 ${color} shadow-inner`}>
            <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">{title}</p>
        </div>
        <div>
          <h3 className="text-3xl font-bold tracking-tight text-foreground">{value}</h3>
          <p className="text-xs text-muted-foreground mt-1 font-medium">{subtitle}</p>
        </div>
        <div className="h-1 w-full bg-muted/20 rounded-full overflow-hidden">
          <div className={`h-full ${color} opacity-60 w-1/3`} />
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const TaskItem = ({ title, status, priority, user, date }: any) => (
  <div className="group flex items-center justify-between py-4 border-b border-border/20 last:border-0 hover:bg-muted/5 px-4 -mx-4 rounded-xl transition-all cursor-pointer">
    <div className="flex items-center gap-4">
      <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center group-hover:border-primary transition-colors">
        <div className="h-2 w-2 rounded-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div>
        <h4 className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{title}</h4>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline" className="h-4 text-[9px] px-1.5 font-bold uppercase tracking-wider bg-muted/10 border-border/40 text-muted-foreground">
            {priority}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{date}</span>
        </div>
      </div>
    </div>
    <div className="flex items-center gap-3">
      <Avatar className="h-6 w-6 border border-border/40">
        <AvatarImage src={`https://i.pravatar.cc/100?u=${user}`} />
        <AvatarFallback className="text-[8px] bg-zinc-800">{user[0]}</AvatarFallback>
      </Avatar>
      <MoreHorizontal className="h-4 w-4 text-muted-foreground/50 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
  </div>
);

const ApprovalItem = ({ title, requester, amount, status }: any) => (
  <div className="group flex items-center justify-between py-4 border-b border-border/20 last:border-0 hover:bg-muted/5 px-4 -mx-4 rounded-xl transition-all cursor-pointer">
     <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center border border-border/40 group-hover:bg-primary/10 transition-colors">
          <Clock className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div>
          <h4 className="text-[13px] font-medium text-foreground group-hover:text-primary transition-colors">{title}</h4>
          <p className="text-[10px] text-muted-foreground font-medium">Requested by {requester}</p>
        </div>
     </div>
     <div className="text-right">
       <span className="text-xs font-bold text-foreground">{amount}</span>
       <div className="flex items-center gap-1.5 justify-end mt-1">
         <div className="h-1.5 w-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
         <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Pending</span>
       </div>
     </div>
  </div>
);

export function DashboardHome() {
  return (
    <div className="space-y-10 p-10 pb-20">
      {/* Hero */}
      <section className="flex items-end justify-between">
        <div className="space-y-1">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-4xl font-bold tracking-tight text-foreground transition-all duration-700"
          >
            Good morning, Arjun <span className="inline-block animate-bounce-subtle">👋</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-muted-foreground text-sm font-medium"
          >
            Here's what is happening in Acme Corp today.
          </motion.p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-10 bg-muted/20 border-border/40 text-xs font-bold gap-2">
            <Filter className="h-3.5 w-3.5" /> Filter
          </Button>
          <Button className="h-10 shadow-lg shadow-primary/20 text-xs font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground border-none">
             <Plus className="h-4 w-4" /> New Request
          </Button>
        </div>
      </section>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="My Tasks" 
          value="12" 
          subtitle="Due this week" 
          icon={CheckCircle2} 
          color="bg-indigo-500" 
          delay={0.2}
        />
        <MetricCard 
          title="Approvals" 
          value="5" 
          subtitle="Waiting for you" 
          icon={Clock} 
          color="bg-amber-500" 
          delay={0.3}
        />
        <MetricCard 
          title="Team Updates" 
          value="23" 
          subtitle="New updates" 
          icon={Users} 
          color="bg-emerald-500" 
          delay={0.4}
        />
        <MetricCard 
          title="Unread" 
          value="8" 
          subtitle="Across channels" 
          icon={MessageSquare} 
          color="bg-blue-500" 
          delay={0.5}
        />
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Tasks Section */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm shadow-xl shadow-black/5 xl:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-foreground">My Tasks</CardTitle>
              <CardDescription className="text-xs font-medium">Focused tasks for today</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold text-primary hover:bg-primary/5">
              View All
            </Button>
          </CardHeader>
          <CardContent>
             <Tabs defaultValue="all" className="w-full">
                <TabsList className="bg-muted/20 border border-border/40 h-8 p-1 mb-4">
                  <TabsTrigger value="all" className="text-[10px] font-bold px-4 h-6">ALL (12)</TabsTrigger>
                  <TabsTrigger value="today" className="text-[10px] font-bold px-4 h-6">DUE TODAY (3)</TabsTrigger>
                  <TabsTrigger value="progress" className="text-[10px] font-bold px-4 h-6">IN PROGRESS (5)</TabsTrigger>
                </TabsList>
                <div className="mt-4">
                  <TaskItem title="Update product roadmap" priority="High" user="Sarah" date="May 21" />
                  <TaskItem title="Design landing page for feature X" priority="Medium" user="Leo" date="May 22" />
                  <TaskItem title="Fix auth flow bug" priority="High" user="Elena" date="May 22" />
                  <TaskItem title="Prepare monthly OPS report" priority="Low" user="Arjun" date="May 24" />
                </div>
                <Button variant="ghost" className="w-full mt-4 h-10 border-dashed border border-border/40 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted/10 transition-all">
                  <Plus className="h-3.5 w-3.5 mr-2" /> Add new task
                </Button>
             </Tabs>
          </CardContent>
        </Card>

        {/* Pending Approvals */}
        <Card className="border-border/40 bg-card/40 backdrop-blur-sm shadow-xl shadow-black/5">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-foreground">Pending Approvals</CardTitle>
              <CardDescription className="text-xs font-medium">Requests needing your signature</CardDescription>
            </div>
             <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold text-primary hover:bg-primary/5">
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <ApprovalItem title="MacBook Pro M3 - Budget" requester="Rohan" amount="₹2,45,000" status="pending" />
              <ApprovalItem title="Q2 Marketing Assets" requester="Neha" amount="₹1,20,000" status="pending" />
              <ApprovalItem title="Figma Annual Subscription" requester="Design Team" amount="₹45,000" status="pending" />
              <ApprovalItem title="Offsite Event Logistics" requester="Kavya" amount="₹85,000" status="pending" />
            </div>
            <div className="mt-6 p-4 rounded-xl border border-dashed border-border/40 bg-muted/5 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">More in progress</p>
                <div className="flex -space-x-2">
                   {[1,2,3,4].map(i => (
                     <Avatar key={i} className="h-6 w-6 border-2 border-zinc-950">
                       <AvatarImage src={`https://i.pravatar.cc/100?u=user${i}`} />
                       <AvatarFallback className="text-[8px]">{i}</AvatarFallback>
                     </Avatar>
                   ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Conversations */}
        <Card className="border-border/40 bg-card/40 bg-dashboard-grid backdrop-blur-sm shadow-xl shadow-black/5 xl:col-span-2">
           <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold text-foreground">Recent Conversations</CardTitle>
              <CardDescription className="text-xs font-medium">Late-breaking discussions across channels</CardDescription>
            </div>
             <Button variant="ghost" size="sm" className="h-8 text-[11px] font-bold text-primary hover:bg-primary/5">
              Open Chat
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
               {[
                 { channel: 'product', user: 'Leo', msg: 'The new wireframes are looking solid. I think we can proceed with the high fidelity designs next week.', time: '12m ago', unread: 2 },
                 { channel: 'operations', user: 'Neha', msg: 'Budget approved for the MacBook Pro. Rohan can go ahead and place the order today.', time: '45m ago', unread: 0 },
                 { channel: 'general', user: 'Sarah', msg: 'Dont forget about the offsite meeting tomorrow at 10 AM! We need everyone to be present.', time: '2h ago', unread: 1 },
                 { channel: 'marketing', user: 'Marcus', msg: 'The campaign analytics are finally in. We saw a 30% increase in lead generation this week.', time: '5h ago', unread: 0 }
               ].map((chat, i) => (
                 <div key={i} className="group relative flex items-center justify-between py-5 border-b border-border/20 last:border-0 hover:bg-muted/5 px-4 -mx-4 rounded-xl transition-all cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 rounded-xl bg-muted/20 flex items-center justify-center border border-border/40 shrink-0">
                         <Badge variant="outline" className="h-6 w-6 p-0 border-none bg-transparent">
                           <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                         </Badge>
                      </div>
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-foreground">#{chat.channel}</span>
                          <span className="h-1 w-1 rounded-full bg-muted-foreground/30" />
                          <span className="text-[10px] text-muted-foreground font-medium">{chat.user}</span>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">{chat.msg}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-[10px] text-muted-foreground/60">{chat.time}</span>
                      {chat.unread > 0 && (
                        <div className="h-4 w-4 rounded-full bg-primary flex items-center justify-center animate-pulse">
                          <span className="text-[9px] font-bold text-primary-foreground">{chat.unread}</span>
                        </div>
                      )}
                    </div>
                 </div>
               ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

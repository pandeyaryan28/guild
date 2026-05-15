import { 
  Search, 
  Bell, 
  HelpCircle, 
  Command, 
  Plus,
  Moon,
  Sun
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavbarProps {
  toggleTheme: () => void;
  currentTheme: "dark" | "light";
}

export function Navbar({ toggleTheme, currentTheme }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-border/40 bg-background/20 px-6 backdrop-blur-md">
      <div className="flex items-center gap-4">
        {/* Command Search */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-muted-foreground transition-colors group-focus-within:text-foreground" />
          </div>
          <Input 
            className="h-9 w-64 md:w-96 rounded-full border-border/40 bg-muted/30 pl-10 pr-12 text-xs transition-all focus:bg-muted/50 focus:ring-1 focus:ring-primary/20"
            placeholder="Search tasks, chat, people..."
          />
          <div className="absolute inset-y-0 right-3 flex items-center gap-1 pointer-events-none">
            <Command className="h-3 w-3 text-muted-foreground/50" />
            <span className="text-[10px] font-medium text-muted-foreground/50">K</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent/40 hover:text-foreground">
          <Plus className="h-4 w-4" />
        </Button>
        
        <div className="h-4 w-px bg-border/40 mx-1" />
        
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-muted-foreground hover:bg-accent/40 hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2.5 top-2.5 flex h-2 w-2 rounded-full bg-primary ring-2 ring-zinc-950" />
        </Button>
        
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent/40 hover:text-foreground">
          <HelpCircle className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9 rounded-full text-muted-foreground hover:bg-accent/40 hover:text-foreground">
          {currentTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <div className="ml-2 flex items-center gap-2 pl-2 border-l border-border/40 cursor-pointer group">
          <div className="flex flex-col items-end mr-1">
            <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">Arjun Mehta</span>
            <span className="text-[10px] text-muted-foreground">Admin</span>
          </div>
          <Avatar className="h-8 w-8 border border-border/40 shadow-sm transition-transform group-hover:scale-105 active:scale-95">
            <AvatarImage src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100&h=100&fit=crop" referrerPolicy="no-referrer" />
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">AM</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

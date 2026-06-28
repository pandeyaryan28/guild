import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Users2, 
  ClipboardList, 
  Settings, 
  LogOut,
  X,
  Menu,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import type { UserProfile } from '@guild/types';
import { signOut } from 'firebase/auth';
import { auth } from '@guild/firebase';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface MobileAdminLayoutProps {
  profile: UserProfile;
  activeSection: string;
  onNavigate: (section: string) => void;
  children: React.ReactNode;
}

export function MobileAdminLayout({ profile, activeSection, onNavigate, children }: MobileAdminLayoutProps) {
  const [showMobileMore, setShowMobileMore] = React.useState(false);

  const initials = profile.fullName
    ? profile.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : profile.username.slice(0, 2).toUpperCase();

  const handleLogout = () => {
    signOut(auth);
  };

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'people', label: 'People', icon: Users },
    { id: 'teams', label: 'Teams', icon: Users2 },
    { id: 'work', label: 'Work', icon: ClipboardList },
  ];

  return (
    <div className="aether-app-container flex flex-col h-[100dvh] w-full overflow-hidden select-none bg-background relative">
      {/* 1. Shifting Aurora background */}
      <div className="aether-aurora" />

      {/* 2. Top Spatial admin control bar */}
      <header className="flex h-14 w-full items-center justify-between px-5 shrink-0 z-30 border-b border-white/5 bg-surface/40 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span 
            className="text-sm font-black tracking-widest text-gradient uppercase bg-gradient-to-r from-violet-500 to-indigo-500"
          >
            Guild Orbit
          </span>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest opacity-80 border-l border-white/10 pl-2">
            {activeSection}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Avatar Profile */}
          <div 
            onClick={() => onNavigate('settings')}
            className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[10px] text-white border border-white/20 dark:border-white/10 shadow-md active:scale-90 transition-all cursor-pointer"
            style={{
              background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
            }}
          >
            {initials}
          </div>
        </div>
      </header>

      {/* 3. Main Workspace Scrollable Container */}
      <main className="flex-1 overflow-y-auto aether-scroll relative px-4 pt-4 pb-[88px] z-10 scrollbar-hide">
        {children}
      </main>

      {/* 4. Sleek bottom menu bar dock */}
      <div className="fixed bottom-4 left-4 right-4 z-40 select-none pointer-events-none flex justify-center">
        <div 
          className="aether-glass py-2.5 px-4 flex items-center justify-between w-full max-w-md shadow-2xl pointer-events-auto bg-surface/80 dark:bg-surface/75 backdrop-blur-2xl border border-white/10"
          style={{ borderRadius: '24px' }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "relative flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer",
                  isActive ? "text-white" : "text-muted-foreground/80 hover:text-foreground"
                )}
              >
                {isActive && (
                  <motion.div 
                    layoutId="adminActiveTab"
                    className="absolute inset-0 bg-primary rounded-xl shadow-lg shadow-primary/20 z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center justify-center">
                  <Icon className="w-5 h-5" />
                </span>
              </button>
            );
          })}

          {/* Settings / More Trigger */}
          <button
            onClick={() => setShowMobileMore(true)}
            className="relative flex items-center justify-center w-12 h-12 rounded-xl transition-all cursor-pointer text-muted-foreground/80 hover:text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* More Panel Bottom sheet */}
      <AnimatePresence>
        {showMobileMore && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileMore(false)}
              className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[200] pointer-events-auto"
            />
            
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed bottom-0 left-0 right-0 max-h-[85vh] aether-glass rounded-t-[32px] border-x-0 border-b-0 border-t border-white/10 px-6 pb-8 pt-2 z-[210] shadow-2xl flex flex-col pointer-events-auto bg-white/85 dark:bg-white/[0.05] backdrop-blur-3xl"
            >
              <div className="aether-mobile-handle shrink-0 bg-white/10 w-10 h-1.5 rounded-full mx-auto my-3" />
              
              <div className="flex-1 overflow-y-auto aether-scroll space-y-6 pb-6 pr-1">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/[0.03] border border-white/5 shadow-inner">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div 
                      className="w-11 h-11 rounded-full flex items-center justify-center font-extrabold text-xs text-white border-2 border-white/20 shadow-md shrink-0"
                      style={{
                        background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
                      }}
                    >
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-foreground block truncate leading-none">
                        {profile.fullName || profile.username}
                      </span>
                      <span className="text-[9px] font-bold text-text-muted capitalize block mt-1 tracking-wider">
                        {profile.role} • Admin Panel
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowMobileMore(false)}
                    className="h-8 w-8 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-muted-foreground cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="space-y-1">
                  <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/60 px-2 pb-1.5 select-none">
                    Admin Directory
                  </div>
                  {[
                    { id: 'settings', label: 'Workspace Settings', icon: Settings }
                  ].map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        setShowMobileMore(false);
                        onNavigate(item.id);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3.5 rounded-xl px-4 py-3 text-xs font-bold transition-all border select-none cursor-pointer",
                        activeSection === item.id
                          ? "bg-primary border-primary/20 text-white shadow-md"
                          : "bg-white/[0.02] border-white/5 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <item.icon className="w-4.5 h-4.5 shrink-0" />
                      <span className="flex-1 tracking-wide">{item.label}</span>
                      <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
                    </div>
                  ))}
                </div>
                
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setShowMobileMore(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 text-red-400 py-3.5 text-xs font-black tracking-widest transition-all active:scale-98 cursor-pointer shadow-lg select-none"
                  >
                    <LogOut className="w-4.5 h-4.5 shrink-0" />
                    <span>TERMINATE ADMIN SESSION</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}

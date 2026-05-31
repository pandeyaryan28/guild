import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, 
  Settings, 
  LogOut, 
  Palette, 
  Lock, 
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Download,
  Share2
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import { usePwaInstall } from '../../../hooks/usePwaInstall';
import { cn } from '@/lib/utils';

export function MobileSettings() {
  const navigate = useNavigate();
  const { userProfile, logout } = useAuth();
  const { themeId, setTheme, themes } = useTheme();
  const { isInstallable, isStandalone, isIOS, install } = usePwaInstall();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const initials = userProfile?.fullName
    ? userProfile.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U';

  return (
    <div className="flex flex-col space-y-5 animate-fluid-pop pb-6">
      
      {/* Profile Info Header */}
      <div className="aether-glass p-5 bg-white/2 border border-white/5 flex items-center gap-4">
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center font-extrabold text-sm text-white border-2 border-white/20 dark:border-white/10 shadow-md shrink-0 select-none animate-float"
          style={{
            background: `linear-gradient(135deg, var(--accent) 0%, oklch(from var(--accent) calc(l - 0.15) c h) 100%)`
          }}
        >
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <span className="text-sm font-black text-foreground block truncate">{userProfile?.fullName || 'Guild Member'}</span>
          <span className="text-[10px] text-muted-foreground block mt-1 font-bold tracking-wider uppercase opacity-85">
            Role: {userProfile?.role || 'Member'}
          </span>
          <span className="text-[9px] text-primary block mt-0.5 font-bold tracking-widest uppercase">
            Active Workspace Member
          </span>
        </div>
      </div>

      {/* Mobile Settings Install PWA App Panel */}
      {isInstallable && !isStandalone && (
        <div className="aether-glass p-5 space-y-4 bg-primary/5 border border-primary/20 shadow-md">
          <div className="flex items-center gap-2 border-b border-primary/20 pb-2.5">
            <Download className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Dedicated Application</span>
          </div>
          
          <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed">
            Install Guild on your mobile home screen to enjoy zero browser chrome, optimized safe areas, and seamless offline updates.
          </p>

          {isIOS ? (
            <div className="text-[9px] font-bold text-muted-foreground flex items-center gap-1.5 bg-white/5 border border-white/10 px-3 py-2 rounded-xl justify-center">
              <Share2 className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Tap Safari Share &rarr; <b>"Add to Home Screen"</b></span>
            </div>
          ) : (
            <button
              onClick={install}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary/95 text-white text-[10px] font-black tracking-widest transition-all active:scale-95 cursor-pointer shadow-md"
            >
              INSTALL APP NOW
            </button>
          )}
        </div>
      )}
 
      {/* Cosmic Theme selector Panel */}
      <div className="aether-glass p-5 space-y-4 bg-white/2 border border-white/5">
        <div className="flex items-center gap-2 border-b border-white/5 pb-2.5">
          <Palette className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Cosmic Theme Customization</span>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {themes.filter(t => t.id !== 'light').map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={cn(
                "h-10 rounded-xl border-2 flex items-center justify-center hover:scale-[1.02] active:scale-95 transition-all relative cursor-pointer",
                themeId === t.id ? 'border-primary shadow-lg shadow-primary/25' : 'border-white/10'
              )}
              style={{ background: t.swatch }}
            >
              {themeId === t.id && (
                <div className="h-2 w-2 rounded-full bg-white shadow-md animate-fluid-pop" />
              )}
            </button>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground font-semibold italic text-center pt-1 leading-normal">
          Swipe and tap any Cosmic Canvas to adjust the ambient shifting mesh aurora in real-time.
        </p>
      </div>

      {/* Account Settings Menu stack */}
      <div className="aether-glass p-4 bg-white/2 border border-white/5 divide-y divide-white/5">
        {[
          { icon: User, label: 'Edit Profile Details', detail: 'Update name, title and avatar status' },
          { icon: Lock, label: 'Account Security', detail: 'Manage sign-in settings and sessions' },
          { icon: Sparkles, label: 'Visual Interface Preference', detail: 'Control ambient grid and glow properties' }
        ].map((item, idx) => (
          <div key={idx} className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1 cursor-pointer active:scale-[0.99] transition-all">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-muted-foreground shrink-0">
                <item.icon className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-foreground block">{item.label}</span>
                <span className="text-[9px] text-muted-foreground block truncate mt-0.5 font-semibold">{item.detail}</span>
              </div>
            </div>
            <ChevronRight className="w-4.5 h-4.5 text-muted-foreground/30 shrink-0" />
          </div>
        ))}
      </div>

      {/* Logout Trigger button */}
      <div className="pt-2">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-2xl bg-red-500/10 hover:bg-red-500/15 border border-red-500/25 text-red-400 py-3.5 text-xs font-black tracking-widest transition-all active:scale-98 cursor-pointer shadow-lg shadow-red-500/5 select-none"
        >
          <LogOut className="w-4.5 h-4.5 shrink-0" />
          <span>TERMINATE USER SESSION</span>
        </button>
      </div>

    </div>
  );
}

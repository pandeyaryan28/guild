import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
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
  Share2,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useTheme } from '../../../hooks/useTheme';
import { usePwaInstall } from '../../../hooks/usePwaInstall';
import { updateUserProfile } from '../../../lib/firestore';
import { sendPasswordReset } from '../../../lib/auth';
import { AnimatePresence, motion } from 'motion/react';
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

  // Interactive slide-up bottom sheets states
  const [editProfileOpen, setEditProfileOpen] = React.useState(false);
  const [accountSecurityOpen, setAccountSecurityOpen] = React.useState(false);

  // Edit Profile Form States
  const [fullName, setFullName] = React.useState(userProfile?.fullName || '');
  const [username, setUsername] = React.useState(userProfile?.username || '');
  const [designation, setDesignation] = React.useState(userProfile?.designation || '');
  const [employeeId, setEmployeeId] = React.useState(userProfile?.employeeId || '');
  const [age, setAge] = React.useState(userProfile?.age ? String(userProfile.age) : '');
  const [saving, setSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Sync state if userProfile loaded after mount
  React.useEffect(() => {
    if (userProfile) {
      setFullName(userProfile.fullName || '');
      setUsername(userProfile.username || '');
      setDesignation(userProfile.designation || '');
      setEmployeeId(userProfile.employeeId || '');
      setAge(userProfile.age ? String(userProfile.age) : '');
    }
  }, [userProfile]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile?.uid || saving) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await updateUserProfile(userProfile.uid, {
        fullName: fullName.trim(),
        username: username.trim(),
        designation: designation.trim(),
        employeeId: employeeId.trim(),
        age: age ? Number(age) : 0
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setEditProfileOpen(false);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setSaveError(err.message || 'Failed to update profile details.');
    } finally {
      setSaving(false);
    }
  };

  // Password reset states
  const [resetLoading, setResetLoading] = React.useState(false);
  const [resetCooldown, setResetCooldown] = React.useState(0);
  const [resetMessage, setResetMessage] = React.useState('');
  const [resetMessageType, setResetMessageType] = React.useState<'success' | 'error'>('success');

  React.useEffect(() => {
    if (resetCooldown <= 0) return;
    const timer = setInterval(() => {
      setResetCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resetCooldown]);

  const handleSendPasswordReset = async () => {
    if (!userProfile?.email || resetCooldown > 0) return;
    setResetLoading(true);
    setResetMessage('');
    try {
      await sendPasswordReset(userProfile.email);
      setResetCooldown(60);
      setResetMessageType('success');
      setResetMessage('Reset instructions sent to your email.');
    } catch (err: any) {
      setResetMessageType('error');
      setResetMessage(err.message || 'Failed to send password reset instructions.');
    } finally {
      setResetLoading(false);
    }
  };

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
      <div id="cosmic-themes" className="aether-glass p-5 space-y-4 bg-white/2 border border-white/5">
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
          { icon: User, label: 'Edit Profile Details', detail: 'Update name, title and avatar status', onClick: () => setEditProfileOpen(true) },
          { icon: Lock, label: 'Account Security', detail: 'Manage sign-in settings and sessions', onClick: () => setAccountSecurityOpen(true) },
          { icon: Sparkles, label: 'Visual Interface Preference', detail: 'Control ambient grid and glow properties', onClick: () => document.getElementById('cosmic-themes')?.scrollIntoView({ behavior: 'smooth' }) }
        ].map((item, idx) => (
          <div 
            key={idx} 
            onClick={item.onClick}
            className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1 cursor-pointer active:scale-[0.99] transition-all"
          >
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

      {/* Slide-Up Bottom Drawer Sheets */}
      {createPortal(
        <AnimatePresence>
          {/* Edit Profile Sheet */}
          {editProfileOpen && (
            <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/75 backdrop-blur-xs">
              {/* Backdrop */}
              <div className="absolute inset-0 bg-transparent" onClick={() => setEditProfileOpen(false)} />
              
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="w-full max-h-[92vh] aether-glass rounded-t-[32px] border-x-0 border-b-0 border-t border-white/10 px-6 pb-8 pt-3 flex flex-col bg-surface/98 backdrop-blur-3xl overflow-hidden pointer-events-auto"
              >
                <div className="w-10 h-1.5 rounded-full bg-white/10 mx-auto mb-4 shrink-0" />
                
                <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
                  <span className="text-xs font-black text-foreground flex items-center gap-2">
                    <User className="w-4.5 h-4.5 text-primary" />
                    <span>EDIT PROFILE DETAILS</span>
                  </span>
                  <button 
                    onClick={() => setEditProfileOpen(false)}
                    className="h-7 w-7 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="flex-1 overflow-y-auto space-y-4 pt-4 pb-2 pr-1 text-left">
                  {saveSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-xl flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>PROFILE UPDATED SUCCESSFULLY!</span>
                    </div>
                  )}
                  {saveError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-bold rounded-xl flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 animate-bounce" />
                      <span>{saveError.toUpperCase()}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black tracking-widest uppercase text-muted-foreground">Full Name</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black tracking-widest uppercase text-muted-foreground">Username</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all font-bold"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black tracking-widest uppercase text-muted-foreground">Designation</label>
                    <input
                      type="text"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all font-bold"
                      placeholder="Lead Engineer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black tracking-widest uppercase text-muted-foreground">Employee ID</label>
                    <input
                      type="text"
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all font-bold"
                      placeholder="G-1025"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black tracking-widest uppercase text-muted-foreground">Age</label>
                    <input
                      type="number"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-all font-bold"
                      placeholder="26"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={saving || !fullName.trim() || !username.trim()}
                    className="w-full py-3.5 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-[10px] font-black tracking-widest uppercase active:scale-[0.98] transition-all cursor-pointer shadow-lg mt-3"
                  >
                    {saving ? 'SAVING CHANGES...' : 'SAVE PROFILE DETAILS'}
                  </button>
                </form>
              </motion.div>
            </div>
          )}

          {/* Account Security Sheet */}
          {accountSecurityOpen && (
            <div className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/75 backdrop-blur-xs">
              {/* Backdrop */}
              <div className="absolute inset-0 bg-transparent" onClick={() => setAccountSecurityOpen(false)} />
              
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 220 }}
                className="w-full aether-glass rounded-t-[32px] border-x-0 border-b-0 border-t border-white/10 px-6 pb-8 pt-3 flex flex-col bg-surface/98 backdrop-blur-3xl overflow-hidden pointer-events-auto"
              >
                <div className="w-10 h-1.5 rounded-full bg-white/10 mx-auto mb-4 shrink-0" />
                
                <div className="flex items-center justify-between border-b border-white/5 pb-3 shrink-0">
                  <span className="text-xs font-black text-foreground flex items-center gap-2">
                    <Lock className="w-4.5 h-4.5 text-primary" />
                    <span>ACCOUNT SECURITY & RESET</span>
                  </span>
                  <button 
                    onClick={() => setAccountSecurityOpen(false)}
                    className="h-7 w-7 rounded-full border border-white/5 bg-white/5 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-4 pt-6 text-center pb-2">
                  <p className="text-[10px] text-muted-foreground font-semibold leading-relaxed max-w-[300px] mx-auto">
                    To secure your workspace, click the button below. We will send a secure password reset link directly to your pre-authorized email address:
                    <br />
                    <span className="text-foreground font-bold font-mono text-xs">{userProfile?.email}</span>
                  </p>

                  {resetMessage && (
                    <div className={cn(
                      "p-3 text-[10px] font-bold rounded-xl border max-w-sm mx-auto animate-fluid-pop",
                      resetMessageType === 'success' 
                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                    )}>
                      {resetMessage.toUpperCase()}
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={handleSendPasswordReset}
                      disabled={resetLoading || resetCooldown > 0}
                      className="w-full max-w-sm py-3.5 rounded-2xl bg-primary hover:bg-primary/90 disabled:opacity-50 text-white text-[10px] font-black tracking-widest uppercase active:scale-[0.98] transition-all cursor-pointer shadow-lg"
                    >
                      {resetLoading ? 'SENDING INSTRUCTIONS...' : resetCooldown > 0 ? `RESET EMAILED (${resetCooldown}s)` : 'SEND PASSWORD RESET LINK'}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}

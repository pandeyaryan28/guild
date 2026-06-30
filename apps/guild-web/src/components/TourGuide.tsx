import * as React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Target, 
  MessageSquare, 
  Trello, 
  FileCheck, 
  Users, 
  Settings, 
  HelpCircle 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { updateUserProfile } from '../lib/firestore';
import { cn } from '@/lib/utils';

interface TourStep {
  title: string;
  content: string;
  route: string;
  targetId?: string; // HTML element ID to highlight
  icon: React.ComponentType<any>;
  valueTip: string;
}

export function TourGuide() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userProfile } = useAuth();
  
  // Use sessionStorage to persist tour state across lazy unmounts/page refreshes
  const [currentStepIndex, setCurrentStepIndex] = React.useState<number>(() => {
    const saved = sessionStorage.getItem('guild-tour-step');
    return saved ? parseInt(saved, 10) : -1;
  });

  const [highlightRect, setHighlightRect] = React.useState<DOMRect | null>(null);
  const [isDismissed, setIsDismissed] = React.useState(false);

  const handleSetStepIndex = (indexOrFn: number | ((prev: number) => number)) => {
    setCurrentStepIndex((prev) => {
      const nextIndex = typeof indexOrFn === 'function' ? indexOrFn(prev) : indexOrFn;
      sessionStorage.setItem('guild-tour-step', String(nextIndex));
      return nextIndex;
    });
  };

  // If tour is completed or dismissed, don't show it
  const isTourCompleted = userProfile?.tourCompleted ?? false;
  
  const role = userProfile?.role ?? 'member';
  const isAdmin = role === 'owner' || role === 'admin';

  // Define steps based on role
  const steps = React.useMemo<TourStep[]>(() => {
    const commonSteps: TourStep[] = [
      {
        title: "Workspace Command Center",
        content: "Track your personal tasks, manage your availability, set focus goals, and see which teammates are currently online.",
        route: "/",
        targetId: "tour-nav-dashboard",
        icon: Target,
        valueTip: "Start here each morning to set your goals and align with the team."
      },
      {
        title: "Async Team Chat",
        content: "Communicate with your team in dedicated, structured channels or coordinate directly via secure DMs.",
        route: "/chat",
        targetId: "tour-nav-chat",
        icon: MessageSquare,
        valueTip: "Eliminate messy email threads by bringing chats right into your workspace."
      },
      {
        title: "Operational Kanban Boards",
        content: "Create, assign, prioritize, and track tasks. Move items from 'Todo' to 'Done' to maintain team-wide transparency.",
        route: "/workspace",
        targetId: "tour-nav-workspace",
        icon: Trello,
        valueTip: "Visual project tracking ensures clear accountability across the team."
      },
      {
        title: "Operational Approvals",
        content: "Easily submit and track requests like leave of absence, purchases, or operational approvals.",
        route: "/requests",
        targetId: "tour-nav-requests",
        icon: FileCheck,
        valueTip: "Keep approvals structured to unblock projects and avoid delays."
      }
    ];

    if (isAdmin) {
      commonSteps.push({
        title: "Workspace Controls",
        content: "Configure your organization, manage team roles, invite new members, and manage your billing settings.",
        route: "/settings",
        targetId: "tour-nav-settings",
        icon: Settings,
        valueTip: "As an admin, you hold the keys to optimizing the team's operational configurations."
      });
    } else {
      commonSteps.push({
        title: "Team Directory",
        content: "Browse the directory, view teammate profile details, roles, designations, and easily coordinate.",
        route: "/people",
        targetId: "tour-nav-people",
        icon: Users,
        valueTip: "Access user profiles and check the organization structure at any time."
      });
    }

    return commonSteps;
  }, [isAdmin]);

  const handleFinish = async () => {
    if (!user?.uid) return;
    setIsDismissed(true);
    sessionStorage.removeItem('guild-tour-step');
    try {
      await updateUserProfile(user.uid, { tourCompleted: true });
    } catch (err) {
      console.error('Failed to complete onboarding tour:', err);
    }
  };

  // Synchronize routing and target element bounding rects
  React.useEffect(() => {
    if (isDismissed || isTourCompleted) return;

    if (currentStepIndex === -1) {
      setHighlightRect(null);
      // If we are on welcome, make sure they are on '/' route to start
      if (location.pathname !== '/') {
        navigate('/');
      }
      return;
    }

    const step = steps[currentStepIndex];
    if (!step) return;

    // Navigate programmatically if needed
    if (location.pathname !== step.route) {
      navigate(step.route);
    }

    // Locate the DOM element and set highlight rect
    let attempts = 0;
    const updateRect = () => {
      if (!step.targetId) {
        setHighlightRect(null);
        return;
      }
      const el = document.getElementById(step.targetId);
      if (el) {
        setHighlightRect(el.getBoundingClientRect());
      } else if (attempts < 15) {
        attempts++;
        setTimeout(updateRect, 100);
      }
    };

    updateRect();

    // Event listener for viewport changes
    const handleResize = () => {
      if (step.targetId) {
        const el = document.getElementById(step.targetId);
        if (el) setHighlightRect(el.getBoundingClientRect());
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [currentStepIndex, steps, navigate, location.pathname, isDismissed, isTourCompleted]);

  // If tour shouldn't be rendered, return null
  if (isTourCompleted || isDismissed) return null;

  const currentStep = steps[currentStepIndex];

  // Tooltip positioning variables
  // Centered position (Welcome screen) uses absolute boundaries with auto margins
  // to avoid CSS transform conflicts with Framer Motion animations.
  const tooltipStyle: React.CSSProperties = highlightRect
    ? {
        position: 'fixed',
        left: highlightRect.right + 24,
        top: Math.max(16, Math.min(window.innerHeight - 340, highlightRect.top - 48)),
        width: '320px',
        zIndex: 50,
      }
    : {
        position: 'fixed',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        margin: 'auto',
        width: '380px',
        height: 'fit-content',
        zIndex: 50,
      };

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-50">
      {/* 1. Backdrop Overlay (blocks clicks behind the tooltip during tour, except on tooltip itself) */}
      <div className="fixed inset-0 bg-[#020617]/55 backdrop-blur-[2px] pointer-events-auto z-40" />

      {/* 2. Target Highlighter Border */}
      <AnimatePresence>
        {highlightRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed border-2 border-indigo-500 rounded-2xl pointer-events-none z-50 shadow-[0_0_24px_rgba(99,102,241,0.45),0_0_0_9999px_rgba(2,6,23,0.35)]"
            style={{
              left: highlightRect.left - 6,
              top: highlightRect.top - 6,
              width: highlightRect.width + 12,
              height: highlightRect.height + 12,
            }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />
        )}
      </AnimatePresence>

      {/* 3. Tour Step Tooltip Card */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: highlightRect ? 0 : 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={cn(
            "border shadow-2xl p-6 rounded-3xl pointer-events-auto text-left relative overflow-hidden transition-all duration-300",
            "bg-white border-slate-200/90 text-slate-900 shadow-indigo-900/5",
            "dark:bg-slate-900 dark:border-white/10 dark:text-white dark:shadow-indigo-500/10"
          )}
          style={tooltipStyle}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          role="dialog"
          aria-labelledby="tour-step-title"
        >
          {/* Subtle glowing ambient lights inside tooltip */}
          <div className="absolute -right-16 -top-16 w-32 h-32 rounded-full bg-indigo-500/10 dark:bg-indigo-500/5 blur-xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-32 h-32 rounded-full bg-purple-500/10 dark:bg-purple-500/5 blur-xl pointer-events-none" />

          {/* Close/Skip cross button */}
          <button 
            onClick={handleFinish}
            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-white hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title="Skip Tour"
          >
            <X className="h-4 w-4" />
          </button>

          {currentStepIndex === -1 ? (
            /* Welcome Screen */
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 dark:border-indigo-500/30 flex items-center justify-center mx-auto shadow-inner animate-pulse">
                <Sparkles className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="space-y-2">
                <h2 id="tour-step-title" className="text-base font-black uppercase tracking-widest leading-snug">
                  Welcome to Guild!
                </h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed px-2">
                  Let's take a quick 1-minute tour of your new operational command workspace.
                </p>
              </div>
              
              <div className="pt-3 flex flex-col gap-2">
                <button
                  onClick={() => handleSetStepIndex(0)}
                  className="w-full h-9 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md hover:scale-[1.02] active:scale-98 cursor-pointer flex items-center justify-center gap-1"
                >
                  Start Tour
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={handleFinish}
                  className="w-full h-8 text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:text-slate-400 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  Skip and explore on my own
                </button>
              </div>
            </div>
          ) : (
            /* Tour Steps */
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7.5 h-7.5 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/20 dark:border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  {currentStep && React.createElement(currentStep.icon, { className: "w-4 h-4" })}
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                  <h2 id="tour-step-title" className="text-sm font-black uppercase tracking-wide truncate leading-tight">
                    {currentStep.title}
                  </h2>
                </div>
              </div>

              <p className="text-xs font-semibold text-slate-600 dark:text-slate-200/90 leading-relaxed">
                {currentStep.content}
              </p>

              {/* Value Highlight Tip Box */}
              <div className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-[11px] leading-relaxed text-indigo-700 dark:text-indigo-300 font-semibold flex gap-2">
                <HelpCircle className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0 mt-0.5" />
                <span>{currentStep.valueTip}</span>
              </div>

              {/* Step Navigation & Action Buttons */}
              <div className="pt-3 flex items-center justify-between gap-4 border-t border-slate-100 dark:border-white/5">
                {/* Progress Dots */}
                <div className="flex items-center gap-1.5">
                  {steps.map((_, idx) => (
                    <div 
                      key={idx}
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        currentStepIndex === idx 
                          ? "w-4 bg-indigo-600 dark:bg-indigo-400" 
                          : "w-1.5 bg-slate-200 dark:bg-white/20"
                      )}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSetStepIndex(prev => prev - 1)}
                    disabled={currentStepIndex === 0}
                    className={cn(
                      "h-8 w-8 rounded-lg border flex items-center justify-center transition-all active:scale-95 cursor-pointer",
                      "border-slate-200 text-slate-500 hover:bg-slate-100/80 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed",
                      "dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5 dark:disabled:hover:bg-transparent"
                    )}
                    title="Back"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  {currentStepIndex < steps.length - 1 ? (
                    <button
                      onClick={() => handleSetStepIndex(prev => prev + 1)}
                      className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow hover:scale-102 active:scale-98 cursor-pointer"
                    >
                      Next
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleFinish}
                      className="h-8 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow hover:scale-102 active:scale-98 cursor-pointer"
                    >
                      Finish
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

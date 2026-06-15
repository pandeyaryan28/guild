import { APP_URL } from '../../config/landingData';
import { useNavigation } from '../../context/NavigationContext';

export function Footer() {
  const { navigate } = useNavigation();

  const handleNav = (
    e: React.MouseEvent<HTMLAnchorElement>,
    path: string,
  ) => {
    e.preventDefault();
    navigate(path);
  };

  return (
    <footer className="w-full bg-slate-50/20 border-t border-slate-150 py-16 px-6 relative z-10 grid-pattern">
      <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-8">
        
        {/* Brand Column */}
        <div className="col-span-2 flex flex-col gap-4">
          <a
            href="/"
            onClick={(e) => handleNav(e, '/')}
            className="flex items-center gap-2.5"
          >
            <img
              src="/logo.png"
              alt="Guild Orbit"
              className="h-7 w-7 rounded-lg"
            />
            <span className="text-base font-bold text-slate-900 tracking-tight">Guild Orbit</span>
          </a>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-sm">
            The lightweight coordination platform for small & mid-sized teams to unify task boards, department chat, and operational requests.
          </p>
          <span className="text-[11px] text-slate-400 font-bold mt-2">
            © 2026 Guild Orbit Inc. All rights reserved.
          </span>
        </div>

        {/* Column 2: Product */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Product</span>
          <div className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
            <a href="/features/work-tracking" onClick={(e) => handleNav(e, '/features/work-tracking')} className="hover:text-indigo-600 transition-colors">Tasks & Kanban</a>
            <a href="/features/team-chat" onClick={(e) => handleNav(e, '/features/team-chat')} className="hover:text-indigo-600 transition-colors">Team Channels</a>
            <a href="/features/approvals" onClick={(e) => handleNav(e, '/features/approvals')} className="hover:text-indigo-600 transition-colors">Approvals Log</a>
            <a href="/features/visibility" onClick={(e) => handleNav(e, '/features/visibility')} className="hover:text-indigo-600 transition-colors">Shared Directory</a>
          </div>
        </div>

        {/* Column 3: Resources */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Resources</span>
          <div className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
            <a href="/pricing" onClick={(e) => handleNav(e, '/pricing')} className="hover:text-indigo-600 transition-colors">Pricing Plans</a>
            <a href="/faq" onClick={(e) => handleNav(e, '/faq')} className="hover:text-indigo-600 transition-colors">Help FAQ</a>
            <a href="/onboarding" onClick={(e) => handleNav(e, '/')} className="hover:text-indigo-600 transition-colors">Onboarding Guide</a>
            <a href="/demo" onClick={(e) => handleNav(e, '/faq')} className="hover:text-indigo-600 transition-colors">Watch Demo</a>
          </div>
        </div>

        {/* Column 4: Account */}
        <div className="flex flex-col gap-3">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Account</span>
          <div className="flex flex-col gap-2 text-xs font-semibold text-slate-500">
            <a href={`${APP_URL}/login`} className="hover:text-indigo-600 transition-colors">Sign In</a>
            <a href={`${APP_URL}/signup`} className="hover:text-indigo-600 transition-colors">Sign Up Free</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</a>
          </div>
        </div>

      </div>
    </footer>
  );
}

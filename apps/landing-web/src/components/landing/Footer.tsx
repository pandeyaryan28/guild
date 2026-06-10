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
    <footer className="max-w-5xl mx-auto px-6 py-10 border-t border-line">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-5">
          <a
            href="/"
            onClick={(e) => handleNav(e, '/')}
            className="flex items-center gap-2"
          >
            <img
              src="/logo.png"
              alt="Guild Orbit"
              className="h-6 w-6 rounded-md"
            />
            <span className="text-sm font-semibold text-ink">Guild Orbit</span>
          </a>
          <span className="hidden sm:inline text-xs text-ink-faint">
            © 2026 Guild Orbit Inc.
          </span>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-faint">
          <a
            href="/features"
            onClick={(e) => handleNav(e, '/features')}
            className="hover:text-ink transition-colors"
          >
            Features
          </a>
          <a
            href="/pricing"
            onClick={(e) => handleNav(e, '/pricing')}
            className="hover:text-ink transition-colors"
          >
            Pricing
          </a>
          <a
            href="/faq"
            onClick={(e) => handleNav(e, '/faq')}
            className="hover:text-ink transition-colors"
          >
            FAQ
          </a>
          <a
            href={`${APP_URL}/login`}
            className="hover:text-ink transition-colors"
          >
            Sign in
          </a>
          <a href="#" className="hover:text-ink transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-ink transition-colors">
            Terms
          </a>
        </div>
      </div>

      {/* Mobile copyright */}
      <p className="sm:hidden text-center text-xs text-ink-faint mt-6">
        © 2026 Guild Orbit Inc. All rights reserved.
      </p>
    </footer>
  );
}

import * as React from 'react';

const STORAGE_KEY = 'guild_right_sidebar_collapsed';

interface RightSidebarCtx {
  collapsed: boolean;
  toggle: () => void;
}

const Ctx = React.createContext<RightSidebarCtx>({ collapsed: false, toggle: () => {} });

export function RightSidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; } catch { return false; }
  });

  const toggle = React.useCallback(() => {
    setCollapsed((v) => {
      const next = !v;
      try { localStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  return <Ctx.Provider value={{ collapsed, toggle }}>{children}</Ctx.Provider>;
}

export function useRightSidebar() {
  return React.useContext(Ctx);
}

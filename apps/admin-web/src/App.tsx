import React, { useRef } from 'react';
import { useAdminAuth } from './hooks/useAdminAuth';
import { useAdminData } from './hooks/useAdminData';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { useDeviceType } from './hooks/useDeviceType';
import { MobileAdminApp } from './components/mobile/MobileAdminApp';

// ─── Loading Spinner ──────────────────────────────────────────────────────────
function FullPageSpinner() {
  return (
    <div className="min-h-screen bg-[--background] flex flex-col items-center justify-center gap-4 bg-dot-grid">
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center animate-pulse"
        style={{ background: 'oklch(from var(--primary) l c h / 20%)' }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
          <circle cx="9" cy="7" r="4"/>
          <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
          <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
        </svg>
      </div>
      <p className="text-xs text-[--muted-foreground]">Loading Guild Admin…</p>
    </div>
  );
}

// ─── Unauthorized Screen ──────────────────────────────────────────────────────
function UnauthorizedScreen({ email }: { email: string }) {
  const { signOut: _signOut } = { signOut: () => import('firebase/auth').then(({ signOut, getAuth }) => signOut(getAuth())) };
  return (
    <div className="min-h-screen bg-[--background] flex flex-col items-center justify-center gap-6 text-center p-8 bg-dot-grid">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'oklch(0.65 0.22 25 / 15%)' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="oklch(0.65 0.22 25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      </div>
      <div>
        <h1 className="text-lg font-semibold text-[--foreground]">Access denied</h1>
        <p className="text-sm text-[--muted-foreground] mt-2 max-w-xs">
          <span className="font-medium text-[--foreground]">{email}</span> does not have owner or admin privileges in any Guild organization.
        </p>
      </div>
      <button
        onClick={() => import('firebase/auth').then(({ signOut, getAuth }) => signOut(getAuth()))}
        className="px-5 py-2 rounded-xl text-sm font-semibold bg-[--primary] text-[--primary-foreground] hover:opacity-90 transition-opacity"
      >
        Sign out
      </button>
    </div>
  );
}

// ─── Authorized Shell ─────────────────────────────────────────────────────────
function AuthorizedApp({ profile }: { profile: ReturnType<typeof useAdminAuth> & { status: 'authorized' } }) {
  const deviceType = useDeviceType();

  if (deviceType === 'mobile') {
    return <MobileAdminApp profile={profile.profile} />;
  }

  const data = useAdminData(profile.profile.organizationId);
  return (
    <AdminLayout profile={profile.profile}>
      {(activeSection) => (
        <DashboardPage
          activeSection={activeSection}
          orgs={data.orgs}
          users={data.users}
          tasks={data.tasks}
          channels={data.channels}
          teams={data.teams}
          goals={data.goals}
          activities={data.activities}
          projects={data.projects}
          loading={data.loading}
          error={data.error}
          refresh={data.refresh}
        />
      )}
    </AdminLayout>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const auth = useAdminAuth();

  if (auth.status === 'loading')         return <FullPageSpinner />;
  if (auth.status === 'unauthenticated') return <LoginPage />;
  if (auth.status === 'unauthorized')    return <UnauthorizedScreen email={auth.email} />;

  return <AuthorizedApp profile={auth as typeof auth & { status: 'authorized' }} />;
}

import * as React from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import { setOnboardingState, getInviteLinkByEmail, getOrgById, validateInviteToken, findOrgByAutoJoinDomain } from '../../lib/firestore';
import { StepChoose } from './StepChoose';
import { StepOrgDetails } from './create/StepOrgDetails';
import { StepOwnerProfile } from './create/StepOwnerProfile';
import { StepJoinOrg } from './join/StepJoinOrg';
import { StepMemberProfile } from './join/StepMemberProfile';
import { StepComplete } from './StepComplete';
import { Loader2, Sun, Moon } from 'lucide-react';

const PUBLIC_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com',
  'aol.com', 'icloud.com', 'mail.com', 'zoho.com', 'protonmail.com',
  'yandex.com', 'gmx.com'
];

export type OnboardingPath = 'create' | 'join' | null;

export interface OnboardingData {
  path: OnboardingPath;
  // Create org
  orgName?: string;
  orgIndustry?: string;
  orgSize?: string;
  orgId?: string;
  inviteToken?: string;
  domainAutoJoin?: boolean;
  emailDomain?: string;
  // Join org
  joinOrgId?: string;
  joinOrgName?: string;
  inviteRole?: string;
  directInviteDetected?: boolean;
}

export const STEP_LABELS: Record<string, { create: string; join: string }> = {
  '1': { create: 'Choose path', join: 'Choose path' },
  '2': { create: 'Organization', join: 'Find Organization' },
  '3': { create: 'Your Profile', join: 'Your Profile' },
  '4': { create: 'Complete', join: 'Complete' },
};

export function OnboardingRoot() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { mode, toggleMode } = useTheme();

  const [data, setData] = React.useState<OnboardingData>({ path: null });
  const [checkingInvite, setCheckingInvite] = React.useState(true);

  const updateData = (patch: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...patch }));
  };

  React.useEffect(() => {
    async function checkInvitesAndToken() {
      if (!user?.email) {
        setCheckingInvite(false);
        return;
      }
      try {
        // 1. First, check if there is an explicit token in the URL params or saved locally
        const url = new URL(window.location.href);
        let token = url.searchParams.get('token');
        if (!token) {
          token = localStorage.getItem('guild_invite_token') || sessionStorage.getItem('guild_invite_token');
        }
        if (token && !data.directInviteDetected) {
          const res = await validateInviteToken(token);
          if (res.valid && res.org) {
            updateData({
              path: 'join',
              joinOrgId: res.org.id,
              joinOrgName: res.org.name,
              inviteToken: token,
              inviteRole: 'member',
              directInviteDetected: true
            });
            navigate('/onboarding/join/profile', { replace: true });
            setCheckingInvite(false);
            return;
          }
        }

        // 2. Second, check if there is a pending pre-authorized email invitation
        const invite = await getInviteLinkByEmail(user.email);
        if (invite && !data.directInviteDetected) {
          const org = await getOrgById(invite.orgId);
          updateData({
            path: 'join',
            joinOrgId: invite.orgId,
            joinOrgName: org?.name || 'Organization',
            inviteRole: 'member', // Force strictly to member!
            inviteToken: invite.token,
            directInviteDetected: true
          });
          navigate('/onboarding/join/profile', { replace: true });
          setCheckingInvite(false);
          return;
        }

        // 3. Third, check domain-based auto-join
        const emailDomain = user.email.substring(user.email.lastIndexOf('@') + 1).toLowerCase();
        if (!PUBLIC_DOMAINS.includes(emailDomain)) {
          const matchingOrg = await findOrgByAutoJoinDomain(emailDomain);
          if (matchingOrg && !data.directInviteDetected) {
            updateData({
              path: 'join',
              joinOrgId: matchingOrg.id,
              joinOrgName: matchingOrg.name,
              inviteRole: 'member', // Force strictly to member!
              directInviteDetected: true
            });
            navigate('/onboarding/join/find?autoJoin=true', { replace: true });
          }
        }
      } catch (err) {
        console.error('Invite/token auto-scan failed:', err);
      } finally {
        setCheckingInvite(false);
      }
    }
    checkInvitesAndToken();
  }, [user]);

  if (loading || checkingInvite) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground font-medium">Scanning for invitations...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.emailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-background relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-15%] left-[-5%] w-[55%] h-[55%] bg-primary/6 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[45%] h-[45%] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute inset-0 bg-dashboard-grid pointer-events-none opacity-40" />

      {/* Top brand bar */}
      <div className="relative z-10 flex items-center justify-between px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-black text-primary-foreground shadow-lg shadow-primary/30">
            G
          </div>
          <span className="text-base font-bold text-foreground tracking-tight">Guild</span>
          <span className="ml-2 text-xs font-medium text-muted-foreground">— Setup</span>
        </div>

        {/* Floating Theme Toggle */}
        <button
          onClick={toggleMode}
          className="aether-glass flex h-9 w-9 items-center justify-center rounded-lg hover:scale-105 active:scale-95 transition-all shadow-sm border border-border-default/80 bg-surface/50 text-foreground cursor-pointer"
          title={`Switch to ${mode === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {mode === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4 text-amber-400" />}
        </button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] px-6 pb-10">
        <Routes>
          <Route path="/" element={<StepChoose data={data} updateData={updateData} />} />
          <Route path="/create/org" element={<StepOrgDetails data={data} updateData={updateData} />} />
          <Route path="/create/profile" element={<StepOwnerProfile data={data} updateData={updateData} />} />
          <Route path="/join/find" element={<StepJoinOrg data={data} updateData={updateData} />} />
          <Route path="/join/profile" element={<StepMemberProfile data={data} updateData={updateData} />} />
          <Route path="/complete" element={<StepComplete />} />
          <Route path="*" element={<Navigate to="/onboarding" replace />} />
        </Routes>
      </div>
    </div>
  );
}

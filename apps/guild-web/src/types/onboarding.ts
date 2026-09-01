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

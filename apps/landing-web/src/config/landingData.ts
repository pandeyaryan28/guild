export interface FAQItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: 'How long does it take to get started?',
    a: 'Under five minutes. Create a workspace, invite your team with a link, and start coordinating — your dashboard, channels, and task boards are set up automatically.',
  },
  {
    q: 'Are there limits on tasks or approvals?',
    a: 'No limits. Create unlimited tasks, channels, and approval requests on any plan.',
  },
  {
    q: 'Can I set up different permissions by department?',
    a: 'Yes. Group members into departments and configure role-based access from the admin panel.',
  },
  {
    q: 'How secure is Guild Orbit?',
    a: 'All data is encrypted and isolated at the workspace level. We use token-based authentication and strict database access rules.',
  },
  {
    q: 'Can I cancel anytime?',
    a: 'Absolutely. No contracts. Change your plan or cancel directly from billing settings.',
  },
];

export const APP_URL = 'https://app.guildhq.space';

export const NAV_ITEMS = [
  { label: 'Features', path: '/features' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'FAQ', path: '/faq' },
];

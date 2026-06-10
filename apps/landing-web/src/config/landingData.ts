export interface FAQItem {
  q: string;
  a: string;
}

export const FAQ_ITEMS: FAQItem[] = [
  {
    q: "How does the onboarding process look?",
    a: "Onboarding is built to be completed in under 5 minutes. You register with your work email, input your company details (company name, industry type, team size), invite your team via a secure link, and our workspace automatically initializes the dashboard, general channel, and task board so operations can start instantly."
  },
  {
    q: "Is there a limit on how many tasks or approval requests I can submit?",
    a: "No! On our workspace plan, your team can submit unlimited task cards, invite comments, and issue and process unlimited operational requests (budgets, leaves, admin approvals) without any restrictions."
  },
  {
    q: "Can I manage permissions for different team departments?",
    a: "Yes! Guild Orbit supports team roles and permissions inside the workspace admin dashboard. You can group members into departments (like marketing, operations, admin) and configure specific workspace view boundaries."
  },
  {
    q: "How secure is Guild Orbit?",
    a: "We prioritize security by implementing standard token authentication protocols (JWT and Firebase Auth) alongside strict database rules. All database exchanges and user attachments are encrypted and isolated at the workspace level, ensuring data separation."
  },
  {
    q: "Can I cancel my monthly user subscription?",
    a: "Absolutely. Guild Orbit operates on a simple pay-as-you-go model. You can modify your team seat count, delete workspace records, or cancel the premium plan directly in the billing dashboard at any time."
  }
];

export const APP_URL = "https://app.guildhq.space";

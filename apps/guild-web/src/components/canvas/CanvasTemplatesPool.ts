export interface CanvasTemplatePreset {
  id: string;
  title: string;
  description: string;
  icon: string;
  coverUrl: string;
  tags: string[];
  contentJson: string;
}

export const CANVAS_TEMPLATES: CanvasTemplatePreset[] = [
  {
    id: 'prd',
    title: 'Product Requirements & Roadmap Spec',
    description: '2-column executive summary, collapsible user stories, and multi-view feature database.',
    icon: 'Compass',
    coverUrl: 'bg-gradient-to-r from-indigo-950 via-indigo-600 to-blue-500',
    tags: ['Product', 'PRD', 'Roadmap'],
    contentJson: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'calloutBlock',
          attrs: {
            variant: 'info',
            text: 'Executive Summary: Define problem statement, user personas, measurable success metrics, and milestone database below.'
          }
        },
        {
          type: 'columnsBlock',
          attrs: {
            columns: 2,
            col1Title: '🎯 Problem & Opportunity',
            col1Body:
              'Users need a unified workspace where pages, sub-canvases, and multi-view databases coexist with granular privacy controls.',
            col2Title: '📈 Success Metrics (KPIs)',
            col2Body:
              '• 45% faster spec-to-sprint cycle time\n• 100% private-by-default document governance\n• Zero context switching across sub-pages',
            col3Title: 'Constraints',
            col3Body: ''
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Feature Scope & Milestones Database' }]
        },
        {
          type: 'databaseTable',
          attrs: {
            title: 'PRD Feature Deliverables',
            viewType: 'table'
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Edge Cases & Technical Notes' }]
        },
        {
          type: 'toggleBlock',
          attrs: {
            summary: 'Security & Permission Inheritance Rules',
            details:
              'All newly created canvases default to Private (Creator-only). When shared with selected members, child sub-canvases inherit collaborator roles automatically.',
            defaultOpen: true
          }
        }
      ]
    })
  },
  {
    id: 'rfc',
    title: 'Engineering Architecture RFC',
    description: 'System design proposal with 3-column trade-off matrix, TOC, and implementation tracker.',
    icon: 'Cpu',
    coverUrl: 'bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950',
    tags: ['Engineering', 'RFC', 'Architecture'],
    contentJson: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'tableOfContents'
        },
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: '1. Context & Architectural Goals' }]
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Document the distributed system invariants, latency budgets, and failure recovery mechanisms for this service.'
            }
          ]
        },
        {
          type: 'columnsBlock',
          attrs: {
            columns: 3,
            col1Title: '⚡ Throughput Target',
            col1Body: '15,000 req/s sustained with p99 latency under 45ms across regional edges.',
            col2Title: '🔒 Security Posture',
            col2Body: 'Zero-trust Firestore rules with strict UID-based RBAC verification.',
            col3Title: '🔄 Rollback Strategy',
            col3Body: 'Instant feature-flag killswitch with dual-write schema compatibility.'
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '2. Implementation Phases & Owners' }]
        },
        {
          type: 'databaseTable',
          attrs: {
            title: 'RFC Rollout Checklist',
            viewType: 'board'
          }
        }
      ]
    })
  },
  {
    id: 'sprint-hub',
    title: 'Sprint Execution & Linear Command Center',
    description: 'Live Linear sprint board, cycle velocity, and release database in one full-width canvas.',
    icon: 'Target',
    coverUrl: 'bg-gradient-to-r from-teal-900 via-emerald-600 to-cyan-600',
    tags: ['Sprint', 'Engineering', 'Linear'],
    contentJson: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'calloutBlock',
          attrs: {
            variant: 'success',
            text: 'Active Sprint Command Center: Track real-time engineering issues, blockers, and release deliverables.'
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Live Sprint Kanban & Cycle Velocity' }]
        },
        {
          type: 'sprintBoard',
          attrs: {
            defaultFilter: 'all'
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Release Deliverables Timeline' }]
        },
        {
          type: 'databaseTable',
          attrs: {
            title: 'Sprint Deliverables & QA Sign-off',
            viewType: 'timeline'
          }
        }
      ]
    })
  },
  {
    id: 'knowledge-wiki',
    title: 'Team Knowledge Hub & Sub-Canvas Directory',
    description: 'Structured team handbook with multi-column quick links, collapsible FAQs, and gallery database.',
    icon: 'BookOpen',
    coverUrl: 'bg-gradient-to-tr from-violet-600 via-indigo-500 to-pink-500',
    tags: ['Wiki', 'Handbook', 'Onboarding'],
    contentJson: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'columnsBlock',
          attrs: {
            columns: 2,
            col1Title: '🧭 Core Team Principles',
            col1Body:
              '1. Radical Minimalism & Clarity\n2. Private-by-Default Ownership\n3. Ship iteratively with measurable quality',
            col2Title: '🔗 Essential Rituals',
            col2Body:
              '• Monday 9:30 AM — Sprint Planning\n• Wednesday 2:00 PM — Design & Architecture Review\n• Friday 4:00 PM — Demo & Retro',
            col3Title: '',
            col3Body: ''
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Resource & Documentation Gallery' }]
        },
        {
          type: 'databaseTable',
          attrs: {
            title: 'Team Playbooks & Guides',
            viewType: 'gallery'
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Frequently Asked Questions' }]
        },
        {
          type: 'toggleBlock',
          attrs: {
            summary: 'How do I create a nested sub-canvas or database inside a row?',
            details:
              'Type /page anywhere to embed a nested sub-canvas, or hover over any row in a Database and click "Open" to open that row as its own full canvas with nested blocks and sub-databases.',
            defaultOpen: true
          }
        }
      ]
    })
  }
];

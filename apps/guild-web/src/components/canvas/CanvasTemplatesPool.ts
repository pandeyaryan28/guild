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
            icon: '💡',
            tint: 'indigo',
            title: 'Executive Summary',
            text: 'Define the problem statement, user personas, measurable success metrics, and milestone database below.'
          }
        },
        {
          type: 'columnsBlock',
          attrs: {
            columnCount: 2,
            items: [
              {
                id: 'col-1',
                title: '🎯 Problem & Opportunity',
                body: 'Users need a unified workspace where pages, sub-canvases, and multi-view databases coexist with granular privacy controls.'
              },
              {
                id: 'col-2',
                title: '📈 Success Metrics (KPIs)',
                body: '• 45% faster spec-to-sprint cycle time\n• 100% private-by-default document governance\n• Zero context switching across sub-pages'
              }
            ]
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Feature Scope & Milestones Database' }]
        },
        {
          type: 'databaseTableBlock',
          attrs: {
            title: 'PRD Feature Deliverables',
            activeView: 'table',
            columns: [],
            rows: []
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
            title: 'Security & Permission Inheritance Rules',
            body: 'All newly created canvases default to Private (Creator-only). When shared with selected members, child sub-canvases inherit collaborator roles automatically.',
            isOpen: true
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
          type: 'tableOfContentsBlock'
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
            columnCount: 3,
            items: [
              {
                id: 'col-1',
                title: '⚡ Throughput Target',
                body: '15,000 req/s sustained with p99 latency under 45ms across regional edges.'
              },
              {
                id: 'col-2',
                title: '🔒 Security Posture',
                body: 'Zero-trust Firestore rules with strict UID-based RBAC verification.'
              },
              {
                id: 'col-3',
                title: '🔄 Rollback Strategy',
                body: 'Instant feature-flag killswitch with dual-write schema compatibility.'
              }
            ]
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '2. Implementation Phases & Owners' }]
        },
        {
          type: 'databaseTableBlock',
          attrs: {
            title: 'RFC Rollout Checklist',
            activeView: 'board',
            columns: [],
            rows: []
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
            icon: '🚀',
            tint: 'emerald',
            title: 'Active Sprint Command Center',
            text: 'Track real-time engineering issues, blockers, and release deliverables.'
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Live Sprint Kanban & Cycle Velocity' }]
        },
        {
          type: 'sprintCycleBlock',
          attrs: {
            title: 'Active Sprint Cycle',
            cycleNumber: 24
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Release Deliverables Timeline' }]
        },
        {
          type: 'databaseTableBlock',
          attrs: {
            title: 'Sprint Deliverables & QA Sign-off',
            activeView: 'timeline',
            columns: [],
            rows: []
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
            columnCount: 2,
            items: [
              {
                id: 'col-1',
                title: '🧭 Core Team Principles',
                body: '1. Radical Minimalism & Clarity\n2. Private-by-Default Ownership\n3. Ship iteratively with measurable quality'
              },
              {
                id: 'col-2',
                title: '🔗 Essential Rituals',
                body: '• Monday 9:30 AM — Sprint Planning\n• Wednesday 2:00 PM — Design & Architecture Review\n• Friday 4:00 PM — Demo & Retro'
              }
            ]
          }
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: 'Resource & Documentation Gallery' }]
        },
        {
          type: 'databaseTableBlock',
          attrs: {
            title: 'Team Playbooks & Guides',
            activeView: 'gallery',
            columns: [],
            rows: []
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
            title: 'How do I create a nested sub-canvas or database inside a row?',
            body: 'Type /page anywhere to embed a nested sub-canvas, or hover over any row in a Database and click "Open" to open that row as its own full canvas with nested blocks and sub-databases.',
            isOpen: true
          }
        }
      ]
    })
  }
];

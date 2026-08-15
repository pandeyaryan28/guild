# GEMINI.md — Guild Workspace Directives

## 🌟 Mandatory: Dual-Theme Parity (Light & Dark Mode)
- **Every UI change, feature, component, modal, table, drawer, and screen MUST be designed and developed for BOTH Light Mode and Dark Mode with equal visual quality.**
- **Never develop for Dark Mode only.**
- Always utilize semantic design tokens:
  - Surfaces: `bg-background`, `bg-card`, `bg-surface`, `bg-secondary`, `bg-muted`
  - Text: `text-foreground`, `text-muted-foreground`, `text-text-primary`, `text-text-muted`
  - Borders: `border-border`, `border-border-default`, `border-border-strong`
  - Accents: `bg-primary`, `text-primary-foreground`, `bg-accent`
- Avoid hardcoded single-mode opacity hacks (`bg-white/5`, `border-white/10`, `text-white` on transparent glass). Always provide dual-mode pairing (e.g. `bg-surface/85 dark:bg-surface/55 border border-border dark:border-border-strong`).

## 🚫 UI Quality Directives
- **No Pill Badges / AI Slop**: Never place pill badges or sparkling metadata tags above headers/heroes.
- **No Floating Micro-Widgets**: Never place floating mock cards over or around screenshot graphics.

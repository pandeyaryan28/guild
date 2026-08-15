# AGENTS.md — Guild Workspace Rules & Directives

This document defines critical requirements and architectural standards for any AI agent or developer operating within the Guild monorepo.

---

## 🌟 Core Directive: Dual-Theme Parity (Light & Dark Mode)

1. **Both Themes Are First-Class Citizens**:
   - **NEVER** develop, design, or test for Dark Mode in isolation.
   - Every single component, drawer, modal, table, header, badge, tab, form control, and layout MUST look visually polished and remain completely legible in **both Light and Dark modes**.

2. **Mandatory Use of Semantic Design Tokens**:
   Guild uses an OKLCH-based design system with reactive CSS custom properties. Always use semantic tokens rather than raw, hardcoded colors or single-theme transparency.

   ### Semantic Token Guide:
   | Token Role | Tailwind Class / CSS Variable | Light Mode Behavior | Dark Mode Behavior |
   | :--- | :--- | :--- | :--- |
   | **App Canvas** | `bg-background` / `var(--bg-primary)` | Crisp clean off-white (`#fcfcfd`) | Deep layered slate/indigo (`#0d0b1a`) |
   | **Elevated Surface** | `bg-surface` / `bg-card` | Pure white (`#ffffff`) | Frosted obsidian/slate |
   | **Subtle Container** | `bg-secondary` / `bg-muted` | Soft gray (`#f4f4f6`) | Elevated midnight layer |
   | **Primary Text** | `text-foreground` / `text-text-primary` | Charcoal/black (`#09090b`) | Crisp off-white (`#f8fafc`) |
   | **Secondary / Muted Text** | `text-muted-foreground` / `text-text-muted` | Slate gray (`#71717a`) | Medium muted slate (`#64748b`) |
   | **Borders** | `border-border` / `border-border-default` | Light crisp border (`#e4e4e7`) | High-contrast dark border (`#201b3e` / `#362e69`) |
   | **Primary Accent** | `bg-primary text-primary-foreground` | Dynamic theme accent | Dynamic theme accent |

3. **Rules for Glassmorphism & Translucency**:
   - ❌ **FORBIDDEN**: `border-white/10`, `border-white/5`, `bg-white/[0.03]` without dual-mode equivalents. (These are invisible or washed out on light backgrounds).
   - ❌ **FORBIDDEN**: `text-white` on transparent cards that are placed on light backgrounds.
   - ✅ **CORRECT**: Use `aether-glass` or explicit dual classes:
     ```tsx
     // Clean dual-theme glass container
     <div className="bg-surface/85 dark:bg-surface/55 backdrop-blur-2xl border border-border dark:border-border-strong rounded-2xl shadow-xl">
       ...
     </div>
     ```

4. **Self-Verification Checklist**:
   Before completing any task involving UI:
   - [ ] Did I check the layout in Light Mode? Is text contrast sharp and legible?
   - [ ] Did I check the layout in Dark Mode? Are borders and cards distinct and visible?
   - [ ] Are there any raw `white/...` or `black/...` classes that break when the background mode switches?

---

## 🚫 Forbidden UI Anti-Patterns

1. **No Decorative Pill Badges / AI Slop**:
   - Never add decorative pill tags with Sparkles/icons at the top of hero sections or landing page features (e.g., `inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs ...`).
2. **No Floating Hero Micro-Widgets**:
   - Never position random floating mock cards (`absolute -bottom-6 -left-6`) next to main feature screenshots. Keep illustrations clean and intentional.
3. **No Decorative Dashboard Overuse**:
   - Keep layout structures intentional and focused on user productivity.

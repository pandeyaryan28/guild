import base64

content = """# Design System Specification: Guild Workspace & Minimalist Glassmorphic UI

## 1. Creative Direction: "Translucent Command Cockpit"
This design system crafts an elite, visually spectacular dark-themed interface. It combines the high-fidelity depth of layered glassmorphism (frosted glass) with soft ambient neon lighting and sharp, high-contrast borders. The result is a premium, state-of-the-art workspace that provides maximum clarity and distraction-free layout structures. Emojis are strictly prohibited.

---

## 2. Color & Tonal Architecture
The environment is built on layered deep slate-indigo colors, punctuated by glowing neon indices.

### Surface Elevation & Nesting
Depth is defined by physical-like layering and transparency, rather than flat fills:
- **Base Canvas**: bg-primary oklch(0.18 0.02 260) - Deep, immersive slate-indigo.
- **Glass Card base**: bg-surface/80 (light mode) and bg-surface/50 (dark mode) with a backdrop-blur-2xl saturation filter. This prevents elements from dissolving into the dark backdrop.
- **Accent highlight**: oklch(0.62 0.14 260) - A glowing indigo accent used for active states, radial progress lines, and focus bounds.

### Solid Boundary & Contrast Rule
To ensure that cards never dissolve or get lost in dark backgrounds:
- All cards must use border border-border-default in light mode, and a stronger contrast border-border-strong/75 oklch(0.42 0.03 260) in dark mode.
- Avoid extremely faint transparencies (like border/10 or /40 opacities) on main layout wrappers. All card borders must have a minimum of 75% opacity to stand out.

---

## 3. Typography & Hierarchy
We utilize a ultra-clean dual-font system:
* **Sans-Serif (Geist Variable / Inter)**: Sleek, high-readability sans-serif for numbers, labels, and descriptions.
* **Tracking & Density**: Smaller uppercase text is given increased letter-spacing (+0.05em) and bold weights to imply high-end metadata tags (e.g., stats, column names).

---

## 4. Key Interactive Components

### Breathtaking Glass Focus Container
- **Layout**: A floating, relative card (relative max-w-2xl bg-surface/85 dark:bg-surface/55 backdrop-blur-2xl border border-border-default dark:border-border-strong rounded-2xl) housing a custom animated Lucide Target icon.
- **Input Line**: Borderless, elegant typography that highlights a subtle glow line when focused. Includes a dynamic "Sync Focus" button that scales down on tap.

### Core Execution Checklist
- **Checkbox Toggle**: Checkboxes are styled as custom hollow circular rings that dynamically morph and fade-in a glowing emerald checkmark upon hovering.
- **Priority Indicators**: Muted text priority badges surrounded by distinct, HSL-tinted glowing thin borders (e.g., low-contrast red border for urgent priorities, orange for high). No emojis.

### Neon Radial Progress Gauge
- **Sprint progress**: Renders a vector-based radial circular progress meter (svg path) indicating the completed sprint tasks percentage in a neon emerald cap line, side-by-side with text details.

### Pulse Co-Presence Avatar Grid
- **Status indicators**: Teammate initial circles are colored using dynamic, HSL-tailored gradient backdrops. 
- **Pulsing Halo**: Surrounded by a glowing presence ring that pulses green (online/active focus set) or solid grey (offline).

---

## 5. Do's and Don'ts

### Do:
- Use absolute-positioned blurred background spheres in the container backing to cast soft, ambient reflections through the glass cards.
- Rely on Lucide SVG shapes for clear visual cues.
- Keep generous, consistent spacing (e.g. p-6 or gap-8) to maintain an uncluttered canvas.

### Don't:
- **No Emojis**: Do not use any Unicode emojis or graphics in names, tasks, or controls.
- **No Invisible Borders**: Never allow card borders to drop below 50% opacity in dark mode.
- **No Sharp Angles**: Keep a uniform rounded-3xl (24px) radius on card elements.
"""

encoded = base64.b64encode(content.encode('utf-8')).decode('utf-8')
# Strip any whitespaces or newlines just in case
encoded_flat = "".join(encoded.split())

with open("base64.txt", "w") as f:
    f.write(encoded_flat)

print("Saved flat base64 string to base64.txt. Length:", len(encoded_flat))

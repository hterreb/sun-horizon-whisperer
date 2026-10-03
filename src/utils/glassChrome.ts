// Shared "dark glass" chrome classes for direction D "Polished Classic"
// (ROADMAP item 15). One place for the panel/pill look so InfoPanel, the
// floating icon buttons (FullscreenButton, CompassToggle), the MusicPlayer bar
// and the PWA install prompt all read as one visual system: a translucent
// dark panel (rgba(10,12,20,.45)) with a thin light border and a soft shadow,
// built from the item-7 `--panel-*` tokens (tailwind.config.ts / index.css).

// The dark glass panel background + border + shadow, with no radius or layout
// baked in (callers add their own rounding, e.g. `rounded-panel` or `rounded-full`).
export const GLASS_SURFACE =
  'bg-[hsl(var(--panel-background)/0.45)] backdrop-blur-md border border-[hsl(var(--panel-border)/0.14)] shadow-[0_8px_30px_rgba(0,0,0,0.25)]';

// A round, ≥40px glass icon button (FullscreenButton, CompassToggle): same
// glass surface, always fully rounded, with a hover state and a visible
// keyboard focus ring. `hover:text-white` replaces the shadcn ghost variant's
// near-black hover text: on a phone, :hover stays after a tap (ROADMAP item 81).
export const GLASS_ICON_BUTTON =
  `${GLASS_SURFACE} rounded-full hover:bg-[hsl(var(--panel-background)/0.65)] hover:text-white focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-0`;

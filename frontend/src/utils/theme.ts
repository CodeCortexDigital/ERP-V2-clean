// Global theme applier: reads General Settings theme and pushes the chosen
// accent + chrome colors to :root so every page reflects the selection.

export const colorMap: Record<string, { hex: string; rgb: string }> = {
  'Coral Red': { hex: '#E55B4C', rgb: '229 91 76' },
  'Magenta': { hex: '#D81B60', rgb: '216 27 96' },
  'Turquoise': { hex: '#00BFA5', rgb: '0 191 165' },
  'Blue': { hex: '#2E73D2', rgb: '46 115 210' },
  'Yellow': { hex: '#F59E0B', rgb: '245 158 11' },
  'Red Orange': { hex: '#F97316', rgb: '249 115 22' },
  'Soft Light Purple': { hex: '#ECECFE', rgb: '236 236 254' },
  'Dark Slate Blue': { hex: '#4D51B4', rgb: '77 81 180' },
  'Hot Pink': { hex: '#EC4899', rgb: '236 72 153' },
  'Bright Orange': { hex: '#FF4F00', rgb: '255 79 0' },
  'Green': { hex: '#008744', rgb: '0 135 68' },
  'Dark Purple': { hex: '#730073', rgb: '115 0 115' },
  'Brand Navy': { hex: '#001830', rgb: '0 24 48' },
  'Brand Red': { hex: '#F01848', rgb: '240 24 72' },
  'Brand Cyan': { hex: '#30F0D8', rgb: '48 240 216' },
  'Professional Blue': { hex: '#2E66B7', rgb: '46 102 183' }
};

const resolveColor = (name?: string) => {
  const c = colorMap[name || 'Soft Light Purple'] || colorMap['Dark Slate Blue'];
  return c;
};

// Returns true if the hex color is too light to use as a background with white
// text, or as text on a white background.
const isLight = (hex: string) => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  // Perceived luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6;
};

export const applyGlobalTheme = () => {
  try {
    const saved = localStorage.getItem('theme_settings');
    const t = saved ? JSON.parse(saved) : {};
    const root = document.documentElement;

    const accent = resolveColor(t.activeColor);

    // Strong (always-legible, dark) variant used for text, borders and button
    // backgrounds so white text / light backgrounds stay readable even when the
    // chosen accent itself is very light (e.g. Soft Light Purple).
    const strong = isLight(accent.hex) ? '#4D51B4' : accent.hex;

    root.style.setProperty('--app-accent', accent.hex);
    root.style.setProperty('--app-accent-strong', strong);
    root.style.setProperty('--app-accent-rgb', accent.rgb);

    // Keep Tailwind's primary/ring in sync for any component using bg-primary etc.
    root.style.setProperty('--primary', accent.rgb);
    root.style.setProperty('--ring', accent.rgb);

    root.dataset.sidebarBg = t.sidebarBg === 'Light' ? 'light' : 'dark';
    root.dataset.headerBg = t.headerBg || 'Blue';
  } catch (e) {
    /* ignore */
  }
};

export const initGlobalTheme = () => {
  applyGlobalTheme();
  window.addEventListener('theme-changed', applyGlobalTheme);
};

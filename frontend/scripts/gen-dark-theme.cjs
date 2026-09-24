// Generates src/styles/dark-theme.css: remaps the light Tailwind utilities used
// across the app (bg-white, text-slate-800, bg-emerald-50, ...) to dark
// equivalents under html.dark, so every page gets a usable dark mode without
// adding dark: variants to each component. Run: node scripts/gen-dark-theme.cjs
const fs = require('fs');
const path = require('path');
const colors = require('tailwindcss/colors');

const BS = String.fromCharCode(92); // backslash, for CSS class escapes
const esc = (c) => c.replace(/\//g, `${BS}/`).replace(/:/g, `${BS}:`);
const hexToRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`;
};
const out = [];
const rule = (classes, body, variants = ['']) => {
  const sel = [];
  for (const c of classes) {
    for (const v of variants) {
      if (v === 'hover') sel.push(`.dark .hover${BS}:${esc(c)}:hover`);
      else if (v === 'focus') sel.push(`.dark .focus${BS}:${esc(c)}:focus`);
      else sel.push(`.dark .${esc(c)}`);
    }
  }
  out.push(`${sel.join(',\n')} {\n  ${body}\n}`);
};

// Neutral surfaces. Page < card < raised, all in the variables from index.css.
const NEUTRALS = ['slate', 'gray', 'zinc', 'neutral', 'stone'];
const bgMap = { white: 'var(--dk-surface)', '50': 'var(--dk-page)', '100': 'var(--dk-raised)', '200': 'var(--dk-raised-2)', '300': 'var(--dk-border-strong)' };
rule(['bg-white'], `background-color: ${bgMap.white};`, ['', 'hover', 'focus']);
for (const a of [95, 90, 80, 70, 60, 50]) {
  rule([`bg-white/${a}`], `background-color: rgb(var(--dk-surface-rgb) / ${a / 100});`, ['', 'hover']);
}
for (const shade of ['50', '100', '200', '300']) {
  rule(NEUTRALS.map((n) => `bg-${n}-${shade}`), `background-color: ${bgMap[shade]};`, ['', 'hover']);
  const rgbVar = shade === '50' ? '--dk-page-rgb' : '--dk-raised-rgb';
  for (const a of [10, 20, 30, 40, 50, 60, 70, 75, 80, 90, 95]) {
    rule(NEUTRALS.map((n) => `bg-${n}-${shade}/${a}`), `background-color: rgb(var(${rgbVar}) / ${Math.max(a, 50) / 100});`, ['', 'hover']);
  }
}

// Neutral text: dark text becomes light, mid greys stay readable.
const textMap = { black: 'var(--dk-text)', '950': 'var(--dk-text)', '900': 'var(--dk-text)', '800': 'var(--dk-text)', '700': 'var(--dk-text-2)', '600': 'var(--dk-text-3)', '500': 'var(--dk-text-3)' };
rule(['text-black'], `color: ${textMap.black};`, ['', 'hover']);
for (const shade of ['950', '900', '800', '700', '600', '500']) {
  rule(NEUTRALS.map((n) => `text-${n}-${shade}`), `color: ${textMap[shade]};`, ['', 'hover']);
}

// Neutral borders / dividers.
for (const shade of ['50', '100', '200', '300']) {
  const v = shade === '300' ? 'var(--dk-border-strong)' : 'var(--dk-border)';
  rule(['border-white', ...NEUTRALS.map((n) => `border-${n}-${shade}`)].filter((c, i) => shade === '50' || i > 0), `border-color: ${v};`, ['', 'hover']);
  rule(NEUTRALS.map((n) => `divide-${n}-${shade}`).map((c) => c), `--tw-divide-opacity: 1;`, ['']);
}
out.push(`.dark :is(${NEUTRALS.flatMap((n) => ['100', '200', '300'].map((s) => `.divide-${n}-${s}`)).join(', ')}) > :not([hidden]) ~ :not([hidden]) {\n  border-color: var(--dk-border);\n}`);
rule(NEUTRALS.flatMap((n) => [`ring-${n}-100`, `ring-${n}-200`]).concat(['ring-white']), '--tw-ring-color: var(--dk-border);');

// Gradients that start/end on white or a pale neutral.
for (const [c, v] of [['white', '--dk-surface-rgb'], ...NEUTRALS.map((n) => [`${n}-50`, '--dk-page-rgb']), ...NEUTRALS.map((n) => [`${n}-100`, '--dk-raised-rgb'])]) {
  rule([`from-${c}`], `--tw-gradient-from: rgb(var(${v})) var(--tw-gradient-from-position);\n  --tw-gradient-to: rgb(var(${v}) / 0) var(--tw-gradient-to-position);\n  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);`);
  rule([`via-${c}`], `--tw-gradient-to: rgb(var(${v}) / 0) var(--tw-gradient-to-position);\n  --tw-gradient-stops: var(--tw-gradient-from), rgb(var(${v})) var(--tw-gradient-via-position), var(--tw-gradient-to);`);
  rule([`to-${c}`], `--tw-gradient-to: rgb(var(${v})) var(--tw-gradient-to-position);`);
}

// Coloured tints (status chips, soft cards): pale backgrounds become a
// translucent wash of the same hue, and their dark text becomes a light shade.
const HUES = ['red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple', 'fuchsia', 'pink', 'rose'];
for (const h of HUES) {
  const rgb = hexToRgb(colors[h]['500']);
  rule([`bg-${h}-50`, `bg-${h}-50/50`, `bg-${h}-50/80`], `background-color: rgb(${rgb} / 0.12);`, ['', 'hover']);
  rule([`bg-${h}-100`, `bg-${h}-100/50`, `bg-${h}-100/80`], `background-color: rgb(${rgb} / 0.2);`, ['', 'hover']);
  rule([`bg-${h}-200`], `background-color: rgb(${rgb} / 0.3);`, ['', 'hover']);
  rule([`border-${h}-50`, `border-${h}-100`, `border-${h}-200`, `border-${h}-300`], `border-color: rgb(${rgb} / 0.35);`, ['', 'hover']);
  rule([`text-${h}-950`, `text-${h}-900`, `text-${h}-800`, `text-${h}-700`], `color: ${colors[h]['300']};`, ['', 'hover']);
  rule([`text-${h}-600`], `color: ${colors[h]['400']};`, ['', 'hover']);
  for (const s of ['50', '100']) {
    rule([`from-${h}-${s}`], `--tw-gradient-from: rgb(${rgb} / 0.14) var(--tw-gradient-from-position);\n  --tw-gradient-to: rgb(${rgb} / 0) var(--tw-gradient-to-position);\n  --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to);`);
    rule([`to-${h}-${s}`], `--tw-gradient-to: rgb(${rgb} / 0.08) var(--tw-gradient-to-position);`);
  }
}

const header = `/* GENERATED by scripts/gen-dark-theme.cjs — do not edit by hand.
   Dark-mode remap of light utilities; see the --dk-* variables in index.css. */\n`;
const file = path.join(__dirname, '..', 'src', 'styles', 'dark-theme.css');
fs.writeFileSync(file, header + out.join('\n\n') + '\n');
console.log(`wrote ${file} (${out.length} rules)`);

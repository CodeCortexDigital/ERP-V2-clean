// Loaded before the page paints (not deferred), kept out of index.html so the page needs no inline scripts (P6).
// Set dark mode before CSS paints so dark-theme users don't see a white flash.
try {
  var t = JSON.parse(localStorage.getItem('theme_settings') || '{}');
  var m = t.themeMode || 'light';
  if (m === 'dark' || (m === 'system' && matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }
} catch (e) {}

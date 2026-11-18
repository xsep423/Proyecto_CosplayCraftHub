/**
 * Tema claro / oscuro. Se guarda en este navegador; si el usuario nunca lo
 * eligió, se sigue la preferencia del sistema operativo.
 * index.html aplica el tema antes de pintar la página para evitar un parpadeo.
 */
export type Theme = 'light' | 'dark';

const KEY = 'theme';
const THEME_COLORS: Record<Theme, string> = { dark: '#0b0b14', light: '#f6f5fb' };

function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export function getTheme(): Theme {
  return savedTheme() ?? systemTheme();
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
  window.dispatchEvent(new Event('theme-changed'));
}

export function setTheme(theme: Theme) {
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Navegación privada sin almacenamiento: el tema dura hasta recargar
  }
  applyTheme(theme);
}

/** Si el usuario no eligió tema, sigue los cambios del sistema operativo. */
export function watchSystemTheme() {
  const media = window.matchMedia?.('(prefers-color-scheme: light)');
  media?.addEventListener('change', () => {
    if (!savedTheme()) applyTheme(systemTheme());
  });
}

export type Theme = 'light' | 'dark' | 'system';

export const THEME_STORAGE_KEY = 'app_theme';
export const THEME_CHANGE_EVENT = 'app-theme-change';
export const DEFAULT_THEME: Theme = 'system';

export function normalizeTheme(value: unknown): Theme {
  return value === 'light' || value === 'dark' || value === 'system'
    ? value
    : DEFAULT_THEME;
}

export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return DEFAULT_THEME;
  return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
}

export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getAppliedResolvedTheme(): 'light' | 'dark' {
  if (typeof document !== 'undefined') {
    const current = document.documentElement.dataset.resolvedTheme;
    if (current === 'light' || current === 'dark') return current;
  }
  return resolveTheme(getStoredTheme());
}

export function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;

  const normalizedTheme = normalizeTheme(theme);
  const resolvedTheme = resolveTheme(normalizedTheme);
  const root = document.documentElement;

  root.classList.toggle('dark', resolvedTheme === 'dark');
  root.dataset.theme = normalizedTheme;
  root.dataset.resolvedTheme = resolvedTheme;
  root.style.colorScheme = resolvedTheme;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
      detail: { theme: normalizedTheme, resolvedTheme },
    }));
  }
}

export function persistTheme(theme: Theme) {
  const normalizedTheme = normalizeTheme(theme);
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_STORAGE_KEY, normalizedTheme);
  }
  applyTheme(normalizedTheme);
}
import { useEffect } from 'react';
import { useProfile } from '@/hooks/useAuthQuery';
import { applyTheme, getStoredTheme, normalizeTheme, persistTheme } from '@/lib/theme';

/**
 * Applies the saved theme as early as possible:
 *   1. Reads `app_theme` from localStorage on mount (works for guests too).
 *   2. When the authenticated profile loads, syncs from `settings.appearance.theme`.
 *   3. Listens to system prefers-color-scheme when the active mode is "system".
 */
export const ThemeBootstrap = () => {
  const { data: profile } = useProfile();

  // Apply on mount from localStorage
  useEffect(() => {
    applyTheme(getStoredTheme());
  }, []);

  // Sync from profile when available
  useEffect(() => {
    const remote = profile?.settings?.appearance?.theme;
    if (remote) {
      persistTheme(normalizeTheme(remote));
    }
  }, [profile?.settings?.appearance?.theme]);

  // Re-apply when system color scheme changes (only relevant for "system")
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const current = getStoredTheme();
      if (current === 'system') applyTheme('system');
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  return null;
};

export default ThemeBootstrap;

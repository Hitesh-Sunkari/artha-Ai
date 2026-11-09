import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'dark' | 'light';

export function getActiveTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('arthai_theme') as ThemeMode | null;
  if (saved === 'dark' || saved === 'light') return saved;
  const docTheme = document.documentElement.getAttribute('data-theme') as ThemeMode | null;
  if (docTheme === 'dark' || docTheme === 'light') return docTheme;
  return 'light'; // Default to light mode as requested
}

export function setActiveTheme(theme: ThemeMode): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('arthai_theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
  window.dispatchEvent(new CustomEvent('arthai_theme_changed', { detail: theme }));
}

export function useTheme(): {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (t: ThemeMode) => void;
} {
  const [theme, setThemeState] = useState<ThemeMode>(() => getActiveTheme());

  useEffect(() => {
    const handleThemeChange = (e?: any) => {
      const next = e?.detail || getActiveTheme();
      setThemeState(next);
    };

    window.addEventListener('arthai_theme_changed', handleThemeChange);
    window.addEventListener('storage', handleThemeChange);

    // Watch attribute changes on <html> tag (e.g. data-theme="dark" vs data-theme="light")
    const observer = new MutationObserver(() => {
      const current = document.documentElement.getAttribute('data-theme') as ThemeMode | null;
      if (current === 'dark' || current === 'light') {
        setThemeState(current);
      }
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      window.removeEventListener('arthai_theme_changed', handleThemeChange);
      window.removeEventListener('storage', handleThemeChange);
      observer.disconnect();
    };
  }, []);

  const toggleTheme = useCallback(() => {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setActiveTheme(next);
    setThemeState(next);
  }, [theme]);

  const setTheme = useCallback((t: ThemeMode) => {
    setActiveTheme(t);
    setThemeState(t);
  }, []);

  return {
    theme,
    isDark: theme === 'dark',
    toggleTheme,
    setTheme,
  };
}


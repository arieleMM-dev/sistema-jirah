'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';
import styles from './auth.module.css';

function subscribe(callback: () => void) {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', callback);
  window.addEventListener('jirah-theme-change', callback);
  window.addEventListener('storage', callback);
  return () => {
    media.removeEventListener('change', callback);
    window.removeEventListener('jirah-theme-change', callback);
    window.removeEventListener('storage', callback);
  };
}

function preferredTheme() {
  try {
    const saved = localStorage.getItem('jirah-tema');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch { /* El tema puede funcionar sin almacenamiento persistente. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: string) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#101D17' : '#F7F9F2');
}

export default function ThemeButton() {
  const preferred = useSyncExternalStore(subscribe, preferredTheme, () => 'light');
  const [temporaryTheme, setTemporaryTheme] = useState<string | null>(null);
  const theme = temporaryTheme ?? preferred;
  useEffect(() => { applyTheme(theme); }, [theme]);

  function toggle() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('jirah-tema', nextTheme); } catch { setTemporaryTheme(nextTheme); }
    applyTheme(nextTheme);
    window.dispatchEvent(new Event('jirah-theme-change'));
  }

  return (
    <button type="button" className={styles.themeButton} onClick={toggle} aria-label={theme === 'dark' ? 'Usar tema claro' : 'Usar tema oscuro'}>
      {theme === 'dark' ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
    </button>
  );
}

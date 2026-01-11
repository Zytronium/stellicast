'use client';

import { useState, useEffect } from 'react';
import { Palette } from 'lucide-react';

const themes = [
  { id: 'spaceblue', name: 'Space Blue', description: 'Classic dark theme' },
  { id: 'palewhite', name: 'Pale White', description: 'Light & clean' },
  { id: 'alien', name: 'Alien', description: 'Minty green vibes' },
  { id: 'rosered', name: 'Rose Red', description: 'Warm & bold' },
  { id: 'highcontrast', name: 'High Contrast', description: 'Maximum visibility' },
] as const;

type ThemeId = typeof themes[number]['id'];

export default function ThemeSwitcher() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>('spaceblue');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Load theme from localStorage
    const saved = localStorage.getItem('stellicast-theme') as ThemeId;
    if (saved && themes.some(t => t.id === saved)) {
      setCurrentTheme(saved);
      document.documentElement.className = saved;
    }
  }, []);

  const changeTheme = (themeId: ThemeId) => {
    setCurrentTheme(themeId);
    document.documentElement.className = themeId;
    localStorage.setItem('stellicast-theme', themeId);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border-default transition-colors"
        aria-label="Change theme"
      >
        <Palette className="w-4 h-4" />
        <span className="hidden sm:inline text-sm">Theme</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 bg-surface-elevated border border-border-default rounded-lg shadow-lg overflow-hidden z-50">
            <div className="p-2">
              <p className="text-xs text-text-muted px-2 py-1 mb-1">Choose Theme</p>
              {themes.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => changeTheme(theme.id)}
                  className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
                    currentTheme === theme.id
                      ? 'bg-accent-primary text-white'
                      : 'hover:bg-surface-hover text-text-secondary'
                  }`}
                >
                  <div className="font-medium text-sm">{theme.name}</div>
                  <div className="text-xs opacity-75">{theme.description}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

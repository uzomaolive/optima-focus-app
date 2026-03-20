'use client';

import { useState, useEffect } from 'react';
import Pomodoro from '@/components/Pomodoro';
import Calendar from '@/components/Calendar';
import { Clock, Calendar as CalendarIcon, Moon, Sun } from 'lucide-react';

export default function Home() {
  const [activeView, setActiveView] = useState<'pomodoro' | 'calendar'>('pomodoro');
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Initialize dark mode from system preference
  useEffect(() => {
    const savedMode = localStorage.getItem('optima-darkMode');
    if (savedMode !== null) {
      const isDark = JSON.parse(savedMode);
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.classList.add('dark');
      }
    } else {
      // Default to system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
      if (prefersDark) {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('optima-darkMode', JSON.stringify(newMode));
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] transition-colors duration-300">
      <div className="border-b border-[var(--border)] bg-[var(--surface)] shadow-sm sticky top-0 z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Optima Focus</h1>
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setActiveView('pomodoro')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition ${
                  activeView === 'pomodoro'
                    ? 'bg-[var(--accent)] text-white shadow-lg'
                    : 'bg-[var(--surface-secondary)] text-[var(--foreground)] hover:bg-[var(--border)]'
                }`}
              >
                <Clock size={20} />
                Pomodoro
              </button>
              <button
                onClick={() => setActiveView('calendar')}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition ${
                  activeView === 'calendar'
                    ? 'bg-[var(--foreground)] text-[var(--surface)] shadow-lg'
                    : 'bg-[var(--surface-secondary)] text-[var(--foreground)] hover:bg-[var(--border)]'
                }`}
              >
                <CalendarIcon size={20} />
                Calendar
              </button>
              <button
                onClick={toggleDarkMode}
                className="ml-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--surface-secondary)] text-[var(--foreground)] hover:bg-[var(--border)] transition"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeView === 'pomodoro' ? <Pomodoro /> : <Calendar />}
    </main>
  );
}

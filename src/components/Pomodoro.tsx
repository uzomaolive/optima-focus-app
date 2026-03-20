'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, Settings as SettingsIcon, CheckCircle, Trash2, Plus, X, RotateCcw, Clock, BarChart2, Calendar, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Mode = 'focus' | 'short' | 'long';
type RepeatType = 'none' | 'daily' | 'weekly' | 'specific';

interface Task {
  id: string;
  title: string;
  estPomos: number;
  actPomos: number;
  completed: boolean;
  startTime?: string;
  endTime?: string;
  scheduledDate?: string; // YYYY-MM-DD
  scheduledTime?: string; // HH:MM
  reminderSent?: boolean;
  project?: string;
  priority?: 'low' | 'medium' | 'high';
  repeatEnabled?: boolean;
  repeatType?: RepeatType;
  repeatDays?: number[];
}

interface DailyHistory {
  date: string; // YYYY-MM-DD
  pomosCount: number;
  completedTasks: { title: string; actPomos: number; estPomos: number; startTime?: string; endTime?: string }[];
}

const MODES: Record<Mode, { color: string; label: string; bg: string }> = {
  focus: { color: '#ef4444', label: 'Focus', bg: '#fff' },
  short: { color: '#10b981', label: 'Short Break', bg: '#fff' },
  long: { color: '#3b82f6', label: 'Long Break', bg: '#fff' },
};

const WEEKDAY_OPTIONS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

const initializeTasks = (): Task[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('optima-tasks');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Failed to load tasks:', e);
    return [];
  }
};

const initializeSettings = () => {
  if (typeof window === 'undefined') return { focus: 25, short: 5, long: 15 };
  try {
    const saved = localStorage.getItem('optima-settings');
    return saved ? JSON.parse(saved) : { focus: 25, short: 5, long: 15 };
  } catch (e) {
    console.error('Failed to load settings:', e);
    return { focus: 25, short: 5, long: 15 };
  }
};

const initializeHistory = (): DailyHistory[] => {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem('optima-history');
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('Failed to load history:', e);
    return [];
  }
};

export default function Pomodoro() {
  const [mode, setMode] = useState<Mode>('focus');
  const [settings, setSettings] = useState(() => initializeSettings());
  const [timeLeft, setTimeLeft] = useState(() => initializeSettings().focus * 60);
  const [isActive, setIsActive] = useState(false);
  const [tasks, setTasks] = useState<Task[]>(() => initializeTasks());
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [estPomos, setEstPomos] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEstPomos, setEditEstPomos] = useState(1);
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editScheduledTime, setEditScheduledTime] = useState('');
  const [editRepeatEnabled, setEditRepeatEnabled] = useState(false);
  const [editRepeatType, setEditRepeatType] = useState<RepeatType>('none');
  const [editRepeatDays, setEditRepeatDays] = useState<number[]>([]);

  const [newScheduledDate, setNewScheduledDate] = useState('');
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [newRepeatEnabled, setNewRepeatEnabled] = useState(false);
  const [newRepeatType, setNewRepeatType] = useState<RepeatType>('none');
  const [newRepeatDays, setNewRepeatDays] = useState<number[]>([]);
  const [activeSection, setActiveSection] = useState<'focus' | 'schedule'>('focus');
  const [history, setHistory] = useState<DailyHistory[]>(() => initializeHistory());

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const reminderIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Request notification permissions on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Reminder Checker
  useEffect(() => {
    reminderIntervalRef.current = setInterval(() => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      setTasks(prev => {
        let changed = false;
        const updated = prev.map(task => {
          if (!task.completed && task.scheduledDate === today && task.scheduledTime === currentTime && !task.reminderSent) {
            if (Notification.permission === 'granted') {
              new Notification('Task Reminder', { body: `Time for: ${task.title}` });
            }
            changed = true;
            return { ...task, reminderSent: true };
          }
          return task;
        });
        return changed ? updated : prev;
      });
    }, 30000); // Check every 30 seconds

    return () => { if (reminderIntervalRef.current) clearInterval(reminderIntervalRef.current); };
  }, []);

  // Save tasks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('optima-tasks', JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks:', e);
    }
  }, [tasks]);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('optima-settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  }, [settings]);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('optima-history', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save history:', e);
    }
  }, [history]);

  const updateHistory = (pomoInc: number = 0, completedTask?: Task) => {
    const today = new Date().toISOString().split('T')[0];
    setHistory(prev => {
      const existing = prev.find(h => h.date === today);
      const taskData = completedTask ? { 
        title: completedTask.title, 
        actPomos: completedTask.actPomos, 
        estPomos: completedTask.estPomos,
        startTime: completedTask.startTime,
        endTime: completedTask.endTime
      } : null;

      if (existing) {
        return prev.map(h => h.date === today ? {
          ...h,
          pomosCount: h.pomosCount + pomoInc,
          completedTasks: taskData ? [...h.completedTasks, taskData] : h.completedTasks
        } : h);
      } else {
        return [...prev, {
          date: today,
          pomosCount: pomoInc,
          completedTasks: taskData ? [taskData] : []
        }];
      }
    });
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const addDays = (dateString: string, days: number) => {
    const date = new Date(`${dateString}T00:00:00`);
    date.setDate(date.getDate() + days);
    return formatDate(date);
  };

  const getNextSpecificDayDate = (dateString: string, repeatDays: number[]) => {
    if (repeatDays.length === 0) return null;
    const date = new Date(`${dateString}T00:00:00`);
    for (let i = 1; i <= 7; i++) {
      const candidate = new Date(date);
      candidate.setDate(date.getDate() + i);
      if (repeatDays.includes(candidate.getDay())) {
        return formatDate(candidate);
      }
    }
    return null;
  };

  const getNextRecurringDate = (task: Task) => {
    if (!task.repeatEnabled || !task.repeatType || task.repeatType === 'none') return null;

    const today = formatDate(new Date());
    const baseDate = task.scheduledDate || today;

    if (task.repeatType === 'daily') {
      return addDays(baseDate, 1);
    }

    if (task.repeatType === 'weekly') {
      return addDays(baseDate, 7);
    }

    if (task.repeatType === 'specific') {
      return getNextSpecificDayDate(baseDate, task.repeatDays || []);
    }

    return null;
  };

  const getRepeatLabel = (task: Task) => {
    if (!task.repeatEnabled || !task.repeatType || task.repeatType === 'none') return null;
    if (task.repeatType === 'daily') return 'Daily';
    if (task.repeatType === 'weekly') return 'Weekly';
    const labels = WEEKDAY_OPTIONS
      .filter(day => (task.repeatDays || []).includes(day.value))
      .map(day => day.label)
      .join(', ');
    return labels ? labels : 'Specific days';
  };

  const handleTaskSelect = (id: string) => {
    setActiveTaskId(id);
    setTasks(prev => prev.map(t => {
      if (t.id === id && !t.startTime) {
        return { ...t, startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
      }
      return t;
    }));
  };

  const toggleTaskComplete = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    const isNowCompleted = !task.completed;
    
    let updatedTask = { ...task, completed: isNowCompleted };
    if (isNowCompleted) {
      updatedTask.endTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const today = new Date().toISOString().split('T')[0];
      setHistory(prev => {
        const existing = prev.find(h => h.date === today);
        const taskData = { 
          title: updatedTask.title, 
          actPomos: updatedTask.actPomos, 
          estPomos: updatedTask.estPomos,
          startTime: updatedTask.startTime,
          endTime: updatedTask.endTime
        };
        if (existing) {
          return prev.map(h => h.date === today ? { ...h, completedTasks: [...h.completedTasks, taskData] } : h);
        } else {
          return [...prev, { date: today, pomosCount: 0, completedTasks: [taskData] }];
        }
      });

      if (task.repeatEnabled) {
        const nextDate = getNextRecurringDate(task);
        if (nextDate) {
          setTasks(prev => {
            const duplicateExists = prev.some(t =>
              t.id !== task.id &&
              t.title === task.title &&
              t.scheduledDate === nextDate &&
              t.repeatEnabled &&
              t.repeatType === task.repeatType
            );

            if (duplicateExists) {
              return prev.map(t => t.id === id ? updatedTask : t);
            }

            return [
              ...prev.map(t => t.id === id ? updatedTask : t),
              {
                ...task,
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                completed: false,
                actPomos: 0,
                startTime: undefined,
                endTime: undefined,
                scheduledDate: nextDate,
                reminderSent: false,
                repeatDays: task.repeatDays ? [...task.repeatDays] : [],
              },
            ];
          });
          return;
        }
      }
    }
    setTasks(tasks.map(t => t.id === id ? updatedTask : t));
  };

  const saveTaskEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTaskId) return;
    setTasks(prev => prev.map(t => t.id === editingTaskId ? { 
      ...t, 
      title: editTitle, 
      estPomos: editEstPomos,
      scheduledDate: editScheduledDate,
      scheduledTime: editScheduledTime,
      repeatEnabled: editRepeatEnabled,
      repeatType: editRepeatEnabled ? editRepeatType : 'none',
      repeatDays: editRepeatEnabled && editRepeatType === 'specific' ? editRepeatDays : [],
      reminderSent: false // Reset reminder sent status on edit
    } : t));
    setEditingTaskId(null);
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditEstPomos(task.estPomos);
    setEditScheduledDate(task.scheduledDate || '');
    setEditScheduledTime(task.scheduledTime || '');
    setEditRepeatEnabled(Boolean(task.repeatEnabled));
    setEditRepeatType(task.repeatType || 'none');
    setEditRepeatDays(task.repeatDays || []);
  };

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    const newTask: Task = { 
      id: Date.now().toString(), 
      title: newTaskTitle, 
      estPomos, 
      actPomos: 0, 
      completed: false,
      scheduledDate: newScheduledDate,
      scheduledTime: newScheduledTime,
      repeatEnabled: newRepeatEnabled,
      repeatType: newRepeatEnabled ? newRepeatType : 'none',
      repeatDays: newRepeatEnabled && newRepeatType === 'specific' ? newRepeatDays : [],
      reminderSent: false
    };
    setTasks([...tasks, newTask]);
    setNewTaskTitle('');
    setEstPomos(1);
    setNewScheduledDate('');
    setNewScheduledTime('');
    setNewRepeatEnabled(false);
    setNewRepeatType('none');
    setNewRepeatDays([]);
    setIsAdding(false);
    if (!activeTaskId) setActiveTaskId(newTask.id);
  };


  // Sync Color & Title
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', MODES[mode].color);
    document.documentElement.style.setProperty('--accent-soft', `${MODES[mode].color}1a`);
    const activeTask = tasks.find(t => t.id === activeTaskId);
    document.title = `${formatTime(timeLeft)} • ${activeTask ? activeTask.title : MODES[mode].label}`;
  }, [mode, timeLeft, activeTaskId, tasks]);

  // Timer Logic
  useEffect(() => {
    if (isActive && timeLeft > 0) {
      timerRef.current = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      handleTimerComplete();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isActive, timeLeft]);

  const handleTimerComplete = () => {
    setIsActive(false);
    if (mode === 'focus') {
      updateHistory(1);
      if (activeTaskId) {
        setTasks(prev => prev.map(t => t.id === activeTaskId ? { ...t, actPomos: t.actPomos + 1 } : t));
      }
    }
    resetTimer(mode === 'focus' ? 'short' : 'focus');
    if (Notification.permission === 'granted') {
      new Notification('Timer Finished!', { body: mode === 'focus' ? 'Break time!' : 'Back to focus!' });
    }
  };

  const toggleTimer = () => setIsActive(!isActive);

  const resetTimer = (newMode: Mode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(settings[newMode] * 60);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = 1 - (timeLeft / (settings[mode] * 60));

  return (
    <div className="min-h-screen bg-[var(--background)] selection:bg-[var(--accent-soft)] selection:text-[var(--accent)] transition-colors duration-1000">
      <div className="max-w-xl mx-auto pt-16 px-6 pb-24">
        {/* Navigation / Header */}
        <header className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[var(--surface)] flex items-center justify-center shadow-sm border border-[var(--border)]">
              <Clock className="w-5 h-5 text-[var(--accent)]" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-[var(--foreground)]">Optima</h1>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveSection(activeSection === 'focus' ? 'schedule' : 'focus')}
              className={`flex items-center gap-2 p-2.5 rounded-xl transition-all shadow-sm ${
                activeSection === 'schedule' 
                  ? 'bg-[var(--accent)] text-white' 
                  : 'bg-[var(--surface)] text-gray-500 dark:text-[var(--foreground)] opacity-50 border border-[var(--border)]'
              }`}
            >
              <Calendar className="w-5 h-5" />
              <span className="text-sm font-bold uppercase tracking-tight pr-1">Schedule</span>
            </button>
            <button 
              onClick={() => setIsHistoryOpen(true)}
              className="p-2.5 rounded-xl hover:bg-indigo-100 dark:hover:bg-white/[0.05] transition-all text-gray-500 dark:text-[var(--foreground)] opacity-50 bg-[var(--surface)] border border-[var(--border)]"
            >
              <BarChart2 className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2.5 rounded-xl hover:bg-indigo-100 dark:hover:bg-white/[0.05] transition-all text-gray-500 dark:text-[var(--foreground)] opacity-50 bg-[var(--surface)] border border-[var(--border)]"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </header>

        {activeSection === 'focus' ? (
          <>
            {/* Floating Timer Card */}
            <motion.div 
              layout
              className="timer-card rounded-[2rem] p-10 mb-12 relative overflow-hidden text-center"
            >
              {/* Progress bar background */}
          <div className="absolute top-0 left-0 w-full h-1 bg-black/[0.02] dark:bg-white/[0.03]">
            <motion.div 
              initial={false}
              animate={{ width: `${progress * 100}%` }}
              className="h-full bg-[var(--accent)] shadow-[0_0_10px_var(--accent)] transition-all duration-1000"
            />
          </div>

          <div className="flex justify-center gap-1.5 mb-10 p-1 bg-[var(--surface-secondary)] rounded-2xl w-fit mx-auto border border-[var(--border)]">
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => resetTimer(m)}
                className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${
                  mode === m 
                    ? 'bg-[var(--accent)] text-white shadow-sm' 
                    : 'text-[var(--foreground)] opacity-70 hover:opacity-100 hover:bg-[var(--surface)]'
                }`}
              >
                {MODES[m].label}
              </button>
            ))}
          </div>

          <motion.h2 
            key={`${mode}-${timeLeft}`}
            initial={{ y: 5, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="text-[9.5rem] font-black text-[var(--foreground)] tabular-nums leading-none tracking-tighter mb-12"
          >
            {formatTime(timeLeft)}
          </motion.h2>

          <div className="flex items-center justify-center gap-6">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleTimer}
              className={`h-16 px-14 rounded-2xl text-xl font-bold transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 ${
                isActive 
                  ? 'bg-[var(--foreground)] text-[var(--surface)]' 
                  : 'bg-[var(--accent)] text-white'
              }`}
            >
              {isActive ? 'Pause' : 'Start Focus'}
            </motion.button>
            
            {isActive && (
              <motion.button 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => handleTimerComplete()}
                className="w-16 h-16 rounded-2xl bg-[var(--surface-secondary)] flex items-center justify-center text-[var(--foreground)] opacity-70 hover:opacity-100 transition-colors"
              >
                <SkipForward className="w-6 h-6 fill-current" />
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* Task Section */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-2">
            <h3 className="text-lg font-bold text-[var(--foreground)]">Tasks</h3>
            <button 
              onClick={() => { if(confirm('Clear tasks?')) setTasks([]); }}
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {tasks.filter(t => {
                const today = new Date().toISOString().split('T')[0];
                return !t.scheduledDate || t.scheduledDate === today || t.id === activeTaskId;
              }).map((task) => (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => handleTaskSelect(task.id)}
                  className={`task-item flex flex-col p-5 rounded-3xl bg-[var(--surface-secondary)] border border-[var(--border)] cursor-pointer shadow-sm ${
                    activeTaskId === task.id ? 'ring-2 ring-[var(--accent)] shadow-md' : ''
                  } ${task.completed ? 'opacity-50' : ''}`}
                >
                  {editingTaskId === task.id ? (
                    <form onSubmit={saveTaskEdit} className="space-y-4">
                      <input
                        autoFocus
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-lg font-bold bg-transparent focus:outline-none text-[var(--foreground)] border-b border-[var(--border)] pb-2"
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-[var(--foreground)] opacity-70">Date</label>
                          <input
                            type="date"
                            value={editScheduledDate}
                            onChange={(e) => setEditScheduledDate(e.target.value)}
                            className="p-2.5 bg-[var(--surface-secondary)] rounded-xl font-bold text-[var(--foreground)]"
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-[var(--foreground)] opacity-70">Time</label>
                          <input
                            type="time"
                            value={editScheduledTime}
                            onChange={(e) => setEditScheduledTime(e.target.value)}
                            className="p-2.5 bg-[var(--surface-secondary)] rounded-xl font-bold text-[var(--foreground)]"
                          />
                        </div>
                      </div>
                      <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--surface-secondary)] space-y-2">
                        <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--foreground)] opacity-70">
                          <input
                            type="checkbox"
                            checked={editRepeatEnabled}
                            onChange={(e) => {
                              setEditRepeatEnabled(e.target.checked);
                              if (e.target.checked && editRepeatType === 'none') {
                                setEditRepeatType('daily');
                              }
                            }}
                          />
                          Repeat
                        </label>

                        {editRepeatEnabled && (
                          <>
                            <select
                              value={editRepeatType}
                              onChange={(e) => setEditRepeatType(e.target.value as RepeatType)}
                              className="w-full p-2.5 bg-[var(--surface)] rounded-xl font-bold text-[var(--foreground)]"
                            >
                              <option value="daily">Daily</option>
                              <option value="weekly">Weekly</option>
                              <option value="specific">Specific days</option>
                            </select>

                            {editRepeatType === 'specific' && (
                              <div className="flex flex-wrap gap-1">
                                {WEEKDAY_OPTIONS.map(day => {
                                  const selected = editRepeatDays.includes(day.value);
                                  return (
                                    <button
                                      key={day.value}
                                      type="button"
                                      onClick={() => {
                                        setEditRepeatDays(prev =>
                                          prev.includes(day.value)
                                            ? prev.filter(d => d !== day.value)
                                            : [...prev, day.value].sort((a, b) => a - b)
                                        );
                                      }}
                                      className={`px-2 py-1 rounded text-xs border transition ${
                                        selected
                                          ? 'bg-[var(--foreground)] text-[var(--surface)] border-[var(--foreground)]'
                                          : 'bg-[var(--surface)] text-[var(--foreground)] border-[var(--border)]'
                                      }`}
                                    >
                                      {day.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="font-bold text-xs uppercase tracking-widest text-[var(--foreground)] opacity-70">Est. Pomos</span>
                          <input
                            type="number"
                            min="1"
                            value={editEstPomos}
                            onChange={(e) => setEditEstPomos(parseInt(e.target.value))}
                            className="w-16 p-2 bg-[var(--surface-secondary)] rounded-xl font-bold text-center text-[var(--foreground)]"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditingTaskId(null)} className="px-4 py-2 font-bold text-[var(--foreground)] opacity-70">Cancel</button>
                          <button type="submit" className="px-6 py-2 bg-[var(--foreground)] text-[var(--surface)] rounded-xl font-bold">Save</button>
                        </div>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-center gap-4">
                          <button 
                            onClick={(e) => { e.stopPropagation(); toggleTaskComplete(task.id); }}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              task.completed ? 'bg-[var(--accent)] border-[var(--accent)] text-white' : 'border-[var(--border)]'
                            }`}
                          >
                            {task.completed && <CheckCircle className="w-4 h-4" />}
                          </button>
                          
                          <div className="flex-1 flex flex-col">
                            <span className={`font-bold text-[var(--foreground)] ${task.completed ? 'line-through opacity-40' : ''}`}>
                              {task.title}
                            </span>
                            <div className="flex gap-3 mt-1">
                              {task.startTime && (
                                <span className="text-[10px] text-[var(--foreground)] opacity-50 uppercase font-bold tracking-tighter flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {task.startTime} {task.endTime ? `— ${task.endTime}` : '(In progress)'}
                                </span>
                              )}
                            {task.scheduledDate && (
                              <span className="text-[10px] text-[var(--accent)] uppercase font-black tracking-widest flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" />
                                {task.scheduledDate} {task.scheduledTime && `@ ${task.scheduledTime}`}
                              </span>
                            )}
                            {getRepeatLabel(task) && (
                              <span className="text-[10px] text-blue-600 dark:text-blue-300 uppercase font-black tracking-widest">
                                Repeat: {getRepeatLabel(task)}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--foreground)] opacity-70 font-mono">
                            {task.actPomos}/{task.estPomos}
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); startEditing(task); }}
                            className="p-1.5 hover:bg-[var(--surface-secondary)] text-[var(--foreground)] opacity-70 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setTasks(tasks.filter(t => t.id !== task.id)); }}
                            className="p-1.5 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-400 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {!isAdding ? (
              <button
                onClick={() => setIsAdding(true)}
                className="w-full py-5 rounded-3xl border-2 border-solid border-indigo-500 dark:border-zinc-700 flex items-center justify-center gap-2 font-bold text-indigo-600 dark:text-zinc-300 hover:text-indigo-700 dark:hover:text-zinc-200 hover:bg-[var(--surface-secondary)]/50 transition-all"
              >
                <Plus className="w-5 h-5" /> Add Task
              </button>
            ) : (
              <motion.form 
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onSubmit={addTask} 
                className="bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border)] shadow-xl"
              >
                <input
                  autoFocus
                  type="text"
                  placeholder="Task name"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full text-xl font-bold bg-transparent mb-4 focus:outline-none placeholder:text-[var(--foreground)] opacity-50 dark:placeholder:text-zinc-500 text-[var(--foreground)]"
                />
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-[var(--foreground)] opacity-70 tracking-widest">Schedule Date</label>
                    <input
                      type="date"
                      value={newScheduledDate}
                      onChange={(e) => setNewScheduledDate(e.target.value)}
                      className="p-3 bg-[var(--surface-secondary)] rounded-xl font-bold text-[var(--foreground)]"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-black uppercase text-[var(--foreground)] opacity-70 tracking-widest">Schedule Time</label>
                    <input
                      type="time"
                      value={newScheduledTime}
                      onChange={(e) => setNewScheduledTime(e.target.value)}
                      className="p-3 bg-[var(--surface-secondary)] rounded-xl font-bold text-[var(--foreground)]"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-[var(--border)] p-3 bg-[var(--surface-secondary)] mb-6 space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase text-[var(--foreground)] opacity-70 tracking-widest">
                    <input
                      type="checkbox"
                      checked={newRepeatEnabled}
                      onChange={(e) => {
                        setNewRepeatEnabled(e.target.checked);
                        if (e.target.checked && newRepeatType === 'none') {
                          setNewRepeatType('daily');
                        }
                      }}
                    />
                    Repeat
                  </label>

                  {newRepeatEnabled && (
                    <>
                      <select
                        value={newRepeatType}
                        onChange={(e) => setNewRepeatType(e.target.value as RepeatType)}
                        className="w-full p-3 bg-[var(--surface)] rounded-xl font-bold text-[var(--foreground)]"
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="specific">Specific days</option>
                      </select>

                      {newRepeatType === 'specific' && (
                        <div className="flex flex-wrap gap-1">
                          {WEEKDAY_OPTIONS.map(day => {
                            const selected = newRepeatDays.includes(day.value);
                            return (
                              <button
                                key={day.value}
                                type="button"
                                onClick={() => {
                                  setNewRepeatDays(prev =>
                                    prev.includes(day.value)
                                      ? prev.filter(d => d !== day.value)
                                      : [...prev, day.value].sort((a, b) => a - b)
                                  );
                                }}
                                className={`px-2 py-1 rounded text-xs border transition ${
                                  selected
                                    ? 'bg-[var(--foreground)] text-[var(--surface)] border-[var(--foreground)]'
                                    : 'bg-[var(--surface)] text-[var(--foreground)] border-[var(--border)]'
                                }`}
                              >
                                {day.label}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <span className="font-bold text-xs uppercase tracking-widest text-[var(--foreground)] opacity-70">Est. Pomos</span>
                  <input
                    type="number"
                    min="1"
                    value={estPomos}
                    onChange={(e) => setEstPomos(parseInt(e.target.value))}
                    className="w-20 p-2.5 bg-[var(--surface-secondary)] rounded-xl font-bold text-center text-[var(--foreground)]"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setNewRepeatEnabled(false);
                      setNewRepeatType('none');
                      setNewRepeatDays([]);
                    }}
                    className="px-6 py-2.5 font-bold text-[var(--foreground)] opacity-70"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-8 py-2.5 bg-[var(--foreground)] text-[var(--surface)] rounded-xl font-bold">Save</button>
                </div>
              </motion.form>
            )}
          </div>
        </section>
      </>
    ) : (
      <motion.section 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black text-[var(--foreground)] uppercase tracking-tighter italic">Weekly Planner</h2>
          <button 
            onClick={() => { setIsAdding(!isAdding); }}
            className="flex items-center gap-2 px-6 py-2.5 bg-[var(--accent)] text-white rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-[var(--accent)]/20"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Close' : 'Quick Add'}
          </button>
        </div>

        {isAdding && (
          <motion.form 
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={addTask} 
            className="bg-[var(--surface)] rounded-3xl p-6 border border-[var(--border)] shadow-xl"
          >
            <input
              autoFocus
              type="text"
              placeholder="What needs to be done?"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              className="w-full text-xl font-bold bg-transparent mb-4 focus:outline-none placeholder:text-[var(--foreground)] opacity-50 dark:placeholder:text-zinc-500 text-[var(--foreground)]"
            />
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-[var(--foreground)] opacity-50 tracking-widest">Schedule Date</label>
                <input
                  type="date"
                  value={newScheduledDate}
                  onChange={(e) => setNewScheduledDate(e.target.value)}
                  className="p-3 bg-[var(--surface-secondary)] rounded-xl font-bold text-[var(--foreground)]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black uppercase text-[var(--foreground)] opacity-50 tracking-widest">Schedule Time</label>
                <input
                  type="time"
                  value={newScheduledTime}
                  onChange={(e) => setNewScheduledTime(e.target.value)}
                  className="p-3 bg-[var(--surface-secondary)] rounded-xl font-bold text-[var(--foreground)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-4 mb-6">
              <span className="font-bold text-xs uppercase tracking-widest text-[var(--foreground)] opacity-50">Est. Pomos</span>
              <input
                type="number"
                min="1"
                value={estPomos}
                onChange={(e) => setEstPomos(parseInt(e.target.value))}
                className="w-20 p-2.5 bg-[var(--surface-secondary)] rounded-xl font-bold text-center text-[var(--foreground)]"
              />
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsAdding(false)} className="px-6 py-2.5 font-bold text-[var(--foreground)] opacity-50">Cancel</button>
              <button type="submit" className="px-8 py-2.5 bg-[var(--foreground)] text-[var(--surface)] rounded-xl font-bold">Save Task</button>
            </div>
          </motion.form>
        )}

        {/* Group tasks by date */}
        {(() => {
          const sortedTasks = [...tasks].sort((a, b) => {
            if (!a.scheduledDate) return 1;
            if (!b.scheduledDate) return -1;
            return a.scheduledDate.localeCompare(b.scheduledDate);
          });

          const groups = sortedTasks.reduce((acc, task) => {
            const date = task.scheduledDate || 'Unscheduled';
            if (!acc[date]) acc[date] = [];
            acc[date].push(task);
            return acc;
          }, {} as Record<string, Task[]>);

          return Object.entries(groups).map(([date, items]) => (
            <div key={date} className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-px flex-1 bg-[var(--border)]" />
                <span className="text-xs font-black text-[var(--foreground)] opacity-50 uppercase tracking-[0.2em] px-2 bg-[var(--background)] relative z-10">
                  {date === 'Unscheduled' ? date : new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
                <div className="h-px flex-1 bg-[var(--border)]" />
              </div>

              <div className="space-y-3">
                {items.map(task => (
                  <motion.div
                    key={task.id}
                    onClick={() => { setActiveSection('focus'); handleTaskSelect(task.id); }}
                    className="task-item p-5 rounded-3xl bg-[var(--surface-secondary)] border border-[var(--border)] flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${task.completed ? 'bg-green-500' : 'bg-[var(--border)]'}`} />
                      <div className="flex flex-col">
                        <span className={`font-bold ${task.completed ? 'line-through opacity-40' : 'text-[var(--foreground)]'}`}>
                          {task.title}
                        </span>
                        {task.scheduledTime && (
                          <span className="text-[10px] font-black text-[var(--accent)] uppercase tracking-widest mt-0.5">
                            {task.scheduledTime}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); startEditing(task); }} className="text-[var(--foreground)] opacity-50 hover:text-zinc-600"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={(e) => { e.stopPropagation(); setTasks(tasks.filter(t => t.id !== task.id)); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ));
        })()}

        {tasks.length === 0 && (
          <div className="text-center py-20 bg-[var(--surface)] rounded-[3rem] border-2 border-dashed border-[var(--border)]">
            <Calendar className="w-16 h-16 text-[var(--foreground)] opacity-20 mx-auto mb-4" />
            <p className="text-[var(--foreground)] opacity-40 font-bold">Your schedule is empty. Plan your success!</p>
          </div>
        )}
      </motion.section>
    )}
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsSettingsOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-sm bg-[var(--surface)] rounded-[2rem] p-8 shadow-2xl border border-[var(--border)]">
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-lg font-black uppercase tracking-widest text-[var(--foreground)] opacity-70">Settings</h3>
                <button onClick={() => setIsSettingsOpen(false)}><X className="w-5 h-5" /></button>
              </div>

              <div className="space-y-8 mb-10">
                <div className="grid grid-cols-3 gap-4">
                  {(['focus', 'short', 'long'] as const).map(type => (
                    <div key={type} className="space-y-2">
                      <label className="block text-[10px] font-black text-[var(--foreground)] opacity-70 uppercase tracking-tighter capitalize">{type}</label>
                      <input
                        type="number"
                        value={settings[type]}
                        onChange={(e) => setSettings({...settings, [type]: parseInt(e.target.value)})}
                        className="w-full p-4 bg-[var(--surface-secondary)] rounded-2xl font-black text-center text-[var(--foreground)]"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <button 
                onClick={() => { setTimeLeft(settings[mode] * 60); setIsSettingsOpen(false); }}
                className="w-full py-5 bg-[var(--accent)] text-white rounded-2xl font-bold text-lg shadow-lg hover:shadow-[0_10px_30px_rgba(239,68,68,0.3)] transition-all"
              >
                Save Changes
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* History Modal */}
      <AnimatePresence>
        {isHistoryOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsHistoryOpen(false)} className="absolute inset-0 bg-black/40 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-lg bg-[var(--surface)] rounded-[2rem] p-8 shadow-2xl border border-[var(--border)] max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-10 sticky top-0 bg-[var(--surface)] py-2 z-10">
                <h3 className="text-lg font-black uppercase tracking-widest text-[var(--foreground)] opacity-70">Insights</h3>
                <button onClick={() => setIsHistoryOpen(false)}><X className="w-5 h-5" /></button>
              </div>

              {/* Weekly/Monthly Summary */}
              <div className="grid grid-cols-2 gap-4 mb-10">
                <div className="p-6 rounded-[2rem] bg-[var(--accent-soft)] border border-[var(--accent)]/10 text-center">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--accent)]/60 mb-1">Week</div>
                  <div className="text-3xl font-black text-[var(--accent)]">
                    {history.filter(h => {
                      const date = new Date(h.date);
                      const now = new Date();
                      const diff = (now.getTime() - date.getTime()) / (1000 * 3600 * 24);
                      return diff < 7;
                    }).reduce((acc, h) => acc + h.pomosCount, 0)}
                  </div>
                </div>
                <div className="p-6 rounded-[2rem] bg-[var(--surface-secondary)] text-center border border-[var(--border)]">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--foreground)] opacity-70 mb-1">Month</div>
                  <div className="text-3xl font-black text-[var(--foreground)]">
                    {history.filter(h => {
                      const date = new Date(h.date);
                      const now = new Date();
                      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                    }).reduce((acc, h) => acc + h.pomosCount, 0)}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {history.length === 0 ? (
                  <div className="text-center py-10">
                    <Calendar className="w-12 h-12 text-indigo-200 dark:text-zinc-800 mx-auto mb-4" />
                    <p className="text-[var(--foreground)] opacity-70">No activity recorded yet. Start focusing!</p>
                  </div>
                ) : (
                  [...history].reverse().map(day => (
                    <div key={day.date} className="p-6 rounded-[2rem] bg-[var(--surface-secondary)]/50 border border-[var(--border)]">
                      <div className="flex justify-between items-center mb-4">
                        <span className="font-bold text-[var(--foreground)]">{new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                        <div className="flex items-center gap-2 px-3 py-1 bg-[var(--accent-soft)] text-[var(--accent)] rounded-lg text-xs font-black">
                          {day.pomosCount} POMOS
                        </div>
                      </div>

                      <div className="space-y-2">
                        {day.completedTasks.length > 0 ? (
                          day.completedTasks.map((task, i) => (
                            <div key={i} className="flex flex-col gap-2 p-4 rounded-2xl bg-[var(--surface)] border border-[var(--border)]">
                              <div className="flex justify-between items-center text-sm">
                                <span className="text-[var(--foreground)] font-bold flex items-center gap-2">
                                  <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                                  {task.title}
                                </span>
                                <span className="text-[var(--foreground)] opacity-50 font-mono text-[10px]">{task.actPomos}/{task.estPomos}</span>
                              </div>
                              <div className="flex justify-between items-center px-6">
                                <div className="flex items-center gap-2">
                                  <Clock className="w-3 h-3 text-zinc-300" />
                                  <div className="flex items-center gap-1 group">
                                    <input
                                      type="text"
                                      className="text-[10px] font-black uppercase text-[var(--foreground)] opacity-70 bg-transparent border-none p-0 w-12 hover:bg-[var(--surface-secondary)] rounded px-1 transition-all"
                                      value={task.startTime || '--:--'}
                                      onChange={(e) => {
                                        const newHistory = [...history];
                                        const dayIdx = newHistory.findIndex(h => h.date === day.date);
                                        newHistory[dayIdx].completedTasks[i].startTime = e.target.value;
                                        setHistory(newHistory);
                                      }}
                                    />
                                    <span className="text-zinc-300">•</span>
                                    <input
                                      type="text"
                                      className="text-[10px] font-black uppercase text-[var(--foreground)] opacity-70 bg-transparent border-none p-0 w-12 hover:bg-[var(--surface-secondary)] rounded px-1 transition-all"
                                      value={task.endTime || '--:--'}
                                      onChange={(e) => {
                                        const newHistory = [...history];
                                        const dayIdx = newHistory.findIndex(h => h.date === day.date);
                                        newHistory[dayIdx].completedTasks[i].endTime = e.target.value;
                                        setHistory(newHistory);
                                      }}
                                    />
                                  </div>
                                </div>
                                <button 
                                  onClick={() => {
                                    if(confirm('Delete this from history?')) {
                                      const newHistory = [...history];
                                      const dayIdx = newHistory.findIndex(h => h.date === day.date);
                                      newHistory[dayIdx].completedTasks.splice(i, 1);
                                      setHistory(newHistory);
                                    }
                                  }}
                                  className="text-[10px] font-bold text-red-300 hover:text-red-500 transition-colors"
                                >
                                  REMOVE
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-[var(--foreground)] opacity-50 italic">No tasks completed on this day</div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

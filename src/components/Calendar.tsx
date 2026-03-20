'use client';

import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Circle, Trash2, Plus, X, Calendar as CalendarIcon, Clock, Flag } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type RepeatType = 'none' | 'daily' | 'weekly' | 'specific';

interface Task {
  id: string;
  title: string;
  estPomos: number;
  actPomos: number;
  completed: boolean;
  startTime?: string;
  endTime?: string;
  scheduledDate?: string;
  scheduledTime?: string;
  reminderSent?: boolean;
  project?: string;
  priority?: 'low' | 'medium' | 'high';
  repeatEnabled?: boolean;
  repeatType?: RepeatType;
  repeatDays?: number[];
}

interface ProjectMetadata {
  name: string;
  color: string;
}

const PRESET_PROJECTS: Record<string, ProjectMetadata> = {
  'work': { name: 'Work', color: '#ef4444' },
  'personal': { name: 'Personal', color: '#3b82f6' },
  'learning': { name: 'Learning', color: '#8b5cf6' },
  'health': { name: 'Health', color: '#10b981' },
  'errands': { name: 'Errands', color: '#f59e0b' },
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

const initializeProjectGoals = (): Record<string, number> => {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem('optima-project-goals');
    return saved ? JSON.parse(saved) : {};
  } catch (e) {
    console.error('Failed to load project goals:', e);
    return {};
  }
};

export default function Calendar() {
  const [tasks, setTasks] = useState<Task[]>(() => initializeTasks());
  const [projectGoals, setProjectGoals] = useState<Record<string, number>>(() => initializeProjectGoals());
  const [goalInputs, setGoalInputs] = useState<Record<string, string>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEstPomos, setEditEstPomos] = useState(1);
  const [editScheduledDate, setEditScheduledDate] = useState('');
  const [editScheduledTime, setEditScheduledTime] = useState('');
  const [editProject, setEditProject] = useState('personal');
  const [editPriority, setEditPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [editRepeatEnabled, setEditRepeatEnabled] = useState(false);
  const [editRepeatType, setEditRepeatType] = useState<RepeatType>('none');
  const [editRepeatDays, setEditRepeatDays] = useState<number[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProject, setNewTaskProject] = useState('personal');
  const [newRepeatEnabled, setNewRepeatEnabled] = useState(false);
  const [newRepeatType, setNewRepeatType] = useState<RepeatType>('none');
  const [newRepeatDays, setNewRepeatDays] = useState<number[]>([]);

  // Set selected date to today
  useEffect(() => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  }, []);

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('optima-tasks', JSON.stringify(tasks));
    } catch (e) {
      console.error('Failed to save tasks:', e);
    }
  }, [tasks]);

  useEffect(() => {
    try {
      localStorage.setItem('optima-project-goals', JSON.stringify(projectGoals));
    } catch (e) {
      console.error('Failed to save project goals:', e);
    }
  }, [projectGoals]);

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  const formatDate = (date: Date) => date.toISOString().split('T')[0];
  const today = formatDate(new Date());

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
    if (task.repeatType === 'daily') return 'Repeats daily';
    if (task.repeatType === 'weekly') return 'Repeats weekly';
    if (task.repeatType === 'specific') {
      const labels = WEEKDAY_OPTIONS
        .filter(day => (task.repeatDays || []).includes(day.value))
        .map(day => day.label)
        .join(', ');
      return labels ? `Repeats: ${labels}` : 'Repeats on specific days';
    }
    return null;
  };

  const getTasksForDate = (dateStr: string) => tasks.filter(t => t.scheduledDate === dateStr);
  const getProjectsInUse = () => {
    const projects = new Set(tasks.map(t => t.project || 'personal'));
    return Array.from(projects);
  };

  const getProjectCompletedPomos = (projectKey: string) => {
    return tasks
      .filter(t => (t.project || 'personal') === projectKey && t.completed)
      .reduce((total, task) => total + (task.actPomos > 0 ? task.actPomos : task.estPomos), 0);
  };

  const setProjectGoal = (projectKey: string) => {
    const rawValue = (goalInputs[projectKey] ?? '').trim();
    const parsed = parseInt(rawValue, 10);

    if (Number.isNaN(parsed) || parsed <= 0) {
      setProjectGoals(prev => {
        const next = { ...prev };
        delete next[projectKey];
        return next;
      });
      setGoalInputs(prev => {
        const next = { ...prev };
        delete next[projectKey];
        return next;
      });
      return;
    }

    setProjectGoals(prev => ({ ...prev, [projectKey]: parsed }));
  };

  const toggleTaskComplete = (taskId: string) => {
    setTasks(prev => {
      const targetIndex = prev.findIndex(t => t.id === taskId);
      if (targetIndex === -1) return prev;

      const task = prev[targetIndex];
      const isNowCompleted = !task.completed;
      const updated = [...prev];
      updated[targetIndex] = { ...task, completed: isNowCompleted };

      if (isNowCompleted && task.repeatEnabled) {
        const nextDate = getNextRecurringDate(task);

        if (nextDate) {
          const duplicateExists = prev.some(t =>
            t.id !== task.id &&
            t.title === task.title &&
            (t.project || 'personal') === (task.project || 'personal') &&
            t.scheduledDate === nextDate &&
            t.repeatEnabled &&
            t.repeatType === task.repeatType
          );

          if (!duplicateExists) {
            updated.push({
              ...task,
              id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              completed: false,
              actPomos: 0,
              startTime: undefined,
              endTime: undefined,
              scheduledDate: nextDate,
              reminderSent: false,
              repeatDays: task.repeatDays ? [...task.repeatDays] : [],
            });
          }
        }
      }

      return updated;
    });
  };

  const deleteTask = (taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
    if (editingTaskId === taskId) setEditingTaskId(null);
  };

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditEstPomos(task.estPomos);
    setEditScheduledDate(task.scheduledDate || '');
    setEditScheduledTime(task.scheduledTime || '');
    setEditProject(task.project || 'personal');
    setEditPriority(task.priority || 'medium');
    setEditRepeatEnabled(Boolean(task.repeatEnabled));
    setEditRepeatType(task.repeatType || 'none');
    setEditRepeatDays(task.repeatDays || []);
  };

  const saveEditedTask = () => {
    if (!editingTaskId) return;
    setTasks(prev => prev.map(t =>
      t.id === editingTaskId
        ? {
            ...t,
            title: editTitle,
            estPomos: editEstPomos,
            scheduledDate: editScheduledDate,
            scheduledTime: editScheduledTime,
            project: editProject,
            priority: editPriority,
            repeatEnabled: editRepeatEnabled,
            repeatType: editRepeatEnabled ? editRepeatType : 'none',
            repeatDays: editRepeatEnabled && editRepeatType === 'specific' ? editRepeatDays : [],
            reminderSent: false,
          }
        : t
    ));
    setEditingTaskId(null);
  };

  const addNewTask = () => {
    if (!newTaskTitle.trim() || !selectedDate) return;
    const id = Date.now().toString();
    const newTask: Task = {
      id,
      title: newTaskTitle,
      estPomos: 1,
      actPomos: 0,
      completed: false,
      scheduledDate: selectedDate,
      scheduledTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      project: newTaskProject,
      priority: 'medium',
      repeatEnabled: newRepeatEnabled,
      repeatType: newRepeatEnabled ? newRepeatType : 'none',
      repeatDays: newRepeatEnabled && newRepeatType === 'specific' ? newRepeatDays : [],
    };
    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
    setNewRepeatEnabled(false);
    setNewRepeatType('none');
    setNewRepeatDays([]);
    setShowAddTask(false);
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      days.push(formatDate(date));
    }

    return (
      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="h-10 flex items-center justify-center font-semibold text-[var(--foreground)] opacity-70 text-sm">
            {day}
          </div>
        ))}
        {days.map((dateStr, idx) => {
          const tasksForDate = dateStr ? getTasksForDate(dateStr) : [];
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const dayNum = dateStr ? new Date(dateStr).getDate() : null;

          return (
            <motion.button
              key={idx}
              onClick={() => dateStr && setSelectedDate(dateStr)}
              whileHover={dateStr ? { scale: 1.02 } : {}}
              className={`h-24 rounded-lg transition relative overflow-hidden border-2 ${
                dateStr
                  ? isSelected
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]'
                    : isToday
                    ? 'border-[var(--foreground)] bg-[var(--surface-secondary)] shadow-inner'
                    : 'border-[var(--border)] bg-[var(--surface-secondary)] hover:border-[var(--accent)] hover:border-opacity-30'
                  : 'border-[var(--border)] bg-transparent cursor-default'
              }`}
            >
              {dateStr && (
                <>
                  <div className={`text-xs font-bold p-1 ${isToday ? 'text-red-700 dark:text-red-400' : isSelected ? 'text-blue-700 dark:text-blue-400' : 'text-[var(--foreground)]'}`}>
                    {dayNum}
                  </div>
                  <div className="px-1 space-y-0.5 overflow-y-auto max-h-16">
                    {tasksForDate.slice(0, 3).map(task => (
                      <div
                        key={task.id}
                        className="text-xs px-1.5 py-0.5 rounded truncate text-white font-medium shadow-sm"
                        style={{
                          backgroundColor: PRESET_PROJECTS[task.project || 'personal']?.color || '#3b82f6',
                        }}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {tasksForDate.length > 3 && (
                      <div className="text-xs text-[var(--foreground)] opacity-60 px-1">+{tasksForDate.length - 3}</div>
                    )}
                  </div>
                </>
              )}
            </motion.button>
          );
        })}
      </div>
    );
  };

  const selectedDateTasks = selectedDate ? getTasksForDate(selectedDate) : [];
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="flex h-screen bg-[var(--background)] transition-colors duration-300">
      {/* Left Sidebar - Projects */}
      <div className="w-56 bg-[var(--surface)] border-r border-[var(--border)] flex flex-col transition-colors duration-300">
        <div className="p-6 border-b border-[var(--border)]">
          <h2 className="text-lg font-bold text-[var(--foreground)]">Projects</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          {Object.entries(PRESET_PROJECTS).map(([key, project]) => {
            const count = tasks.filter(t => (t.project || 'personal') === key && !t.completed).length;
            const goal = projectGoals[key] || 0;
            const completedPomos = getProjectCompletedPomos(key);
            const progress = goal > 0 ? Math.min(100, (completedPomos / goal) * 100) : 0;
            return (
              <div key={key} className="px-3 py-3 rounded-lg bg-[var(--surface-secondary)] border border-[var(--border)]">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: project.color }} />
                  <span className="flex-1 text-sm text-[var(--foreground)]">{project.name}</span>
                  <span className="text-xs text-[var(--foreground)] opacity-70">{count}</span>
                </div>

                <div className="mt-2">
                  <div className="w-full h-2 rounded-full bg-[var(--border)] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${progress}%`, backgroundColor: project.color }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-[var(--foreground)] opacity-70">
                    <span>{goal > 0 ? `${completedPomos}/${goal} pomos` : 'No goal set'}</span>
                    {goal > 0 && <span>{Math.round(progress)}%</span>}
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    placeholder="Goal"
                    value={goalInputs[key] ?? (goal > 0 ? String(goal) : '')}
                    onChange={e => setGoalInputs(prev => ({ ...prev, [key]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && setProjectGoal(key)}
                    className="w-full px-2 py-1 text-xs border border-[var(--border)] rounded bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-[var(--accent)]"
                  />
                  <button
                    onClick={() => setProjectGoal(key)}
                    className="px-2 py-1 text-xs rounded bg-[var(--foreground)] text-[var(--surface)] hover:opacity-90 transition"
                  >
                    Set
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="bg-[var(--surface)] border-b border-[var(--border)] px-6 py-4 flex items-center justify-between transition-colors duration-300">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
              className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] transition text-[var(--foreground)]"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="text-xl font-bold text-[var(--foreground)]">{monthName}</div>
            <button
              onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
              className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] transition text-[var(--foreground)]"
            >
              <ChevronRight size={20} />
            </button>
            <button
              onClick={() => {
                setCurrentDate(new Date());
                setSelectedDate(today);
              }}
              className="ml-4 px-4 py-2 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--border)] text-[var(--foreground)] text-sm font-medium transition"
            >
              Today
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Calendar Grid */}
          <div className="flex-1 overflow-auto p-6">
            {renderCalendarGrid()}
          </div>

          {/* Right Sidebar - Task Details */}
          <div className="w-96 bg-[var(--surface)] border-l border-[var(--border)] flex flex-col transition-colors duration-300">
            <div className="border-b border-[var(--border)] p-6">
              <h3 className="text-lg font-bold text-[var(--foreground)]">
                {selectedDate && new Date(selectedDate).toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              <AnimatePresence>
                {selectedDateTasks.map(task => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-4 rounded-lg border-l-4 transition cursor-pointer ${
                      editingTaskId === task.id
                        ? 'bg-[var(--accent-soft)] border-[var(--accent)]'
                        : task.completed
                        ? 'bg-[var(--surface-secondary)] border-[var(--border)] opacity-60'
                        : 'bg-[var(--surface-secondary)] border-[var(--border)] hover:border-[var(--accent)] hover:border-opacity-50'
                    }`}
                    onClick={() => !editingTaskId && startEditingTask(task)}
                  >
                    {editingTaskId === task.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={e => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm font-medium bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                        />
                        <select
                          value={editProject}
                          onChange={e => setEditProject(e.target.value)}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                        >
                          {Object.entries(PRESET_PROJECTS).map(([key, p]) => (
                            <option key={key} value={key}>{p.name}</option>
                          ))}
                        </select>
                        <select
                          value={editPriority}
                          onChange={e => setEditPriority(e.target.value as 'low' | 'medium' | 'high')}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                        >
                          <option value="low">Low Priority</option>
                          <option value="medium">Medium Priority</option>
                          <option value="high">High Priority</option>
                        </select>
                        <input
                          type="date"
                          value={editScheduledDate}
                          onChange={e => setEditScheduledDate(e.target.value)}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="time"
                          value={editScheduledTime}
                          onChange={e => setEditScheduledTime(e.target.value)}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                        />
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={editEstPomos}
                          onChange={e => setEditEstPomos(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-blue-500"
                        />
                        <div className="rounded-lg border border-[var(--border)] p-3 space-y-2 bg-[var(--surface)]">
                          <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                            <input
                              type="checkbox"
                              checked={editRepeatEnabled}
                              onChange={e => {
                                setEditRepeatEnabled(e.target.checked);
                                if (e.target.checked && editRepeatType === 'none') {
                                  setEditRepeatType('daily');
                                }
                              }}
                            />
                            Repeat task
                          </label>

                          {editRepeatEnabled && (
                            <>
                              <select
                                value={editRepeatType}
                                onChange={e => setEditRepeatType(e.target.value as RepeatType)}
                                className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none focus:border-blue-500"
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
                                            : 'bg-[var(--surface-secondary)] text-[var(--foreground)] border-[var(--border)]'
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
                        <div className="flex gap-2">
                          <button
                            onClick={() => saveEditedTask()}
                            className="flex-1 bg-[var(--foreground)] text-[var(--surface)] py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTaskId(null)}
                            className="flex-1 bg-[var(--surface-secondary)] text-[var(--foreground)] py-2 rounded-lg text-sm font-medium hover:bg-[var(--border)] transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              toggleTaskComplete(task.id);
                            }}
                            className="mt-0.5 flex-shrink-0"
                          >
                            {task.completed ? (
                              <CheckCircle size={20} className="text-green-600" />
                            ) : (
                              <Circle size={20} className="text-[var(--foreground)] opacity-40" />
                            )}
                          </button>
                          <div className="flex-1">
                            <p className={`font-medium text-sm ${task.completed ? 'line-through text-[var(--foreground)] opacity-50' : 'text-[var(--foreground)]'}`}>
                              {task.title}
                            </p>
                            <div className="flex gap-2 mt-2 flex-wrap">
                              <span className="text-xs px-2 py-1 rounded text-white" style={{
                                backgroundColor: PRESET_PROJECTS[task.project || 'personal']?.color,
                              }}>
                                {PRESET_PROJECTS[task.project || 'personal']?.name}
                              </span>
                              {task.priority === 'high' && (
                                <span className="text-xs px-2 py-1 rounded bg-red-500 bg-opacity-20 text-red-600 dark:text-red-400 flex items-center gap-1">
                                  <Flag size={12} /> High
                                </span>
                              )}
                              {task.scheduledTime && (
                                <span className="text-xs px-2 py-1 rounded bg-[var(--surface-secondary)] text-[var(--foreground)] flex items-center gap-1">
                                  <Clock size={12} /> {task.scheduledTime}
                                </span>
                              )}
                              {getRepeatLabel(task) && (
                                <span className="text-xs px-2 py-1 rounded bg-blue-500 bg-opacity-15 text-blue-700 dark:text-blue-300">
                                  {getRepeatLabel(task)}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--foreground)] opacity-60 mt-2">{task.estPomos} pomodoros</p>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              startEditingTask(task);
                            }}
                            className="flex-1 text-xs bg-[var(--foreground)] text-[var(--surface)] py-1.5 rounded hover:opacity-90 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              deleteTask(task.id);
                            }}
                            className="text-xs bg-[var(--accent)] text-white px-3 py-1.5 rounded hover:opacity-90 transition"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {selectedDateTasks.length === 0 && !showAddTask && (
                <div className="text-center py-8">
                  <p className="text-[var(--foreground)] opacity-50 text-sm">No tasks for this day</p>
                </div>
              )}

              {showAddTask && (
                <div className="p-4 rounded-lg bg-[var(--accent-soft)] border-2 border-[var(--accent)] space-y-2">
                  <input
                    type="text"
                    placeholder="Add a task..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addNewTask()}
                    className="w-full px-3 py-2 border border-[var(--accent)] rounded-lg text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none"
                    autoFocus
                  />
                  <select
                    value={newTaskProject}
                    onChange={e => setNewTaskProject(e.target.value)}
                    className="w-full px-3 py-2 border border-[var(--accent)] rounded-lg text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none"
                  >
                    {Object.entries(PRESET_PROJECTS).map(([key, p]) => (
                      <option key={key} value={key}>{p.name}</option>
                    ))}
                  </select>
                  <div className="rounded-lg border border-[var(--accent)] p-3 bg-[var(--surface)] space-y-2">
                    <label className="flex items-center gap-2 text-sm text-[var(--foreground)]">
                      <input
                        type="checkbox"
                        checked={newRepeatEnabled}
                        onChange={e => {
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
                          onChange={e => setNewRepeatType(e.target.value as RepeatType)}
                          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg text-sm bg-[var(--surface)] text-[var(--foreground)] focus:outline-none"
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
                                      : 'bg-[var(--surface-secondary)] text-[var(--foreground)] border-[var(--border)]'
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
                  <div className="flex gap-2">
                    <button
                      onClick={addNewTask}
                      className="flex-1 bg-[var(--foreground)] text-[var(--surface)] py-2 rounded-lg text-sm font-medium hover:opacity-90 transition"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowAddTask(false);
                        setNewTaskTitle('');
                        setNewRepeatEnabled(false);
                        setNewRepeatType('none');
                        setNewRepeatDays([]);
                      }}
                      className="flex-1 bg-[var(--surface-secondary)] text-[var(--foreground)] py-2 rounded-lg text-sm font-medium hover:bg-[var(--border)] transition"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {!showAddTask && selectedDate && (
              <div className="border-t border-[var(--border)] p-6">
                <button
                  onClick={() => setShowAddTask(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed border-[var(--border)] text-[var(--foreground)] hover:border-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition font-medium"
                >
                  <Plus size={18} />
                  Add Task
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

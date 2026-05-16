import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar as CalendarIcon, Clock, Plus, CheckCircle2,
  Circle, Play, Pause, RotateCcw, Sparkles, Trash2, RefreshCw
} from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { plannerService } from '../services/index';
import toast from 'react-hot-toast';

const PRIORITY_COLORS = {
  High:   { text: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  Medium: { text: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20' },
  Low:    { text: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } }
};
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

const StudyPlanner = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskSubject, setNewTaskSubject] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  /* ── Pomodoro timer ─────────────────────────────────────────────── */
  const [timerActive, setTimerActive] = useState(false);
  const [timeLeft, setTimeLeft]       = useState(25 * 60);
  const [sessions, setSessions]       = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (timerActive) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            clearInterval(intervalRef.current);
            setTimerActive(false);
            setSessions(s => s + 1);
            toast.success('🍅 Pomodoro complete! Great work!');
            return 25 * 60;
          }
          return t - 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerActive]);

  const resetTimer = () => { setTimerActive(false); setTimeLeft(25 * 60); };

  const formatTime = (s) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  /* ── Task API calls ──────────────────────────────────────────────── */
  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const data = await plannerService.getHistory();
      setTasks(data || []);
      if (isRefresh) toast.success('Tasks refreshed!');
    } catch (err) {
      const msg = err.response?.data?.message || 'Unable to load planner history. Is the backend running?';
      setError(msg);
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      const newTask = await plannerService.createTask({
        task: newTaskTitle,
        subject: newTaskSubject || 'General',
        duration: 1.5,
        priority: 'Medium',
      });
      setTasks(prev => [newTask, ...prev]);
      setNewTaskTitle('');
      setNewTaskSubject('');
      toast.success('Task added!');
    } catch {
      /* Optimistic local fallback */
      setTasks(prev => [{
        id: Date.now(), task: newTaskTitle, subject: newTaskSubject || 'General',
        priority: 'Medium', is_completed: false, ai_generated: false,
        created_at: new Date().toISOString()
      }, ...prev]);
      setNewTaskTitle('');
      setNewTaskSubject('');
    } finally {
      setAddingTask(false);
    }
  };

  const toggleComplete = async (task) => {
    const updated = { ...task, is_completed: !task.is_completed };
    setTasks(prev => prev.map(t => t.id === task.id ? updated : t));
    try {
      await plannerService.updateTask(task.id, { is_completed: updated.is_completed });
    } catch {
      // Revert on failure
      setTasks(prev => prev.map(t => t.id === task.id ? task : t));
    }
  };

  const deleteTask = async (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await plannerService.deleteTask(id);
    } catch { /* task already removed from UI */ }
  };

  const generateAIPlan = async () => {
    setGenerating(true);
    try {
      const newTasks = await plannerService.generatePlan();
      setTasks(prev => [...newTasks, ...prev]);
      toast.success(`✨ AI generated ${newTasks.length} tasks based on your performance!`);
    } catch {
      toast.error('AI plan generation requires academic records. Add some grades first!');
    } finally {
      setGenerating(false);
    }
  };

  const done  = tasks.filter(t => t.is_completed).length;
  const total = tasks.length;
  const progress = total > 0 ? Math.round((done / total) * 100) : 0;

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-72" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton.ListItem key={i} />)}
        </div>
        <Skeleton.Chart height="h-80" />
      </div>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <CalendarIcon className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-200 mb-1">Unable to Load Planner</h2>
        <p className="text-slate-400 text-sm max-w-md">{error}</p>
      </div>
      <Button
        variant="secondary"
        leftIcon={<RefreshCw className="w-4 h-4" />}
        onClick={() => fetchTasks()}
      >
        Retry
      </Button>
    </div>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

      {/* Header */}
      <motion.div variants={itemVariants}
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-200">AI Study Planner</h1>
          <p className="text-slate-400">Organize tasks and focus with Pomodoro sessions.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" isLoading={refreshing}
            leftIcon={<RefreshCw className="w-4 h-4" />}
            onClick={() => fetchTasks(true)}>
            Refresh
          </Button>
          <Button leftIcon={<Sparkles className="w-4 h-4" />}
            isLoading={generating} onClick={generateAIPlan}>
            AI Auto-Plan
          </Button>
        </div>
      </motion.div>

      {/* Progress bar */}
      {total > 0 && (
        <motion.div variants={itemVariants} className="glass p-4 rounded-xl">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-slate-400">Today's Progress</span>
            <span className="text-sm font-semibold text-purple-400">{done}/{total} tasks · {progress}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
            />
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Task list */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-4">
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-200 mb-5">Task List</h3>

            {/* Add task form */}
            <form onSubmit={addTask} className="flex gap-2 mb-6">
              <input
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all"
                placeholder="Add task title..."
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
              />
              <input
                className="w-32 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-slate-200 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all hidden md:block"
                placeholder="Subject"
                value={newTaskSubject}
                onChange={e => setNewTaskSubject(e.target.value)}
              />
              <Button type="submit" size="icon" variant="secondary" isLoading={addingTask}>
                <Plus className="w-5 h-5" />
              </Button>
            </form>

            {/* Tasks */}
            {tasks.length === 0
              ? <EmptyState icon={CalendarIcon} title="No tasks yet"
                  description="Add a task above or use AI Auto-Plan to generate your schedule."
                  action={<Button onClick={generateAIPlan} leftIcon={<Sparkles className="w-4 h-4" />}>Generate AI Plan</Button>}
                />
              : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {tasks.map(task => {
                      const pStyle = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.Medium;
                      return (
                        <motion.div
                          key={task.id} layout
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -20, height: 0 }}
                          className={`flex items-center gap-4 p-4 rounded-xl border transition-all group ${
                            task.is_completed
                              ? 'opacity-50 border-transparent bg-white/3'
                              : 'border-white/8 bg-black/20 hover:border-purple-500/30 hover:bg-black/30'
                          }`}
                        >
                          <button onClick={() => toggleComplete(task)}
                            className="text-slate-400 hover:text-green-400 transition-colors shrink-0">
                            {task.is_completed
                              ? <CheckCircle2 className="w-5 h-5 text-green-400" />
                              : <Circle className="w-5 h-5" />}
                          </button>

                          <div className="flex-1 min-w-0">
                            <h4 className={`font-medium text-sm truncate ${task.is_completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {task.task}
                              {task.ai_generated && (
                                <span className="ml-2 text-xs text-purple-400">✨ AI</span>
                              )}
                            </h4>
                            <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                              <span>{task.subject}</span>
                              {task.duration && <><span>·</span><span>{task.duration}h</span></>}
                            </div>
                          </div>

                          <span className={`text-xs px-2 py-0.5 rounded-md border font-medium shrink-0 hidden sm:block ${pStyle.text} ${pStyle.bg}`}>
                            {task.priority}
                          </span>

                          <button onClick={() => deleteTask(task.id)}
                            className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )
            }
          </div>
        </motion.div>

        {/* Right column */}
        <motion.div variants={itemVariants} className="space-y-6">

          {/* Pomodoro Timer */}
          <div className="glass p-6 rounded-2xl relative overflow-hidden flex flex-col items-center">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 to-blue-500/8 pointer-events-none" />
            <h3 className="text-base font-bold text-slate-200 mb-1 w-full flex items-center justify-between">
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-purple-400" />Focus Timer</span>
              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-md">🍅 ×{sessions}</span>
            </h3>
            <p className="text-xs text-slate-500 mb-6 w-full">Pomodoro · 25 min sessions</p>

            {/* Ring */}
            <div className="relative w-44 h-44 mb-6">
              <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 176 176">
                <circle cx="88" cy="88" r="80" fill="none" stroke="rgba(168,85,247,0.1)" strokeWidth="8" />
                <circle cx="88" cy="88" r="80" fill="none" stroke="url(#timerGrad)"
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={502}
                  strokeDashoffset={502 - (502 * (timeLeft / (25 * 60)))}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
                <defs>
                  <linearGradient id="timerGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#a855f7"/>
                    <stop offset="100%" stopColor="#3b82f6"/>
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-4xl font-mono font-light text-white tracking-widest">
                  {formatTime(timeLeft)}
                </div>
                <div className="text-xs text-slate-400 mt-1">{timerActive ? '🟢 Focusing...' : 'Ready'}</div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button size="icon" variant="secondary" onClick={resetTimer} title="Reset">
                <RotateCcw className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="primary" onClick={() => setTimerActive(a => !a)}>
                {timerActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </Button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="glass p-5 rounded-2xl space-y-3">
            <h3 className="text-base font-bold text-slate-200">Summary</h3>
            {[
              { label: 'Total Tasks', value: total },
              { label: 'Completed', value: done, color: 'text-green-400' },
              { label: 'Pending', value: total - done, color: 'text-yellow-400' },
              { label: 'AI Generated', value: tasks.filter(t => t.ai_generated).length, color: 'text-purple-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                <span className="text-sm text-slate-400">{label}</span>
                <span className={`text-sm font-bold ${color || 'text-slate-200'}`}>{value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default StudyPlanner;

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, BookOpen, Target, BarChart3, Heart, Brain,
  ChevronRight, Save, X, Plus, RefreshCw, TrendingUp,
  MessageSquare, Zap, CheckCircle2, AlertCircle, Sparkles,
  GraduationCap, Briefcase, Star, Activity, Moon, Flame,
  RotateCcw, ArrowRight, Edit3,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../components/Button';
import AcademicInput from '../components/AcademicInput';
import {
  profileService, analyticsService, stressService,
  plannerService, agentsService,
} from '../services/index';

/* ─── Animation Variants ────────────────────────────────────────────── */
const panelVariants = {
  hidden:  { opacity: 0, x: 16 },
  visible: { opacity: 1, x: 0,  transition: { duration: 0.28, ease: 'easeOut' } },
  exit:    { opacity: 0, x: -16, transition: { duration: 0.18 } },
};

/* ─── Tag Chip Editor ────────────────────────────────────────────────── */
const TagInput = ({ value = [], onChange, placeholder = 'Type & press Enter…', color = 'purple' }) => {
  const [input, setInput] = useState('');
  const ref = useRef(null);

  const colorMap = {
    purple: 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30',
    green:  'bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30',
    blue:   'bg-blue-500/20 text-blue-300 border-blue-500/30 hover:bg-blue-500/30',
    amber:  'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30',
  };

  const add = (raw) => {
    const tag = raw.trim().replace(/,+$/, '').trim();
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setInput('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(input); }
    else if (e.key === 'Backspace' && !input && value.length) onChange(value.slice(0, -1));
  };

  return (
    <div
      className="min-h-[46px] flex flex-wrap gap-2 p-2.5 rounded-xl bg-white/5 border border-white/10 focus-within:border-purple-500/50 focus-within:ring-1 focus-within:ring-purple-500/20 cursor-text transition-all"
      onClick={() => ref.current?.focus()}
    >
      {value.map((tag, i) => (
        <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors ${colorMap[color] || colorMap.purple}`}>
          {tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(value.filter((_, j) => j !== i)); }}
            className="opacity-70 hover:opacity-100 transition-opacity">
            <X className="w-3 h-3" />
          </button>
        </span>
      ))}
      <input
        ref={ref}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={() => input.trim() && add(input)}
        placeholder={value.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[140px] bg-transparent outline-none text-sm text-slate-200 placeholder-slate-500"
      />
    </div>
  );
};

/* ─── Shared form field wrapper ──────────────────────────────────────── */
const Field = ({ label, children, hint, required }) => (
  <div className="space-y-1.5">
    <label className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
      {label}{required && <span className="text-red-400">*</span>}
    </label>
    {children}
    {hint && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
);

const inp = 'w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all';
const sel = 'w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-white/10 text-slate-200 text-sm focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all cursor-pointer';
const ta  = 'w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-slate-200 text-sm placeholder-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all resize-none';

/* ─── Slider ─────────────────────────────────────────────────────────── */
const Slider = ({ label, value, onChange, min = 0, max = 100, step = 1, unit = '', color = 'purple' }) => {
  const pct = ((value - min) / (max - min)) * 100;
  const trackColor = color === 'red' ? '#ef4444' : color === 'blue' ? '#3b82f6' : '#a855f7';
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>
        <span className="text-sm font-bold text-slate-200">{value}{unit}</span>
      </div>
      <div className="relative h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{ width: `${pct}%`, background: trackColor }} />
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full opacity-0 absolute"
        style={{ marginTop: '-12px', height: '16px', cursor: 'pointer' }}
      />
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 appearance-none bg-transparent rounded-full focus:outline-none cursor-pointer"
        style={{
          marginTop: '-8px',
          WebkitAppearance: 'none',
        }}
      />
    </div>
  );
};

/* ─── Section nav config ─────────────────────────────────────────────── */
const SECTIONS = [
  { id: 'personal',    label: 'Personal Details',    icon: User,          color: 'text-purple-400' },
  { id: 'academic',    label: 'Academic Details',     icon: BookOpen,      color: 'text-blue-400'   },
  { id: 'preferences', label: 'Study Preferences',    icon: Star,          color: 'text-amber-400'  },
  { id: 'goals',       label: 'Goals',                icon: Target,        color: 'text-green-400'  },
  { id: 'wellness',    label: 'Wellness',             icon: Heart,         color: 'text-red-400'    },
  { id: 'inputs',      label: 'Academic Inputs',      icon: BarChart3,     color: 'text-cyan-400'   },
  { id: 'ai',          label: 'AI Memory',            icon: Brain,         color: 'text-violet-400' },
];

/* ═══════════════════════════════════════════════════════════════════════ */
const Profile = ({ profile: propProfile, onProfileUpdate }) => {
  const navigate = useNavigate();

  /* ── State ────────────────────────────────────────────────────────── */
  const [active,        setActive]        = useState('personal');
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [cycling,       setCycling]       = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [stressLogs,    setStressLogs]    = useState([]);
  const [plannerTasks,  setPlannerTasks]  = useState([]);
  const [dashData,      setDashData]      = useState(null);

  /* ── Wellness slider state ────────────────────────────────────────── */
  const [wellness, setWellness] = useState({ stress_level: 50, sleep_hours: 7, energy_level: 60 });
  const [loggingWellness, setLoggingWellness] = useState(false);

  /* ── Form state ───────────────────────────────────────────────────── */
  const emptyForm = {
    full_name:           '',
    department:          '',
    year:                '',
    semester:            '',
    current_cgpa:        '',
    target_cgpa:         '',
    weak_subjects:       [],
    strong_subjects:     [],
    preferred_study_time:'Morning',
    daily_study_hours:   '',
    learning_style:      'Visual',
    career_goal:         '',
    placement_goal:      '',
    higher_studies_goal: '',
    goals:               '',
    interests:           [],
  };

  const buildForm = (p) => ({
    full_name:           p?.full_name            || '',
    department:          p?.department           || '',
    year:                p?.year                 ?? '',
    semester:            p?.semester             ?? '',
    current_cgpa:        p?.current_cgpa         ?? '',
    target_cgpa:         p?.target_cgpa          ?? '',
    weak_subjects:       Array.isArray(p?.weak_subjects)   ? p.weak_subjects   : (p?.weak_subjects   ? p.weak_subjects.split(',').filter(Boolean)   : []),
    strong_subjects:     Array.isArray(p?.strong_subjects) ? p.strong_subjects : (p?.strong_subjects ? p.strong_subjects.split(',').filter(Boolean) : []),
    preferred_study_time:p?.preferred_study_time || 'Morning',
    daily_study_hours:   p?.daily_study_hours    ?? '',
    learning_style:      p?.learning_style       || 'Visual',
    career_goal:         p?.career_goal          || '',
    placement_goal:      p?.placement_goal       || '',
    higher_studies_goal: p?.higher_studies_goal  || '',
    goals:               p?.goals               || '',
    interests:           Array.isArray(p?.interests) ? p.interests : (p?.interests ? p.interests.split(',').filter(Boolean) : []),
  });

  const [form,  setForm]  = useState(() => buildForm(propProfile));
  const [saved, setSaved] = useState(() => buildForm(propProfile));
  const isDirty = JSON.stringify(form) !== JSON.stringify(saved);

  /* ── Helpers ──────────────────────────────────────────────────────── */
  const sf  = (key) => (e)    => setForm(f => ({ ...f, [key]: e.target.value }));
  const stg = (key) => (arr)  => setForm(f => ({ ...f, [key]: arr }));
  const svl = (key) => (val)  => setWellness(w => ({ ...w, [key]: val }));

  /* ── Load ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let prof = propProfile;
        if (!prof) prof = await profileService.get();
        const f = buildForm(prof);
        setForm(f); setSaved(f);

        const [dash, stress, tasks] = await Promise.allSettled([
          analyticsService.getDashboard(),
          stressService.getLogs(30),
          plannerService.getTasks(),
        ]);
        if (dash.status   === 'fulfilled') setDashData(dash.value);
        if (stress.status === 'fulfilled') setStressLogs(Array.isArray(stress.value) ? stress.value : []);
        if (tasks.status  === 'fulfilled') setPlannerTasks(Array.isArray(tasks.value) ? tasks.value : []);
      } catch (err) {
        console.error(err);
        toast.error('Failed to load profile data');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Save ─────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    if (!form.full_name.trim()) { toast.error('Full name is required'); setActive('personal'); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        year:              form.year              !== '' ? Number(form.year)              : null,
        semester:          form.semester          !== '' ? Number(form.semester)          : null,
        current_cgpa:      form.current_cgpa      !== '' ? Number(form.current_cgpa)      : null,
        target_cgpa:       form.target_cgpa       !== '' ? Number(form.target_cgpa)       : 0,
        daily_study_hours: form.daily_study_hours !== '' ? Number(form.daily_study_hours) : null,
        interests: Array.isArray(form.interests) ? form.interests.join(',') : form.interests,
      };
      const updated = await profileService.update(payload);
      const newForm = buildForm(updated);
      setForm(newForm); setSaved(newForm);
      if (onProfileUpdate) onProfileUpdate(updated);

      // Cascade: refresh AI memory in background
      agentsService.runCycle().catch(() => {});

      toast.success('Profile saved! Your AI twin is learning… ✨', { duration: 4000 });
    } catch (err) {
      console.error(err);
      toast.error('Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => { setForm({ ...saved }); toast('Changes discarded', { icon: '↩️' }); };

  /* ── Refresh AI Memory ────────────────────────────────────────────── */
  const handleRefreshAI = async () => {
    setCycling(true);
    try {
      await agentsService.runCycle();
      toast.success('AI memory refreshed! Recommendations updated. 🧠');
    } catch { toast.error('AI cycle failed — is the backend running?'); }
    finally  { setCycling(false); }
  };

  /* ── Recalculate Dashboard ────────────────────────────────────────── */
  const handleRecalculate = async () => {
    setRecalculating(true);
    try {
      const fresh = await analyticsService.getDashboard();
      setDashData(fresh);
      if (onProfileUpdate) onProfileUpdate({ ...saved });
      toast.success('Dashboard recalculated! 📊');
    } catch { toast.error('Recalculation failed'); }
    finally  { setRecalculating(false); }
  };

  /* ── Log Wellness ─────────────────────────────────────────────────── */
  const handleLogWellness = async () => {
    setLoggingWellness(true);
    try {
      const moods = ['neutral', 'okay', 'good', 'stressed', 'tired'];
      await stressService.logStress({
        stress_level: wellness.stress_level,
        sleep_hours:  wellness.sleep_hours,
        energy_level: wellness.energy_level,
        mood:         moods[Math.floor(wellness.stress_level / 25)] || 'neutral',
      });
      const fresh = await stressService.getLogs(30);
      setStressLogs(Array.isArray(fresh) ? fresh : []);
      toast.success('Wellness check-in logged! 💚');
    } catch { toast.error('Failed to log wellness check-in'); }
    finally  { setLoggingWellness(false); }
  };

  /* ── Derived stats ────────────────────────────────────────────────── */
  const last7 = stressLogs.slice(0, 7);
  const avg = (key) => {
    const vals = last7.map(l => l[key]).filter(v => v !== null && v !== undefined && !isNaN(Number(v)));
    return vals.length ? (vals.reduce((a, b) => a + Number(b), 0) / vals.length).toFixed(1) : null;
  };
  const avgStress = avg('stress_level');
  const avgSleep  = avg('sleep_hours');
  const avgEnergy = avg('energy_level');

  const breakdown   = dashData?.subject_breakdown || [];
  const subjectCount = breakdown.length;
  const avgMarks     = subjectCount ? (breakdown.reduce((a, s) => a + (s.average_marks || s.marks || 0), 0) / subjectCount).toFixed(1) : null;
  const avgAttend    = subjectCount ? (breakdown.reduce((a, s) => a + (s.average_attendance || s.attendance || 0), 0) / subjectCount).toFixed(1) : null;

  const initials = (form.full_name || 'ST').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');

  /* ── Loading skeleton ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="flex flex-col md:flex-row gap-6 animate-pulse">
        <div className="w-full md:w-72 space-y-4">
          <div className="glass rounded-2xl border border-white/10 h-72 bg-white/5" />
          <div className="glass rounded-2xl border border-white/10 h-80 bg-white/5" />
        </div>
        <div className="flex-1 glass rounded-2xl border border-white/10 h-[500px] bg-white/5" />
      </div>
    );
  }

  /* ── Whether to show save bar ─────────────────────────────────────── */
  const showSaveBar = !['inputs', 'ai'].includes(active);

  /* ═══════════════════════════════════════════════════════════════════ */
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-6xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-purple-400" />
            My Academic Twin
          </h1>
          <p className="text-slate-400 mt-1 text-sm">Enter your details — your AI learns and adapts in real time.</p>
        </div>
        {isDirty && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium self-start sm:self-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Unsaved changes
          </motion.div>
        )}
      </div>

      {/* ── Layout ──────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-6 items-start">

        {/* ── LEFT: Avatar Card + Nav ──────────────────────────────── */}
        <div className="w-full md:w-72 shrink-0 space-y-4 md:sticky md:top-6">

          {/* Avatar Card */}
          <div className="glass rounded-2xl border border-white/10 p-6 flex flex-col items-center gap-3 relative overflow-hidden bg-gradient-to-b from-purple-900/30 to-transparent">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(168,85,247,0.15),transparent_60%)] pointer-events-none" />
            <motion.div whileHover={{ scale: 1.05 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="relative w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 via-blue-500 to-cyan-500 flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.35)] cursor-pointer z-10"
              onClick={() => setActive('personal')}>
              <span className="text-3xl font-black text-white select-none">{initials}</span>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-slate-950 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
              </div>
            </motion.div>

            <div className="text-center z-10">
              <h2 className="text-lg font-bold text-white">{form.full_name || 'Your Name'}</h2>
              <p className="text-sm text-slate-400 mt-0.5">
                {[form.department, form.year ? `Year ${form.year}` : null].filter(Boolean).join(' · ') || 'Setup your profile'}
              </p>
              {form.semester && <p className="text-xs text-slate-500">Semester {form.semester}</p>}
            </div>

            <div className="flex flex-wrap justify-center gap-2 z-10">
              {form.current_cgpa && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-300 border border-green-500/30">
                  {form.current_cgpa} CGPA
                </span>
              )}
              {form.target_cgpa && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  🎯 {form.target_cgpa} Target
                </span>
              )}
            </div>

            <button onClick={() => setActive('personal')}
              className="z-10 w-full py-2 rounded-xl bg-white/8 hover:bg-white/15 border border-white/10 text-slate-300 text-sm font-medium flex items-center justify-center gap-2 transition-all">
              <Edit3 className="w-4 h-4" /> Edit Profile
            </button>
          </div>

          {/* Section Nav */}
          <nav className="glass rounded-2xl border border-white/10 overflow-hidden">
            {SECTIONS.map((sec, i) => {
              const Icon = sec.icon;
              const isActive = active === sec.id;
              return (
                <button key={sec.id} onClick={() => setActive(sec.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all border-b border-white/5 last:border-b-0 text-left
                    ${isActive ? 'bg-purple-500/15 text-purple-300 border-l-[3px] border-l-purple-500' : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'}`}>
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? sec.color : 'text-slate-500'}`} />
                  <span className="flex-1">{sec.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-purple-400" />}
                </button>
              );
            })}
          </nav>

          {/* Quick action buttons in sidebar */}
          <div className="space-y-2">
            <Button onClick={handleRefreshAI} isLoading={cycling}
              leftIcon={<RefreshCw className="w-4 h-4" />} variant="secondary" className="w-full">
              Refresh AI Memory
            </Button>
            <Button onClick={handleRecalculate} isLoading={recalculating}
              leftIcon={<Zap className="w-4 h-4" />} variant="outline" className="w-full">
              Recalculate Dashboard
            </Button>
          </div>
        </div>

        {/* ── RIGHT: Section Content ───────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            <motion.div key={active} variants={panelVariants} initial="hidden" animate="visible" exit="exit">

              {/* ════════════════════════════════════════════════════ */}
              {/* 1. PERSONAL DETAILS                                  */}
              {/* ════════════════════════════════════════════════════ */}
              {active === 'personal' && (
                <div className="glass rounded-2xl border border-white/10 p-6 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <User className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-200">Personal Details</h2>
                      <p className="text-xs text-slate-500">Basic information about you</p>
                    </div>
                  </div>

                  <Field label="Full Name" required>
                    <input value={form.full_name} onChange={sf('full_name')} className={inp}
                      placeholder="e.g. Ramprakash V" />
                  </Field>

                  <Field label="Department">
                    <input value={form.department} onChange={sf('department')} className={inp}
                      placeholder="e.g. Computer Science & Engineering" />
                  </Field>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Year">
                      <input type="number" min={1} max={6} value={form.year} onChange={sf('year')} className={inp}
                        placeholder="e.g. 4" />
                    </Field>
                    <Field label="Semester">
                      <input type="number" min={1} max={12} value={form.semester} onChange={sf('semester')} className={inp}
                        placeholder="e.g. 7" />
                    </Field>
                  </div>

                  <div className="p-4 rounded-xl bg-purple-500/8 border border-purple-500/20">
                    <p className="text-xs text-purple-300 leading-relaxed">
                      <Sparkles className="inline w-3.5 h-3.5 mr-1" />
                      Your AI twin uses this to personalise study schedules, recommendations, and tutor responses.
                    </p>
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════ */}
              {/* 2. ACADEMIC DETAILS                                  */}
              {/* ════════════════════════════════════════════════════ */}
              {active === 'academic' && (
                <div className="glass rounded-2xl border border-white/10 p-6 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="w-9 h-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
                      <BookOpen className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-200">Academic Details</h2>
                      <p className="text-xs text-slate-500">CGPA, subjects, and academic standing</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Current CGPA" hint="Scale: 0 – 10">
                      <input type="number" step="0.01" min={0} max={10} value={form.current_cgpa}
                        onChange={sf('current_cgpa')} className={inp} placeholder="e.g. 8.2" />
                    </Field>
                    <Field label="Target CGPA" hint="What are you aiming for?">
                      <input type="number" step="0.01" min={0} max={10} value={form.target_cgpa}
                        onChange={sf('target_cgpa')} className={inp} placeholder="e.g. 9.0" />
                    </Field>
                  </div>

                  {form.current_cgpa && form.target_cgpa && (
                    <div className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                        <span>Progress to target</span>
                        <span>{Math.min(100, Math.round((Number(form.current_cgpa) / Number(form.target_cgpa)) * 100))}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all"
                          style={{ width: `${Math.min(100, (Number(form.current_cgpa) / Number(form.target_cgpa)) * 100)}%` }} />
                      </div>
                    </div>
                  )}

                  <Field label="Weak Subjects" hint="Press Enter or comma to add each subject">
                    <TagInput value={form.weak_subjects} onChange={stg('weak_subjects')}
                      placeholder="e.g. Operating Systems, DBMS…" color="purple" />
                  </Field>

                  <Field label="Strong Subjects" hint="Subjects where you consistently excel">
                    <TagInput value={form.strong_subjects} onChange={stg('strong_subjects')}
                      placeholder="e.g. Data Structures, Algorithms…" color="green" />
                  </Field>
                </div>
              )}

              {/* ════════════════════════════════════════════════════ */}
              {/* 3. STUDY PREFERENCES                                 */}
              {/* ════════════════════════════════════════════════════ */}
              {active === 'preferences' && (
                <div className="glass rounded-2xl border border-white/10 p-6 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center">
                      <Star className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-200">Study Preferences</h2>
                      <p className="text-xs text-slate-500">How and when you study best</p>
                    </div>
                  </div>

                  <Field label="Daily Study Hours" hint="Average hours you study per day">
                    <input type="number" step="0.5" min={0.5} max={16} value={form.daily_study_hours}
                      onChange={sf('daily_study_hours')} className={inp} placeholder="e.g. 4" />
                  </Field>

                  <Field label="Preferred Study Time">
                    <select value={form.preferred_study_time} onChange={sf('preferred_study_time')} className={sel}>
                      {[['Morning', '🌅 Morning (5am–12pm)'], ['Afternoon', '☀️ Afternoon (12pm–5pm)'],
                        ['Evening', '🌆 Evening (5pm–9pm)'], ['Night', '🌙 Night (9pm–2am)']].map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Learning Style" hint="How do you absorb information best?">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { v: 'Visual',      icon: '👁️', desc: 'Charts, diagrams, videos' },
                        { v: 'Auditory',    icon: '🎧', desc: 'Listening, discussing, podcasts' },
                        { v: 'Reading',     icon: '📚', desc: 'Textbooks, notes, articles' },
                        { v: 'Kinesthetic', icon: '🤲', desc: 'Practice, hands-on, projects' },
                      ].map(({ v, icon, desc }) => (
                        <button key={v} type="button" onClick={() => setForm(f => ({ ...f, learning_style: v }))}
                          className={`p-4 rounded-xl border text-left transition-all ${
                            form.learning_style === v
                              ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/8 hover:text-slate-200'
                          }`}>
                          <div className="text-2xl mb-1">{icon}</div>
                          <div className="text-sm font-semibold">{v}</div>
                          <div className="text-xs opacity-70 mt-0.5">{desc}</div>
                        </button>
                      ))}
                    </div>
                  </Field>
                </div>
              )}

              {/* ════════════════════════════════════════════════════ */}
              {/* 4. GOALS                                             */}
              {/* ════════════════════════════════════════════════════ */}
              {active === 'goals' && (
                <div className="glass rounded-2xl border border-white/10 p-6 space-y-6">
                  <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                    <div className="w-9 h-9 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-200">Goals</h2>
                      <p className="text-xs text-slate-500">Your academic and career ambitions</p>
                    </div>
                  </div>

                  <Field label="Career Goal" hint="What is your long-term career ambition?">
                    <textarea value={form.career_goal} onChange={sf('career_goal')} rows={3} className={ta}
                      placeholder="e.g. Become a Machine Learning Engineer at a top tech company…" />
                  </Field>

                  <Field label="Placement Goal" hint="Target package or company for campus placements">
                    <input value={form.placement_goal} onChange={sf('placement_goal')} className={inp}
                      placeholder="e.g. 12+ LPA package, Google / Microsoft…" />
                  </Field>

                  <Field label="Higher Studies Goal" hint="Masters, PhD, or specialisation plans">
                    <input value={form.higher_studies_goal} onChange={sf('higher_studies_goal')} className={inp}
                      placeholder="e.g. MS in AI at Stanford / IIT…" />
                  </Field>

                  <Field label="General Goals" hint="Any other academic or personal goals">
                    <textarea value={form.goals} onChange={sf('goals')} rows={3} className={ta}
                      placeholder="e.g. Improve CGPA, lead a research project, win a hackathon…" />
                  </Field>

                  <Field label="Interests" hint="Press Enter or comma to add each interest">
                    <TagInput value={form.interests} onChange={stg('interests')}
                      placeholder="e.g. Machine Learning, Open Source, Web Dev…" color="blue" />
                  </Field>
                </div>
              )}

              {/* ════════════════════════════════════════════════════ */}
              {/* 5. WELLNESS                                           */}
              {/* ════════════════════════════════════════════════════ */}
              {active === 'wellness' && (
                <div className="space-y-4">
                  {/* Average cards */}
                  <div className="glass rounded-2xl border border-white/10 p-6 space-y-5">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                      <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center">
                        <Heart className="w-5 h-5 text-red-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-200">Wellness Overview</h2>
                        <p className="text-xs text-slate-500">7-day averages from your check-in logs</p>
                      </div>
                    </div>

                    {last7.length > 0 ? (
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'Avg Stress',  val: avgStress,  unit: '%',   icon: Activity, color: avgStress > 70 ? 'text-red-400' : avgStress > 45 ? 'text-yellow-400' : 'text-green-400',    bg: 'bg-red-500/10' },
                          { label: 'Avg Sleep',   val: avgSleep,   unit: 'hrs', icon: Moon,     color: avgSleep < 6  ? 'text-red-400' : avgSleep < 7   ? 'text-yellow-400' : 'text-blue-400',     bg: 'bg-blue-500/10' },
                          { label: 'Avg Energy',  val: avgEnergy,  unit: '%',   icon: Flame,    color: avgEnergy < 40 ? 'text-red-400' : avgEnergy < 65 ? 'text-yellow-400' : 'text-green-400',   bg: 'bg-green-500/10' },
                        ].map(({ label, val, unit, icon: Icon, color, bg }) => (
                          <div key={label} className={`glass p-4 rounded-2xl border border-white/10 flex flex-col items-center gap-2 ${bg}`}>
                            <div className={`w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center`}>
                              <Icon className={`w-5 h-5 ${color}`} />
                            </div>
                            <p className="text-xs text-slate-400">{label}</p>
                            <p className={`text-xl font-bold ${color}`}>{val !== null ? `${val}${unit}` : '—'}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6">
                        <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                        <p className="text-slate-400 text-sm">No wellness logs yet.</p>
                        <p className="text-slate-500 text-xs mt-1">Log a check-in below to start tracking.</p>
                      </div>
                    )}
                  </div>

                  {/* Interactive wellness logger */}
                  <div className="glass rounded-2xl border border-white/10 p-6 space-y-6">
                    <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
                      <Plus className="w-4 h-4 text-green-400" /> Log Today's Wellness Check-in
                    </h3>

                    <div className="space-y-6">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Stress Level</label>
                          <span className={`text-sm font-bold ${wellness.stress_level > 70 ? 'text-red-400' : wellness.stress_level > 45 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {wellness.stress_level}%
                          </span>
                        </div>
                        <input type="range" min={0} max={100} step={1} value={wellness.stress_level}
                          onChange={(e) => svl('stress_level')(Number(e.target.value))}
                          className="w-full h-2 rounded-full cursor-pointer appearance-none bg-white/10"
                          style={{ accentColor: wellness.stress_level > 70 ? '#ef4444' : wellness.stress_level > 45 ? '#eab308' : '#22c55e' }} />
                        <div className="flex justify-between text-xs text-slate-500 mt-1"><span>Low</span><span>High</span></div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sleep Hours</label>
                          <span className={`text-sm font-bold ${wellness.sleep_hours < 6 ? 'text-red-400' : wellness.sleep_hours < 7 ? 'text-yellow-400' : 'text-blue-400'}`}>
                            {wellness.sleep_hours}h
                          </span>
                        </div>
                        <input type="range" min={0} max={12} step={0.5} value={wellness.sleep_hours}
                          onChange={(e) => svl('sleep_hours')(Number(e.target.value))}
                          className="w-full h-2 rounded-full cursor-pointer appearance-none bg-white/10"
                          style={{ accentColor: '#3b82f6' }} />
                        <div className="flex justify-between text-xs text-slate-500 mt-1"><span>0h</span><span>12h</span></div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">Energy Level</label>
                          <span className={`text-sm font-bold ${wellness.energy_level < 40 ? 'text-red-400' : wellness.energy_level < 65 ? 'text-yellow-400' : 'text-green-400'}`}>
                            {wellness.energy_level}%
                          </span>
                        </div>
                        <input type="range" min={0} max={100} step={1} value={wellness.energy_level}
                          onChange={(e) => svl('energy_level')(Number(e.target.value))}
                          className="w-full h-2 rounded-full cursor-pointer appearance-none bg-white/10"
                          style={{ accentColor: wellness.energy_level < 40 ? '#ef4444' : wellness.energy_level < 65 ? '#eab308' : '#22c55e' }} />
                        <div className="flex justify-between text-xs text-slate-500 mt-1"><span>Exhausted</span><span>Energised</span></div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button onClick={handleLogWellness} isLoading={loggingWellness}
                        leftIcon={<CheckCircle2 className="w-4 h-4" />} variant="primary" className="flex-1">
                        Log Check-in
                      </Button>
                      <Button onClick={() => navigate('/stress')} leftIcon={<TrendingUp className="w-4 h-4" />}
                        variant="secondary" className="flex-1">
                        View Full Trends
                      </Button>
                    </div>
                  </div>

                  {/* Recent logs */}
                  {last7.length > 0 && (
                    <div className="glass rounded-2xl border border-white/10 p-5 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Recent Logs</h4>
                      <div className="space-y-2 max-h-56 overflow-y-auto">
                        {last7.map((log, i) => (
                          <div key={log.id || i} className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/4 border border-white/5 text-xs">
                            <span className="text-slate-400">
                              {log.timestamp ? new Date(log.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : `Log ${i + 1}`}
                            </span>
                            <div className="flex gap-3">
                              <span className="text-red-400">Stress {log.stress_level ?? '—'}%</span>
                              <span className="text-blue-400">Sleep {log.sleep_hours ?? '—'}h</span>
                              <span className="text-green-400">Energy {log.energy_level ?? '—'}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ════════════════════════════════════════════════════ */}
              {/* 6. ACADEMIC INPUTS (Marks/Attendance/Assignments)    */}
              {/* ════════════════════════════════════════════════════ */}
              {active === 'inputs' && (
                <div className="space-y-4">
                  {/* Summary strip */}
                  {subjectCount > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Subjects',       value: subjectCount,                          color: 'text-purple-400' },
                        { label: 'Avg Marks',       value: avgMarks ? `${avgMarks}%` : '—',     color: 'text-blue-400'   },
                        { label: 'Avg Attendance',  value: avgAttend ? `${avgAttend}%` : '—',   color: 'text-green-400'  },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="glass p-4 rounded-2xl border border-white/10 text-center">
                          <p className={`text-2xl font-bold ${color}`}>{value}</p>
                          <p className="text-xs text-slate-400 mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={() => navigate('/analytics')}
                    className="w-full flex items-center justify-between px-5 py-3 rounded-xl bg-purple-500/10 border border-purple-500/25 text-purple-300 hover:bg-purple-500/20 transition-all text-sm font-medium">
                    <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> View Full Analytics</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <div className="glass rounded-2xl border border-white/10 p-6">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-200">Academic Inputs</h2>
                        <p className="text-xs text-slate-500">Marks, attendance, assignment completion per subject</p>
                      </div>
                    </div>
                    <AcademicInput />
                  </div>
                </div>
              )}

              {/* ════════════════════════════════════════════════════ */}
              {/* 7. AI MEMORY                                         */}
              {/* ════════════════════════════════════════════════════ */}
              {active === 'ai' && (
                <div className="space-y-4">
                  <div className="glass rounded-2xl border border-purple-500/20 p-6 space-y-5 bg-gradient-to-br from-purple-900/25 to-blue-900/15">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                      <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
                        <Brain className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-200">AI Memory</h2>
                        <p className="text-xs text-slate-500">Your AI twin learns from all your data</p>
                      </div>
                    </div>

                    <p className="text-sm text-slate-300 leading-relaxed">
                      Your AI tutor automatically learns from your profile, academic records, stress logs,
                      planner tasks, chat history, and knowledge graph — building a personalised model of how
                      you study and where you need support.
                    </p>

                    {/* Stats grid */}
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { label: 'Stress Logs',   value: stressLogs.length,  icon: Heart,         color: 'text-red-400',    bg: 'bg-red-500/15'    },
                        { label: 'Planner Tasks', value: plannerTasks.length, icon: CheckCircle2,  color: 'text-green-400',  bg: 'bg-green-500/15'  },
                        { label: 'Subjects',      value: subjectCount,        icon: BookOpen,      color: 'text-blue-400',   bg: 'bg-blue-500/15'   },
                      ].map(({ label, value, icon: Icon, color, bg }) => (
                        <div key={label} className="glass p-4 rounded-xl border border-white/10 flex flex-col items-center gap-2">
                          <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <p className="text-xl font-bold text-slate-200">{value || '—'}</p>
                          <p className="text-xs text-slate-500 text-center">{label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Memory sources */}
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Memory Sources</h4>
                      {[
                        { label: 'Profile & Preferences',  desc: 'Name, department, study style, goals',        icon: User,         color: 'text-purple-400', bg: 'bg-purple-500/15' },
                        { label: 'Academic Records',        desc: `${subjectCount} subjects: marks & attendance`, icon: BarChart3,     color: 'text-blue-400',   bg: 'bg-blue-500/15'   },
                        { label: 'Stress & Wellness',       desc: `${stressLogs.length} check-ins logged`,        icon: Heart,        color: 'text-red-400',    bg: 'bg-red-500/15'    },
                        { label: 'Study Planner',           desc: `${plannerTasks.length} tasks tracked`,         icon: CheckCircle2, color: 'text-green-400',  bg: 'bg-green-500/15'  },
                        { label: 'AI Tutor Conversations',  desc: 'Chat history for context continuity',          icon: MessageSquare,color: 'text-cyan-400',   bg: 'bg-cyan-500/15'   },
                      ].map(({ label, desc, icon: Icon, color, bg }) => (
                        <div key={label} className="flex items-center gap-3 p-3 rounded-xl bg-white/4 border border-white/5">
                          <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-4 h-4 ${color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-200">{label}</p>
                            <p className="text-xs text-slate-500 truncate">{desc}</p>
                          </div>
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 ml-auto" />
                        </div>
                      ))}
                    </div>

                    {/* Action buttons */}
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Button onClick={handleRefreshAI} isLoading={cycling}
                          leftIcon={<RefreshCw className="w-4 h-4" />} variant="primary">
                          Refresh AI Memory
                        </Button>
                        <Button onClick={handleRecalculate} isLoading={recalculating}
                          leftIcon={<Zap className="w-4 h-4" />} variant="secondary">
                          Recalculate Dashboard
                        </Button>
                      </div>
                      <Button onClick={() => navigate('/tutor')}
                        leftIcon={<MessageSquare className="w-4 h-4" />} variant="outline" className="w-full">
                        Chat with AI Tutor
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </motion.div>
          </AnimatePresence>

          {/* ── Save / Discard Bar ──────────────────────────────────── */}
          {showSaveBar && (
            <motion.div key="savebar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border transition-all ${
                isDirty ? 'glass border-purple-500/30 bg-purple-900/15' : 'glass border-white/8 opacity-60'
              }`}>
              <div className="flex items-center gap-2 min-w-0">
                {isDirty ? (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                    <span className="text-xs text-amber-300 font-medium truncate">You have unsaved changes</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                    <span className="text-xs text-slate-400 truncate">All changes saved</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="secondary" size="sm" onClick={handleDiscard} disabled={!isDirty || saving}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
                  Discard
                </Button>
                <Button variant="primary" size="sm" onClick={handleSave} isLoading={saving} disabled={!isDirty}
                  leftIcon={<Save className="w-3.5 h-3.5" />}>
                  Save Profile
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── Update Profile button (extra prominent below) ────────── */}
          {showSaveBar && isDirty && (
            <Button onClick={handleSave} isLoading={saving} variant="primary" className="w-full"
              leftIcon={<Save className="w-5 h-5" />} size="lg">
              Update Profile
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;

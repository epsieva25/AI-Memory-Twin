import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  TrendingUp, CalendarCheck, Brain, AlertTriangle,
  Clock, ArrowRight, Target, Sparkles, RefreshCw, BarChart3,
  Activity, CheckCircle2, BookOpen, Zap, ChevronRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, BarChart, Bar,
} from 'recharts';
import Button from '../components/Button';
import ChartContainer from '../components/ChartContainer';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { analyticsService, predictionsService, profileService } from '../services/index';
import toast from 'react-hot-toast';

/* ─── Tooltip ─────────────────────────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl text-xs">
      <p className="text-slate-400 mb-1 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(2) : p.value}
        </p>
      ))}
    </div>
  );
};

/* ─── Animation variants ──────────────────────────────────────────────── */
const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.4 } } };

/* ─── Clickable Stat Card ─────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, subtext, color, borderColor, to }) => (
  <motion.div variants={itemVariants}>
    <Link to={to} className="block group">
      <div className={`glass p-5 rounded-2xl flex items-center gap-4 border-l-4 ${borderColor} hover:bg-white/5 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.02]`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color.replace('text-', 'bg-').replace('-400', '-500/10')}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-400 font-medium">{label}</p>
          <h3 className="text-2xl font-bold text-slate-200 truncate">{value}</h3>
          {subtext && <p className="text-xs text-slate-500 mt-0.5 truncate">{subtext}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0" />
      </div>
    </Link>
  </motion.div>
);

/* ─── Section header with "View All" link ─────────────────────────────── */
const SectionHeader = ({ title, icon: Icon, iconColor, to, linkLabel = 'View all →' }) => (
  <div className="flex justify-between items-center mb-4">
    <h3 className="text-lg font-bold text-slate-200 flex items-center gap-2">
      <Icon className={`w-5 h-5 ${iconColor}`} />
      {title}
    </h3>
    {to && (
      <Link to={to} className="text-xs text-purple-400 hover:text-purple-300 transition-colors font-medium flex items-center gap-1">
        {linkLabel} <ChevronRight className="w-3 h-3" />
      </Link>
    )}
  </div>
);

/* ─── Burnout pill ────────────────────────────────────────────────────── */
const BurnoutBadge = ({ risk }) => {
  const config = {
    Low:     { color: 'text-green-400 bg-green-500/10 border-green-500/20',  dot: 'bg-green-400' },
    Medium:  { color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', dot: 'bg-yellow-400' },
    High:    { color: 'text-red-400 bg-red-500/10 border-red-500/20',         dot: 'bg-red-400' },
    Unknown: { color: 'text-slate-400 bg-white/5 border-white/10',            dot: 'bg-slate-400' },
  };
  const c = config[risk] || config.Unknown;
  return (
    <Link to="/stress">
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${c.color} hover:opacity-80 transition-opacity cursor-pointer`}>
        <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {risk} Burnout Risk
      </span>
    </Link>
  );
};

/* ─── Deadline formatter ──────────────────────────────────────────────── */
const formatDeadline = (iso) => {
  if (!iso) return 'No deadline';
  const d = new Date(iso);
  const diff = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return '⚠️ Overdue';
  if (diff === 0) return '🔴 Today';
  if (diff === 1) return '🟠 Tomorrow';
  if (diff <= 3) return `🟡 In ${diff} days`;
  return `🟢 In ${diff} days`;
};

/* ─── Greeting helper ─────────────────────────────────────────────────── */
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
};

/* ═══════════════════════════════════════════════════════════════════════ */
const Dashboard = () => {
  const navigate = useNavigate();
  const [data, setData]         = useState(null);
  const [weakData, setWeakData] = useState(null);
  const [burnout, setBurnout]   = useState(null);
  const [profile, setProfile]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState(null);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const [dashboard, weak, burnoutRes, prof] = await Promise.allSettled([
        analyticsService.getDashboard(),
        predictionsService.getWeakSubjects(),
        predictionsService.getBurnoutRisk(),
        profileService.get(),
      ]);
      if (dashboard.status === 'fulfilled') setData(dashboard.value);
      if (weak.status === 'fulfilled')      setWeakData(weak.value);
      if (burnoutRes.status === 'fulfilled') setBurnout(burnoutRes.value);
      if (prof.status === 'fulfilled')      setProfile(prof.value);
      if (isRefresh) toast.success('Dashboard refreshed');
    } catch (err) {
      setError('Could not load dashboard data.');
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <Skeleton.Dashboard />;

  const d   = data   || {};
  const w   = weakData || { predictions: [], weak_subjects: [] };
  const b   = burnout  || {};
  const p   = profile  || {};

  const firstName     = (p.full_name || 'Student').split(' ')[0];
  const recommendations = d.recommendations || [];
  const deadlines       = d.upcoming_deadlines || [];

  const stressLevel = (d.avg_stress || 0) > 70 ? 'High' : (d.avg_stress || 0) > 45 ? 'Moderate' : 'Low';
  const stressColor = (d.avg_stress || 0) > 70 ? 'text-red-400' : (d.avg_stress || 0) > 45 ? 'text-yellow-400' : 'text-green-400';

  const attData = (d.subject_breakdown || [])
    .filter((s) => s.average_marks > 0)
    .slice(0, 7)
    .map((s) => ({
      subject: s.subject.length > 10 ? s.subject.slice(0, 9) + '…' : s.subject,
      score: s.average_marks,
    }));

  const hasAcademics  = (d.subject_breakdown || []).some((s) => s.average_marks > 0);
  const weakPredicted = (w.predictions || []).filter((p) => p.is_weak);
  const burnoutRisk   = b.risk_level || (b.burnout_risk ? 'High' : 'Low') || 'Unknown';

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

      {/* ── Hero greeting header ──────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-purple-900/60 via-blue-900/40 to-slate-900/60 border border-white/10 p-6 md:p-8"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(168,85,247,0.15),transparent_60%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.1),transparent_60%)] pointer-events-none" />

        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <p className="text-slate-400 text-sm font-medium mb-1">{getGreeting()},</p>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              {firstName} <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">👋</span>
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <Link to="/profile">
                <span className="text-sm text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10 hover:bg-white/15 transition-colors cursor-pointer">
                  {p.department || 'CSE'} · Year {p.year || '—'} · Sem {p.semester || '—'}
                </span>
              </Link>
              <BurnoutBadge risk={burnoutRisk} />
              {p.target_cgpa && (
                <Link to="/profile">
                  <span className="text-sm text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer">
                    🎯 Target: {p.target_cgpa} CGPA
                  </span>
                </Link>
              )}
            </div>
          </div>
          <div className="flex gap-3 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => fetchData(true)} isLoading={refreshing}
              leftIcon={<RefreshCw className="w-4 h-4" />}>
              Refresh
            </Button>
            <Link to="/tutor"><Button leftIcon={<Brain className="w-4 h-4" />}>Ask AI Tutor</Button></Link>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="glass p-4 rounded-xl border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => fetchData()} className="text-red-400 hover:text-red-300 text-xs underline ml-4">Retry</button>
        </div>
      )}

      {/* ── Stat Cards (all clickable) ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp} label="Current CGPA"
          value={hasAcademics || d.gpa ? `${d.gpa}` : '—'}
          subtext={`Target: ${d.target_cgpa || '—'} CGPA`}
          color="text-green-400" borderColor="border-l-green-500"
          to="/analytics"
        />
        <StatCard
          icon={CalendarCheck} label="Avg Attendance"
          value={hasAcademics ? `${d.avg_attendance}%` : '—'}
          subtext={d.avg_attendance < 75 ? '⚠️ Below 75% threshold' : '✅ On track'}
          color="text-blue-400" borderColor="border-l-blue-500"
          to="/analytics"
        />
        <StatCard
          icon={Target} label="Productivity"
          value={d.total_tasks ? `${d.productivity_score}%` : '—'}
          subtext={d.total_tasks ? `${d.completed_tasks}/${d.total_tasks} tasks done` : 'Add planner tasks'}
          color="text-purple-400" borderColor="border-l-purple-500"
          to="/planner"
        />
        <StatCard
          icon={Brain} label="Stress Level"
          value={<span className={stressColor}>{d.recent_stress?.length ? stressLevel : '—'}</span>}
          subtext={d.recent_stress?.length ? `${d.avg_stress}% avg · ${d.recent_stress.length} logs` : 'Log a check-in'}
          color="text-red-400" borderColor="border-l-red-500"
          to="/stress"
        />
      </div>

      {/* ── Main 3-column layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left — Charts */}
        <div className="lg:col-span-2 space-y-6">

          {/* GPA Trend */}
          <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
            <SectionHeader title="CGPA Trend" icon={TrendingUp} iconColor="text-purple-400" to="/analytics" linkLabel="Full Analytics →" />
            {d.gpa_trend?.length > 0 ? (
              <ChartContainer height={220} minHeight={180}>
                <AreaChart data={d.gpa_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="semester" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} domain={[0, 10]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="gpa" name="CGPA" stroke="#a855f7" strokeWidth={3} fill="url(#colorGpa)"
                    dot={{ r: 5, fill: '#a855f7', strokeWidth: 0 }} />
                </AreaChart>
              </ChartContainer>
            ) : (
              <EmptyState icon={BarChart3} title="No GPA trend yet"
                description="Add academic records with marks across semesters."
                action={<Link to="/analytics"><Button size="sm" variant="secondary">Add Grades</Button></Link>}
              />
            )}
          </motion.div>

          {/* Subject Scores + Weak Subjects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
              <SectionHeader title="Subject Scores" icon={BookOpen} iconColor="text-blue-400" to="/analytics" />
              {attData.length > 0 ? (
                <ChartContainer height={192} minHeight={160}>
                  <BarChart data={attData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="subject" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="score" name="Score" radius={[4, 4, 0, 0]} fill="#3b82f6" label={false} />
                  </BarChart>
                </ChartContainer>
              ) : (
                <EmptyState icon={TrendingUp} title="No academic records"
                  description="Add marks in Analytics."
                  action={<Link to="/analytics"><Button size="sm" variant="secondary">Add Grade</Button></Link>}
                />
              )}
            </motion.div>

            <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
              <SectionHeader title="Weak Subjects" icon={AlertTriangle} iconColor="text-yellow-500" to="/analytics" linkLabel="View analytics →" />
              {weakPredicted.length > 0 ? (
                <div className="space-y-3 max-h-52 overflow-y-auto custom-scrollbar">
                  {weakPredicted.slice(0, 4).map((pred, i) => (
                    <Link to="/analytics" key={i}>
                      <div className="p-3 rounded-xl border border-red-500/20 bg-red-500/10 hover:bg-red-500/15 transition-colors cursor-pointer">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-red-400 text-sm">{pred.subject}</span>
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md font-medium">
                            {pred.risk_probability}% risk
                          </span>
                        </div>
                        <p className="text-xs text-slate-400">{pred.recommendation}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (d.weak_subjects || []).length > 0 ? (
                <ul className="text-sm text-slate-300 space-y-1.5">
                  {d.weak_subjects.map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-2 text-sm text-green-400">
                  <CheckCircle2 className="w-4 h-4" />
                  No critical weak subjects detected.
                </div>
              )}
            </motion.div>
          </div>
        </div>

        {/* Right — Sidebar cards */}
        <div className="space-y-6">

          {/* AI Recommendations */}
          <motion.div variants={itemVariants}
            className="glass p-6 rounded-2xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30">
            <SectionHeader title="AI Recommendations" icon={Sparkles} iconColor="text-purple-300" to="/profile" linkLabel="My Profile →" />
            {recommendations.length > 0 ? (
              <ul className="space-y-3">
                {recommendations.map((tip, i) => (
                  <li key={i} className="flex gap-3 text-sm text-slate-200">
                    <span className="text-purple-400 shrink-0 mt-0.5">•</span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-400">Add academic data to unlock personalized tips.</p>
            )}
            <div className="flex gap-2 mt-5">
              <Link to="/planner" className="flex-1">
                <Button variant="secondary" className="w-full text-xs h-9">Study Planner</Button>
              </Link>
              <Link to="/profile" className="flex-1">
                <Button variant="outline" className="w-full text-xs h-9">My Profile</Button>
              </Link>
            </div>
          </motion.div>

          {/* 7-Day Stress */}
          <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
            <SectionHeader title="7-Day Stress" icon={Activity} iconColor="text-red-400" to="/stress" linkLabel="Monitor →" />
            {d.recent_stress?.length > 0 ? (
              <Link to="/stress" className="block cursor-pointer">
                <ChartContainer height={150} minHeight={120}>
                  <AreaChart data={d.recent_stress} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="stress" name="Stress" stroke="#ef4444" strokeWidth={2} fill="#ef444433"
                      dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} />
                  </AreaChart>
                </ChartContainer>
              </Link>
            ) : (
              <EmptyState title="Log first check-in" description="Visit Stress Monitor to track wellness."
                action={<Link to="/stress"><Button size="sm" variant="secondary">Log Check-in</Button></Link>}
              />
            )}
          </motion.div>

          {/* Upcoming Deadlines */}
          <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
            <SectionHeader title="Upcoming Deadlines" icon={Zap} iconColor="text-yellow-400" to="/planner" linkLabel="All tasks →" />
            {deadlines.length > 0 ? (
              <div className="space-y-2.5">
                {deadlines.map((item) => (
                  <Link to="/planner" key={item.id}>
                    <div className="flex gap-3 items-start p-3 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group cursor-pointer">
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-200 truncate">{item.title}</h4>
                        <p className="text-xs text-slate-400 mt-0.5">{formatDeadline(item.deadline)}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded mt-1 inline-block font-medium ${
                          item.priority === 'High'   ? 'bg-red-500/15 text-red-400' :
                          item.priority === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' :
                                                       'bg-blue-500/15 text-blue-400'
                        }`}>{item.priority}</span>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 shrink-0 mt-2 group-hover:text-slate-300 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyState title="No upcoming deadlines"
                description="Create your first task in the Study Planner."
                action={<Link to="/planner"><Button size="sm" variant="secondary">Add Task</Button></Link>}
              />
            )}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;

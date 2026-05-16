import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  TrendingUp, CalendarCheck, Brain, AlertTriangle,
  Clock, ArrowRight, Target, Sparkles, RefreshCw
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import EmptyState from '../components/EmptyState';
import { analyticsService, predictionsService, agentsService } from '../services/index';
import toast from 'react-hot-toast';

// ─── Fallback data used if API is unavailable ─────────────────────────────────
const FALLBACK = {
  gpa: 3.65,
  avg_attendance: 84.2,
  productivity_score: 76,
  avg_stress: 48.5,
  gpa_trend: [
    { semester: 'Sem 1', gpa: 3.2 },
    { semester: 'Sem 2', gpa: 3.4 },
    { semester: 'Sem 3', gpa: 3.65 },
  ],
  subject_breakdown: [
    { subject: 'AI', average_marks: 65, status: 'weak' },
    { subject: 'OS', average_marks: 82, status: 'strong' },
    { subject: 'DB', average_marks: 71, status: 'average' },
    { subject: 'Networks', average_marks: 58, status: 'weak' },
    { subject: 'Math', average_marks: 90, status: 'strong' },
  ],
  recent_stress: [
    { day: 'Mon', stress: 45, energy: 80, sleep: 7.5 },
    { day: 'Tue', stress: 60, energy: 65, sleep: 6.0 },
    { day: 'Wed', stress: 75, energy: 40, sleep: 5.5 },
    { day: 'Thu', stress: 55, energy: 70, sleep: 7.0 },
    { day: 'Fri', stress: 40, energy: 85, sleep: 8.0 },
    { day: 'Sat', stress: 30, energy: 90, sleep: 8.5 },
    { day: 'Sun', stress: 35, energy: 85, sleep: 7.5 },
  ],
};

const FALLBACK_WEAK = {
  weak_subjects: ['Computer Networks', 'Artificial Intelligence'],
  alert_level: 'medium',
  predictions: [
    { subject: 'Computer Networks', is_weak: true, risk_probability: 72, marks: 58, attendance: 72, recommendation: 'Focus on TCP/IP protocols and review missed lectures.' },
    { subject: 'Artificial Intelligence', is_weak: true, risk_probability: 58, marks: 65, attendance: 78, recommendation: 'Review neural network fundamentals and past assignments.' },
  ],
};

// ─── Custom Tooltip for charts ────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 border border-white/10 rounded-xl px-4 py-3 shadow-2xl text-xs">
      <p className="text-slate-400 mb-1 font-medium">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-semibold">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </p>
      ))}
    </div>
  );
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } }
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, subtext, color, delay = 0 }) => (
  <motion.div variants={itemVariants} className={`glass p-5 rounded-2xl flex items-center gap-4 border-l-4 ${color}`}>
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color.replace('border-l-', 'bg-').replace('500', '500/20').replace('400', '400/20')}`}>
      <Icon className={`w-6 h-6 ${color.replace('border-l-', 'text-')}`} />
    </div>
    <div>
      <p className="text-sm text-slate-400 font-medium">{label}</p>
      <h3 className="text-2xl font-bold text-slate-200">{value}</h3>
      {subtext && <p className="text-xs text-slate-500 mt-0.5">{subtext}</p>}
    </div>
  </motion.div>
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [weakData, setWeakData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [dashboard, weak] = await Promise.allSettled([
        analyticsService.getDashboard(),
        predictionsService.getWeakSubjects(),
      ]);
      setData(dashboard.status === 'fulfilled' ? dashboard.value : FALLBACK);
      setWeakData(weak.status === 'fulfilled' ? weak.value : FALLBACK_WEAK);
      if (isRefresh) toast.success('Dashboard refreshed!');
    } catch {
      setData(FALLBACK);
      setWeakData(FALLBACK_WEAK);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <Skeleton.Dashboard />;

  const d = data || FALLBACK;
  const w = weakData || FALLBACK_WEAK;

  const stressLevel = d.avg_stress > 70 ? 'High' : d.avg_stress > 40 ? 'Moderate' : 'Low';
  const stressColor = d.avg_stress > 70 ? 'text-red-400' : d.avg_stress > 40 ? 'text-yellow-400' : 'text-green-400';

  // Attendance bar data from subject breakdown
  const attData = (d.subject_breakdown || []).slice(0, 5).map(s => ({
    subject: s.subject.split(' ')[0],
    rate: s.average_marks || 0,
  }));

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-200">Dashboard</h1>
          <p className="text-slate-400">Here's your real-time academic intelligence overview.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" size="sm" onClick={() => fetchData(true)} isLoading={refreshing}
            leftIcon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
          <Link to="/tutor">
            <Button leftIcon={<Brain className="w-4 h-4" />}>Ask AI Tutor</Button>
          </Link>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={TrendingUp} label="Current CGPA" value={`${d.gpa}`}
          subtext={`/4.0`} color="border-l-green-500" />
        <StatCard icon={CalendarCheck} label="Overall Attendance" value={`${d.avg_attendance}%`}
          subtext="Across all subjects" color="border-l-blue-500" />
        <StatCard icon={Target} label="Productivity Score" value={`${d.productivity_score}`}
          subtext="/100 this week" color="border-l-purple-500" />
        <StatCard icon={Brain} label="Stress Level"
          value={<span className={stressColor}>{stressLevel}</span>}
          subtext={`${d.avg_stress}% avg this week`} color="border-l-red-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* GPA Trend */}
          <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-200 mb-6">GPA Trend Analysis</h3>
            {d.gpa_trend?.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={d.gpa_trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorGpa" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="semester" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis domain={[2.0, 4.0]} stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Area type="monotone" dataKey="gpa" name="GPA" stroke="#a855f7"
                      strokeWidth={3} fillOpacity={1} fill="url(#colorGpa)" dot={{ r: 5, fill: '#a855f7', strokeWidth: 0 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : <EmptyState icon={TrendingUp} title="No GPA Data Yet" description="Add academic records to track your GPA trend." />}
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Subject Performance */}
            <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-slate-200 mb-6">Subject Scores</h3>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={attData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="subject" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Bar dataKey="rate" name="Score" radius={[4, 4, 0, 0]}
                      fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* Weak Subjects Alert */}
            <motion.div variants={itemVariants} className="glass p-6 rounded-2xl flex flex-col">
              <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                Weak Subject Alerts
              </h3>
              {w.predictions?.length > 0 ? (
                <div className="flex-1 space-y-3 overflow-y-auto">
                  {w.predictions.filter(p => p.is_weak).slice(0, 3).map((pred, i) => (
                    <div key={i} className="p-3 rounded-xl border border-red-500/20 bg-red-500/10">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-red-400 text-sm">{pred.subject}</span>
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-md">
                          {pred.risk_probability}% risk
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">{pred.recommendation}</p>
                    </div>
                  ))}
                  {w.predictions.filter(p => p.is_weak).length === 0 && (
                    <div className="p-3 rounded-xl border border-green-500/20 bg-green-500/10">
                      <p className="text-green-400 text-sm font-medium">✅ No weak subjects detected!</p>
                    </div>
                  )}
                </div>
              ) : <EmptyState icon={AlertTriangle} title="No predictions yet" />}
            </motion.div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* AI Recommendations */}
          <motion.div variants={itemVariants}
            className="glass p-6 rounded-2xl bg-gradient-to-br from-purple-900/40 to-blue-900/40 border border-purple-500/30">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-300" />AI Recommendations
            </h3>
            <p className="text-sm text-slate-300 mb-4">Based on your live academic data:</p>
            <ul className="space-y-3">
              {(w.weak_subjects?.length > 0
                ? [`Focus extra time on ${w.weak_subjects[0]} — risk is high.`,
                   'Your stress levels are trending up. Take a 20-min break.',
                   `Improve attendance in ${w.weak_subjects[w.weak_subjects.length - 1] || 'all subjects'}.`]
                : ['Great performance across all subjects!',
                   'Schedule regular review sessions to maintain your GPA.',
                   'Consider helping peers — teaching reinforces memory.']
              ).map((tip, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-200 items-start">
                  <span className="mt-0.5 text-purple-400 shrink-0">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
            <Link to="/planner">
              <Button variant="secondary" className="w-full mt-4 text-xs h-9">
                Generate Study Plan
              </Button>
            </Link>
          </motion.div>

          {/* Stress Trend */}
          <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-200 mb-4">7-Day Stress Trend</h3>
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={d.recent_stress || FALLBACK.recent_stress}
                  margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stressGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} domain={[0, 100]} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="stress" name="Stress" stroke="#ef4444"
                    strokeWidth={2} fillOpacity={1} fill="url(#stressGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Upcoming Deadlines */}
          <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-200 mb-4">Upcoming Deadlines</h3>
            <div className="space-y-3">
              {[
                { title: 'OS Assignment 3', time: 'Tomorrow, 11:59 PM', type: 'Assignment' },
                { title: 'AI Quiz', time: 'Friday, 10:00 AM', type: 'Exam' },
                { title: 'Network Project', time: 'In 3 days', type: 'Project' }
              ].map((item, i) => (
                <div key={i}
                  className="flex gap-3 items-center p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10 cursor-pointer">
                  <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-slate-200 truncate">{item.title}</h4>
                    <p className="text-xs text-slate-400">{item.time}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 shrink-0" />
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;

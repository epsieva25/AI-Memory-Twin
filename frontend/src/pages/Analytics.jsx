import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend
} from 'recharts';
import { Download, Filter, TrendingUp, Activity, Brain, Clock, RefreshCw } from 'lucide-react';
import Button from '../components/Button';
import Skeleton from '../components/Skeleton';
import { analyticsService } from '../services/index';
import toast from 'react-hot-toast';

// ─── Fallback data ─────────────────────────────────────────────────────────────
const FALLBACK = {
  performance: [
    { subject: 'AI', score: 65, classAvg: 72 },
    { subject: 'OS', score: 82, classAvg: 75 },
    { subject: 'DB', score: 71, classAvg: 78 },
    { subject: 'Networks', score: 58, classAvg: 70 },
    { subject: 'Math', score: 90, classAvg: 73 },
  ]
};

const studyConsistency = [
  { day: 'Mon', hours: 4, efficiency: 80 },
  { day: 'Tue', hours: 5, efficiency: 85 },
  { day: 'Wed', hours: 3, efficiency: 70 },
  { day: 'Thu', hours: 6, efficiency: 90 },
  { day: 'Fri', hours: 4, efficiency: 75 },
  { day: 'Sat', hours: 8, efficiency: 95 },
  { day: 'Sun', hours: 5, efficiency: 85 },
];

const stressVsProductivity = [
  { week: 'W1', stress: 30, productivity: 85 },
  { week: 'W2', stress: 45, productivity: 80 },
  { week: 'W3', stress: 60, productivity: 65 },
  { week: 'W4', stress: 40, productivity: 88 },
  { week: 'W5', stress: 70, productivity: 50 },
  { week: 'W6', stress: 35, productivity: 92 },
];

const skillRadar = [
  { subject: 'Programming', A: 90 },
  { subject: 'Theory', A: 75 },
  { subject: 'Math', A: 90 },
  { subject: 'Communication', A: 70 },
  { subject: 'Problem Solving', A: 85 },
];

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
  show: { opacity: 1, transition: { staggerChildren: 0.1 } }
};
const itemVariants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

// ─── CSV Export Utility ────────────────────────────────────────────────────────
const exportToCSV = (data, filename) => {
  if (!data?.length) { toast.error('No data to export'); return; }
  const keys = Object.keys(data[0]);
  const csvContent = [
    keys.join(','),
    ...data.map(row => keys.map(k => JSON.stringify(row[k] ?? '')).join(','))
  ].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  toast.success(`Exported ${filename}`);
};

const Analytics = () => {
  const [perfData, setPerfData] = useState(FALLBACK.performance);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [perf, dash] = await Promise.allSettled([
        analyticsService.getPerformance(),
        analyticsService.getDashboard(),
      ]);
      if (perf.status === 'fulfilled') setPerfData(perf.value.performance || FALLBACK.performance);
      if (dash.status === 'fulfilled') setDashData(dash.value);
      if (isRefresh) toast.success('Analytics refreshed!');
    } catch {
      // Keep fallback data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton.StatCard key={i} />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton.Chart key={i} />)}
      </div>
    </div>
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-200">Advanced Analytics</h1>
          <p className="text-slate-400">Deep dive into your academic performance and well-being.</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button variant="secondary" size="sm" onClick={() => fetchData(true)} isLoading={refreshing}
            leftIcon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
          <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}
            onClick={() => exportToCSV(perfData, 'performance_report.csv')}>
            Export CSV
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Download className="w-4 h-4" />}
            onClick={() => {
              const report = [...perfData, ...stressVsProductivity];
              exportToCSV(report, 'analytics_full_report.csv');
            }}>
            Full Report
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label: 'Predicted GPA', value: dashData?.gpa ?? '3.65', sub: '+0.12 from last semester', color: 'text-purple-400', bg: 'border-l-purple-500' },
          { icon: Clock, label: 'Weekly Study Hours', value: '35h', sub: 'Consistent with goals', color: 'text-blue-400', bg: 'border-l-blue-500' },
          { icon: Activity, label: 'Avg Efficiency', value: '82%', sub: '+5% this week', color: 'text-green-400', bg: 'border-l-green-500' },
          { icon: Brain, label: 'Cognitive Load', value: 'Optimal', sub: 'Good balance of work/rest', color: 'text-yellow-400', bg: 'border-l-yellow-500' },
        ].map(({ icon: Icon, label, value, sub, color, bg }, i) => (
          <motion.div key={i} variants={itemVariants} className={`glass p-5 rounded-2xl border-l-4 ${bg}`}>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-400 mb-1">{label}</p>
                <h3 className="text-2xl font-bold text-slate-200">{value}</h3>
              </div>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className={`text-xs mt-2 ${color}`}>{sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Subject Performance */}
        <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-slate-200 mb-6">Subject Performance vs Class Average</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={perfData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="subject" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                <Bar dataKey="score" name="Your Score" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="classAvg" name="Class Avg" fill="#3b82f6" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Study Consistency */}
        <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-slate-200 mb-6">Study Hours & Efficiency</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={studyConsistency} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                <Area yAxisId="left" type="monotone" dataKey="hours" name="Study Hours" stroke="#3b82f6" fill="url(#colorHours)" strokeWidth={3} />
                <Line yAxisId="right" type="monotone" dataKey="efficiency" name="Efficiency %" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Stress vs Productivity */}
        <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-slate-200 mb-6">Stress vs Productivity Correlation</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stressVsProductivity} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="productivity" name="Productivity" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
                <Line type="monotone" dataKey="stress" name="Stress Level" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Skill Radar */}
        <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-slate-200 mb-6">Academic Skill Profile</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={skillRadar}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar name="Your Profile" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.35} strokeWidth={2} />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Analytics;

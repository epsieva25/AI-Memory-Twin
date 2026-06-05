import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend,
} from 'recharts';
import { Download, Filter, TrendingUp, Activity, Brain, Clock, RefreshCw, Plus, X } from 'lucide-react';
import Button from '../components/Button';
import ChartContainer from '../components/ChartContainer';
import Skeleton from '../components/Skeleton';
import { analyticsService, academicsService } from '../services/index';
import toast from 'react-hot-toast';

import EmptyState from '../components/EmptyState';

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
  const [perfData, setPerfData] = useState([]);
  const [studyConsistency, setStudyConsistency] = useState([]);
  const [stressVsProductivity, setStressVsProductivity] = useState([]);
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Modal State for Academic Record Input
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    marks: '',
    attendance: '',
    assignments_completed: '',
    semester: '1'
  });

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [perf, dash] = await Promise.allSettled([
        analyticsService.getPerformance(),
        analyticsService.getDashboard(),
      ]);
      if (perf.status === 'fulfilled') {
        setPerfData(perf.value.performance || []);
        setStudyConsistency(perf.value.study_consistency || []);
        setStressVsProductivity(perf.value.stress_vs_productivity || []);
      }
      if (dash.status === 'fulfilled') {
        setDashData(dash.value);
      }
      if (isRefresh) toast.success('Analytics refreshed!');
    } catch {
      // Keep fallback data
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.subject || !formData.marks || !formData.attendance || !formData.assignments_completed) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        subject: formData.subject,
        marks: parseFloat(formData.marks),
        attendance: parseFloat(formData.attendance),
        assignments_completed: parseInt(formData.assignments_completed, 10),
        semester: parseInt(formData.semester, 10)
      };

      await academicsService.create(payload);
      toast.success('Academic record added successfully! 🎓');
      setShowAddModal(false);
      // Reset form
      setFormData({
        subject: '',
        marks: '',
        attendance: '',
        assignments_completed: '',
        semester: '1'
      });
      // Refresh analytics charts
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create academic record.');
    } finally {
      setSubmitting(false);
    }
  };

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
          <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Grade
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fetchData(true)} isLoading={refreshing}
            leftIcon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
          <Button variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}
            onClick={() => exportToCSV(perfData, 'performance_report.csv')}>
            Export CSV
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: TrendingUp, label: 'Active GPA', value: dashData?.gpa !== undefined ? dashData.gpa.toFixed(2) : '0.00', sub: 'Target GPA: ' + (dashData?.target_cgpa ?? '3.80'), color: 'text-purple-400', bg: 'border-l-purple-500' },
          { icon: Clock, label: 'Task Completion', value: dashData?.productivity_score !== undefined ? `${dashData.productivity_score}%` : '0%', sub: `${dashData?.completed_tasks ?? 0} of ${dashData?.total_tasks ?? 0} tasks completed`, color: 'text-blue-400', bg: 'border-l-blue-500' },
          { icon: Activity, label: 'Avg Attendance', value: dashData?.avg_attendance !== undefined ? `${dashData.avg_attendance}%` : '0%', sub: 'Required: >75%', color: 'text-green-400', bg: 'border-l-green-500' },
          { icon: Brain, label: 'Average Stress', value: dashData?.avg_stress !== undefined ? `${dashData.avg_stress}%` : '0%', sub: dashData?.avg_stress > 70 ? 'High stress check-in needed' : 'Healthy load level', color: 'text-yellow-400', bg: 'border-l-yellow-500' },
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
          {perfData.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No academic records" description="Add grades to see performance charts." />
          ) : (
          <ChartContainer height={288} minHeight={220}>
              <BarChart data={perfData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="subject" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                <Bar dataKey="score" name="Your Score" fill="#a855f7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="classAvg" name="Class Avg" fill="#3b82f6" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
              </BarChart>
          </ChartContainer>
          )}
        </motion.div>

        {/* Study Consistency */}
        <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-slate-200 mb-6">Study Hours & Efficiency</h3>
          {studyConsistency.length === 0 ? (
            <EmptyState icon={Clock} title="No study consistency data" description="Complete planner tasks to build this chart." />
          ) : (
          <ChartContainer height={288} minHeight={220}>
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
          </ChartContainer>
          )}
        </motion.div>

        {/* Stress vs Productivity */}
        <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-slate-200 mb-6">Stress vs Productivity Correlation</h3>
          {stressVsProductivity.length === 0 ? (
            <EmptyState icon={Brain} title="No stress trend data" description="Log wellness check-ins in Stress Monitor." />
          ) : (
          <ChartContainer height={288} minHeight={220}>
              <LineChart data={stressVsProductivity} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="week" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="productivity" name="Productivity" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
                <Line type="monotone" dataKey="stress" name="Stress Level" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }} />
              </LineChart>
          </ChartContainer>
          )}
        </motion.div>

        {/* Skill Radar */}
        <motion.div variants={itemVariants} className="glass p-6 rounded-2xl">
          <h3 className="text-lg font-bold text-slate-200 mb-6">Academic Skill Profile</h3>
          {perfData.length === 0 ? (
            <EmptyState icon={Activity} title="No skill profile yet" description="Add subject scores to build your radar chart." />
          ) : (
          <ChartContainer height={288} minHeight={220}>
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={perfData.map((p) => ({ subject: p.subject, A: p.score }))}>
                <PolarGrid stroke="rgba(255,255,255,0.1)" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }} />
                <Radar name="Your Profile" dataKey="A" stroke="#a855f7" fill="#a855f7" fillOpacity={0.35} strokeWidth={2} />
                <Tooltip content={<ChartTooltip />} />
              </RadarChart>
          </ChartContainer>
          )}
        </motion.div>
      </div>

      {/* Add Academic Record Modal Overlay */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass max-w-md w-full p-6 rounded-2xl border border-white/10 relative overflow-hidden"
            >
              <button 
                onClick={() => setShowAddModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <h3 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-purple-400" />
                Add Academic Record
              </h3>
              
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Subject Name</label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    placeholder="E.g., Operating Systems"
                    className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Marks (out of 100)</label>
                    <input
                      type="number"
                      name="marks"
                      min="0"
                      max="100"
                      value={formData.marks}
                      onChange={handleInputChange}
                      placeholder="85"
                      className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Attendance %</label>
                    <input
                      type="number"
                      name="attendance"
                      min="0"
                      max="100"
                      value={formData.attendance}
                      onChange={handleInputChange}
                      placeholder="90"
                      className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Assignments Done (0-10)</label>
                    <input
                      type="number"
                      name="assignments_completed"
                      min="0"
                      max="10"
                      value={formData.assignments_completed}
                      onChange={handleInputChange}
                      placeholder="8"
                      className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Semester</label>
                    <input
                      type="number"
                      name="semester"
                      min="1"
                      value={formData.semester}
                      onChange={handleInputChange}
                      placeholder="1"
                      className="w-full bg-slate-950/40 border border-white/10 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                    {submitting ? 'Adding...' : 'Add Record'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
    </motion.div>
  );
};

export default Analytics;

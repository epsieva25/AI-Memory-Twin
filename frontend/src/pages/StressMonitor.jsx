import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import ChartContainer from '../components/ChartContainer';
import { 
  Heart, Moon, Battery, Smile, Frown, Meh, Wind, Music, Coffee, Sparkles, RefreshCw
} from 'lucide-react';
import Button from '../components/Button';
import { stressService, predictionsService } from '../services/index';
import toast from 'react-hot-toast';

import EmptyState from '../components/EmptyState';

const StressMonitor = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [burnoutRisk, setBurnoutRisk] = useState(15);
  
  // Daily check-in form state
  const [mood, setMood] = useState('Okay');
  const [stressLevel, setStressLevel] = useState(50);
  const [energyLevel, setEnergyLevel] = useState(70);
  const [sleepHours, setSleepHours] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const [logsRes, burnoutRes] = await Promise.allSettled([
        stressService.getLogs(30),
        predictionsService.getBurnoutRisk()
      ]);

      if (logsRes.status === 'fulfilled') {
        setLogs(logsRes.value || []);
      }
      if (burnoutRes.status === 'fulfilled') {
        const risk = burnoutRes.value?.risk_score !== undefined ? Math.round(burnoutRes.value.risk_score) : 15;
        setBurnoutRisk(risk);
      }
      if (isRefresh) toast.success('Stress metrics updated!');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCheckIn = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const moodMap = { Stressed: 'stressed', Okay: 'okay', Great: 'happy' };
      const payload = {
        stress_level: parseInt(stressLevel, 10),
        mood: moodMap[mood] || mood.toLowerCase(),
        sleep_hours: parseFloat(sleepHours),
        energy_level: parseInt(energyLevel, 10),
      };

      await stressService.logStress(payload);
      toast.success('Check-in submitted! Keep taking care of yourself. 🌸');
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to log daily wellness check-in.');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculations for displays
  const latestLog = logs.length > 0 ? logs[0] : null;
  const currentStressLevel = latestLog ? latestLog.stress_level : 45;
  const averageSleep = logs.length > 0 
    ? (logs.reduce((acc, curr) => acc + curr.sleep_hours, 0) / logs.length).toFixed(1)
    : '7.2';

  // Format history for the Recharts AreaChart
  const getStressColor = (level) => {
    if (level < 40) return 'text-green-400';
    if (level < 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const chartData = [...logs].reverse().map((log) => ({
    day: new Date(log.timestamp).toLocaleDateString(undefined, { weekday: 'short' }),
    stress: log.stress_level,
    energy: log.energy_level,
    sleep: log.sleep_hours,
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-200">Mental Wellness Monitor</h1>
          <p className="text-slate-400">Track your stress levels and maintain a healthy academic balance.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => fetchData(true)} isLoading={refreshing}
          leftIcon={<RefreshCw className="w-4 h-4" />}>Refresh</Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Core Stats & Check-in */}
        <motion.div variants={itemVariants} className="space-y-6">
          
          <div className="glass p-6 rounded-2xl text-center relative overflow-hidden">
            <div className={`absolute inset-0 opacity-10 bg-gradient-to-t ${
              currentStressLevel > 70 ? 'from-red-500 to-transparent' : 
              currentStressLevel > 40 ? 'from-yellow-500 to-transparent' : 
              'from-green-500 to-transparent'
            }`} />
            
            <Heart className={`w-12 h-12 mx-auto mb-4 ${getStressColor(currentStressLevel)}`} />
            <h3 className="text-sm font-medium text-slate-400 mb-1">Current Stress Level</h3>
            <div className={`text-4xl font-bold mb-2 ${getStressColor(currentStressLevel)}`}>
              {currentStressLevel}%
            </div>
            <p className="text-sm text-slate-300">
              {currentStressLevel > 70 ? 'High stress detected. Take a deep breath and rest.' : 
               currentStressLevel > 40 ? 'Moderate stress. Fully manageable.' : 
               'Low stress. You are doing fantastic!'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <Moon className="w-6 h-6 text-indigo-400 mb-2" />
              <p className="text-xs text-slate-400">Avg. Sleep</p>
              <h4 className="text-lg font-bold text-slate-200">{averageSleep}h</h4>
            </div>
            <div className="glass p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <Battery className={`w-6 h-6 mb-2 ${burnoutRisk > 50 ? 'text-red-400' : 'text-green-400'}`} />
              <p className="text-xs text-slate-400">Burnout Risk</p>
              <h4 className="text-lg font-bold text-slate-200">{burnoutRisk}%</h4>
            </div>
          </div>

          {/* Daily Check-in Form */}
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-200 mb-4">Daily Check-in</h3>
            <form onSubmit={handleCheckIn} className="space-y-4">
              <div>
                <p className="text-sm text-slate-400 mb-2">How are you feeling today?</p>
                <div className="flex justify-between gap-2">
                  {[
                    { label: 'Stressed', icon: Frown, color: 'text-red-400' },
                    { label: 'Okay', icon: Meh, color: 'text-yellow-400' },
                    { label: 'Great', icon: Smile, color: 'text-green-400' },
                  ].map((item) => (
                    <button
                      type="button"
                      key={item.label}
                      onClick={() => setMood(item.label)}
                      className={`flex-1 flex flex-col items-center p-2.5 rounded-xl transition-all ${
                        mood === item.label 
                          ? 'bg-white/10 border border-white/20 scale-105' 
                          : 'hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <item.icon className={`w-7 h-7 mb-1.5 ${item.color}`} />
                      <span className="text-xs text-slate-300">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Stress Level</span>
                  <span className="text-slate-200 font-semibold">{stressLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={stressLevel}
                  onChange={(e) => setStressLevel(e.target.value)}
                  className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Energy Level</span>
                  <span className="text-slate-200 font-semibold">{energyLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={energyLevel}
                  onChange={(e) => setEnergyLevel(e.target.value)}
                  className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Sleep Hours</span>
                  <span className="text-slate-200 font-semibold">{sleepHours} hours</span>
                </div>
                <input
                  type="range"
                  min="3"
                  max="12"
                  step="0.5"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(e.target.value)}
                  className="w-full h-1.5 bg-black/40 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <Button type="submit" variant="primary" className="w-full mt-2" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Complete Check-in'}
              </Button>
            </form>
          </div>

        </motion.div>

        {/* Middle Col: Charts */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-200 mb-6">Emotional Trend Analysis</h3>
            {chartData.length === 0 ? (
              <EmptyState title="Log first check-in" description="Submit a daily wellness check-in to see stress and energy trends." />
            ) : (
            <ChartContainer height={256} minHeight={200}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorEnergy" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="day" stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <YAxis stroke="#94a3b8" tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                  />
                  <Area type="monotone" dataKey="stress" name="Stress" stroke="#ef4444" fillOpacity={1} fill="url(#colorStress)" strokeWidth={2} />
                  <Area type="monotone" dataKey="energy" name="Energy" stroke="#10b981" fillOpacity={1} fill="url(#colorEnergy)" strokeWidth={2} />
                </AreaChart>
            </ChartContainer>
            )}
          </div>

          <div className="glass p-6 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
            <h3 className="text-lg font-bold text-slate-200 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              AI Wellness Recommendations
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center hover:bg-white/5 transition-colors cursor-pointer">
                <Wind className="w-8 h-8 text-cyan-400 mb-3" />
                <h4 className="text-sm font-medium text-slate-200 mb-1">Breathing Exercise</h4>
                <p className="text-xs text-slate-400">5 mins to lower heart rate</p>
              </div>
              
              <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center hover:bg-white/5 transition-colors cursor-pointer">
                <Music className="w-8 h-8 text-purple-400 mb-3" />
                <h4 className="text-sm font-medium text-slate-200 mb-1">Focus Playlist</h4>
                <p className="text-xs text-slate-400">Binaural beats for calm study</p>
              </div>

              <div className="bg-black/20 p-4 rounded-xl border border-white/5 flex flex-col items-center text-center hover:bg-white/5 transition-colors cursor-pointer">
                <Coffee className="w-8 h-8 text-orange-400 mb-3" />
                <h4 className="text-sm font-medium text-slate-200 mb-1">Take a Break</h4>
                <p className="text-xs text-slate-400">Step away from the screen</p>
              </div>
            </div>
          </div>

        </motion.div>
      </div>
    </motion.div>
  );
};

export default StressMonitor;

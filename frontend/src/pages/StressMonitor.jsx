import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { 
  Heart, Moon, Battery, Smile, Frown, Meh, Wind, Music, Coffee, Sparkles
} from 'lucide-react';
import Button from '../components/Button';

// Mock Data
const moodHistory = [
  { day: 'Mon', stress: 45, energy: 80, sleep: 7.5 },
  { day: 'Tue', stress: 60, energy: 65, sleep: 6.0 },
  { day: 'Wed', stress: 75, energy: 40, sleep: 5.5 },
  { day: 'Thu', stress: 55, energy: 70, sleep: 7.0 },
  { day: 'Fri', stress: 40, energy: 85, sleep: 8.0 },
  { day: 'Sat', stress: 30, energy: 90, sleep: 8.5 },
  { day: 'Sun', stress: 35, energy: 85, sleep: 7.5 },
];

const StressMonitor = () => {
  const [currentMood, setCurrentMood] = useState(null);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const currentStressLevel = 45; // out of 100
  const burnoutProbability = 15; // out of 100

  const getStressColor = (level) => {
    if (level < 40) return 'text-green-400';
    if (level < 70) return 'text-yellow-400';
    return 'text-red-400';
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
          <h1 className="text-3xl font-bold text-slate-200">Mental Wellness</h1>
          <p className="text-slate-400">Track your stress levels and maintain a healthy balance.</p>
        </div>
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
              {currentStressLevel > 70 ? 'High stress detected. Take a break.' : 
               currentStressLevel > 40 ? 'Moderate stress. Manageable.' : 
               'Low stress. You are doing great!'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="glass p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <Moon className="w-6 h-6 text-indigo-400 mb-2" />
              <p className="text-xs text-slate-400">Avg. Sleep</p>
              <h4 className="text-lg font-bold text-slate-200">7.2h</h4>
            </div>
            <div className="glass p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <Battery className={`w-6 h-6 mb-2 ${burnoutProbability > 50 ? 'text-red-400' : 'text-green-400'}`} />
              <p className="text-xs text-slate-400">Burnout Risk</p>
              <h4 className="text-lg font-bold text-slate-200">{burnoutProbability}%</h4>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-200 mb-4">Daily Check-in</h3>
            <p className="text-sm text-slate-400 mb-4">How are you feeling today?</p>
            <div className="flex justify-between">
              {[
                { icon: Frown, label: 'Stressed', color: 'text-red-400' },
                { icon: Meh, label: 'Okay', color: 'text-yellow-400' },
                { icon: Smile, label: 'Great', color: 'text-green-400' },
              ].map((mood, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentMood(mood.label)}
                  className={`flex flex-col items-center p-3 rounded-xl transition-all ${
                    currentMood === mood.label 
                      ? 'bg-white/10 border border-white/20 scale-105' 
                      : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <mood.icon className={`w-8 h-8 mb-2 ${mood.color}`} />
                  <span className="text-xs text-slate-300">{mood.label}</span>
                </button>
              ))}
            </div>
          </div>

        </motion.div>

        {/* Middle Col: Charts */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <div className="glass p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-slate-200 mb-6">Emotional Trend Analysis</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={moodHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
              </ResponsiveContainer>
            </div>
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

import React, { useState } from 'react';
import Button from './Button';
import { stressService } from '../services/index';
import toast from 'react-hot-toast';

const MOODS = ['happy', 'okay', 'stressed', 'anxious', 'tired'];

const StressInput = ({ onLogged }) => {
  const [mood, setMood] = useState('okay');
  const [stressLevel, setStressLevel] = useState(50);
  const [energyLevel, setEnergyLevel] = useState(70);
  const [sleepHours, setSleepHours] = useState(7);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await stressService.logStress({
        stress_level: parseInt(stressLevel, 10),
        mood,
        sleep_hours: parseFloat(sleepHours),
        energy_level: parseInt(energyLevel, 10),
      });
      toast.success('Wellness check-in saved');
      if (onLogged) onLogged();
    } catch {
      toast.error('Failed to log check-in');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass p-4 rounded-xl space-y-4 border border-white/10">
      <h4 className="font-semibold text-slate-200">Log Wellness Check-in</h4>
      <div>
        <label className="text-xs text-slate-400 uppercase font-semibold">Mood</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {MOODS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMood(m)}
              className={`px-3 py-1 rounded-lg text-sm capitalize ${mood === m ? 'bg-purple-600 text-white' : 'bg-white/5 text-slate-400'}`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="text-xs text-slate-400">Stress: {stressLevel}%</label>
        <input type="range" min={0} max={100} value={stressLevel} onChange={(e) => setStressLevel(e.target.value)} className="w-full accent-red-500" />
      </div>
      <div>
        <label className="text-xs text-slate-400">Energy: {energyLevel}%</label>
        <input type="range" min={0} max={100} value={energyLevel} onChange={(e) => setEnergyLevel(e.target.value)} className="w-full accent-green-500" />
      </div>
      <div>
        <label className="text-xs text-slate-400">Sleep (hours): {sleepHours}</label>
        <input type="range" min={3} max={12} step={0.5} value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} className="w-full accent-blue-500" />
      </div>
      <Button type="submit" className="w-full" isLoading={submitting}>Submit Check-in</Button>
    </form>
  );
};

export default StressInput;

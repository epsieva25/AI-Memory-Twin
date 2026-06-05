import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Bell, Brain, Moon, Sun, Sliders, BookOpen, ExternalLink, Zap, MessageSquare } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import ProfileEdit from '../components/ProfileEdit';
import AcademicInput from '../components/AcademicInput';
import { useTheme } from '../context/ThemeContext';
import { profileService, agentsService } from '../services/index';

const Settings = ({ profile, onProfileUpdate }) => {
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [runningCycle, setRunningCycle] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    department: '',
    year: 1,
    semester: 1,
    target_cgpa: 3.5,
    current_cgpa: '',
    preferred_study_time: 'Morning',
    daily_study_hours: 2,
    goals: '',
    interests: '',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        department: profile.department || '',
        year: profile.year || 1,
        semester: profile.semester || 1,
        target_cgpa: profile.target_cgpa ?? 3.5,
        current_cgpa: profile.current_cgpa ?? '',
        preferred_study_time: profile.preferred_study_time || 'Morning',
        daily_study_hours: profile.daily_study_hours ?? 2,
        goals: profile.goals || '',
        interests: profile.interests || '',
      });
    }
  }, [profile]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const onProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        year: parseInt(formData.year, 10),
        semester: parseInt(formData.semester, 10),
        target_cgpa: parseFloat(formData.target_cgpa),
        current_cgpa: formData.current_cgpa ? parseFloat(formData.current_cgpa) : null,
        daily_study_hours: parseFloat(formData.daily_study_hours) || 2,
      };
      const updated = await profileService.update(payload);
      if (onProfileUpdate) onProfileUpdate(updated);
      toast.success('Profile updated');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'academics', label: 'Academic Records', icon: BookOpen },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    { id: 'ai', label: 'AI', icon: Brain },
  ];

  const runAICycle = async () => {
    setRunningCycle(true);
    try {
      await agentsService.runCycle();
      toast.success('AI cycle complete! Memory and recommendations updated.');
    } catch {
      toast.error('AI cycle failed. Is the backend running?');
    } finally {
      setRunningCycle(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-200">Settings</h1>
          <p className="text-slate-400 mt-1">Manage your profile, academic records, and AI preferences.</p>
        </div>
        <Link to="/profile">
          <Button leftIcon={<ExternalLink className="w-4 h-4" />} variant="secondary">
            My Academic Twin
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-64 space-y-2 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                activeTab === tab.id
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 glass rounded-2xl p-6 border border-white/10 min-h-[400px]">
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-bold text-slate-200 mb-6 border-b border-white/10 pb-4">Profile</h2>
              <ProfileEdit formData={formData} onChange={handleChange} onSubmit={onProfileSave} saving={saving} />
            </motion.div>
          )}

          {activeTab === 'academics' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <h2 className="text-xl font-bold text-slate-200 mb-6 border-b border-white/10 pb-4">Academic Records</h2>
              <AcademicInput />
            </motion.div>
          )}

          {activeTab === 'preferences' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="text-xl font-bold text-slate-200 mb-6 border-b border-white/10 pb-4">Preferences</h2>
              <Button variant="outline" onClick={toggleTheme} leftIcon={theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}>
                {theme === 'dark' ? 'Light mode' : 'Dark mode'}
              </Button>
            </motion.div>
          )}

          {activeTab === 'ai' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="text-xl font-bold text-slate-200 border-b border-white/10 pb-4">AI Personalization</h2>

              <div className="glass p-5 rounded-xl border border-purple-500/20 bg-purple-500/5 space-y-3">
                <h3 className="font-semibold text-slate-200 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-400" /> AI Memory Context
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Your AI tutor automatically incorporates your profile, academic records, stress logs, planner tasks,
                  chat history, and knowledge graph — no extra configuration required.
                </p>
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400">✓ Profile data</span>
                  <span className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400">✓ Academic records</span>
                  <span className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400">✓ Stress logs</span>
                  <span className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400">✓ Planner tasks</span>
                  <span className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400">✓ Chat history</span>
                  <span className="text-xs px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-400">✓ Graph memory</span>
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-slate-200">Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Button
                    onClick={runAICycle}
                    isLoading={runningCycle}
                    leftIcon={<Zap className="w-4 h-4" />}
                    variant="primary"
                  >
                    Run AI Cycle
                  </Button>
                  <Button
                    onClick={() => navigate('/tutor')}
                    leftIcon={<MessageSquare className="w-4 h-4" />}
                    variant="secondary"
                  >
                    Open AI Tutor
                  </Button>
                  <Link to="/profile">
                    <Button leftIcon={<ExternalLink className="w-4 h-4" />} variant="outline" className="w-full">
                      My Academic Twin
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;

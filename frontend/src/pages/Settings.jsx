import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { 
  User, Bell, Brain, Moon, Sun, Save, Sliders
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Button from '../components/Button';
import Input from '../components/Input';
import { useTheme } from '../context/ThemeContext';

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');

  // Mock user data since auth is removed
  const user = {
    name: "Ramprakash V",
    email: "ramprakashv.cse2023@citchennai.net",
    department: "CSE",
    year: 4
  };

  const { register: registerProfile, handleSubmit: handleProfileSubmit } = useForm({
    defaultValues: {
      name: user.name || '',
      email: user.email || '',
      department: user.department || 'CSE',
      year: user.year || 4
    }
  });

  const onProfileSave = (data) => {
    toast.success('Profile updated successfully!');
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
    { id: 'ai', label: 'AI Settings', icon: Brain },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold text-slate-200">Settings</h1>
        <p className="text-slate-400 mt-1">Manage your account, preferences, and AI Twin settings.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Settings Sidebar */}
        <div className="w-full md:w-64 space-y-2 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-sm font-medium ${
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

        {/* Settings Content */}
        <div className="flex-1 glass rounded-2xl p-6 border border-white/10 min-h-[400px]">
          
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="text-xl font-bold text-slate-200 mb-6 border-b border-white/10 pb-4">Profile Information</h2>
              <form onSubmit={handleProfileSubmit(onProfileSave)} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Input label="Full Name" {...registerProfile('name')} />
                  <Input label="Email" type="email" {...registerProfile('email')} disabled />
                  <Input label="Department" {...registerProfile('department')} />
                  <Input label="Year of Study" type="number" {...registerProfile('year')} />
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" leftIcon={<Save className="w-4 h-4" />}>
                    Save Changes
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="text-xl font-bold text-slate-200 mb-6 border-b border-white/10 pb-4">App Preferences</h2>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-slate-200 font-medium flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                    Appearance
                  </h4>
                  <p className="text-sm text-slate-400">Toggle between light and dark mode</p>
                </div>
                <Button variant="outline" onClick={toggleTheme}>
                  {theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
                </Button>
              </div>

              <div className="flex items-center justify-between border-t border-white/10 pt-6">
                <div>
                  <h4 className="text-slate-200 font-medium flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    Email Notifications
                  </h4>
                  <p className="text-sm text-slate-400">Receive daily summaries and alerts</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                </label>
              </div>
            </motion.div>
          )}

          {/* AI Settings Tab */}
          {activeTab === 'ai' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              <h2 className="text-xl font-bold text-slate-200 mb-6 border-b border-white/10 pb-4">AI Personalization</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">AI Tutor Persona</label>
                  <select className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500/50">
                    <option value="encouraging">Encouraging & Supportive</option>
                    <option value="strict">Strict & Direct</option>
                    <option value="socratic">Socratic (Questions-based)</option>
                  </select>
                </div>

                <div>
                  <h4 className="text-slate-200 font-medium mb-1">Data Collection for AI</h4>
                  <p className="text-sm text-slate-400 mb-4">Allow the AI to analyze your study habits to improve recommendations.</p>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-black/40 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-500"></div>
                  </label>
                </div>
                <div className="flex justify-end pt-4">
                  <Button variant="primary">Save AI Settings</Button>
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
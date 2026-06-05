import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, ArrowRight, ArrowLeft, User, Target, BookOpen } from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import { profileService } from '../services/index';
import toast from 'react-hot-toast';

const ProfileSetup = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    full_name: '',
    department: 'CSE',
    year: 1,
    semester: 1,
    current_cgpa: '',
    target_cgpa: 9.0,
    goals: '',
    interests: '',
    preferred_study_time: 'Evening',
    daily_study_hours: 3,
    weak_subjects: '',
    strong_subjects: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (step === 1 && !formData.full_name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (step === 2 && (!formData.goals.trim() || formData.target_cgpa === '')) {
      toast.error('Please fill in goals and target CGPA');
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.weak_subjects.trim() || !formData.strong_subjects.trim()) {
      toast.error('Enter at least one weak and one strong subject');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        full_name: formData.full_name,
        department: formData.department,
        year: parseInt(formData.year, 10),
        semester: parseInt(formData.semester, 10),
        goals: formData.goals,
        interests: formData.interests,
        current_cgpa: formData.current_cgpa ? parseFloat(formData.current_cgpa) : null,
        target_cgpa: parseFloat(formData.target_cgpa),
        preferred_study_time: formData.preferred_study_time,
        daily_study_hours: parseFloat(formData.daily_study_hours) || 2,
        weak_subjects: formData.weak_subjects.split(',').map((s) => s.trim()).filter(Boolean),
        strong_subjects: formData.strong_subjects.split(',').map((s) => s.trim()).filter(Boolean),
      };

      const res = await profileService.create(payload);
      toast.success('Your academic twin is ready!');
      onComplete(res);
    } catch (err) {
      console.error(err);
      toast.error('Failed to create profile. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4 py-12 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/20 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/20 blur-[130px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-xl glass rounded-3xl border border-white/10 p-8 shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">
            Set Up Your AI Memory Twin
          </h1>
          <p className="text-slate-400 text-sm mt-1">One profile per installation — fully personalized to you.</p>
        </div>

        <div className="flex justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`h-1.5 rounded-full transition-all ${s === step ? 'w-8 bg-purple-500' : 'w-2 bg-white/10'}`} />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><User className="w-5 h-5 text-purple-400" /> Identity</h3>
                <Input label="Full Name" name="full_name" value={formData.full_name} onChange={handleChange} required />
                <Input label="Department" name="department" value={formData.department} onChange={handleChange} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Year" name="year" type="number" min={1} value={formData.year} onChange={handleChange} />
                  <Input label="Semester" name="semester" type="number" min={1} value={formData.semester} onChange={handleChange} />
                </div>
                <div className="flex justify-end pt-2">
                  <Button type="button" onClick={handleNext} rightIcon={<ArrowRight className="w-4 h-4" />}>Continue</Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><Target className="w-5 h-5 text-blue-400" /> Goals</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Current CGPA" name="current_cgpa" type="number" step="0.01" value={formData.current_cgpa} onChange={handleChange} placeholder="e.g. 7.8" />
                  <Input label="Target CGPA" name="target_cgpa" type="number" step="0.01" value={formData.target_cgpa} onChange={handleChange} required />
                </div>
                <textarea name="goals" value={formData.goals} onChange={handleChange} rows={3} placeholder="Academic & career goals" required
                  className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-slate-200 text-sm focus:ring-2 focus:ring-purple-500/50 resize-none" />
                <Input label="Interests (comma separated)" name="interests" value={formData.interests} onChange={handleChange} placeholder="AI, Web Dev, Research" />
                <div className="flex justify-between pt-2">
                  <Button type="button" variant="secondary" onClick={() => setStep(1)} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
                  <Button type="button" onClick={handleNext} rightIcon={<ArrowRight className="w-4 h-4" />}>Continue</Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2"><BookOpen className="w-5 h-5 text-green-400" /> Academics & Habits</h3>
                <Input label="Preferred Study Time" name="preferred_study_time" value={formData.preferred_study_time} onChange={handleChange} />
                <Input label="Daily Study Hours" name="daily_study_hours" type="number" step="0.5" min={0.5} value={formData.daily_study_hours} onChange={handleChange} />
                <Input label="Strong Subjects (comma separated)" name="strong_subjects" value={formData.strong_subjects} onChange={handleChange} required />
                <Input label="Weak Subjects (comma separated)" name="weak_subjects" value={formData.weak_subjects} onChange={handleChange} required />
                <div className="flex justify-between pt-2">
                  <Button type="button" variant="secondary" onClick={() => setStep(2)} leftIcon={<ArrowLeft className="w-4 h-4" />}>Back</Button>
                  <Button type="submit" isLoading={loading} rightIcon={<Sparkles className="w-4 h-4" />}>Launch Memory Twin</Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </motion.div>
    </div>
  );
};

export default ProfileSetup;

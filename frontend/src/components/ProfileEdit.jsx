import React from 'react';
import Input from './Input';
import Button from './Button';

const ProfileEdit = ({ formData, onChange, onSubmit, saving }) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <Input label="Full Name" name="full_name" value={formData.full_name} onChange={onChange} required />
    <Input label="Department" name="department" value={formData.department} onChange={onChange} required />
    <div className="grid grid-cols-2 gap-4">
      <Input label="Year" name="year" type="number" min={1} max={6} value={formData.year} onChange={onChange} required />
      <Input label="Semester" name="semester" type="number" min={1} max={8} value={formData.semester} onChange={onChange} required />
    </div>
    <div className="grid grid-cols-2 gap-4">
      <Input label="Current CGPA" name="current_cgpa" type="number" step="0.01" value={formData.current_cgpa} onChange={onChange} />
      <Input label="Target CGPA" name="target_cgpa" type="number" step="0.01" value={formData.target_cgpa} onChange={onChange} required />
    </div>
    <Input label="Preferred Study Time" name="preferred_study_time" value={formData.preferred_study_time} onChange={onChange} />
    <Input label="Daily Study Hours" name="daily_study_hours" type="number" step="0.5" min={0.5} max={16} value={formData.daily_study_hours} onChange={onChange} />
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Goals</label>
      <textarea
        name="goals"
        value={formData.goals}
        onChange={onChange}
        rows={3}
        className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
      />
    </div>
    <div>
      <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Interests</label>
      <textarea
        name="interests"
        value={formData.interests}
        onChange={onChange}
        rows={2}
        className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
      />
    </div>
    <Button type="submit" isLoading={saving} leftIcon={null}>Save Profile</Button>
  </form>
);

export default ProfileEdit;

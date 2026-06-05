import React, { useState } from 'react';
import Input from './Input';
import Button from './Button';
import { plannerService } from '../services/index';
import toast from 'react-hot-toast';

const StudyInput = ({ onAdded }) => {
  const [task, setTask] = useState('');
  const [subject, setSubject] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [duration, setDuration] = useState('1.5');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!task.trim() || !subject.trim()) {
      toast.error('Task and subject are required');
      return;
    }
    setSubmitting(true);
    try {
      await plannerService.createTask({
        task: task.trim(),
        subject: subject.trim(),
        priority,
        duration: parseFloat(duration) || 1,
        deadline: deadline ? new Date(deadline).toISOString() : null,
        ai_generated: false,
      });
      toast.success('Task added');
      setTask('');
      setSubject('');
      setDeadline('');
      if (onAdded) onAdded();
    } catch {
      toast.error('Could not add task');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="glass p-4 rounded-xl space-y-3 border border-white/10">
      <h4 className="font-semibold text-slate-200">Quick Add Task</h4>
      <Input label="Task" value={task} onChange={(e) => setTask(e.target.value)} placeholder="e.g. Revise chapter 4" required />
      <Input label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} required />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400 uppercase font-semibold">Priority</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full mt-1 bg-black/20 border border-white/10 rounded-xl px-3 py-2 text-slate-200 text-sm">
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
        <Input label="Hours" type="number" step="0.5" value={duration} onChange={(e) => setDuration(e.target.value)} />
      </div>
      <Input label="Deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
      <Button type="submit" size="sm" isLoading={submitting}>Add Task</Button>
    </form>
  );
};

export default StudyInput;

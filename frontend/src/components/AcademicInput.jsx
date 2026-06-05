import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import EmptyState from './EmptyState';
import { academicsService } from '../services/index';
import toast from 'react-hot-toast';

const emptyForm = { subject: '', marks: '', attendance: '', assignments_completed: '', semester: 1 };

const AcademicInput = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await academicsService.getAll();
      setRecords(Array.isArray(data) ? data : []);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim()) {
      toast.error('Subject is required');
      return;
    }
    setSubmitting(true);
    const payload = {
      subject: form.subject.trim(),
      marks: parseFloat(form.marks) || 0,
      attendance: parseFloat(form.attendance) || 0,
      assignments_completed: parseInt(form.assignments_completed, 10) || 0,
      semester: parseInt(form.semester, 10) || 1,
    };
    try {
      if (editId) {
        await academicsService.update(editId, payload);
        toast.success('Record updated');
      } else {
        await academicsService.create(payload);
        toast.success('Record added');
      }
      setForm(emptyForm);
      setEditId(null);
      load();
    } catch {
      toast.error('Could not save academic record');
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = (r) => {
    setEditId(r.id);
    setForm({
      subject: r.subject,
      marks: String(r.marks),
      attendance: String(r.attendance),
      assignments_completed: String(r.assignments_completed),
      semester: r.semester,
    });
  };

  const onDelete = async (id) => {
    try {
      await academicsService.delete(id);
      toast.success('Record deleted');
      load();
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) return <p className="text-slate-400 text-sm">Loading academic records…</p>;

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="glass p-4 rounded-xl space-y-3 border border-white/10">
        <h4 className="font-semibold text-slate-200">{editId ? 'Edit Record' : 'Add Academic Record'}</h4>
        <Input label="Subject" name="subject" value={form.subject} onChange={onChange} required />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input label="Marks %" name="marks" type="number" value={form.marks} onChange={onChange} />
          <Input label="Attendance %" name="attendance" type="number" value={form.attendance} onChange={onChange} />
          <Input label="Assignments (0-10)" name="assignments_completed" type="number" value={form.assignments_completed} onChange={onChange} />
          <Input label="Semester" name="semester" type="number" value={form.semester} onChange={onChange} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" isLoading={submitting}>{editId ? 'Update' : 'Add'}</Button>
          {editId && (
            <Button type="button" variant="secondary" size="sm" onClick={() => { setEditId(null); setForm(emptyForm); }}>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {records.length === 0 ? (
        <EmptyState title="No academic records" description="Start adding academic data to personalize analytics." />
      ) : (
        <ul className="space-y-2">
          {records.map((r) => (
            <li key={r.id} className="flex items-center justify-between glass p-3 rounded-xl border border-white/5">
              <div>
                <p className="font-medium text-slate-200">{r.subject}</p>
                <p className="text-xs text-slate-400">
                  Marks {r.marks}% · Attendance {r.attendance}% · Sem {r.semester}
                </p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => onEdit(r)} className="p-2 text-slate-400 hover:text-purple-400"><Pencil className="w-4 h-4" /></button>
                <button type="button" onClick={() => onDelete(r.id)} className="p-2 text-slate-400 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default AcademicInput;

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Bell, Check, Trash2, Clock, AlertTriangle, Brain, Target,
  Filter, RefreshCw, TrendingUp, BookOpen, Calendar,
  CheckCheck, Inbox, ArrowRight,
} from 'lucide-react';
import Button from '../components/Button';
import EmptyState from '../components/EmptyState';
import { notificationsService } from '../services/index';
import toast from 'react-hot-toast';

/* ─── Source routing map ──────────────────────────────────────────────── */
const SOURCE_ROUTES = {
  alert:   '/planner',
  warning: '/stress',
  ai:      '/profile',
  success: '/analytics',
  info:    '/dashboard',
};

const TYPE_CONFIG = {
  alert:   { icon: Clock,         color: 'text-red-400',    bg: 'bg-red-500/10',    border: 'border-red-500/20',    label: 'Alert',   sourceName: 'Study Planner' },
  warning: { icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', label: 'Warning', sourceName: 'Stress Monitor' },
  ai:      { icon: Brain,         color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', label: 'AI Tip',  sourceName: 'My Academic Twin' },
  success: { icon: Target,        color: 'text-green-400',  bg: 'bg-green-500/10',  border: 'border-green-500/20',  label: 'Success', sourceName: 'Analytics' },
  info:    { icon: Bell,          color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   label: 'Info',    sourceName: 'Dashboard' },
};

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
};

const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const itemVariants = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

/* ─── Quick Action Cards (for empty state) ────────────────────────────── */
const QUICK_ACTIONS = [
  { label: 'Check Analytics', icon: TrendingUp, to: '/analytics', color: 'text-purple-400' },
  { label: 'Add Task',        icon: Calendar,   to: '/planner',   color: 'text-blue-400'   },
  { label: 'Log Check-in',    icon: Brain,       to: '/stress',    color: 'text-red-400'    },
  { label: 'View Profile',    icon: BookOpen,    to: '/profile',   color: 'text-green-400'  },
];

/* ═══════════════════════════════════════════════════════════════════════ */
const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread' | type
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const data = await notificationsService.getAll();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const markAsRead = async (id, e) => {
    e?.stopPropagation();
    try {
      await notificationsService.markRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    } catch {
      toast.error('Could not mark as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      toast.success('All notifications marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const deleteNotification = async (id, e) => {
    e?.stopPropagation();
    try {
      await notificationsService.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      toast.success('Notification removed');
    } catch {
      toast.error('Delete failed');
    }
  };

  const handleNotifClick = (notification) => {
    // Mark as read then navigate to source
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    const route = SOURCE_ROUTES[notification.type] || '/dashboard';
    navigate(route);
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="max-w-4xl mx-auto space-y-6">

      {/* ── Header ──────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-200 flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-purple-500 text-white text-sm px-2.5 py-0.5 rounded-full font-semibold">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-slate-400 mt-1">Smart alerts generated from your profile and academic activity.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={load} leftIcon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={markAllAsRead} leftIcon={<CheckCheck className="w-4 h-4" />}>
              Mark all read
            </Button>
          )}
        </div>
      </motion.div>

      {/* ── Filter pills ────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
        {[
          { key: 'all',     label: 'All' },
          { key: 'unread',  label: `Unread (${unreadCount})` },
          { key: 'ai',      label: '🧠 AI Tips' },
          { key: 'alert',   label: '🔴 Alerts' },
          { key: 'warning', label: '⚠️ Warnings' },
          { key: 'success', label: '✅ Success' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              filter === key
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </motion.div>

      {/* ── Notification list ────────────────────────────────────────── */}
      {loading ? (
        <div className="glass rounded-2xl overflow-hidden border border-white/10">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 border-b border-white/10 last:border-b-0 animate-pulse">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-white/10 rounded w-1/4" />
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <motion.div variants={containerVariants} className="glass rounded-2xl overflow-hidden border border-white/10">
          <AnimatePresence initial={false}>
            {filtered.map((notif) => {
              const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
              const IconComp = cfg.icon;
              const dest = SOURCE_ROUTES[notif.type] || '/dashboard';

              return (
                <motion.div
                  key={notif.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                  transition={{ duration: 0.2 }}
                  onClick={() => handleNotifClick(notif)}
                  className={`group flex gap-4 p-5 border-b border-white/10 last:border-b-0 cursor-pointer transition-all hover:bg-white/5 ${
                    !notif.is_read ? 'bg-white/[0.03]' : 'opacity-75'
                  }`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${cfg.bg} border ${cfg.border}`}>
                    <IconComp className={`w-5 h-5 ${cfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold uppercase tracking-wide ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {!notif.is_read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                        )}
                      </div>
                      <span className="text-xs text-slate-500 shrink-0">{formatTime(notif.timestamp)}</span>
                    </div>

                    <p className={`text-sm leading-relaxed mb-2 ${notif.is_read ? 'text-slate-400' : 'text-slate-200'}`}>
                      {notif.message}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        View in {cfg.sourceName}
                      </span>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notif.is_read && (
                          <button
                            type="button"
                            onClick={(e) => markAsRead(notif.id, e)}
                            className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-purple-500/10 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Mark read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => deleteNotification(notif.id, e)}
                          className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="glass rounded-2xl border border-white/10">
          <EmptyState
            icon={Inbox}
            title={filter === 'unread' ? 'All caught up!' : 'No notifications'}
            description={
              filter === 'unread'
                ? 'You have read all your notifications. New alerts will appear as you use the platform.'
                : 'Notifications are generated as the AI analyzes your academic data and activity.'
            }
          />
          {/* Quick action grid */}
          <div className="px-6 pb-8 grid grid-cols-2 md:grid-cols-4 gap-3">
            {QUICK_ACTIONS.map(({ label, icon: Icon, to, color }) => (
              <button
                key={to}
                onClick={() => navigate(to)}
                className="glass p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-all text-center group"
              >
                <Icon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                <p className="text-xs text-slate-400 group-hover:text-slate-200 transition-colors">{label}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default Notifications;

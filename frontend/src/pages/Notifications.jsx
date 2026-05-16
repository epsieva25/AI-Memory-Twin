import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, Check, Trash2, Clock, AlertTriangle, Brain, Target, Filter 
} from 'lucide-react';
import Button from '../components/Button';

// Mock Data
const initialNotifications = [
  { id: 1, type: 'alert', title: 'OS Assignment Deadline', message: 'Assignment 3 is due tomorrow at 11:59 PM.', time: '2 hours ago', read: false },
  { id: 2, type: 'warning', title: 'Attendance Warning', message: 'Your attendance in Database Systems dropped below 80%.', time: '5 hours ago', read: false },
  { id: 3, type: 'ai', title: 'Study Plan Generated', message: 'Your AI Memory Twin has generated a new study plan for finals.', time: '1 day ago', read: true },
  { id: 4, type: 'success', title: 'Goal Achieved', message: 'You reached your weekly study goal of 30 hours!', time: '2 days ago', read: true },
];

const Notifications = () => {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState('all'); // all, unread

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const filteredNotifications = notifications.filter(n => 
    filter === 'unread' ? !n.read : true
  );

  const getIconForType = (type) => {
    switch (type) {
      case 'alert': return <Clock className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'ai': return <Brain className="w-5 h-5 text-purple-400" />;
      case 'success': return <Target className="w-5 h-5 text-green-400" />;
      default: return <Bell className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-200 flex items-center gap-3">
            Notifications
            {unreadCount > 0 && (
              <span className="bg-purple-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                {unreadCount} new
              </span>
            )}
          </h1>
          <p className="text-slate-400 mt-1">Stay updated with your academic alerts and AI insights.</p>
        </div>
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
            leftIcon={<Filter className="w-4 h-4" />}
          >
            {filter === 'all' ? 'Show Unread' : 'Show All'}
          </Button>
          <Button variant="secondary" size="sm" onClick={markAllAsRead}>
            Mark all read
          </Button>
        </div>
      </div>

      <div className="glass rounded-2xl overflow-hidden border border-white/10">
        <AnimatePresence>
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((notification) => (
              <motion.div
                key={notification.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                className={`p-5 border-b border-white/10 last:border-b-0 flex gap-4 transition-colors ${
                  notification.read ? 'bg-transparent opacity-70' : 'bg-white/5'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  notification.read ? 'bg-black/20' : 'bg-white/10'
                }`}>
                  {getIconForType(notification.type)}
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-semibold ${notification.read ? 'text-slate-300' : 'text-slate-100'}`}>
                      {notification.title}
                    </h4>
                    <span className="text-xs text-slate-500">{notification.time}</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-3">{notification.message}</p>
                  
                  <div className="flex gap-2">
                    {!notification.read && (
                      <button 
                        onClick={() => markAsRead(notification.id)}
                        className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                      >
                        <Check className="w-3 h-3" /> Mark as read
                      </button>
                    )}
                    <button 
                      onClick={() => deleteNotification(notification.id)}
                      className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
                {!notification.read && (
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-2 shrink-0 animate-pulse" />
                )}
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-12 text-center text-slate-400"
            >
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>You're all caught up!</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default Notifications;

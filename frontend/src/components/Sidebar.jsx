import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CalendarDays, MessageSquare, LineChart,
  Brain, Share2, Bell, Settings, Menu, X, UserCircle
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard',     path: '/dashboard',     icon: LayoutDashboard },
  { name: 'Study Planner', path: '/planner',        icon: CalendarDays },
  { name: 'AI Tutor',      path: '/tutor',          icon: MessageSquare },
  { name: 'Analytics',     path: '/analytics',      icon: LineChart },
  { name: 'Stress Monitor',path: '/stress',         icon: Brain },
  { name: 'Graph View',    path: '/graph',          icon: Share2 },
  { name: 'Notifications',    path: '/notifications',  icon: Bell },
  { name: 'My Academic Twin', path: '/profile',          icon: UserCircle },
  { name: 'Settings',         path: '/settings',         icon: Settings },
];

const NavItem = ({ item, onClick }) => (
  <NavLink
    key={item.name}
    to={item.path}
    end={item.path === '/dashboard'}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
        isActive
          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(168,85,247,0.12)]'
          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
      }`
    }
  >
    <item.icon className="w-5 h-5 shrink-0" />
    <span>{item.name}</span>
  </NavLink>
);

const Logo = () => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(168,85,247,0.35)] shrink-0">
      <Brain className="text-white w-6 h-6" />
    </div>
    <div>
      <h1 className="text-base font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 leading-tight">
        Memory Twin
      </h1>
      <p className="text-[10px] text-slate-500 leading-tight">AI Academic Platform</p>
    </div>
  </div>
);

const Sidebar = ({ profile }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeMobile = () => setMobileOpen(false);

  const studentName = profile?.full_name || 'Student';
  const initial = studentName.charAt(0).toUpperCase();
  const department = profile?.department || 'CSE';
  const year = profile?.year || 1;

  const SidebarContent = ({ onNav }) => (
    <>
      <div className="p-5 border-b border-white/10">
        <Logo />
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map(item => (
          <NavItem key={item.name} item={item} onClick={onNav} />
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <Link to="/profile" className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 flex items-center gap-3 transition-colors group">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-200 truncate group-hover:text-purple-300 transition-colors">{studentName}</p>
            <p className="text-[10px] text-slate-500 truncate">{department} · Year {year}</p>
          </div>
        </Link>
      </div>
    </>
  );

  return (
    <>
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-64 h-screen hidden md:flex flex-col glass-panel fixed left-0 top-0 border-r border-white/10 z-30"
      >
        <SidebarContent onNav={undefined} />
      </motion.aside>

      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-40 p-2.5 rounded-xl glass border border-white/10 text-slate-300 hover:text-white shadow-lg"
        aria-label="Open navigation"
      >
        <Menu className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeMobile}
              className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              className="md:hidden fixed left-0 top-0 h-screen w-72 flex flex-col glass-panel border-r border-white/10 z-50"
            >
              <button
                onClick={closeMobile}
                className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <SidebarContent onNav={closeMobile} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
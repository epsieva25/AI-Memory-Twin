import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon, Bell, Search, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

const Navbar = ({ toggleMobileMenu }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="h-20 glass-panel border-b border-white/10 px-6 flex items-center justify-between sticky top-0 z-40 backdrop-blur-xl">
      <div className="flex items-center gap-4">
        <button 
          onClick={toggleMobileMenu}
          className="md:hidden p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search tasks, notes..." 
            className="bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 text-slate-200 placeholder-slate-400 w-64 transition-all focus:w-80"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        <button className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
        </button>

        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-slate-200">Mary Jasper</p>
            <p className="text-xs text-slate-400">CSE · Year 4</p>
          </div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 p-0.5 cursor-pointer"
          >
            <img 
              src="https://ui-avatars.com/api/?name=Mary+Jasper&background=random" 
              alt="Profile" 
              className="w-full h-full rounded-full border-2 border-black/20"
            />
          </motion.div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
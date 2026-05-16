import React from 'react';
import { motion } from 'framer-motion';

/**
 * EmptyState — shown when no data is available.
 * Props: icon (Lucide component), title, description, action (JSX button)
 */
const EmptyState = ({ icon: Icon, title, description, action }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-8 text-center"
  >
    {Icon && (
      <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-slate-500" />
      </div>
    )}
    <h3 className="text-lg font-semibold text-slate-300 mb-2">{title}</h3>
    {description && (
      <p className="text-sm text-slate-500 max-w-xs mb-6">{description}</p>
    )}
    {action && action}
  </motion.div>
);

export default EmptyState;

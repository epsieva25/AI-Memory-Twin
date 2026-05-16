import React from 'react';
import { motion } from 'framer-motion';

/**
 * Skeleton loading component for glassmorphism cards.
 * Usage: <Skeleton className="h-32 w-full" /> or <Skeleton.Card /> etc.
 */
const shimmer = {
  animate: { opacity: [0.4, 0.8, 0.4] },
  transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
};

const Skeleton = ({ className = '', rounded = 'rounded-xl' }) => (
  <motion.div
    {...shimmer}
    className={`bg-white/10 dark:bg-white/5 ${rounded} ${className}`}
  />
);

/** Full stat card skeleton */
Skeleton.StatCard = () => (
  <div className="glass p-5 rounded-2xl flex items-center gap-4">
    <Skeleton className="w-12 h-12 shrink-0" rounded="rounded-xl" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-6 w-16" />
    </div>
  </div>
);

/** Chart area skeleton */
Skeleton.Chart = ({ height = 'h-64' }) => (
  <div className="glass p-6 rounded-2xl space-y-4">
    <Skeleton className="h-4 w-40" />
    <Skeleton className={`${height} w-full`} rounded="rounded-xl" />
  </div>
);

/** List item skeleton */
Skeleton.ListItem = () => (
  <div className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
    <Skeleton className="w-10 h-10 shrink-0" rounded="rounded-full" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-3 w-48" />
      <Skeleton className="h-2 w-32" />
    </div>
    <Skeleton className="h-6 w-16" rounded="rounded-md" />
  </div>
);

/** Table rows skeleton */
Skeleton.Table = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <Skeleton.ListItem key={i} />
    ))}
  </div>
);

/** Full dashboard loading state */
Skeleton.Dashboard = () => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => <Skeleton.StatCard key={i} />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Skeleton.Chart height="h-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton.Chart height="h-48" />
          <Skeleton.Chart height="h-48" />
        </div>
      </div>
      <div className="space-y-6">
        <Skeleton.Chart height="h-48" />
        <Skeleton.Chart height="h-48" />
      </div>
    </div>
  </div>
);

export default Skeleton;

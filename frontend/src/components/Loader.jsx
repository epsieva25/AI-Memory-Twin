import React from 'react';
import { motion } from 'framer-motion';

const Loader = ({ fullScreen = false }) => {
  const loaderContent = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <motion.div
        className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <p className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 font-medium animate-pulse">
        Initializing AI Core...
      </p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)] backdrop-blur-xl">
        {loaderContent}
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center min-h-[200px]">
      {loaderContent}
    </div>
  );
};

export default Loader;

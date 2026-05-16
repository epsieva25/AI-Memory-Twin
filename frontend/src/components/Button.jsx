import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2 } from 'lucide-react';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Button = React.forwardRef(({ 
  className, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  leftIcon,
  rightIcon,
  children, 
  ...props 
}, ref) => {
  
  const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:pointer-events-none disabled:opacity-50 transition-all duration-300";
  
  const variants = {
    primary: "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-500/25",
    secondary: "bg-white/10 text-slate-200 hover:bg-white/20 border border-white/5",
    outline: "border border-purple-500/50 text-purple-400 hover:bg-purple-500/10",
    ghost: "text-slate-300 hover:text-white hover:bg-white/10",
    danger: "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20"
  };

  const sizes = {
    sm: "h-9 px-3 text-xs",
    md: "h-11 px-5 text-sm",
    lg: "h-14 px-8 text-base",
    icon: "h-11 w-11"
  };

  return (
    <motion.button
      ref={ref}
      whileHover={{ scale: isLoading ? 1 : 1.02 }}
      whileTap={{ scale: isLoading ? 1 : 0.98 }}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
    </motion.button>
  );
});

Button.displayName = "Button";

export default Button;

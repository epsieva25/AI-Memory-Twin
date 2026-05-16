import React, { forwardRef } from 'react';
import { cn } from './Button';

const Input = forwardRef(({ className, label, error, leftIcon, ...props }, ref) => {
  return (
    <div className="w-full space-y-2">
      {label && (
        <label className="block text-sm font-medium text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            "flex h-11 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300",
            leftIcon && "pl-10",
            error && "border-red-500 focus-visible:ring-red-500",
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs font-medium text-red-400 mt-1">{error}</p>
      )}
    </div>
  );
});

Input.displayName = "Input";

export default Input;

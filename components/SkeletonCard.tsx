
import React from 'react';

export const SkeletonCard = () => {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="animate-pulse space-y-5">
        {/* Header Section */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-800"></div>
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
            <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-1/4"></div>
          </div>
          <div className="w-16 h-6 rounded bg-slate-200 dark:bg-slate-800"></div>
        </div>
        
        {/* Body Section */}
        <div className="space-y-3 pt-2">
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-5/6"></div>
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-4/6"></div>
        </div>

        {/* Footer/Metrics Section */}
        <div className="flex justify-between items-center pt-2">
           <div className="h-8 w-24 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
           <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>
      </div>
    </div>
  );
};

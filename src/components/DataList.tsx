
import React from 'react';
import { SkeletonCard } from './SkeletonCard';

interface DataListProps {
  isLoading: boolean;
  children: React.ReactNode;
  count?: number;
  className?: string;
  emptyMessage?: string;
  isEmpty?: boolean;
}

const DataList: React.FC<DataListProps> = ({ 
  isLoading, 
  children, 
  count = 5, 
  className = "grid grid-cols-1 gap-4",
  emptyMessage = "No data available.",
  isEmpty = false
}) => {
  if (isLoading) {
    return (
      <div className={className}>
        {Array.from({ length: count }).map((_, index) => (
          <SkeletonCard key={`skeleton-${index}`} />
        ))}
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs italic border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/20">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
};

export default DataList;

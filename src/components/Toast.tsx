
import React, { useEffect, useRef } from 'react';
import { Icons } from '../constants';
import { Toast as ToastType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  toast: ToastType;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps & { index: number; total: number }> = ({ toast, onClose, index, total }) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingTimeRef = useRef<number>(toast.duration || 6000);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      onClose(toast.id);
    }, remainingTimeRef.current);
    
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [onClose, toast.id]);

  const styles = {
    success: 'bg-white dark:bg-slate-900 border-l-4 border-l-emerald-500 border-y border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-200/50 dark:shadow-black/50',
    error: 'bg-white dark:bg-slate-900 border-l-4 border-l-red-500 border-y border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-200/50 dark:shadow-black/50',
    warning: 'bg-white dark:bg-slate-900 border-l-4 border-l-amber-500 border-y border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-200/50 dark:shadow-black/50',
    info: 'bg-white dark:bg-slate-900 border-l-4 border-l-blue-500 border-y border-r border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 shadow-xl shadow-slate-200/50 dark:shadow-black/50'
  };

  const icons = {
    success: <div className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0"><Icons.Check size={12} strokeWidth={3} /></div>,
    error: <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 shrink-0"><Icons.Cancel size={12} strokeWidth={3} /></div>,
    warning: <div className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0"><Icons.Alert size={12} strokeWidth={3} /></div>,
    info: <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0"><Icons.Info size={12} strokeWidth={3} /></div>
  };

  // 0 = Front (Newest), 1 = Middle, 2 = Back
  const isStacked = total > 1 && toast.type === 'error';
  const reverseIdx = total - 1 - index;
  
  const offset = isStacked ? reverseIdx * 15 : 0; 
  const scale = isStacked ? 1 - reverseIdx * 0.05 : 1;
  const opacity = isStacked ? 1 - reverseIdx * 0.2 : 1;
  const zIndex = isStacked ? 100 - reverseIdx : 1;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{ 
        opacity: opacity, 
        y: -offset, 
        scale: scale,
        zIndex: zIndex 
      }}
      exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      style={isStacked ? { position: 'absolute', bottom: 0, left: 0, right: 0 } : {}}
      className={`w-full p-4 rounded-lg flex gap-3 relative cursor-pointer group ${styles[toast.type]}`}
      onClick={() => onClose(toast.id)}
    >
      <div className="pt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0 pr-4">
        <h4 className="text-xs font-bold mb-1 tracking-tight uppercase text-slate-500 dark:text-slate-400">{toast.title}</h4>
        <p className="text-xs font-medium leading-relaxed break-words">{toast.message}</p>
      </div>
      
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(toast.id); }}
        className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
      >
          <Icons.Cancel size={12} />
      </button>

      {/* Timer Bar - Only active for the front toast */}
      {reverseIdx === 0 && (
        <motion.div 
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: (toast.duration || 6000) / 1000, ease: 'linear' }}
            className={`absolute bottom-0 left-0 h-0.5 opacity-50 ${
                toast.type === 'success' ? 'bg-emerald-500' :
                toast.type === 'error' ? 'bg-red-500' :
                toast.type === 'warning' ? 'bg-amber-500' :
                'bg-blue-500'
            }`}
        />
      )}
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: ToastType[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  // Separate errors from other toasts
  const errorToasts = toasts.filter(t => t.type === 'error');
  const otherToasts = toasts.filter(t => t.type !== 'error');

  // Only stack the last 3 errors
  const visibleErrors = errorToasts.slice(-3);

  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
      {/* Render non-error toasts normally (vertical list) */}
      <AnimatePresence mode="popLayout">
        {otherToasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onClose={removeToast} index={0} total={1} />
          </div>
        ))}
      </AnimatePresence>

      {/* Render error stack if any exist */}
      {visibleErrors.length > 0 && (
        <div className="relative w-full h-32 flex items-end pointer-events-none">
            <div className="relative w-full">
                <AnimatePresence mode="popLayout">
                    {visibleErrors.map((toast, index) => (
                        <div key={toast.id} className="pointer-events-auto">
                            <ToastItem 
                                toast={toast} 
                                onClose={removeToast} 
                                index={index} 
                                total={visibleErrors.length} 
                            />
                        </div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
      )}
    </div>
  );
};

export default ToastContainer;

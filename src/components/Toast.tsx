
import React, { useEffect, useRef } from 'react';
import { Icons } from '../constants';
import { Toast as ToastType } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ToastProps {
  toast: ToastType;
  onClose: (id: string) => void;
}

const ToastItem: React.FC<ToastProps> = ({ toast, onClose }) => {
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
    success: 'bg-emerald-50/90 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-100 shadow-emerald-500/10',
    error: 'bg-red-50/90 dark:bg-red-900/90 border-red-200 dark:border-red-800 text-red-800 dark:text-red-100 shadow-red-500/10',
    warning: 'bg-amber-50/90 dark:bg-amber-900/90 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-100 shadow-amber-500/10',
    info: 'bg-blue-50/90 dark:bg-blue-900/90 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-100 shadow-blue-500/10'
  };

  const icons = {
    success: <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-300"><Icons.Check size={14} /></div>,
    error: <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-800 flex items-center justify-center text-red-600 dark:text-red-300"><Icons.Cancel size={14} /></div>,
    warning: <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-300"><Icons.Alert size={14} /></div>,
    info: <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-blue-600 dark:text-blue-300"><Icons.Info size={14} /></div>
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, x: -20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      className={`w-full md:w-80 p-3 rounded-xl border shadow-lg backdrop-blur-md flex gap-3 relative cursor-pointer overflow-hidden ${styles[toast.type]}`}
      onClick={() => onClose(toast.id)}
    >
      <div className="shrink-0 pt-0.5">
        {icons[toast.type]}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold mb-0.5 tracking-tight">{toast.title}</h4>
        <p className="text-[11px] font-medium opacity-90 leading-snug break-words">{toast.message}</p>
      </div>
      
      {/* Timer Bar */}
      <motion.div 
        initial={{ width: '100%' }}
        animate={{ width: '0%' }}
        transition={{ duration: (toast.duration || 6000) / 1000, ease: 'linear' }}
        className="absolute bottom-0 left-0 h-0.5 bg-current opacity-30"
      />
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: ToastType[];
  removeToast: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, removeToast }) => {
  return (
    <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
      <AnimatePresence mode="popLayout">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onClose={removeToast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default ToastContainer;

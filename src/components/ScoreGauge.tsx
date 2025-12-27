
import React, { useEffect, useState, useMemo } from 'react';
import { motion, Variants } from 'framer-motion';
import { Icons } from '../constants';

interface ScoreGaugeProps {
  score: number;
  label: string;
  description: string;
  delay?: number;
}

const ScoreGauge = React.memo(({ score, label, description, delay = 0 }: ScoreGaugeProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showTooltip, setShowTooltip] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(score);
    }, 600 + delay);
    return () => clearTimeout(timer);
  }, [score, delay]);

  const percentage = Math.round(score * 100);
  
  const tier = useMemo(() => {
      if (score < 0.4) {
      return {
        label: 'Critical Scarcity',
        id: 'critical',
        colors: ['#ef4444', '#dc2626'], // More vibrant red
        bg: 'bg-red-50 dark:bg-red-950/40',
        text: 'text-red-700 dark:text-red-200',
        borderColor: 'border-red-200 dark:border-red-900',
        desc: 'High contention. Preemption likely.',
        risk: 'High Risk',
        icon: <Icons.Cancel />,
        glow: ''
      };
    } else if (score < 0.7) {
      return {
        label: 'Constrained',
        id: 'constrained',
        colors: ['#f59e0b', '#d97706'], // Vibrant amber
        bg: 'bg-amber-50 dark:bg-amber-950/40',
        text: 'text-amber-700 dark:text-amber-200',
        borderColor: 'border-amber-200 dark:border-amber-900',
        desc: 'Fluctuating capacity.',
        risk: 'Medium Risk',
        icon: <Icons.Alert />,
        glow: ''
      };
    } else if (score < 0.85) {
       return {
        label: 'Good Availability',
        id: 'good',
        colors: ['#3b82f6', '#2563eb'], // Vibrant blue
        bg: 'bg-blue-50 dark:bg-blue-950/40',
        text: 'text-blue-700 dark:text-blue-200',
        borderColor: 'border-blue-200 dark:border-blue-900',
        desc: 'Stable pool conditions.',
        risk: 'Low Risk',
        icon: <Icons.Check />,
        glow: ''
      };
    }
    return {
      label: 'High Availability',
      id: 'excellent',
      colors: ['#10b981', '#059669'], // Vibrant emerald
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-200',
      borderColor: 'border-emerald-200 dark:border-emerald-900',
      desc: 'Optimal candidate.',
      risk: 'Optimal',
      icon: <Icons.Check />,
      glow: ''
    };
  }, [score]);

  const size = 140;
  const strokeWidth = 12; 
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  
  const counterVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
        opacity: 1, 
        scale: 1,
        transition: { duration: 0.5, delay: 0.6 }
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.001, duration: 0.5 }}
      className={`h-full bg-white dark:bg-slate-900 rounded-2xl border ${tier.borderColor} ${tier.glow} flex flex-col relative overflow-visible transition-all duration-300 hover:scale-[1.02] group`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
        {/* Info Icon / Tooltip Trigger */}
        <div className="absolute top-3 right-3 z-20 text-slate-300 dark:text-slate-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-help">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>

        {/* Tooltip Overlay */}
        {showTooltip && (
            <div className="absolute top-10 right-3 z-50 w-48 bg-slate-900 text-white text-[10px] p-3 rounded-lg shadow-xl border border-slate-700/50 pointer-events-none">
                <div className="font-bold mb-1 text-indigo-300">Score Analysis</div>
                <p className="leading-relaxed text-slate-300">
                    Calculated based on historical spot preemption rates and current capacity pool depth in this region.
                </p>
            </div>
        )}

        <div className="flex-1 flex flex-col items-center justify-center p-5 relative z-10">
            <div className={`mb-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-current ${tier.bg} ${tier.text} flex items-center gap-1.5 shadow-sm`}>
                {tier.icon}
                {tier.risk}
            </div>

            <div className="relative mb-4" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90 relative z-10">
                    <defs>
                        <linearGradient id={`gradient-${tier.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={tier.colors[0]} stopOpacity="1" />
                            <stop offset="100%" stopColor={tier.colors[1]} stopOpacity="1" />
                        </linearGradient>
                    </defs>
                    {/* Track */}
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        className="text-slate-100 dark:text-slate-800"
                    />
                    {/* Progress */}
                    <motion.circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke={`url(#gradient-${tier.id})`}
                        strokeWidth={strokeWidth}
                        strokeDasharray={circumference}
                        strokeLinecap="round"
                        fill="transparent"
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: circumference - (animatedScore * circumference) }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                    />
                </svg>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                    <motion.div 
                        variants={counterVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col items-center justify-center text-center w-full"
                    >
                        <div className="flex items-baseline justify-center relative left-1">
                            <span className="text-5xl font-black text-slate-800 dark:text-slate-100 tabular-nums tracking-tighter drop-shadow-sm">
                                <Counter value={percentage} />
                            </span>
                            <span className="text-sm font-bold text-slate-400 dark:text-slate-500 ml-0.5">%</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="text-center px-2 relative z-10 w-full">
                <h3 className={`text-base font-bold ${tier.text} mb-1.5 transition-colors`}>{tier.label}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[90%] mx-auto font-medium">
                    {description}
                </p>
            </div>
        </div>
    </motion.div>
  );
});

const Counter = ({ value }: { value: number }) => {
    const [count, setCount] = useState(0);
    useEffect(() => {
        const duration = 1500;
        const startTime = performance.now();
        const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(value * ease));
            if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }, [value]);
    return <>{count}</>;
};

export default ScoreGauge;


import React, { useEffect, useState, useMemo } from 'react';
import { motion, Variants } from 'framer-motion';
import { Icons } from '../constants';

interface ScoreGaugeProps {
  score: number;
  label: string;
  description: string;
  delay?: number;
}

const ScoreGauge: React.FC<ScoreGaugeProps> = React.memo(({ score, label, description, delay = 0 }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  
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
        colors: ['#ef4444', '#b91c1c'], 
        bg: 'bg-red-50 dark:bg-red-950/30',
        text: 'text-red-700 dark:text-red-300',
        borderColor: 'border-red-100 dark:border-red-900/50',
        desc: 'High contention. Preemption likely.',
        risk: 'High Risk',
        icon: <Icons.Cancel />
      };
    } else if (score < 0.7) {
      return {
        label: 'Constrained',
        id: 'constrained',
        colors: ['#f59e0b', '#d97706'], 
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        text: 'text-amber-700 dark:text-amber-300',
        borderColor: 'border-amber-100 dark:border-amber-900/50',
        desc: 'Fluctuating capacity.',
        risk: 'Medium Risk',
        icon: <Icons.Alert />
      };
    } else if (score < 0.85) {
       return {
        label: 'Good Availability',
        id: 'good',
        colors: ['#3b82f6', '#2563eb'], 
        bg: 'bg-blue-50 dark:bg-blue-950/30',
        text: 'text-blue-700 dark:text-blue-300',
        borderColor: 'border-blue-100 dark:border-blue-900/50',
        desc: 'Stable pool conditions.',
        risk: 'Low Risk',
        icon: <Icons.Check />
      };
    }
    return {
      label: 'High Availability',
      id: 'excellent',
      colors: ['#10b981', '#059669'],
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      text: 'text-emerald-700 dark:text-emerald-300',
      borderColor: 'border-emerald-100 dark:border-emerald-900/50',
      desc: 'Optimal candidate.',
      risk: 'Optimal',
      icon: <Icons.Check />
    };
  }, [score]);

  const size = 130;
  const strokeWidth = 10; 
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
      className={`h-full bg-white dark:bg-slate-900 rounded-2xl border ${tier.borderColor} shadow-sm flex flex-col relative overflow-hidden transition-all duration-300 hover:shadow-md`}
    >
        <div className="flex-1 flex flex-col items-center justify-center p-4 relative z-10">
            <div className={`mb-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-current ${tier.bg} ${tier.text} flex items-center gap-1.5`}>
                {tier.icon}
                {tier.risk}
            </div>

            <div className="relative mb-3" style={{ width: size, height: size }}>
                <svg width={size} height={size} className="transform -rotate-90">
                    <defs>
                        <linearGradient id={`gradient-${tier.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor={tier.colors[0]} stopOpacity="1" />
                            <stop offset="100%" stopColor={tier.colors[1]} stopOpacity="1" />
                        </linearGradient>
                    </defs>
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="currentColor"
                        strokeWidth={strokeWidth}
                        fill="transparent"
                        className="text-slate-100 dark:text-slate-800"
                    />
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
                
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <motion.div 
                        variants={counterVariants}
                        initial="hidden"
                        animate="visible"
                        className="flex flex-col items-center justify-center text-center w-full"
                    >
                        <div className="flex items-baseline justify-center relative left-1">
                            <span className="text-4xl font-bold text-slate-800 dark:text-slate-100 tabular-nums tracking-tight">
                                <Counter value={percentage} />
                            </span>
                            <span className="text-xs font-medium text-slate-400 dark:text-slate-500 ml-0.5">%</span>
                        </div>
                    </motion.div>
                </div>
            </div>

            <div className="text-center px-2 relative z-10 w-full">
                <h3 className={`text-sm font-bold ${tier.text} mb-1 transition-colors`}>{tier.label}</h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug max-w-full mx-auto px-2">
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

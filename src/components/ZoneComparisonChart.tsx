
import React, { useMemo, useState } from 'react';
import { Recommendation } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ZoneRowProps {
  rec: Recommendation;
  projectId: string;
  isExpanded: boolean;
  onToggle: () => void;
  index: number;
}

const ZoneRow: React.FC<ZoneRowProps> = React.memo(({ rec, projectId, isExpanded, onToggle, index }) => {
  // Handle single shard (Single Zone) vs Multi-shard (Balanced)
  const isMultiZone = rec.shards.length > 1;
  const primaryShard = rec.shards[0];
  
  const zoneLabel = isMultiZone 
    ? `${rec.shards.length} Zones (Mixed)` 
    : (primaryShard.location.split('/').pop() || 'unknown');
  
  const obtainabilityScore = rec.scores.find(s => s.name === 'obtainability')?.value || 0;
  const uptimeScore = rec.scores.find(s => s.name === 'uptime')?.value || 0;

  const obtainabilityPct = Math.round(obtainabilityScore * 100);
  const uptimePct = Math.round(uptimeScore * 100);
  
  const totalCount = rec.shards.reduce((acc, s) => acc + s.count, 0);

  // Consistent Color Logic
  let riskLabel = 'Optimal';
  let riskColor = 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
  let barColor = 'bg-emerald-500 dark:bg-emerald-400';

  if (obtainabilityScore < 0.4) {
    riskLabel = 'Critical';
    riskColor = 'text-red-700 bg-red-50 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800';
    barColor = 'bg-red-500 dark:bg-red-400';
  } else if (obtainabilityScore < 0.7) {
    riskLabel = 'Constrained';
    riskColor = 'text-amber-700 bg-amber-50 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
    barColor = 'bg-amber-500 dark:bg-amber-400';
  } else if (obtainabilityScore < 0.85) {
    riskLabel = 'Good';
    riskColor = 'text-blue-700 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    barColor = 'bg-blue-500 dark:bg-blue-400';
  }

  // Use lazy state to generate the random suffix ONCE on mount
  const [randomId] = useState(() => Date.now().toString().slice(-4));

  const gcloudCommand = useMemo(() => {
    return isMultiZone
      ? `# Multi-zone allocation recommended\n# Manually create instances in:${rec.shards.map(s => `\n# - ${s.location.split('/').pop()}: ${s.count} VMs`).join('')}`
      : `gcloud compute instances create spot-${randomId} \\
  --project=${projectId} \\
  --zone=${zoneLabel} \\
  --machine-type=${primaryShard.machineType} \\
  --provisioning-model=SPOT \\
  --count=${totalCount}`;
  }, [isMultiZone, rec.shards, randomId, projectId, zoneLabel, primaryShard.machineType, totalCount]);

  const rowVariants = {
      hidden: { opacity: 0, y: 10 },
      visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
        variants={rowVariants}
        className="group border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
    >
      <div 
        onClick={onToggle}
        className={`flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center py-4 px-4 md:px-6 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}
      >
        {/* Mobile Top Row: Zone + Badge + Count */}
        <div className="w-full flex md:contents justify-between items-center mb-3 md:mb-0">
            {/* Zone / Option */}
            <div className="col-span-3 flex items-center gap-3">
            <motion.div 
                animate={{ rotate: isExpanded ? 90 : 0 }}
                className={`w-5 h-5 rounded flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 ${isExpanded ? 'text-indigo-500 dark:text-indigo-400' : ''}`}
            >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </motion.div>
            <div>
                <div className="flex items-center gap-2">
                    <div className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {isMultiZone ? `Option ${index + 1}` : zoneLabel}
                    </div>
                    {index === 0 && (
                        <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wide bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            Recommended
                        </span>
                    )}
                </div>
                <div className="text-[9px] text-slate-400 dark:text-slate-500">
                    {isMultiZone ? 'Balanced Distribution' : primaryShard.machineType}
                </div>
            </div>
            </div>

            {/* Mobile Only: Count & Badge (Right Aligned) */}
            <div className="flex md:hidden items-center gap-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm ${riskColor}`}>
                    {riskLabel}
                </span>
                <div className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 py-1 px-2 rounded">
                    {totalCount}
                </div>
            </div>
        </div>

        {/* Desktop: Risk Badge */}
        <div className="hidden md:block col-span-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shadow-sm ${riskColor}`}>
            {riskLabel}
          </span>
        </div>

        {/* Progress Scores - Full width on mobile, col-span-5 on desktop */}
        <div className="w-full md:col-span-5 md:pr-2 mt-2 md:mt-0">
            <div className="grid grid-cols-2 gap-4 md:gap-6">
                {/* Obtainability */}
                <div>
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Obtainability</span>
                        <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-white">{obtainabilityPct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-full">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${obtainabilityPct}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                            className={`h-full ${barColor} rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_8px_rgba(255,255,255,0.2)]`} 
                        ></motion.div>
                    </div>
                </div>

                {/* Uptime */}
                <div>
                    <div className="flex justify-between items-end mb-1">
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">Est. Uptime</span>
                        <span className="text-[10px] font-mono font-bold text-slate-900 dark:text-white">{uptimePct}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-full">
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${uptimePct}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                            className="h-full bg-indigo-400 dark:bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.2)]" 
                        ></motion.div>
                    </div>
                </div>
            </div>
        </div>

        {/* Desktop: Count */}
        <div className="hidden md:block col-span-2 text-right">
             <div className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 py-1 px-2 rounded inline-block">
                {totalCount} VMs
             </div>
        </div>
      </div>

      {/* Expanded */}
      <AnimatePresence>
      {isExpanded && (
        <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
        >
        <div className="px-6 pb-6 pt-0 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
           
           {/* If Multi-zone, list the breakdown */}
           {isMultiZone && (
               <div className="mb-4 mt-2">
                   <h5 className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-2">Shard Breakdown</h5>
                   <div className="grid grid-cols-2 gap-2">
                       {rec.shards.map((s, idx) => (
                           <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2 rounded">
                               <span className="text-[10px] font-mono text-slate-600 dark:text-slate-300">{s.location.split('/').pop()}</span>
                               <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400">{s.count} VMs</span>
                           </div>
                       ))}
                   </div>
               </div>
           )}

           <div className="p-4 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm mt-2">
                 <div className="flex justify-between items-center mb-2">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Provisioning Command</h4>
                    <button className="text-[9px] text-indigo-500 dark:text-indigo-400 font-bold hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(gcloudCommand); }}>COPY</button>
                 </div>
                 <div className="bg-slate-900 rounded-md p-3 border border-slate-800 shadow-inner group-hover:border-slate-700 transition-colors">
                    <pre className="text-[10px] text-indigo-200 font-mono whitespace-pre-wrap leading-relaxed select-all">{gcloudCommand}</pre>
                 </div>
           </div>
        </div>
        </motion.div>
      )}
      </AnimatePresence>
    </motion.div>
  );
});

interface ZoneComparisonChartProps {
  recommendations: Recommendation[];
  projectId: string;
}

const ZoneComparisonChart: React.FC<ZoneComparisonChartProps> = React.memo(({ recommendations, projectId }) => {
  // State for expanded row
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const data = useMemo(() => [...recommendations], [recommendations]);

  const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
          opacity: 1,
          transition: {
              staggerChildren: 0.05
          }
      }
  };

  return (
    <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/30 backdrop-blur-sm">
         <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded text-indigo-600 dark:text-indigo-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <h3 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-tight">Placement Options</h3>
         </div>
         <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-full shadow-sm ring-1 ring-slate-900/5">
            {recommendations.length} Options
         </span>
      </div>
      
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-2 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
         <div className="col-span-3">Details</div>
         <div className="col-span-2">Status</div>
         <div className="col-span-5 grid grid-cols-2 gap-6">
            <div>Obtainability</div>
            <div>Uptime Est.</div>
         </div>
         <div className="col-span-2 text-right">Capacity</div>
      </div>

      <motion.div 
        className="flex-grow overflow-y-auto custom-scrollbar"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {data.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500 text-xs italic">No data available.</div>
        ) : (
            data.map((rec, idx) => {
            return (
                <ZoneRow 
                    key={idx}
                    index={idx}
                    rec={rec}
                    projectId={projectId}
                    isExpanded={expandedIndex === idx}
                    onToggle={() => setExpandedIndex(expandedIndex === idx ? null : idx)}
                />
            );
            })
        )}
      </motion.div>
    </motion.div>
  );
});

export default ZoneComparisonChart;

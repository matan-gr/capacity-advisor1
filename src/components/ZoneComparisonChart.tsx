
import React, { useMemo, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Recommendation } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ZoneRowProps {
  rec: Recommendation;
  projectId: string;
  isExpanded: boolean;
  onToggle: (index: number) => void;
  index: number;
  onShowTooltip: (e: React.MouseEvent, text: string) => void;
  onHideTooltip: () => void;
}

const ZoneRow: React.FC<ZoneRowProps> = React.memo(({ rec, projectId, isExpanded, onToggle, index, onShowTooltip, onHideTooltip }) => {
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
  let riskIcon = (
    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  );

  if (obtainabilityScore < 0.4) {
    riskLabel = 'Critical';
    riskColor = 'text-red-700 bg-red-50 dark:bg-red-900/40 dark:text-red-300 border border-red-200 dark:border-red-800';
    barColor = 'bg-red-500 dark:bg-red-400';
    riskIcon = (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
    );
  } else if (obtainabilityScore < 0.7) {
    riskLabel = 'Constrained';
    riskColor = 'text-amber-700 bg-amber-50 dark:bg-amber-900/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
    barColor = 'bg-amber-500 dark:bg-amber-400';
    riskIcon = (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
    );
  } else if (obtainabilityScore < 0.85) {
    riskLabel = 'Good';
    riskColor = 'text-blue-700 bg-blue-50 dark:bg-blue-900/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
    barColor = 'bg-blue-500 dark:bg-blue-400';
    riskIcon = (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
    );
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
        className="group border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all duration-200"
    >
      <div 
        onClick={() => onToggle(index)}
        className={`flex flex-col md:grid md:grid-cols-12 gap-4 items-start md:items-center py-4 px-4 md:px-6 cursor-pointer transition-colors ${isExpanded ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}
      >
        {/* Mobile Top Row: Zone + Badge + Count */}
        <div className="w-full flex md:contents justify-between items-center mb-3 md:mb-0">
            {/* Zone / Option */}
            <div className="col-span-4 flex items-center gap-3">
            <motion.div 
                animate={{ rotate: isExpanded ? 90 : 0 }}
                className={`w-6 h-6 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 shadow-sm transition-colors ${isExpanded ? 'text-indigo-500 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800' : 'group-hover:border-indigo-200 dark:group-hover:border-indigo-800 group-hover:text-indigo-400'}`}
            >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
            </motion.div>
            <div>
                <div className="flex items-center gap-2">
                    <div className="font-mono text-sm font-bold text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {isMultiZone ? `Option ${index + 1}` : zoneLabel}
                    </div>
                    {index === 0 && (
                        <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-sm">
                            Recommended
                        </span>
                    )}
                </div>
                <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
                    {isMultiZone ? (
                        <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            <span>Balanced Distribution</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" /></svg>
                            <span>{primaryShard.machineType}</span>
                        </>
                    )}
                </div>
            </div>
            </div>

            {/* Mobile Only: Count & Badge (Right Aligned) */}
            <div className="flex md:hidden items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider shadow-sm ${riskColor}`}>
                    {riskIcon}
                    {riskLabel}
                </span>
                <div className="font-mono text-xs font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-transparent dark:border-slate-700 py-1 px-2 rounded">
                    {totalCount}
                </div>
            </div>
        </div>

        {/* Desktop: Risk Badge */}
        <div className="hidden md:block col-span-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm border ${riskColor}`}>
            {riskIcon}
            {riskLabel}
          </span>
        </div>

        {/* Progress Scores - Full width on mobile, col-span-5 on desktop */}
        <div className="w-full md:col-span-4 md:pr-4 mt-2 md:mt-0">
            <div className="grid grid-cols-2 gap-4 md:gap-8">
                {/* Obtainability */}
                <div className="relative group/score">
                    <div className="flex justify-between items-end mb-1.5">
                        <span 
                            className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-help"
                            onMouseEnter={(e) => onShowTooltip(e, "Likelihood of spot fulfillment")}
                            onMouseLeave={onHideTooltip}
                        >
                            Obtainability
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{obtainabilityPct}%</span>
                    </div>
                    <div 
                        className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-full ring-1 ring-slate-200 dark:ring-slate-700/50 cursor-help"
                        onMouseEnter={(e) => onShowTooltip(e, "Likelihood of spot fulfillment")}
                        onMouseLeave={onHideTooltip}
                    >
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${obtainabilityPct}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                            className={`h-full ${barColor} rounded-full shadow-[0_0_10px_rgba(0,0,0,0.1)] dark:shadow-[0_0_8px_rgba(255,255,255,0.2)] relative`} 
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-50"></div>
                        </motion.div>
                    </div>
                </div>

                {/* Uptime */}
                <div className="relative group/score">
                    <div className="flex justify-between items-end mb-1.5">
                        <span 
                            className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide cursor-help"
                            onMouseEnter={(e) => onShowTooltip(e, "Predicted stability score")}
                            onMouseLeave={onHideTooltip}
                        >
                            Est. Uptime
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">{uptimePct}%</span>
                    </div>
                    <div 
                        className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden w-full ring-1 ring-slate-200 dark:ring-slate-700/50 cursor-help"
                        onMouseEnter={(e) => onShowTooltip(e, "Predicted stability score")}
                        onMouseLeave={onHideTooltip}
                    >
                        <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${uptimePct}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                            className="h-full bg-indigo-500 dark:bg-indigo-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.2)] relative" 
                        >
                             <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 opacity-50"></div>
                        </motion.div>
                    </div>
                </div>
            </div>
        </div>

        {/* Desktop: Count */}
        <div className="hidden md:block col-span-2 text-right">
             <div className="font-mono text-sm font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-1.5 px-3 rounded-lg inline-block shadow-sm">
                {totalCount} <span className="text-slate-400 text-xs font-normal ml-0.5">VMs</span>
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
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
        >
        <div className="px-6 pb-6 pt-2 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800">
           
           {/* If Multi-zone, list the breakdown */}
           {isMultiZone && (
               <div className="mb-4 mt-2">
                   <h5 className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest mb-3 flex items-center gap-2">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        Shard Breakdown
                   </h5>
                   <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                       {rec.shards.map((s, idx) => (
                           <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg shadow-sm">
                               <div className="flex flex-col">
                                   <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Zone</span>
                                   <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200">{s.location.split('/').pop()}</span>
                               </div>
                               <div className="flex flex-col items-end">
                                   <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Count</span>
                                   <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{s.count}</span>
                               </div>
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
  const [tooltip, setTooltip] = useState<{ show: boolean; x: number; y: number; text: string }>({ show: false, x: 0, y: 0, text: '' });
  
  const data = useMemo(() => [...recommendations], [recommendations]);

  const handleToggle = useCallback((index: number) => {
      setExpandedIndex(prev => prev === index ? null : index);
  }, []);

  const handleShowTooltip = useCallback((e: React.MouseEvent, text: string) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setTooltip({
          show: true,
          x: rect.left + (rect.width / 2),
          y: rect.top - 10,
          text
      });
  }, []);

  const handleHideTooltip = useCallback(() => {
      setTooltip(prev => ({ ...prev, show: false }));
  }, []);

  const containerVariants = {
      hidden: { opacity: 0 },
      visible: {
          opacity: 1,
          scale: 1,
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
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col h-full relative"
    >
      <div className="px-6 py-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50 dark:bg-slate-950 rounded-t-2xl">
         <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <div>
                <h3 className="text-base font-black uppercase text-slate-900 dark:text-white tracking-tight">Placement Options</h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    Optimized for <span className="text-indigo-600 dark:text-indigo-400 font-bold">Spot Availability</span>
                </p>
            </div>
         </div>
         <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full shadow-sm ring-1 ring-slate-900/5 self-start sm:self-center">
            {recommendations.length} Options Found
         </span>
      </div>
      
      <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-50/80 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
         <div className="col-span-4">Zone / Configuration</div>
         <div className="col-span-2">Risk Assessment</div>
         <div className="col-span-4 grid grid-cols-2 gap-8">
            <div>Obtainability Score</div>
            <div>Uptime Reliability</div>
         </div>
         <div className="col-span-2 text-right">Total Capacity</div>
      </div>

      <motion.div 
        className="flex-grow overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-950/10 rounded-b-2xl"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {data.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 dark:text-slate-500">
                <svg className="w-12 h-12 mb-3 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-xs italic">No placement options available.</p>
            </div>
        ) : (
            data.map((rec, idx) => {
            return (
                <ZoneRow 
                    key={idx}
                    index={idx}
                    rec={rec}
                    projectId={projectId}
                    isExpanded={expandedIndex === idx}
                    onToggle={handleToggle}
                    onShowTooltip={handleShowTooltip}
                    onHideTooltip={handleHideTooltip}
                />
            );
            })
        )}
      </motion.div>

      {/* Fixed Tooltip via Portal */}
      {tooltip.show && createPortal(
          <div 
            className="fixed z-[9999] pointer-events-none -translate-x-1/2 -translate-y-full transition-opacity duration-200"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
              <div className="bg-slate-900/95 backdrop-blur-sm text-white text-[10px] font-medium px-3 py-2 rounded-lg shadow-xl border border-white/10 whitespace-nowrap">
                {tooltip.text}
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-slate-900/95"></div>
              </div>
          </div>,
          document.body
      )}
    </motion.div>
  );
});

export default ZoneComparisonChart;

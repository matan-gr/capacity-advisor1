
import React from 'react';
import { Recommendation } from '../types';
import { motion } from 'framer-motion';

interface ZoneDistributionChartProps {
  recommendations: Recommendation[];
}

const ZoneDistributionChart: React.FC<ZoneDistributionChartProps> = React.memo(({ recommendations }) => {
  const [tooltipState, setTooltipState] = React.useState<{ index: number | null; x: number }>({ index: null, x: 0 });
  const containerRef = React.useRef<HTMLDivElement>(null);
  
  // Data prep for visualization
  let itemsToRender: { label: string; count: number; obtainability: number; uptime: number; isSplit: boolean }[] = [];
  let mode: 'compare' | 'breakdown' = 'compare';
  let chartLabel = '';
  let yAxisLabel = '';

  if (recommendations.length === 1 && recommendations[0].shards.length > 1) {
      mode = 'breakdown';
      const rec = recommendations[0];
      const obtainability = rec.scores.find(s => s.name === 'obtainability')?.value || 0;
      const uptime = rec.scores.find(s => s.name === 'uptime')?.value || 0;
      
      itemsToRender = rec.shards.map(shard => ({
          label: shard.location.split('/').pop()?.replace(/.*-/, '') || '?',
          count: shard.count,
          obtainability, 
          uptime,
          isSplit: true
      }));
      chartLabel = 'Instance Distribution';
      yAxisLabel = 'VMs';
  } 
  else {
      mode = 'compare';
      const sortedRecs = [...recommendations]
        .sort((a, b) => {
            const scoreA = a.scores.find(s => s.name === 'obtainability')?.value || 0;
            const scoreB = b.scores.find(s => s.name === 'obtainability')?.value || 0;
            return scoreB - scoreA;
        })
        .slice(0, 10);

      itemsToRender = sortedRecs.map(rec => {
          const totalCount = rec.shards.reduce((acc, s) => acc + s.count, 0);
          const shard = rec.shards[0];
          const label = rec.shards.length > 1 ? 'Mix' : (shard?.location.split('/').pop()?.replace(/.*-/, '') || '?');
          const obtainability = rec.scores.find(s => s.name === 'obtainability')?.value || 0;
          const uptime = rec.scores.find(s => s.name === 'uptime')?.value || 0;
          
          return { label, count: totalCount, obtainability, uptime, isSplit: rec.shards.length > 1 };
      });
      chartLabel = 'Zone Obtainability';
      yAxisLabel = 'Score';
  }

  const maxValue = mode === 'breakdown' 
    ? Math.max(...itemsToRender.map(i => i.count), 1)
    : 1.0;

  // Calculate summary statistics
  const bestZone = itemsToRender.reduce((prev, current) => (prev.obtainability > current.obtainability) ? prev : current, itemsToRender[0]);
  const viableZones = itemsToRender.filter(i => i.obtainability > 0.4).length;

  return (
    <motion.div 
      ref={containerRef}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
      // REMOVED: overflow-hidden to allow tooltip to pop out
      className="h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col group relative z-0"
    >
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-between items-center shrink-0 rounded-t-2xl">
         <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm transition-transform group-hover:scale-110">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
             </div>
             <div>
                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-tight">Capacity Shape</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{chartLabel}</span>
                    <span className="text-[10px] text-slate-300 dark:text-slate-600">|</span>
                    <span className="text-[10px] text-slate-400">By {yAxisLabel}</span>
                </div>
             </div>
         </div>
         {mode === 'breakdown' && (
             <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded border border-indigo-200 dark:border-indigo-800 font-bold">
                 BALANCED
             </span>
         )}
      </div>

      {/* Chart Container */}
      <div className="flex-grow w-full min-h-[220px] pt-12 px-6 pb-2 relative z-10 overflow-x-auto custom-scrollbar">
         <div className="min-w-[300px] h-full relative">
         
         {/* Background Reference Grid - Aligned to Plot Area (bottom-6 reserved for labels) */}
         {itemsToRender.length > 0 && (
             <div className="absolute inset-x-0 top-0 bottom-6 pointer-events-none opacity-50 z-0">
                 {(() => {
                     // Calculate Ticks
                     let ticks: number[] = [];
                     if (mode === 'compare') {
                         ticks = [1, 0.75, 0.5, 0.25, 0];
                     } else {
                         // Breakdown mode (counts)
                         if (maxValue <= 5) {
                             // For small counts, show every integer
                             for (let i = 0; i <= maxValue; i++) ticks.push(i);
                             ticks.reverse();
                         } else {
                             // For larger counts, calculate 5 nice intervals
                             ticks = [1, 0.75, 0.5, 0.25, 0].map(p => Math.round(p * maxValue));
                             // Deduplicate
                             ticks = Array.from(new Set(ticks)).sort((a, b) => b - a);
                         }
                     }

                     return ticks.map((tickVal) => {
                         const pctPosition = (tickVal / maxValue) * 100;
                         let label = '';
                         if (mode === 'compare') {
                             label = (tickVal * 100).toFixed(0);
                         } else {
                             label = tickVal.toString();
                         }

                         return (
                            <div 
                                key={tickVal} 
                                className={`absolute w-full border-t ${tickVal === 0 ? 'border-slate-200 dark:border-slate-700' : 'border-dashed border-slate-100 dark:border-slate-800/60'}`}
                                style={{ bottom: `${pctPosition}%` }}
                            >
                                <span className="absolute -top-2 -left-8 text-[8px] font-mono text-slate-300 dark:text-slate-600 w-6 text-right">{label}</span>
                            </div>
                         );
                     });
                 })()}
             </div>
         )}

             {/* Columns Container */}
             <div className="absolute inset-0 flex items-end justify-between gap-4 z-10">
                {itemsToRender.length === 0 ? (
                    <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs italic pb-6">No data to display</div>
                ) : (
                    itemsToRender.map((item, i) => {
                        const val = mode === 'breakdown' ? item.count : item.obtainability;
                        const heightPct = Math.max((val / maxValue) * 100, 2); // Min height 2% for visibility
                        
                        // Unified Color Logic matching ScoreGauge
                        let colorClass = 'bg-emerald-400 dark:bg-emerald-500';
                        
                        if (item.obtainability < 0.4) {
                            colorClass = 'bg-red-400 dark:bg-red-500';
                        } else if (item.obtainability < 0.7) {
                            colorClass = 'bg-amber-400 dark:bg-amber-500';
                        } else if (item.obtainability < 0.85) {
                            colorClass = 'bg-blue-400 dark:bg-blue-500';
                        }

                        return (
                            <div 
                                key={i} 
                                className="flex-1 h-full flex flex-col justify-end group/bar relative"
                                onMouseEnter={(e) => {
                                    if (containerRef.current) {
                                        const containerRect = containerRef.current.getBoundingClientRect();
                                        const targetRect = e.currentTarget.getBoundingClientRect();
                                        const relativeX = targetRect.left - containerRect.left + (targetRect.width / 2);
                                        setTooltipState({ index: i, x: relativeX });
                                    }
                                }}
                                onMouseLeave={() => setTooltipState({ index: null, x: 0 })}
                            >
                                {/* Plot Area: Bars & Data Labels */}                                <div className="flex-1 w-full relative flex flex-col justify-end items-center mb-6 border-b border-transparent">
                                    {/* Data Label Floating Above Bar */}
                                    <motion.div 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 + (i * 0.1) }}
                                        className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mb-1 font-mono"
                                    >
                                        {mode === 'breakdown' ? item.count : `${(item.obtainability * 100).toFixed(0)}%`}
                                    </motion.div>

                                    {/* Bar Wrapper */}
                                    <div className="w-full max-w-[50px] bg-transparent rounded-t-sm relative flex items-end overflow-hidden hover:bg-slate-100 dark:hover:bg-slate-800/30 transition-colors ring-1 ring-transparent hover:ring-slate-200 dark:hover:ring-slate-700 h-full max-h-full">
                                        <motion.div 
                                            className={`w-full ${colorClass} relative`} 
                                            initial={{ height: 0 }}
                                            animate={{ height: `${heightPct}%` }}
                                            transition={{ type: "spring", stiffness: 100, damping: 20, delay: i * 0.05 }}
                                            style={{ opacity: 0.9 }}
                                        >
                                            <div className="absolute top-0 left-0 right-0 h-[1px] bg-white/30"></div>
                                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 opacity-0 group-hover/bar:opacity-100 transition-opacity"></div>
                                        </motion.div>
                                    </div>
                                </div>
                                
                                {/* Label Area (Fixed Height at Bottom) */}
                                <div className="absolute bottom-0 left-0 right-0 h-6 flex items-center justify-center">
                                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase truncate group-hover/bar:text-indigo-500 dark:group-hover/bar:text-indigo-400 transition-colors font-mono">
                                        {item.label}
                                    </span>
                                </div>
                            </div>
                        )
                    })
                )}
             </div>
         </div>
      </div>

      {/* Tooltip Overlay - Rendered outside scroll container but relative to card */}
      {tooltipState.index !== null && itemsToRender[tooltipState.index] && (
        <div 
            className="absolute top-16 z-50 pointer-events-none transition-all duration-200 ease-out"
            style={{ left: tooltipState.x, transform: 'translateX(-50%)' }}
        >
            <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-lg shadow-2xl border border-slate-700/50 ring-1 ring-white/10 w-48 backdrop-blur-md"
            >
                {(() => {
                    const item = itemsToRender[tooltipState.index!];
                    let riskText = 'Optimal';
                    let riskBadge = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
                    if (item.obtainability < 0.4) {
                        riskText = 'Critical';
                        riskBadge = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
                    } else if (item.obtainability < 0.7) {
                        riskText = 'Constrained';
                        riskBadge = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
                    } else if (item.obtainability < 0.85) {
                        riskText = 'Good';
                        riskBadge = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
                    }

                    return (
                        <>
                            <div className="font-bold text-xs mb-2 border-b border-slate-700/80 pb-2 flex justify-between items-center">
                                <span>Zone {item.label}</span>
                                <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${riskBadge}`}>{riskText}</span>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px]">Obtainability</span>
                                    <span className={`font-mono font-bold ${item.obtainability > 0.84 ? 'text-emerald-400' : item.obtainability > 0.69 ? 'text-blue-400' : item.obtainability > 0.39 ? 'text-amber-400' : 'text-red-400'}`}>
                                        {(item.obtainability * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px]">Est. Uptime</span>
                                    <span className="font-mono font-bold text-indigo-300">
                                        {(item.uptime * 100).toFixed(0)}%
                                    </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px]">Capacity</span>
                                    <span className="font-mono font-bold text-slate-200">
                                        {item.count} VMs
                                    </span>
                                </div>
                            </div>
                        </>
                    );
                })()}
            </motion.div>
        </div>
      )}

      {/* Footer Summary */}
      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] rounded-b-2xl overflow-hidden">
          <span className="text-slate-500 dark:text-slate-400 truncate mr-2">
             <strong className="text-slate-700 dark:text-slate-200">{viableZones} of {itemsToRender.length}</strong> Zones Viable ({'>'}40%)
          </span>
          {bestZone && (
              <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-100 dark:border-slate-800 shadow-sm shrink-0 max-w-[50%]">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                 <span className="text-slate-400 truncate">Best: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{bestZone.label}</span></span>
              </span>
          )}
      </div>
    </motion.div>
  );
});

export default ZoneDistributionChart;

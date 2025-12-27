
import React from 'react';
import { Recommendation } from '../types';
import { motion } from 'framer-motion';

interface ZoneDistributionChartProps {
  recommendations: Recommendation[];
}

const ZoneDistributionChart: React.FC<ZoneDistributionChartProps> = React.memo(({ recommendations }) => {
  
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
      <div className="flex-grow w-full min-h-[160px] pt-20 px-6 pb-2 relative z-10 overflow-x-auto custom-scrollbar">
         <div className="min-w-[300px] h-full flex items-end justify-between gap-2 relative">
         
         {/* Background Reference Grid */}
         {itemsToRender.length > 0 && (
             <div className="absolute inset-0 pb-6 flex flex-col justify-between pointer-events-none opacity-50 z-0">
                 {[100, 75, 50, 25].map(t => (
                     <div key={t} className="w-full border-t border-dashed border-slate-100 dark:border-slate-800/60 relative h-0">
                        <span className="absolute -top-2 -left-6 text-[8px] font-mono text-slate-300 dark:text-slate-600 w-4 text-right">{t}</span>
                     </div>
                 ))}
                 <div className="w-full border-t border-slate-200 dark:border-slate-700 relative h-0">
                     <span className="absolute -top-2 -left-6 text-[8px] font-mono text-slate-300 dark:text-slate-600 w-4 text-right">0</span>
                 </div>
             </div>
         )}

         {itemsToRender.length === 0 ? (
             <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-600 text-xs italic">No data to display</div>
         ) : (
            itemsToRender.map((item, i) => {
                const val = mode === 'breakdown' ? item.count : item.obtainability;
                const heightPct = Math.max((val / maxValue) * 100, 4); 
                
                // Unified Color Logic matching ScoreGauge
                let colorClass = 'bg-emerald-400 dark:bg-emerald-500';
                let riskText = 'Optimal';
                let riskBadge = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
                
                if (item.obtainability < 0.4) {
                    colorClass = 'bg-red-400 dark:bg-red-500';
                    riskText = 'Critical';
                    riskBadge = 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
                } else if (item.obtainability < 0.7) {
                    colorClass = 'bg-amber-400 dark:bg-amber-500';
                    riskText = 'Constrained';
                    riskBadge = 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
                } else if (item.obtainability < 0.85) {
                    colorClass = 'bg-blue-400 dark:bg-blue-500';
                    riskText = 'Good';
                    riskBadge = 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
                }

                return (
                    <div key={i} className="flex flex-col items-center gap-2 w-full h-full justify-end group/bar relative z-10">
                        {/* Data Label Floating Above Bar */}
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 + (i * 0.1) }}
                            className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mb-0.5 font-mono"
                        >
                            {mode === 'breakdown' ? item.count : `${(item.obtainability * 100).toFixed(0)}%`}
                        </motion.div>

                        {/* Tooltip - Improved Positioning & Width */}
                        <div className="absolute bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-lg shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5)] opacity-0 group-hover/bar:opacity-100 transition-all transform translate-y-2 group-hover/bar:translate-y-0 duration-200 z-[100] pointer-events-none w-48 border border-slate-700/50 ring-1 ring-white/10">
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
                            {/* Tooltip Arrow */}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800"></div>
                        </div>
                        
                        {/* Bar Wrapper */}
                        <div className="w-full max-w-[40px] bg-slate-100 dark:bg-slate-800/30 rounded-t-lg relative h-full flex items-end overflow-hidden hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors ring-1 ring-transparent hover:ring-slate-300 dark:hover:ring-slate-600">
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
                        
                        {/* Label */}
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0 group-hover/bar:text-indigo-500 dark:group-hover/bar:text-indigo-400 transition-colors font-mono">{item.label}</span>
                    </div>
                )
            })
         )}
         </div>
      </div>

      {/* Footer Summary */}
      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px] rounded-b-2xl">
          <span className="text-slate-500 dark:text-slate-400">
             <strong className="text-slate-700 dark:text-slate-200">{viableZones} of {itemsToRender.length}</strong> Zones Viable ({'>'}40%)
          </span>
          {bestZone && (
              <span className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-2 py-1 rounded border border-slate-100 dark:border-slate-800 shadow-sm">
                 <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                 <span className="text-slate-400">Best: <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{bestZone.label}</span></span>
              </span>
          )}
      </div>
    </motion.div>
  );
});

export default ZoneDistributionChart;

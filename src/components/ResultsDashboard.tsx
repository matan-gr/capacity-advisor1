
import React from 'react';
import { AppState } from '../types';
import { Icons } from '../constants';
import ScoreGauge from './ScoreGauge';
import ZoneDistributionChart from './ZoneDistributionChart';
import ZoneComparisonChart from './ZoneComparisonChart';
import GeminiCard from './GeminiCard';
import { SkeletonCard } from './SkeletonCard';

interface ResultsDashboardProps {
  state: AppState;
  onExport: (type: 'csv' | 'html' | 'pdf') => void;
  onClear: () => void;
}

const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ state, onExport, onClear }) => {
  
  // Error State - Simplified
  if (state.error) {
    return (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-2xl p-6 animate-enter">
            <div className="flex items-start gap-4">
                <div className="p-3 bg-white dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400 shrink-0 shadow-sm border border-red-100 dark:border-red-800">
                    <Icons.Cancel />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-red-900 dark:text-red-200">Analysis Failed</h3>
                    <p className="text-xs text-red-700 dark:text-red-300 mt-1 leading-relaxed max-w-2xl">{state.error}</p>
                </div>
            </div>
        </div>
    );
  }

  // Idle State (No Result, No Loading, No Grounding)
  if (!state.result && !state.loading && !state.groundingLoading && !state.groundingMetadata) return null;

  const topScore = state.result?.recommendations[0]?.scores.find(s => s.name === 'obtainability')?.value || 0;

  return (
    <div className="animate-enter space-y-6">
       {/* Header */}
       <div className="flex items-end justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Capacity Report</h2>
              <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${state.loading ? 'bg-slate-300' : state.mockMode ? 'bg-amber-400' : 'bg-emerald-500'} animate-pulse`}></span>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {state.loading ? 'ANALYZING...' : `${state.mockMode ? 'Simulated' : 'Live GCP'} • ${state.region}`}
                  </span>
              </div>
          </div>
          <div className="flex gap-2">
              <button disabled={!state.result} onClick={() => onExport('pdf')} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center gap-1 disabled:opacity-50 shadow-sm">
                 PDF
              </button>
              <button disabled={!state.result} onClick={() => onExport('csv')} className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50 shadow-sm">CSV</button>
              <button onClick={onClear} className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-bold uppercase text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-1">
                  <Icons.Cancel />
                  Dismiss
              </button>
          </div>
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
           {/* Row 1, Col 1: Gauge */}
           <div className="h-[280px]">
               {state.loading || !state.result ? (
                   <div className="h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex items-center justify-center shadow-sm">
                       <div className="text-center space-y-3">
                           <div className="w-12 h-12 border-2 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin mx-auto"></div>
                           <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Calculating Risk...</p>
                       </div>
                   </div>
               ) : (
                   <ScoreGauge 
                       score={topScore}
                       label="Obtainability Index"
                       description="Probability of successful provisioning."
                   />
               )}
           </div>

           {/* Row 1, Col 2 & 3: Distribution Chart */}
           <div className="xl:col-span-2 h-[280px]">
               {state.loading || !state.result ? (
                   <div className="h-full">
                       <SkeletonCard />
                   </div>
               ) : (
                   <ZoneDistributionChart recommendations={state.result.recommendations} />
               )}
           </div>

           {/* Row 2: Main Data Table - Full Width */}
           <div className="xl:col-span-3 min-h-[350px]">
               {state.loading || !state.result ? (
                   <div className="space-y-4">
                       <SkeletonCard />
                       <SkeletonCard />
                   </div>
               ) : (
                   <ZoneComparisonChart recommendations={state.result.recommendations} projectId={state.project} />
               )}
           </div>
           
           {/* Row 3: AI Insights - Full Width */}
           <div className="xl:col-span-3 min-h-[300px]">
               <GeminiCard data={state.groundingMetadata} loading={state.groundingLoading} />
           </div>
       </div>
    </div>
  );
};

export default ResultsDashboard;

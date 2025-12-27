
import React from 'react';
import { AppState } from '../types';
import { Icons } from '../constants';
import ScoreGauge from './ScoreGauge';
import ZoneDistributionChart from './ZoneDistributionChart';
import ZoneComparisonChart from './ZoneComparisonChart';
import GeminiCard from './GeminiCard';
import { SkeletonCard, DistributionSkeleton, GeminiSkeleton } from './SkeletonCard';

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
       {/* Header & Actions */}
       <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2">
          <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Capacity Report</h2>
              <div className="flex items-center gap-2 mt-1.5">
                  <span className={`w-2 h-2 rounded-full ${state.loading ? 'bg-slate-300' : state.mockMode ? 'bg-amber-400' : 'bg-emerald-500'} animate-pulse`}></span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {state.loading ? 'ANALYZING...' : `${state.mockMode ? 'Simulated' : 'Live GCP'} • ${state.region}`}
                  </span>
              </div>
          </div>
          
          <div className="flex items-center gap-3">
              <div className="flex bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-1 shadow-sm">
                  <button 
                    disabled={!state.result || state.loading || state.groundingLoading} 
                    onClick={() => onExport('pdf')} 
                    className="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title="Export as PDF"
                  >
                     <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                     PDF
                  </button>
                  <div className="w-px bg-slate-200 dark:bg-slate-700 my-1"></div>
                  <button 
                    disabled={!state.result || state.loading || state.groundingLoading} 
                    onClick={() => onExport('csv')} 
                    className="px-3 py-1.5 rounded-md text-[10px] font-bold uppercase text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                    title="Export as CSV"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    CSV
                  </button>
              </div>

              <button 
                onClick={onClear} 
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-[10px] font-bold uppercase text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 dark:hover:border-red-800 transition-all flex items-center gap-2 shadow-sm"
              >
                  <Icons.Cancel />
                  Start Over
              </button>
          </div>
       </div>

       <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
           {/* Row 1, Col 1: Gauge */}
           <div className="h-[350px]">
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
           <div className="xl:col-span-2 h-[350px] mb-8 xl:mb-0">
               {state.loading || !state.result ? (
                   <div className="h-full">
                       <DistributionSkeleton />
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
               {state.loading ? (
                   <GeminiSkeleton />
               ) : (
                   <GeminiCard data={state.groundingMetadata} loading={state.groundingLoading} />
               )}
           </div>
       </div>
    </div>
  );
};

export default ResultsDashboard;

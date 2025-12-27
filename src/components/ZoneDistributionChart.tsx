
import React, { useMemo } from 'react';
import { Recommendation } from '../types';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ReferenceLine,
  Area
} from 'recharts';

interface ZoneDistributionChartProps {
  recommendations: Recommendation[];
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900 dark:bg-slate-800 text-white p-3 rounded-lg shadow-2xl border border-slate-700/50 ring-1 ring-white/10 backdrop-blur-md min-w-[180px]">
        <div className="font-bold text-xs mb-2 border-b border-slate-700/80 pb-2 flex justify-between items-center">
          <span>{label || data.name}</span>
          {data.riskLabel && (
             <span className={`text-[8px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${
                 data.riskLabel === 'Critical' ? 'bg-red-500/20 text-red-300' :
                 data.riskLabel === 'Constrained' ? 'bg-amber-500/20 text-amber-300' :
                 'bg-emerald-500/20 text-emerald-300'
             }`}>
                 {data.riskLabel}
             </span>
          )}
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between gap-4 text-[10px]">
              <span className="text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                {entry.name}
              </span>
              <span className="font-mono font-bold text-slate-200">
                {entry.name === 'Count' ? `${entry.value} VMs` : `${entry.value}%`}
              </span>
            </div>
          ))}
          {/* Extra Data for Pie Chart */}
          {data.percent && (
              <div className="flex justify-between gap-4 text-[10px]">
                <span className="text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-500"></span>
                    Share
                </span>
                <span className="font-mono font-bold text-slate-200">
                    {(data.percent * 100).toFixed(0)}%
                </span>
              </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

const ZoneDistributionChart: React.FC<ZoneDistributionChartProps> = React.memo(({ recommendations }) => {
  
  // --- Data Transformation ---
  const { mode, data, chartLabel, subLabel } = useMemo(() => {
    // Mode Detection
    const isBreakdown = recommendations.length === 1 && recommendations[0].shards.length > 1;
    
    if (isBreakdown) {
        const rec = recommendations[0];
        const totalVMs = rec.shards.reduce((a, b) => a + b.count, 0);
        
        const pieData = rec.shards.map((shard, idx) => ({
            name: shard.location.split('/').pop() || 'Unknown',
            value: shard.count,
            percent: shard.count / totalVMs,
            riskLabel: 'Balanced' // Placeholder
        }));

        return {
            mode: 'breakdown' as const,
            data: pieData,
            chartLabel: 'Workload Distribution',
            subLabel: 'VM Allocation per Zone'
        };
    } else {
        // Comparison Mode
        const compareData = recommendations.slice(0, 10).map((rec, idx) => {
            const obtainability = (rec.scores.find(s => s.name === 'obtainability')?.value || 0) * 100;
            const uptime = (rec.scores.find(s => s.name === 'uptime')?.value || 0) * 100;
            
            let riskLabel = 'Optimal';
            if (obtainability < 40) riskLabel = 'Critical';
            else if (obtainability < 70) riskLabel = 'Constrained';
            else if (obtainability < 85) riskLabel = 'Good';

            return {
                name: `Option ${idx + 1}`,
                Obtainability: Math.round(obtainability),
                Uptime: Math.round(uptime),
                riskLabel
            };
        });

        return {
            mode: 'compare' as const,
            data: compareData,
            chartLabel: 'Option Analysis',
            subLabel: 'Obtainability vs Reliability'
        };
    }
  }, [recommendations]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
      className="h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col relative overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-between items-center shrink-0">
         <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
             </div>
             <div>
                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-tight">{chartLabel}</h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{subLabel}</span>
                </div>
             </div>
         </div>
         {mode === 'breakdown' && (
             <span className="text-[9px] font-mono text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded border border-indigo-200 dark:border-indigo-800 font-bold">
                 BALANCED
             </span>
         )}
      </div>

      {/* Chart Area */}
      <div className="flex-grow w-full min-h-[250px] p-4 relative">
        <ResponsiveContainer width="100%" height="100%">
            {mode === 'compare' ? (
                <ComposedChart data={data} margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                    <defs>
                        <linearGradient id="colorObtainability" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorUptime" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.1} />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }} 
                        dy={10}
                    />
                    <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#94a3b8', fontSize: 10 }} 
                        domain={[0, 100]}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                    <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px', opacity: 0.7 }} />
                    
                    <ReferenceLine y={70} stroke="#f59e0b" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: 'Constraint', position: 'insideTopRight', fill: '#f59e0b', fontSize: 9, opacity: 0.8 }} />
                    
                    {/* Area for Uptime to show trend better */}
                    <Area type="monotone" dataKey="Uptime" stroke="none" fill="url(#colorUptime)" />

                    <Bar dataKey="Obtainability" barSize={24} radius={[6, 6, 0, 0]}>
                        {data.map((entry: any, index: number) => {
                            let color = '#10b981'; // Green
                            if (entry.Obtainability < 40) color = '#ef4444'; // Red
                            else if (entry.Obtainability < 70) color = '#f59e0b'; // Amber
                            else if (entry.Obtainability < 85) color = '#3b82f6'; // Blue
                            return <Cell key={`cell-${index}`} fill={color} fillOpacity={0.9} />;
                        })}
                    </Bar>
                    
                    <Line 
                        type="monotone" 
                        dataKey="Uptime" 
                        stroke="#6366f1" 
                        strokeWidth={2} 
                        dot={{ r: 3, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} 
                        activeDot={{ r: 5, strokeWidth: 0 }} 
                    />
                </ComposedChart>
            ) : (
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                    >
                        {data.map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="rgba(0,0,0,0.1)" />
                        ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                </PieChart>
            )}
        </ResponsiveContainer>
      </div>

      {/* Footer Stats */}
      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center text-[10px]">
         {mode === 'compare' ? (
             <>
                <span className="text-slate-500 dark:text-slate-400">
                    Avg Obtainability: <strong className="text-slate-900 dark:text-white">
                        {Math.round(data.reduce((acc: number, curr: any) => acc + curr.Obtainability, 0) / data.length)}%
                    </strong>
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                    Highest Uptime: <strong className="text-indigo-600 dark:text-indigo-400">
                        {Math.max(...data.map((d: any) => d.Uptime))}%
                    </strong>
                </span>
             </>
         ) : (
             <>
                <span className="text-slate-500 dark:text-slate-400">
                    Total Capacity: <strong className="text-slate-900 dark:text-white">
                        {data.reduce((acc: number, curr: any) => acc + curr.value, 0)} VMs
                    </strong>
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                    Zones Used: <strong className="text-indigo-600 dark:text-indigo-400">{data.length}</strong>
                </span>
             </>
         )}
      </div>
    </motion.div>
  );
});

export default ZoneDistributionChart;

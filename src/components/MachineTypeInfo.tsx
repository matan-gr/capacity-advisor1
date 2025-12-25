
import React from 'react';
import { MachineTypeOption } from '../config';
import { Icons } from '../constants';

interface MachineTypeInfoProps {
  details: MachineTypeOption | undefined;
}

const MachineTypeInfo: React.FC<MachineTypeInfoProps> = ({ details }) => {
  if (!details) return null;

  const isGPU = details.family.includes('GPU') || details.family.includes('Accelerator');

  return (
    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-4 border border-slate-200 dark:border-slate-700 mt-2 space-y-3 transition-colors">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Spec Detail</span>
        {isGPU && (
          <span className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold px-2 py-0.5 rounded-md border border-indigo-200 dark:border-indigo-700/50 uppercase">
            High Performance
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400">
             <Icons.Server />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">vCPUs</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">{details.cores} Cores</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="bg-white dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-400">
             <Icons.Layers />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Memory</p>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">{details.memory}</p>
          </div>
        </div>
      </div>
      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
          <span className="text-slate-400 dark:text-slate-500">Family:</span> {details.family}
        </p>
      </div>
    </div>
  );
};

export default MachineTypeInfo;

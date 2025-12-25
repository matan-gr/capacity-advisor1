
import React, { useState, useEffect } from 'react';
import { GroundingMetadata } from '../types';
import { Icons } from '../constants';
import { motion, AnimatePresence } from 'framer-motion';

interface GeminiCardProps {
  data: GroundingMetadata | null;
  loading: boolean;
}

const LoadingStateDisplay = () => {
  const [stepIndex, setStepIndex] = useState(0);
  
  const steps = [
    { text: "Consulting Knowledge Base...", Icon: Icons.Server },
    { text: "Checking Global Events...", Icon: Icons.Globe },
    { text: "Analyzing Preemption Risks...", Icon: Icons.Layers },
    { text: "Formulating Trusted Advice...", Icon: Icons.Chip }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setStepIndex((prev) => (prev + 1) % steps.length);
    }, 1200);
    return () => clearInterval(timer);
  }, [steps.length]);

  const CurrentIcon = steps[stepIndex].Icon;

  return (
    <div className="h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8 flex flex-col justify-center animate-enter shadow-sm relative overflow-hidden min-h-[300px]">
        <div className="absolute inset-0 opacity-20 dark:opacity-5 pointer-events-none">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/10 via-transparent to-transparent animate-spin-slow"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">
            <div className="relative">
                <div className="w-16 h-16 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm z-10 relative">
                    <motion.div
                        key={stepIndex}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 1.1, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute"
                    >
                        <CurrentIcon size={28} />
                    </motion.div>
                </div>
            </div>
            <div className="space-y-2 w-full max-w-xs mx-auto">
                <h4 className="text-xs font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">
                    AI Analysis
                </h4>
                <div className="h-6 relative overflow-hidden">
                    <AnimatePresence mode="wait">
                        <motion.p
                            key={stepIndex}
                            initial={{ y: 15, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -15, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="text-sm font-semibold text-slate-700 dark:text-slate-200 absolute inset-x-0"
                        >
                            {steps[stepIndex].text}
                        </motion.p>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    </div>
  );
};

const parseInline = (text: string, keyPrefix: string) => {
  // Regex to capture **bold** OR `code`
  // Note: split with capturing group returns the separators as well.
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`} className="font-bold text-slate-900 dark:text-white">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${keyPrefix}-${i}`} className="font-mono text-[11px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 mx-0.5">{part.slice(1, -1)}</code>;
    }
    return <span key={`${keyPrefix}-${i}`}>{part}</span>;
  });
};

const renderTable = (lines: string[], keyPrefix: string) => {
    const headerLine = lines[0];
    const headers = headerLine.split('|').map(c => c.trim()).filter(c => c);
    const dataLines = lines.slice(2).filter(l => l.trim().length > 0);

    return (
        <div key={keyPrefix} className="my-5 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-xs text-left">
                  <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                          {headers.map((h, i) => (
                              <th key={i} className="px-4 py-2.5 font-bold uppercase tracking-wider whitespace-nowrap">
                                  {parseInline(h, `th-${i}`)}
                              </th>
                          ))}
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {dataLines.map((line, rIdx) => {
                          const cells = line.split('|').map(c => c.trim()).filter(c => c !== '');
                          return (
                            <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                                {cells.map((cell, cIdx) => (
                                    <td key={cIdx} className="px-4 py-2.5 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                        {parseInline(cell, `td-${rIdx}-${cIdx}`)}
                                    </td>
                                ))}
                            </tr>
                          );
                      })}
                  </tbody>
              </table>
            </div>
        </div>
    );
};

const GeminiCard: React.FC<GeminiCardProps> = React.memo(({ data, loading }) => {
  if (loading) return <LoadingStateDisplay />;

  if (!data) {
    return (
      <div className="h-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 flex flex-col justify-center items-center text-center opacity-60 min-h-[300px]">
         <div className="text-slate-300 dark:text-slate-600 mb-3"><Icons.Cloud /></div>
         <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Trusted Advisor</p>
         <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1 max-w-[240px]">Insights appear here after analysis.</p>
      </div>
    );
  }

  const renderContent = (text: string) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    
    let tableBuffer: string[] = [];
    let inTable = false;
    let listBuffer: React.ReactNode[] = [];
    let inList = false;

    const flushList = (idx: number) => {
        if (listBuffer.length > 0) {
            elements.push(
                <div key={`list-group-${idx}`} className="mb-4 space-y-2">
                    {listBuffer}
                </div>
            );
            listBuffer = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // --- Table Handling ---
        if (line.startsWith('|')) {
            if (inList) { inList = false; flushList(i); }
            inTable = true;
            tableBuffer.push(line);
            continue;
        }
        if (inTable) {
            inTable = false;
            elements.push(renderTable(tableBuffer, `table-${i}`));
            tableBuffer = [];
        }

        if (!line) {
            if (inList) { inList = false; flushList(i); }
            continue;
        }

        // --- Header Handling ---
        if (line.startsWith('###')) {
            if (inList) { inList = false; flushList(i); }
            const content = line.replace(/#/g, '').trim();
            elements.push(
                <div key={`h3-${i}`} className="flex items-center gap-2 mt-8 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-indigo-500 dark:text-indigo-400"><Icons.Info size={16} /></span>
                    <h3 className="text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-widest leading-none">
                        {content}
                    </h3>
                </div>
            );
            continue;
        }

        // --- Blockquote Handling ---
        if (line.startsWith('>')) {
            if (inList) { inList = false; flushList(i); }
            const content = line.replace(/^>\s?/, '').trim();
            const isWarning = content.toLowerCase().includes('warning') || content.toLowerCase().includes('alert') || content.toLowerCase().includes('caution');
            const isProTip = content.toLowerCase().includes('pro tip') || content.toLowerCase().includes('strategy');
            const isVerdict = content.toLowerCase().includes('verdict');
            
            let bgClass = "bg-slate-100 dark:bg-slate-800 border-l-4 border-slate-300 dark:border-slate-600";
            let textClass = "text-slate-600 dark:text-slate-300";
            
            if (isWarning) {
                bgClass = "bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500";
                textClass = "text-amber-800 dark:text-amber-200";
            } else if (isProTip) {
                bgClass = "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500";
                textClass = "text-blue-800 dark:text-blue-200";
            } else if (isVerdict) {
                bgClass = "bg-indigo-50 dark:bg-indigo-900/20 border-l-4 border-indigo-500 shadow-sm";
                textClass = "text-indigo-900 dark:text-indigo-100 font-medium";
            }

            elements.push(
                <div key={`bq-${i}`} className={`${bgClass} px-5 py-4 rounded-r-lg mb-6 text-sm leading-relaxed ${textClass} shadow-sm`}>
                    {parseInline(content, `bq-${i}`)}
                </div>
            );
            continue;
        }

        // --- List Handling ---
        if (line.startsWith('* ') || line.startsWith('- ')) {
            inList = true;
            const content = line.substring(1).trim();
            listBuffer.push(
                <div key={`li-${i}`} className="flex items-start gap-3 pl-2">
                   <div className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 dark:bg-indigo-500 shrink-0"></div>
                   <span className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {parseInline(content, `li-${i}`)}
                   </span>
                </div>
            );
            continue;
        }
        
        // --- Checklist Handling ---
        if (line.startsWith('[ ]') || line.startsWith('[x]')) {
             if (inList) { inList = false; flushList(i); }
             const isChecked = line.startsWith('[x]');
             const content = line.substring(3).trim();
             elements.push(
                 <div key={`chk-${i}`} className="flex items-start gap-3 mb-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 transition-all hover:border-slate-200 dark:hover:border-slate-700">
                     <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isChecked ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600'}`}>
                         {isChecked && <Icons.Check size={12} />}
                     </div>
                     <span className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-snug">
                        {parseInline(content, `chk-${i}`)}
                     </span>
                 </div>
             );
             continue;
        }

        // --- Paragraph Handling ---
        if (inList) { inList = false; flushList(i); }
        elements.push(
            <p key={`p-${i}`} className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                {parseInline(line, `p-${i}`)}
            </p>
        );
    }
    
    if (inList) flushList(lines.length);
    if (inTable) elements.push(renderTable(tableBuffer, `table-end`));
    
    return elements;
  };

  return (
    <div className="h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden animate-enter ring-1 ring-slate-900/5 dark:ring-white/5">
       <div className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-900 px-6 py-4 flex justify-between items-center border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400"><Icons.Server size={14} /></div>
             <div>
                <h4 className="text-xs font-black uppercase tracking-widest leading-none text-slate-800 dark:text-slate-100">Trusted Advisor</h4>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Capacity & Operations Intelligence</div>
             </div>
          </div>
       </div>
       
       <div className="p-6 flex-grow overflow-y-auto custom-scrollbar bg-white dark:bg-slate-900">
          <div className="max-w-4xl mx-auto">
            {renderContent(data.insight)}
          </div>
       </div>

       {data.sources.length > 0 && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex gap-2 items-center overflow-x-auto custom-scrollbar shrink-0">
             <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0 tracking-wider">References</span>
             {data.sources.map((s, i) => (
                <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 px-2.5 py-1 bg-white dark:bg-slate-800 rounded-full text-[9px] text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all border border-slate-200 dark:border-slate-700 whitespace-nowrap">
                   <span className="truncate max-w-[120px] font-medium">{s.title}</span>
                </a>
             ))}
          </div>
       )}
    </div>
  );
});

export default GeminiCard;


import React from 'react';
import { Icons } from '../constants';
import { AppState } from '../types';
import { motion } from 'framer-motion';

interface HeaderProps {
  mockMode: boolean;
  darkMode: boolean;
  onUpdate: (updates: Partial<AppState>) => void;
}

const Header: React.FC<HeaderProps> = ({ mockMode, darkMode, onUpdate }) => {
  return (
    <nav className="sticky top-0 z-40 bg-white/80 dark:bg-[#020617]/80 border-b border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-xl transition-all duration-300">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3.5 select-none">
          <motion.div 
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: "spring", duration: 1.5 }}
            className="relative w-9 h-9 flex items-center justify-center"
          >
             {/* Tech Hexagon Logo */}
             <div className="absolute inset-0 bg-indigo-600 rounded-lg rotate-45 opacity-20 animate-pulse"></div>
             <div className="absolute inset-0 border-2 border-indigo-600 dark:border-indigo-400 rounded-lg rotate-45"></div>
             <div className="relative z-10 text-indigo-600 dark:text-indigo-400">
                <Icons.Layers size={18} strokeWidth={2.5} />
             </div>
          </motion.div>
          
          <div className="flex flex-col justify-center">
             <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none font-sans">
               SPOT<span className="text-indigo-600 dark:text-indigo-400">ADVISOR</span>
             </h1>
             <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1 h-1 rounded-full bg-indigo-500"></span>
                <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-indigo-500 dark:text-indigo-400">Insights</span>
             </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center gap-4">
           {/* Environment Toggles */}
           <div className="hidden md:flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
              <button 
                onClick={() => onUpdate({ mockMode: true })}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${mockMode ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Simulation
              </button>
              <button 
                onClick={() => onUpdate({ mockMode: false })}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-200 ${!mockMode ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-300 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
              >
                Live API
              </button>
           </div>
           
           <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 hidden sm:block"></div>
           
           {/* Theme Toggle */}
           <motion.button 
              whileTap={{ scale: 0.9, rotate: 15 }}
              onClick={() => onUpdate({ darkMode: !darkMode })}
              className="p-2.5 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-300 transition-colors rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
           >
              {darkMode ? <Icons.Sun size={18} /> : <Icons.Moon size={18} />}
           </motion.button>
        </div>
      </div>
    </nav>
  );
};

export default Header;

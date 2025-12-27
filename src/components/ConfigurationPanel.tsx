
import React, { useState, useRef, useEffect } from 'react';
import { Icons } from '../constants';
import { MACHINE_FAMILIES, MachineTypeOption } from '../config';
import { AppState, TargetShape } from '../types';
import Autocomplete from './Autocomplete';
import RegionAutocomplete, { RegionOption } from './RegionAutocomplete';
import MachineTypeInfo from './MachineTypeInfo';
import { motion, AnimatePresence } from 'framer-motion';

interface ConfigurationPanelProps {
  state: AppState;
  updateState: (updates: Partial<AppState>) => void;
  filteredMachineTypes: MachineTypeOption[];
  regionOptions: RegionOption[];
  machineDetails: MachineTypeOption | undefined;
  toggleFamily: (family: string) => void;
  isFetchingRegions: boolean;
  isFetchingMachineTypes: boolean;
  onSearch: () => void;
  regionConfig: Record<string, string[]>;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = React.memo(({
  state,
  updateState,
  filteredMachineTypes,
  regionOptions,
  machineDetails,
  toggleFamily,
  isFetchingRegions,
  isFetchingMachineTypes,
  onSearch,
  regionConfig
}) => {
  const [isShapeOpen, setIsShapeOpen] = useState(false);
  const [dismissedProjectError, setDismissedProjectError] = useState(false);
  const shapeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shapeDropdownRef.current && !shapeDropdownRef.current.contains(event.target as Node)) {
        setIsShapeOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset dismissed error when project changes
  useEffect(() => {
    setDismissedProjectError(false);
  }, [state.project]);

  const projectRegex = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
  const isValidProject = !state.project || projectRegex.test(state.project);
  // Show validation if project is not empty OR if there's a validation error
  const showValidation = (state.project.length > 0) || !!state.validationErrors?.project;
  
  // Region Validation
  const selectedRegionZones = state.region ? regionConfig[state.region] : [];
  const hasZones = !state.mockMode && !!state.region && selectedRegionZones && selectedRegionZones.length > 0;
  const showRegionError = !state.mockMode && !!state.region && !isFetchingRegions && (!selectedRegionZones || selectedRegionZones.length === 0);

  const isSearchDisabled = state.loading || (!isValidProject && state.project.length > 0) || showRegionError;

  const shapeOptions = [
    { 
      value: TargetShape.ANY_SINGLE_ZONE, 
      label: 'Single Zone', 
      desc: 'Lowest latency', 
      icon: <Icons.Server /> 
    },
    { 
      value: TargetShape.BALANCED, 
      label: 'Balanced', 
      desc: 'High availability', 
      icon: <Icons.Layers /> 
    },
    { 
      value: TargetShape.ANY, 
      label: 'Any', 
      desc: 'Max obtainability', 
      icon: <Icons.Cloud /> 
    },
  ];

  const selectedShape = shapeOptions.find(o => o.value === state.targetShape) || shapeOptions[0];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
       
       {/* Main Config Card */}
       <motion.div 
         initial={{ opacity: 0, y: 10 }}
         animate={{ opacity: 1, y: 0 }}
         transition={{ duration: 0.4 }}
         className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 relative"
       >
           <div className="relative z-10">
               <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 tracking-widest flex items-center gap-2">
                     <Icons.Layers size={14} /> Workload Configuration
                  </h2>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {/* Left Column: Machine Type */}
                   <div className="space-y-4">
                       <div className="group relative">
                          <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                              Project ID <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input 
                                type="text" 
                                value={state.project}
                                onChange={(e) => updateState({ project: e.target.value })}
                                className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl px-4 py-3 text-sm font-semibold outline-none transition-all shadow-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600
                                    ${showValidation 
                                        ? isValidProject 
                                            ? 'border-emerald-500/50 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500' 
                                            : 'border-red-500 focus:border-red-500 bg-red-50/10'
                                        : state.validationErrors?.project
                                            ? 'border-red-500 focus:border-red-500 ring-1 ring-red-500 bg-red-50/10'
                                            : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 hover:border-slate-300 dark:hover:border-slate-700'
                                    }
                                `}
                                placeholder="gcp-project-id"
                            />
                            {showValidation && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                    {isValidProject ? (
                                        <span className="text-emerald-500 animate-enter"><Icons.Check /></span>
                                    ) : (
                                        <span className="text-red-500 animate-enter"><Icons.Cancel /></span>
                                    )}
                                </div>
                            )}
                          </div>
                          {/* Project ID Error Message */}
                          <AnimatePresence>
                            {showValidation && !isValidProject && !dismissedProjectError && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-2 flex items-start gap-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/50 rounded-lg p-2"
                                >
                                    <div className="text-red-500 shrink-0 mt-0.5"><Icons.Info size={12} /></div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-red-600 dark:text-red-300 font-medium leading-tight">
                                            Invalid Project ID format.
                                        </p>
                                        <p className="text-[9px] text-red-500 dark:text-red-400 mt-0.5 leading-tight">
                                            Must be 6-30 chars, lowercase, digits, or hyphens.
                                        </p>
                                    </div>
                                    <button 
                                        onClick={() => setDismissedProjectError(true)}
                                        className="text-red-400 hover:text-red-600 dark:hover:text-red-200 transition-colors"
                                    >
                                        <Icons.Cancel size={12} />
                                    </button>
                                </motion.div>
                            )}
                          </AnimatePresence>
                       </div>
                       
                       <div className="mb-2">
                           <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Family Filter</label>
                           <div className="flex flex-wrap gap-1.5">
                               {MACHINE_FAMILIES.map(family => {
                                   const isSelected = state.selectedFamilies.includes(family);
                                   return (
                                       <motion.button
                                           key={family}
                                           whileTap={{ scale: 0.95 }}
                                           onClick={() => toggleFamily(family)}
                                           className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide border transition-all ${
                                               isSelected 
                                               ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                               : 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-slate-600'
                                           }`}
                                       >
                                           {family}
                                       </motion.button>
                                   );
                               })}
                           </div>
                       </div>

                       <div className="relative z-50">
                          {isFetchingMachineTypes && (
                              <div className="absolute right-0 top-0 text-[9px] text-indigo-500 animate-pulse font-bold flex items-center gap-1">
                                  Loading...
                              </div>
                          )}
                          <Autocomplete 
                             label="Machine Type"
                             options={filteredMachineTypes}
                             value={state.selectedMachineType}
                             onChange={(id) => updateState({ selectedMachineType: id })}
                             placeholder="Search instance type..."
                             error={state.validationErrors?.machineType}
                          />
                       </div>
                       <MachineTypeInfo details={machineDetails} />
                   </div>
                   
                   {/* Right Column: Region & Shape */}
                   <div className="space-y-4">
                       <div className="group relative z-40">
                           <RegionAutocomplete 
                                label="Target Region"
                                options={regionOptions}
                                value={state.region}
                                onChange={(id) => updateState({ region: id })}
                                placeholder="Search region..."
                                isLoading={isFetchingRegions}
                                error={state.validationErrors?.region}
                           />
                           {/* Region Error Message */}
                           <AnimatePresence>
                               {showRegionError && (
                                   <motion.div
                                       initial={{ opacity: 0, y: -5 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       exit={{ opacity: 0, y: -5 }}
                                       className="absolute top-full left-0 right-0 mt-2 z-50 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3 shadow-lg"
                                   >
                                       <div className="flex items-start gap-2">
                                           <div className="text-amber-500 shrink-0 mt-0.5"><Icons.Info size={14} /></div>
                                           <div>
                                               <p className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wide">No Zones Found</p>
                                               <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 leading-relaxed">
                                                   The selected region <strong>{state.region}</strong> does not appear to have any active zones available for your project. Please select a different region.
                                               </p>
                                           </div>
                                       </div>
                                   </motion.div>
                               )}
                           </AnimatePresence>
                       </div>
                       
                       <div className="flex gap-4">
                          <div className="w-1/2 group relative z-10">
                              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Count</label>
                              <div className="relative">
                                  <input 
                                    type="number" 
                                    min="1"
                                    max="9999"
                                    value={state.size}
                                    onChange={(e) => {
                                        let val = parseInt(e.target.value);
                                        if (isNaN(val)) val = 1;
                                        if (val > 9999) val = 9999;
                                        if (val < 1) val = 1;
                                        updateState({ size: val });
                                    }}
                                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm text-slate-900 dark:text-white"
                                  />
                              </div>
                          </div>
                          
                          <div className="w-1/2 group relative z-30" ref={shapeDropdownRef}>
                              <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5 ml-1">Distribution</label>
                              <motion.button
                                 whileTap={{ scale: 0.98 }}
                                 onClick={() => setIsShapeOpen(!isShapeOpen)}
                                 className={`w-full bg-slate-50 dark:bg-slate-950 border transition-all rounded-xl px-4 py-3 text-sm font-semibold outline-none flex items-center justify-between shadow-sm ${
                                   isShapeOpen 
                                     ? 'border-indigo-500 ring-1 ring-indigo-500' 
                                     : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                                 }`}
                              >
                                 <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-slate-400 shrink-0">{selectedShape.icon}</span>
                                    <span className="truncate text-slate-900 dark:text-white">{selectedShape.label}</span>
                                 </div>
                                 <motion.div 
                                    animate={{ rotate: isShapeOpen ? 180 : 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="text-slate-400 shrink-0 ml-2"
                                 >
                                    <Icons.ChevronDown />
                                 </motion.div>
                              </motion.button>

                              <AnimatePresence>
                                 {isShapeOpen && (
                                    <motion.div
                                       initial={{ opacity: 0, y: -5, scale: 0.98 }}
                                       animate={{ opacity: 1, y: 0, scale: 1 }}
                                       exit={{ opacity: 0, y: -5, scale: 0.98 }}
                                       transition={{ duration: 0.1, ease: "easeOut" }}
                                       className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden ring-1 ring-black/5"
                                    >
                                       {shapeOptions.map((option) => {
                                          const isSelected = state.targetShape === option.value;
                                          return (
                                            <motion.div
                                               key={option.value}
                                               onClick={() => {
                                                   updateState({ targetShape: option.value as TargetShape });
                                                   setIsShapeOpen(false);
                                               }}
                                               className={`px-4 py-3 cursor-pointer border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors relative ${
                                                  isSelected 
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20' 
                                                    : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                                               }`}
                                            >
                                               <div className="flex items-center gap-3">
                                                  <div className={`p-2 rounded-lg ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                                                     {option.icon}
                                                  </div>
                                                  <div>
                                                     <p className={`text-sm font-bold ${isSelected ? 'text-indigo-900 dark:text-indigo-200' : 'text-slate-700 dark:text-slate-200'}`}>{option.label}</p>
                                                     <p className="text-[10px] text-slate-400 font-medium">{option.desc}</p>
                                                  </div>
                                               </div>
                                            </motion.div>
                                          );
                                       })}
                                    </motion.div>
                                 )}
                              </AnimatePresence>
                          </div>
                       </div>
                   </div>
               </div>
           </div>
       </motion.div>

       {/* Action Card */}
       <div className="lg:col-span-4 flex flex-col gap-4">
           {!state.mockMode && (
               <motion.div 
                 initial={{ opacity: 0, x: 20 }}
                 animate={{ opacity: 1, x: 0 }}
                 transition={{ delay: 0.1 }}
                 className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 relative overflow-hidden flex-grow"
               >
                   <div className="relative z-10 space-y-4">
                       <label className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">
                            <Icons.Terminal /> Access Token
                       </label>

                       <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between group/cmd transition-colors">
                          <div className="flex flex-col">
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-0.5">CLI Helper</span>
                              <code className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">gcloud auth print-access-token</code>
                          </div>
                          <button 
                             onClick={() => navigator.clipboard.writeText('gcloud auth print-access-token')}
                             className="p-2 bg-white dark:bg-slate-900 rounded-lg text-slate-400 hover:text-indigo-500 border border-slate-200 dark:border-slate-800 shadow-sm transition-all hover:scale-105 active:scale-95"
                             title="Copy to Clipboard"
                          >
                             <Icons.Copy />
                          </button>
                       </div>
                       
                       <textarea 
                           value={state.accessToken}
                           onChange={(e) => updateState({ accessToken: e.target.value })}
                           className={`w-full h-24 bg-slate-50 dark:bg-slate-950 border rounded-xl p-3 text-xs font-mono text-slate-900 dark:text-slate-200 focus:ring-1 outline-none resize-none placeholder:text-slate-400 dark:placeholder:text-slate-600 custom-scrollbar shadow-inner ${
                               state.validationErrors?.accessToken 
                               ? 'border-red-500 focus:border-red-500 focus:ring-red-500 bg-red-50/10' 
                               : 'border-slate-200 dark:border-slate-800 focus:ring-indigo-500 focus:border-indigo-500'
                           }`}
                           placeholder="Paste token here..."
                       />
                   </div>
               </motion.div>
           )}

           <motion.button 
              onClick={onSearch}
              disabled={isSearchDisabled}
              whileHover={!isSearchDisabled ? { scale: 1.01 } : {}}
              whileTap={!isSearchDisabled ? { scale: 0.99 } : {}}
              className={`w-full py-4 rounded-xl font-black uppercase tracking-widest text-xs backdrop-blur-md transition-all duration-300 flex justify-center items-center gap-2 relative overflow-hidden group ${
                 state.loading 
                    ? 'bg-red-500/90 border border-red-500 text-white shadow-lg shadow-red-500/20' 
                    : isSearchDisabled
                        ? 'bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-600 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 dark:shadow-indigo-900/50'
              }`}
           >
              {/* Refined Shimmer Effect - Slower, subtler */}
              {!state.loading && !isSearchDisabled && (
                <div className="absolute inset-0 -translate-x-[150%] animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-indigo-400/10 to-transparent group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out pointer-events-none" />
              )}

              {state.loading ? (
                  <>
                    <Icons.Cancel /> Cancel
                  </>
              ) : (
                  <>
                    <Icons.Bolt className={!isSearchDisabled ? "animate-pulse" : ""} /> 
                    {isSearchDisabled && !state.mockMode ? 'Invalid Config' : 'Analyze Capacity'}
                  </>
              )}
           </motion.button>
       </div>
    </div>
  );
});

export default ConfigurationPanel;

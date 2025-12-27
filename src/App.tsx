import React, { Suspense, useState, useEffect, useMemo } from 'react';
import { Icons } from './constants';
import { useCapacityLogic } from './hooks/useCapacityLogic';
import Header from './components/Header';
import ConfigurationPanel from './components/ConfigurationPanel';
import ResultsDashboard from './components/ResultsDashboard';
import ToastContainer from './components/Toast';
import CommandPalette, { Command } from './components/CommandPalette';

// Lazy load the debug console for better performance (Code Splitting)
const DebugConsole = React.lazy(() => import('./components/DebugConsole'));

/**
 * Main Application Shell
 * 
 * Architecture:
 * - Uses `useCapacityLogic` for all state and business logic.
 * - Composes UI from functional components.
 * - Manages Global Debug Console visibility.
 */
const App: React.FC = () => {
  const {
    state,
    updateState,
    handleSearch,
    handleExport,
    clearResults,
    toggleFamily,
    filteredMachineTypes,
    regionOptions,
    machineDetails,
    isFetchingRegions,
    isFetchingMachineTypes,
    removeToast,
    regionConfig
  } = useCapacityLogic();

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Global Keyboard Shortcut for Command Palette (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Scroll visibility logic
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 400) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Define Commands
  const commands: Command[] = useMemo(() => [
    {
      id: 'analyze',
      label: 'Run Capacity Analysis',
      icon: <Icons.Bolt size={16} />,
      action: handleSearch,
      category: 'Actions',
      shortcut: '↵'
    },
    {
      id: 'clear',
      label: 'Clear Results',
      icon: <Icons.Trash size={16} />,
      action: clearResults,
      category: 'Actions'
    },
    {
      id: 'theme',
      label: state.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      icon: state.darkMode ? <Icons.Sun size={16} /> : <Icons.Moon size={16} />,
      action: () => updateState({ darkMode: !state.darkMode }),
      category: 'Preferences'
    },
    {
      id: 'mock',
      label: state.mockMode ? 'Disable Mock Mode (Live API)' : 'Enable Mock Mode',
      icon: <Icons.Terminal size={16} />,
      action: () => updateState({ mockMode: !state.mockMode }),
      category: 'Preferences'
    },
    {
      id: 'debug',
      label: 'Toggle Debug Console',
      icon: <Icons.Code size={16} />,
      action: () => updateState({ showDebug: !state.showDebug }),
      category: 'View'
    },
    {
      id: 'export-csv',
      label: 'Export Results as CSV',
      icon: <Icons.FileText size={16} />,
      action: () => handleExport('csv'),
      category: 'Export'
    },
    {
      id: 'export-pdf',
      label: 'Export Results as PDF',
      icon: <Icons.FileText size={16} />,
      action: () => handleExport('pdf'),
      category: 'Export'
    },
    {
      id: 'export-html',
      label: 'Export Results as HTML',
      icon: <Icons.Globe size={16} />,
      action: () => handleExport('html'),
      category: 'Export'
    }
  ], [state.darkMode, state.mockMode, state.showDebug, handleSearch, clearResults, updateState, handleExport]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300 pb-32 relative">
      
      {/* Background Pattern Layer */}
      <div className="absolute inset-0 bg-dot-pattern opacity-100 pointer-events-none"></div>

      <Header 
        mockMode={state.mockMode}
        darkMode={state.darkMode}
        onUpdate={updateState}
      />

      {/* 
        Layout Update: 
        Increased max-width to 1600px (approx 90% of FHD) to support dashboard layouts 
        on larger enterprise monitors while maintaining readability.
      */}
      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 relative z-10">
        <ConfigurationPanel 
          state={state}
          updateState={updateState}
          filteredMachineTypes={filteredMachineTypes}
          regionOptions={regionOptions}
          machineDetails={machineDetails}
          toggleFamily={toggleFamily}
          isFetchingRegions={isFetchingRegions}
          isFetchingMachineTypes={isFetchingMachineTypes}
          onSearch={handleSearch}
          regionConfig={regionConfig}
        />

        <ResultsDashboard 
          state={state}
          onExport={handleExport}
          onClear={clearResults}
        />
      </main>
      
      {/* Toast Notifications */}
      <ToastContainer toasts={state.toasts} removeToast={removeToast} />

      {/* Command Palette */}
      <CommandPalette 
        isOpen={isPaletteOpen} 
        onClose={() => setIsPaletteOpen(false)} 
        commands={commands} 
      />

      {/* Floating Action Button for Debug Console */}
      <div className="fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 flex flex-col gap-3 items-end">
        {/* Scroll to Top Button */}
        <div className={`transition-all duration-300 transform ${showScrollTop ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}`}>
            <button
                onClick={scrollToTop}
                className="p-3 md:p-3.5 rounded-full shadow-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 hover:scale-105 active:scale-95 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                title="Scroll to Top"
                aria-label="Scroll to Top"
            >
                <Icons.ArrowUp className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2} />
            </button>
        </div>

        {/* Debug Console Toggle */}
        <button 
            onClick={() => updateState({ showDebug: !state.showDebug })}
            className={`p-3 md:p-3.5 rounded-full shadow-xl border transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
                state.showDebug 
                    ? 'bg-indigo-600 border-indigo-500 text-white rotate-180 shadow-indigo-500/25' 
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800'
            }`}
            title="Toggle Debug Console"
            aria-label="Toggle Debug Console"
        >
            <Icons.Terminal className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2} />
        </button>
      </div>

      {/* Lazy Loaded Debug Console */}
      {state.showDebug && (
        <Suspense fallback={null}>
          <DebugConsole 
            data={state.debugData} 
            state={state}
            isOpen={state.showDebug} 
            onToggle={() => updateState({ showDebug: false })} 
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
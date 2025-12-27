import React, { Suspense } from 'react';
import { Icons } from './constants';
import { useCapacityLogic } from './hooks/useCapacityLogic';
import Header from './components/Header';
import ConfigurationPanel from './components/ConfigurationPanel';
import ResultsDashboard from './components/ResultsDashboard';
import ToastContainer from './components/Toast';

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

      {/* Floating Action Button for Debug Console */}
      <button 
        onClick={() => updateState({ showDebug: !state.showDebug })}
        className={`fixed bottom-6 right-6 p-3 md:p-4 rounded-full shadow-2xl z-50 transition-all hover:scale-105 border border-slate-700 ${state.showDebug ? 'bg-indigo-600 text-white rotate-180' : 'bg-slate-900 text-slate-400 hover:text-white border-slate-700 shadow-glow'}`}
        title="Toggle Debug Console"
        aria-label="Toggle Debug Console"
      >
        <Icons.Terminal className="w-5 h-5 md:w-6 md:h-6" />
      </button>

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
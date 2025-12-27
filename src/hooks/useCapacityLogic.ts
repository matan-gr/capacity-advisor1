
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  AppState, 
  TargetShape, 
  CapacityAdvisorResponse, 
  LogEntry, 
  DebugData, 
  NetworkLogEntry,
  Toast 
} from '../types';
import { 
  REGIONS, 
  REGION_CONFIG as STATIC_REGION_CONFIG, 
  MACHINE_TYPES as STATIC_MACHINE_TYPES, 
  MachineTypeOption,
  REGION_METADATA 
} from '../config';
import { fetchAllZonesCapacity, fetchAvailableRegions, fetchMachineTypes } from '../services/apiService';
import { generateMockRecommendationsWithShape } from '../services/simulationEngine';
import { useStreamAI } from './useStreamAI';
import { getFriendlyErrorMessage, buildCapacityAdvisorRequest } from '../utils';
import { downloadFile, generateCSV, generateHTML, generatePDF } from '../export';

const INITIAL_DEBUG: DebugData = {
  request: null,
  response: null,
  geminiDebug: null,
  startTime: null,
  endTime: null,
  status: 'idle',
  mode: 'mock',
  logs: [],
  network: []
};

const INITIAL_STATE: AppState = {
  project: 'gcp-capacity-planning',
  region: 'us-central1',
  selectedMachineType: 'n2-standard-4',
  selectedFamilies: ['All'],
  size: 5,
  targetShape: TargetShape.ANY_SINGLE_ZONE,
  loading: false,
  groundingLoading: false,
  result: null,
  error: null,
  debugData: INITIAL_DEBUG,
  showDebug: false,
  mockMode: true,
  accessToken: '',
  searchTerm: '',
  darkMode: false,
  groundingMetadata: null,
  toasts: [],
  validationErrors: {}
};

// GCP Project ID Regex: 6-30 chars, lowercase, digits, hyphens.
const PROJECT_ID_REGEX = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

export const useCapacityLogic = () => {
  // --- State Initialization ---
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('appState');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const safeFamilies = Array.isArray(parsed.selectedFamilies) ? parsed.selectedFamilies : ['All'];
        
        // Apply theme immediately
        if (parsed.darkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }

        return { 
            ...INITIAL_STATE, 
            ...parsed, 
            selectedFamilies: safeFamilies,
            loading: false, 
            groundingLoading: false, 
            result: null, 
            error: null, 
            debugData: INITIAL_DEBUG,
            accessToken: '', // Don't persist sensitive tokens
            searchTerm: '',
            toasts: [],
            validationErrors: {}
        };
      } catch (e) { return INITIAL_STATE; }
    }
    
    // Fallback to System Preference
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (systemPrefersDark) {
        document.documentElement.classList.add('dark');
    }

    return { ...INITIAL_STATE, darkMode: systemPrefersDark };
  });

  const [availableRegions, setAvailableRegions] = useState<string[]>(REGIONS);
  const [availableMachineTypes, setAvailableMachineTypes] = useState<MachineTypeOption[]>(STATIC_MACHINE_TYPES);
  const [regionConfig, setRegionConfig] = useState<Record<string, string[]>>(STATIC_REGION_CONFIG);
  
  const [isFetchingRegions, setIsFetchingRegions] = useState(false);
  const [isFetchingMachineTypes, setIsFetchingMachineTypes] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastFetchTimeRef = useRef<number | null>(null);
  const staleToastShownRef = useRef<boolean>(false);
  const isFirstRender = useRef(true);

  // --- AI Stream Hook ---
  const { 
    output: streamOutput, 
    metadata: streamMetadata, 
    debug: streamDebug, 
    trigger: triggerStream, 
    isStreaming, 
    abort: abortStream,
    reset: resetStream 
  } = useStreamAI();

  // --- Helpers ---
  const updateState = useCallback((updates: Partial<AppState>) => {
    setState(prev => {
        const newErrors = { ...prev.validationErrors };
        if (updates.project) delete newErrors.project;
        if (updates.region) delete newErrors.region;
        if (updates.selectedMachineType) delete newErrors.machineType;
        if (updates.accessToken) delete newErrors.accessToken;
        
        return { ...prev, ...updates, validationErrors: newErrors };
    });
  }, []);

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setState(prev => ({
      ...prev,
      debugData: {
        ...prev.debugData,
        logs: [...prev.debugData.logs, { timestamp: new Date().toISOString(), level, message }]
      }
    }));
  }, []);

  const addNetworkLog = useCallback((entry: NetworkLogEntry) => {
    setState(prev => ({
      ...prev,
      debugData: {
        ...prev.debugData,
        network: [...prev.debugData.network, entry]
      }
    }));
  }, []);

  const addToast = useCallback((type: Toast['type'], title: string, message: string, duration?: number) => {
    const newToast: Toast = {
        id: crypto.randomUUID(),
        type,
        title,
        message,
        duration: duration || 6000
    };
    setState(prev => ({ ...prev, toasts: [...prev.toasts, newToast] }));
  }, []);

  const removeToast = useCallback((id: string) => {
      setState(prev => ({ ...prev, toasts: prev.toasts.filter(t => t.id !== id) }));
  }, []);

  // --- Effects ---

  // Check Data Freshness (Stale Data Alert - 2 Minutes)
  useEffect(() => {
    const checkStaleness = () => {
      if (!state.result || !lastFetchTimeRef.current) return;
      const elapsed = Date.now() - lastFetchTimeRef.current;
      const STALE_THRESHOLD = 120 * 1000;
      
      if (elapsed > STALE_THRESHOLD && !staleToastShownRef.current) {
         addToast(
             'warning', 
             'Data Freshness Notice', 
             'Results are over 2 minutes old. Refresh your analysis to ensure accuracy.',
             60000
         );
         staleToastShownRef.current = true;
      }
    };

    const interval = setInterval(checkStaleness, 15000);
    return () => clearInterval(interval);
  }, [state.result, addToast]);

  // Sync AI Stream
  useEffect(() => {
    if (isStreaming || streamOutput) {
        setState(prev => ({
            ...prev,
            groundingLoading: isStreaming && !streamOutput,
            groundingMetadata: streamMetadata,
            debugData: {
                ...prev.debugData,
                geminiDebug: streamDebug ? {
                    prompt: streamDebug.prompt,
                    responseRaw: streamOutput,
                    model: streamDebug.model,
                    timestamp: new Date().toISOString()
                } : prev.debugData.geminiDebug
            }
        }));
    }
  }, [isStreaming, streamOutput, streamMetadata, streamDebug]);

  // Persist State & Theme
  useEffect(() => {
    const configToSave = {
        project: state.project,
        region: state.region,
        selectedMachineType: state.selectedMachineType,
        selectedFamilies: state.selectedFamilies,
        size: state.size,
        targetShape: state.targetShape,
        mockMode: state.mockMode,
        darkMode: state.darkMode
    };
    localStorage.setItem('appState', JSON.stringify(configToSave));
    document.documentElement.classList.toggle('dark', state.darkMode);
  }, [state.project, state.region, state.selectedMachineType, state.selectedFamilies, state.size, state.targetShape, state.mockMode, state.darkMode]);

  // Reset results when switching modes
  useEffect(() => {
    if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
    }
    
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
    }
    resetStream();
    
    setState(prev => ({
        ...prev,
        result: null,
        error: null,
        groundingMetadata: null,
        loading: false,
        groundingLoading: false,
        debugData: { 
            ...INITIAL_DEBUG, 
            mode: prev.mockMode ? 'mock' : 'real' 
        }
    }));
  }, [state.mockMode, resetStream]);

  // Fetch Regions
  useEffect(() => {
    let mounted = true;
    const loadRegions = async () => {
      if (!state.accessToken || state.mockMode || !state.project) {
        setAvailableRegions(REGIONS);
        setRegionConfig(STATIC_REGION_CONFIG);
        return;
      }
      setIsFetchingRegions(true);
      try {
        const dynamicRegionConfig = await fetchAvailableRegions(state.accessToken, state.project, addNetworkLog);
        if (mounted && Object.keys(dynamicRegionConfig).length > 0) {
          const regions = Object.keys(dynamicRegionConfig).sort();
          setAvailableRegions(regions);
          setRegionConfig(dynamicRegionConfig);
          addLog('info', `Fetched ${regions.length} regions dynamically.`);
        }
      } catch (e) {
        if (mounted) {
           addLog('warn', 'Could not fetch dynamic regions. Using static fallback.');
           setAvailableRegions(REGIONS);
        }
      } finally {
        if (mounted) setIsFetchingRegions(false);
      }
    };
    const timer = setTimeout(loadRegions, 100);
    return () => { mounted = false; clearTimeout(timer); };
  }, [state.accessToken, state.project, state.mockMode, addLog, addNetworkLog]);

  // Fetch Machine Types
  useEffect(() => {
    let mounted = true;
    const loadMachineTypes = async () => {
        if (!state.accessToken || state.mockMode || !state.project || !state.region) {
            setAvailableMachineTypes(STATIC_MACHINE_TYPES);
            return;
        }
        const zones = regionConfig[state.region];
        if (!zones || zones.length === 0) {
             setAvailableMachineTypes(STATIC_MACHINE_TYPES);
             return;
        }
        setIsFetchingMachineTypes(true);
        try {
            const types = await fetchMachineTypes(state.accessToken, state.project, zones[0], addNetworkLog);
            if (mounted && types.length > 0) {
                setAvailableMachineTypes(types);
                addLog('info', `Fetched ${types.length} machine types.`);
            } else if (mounted) {
                 setAvailableMachineTypes(STATIC_MACHINE_TYPES);
            }
        } catch (e) {
            if (mounted) {
                addLog('warn', 'Could not fetch dynamic types. Using static fallback.');
                setAvailableMachineTypes(STATIC_MACHINE_TYPES);
            }
        } finally {
            if (mounted) setIsFetchingMachineTypes(false);
        }
    };
    const timer = setTimeout(loadMachineTypes, 200);
    return () => { mounted = false; clearTimeout(timer); }
  }, [state.accessToken, state.project, state.region, regionConfig, state.mockMode, addLog, addNetworkLog]);

  // --- Actions ---

  const handleSearch = async () => {
    if (state.loading) {
       if (abortControllerRef.current) {
         abortControllerRef.current.abort();
         abortControllerRef.current = null;
       }
       abortStream();
       addLog('warn', 'Operation cancelled by user.');
       addToast('info', 'Analysis Cancelled', 'The capacity check was manually stopped.');
       updateState({ loading: false, groundingLoading: false });
       return;
    }

    // --- Validation ---
    const errors: Record<string, boolean> = {};
    let hasError = false;

    if (!state.selectedMachineType || state.selectedMachineType.trim() === '') {
        errors.machineType = true;
        addToast('error', 'Missing Machine Type', 'Please select a specific Machine Type.');
        hasError = true;
    }

    if (!state.region || state.region.trim() === '') {
        errors.region = true;
        addToast('error', 'Missing Region', 'A Target Region must be selected.');
        hasError = true;
    }

    if (!state.mockMode) {
        if (!state.project || state.project.trim() === '') {
            errors.project = true;
            addToast('error', 'Missing Project ID', 'Project ID required for Live API.');
            hasError = true;
        } else if (!PROJECT_ID_REGEX.test(state.project)) {
            errors.project = true;
            addToast('error', 'Invalid Project ID', 'Format: lowercase, digits, hyphens.');
            hasError = true;
        }
        
        // Strict Token Check for Live Mode
        if (!state.accessToken || state.accessToken.trim() === '') {
             errors.accessToken = true;
             const tokenError = JSON.stringify({
                 clientError: true,
                 title: "Authentication Required",
                 message: "Live API mode requires a Google Cloud Access Token.",
                 actionable: "Run 'gcloud auth print-access-token' and paste it in the box."
             });
             addToast('error', 'Missing Access Token', 'Please provide a valid token to query real GCP data.');
             updateState({ error: getFriendlyErrorMessage(401, tokenError) });
             hasError = true;
        }
    }

    if (hasError) {
        updateState({ validationErrors: errors });
        return;
    }
    
    abortControllerRef.current = new AbortController();
    const startTime = new Date().toISOString();
    const apiRequest = buildCapacityAdvisorRequest(state);
    
    // Construct URLs and Commands for Debugging
    const apiUrl = `https://compute.googleapis.com/compute/alpha/projects/${state.project}/regions/${state.region}/advice/capacity`;
    const curlCommand = `curl -X POST "${apiUrl}" \\
  -H "Authorization: Bearer ${state.mockMode ? 'SIMULATED' : '[HIDDEN]'}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(apiRequest, null, 2)}'`;

    // Reset stale timer
    lastFetchTimeRef.current = null;
    staleToastShownRef.current = false;
    
    // Clear any existing stale toasts
    setState(prev => ({
        ...prev,
        toasts: prev.toasts.filter(t => t.title !== 'Data Freshness Notice')
    }));

    // Initialize Debug Data
    const initialDebugData: DebugData = {
        ...INITIAL_DEBUG,
        status: 'running',
        startTime,
        mode: state.mockMode ? 'mock' : 'real',
        request: {
            url: apiUrl,
            method: 'POST',
            body: apiRequest,
            curl: curlCommand
        },
        logs: [{ timestamp: startTime, level: 'info', message: 'Initializing analysis...' }]
    };

    updateState({
        loading: true, 
        error: null, 
        result: null, 
        groundingMetadata: null, 
        debugData: initialDebugData
    });

    addLog('info', `Starting analysis for ${state.size}x ${state.selectedMachineType} in ${state.region}...`);
    
    // 1. Identify current Machine Details to prevent state mismatch during stream
    const currentMachineDetails = availableMachineTypes.find(m => m.id === state.selectedMachineType) || STATIC_MACHINE_TYPES.find(m => m.id === state.selectedMachineType);

    // 2. Start Streaming AI with aligned data
    triggerStream(state, currentMachineDetails);

    try {
      let response: CapacityAdvisorResponse;
      
      if (state.mockMode) {
        // --- Mock Mode Execution ---
        await new Promise(r => setTimeout(r, 600)); // Simulate network latency
        
        // Handle Abort cleanly without depending on global DOMException
        if (abortControllerRef.current?.signal.aborted) {
            const abortError = new Error('Aborted');
            abortError.name = 'AbortError';
            throw abortError;
        }
        
        response = generateMockRecommendationsWithShape(state.region, state.selectedMachineType, currentMachineDetails, state.size, state.targetShape);
        
        // Add Simulated Network Log for Debug Console
        addNetworkLog({
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            method: 'POST',
            url: 'https://compute.googleapis.com/compute/alpha/.../advice/capacity (SIMULATED)',
            headers: { 'Content-Type': 'application/json' },
            body: apiRequest,
            latencyMs: 600,
            status: 200,
            curl: curlCommand
        });
        
        addLog('info', 'Simulation completed successfully.');

      } else {
        // --- Live API Execution ---
        response = await fetchAllZonesCapacity(state.accessToken, state.project, state.region, state, abortControllerRef.current.signal, addNetworkLog);
        addLog('info', 'Live API response received.');
      }

      lastFetchTimeRef.current = Date.now();

      setState(prev => ({
        ...prev,
        loading: false, 
        result: response,
        debugData: { ...prev.debugData, response, endTime: new Date().toISOString(), status: 'completed' }
      }));
      
      addToast('success', 'Analysis Complete', `Found ${response.recommendations.length} optimization options.`);

    } catch (error: any) {
      if (error.name === 'AbortError') return;
      
      const friendlyMsg = getFriendlyErrorMessage(error.status || 500, error.message);
      
      addLog('error', friendlyMsg);
      const isAuth = friendlyMsg.includes('Auth') || friendlyMsg.includes('Access');
      const isQuota = friendlyMsg.includes('Quota');
      const toastTitle = isAuth ? 'Authentication Error' : isQuota ? 'Quota Exceeded' : 'Analysis Failed';

      addToast('error', toastTitle, friendlyMsg);

      setState(prev => ({ 
        ...prev,
        loading: false, 
        error: friendlyMsg,
        debugData: { ...prev.debugData, endTime: new Date().toISOString(), status: 'error', summary: `Failed: ${friendlyMsg}` }
      }));
    }
  };

  const toggleFamily = useCallback((family: string) => {
    setState(prev => {
        let newFamilies = [...prev.selectedFamilies];
        if (family === 'All') return { ...prev, selectedFamilies: ['All'], selectedMachineType: '' };
        newFamilies = newFamilies.filter(f => f !== 'All');
        if (newFamilies.includes(family)) newFamilies = newFamilies.filter(f => f !== family);
        else newFamilies.push(family);
        if (newFamilies.length === 0) newFamilies = ['All'];
        return { ...prev, selectedFamilies: newFamilies, selectedMachineType: '' };
    });
  }, []);

  const handleExport = useCallback((type: 'csv' | 'html' | 'pdf') => {
    if (!state.result) return;
    if (type === 'csv') downloadFile(generateCSV(state.result, state), `capacity-${state.project}.csv`, 'text/csv');
    else if (type === 'html') downloadFile(generateHTML(state.result, state, state.groundingMetadata), `capacity-${state.project}.html`, 'text/html');
    else if (type === 'pdf') generatePDF(state.result, state, state.groundingMetadata);
  }, [state.result, state.project, state.groundingMetadata]);

  const clearResults = useCallback(() => {
      resetStream();
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
          abortControllerRef.current = null;
      }
      lastFetchTimeRef.current = null;
      staleToastShownRef.current = false;
      setState(prev => ({
          ...INITIAL_STATE,
          project: prev.project, 
          accessToken: prev.accessToken,
          mockMode: prev.mockMode,
          darkMode: prev.darkMode,
          region: INITIAL_STATE.region,
          selectedMachineType: INITIAL_STATE.selectedMachineType,
          selectedFamilies: INITIAL_STATE.selectedFamilies,
          size: INITIAL_STATE.size,
          targetShape: INITIAL_STATE.targetShape,
          result: null,
          error: null,
          groundingMetadata: null,
          loading: false,
          groundingLoading: false
      }));
      addToast('info', 'Dashboard Reset', 'Results cleared. Ready for new analysis.');
  }, [resetStream, addToast]);

  const filteredMachineTypes = useMemo(() => {
     if (state.selectedFamilies.includes('All')) return availableMachineTypes;
     return availableMachineTypes.filter(type => state.selectedFamilies.includes(type.family));
  }, [availableMachineTypes, state.selectedFamilies]);

  const regionOptions = useMemo(() => {
    return availableRegions.map(id => {
        const meta = REGION_METADATA[id];
        return {
            id,
            name: meta?.name || id,
            continent: meta?.continent || 'Other'
        };
    });
  }, [availableRegions]);

  return {
    state,
    updateState,
    handleSearch,
    handleExport,
    clearResults,
    toggleFamily,
    filteredMachineTypes,
    availableRegions,
    availableMachineTypes,
    isFetchingRegions,
    isFetchingMachineTypes,
    regionOptions,
    machineDetails: availableMachineTypes.find(m => m.id === state.selectedMachineType) || STATIC_MACHINE_TYPES.find(m => m.id === state.selectedMachineType),
    removeToast,
    regionConfig
  };
};

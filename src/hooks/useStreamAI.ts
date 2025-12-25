
import { useState, useCallback, useRef } from 'react';
import { streamGeminiInsight } from '../services/geminiService';
import { AppState, GroundingMetadata } from '../types';
import { MachineTypeOption } from '../config';

export const useStreamAI = () => {
  const [output, setOutput] = useState('');
  const [metadata, setMetadata] = useState<GroundingMetadata | null>(null);
  const [debug, setDebug] = useState<any>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Ref to track if unmounted
  const isMounted = useRef(true);

  const trigger = useCallback(async (state: AppState, machineDetails: MachineTypeOption | undefined) => {
    setIsStreaming(true);
    setOutput('');
    setMetadata(null);
    setDebug(null);

    await streamGeminiInsight(
      state,
      machineDetails,
      (text) => {
        if (isMounted.current) setOutput(text);
      },
      (meta) => {
        if (isMounted.current) setMetadata(meta);
      },
      (dbg) => {
        if (isMounted.current) setDebug(dbg);
      }
    );

    if (isMounted.current) setIsStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setOutput('');
    setMetadata(null);
    setDebug(null);
    setIsStreaming(false);
  }, []);

  const abort = useCallback(() => {
      // In a real implementation, we would pass an AbortSignal to the service
      setIsStreaming(false);
  }, []);

  // Cleanup
  useEffect(() => {
      return () => { isMounted.current = false; };
  }, []);

  // Memoize the derived metadata to prevent infinite loops in consumers
  const derivedMetadata = useMemo(() => {
      if (metadata) return { ...metadata, insight: output };
      if (output) return { insight: output, sources: [] };
      return null;
  }, [output, metadata]);

  return { 
    output, 
    metadata: derivedMetadata, 
    debug, 
    trigger, 
    isStreaming,
    abort,
    reset
  };
};

import { useEffect, useMemo } from 'react';

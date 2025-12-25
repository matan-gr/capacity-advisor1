
import { useState, useCallback, useRef } from 'react';
import { streamGroundingInsights } from '../services/geminiService';
import { AppState, GroundingMetadata } from '../types';
import { MachineTypeOption } from '../config';

interface UseStreamAIResult {
  output: string;
  metadata: GroundingMetadata | null;
  debug: { prompt: string; model: string } | null;
  trigger: (state: AppState, machineSpecs: MachineTypeOption | undefined) => Promise<void>;
  isLoading: boolean;
  isStreaming: boolean;
  abort: () => void;
  reset: () => void;
}

export const useStreamAI = (): UseStreamAIResult => {
  const [output, setOutput] = useState('');
  const [metadata, setMetadata] = useState<GroundingMetadata | null>(null);
  const [debug, setDebug] = useState<{ prompt: string; model: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  
  // Ref to handle aborting/cleanup if needed (though generator cancellation is implicit if we stop iterating, 
  // explicitly breaking the loop is better)
  const abortControllerRef = useRef<AbortController | null>(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  const reset = useCallback(() => {
    abort();
    setOutput('');
    setMetadata(null);
    setDebug(null);
  }, [abort]);

  const trigger = useCallback(async (state: AppState, machineSpecs: MachineTypeOption | undefined) => {
    reset(); // Reset before starting new trigger
    abortControllerRef.current = new AbortController();
    
    setIsLoading(true);
    setIsStreaming(true);

    try {
      const generator = streamGroundingInsights(state, machineSpecs);
      
      for await (const chunk of generator) {
        if (abortControllerRef.current?.signal.aborted) break;

        if (chunk.type === 'text') {
           setOutput(prev => prev + chunk.content);
        } 
        else if (chunk.type === 'debug') {
           setDebug(chunk.content);
        }
        else if (chunk.type === 'metadata') {
           // Parse sources from SDK format to our App format
           const raw = chunk.content;
           const sources: { title: string; uri: string }[] = [];
           
           if (raw.groundingChunks) {
             raw.groundingChunks.forEach((c: any) => {
               if (c.web?.uri && c.web?.title) {
                 sources.push({ title: c.web.title, uri: c.web.uri });
               }
             });
           }
           // We might receive multiple metadata chunks, usually we want to merge or take the last one.
           // Search grounding usually comes once.
           setMetadata(prev => ({ 
             insight: '', // Insight is in the text stream
             sources: sources.length > 0 ? sources : (prev?.sources || [])
           }));
        }
      }
    } catch (e) {
      console.error("Stream error", e);
      setOutput(prev => prev + "\n\n**Connection interrupted.**");
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, [reset]);

  return { 
    output, 
    metadata: metadata ? { ...metadata, insight: output } : (output ? { insight: output, sources: [] } : null), 
    debug,
    trigger, 
    isLoading, 
    isStreaming,
    abort,
    reset
  };
};

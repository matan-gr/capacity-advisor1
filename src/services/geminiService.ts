
import { GoogleGenAI } from "@google/genai";
import { AppState, GroundingMetadata } from '../types';
import { MachineTypeOption } from '../config';

// --- Configuration ---
// Note: In a real app, this should be an environment variable.
// For this demo, we use a placeholder or require user input.
const GEMINI_API_KEY = import.meta.env.VITE_API_KEY || ''; 

// --- Prompt Engineering ---
const SYSTEM_INSTRUCTION = `
You are an expert Google Cloud Capacity Planner. 
Your goal is to analyze the provided capacity data and give a concise, actionable summary.
Focus on:
1. Risk Assessment: Is the requested capacity likely to be fulfilled?
2. Strategy: Should the user switch regions, machine types, or split the request?
3. Alternatives: Suggest better options if the current one is risky.

Format your response in Markdown. Use bullet points. Be brief (under 150 words).
Add a "TL;DR" section at the top.
`;

export const streamGeminiInsight = async (
  state: AppState,
  machineDetails: MachineTypeOption | undefined,
  onChunk: (text: string) => void,
  onMetadata: (meta: GroundingMetadata) => void,
  onDebug: (debug: any) => void
) => {
  // 1. Validation
  if (!GEMINI_API_KEY && !state.accessToken) {
    onChunk("⚠️ API Key missing. Please provide a valid key to enable AI insights.");
    return;
  }

  // 2. Construct Prompt
  const prompt = `
    Analyze this Google Cloud Spot Capacity Request:
    - Project: ${state.project}
    - Region: ${state.region}
    - Machine Type: ${state.selectedMachineType} (${machineDetails?.cores} vCPU, ${machineDetails?.memory} RAM)
    - Count: ${state.size} VMs
    - Strategy: ${state.targetShape}
    - Mode: ${state.mockMode ? 'Simulation' : 'Live Data'}

    The system has calculated an Obtainability Score of ${state.result?.recommendations[0]?.scores.find(s => s.name === 'obtainability')?.value.toFixed(2) || 'N/A'}.
    
    Provide a risk analysis and 3 specific recommendations to improve obtainability.
  `;

  try {
    // 3. Initialize Client
    // Note: In a production app, you might proxy this through your backend to hide the key,
    // or use the user's provided token if applicable.
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

    // 4. Configure Model
    const modelId = 'gemini-2.5-flash'; // Using the latest flash model for speed
    
    onDebug({
        model: modelId,
        prompt: prompt,
        timestamp: new Date().toISOString()
    });

    // 5. Generate Stream
    const responseStream = await ai.models.generateContentStream({
      model: modelId,
      contents: [
        { role: 'user', parts: [{ text: prompt }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 1.0, // Creative but focused
        maxOutputTokens: 500,
        tools: [{ googleSearch: {} }] // Enable Grounding
      }
    });

    // 6. Process Stream
    let fullText = '';
    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        fullText += text;
        onChunk(fullText);
      }
      
      // Extract Grounding Metadata if available
      if (chunk.candidates && chunk.candidates[0]?.groundingMetadata) {
        const meta = chunk.candidates[0].groundingMetadata;
        const sources = meta.groundingChunks?.map((c: any) => ({
            uri: c.web?.uri || '',
            title: c.web?.title || 'Source'
        })).filter((s: any) => s.uri) || [];
        
        if (sources.length > 0) {
            onMetadata({
                insight: fullText,
                sources: sources
            });
        }
      }
    }

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    onChunk(`**Error generating insights:** ${error.message || 'Unknown error'}`);
  }
};

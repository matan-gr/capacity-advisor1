
import { GoogleGenAI } from "@google/genai";
import { AppState } from "../types";
import { MachineTypeOption } from "../config";

export type StreamChunk = 
  | { type: 'text'; content: string }
  | { type: 'metadata'; content: any } // keeping content loose for internal SDK types
  | { type: 'debug'; content: { prompt: string; model: string } };

export async function* streamGroundingInsights(
  state: AppState,
  machineSpecs: MachineTypeOption | undefined
): AsyncGenerator<StreamChunk, void, unknown> {
  // Using 'gemini-2.5-flash' as the stable Flash model.
  const modelName = 'gemini-2.5-flash';
  
  const today = new Date();
  const dateString = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeString = today.toLocaleTimeString('en-US', { timeZoneName: 'short' });
  
  // Calculate Quota Requirements based on real specs
  const vCPUsPerVM = machineSpecs?.cores || 2; // default safe fallback if undefined
  const memoryPerVM = machineSpecs?.memory || 'Unknown';
  const family = machineSpecs?.family || 'General Purpose';
  const totalVCPUs = vCPUsPerVM * state.size;
  const isHighQuota = totalVCPUs > 32; 
  
  const prompt = `
### SYSTEM INSTRUCTION
You are a **Google Cloud Principal Architect** acting as a Spot Capacity Advisor.
Your mandate is to validate the user's capacity request against real-world constraints using **official Google Cloud sources**.
**Double-check your assumptions** using the provided tools. Do not guess—verify.

**MANDATORY RESEARCH STEPS (Use Google Search):**
1.  **Service Health:** Search for "Google Cloud Service Health Dashboard ${state.region} compute engine" to check for active incidents.
2.  **Product Availability:** Search for "${state.selectedMachineType} availability ${state.region} google cloud documentation" to confirm it exists in this region.
3.  **Regional Events:** Search for "Tech conferences holidays weather ${state.region} ${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}" to assess demand spikes.
4.  **Official Comms:** Search for "Google Cloud Compute Engine blog posts ${today.getFullYear()}" for recent spot updates.
5.  **Alternatives Analysis:** If ${state.selectedMachineType} is constrained, search for "Google Cloud Compute Engine machine type comparison ${family}" to find modern alternatives (e.g., C3, C4, N4, C4A, N2D). Compare their Spot availability and price-performance.

### REAL-TIME CONTEXT
- **Current Time:** ${dateString} ${timeString}
- **Request:** ${state.size} instances of **${state.selectedMachineType}** in **${state.region}**.
- **Deployment Type:** ${state.targetShape} (Affects distribution strategy).
- **Hardware Specs:** ${vCPUsPerVM} vCPU / ${memoryPerVM} RAM per VM (${family}).
- **Total Quota Impact:** This request consumes **${totalVCPUs} vCPUs** of Spot Quota.

### RESPONSE FORMATTING RULES (STRICT MARKDOWN)
- **Tables:** Must start and end with pipes (|).
- **Headers:** Use \`###\` for section headers.
- **Lists:** Use \`*\` or \`-\` for bullets.
- **No JSON:** Do not output JSON. Output formatted Markdown.

### RESPONSE TEMPLATE

### ⚡ TL;DR Summary
[Provide a 2-sentence executive summary of the feasibility and key risks. Start with "Feasible", "Risky", or "Not Recommended".]

### 🛡️ Executive Assessment
> **Verdict:** [Go / Caution / No-Go]
[Synthesize the risk. Mention specifically if the required **${totalVCPUs} vCPUs** exceeds typical default quotas (usually ~24-32 for new projects). Compare Spot vs On-Demand availability.]

### 🔍 Verification & Grounding
*   **GCP Health Status:** [Report findings from Service Health Dashboard search]
*   **Regional Demand:** [Mention identified events/holidays or "No major events detected"]
*   **Docs Validation:** [Confirm if ${state.selectedMachineType} is standard in ${state.region} based on docs]

### 📊 Quota & Constraint Analysis
| Constraint | Required | Risk Analysis |
| :--- | :--- | :--- |
| **Spot vCPU Quota** | **${totalVCPUs}** vCPUs | ${isHighQuota ? '🚨 **HIGH RISK** (Check Limit)' : '✅ Low Risk (Standard)'} |
| **Instance Count** | ${state.size} VMs | ${state.size > 50 ? '⚠️ High Contention' : '✅ Manageable'} |
| **Region** | ${state.region} | [Comment on region liquidity/size] |

### ⚔️ Battlecard: Alternatives (If Constrained)
*(Only populate if Verdict is Caution or No-Go. Otherwise, state "No alternatives necessary".)*

| Alternative | Generation | Performance | Cost/Spot | Recommendation |
| :--- | :--- | :--- | :--- | :--- |
| **[Alt 1]** | [e.g. N4/C4] | [Comparison vs ${state.selectedMachineType}] | [Lower/Higher] | [Use Case] |
| **[Alt 2]** | [e.g. N2D/T2D] | [Comparison vs ${state.selectedMachineType}] | [Lower/Higher] | [Use Case] |

**Architect's Note:** [Briefly explain the trade-offs, e.g., "Moving to N2D offers better Spot availability due to AMD EPYC density, while C4 provides better per-core performance if budget allows."]

### 🛠️ Strategic Workarounds
*   **Protocol 1: Diversify Hardware:**
    *   *Alternative:* Use **[Suggest alternative family from Battlecard]** which often has deeper spot pools than ${state.selectedMachineType}.
*   **Protocol 2: Architecture Adaptation:**
    *   *Managed Instance Groups (MIGs):* Configure a MIG with multiple instance templates to fallback automatically.
*   **Protocol 3: Spatial Distribution:**
    *   *Region:* If ${state.region} is constrained, deploy payload to **[Suggest nearby region]**.
    *   *Zone:* Enforce '${state.targetShape}' shape to spread the **${totalVCPUs} vCPU** load.
*   **Protocol 4: Quota Management:**
    *   *Action:* Request a quota increase for "Spot Preemptible vCPUs" in ${state.region} immediately if limit is < ${totalVCPUs}.

### 📋 Pre-Flight Checklist
*   [ ] **Quota Verification:** Check "Spot Preemptible vCPUs" limit in IAM & Admin > Quotas.
*   [ ] **Fault Tolerance:** Ensure app handles \`SIGTERM\` for graceful shutdown.
*   [ ] **Fallback Strategy:** Verify On-Demand or Reservation budget is approved.
`;

  // Yield debug info first
  yield { type: 'debug', content: { prompt, model: modelName } };

  // Robustly retrieve API Key (Support both Vite env and standard process.env)
  const apiKey = import.meta.env.VITE_API_KEY || (typeof process !== 'undefined' ? process.env.API_KEY : undefined);

  if (!apiKey) {
      yield { type: 'text', content: "Configuration Error: API Key is missing. Please ensure VITE_API_KEY or process.env.API_KEY is set." };
      return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const stream = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 0.7, 
      },
    });

    for await (const chunk of stream) {
      if (chunk.text) {
        yield { type: 'text', content: chunk.text };
      }
      
      const groundingMeta = chunk.candidates?.[0]?.groundingMetadata;
      if (groundingMeta) {
        yield { type: 'metadata', content: groundingMeta };
      }
    }
  } catch (error: any) {
    console.error("Gemini Search Grounding Error:", error);
    
    // Robust Error Extraction
    // 1. Get string representation even for Error objects (which normally stringify to {})
    const errorStr = JSON.stringify(error, Object.getOwnPropertyNames(error));
    const errorMsg = error.message || '';
    const errorStatus = error.status || error.statusCode || error.code || error.error?.code;
    
    // 2. Check for Quota/Rate Limit (429)
    const isQuotaError = 
        errorStatus == 429 || // Loose equality for string "429"
        errorStatus === 'RESOURCE_EXHAUSTED' ||
        errorMsg.includes('429') || 
        errorMsg.includes('RESOURCE_EXHAUSTED') || 
        errorMsg.includes('quota') ||
        errorStr.includes('RESOURCE_EXHAUSTED') ||
        errorStr.includes('"code":429') ||
        errorStr.includes('"status":"RESOURCE_EXHAUSTED"');

    if (isQuotaError) {
        yield { 
            type: 'text', 
            content: `\n\n### ⚠️ AI Analysis Unavailable\n\n**Reason:** The daily quota for the AI model has been exceeded.\n\n**Action:** Please try again later or check your billing details if you are the project owner.\n\n> *Note: Basic capacity data is still accurate. Only the AI-generated insights are affected.*` 
        };
        return;
    }

    // 3. Handle Service Unavailable (503)
    const isServiceUnavailable = 
        errorStatus == 503 ||
        errorStatus === 'UNAVAILABLE' ||
        errorMsg.includes('503') ||
        errorMsg.includes('Service Unavailable') ||
        errorMsg.includes('Overloaded') ||
        errorStr.includes('"code":503');

    if (isServiceUnavailable) {
        yield { 
            type: 'text', 
            content: `\n\n### ⚠️ AI Service Temporarily Unavailable\n\n**Reason:** The AI service is currently overloaded or experiencing downtime.\n\n**Action:** Please try again in a few minutes.\n\n> *Note: Basic capacity data is still accurate.*` 
        };
        return;
    }

    // 4. Generic Error Fallback
    yield { type: 'text', content: `\n\n**Error retrieving insights:** ${errorMsg || 'Unknown error occurred.'}` };
  }
}

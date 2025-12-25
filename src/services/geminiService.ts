
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
  const modelName = 'gemini-3-flash-preview';
  
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

### REAL-TIME CONTEXT
- **Current Time:** ${dateString} ${timeString}
- **Request:** ${state.size} instances of **${state.selectedMachineType}** in **${state.region}**.
- **Hardware Specs:** ${vCPUsPerVM} vCPU / ${memoryPerVM} RAM per VM (${family}).
- **Total Quota Impact:** This request consumes **${totalVCPUs} vCPUs** of Spot Quota.
- **Target Shape:** ${state.targetShape}

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

### 🛠️ Strategic Workarounds
*   **Protocol 1: Diversify Hardware:**
    *   *Alternative:* Use **[Suggest alternative family, e.g., N2D or T2D]** which often has deeper spot pools than ${state.selectedMachineType}.
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

  const apiKey = process.env.API_KEY;

  if (!apiKey) {
      yield { type: 'text', content: "Configuration Error: API Key is missing. Please ensure process.env.API_KEY is set." };
      return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const stream = await ai.models.generateContentStream({
      model: modelName,
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 1.0, // Increased to 1.0 for better synthesis of gathered info
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
    yield { type: 'text', content: `\n\n**Error retrieving insights:** ${error.message}` };
  }
}


import { CapacityAdvisorRequest, CapacityAdvisorResponse, NetworkLogEntry } from '../types';
import { buildCapacityAdvisorRequest, getMachineTypeFamily, getMachineTypeArch, getMachineTypeSeries } from '../utils';
import { MachineTypeOption } from '../config';
import { apiRateLimiter } from './rateLimiter';

type NetworkLogCallback = (entry: NetworkLogEntry) => void;

const API_VERSIONS = {
  V1: 'https://compute.googleapis.com/compute/v1',
  ALPHA: 'https://compute.googleapis.com/compute/alpha'
};

/**
 * Generic GCP API Client Wrapper
 * Handles Rate Limiting, Authorization, Logging, and Error Parsing.
 */
async function gcpRequest<T>(
  url: string,
  method: string,
  accessToken: string,
  body: any | null,
  onNetworkLog?: NetworkLogCallback,
  signal?: AbortSignal
): Promise<T> {
  // 1. Client-Side Rate Limiting
  if (!apiRateLimiter.tryRequest()) {
    const status = apiRateLimiter.getStatus();
    const rateLimitError = {
       error: {
           code: 429,
           message: `Rate limit exceeded. Please wait ${status.resetInSeconds} seconds.`,
           errors: [{ reason: "rateLimitExceeded", message: "Client-side rate limiter active." }]
       }
    };
    throw new Error(JSON.stringify(rateLimitError));
  }

  const startTime = Date.now();
  
  // Construct a usable cURL command for debugging (with redacted token)
  const curl = `curl -X ${method} "${url}" \\
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \\
  -H "Content-Type: application/json" \\
  ${body ? `-d '${JSON.stringify(body, null, 2)}'` : ''}`;

  let response: Response | undefined;
  let responseText = '';
  let errorToThrow: any = null;

  try {
    const headers: HeadersInit = {
      'Authorization': `Bearer ${accessToken}`
    };
    
    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    // Force fresh data by disabling cache
    response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : null,
      signal,
      cache: 'no-store'
    });

    responseText = await response.text();

    if (!response.ok) {
      try {
        const errorJson = JSON.parse(responseText);
        errorToThrow = new Error(JSON.stringify(errorJson)); 
      } catch (e) {
        errorToThrow = new Error(responseText || `HTTP ${response.status} Error`);
      }
      throw errorToThrow;
    }

    return JSON.parse(responseText) as T;

  } catch (error: any) {
    errorToThrow = error;
    throw error;
  } finally {
    // ALWAYS Log Network Activity, even on error
    if (onNetworkLog && errorToThrow?.name !== 'AbortError') {
      onNetworkLog({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        method,
        url,
        headers: { 'Authorization': 'Bearer ...', 'Content-Type': 'application/json' },
        body,
        latencyMs: Date.now() - startTime,
        status: response ? response.status : 0,
        curl
      });
    }
  }
}

/**
 * Fetches available regions from GCP.
 */
export const fetchAvailableRegions = async (
  accessToken: string,
  project: string,
  onNetworkLog?: NetworkLogCallback
): Promise<Record<string, string[]>> => {
  const url = `${API_VERSIONS.V1}/projects/${project}/regions`;
  
  try {
    const data = await gcpRequest<{ items: any[] }>(url, 'GET', accessToken, null, onNetworkLog);
    
    const regionConfig: Record<string, string[]> = {};
    if (data.items) {
      for (const item of data.items) {
        if (item.zones && Array.isArray(item.zones)) {
           const zoneNames = item.zones
             .map((z: string) => z.split('/').pop() || '')
             .filter((z: string) => z);
           
           if (zoneNames.length > 0) {
             regionConfig[item.name] = zoneNames.sort();
           }
        }
      }
    }
    return regionConfig;
  } catch (e) {
    // Re-throw if it's an auth error so UI can show it, otherwise swallow for fallback
    if (e instanceof Error && (e.message.includes('401') || e.message.includes('403') || e.message.includes('authError'))) {
        throw e;
    }
    throw e;
  }
};

/**
 * Fetches machine types for a specific zone.
 */
export const fetchMachineTypes = async (
  accessToken: string,
  project: string,
  zone: string,
  onNetworkLog?: NetworkLogCallback
): Promise<MachineTypeOption[]> => {
  const url = `${API_VERSIONS.V1}/projects/${project}/zones/${zone}/machineTypes`;

  try {
    const data = await gcpRequest<{ items: any[] }>(url, 'GET', accessToken, null, onNetworkLog);
    
    if (!data.items) return [];

    const machineTypes: MachineTypeOption[] = data.items.map((item: any) => ({
      id: item.name,
      name: item.description || `${getMachineTypeSeries(item.name)} Standard ${item.guestCpus}`,
      family: getMachineTypeFamily(item.name),
      series: getMachineTypeSeries(item.name),
      cores: item.guestCpus,
      memory: Math.ceil(item.memoryMb / 1024) + 'GB',
      arch: getMachineTypeArch(item.name)
    }));

    return machineTypes.sort((a, b) => a.family.localeCompare(b.family) || a.id.localeCompare(b.id));

  } catch (e) {
    return [];
  }
};

/**
 * Main API call to Google Cloud Capacity Advisor (Alpha).
 */
export const fetchAllZonesCapacity = async (
  accessToken: string,
  project: string,
  region: string,
  appState: any,
  signal?: AbortSignal,
  onNetworkLog?: NetworkLogCallback
): Promise<CapacityAdvisorResponse> => {
  
  // Appended timestamp to prevent caching at the URL level
  const url = `${API_VERSIONS.ALPHA}/projects/${project}/regions/${region}/advice/capacity?_t=${Date.now()}`;
  const requestBody = buildCapacityAdvisorRequest(appState);

  const data = await gcpRequest<CapacityAdvisorResponse>(
    url, 
    'POST', 
    accessToken, 
    requestBody, 
    onNetworkLog, 
    signal
  );

  // Robust handling for empty or missing recommendation arrays
  if (!data.recommendations || data.recommendations.length === 0) {
      const stockoutError = {
          error: {
              code: 404,
              message: "Capacity Stockout",
              errors: [{
                  reason: "stockout",
                  message: `The requested capacity for ${appState.selectedMachineType} in ${region} is currently unavailable via Spot.`
              }]
          }
      };
      throw new Error(JSON.stringify(stockoutError));
  }

  // Sort recommendations by obtainability score (descending)
  data.recommendations.sort((a, b) => {
      const scoreA = a.scores.find(s => s.name === 'obtainability')?.value || 0;
      const scoreB = b.scores.find(s => s.name === 'obtainability')?.value || 0;
      return scoreB - scoreA;
  });

  return data;
};

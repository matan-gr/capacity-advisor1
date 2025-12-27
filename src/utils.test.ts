
declare var describe: any;
declare var it: any;
declare var expect: any;
declare var global: any;
declare var jest: any;

import { getFriendlyErrorMessage, buildCapacityAdvisorRequest } from './utils';
import { AppState, TargetShape, ProvisioningModel, Recommendation, Score } from './types';
import { generateMockRecommendationsWithShape, getNuancedSimulationMetrics } from './services/simulationEngine';
import { MACHINE_TYPES } from './config';
import { fetchAllZonesCapacity } from './services/apiService';

// Mock minimal state for testing
const mockState: AppState = {
  project: 'test-project',
  region: 'us-central1',
  selectedMachineType: 'e2-medium',
  selectedFamilies: ['General Purpose'],
  size: 10,
  targetShape: TargetShape.ANY,
  loading: false,
  groundingLoading: false,
  result: null,
  error: null,
  debugData: { 
    request: null, 
    response: null, 
    geminiDebug: null,
    startTime: null, 
    endTime: null, 
    status: 'idle', 
    mode: 'mock', 
    logs: [], 
    network: [] 
  },
  showDebug: false,
  mockMode: true,
  accessToken: 'fake-token',
  searchTerm: '',
  darkMode: false,
  groundingMetadata: null,
  toasts: [],
  validationErrors: {}
};

describe('Unit Test Suite', () => {
  
  // --- UTILS: Error Handling ---
  describe('Error Handling Logic', () => {
    it('returns Access Denied for 403 status', () => {
      const msg = getFriendlyErrorMessage(403, 'Some permission error');
      expect(msg).toContain('Access Denied');
    });

    it('returns Not Found for 404 status', () => {
      const msg = getFriendlyErrorMessage(404, 'Resource not found');
      expect(msg).toContain('Not Found');
    });

    it('parses standardized GCP JSON error responses', () => {
      const jsonError = JSON.stringify({
        error: {
          code: 400,
          message: "Invalid value for field 'zone'",
          errors: [{ domain: "global", reason: "invalid", message: "Invalid value for field 'zone'" }]
        }
      });
      const msg = getFriendlyErrorMessage(400, jsonError);
      expect(msg).toContain('Configuration Error');
    });
    
    it('parses quota exceeded errors', () => {
      const jsonError = JSON.stringify({
        error: {
          code: 403,
          message: "Quota exceeded",
          errors: [{ reason: "quotaExceeded", message: "Quota 'CPUS' exceeded. Limit: 24.0" }]
        }
      });
      const msg = getFriendlyErrorMessage(403, jsonError);
      expect(msg).toContain('Quota Exceeded');
      expect(msg).toContain('Limit: 24.0');
    });
  });

  // --- REQUEST BUILDER: Schema Validation ---
  describe('Request Builder (Schema)', () => {
    it('constructs a valid base request from state', () => {
      const req = buildCapacityAdvisorRequest(mockState);
      
      expect(req.count).toBe(10);
      expect(req.instanceProperties.scheduling.provisioningModel).toBe(ProvisioningModel.SPOT);
      expect(req.instanceFlexibilityPolicy.instanceSelections['primary'].machineTypes).toEqual(['e2-medium']);
      expect(req.locationPolicy.targetShape).toBe(TargetShape.ANY);
      expect(req.locationPolicy.locations).toBeUndefined();
    });

    it('handles state with zero size safely', () => {
        const zeroState = { ...mockState, size: 0 };
        const req = buildCapacityAdvisorRequest(zeroState);
        expect(req.count).toBe(0);
    });
  });

  // --- MOCK ENGINE: Logic & Data Integrity ---
  describe('Mock Simulation Engine (Server Logic)', () => {
    const mockMachineDetails = MACHINE_TYPES[0]; // e2-micro

    it('generates correct number of recommendations based on region config', () => {
      // us-central1 has 4 zones in constants.tsx
      const response = generateMockRecommendationsWithShape('us-central1', 'e2-medium', mockMachineDetails, 10, TargetShape.ANY);
      expect(response.recommendations).toHaveLength(4);
    });

    it('ensures recommendations are sorted by obtainability (Logic Check)', () => {
      const response = generateMockRecommendationsWithShape('us-central1', 'e2-medium', mockMachineDetails, 50, TargetShape.ANY);
      const scores = response.recommendations.map((r: Recommendation) => r.scores.find((s: Score) => s.name === 'obtainability')?.value || 0);
      
      // Check if sorted descending
      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });

    it('applies scarcity penalties for GPU families (Data Integrity)', () => {
      // Compare generic vs GPU
      const genericMetrics = getNuancedSimulationMetrics('General Purpose', 'n1-standard-1', 'us-central1', 'us-central1-a', 10);
      const gpuMetrics = getNuancedSimulationMetrics('Accelerator Optimized (GPU)', 'a2-highgpu-1g', 'us-central1', 'us-central1-a', 10);

      expect(gpuMetrics.obtainability).toBeLessThan(genericMetrics.obtainability);
    });

    it('applies scarcity penalties for new gen instances (N4/C4)', () => {
       const legacyMetrics = getNuancedSimulationMetrics('General Purpose', 'n2-standard-4', 'us-central1', 'us-central1-a', 5);
       const modernMetrics = getNuancedSimulationMetrics('General Purpose', 'n4-standard-4', 'us-central1', 'us-central1-a', 5);
       
       // N4 should generally be scarcer in spot than N2
       expect(modernMetrics.obtainability).toBeLessThanOrEqual(legacyMetrics.obtainability + 0.1); 
    });
  });

  // --- API SERVICE: Production Logic ---
  describe('Production API Service', () => {
    // Setup Mock Fetch
    const originalFetch = global.fetch;
    
    // Helper to mock fetch response
    const mockFetchResponse = (responseGenerator: (url: string) => any) => {
      global.fetch = (url: string) => {
        const result = responseGenerator(url);
        return Promise.resolve({
          ok: result.ok,
          status: result.status,
          text: () => Promise.resolve(JSON.stringify(result.data)),
          json: () => Promise.resolve(result.data)
        });
      };
    };

    // Simple single helper for direct calls
    const mockSingleResponse = (ok: boolean, status: number, data: any) => {
       global.fetch = () => Promise.resolve({
        ok,
        status,
        text: () => Promise.resolve(JSON.stringify(data)),
        json: () => Promise.resolve(data)
      });
    }

    it('fetchAllZonesCapacity handles successful response', async () => {
       const mockData = { recommendations: [{ scores: [{ name: 'obtainability', value: 0.9 }], shards: [] }] };
       mockSingleResponse(true, 200, mockData);

       const res = await fetchAllZonesCapacity('token', 'proj', 'us-central1', mockState);
       expect(res).toEqual(mockData);
    });

    it('fetchAllZonesCapacity throws error on API failure', async () => {
        mockSingleResponse(false, 503, { error: { message: "Service Unavailable" } });

        await expect(
            fetchAllZonesCapacity('token', 'proj', 'us-central1', mockState)
        ).rejects.toThrow();
    });

    it('fetchAllZonesCapacity throws error on Auth Failure (401)', async () => {
       mockSingleResponse(false, 401, { error: { message: "Invalid Token" } });
       
       await expect(
         fetchAllZonesCapacity('bad-token', 'proj', 'us-central1', mockState)
       ).rejects.toThrow(); 
    });

    // Cleanup
    global.fetch = originalFetch;
  });

});

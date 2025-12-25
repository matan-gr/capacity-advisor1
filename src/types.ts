
export enum ProvisioningModel {
  SPOT = 'SPOT',
  STANDARD = 'STANDARD'
}

export enum TargetShape {
  ANY = 'ANY',
  ANY_SINGLE_ZONE = 'ANY_SINGLE_ZONE',
  BALANCED = 'BALANCED'
}

export interface InstanceSelection {
  machineTypes: string[];
  rank?: number;
}

export interface CapacityAdvisorRequest {
  instanceProperties: {
    scheduling: {
      provisioningModel: ProvisioningModel;
    };
  };
  instanceFlexibilityPolicy: {
    instanceSelections: Record<string, InstanceSelection>;
  };
  locationPolicy: {
    targetShape: TargetShape;
    locations?: string[];
  };
  count: number;
}

export interface Score {
  name: string;
  value: number;
}

export interface Shard {
  location: string;
  machineType: string;
  count: number;
  provisioningModel: ProvisioningModel;
}

export interface Recommendation {
  scores: Score[];
  shards: Shard[];
}

export interface CapacityAdvisorResponse {
  recommendations: Recommendation[];
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
}

export interface NetworkLogEntry {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: any;
  latencyMs?: number;
  status?: number;
  curl?: string;
}

export interface GeminiDebugEntry {
  prompt: string;
  responseRaw: string;
  timestamp: string;
  model: string;
}

export interface DebugData {
  request: {
    url: string;
    method: string;
    body: CapacityAdvisorRequest;
    curl: string;
  } | null;
  response: CapacityAdvisorResponse | null;
  geminiDebug: GeminiDebugEntry | null;
  startTime: string | null;
  endTime: string | null;
  status: 'idle' | 'running' | 'completed' | 'error' | 'cancelled';
  mode: 'mock' | 'real';
  logs: LogEntry[];
  network: NetworkLogEntry[];
  summary?: string;
}

export interface GroundingMetadata {
  insight: string;
  sources: { title: string; uri: string }[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}

export interface AppState {
  project: string;
  region: string;
  selectedMachineType: string;
  selectedFamilies: string[];
  size: number;
  targetShape: TargetShape;
  loading: boolean;
  groundingLoading: boolean;
  result: CapacityAdvisorResponse | null;
  error: string | null;
  debugData: DebugData;
  showDebug: boolean;
  mockMode: boolean;
  accessToken: string;
  searchTerm: string;
  darkMode: boolean;
  groundingMetadata: GroundingMetadata | null;
  toasts: Toast[];
}

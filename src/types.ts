export type TaskCategory = 
  | 'General Question'
  | 'Coding'
  | 'Reasoning'
  | 'Summarization'
  | 'Creative Writing'
  | 'Extraction'
  | 'Classification';

export type ModelType = 'local' | 'api';
export type ModelStatus = 'ready' | 'loading' | 'standby' | 'offline';
export type ModelTier = 'free' | 'paid';

export interface Model {
  id: string;
  name: string;
  provider: string;
  type: ModelType;
  tier?: ModelTier;
  endpoint: string;
  context_length: number;
  input_cost_per_1k: number; // in USD (0 for free)
  output_cost_per_1k: number; // in USD (0 for free)
  is_free: boolean;
  is_builtin?: boolean;
  free_tier_limits?: string;
  enabled: boolean;
  priority: number;
  status: ModelStatus;
  latency_ms_avg: number;
  tokens_per_sec: number;
  description: string;
  device?: string; // e.g. "cuda:0", "mps", "cpu", "cloud"
  docs_url?: string;
  created_at: string;
}

export type ThemeId = 'amber-zero' | 'liquid-obsidian' | 'emerald-matrix' | 'violet-synth' | 'clean-light';

export interface AppTheme {
  id: ThemeId;
  name: string;
  description: string;
  primaryColor?: string;
  accentColor: string;
  bgColor: string;
  cardColor: string;
  borderColor: string;
  textColor: string;
  mode?: 'dark' | 'light';
}

export interface HuggingFaceAuthState {
  isConnected: boolean;
  apiKey: string;
  username: string;
  verifiedAt: string | null;
  onlyFreeUnlimitedModels: boolean;
  availableFreeModelsCount: number;
}

export interface ExecutionPlanStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'bypassed';
  durationMs?: number;
  outputSummary?: string;
}

// Visual Node Graph Engine (Authentic Node Graph UI)
export type PortDataType = 'tokens' | 'intent' | 'rules' | 'model' | 'metrics' | 'tensor' | 'flow';

export interface NodePort {
  id: string;
  label: string;
  type: 'input' | 'output';
  dataType: PortDataType;
  color?: string;
  active?: boolean;
}

export interface CanvasNode {
  id: string;
  title: string;
  subtitle?: string;
  category: 'source' | 'processing' | 'constraint' | 'decision' | 'dispatch' | 'sink';
  x: number;
  y: number;
  width?: number;
  status: 'idle' | 'active' | 'passed' | 'warning' | 'error';
  executionTimeMs?: number;
  headerColor?: string;
  inputs: NodePort[];
  outputs: NodePort[];
  data?: Record<string, any>;
}

export interface CanvasWire {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
  color?: string;
  active?: boolean;
  flowValue?: string;
}

export type RefinerVersionId = '1.0' | '1.1' | '2.0' | '3.0' | '3.1';

export interface RefinerVersion {
  id: RefinerVersionId;
  name: string;
  label: string;
  description: string;
  strategy: string;
  minConfidence: number;
  maxCompression: number; // e.g. 0.6 = max 60%
  enabled: boolean;
  avgReduction: number;
  avgSimilarity: number;
}

export interface ConstraintCheck {
  type: 'negative_instruction' | 'entity' | 'number' | 'code_snippet' | 'technical_term' | 'output_format' | 'security';
  text: string;
  preserved: boolean;
}

export interface RefinementMetrics {
  original_tokens: number;
  refined_tokens: number;
  tokens_saved: number;
  reduction_percentage: number;
  semantic_similarity: number;
  constraint_preservation: number; // 0.0 to 1.0
  refiner_version: RefinerVersionId;
  accepted: boolean;
  rejection_reason?: string;
  detected_constraints: ConstraintCheck[];
  eliminated_words_count: number;
  politeness_tokens_removed: number;
}

export interface RoutingDecision {
  request_id: string;
  task: TaskCategory;
  task_confidence: number;
  complexity: number; // 0.0 to 1.0
  selected_model: string;
  alternative_models: string[];
  reason: string;
  estimated_cost: number;
  rule_matched?: string;
  node_path?: string[];
}

export interface RequestRecord {
  id: string;
  timestamp: string;
  user_id: string;
  model_id: string;
  model_name: string;
  task_type: TaskCategory;
  original_prompt: string;
  refined_prompt: string;
  response_text: string;
  refine_enabled: boolean;
  refiner_version: RefinerVersionId;
  
  // Token stats
  input_tokens: number;
  original_tokens: number;
  output_tokens: number;
  total_tokens: number;
  tokens_saved: number;
  reduction_percentage: number;
  
  // Performance
  time_to_first_token_ms: number;
  latency_ms: number;
  tokens_per_second: number;
  
  // Financial
  original_cost: number;
  actual_cost: number;
  cost_saved: number;
  currency: 'USD' | 'INR' | 'EUR' | 'GBP';
  
  // Routing & quality
  routing_decision: RoutingDecision;
  semantic_similarity: number;
  constraints_preserved: boolean;
  status: 'success' | 'warning' | 'error';
  error_message?: string;
}

// Node Categorization Graph System
export type NodeType = 'input' | 'classifier' | 'constraint' | 'decision' | 'model';

export interface CategorizationNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  status: 'idle' | 'processing' | 'passed' | 'bypassed';
  metrics?: {
    confidence?: number;
    tokensIn?: number;
    tokensOut?: number;
    detectedKeywords?: string[];
    extractedConstraints?: string[];
    selectedCategory?: TaskCategory;
    selectedModel?: string;
  };
}

// Clerk Authentication & User Security System
export interface UserAccount {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  imageUrl?: string;
  role: 'admin' | 'developer' | 'viewer';
  authProvider: 'email' | 'google' | 'github';
  mfaEnabled: boolean;
  createdAt: string;
  lastSignInAt: string;
  activeSessionsCount: number;
  apiKeysCount: number;
}

export interface UserApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  scopes: string[];
}

export interface ZotSettings {
  theme: ThemeId;
  default_model: string;
  model_device: 'auto' | 'cuda:0' | 'mps' | 'cpu';
  generation_defaults: {
    temperature: number;
    max_new_tokens: number;
    top_p: number;
  };
  context_limit: number;
  default_refiner: RefinerVersionId;
  min_similarity_threshold: number;
  max_compression_limit: number;
  auto_refine_on_run: boolean;
  cost_currency: 'USD' | 'INR' | 'EUR' | 'GBP';
  currency_rates: {
    USD: number;
    INR: number;
    EUR: number;
    GBP: number;
  };
  api_gateway_url: string;
  request_timeout_ms: number;
  streaming_enabled: boolean;
  retention_days: number;
  simulation_speed: 'fast' | 'realistic' | 'instant';
  telemetry_auto_sync: boolean;
}

export interface SamplePrompt {
  id: string;
  title: string;
  category: TaskCategory;
  prompt: string;
  tags: string[];
  description: string;
}

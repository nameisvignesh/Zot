import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  AppTheme,
  HuggingFaceAuthState,
  Model, 
  RefinerVersion, 
  RefinerVersionId, 
  RequestRecord, 
  RoutingDecision, 
  TaskCategory, 
  ThemeId,
  UserAccount, 
  UserApiKey, 
  ZotSettings 
} from '../types';
import { 
  APP_THEMES,
  DEFAULT_SETTINGS, 
  FREE_HF_UNLIMITED_MODELS,
  INITIAL_API_KEYS, 
  INITIAL_MODELS, 
  INITIAL_REQUEST_HISTORY, 
  INITIAL_USER_ACCOUNT, 
  PAID_FRONTIER_MODELS,
  REFINER_VERSIONS 
} from '../data/mockData';
import { countTokens, refinePrompt } from '../lib/tokenizer';
import { routePrompt } from '../lib/routingEngine';

export type NavigationTab = 
  | 'dashboard'
  | 'routing'
  | 'refinement'
  | 'models'
  | 'analytics'
  | 'settings'
  | 'accounts';

export interface ExecutionPlanStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'skipped';
  durationMs?: number;
  outputSummary?: string;
}

interface ZotContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  
  // Themes
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themes: AppTheme[];

  // Hugging Face Authentication Gate & Unlimited Free Models
  hfAuthState: HuggingFaceAuthState;
  connectHuggingFace: (apiKey: string, username?: string) => Promise<boolean>;
  disconnectHuggingFace: () => void;
  fetchFreeUnlimitedModels: () => Promise<Model[]>;

  // Models
  models: Model[];
  paidModels: Model[];
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  toggleModelEnabled: (id: string) => void;
  updateModel: (model: Model) => void;
  addModel: (model: Omit<Model, 'created_at'>) => void;
  deleteModel: (id: string) => void;
  
  // Refiner
  refinerVersions: RefinerVersion[];
  activeRefinerVersion: RefinerVersionId;
  setActiveRefinerVersion: (v: RefinerVersionId) => void;
  
  // Telemetry Requests
  requests: RequestRecord[];
  activeRequest: RequestRecord | null;
  setActiveRequest: (req: RequestRecord | null) => void;
  clearHistory: () => void;
  
  // Settings
  settings: ZotSettings;
  updateSettings: (newSettings: Partial<ZotSettings>) => void;
  
  // Gateway Connectivity
  gatewayStatus: 'ready' | 'connecting' | 'error';
  gatewayPingMs: number;
  testGatewayConnection: () => Promise<void>;
  
  // Execution Engine & Multi-step Planner
  isExecuting: boolean;
  streamingOutput: string;
  lastExecutionMetrics: RequestRecord | null;
  executionPlan: ExecutionPlanStep[];
  runInference: (params: {
    prompt: string;
    refine: boolean;
    refinerVersion?: RefinerVersionId;
    preferredModelId?: string;
    targetTier?: 'free' | 'paid' | 'cascade';
    userId?: string;
    onStreamChunk?: (chunk: string) => void;
  }) => Promise<RequestRecord>;

  // Clerk Auth State
  userAccount: UserAccount | null;
  setUserAccount: (user: UserAccount | null) => void;
  updateUserProfile: (updates: Partial<UserAccount>) => void;
  apiKeys: UserApiKey[];
  createApiKey: (name: string, scopes: string[]) => UserApiKey;
  deleteApiKey: (id: string) => void;
  isAuthModalOpen: boolean;
  setIsAuthModalOpen: (open: boolean) => void;
  authModalMode: 'signIn' | 'signUp' | 'profile';
  setAuthModalMode: (mode: 'signIn' | 'signUp' | 'profile') => void;
  loginWithEmail: (email: string, fullName?: string) => void;
  loginWithOAuth: (provider: 'google' | 'github') => void;
  logout: () => void;

  // Formatting Helpers
  formatCurrency: (usdAmount: number) => string;
  convertCurrency: (usdAmount: number) => number;
}

const ZotContext = createContext<ZotContextType | undefined>(undefined);

export const ZotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  
  // Settings State with theme support
  const [settings, setSettings] = useState<ZotSettings>(() => {
    try {
      const saved = localStorage.getItem('zot_settings_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
      return DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const [theme, setThemeState] = useState<ThemeId>(() => {
    try {
      const savedTheme = localStorage.getItem('zot_theme_v2') as ThemeId;
      if (savedTheme && APP_THEMES.some(t => t.id === savedTheme)) {
        return savedTheme;
      }
      return settings.theme || 'amber-zero';
    } catch {
      return 'amber-zero';
    }
  });

  // Hugging Face Auth Gate State
  const [hfAuthState, setHfAuthState] = useState<HuggingFaceAuthState>(() => {
    try {
      const saved = localStorage.getItem('zot_hf_auth');
      return saved ? JSON.parse(saved) : {
        isConnected: false,
        apiKey: '',
        username: '',
        verifiedAt: null,
        onlyFreeUnlimitedModels: true,
        availableFreeModelsCount: 7
      };
    } catch {
      return {
        isConnected: false,
        apiKey: '',
        username: '',
        verifiedAt: null,
        onlyFreeUnlimitedModels: true,
        availableFreeModelsCount: 7
      };
    }
  });

  // Models State (Free division)
  const [models, setModels] = useState<Model[]>(() => {
    try {
      const saved = localStorage.getItem('zot_models_v2');
      return saved ? JSON.parse(saved) : INITIAL_MODELS;
    } catch {
      return INITIAL_MODELS;
    }
  });

  // Paid Frontier Models
  const [paidModels] = useState<Model[]>(PAID_FRONTIER_MODELS);

  // Requests History State
  const [requests, setRequests] = useState<RequestRecord[]>(() => {
    try {
      const saved = localStorage.getItem('zot_requests_v2');
      return saved ? JSON.parse(saved) : INITIAL_REQUEST_HISTORY;
    } catch {
      return INITIAL_REQUEST_HISTORY;
    }
  });

  const [activeRequest, setActiveRequest] = useState<RequestRecord | null>(null);

  // Clerk Auth State
  const [userAccount, setUserAccount] = useState<UserAccount | null>(() => {
    try {
      const saved = localStorage.getItem('zot_user_clerk');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.imageUrl && typeof parsed.imageUrl === 'string' && parsed.imageUrl.includes('unsplash.com')) {
          parsed.imageUrl = undefined;
        }
        return parsed;
      }
      return INITIAL_USER_ACCOUNT;
    } catch {
      return INITIAL_USER_ACCOUNT;
    }
  });

  const [apiKeys, setApiKeys] = useState<UserApiKey[]>(() => {
    try {
      const saved = localStorage.getItem('zot_api_keys');
      return saved ? JSON.parse(saved) : INITIAL_API_KEYS;
    } catch {
      return INITIAL_API_KEYS;
    }
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'signIn' | 'signUp' | 'profile'>('signIn');

  const [activeRefinerVersion, setActiveRefinerVersion] = useState<RefinerVersionId>(settings.default_refiner);
  const [gatewayStatus, setGatewayStatus] = useState<'ready' | 'connecting' | 'error'>('ready');
  const [gatewayPingMs, setGatewayPingMs] = useState<number>(3);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [streamingOutput, setStreamingOutput] = useState<string>('');
  const [lastExecutionMetrics, setLastExecutionMetrics] = useState<RequestRecord | null>(null);
  const [executionPlan, setExecutionPlan] = useState<ExecutionPlanStep[]>([]);

  // Apply dynamic theme to root element
  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    setSettings(prev => ({ ...prev, theme: newTheme }));
    localStorage.setItem('zot_theme_v2', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('zot_theme_v2', theme);
  }, [theme]);

  // Synchronize Local Storage
  useEffect(() => {
    localStorage.setItem('zot_models_v2', JSON.stringify(models));
  }, [models]);

  useEffect(() => {
    localStorage.setItem('zot_requests_v2', JSON.stringify(requests));
  }, [requests]);

  useEffect(() => {
    localStorage.setItem('zot_settings_v2', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('zot_hf_auth', JSON.stringify(hfAuthState));
  }, [hfAuthState]);

  useEffect(() => {
    if (userAccount) {
      localStorage.setItem('zot_user_clerk', JSON.stringify(userAccount));
    } else {
      localStorage.removeItem('zot_user_clerk');
    }
  }, [userAccount]);

  useEffect(() => {
    localStorage.setItem('zot_api_keys', JSON.stringify(apiKeys));
  }, [apiKeys]);

  // Hugging Face Connection handler (fetches free unlimited models)
  const connectHuggingFace = async (apiKey: string, username?: string): Promise<boolean> => {
    await new Promise(r => setTimeout(r, 600));
    const cleanKey = apiKey.trim();
    const uname = username?.trim() || (cleanKey.startsWith('hf_') ? 'hf_developer' : 'community_user');
    
    const newAuthState: HuggingFaceAuthState = {
      isConnected: true,
      apiKey: cleanKey || 'hf_community_token_verified',
      username: uname,
      verifiedAt: new Date().toISOString(),
      onlyFreeUnlimitedModels: true,
      availableFreeModelsCount: FREE_HF_UNLIMITED_MODELS.length
    };

    setHfAuthState(newAuthState);
    localStorage.setItem('zot_hf_auth', JSON.stringify(newAuthState));
    
    // Automatically populate and filter only free unlimited models
    setModels(FREE_HF_UNLIMITED_MODELS);
    return true;
  };

  const disconnectHuggingFace = () => {
    const emptyState: HuggingFaceAuthState = {
      isConnected: false,
      apiKey: '',
      username: '',
      verifiedAt: null,
      onlyFreeUnlimitedModels: true,
      availableFreeModelsCount: INITIAL_MODELS.length
    };
    setHfAuthState(emptyState);
    localStorage.setItem('zot_hf_auth', JSON.stringify(emptyState));
  };

  const fetchFreeUnlimitedModels = async (): Promise<Model[]> => {
    await new Promise(r => setTimeout(r, 450));
    const freeOnly = FREE_HF_UNLIMITED_MODELS.filter(m => m.is_free && m.input_cost_per_1k === 0);
    setModels(freeOnly);
    setHfAuthState(prev => ({ ...prev, availableFreeModelsCount: freeOnly.length }));
    return freeOnly;
  };

  const toggleModelEnabled = (id: string) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const updateModel = (updated: Model) => {
    setModels(prev => prev.map(m => m.id === updated.id ? updated : m));
  };

  const addModel = (modelData: Omit<Model, 'created_at'>) => {
    const newModel: Model = {
      ...modelData,
      created_at: new Date().toISOString()
    };
    setModels(prev => [...prev, newModel]);
  };

  const deleteModel = (id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
  };

  const updateSettings = (newSettings: Partial<ZotSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.theme) {
        setThemeState(newSettings.theme);
        localStorage.setItem('zot_theme_v2', newSettings.theme);
      }
      return updated;
    });
  };

  const updateUserProfile = (updates: Partial<UserAccount>) => {
    setUserAccount(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      localStorage.setItem('zot_user_clerk', JSON.stringify(updated));
      return updated;
    });
  };

  const clearHistory = () => {
    setRequests([]);
    localStorage.removeItem('zot_requests_v2');
  };

  // Clerk Auth functions
  const loginWithEmail = (email: string, fullName: string = 'Authorized Developer') => {
    const parts = fullName.split(' ');
    const firstName = parts[0] || 'Developer';
    const lastName = parts.slice(1).join(' ') || 'User';
    const user: UserAccount = {
      id: `user_${Date.now().toString(36)}`,
      email: email || 'user@example.com',
      firstName,
      lastName,
      imageUrl: undefined,
      role: 'admin',
      authProvider: 'email',
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
      lastSignInAt: new Date().toISOString(),
      activeSessionsCount: 1,
      apiKeysCount: apiKeys.length
    };
    setUserAccount(user);
    setIsAuthModalOpen(false);
  };

  const loginWithOAuth = (provider: 'google' | 'github') => {
    const user: UserAccount = {
      id: `user_${provider}_${Date.now().toString(36)}`,
      email: provider === 'google' ? 'karthiviki125@gmail.com' : 'developer@github.com',
      firstName: provider === 'google' ? 'Karthi' : 'GitHub',
      lastName: provider === 'google' ? 'Viki' : 'Developer',
      imageUrl: undefined,
      role: 'admin',
      authProvider: provider,
      mfaEnabled: true,
      createdAt: '2026-08-01T10:00:00Z',
      lastSignInAt: new Date().toISOString(),
      activeSessionsCount: 2,
      apiKeysCount: apiKeys.length
    };
    setUserAccount(user);
    setIsAuthModalOpen(false);
  };

  const logout = () => {
    setUserAccount(null);
  };

  const createApiKey = (name: string, scopes: string[]): UserApiKey => {
    const rand = Math.random().toString(36).substring(2, 8);
    const newKey: UserApiKey = {
      id: `key_${Date.now().toString(36)}`,
      name: name || 'Default Gateway Token',
      prefix: `zot_live_${rand}...${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      scopes: scopes.length > 0 ? scopes : ['router:read', 'router:write']
    };
    setApiKeys(prev => [newKey, ...prev]);
    return newKey;
  };

  const deleteApiKey = (id: string) => {
    setApiKeys(prev => prev.filter(k => k.id !== id));
  };

  const testGatewayConnection = async () => {
    setGatewayStatus('connecting');
    const start = performance.now();
    await new Promise(resolve => setTimeout(resolve, 250));
    const duration = Math.round(performance.now() - start);
    setGatewayPingMs(duration);
    setGatewayStatus('ready');
  };

  // Currency Converter
  const convertCurrency = (usdAmount: number): number => {
    const rate = settings.currency_rates[settings.cost_currency] || 1.0;
    return usdAmount * rate;
  };

  const formatCurrency = (usdAmount: number): string => {
    const currency = settings.cost_currency;
    const value = convertCurrency(usdAmount);
    
    if (currency === 'USD') {
      if (value === 0) return '$0.00 (Free)';
      if (value < 0.0001 && value > 0) return `$${value.toFixed(6)}`;
      return `$${value.toFixed(4)}`;
    }
    if (currency === 'INR') {
      if (value === 0) return '₹0.00 (Free)';
      return `₹${value.toFixed(4)}`;
    }
    if (currency === 'EUR') {
      if (value === 0) return '€0.00 (Free)';
      return `€${value.toFixed(4)}`;
    }
    if (currency === 'GBP') {
      if (value === 0) return '£0.00 (Free)';
      return `£${value.toFixed(4)}`;
    }
    return `$${value.toFixed(4)}`;
  };

  // "Plan multiple first and then execute" engine
  const runInference = async (params: {
    prompt: string;
    refine: boolean;
    refinerVersion?: RefinerVersionId;
    preferredModelId?: string;
    targetTier?: 'free' | 'paid' | 'cascade';
    userId?: string;
    onStreamChunk?: (chunk: string) => void;
  }): Promise<RequestRecord> => {
    setIsExecuting(true);
    setStreamingOutput('');
    const startTime = performance.now();

    const versionToUse = params.refinerVersion || activeRefinerVersion;
    const userId = params.userId || userAccount?.id || 'user_clerk_01';

    // Step 0: Plan multiple stages first
    const initialPlan: ExecutionPlanStep[] = [
      {
        id: 'plan_1_tokenize',
        title: 'Step 1: Invariant Analysis & Tokenization',
        description: 'Extract entities, numerical constants, code boundaries, and negative constraints',
        status: 'pending'
      },
      {
        id: 'plan_2_refine',
        title: 'Step 2: Semantic Compression & Pruning',
        description: params.refine ? `Run refiner v${versionToUse} with constraint preservation checks` : 'Bypass compression (Raw Prompt passthrough)',
        status: 'pending'
      },
      {
        id: 'plan_3_route',
        title: 'Step 3: Zero-Shot Intent Routing & Tier Dispatch',
        description: 'Classify task domain and select target from Free Unlimited / Paid Frontier pool',
        status: 'pending'
      },
      {
        id: 'plan_4_execute',
        title: 'Step 4: Inference Execution & Output Stream',
        description: 'Execute model inference and stream token output with sub-500ms latency',
        status: 'pending'
      },
      {
        id: 'plan_5_telemetry',
        title: 'Step 5: Telemetry Sink & Savings Verification',
        description: 'Record tokens saved, verify constraints, and commit telemetry to local storage',
        status: 'pending'
      }
    ];

    setExecutionPlan(initialPlan);

    // Stage 1: Tokenization
    setExecutionPlan(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: 'running' } : s));
    await new Promise(r => setTimeout(r, 60));
    const originalTokens = countTokens(params.prompt);
    setExecutionPlan(prev => prev.map((s, idx) => idx === 0 ? { ...s, status: 'completed', durationMs: 24, outputSummary: `${originalTokens} raw tokens mapped` } : s));

    // Stage 2: Compression / Refinement
    setExecutionPlan(prev => prev.map((s, idx) => idx === 1 ? { ...s, status: 'running' } : s));
    let processedPrompt = params.prompt;
    let refinementMetrics = null;

    if (params.refine) {
      const refResult = refinePrompt(params.prompt, versionToUse, settings.min_similarity_threshold);
      processedPrompt = refResult.refinedText;
      refinementMetrics = refResult.metrics;
      await new Promise(r => setTimeout(r, 80));
    }
    const inputTokens = params.refine ? countTokens(processedPrompt) : originalTokens;
    const tokensSaved = Math.max(0, originalTokens - inputTokens);
    const reductionPct = originalTokens > 0 ? Number(((tokensSaved / originalTokens) * 100).toFixed(1)) : 0;
    setExecutionPlan(prev => prev.map((s, idx) => idx === 1 ? { ...s, status: 'completed', durationMs: 42, outputSummary: params.refine ? `${inputTokens} tokens (-${reductionPct}%)` : 'Raw tokens passed' } : s));

    // Stage 3: Routing & Tier Selection
    setExecutionPlan(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'running' } : s));
    const targetPool = params.targetTier === 'paid' ? paidModels : models;
    const routingDecision: RoutingDecision = routePrompt(processedPrompt, targetPool, params.preferredModelId);
    let selectedModel = targetPool.find(m => m.id === routingDecision.selected_model) || targetPool[0];
    
    // If cascade is requested and complexity is very high, dispatch to frontier paid model
    if (params.targetTier === 'cascade' && routingDecision.task_confidence < 0.75 && paidModels.length > 0) {
      selectedModel = paidModels[0];
    }
    await new Promise(r => setTimeout(r, 70));
    setExecutionPlan(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'completed', durationMs: 35, outputSummary: `${routingDecision.task} → ${selectedModel.name}` } : s));

    // Stage 4: Inference Execution & Streaming
    setExecutionPlan(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'running' } : s));
    
    let generatedResponse = '';
    const task = routingDecision.task;
    const promptLower = (processedPrompt || '').toLowerCase();

    if (task === 'Coding') {
      if (promptLower.includes('even numbers')) {
        generatedResponse = `\`\`\`python\ndef get_even_numbers(numbers: list[int]) -> list[int]:\n    """Filter and return only even integers from input list without NumPy."""\n    return [num for num in numbers if num % 2 == 0]\n\n# Verification test:\n# print(get_even_numbers([1, 2, 3, 4, 5, 6, 7, 8])) # Output: [2, 4, 6, 8]\n\`\`\``;
      } else if (promptLower.includes('sql') || promptLower.includes('database')) {
        generatedResponse = `\`\`\`sql\n-- Optimized with composite btree index for high-cardinality lookups\nCREATE INDEX idx_req_user_latency ON requests (user_id, status, latency_ms DESC);\n\n-- Verified zero sequential scan bottleneck\nEXPLAIN QUERY PLAN\nSELECT id, user_id, tokens_saved, latency_ms \nFROM requests \nWHERE user_id = ? AND status = 'success' \nORDER BY latency_ms DESC LIMIT 20;\n\`\`\``;
      } else {
        generatedResponse = `\`\`\`typescript\n// Generated by ZOT Zero-Shot Gateway (${selectedModel.name})\nexport function optimizePipeline<T>(items: T[], filterFn: (x: T) => boolean): T[] {\n  return items.filter(filterFn);\n}\n\`\`\``;
      }
    } else if (task === 'Summarization') {
      generatedResponse = `**Concise Summary**: ${(processedPrompt || '').replace(/^(?:summarize|explain|give a summary of)/i, '').trim()}\n\n1. **Core Mechanism**: Zero-shot categorization routes tokens directly to the most efficient 100% free model.\n2. **Preservation**: Invariant constraint filters strip verbal politeness without altering payload semantics.\n3. **Result**: Zero inference cost with sub-500ms deterministic response.`;
    } else if (task === 'Extraction') {
      generatedResponse = `\`\`\`json\n{\n  "status": "success",\n  "model_routed": "${selectedModel.name}",\n  "tier": "${selectedModel.tier || 'free'}",\n  "is_free": ${selectedModel.is_free},\n  "data": {\n    "client_ips": ["192.168.1.104", "10.0.4.12", "172.16.0.89"],\n    "status_code": 500,\n    "raw_query_strings_excluded": true\n  }\n}\n\`\`\``;
    } else if (task === 'Reasoning') {
      generatedResponse = `### Distributed Architecture & Optimization Analysis\n\n1. **Node Processing**: Input tokens analyzed against ${selectedModel.name} context boundary.\n2. **Constraint Verification**: Verified 100% preservation of strict technical parameters.\n3. **Recommendation**: Local open-weight inference guarantees complete privacy and 0% billing overhead.`;
    } else {
      generatedResponse = `Machine learning algorithms allow computers to learn patterns directly from empirical data rather than relying on rigid hand-crafted rules.\n\nKey pillars:\n- **Input Data**: Raw training examples representing the domain.\n- **Loss Function**: Mathematical measure of prediction error.\n- **Gradient Optimization**: Iterative weight adjustment to minimize loss over time.`;
    }

    const outputTokens = countTokens(generatedResponse);
    const timeToFirstToken = Math.round(selectedModel.latency_ms_avg * 0.28);
    
    if (settings.streaming_enabled && settings.simulation_speed !== 'instant') {
      const words = generatedResponse.split(' ');
      let current = '';
      for (let i = 0; i < words.length; i++) {
        current += (i > 0 ? ' ' : '') + words[i];
        setStreamingOutput(current);
        if (params.onStreamChunk) params.onStreamChunk(current);
        const delay = settings.simulation_speed === 'fast' ? 10 : 20;
        await new Promise(r => setTimeout(r, delay));
      }
    } else {
      setStreamingOutput(generatedResponse);
      if (params.onStreamChunk) params.onStreamChunk(generatedResponse);
    }

    setExecutionPlan(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'completed', durationMs: selectedModel.latency_ms_avg, outputSummary: `${outputTokens} tokens streamed` } : s));

    // Stage 5: Telemetry Sink
    setExecutionPlan(prev => prev.map((s, idx) => idx === 4 ? { ...s, status: 'running' } : s));
    const totalDuration = Math.round(performance.now() - startTime);
    const tokensPerSec = Number(((outputTokens / (Math.max(1, totalDuration) / 1000))).toFixed(1));

    const newRecord: RequestRecord = {
      id: `req_${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      user_id: userId,
      model_id: selectedModel.id,
      model_name: selectedModel.name,
      task_type: routingDecision.task,
      original_prompt: params.prompt,
      refined_prompt: processedPrompt,
      response_text: generatedResponse,
      refine_enabled: params.refine,
      refiner_version: versionToUse,
      input_tokens: inputTokens,
      original_tokens: originalTokens,
      output_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
      tokens_saved: tokensSaved,
      reduction_percentage: reductionPct,
      time_to_first_token_ms: timeToFirstToken,
      latency_ms: totalDuration,
      tokens_per_second: tokensPerSec,
      original_cost: selectedModel.is_free ? 0.0 : (originalTokens * selectedModel.input_cost_per_1k / 1000),
      actual_cost: selectedModel.is_free ? 0.0 : (inputTokens * selectedModel.input_cost_per_1k / 1000 + outputTokens * selectedModel.output_cost_per_1k / 1000),
      cost_saved: Number((tokensSaved * 0.00001).toFixed(6)),
      currency: settings.cost_currency,
      routing_decision: routingDecision,
      semantic_similarity: refinementMetrics?.semantic_similarity ?? 1.0,
      constraints_preserved: refinementMetrics?.accepted ?? true,
      status: 'success'
    };

    setRequests(prev => [newRecord, ...prev]);
    setLastExecutionMetrics(newRecord);
    setExecutionPlan(prev => prev.map((s, idx) => idx === 4 ? { ...s, status: 'completed', durationMs: 12, outputSummary: `Saved ${tokensSaved} tokens • Zero-cost confirmed` } : s));
    setIsExecuting(false);
    return newRecord;
  };

  return (
    <ZotContext.Provider value={{
      activeTab,
      setActiveTab,
      theme,
      setTheme,
      themes: APP_THEMES,
      hfAuthState,
      connectHuggingFace,
      disconnectHuggingFace,
      fetchFreeUnlimitedModels,
      models,
      paidModels,
      setModels,
      toggleModelEnabled,
      updateModel,
      addModel,
      deleteModel,
      refinerVersions: REFINER_VERSIONS,
      activeRefinerVersion,
      setActiveRefinerVersion,
      requests,
      activeRequest,
      setActiveRequest,
      clearHistory,
      settings,
      updateSettings,
      gatewayStatus,
      gatewayPingMs,
      testGatewayConnection,
      isExecuting,
      streamingOutput,
      lastExecutionMetrics,
      executionPlan,
      runInference,
      userAccount,
      setUserAccount,
      updateUserProfile,
      apiKeys,
      createApiKey,
      deleteApiKey,
      isAuthModalOpen,
      setIsAuthModalOpen,
      authModalMode,
      setAuthModalMode,
      loginWithEmail,
      loginWithOAuth,
      logout,
      formatCurrency,
      convertCurrency
    }}>
      {children}
    </ZotContext.Provider>
  );
};

export const useZot = () => {
  const context = useContext(ZotContext);
  if (!context) {
    throw new Error('useZot must be used within a ZotProvider');
  }
  return context;
};


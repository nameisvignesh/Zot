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
  LOCAL_LFM_MODEL,
  PAID_FRONTIER_MODELS,
  REFINER_VERSIONS 
} from '../data/mockData';
import { countTokens, refinePrompt } from '../lib/tokenizer';
import { routePrompt } from '../lib/routingEngine';
import { translate } from '../lib/i18n';
import { fetchPublicModelCatalog } from '../lib/publicModelCatalog';
import { requestModelChat } from '../lib/modelClient';

export type NavigationTab = 
  | 'dashboard'
  | 'routing'
  | 'refinement'
  | 'models'
  | 'analytics'
  | 'cost-analytics'
  | 'settings'
  | 'playground';

export interface ExecutionPlanStep {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'warning' | 'skipped' | 'bypassed';
  durationMs?: number;
  outputSummary?: string;
}

interface ZotContextType {
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  requestNavigation: (tab: NavigationTab) => void;
  
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
  modelToEditId: string | null;
  requestModelEdit: (id: string) => void;
  clearModelEdit: () => void;
  setModels: React.Dispatch<React.SetStateAction<Model[]>>;
  toggleModelEnabled: (id: string) => void;
  updateModel: (model: Model, previousId?: string) => void;
  addModel: (model: Omit<Model, 'created_at'>) => void;
  deleteModel: (id: string) => void;
  publicModels: Model[];
  publicModelsLoading: boolean;
  publicModelsError: string;
  refreshPublicModels: () => Promise<void>;
  
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
  settingsDraft: ZotSettings;
  updateSettingsDraft: (newSettings: Partial<ZotSettings>) => void;
  commitSettingsDraft: () => void;
  discardSettingsDraft: () => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  settingsDirty: boolean;
  markSettingsDirty: () => void;
  markSettingsSaved: () => void;
  
  // Gateway Connectivity
  gatewayStatus: 'ready' | 'connecting' | 'error';
  gatewayPingMs: number;
  testGatewayConnection: () => Promise<void>;
  reportConnectionStatus: (status: 'ready' | 'error') => void;
  
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
  canAffordRequest: (estimatedUsd: number) => boolean;
  costLimitReached: boolean;
}

const ZotContext = createContext<ZotContextType | undefined>(undefined);

const readStoredValue = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed === null ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
};

const isObjectRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
);

/**
 * Unwrap values written by the versioned persistence format. Older builds
 * could persist an already-wrapped value, so unwrap a few layers defensively
 * before handing state to the components that consume it.
 */
const unwrapStoredValue = (value: unknown): unknown => {
  let current = value;

  for (let depth = 0; depth < 3; depth += 1) {
    if (!isObjectRecord(current) || !('value' in current)) break;
    current = current.value;
  }

  return current;
};

const getStoredValue = <T,>(
  key: string,
  fallback: T,
  validate?: (value: unknown) => boolean,
): T => {
  const stored = unwrapStoredValue(readStoredValue<unknown>(key, fallback));

  if (stored === null || stored === undefined) return fallback;
  if (validate && !validate(stored)) return fallback;

  return stored as T;
};

const writeStoredValue = <T,>(key: string, value: T) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify({ version: 2, value }));
  } catch {
    // Ignore quota or privacy restrictions.
  }
};

export const ZotProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [settingsDirty, setSettingsDirty] = useState(false);
  
  // Settings State with theme support
  const [settings, setSettings] = useState<ZotSettings>(() => {
    const merged = getStoredValue<Partial<ZotSettings>>('zot_settings_v2', {}, isObjectRecord);
    return { ...DEFAULT_SETTINGS, ...merged, cost_currency: merged.cost_currency || 'INR' } as ZotSettings;
  });
  const [settingsDraft, setSettingsDraft] = useState<ZotSettings>(() => settings);

  const [theme, setThemeState] = useState<ThemeId>(() => {
    const savedTheme = typeof window !== 'undefined' ? window.localStorage.getItem('zot_theme_v2') : null;
    if (savedTheme && APP_THEMES.some(t => t.id === savedTheme)) {
      return savedTheme as ThemeId;
    }
    return settings.theme || 'amber-zero';
  });

  // Hugging Face Auth Gate State
  const [hfAuthState, setHfAuthState] = useState<HuggingFaceAuthState>(() => {
    const saved = getStoredValue<Partial<HuggingFaceAuthState>>('zot_hf_auth', {}, isObjectRecord);
    return {
      isConnected: false,
      apiKey: '',
      username: '',
      verifiedAt: null,
      onlyFreeUnlimitedModels: true,
      availableFreeModelsCount: 7,
      ...saved
    } as HuggingFaceAuthState;
  });

  // Models State (Free division)
  const [models, setModels] = useState<Model[]>(() => {
    const saved = getStoredValue<Model[]>('zot_models_v2', [], Array.isArray);
    const configured = saved.filter(model => !model.is_builtin && model.endpoint !== LOCAL_LFM_MODEL.endpoint).map(model => {
      const isLocalhost = model.endpoint.startsWith('http://localhost:11434/') || model.endpoint.startsWith('http://127.0.0.1:11434/');
      const isGoogle = /google|gemini/i.test(model.provider);
      const migrateGoogleEndpoint = isGoogle && model.endpoint.includes('openrouter.ai');
      const id = migrateGoogleEndpoint ? model.id.replace(/^public:/, '').split('/').pop()!.replace(/^(gemini)-(\d+)-(\d+)(-.+)?$/, '$1-$2.$3$4') : model.id;
      return {
        ...model,
        id,
        endpoint: migrateGoogleEndpoint ? 'https://generativelanguage.googleapis.com/v1beta' : model.endpoint,
        connection_mode: model.connection_mode || (model.type === 'local' ? 'local' : 'api'),
        type: isLocalhost ? 'local' : model.type,
      };
    });
    return configured;
  });
  const [modelToEditId, setModelToEditId] = useState<string | null>(null);
  const requestModelEdit = (id: string) => {
    setModelToEditId(id);
    setActiveTab('models');
  };
  const clearModelEdit = () => setModelToEditId(null);

  const [publicModels, setPublicModels] = useState<Model[]>([]);
  const [publicModelsLoading, setPublicModelsLoading] = useState(false);
  const [publicModelsError, setPublicModelsError] = useState('');

  // Paid Frontier Models
  const [paidModels] = useState<Model[]>(PAID_FRONTIER_MODELS);

  // Requests History State
  const [requests, setRequests] = useState<RequestRecord[]>(() => {
    const stored = getStoredValue<RequestRecord[]>('zot_requests_v2', INITIAL_REQUEST_HISTORY, Array.isArray);
    const configuredModelIds = new Set(models.map(model => model.id));

    // Ignore records from models that were removed from the new minimal router.
    // This keeps the Analytics page aligned with the currently configured model registry.
    return stored.filter(request => configuredModelIds.has(request.model_id) && !request.id.startsWith('req_01JZOT'));
  });

  const [activeRequest, setActiveRequest] = useState<RequestRecord | null>(null);

  // Clerk Auth State
  const [userAccount, setUserAccount] = useState<UserAccount | null>(() => {
    const parsed = getStoredValue<Partial<UserAccount> | UserAccount>('zot_user_clerk', INITIAL_USER_ACCOUNT, isObjectRecord);
    if (parsed && typeof parsed === 'object' && 'imageUrl' in parsed && typeof parsed.imageUrl === 'string' && parsed.imageUrl.includes('unsplash.com')) {
      parsed.imageUrl = undefined;
    }
    return parsed as UserAccount;
  });

  const [apiKeys, setApiKeys] = useState<UserApiKey[]>(() => {
    return getStoredValue<UserApiKey[]>('zot_api_keys', INITIAL_API_KEYS, Array.isArray);
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
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('zot_theme_v2', newTheme);
    }
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('zot_theme_v2', theme);
    }
  }, [theme]);

  // Synchronize Local Storage
  useEffect(() => {
    writeStoredValue('zot_models_v2', models);
  }, [models]);

  useEffect(() => {
    writeStoredValue('zot_requests_v2', requests);
  }, [requests]);

  useEffect(() => {
    writeStoredValue('zot_settings_v2', settings);
  }, [settings]);

  useEffect(() => {
    if (!settingsDirty) setSettingsDraft(settings);
  }, [settings, settingsDirty]);

  useEffect(() => {
    const controller = new AbortController();
    setPublicModelsLoading(true);
    fetchPublicModelCatalog(controller.signal)
      .then(catalog => {
        setPublicModels(catalog);
        setPublicModelsError('');
      })
      .catch(error => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setPublicModelsError(error instanceof Error ? error.message : 'Unable to load the public model catalog.');
      })
      .finally(() => setPublicModelsLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    writeStoredValue('zot_hf_auth', hfAuthState);
  }, [hfAuthState]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (userAccount) {
      writeStoredValue('zot_user_clerk', userAccount);
    } else {
      window.localStorage.removeItem('zot_user_clerk');
    }
  }, [userAccount]);

  useEffect(() => {
    writeStoredValue('zot_api_keys', apiKeys);
  }, [apiKeys]);

  // Hugging Face Connection handler (fetches free unlimited models)
  const connectHuggingFace = async (apiKey: string, username?: string): Promise<boolean> => {
    const cleanKey = apiKey.trim();
    if (!cleanKey.startsWith('hf_')) return false;
    const response = await fetch('https://huggingface.co/api/whoami-v2', { headers: { Authorization: `Bearer ${cleanKey}` } });
    if (!response.ok) return false;
    const profile = await response.json();
    const uname = username?.trim() || profile?.name || profile?.fullname || 'Hugging Face user';
    
    const newAuthState: HuggingFaceAuthState = {
      isConnected: true,
      apiKey: cleanKey,
      username: uname,
      verifiedAt: new Date().toISOString(),
      onlyFreeUnlimitedModels: true,
      availableFreeModelsCount: FREE_HF_UNLIMITED_MODELS.length
    };

    setHfAuthState(newAuthState);
    writeStoredValue('zot_hf_auth', newAuthState);

    // HF access gates refinement, but does not silently add models to the router.
    // Models become routable only after the user configures their provider key and endpoint.
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
    writeStoredValue('zot_hf_auth', emptyState);
  };

  const fetchFreeUnlimitedModels = async (): Promise<Model[]> => {
    const freeOnly = FREE_HF_UNLIMITED_MODELS.filter(model => model.is_free && (model.type === 'local' || Boolean(model.api_key)));
    setModels(freeOnly);
    setHfAuthState(prev => ({ ...prev, availableFreeModelsCount: freeOnly.length }));
    return freeOnly;
  };

  const toggleModelEnabled = (id: string) => {
    setModels(prev => prev.map(m => m.id === id ? { ...m, enabled: !m.enabled } : m));
  };

  const updateModel = (updated: Model, previousId = updated.id) => {
    setModels(prev => prev.map(m => m.id === previousId ? updated : m));
  };

  const addModel = (modelData: Omit<Model, 'created_at'>) => {
    const newModel: Model = {
      ...modelData,
      created_at: new Date().toISOString()
    };
    setModels(prev => {
      const exists = prev.some(model => model.id === newModel.id);
      return exists
        ? prev.map(model => model.id === newModel.id ? { ...model, ...newModel, enabled: true } : model)
        : [...prev, newModel];
    });
  };

  const deleteModel = (id: string) => {
    setModels(prev => prev.filter(m => m.id !== id));
  };

  const refreshPublicModels = async () => {
    setPublicModelsLoading(true);
    setPublicModelsError('');
    try {
      setPublicModels(await fetchPublicModelCatalog());
    } catch (error) {
      setPublicModelsError(error instanceof Error ? error.message : 'Unable to load the public model catalog.');
    } finally {
      setPublicModelsLoading(false);
    }
  };

  const updateSettings = (newSettings: Partial<ZotSettings>) => {
    setSettingsDraft(prev => ({ ...prev, ...newSettings }));
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      if (newSettings.theme) {
        setThemeState(newSettings.theme);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('zot_theme_v2', newSettings.theme);
        }
      }
      return updated;
    });
  };

  const updateSettingsDraft = (newSettings: Partial<ZotSettings>) => {
    setSettingsDraft(prev => ({ ...prev, ...newSettings }));
    setSettingsDirty(true);
  };

  const commitSettingsDraft = () => {
    updateSettings(settingsDraft);
    setSettingsDirty(false);
  };

  const discardSettingsDraft = () => {
    setSettingsDraft(settings);
    setSettingsDirty(false);
  };

  const requestNavigation = (tab: NavigationTab) => {
    if (tab === activeTab) return;
    if (activeTab === 'settings' && settingsDirty) {
      const shouldSave = window.confirm('Do you want to save these preferences before leaving? Press Cancel to leave without saving.');
      if (shouldSave) commitSettingsDraft();
      else discardSettingsDraft();
    }
    setActiveTab(tab);
  };

  const markSettingsDirty = () => setSettingsDirty(true);
  const markSettingsSaved = () => setSettingsDirty(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !settingsDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [settingsDirty]);

  const t = (key: string, values: Record<string, string | number> = {}) => translate(settings.language, key, values);

  const updateUserProfile = (updates: Partial<UserAccount>) => {
    setUserAccount(prev => {
      if (!prev) return null;
      const updated = { ...prev, ...updates };
      writeStoredValue('zot_user_clerk', updated);
      return updated;
    });
  };

  const clearHistory = () => {
    setRequests([]);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('zot_requests_v2');
    }
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

  const reportConnectionStatus = (status: 'ready' | 'error') => setGatewayStatus(status);

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

  const spendThisMonth = requests.reduce((sum, request) => {
    const requestDate = new Date(request.timestamp);
    const now = new Date();
    return request.status === 'success' && requestDate.getFullYear() === now.getFullYear() && requestDate.getMonth() === now.getMonth()
      ? sum + request.actual_cost
      : sum;
  }, 0);
  const costLimitReached = convertCurrency(spendThisMonth) >= settings.monthly_cost_limit;
  const canAffordRequest = (estimatedUsd: number) => convertCurrency(spendThisMonth + Math.max(0, estimatedUsd)) <= settings.monthly_cost_limit;
  useEffect(() => {
    if (typeof window === 'undefined' || !costLimitReached) return;
    const alertKey = `zot-cost-limit-alert-${new Date().getFullYear()}-${new Date().getMonth()}`;
    if (window.sessionStorage.getItem(alertKey) === 'shown') return;
    window.sessionStorage.setItem(alertKey, 'shown');
    window.alert(`Monthly cost limit reached. Current spend: ${formatCurrency(spendThisMonth)}.`);
  }, [costLimitReached]);

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
    if (costLimitReached) throw new Error(`Monthly spending limit reached (${formatCurrency(spendThisMonth)} of ${formatCurrency(settings.monthly_cost_limit / (settings.currency_rates[settings.cost_currency] || 1))}). Increase the limit in Settings to continue.`);
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
        title: 'Step 4: Model Execution',
        description: 'Send the processed prompt to the selected configured model and capture its response',
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
    try {

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
    const targetPool = params.targetTier === 'paid'
      ? paidModels.filter(model => model.enabled && model.status !== 'offline')
      : models.filter(model => model.enabled && model.status !== 'offline');
    const routingDecision: RoutingDecision = routePrompt(processedPrompt, targetPool, params.preferredModelId);
    let selectedModel = targetPool.find(m => m.id === routingDecision.selected_model);
    
    // If cascade is requested and complexity is very high, dispatch to frontier paid model
    if (params.targetTier === 'cascade' && routingDecision.task_confidence < 0.75) {
      selectedModel = paidModels.find(model => model.enabled && model.status !== 'offline') || selectedModel;
    }
    if (!selectedModel) {
      setIsExecuting(false);
      throw new Error('No enabled model is available. Configure and enable a model on the Models page.');
    }
    const inputEstimate = countTokens(processedPrompt) * selectedModel.input_cost_per_1k / 1000;
    const outputEstimate = Math.max(50, Math.round(countTokens(processedPrompt) * 1.8)) * selectedModel.output_cost_per_1k / 1000;
    if (!canAffordRequest(inputEstimate + outputEstimate)) {
      setIsExecuting(false);
      throw new Error(`This request may exceed the monthly spending limit of ${formatCurrency(settings.monthly_cost_limit / (settings.currency_rates[settings.cost_currency] || 1))}. Increase the limit in Settings to continue.`);
    }
    await new Promise(r => setTimeout(r, 70));
    setExecutionPlan(prev => prev.map((s, idx) => idx === 2 ? { ...s, status: 'completed', durationMs: 35, outputSummary: `${routingDecision.task} → ${selectedModel.name}` } : s));

    // Stage 4: Generate a response with the selected provider/model.
    setExecutionPlan(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'running' } : s));
    let generatedResponse = '';
    let outputTokens = 0;
    let timeToFirstToken = 0;
    let executionError = '';
    try {
      const modelResult = await requestModelChat(selectedModel, [{ role: 'user', content: processedPrompt }], settings.request_timeout_ms);
      generatedResponse = modelResult.text;
      outputTokens = countTokens(generatedResponse);
      timeToFirstToken = modelResult.latencyMs;
      setStreamingOutput(generatedResponse);
      params.onStreamChunk?.(generatedResponse);
      setExecutionPlan(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'completed', durationMs: modelResult.latencyMs, outputSummary: `${outputTokens} response tokens generated` } : s));
    } catch (error) {
      executionError = error instanceof Error ? error.message : 'The model request failed.';
      setExecutionPlan(prev => prev.map((s, idx) => idx === 3 ? { ...s, status: 'failed', outputSummary: executionError } : s));
    }

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
    actual_cost: selectedModel.type === 'local' ? 0 : (inputTokens * selectedModel.input_cost_per_1k / 1000 + outputTokens * selectedModel.output_cost_per_1k / 1000),
      cost_saved: selectedModel.is_free ? 0 : Number((tokensSaved * selectedModel.input_cost_per_1k / 1000).toFixed(6)),
      currency: settings.cost_currency,
      routing_decision: routingDecision,
      semantic_similarity: refinementMetrics?.semantic_similarity ?? 1.0,
      constraints_preserved: refinementMetrics?.accepted ?? true,
      status: executionError ? 'error' : 'success',
      ...(executionError ? { error_message: executionError } : {})
    };

    setRequests(prev => [newRecord, ...prev]);
    setLastExecutionMetrics(newRecord);
    setExecutionPlan(prev => prev.map((s, idx) => idx === 4 ? { ...s, status: executionError ? 'warning' : 'completed', durationMs: 12, outputSummary: executionError ? `Request failed: ${executionError}` : `Saved ${tokensSaved} tokens` } : s));
    setIsExecuting(false);
    return newRecord;
    } catch (error) {
      setExecutionPlan(prev => prev.map(step => step.status === 'running' ? { ...step, status: 'failed', outputSummary: error instanceof Error ? error.message : 'Request failed.' } : step));
      throw error;
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <ZotContext.Provider value={{
      activeTab,
      setActiveTab,
      requestNavigation,
      theme,
      setTheme,
      themes: APP_THEMES,
      hfAuthState,
      connectHuggingFace,
      disconnectHuggingFace,
      fetchFreeUnlimitedModels,
      models,
      paidModels,
      modelToEditId,
      requestModelEdit,
      clearModelEdit,
      setModels,
      toggleModelEnabled,
      updateModel,
      addModel,
      deleteModel,
      publicModels,
      publicModelsLoading,
      publicModelsError,
      refreshPublicModels,
      refinerVersions: REFINER_VERSIONS,
      activeRefinerVersion,
      setActiveRefinerVersion,
      requests,
      activeRequest,
      setActiveRequest,
      clearHistory,
      settings,
      updateSettings,
      settingsDraft,
      updateSettingsDraft,
      commitSettingsDraft,
      discardSettingsDraft,
      t,
      settingsDirty,
      markSettingsDirty,
      markSettingsSaved,
      gatewayStatus,
      gatewayPingMs,
      testGatewayConnection,
      reportConnectionStatus,
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
      ,canAffordRequest,
      costLimitReached
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


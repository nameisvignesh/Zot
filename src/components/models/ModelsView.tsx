import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, KeyRound, Pencil, Plus, RefreshCw, Trash2, Wifi, Search } from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { Model } from '../../types';
import { discoverProviderModels, normalizeModelEndpoint, testModelConnection } from '../../lib/modelClient';

interface ModelTemplate {
  /** Unique key for the template card. NOT sent to the provider. */
  id: string;
  /** The exact model identifier the provider's API expects. */
  apiModelId: string;
  name: string;
  provider: string;
  endpoint: string;
  docsUrl: string;
  description: string;
  context: number;
  latency: number;
}

type ConnectionState = 'idle' | 'testing' | 'success' | 'error';
type StateMap = Record<string, ConnectionState>;
type MessageMap = Record<string, string>;

const PUBLIC_MODEL_LIMIT = 100;

const PROVIDERS = [
  ['OpenAI', 'https://platform.openai.com/api-keys'],
  ['Anthropic / Claude', 'https://console.anthropic.com/settings/keys'],
  ['Google AI Studio', 'https://aistudio.google.com/apikey'],
  ['DeepSeek', 'https://platform.deepseek.com/api_keys'],
  ['Perplexity', 'https://www.perplexity.ai/settings/api'],
  ['Mistral', 'https://console.mistral.ai/api-keys/'],
];

const MODEL_TEMPLATES: ModelTemplate[] = [
  { id: 'gpt-5', apiModelId: 'gpt-5', name: 'ChatGPT · GPT-5', provider: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', docsUrl: 'https://platform.openai.com/api-keys', description: 'OpenAI flagship ChatGPT model template.', context: 200000, latency: 700 },
  { id: 'gpt-4-1', apiModelId: 'gpt-4.1', name: 'ChatGPT · GPT-4.1', provider: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', docsUrl: 'https://platform.openai.com/api-keys', description: 'OpenAI general-purpose model template.', context: 128000, latency: 520 },
  { id: 'gemini-2-5-pro', apiModelId: 'gemini-2.5-pro', name: 'Gemini · 2.5 Pro', provider: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', docsUrl: 'https://aistudio.google.com/apikey', description: 'Google Gemini reasoning model template.', context: 1000000, latency: 620 },
  { id: 'gemini-2-5-flash', apiModelId: 'gemini-2.5-flash', name: 'Gemini · 2.5 Flash', provider: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', docsUrl: 'https://aistudio.google.com/apikey', description: 'Fast Gemini model template for everyday work.', context: 1000000, latency: 360 },
  { id: 'claude-opus-5-5', apiModelId: 'claude-opus-5-5', name: 'Claude · Opus 5.5', provider: 'Anthropic', endpoint: 'https://api.anthropic.com/v1/messages', docsUrl: 'https://console.anthropic.com/settings/keys', description: 'Anthropic deep reasoning model template.', context: 200000, latency: 850 },
  { id: 'claude-sonnet-5-5', apiModelId: 'claude-sonnet-5-5', name: 'Claude · Sonnet 5.5', provider: 'Anthropic', endpoint: 'https://api.anthropic.com/v1/messages', docsUrl: 'https://console.anthropic.com/settings/keys', description: 'Anthropic balanced chat model template.', context: 200000, latency: 560 },
  { id: 'deepseek-v3-1', apiModelId: 'deepseek-chat', name: 'DeepSeek · V3.1', provider: 'DeepSeek', endpoint: 'https://api.deepseek.com/chat/completions', docsUrl: 'https://platform.deepseek.com/api_keys', description: 'DeepSeek general and coding model template.', context: 128000, latency: 520 },
  { id: 'deepseek-r1', apiModelId: 'deepseek-reasoner', name: 'DeepSeek · R1', provider: 'DeepSeek', endpoint: 'https://api.deepseek.com/chat/completions', docsUrl: 'https://platform.deepseek.com/api_keys', description: 'DeepSeek reasoning model template.', context: 128000, latency: 900 },
  { id: 'sonar-pro', apiModelId: 'sonar-pro', name: 'Perplexity · Sonar Pro', provider: 'Perplexity', endpoint: 'https://api.perplexity.ai/chat/completions', docsUrl: 'https://www.perplexity.ai/settings/api', description: 'Perplexity web-grounded answer model template.', context: 200000, latency: 720 },
  { id: 'mistral-large-latest', apiModelId: 'mistral-large-latest', name: 'Mistral · Large', provider: 'Mistral AI', endpoint: 'https://api.mistral.ai/v1/chat/completions', docsUrl: 'https://console.mistral.ai/api-keys/', description: 'Mistral large multilingual model template.', context: 128000, latency: 580 },
  { id: 'magistral-small-latest', apiModelId: 'magistral-small-latest', name: 'Mistral · Magistral Small', provider: 'Mistral AI', endpoint: 'https://api.mistral.ai/v1/chat/completions', docsUrl: 'https://console.mistral.ai/api-keys/', description: 'Mistral compact reasoning model template.', context: 32000, latency: 420 },
];

export const ModelsView: React.FC = () => {
  const {
    models, addModel, updateModel, deleteModel, toggleModelEnabled, modelToEditId, clearModelEdit,
    publicModels, publicModelsLoading, publicModelsError, refreshPublicModels,
    reportConnectionStatus, formatCurrency, t,
  } = useZot();

  const [showForm, setShowForm] = useState(false);
  const [editingModel, setEditingModel] = useState<Model | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<ModelTemplate | null>(null);
  const [name, setName] = useState('');
  const [provider, setProvider] = useState('');
  const [connectionMode, setConnectionMode] = useState<'local' | 'api'>('api');
  const [modelId, setModelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [context, setContext] = useState('8192');
  const [latency, setLatency] = useState('500');
  const [inputCost, setInputCost] = useState('0');
  const [outputCost, setOutputCost] = useState('0');
  const [formError, setFormError] = useState('');
  const [connectionStates, setConnectionStates] = useState<StateMap>({});
  const [connectionMessages, setConnectionMessages] = useState<MessageMap>({});
  const [catalogQuery, setCatalogQuery] = useState('');
  const [modelView, setModelView] = useState<'local' | 'api' | 'all'>('all');
  const [availableModels, setAvailableModels] = useState<Array<{ id: string; name: string }>>([]);
  const [discoveryMessage, setDiscoveryMessage] = useState('');
  const [discoveringModels, setDiscoveringModels] = useState(false);

  // Refs let async handlers read the latest values instead of stale closures.
  const modelsRef = useRef(models);
  modelsRef.current = models;
  const statesRef = useRef<StateMap>({});
  const signaturesRef = useRef<Record<string, string>>({});
  const discoveryRequestRef = useRef(0);

  const updateStates = useCallback((fn: (current: StateMap) => StateMap) => {
    statesRef.current = fn(statesRef.current);
    setConnectionStates(statesRef.current);
  }, []);

  const clearForm = useCallback(() => {
    discoveryRequestRef.current += 1; // invalidates any in-flight "Find models" request
    setEditingModel(null);
    setSelectedTemplate(null);
    setName('');
    setProvider('');
    setModelId('');
    setApiKey('');
    setEndpoint('');
    setContext('8192');
    setLatency('500');
    setInputCost('0');
    setOutputCost('0');
    setConnectionMode('api');
    setAvailableModels([]);
    setDiscoveryMessage('');
    setDiscoveringModels(false);
    setFormError('');
  }, []);

  const closeForm = useCallback(() => {
    clearForm();
    setShowForm(false);
  }, [clearForm]);

  const openForm = (template?: ModelTemplate) => {
    clearForm();
    if (template) {
      setSelectedTemplate(template);
      setName(template.name);
      setProvider(template.provider);
      setModelId(template.apiModelId);
      setEndpoint(template.endpoint);
      setContext(String(template.context));
      setLatency(String(template.latency));
    }
    setShowForm(true);
  };

  const openEdit = (model: Model) => {
    clearForm();
    setEditingModel(model);
    setName(model.name);
    setProvider(model.provider);
    setConnectionMode(model.type);
    setModelId(model.id);
    setApiKey(model.api_key || '');
    setEndpoint(model.endpoint);
    setContext(String(model.context_length));
    setInputCost(String(model.input_cost_per_1k));
    setOutputCost(String(model.output_cost_per_1k));
    setLatency(String(model.latency_ms_avg));
    setShowForm(true);
  };

  const openPublicModel = (model: Model) => {
    clearForm();
    setName(model.name);
    setProvider(model.provider);
    setConnectionMode('api');
    const catalogId = model.id.replace(/^public:/, '');
    const isGoogle = /google|gemini/i.test(model.provider) || catalogId.startsWith('google/');
    const googleId = (catalogId.split('/').pop() ?? catalogId).replace(/^(gemini)-(\d+)-(\d+)(-.+)?$/, '$1-$2.$3$4');
    setModelId(isGoogle ? googleId : catalogId);
    setEndpoint(isGoogle ? 'https://generativelanguage.googleapis.com/v1beta' : model.endpoint);
    setContext(String(model.context_length || 8192));
    setInputCost(String(model.input_cost_per_1k));
    setOutputCost(String(model.output_cost_per_1k));
    setLatency('500');
    setShowForm(true);
  };

  // Open the edit dialog requested from elsewhere. Only clear the request once it was
  // actually handled, or once models have loaded and the target genuinely does not exist.
  useEffect(() => {
    if (!modelToEditId) return;
    const target = models.find(model => model.id === modelToEditId);
    if (target) {
      openEdit(target);
      clearModelEdit();
    } else if (models.length > 0) {
      clearModelEdit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modelToEditId, models]);

  // Drop cached test results only for models that were removed or whose connection
  // details changed. Toggling a model on/off no longer wipes every result.
  useEffect(() => {
    const next: Record<string, string> = {};
    const stale = new Set<string>();
    for (const model of models) {
      const signature = `${model.type}|${model.endpoint}|${model.api_key ?? ''}`;
      next[model.id] = signature;
      if (signaturesRef.current[model.id] !== signature) stale.add(model.id);
    }
    for (const id of Object.keys(signaturesRef.current)) {
      if (!(id in next)) stale.add(id);
    }
    signaturesRef.current = next;
    if (stale.size === 0) return;
    if (Object.keys(statesRef.current).some(id => stale.has(id))) {
      updateStates(current => Object.fromEntries(Object.entries(current).filter(([id]) => !stale.has(id))) as StateMap);
    }
    setConnectionMessages(current => Object.fromEntries(Object.entries(current).filter(([id]) => !stale.has(id))));
  }, [models, updateStates]);

  // Escape closes the dialog.
  useEffect(() => {
    if (!showForm) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeForm(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showForm, closeForm]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedId = modelId.trim();
    const trimmedEndpoint = endpoint.trim();
    const trimmedKey = apiKey.trim();
    const isLocal = connectionMode === 'local';

    if (!trimmedName || !trimmedId || !trimmedEndpoint) {
      setFormError('Model name, model ID and endpoint are required.');
      return;
    }
    if (isLocal && !/^https?:\/\//i.test(trimmedEndpoint)) {
      setFormError('A local endpoint must start with http:// or https://.');
      return;
    }
    if (!isLocal && !trimmedKey) {
      setFormError('An API key is required for API models.');
      return;
    }

    const inCost = isLocal ? 0 : Number(inputCost) || 0;
    const outCost = isLocal ? 0 : Number(outputCost) || 0;
    if (inCost < 0 || outCost < 0) {
      setFormError('Costs cannot be negative.');
      return;
    }
    if (models.some(item => item.id === trimmedId && item.id !== editingModel?.id)) {
      setFormError(`A model with ID “${trimmedId}” already exists. Edit that one, or use a different ID.`);
      return;
    }

    const normalizedEndpoint = normalizeModelEndpoint(trimmedEndpoint);
    const nextPriority = models.reduce((max, item) => Math.max(max, item.priority ?? 0), 0) + 1;
    const modelData = {
      id: trimmedId,
      name: trimmedName,
      provider: provider.trim() || (isLocal ? 'Local runtime' : 'Custom provider'),
      type: connectionMode,
      connection_mode: connectionMode,
      tier: inCost + outCost === 0 ? 'free' : 'paid',
      endpoint: normalizedEndpoint,
      context_length: Number(context) || 8192,
      input_cost_per_1k: inCost,
      output_cost_per_1k: outCost,
      is_free: inCost + outCost === 0,
      enabled: true,
      priority: nextPriority,
      status: 'ready',
      latency_ms_avg: Number(latency) || 500,
      tokens_per_sec: editingModel?.tokens_per_sec ?? 40,
      description: selectedTemplate?.description || editingModel?.description || `Configured ${connectionMode} model: ${trimmedName}.`,
      api_key: isLocal ? '' : trimmedKey,
      api_key_label: !isLocal && trimmedKey ? 'Stored locally' : undefined,
      docs_url: selectedTemplate?.docsUrl || editingModel?.docs_url,
    } as Omit<Model, 'created_at'>;

    if (editingModel) {
      const nextModel: Model = {
        ...editingModel,
        ...modelData,
        enabled: editingModel.enabled,
        priority: editingModel.priority,
        created_at: editingModel.created_at,
      };
      updateModel(nextModel, editingModel.id);
    } else {
      addModel(modelData);
    }
    closeForm();
  };

  const findModels = async () => {
    const requestId = ++discoveryRequestRef.current;
    setDiscoveryMessage('');
    setDiscoveringModels(true);
    try {
      const found = await discoverProviderModels(provider, endpoint, apiKey);
      if (requestId !== discoveryRequestRef.current) return;
      setAvailableModels(found);
      setDiscoveryMessage(`${found.length} models found. This list does not confirm billing or inference access.`);
      if (found.length === 1) {
        setModelId(found[0].id);
        setName(current => current.trim() || found[0].name);
      }
    } catch (error) {
      if (requestId !== discoveryRequestRef.current) return;
      setAvailableModels([]);
      setDiscoveryMessage(error instanceof Error ? error.message : 'Could not load models for this key.');
    } finally {
      if (requestId === discoveryRequestRef.current) setDiscoveringModels(false);
    }
  };

  const testConnection = async (model: Model) => {
    updateStates(current => ({ ...current, [model.id]: 'testing' }));
    setConnectionMessages(current => {
      const rest = { ...current };
      delete rest[model.id];
      return rest;
    });

    let result: { ok: boolean; message: string };
    try {
      result = await testModelConnection(model);
    } catch (error) {
      result = { ok: false, message: error instanceof Error ? error.message : 'The connection test failed.' };
    }

    updateStates(current => ({ ...current, [model.id]: result.ok ? 'success' : 'error' }));
    setConnectionMessages(current => ({ ...current, [model.id]: result.message }));

    // Read the freshest data: other tests may have finished, or the user may have toggled models, while we waited.
    const enabledModels = modelsRef.current.filter(item => item.enabled);
    const hasFailure = !result.ok || enabledModels.some(item => statesRef.current[item.id] === 'error');
    const allVerified = enabledModels.every(item => statesRef.current[item.id] === 'success');
    reportConnectionStatus(hasFailure ? 'error' : allVerified ? 'ready' : 'connecting');
  };

  const confirmDelete = (model: Model) => {
    const extra = model.type === 'api' ? ' and API key' : '';
    if (window.confirm(`Delete “${model.name}” from your configured models? This removes its saved settings${extra} from this browser.`)) {
      deleteModel(model.id);
    }
  };

  const localModels = useMemo(() => models.filter(model => model.type === 'local'), [models]);
  const apiModels = useMemo(() => models.filter(model => model.type === 'api'), [models]);

  const matchingPublicModels = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    if (!query) return publicModels;
    return publicModels.filter(model => `${model.name} ${model.provider} ${model.id}`.toLowerCase().includes(query));
  }, [publicModels, catalogQuery]);
  const visiblePublicModels = useMemo(() => matchingPublicModels.slice(0, PUBLIC_MODEL_LIMIT), [matchingPublicModels]);

  const renderRow = (model: Model) => (
    <ModelRow
      key={model.id}
      model={model}
      onEdit={() => openEdit(model)}
      onToggle={() => toggleModelEnabled(model.id)}
      onDelete={() => confirmDelete(model)}
      onTest={() => testConnection(model)}
      state={connectionStates[model.id] || 'idle'}
      message={connectionMessages[model.id]}
      formatCurrency={formatCurrency}
      t={t}
    />
  );

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t('models.eyebrow')}</div>
          <h1>{t('models.title')}</h1>
          <p>{t('models.description')}</p>
        </div>
        <button type="button" className="button primary" onClick={() => openForm()}><Plus size={15} /> {t('models.addCustom')}</button>
      </div>

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">Models</div>
            <div className="panel-subtitle">Choose which connection type to view</div>
          </div>
          <div className="segmented">
            <button type="button" className={modelView === 'all' ? 'active' : ''} onClick={() => setModelView('all')}>All</button>
            <button type="button" className={modelView === 'local' ? 'active' : ''} onClick={() => setModelView('local')}>Local</button>
            <button type="button" className={modelView === 'api' ? 'active' : ''} onClick={() => setModelView('api')}>API</button>
          </div>
        </div>
      </div>

      {modelView !== 'api' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">{t('models.local')}</div>
              <div className="panel-subtitle">{t('models.localUsed')}</div>
            </div>
            <span className="badge warn">Local runtime</span>
          </div>
          <div className="panel-body">
            {models.length === 0 && <div className="local-checkpoint">{t('models.checkpoint')}</div>}
            {localModels.map(renderRow)}
            {models.length > 0 && localModels.length === 0 && <div className="empty-state">No local models configured.</div>}
          </div>
        </div>
      )}

      {modelView !== 'local' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">{t('models.api')}</div>
              <div className="panel-subtitle">{t('models.keysNote')}</div>
            </div>
            <span className="badge">{t('models.configured', { value: apiModels.length })}</span>
          </div>
          <div className="panel-body space-y-3">
            {apiModels.map(renderRow)}
            {apiModels.length === 0 && <div className="empty-state">{t('models.noneConfigured')}</div>}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">{t('models.templates')}</div>
            <div className="panel-subtitle">{t('models.templatesNote')}</div>
          </div>
        </div>
        <div className="panel-body template-grid">
          {MODEL_TEMPLATES.map(template => (
            <article className="template-card" key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <span>{template.provider}</span>
                <p>{template.description}</p>
              </div>
              <button type="button" className="button" onClick={() => openForm(template)}>{t('models.configure')}</button>
            </article>
          ))}
        </div>
      </div>

      {modelView !== 'local' && (
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title">{t('models.publicCatalog')}</div>
              <div className="panel-subtitle">{t('models.publicCatalogNote')}</div>
            </div>
            <button type="button" className="button" onClick={refreshPublicModels} disabled={publicModelsLoading}>
              <RefreshCw size={14} className={publicModelsLoading ? 'animate-spin' : ''} /> {t('models.refreshCatalog')}
            </button>
          </div>
          <div className="panel-body">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <input
                className="input max-w-md"
                type="search"
                aria-label="Search public models"
                value={catalogQuery}
                onChange={event => setCatalogQuery(event.target.value)}
                placeholder="Search public models…"
              />
              <span className="muted text-xs">
                {t('models.catalogSource')} · {matchingPublicModels.length.toLocaleString()}
                {matchingPublicModels.length !== publicModels.length ? ` of ${publicModels.length.toLocaleString()}` : ''}
              </span>
            </div>
            {publicModelsLoading ? (
              <div className="empty-state">{t('models.catalogLoading')}</div>
            ) : publicModelsError ? (
              <div className="alert" role="alert">
                {publicModelsError}{' '}
                <button type="button" className="button ml-2" onClick={refreshPublicModels}>{t('models.refreshCatalog')}</button>
              </div>
            ) : visiblePublicModels.length === 0 ? (
              <div className="empty-state">{publicModels.length === 0 ? 'The public catalog is empty. Try refreshing it.' : 'No public models match your search.'}</div>
            ) : (
              <>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>{t('models.model')}</th>
                        <th>{t('models.contextTokens')}</th>
                        <th>{t('models.price')}</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {visiblePublicModels.map(model => (
                        <tr key={model.id}>
                          <td><strong>{model.name}</strong><div className="muted">{model.provider}</div></td>
                          <td>{model.context_length ? model.context_length.toLocaleString() : '—'}</td>
                          <td>
                            {model.is_free
                              ? t('routing.free')
                              : (model.input_cost_per_1k || model.output_cost_per_1k)
                                ? `${formatCurrency(model.input_cost_per_1k)} / ${formatCurrency(model.output_cost_per_1k)}`
                                : t('models.notPublished')}
                          </td>
                          <td><button type="button" className="button" onClick={() => openPublicModel(model)}>{t('models.configure')}</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {matchingPublicModels.length > PUBLIC_MODEL_LIMIT && (
                  <div className="muted text-xs mt-3">
                    Showing the first {PUBLIC_MODEL_LIMIT} of {matchingPublicModels.length.toLocaleString()} matches. Refine your search to narrow the list.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div>
            <div className="panel-title">{t('models.providers')}</div>
            <div className="panel-subtitle">{t('models.providersNote')}</div>
          </div>
        </div>
        <div className="panel-body provider-grid">
          {PROVIDERS.map(([label, url]) => (
            <a className="provider-card" key={label} href={url} target="_blank" rel="noreferrer">
              <div><strong>{label}</strong><span>{t('models.officialKey')}</span></div>
              <ExternalLink size={14} className="muted" />
            </a>
          ))}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4">
          <form
            className="panel w-full max-w-2xl max-h-[90vh] overflow-auto"
            onSubmit={submit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="model-form-title"
          >
            <div className="panel-header">
              <div>
                <div className="panel-title" id="model-form-title">
                  {editingModel
                    ? `Edit model · ${editingModel.name}`
                    : selectedTemplate
                      ? `${t('models.formTitle')} · ${selectedTemplate.name}`
                      : t('models.formTitle')}
                </div>
                <div className="panel-subtitle">{t('models.formNote')}</div>
              </div>
              <button type="button" className="button" onClick={closeForm}>{t('models.close')}</button>
            </div>

            <div className="panel-body grid-2">
              <div className="field col-span-2 connection-mode-field">
                <label id="connection-type-label">Connection type</label>
                <div className="segmented" role="group" aria-labelledby="connection-type-label">
                  <button
                    type="button"
                    className={connectionMode === 'local' ? 'active' : ''}
                    onClick={() => {
                      setConnectionMode('local');
                      if (!endpoint.trim() || endpoint.includes('api.openai.com')) setEndpoint('http://localhost:11434/api/chat');
                      if (!provider.trim() || provider === 'OpenAI') setProvider('Ollama');
                    }}
                  >Local</button>
                  <button
                    type="button"
                    className={connectionMode === 'api' ? 'active' : ''}
                    onClick={() => {
                      setConnectionMode('api');
                      if (endpoint.includes('localhost:11434')) setEndpoint('');
                    }}
                  >Using API</button>
                </div>
              </div>

              <div className="field">
                <label htmlFor="model-name">{t('models.modelName')}</label>
                <input id="model-name" className="input" required value={name} onChange={event => setName(event.target.value)} placeholder="ChatGPT · GPT-5" />
              </div>

              <div className="field">
                <label htmlFor="model-id">{t('models.modelId')}</label>
                <input id="model-id" className="input" required value={modelId} onChange={event => setModelId(event.target.value)} placeholder="gpt-5" />
              </div>

              <div className="field">
                <label htmlFor="model-provider">{t('models.provider')}</label>
                <input id="model-provider" className="input" value={provider} onChange={event => setProvider(event.target.value)} placeholder="OpenAI" />
              </div>

              <div className="field">
                <label htmlFor="model-api-key">{t('models.apiKey')}</label>
                {connectionMode === 'api' ? (
                  <>
                    <div className="flex gap-2">
                      <input
                        id="model-api-key"
                        className="input min-w-0 flex-1"
                        type="password"
                        autoComplete="off"
                        required
                        value={apiKey}
                        onChange={event => setApiKey(event.target.value)}
                        placeholder="Google API key or provider key"
                      />
                      <button type="button" className="button shrink-0" onClick={findModels} disabled={!apiKey.trim() || discoveringModels}>
                        <Search size={14} /> {discoveringModels ? 'Finding…' : 'Find models'}
                      </button>
                    </div>
                    {discoveryMessage && <span className="muted text-xs" role="status">{discoveryMessage}</span>}
                  </>
                ) : (
                  <div className="input flex items-center muted">No API key needed for local models</div>
                )}
              </div>

              <div className="field col-span-2">
                <label htmlFor="discovered-model">Models returned by provider</label>
                <select
                  id="discovered-model"
                  className="select"
                  value={availableModels.some(item => item.id === modelId) ? modelId : ''}
                  onChange={event => {
                    const found = availableModels.find(item => item.id === event.target.value);
                    if (found) { setModelId(found.id); setName(found.name); }
                  }}
                  disabled={connectionMode !== 'api' || availableModels.length === 0}
                >
                  <option value="">Choose a model after finding available models</option>
                  {availableModels.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>

              <div className="field col-span-2">
                <label htmlFor="model-endpoint">{t('models.endpoint')}</label>
                <input id="model-endpoint" className="input" required value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder="https://api.openai.com/v1/chat/completions" />
              </div>

              <div className="field">
                <label htmlFor="model-context">{t('models.contextTokens')}</label>
                <input id="model-context" className="input" type="number" min="1" step="1" value={context} onChange={event => setContext(event.target.value)} />
              </div>

              {connectionMode === 'api' && (
                <>
                  <div className="field">
                    <label htmlFor="model-input-cost">Input cost per 1K tokens (USD)</label>
                    <input id="model-input-cost" className="input" type="number" min="0" step="any" value={inputCost} onChange={event => setInputCost(event.target.value)} />
                  </div>
                  <div className="field">
                    <label htmlFor="model-output-cost">Output cost per 1K tokens (USD)</label>
                    <input id="model-output-cost" className="input" type="number" min="0" step="any" value={outputCost} onChange={event => setOutputCost(event.target.value)} />
                  </div>
                </>
              )}

              {formError && <div className="alert col-span-2" role="alert">{formError}</div>}

              <div className="col-span-2 flex justify-end gap-2">
                <button type="button" className="button" onClick={closeForm}>{t('models.cancel')}</button>
                <button className="button primary" type="submit"><Plus size={15} /> {t('models.saveModel')}</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

interface ModelRowProps {
  model: Model;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onTest: () => void;
  state: ConnectionState;
  message?: string;
  formatCurrency: (usdAmount: number) => string;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const ModelRow: React.FC<ModelRowProps> = ({ model, onEdit, onToggle, onDelete, onTest, state, message, formatCurrency, t }) => {
  const displayMessage = state === 'success'
    ? (model.type === 'local' ? t('models.localTest') : t('models.testReady'))
    : state === 'error'
      ? `${t('models.testFailed')}: ${message || ''}`
      : state === 'testing'
        ? undefined
        : message;
  const messageClass = state === 'success' ? 'badge success' : 'badge danger';

  return (
    <div className="switch-row model-row">
      <div className="model-row-content flex items-start gap-3">
        <div className="grid place-items-center w-9 h-9 rounded-lg bg-[#202020] text-white"><KeyRound size={16} /></div>
        <div className="model-row-copy">
          <strong className="text-sm">{model.name}</strong>
          <div className="muted text-xs mt-1">{model.provider} · {model.endpoint}</div>
          <div className="model-row-badges flex flex-wrap gap-2 mt-2">
            <span className="badge">{model.context_length.toLocaleString()} {t('routing.context')}</span>
            {model.type !== 'local' && (
              <span className={model.is_free ? 'badge success' : 'badge warn'}>
                {model.is_free
                  ? `${t('routing.free')} / 1K`
                  : `${formatCurrency(model.input_cost_per_1k)} in · ${formatCurrency(model.output_cost_per_1k)} out / 1K`}
              </span>
            )}
            {model.api_key && <span className="badge success"><Wifi size={10} /> {t('models.keyReady')}</span>}
          </div>
          {displayMessage && <div className={`${messageClass} model-row-error`} role="status">{displayMessage}</div>}
        </div>
      </div>
      <div className="model-row-actions flex items-center gap-2">
        <button type="button" className="button" onClick={onEdit} disabled={model.is_builtin} aria-label={`Edit ${model.name}`} title="Edit model configuration"><Pencil size={14} /></button>
        <button type="button" className="button model-test-button" onClick={onTest} disabled={state === 'testing'}>{state === 'testing' ? t('models.testing') : t('models.test')}</button>
        <button type="button" role="switch" aria-checked={model.enabled} className={model.enabled ? 'switch on' : 'switch'} onClick={onToggle} aria-label={`Toggle ${model.name}`} />
        <button type="button" className="button" onClick={onDelete} disabled={model.is_builtin} aria-label={`Delete ${model.name}`} title={model.is_builtin ? t('models.localCannotRemove') : t('models.remove')}><Trash2 size={14} /></button>
      </div>
    </div>
  );
};
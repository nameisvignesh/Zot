import React, { useEffect, useState } from 'react';
import { ExternalLink, KeyRound, Pencil, Plus, RefreshCw, Trash2, Wifi } from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { Model } from '../../types';
import { normalizeModelEndpoint, testModelConnection } from '../../lib/modelClient';

interface ModelTemplate {
  id: string;
  name: string;
  provider: string;
  endpoint: string;
  docsUrl: string;
  description: string;
  context: number;
  latency: number;
}

const PROVIDERS = [
  ['OpenAI', 'https://platform.openai.com/api-keys'],
  ['Anthropic / Claude', 'https://console.anthropic.com/settings/keys'],
  ['Google AI Studio', 'https://aistudio.google.com/apikey'],
  ['DeepSeek', 'https://platform.deepseek.com/api_keys'],
  ['Perplexity', 'https://www.perplexity.ai/settings/api'],
  ['Mistral', 'https://console.mistral.ai/api-keys/'],
];

const MODEL_TEMPLATES: ModelTemplate[] = [
  { id: 'gpt-5', name: 'ChatGPT · GPT-5', provider: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', docsUrl: 'https://platform.openai.com/api-keys', description: 'OpenAI flagship ChatGPT model template.', context: 200000, latency: 700 },
  { id: 'gpt-4-1', name: 'ChatGPT · GPT-4.1', provider: 'OpenAI', endpoint: 'https://api.openai.com/v1/chat/completions', docsUrl: 'https://platform.openai.com/api-keys', description: 'OpenAI general-purpose model template.', context: 128000, latency: 520 },
  { id: 'gemini-2-5-pro', name: 'Gemini · 2.5 Pro', provider: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', docsUrl: 'https://aistudio.google.com/apikey', description: 'Google Gemini reasoning model template.', context: 1000000, latency: 620 },
  { id: 'gemini-2-5-flash', name: 'Gemini · 2.5 Flash', provider: 'Google Gemini', endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', docsUrl: 'https://aistudio.google.com/apikey', description: 'Fast Gemini model template for everyday work.', context: 1000000, latency: 360 },
  { id: 'claude-opus-4-1', name: 'Claude · Opus 4.1', provider: 'Anthropic', endpoint: 'https://api.anthropic.com/v1/messages', docsUrl: 'https://console.anthropic.com/settings/keys', description: 'Anthropic deep reasoning model template.', context: 200000, latency: 850 },
  { id: 'claude-sonnet-4', name: 'Claude · Sonnet 4', provider: 'Anthropic', endpoint: 'https://api.anthropic.com/v1/messages', docsUrl: 'https://console.anthropic.com/settings/keys', description: 'Anthropic balanced chat model template.', context: 200000, latency: 560 },
  { id: 'deepseek-v3-1', name: 'DeepSeek · V3.1', provider: 'DeepSeek', endpoint: 'https://api.deepseek.com/chat/completions', docsUrl: 'https://platform.deepseek.com/api_keys', description: 'DeepSeek general and coding model template.', context: 128000, latency: 520 },
  { id: 'deepseek-r1', name: 'DeepSeek · R1', provider: 'DeepSeek', endpoint: 'https://api.deepseek.com/chat/completions', docsUrl: 'https://platform.deepseek.com/api_keys', description: 'DeepSeek reasoning model template.', context: 128000, latency: 900 },
  { id: 'sonar-pro', name: 'Perplexity · Sonar Pro', provider: 'Perplexity', endpoint: 'https://api.perplexity.ai/chat/completions', docsUrl: 'https://www.perplexity.ai/settings/api', description: 'Perplexity web-grounded answer model template.', context: 200000, latency: 720 },
  { id: 'mistral-large-latest', name: 'Mistral · Large', provider: 'Mistral AI', endpoint: 'https://api.mistral.ai/v1/chat/completions', docsUrl: 'https://console.mistral.ai/api-keys/', description: 'Mistral large multilingual model template.', context: 128000, latency: 580 },
  { id: 'magistral-small-latest', name: 'Mistral · Magistral Small', provider: 'Mistral AI', endpoint: 'https://api.mistral.ai/v1/chat/completions', docsUrl: 'https://console.mistral.ai/api-keys/', description: 'Mistral compact reasoning model template.', context: 32000, latency: 420 },
];

type ConnectionState = 'idle' | 'testing' | 'success' | 'error';

export const ModelsView: React.FC = () => {
  const { models, addModel, updateModel, deleteModel, toggleModelEnabled, modelToEditId, clearModelEdit, publicModels, publicModelsLoading, publicModelsError, refreshPublicModels, reportConnectionStatus, formatCurrency, t } = useZot();
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
  const [connectionStates, setConnectionStates] = useState<Record<string, ConnectionState>>({});
  const [connectionMessages, setConnectionMessages] = useState<Record<string, string>>({});
  const [catalogQuery, setCatalogQuery] = useState('');
  const [modelView, setModelView] = useState<'local' | 'api' | 'all'>('all');

  const clearForm = () => {
    setEditingModel(null); setSelectedTemplate(null); setName(''); setProvider(''); setModelId(''); setApiKey(''); setEndpoint(''); setContext('8192'); setLatency('500'); setInputCost('0'); setOutputCost('0'); setConnectionMode('api');
  };

  const openForm = (template?: ModelTemplate) => {
    clearForm();
    if (template) {
      setConnectionMode('api');
      setSelectedTemplate(template); setName(template.name); setProvider(template.provider); setModelId(template.id); setEndpoint(template.endpoint); setContext(String(template.context)); setLatency(String(template.latency));
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

  useEffect(() => {
    if (!modelToEditId) return;
    const target = models.find(model => model.id === modelToEditId);
    if (target) openEdit(target);
    clearModelEdit();
  }, [modelToEditId]);

  const openPublicModel = (model: Model) => {
    clearForm();
    setName(model.name);
    setProvider(model.provider);
    setConnectionMode('api');
    const catalogId = model.id.replace(/^public:/, '');
    const isGoogle = /google|gemini/i.test(model.provider) || catalogId.startsWith('google/');
    setModelId(isGoogle ? catalogId.split('/').pop()!.replace(/^(gemini)-(\d+)-(\d+)(-.+)?$/, '$1-$2.$3$4') : catalogId);
    setEndpoint(isGoogle ? 'https://generativelanguage.googleapis.com/v1beta' : model.endpoint);
    setContext(String(model.context_length || 8192));
    setInputCost(String(model.input_cost_per_1k));
    setOutputCost(String(model.output_cost_per_1k));
    setLatency('500');
    setShowForm(true);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const localRuntimeEndpoint = connectionMode === 'local' && /^https?:\/\//i.test(endpoint.trim());
    if (!name.trim() || !modelId.trim() || !endpoint.trim() || (!apiKey.trim() && !localRuntimeEndpoint)) return;
    const inCost = Number(inputCost) || 0;
    const outCost = Number(outputCost) || 0;
    const normalizedEndpoint = normalizeModelEndpoint(endpoint, provider);
    const modelData = {
      id: modelId.trim(), name: name.trim(), provider: provider.trim() || (connectionMode === 'local' ? 'Local runtime' : 'Custom provider'), type: connectionMode, connection_mode: connectionMode, tier: (inCost + outCost === 0 ? 'free' : 'paid'), endpoint: normalizedEndpoint, context_length: Number(context) || 8192, input_cost_per_1k: inCost, output_cost_per_1k: outCost, is_free: inCost + outCost === 0, enabled: true, priority: models.length + 1, status: 'ready', latency_ms_avg: Number(latency) || 500, tokens_per_sec: 40, description: selectedTemplate?.description || editingModel?.description || `Configured ${connectionMode} model: ${name.trim()}.`, api_key: apiKey.trim(), api_key_label: apiKey.trim() ? 'Stored locally' : undefined, docs_url: selectedTemplate?.docsUrl || editingModel?.docs_url,
    } as Omit<Model, 'created_at'>;
    if (editingModel) {
      updateModel({ ...editingModel, ...modelData, tier: editingModel.tier, is_free: editingModel.is_free, input_cost_per_1k: editingModel.input_cost_per_1k, output_cost_per_1k: editingModel.output_cost_per_1k, enabled: editingModel.enabled, priority: editingModel.priority, created_at: editingModel.created_at }, editingModel.id);
    } else {
      addModel(modelData);
    }
    clearForm(); setShowForm(false);
  };

  const visiblePublicModels = publicModels.filter(model => `${model.name} ${model.provider} ${model.id}`.toLowerCase().includes(catalogQuery.toLowerCase()));

  const testConnection = async (model: Model) => {
    setConnectionStates(current => ({ ...current, [model.id]: 'testing' }));
    let result: { ok: boolean; message: string };
    try { result = await testModelConnection(model); }
    catch (error) { result = { ok: false, message: error instanceof Error ? error.message : 'The connection test failed.' }; }
    reportConnectionStatus(result.ok ? 'ready' : 'error');
    setConnectionStates(current => ({ ...current, [model.id]: result.ok ? 'success' : 'error' }));
    setConnectionMessages(current => ({ ...current, [model.id]: result.message }));
  };

  return (
    <div className="space-y-6">
      <div className="page-heading"><div><div className="eyebrow">{t('models.eyebrow')}</div><h1>{t('models.title')}</h1><p>{t('models.description')}</p></div><button className="button primary" onClick={() => openForm()}><Plus size={15} /> {t('models.addCustom')}</button></div>

      <div className="panel"><div className="panel-header"><div><div className="panel-title">Models</div><div className="panel-subtitle">Choose which connection type to view</div></div><div className="segmented"><button className={modelView === 'all' ? 'active' : ''} onClick={() => setModelView('all')}>All</button><button className={modelView === 'local' ? 'active' : ''} onClick={() => setModelView('local')}>Local</button><button className={modelView === 'api' ? 'active' : ''} onClick={() => setModelView('api')}>Configured</button></div></div></div>

      {modelView !== 'api' && <div className="panel"><div className="panel-header"><div><div className="panel-title">{t('models.local')}</div><div className="panel-subtitle">{t('models.localUsed')}</div></div><span className="badge warn">Local runtime</span></div><div className="panel-body">{models.length === 0 && <div className="local-checkpoint">{t('models.checkpoint')}</div>}{models.filter(model => model.type === 'local').map(model => <ModelRow key={model.id} model={model} onEdit={() => openEdit(model)} onToggle={() => toggleModelEnabled(model.id)} onDelete={() => deleteModel(model.id)} onTest={() => testConnection(model)} state={connectionStates[model.id] || 'idle'} message={connectionMessages[model.id]} formatCurrency={formatCurrency} t={t} />)}{models.length > 0 && models.every(model => model.type !== 'local') && <div className="empty-state">No local models configured.</div>}</div></div>}
      {modelView !== 'local' && <div className="panel"><div className="panel-header"><div><div className="panel-title">{t('models.api')}</div><div className="panel-subtitle">{t('models.keysNote')}</div></div><span className="badge">{t('models.configured', { value: models.filter(model => model.type === 'api').length })}</span></div><div className="panel-body space-y-3">{models.filter(model => model.type === 'api').map(model => <ModelRow key={model.id} model={model} onEdit={() => openEdit(model)} onToggle={() => toggleModelEnabled(model.id)} onDelete={() => deleteModel(model.id)} onTest={() => testConnection(model)} state={connectionStates[model.id] || 'idle'} message={connectionMessages[model.id]} formatCurrency={formatCurrency} t={t} />)}{models.every(model => model.type !== 'api') && <div className="empty-state">{t('models.noneConfigured')}</div>}</div></div>}

      <div className="panel"><div className="panel-header"><div><div className="panel-title">{t('models.templates')}</div><div className="panel-subtitle">{t('models.templatesNote')}</div></div></div><div className="panel-body template-grid">{MODEL_TEMPLATES.map(template => <article className="template-card" key={template.id}><div><strong>{template.name}</strong><span>{template.provider}</span><p>{template.description}</p></div><button className="button" onClick={() => openForm(template)}>{t('models.configure')}</button></article>)}</div></div>

      {modelView !== 'local' && <div className="panel"><div className="panel-header"><div><div className="panel-title">{t('models.publicCatalog')}</div><div className="panel-subtitle">{t('models.publicCatalogNote')}</div></div><button className="button" onClick={refreshPublicModels} disabled={publicModelsLoading}><RefreshCw size={14} className={publicModelsLoading ? 'animate-spin' : ''} /> {t('models.refreshCatalog')}</button></div><div className="panel-body"><div className="flex flex-wrap items-center justify-between gap-3 mb-4"><input className="input max-w-md" value={catalogQuery} onChange={event => setCatalogQuery(event.target.value)} placeholder="Search public models…" /><span className="muted text-xs">{t('models.catalogSource')} · {publicModels.length.toLocaleString()}</span></div>{publicModelsLoading ? <div className="empty-state">{t('models.catalogLoading')}</div> : publicModelsError ? <div className="alert">{publicModelsError} <button className="button ml-2" onClick={refreshPublicModels}>{t('models.refreshCatalog')}</button></div> : visiblePublicModels.length === 0 ? <div className="empty-state">{t('models.catalogLoading')}</div> : <div className="table-wrap"><table className="data-table"><thead><tr><th>{t('models.model')}</th><th>{t('models.contextTokens')}</th><th>{t('models.price')}</th><th>{t('models.latencyMs')}</th><th></th></tr></thead><tbody>{visiblePublicModels.map(model => <tr key={model.id}><td><strong>{model.name}</strong><div className="muted">{model.provider}</div></td><td>{model.context_length ? model.context_length.toLocaleString() : '—'}</td><td>{model.is_free ? t('routing.free') : model.input_cost_per_1k || model.output_cost_per_1k ? `${formatCurrency(model.input_cost_per_1k)} / ${formatCurrency(model.output_cost_per_1k)}` : t('models.notPublished')}</td><td>{model.latency_ms_avg ? `${model.latency_ms_avg}ms` : t('models.notPublished')}</td><td><button className="button" onClick={() => openPublicModel(model)}>{t('models.configure')}</button></td></tr>)}</tbody></table></div>}</div></div>}

      <div className="panel"><div className="panel-header"><div><div className="panel-title">{t('models.providers')}</div><div className="panel-subtitle">{t('models.providersNote')}</div></div></div><div className="panel-body provider-grid">{PROVIDERS.map(([label, url]) => <a className="provider-card" key={label} href={url} target="_blank" rel="noreferrer"><div><strong>{label}</strong><span>{t('models.officialKey')}</span></div><ExternalLink size={14} className="muted" /></a>)}</div></div>

        {showForm && <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"><form className="panel w-full max-w-2xl max-h-[90vh] overflow-auto" onSubmit={submit}><div className="panel-header"><div><div className="panel-title">{editingModel ? `Edit model · ${editingModel.name}` : selectedTemplate ? `${t('models.formTitle')} · ${selectedTemplate.name}` : t('models.formTitle')}</div><div className="panel-subtitle">{t('models.formNote')}</div></div><button type="button" className="button" onClick={() => { clearForm(); setShowForm(false); }}>{t('models.close')}</button></div><div className="panel-body grid-2"><div className="field col-span-2"><label>Connection type</label><div className="segmented"><button type="button" className={connectionMode === 'local' ? 'active' : ''} onClick={() => { setConnectionMode('local'); setApiKey(''); if (!endpoint.trim() || endpoint.includes('api.openai.com')) setEndpoint('http://localhost:11434/api/chat'); if (!provider.trim() || provider === 'OpenAI') setProvider('Ollama'); }}>Local</button><button type="button" className={connectionMode === 'api' ? 'active' : ''} onClick={() => { setConnectionMode('api'); if (endpoint.includes('localhost:11434')) setEndpoint(''); }}>Using API</button></div></div><div className="field"><label>{t('models.modelName')}</label><input className="input" required value={name} onChange={event => setName(event.target.value)} placeholder="ChatGPT · GPT-5" /></div><div className="field"><label>{t('models.modelId')}</label><input className="input" required value={modelId} onChange={event => setModelId(event.target.value)} placeholder="gpt-5" /></div><div className="field"><label>{t('models.provider')}</label><input className="input" value={provider} onChange={event => setProvider(event.target.value)} placeholder="OpenAI" /></div><div className="field"><label>{t('models.apiKey')}</label>{connectionMode === 'api' ? <input className="input" type="password" required value={apiKey} onChange={event => setApiKey(event.target.value)} placeholder="Google API key or provider key" /> : <div className="input flex items-center muted">No API key needed for local models</div>}</div><div className="field col-span-2"><label>{t('models.endpoint')}</label><input className="input" required value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder="https://api.openai.com/v1/chat/completions" /></div><div className="field"><label>{t('models.contextTokens')}</label><input className="input" type="number" value={context} onChange={event => setContext(event.target.value)} /></div><div className="col-span-2 flex justify-end gap-2"><button type="button" className="button" onClick={() => { clearForm(); setShowForm(false); }}>{t('models.cancel')}</button><button className="button primary" type="submit"><Plus size={15} /> {t('models.saveModel')}</button></div></div></form></div>}
    </div>
  );
};

const ModelRow: React.FC<{ model: Model; onEdit: () => void; onToggle: () => void; onDelete: () => void; onTest: () => void; state: ConnectionState; message?: string; formatCurrency: (usdAmount: number) => string; t: (key: string, values?: Record<string, string | number>) => string }> = ({ model, onEdit, onToggle, onDelete, onTest, state, message, formatCurrency, t }) => {
  const displayMessage = state === 'success'
    ? (model.type === 'local' ? t('models.localTest') : t('models.testReady'))
    : state === 'error'
      ? `${t('models.testFailed')}: ${message || ''}`
      : message;
  const messageClass = state === 'success' ? 'badge success' : 'badge danger';
  return <div className="switch-row"><div className="flex items-start gap-3"><div className="grid place-items-center w-9 h-9 rounded-lg bg-[#202020] text-white"><KeyRound size={16} /></div><div><strong className="text-sm">{model.name}</strong><div className="muted text-xs mt-1">{model.provider} · {model.endpoint}</div><div className="flex flex-wrap gap-2 mt-2"><span className="badge">{model.context_length.toLocaleString()} {t('routing.context')}</span>{model.type !== 'local' && <span className={model.is_free ? 'badge success' : 'badge warn'}>{model.is_free ? t('routing.free') : formatCurrency(model.input_cost_per_1k)} / 1K</span>}{model.api_key && <span className="badge success"><Wifi size={10} /> {t('models.keyReady')}</span>}{displayMessage && <span className={messageClass}>{displayMessage}</span>}</div></div></div><div className="flex items-center gap-2"><button className="button" onClick={onEdit} disabled={model.is_builtin} title="Edit model configuration"><Pencil size={14} /></button><button className="button" onClick={onTest} disabled={state === 'testing'}>{state === 'testing' ? t('models.testing') : t('models.test')}</button><button className={model.enabled ? 'switch on' : 'switch'} onClick={onToggle} aria-label={`Toggle ${model.name}`} /><button className="button" onClick={onDelete} disabled={model.is_builtin} title={model.is_builtin ? t('models.localCannotRemove') : t('models.remove')}><Trash2 size={14} /></button></div></div>;
};

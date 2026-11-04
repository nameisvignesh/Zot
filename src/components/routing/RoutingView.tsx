import React, { useEffect, useMemo, useState } from 'react';
import { Check, Copy, ExternalLink, Grid2X2, List, Pencil, Route, Send, Trash2, X } from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { routePrompt } from '../../lib/routingEngine';
import { Model, RequestRecord } from '../../types';

const formatContext = (value: number) => value >= 1024 ? `${Math.round(value / 1024)}K` : `${value}`;

export const RoutingView: React.FC = () => {
  const { models, publicModels, runInference, isExecuting, requestModelEdit, deleteModel, formatCurrency, t } = useZot();
  const [prompt, setPrompt] = useState(() => sessionStorage.getItem('zot-route-prompt') || '');
  const [routedRecord, setRoutedRecord] = useState<RequestRecord | null>(() => {
    try { return JSON.parse(sessionStorage.getItem('zot-route-record') || 'null') as RequestRecord | null; } catch { return null; }
  });
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [preferredModel, setPreferredModel] = useState('auto');
  const [catalogQuery, setCatalogQuery] = useState('');
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const enabledModels = useMemo(() => models.filter(model => model.enabled), [models]);
  useEffect(() => {
    if (preferredModel !== 'auto' && !enabledModels.some(model => model.id === preferredModel)) {
      setPreferredModel('auto');
    }
  }, [enabledModels, preferredModel]);
  const automaticRoute = useMemo(
    () => routePrompt(prompt, enabledModels),
    [prompt, enabledModels],
  );
  const publicSuggestion = useMemo(() => {
    if (publicModels.length === 0) return undefined;
    const decision = routePrompt(prompt, publicModels.map(model => ({ ...model, enabled: true })), undefined);
    return publicModels.find(model => model.id === decision.selected_model);
  }, [prompt, publicModels]);
  const selectedModel = preferredModel === 'auto'
    ? enabledModels.find(model => model.id === automaticRoute.selected_model)
    : enabledModels.find(model => model.id === preferredModel);
  const tokenCount = routedRecord?.input_tokens ?? 0;
  const estimatedOutput = routedRecord?.output_tokens ?? 0;
  const visiblePublicModels = useMemo(() => publicModels.filter(model => `${model.name} ${model.provider} ${model.id}`.toLowerCase().includes(catalogQuery.toLowerCase())), [catalogQuery, publicModels]);

  const [routeError, setRouteError] = useState('');
  useEffect(() => {
    if (!isPromptOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPromptOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPromptOpen]);

  const handleRoute = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || isExecuting || !selectedModel) return;
    setRouteError('');
    try {
      const record = await runInference({ prompt, refine: false, preferredModelId: preferredModel === 'auto' ? undefined : preferredModel });
      setRoutedRecord(record);
      sessionStorage.setItem('zot-route-record', JSON.stringify(record));
      if (record.status === 'error') setRouteError(record.error_message || 'The selected model could not complete the request.');
    } catch (error) {
      setRouteError(error instanceof Error ? error.message : 'Unable to route this prompt.');
    }
  };

  const copyOutput = async () => {
    if (!routedRecord) return;
    const output = routedRecord.status === 'error' ? routedRecord.error_message || '' : routedRecord.response_text;
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopiedOutput(true);
      window.setTimeout(() => setCopiedOutput(false), 1500);
    } catch {
      setRouteError('Clipboard access is unavailable in this browser. Select and copy the response text instead.');
    }
  };

  const copyPrompt = async () => {
    if (!routedRecord?.original_prompt) return;
    try {
      await navigator.clipboard.writeText(routedRecord.original_prompt);
      setCopiedPrompt(true);
      window.setTimeout(() => setCopiedPrompt(false), 1500);
    } catch {
      setRouteError('Clipboard access is unavailable in this browser. Select and copy the prompt text instead.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="page-heading">
        <div>
          <div className="eyebrow">{t('routing.eyebrow')}</div>
          <h1>{t('routing.title')}</h1>
          <p>{t('routing.description')}</p>
        </div>
        <div className="flex gap-2">
          <button className={view === 'grid' ? 'button primary' : 'button'} onClick={() => setView('grid')} aria-label={t('routing.grid')}><Grid2X2 size={15} /></button>
          <button className={view === 'table' ? 'button primary' : 'button'} onClick={() => setView('table')} aria-label={t('routing.table')}><List size={15} /></button>
        </div>
      </div>

      {routeError && <div className="alert">{routeError}</div>}

      <div className="panel">
        <form className="panel-body space-y-4" onSubmit={handleRoute}>
          <div className="field">
            <label htmlFor="route-prompt">{t('routing.prompt')}</label>
            <textarea id="route-prompt" className="textarea" rows={5} value={prompt} onChange={event => { setPrompt(event.target.value); sessionStorage.setItem('zot-route-prompt', event.target.value); }} placeholder="Type a prompt to route…" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="field min-w-[250px] flex-1">
              <label htmlFor="preferred-model">{t('routing.target')}</label>
              <select id="preferred-model" className="select" value={preferredModel} onChange={event => setPreferredModel(event.target.value)}>
                <option value="auto">Auto route</option>
                {enabledModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
              </select>
            </div>
            <button className="button primary" type="submit" disabled={!prompt.trim() || isExecuting || !selectedModel}>
              <Send size={15} /> {isExecuting ? t('routing.routing') : t('routing.route')}
            </button>
          </div>
        </form>
      </div>

      {routedRecord && <div className="metric-grid">
        <div className="metric"><div className="metric-label">{t('routing.task')}</div><div className="metric-value text-lg">{routedRecord.task_type}</div><div className="metric-note">Recorded route</div></div>
        <div className="metric"><div className="metric-label">{t('analytics.tokens')}</div><div className="metric-value">{routedRecord.total_tokens.toLocaleString()}</div><div className="metric-note">{routedRecord.input_tokens} in · {routedRecord.output_tokens} out</div></div>
        <div className="metric"><div className="metric-label">{t('routing.latency')}</div><div className="metric-value">{routedRecord.latency_ms}ms</div><div className="metric-note">Measured for this request</div></div>
        <div className="metric"><div className="metric-label">{t('routing.cost')}</div><div className="metric-value">{formatCurrency(routedRecord.actual_cost)}</div><div className="metric-note">{routedRecord.status === 'error' ? 'No completed generation' : 'Based on configured model pricing'}</div></div>
      </div>}

      {routedRecord && (
        <div className="panel">
          <div className="panel-header"><div><div className="panel-title flex items-center gap-2"><Check size={15} className="text-emerald-400" /> {t('routing.lastDecision')}</div><div className="panel-subtitle">{routedRecord.status === 'error' ? 'Request failed' : `Response from ${routedRecord.model_name}`}</div></div><div className="flex items-center gap-2"><span className={routedRecord.status === 'error' ? 'badge warn' : 'badge success'}>{routedRecord.status}</span><button className="button" onClick={() => void copyOutput()} disabled={routedRecord.status === 'success' && !routedRecord.response_text}><Copy size={14} /> {copiedOutput ? 'Copied' : 'Copy output'}</button></div></div>
          <div className="panel-body"><pre className={`routing-output ${routedRecord.status === 'error' ? 'routing-output-error' : ''}`}>{routedRecord.status === 'error' ? routedRecord.error_message : routedRecord.response_text}</pre></div>
          <div className="panel-body grid-3"><div><div className="metric-label">{t('routing.task')}</div><strong>{routedRecord.task_type}</strong></div><div><div className="metric-label">{t('routing.selectedModel')}</div><strong className="accent">{routedRecord.model_name}</strong></div><div><div className="metric-label">Prompt used</div><button type="button" className="button px-3 py-1.5 text-xs" onClick={() => { setCopiedPrompt(false); setIsPromptOpen(true); }}>User Input</button></div></div>
        </div>
      )}

      {isPromptOpen && routedRecord && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
          onMouseDown={event => { if (event.target === event.currentTarget) setIsPromptOpen(false); }}
        >
          <section className="panel w-full max-w-2xl" role="dialog" aria-modal="true" aria-labelledby="routing-user-input-title">
            <div className="panel-header">
              <div>
                <div id="routing-user-input-title" className="panel-title">User Input</div>
                <div className="panel-subtitle">Prompt submitted for routing</div>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="button" onClick={() => void copyPrompt()}><Copy size={14} /> {copiedPrompt ? 'Copied' : 'Copy prompt'}</button>
                <button type="button" className="button" onClick={() => setIsPromptOpen(false)} aria-label="Close user input"><X size={15} /></button>
              </div>
            </div>
            <div className="panel-body">
              <pre className="routing-output max-h-[60vh]" tabIndex={0}>{routedRecord.original_prompt}</pre>
            </div>
          </section>
        </div>
      )}

      <div className="panel">
        <div className="panel-header"><div><div className="panel-title flex items-center gap-2"><Route size={15} className="accent" /> {t('routing.targets')}</div><div className="panel-subtitle">{t('routing.localReady')}{publicSuggestion ? ` · ${t('routing.publicSuggestion', { value: publicSuggestion.name })}` : ''}</div></div><span className="badge">{t('routing.enabled', { value: enabledModels.length })}</span></div>
        {view === 'grid' ? (
          <div className="panel-body grid-3">
            {enabledModels.map(model => <ModelCard key={model.id} model={model} onSelect={() => setPreferredModel(model.id)} onEdit={() => requestModelEdit(model.id)} onDelete={() => { if (!model.is_builtin && window.confirm(`Delete “${model.name}” from your configured models?`)) { deleteModel(model.id); if (preferredModel === model.id) setPreferredModel('auto'); } }} selected={selectedModel?.id === model.id} />)}
          </div>
        ) : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>{t('routing.selectedModel')}</th><th>{t('routing.context')}</th><th>{t('routing.cost')} / 1K</th><th>{t('routing.getApiKey')}</th></tr></thead><tbody>{enabledModels.map(model => <tr key={model.id}><td><strong>{model.name}</strong><div className="muted">{model.provider}</div></td><td>{formatContext(model.context_length)}</td><td>{model.is_free ? t('routing.free') : formatCurrency(model.input_cost_per_1k + model.output_cost_per_1k)}</td><td><div className="flex gap-2"><ModelLink model={model} /><button className="button" title="Edit model configuration" aria-label={`Edit ${model.name}`} onClick={() => requestModelEdit(model.id)}><Pencil size={14} /></button></div></td></tr>)}</tbody></table></div>
        )}
      </div>

      <div className="panel"><div className="panel-header"><div><div className="panel-title">{t('models.publicCatalog')}</div><div className="panel-subtitle">{t('models.publicCatalogNote')} · {routedRecord ? 'Usage and price are estimates for the last routed request.' : 'Route a prompt to see usage and price estimates here.'}</div></div><span className="badge">{publicModels.length.toLocaleString()}</span></div><div className="panel-body"><input className="input mb-4 max-w-md" value={catalogQuery} onChange={event => setCatalogQuery(event.target.value)} placeholder="Search all public models…" /><div className="table-wrap"><table className="data-table"><thead><tr><th>{t('routing.selectedModel')}</th><th>{t('routing.context')}</th><th>{t('analytics.tokens')}</th><th>{t('routing.cost')}</th><th>{t('routing.getApiKey')}</th></tr></thead><tbody>{visiblePublicModels.map(model => { const cost = (tokenCount / 1000) * model.input_cost_per_1k + (estimatedOutput / 1000) * model.output_cost_per_1k; return <tr key={model.id}><td><strong>{model.name}</strong><div className="muted">{model.provider}</div></td><td>{formatContext(model.context_length)}</td><td>{routedRecord ? `${tokenCount} in / ${estimatedOutput} out` : '—'}</td><td>{!routedRecord ? '—' : model.is_free ? t('routing.free') : cost ? formatCurrency(cost) : t('models.notPublished')}</td><td><ModelLink model={model} /></td></tr>; })}</tbody></table>{publicModels.length === 0 && <div className="empty-state">{t('models.catalogLoading')}</div>}</div></div></div>
    </div>
  );
};

const ModelCard: React.FC<{ model: Model; selected: boolean; onSelect: () => void; onEdit: () => void; onDelete: () => void }> = ({ model, selected, onSelect, onEdit, onDelete }) => {
  const { t, formatCurrency } = useZot();
  return <div className={`panel p-4 ${selected ? 'ring-1 ring-white' : ''}`}>
    <div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{model.name}</strong><div className="muted text-xs mt-1">{model.provider}</div></div><span className={model.is_free ? 'badge success' : 'badge'}>{model.is_free ? t('routing.free') : t('routing.api')}</span></div>
    <p className="muted text-xs mt-4 min-h-[34px]">{model.description}</p>
    <div className="grid grid-cols-2 gap-2 mt-4 text-xs"><div><div className="metric-label">{t('routing.context')}</div><strong>{formatContext(model.context_length)}</strong></div><div><div className="metric-label">{t('routing.cost')}</div><strong>{model.is_free ? t('routing.free') : formatCurrency(model.input_cost_per_1k)}</strong></div></div>
    <div className="flex gap-2 mt-4"><button className={selected ? 'button primary flex-1' : 'button flex-1'} onClick={onSelect}>{selected ? t('routing.selected') : t('routing.useRoute')}</button><ModelLink model={model} /><button className="button" onClick={onEdit} title="Edit model configuration" aria-label={`Edit ${model.name}`}><Pencil size={14} /></button><button className="button" onClick={onDelete} disabled={model.is_builtin} title="Delete model" aria-label={`Delete ${model.name}`}><Trash2 size={14} /></button></div>
  </div>;
};

const ModelLink: React.FC<{ model: Model }> = ({ model }) => {
  const { t } = useZot();
  if (model.type === 'local') return <span className="badge">Local</span>;
  const provider = model.provider.toLowerCase();
  const officialKeyUrl = provider.includes('google') || provider.includes('gemini') ? 'https://aistudio.google.com/apikey'
    : provider.includes('anthropic') || provider.includes('claude') ? 'https://console.anthropic.com/settings/keys'
    : provider.includes('openai') || provider.includes('chatgpt') ? 'https://platform.openai.com/api-keys'
    : provider.includes('deepseek') ? 'https://platform.deepseek.com/api_keys'
    : provider.includes('mistral') ? 'https://console.mistral.ai/api-keys/'
    : provider.includes('perplexity') ? 'https://www.perplexity.ai/settings/api'
    : provider.includes('groq') ? 'https://console.groq.com/keys'
    : provider.includes('together') ? 'https://api.together.ai/settings/api-keys'
    : provider.includes('fireworks') ? 'https://fireworks.ai/account/api-keys'
    : provider.includes('xai') || provider.includes('x.ai') ? 'https://console.x.ai/'
    : provider.includes('cohere') ? 'https://dashboard.cohere.com/api-keys'
    : provider.includes('hugging') ? 'https://huggingface.co/settings/tokens'
    : model.docs_url || '#';
  return <a className="button" href={officialKeyUrl} target="_blank" rel="noreferrer" title={t('routing.getApiKey')}><ExternalLink size={14} /> <span className="hidden sm:inline">{t('routing.getApiKey')}</span></a>;
};

import React, { useMemo, useState } from 'react';
import { BarChart3, Check, ExternalLink, Grid2X2, List, Route, Send } from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { countTokens } from '../../lib/tokenizer';
import { classifyPrompt, routePrompt } from '../../lib/routingEngine';
import { Model } from '../../types';

const formatContext = (value: number) => value >= 1024 ? `${Math.round(value / 1024)}K` : `${value}`;

export const RoutingView: React.FC = () => {
  const { models, publicModels, runInference, isExecuting, lastExecutionMetrics, formatCurrency, t } = useZot();
  const [prompt, setPrompt] = useState('How do I make a paper rocket?');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [preferredModel, setPreferredModel] = useState('auto');
  const [catalogQuery, setCatalogQuery] = useState('');

  const enabledModels = useMemo(() => models.filter(model => model.enabled), [models]);
  const route = routePrompt(prompt, enabledModels, preferredModel === 'auto' ? undefined : preferredModel);
  const publicSuggestion = useMemo(() => {
    if (publicModels.length === 0) return undefined;
    const decision = routePrompt(prompt, publicModels.map(model => ({ ...model, enabled: true })), undefined);
    return publicModels.find(model => model.id === decision.selected_model);
  }, [prompt, publicModels]);
  const classification = classifyPrompt(prompt);
  const selectedModel = enabledModels.find(model => model.id === route.selected_model) || enabledModels[0];
  const tokenCount = countTokens(prompt);
  const estimatedOutput = Math.max(24, Math.round(tokenCount * 1.5));
  const estimatedCost = selectedModel ? ((tokenCount / 1000) * selectedModel.input_cost_per_1k) + ((estimatedOutput / 1000) * selectedModel.output_cost_per_1k) : 0;
  const visiblePublicModels = useMemo(() => publicModels.filter(model => `${model.name} ${model.provider} ${model.id}`.toLowerCase().includes(catalogQuery.toLowerCase())), [catalogQuery, publicModels]);

  const handleRoute = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt.trim() || isExecuting || !selectedModel) return;
    await runInference({ prompt, refine: false, preferredModelId: preferredModel === 'auto' ? undefined : preferredModel });
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

      <div className="panel">
        <form className="panel-body space-y-4" onSubmit={handleRoute}>
          <div className="field">
            <label htmlFor="route-prompt">{t('routing.prompt')}</label>
            <textarea id="route-prompt" className="textarea" rows={5} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder="Type a prompt to route…" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="field min-w-[250px] flex-1">
              <label htmlFor="preferred-model">{t('routing.target')}</label>
              <select id="preferred-model" className="select" value={preferredModel} onChange={event => setPreferredModel(event.target.value)}>
                <option value="auto">{t('routing.auto')} · {selectedModel?.name || t('routing.noModel')}</option>
                {enabledModels.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}
              </select>
            </div>
            <button className="button primary" type="submit" disabled={!prompt.trim() || isExecuting || !selectedModel}>
              <Send size={15} /> {isExecuting ? t('routing.routing') : t('routing.route')}
            </button>
          </div>
        </form>
      </div>

      <div className="metric-grid">
        <div className="metric"><div className="metric-label">{t('routing.task')}</div><div className="metric-value text-lg">{classification.task}</div><div className="metric-note">{t('routing.confidence', { value: Math.round(route.task_confidence * 100) })}</div></div>
        <div className="metric"><div className="metric-label">{t('analytics.tokens')}</div><div className="metric-value">{tokenCount}</div><div className="metric-note">{t('routing.estimatedOutput', { value: estimatedOutput })}</div></div>
        <div className="metric"><div className="metric-label">{t('routing.latency')}</div><div className="metric-value">{selectedModel?.latency_ms_avg ?? 0}ms</div><div className="metric-note">{t('routing.averageLatency')}</div></div>
        <div className="metric"><div className="metric-label">{t('routing.cost')}</div><div className="metric-value">{formatCurrency(estimatedCost)}</div><div className="metric-note">{t('routing.currentCurrency')}</div></div>
      </div>

      {lastExecutionMetrics && (
        <div className="panel">
          <div className="panel-header"><div><div className="panel-title flex items-center gap-2"><Check size={15} className="text-emerald-400" /> {t('routing.lastDecision')}</div><div className="panel-subtitle">{t('routing.noResponse')}</div></div><span className="badge success">{t('routing.confidence', { value: Math.round(lastExecutionMetrics.routing_decision.task_confidence * 100) })}</span></div>
          <div className="panel-body grid-3"><div><div className="metric-label">{t('routing.task')}</div><strong>{lastExecutionMetrics.task_type}</strong></div><div><div className="metric-label">{t('routing.selectedModel')}</div><strong className="accent">{lastExecutionMetrics.model_name}</strong></div><div><div className="metric-label">{t('routing.reason')}</div><strong>{lastExecutionMetrics.routing_decision.reason}</strong></div></div>
        </div>
      )}

      <div className="panel">
        <div className="panel-header"><div><div className="panel-title flex items-center gap-2"><Route size={15} className="accent" /> {t('routing.targets')}</div><div className="panel-subtitle">{t('routing.localReady')}{publicSuggestion ? ` · ${t('routing.publicSuggestion', { value: publicSuggestion.name })}` : ''}</div></div><span className="badge">{t('routing.enabled', { value: enabledModels.length })}</span></div>
        {view === 'grid' ? (
          <div className="panel-body grid-3">
            {enabledModels.map(model => <ModelCard key={model.id} model={model} onSelect={() => setPreferredModel(model.id)} selected={selectedModel?.id === model.id} />)}
          </div>
        ) : (
          <div className="table-wrap"><table className="data-table"><thead><tr><th>{t('routing.selectedModel')}</th><th>{t('routing.context')}</th><th>{t('routing.latency')}</th><th>{t('routing.cost')} / 1K</th><th>{t('routing.getApiKey')}</th></tr></thead><tbody>{enabledModels.map(model => <tr key={model.id}><td><strong>{model.name}</strong><div className="muted">{model.provider}</div></td><td>{formatContext(model.context_length)}</td><td>{model.latency_ms_avg}ms</td><td>{model.is_free ? t('routing.free') : `$${(model.input_cost_per_1k + model.output_cost_per_1k).toFixed(4)}`}</td><td><ModelLink model={model} /></td></tr>)}</tbody></table></div>
        )}
      </div>

      <div className="panel"><div className="panel-header"><div><div className="panel-title">{t('models.publicCatalog')}</div><div className="panel-subtitle">{t('models.publicCatalogNote')} · {t('analytics.tokens')}: {tokenCount} · {t('routing.estimatedOutput', { value: estimatedOutput })}</div></div><span className="badge">{publicModels.length.toLocaleString()}</span></div><div className="panel-body"><input className="input mb-4 max-w-md" value={catalogQuery} onChange={event => setCatalogQuery(event.target.value)} placeholder="Search all public models…" /><div className="table-wrap"><table className="data-table"><thead><tr><th>{t('routing.selectedModel')}</th><th>{t('routing.context')}</th><th>{t('analytics.tokens')}</th><th>{t('routing.latency')}</th><th>{t('routing.cost')}</th><th>{t('routing.getApiKey')}</th></tr></thead><tbody>{visiblePublicModels.map(model => { const cost = (tokenCount / 1000) * model.input_cost_per_1k + (estimatedOutput / 1000) * model.output_cost_per_1k; return <tr key={model.id}><td><strong>{model.name}</strong><div className="muted">{model.provider}</div></td><td>{formatContext(model.context_length)}</td><td>{tokenCount} in / {estimatedOutput} out</td><td>{model.latency_ms_avg ? `${model.latency_ms_avg}ms` : t('models.notPublished')}</td><td>{model.is_free ? t('routing.free') : cost ? formatCurrency(cost) : t('models.notPublished')}</td><td><ModelLink model={model} /></td></tr>; })}</tbody></table>{publicModels.length === 0 && <div className="empty-state">{t('models.catalogLoading')}</div>}</div></div></div>
    </div>
  );
};

const ModelCard: React.FC<{ model: Model; selected: boolean; onSelect: () => void }> = ({ model, selected, onSelect }) => {
  const { t } = useZot();
  return <div className={`panel p-4 ${selected ? 'ring-1 ring-white' : ''}`}>
    <div className="flex items-start justify-between gap-3"><div><strong className="text-sm">{model.name}</strong><div className="muted text-xs mt-1">{model.provider}</div></div><span className={model.is_free ? 'badge success' : 'badge'}>{model.is_free ? t('routing.free') : t('routing.api')}</span></div>
    <p className="muted text-xs mt-4 min-h-[34px]">{model.description}</p>
    <div className="grid grid-cols-3 gap-2 mt-4 text-xs"><div><div className="metric-label">{t('routing.context')}</div><strong>{formatContext(model.context_length)}</strong></div><div><div className="metric-label">{t('routing.latency')}</div><strong>{model.latency_ms_avg}ms</strong></div><div><div className="metric-label">{t('routing.cost')}</div><strong>{model.is_free ? '$0' : `$${model.input_cost_per_1k}/K`}</strong></div></div>
    <div className="flex gap-2 mt-4"><button className={selected ? 'button primary flex-1' : 'button flex-1'} onClick={onSelect}>{selected ? t('routing.selected') : t('routing.useRoute')}</button><ModelLink model={model} /></div>
  </div>;
};

const ModelLink: React.FC<{ model: Model }> = ({ model }) => {
  const { t } = useZot();
  return <a className="button" href={model.docs_url || '#'} target="_blank" rel="noreferrer" title={t('routing.getApiKey')}><ExternalLink size={14} /> <span className="hidden sm:inline">{t('routing.getApiKey')}</span></a>;
};

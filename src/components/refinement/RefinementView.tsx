import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, ExternalLink, KeyRound, Plus, Sparkles } from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { calculateSemanticSimilarity, countTokens, extractConstraints, refinePrompt } from '../../lib/tokenizer';
import { requestModelChat } from '../../lib/modelClient';

const normalize = (value: string) => value.toLowerCase().replace(/\s+/g, ' ').trim();

export const RefinementView: React.FC = () => {
  const { models, addModel, hfAuthState, connectHuggingFace, disconnectHuggingFace, activeRefinerVersion, refinerVersions, settings, requestNavigation, t } = useZot();
  const configuredModels = useMemo(() => models.filter(model => !model.is_builtin), [models]);
  const [selectedModelId, setSelectedModelId] = useState('');
  const [hfToken, setHfToken] = useState('');
  const [hfModelId, setHfModelId] = useState('');
  const [prompt, setPrompt] = useState('');
  const [refined, setRefined] = useState('');
  const [error, setError] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    if (selectedModelId && !configuredModels.some(model => model.id === selectedModelId)) {
      setSelectedModelId('');
    }
  }, [configuredModels, selectedModelId]);

  const localResult = useMemo(() => prompt.trim() ? refinePrompt(prompt, activeRefinerVersion, settings.min_similarity_threshold) : null, [prompt, activeRefinerVersion, settings.min_similarity_threshold]);
  const selectedModel = configuredModels.find(model => model.id === selectedModelId);
  const refinedTokens = refined ? countTokens(refined) : 0;
  const originalTokens = countTokens(prompt);
  const savedTokens = Math.max(0, originalTokens - refinedTokens);
  const reduction = originalTokens ? Number((savedTokens / originalTokens * 100).toFixed(1)) : 0;

  const run = async () => {
    if (!prompt.trim() || !localResult || isRefining) return;
    setError('');
    setIsRefining(true);
    if (!selectedModel) {
      setError('No model selected. Select a configured model before refining this prompt.');
      setIsRefining(false);
      return;
    }

    try {
      const protectedConstraints = extractConstraints(prompt);
      const constraintsText = protectedConstraints.length
        ? protectedConstraints.map(item => `- ${item.type}: ${item.text}`).join('\n')
        : '- Preserve the request topic, intent, and any explicit requirements.';
      const response = await requestModelChat(selectedModel, [
        { role: 'system', content: `Rewrite the user prompt to remove greetings, filler, repetition, and unnecessary wording while keeping it clear and actionable. Preserve the user's actual task and every constraint below verbatim. Do not answer the prompt. Return only the refined prompt.\n\nProtected constraints:\n${constraintsText}` },
        { role: 'user', content: prompt },
      ], settings.request_timeout_ms);
      const candidate = response.text.trim();
      const normalizedCandidate = normalize(candidate);
      const constraintsPreserved = protectedConstraints.every(item => normalizedCandidate.includes(normalize(item.text)));
      const reducesTokens = countTokens(candidate) < countTokens(prompt);
      const similarity = calculateSemanticSimilarity(prompt, candidate);
      if (!candidate || !constraintsPreserved || !reducesTokens || similarity < settings.min_similarity_threshold) {
        setRefined('');
        setError('The selected model could not safely shorten this prompt while preserving its constraints. Please try another model or revise the prompt.');
      } else {
        setRefined(candidate);
      }
    } catch (failure) {
      setRefined('');
      setError(failure instanceof Error ? failure.message : 'The selected model could not refine this prompt.');
    } finally {
      setIsRefining(false);
    }
  };

  const connectHf = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      if (!await connectHuggingFace(hfToken)) setError('Hugging Face token verification failed. Use a token with Inference Providers permission.');
      else setHfToken('');
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not connect to Hugging Face.');
    }
  };

  const addHfModel = (event: React.FormEvent) => {
    event.preventDefault();
    const repo = hfModelId.trim();
    if (!repo || !hfAuthState.isConnected || models.some(model => model.id === repo)) return;
    addModel({
      id: repo, name: repo.split('/').pop() || repo, provider: 'Hugging Face', type: 'api', connection_mode: 'api', tier: 'paid',
      endpoint: 'https://router.huggingface.co/v1/chat/completions', context_length: 32768,
      input_cost_per_1k: 0, output_cost_per_1k: 0, is_free: false, enabled: true, priority: models.length + 1,
      status: 'ready', latency_ms_avg: 0, tokens_per_sec: 0,
      description: `Hugging Face Inference Providers model: ${repo}.`, docs_url: 'https://huggingface.co/settings/tokens',
      api_key: hfAuthState.apiKey, api_key_label: 'Hugging Face token',
    });
    setSelectedModelId(repo);
    setHfModelId('');
  };

  return <div className="space-y-6">
    <div className="page-heading"><div><div className="eyebrow">{t('refinement.eyebrow')}</div><h1>{t('refinement.title')}</h1><p>{t('refinement.connectedDescription')}</p></div></div>

    <div className="panel"><div className="panel-header"><div><div className="panel-title">Hugging Face Inference API</div><div className="panel-subtitle">Connect an HF token, add a model repository, then use it for refinement below.</div></div><a className="button" href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer"><ExternalLink size={14} /> Get token</a></div><div className="panel-body space-y-4">{!hfAuthState.isConnected ? <form className="flex flex-wrap items-end gap-3" onSubmit={connectHf}><div className="field flex-1 min-w-[260px]"><label htmlFor="refine-hf-token">Hugging Face token</label><input id="refine-hf-token" className="input" type="password" value={hfToken} onChange={event => setHfToken(event.target.value)} placeholder="hf_… · requires Inference Providers permission" required /></div><button className="button primary" type="submit"><KeyRound size={14} /> Connect Hugging Face</button></form> : <><div className="flex flex-wrap items-center justify-between gap-3"><span className="badge success">Connected as {hfAuthState.username}</span><button className="button" onClick={disconnectHuggingFace}>Disconnect</button></div><form className="grid-2 items-end" onSubmit={addHfModel}><div className="field"><label htmlFor="hf-model-id">Hugging Face model ID</label><input id="hf-model-id" className="input" value={hfModelId} onChange={event => setHfModelId(event.target.value)} placeholder="owner/model-name" required /></div><button className="button primary" type="submit" disabled={!hfModelId.trim() || models.some(model => model.id === hfModelId.trim())}><Plus size={14} /> Add HF model to ZOT</button></form><p className="muted text-xs">Uses Hugging Face Inference Providers. The token remains in this browser. The chosen model must be available to your token.</p></>}{error && <div className="alert">{error}</div>}</div></div>

    <div className="panel"><div className="panel-header"><div><div className="panel-title">{t('refinement.modelTitle')}</div><div className="panel-subtitle">{t('refinement.modelNote')}</div></div><span className="badge">{t('models.configured', { value: configuredModels.length })}</span></div><div className="panel-body grid-2 items-end"><div className="field"><label htmlFor="refinement-model">{t('refinement.modelToUse')}</label><select id="refinement-model" className="select" value={selectedModelId} onChange={event => setSelectedModelId(event.target.value)}><option value="">No model selected</option>{configuredModels.map(model => <option key={model.id} value={model.id}>{model.name} · {model.type === 'local' ? 'Local' : model.provider}</option>)}</select></div><div className="flex items-center gap-2 muted text-sm">{selectedModel ? <><span className="badge">{selectedModel.type === 'local' ? 'Local' : 'API'}</span><span>{selectedModel.name}</span></> : <span>No model selected</span>}</div>{configuredModels.length === 0 && <div className="alert col-span-2">{t('refinement.noModels')}<button className="button ml-2" onClick={() => requestNavigation('models')}>{t('refinement.openModels')} <ArrowRight size={14} /></button></div>}</div></div>

    <div className="grid-2"><div className="panel"><div className="panel-header"><div className="panel-title">{t('refinement.input')}</div><span className="badge">{originalTokens} tokens</span></div><div className="panel-body space-y-4"><textarea className="textarea" rows={9} value={prompt} onChange={event => { setPrompt(event.target.value); setRefined(''); setError(''); }} placeholder={t('refinement.promptPlaceholder')} /><div className="flex flex-wrap items-center justify-between gap-3"><select className="select max-w-[240px]" value={activeRefinerVersion} disabled><option>{refinerVersions.find(version => version.id === activeRefinerVersion)?.name || activeRefinerVersion}</option></select><button className="button primary" onClick={() => void run()} disabled={!prompt.trim() || !selectedModel || isRefining}><Sparkles size={15} /> {isRefining ? t('refinement.refining') : t('refinement.refine')}</button></div></div></div>

      <div className="panel"><div className="panel-header"><div className="panel-title">{t('refinement.refined')}</div><span className={refined ? 'badge success' : 'badge'}>{refined ? t('refinement.ready') : t('refinement.waiting')}</span></div><div className="panel-body"><div className="min-h-[250px] rounded-lg border border-[#2b2b2b] bg-[#0d0d0d] p-4 text-sm leading-7 whitespace-pre-wrap">{refined || <span className="muted">{t('refinement.appears')}</span>}</div>{refined && <div className="grid grid-cols-3 gap-3 mt-4 text-xs"><div><div className="metric-label">{t('refinement.savedTokens')}</div><strong>{savedTokens}</strong></div><div><div className="metric-label">{t('refinement.reduction')}</div><strong>{reduction}%</strong></div><div><div className="metric-label">{t('refinement.protectedConstraints')}</div><strong>{localResult?.metrics.detected_constraints.length || 0}</strong></div></div>}</div></div></div>
  </div>;
};

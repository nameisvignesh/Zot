import React, { useMemo, useState } from 'react';
import { Check, ExternalLink, KeyRound, Save, Sparkles } from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { countTokens, refinePrompt } from '../../lib/tokenizer';

const PROVIDERS = [
  ['OpenAI', 'https://platform.openai.com/api-keys'],
  ['Anthropic / Claude', 'https://console.anthropic.com/settings/keys'],
  ['Google AI Studio', 'https://aistudio.google.com/apikey'],
  ['Hugging Face', 'https://huggingface.co/settings/tokens'],
];

export const RefinementView: React.FC = () => {
  const { hfAuthState, connectHuggingFace, disconnectHuggingFace, activeRefinerVersion, refinerVersions, settings, t } = useZot();
  const [token, setToken] = useState('');
  const [provider, setProvider] = useState('OpenAI');
  const [providerToken, setProviderToken] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [accessSaved, setAccessSaved] = useState(() => typeof window !== 'undefined' && Boolean(window.localStorage.getItem('zot_refinement_access_v1')));
  const [prompt, setPrompt] = useState('');
  const [refined, setRefined] = useState('');
  const [error, setError] = useState('');

  const result = useMemo(() => prompt ? refinePrompt(prompt, activeRefinerVersion, settings.min_similarity_threshold) : null, [prompt, activeRefinerVersion, settings.min_similarity_threshold]);
  const run = () => { if (!prompt.trim() || !result) return; setRefined(result.refinedText); };
  const connect = async (event: React.FormEvent) => { event.preventDefault(); if (!token.trim()) return; setError(''); const ok = await connectHuggingFace(token); if (!ok) setError('Unable to verify the Hugging Face token.'); };
  const saveProviderAccess = (event: React.FormEvent) => {
    event.preventDefault();
    if (!providerToken.trim()) return;
    window.localStorage.setItem('zot_refinement_access_v1', JSON.stringify({ provider, endpoint: endpoint.trim(), token: providerToken.trim() }));
    setProviderToken('');
    setAccessSaved(true);
  };

  const commonAccess = <div className="panel"><div className="panel-header"><div><div className="panel-title">{t('refinement.commonAccess')}</div><div className="panel-subtitle">{t('refinement.commonAccessNote')}</div></div>{accessSaved && <span className="badge success"><Check size={11} /> {t('refinement.accessSaved')}</span>}</div><form className="panel-body grid-3" onSubmit={saveProviderAccess}><div className="field"><label htmlFor="refinement-provider">{t('refinement.commonProvider')}</label><select id="refinement-provider" className="select" value={provider} onChange={event => setProvider(event.target.value)}><option>OpenAI</option><option>Anthropic / Claude</option><option>Google Gemini</option><option>DeepSeek</option><option>OpenRouter</option><option>Hugging Face</option></select></div><div className="field"><label htmlFor="refinement-token">{t('refinement.commonToken')}</label><input id="refinement-token" className="input" type="password" value={providerToken} onChange={event => setProviderToken(event.target.value)} placeholder="provider token" /></div><div className="field"><label htmlFor="refinement-endpoint">{t('refinement.commonEndpoint')}</label><input id="refinement-endpoint" className="input" value={endpoint} onChange={event => setEndpoint(event.target.value)} placeholder="https://…/chat/completions" /><button className="button primary mt-2" type="submit"><Save size={14} /> {t('refinement.saveAccess')}</button></div></form></div>;

  if (!hfAuthState.isConnected && !accessSaved) return <div className="space-y-6"><div className="page-heading"><div><div className="eyebrow">{t('refinement.eyebrow')}</div><h1>{t('refinement.title')}</h1><p>{t('refinement.gateDescription')}</p></div></div><div className="panel max-w-xl"><form className="panel-body space-y-4" onSubmit={connect}><div className="field"><label htmlFor="hf-token">{t('refinement.token')}</label><input id="hf-token" className="input" type="password" value={token} onChange={event => setToken(event.target.value)} placeholder="hf_…" required /><small>{t('refinement.tokenHelp')}</small></div>{error && <div className="alert">{error}</div>}<div className="flex flex-wrap gap-2"><button className="button primary" type="submit"><KeyRound size={15} /> {t('refinement.enterToken')}</button><a className="button" href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer"><ExternalLink size={14} /> {t('refinement.getToken')}</a></div></form></div>{commonAccess}<ProviderLinks /></div>;

  return <div className="space-y-6"><div className="page-heading"><div><div className="eyebrow">{t('refinement.connected', { value: hfAuthState.username || 'provider token ready' })}</div><h1>{t('refinement.title')}</h1><p>{t('refinement.connectedDescription')}</p></div>{hfAuthState.isConnected && <button className="button" onClick={disconnectHuggingFace}>{t('refinement.disconnect')}</button>}</div>{commonAccess}<div className="grid-2"><div className="panel"><div className="panel-header"><div className="panel-title">{t('refinement.input')}</div><span className="badge">{countTokens(prompt)} tokens</span></div><div className="panel-body space-y-4"><textarea className="textarea" rows={9} value={prompt} onChange={event => setPrompt(event.target.value)} placeholder={t('refinement.promptPlaceholder')} /><div className="flex justify-between gap-3"><select className="select max-w-[240px]" value={activeRefinerVersion} disabled><option>{refinerVersions.find(version => version.id === activeRefinerVersion)?.name || activeRefinerVersion}</option></select><button className="button primary" onClick={run} disabled={!prompt.trim()}><Sparkles size={15} /> {t('refinement.refine')}</button></div></div></div><div className="panel"><div className="panel-header"><div className="panel-title">{t('refinement.refined')}</div><span className="badge success">{refined ? t('refinement.ready') : t('refinement.waiting')}</span></div><div className="panel-body"><div className="min-h-[250px] rounded-lg border border-[#2b2b2b] bg-[#0d0d0d] p-4 text-sm leading-7">{refined || <span className="muted">{t('refinement.appears')}</span>}</div>{result && <div className="grid grid-cols-3 gap-3 mt-4 text-xs"><div><div className="metric-label">{t('refinement.saved')}</div><strong>{result.metrics.tokens_saved}</strong></div><div><div className="metric-label">{t('refinement.reduction')}</div><strong>{result.metrics.reduction_percentage}%</strong></div><div><div className="metric-label">{t('refinement.similarity')}</div><strong>{(result.metrics.semantic_similarity * 100).toFixed(0)}%</strong></div></div>}</div></div></div><ProviderLinks /></div>;
};

const ProviderLinks: React.FC = () => { const { t } = useZot(); return <div className="panel"><div className="panel-header"><div><div className="panel-title">{t('refinement.otherKeys')}</div><div className="panel-subtitle">{t('refinement.otherKeysNote')}</div></div></div><div className="panel-body provider-grid">{PROVIDERS.map(([label, url]) => <a className="provider-card" href={url} target="_blank" rel="noreferrer" key={label}><div><strong>{label}</strong><span>{t('refinement.openKey')}</span></div><ExternalLink size={14} className="muted" /></a>)}</div></div>; };

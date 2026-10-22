import React, { useMemo, useState } from 'react';
import { AlertTriangle, Coins, Gauge, RefreshCw } from 'lucide-react';
import { useZot } from '../../context/ZotContext';

const LIMITS = [100, 500, 1000, 5000, 10000, 25000, 50000];

export const CostAnalyticsView: React.FC = () => {
  const { requests, settings, convertCurrency, formatCurrency, t } = useZot();
  const [limit, setLimit] = useState(100);
  const [customLimit, setCustomLimit] = useState('');
  const spent = useMemo(() => requests.reduce((sum, request) => sum + request.actual_cost, 0), [requests]);
  const tokens = useMemo(() => requests.reduce((sum, request) => sum + request.total_tokens, 0), [requests]);
  const spentInCurrency = convertCurrency(spent);
  const percent = limit ? Math.min(100, (spentInCurrency / limit) * 100) : 0;
  const reached = spentInCurrency >= limit;
  const formatLocalCurrency = (amount: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: settings.cost_currency, maximumFractionDigits: 2 }).format(amount);
  const updateCustomLimit = (value: string) => {
    setCustomLimit(value);
    const number = Number(value);
    if (Number.isFinite(number) && number >= 100) setLimit(Math.min(50000, number));
  };

  return (
    <div className="space-y-6">
      <div className="page-heading"><div><div className="eyebrow">{t('cost.eyebrow')}</div><h1>{t('cost.title')}</h1><p>{t('cost.description', { value: settings.cost_currency })}</p></div><span className="badge"><Coins size={12} /> {settings.cost_currency}</span></div>
      <div className="metric-grid"><div className="metric"><div className="metric-label">{t('cost.current')}</div><div className="metric-value">{formatCurrency(spent)}</div><div className="metric-note">{t('cost.acrossModels')}</div></div><div className="metric"><div className="metric-label">{t('cost.tokensUsed')}</div><div className="metric-value">{tokens.toLocaleString()}</div><div className="metric-note">{t('cost.inputOutput')}</div></div><div className="metric"><div className="metric-label">{t('cost.requests')}</div><div className="metric-value">{requests.length}</div><div className="metric-note">{t('cost.tracked')}</div></div><div className="metric"><div className="metric-label">{t('cost.currency')}</div><div className="metric-value">{settings.cost_currency}</div><div className="metric-note">{t('cost.changeSettings')}</div></div></div>

      <div className="panel"><div className="panel-header"><div><div className="panel-title flex items-center gap-2"><Gauge size={15} className="accent" /> {t('cost.meter')}</div><div className="panel-subtitle">{t('cost.meterNote')}</div></div><div className="flex flex-wrap items-center justify-end gap-2"><select className="select w-auto" value={LIMITS.includes(limit) ? limit : 'custom'} onChange={event => { const value = event.target.value; if (value === 'custom') return; setCustomLimit(''); setLimit(Number(value)); }}>{LIMITS.map(value => <option key={value} value={value}>{formatLocalCurrency(value)} limit</option>)}{!LIMITS.includes(limit) && <option value="custom">{formatLocalCurrency(limit)} custom</option>}</select><div className="field"><label htmlFor="custom-cost-limit">{t('cost.customLimit')}</label><input id="custom-cost-limit" className="input cost-limit-input" type="number" min="100" max="50000" step="1" value={customLimit} onChange={event => updateCustomLimit(event.target.value)} placeholder="100–50000" /></div></div></div><div className="panel-body space-y-5"><div className="flex items-end justify-between gap-4"><div><div className="metric-label">{t('cost.used')}</div><div className="text-3xl font-bold">{formatLocalCurrency(spentInCurrency)}</div></div><div className="text-right"><div className="metric-label">{t('cost.limitLabel')}</div><div className="text-lg font-semibold">{formatLocalCurrency(limit)}</div></div></div><div className="h-3 rounded-full bg-[#2a2a2a] overflow-hidden"><div className={`h-full rounded-full transition-all ${reached ? 'bg-[#ef5b5b]' : 'bg-[#fff]'}`} style={{ width: `${Math.max(1, percent)}%` }} /></div><div className="flex justify-between text-xs muted"><span>{t('cost.percent', { value: percent.toFixed(1) })}</span><span>{tokens.toLocaleString()} tokens</span></div>{reached ? <div className="alert"><div className="flex items-center gap-2 font-semibold"><AlertTriangle size={15} /> {t('cost.reached')}</div><div className="mt-1">{t('cost.reachedDetail', { tokens: tokens.toLocaleString(), amount: formatLocalCurrency(spentInCurrency) })}</div></div> : <div className="badge success"><RefreshCw size={11} /> {t('cost.alertAt', { value: formatLocalCurrency(limit) })}</div>}</div></div>

      <div className="panel"><div className="panel-header"><div className="panel-title">{t('cost.modelUsage')}</div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>{t('analytics.model')}</th><th>{t('cost.requests')}</th><th>{t('cost.tokensUsed')}</th><th>{t('cost.cost')}</th></tr></thead><tbody>{Array.from(new Set(requests.map(request => request.model_name))).map(name => { const rows = requests.filter(request => request.model_name === name); const modelTokens = rows.reduce((sum, request) => sum + request.total_tokens, 0); const modelCost = rows.reduce((sum, request) => sum + request.actual_cost, 0); return <tr key={name}><td>{name}</td><td>{rows.length}</td><td>{modelTokens.toLocaleString()}</td><td>{formatCurrency(modelCost)}</td></tr>; })}</tbody></table>{requests.length === 0 && <div className="empty-state">{t('cost.noRecords')}</div>}</div></div>
    </div>
  );
};

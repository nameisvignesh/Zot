import React, { useMemo, useState } from 'react';
import { BarChart3, Download, FileText, Network, Table2, TrendingUp } from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type AnalyticsMode = 'charts' | 'table' | 'nodes';
type ChartMetric = 'tokens' | 'latency' | 'cost';

export const AnalyticsView: React.FC = () => {
  const { requests, models, formatCurrency, t } = useZot();
  const [mode, setMode] = useState<AnalyticsMode>('charts');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('tokens');
  const [selectedModelId, setSelectedModelId] = useState('all');
  const totalTokens = requests.reduce((sum, request) => sum + request.total_tokens, 0);
  const totalSaved = requests.reduce((sum, request) => sum + request.tokens_saved, 0);
  const avgLatency = requests.length ? Math.round(requests.reduce((sum, request) => sum + request.latency_ms, 0) / requests.length) : 0;
  const successRate = requests.length ? Math.round((requests.filter(request => request.status === 'success').length / requests.length) * 100) : 100;

  const modelPerformance = useMemo(() => models.flatMap(model => {
    const modelRequests = requests.filter(request => request.model_id === model.id);
    if (!modelRequests.length) return [];
    const totalModelTokens = modelRequests.reduce((sum, request) => sum + request.total_tokens, 0);
    const totalModelCost = modelRequests.reduce((sum, request) => sum + request.actual_cost, 0);
    const modelLatency = Math.round(modelRequests.reduce((sum, request) => sum + request.latency_ms, 0) / modelRequests.length);
    return [{ model, requests: modelRequests.length, tokens: totalModelTokens, cost: totalModelCost, latency: modelLatency }];
  }), [models, requests]);

  const chartRequests = requests.filter(request => selectedModelId === 'all' || request.model_id === selectedModelId).slice(0, 8).reverse();
  const chartPoints = chartRequests.map(request => ({
    label: new Date(request.timestamp).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    model: request.model_name,
    tokens: request.total_tokens,
    latency: request.latency_ms,
    cost: request.actual_cost,
    value: chartMetric === 'tokens' ? request.total_tokens : chartMetric === 'latency' ? request.latency_ms : request.actual_cost,
  }));

  const exportCsv = () => {
    const header = ['request_id', 'timestamp', 'prompt', 'task', 'model_id', 'model', 'original_tokens', 'input_tokens', 'output_tokens', 'total_tokens', 'tokens_saved', 'reduction_percentage', 'time_to_first_token_ms', 'latency_ms', 'tokens_per_second', 'original_cost', 'actual_cost', 'cost_saved', 'currency', 'semantic_similarity', 'constraints_preserved', 'status', 'error_message'];
    const rows = requests.map(request => [request.id, request.timestamp, request.original_prompt, request.task_type, request.model_id, request.model_name, request.original_tokens, request.input_tokens, request.output_tokens, request.total_tokens, request.tokens_saved, request.reduction_percentage, request.time_to_first_token_ms, request.latency_ms, request.tokens_per_second, request.original_cost, request.actual_cost, request.cost_saved, request.currency, request.semantic_similarity, request.constraints_preserved, request.status, request.error_message || '']);
    const csv = '\uFEFF' + [header, ...rows].map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const objectUrl = link.href;
    link.download = `zot-telemetry-${Date.now()}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  };

  return (
    <div className="space-y-6">
      <div className="page-heading"><div><div className="eyebrow">{t('analytics.eyebrow')}</div><h1>{t('analytics.title')}</h1><p>{t('analytics.description')}</p></div><div className="flex flex-wrap gap-2"><div className="segmented"><button className={mode === 'charts' ? 'active' : ''} onClick={() => setMode('charts')}><BarChart3 size={14} /> {t('analytics.charts')}</button><button className={mode === 'table' ? 'active' : ''} onClick={() => setMode('table')}><Table2 size={14} /> {t('analytics.tableView')}</button><button className={mode === 'nodes' ? 'active' : ''} onClick={() => setMode('nodes')}><Network size={14} /> Nodes</button></div><button className="button primary" onClick={exportCsv}><Download size={15} /> {t('analytics.export')}</button></div></div>

      <div className="metric-grid"><div className="metric"><div className="metric-label">{t('analytics.requests')}</div><div className="metric-value">{requests.length}</div><div className="metric-note">{t('analytics.routingDecisions')}</div></div><div className="metric"><div className="metric-label">{t('analytics.successRate')}</div><div className="metric-value">{successRate}%</div><div className="metric-note">{t('analytics.completedRoutes')}</div></div><div className="metric"><div className="metric-label">{t('analytics.tokens')}</div><div className="metric-value">{totalTokens.toLocaleString()}</div><div className="metric-note">{t('analytics.saved', { value: totalSaved.toLocaleString() })}</div></div><div className="metric"><div className="metric-label">{t('analytics.averageLatency')}</div><div className="metric-value">{avgLatency}ms</div><div className="metric-note">{t('analytics.routeEstimate')}</div></div></div>

      {mode === 'charts' ? <>
        <div className="panel">
          <div className="panel-header">
            <div>
              <div className="panel-title flex items-center gap-2"><TrendingUp size={15} className="accent" /> {t('analytics.tokenGraph')}</div>
              <div className="panel-subtitle">Each point is one recorded request; hover to see tokens, latency, and cost together.</div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <select className="select max-w-[240px]" aria-label="Filter graph by model" value={selectedModelId} onChange={event => setSelectedModelId(event.target.value)}>
                <option value="all">All models</option>
                {Array.from(new Map([...models.map(model => [model.id, model.name] as const), ...requests.map(request => [request.model_id, request.model_name] as const)]).entries()).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <div className="segmented">
                <button className={chartMetric === 'tokens' ? 'active' : ''} onClick={() => setChartMetric('tokens')}>{t('analytics.metricTokens')}</button>
                <button className={chartMetric === 'latency' ? 'active' : ''} onClick={() => setChartMetric('latency')}>{t('analytics.metricLatency')}</button>
                <button className={chartMetric === 'cost' ? 'active' : ''} onClick={() => setChartMetric('cost')}>{t('analytics.metricCost')}</button>
              </div>
            </div>
          </div>
          <div className="panel-body">
            <div className="chart-line">
              {chartPoints.length ? <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartPoints} margin={{ top: 18, right: 24, bottom: 20, left: 4 }}>
                  <CartesianGrid stroke="#282a2e" strokeDasharray="3 4" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: '#8b919a', fontSize: 9 }} axisLine={false} tickLine={false} minTickGap={32} />
                  <YAxis width={58} tick={{ fill: '#8b919a', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#15171a', border: '1px solid #303239', borderRadius: 8, color: '#fff' }}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.model ? `${payload[0].payload.model} · ${String(label)}` : String(label)}
                    formatter={(_value: number, _name: string, item: any) => {
                      const point = item.payload;
                      return [`${point.tokens.toLocaleString()} tokens · ${point.latency.toLocaleString()} ms · ${formatCurrency(point.cost)}`, 'Request'];
                    }}
                  />
                  <Line type="linear" dataKey="value" name={chartMetric} stroke="#e2a640" strokeWidth={2.5} dot={{ r: 4, fill: '#e2a640', stroke: '#111' }} activeDot={{ r: 6 }}>
                    <LabelList dataKey="value" position="top" formatter={(value: number) => chartMetric === 'cost' ? formatCurrency(value) : value.toLocaleString()} style={{ fill: '#e5e7eb', fontSize: 10 }} />
                  </Line>
                </LineChart>
              </ResponsiveContainer> : <div className="empty-state w-full">{t('analytics.noTelemetry')}</div>}
            </div>
          </div>
        </div>
        <div className="panel"><div className="panel-header"><div className="panel-title">{t('analytics.modelPerformance')}</div></div><div className="table-wrap"><PerformanceTable rows={modelPerformance} formatCurrency={formatCurrency} t={t} /></div></div>
      </> : mode === 'nodes' ? <div className="panel"><div className="panel-header"><div><div className="panel-title">Model connection map</div><div className="panel-subtitle">A model turns green after a recorded successful request and red after its latest request fails. Hover a node for details.</div></div></div><div className="panel-body"><div className="chart-line" style={{ height: 360 }}><svg viewBox="0 0 760 320" role="img" aria-label="ZOT model connection map" className="w-full h-full"><circle cx="380" cy="160" r="58" fill="#15171a" stroke="#e2a640" strokeWidth="2"/><text x="380" y="165" textAnchor="middle" fill="#fff" fontSize="18" fontWeight="700">ZOT</text>{models.filter(model => model.enabled).map((model, index, visible) => { const angle = (Math.PI * 2 * index / Math.max(visible.length, 1)) - Math.PI / 2; const x = 380 + Math.cos(angle) * 250; const y = 160 + Math.sin(angle) * 112; const latest = requests.find(request => request.model_id === model.id); const color = latest ? (latest.status === 'success' ? '#21c37a' : '#ef5b5b') : model.status === 'offline' ? '#ef5b5b' : '#e2a640'; return <g key={model.id}><title>{model.name} · {latest ? `latest request ${latest.status}` : 'no request recorded'}</title><line x1="380" y1="160" x2={x} y2={y} stroke={color} strokeOpacity=".72" strokeWidth="2"/><circle cx={x} cy={y} r="17" fill={color} stroke="#0b0b0b" strokeWidth="4"/><text x={x} y={y + 34} textAnchor="middle" fill="#d1d5db" fontSize="11">{model.name.length > 24 ? `${model.name.slice(0, 22)}…` : model.name}</text></g>; })}</svg>{models.every(model => !model.enabled) && <div className="empty-state">No enabled models. Configure one in Models to add nodes.</div>}</div><div className="flex gap-4 text-xs muted mt-3"><span>● <span className="text-emerald-400">Healthy request</span></span><span>● <span className="text-red-400">Latest request failed</span></span><span>● <span className="text-amber-300">No request yet</span></span></div></div></div> : <div className="panel"><div className="panel-header"><div><div className="panel-title flex items-center gap-2"><Table2 size={15} className="accent" /> {t('analytics.table')}</div><div className="panel-subtitle">{t('analytics.tableNote')}</div></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>{t('analytics.time')}</th><th>{t('analytics.task')}</th><th>{t('analytics.model')}</th><th>{t('analytics.tokens')}</th><th>{t('analytics.latency')}</th><th>{t('analytics.cost')}</th><th>{t('analytics.status')}</th></tr></thead><tbody>{requests.map(request => <tr key={request.id}><td>{new Date(request.timestamp).toLocaleString(undefined, { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td>{request.task_type}</td><td>{request.model_name}</td><td>{request.input_tokens} in / {request.output_tokens} out</td><td>{request.latency_ms}ms</td><td>{formatCurrency(request.actual_cost)}</td><td><span className={request.status === 'success' ? 'badge success' : 'badge danger'}>{request.status}</span></td></tr>)}</tbody></table>{requests.length === 0 && <div className="empty-state"><FileText size={18} /> {t('analytics.noRecords')}</div>}</div></div>}
    </div>
  );
};

const PerformanceTable: React.FC<{ rows: Array<{ model: any; requests: number; tokens: number; cost: number; latency: number }>; formatCurrency: (value: number) => string; t: (key: string, values?: Record<string, string | number>) => string }> = ({ rows, formatCurrency, t }) => <><table className="data-table"><thead><tr><th>{t('analytics.model')}</th><th>{t('analytics.contextWindow')}</th><th>{t('analytics.requests')}</th><th>{t('analytics.tokens')}</th><th>{t('analytics.latency')}</th><th>{t('analytics.cost')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.model.id}><td><strong>{row.model.name}</strong><div className="muted">{row.model.provider}</div></td><td>{row.model.context_length.toLocaleString()}</td><td>{row.requests}</td><td>{row.tokens.toLocaleString()}</td><td>{row.latency}ms</td><td>{formatCurrency(row.cost)}</td></tr>)}</tbody></table>{rows.length === 0 && <div className="empty-state">No completed or failed model requests yet.</div>}</>;

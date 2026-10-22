import React, { useMemo, useState } from 'react';
import { BarChart3, Download, FileText, Table2, TrendingUp } from 'lucide-react';
import { useZot } from '../../context/ZotContext';

type AnalyticsMode = 'charts' | 'table';
type ChartMetric = 'tokens' | 'latency' | 'cost';

export const AnalyticsView: React.FC = () => {
  const { requests, models, formatCurrency, t } = useZot();
  const [mode, setMode] = useState<AnalyticsMode>('charts');
  const [chartMetric, setChartMetric] = useState<ChartMetric>('tokens');
  const totalTokens = requests.reduce((sum, request) => sum + request.total_tokens, 0);
  const totalSaved = requests.reduce((sum, request) => sum + request.tokens_saved, 0);
  const avgLatency = requests.length ? Math.round(requests.reduce((sum, request) => sum + request.latency_ms, 0) / requests.length) : 0;
  const successRate = requests.length ? Math.round((requests.filter(request => request.status === 'success').length / requests.length) * 100) : 100;

  const modelPerformance = useMemo(() => models.map(model => {
    const modelRequests = requests.filter(request => request.model_id === model.id);
    const totalModelTokens = modelRequests.reduce((sum, request) => sum + request.total_tokens, 0);
    const totalModelCost = modelRequests.reduce((sum, request) => sum + request.actual_cost, 0);
    const modelLatency = modelRequests.length ? Math.round(modelRequests.reduce((sum, request) => sum + request.latency_ms, 0) / modelRequests.length) : model.latency_ms_avg;
    return { model, requests: modelRequests.length, tokens: totalModelTokens, cost: totalModelCost, latency: modelLatency };
  }), [models, requests]);

  const chartPoints = requests.slice(0, 8).reverse().map(request => ({
    label: request.model_name,
    value: chartMetric === 'tokens' ? request.total_tokens : chartMetric === 'latency' ? request.latency_ms : request.actual_cost,
  }));
  const maxValue = Math.max(...chartPoints.map(point => point.value), 1);

  const exportCsv = () => {
    const header = ['timestamp', 'prompt', 'task', 'model', 'input_tokens', 'output_tokens', 'tokens_saved', 'latency_ms', 'estimated_cost', 'status'];
    const rows = requests.map(request => [request.timestamp, request.original_prompt, request.task_type, request.model_name, request.input_tokens, request.output_tokens, request.tokens_saved, request.latency_ms, request.actual_cost, request.status]);
    const csv = [header, ...rows].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = `zot-telemetry-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="space-y-6">
      <div className="page-heading"><div><div className="eyebrow">{t('analytics.eyebrow')}</div><h1>{t('analytics.title')}</h1><p>{t('analytics.description')}</p></div><div className="flex flex-wrap gap-2"><div className="segmented"><button className={mode === 'charts' ? 'active' : ''} onClick={() => setMode('charts')}><BarChart3 size={14} /> {t('analytics.charts')}</button><button className={mode === 'table' ? 'active' : ''} onClick={() => setMode('table')}><Table2 size={14} /> {t('analytics.tableView')}</button></div><button className="button primary" onClick={exportCsv}><Download size={15} /> {t('analytics.export')}</button></div></div>

      <div className="metric-grid"><div className="metric"><div className="metric-label">{t('analytics.requests')}</div><div className="metric-value">{requests.length}</div><div className="metric-note">{t('analytics.routingDecisions')}</div></div><div className="metric"><div className="metric-label">{t('analytics.successRate')}</div><div className="metric-value">{successRate}%</div><div className="metric-note">{t('analytics.completedRoutes')}</div></div><div className="metric"><div className="metric-label">{t('analytics.tokens')}</div><div className="metric-value">{totalTokens.toLocaleString()}</div><div className="metric-note">{t('analytics.saved', { value: totalSaved.toLocaleString() })}</div></div><div className="metric"><div className="metric-label">{t('analytics.averageLatency')}</div><div className="metric-value">{avgLatency}ms</div><div className="metric-note">{t('analytics.routeEstimate')}</div></div></div>

      {mode === 'charts' ? <>
        <div className="panel"><div className="panel-header"><div><div className="panel-title flex items-center gap-2"><TrendingUp size={15} className="accent" /> {t('analytics.tokenGraph')}</div><div className="panel-subtitle">{t('analytics.recentRequests')}</div></div><div className="segmented"><button className={chartMetric === 'tokens' ? 'active' : ''} onClick={() => setChartMetric('tokens')}>{t('analytics.metricTokens')}</button><button className={chartMetric === 'latency' ? 'active' : ''} onClick={() => setChartMetric('latency')}>{t('analytics.metricLatency')}</button><button className={chartMetric === 'cost' ? 'active' : ''} onClick={() => setChartMetric('cost')}>{t('analytics.metricCost')}</button></div></div><div className="panel-body"><div className="chart">{chartPoints.length ? chartPoints.map((point, index) => <div key={`${point.label}-${index}`} className="chart-bar-wrap" title={`${point.label}: ${point.value}`}><div className="chart-bar" style={{ height: `${Math.max(10, (point.value / maxValue) * 100)}%` }} /><span>#{index + 1}</span></div>) : <div className="empty-state w-full">{t('analytics.noTelemetry')}</div>}</div></div></div>
        <div className="panel"><div className="panel-header"><div className="panel-title">{t('analytics.modelPerformance')}</div></div><div className="table-wrap"><PerformanceTable rows={modelPerformance} formatCurrency={formatCurrency} t={t} /></div></div>
      </> : <div className="panel"><div className="panel-header"><div><div className="panel-title flex items-center gap-2"><Table2 size={15} className="accent" /> {t('analytics.table')}</div><div className="panel-subtitle">{t('analytics.tableNote')}</div></div></div><div className="table-wrap"><table className="data-table"><thead><tr><th>{t('analytics.time')}</th><th>{t('analytics.task')}</th><th>{t('analytics.model')}</th><th>{t('analytics.tokens')}</th><th>{t('analytics.latency')}</th><th>{t('analytics.cost')}</th><th>{t('analytics.status')}</th></tr></thead><tbody>{requests.map(request => <tr key={request.id}><td>{new Date(request.timestamp).toLocaleString()}</td><td>{request.task_type}</td><td>{request.model_name}</td><td>{request.input_tokens} in / {request.output_tokens} out</td><td>{request.latency_ms}ms</td><td>{formatCurrency(request.actual_cost)}</td><td><span className={request.status === 'success' ? 'badge success' : 'badge danger'}>{request.status}</span></td></tr>)}</tbody></table>{requests.length === 0 && <div className="empty-state"><FileText size={18} /> {t('analytics.noRecords')}</div>}</div></div>}
    </div>
  );
};

const PerformanceTable: React.FC<{ rows: Array<{ model: any; requests: number; tokens: number; cost: number; latency: number }>; formatCurrency: (value: number) => string; t: (key: string, values?: Record<string, string | number>) => string }> = ({ rows, formatCurrency, t }) => <table className="data-table"><thead><tr><th>{t('analytics.model')}</th><th>{t('analytics.contextWindow')}</th><th>{t('analytics.requests')}</th><th>{t('analytics.tokens')}</th><th>{t('analytics.latency')}</th><th>{t('analytics.cost')}</th></tr></thead><tbody>{rows.map(row => <tr key={row.model.id}><td><strong>{row.model.name}</strong><div className="muted">{row.model.provider}</div></td><td>{row.model.context_length.toLocaleString()}</td><td>{row.requests}</td><td>{row.tokens.toLocaleString()}</td><td>{row.latency}ms</td><td>{formatCurrency(row.cost)}</td></tr>)}</tbody></table>;

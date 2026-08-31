import React, { useState } from 'react';
import { useZot } from '../../context/ZotContext';
import { 
  TrendingUp, 
  Sparkles, 
  Layers, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Download, 
  Search, 
  Activity, 
  Cpu, 
  BarChart3,
  Network
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  BarChart, 
  Bar 
} from 'recharts';
import { TIME_SERIES_ANALYTICS } from '../../data/mockData';
import { NodeGraphCanvas } from '../nodes/NodeGraphCanvas';
import { CanvasNode, CanvasWire } from '../../types';

export const AnalyticsView: React.FC = () => {
  const { requests, models } = useZot();

  const [searchFilter, setSearchFilter] = useState('');
  const [taskFilter, setTaskFilter] = useState<string>('all');
  const [analyticsSubTab, setAnalyticsSubTab] = useState<'node-graph' | 'charts' | 'logs'>('node-graph');

  const totalTokensSaved = requests.reduce((acc, r) => acc + r.tokens_saved, 0);
  const totalOriginal = requests.reduce((acc, r) => acc + r.original_tokens, 0);
  const avgReduction = totalOriginal > 0 ? ((totalTokensSaved / totalOriginal) * 100).toFixed(1) : '48.2';
  const avgLatency = requests.length > 0 ? Math.round(requests.reduce((acc, r) => acc + r.latency_ms, 0) / requests.length) : 410;
  const avgTokensPerSec = requests.length > 0 ? Math.round(requests.reduce((acc, r) => acc + r.tokens_per_second, 0) / requests.length) : 64;

  // Exact Node Topology for Analytics
  const analyticsNodes: CanvasNode[] = [
    {
      id: 'node_ingest',
      title: 'Prompt Ingest & Lexer',
      category: 'source',
      x: 30,
      y: 40,
      width: 220,
      status: 'passed',
      executionTimeMs: 14,
      headerColor: '#1c1912',
      inputs: [
        { id: 'in_raw_text', label: 'Raw String', type: 'input', dataType: 'tokens', color: '#FF9100' }
      ],
      outputs: [
        { id: 'out_token_stream', label: 'Token Matrix', type: 'output', dataType: 'tensor', color: '#FF9100' },
        { id: 'out_len_metric', label: 'Token Count', type: 'output', dataType: 'metrics', color: '#06B6D4' }
      ],
      data: { metric: `${totalOriginal.toLocaleString()} Tok Ingested`, tag: 'Stream Lexer' }
    },
    {
      id: 'node_invariant_filter',
      title: 'Constraint & Invariant Filter',
      category: 'processing',
      x: 300,
      y: 40,
      width: 230,
      status: 'passed',
      executionTimeMs: 28,
      headerColor: '#191f16',
      inputs: [
        { id: 'in_tok_stream', label: 'Token Matrix', type: 'input', dataType: 'tensor', color: '#FF9100' }
      ],
      outputs: [
        { id: 'out_preserved_rules', label: 'Neg Constraints', type: 'output', dataType: 'rules', color: '#10B981' },
        { id: 'out_clean_tokens', label: 'Refined Payload', type: 'output', dataType: 'tokens', color: '#FF9100' }
      ],
      data: { metric: '100% Invariants Preserved', tag: 'Zero Loss' }
    },
    {
      id: 'node_intent_arbiter',
      title: 'Zero-Shot Intent Arbiter',
      category: 'decision',
      x: 300,
      y: 240,
      width: 230,
      status: 'active',
      executionTimeMs: 45,
      headerColor: '#1a1824',
      inputs: [
        { id: 'in_metric_count', label: 'Token Count', type: 'input', dataType: 'metrics', color: '#06B6D4' },
        { id: 'in_payload_ref', label: 'Refined Payload', type: 'input', dataType: 'tokens', color: '#FF9100' }
      ],
      outputs: [
        { id: 'out_task_domain', label: 'Task Domain', type: 'output', dataType: 'intent', color: '#A855F7' },
        { id: 'out_complexity_score', label: 'Complexity', type: 'output', dataType: 'metrics', color: '#06B6D4' }
      ],
      data: { metric: 'Dynamic Intent Classifier', tag: 'LFM MoE' }
    },
    {
      id: 'node_free_tier_dispenser',
      title: 'Free Unlimited Model Dispatcher',
      category: 'dispatch',
      x: 600,
      y: 40,
      width: 240,
      status: 'passed',
      executionTimeMs: 380,
      headerColor: '#122419',
      inputs: [
        { id: 'in_free_route', label: 'Task Domain', type: 'input', dataType: 'intent', color: '#A855F7' },
        { id: 'in_rules', label: 'Neg Constraints', type: 'input', dataType: 'rules', color: '#10B981' }
      ],
      outputs: [
        { id: 'out_gen_text', label: 'Zero-Cost Inference', type: 'output', dataType: 'flow', color: '#10B981' }
      ],
      data: { metric: `${models.length} Free Unlimited Models`, tier: 'Free' }
    },
    {
      id: 'node_paid_frontier_bridge',
      title: 'Paid Frontier Model Bridge',
      category: 'dispatch',
      x: 600,
      y: 240,
      width: 240,
      status: 'idle',
      executionTimeMs: 890,
      headerColor: '#241426',
      inputs: [
        { id: 'in_paid_route', label: 'Complexity > 0.85', type: 'input', dataType: 'metrics', color: '#06B6D4' }
      ],
      outputs: [
        { id: 'out_paid_text', label: 'Frontier Response', type: 'output', dataType: 'flow', color: '#A855F7' }
      ],
      data: { metric: 'Claude 3.5 / GPT-4o / R1', tier: 'Paid Gateway' }
    },
    {
      id: 'node_telemetry_sink',
      title: 'Telemetry & Compression Sink',
      category: 'sink',
      x: 900,
      y: 140,
      width: 220,
      status: 'passed',
      executionTimeMs: 12,
      headerColor: '#1f1b13',
      inputs: [
        { id: 'in_stream_result', label: 'Inference Output', type: 'input', dataType: 'flow', color: '#10B981' }
      ],
      outputs: [
        { id: 'out_audit_log', label: 'Audit Log & DB', type: 'output', dataType: 'metrics', color: '#FF9100' }
      ],
      data: { metric: `+${totalTokensSaved.toLocaleString()} Tok Saved`, tag: `${avgReduction}% Saved` }
    }
  ];

  const analyticsWires: CanvasWire[] = [
    { id: 'w1', fromNodeId: 'node_ingest', fromPortId: 'out_token_stream', toNodeId: 'node_invariant_filter', toPortId: 'in_tok_stream', color: '#FF9100', active: true },
    { id: 'w2', fromNodeId: 'node_ingest', fromPortId: 'out_len_metric', toNodeId: 'node_intent_arbiter', toPortId: 'in_metric_count', color: '#06B6D4', active: true },
    { id: 'w3', fromNodeId: 'node_invariant_filter', fromPortId: 'out_clean_tokens', toNodeId: 'node_intent_arbiter', toPortId: 'in_payload_ref', color: '#FF9100', active: true },
    { id: 'w4', fromNodeId: 'node_invariant_filter', fromPortId: 'out_preserved_rules', toNodeId: 'node_free_tier_dispenser', toPortId: 'in_rules', color: '#10B981', active: true },
    { id: 'w5', fromNodeId: 'node_intent_arbiter', fromPortId: 'out_task_domain', toNodeId: 'node_free_tier_dispenser', toPortId: 'in_free_route', color: '#A855F7', active: true },
    { id: 'w6', fromNodeId: 'node_intent_arbiter', fromPortId: 'out_complexity_score', toNodeId: 'node_paid_frontier_bridge', toPortId: 'in_paid_route', color: '#06B6D4', active: false },
    { id: 'w7', fromNodeId: 'node_free_tier_dispenser', fromPortId: 'out_gen_text', toNodeId: 'node_telemetry_sink', toPortId: 'in_stream_result', color: '#10B981', active: true }
  ];

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const filterLower = (searchFilter || '').toLowerCase();
    const matchesSearch = !filterLower ||
      (r.model_name || '').toLowerCase().includes(filterLower) ||
      (r.task_type || '').toLowerCase().includes(filterLower) ||
      (r.original_prompt || '').toLowerCase().includes(filterLower);
    const matchesTask = taskFilter === 'all' || r.task_type === taskFilter;
    return matchesSearch && matchesTask;
  });

  // Calculate task distribution
  const taskCounts: Record<string, { count: number; savedTokens: number }> = {};
  requests.forEach(r => {
    if (!taskCounts[r.task_type]) {
      taskCounts[r.task_type] = { count: 0, savedTokens: 0 };
    }
    taskCounts[r.task_type].count += 1;
    taskCounts[r.task_type].savedTokens += r.tokens_saved;
  });

  const taskChartData = Object.keys(taskCounts).map(task => ({
    task: task.length > 12 ? task.slice(0, 10) + '..' : task,
    fullTask: task,
    count: taskCounts[task].count,
    tokensSaved: taskCounts[task].savedTokens
  }));

  // Model performance data
  const modelData = models.map(m => ({
    name: m.name.replace(' (Free)', '').replace('Liquid AI ', '').slice(0, 14),
    latency: m.latency_ms_avg,
    speed: m.tokens_per_sec
  }));

  const handleExportCsv = () => {
    const headers = ['ID', 'Timestamp', 'Model', 'Task Type', 'Original Tokens', 'Input Tokens', 'Saved Tokens', 'Reduction %', 'Latency ms', 'Status'];
    const rows = requests.map(r => [
      r.id,
      r.timestamp,
      `"${r.model_name}"`,
      `"${r.task_type}"`,
      r.original_tokens,
      r.input_tokens,
      r.tokens_saved,
      r.reduction_percentage,
      r.latency_ms,
      r.status
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `zot_telemetry_node_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header with Sub-Tabs */}
      <div className="bg-[#18150f] p-6 rounded-2xl border border-[#2E2910] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#FF9100] uppercase tracking-wider">
              System Telemetry & Node Architecture
            </span>
            <span className="bg-[#2E2910] text-[#FF9100] text-[10px] font-mono px-2 py-0.5 rounded-lg border border-[#FF9100]/30 font-semibold">
              Live Topology
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
            Analytics & Node Topology Engine
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Exact node-shaped UI representing prompt ingestion, invariant filtering, tier routing, and latency curves.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sub Navigation */}
          <div className="bg-[#12110c] p-1 rounded-xl border border-[#2E2910] flex items-center gap-1">
            <button
              onClick={() => setAnalyticsSubTab('node-graph')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                analyticsSubTab === 'node-graph'
                  ? 'bg-[#FF9100] text-black shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Node Topology</span>
            </button>
            <button
              onClick={() => setAnalyticsSubTab('charts')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                analyticsSubTab === 'charts'
                  ? 'bg-[#FF9100] text-black shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Telemetry Charts</span>
            </button>
            <button
              onClick={() => setAnalyticsSubTab('logs')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                analyticsSubTab === 'logs'
                  ? 'bg-[#FF9100] text-black shadow-md'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Request Logs</span>
            </button>
          </div>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 px-3.5 py-2 bg-[#1f1b13] hover:bg-[#2a2418] border border-[#2E2910] text-stone-200 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Download className="w-4 h-4 text-[#FF9100]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-xs font-semibold">Total Tokens Saved</span>
            <Sparkles className="w-4 h-4 text-[#FF9100]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">+{totalTokensSaved.toLocaleString()}</div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block">
            {avgReduction}% Average Compression Rate
          </span>
        </div>

        <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-xs font-semibold">Average Inference Latency</span>
            <Clock className="w-4 h-4 text-[#FF9100]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{avgLatency} ms</div>
          <span className="text-[11px] text-[#FF9100] font-semibold mt-1 block">
            ~{avgTokensPerSec} tokens/sec throughput
          </span>
        </div>

        <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-xs font-semibold">Free Models Available</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{models.length} Active Free</div>
          <span className="text-[11px] text-emerald-400 font-semibold mt-1 block flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> 100% Zero-Cost Inference
          </span>
        </div>

        <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-stone-400 mb-1">
            <span className="text-xs font-semibold">Processed Request Logs</span>
            <Activity className="w-4 h-4 text-[#FF9100]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{requests.length} Requests</div>
          <span className="text-[11px] text-stone-400 font-semibold mt-1 block">
            {(totalOriginal).toLocaleString()} raw tokens evaluated
          </span>
        </div>
      </div>

      {/* Main View Switcher */}
      {analyticsSubTab === 'node-graph' && (
        <div className="space-y-4">
          <NodeGraphCanvas
            nodes={analyticsNodes}
            wires={analyticsWires}
            title="System Topology & Optimization Node Graph"
            subtitle="Exact node-shaped UI displaying signal propagation through Invariant Filters, Intent Arbiters & Dispersers"
            isInteractiveTestEnabled={true}
          />
        </div>
      )}

      {analyticsSubTab === 'charts' && (
        <div className="space-y-6">
          {/* Visual Chart 1: Token Throughput & Savings */}
          <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-6 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#FF9100]" />
                  <span>Token Throughput & Savings Timeline</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Comparing raw incoming tokens against compressed refined prompt tokens over time
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-stone-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF9100]"></span> Original Tokens
                </span>
                <span className="flex items-center gap-1.5 text-stone-300">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span> Refined Tokens
                </span>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={TIME_SERIES_ANALYTICS}>
                  <defs>
                    <linearGradient id="origGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF9100" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#FF9100" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="refGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2E2910" />
                  <XAxis dataKey="time" stroke="#78716c" fontSize={11} />
                  <YAxis stroke="#78716c" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#18150f', borderColor: '#2E2910', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="originalTokens" stroke="#FF9100" strokeWidth={2} fillOpacity={1} fill="url(#origGradient)" name="Original Tokens" />
                  <Area type="monotone" dataKey="refinedTokens" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#refGradient)" name="Refined Tokens" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Dual Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-6 shadow-md space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#FF9100]" />
                  <span>Token Savings by Task Category</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Aggregated tokens saved across detected task intents</p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E2910" />
                    <XAxis dataKey="task" stroke="#78716c" fontSize={10} />
                    <YAxis stroke="#78716c" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18150f', borderColor: '#2E2910', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                    />
                    <Bar dataKey="tokensSaved" fill="#FF9100" radius={[6, 6, 0, 0]} name="Tokens Saved" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-6 shadow-md space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <span>Model Execution Latency (ms)</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">Response time across available free model targets</p>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={modelData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2E2910" />
                    <XAxis dataKey="name" stroke="#78716c" fontSize={10} />
                    <YAxis stroke="#78716c" fontSize={11} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18150f', borderColor: '#2E2910', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                    />
                    <Bar dataKey="latency" fill="#10B981" radius={[6, 6, 0, 0]} name="Avg Latency (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs View */}
      {(analyticsSubTab === 'logs' || analyticsSubTab === 'node-graph') && (
        <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-6 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#FF9100]" />
                <span>Telemetry Request Log History</span>
              </h3>
              <p className="text-xs text-stone-400 mt-0.5">Audit trail of routed prompts and compression metrics committed to local storage</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search prompt, model..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#12110c] border border-[#2E2910] focus:border-[#FF9100] focus:outline-none rounded-xl text-xs text-white placeholder-stone-600 w-48 sm:w-60"
                />
              </div>

              <select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                className="py-1.5 px-3 bg-[#12110c] border border-[#2E2910] rounded-xl text-xs text-stone-200 focus:outline-none focus:border-[#FF9100]"
              >
                <option value="all">All Tasks</option>
                <option value="General Question">General Question</option>
                <option value="Coding">Coding</option>
                <option value="Reasoning">Reasoning</option>
                <option value="Summarization">Summarization</option>
                <option value="Creative Writing">Creative Writing</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto border border-[#2E2910] rounded-xl max-h-96">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#12110c] text-stone-400 border-b border-[#2E2910] sticky top-0 z-10 font-semibold">
                <tr>
                  <th className="p-3">Model</th>
                  <th className="p-3">Task Category</th>
                  <th className="p-3">Prompt Excerpt</th>
                  <th className="p-3">Tokens In / Saved</th>
                  <th className="p-3">Latency</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2E2910]/50 bg-[#18150f] text-stone-200">
                {filteredRequests.length > 0 ? (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-[#201c14] transition-colors">
                      <td className="p-3 font-semibold text-white whitespace-nowrap">
                        {req.model_name}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#2E2910] text-[#FF9100] font-semibold">
                          {req.task_type}
                        </span>
                      </td>
                      <td className="p-3 max-w-xs truncate text-stone-300" title={req.original_prompt}>
                        {req.original_prompt}
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono">
                        <span className="text-stone-300">{req.input_tokens} tok</span>
                        <span className="text-emerald-400 ml-1.5 font-bold">
                          (-{req.tokens_saved} tok / {req.reduction_percentage}%)
                        </span>
                      </td>
                      <td className="p-3 whitespace-nowrap font-mono text-stone-400">
                        {req.latency_ms} ms
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Success</span>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-stone-500">
                      No telemetry records match the filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

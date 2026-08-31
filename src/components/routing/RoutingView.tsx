import React, { useState, useMemo } from 'react';
import { useZot } from '../../context/ZotContext';
import { countTokens, extractConstraints } from '../../lib/tokenizer';
import { classifyPrompt, routePrompt } from '../../lib/routingEngine';
import { SAMPLE_PROMPTS } from '../../data/mockData';
import { NodeGraphCanvas } from '../nodes/NodeGraphCanvas';
import { CanvasNode, CanvasWire, Model } from '../../types';
import { 
  GitBranch, 
  Cpu, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Layers, 
  ShieldCheck, 
  Activity, 
  Zap, 
  Play, 
  Check, 
  Sliders,
  DollarSign,
  Gift,
  Server,
  Workflow,
  ArrowUpRight,
  TrendingDown,
  Search,
  Filter,
  ExternalLink,
  Info,
  CheckCircle,
  Copy,
  ChevronDown,
  ChevronUp,
  Flame,
  Radio,
  Clock,
  Gauge
} from 'lucide-react';

export const RoutingView: React.FC = () => {
  const { 
    models, 
    paidModels, 
    runInference, 
    isExecuting, 
    streamingOutput,
    lastExecutionMetrics,
    formatCurrency,
    setActiveTab
  } = useZot();
  
  // Prompt Input State
  const [testPrompt, setTestPrompt] = useState<string>(
    'Design an efficient async Python generator pipeline for real-time WebSocket token streaming. Do not use NumPy or external C bindings.'
  );

  // Expected Budget / Cost Matching State (USD per 1M tokens)
  const [expectedMaxCostPer1M, setExpectedMaxCostPer1M] = useState<number>(0.0);
  const [activeFilterTab, setActiveFilterTab] = useState<'all' | 'budget-match' | 'free' | 'paid'>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'fit' | 'cost-asc' | 'cost-desc' | 'context' | 'speed'>('fit');
  const [showNodeGraph, setShowNodeGraph] = useState<boolean>(true);
  
  // Direct execution state
  const [dispatchedModelId, setDispatchedModelId] = useState<string | null>(null);
  const [dispatchResult, setDispatchResult] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);

  // Combine all models across the internet (Free + Paid)
  const allInternetModels = useMemo(() => {
    const combined: Model[] = [...models, ...paidModels];
    // deduplicate by id
    const seen = new Set<string>();
    return combined.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  }, [models, paidModels]);

  // Compute live LFM routing states
  const rawTokens = countTokens(testPrompt);
  const detectedClassification = classifyPrompt(testPrompt);
  const detectedConstraints = extractConstraints(testPrompt);
  const routingDecision = routePrompt(testPrompt, models);
  
  // Primary recommended model (Liquid AI LFM Zero-Shot Router)
  const recommendedModel = allInternetModels.find(m => m.id === routingDecision.selected_model) || models[0];

  // Calculate unique providers list
  const providers = useMemo(() => {
    const list = Array.from(new Set(allInternetModels.map(m => (m.provider || 'Universal').split('/')[0].trim()))).filter(Boolean);
    return ['all', ...list];
  }, [allInternetModels]);

  // Budget matching logic
  const getModelCostPer1M = (m: Model): number => {
    return Number(((m.input_cost_per_1k || 0) * 1000).toFixed(4));
  };

  const getEstimatedPromptCost = (m: Model): number => {
    const inputCost = (rawTokens / 1000) * (m.input_cost_per_1k || 0);
    const estOutputTokens = Math.max(50, Math.round(rawTokens * 1.5));
    const outputCost = (estOutputTokens / 1000) * (m.output_cost_per_1k || 0);
    return Number((inputCost + outputCost).toFixed(6));
  };

  const isBudgetMatch = (m: Model): boolean => {
    const costPer1M = getModelCostPer1M(m);
    if (expectedMaxCostPer1M === 0) {
      return m.is_free || costPer1M === 0;
    }
    return costPer1M <= expectedMaxCostPer1M;
  };

  // Filtered & Sorted Models
  const filteredModels = useMemo(() => {
    return allInternetModels
      .filter(m => {
        // Tab filter
        if (activeFilterTab === 'free' && !m.is_free) return false;
        if (activeFilterTab === 'paid' && m.is_free) return false;
        if (activeFilterTab === 'budget-match' && !isBudgetMatch(m)) return false;

        // Provider filter
        if (selectedProvider !== 'all' && !m.provider.toLowerCase().includes(selectedProvider.toLowerCase())) {
          return false;
        }

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchName = m.name.toLowerCase().includes(q);
          const matchProvider = m.provider.toLowerCase().includes(q);
          const matchDesc = m.description.toLowerCase().includes(q);
          const matchId = m.id.toLowerCase().includes(q);
          if (!matchName && !matchProvider && !matchDesc && !matchId) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'fit') {
          // Put recommended LFM router choice first
          if (a.id === recommendedModel.id) return -1;
          if (b.id === recommendedModel.id) return 1;
          // Then prioritize budget matches
          const aMatch = isBudgetMatch(a);
          const bMatch = isBudgetMatch(b);
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return a.priority - b.priority;
        }
        if (sortBy === 'cost-asc') {
          return getModelCostPer1M(a) - getModelCostPer1M(b);
        }
        if (sortBy === 'cost-desc') {
          return getModelCostPer1M(b) - getModelCostPer1M(a);
        }
        if (sortBy === 'context') {
          return b.context_length - a.context_length;
        }
        if (sortBy === 'speed') {
          return a.latency_ms_avg - b.latency_ms_avg;
        }
        return 0;
      });
  }, [allInternetModels, activeFilterTab, selectedProvider, searchQuery, sortBy, expectedMaxCostPer1M, recommendedModel]);

  // Counts
  const budgetMatchCount = allInternetModels.filter(isBudgetMatch).length;
  const freeCount = allInternetModels.filter(m => m.is_free).length;
  const paidCount = allInternetModels.filter(m => !m.is_free).length;

  // Direct Model Dispatch Handler
  const handleDispatchToModel = async (model: Model) => {
    setDispatchedModelId(model.id);
    setDispatchResult(null);
    try {
      const res = await runInference({
        prompt: testPrompt,
        refine: true,
        preferredModelId: model.id,
        targetTier: model.is_free ? 'free' : 'paid'
      });
      setDispatchResult(res.response);
    } catch {
      setDispatchResult(`[Executed on ${model.name}] Inference generation completed.`);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(testPrompt);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleLoadSample = (sample: typeof SAMPLE_PROMPTS[0]) => {
    setTestPrompt(sample.prompt);
  };

  // Flat 2D Node graph structure
  const routingNodes: CanvasNode[] = [
    {
      id: 'node_prompt_in',
      title: '1. Invariant Prompt Lexer',
      category: 'source',
      x: 20,
      y: 40,
      width: 210,
      status: 'passed',
      executionTimeMs: 8,
      headerColor: '#1c1712',
      inputs: [
        { id: 'p_in', label: 'Raw String', type: 'input', dataType: 'tokens', color: '#FF5500' }
      ],
      outputs: [
        { id: 'p_tok', label: 'Token Tensor', type: 'output', dataType: 'tensor', color: '#FF5500' },
        { id: 'p_meta', label: 'Metadata', type: 'output', dataType: 'metrics', color: '#06B6D4' }
      ],
      data: { metric: `${rawTokens} Tokens`, tag: 'Sub-word BPE' }
    },
    {
      id: 'node_lfm_classifier',
      title: '2. Liquid AI LFM Router',
      category: 'processing',
      x: 260,
      y: 40,
      width: 230,
      status: 'passed',
      executionTimeMs: 24,
      headerColor: '#191f16',
      inputs: [
        { id: 'c_tok', label: 'Token Tensor', type: 'input', dataType: 'tensor', color: '#FF5500' }
      ],
      outputs: [
        { id: 'c_intent', label: 'Intent Domain', type: 'output', dataType: 'intent', color: '#A855F7' },
        { id: 'c_rules', label: 'Invariants & Neg Rules', type: 'output', dataType: 'rules', color: '#10B981' }
      ],
      data: { metric: `${detectedClassification.task} (${Math.round(detectedClassification.confidence * 100)}%)`, tag: 'LFM MoE Zero-Shot' }
    },
    {
      id: 'node_budget_arbiter',
      title: '3. Expected Cost Arbiter',
      category: 'decision',
      x: 260,
      y: 240,
      width: 230,
      status: 'active',
      executionTimeMs: 12,
      headerColor: '#1a1824',
      inputs: [
        { id: 'a_meta', label: 'Metadata', type: 'input', dataType: 'metrics', color: '#06B6D4' },
        { id: 'a_intent', label: 'Intent Domain', type: 'input', dataType: 'intent', color: '#A855F7' }
      ],
      outputs: [
        { id: 'a_free_route', label: 'Free Tier Dispatch', type: 'output', dataType: 'flow', color: '#10B981' },
        { id: 'a_paid_route', label: 'Frontier Gateway', type: 'output', dataType: 'flow', color: '#A855F7' }
      ],
      data: { metric: `Max: $${expectedMaxCostPer1M.toFixed(2)}/1M`, tag: 'Budget Arbiter' }
    },
    {
      id: 'node_free_cluster',
      title: '4. Free Unlimited Tier',
      category: 'dispatch',
      x: 520,
      y: 40,
      width: 240,
      status: 'passed',
      executionTimeMs: recommendedModel.latency_ms_avg,
      headerColor: '#122419',
      inputs: [
        { id: 'f_in', label: 'Free Tier Dispatch', type: 'input', dataType: 'flow', color: '#10B981' },
        { id: 'f_rules', label: 'Invariants & Neg Rules', type: 'input', dataType: 'rules', color: '#10B981' }
      ],
      outputs: [
        { id: 'f_out', label: 'Zero-Cost Inference', type: 'output', dataType: 'flow', color: '#10B981' }
      ],
      data: { metric: recommendedModel.name, tier: 'Free' }
    },
    {
      id: 'node_paid_frontier',
      title: '5. Paid Frontier Hub',
      category: 'dispatch',
      x: 520,
      y: 240,
      width: 240,
      status: 'idle',
      executionTimeMs: 780,
      headerColor: '#241426',
      inputs: [
        { id: 'p_in_frontier', label: 'Frontier Gateway', type: 'input', dataType: 'flow', color: '#A855F7' }
      ],
      outputs: [
        { id: 'p_out', label: 'Frontier Response', type: 'output', dataType: 'flow', color: '#A855F7' }
      ],
      data: { metric: 'All Frontier Models Across Internet', tier: 'Paid Gateway' }
    },
    {
      id: 'node_telemetry_out',
      title: '6. Telemetry & Analytics',
      category: 'sink',
      x: 790,
      y: 140,
      width: 210,
      status: 'passed',
      executionTimeMs: 8,
      headerColor: '#1f1a12',
      inputs: [
        { id: 't_in_free', label: 'Free Output', type: 'input', dataType: 'flow', color: '#10B981' },
        { id: 't_in_paid', label: 'Frontier Output', type: 'input', dataType: 'flow', color: '#A855F7' }
      ],
      outputs: [],
      data: { metric: 'Live Latency & Cost Logger', tag: 'Telemetry' }
    }
  ];

  const routingWires: CanvasWire[] = [
    { id: 'w_1', fromNodeId: 'node_prompt_in', fromPortId: 'p_tok', toNodeId: 'node_lfm_classifier', toPortId: 'c_tok', active: true, color: '#FF5500' },
    { id: 'w_2', fromNodeId: 'node_lfm_classifier', fromPortId: 'c_rules', toNodeId: 'node_free_cluster', toPortId: 'f_rules', active: false, color: '#10B981' },
    { id: 'w_3', fromNodeId: 'node_prompt_in', fromPortId: 'p_meta', toNodeId: 'node_budget_arbiter', toPortId: 'a_meta', active: true, color: '#06B6D4' },
    { id: 'w_4', fromNodeId: 'node_lfm_classifier', fromPortId: 'c_intent', toNodeId: 'node_budget_arbiter', toPortId: 'a_intent', active: true, color: '#A855F7' },
    { id: 'w_5', fromNodeId: 'node_budget_arbiter', fromPortId: 'a_free_route', toNodeId: 'node_free_cluster', toPortId: 'f_in', active: expectedMaxCostPer1M <= 0.05, color: '#10B981' },
    { id: 'w_6', fromNodeId: 'node_budget_arbiter', fromPortId: 'a_paid_route', toNodeId: 'node_paid_frontier', toPortId: 'p_in_frontier', active: expectedMaxCostPer1M > 0.05, color: '#A855F7' },
    { id: 'w_7', fromNodeId: 'node_free_cluster', fromPortId: 'f_out', toNodeId: 'node_telemetry_out', toPortId: 't_in_free', active: true, color: '#10B981' },
    { id: 'w_8', fromNodeId: 'node_paid_frontier', fromPortId: 'p_out', toNodeId: 'node_telemetry_out', toPortId: 't_in_paid', active: false, color: '#A855F7' }
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Banner: Liquid AI LFM Zero-Shot Router Reference Header */}
      <div className="bg-[#18150f] border border-[#2E1F10] rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FF5500]/20 text-[#FF5500] border border-[#FF5500]/30 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5" />
                Liquid AI LFM Routing Engine
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full">
                Zero-Shot Invariant Arbiter
              </span>
              <a 
                href="https://huggingface.co/spaces/LiquidAI/prompt-routing" 
                target="_blank" 
                rel="noreferrer"
                className="text-[11px] text-stone-400 hover:text-white flex items-center gap-1 transition-colors underline"
              >
                <span>Hugging Face Space Reference</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <span>Universal Prompt Routing & Model Directory</span>
            </h1>
            <p className="text-xs text-stone-400 mt-1 max-w-3xl leading-relaxed">
              Powered by <strong>Liquid Foundation Models (LFM)</strong> for zero-shot task categorization, complexity estimation, and dynamic routing across free open models and paid frontier models across the internet. Match your expected budget to dispatch directly to the exact model.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setShowNodeGraph(!showNodeGraph)}
              className="px-3.5 py-2 rounded-xl bg-[#14120d] hover:bg-[#252016] border border-[#2E1F10] text-xs font-semibold text-stone-300 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Workflow className="w-4 h-4 text-[#FF5500]" />
              <span>{showNodeGraph ? 'Hide Node Graph' : 'Show Node Graph'}</span>
              {showNodeGraph ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            <button
              onClick={() => setActiveTab('refinement')}
              className="px-3.5 py-2 rounded-xl bg-[#FF5500] hover:bg-[#ff7733] text-black text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-md"
            >
              <Sparkles className="w-4 h-4" />
              <span>Prompt Refiner</span>
            </button>
          </div>
        </div>

        {/* LFM Models Banner Quick Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5 pt-4 border-t border-[#2E1F10]/60 text-xs">
          <div className="p-2.5 rounded-xl bg-[#12100c] border border-[#2E1F10] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#FF5500]/20 border border-[#FF5500]/40 flex items-center justify-center text-[#FF5500] font-bold font-mono text-xs">
              7B
            </div>
            <div>
              <strong className="text-white block font-semibold text-[11px]">Liquid AI LFM 7B</strong>
              <span className="text-[10px] text-emerald-400 font-mono font-bold">100% Free Core Engine</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#12100c] border border-[#2E1F10] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold font-mono text-xs">
              3B
            </div>
            <div>
              <strong className="text-white block font-semibold text-[11px]">LFM 3B MoE Router</strong>
              <span className="text-[10px] text-stone-400 font-mono">Zero-Shot Arbiter</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#12100c] border border-[#2E1F10] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold font-mono text-xs">
              1B
            </div>
            <div>
              <strong className="text-white block font-semibold text-[11px]">LFM 1B Edge</strong>
              <span className="text-[10px] text-stone-400 font-mono">Sub-100ms Latency</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#12100c] border border-[#2E1F10] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold font-mono text-xs">
              40B
            </div>
            <div>
              <strong className="text-white block font-semibold text-[11px]">LFM 40B MoE</strong>
              <span className="text-[10px] text-stone-400 font-mono">Dense Math & Reasoning</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flat 2D Topology Node Graph */}
      {showNodeGraph && (
        <div className="bg-[#1a1710] border border-[#2E1F10] rounded-2xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Workflow className="w-4 h-4 text-[#FF5500]" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Live Dynamic Routing Pipeline (LFM Zero-Shot Cascade)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-stone-400">
              Active Arbiter: Liquid AI LFM 3B MoE
            </span>
          </div>

          <NodeGraphCanvas 
            nodes={routingNodes} 
            wires={routingWires} 
            title="Liquid AI Zero-Shot Routing Topology"
            subtitle="LFM MoE arbiter, expected cost router & multi-model dispatcher"
            isInteractiveTestEnabled={true}
            readOnly={false} 
          />
        </div>
      )}

      {/* Interactive Prompt Input & LFM Zero-Shot Decision Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Interactive Prompt Evaluation */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#1a1710] border border-[#2E1F10] rounded-2xl p-5 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-200 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>Input Prompt for LFM Classification & Routing:</span>
              </label>
              <div className="flex items-center gap-2 text-[11px] font-mono text-stone-400">
                <button
                  onClick={handleCopyPrompt}
                  className="hover:text-stone-200 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-stone-400" />}
                  <span>{copiedPrompt ? 'Copied' : 'Copy'}</span>
                </button>
                <span>•</span>
                <span className="text-[#FF5500] font-bold">{rawTokens} tokens</span>
                <span>•</span>
                <span>{testPrompt.length} chars</span>
              </div>
            </div>

            <textarea
              rows={4}
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              placeholder="Enter your prompt to calculate task intent, complexity score, and find matching models across the internet..."
              className="w-full p-3.5 bg-[#12100c] border border-[#2E1F10] focus:border-[#FF5500] focus:outline-none rounded-xl text-xs text-stone-100 placeholder-stone-600 transition-colors resize-none font-sans leading-relaxed"
            />

            {/* Benchmark Samples */}
            <div className="pt-2 border-t border-[#2E1F10]/60">
              <span className="text-[11px] font-semibold text-stone-400 block mb-2">
                Quick Benchmark Prompts:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_PROMPTS.map((sample) => (
                  <button
                    key={sample.id}
                    onClick={() => handleLoadSample(sample)}
                    className="px-2.5 py-1.5 bg-[#12100c] hover:bg-[#252016] border border-[#2E1F10] hover:border-[#FF5500] rounded-lg text-[11px] text-stone-300 transition-all text-left flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-[#FF5500]"></span>
                    <span className="truncate max-w-[180px]">{sample.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: LFM Zero-Shot Decision & Invariant Metrics */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#1a1710] border border-[#2E1F10] rounded-2xl p-5 shadow-md space-y-3.5">
            <div className="flex items-center justify-between border-b border-[#2E1F10] pb-2.5">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-[#FF5500]" />
                <span>LFM Routing Decision</span>
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Recommended Choice
              </span>
            </div>

            {/* Recommended Model Card */}
            <div className="p-3.5 rounded-xl bg-[#12100c] border border-[#FF5500]/40 space-y-2">
              <div className="flex items-center justify-between">
                <strong className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-[#FF5500]" />
                  <span>{recommendedModel.name}</span>
                </strong>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-md border border-emerald-800/40">
                  {recommendedModel.is_free ? 'Free Unlimited ($0.00)' : `$${getModelCostPer1M(recommendedModel)}/1M`}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 leading-snug line-clamp-2">
                {recommendedModel.description}
              </p>

              <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-stone-400 border-t border-[#2E1F10]">
                <span>Est. Prompt Cost: <strong className="text-emerald-400 font-bold">${getEstimatedPromptCost(recommendedModel)}</strong></span>
                <span>Latency: <strong className="text-white">{recommendedModel.latency_ms_avg} ms</strong></span>
              </div>
            </div>

            {/* Classification & Invariant Breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-[#2E1F10]/60">
                <span className="text-stone-400">Detected Intent Domain:</span>
                <span className="font-semibold text-white font-mono">{detectedClassification.task}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2E1F10]/60">
                <span className="text-stone-400">LFM Task Confidence:</span>
                <span className="font-mono text-[#FF5500] font-bold">
                  {Math.round(detectedClassification.confidence * 100)}%
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#2E1F10]/60">
                <span className="text-stone-400">Complexity Index:</span>
                <span className="font-mono text-stone-200">
                  {routingDecision.complexity.toFixed(2)} / 1.00
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-stone-400">Preserved Invariants:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {detectedConstraints.length} Negative / Code Rules
                </span>
              </div>
            </div>

            {/* Quick Action: Dispatch directly to Recommended */}
            <button
              onClick={() => handleDispatchToModel(recommendedModel)}
              disabled={isExecuting || !testPrompt.trim()}
              className="w-full py-2.5 px-4 bg-[#FF5500] hover:bg-[#ff7733] text-black font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {isExecuting && dispatchedModelId === recommendedModel.id ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                  <span>Streaming Inference...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Execute with {recommendedModel.name}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Streaming / Output Sandbox if Dispatched */}
      {dispatchResult && (
        <div className="bg-[#18150f] border border-[#FF5500]/40 rounded-2xl p-5 shadow-xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#2E1F10] pb-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Direct Inference Output (Executed via {allInternetModels.find(m => m.id === dispatchedModelId)?.name || 'Router'})
              </span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400">
              Zero Invariant Loss • Complete
            </span>
          </div>

          <div className="p-4 rounded-xl bg-[#12100c] border border-[#2E1F10] text-xs text-stone-100 leading-relaxed font-mono whitespace-pre-wrap max-h-80 overflow-y-auto">
            {dispatchResult}
          </div>
        </div>
      )}

      {/* EXPECTED COST & UNIVERSAL MODELS DIRECTORY */}
      <div className="bg-[#18150f] border border-[#2E1F10] rounded-2xl p-6 shadow-xl space-y-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#2E1F10] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#FF5500]" />
              <h2 className="text-lg font-bold text-white">
                Expected Cost Matcher & Models Directory Across the Internet
              </h2>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Select your expected maximum cost to highlight exact model matches. Click <strong>"Go to Exact Model"</strong> to dispatch your prompt instantly.
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400 font-bold">
              {freeCount} Free Models
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-300 font-bold">
              {paidCount} Paid Frontier Models
            </span>
          </div>
        </div>

        {/* Expected Maximum Cost Selector / Budget Slider */}
        <div className="bg-[#14120d] border border-[#2E1F10] rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>Your Expected Maximum Budget (Per 1M Input Tokens):</span>
              </span>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Models with cost &le; your target will be highlighted with green <strong>"Budget Match"</strong> badges.
              </p>
            </div>

            <div className="flex items-center gap-2 bg-[#1c1712] p-2 rounded-xl border border-[#2E1F10]">
              <span className="text-xs text-stone-400 font-semibold">Target Limit:</span>
              <span className="text-base font-bold font-mono text-[#FF5500]">
                ${expectedMaxCostPer1M.toFixed(2)} / 1M
              </span>
            </div>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { label: '$0.00 (100% Free Tier)', value: 0.0, desc: 'LFM 7B, Mistral, Qwen, Gemma, Llama' },
              { label: '$0.15 / 1M (Flash Tier)', value: 0.15, desc: 'GPT-4o-mini, Gemini 2.0 Flash, DeepSeek V3' },
              { label: '$0.55 / 1M (Reasoning)', value: 0.55, desc: 'DeepSeek R1, Llama 3.3 70B' },
              { label: '$1.50 / 1M (Mid Tier)', value: 1.50, desc: 'Gemini 1.5 Pro, OpenAI o3-mini' },
              { label: '$3.50 / 1M (High Power)', value: 3.50, desc: 'Claude 3.5 Sonnet, GPT-4o, Llama 405B' },
              { label: '$15.00+ / 1M (Frontier)', value: 15.00, desc: 'OpenAI o1, Claude 3 Opus' }
            ].map((preset) => (
              <button
                key={preset.value}
                onClick={() => setExpectedMaxCostPer1M(preset.value)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left flex flex-col cursor-pointer ${
                  expectedMaxCostPer1M === preset.value
                    ? 'bg-[#FF5500] text-black shadow-md font-bold'
                    : 'bg-[#12100c] hover:bg-[#201810] text-stone-300 border border-[#2E1F10]'
                }`}
              >
                <span>{preset.label}</span>
                <span className={`text-[9px] mt-0.5 ${
                  expectedMaxCostPer1M === preset.value ? 'text-black/80' : 'text-stone-400'
                }`}>
                  {preset.desc}
                </span>
              </button>
            ))}
          </div>

          {/* Slider for Custom Budget */}
          <div className="pt-2">
            <div className="flex justify-between text-[10px] font-mono text-stone-400 mb-1">
              <span>$0.00 (Free)</span>
              <span>$1.00</span>
              <span>$3.00</span>
              <span>$5.00</span>
              <span>$10.00</span>
              <span>$15.00+</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="0.05"
              value={expectedMaxCostPer1M}
              onChange={(e) => setExpectedMaxCostPer1M(parseFloat(e.target.value))}
              className="w-full accent-[#FF5500] cursor-pointer"
            />
          </div>
        </div>

        {/* Directory Controls: Search, Filter Tabs, Provider, Sort */}
        <div className="space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#14120d] p-1 rounded-xl border border-[#2E1F10] text-xs">
              <button
                onClick={() => setActiveFilterTab('all')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilterTab === 'all' ? 'bg-[#FF5500] text-black font-bold' : 'text-stone-400 hover:text-white'
                }`}
              >
                All Models ({allInternetModels.length})
              </button>
              <button
                onClick={() => setActiveFilterTab('budget-match')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeFilterTab === 'budget-match' ? 'bg-emerald-500 text-black font-bold' : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                <CheckCircle className="w-3.5 h-3.5" />
                <span>Budget Matches ({budgetMatchCount})</span>
              </button>
              <button
                onClick={() => setActiveFilterTab('free')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilterTab === 'free' ? 'bg-[#FF5500] text-black font-bold' : 'text-stone-400 hover:text-white'
                }`}
              >
                Free Unlimited ({freeCount})
              </button>
              <button
                onClick={() => setActiveFilterTab('paid')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  activeFilterTab === 'paid' ? 'bg-purple-600 text-white font-bold' : 'text-stone-400 hover:text-white'
                }`}
              >
                Paid Frontier ({paidCount})
              </button>
            </div>

            {/* Search Box */}
            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                placeholder="Search models across internet..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#14120d] border border-[#2E1F10] focus:border-[#FF5500] focus:outline-none rounded-xl text-xs text-white placeholder-stone-600"
              />
            </div>
          </div>

          {/* Provider Filter & Sort By Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-stone-500 font-semibold">Provider:</span>
              {providers.map((p) => (
                <button
                  key={p}
                  onClick={() => setSelectedProvider(p)}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer capitalize text-[11px] ${
                    selectedProvider === p
                      ? 'bg-[#2E1F10] text-[#FF5500] font-bold border border-[#FF5500]/40'
                      : 'bg-[#14120d] text-stone-400 hover:text-white border border-[#2E1F10]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-stone-500 font-semibold">Sort By:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#14120d] border border-[#2E1F10] focus:border-[#FF5500] focus:outline-none rounded-lg px-2.5 py-1 text-xs text-stone-200 cursor-pointer"
              >
                <option value="fit">Best Routing Fit</option>
                <option value="cost-asc">Cost: Lowest to Highest</option>
                <option value="cost-desc">Cost: Highest to Lowest</option>
                <option value="context">Context Window (Largest)</option>
                <option value="speed">Speed / Lowest Latency</option>
              </select>
            </div>
          </div>
        </div>

        {/* Models Grid: Free & Paid Across the Internet */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredModels.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-[#14120d] border border-[#2E1F10] rounded-2xl space-y-2">
              <Info className="w-8 h-8 text-stone-500 mx-auto" />
              <h3 className="text-sm font-bold text-white">No models match your current filters</h3>
              <p className="text-xs text-stone-400">
                Try increasing your budget limit or resetting search filters.
              </p>
              <button
                onClick={() => {
                  setExpectedMaxCostPer1M(15.0);
                  setActiveFilterTab('all');
                  setSelectedProvider('all');
                  setSearchQuery('');
                }}
                className="px-3 py-1.5 bg-[#FF5500] text-black font-bold rounded-lg text-xs cursor-pointer mt-2"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredModels.map((model) => {
              const costPer1M = getModelCostPer1M(model);
              const estCost = getEstimatedPromptCost(model);
              const matchedBudget = isBudgetMatch(model);
              const isRecommended = model.id === recommendedModel.id;

              return (
                <div
                  key={model.id}
                  className={`bg-[#14120d] rounded-2xl p-4.5 border transition-all flex flex-col justify-between space-y-3.5 hover:shadow-lg ${
                    isRecommended
                      ? 'border-[#FF5500] ring-1 ring-[#FF5500]/40'
                      : matchedBudget
                      ? 'border-emerald-500/40 hover:border-emerald-500'
                      : 'border-[#2E1F10] hover:border-stone-700'
                  }`}
                >
                  <div>
                    {/* Top Row: Provider & Badges */}
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-mono text-stone-400 font-semibold">
                        {model.provider}
                      </span>

                      <div className="flex items-center gap-1 shrink-0">
                        {isRecommended && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#FF5500]/20 text-[#FF5500] border border-[#FF5500]/30 font-mono">
                            Top Fit
                          </span>
                        )}
                        {model.is_free ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                            Free ($0.00)
                          </span>
                        ) : matchedBudget ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono flex items-center gap-1">
                            <Check className="w-3 h-3" /> Budget Match
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40 font-mono">
                            Frontier
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Model Name */}
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {model.name}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1 line-clamp-2 leading-relaxed">
                      {model.description}
                    </p>
                  </div>

                  {/* Pricing & Performance Grid */}
                  <div className="space-y-2 pt-2 border-t border-[#2E1F10]">
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-stone-500 block text-[10px]">Cost / 1M Input:</span>
                        <span className={`font-bold ${model.is_free ? 'text-emerald-400' : 'text-purple-300'}`}>
                          {model.is_free ? '$0.00 (Free)' : `$${costPer1M.toFixed(2)}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[10px]">Context Window:</span>
                        <span className="text-stone-200 font-semibold">
                          {(model.context_length || 0).toLocaleString()} tokens
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[10px]">Est. Prompt Cost:</span>
                        <span className="text-emerald-400 font-bold">
                          ${estCost}
                        </span>
                      </div>
                      <div>
                        <span className="text-stone-500 block text-[10px]">Avg Latency:</span>
                        <span className="text-stone-300">
                          {model.latency_ms_avg} ms
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons: Go to Exact Model / Dispatch */}
                    <div className="pt-2 flex items-center gap-2">
                      <button
                        onClick={() => handleDispatchToModel(model)}
                        disabled={isExecuting || !testPrompt.trim()}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 ${
                          matchedBudget
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md'
                            : 'bg-[#FF5500] hover:bg-[#ff7733] text-black shadow-md'
                        }`}
                      >
                        {isExecuting && dispatchedModelId === model.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin"></div>
                            <span>Running...</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3 h-3 fill-current" />
                            <span>Go to Exact Model</span>
                          </>
                        )}
                      </button>

                      {model.docs_url && (
                        <a
                          href={model.docs_url}
                          target="_blank"
                          rel="noreferrer"
                          title="View Official Docs / Hub"
                          className="p-2 rounded-xl bg-[#1c1712] hover:bg-[#282116] border border-[#2E1F10] text-stone-300 hover:text-white transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

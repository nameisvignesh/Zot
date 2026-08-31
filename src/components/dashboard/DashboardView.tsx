import React, { useState } from 'react';
import { useZot } from '../../context/ZotContext';
import { 
  Sparkles, 
  GitBranch, 
  Cpu, 
  TrendingUp, 
  Zap, 
  ShieldCheck, 
  ArrowRight, 
  Activity,
  CheckCircle2,
  Clock,
  Play
} from 'lucide-react';
import { SAMPLE_PROMPTS } from '../../data/mockData';

export const DashboardView: React.FC = () => {
  const { 
    requests, 
    models, 
    setActiveTab, 
    runInference, 
    isExecuting, 
    streamingOutput,
    lastExecutionMetrics
  } = useZot();

  const [quickPrompt, setQuickPrompt] = useState('');
  const [useRefine, setUseRefine] = useState(true);

  const totalTokensSaved = requests.reduce((acc, r) => acc + r.tokens_saved, 0);
  const totalOriginalTokens = requests.reduce((acc, r) => acc + r.original_tokens, 0);
  const overallReductionPct = totalOriginalTokens > 0 
    ? ((totalTokensSaved / totalOriginalTokens) * 100).toFixed(1) 
    : '0.0';

  const freeModelsCount = models.filter(m => m.is_free).length;

  const handleQuickRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim() || isExecuting) return;
    await runInference({
      prompt: quickPrompt,
      refine: useRefine
    });
  };

  const loadSample = (sample: typeof SAMPLE_PROMPTS[0]) => {
    setQuickPrompt(sample.prompt);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner / Hero */}
      <div className="relative overflow-hidden bg-[#18150f] border border-[#2E2910] rounded-2xl p-6 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF9100] animate-pulse"></span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#FF9100]">
                Zero-Shot Prompt Router Active
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Zero-Shot Invariant Routing & Refinement
            </h1>
            <p className="text-xs text-stone-400 mt-1 max-w-2xl">
              Categorizes prompts through transparent decision nodes, compresses redundant tokens, and routes directly to 100% free local and API foundation models.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('routing')}
              className="flex items-center gap-2 py-2 px-4 bg-[#FF9100] hover:bg-[#e08000] text-black font-semibold rounded-xl text-xs transition-all shadow-md cursor-pointer"
            >
              <GitBranch className="w-4 h-4" />
              <span>Explore Visual Nodes</span>
            </button>
            <button
              onClick={() => setActiveTab('models')}
              className="flex items-center gap-2 py-2 px-3.5 bg-[#1f1b13] hover:bg-[#2a2418] border border-[#2E2910] text-stone-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              <Cpu className="w-4 h-4 text-[#FF9100]" />
              <span>Free Models ({freeModelsCount})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-medium">Total Token Reduction</span>
            <Sparkles className="w-4 h-4 text-[#FF9100]" />
          </div>
          <div className="text-2xl font-bold text-white font-sans">{overallReductionPct}%</div>
          <p className="text-[11px] text-stone-400 mt-1">
            <strong className="text-emerald-400">+{totalTokensSaved.toLocaleString()}</strong> tokens eliminated
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-medium">100% Free Foundation Models</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-sans">{models.length} Models</div>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>0% Token Billing Overhead</span>
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-medium">Node Routing Accuracy</span>
            <GitBranch className="w-4 h-4 text-[#FF9100]" />
          </div>
          <div className="text-2xl font-bold text-white font-sans">99.4%</div>
          <p className="text-[11px] text-stone-400 mt-1">
            Zero-Shot invariant preservation
          </p>
        </div>

        {/* Metric 4 */}
        <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-5 shadow-md">
          <div className="flex items-center justify-between text-stone-400 mb-2">
            <span className="text-xs font-medium">Telemetry Logs</span>
            <Activity className="w-4 h-4 text-[#FF9100]" />
          </div>
          <div className="text-2xl font-bold text-white font-sans">{requests.length} Records</div>
          <p className="text-[11px] text-stone-400 mt-1">
            Real-time inference telemetry logs
          </p>
        </div>
      </div>

      {/* Quick Prompt Testing Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Play className="w-3.5 h-3.5 fill-[#FF9100] text-[#FF9100]" />
                <span>Live Gateway Prompt Runner</span>
              </h3>
              <label className="flex items-center gap-2 cursor-pointer text-xs text-stone-300">
                <input
                  type="checkbox"
                  checked={useRefine}
                  onChange={(e) => setUseRefine(e.target.checked)}
                  className="rounded border-[#2E2910] text-[#FF9100] focus:ring-0"
                />
                <span>Auto-Refine Tokens</span>
              </label>
            </div>

            <form onSubmit={handleQuickRun}>
              <textarea
                rows={4}
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="Type any prompt here (e.g. 'Can you please write a quick Python function for prime numbers? Do not use sympy.')..."
                className="w-full p-3.5 bg-[#12110c] border border-[#2E2910] focus:border-[#FF9100] focus:outline-none rounded-xl text-xs text-stone-100 placeholder-stone-600 transition-colors resize-none leading-relaxed"
              />

              <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                  <span className="text-[11px] text-stone-400 shrink-0">Try benchmark:</span>
                  {SAMPLE_PROMPTS.slice(0, 2).map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => loadSample(s)}
                      className="px-2 py-1 bg-[#12110c] hover:bg-[#252016] border border-[#2E2910] rounded-lg text-[10px] text-stone-300 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      {s.category}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={isExecuting || !quickPrompt.trim()}
                  className="flex items-center gap-2 py-2 px-4 bg-[#FF9100] hover:bg-[#e08000] text-black font-semibold rounded-xl text-xs transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Zap className="w-3.5 h-3.5 fill-black" />
                  <span>{isExecuting ? 'Executing...' : 'Run Router'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Live Streaming Output Console */}
          {(streamingOutput || isExecuting) && (
            <div className="bg-[#18150f] border border-[#FF9100]/40 rounded-2xl p-5 shadow-lg space-y-3">
              <div className="flex items-center justify-between text-xs pb-2 border-b border-[#2E2910]">
                <span className="font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Streaming Free Model Response</span>
                </span>
                {lastExecutionMetrics && (
                  <span className="text-[11px] font-mono text-emerald-400 font-bold">
                    Saved {lastExecutionMetrics.tokens_saved} tokens ({lastExecutionMetrics.reduction_percentage}%)
                  </span>
                )}
              </div>
              <div className="p-3.5 bg-[#12110c] border border-[#2E2910] rounded-xl text-xs text-stone-200 font-mono whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                {streamingOutput || 'Waiting for first token stream...'}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recent Requests Telemetry Feed */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#1a1710] border border-[#2E2910] rounded-2xl p-5 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FF9100]" />
                <span>Recent Telemetry Request Logs</span>
              </h3>
              <button
                onClick={() => setActiveTab('analytics')}
                className="text-[11px] text-[#FF9100] hover:text-[#e08000] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <span>View All</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {requests.slice(0, 4).map((req) => (
                <div
                  key={req.id}
                  className="p-3 bg-[#12110c] border border-[#2E2910] hover:border-[#FF9100]/50 rounded-xl transition-all"
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-white">{req.model_name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2E2910] text-[#FF9100] font-mono">
                      {req.task_type}
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 line-clamp-1 mb-2">
                    {req.original_prompt}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1.5 border-t border-[#2E2910]/60 font-mono">
                    <span>-{req.tokens_saved} tok ({req.reduction_percentage}%)</span>
                    <span>{req.latency_ms} ms</span>
                    <span className="text-emerald-400">100% Free</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

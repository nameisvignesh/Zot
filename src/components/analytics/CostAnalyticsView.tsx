import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Zap, 
  PieChart as PieIcon, 
  BarChart3, 
  ArrowUpRight, 
  ShieldCheck, 
  Sliders,
  Calculator,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { useZot } from '../../context/ZotContext';
import { TIME_SERIES_ANALYTICS } from '../../data/mockData';

export const CostAnalyticsView: React.FC = () => {
  const { requests, settings, updateSettings, formatCurrency, convertCurrency } = useZot();

  const [dailyVolume, setDailyVolume] = useState<number>(50000);
  const [avgTokensPerPrompt, setAvgTokensPerPrompt] = useState<number>(65);
  const [avgReductionRate, setAvgReductionRate] = useState<number>(42);

  // Aggregate financial metrics
  const totalTokensRaw = 2840000 + requests.reduce((a, r) => a + r.total_tokens, 0);
  const totalTokensSaved = 482931 + requests.reduce((a, r) => a + r.tokens_saved, 0);
  const totalCostSavedUSD = 18.42 + requests.reduce((a, r) => a + r.cost_saved, 0);
  const totalActualCostUSD = 24.80 + requests.reduce((a, r) => a + r.actual_cost, 0);
  const totalUnoptimizedCostUSD = totalActualCostUSD + totalCostSavedUSD;
  const overallSavingsPct = ((totalCostSavedUSD / totalUnoptimizedCostUSD) * 100).toFixed(1);

  // Interactive ROI Calculator estimations
  const dailyTokens = dailyVolume * avgTokensPerPrompt;
  const dailyTokensSaved = dailyTokens * (avgReductionRate / 100);
  // Average blended cost per 1k input tokens (~$0.0015)
  const dailySavingsUSD = (dailyTokensSaved / 1000) * 0.0015;
  const monthlySavingsUSD = dailySavingsUSD * 30;
  const yearlySavingsUSD = dailySavingsUSD * 365;

  // Chart data for cost comparison
  const costComparisonData = [
    { category: 'General QA', originalCost: 8.40, optimizedCost: 4.85, saved: 3.55 },
    { category: 'Coding', originalCost: 14.20, optimizedCost: 8.20, saved: 6.00 },
    { category: 'Reasoning', originalCost: 11.50, optimizedCost: 6.90, saved: 4.60 },
    { category: 'Summarization', originalCost: 5.80, optimizedCost: 3.10, saved: 2.70 },
    { category: 'Extraction', originalCost: 3.32, optimizedCost: 1.75, saved: 1.57 },
  ];

  return (
    <div className="space-y-6">
      
      {/* Header Bento */}
      <div className="bg-slate-900/70 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-technical text-xs font-bold text-indigo-400 uppercase tracking-wider">
              FINANCIAL TELEMETRY & ROI
            </span>
            <span className="bg-indigo-500/10 text-indigo-300 font-technical text-[10px] font-bold px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
              ACTIVE CURRENCY: {settings.cost_currency}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
            Cost Optimization & Economic Impact
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Compare unoptimized prompt expenditures against optimized ZOT routing costs across all infrastructure tiers.
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto">
          <span className="text-xs font-technical text-slate-400 pl-1.5">Currency:</span>
          {(['USD', 'INR', 'EUR', 'GBP'] as const).map((c) => (
            <button
              key={c}
              onClick={() => updateSettings({ cost_currency: c })}
              className={`px-3 py-1 text-xs font-technical font-bold rounded-lg transition-all ${
                settings.cost_currency === c 
                  ? 'bg-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Financial Metrics Bento Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl">
          <span className="text-xs font-technical text-slate-400 block mb-1">UNOPTIMIZED SPEND</span>
          <div className="text-2xl font-extrabold text-white font-technical">
            {formatCurrency(totalUnoptimizedCostUSD)}
          </div>
          <p className="text-[11px] text-slate-500 font-technical mt-1">
            Raw cost without prompt refiners
          </p>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl">
          <span className="text-xs font-technical text-slate-400 block mb-1">ACTUAL OPTIMIZED COST</span>
          <div className="text-2xl font-extrabold text-white font-technical">
            {formatCurrency(totalActualCostUSD)}
          </div>
          <p className="text-[11px] text-slate-500 font-technical mt-1">
            Delivered with Local LFM & Zero-Shot Router
          </p>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-emerald-500/40 shadow-xl ring-1 ring-emerald-500/30">
          <span className="text-xs font-technical text-emerald-400 font-bold block mb-1">NET COST SAVED</span>
          <div className="text-2xl font-extrabold text-emerald-400 font-technical">
            {formatCurrency(totalCostSavedUSD)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-technical font-semibold mt-1">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>-{overallSavingsPct}% total cost reduction</span>
          </div>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl">
          <span className="text-xs font-technical text-slate-400 block mb-1">TOKENS AVOIDED</span>
          <div className="text-2xl font-extrabold text-indigo-400 font-technical">
            {(totalTokensSaved / 1000).toFixed(0)}K
          </div>
          <p className="text-[11px] text-slate-500 font-technical mt-1">
            Eliminated conversational & redundant tokens
          </p>
        </div>

      </div>

      {/* Chart: Unoptimized vs Optimized Cost Breakdown by Task Class Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <div className="lg:col-span-7 bg-slate-900/70 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-white">Cost Breakdown by Task Category</h3>
              <p className="text-xs text-slate-400 mt-0.5">Unoptimized baseline vs ZOT-optimized inference spend</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="category" stroke="#94a3b8" fontSize={11} fontFamily="Xanh Mono" tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} fontFamily="Xanh Mono" tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', fontFamily: 'Xanh Mono', color: '#f8fafc' }}
                  formatter={(val: any) => [formatCurrency(Number(val))]}
                />
                <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'Xanh Mono', color: '#94a3b8' }} />
                <Bar dataKey="originalCost" name="Unoptimized Cost" fill="#475569" radius={[6, 6, 0, 0]} />
                <Bar dataKey="optimizedCost" name="Optimized Cost" fill="#6366f1" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interactive Production ROI Calculator Bento */}
        <div className="lg:col-span-5 bg-slate-900/70 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Calculator className="w-4 h-4 text-indigo-400" />
              <h3 className="font-bold text-sm text-white">Enterprise ROI Projector</h3>
            </div>
            <p className="text-xs text-slate-400">
              Simulate annual infrastructure savings based on anticipated API / local traffic volume.
            </p>

            <div className="space-y-4 mt-4 text-xs font-technical">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Daily Request Volume:</span>
                  <strong className="text-white">{dailyVolume.toLocaleString()} req/day</strong>
                </div>
                <input
                  type="range"
                  min="5000"
                  max="500000"
                  step="5000"
                  value={dailyVolume}
                  onChange={(e) => setDailyVolume(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Avg Prompt Tokens:</span>
                  <strong className="text-white">{avgTokensPerPrompt} tokens</strong>
                </div>
                <input
                  type="range"
                  min="20"
                  max="200"
                  step="5"
                  value={avgTokensPerPrompt}
                  onChange={(e) => setAvgTokensPerPrompt(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-400">Refinement Compression Rate:</span>
                  <strong className="text-emerald-400">{avgReductionRate}%</strong>
                </div>
                <input
                  type="range"
                  min="15"
                  max="65"
                  step="1"
                  value={avgReductionRate}
                  onChange={(e) => setAvgReductionRate(Number(e.target.value))}
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 text-white space-y-2 font-technical mt-2">
            <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider block">
              PROJECTED SAVINGS
            </span>
            <div className="flex justify-between items-baseline">
              <span className="text-xs text-slate-400">Monthly Run-Rate:</span>
              <strong className="text-base text-white">{formatCurrency(monthlySavingsUSD)}</strong>
            </div>
            <div className="flex justify-between items-baseline pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-400">Annualized Savings:</span>
              <strong className="text-lg text-emerald-400">{formatCurrency(yearlySavingsUSD)} / yr</strong>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};

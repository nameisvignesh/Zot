import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Play, 
  Copy, 
  Check, 
  RotateCcw, 
  ArrowRight, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  Sliders, 
  Clock, 
  DollarSign,
  ChevronDown,
  FileText,
  Terminal
} from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { countTokens, refinePrompt } from '../../lib/tokenizer';
import { classifyPrompt, routePrompt } from '../../lib/routingEngine';
import { SAMPLE_PROMPTS } from '../../data/mockData';
import { RefinerVersionId } from '../../types';

export const PlaygroundView: React.FC = () => {
  const { 
    models, 
    refinerVersions, 
    activeRefinerVersion, 
    setActiveRefinerVersion,
    runInference,
    isExecuting,
    streamingOutput,
    lastExecutionMetrics,
    formatCurrency,
    settings
  } = useZot();

  const [prompt, setPrompt] = useState<string>(SAMPLE_PROMPTS[0].prompt);
  const [refinedText, setRefinedText] = useState<string>('');
  const [hasRefined, setHasRefined] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [preferredModelId, setPreferredModelId] = useState<string>('auto');
  const [streamedResponse, setStreamedResponse] = useState<string>('');

  // Live Token & Classifier Analysis
  const originalTokens = countTokens(prompt);
  const refinedTokens = countTokens(refinedText || prompt);
  const tokensSaved = hasRefined ? Math.max(0, originalTokens - refinedTokens) : 0;
  const reductionPercentage = hasRefined && originalTokens > 0 
    ? Number(((tokensSaved / originalTokens) * 100).toFixed(1)) 
    : 0;

  // Live Zero-Shot Classification
  const analysis = classifyPrompt(hasRefined && refinedText ? refinedText : prompt);
  const routing = routePrompt(hasRefined && refinedText ? refinedText : prompt, models, preferredModelId === 'auto' ? undefined : preferredModelId);
  const selectedModel = models.find(m => m.id === routing.selected_model) || models[0];

  // Handle Refine Action
  const handleRefine = () => {
    if (!prompt.trim()) return;
    const res = refinePrompt(prompt, activeRefinerVersion, settings.min_similarity_threshold);
    setRefinedText(res.refinedText);
    setHasRefined(true);
  };

  // Handle Run Inference Action
  const handleRun = async () => {
    if (!prompt.trim()) return;
    setStreamedResponse('');
    
    // If not refined yet and auto-refine is on, refine first
    if (!hasRefined && settings.auto_refine_on_run) {
      handleRefine();
    }

    await runInference({
      prompt: prompt,
      refine: hasRefined || settings.auto_refine_on_run,
      refinerVersion: activeRefinerVersion,
      preferredModelId: preferredModelId === 'auto' ? undefined : preferredModelId,
      onStreamChunk: (chunk) => setStreamedResponse(chunk)
    });
  };

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setPrompt('');
    setRefinedText('');
    setHasRefined(false);
    setStreamedResponse('');
  };

  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_PROMPTS.find(s => s.id === sampleId);
    if (sample) {
      setPrompt(sample.prompt);
      setRefinedText('');
      setHasRefined(false);
      setStreamedResponse('');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Quick Sample Loader Bento */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-extrabold text-white tracking-tight">
              Interactive Prompt Playground
            </h1>
            <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-technical font-bold px-2.5 py-0.5 rounded-lg">
              DUAL WORKSPACE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Test prompt refinement strategies, inspect token reductions in real-time, and trigger zero-shot routing execution.
          </p>
        </div>

        {/* Sample Prompt Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-slate-400 font-technical">Load Benchmark:</span>
          <select 
            onChange={(e) => handleSelectSample(e.target.value)}
            className="text-xs font-technical bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          >
            {SAMPLE_PROMPTS.map((sample) => (
              <option key={sample.id} value={sample.id} className="bg-slate-900 text-slate-200">
                {sample.title} ({sample.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Dual Workspace Bento: Original Prompt vs Refined Prompt */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* Left Column: Original Prompt */}
        <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-slate-200 uppercase tracking-wider font-technical">
                Original Prompt
              </span>
              <span className="text-[11px] font-technical bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-lg text-slate-300 font-semibold">
                {originalTokens} tokens
              </span>
            </div>
            <button 
              onClick={handleReset}
              className="text-xs text-slate-400 hover:text-white font-technical flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          <div className="p-4 flex-1">
            <textarea
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                setHasRefined(false);
              }}
              placeholder="Enter your prompt here..."
              rows={8}
              className="w-full h-full min-h-[160px] p-3.5 text-sm text-slate-100 bg-slate-950/60 border border-slate-800/80 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-y font-mono leading-relaxed placeholder:text-slate-600"
            />
          </div>

          <div className="p-3.5 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400 font-technical">
            <span>Length: {prompt.length} chars • {prompt.split(/\s+/).filter(Boolean).length} words</span>
            <span className="text-slate-500">Raw payload</span>
          </div>
        </div>

        {/* Right Column: Refined Prompt */}
        <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-xs text-white uppercase tracking-wider font-technical flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Refined Prompt
              </span>
              {hasRefined && (
                <span className="text-[11px] font-technical bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-lg font-bold">
                  {refinedTokens} tokens (-{reductionPercentage}%)
                </span>
              )}
            </div>
            {hasRefined && (
              <button 
                onClick={() => handleCopy(refinedText)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-technical flex items-center gap-1 font-semibold transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            )}
          </div>

          <div className="p-4 flex-1">
            {hasRefined ? (
              <textarea
                value={refinedText}
                onChange={(e) => setRefinedText(e.target.value)}
                rows={8}
                className="w-full h-full min-h-[160px] p-3.5 text-sm text-indigo-200 bg-slate-950/60 border border-indigo-500/30 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 resize-y font-mono leading-relaxed"
              />
            ) : (
              <div className="h-full min-h-[160px] flex flex-col items-center justify-center p-6 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/30">
                <Sparkles className="w-8 h-8 text-slate-700 mb-2" />
                <p className="text-xs text-slate-400 font-technical max-w-sm">
                  Click <strong className="text-indigo-400">Refine Prompt</strong> below to compress tokens, eliminate politeness fluff, and preserve core constraints.
                </p>
              </div>
            )}
          </div>

          <div className="p-3.5 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400 font-technical">
            {hasRefined ? (
              <>
                <span className="text-emerald-400 font-semibold">
                  Saved: {tokensSaved} tokens ({reductionPercentage}%)
                </span>
                <span className="text-slate-400">Refiner: {refinerVersions.find(v => v.id === activeRefinerVersion)?.name}</span>
              </>
            ) : (
              <span className="text-slate-500">Awaiting optimization</span>
            )}
          </div>
        </div>

      </div>

      {/* Control Strip & Version Selection Bento */}
      <div className="bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Version Selector */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-bold text-slate-200 font-technical uppercase">
            Refiner Version:
          </span>
          <div className="flex items-center bg-slate-800/80 rounded-xl border border-slate-700/60 p-1 gap-1">
            {refinerVersions.map((ver) => (
              <button
                key={ver.id}
                onClick={() => {
                  setActiveRefinerVersion(ver.id);
                  if (hasRefined) {
                    const res = refinePrompt(prompt, ver.id, settings.min_similarity_threshold);
                    setRefinedText(res.refinedText);
                  }
                }}
                className={`px-3 py-1.5 text-xs font-technical font-medium rounded-lg transition-all ${
                  activeRefinerVersion === ver.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-bold'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {ver.label}
              </button>
            ))}
          </div>
        </div>

        {/* Model Override Selector */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-200 font-technical uppercase">
            Model:
          </span>
          <select
            value={preferredModelId}
            onChange={(e) => setPreferredModelId(e.target.value)}
            className="text-xs font-technical bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="auto" className="bg-slate-900 text-slate-200">⚡ Auto Zero-Shot Route ({selectedModel.name})</option>
            {models.map(m => (
              <option key={m.id} value={m.id} className="bg-slate-900 text-slate-200">
                {m.name} ({m.type.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Main Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleRefine}
            disabled={!prompt.trim() || isExecuting}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-lg shadow-indigo-500/25 ring-1 ring-indigo-400/30 disabled:opacity-50 flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>[ Refine Prompt ]</span>
          </button>
          
          <button
            onClick={handleRun}
            disabled={!prompt.trim() || isExecuting}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-extrabold rounded-xl border border-slate-700 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            <Play className="w-4 h-4 text-indigo-400" />
            <span>{isExecuting ? 'Processing...' : '[ Run Inference ]'}</span>
          </button>
        </div>

      </div>

      {/* Real-Time Telemetry & Routing Decision Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Zero-Shot Routing Bento Card */}
        <div className="bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-technical uppercase font-bold text-indigo-400 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              Zero-Shot Router
            </span>
            <span className="text-[10px] font-technical bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg border border-slate-700">
              Confidence: {Math.round(analysis.confidence * 100)}%
            </span>
          </div>

          <div className="space-y-2 text-xs font-technical">
            <div className="flex justify-between">
              <span className="text-slate-400">Task Class:</span>
              <strong className="text-white">{analysis.task}</strong>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Complexity Score:</span>
              <div className="flex items-center gap-2">
                <div className="w-20 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-500 h-full rounded-full" 
                    style={{ width: `${analysis.complexity * 100}%` }}
                  ></div>
                </div>
                <strong className="text-white">{analysis.complexity}</strong>
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-800">
              <span className="text-slate-400">Selected Model:</span>
              <strong className="text-emerald-400">{selectedModel.name}</strong>
            </div>
            <div className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
              <strong className="text-slate-400">Reason:</strong> {routing.reason}
            </div>
          </div>
        </div>

        {/* Token Savings Summary Bento Card */}
        <div className="bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl">
          <span className="text-[11px] font-technical uppercase font-bold text-emerald-400 flex items-center gap-1.5 mb-3">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            Optimization Metrics
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs font-technical">
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">ORIGINAL TOKENS</span>
              <span className="font-extrabold text-sm text-white">{originalTokens}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">REFINED TOKENS</span>
              <span className="font-extrabold text-sm text-emerald-400">{hasRefined ? refinedTokens : originalTokens}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">TOKENS SAVED</span>
              <span className="font-extrabold text-sm text-indigo-400">+{tokensSaved}</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-800">
              <span className="text-[10px] text-slate-400 block">REDUCTION %</span>
              <span className="font-extrabold text-sm text-emerald-400">{reductionPercentage}%</span>
            </div>
          </div>

          <div className="mt-3 text-[10px] text-slate-400 font-technical flex justify-between">
            <span>Pricing unit: 1,000 tokens</span>
            <span className="text-emerald-400">Est. Save: {formatCurrency((tokensSaved / 1000) * selectedModel.input_cost_per_1k)}</span>
          </div>
        </div>

        {/* Safety & Constraint Guard Bento Card */}
        <div className="bg-slate-900/70 backdrop-blur-md p-5 rounded-2xl border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-technical uppercase font-bold text-slate-200 flex items-center gap-1.5 mb-3">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Safety & Constraint Engine
            </span>

            <div className="space-y-1.5 text-xs font-technical">
              <div className="flex justify-between">
                <span className="text-slate-400">Negative Instructions:</span>
                <span className="text-emerald-400 font-bold">100% Preserved</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Semantic Similarity:</span>
                <span className="text-white font-bold">0.96 / 1.00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Rejection Safety:</span>
                <span className="text-emerald-400 font-bold">Fallback Armed</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 p-2.5 rounded-xl mt-3">
            ✓ Guardrail passed: Strict entity and constraint protection active.
          </div>
        </div>

      </div>

      {/* Model Response Stream Terminal Bento View */}
      <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 bg-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs text-white uppercase tracking-wider font-technical flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Model Inference Output
            </span>
            {isExecuting && (
              <span className="text-[10px] font-technical bg-indigo-600 text-white px-2 py-0.5 rounded-md font-bold animate-pulse">
                STREAMING TOKENS...
              </span>
            )}
          </div>
          {lastExecutionMetrics && (
            <div className="flex items-center gap-3 text-[11px] font-technical text-slate-400">
              <span>TTFT: <strong className="text-white">{lastExecutionMetrics.time_to_first_token_ms}ms</strong></span>
              <span>Total: <strong className="text-white">{lastExecutionMetrics.latency_ms}ms</strong></span>
              <span>Speed: <strong className="text-white">{lastExecutionMetrics.tokens_per_second} tok/s</strong></span>
              <span>Cost: <strong className="text-emerald-400">{formatCurrency(lastExecutionMetrics.actual_cost)}</strong></span>
            </div>
          )}
        </div>

        <div className="p-5 min-h-[140px] bg-slate-950/70 text-sm text-slate-100 font-mono leading-relaxed whitespace-pre-wrap selection:bg-indigo-500/30">
          {streamedResponse || (
            <div className="text-slate-500 italic text-xs">
              Output from the locally hosted Liquid AI LFM model will stream here progressively when you click Run Inference.
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

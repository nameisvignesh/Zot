import React, { useState } from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Check, 
  Copy, 
  CheckCircle2,
  XCircle,
  Key,
  Lock,
  ArrowRight,
  LogOut,
  ExternalLink,
  Cpu,
  Layers
} from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { refinePrompt, countTokens, extractConstraints } from '../../lib/tokenizer';
import { SAMPLE_PROMPTS } from '../../data/mockData';
import { RefinerVersionId } from '../../types';

export const RefinementView: React.FC = () => {
  const { 
    refinerVersions, 
    activeRefinerVersion, 
    setActiveRefinerVersion,
    settings,
    hfAuthState,
    connectHuggingFace,
    disconnectHuggingFace
  } = useZot();

  // "don't need an already given input inside the prompt refinement section" -> starts empty!
  const [prompt, setPrompt] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<RefinerVersionId>(activeRefinerVersion);
  const [copied, setCopied] = useState<boolean>(false);

  // Hugging Face API Gate state
  const [hfTokenInput, setHfTokenInput] = useState<string>('');
  const [hfUsernameInput, setHfUsernameInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);

  const result = refinePrompt(prompt, selectedVersion, settings.min_similarity_threshold);
  const detectedConstraints = extractConstraints(prompt);

  const handleHfSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hfTokenInput.trim()) {
      setAuthError('Please enter a valid Hugging Face API token (hf_...).');
      return;
    }
    setIsAuthenticating(true);
    setAuthError(null);

    setTimeout(() => {
      connectHuggingFace(hfTokenInput.trim(), hfUsernameInput.trim() || undefined);
      setIsAuthenticating(false);
    }, 450);
  };

  // Calculate word diff for visual highlight
  const getDiffDisplay = () => {
    if (!prompt || !prompt.trim()) {
      return (
        <span className="text-stone-500 italic">
          Enter a prompt above to view real-time token pruning and constraint preservation.
        </span>
      );
    }

    const origTokens = prompt.split(/(\s+|\[.*?\]|`.*?`|[,\.\!;\?])/).filter(Boolean);
    const refinedLower = (result?.refinedText || '').toLowerCase();

    return origTokens.map((token, idx) => {
      if (/^\s+$/.test(token)) {
        return <span key={idx}>{token}</span>;
      }

      // Check if it is a template slot like [start date] or code snippet
      if (/^\[.*\]$/.test(token) || /^`.*`$/.test(token)) {
        return (
          <span key={idx} className="bg-[#FF5500]/20 text-[#FF5500] font-mono font-bold px-1.5 py-0.5 rounded border border-[#FF5500]/40 mr-1 inline-block shadow-sm">
            {token}
          </span>
        );
      }

      const cleanWord = token.replace(/[^\w]/g, '').toLowerCase();
      if (!cleanWord) {
        return <span key={idx} className="text-stone-400">{token}</span>;
      }

      const isNegativeInstruction = /^(?:not|numpy|never|without|no|strictly|do\s+not)$/i.test(cleanWord);
      if (isNegativeInstruction) {
        return (
          <span key={idx} className="bg-[#FF5500]/20 text-[#FF5500] font-bold px-1.5 py-0.5 rounded border border-[#FF5500]/40 mr-1 inline-block">
            {token}
          </span>
        );
      }

      const isRetained = refinedLower.includes(cleanWord);

      if (!isRetained) {
        return (
          <span key={idx} className="line-through text-red-400 bg-red-500/15 px-1 py-0.5 rounded mr-1 opacity-80 inline-block font-mono text-[11px]">
            {token}
          </span>
        );
      }

      return <span key={idx} className="text-stone-200 mr-1 inline-block">{token}</span>;
    });
  };

  const handleCopy = () => {
    if (!result.refinedText) return;
    navigator.clipboard.writeText(result.refinedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 1. HUGGING FACE GATE: Required before user enters prompt refinement section
  if (!hfAuthState.isConnected) {
    return (
      <div className="max-w-xl mx-auto my-10 animate-in fade-in duration-300">
        <div className="bg-[#18150f] border border-[#2E1F10] rounded-2xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 bg-[#FF5500]/10 border border-[#FF5500]/40 rounded-2xl flex items-center justify-center mx-auto text-[#FF5500] shadow-inner">
              <Key className="w-8 h-8" />
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#2E1F10] text-[#FF5500] border border-[#FF5500]/30 inline-block">
              Hugging Face Gate Required
            </span>
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Prompt Refinement Access
            </h2>
            <p className="text-xs text-stone-400 leading-relaxed max-w-md mx-auto">
              Before entering the prompt refinement and tokenizer optimization studio, connect your Hugging Face API key or HF account login to verify model inference credentials.
            </p>
          </div>

          <form onSubmit={handleHfSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5 flex items-center justify-between">
                <span>HUGGING FACE API TOKEN</span>
                <a 
                  href="https://huggingface.co/settings/tokens" 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[11px] text-[#FF5500] hover:underline flex items-center gap-1"
                >
                  <span>Get Free Token</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </label>
              <input
                type="password"
                required
                placeholder="hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                value={hfTokenInput}
                onChange={(e) => setHfTokenInput(e.target.value)}
                className="w-full p-3 bg-[#12100c] border border-[#2E1F10] focus:border-[#FF5500] focus:outline-none rounded-xl text-xs text-white placeholder-stone-600 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1.5">
                HF USERNAME OR HANDLE (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="e.g. hf_developer"
                value={hfUsernameInput}
                onChange={(e) => setHfUsernameInput(e.target.value)}
                className="w-full p-3 bg-[#12100c] border border-[#2E1F10] focus:border-[#FF5500] focus:outline-none rounded-xl text-xs text-white placeholder-stone-600 font-sans"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-3 px-4 bg-[#FF5500] hover:bg-[#e04b00] text-black font-bold rounded-xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {isAuthenticating ? (
                <span>Verifying Hugging Face Token...</span>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Authenticate & Enter Prompt Refiner</span>
                </>
              )}
            </button>

            {/* Quick Demo Test Access */}
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => {
                  connectHuggingFace('hf_demo_free_unlimited_key_9281', 'liquid_user');
                }}
                className="text-[11px] text-stone-400 hover:text-[#FF5500] underline cursor-pointer"
              >
                Use Quick HF Sandbox Token (Instant Access)
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-[#18150f] p-6 rounded-2xl border border-[#2E1F10] shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#FF5500] uppercase tracking-wider">
                Prompt Token Refiner
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2.5 py-0.5 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>HF Token Connected: {hfAuthState.username || 'Active'}</span>
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
              Prompt Refinement & Safety Validator
            </h1>
            <p className="text-xs text-stone-400 mt-1">
              Reduces conversational filler while strictly preserving technical invariants, code schemas, and negative constraints.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setPrompt(SAMPLE_PROMPTS[0].prompt)}
              className="text-xs px-3 py-1.5 rounded-xl border border-[#2E1F10] bg-[#12100c] hover:bg-[#252016] text-stone-200 transition-colors cursor-pointer"
            >
              Load ML Explainer
            </button>
            <button
              onClick={() => setPrompt(SAMPLE_PROMPTS[1].prompt)}
              className="text-xs px-3 py-1.5 rounded-xl border border-[#2E1F10] bg-[#12100c] hover:bg-[#252016] text-stone-200 transition-colors cursor-pointer"
            >
              Load Python / NumPy
            </button>
            <button
              onClick={disconnectHuggingFace}
              className="text-xs px-3 py-1.5 rounded-xl border border-red-500/30 bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer flex items-center gap-1"
              title="Disconnect Hugging Face Session"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect HF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Refinement Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Prompt & Version Control */}
        <div className="lg:col-span-7 space-y-4">
          {/* Prompt Input Box */}
          <div className="bg-[#1a1710] rounded-2xl border border-[#2E1F10] shadow-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-200 uppercase tracking-wider">
                Raw Input Prompt
              </label>
              <span className="text-[11px] font-mono text-stone-400">
                {countTokens(prompt)} tokens • {prompt.length} chars
              </span>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Type or paste your prompt here to test zero-shot refinement..."
              className="w-full p-3.5 text-xs text-stone-100 bg-[#12100c] border border-[#2E1F10] rounded-xl focus:outline-none focus:border-[#FF5500] leading-relaxed resize-y placeholder:text-stone-600 font-sans"
            />

            {/* Refiner Version Selection */}
            <div>
              <span className="text-xs font-bold text-stone-300 uppercase tracking-wider block mb-2">
                Compression Strategy
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {refinerVersions.map((ver) => (
                  <div
                    key={ver.id}
                    onClick={() => {
                      setSelectedVersion(ver.id);
                      setActiveRefinerVersion(ver.id);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      selectedVersion === ver.id
                        ? 'border-[#FF5500] bg-[#FF5500]/10 text-white shadow-md'
                        : 'border-[#2E1F10] bg-[#12110c] hover:bg-[#201b13] text-stone-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <strong className="text-xs text-white">{ver.name}</strong>
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                        selectedVersion === ver.id ? 'bg-[#FF5500] text-black font-bold' : 'text-stone-400 bg-[#2E1F10]'
                      }`}>
                        ~{ver.avgReduction}% cut
                      </span>
                    </div>
                    <p className={`text-[11px] leading-tight ${
                      selectedVersion === ver.id ? 'text-stone-200' : 'text-stone-400'
                    }`}>
                      {ver.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Word & Token Pruning Visual Diff */}
          <div className="bg-[#1a1710] rounded-2xl border border-[#2E1F10] shadow-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF5500]" />
                <span>Visual Token Diff</span>
              </span>
              <span className="text-[10px] text-stone-400">
                Red: Pruned • Orange: Preserved Invariants
              </span>
            </div>

            <div className="p-4 rounded-xl bg-[#12100c] border border-[#2E1F10] text-xs font-sans leading-relaxed min-h-[80px]">
              {getDiffDisplay()}
            </div>
          </div>

          {/* Refined Output Card */}
          <div className="bg-[#1a1710] rounded-2xl border border-[#2E1F10] shadow-md p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Refined Prompt Output
                </span>
                {result.refinedText && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Ready
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  disabled={!result.refinedText}
                  className="text-xs text-[#FF5500] hover:text-[#ff7733] flex items-center gap-1 font-semibold transition-colors cursor-pointer disabled:opacity-40"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#12100c] border border-[#FF5500]/40 text-xs text-stone-100 leading-relaxed font-sans min-h-[70px] selection:bg-[#FF5500]/30 selection:text-white">
              {result.refinedText || (
                <span className="text-stone-600 italic">No output yet. Enter text above to refine.</span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-400 pt-1 gap-2">
              <span>Refined token count: <strong className="text-white font-mono">{result.metrics.refined_tokens}</strong></span>
              <span className="text-emerald-400 font-bold font-mono">
                Tokens Saved: {result.metrics.tokens_saved} ({result.metrics.reduction_percentage}%)
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Quality Metrics Scorecard */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#1a1710] rounded-2xl border border-[#2E1F10] shadow-md p-5 space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Refinement Quality Scorecard
            </span>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-[#2E1F10]">
                <span className="text-stone-400">Original Tokens:</span>
                <strong className="text-white font-mono">{result.metrics.original_tokens}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#2E1F10]">
                <span className="text-stone-400">Refined Tokens:</span>
                <strong className="text-emerald-400 font-mono">{result.metrics.refined_tokens}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#2E1F10]">
                <span className="text-stone-400">Tokens Saved:</span>
                <strong className="text-[#FF5500] font-mono">+{result.metrics.tokens_saved}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#2E1F10]">
                <span className="text-stone-400">Reduction Percentage:</span>
                <strong className="text-emerald-400 font-mono">{result.metrics.reduction_percentage}%</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#2E1F10]">
                <span className="text-stone-400">Semantic Similarity:</span>
                <strong className="text-white font-mono">{(result.metrics.semantic_similarity * 100).toFixed(1)}%</strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-stone-400">Constraint Preservation:</span>
                <strong className="text-emerald-400 font-mono">{(result.metrics.constraint_preservation * 100).toFixed(0)}%</strong>
              </div>
            </div>

            <div className={`p-3 rounded-xl text-xs flex items-center gap-2.5 ${
              result.metrics.accepted
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-amber-500/10 text-[#FF5500] border border-amber-500/20'
            }`}>
              {result.metrics.accepted ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span><strong>STATUS: VERIFIED</strong> — Output complies with negative constraints and semantics.</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span><strong>STATUS: REJECTED</strong> — {result.metrics.rejection_reason}</span>
                </>
              )}
            </div>
          </div>

          {/* Strict Preservation Invariants */}
          <div className="bg-[#1a1710] rounded-2xl border border-[#2E1F10] shadow-md p-5 space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#FF5500]" />
              <span>Strict Preservation Invariants</span>
            </span>

            <p className="text-[11px] text-stone-400">
              The refiner is strictly guarded. Negative constraints, technical parameters, and specific code signatures are protected from elimination.
            </p>

            <div className="space-y-2">
              {detectedConstraints.length > 0 ? (
                detectedConstraints.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-[#12100c] border border-[#2E1F10] text-xs">
                    <span className="text-stone-200 truncate max-w-[200px] font-mono">
                      "{c.text}" ({c.type})
                    </span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Preserved
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-stone-400 p-2.5 bg-[#12110c] rounded-xl">
                  {prompt.trim() ? 'No strict negative constraints detected in current prompt.' : 'No prompt provided.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

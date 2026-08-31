import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Cpu, 
  Clock, 
  DollarSign, 
  Layers, 
  ShieldCheck,
  Terminal,
  Play
} from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { RequestRecord } from '../../types';

interface RequestDetailModalProps {
  request: RequestRecord | null;
  onClose: () => void;
  onRetry: (req: RequestRecord) => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({ request, onClose, onRetry }) => {
  const { formatCurrency } = useZot();
  const [copiedId, setCopiedId] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedResponse, setCopiedResponse] = useState(false);

  if (!request) return null;

  const handleCopy = (text: string, type: 'id' | 'prompt' | 'response') => {
    navigator.clipboard.writeText(text);
    if (type === 'id') { setCopiedId(true); setTimeout(() => setCopiedId(false), 2000); }
    if (type === 'prompt') { setCopiedPrompt(true); setTimeout(() => setCopiedPrompt(false), 2000); }
    if (type === 'response') { setCopiedResponse(true); setTimeout(() => setCopiedResponse(false), 2000); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-technical font-bold text-indigo-400 uppercase">
                INFERENCE TELEMETRY RECORD
              </span>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-technical px-2.5 py-0.5 rounded-md font-bold border border-emerald-500/20">
                200 OK
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <h2 className="text-lg font-extrabold text-white font-technical">
                {request.id}
              </h2>
              <button 
                onClick={() => handleCopy(request.id, 'id')}
                className="text-slate-400 hover:text-white p-1 transition-colors"
                title="Copy Request ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 font-technical mt-0.5">
              Timestamp: {new Date(request.timestamp).toLocaleString()} • User: <strong className="text-slate-200">{request.user_id}</strong>
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 4 Telemetry Spec Boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-technical">
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">TARGET MODEL</span>
            <strong className="text-white truncate block">{request.model_name}</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">TOKENS (IN/OUT)</span>
            <strong className="text-white">{request.input_tokens} in / {request.output_tokens} out</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">SAVINGS</span>
            <strong className="text-emerald-400">+{request.tokens_saved} tok (-{request.reduction_percentage}%)</strong>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
            <span className="text-[10px] text-slate-400 block mb-1">TOTAL LATENCY</span>
            <strong className="text-indigo-300">{request.latency_ms}ms ({request.tokens_per_second} tok/s)</strong>
          </div>
        </div>

        {/* Prompt Comparison */}
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-technical">
              <span className="font-bold text-slate-400 uppercase">Original Prompt ({request.original_tokens} tokens)</span>
              <button 
                onClick={() => handleCopy(request.original_prompt, 'prompt')}
                className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
              >
                {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>Copy</span>
              </button>
            </div>
            <p className="text-xs font-mono text-slate-200 whitespace-pre-wrap">{request.original_prompt}</p>
          </div>

          {request.refine_enabled && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/40 space-y-1.5 shadow-lg">
              <div className="flex items-center justify-between text-xs font-technical">
                <span className="font-bold text-white uppercase flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                  Refined Invariant Prompt (v{request.refiner_version} • {request.input_tokens} tokens)
                </span>
                <span className="text-emerald-400 font-bold">Similarity: {(request.semantic_similarity * 100).toFixed(1)}%</span>
              </div>
              <p className="text-xs font-mono text-indigo-200 whitespace-pre-wrap">{request.refined_prompt}</p>
            </div>
          )}
        </div>

        {/* Generated Response Box */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-white space-y-2">
          <div className="flex items-center justify-between text-xs font-technical">
            <span className="font-bold text-indigo-400 uppercase flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              Model Response Output ({request.output_tokens} tokens)
            </span>
            <button 
              onClick={() => handleCopy(request.response_text, 'response')}
              className="text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
            >
              {copiedResponse ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copy Response</span>
            </button>
          </div>
          <div className="text-xs font-mono text-slate-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
            {request.response_text}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="text-xs font-technical text-slate-400">
            Cost: <strong className="text-white">{formatCurrency(request.actual_cost)}</strong> • Saved: <strong className="text-emerald-400">{formatCurrency(request.cost_saved)}</strong>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                onRetry(request);
                onClose();
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/25"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry in Playground</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

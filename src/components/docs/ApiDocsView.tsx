import React, { useState } from 'react';
import { 
  FileCode2, 
  Terminal, 
  Send, 
  Copy, 
  Check, 
  CheckCircle2, 
  Layers, 
  Server, 
  Cpu, 
  Sparkles, 
  Database,
  ArrowDown
} from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { countTokens, refinePrompt } from '../../lib/tokenizer';
import { routePrompt } from '../../lib/routingEngine';

export const ApiDocsView: React.FC = () => {
  const { models, settings } = useZot();
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/v1/chat');
  const [activeLang, setActiveLang] = useState<'curl' | 'python' | 'javascript' | 'typescript'>('curl');
  const [copiedCode, setCopiedCode] = useState(false);
  
  // Interactive console state
  const [consolePayload, setConsolePayload] = useState<string>(
    JSON.stringify({
      user_id: "user_001",
      model: "lfm-local",
      prompt: "Explain how liquid neural networks differ from standard transformers simply.",
      refine: true,
      refiner_version: "2.0"
    }, null, 2)
  );
  const [consoleResponse, setConsoleResponse] = useState<any>(null);
  const [isSending, setIsSending] = useState(false);

  const endpoints = [
    { method: 'GET', path: '/health', description: 'System health check and local Liquid AI model status' },
    { method: 'GET', path: '/api/v1/models', description: 'List all registered local and remote AI models' },
    { method: 'POST', path: '/api/v1/chat', description: 'Execute prompt inference with optional refinement and routing' },
    { method: 'POST', path: '/api/v1/refine', description: 'Optimize prompt, prune politeness & calculate token reduction' },
    { method: 'POST', path: '/api/v1/route', description: 'Zero-shot classify task and determine optimal model target' },
    { method: 'GET', path: '/api/v1/usage', description: 'Retrieve paginated request telemetry records' },
    { method: 'GET', path: '/api/v1/analytics', description: 'Aggregate KPIs, token savings, and cost breakdown' },
  ];

  const handleSelectEndpoint = (path: string) => {
    setSelectedEndpoint(path);
    if (path === '/health') {
      setConsolePayload('{}');
    } else if (path === '/api/v1/models') {
      setConsolePayload('{}');
    } else if (path === '/api/v1/refine') {
      setConsolePayload(JSON.stringify({
        prompt: "Can you please provide me with a detailed explanation about how machine learning algorithms work?",
        version: "2.0"
      }, null, 2));
    } else if (path === '/api/v1/route') {
      setConsolePayload(JSON.stringify({
        prompt: "Create a Python function that accepts integers and returns even numbers. Do not use NumPy.",
        preferred_model: "auto"
      }, null, 2));
    } else if (path === '/api/v1/chat') {
      setConsolePayload(JSON.stringify({
        user_id: "user_001",
        model: "lfm-local",
        prompt: "Explain how liquid neural networks differ from standard transformers simply.",
        refine: true,
        refiner_version: "2.0"
      }, null, 2));
    } else {
      setConsolePayload('{}');
    }
    setConsoleResponse(null);
  };

  const handleSendTestRequest = async () => {
    setIsSending(true);
    const start = performance.now();
    await new Promise(r => setTimeout(r, 220));

    let parsed = {};
    try { parsed = JSON.parse(consolePayload); } catch (e) {}

    let res: any = {};
    const path = selectedEndpoint;

    if (path === '/health') {
      res = {
        status: "ok",
        model: "lfm-local",
        model_status: "ready",
        runtime: "PyTorch / FastAPI",
        device: settings.model_device,
        uptime_seconds: 84920
      };
    } else if (path === '/api/v1/models') {
      res = {
        models: models.map(m => ({
          id: m.id,
          name: m.name,
          provider: m.provider,
          type: m.type,
          status: m.status,
          context_length: m.context_length,
          input_cost: m.input_cost_per_1k,
          output_cost: m.output_cost_per_1k,
          enabled: m.enabled
        }))
      };
    } else if (path === '/api/v1/refine') {
      const p = (parsed as any).prompt || 'Explain machine learning.';
      const v = (parsed as any).version || '2.0';
      const ref = refinePrompt(p, v, settings.min_similarity_threshold);
      res = {
        original_prompt: p,
        refined_prompt: ref.refinedText,
        original_tokens: ref.metrics.original_tokens,
        refined_tokens: ref.metrics.refined_tokens,
        tokens_saved: ref.metrics.tokens_saved,
        reduction_percentage: ref.metrics.reduction_percentage,
        semantic_similarity: ref.metrics.semantic_similarity,
        version: v,
        accepted: ref.metrics.accepted
      };
    } else if (path === '/api/v1/route') {
      const p = (parsed as any).prompt || 'Write Python code.';
      const decision = routePrompt(p, models);
      res = decision;
    } else {
      // /api/v1/chat
      const p = (parsed as any).prompt || 'Explain transformers.';
      const v = (parsed as any).refiner_version || '2.0';
      const shouldRefine = (parsed as any).refine !== false;
      const ref = shouldRefine ? refinePrompt(p, v, settings.min_similarity_threshold) : null;
      const targetPrompt = ref ? ref.refinedText : p;
      const origTok = countTokens(p);
      const inTok = countTokens(targetPrompt);
      const outTok = 38;

      res = {
        request_id: `req_${Date.now().toString(36)}`,
        model: (parsed as any).model || "lfm-local",
        response: "Liquid neural networks (LFMs) feature adaptive time-constant parameters computed on-the-fly during inference, allowing dynamic continuous-time representation with vastly lower memory overhead compared to traditional static attention matrices.",
        usage: {
          input_tokens: inTok,
          output_tokens: outTok,
          total_tokens: inTok + outTok
        },
        optimization: {
          original_tokens: origTok,
          refined_tokens: inTok,
          tokens_saved: Math.max(0, origTok - inTok),
          reduction_percentage: origTok > 0 ? Number((((origTok - inTok) / origTok) * 100).toFixed(1)) : 0
        },
        latency_ms: Math.round(performance.now() - start + 280)
      };
    }

    setConsoleResponse({
      statusCode: 200,
      timeMs: Math.round(performance.now() - start),
      body: res
    });
    setIsSending(false);
  };

  const getCodeSnippet = () => {
    const url = `${settings.api_gateway_url}${selectedEndpoint}`;
    if (activeLang === 'curl') {
      if (selectedEndpoint === '/health' || selectedEndpoint === '/api/v1/models') {
        return `curl -X GET "${url}" \\
  -H "Accept: application/json"`;
      }
      return `curl -X POST "${url}" \\
  -H "Content-Type: application/json" \\
  -d '${consolePayload.replace(/\n/g, '')}'`;
    }

    if (activeLang === 'python') {
      if (selectedEndpoint === '/health' || selectedEndpoint === '/api/v1/models') {
        return `import requests

response = requests.get("${url}")
print(response.json())`;
      }
      return `import requests

payload = ${consolePayload}

response = requests.post(
    "${url}",
    json=payload,
    headers={"Content-Type": "application/json"}
)

print(response.status_code)
print(response.json())`;
    }

    if (activeLang === 'javascript' || activeLang === 'typescript') {
      if (selectedEndpoint === '/health' || selectedEndpoint === '/api/v1/models') {
        return `const response = await fetch("${url}");
const data = await response.json();
console.log(data);`;
      }
      return `const response = await fetch("${url}", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(${consolePayload})
});

const data = await response.json();
console.log(data);`;
    }

    return '';
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getCodeSnippet());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bento */}
      <div className="bg-slate-900/70 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="font-technical text-xs font-bold text-indigo-400 uppercase tracking-wider">
            OPENAPI 3.1 & FASTAPI SPECS
          </span>
          <span className="bg-indigo-500/10 text-indigo-300 font-technical text-[10px] font-bold px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
            GATEWAY API
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
          ZOT REST API & Architecture Explorer
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Programmatic gateway endpoints for prompt refinement, zero-shot arbitration, local model inference, and real-time telemetry.
        </p>
      </div>

      {/* System Architecture Flow Diagram Bento */}
      <div className="bg-slate-900/70 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold font-technical text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            Full ZOT Pipeline Architecture (Page 71)
          </span>
          <span className="text-[11px] font-technical text-slate-400">
            React Client → FastAPI Gateway → Refiner/Router → Local LFM → Telemetry
          </span>
        </div>

        <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-xs font-technical overflow-x-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-center min-w-[650px]">
            
            {/* Step 1 */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 shadow-md flex-1">
              <strong className="text-white block">React + Vite Client</strong>
              <span className="text-[10px] text-slate-400">Tailwind + Bento UI</span>
            </div>

            <span className="text-indigo-400 font-bold">→ HTTP / SSE →</span>

            {/* Step 2 */}
            <div className="p-3 bg-indigo-950/60 text-white rounded-xl border border-indigo-500/30 shadow-md flex-1">
              <strong className="text-indigo-300 block">FastAPI ZOT Gateway</strong>
              <span className="text-[10px] text-slate-300">Port 8000 (localhost)</span>
            </div>

            <span className="text-indigo-400 font-bold">→ Pipeline →</span>

            {/* Step 3 */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 shadow-md flex-1">
              <strong className="text-white block">Prompt Refiner & Router</strong>
              <span className="text-[10px] text-emerald-400 font-bold">Zero-Shot Arbitrage</span>
            </div>

            <span className="text-indigo-400 font-bold">→ Inference →</span>

            {/* Step 4 */}
            <div className="p-3 bg-slate-900 rounded-xl border border-indigo-500/50 shadow-md flex-1 ring-1 ring-indigo-500/30">
              <strong className="text-white block">Liquid AI LFM</strong>
              <span className="text-[10px] text-indigo-300 font-bold">Local Model Runtime</span>
            </div>

            <span className="text-indigo-400 font-bold">→ Log →</span>

            {/* Step 5 */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 shadow-md flex-1">
              <strong className="text-white block">Telemetry DB</strong>
              <span className="text-[10px] text-slate-400">SQLite / Postgres</span>
            </div>

          </div>
        </div>
      </div>

      {/* Interactive API Explorer Bento Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Endpoint List (4 cols) */}
        <div className="lg:col-span-4 bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl p-5 space-y-3">
          <span className="text-xs font-bold font-technical text-white uppercase tracking-wider block">
            Gateway Routes
          </span>

          <div className="space-y-2">
            {endpoints.map((ep) => {
              const isSelected = selectedEndpoint === ep.path;
              return (
                <div
                  key={ep.path}
                  onClick={() => handleSelectEndpoint(ep.path)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all text-xs font-technical ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-600/15 text-white shadow-lg'
                      : 'border-slate-800 bg-slate-950/40 hover:bg-slate-800/60 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      ep.method === 'GET' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {ep.method}
                    </span>
                    <span className="font-mono font-bold">{ep.path}</span>
                  </div>
                  <p className={`text-[11px] leading-tight ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}>
                    {ep.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Code Generator & Live Interactive Console (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Code Snippet Box Bento */}
          <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
                {(['curl', 'python', 'javascript', 'typescript'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setActiveLang(lang)}
                    className={`px-3 py-1 text-xs font-technical font-medium rounded-lg transition-colors ${
                      activeLang === lang 
                        ? 'bg-indigo-600 text-white shadow-md font-bold' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {lang.toUpperCase()}
                  </button>
                ))}
              </div>

              <button
                onClick={handleCopyCode}
                className="text-xs text-slate-300 hover:text-indigo-400 font-technical flex items-center gap-1.5 font-semibold transition-colors"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 text-indigo-300 font-mono text-xs overflow-x-auto leading-relaxed whitespace-pre-wrap border border-slate-800">
              {getCodeSnippet()}
            </pre>
          </div>

          {/* Live Request / Response Console Bento */}
          <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-technical text-white uppercase tracking-wider flex items-center gap-2">
                <Terminal className="w-4 h-4 text-indigo-400" />
                Live API Console ({selectedEndpoint})
              </span>
              <button
                onClick={handleSendTestRequest}
                disabled={isSending}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSending ? 'Calling...' : 'Send Request'}</span>
              </button>
            </div>

            {/* Request Payload Editor (if not GET) */}
            {selectedEndpoint.startsWith('/api/v1/chat') || selectedEndpoint.startsWith('/api/v1/refine') || selectedEndpoint.startsWith('/api/v1/route') ? (
              <div>
                <label className="block text-[11px] font-technical text-slate-400 mb-1">
                  REQUEST BODY (JSON):
                </label>
                <textarea
                  value={consolePayload}
                  onChange={(e) => setConsolePayload(e.target.value)}
                  rows={5}
                  className="w-full p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl font-mono text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                />
              </div>
            ) : null}

            {/* Live Response Viewer */}
            {consoleResponse && (
              <div className="space-y-1.5 pt-3 border-t border-slate-800">
                <div className="flex items-center justify-between text-xs font-technical">
                  <span className="text-emerald-400 font-bold">
                    HTTP 200 OK • Response Time: {consoleResponse.timeMs}ms
                  </span>
                  <span className="text-slate-400">Content-Type: application/json</span>
                </div>
                <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed max-h-64 overflow-y-auto border border-slate-800">
{JSON.stringify(consoleResponse.body, null, 2)}
                </pre>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};

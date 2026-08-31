import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye, 
  Sparkles, 
  RotateCcw, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  FileSpreadsheet
} from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { RequestRecord } from '../../types';
import { RequestDetailModal } from './RequestDetailModal';

export const UsageView: React.FC = () => {
  const { 
    requests, 
    activeRequest, 
    setActiveRequest, 
    clearHistory, 
    formatCurrency, 
    setActiveTab, 
    models 
  } = useZot();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedModel, setSelectedModel] = useState('all');
  const [selectedRefined, setSelectedRefined] = useState('all');

  // Extract unique users
  const uniqueUsers = Array.from(new Set(requests.map(r => r.user_id)));

  // Filter requests
  const filteredRequests = requests.filter(req => {
    if (selectedUser !== 'all' && req.user_id !== selectedUser) return false;
    if (selectedModel !== 'all' && req.model_id !== selectedModel) return false;
    if (selectedRefined === 'refined' && !req.refine_enabled) return false;
    if (selectedRefined === 'unrefined' && req.refine_enabled) return false;
    if (searchQuery && searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        (req.id || '').toLowerCase().includes(q) ||
        (req.original_prompt || '').toLowerCase().includes(q) ||
        (req.model_name || '').toLowerCase().includes(q) ||
        (req.task_type || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Export to JSON
  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredRequests, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `zot_telemetry_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Request ID', 'Timestamp', 'User', 'Model', 'Task', 'Input Tokens', 'Output Tokens', 'Total Tokens', 'Tokens Saved', 'Latency (ms)', 'Cost (USD)', 'Refined'];
    const rows = filteredRequests.map(r => [
      r.id,
      r.timestamp,
      r.user_id,
      `"${r.model_name.replace(/"/g, '""')}"`,
      r.task_type,
      r.input_tokens,
      r.output_tokens,
      r.total_tokens,
      r.tokens_saved,
      r.latency_ms,
      r.actual_cost,
      r.refine_enabled ? 'Yes' : 'No'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `zot_telemetry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const handleRetryInPlayground = (req: RequestRecord) => {
    setActiveTab('playground');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner Bento */}
      <div className="bg-slate-900/70 backdrop-blur-md p-6 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-technical text-xs font-bold text-indigo-400 uppercase tracking-wider">
              REQUEST TELEMETRY & AUDIT LOGS
            </span>
            <span className="bg-slate-800 text-slate-300 font-technical text-[10px] font-bold px-2.5 py-0.5 rounded-lg border border-slate-700">
              {filteredRequests.length} RECORDS
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight mt-1">
            Usage & Execution History
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Detailed log of all client prompts, zero-shot routing decisions, token reductions, and execution latency.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-technical font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handleExportJSON}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-technical font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to clear request history?')) {
                clearHistory();
              }
            }}
            className="px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-technical font-semibold rounded-xl border border-red-500/30 flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Logs</span>
          </button>
        </div>
      </div>

      {/* Filter Bar Bento */}
      <div className="bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Search Field */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Request ID, Prompt text, or Task class..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2.5 text-xs font-technical bg-slate-950/60 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-technical">
          
          {/* User filter */}
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Users</option>
            {uniqueUsers.map(u => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>

          {/* Model filter */}
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Models</option>
            {models.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>

          {/* Refined filter */}
          <select
            value={selectedRefined}
            onChange={(e) => setSelectedRefined(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Status</option>
            <option value="refined">Refined Only</option>
            <option value="unrefined">Unrefined Only</option>
          </select>

        </div>

      </div>

      {/* Requests History Table Bento */}
      <div className="bg-slate-900/70 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl overflow-hidden">
        {filteredRequests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-technical border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                  <th className="py-3.5 px-4 font-semibold">TIME</th>
                  <th className="py-3.5 px-4 font-semibold">REQUEST ID</th>
                  <th className="py-3.5 px-4 font-semibold">USER</th>
                  <th className="py-3.5 px-4 font-semibold">MODEL</th>
                  <th className="py-3.5 px-4 font-semibold text-right">INPUT</th>
                  <th className="py-3.5 px-4 font-semibold text-right">OUTPUT</th>
                  <th className="py-3.5 px-4 font-semibold text-right">TOTAL</th>
                  <th className="py-3.5 px-4 font-semibold text-right">SAVED</th>
                  <th className="py-3.5 px-4 font-semibold text-right">LATENCY</th>
                  <th className="py-3.5 px-4 font-semibold text-right">COST</th>
                  <th className="py-3.5 px-4 font-semibold text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredRequests.map((req) => {
                  const timeStr = new Date(req.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr 
                      key={req.id}
                      onClick={() => setActiveRequest(req)}
                      className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">{timeStr}</td>
                      <td className="py-3.5 px-4 font-semibold text-indigo-300">{req.id}</td>
                      <td className="py-3.5 px-4 text-slate-400">{req.user_id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white truncate max-w-[140px]">
                          {req.model_name}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400">{req.input_tokens}</td>
                      <td className="py-3.5 px-4 text-right text-slate-400">{req.output_tokens}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">{req.total_tokens}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                        {req.tokens_saved > 0 ? `-${req.reduction_percentage}%` : '0%'}
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-400">{req.latency_ms}ms</td>
                      <td className="py-3.5 px-4 text-right font-bold text-white">
                        {formatCurrency(req.actual_cost)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveRequest(req);
                          }}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 text-slate-200 text-[11px] font-semibold inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3 h-3 text-indigo-400" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center space-y-3">
            <History className="w-8 h-8 text-slate-700 mx-auto" />
            <h3 className="font-bold text-sm text-white">No requests found matching criteria</h3>
            <p className="text-xs text-slate-400 font-technical max-w-sm mx-auto">
              Run your first prompt in the Playground to start collecting token, latency, and cost telemetry.
            </p>
          </div>
        )}
      </div>

      {/* Modal Inspector Component */}
      <RequestDetailModal
        request={activeRequest}
        onClose={() => setActiveRequest(null)}
        onRetry={handleRetryInPlayground}
      />

    </div>
  );
};

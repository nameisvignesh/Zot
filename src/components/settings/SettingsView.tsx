import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Cpu, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Save, 
  Server,
  Download,
  Trash2,
  Palette,
  CheckCircle2
} from 'lucide-react';
import { useZot } from '../../context/ZotContext';
import { DEFAULT_SETTINGS, INITIAL_MODELS, APP_THEMES } from '../../data/mockData';
import { ThemeId } from '../../types';

export const SettingsView: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    models, 
    setModels,
    refinerVersions,
    clearHistory,
    requests,
    theme,
    setTheme
  } = useZot();

  const [savedToast, setSavedToast] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleThemeChange = (newTheme: ThemeId) => {
    setTheme(newTheme);
    updateSettings({ theme: newTheme });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleResetToFactoryDefaults = () => {
    if (window.confirm('Reset all ZOT settings, models registry, and historical data to initial defaults?')) {
      updateSettings(DEFAULT_SETTINGS);
      setTheme('amber-zero');
      setModels(INITIAL_MODELS);
      clearHistory();
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2000);
    }
  };

  const handleExportJson = () => {
    const dataStr = JSON.stringify(requests, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zot_telemetry_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="bg-[#18150f] p-6 rounded-2xl border border-[#2E2910] shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#FF9100] uppercase tracking-wider">
              System Gateway Preferences
            </span>
            <span className="bg-[#2E2910] text-[#FF9100] text-[10px] font-mono px-2 py-0.5 rounded-lg border border-[#FF9100]/30 font-semibold">
              Persistent Local Config
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            System & Theme Settings
          </h1>
          <p className="text-xs text-stone-400 mt-1">
            Customize UI themes, configure free unlimited models, prompt compression algorithms, and telemetry retention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {savedToast && (
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/30 flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5" /> Changes Applied & Saved
            </span>
          )}
          <button
            onClick={handleResetToFactoryDefaults}
            className="px-3.5 py-2 bg-[#12110c] hover:bg-[#201b13] text-stone-200 text-xs font-semibold rounded-xl border border-[#2E2910] transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* THEME CHANGER SECTION */}
        <div className="bg-[#1a1710] p-6 rounded-2xl border border-[#2E2910] shadow-md space-y-4">
          <div className="flex items-center justify-between border-b border-[#2E2910] pb-3">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#FF9100]" />
              <div>
                <h3 className="font-bold text-sm text-white">Application Theme & Visual Styling</h3>
                <p className="text-[11px] text-stone-400">Choose your preferred visual palette. Updates and persists across browser refreshes.</p>
              </div>
            </div>
            <span className="text-xs font-mono text-[#FF9100] uppercase font-semibold">
              Active: {APP_THEMES.find(t => t.id === theme)?.name || theme}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {APP_THEMES.map((themeOption) => {
              const isSelected = theme === themeOption.id;
              return (
                <button
                  key={themeOption.id}
                  type="button"
                  onClick={() => handleThemeChange(themeOption.id)}
                  className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-[#FF9100] bg-[#221e14] ring-2 ring-[#FF9100]/40 shadow-lg'
                      : 'border-[#2E2910] bg-[#12110c] hover:border-stone-500'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <span 
                          className="w-3.5 h-3.5 rounded-full border border-black/50 shadow-sm"
                          style={{ backgroundColor: themeOption.primaryColor }}
                        />
                        <span 
                          className="w-3 h-3 rounded-full border border-black/50 shadow-sm"
                          style={{ backgroundColor: themeOption.accentColor }}
                        />
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="w-4 h-4 text-[#FF9100]" />
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-white">{themeOption.name}</h4>
                    <p className="text-[10px] text-stone-400 mt-1 line-clamp-2">{themeOption.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-[#2E2910]/70 flex items-center justify-between text-[9px] font-mono text-stone-400">
                    <span>{themeOption.mode.toUpperCase()}</span>
                    <span style={{ color: themeOption.primaryColor }}>{themeOption.primaryColor}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Model Hardware & Generation Defaults */}
        <div className="bg-[#1a1710] p-6 rounded-2xl border border-[#2E2910] shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[#2E2910] pb-3">
            <Cpu className="w-4 h-4 text-[#FF9100]" />
            <h3 className="font-bold text-sm text-white">Default Model & Execution Runtime</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-stone-300 font-semibold mb-1.5">DEFAULT FREE UNLIMITED MODEL</label>
              <select
                value={settings.default_model}
                onChange={(e) => updateSettings({ default_model: e.target.value })}
                className="w-full p-2.5 bg-[#12110c] border border-[#2E2910] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF9100]"
              >
                {models.map(m => (
                  <option key={m.id} value={m.id}>{m.name} ({m.provider}) - Free Unlimited</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-stone-300 font-semibold mb-1.5">EXECUTION DEVICE</label>
              <select
                value={settings.model_device}
                onChange={(e) => updateSettings({ model_device: e.target.value as any })}
                className="w-full p-2.5 bg-[#12110c] border border-[#2E2910] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF9100]"
              >
                <option value="auto">auto (CUDA &gt; MPS &gt; CPU)</option>
                <option value="cuda:0">cuda:0 (NVIDIA Tensor Cores)</option>
                <option value="mps">mps (Apple Silicon Metal)</option>
                <option value="cpu">cpu (Standard x86_64)</option>
              </select>
            </div>

            <div>
              <label className="block text-stone-300 font-semibold mb-1.5">DEFAULT TEMPERATURE</label>
              <input
                type="number"
                step="0.05"
                min="0.0"
                max="1.5"
                value={settings.generation_defaults.temperature}
                onChange={(e) => updateSettings({
                  generation_defaults: { ...settings.generation_defaults, temperature: Number(e.target.value) }
                })}
                className="w-full p-2.5 bg-[#12110c] border border-[#2E2910] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF9100]"
              />
            </div>

            <div>
              <label className="block text-stone-300 font-semibold mb-1.5">STREAMING SPEED</label>
              <select
                value={settings.simulation_speed}
                onChange={(e) => updateSettings({ simulation_speed: e.target.value as any })}
                className="w-full p-2.5 bg-[#12110c] border border-[#2E2910] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF9100]"
              >
                <option value="realistic">Realistic (Token streaming 45 tok/s)</option>
                <option value="fast">Fast (High-speed 90 tok/s)</option>
                <option value="instant">Instant Execution</option>
              </select>
            </div>
          </div>
        </div>

        {/* Refinement Strategy */}
        <div className="bg-[#1a1710] p-6 rounded-2xl border border-[#2E2910] shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[#2E2910] pb-3">
            <Sparkles className="w-4 h-4 text-[#FF9100]" />
            <h3 className="font-bold text-sm text-white">Prompt Refinement & Safety Thresholds</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-stone-300 font-semibold mb-1.5">DEFAULT COMPRESSION STRATEGY</label>
              <select
                value={settings.default_refiner}
                onChange={(e) => updateSettings({ default_refiner: e.target.value as any })}
                className="w-full p-2.5 bg-[#12110c] border border-[#2E2910] rounded-xl text-xs text-white focus:outline-none focus:border-[#FF9100]"
              >
                {refinerVersions.map(v => (
                  <option key={v.id} value={v.id}>{v.name} (~{v.avgReduction}% reduction)</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-stone-300 font-semibold">MINIMUM SEMANTIC SIMILARITY</label>
                <strong className="text-[#FF9100] font-mono">{settings.min_similarity_threshold}</strong>
              </div>
              <input
                type="range"
                min="0.70"
                max="0.98"
                step="0.01"
                value={settings.min_similarity_threshold}
                onChange={(e) => updateSettings({ min_similarity_threshold: Number(e.target.value) })}
                className="w-full accent-[#FF9100]"
              />
            </div>
          </div>
        </div>

        {/* Telemetry Data & Backup */}
        <div className="bg-[#1a1710] p-6 rounded-2xl border border-[#2E2910] shadow-md space-y-4">
          <div className="flex items-center gap-2 border-b border-[#2E2910] pb-3">
            <Server className="w-4 h-4 text-[#FF9100]" />
            <h3 className="font-bold text-sm text-white">Telemetry & Data Management</h3>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div>
              <h4 className="font-semibold text-white">Export Telemetry Request History</h4>
              <p className="text-stone-400 text-[11px] mt-0.5">
                Download complete JSON logs of all evaluated prompt tokens, model latency metrics, and savings.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportJson}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#12110c] hover:bg-[#201b13] border border-[#2E2910] text-stone-200 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#FF9100]" />
                <span>Export JSON Backup</span>
              </button>
              <button
                type="button"
                onClick={clearHistory}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#12110c] hover:bg-red-500/20 border border-[#2E2910] hover:border-red-500/40 text-stone-400 hover:text-red-400 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear History Logs</span>
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-[#FF9100] hover:bg-[#e08000] text-black text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save All Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { checkAIHealth } from '../../services/ai';
import {
  Settings,
  Sparkles,
  Key,
  Sliders,
  Shield,
  Sun,
  Moon,
  Laptop,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Database,
  ExternalLink,
} from 'lucide-react';

export const SettingsModal: React.FC = () => {
  const {
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    settings,
    updateSettings,
    theme,
    setTheme,
    addToast,
    refreshAllData,
  } = useWorkspace();

  const [provider, setProvider] = useState<'openai' | 'gemini' | 'auto'>(settings.provider);
  const [openAIApiKey, setOpenAIApiKey] = useState(settings.openAIApiKey || '');
  const [model, setModel] = useState(settings.model || 'gpt-4o');
  const [temperature, setTemperature] = useState(settings.temperature || 0.7);
  const [streamResponse, setStreamResponse] = useState(settings.streamResponse ?? true);
  const [aiEnabled, setAiEnabled] = useState(settings.enabled ?? true);

  // Health status check
  const [healthStatus, setHealthStatus] = useState<{
    hasOpenAI: boolean;
    hasGemini: boolean;
    checking: boolean;
  }>({
    hasOpenAI: false,
    hasGemini: false,
    checking: false,
  });

  useEffect(() => {
    if (isSettingsModalOpen) {
      setProvider(settings.provider);
      setOpenAIApiKey(settings.openAIApiKey || '');
      setModel(settings.model || 'gpt-4o');
      setTemperature(settings.temperature || 0.7);
      setStreamResponse(settings.streamResponse ?? true);
      setAiEnabled(settings.enabled ?? true);

      // Perform health check
      setHealthStatus((prev) => ({ ...prev, checking: true }));
      checkAIHealth().then((res) => {
        setHealthStatus({
          hasOpenAI: res.hasOpenAI,
          hasGemini: res.hasGemini,
          checking: false,
        });
      });
    }
  }, [isSettingsModalOpen, settings]);

  if (!isSettingsModalOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateSettings({
      provider,
      openAIApiKey: openAIApiKey.trim(),
      model,
      temperature: Number(temperature),
      streamResponse,
      enabled: aiEnabled,
    });
    setIsSettingsModalOpen(false);
  };

  const handleTestConnection = async () => {
    addToast('Testing connection to backend AI proxy...', 'info');
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.status === 'ok') {
        const hasKey = Boolean(openAIApiKey || data.hasOpenAI || data.hasGemini);
        if (hasKey) {
          addToast('AI Connection operational! Backend proxy ready.', 'success');
        } else {
          addToast('Server connected, but no API key configured. Enter your OpenAI API key below.', 'info');
        }
      }
    } catch {
      addToast('Could not reach AI backend endpoint', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Ivan Workspace Settings & AI Configuration
            </h3>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* AI Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Ivan AI Engine & Provider
                </h4>
              </div>
              <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
                <span>Enable AI</span>
                <input
                  type="checkbox"
                  checked={aiEnabled}
                  onChange={(e) => setAiEnabled(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>

            {/* Provider Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Primary AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="auto">Auto (OpenAI if configured, otherwise Gemini)</option>
                <option value="openai">OpenAI / ChatGPT (Primary)</option>
                <option value="gemini">Google Gemini (Server-side)</option>
              </select>
            </div>

            {/* OpenAI API Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-500" />
                  <span>OpenAI API Key</span>
                </label>
                <span className="text-[10px] text-slate-400">
                  {healthStatus.hasOpenAI ? 'Detected in server environment' : 'Not in server env'}
                </span>
              </div>
              <input
                type="password"
                value={openAIApiKey}
                onChange={(e) => setOpenAIApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Passed to the backend proxy for ChatGPT requests. Never exposed in public client scripts.
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <optgroup label="OpenAI Models (ChatGPT)">
                  <option value="gpt-4o">GPT-4o (Omni Flagship - Recommended)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast & Lightweight)</option>
                  <option value="o3-mini">o3-mini (STEM & Math Reasoning)</option>
                  <option value="gpt-4-turbo">GPT-4 Turbo</option>
                </optgroup>
                <optgroup label="Gemini Models">
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash (High Speed)</option>
                  <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro (Deep STEM Reasoning)</option>
                </optgroup>
              </select>
            </div>

            {/* Temperature & Streaming */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                  <span>Temperature (Creativity)</span>
                  <span className="font-mono">{temperature}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={streamResponse}
                    onChange={(e) => setStreamResponse(e.target.checked)}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>Stream AI text in real-time</span>
                </label>
              </div>
            </div>

            {/* Test Connection Button */}
            <div>
              <button
                type="button"
                onClick={handleTestConnection}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium transition-colors"
              >
                Test AI Connection Status
              </button>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-4">
            {/* Theme Selection */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Visual Theme
              </h4>
              <div className="flex gap-2">
                {[
                  { id: 'light', label: 'Light', icon: Sun },
                  { id: 'dark', label: 'Dark', icon: Moon },
                  { id: 'system', label: 'System', icon: Laptop },
                ].map((t) => {
                  const Icon = t.icon;
                  const isActive = theme === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTheme(t.id as any)}
                      className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                        isActive
                          ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Privacy Statement Required in Brief */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
              <Shield className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white">Workspace Privacy Principle</span>
                <p>
                  "Files are stored locally in IndexedDB. When you ask AI to analyze a document, relevant content may be sent to the configured AI provider for processing."
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsSettingsModalOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

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
  Trash2,
  Download,
  Info,
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
    clearAllWorkspaceData,
    isInstallable,
    promptInstallPWA,
  } = useWorkspace();

  const [provider, setProvider] = useState<'openai' | 'gemini' | 'auto'>(settings.provider);
  const [openAIApiKey, setOpenAIApiKey] = useState(settings.openAIApiKey || '');
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
  const [model, setModel] = useState(settings.model || 'gemini-flash-latest');
  const [temperature, setTemperature] = useState(settings.temperature || 0.7);
  const [streamResponse, setStreamResponse] = useState(settings.streamResponse ?? true);
  const [aiEnabled, setAiEnabled] = useState(settings.enabled ?? true);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);

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

  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (isSettingsModalOpen) {
      setProvider(settings.provider);
      setOpenAIApiKey(settings.openAIApiKey || '');
      setGeminiApiKey(settings.geminiApiKey || '');
      const initialModel =
        !settings.model || settings.model === 'gemini-flash-latest' || settings.model === 'gemini-3.8-flash' || settings.model === 'gemini-3.1-pro-preview'
          ? 'gemini-2.5-flash'
          : settings.model;
      setModel(initialModel);
      setTemperature(settings.temperature || 0.7);
      setStreamResponse(settings.streamResponse ?? true);
      setAiEnabled(settings.enabled ?? true);
      setShowPurgeConfirm(false);
      setTestResult(null);

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
      geminiApiKey: geminiApiKey.trim(),
      model,
      temperature: Number(temperature),
      streamResponse,
      enabled: aiEnabled,
    });
    setIsSettingsModalOpen(false);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const startTime = Date.now();
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Say OK' }],
          provider,
          model,
          stream: false,
          userApiKey: openAIApiKey.trim(),
          userGeminiApiKey: geminiApiKey.trim(),
        }),
      });
      const data = await res.json();
      const duration = Date.now() - startTime;
      if (res.ok && data.text) {
        setTestResult({
          ok: true,
          message: `Connected successfully! ${data.provider?.toUpperCase()} (${data.model}) responded in ${duration}ms.`,
        });
        addToast(`AI is working! (${data.provider?.toUpperCase()} responded in ${duration}ms)`, 'success');
      } else {
        setTestResult({
          ok: false,
          message: data.error || 'Failed to receive a valid response from the AI provider.',
        });
        addToast(data.error || 'Connection failed', 'error');
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        message: err.message || 'Network error reaching backend AI service.',
      });
      addToast('Could not reach backend AI endpoint', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handlePurgeAll = async () => {
    await clearAllWorkspaceData();
    setShowPurgeConfirm(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between shrink-0 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Ivan Workspace Settings & AI Configuration
            </h3>
          </div>
          <button
            onClick={() => setIsSettingsModalOpen(false)}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {/* AI Settings Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
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

            {/* How AI Works banner */}
            <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/50 flex items-start gap-3">
              <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                <p className="font-semibold text-emerald-900 dark:text-emerald-200">
                  How Ivan AI Works:
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  <strong>Built-in & Ready:</strong> Google Gemini 2.5 Flash is already integrated through the server. You can chat, query documents, and generate study or work tasks immediately.
                </p>
                <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                  <strong>Custom API Keys (Optional):</strong> If you prefer to use your own personal quota or custom billing, enter your Google Gemini API key or OpenAI API key below.
                </p>
              </div>
            </div>

            {/* Provider Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Primary AI Provider
              </label>
              <select
                value={provider}
                onChange={(e) => {
                  const newProvider = e.target.value as any;
                  setProvider(newProvider);
                  if (newProvider === 'gemini' && !model.startsWith('gemini')) {
                    setModel('gemini-2.5-flash');
                  } else if (newProvider === 'openai' && model.startsWith('gemini')) {
                    setModel('gpt-4o');
                  }
                }}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="auto">Auto (Google Gemini default, or OpenAI if configured)</option>
                <option value="gemini">Google Gemini (Recommended & Fast)</option>
                <option value="openai">OpenAI (ChatGPT)</option>
              </select>
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">AI Model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <optgroup label="Google Gemini Models">
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast, Built-in - Recommended)</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Deep STEM Reasoning & Analysis)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & Agile)</option>
                </optgroup>
                <optgroup label="OpenAI Models (ChatGPT)">
                  <option value="gpt-4o">GPT-4o (Omni Flagship)</option>
                  <option value="gpt-4o-mini">GPT-4o Mini (Fast)</option>
                  <option value="o3-mini">o3-mini (Reasoning)</option>
                </optgroup>
              </select>
            </div>

            {/* Optional Custom API Keys */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Custom Gemini API Key (Optional)</span>
                </label>
                <input
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-600" />
                  <span>OpenAI API Key (Optional)</span>
                </label>
                <input
                  type="password"
                  value={openAIApiKey}
                  onChange={(e) => setOpenAIApiKey(e.target.value)}
                  placeholder="sk-proj-..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>
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
                  className="w-full accent-emerald-600"
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
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={isTesting}
                  onClick={handleTestConnection}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isTesting ? 'Pinging AI Service...' : 'Test AI Connection Status'}</span>
                </button>
                {healthStatus.hasGemini && (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    ● Server Gemini Ready
                  </span>
                )}
              </div>

              {testResult && (
                <div
                  className={`p-2.5 rounded-lg text-xs flex items-start gap-2 ${
                    testResult.ok
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                  }`}
                >
                  <span className="font-bold shrink-0">{testResult.ok ? '✓ Active:' : '✕ Error:'}</span>
                  <span className="leading-relaxed">{testResult.message}</span>
                </div>
              )}
            </div>
          </div>

          {/* Theme Selection */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
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
                    onClick={() => {
                      setTheme(t.id as any);
                      addToast(`Visual theme set to ${t.label}`, 'info');
                    }}
                    className={`flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      isActive
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PWA & Installation Section */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Progressive Web App (PWA)
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-900 dark:text-white">
                  Offline Ready & Installable
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ivan Workspace functions offline with Service Worker caching and IndexedDB storage.
                </p>
              </div>
              {isInstallable ? (
                <button
                  type="button"
                  onClick={promptInstallPWA}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install App</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 italic shrink-0">
                  PWA Active
                </span>
              )}
            </div>
          </div>

          {/* Workspace Data Management & Purge */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Workspace Data & Clean Slate
            </h4>
            <div className="p-3.5 rounded-xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 space-y-3">
              <div className="flex items-start gap-2.5">
                <Database className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs space-y-0.5">
                  <span className="font-semibold text-rose-900 dark:text-rose-200">
                    Purge All Data & Remove Mock Seeds
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    Clear all stored documents, tasks, notes, projects, and calendar entries to start with an entirely fresh, empty personal workspace.
                  </p>
                </div>
              </div>

              {showPurgeConfirm ? (
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handlePurgeAll}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs"
                  >
                    Confirm: Wipe All Workspace Data
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPurgeConfirm(false)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPurgeConfirm(true)}
                  className="px-3 py-1.5 bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Purge All Workspace Data</span>
                </button>
              )}
            </div>
          </div>

          {/* Privacy Statement Required in Brief */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 flex items-start gap-3">
            <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
              <span className="font-bold text-slate-900 dark:text-white">Workspace Privacy Principle</span>
              <p className="text-[11px] leading-relaxed">
                "Files are stored locally in IndexedDB. When you ask AI to analyze a document, relevant content may be sent to the configured AI provider for processing."
              </p>
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


import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { Sparkles, X, Send, Maximize2, FileText, Check } from 'lucide-react';
import { sendStreamingChat } from '../../services/ai';

export const AIFloatingWidget: React.FC = () => {
  const { isFloatingAIOpen, setIsFloatingAIOpen, setCurrentView, createChat, files, settings } = useWorkspace();
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isFloatingAIOpen) {
    return (
      <button
        onClick={() => setIsFloatingAIOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl shadow-lg shadow-emerald-950/20 flex items-center gap-2 group transition-colors"
        title="Open Ivan AI Quick Assistant"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-xs font-semibold hidden sm:inline">Ivan AI</span>
      </button>
    );
  }

  const handleQuickAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setResponse('');

    let accumulated = '';
    try {
      await sendStreamingChat({
        messages: [{ role: 'user', content: prompt.trim() }],
        mode: 'general',
        contextFiles: files.filter((f) => !f.isTrash).slice(0, 3),
        settings,
        onChunk: (chunk) => {
          accumulated += chunk;
          setResponse(accumulated);
        },
      });
    } catch (err: any) {
      setResponse(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleExpandToFullChat = () => {
    createChat('general', prompt || 'Quick inquiry');
    setIsFloatingAIOpen(false);
    setCurrentView('ai');
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[500px] overflow-hidden animate-in slide-in-from-bottom-4">
      {/* Header */}
      <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span className="text-xs font-bold text-slate-900 dark:text-white">Ivan AI Quick Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleExpandToFullChat}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
            title="Expand to Full AI Workspace"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsFloatingAIOpen(false)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Response Box */}
      <div className="flex-1 p-3 overflow-y-auto text-xs leading-relaxed text-slate-800 dark:text-slate-200 min-h-[140px] max-h-[300px]">
        {loading && !response ? (
          <div className="py-8 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <Sparkles className="w-5 h-5 text-emerald-500 animate-spin" />
            <span className="text-[11px]">Thinking...</span>
          </div>
        ) : response ? (
          <div className="whitespace-pre-wrap">{response}</div>
        ) : (
          <div className="py-8 text-center text-[11px] text-slate-400">
            Ask any question about your notes, files, or university assignments.
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleQuickAsk} className="p-2 border-t border-slate-200 dark:border-slate-800 flex gap-1.5 bg-slate-50/50 dark:bg-slate-950/50">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask something..."
          className="flex-1 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition-all"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};

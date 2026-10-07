import React, { useState, useEffect, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkspaceFile } from '../../types';
import { db } from '../../services/db';
import { analyzeDocumentAction } from '../../services/ai';
import {
  X,
  Download,
  Sparkles,
  Maximize2,
  Minimize2,
  FileText,
  Copy,
  Check,
  RotateCw,
  ZoomIn,
  ZoomOut,
  HelpCircle,
  FileQuestion,
  ListOrdered,
  BookOpen,
  ArrowRight,
  Save,
} from 'lucide-react';

interface DocumentViewerModalProps {
  file: WorkspaceFile | null;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({ file, onClose }) => {
  const { downloadFile, createChat, setCurrentView, createNote, addToast, settings } = useWorkspace();

  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [copied, setCopied] = useState(false);

  // AI Drawer state
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [lastAction, setLastAction] = useState<string>('');

  useEffect(() => {
    let currentUrl: string | null = null;
    async function loadBlob() {
      if (!file) return;
      const blob = await db.getFileBlob(file.id);
      if (blob) {
        currentUrl = URL.createObjectURL(blob);
        setBlobUrl(currentUrl);
      } else if (file.extractedText) {
        const textBlob = new Blob([file.extractedText], { type: file.mimeType || 'text/plain' });
        currentUrl = URL.createObjectURL(textBlob);
        setBlobUrl(currentUrl);
      }
    }
    loadBlob();

    return () => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, [file]);

  // CSV parsing if applicable
  const csvData = useMemo(() => {
    if (!file || !file.extractedText || !['csv', 'tsv'].includes(file.extension.toLowerCase())) return null;
    const lines = file.extractedText.trim().split('\n');
    const separator = file.extension.toLowerCase() === 'tsv' ? '\t' : ',';
    const rows = lines.map((l) => l.split(separator).map((c) => c.replace(/^["']|["']$/g, '').trim()));
    return rows;
  }, [file]);

  if (!file) return null;

  const ext = file.extension.toLowerCase();
  const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) || file.mimeType.startsWith('image/');
  const isPdf = ext === 'pdf';
  const isCode = ['js', 'ts', 'tsx', 'jsx', 'py', 'java', 'c', 'cpp', 'sql', 'html', 'css', 'json', 'xml'].includes(ext);

  const handleCopyText = () => {
    if (file.extractedText) {
      navigator.clipboard.writeText(file.extractedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAiAction = async (action: 'summarize' | 'explain' | 'quiz' | 'extract_points' | 'improve' | 'study_guide' | 'custom') => {
    if (!file.extractedText) {
      addToast('No extracted text available for this file to analyze', 'error');
      return;
    }
    setIsAiOpen(true);
    setAiLoading(true);
    setLastAction(action);
    setAiResult('');

    try {
      const result = await analyzeDocumentAction({
        action,
        documentTitle: file.name,
        documentContent: file.extractedText,
        category: file.category,
        customPrompt: action === 'custom' ? customPrompt : undefined,
        apiKey: settings.openAIApiKey,
      });
      setAiResult(result);
    } catch (err: any) {
      setAiResult(`AI Analysis encountered an error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveAiAsNote = async () => {
    if (!aiResult) return;
    await createNote({
      title: `AI Analysis: ${file.name}`,
      content: `### Document Reference: ${file.name} (Action: ${lastAction})\n\n${aiResult}`,
      category: file.category,
      tags: ['AI Analysis', file.extension.toUpperCase()],
      isPinned: false,
      linkedFileIds: [file.id],
    });
    addToast('Saved AI analysis directly as a new Knowledge Note!', 'success');
  };

  const handleOpenFullChat = () => {
    createChat('general', `I would like to explore this document in depth: "${file.name}".`, [file.id]);
    onClose();
    setCurrentView('ai');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col shadow-2xl transition-all overflow-hidden ${
          isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-6xl max-h-[92vh] h-[85vh]'
        }`}
      >
        {/* Top Header */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              {file.extension || 'FILE'}
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
              {file.name}
            </h3>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              ({(file.size / 1024).toFixed(1)} KB)
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsAiOpen(!isAiOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm ${
                isAiOpen
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI</span>
            </button>

            {file.extractedText && (
              <button
                onClick={handleCopyText}
                className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                title="Copy text"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            )}

            <button
              onClick={() => downloadFile(file)}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
              title="Download file"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg hidden sm:block"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content View & AI Drawer */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* Main Viewer Area */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-100 dark:bg-slate-950/80 flex items-center justify-center">
            {isImage && blobUrl ? (
              <div className="flex flex-col items-center gap-3">
                <div className="flex items-center gap-2 p-1 bg-white dark:bg-slate-800 rounded-xl shadow border border-slate-200 dark:border-slate-700">
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.2))}
                    className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                    title="Zoom out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-mono px-1">{Math.round(zoomLevel * 100)}%</span>
                  <button
                    onClick={() => setZoomLevel((z) => Math.min(3, z + 0.2))}
                    className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setRotation((r) => (r + 90) % 360)}
                    className="p-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                    title="Rotate"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-w-full max-h-[70vh] overflow-auto flex items-center justify-center">
                  <img
                    src={blobUrl}
                    alt={file.name}
                    style={{
                      transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                      transition: 'transform 0.15s ease-out',
                    }}
                    className="max-h-[65vh] object-contain rounded-lg shadow-md"
                  />
                </div>
              </div>
            ) : isPdf && blobUrl ? (
              <div className="w-full h-full flex flex-col">
                <iframe
                  src={blobUrl}
                  title={file.name}
                  className="w-full h-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white"
                />
              </div>
            ) : csvData ? (
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-auto p-4">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800">
                      {csvData[0]?.map((col, i) => (
                        <th key={i} className="p-2 border border-slate-200 dark:border-slate-700 font-bold">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(1).map((row, r) => (
                      <tr key={r} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        {row.map((cell, c) => (
                          <td key={c} className="p-2 border border-slate-200 dark:border-slate-800 font-mono">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : file.extractedText ? (
              <div className="w-full h-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 overflow-auto">
                <pre
                  className={`text-xs font-mono leading-relaxed whitespace-pre-wrap break-words ${
                    isCode ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'
                  }`}
                >
                  {file.extractedText}
                </pre>
              </div>
            ) : (
              <div className="text-center p-8 space-y-3">
                <FileText className="w-16 h-16 text-slate-400 mx-auto" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Preview not directly rendered for this format
                </h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Binary or proprietary format (.${ext.toUpperCase()}). You can download it directly or ask Ivan AI to review its metadata.
                </p>
                <button
                  onClick={() => downloadFile(file)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download File</span>
                </button>
              </div>
            )}
          </div>

          {/* Embedded AI Document Analysis Drawer */}
          {isAiOpen && (
            <div className="w-full sm:w-96 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col h-full animate-in slide-in-from-right-4 z-20">
              <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-slate-900 dark:text-white">Ivan AI Document Analysis</span>
                </div>
                <button
                  onClick={() => setIsAiOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Quick Actions Buttons */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-1.5 bg-slate-50/50 dark:bg-slate-950/30">
                <button
                  onClick={() => handleAiAction('summarize')}
                  disabled={aiLoading}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <BookOpen className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Summarize</span>
                </button>
                <button
                  onClick={() => handleAiAction('explain')}
                  disabled={aiLoading}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Explain</span>
                </button>
                <button
                  onClick={() => handleAiAction('quiz')}
                  disabled={aiLoading}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <FileQuestion className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Quiz Me</span>
                </button>
                <button
                  onClick={() => handleAiAction('extract_points')}
                  disabled={aiLoading}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <ListOrdered className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Extract Points</span>
                </button>
                <button
                  onClick={() => handleAiAction('improve')}
                  disabled={aiLoading}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Improve Writing</span>
                </button>
                <button
                  onClick={() => handleAiAction('study_guide')}
                  disabled={aiLoading}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-800 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>Study Guide</span>
                </button>
              </div>

              {/* Custom Prompt Input */}
              <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex gap-1.5">
                <input
                  type="text"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Custom question about this document..."
                  className="flex-1 px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && customPrompt.trim()) {
                      handleAiAction('custom');
                    }
                  }}
                />
                <button
                  onClick={() => handleAiAction('custom')}
                  disabled={aiLoading || !customPrompt.trim()}
                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Ask
                </button>
              </div>

              {/* AI Output Stream Area */}
              <div className="flex-1 p-3.5 overflow-y-auto space-y-3">
                {aiLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
                    <Sparkles className="w-6 h-6 text-emerald-500 animate-spin" />
                    <p className="text-xs">Ivan AI is evaluating document contents...</p>
                  </div>
                ) : aiResult ? (
                  <div className="space-y-3">
                    <div className="text-xs leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans">
                      {aiResult}
                    </div>

                    <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap gap-2">
                      <button
                        onClick={handleSaveAiAsNote}
                        className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save as Note</span>
                      </button>
                      <button
                        onClick={handleOpenFullChat}
                        className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1.5"
                      >
                        <span>Full Chat</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-1">
                    <p>Select a quick action above to summarize, create a quiz, or analyze this document.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

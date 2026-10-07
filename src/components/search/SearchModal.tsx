import React, { useState, useEffect, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkspaceFile } from '../../types';
import { naturalLanguageSearch } from '../../services/ai';
import {
  Search,
  Sparkles,
  FileText,
  X,
  ArrowRight,
  Clock,
  Filter,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const SearchModal: React.FC = () => {
  const {
    isSearchModalOpen,
    setIsSearchModalOpen,
    files,
    setActivePreviewFile,
    createChat,
    setCurrentView,
    settings,
  } = useWorkspace();

  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'normal' | 'ai'>('normal');
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiMatches, setAiMatches] = useState<Array<{ id: string; relevanceScore: number; reason: string }>>([]);
  const [aiSummary, setAiSummary] = useState('');

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
      if (e.key === 'Escape' && isSearchModalOpen) {
        setIsSearchModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchModalOpen, setIsSearchModalOpen]);

  const activeFiles = useMemo(() => files.filter((f) => !f.isTrash), [files]);

  // Standard keyword matching
  const normalResults = useMemo(() => {
    if (!query.trim() || searchMode === 'ai') return [];
    const q = query.toLowerCase();
    return activeFiles.filter((f) => {
      const matchName = f.name.toLowerCase().includes(q);
      const matchCategory = f.category.toLowerCase().includes(q);
      const matchTag = f.tags.some((t) => t.toLowerCase().includes(q));
      const matchText = f.extractedText ? f.extractedText.toLowerCase().includes(q) : false;
      return matchName || matchCategory || matchTag || matchText;
    });
  }, [activeFiles, query, searchMode]);

  // Handle Natural Language Search via AI
  const handleRunAiSearch = async () => {
    if (!query.trim()) return;
    setIsAiSearching(true);
    setSearchMode('ai');
    setAiMatches([]);
    setAiSummary('');

    try {
      const res = await naturalLanguageSearch(query.trim(), activeFiles, settings.openAIApiKey);
      setAiMatches(res.matches || []);
      setAiSummary(res.summary || '');
    } catch (err: any) {
      setAiSummary(`AI search failed: ${err.message}`);
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleSelectFile = (file: WorkspaceFile) => {
    setActivePreviewFile(file);
    setIsSearchModalOpen(false);
  };

  const handleAskIvanChat = () => {
    createChat('general', query);
    setIsSearchModalOpen(false);
    setCurrentView('ai');
  };

  if (!isSearchModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 bg-slate-50 dark:bg-slate-950/60">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (searchMode === 'ai') setSearchMode('normal');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (searchMode === 'ai' || query.split(' ').length > 2) {
                  handleRunAiSearch();
                }
              }
            }}
            placeholder="Search keywords or ask Ivan AI naturally (e.g. 'Find my documents about Mathematics Education')..."
            autoFocus
            className="flex-1 bg-transparent border-0 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
          />

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleRunAiSearch}
              disabled={!query.trim() || isAiSearching}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-40 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Search</span>
            </button>
            <button
              onClick={() => setIsSearchModalOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isAiSearching ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 text-slate-400">
              <Sparkles className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-xs font-medium">Ivan AI is evaluating workspace contents and catalog...</p>
            </div>
          ) : searchMode === 'ai' && aiMatches.length > 0 ? (
            /* AI Semantic Search Matches */
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-200 flex items-center justify-between">
                <span>{aiSummary || `Found ${aiMatches.length} AI matches.`}</span>
                <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  AI Evaluated
                </span>
              </div>

              <div className="space-y-2">
                {aiMatches.map((match) => {
                  const doc = activeFiles.find((f) => f.id === match.id);
                  if (!doc) return null;
                  return (
                    <div
                      key={match.id}
                      onClick={() => handleSelectFile(doc)}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500 bg-white dark:bg-slate-900 cursor-pointer transition-all space-y-1 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-emerald-500" />
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-500">
                            {doc.name}
                          </h4>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                          {Math.round(match.relevanceScore * 100)}% match
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-6">
                        {match.reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : query.trim() ? (
            /* Standard Keyword Search Results */
            normalResults.length > 0 ? (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Matching Documents ({normalResults.length})
                </div>
                {normalResults.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectFile(doc)}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer flex items-center justify-between gap-3 group transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] uppercase">
                        {doc.extension || 'FILE'}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-emerald-500 truncate">
                          {doc.name}
                        </div>
                        <div className="text-[10px] text-slate-400 capitalize">
                          {doc.category} • {(doc.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-400 space-y-3">
                <p className="text-xs">No exact file name matches for "{query}".</p>
                <button
                  onClick={handleRunAiSearch}
                  className="px-3.5 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-semibold"
                >
                  Try AI Natural Language Search
                </button>
              </div>
            )
          ) : (
            /* Empty state hints */
            <div className="py-8 space-y-4 text-center">
              <div className="text-xs text-slate-400">
                Type any filename, domain keyword, or ask a natural language query.
              </div>
              <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
                {[
                  'Find my documents about Mathematics Education',
                  'What did I save about ICT strategy?',
                  'Real Analysis notes',
                  'Research Proposal',
                ].map((hint, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setQuery(hint);
                      handleRunAiSearch();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 hover:text-emerald-600 dark:hover:text-emerald-400 text-[11px] text-slate-600 dark:text-slate-300 transition-colors"
                  >
                    "{hint}"
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {query.trim() && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs">
            <span className="text-slate-400 text-[11px]">Ask Ivan AI directly with this prompt:</span>
            <button
              onClick={handleAskIvanChat}
              className="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1"
            >
              <span>Open in Ivan AI</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

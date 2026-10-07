import React, { useState, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkspaceNote, WorkspaceCategory } from '../../types';
import { analyzeDocumentAction } from '../../services/ai';
import {
  FileText,
  Plus,
  Pin,
  Trash2,
  Edit3,
  Search,
  Sparkles,
  Eye,
  Save,
  Tag,
  Check,
  Copy,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export const NotesView: React.FC<{ forcedCategory?: WorkspaceCategory }> = ({ forcedCategory }) => {
  const {
    notes,
    createNote,
    updateNote,
    deleteNote,
    togglePinNote,
    createChat,
    setCurrentView,
    addToast,
    settings,
  } = useWorkspace();

  const [activeNoteId, setActiveNoteId] = useState<string | null>(notes[0]?.id || null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(forcedCategory || 'all');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState<WorkspaceCategory>(forcedCategory || 'general');
  const [editTags, setEditTags] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      if (forcedCategory && n.category !== forcedCategory) return false;
      if (categoryFilter !== 'all' && n.category !== categoryFilter) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
      }
      return true;
    });
  }, [notes, forcedCategory, categoryFilter, searchQuery]);

  const activeNote = useMemo(() => {
    return notes.find((n) => n.id === activeNoteId) || filteredNotes[0] || null;
  }, [notes, activeNoteId, filteredNotes]);

  const handleStartEdit = (note: WorkspaceNote) => {
    setActiveNoteId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditCategory(note.category);
    setEditTags(note.tags.join(', '));
    setIsEditing(true);
  };

  const handleCreateNew = async () => {
    const newNote = await createNote({
      title: 'Untitled Note',
      content: '# New Note\n\nWrite your thoughts, lecture takeaways, or research ideas here...',
      category: forcedCategory || 'general',
      tags: ['Notes'],
      isPinned: false,
    });
    handleStartEdit(newNote);
  };

  const handleSaveEdit = async () => {
    if (!activeNote) return;
    const tagsArr = editTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    await updateNote({
      ...activeNote,
      title: editTitle.trim() || 'Untitled Note',
      content: editContent,
      category: editCategory,
      tags: tagsArr,
    });
    setIsEditing(false);
  };

  const handleAIImprove = async (action: 'improve' | 'summarize' | 'study_guide') => {
    if (!activeNote) return;
    setAiLoading(true);
    try {
      const res = await analyzeDocumentAction({
        action,
        documentTitle: activeNote.title,
        documentContent: isEditing ? editContent : activeNote.content,
        category: activeNote.category,
        apiKey: settings.openAIApiKey,
      });

      if (isEditing) {
        setEditContent((prev) => `${prev}\n\n---\n### AI ${action.toUpperCase()} SUGGESTIONS\n\n${res}`);
      } else {
        await updateNote({
          ...activeNote,
          content: `${activeNote.content}\n\n---\n### AI ${action.toUpperCase()} SUGGESTIONS\n\n${res}`,
        });
      }
      addToast(`AI ${action} suggestions added to note`, 'success');
    } catch (err: any) {
      addToast(`AI failed: ${err.message}`, 'error');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Left List of Notes */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col shrink-0">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-500" />
              <span>Knowledge Notes</span>
            </h3>
            <button
              onClick={handleCreateNew}
              className="p-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Notes Items List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
          {filteredNotes.map((note) => {
            const isActive = activeNote?.id === note.id;
            return (
              <div
                key={note.id}
                onClick={() => {
                  setActiveNoteId(note.id);
                  if (isEditing) handleStartEdit(note);
                }}
                className={`p-3 rounded-xl cursor-pointer transition-all border ${
                  isActive
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500/40 text-emerald-900 dark:text-emerald-100'
                    : 'bg-white dark:bg-slate-900/60 border-slate-100 dark:border-slate-800/80 hover:border-slate-200 text-slate-700 dark:text-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5 mb-1">
                  <h4 className="text-xs font-bold truncate flex-1">{note.title}</h4>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinNote(note.id);
                    }}
                    className={`p-0.5 ${note.isPinned ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`}
                  >
                    <Pin className="w-3 h-3 fill-current" />
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-mono">
                  {note.content.replace(/^#+\s+/gm, '')}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="capitalize">{note.category}</span>
                  <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Note Detail / Editor */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-slate-900">
        {activeNote ? (
          <>
            {/* Header / Actions */}
            <div className="h-14 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 bg-slate-50/60 dark:bg-slate-950/40">
              <div className="truncate flex-1">
                <span className="text-[10px] uppercase font-semibold text-emerald-600 dark:text-emerald-400 tracking-wider">
                  {activeNote.category} · Last edited {new Date(activeNote.updatedAt).toLocaleDateString()}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {isEditing ? editTitle || 'Untitled Note' : activeNote.title}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* AI Assist Menu */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAIImprove('improve')}
                    disabled={aiLoading}
                    className="px-2.5 py-1.5 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-500/20 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Improve Note with AI"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>AI Polish</span>
                  </button>
                  <button
                    onClick={() => handleAIImprove('study_guide')}
                    disabled={aiLoading}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                    title="Make Study Guide"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-slate-500" />
                    <span>Study Guide</span>
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

                {isEditing ? (
                  <button
                    onClick={handleSaveEdit}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Save</span>
                  </button>
                ) : (
                  <button
                    onClick={() => handleStartEdit(activeNote)}
                    className="px-3.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                )}

                <button
                  onClick={() => deleteNote(activeNote.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                  title="Delete Note"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Note Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {isEditing ? (
                <div className="space-y-4 max-w-3xl mx-auto">
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Note title..."
                    className="w-full text-xl font-bold bg-transparent border-0 border-b border-slate-200 dark:border-slate-700 pb-2 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Tags separated by commas (e.g. Topology, Math, Exam)"
                      className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <textarea
                    rows={18}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder="Markdown note content..."
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none leading-relaxed"
                  />
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-4">
                  <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
                    {activeNote.title}
                  </h1>

                  {activeNote.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {activeNote.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-sans space-y-2 border-t border-slate-100 dark:border-slate-800">
                    {activeNote.content}
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 space-y-2">
            <FileText className="w-12 h-12" />
            <p className="text-xs">No note selected. Choose a note on the left or create a new one.</p>
          </div>
        )}
      </div>
    </div>
  );
};

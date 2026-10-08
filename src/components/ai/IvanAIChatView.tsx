import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { AIChat, AIMessage, AIMode, WorkspaceFile } from '../../types';
import { sendStreamingChat } from '../../services/ai';
import {
  Sparkles,
  Plus,
  Send,
  Square,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  Paperclip,
  Download,
  BookOpen,
  GraduationCap,
  Microscope,
  Kanban,
  Briefcase,
  FileText,
  Search,
  CheckSquare,
  AlertCircle,
  X,
  ExternalLink,
  ChevronDown,
  Edit2,
  CornerDownLeft,
} from 'lucide-react';

export const IvanAIChatView: React.FC = () => {
  const {
    aiChats,
    activeChatId,
    setActiveChatId,
    createChat,
    saveChat,
    deleteChat,
    renameChat,
    files,
    notes,
    projects,
    createNote,
    createTask,
    createProject,
    addToast,
    settings,
  } = useWorkspace();

  const [inputMessage, setInputMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [isAttachingFilesOpen, setIsAttachingFilesOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<WorkspaceFile[]>([]);
  const [editingChatTitleId, setEditingChatTitleId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState('');

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = useMemo(() => {
    return aiChats.find((c) => c.id === activeChatId) || aiChats[0] || null;
  }, [aiChats, activeChatId]);

  // Sync attached files if chat changed
  useEffect(() => {
    if (activeChat && activeChat.attachedFileIds) {
      const chatFiles = files.filter((f) => activeChat.attachedFileIds.includes(f.id));
      setAttachedFiles(chatFiles);
    } else {
      setAttachedFiles([]);
    }
  }, [activeChat, files]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeChat?.messages, isGenerating]);

  // Filtered chats list
  const filteredChats = useMemo(() => {
    if (!chatSearchQuery.trim()) return aiChats;
    const q = chatSearchQuery.toLowerCase();
    return aiChats.filter((c) => c.title.toLowerCase().includes(q));
  }, [aiChats, chatSearchQuery]);

  const handleStartNewChat = async (mode: AIMode = 'general') => {
    const newId = await createChat(mode);
    setActiveChatId(newId);
    setAttachedFiles([]);
    inputRef.current?.focus();
  };

  const handleModeChange = async (newMode: AIMode) => {
    if (!activeChat) return;
    const updated: AIChat = { ...activeChat, mode: newMode };
    await saveChat(updated);
    addToast(`Switched mode to ${newMode.toUpperCase()}`, 'info');
  };

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isGenerating) return;

    let currentChat: AIChat | null = activeChat;
    if (!currentChat) {
      const newId = await createChat('general', text);
      currentChat = aiChats.find((c) => c.id === newId) || null;
    }

    if (!currentChat) return;
    const activeCurrentChat: AIChat = currentChat;

    setInputMessage('');
    setIsGenerating(true);

    const now = Date.now();
    const userMsg: AIMessage = {
      id: `msg_u_${now}`,
      role: 'user',
      content: text.trim(),
      timestamp: now,
    };

    const assistantMsgPlaceholder: AIMessage = {
      id: `msg_a_${now + 1}`,
      role: 'assistant',
      content: '',
      timestamp: now + 1,
      sources: attachedFiles.map((f) => f.name),
    };

    const updatedMessages = [...activeCurrentChat.messages, userMsg, assistantMsgPlaceholder];
    const chatToSave: AIChat = {
      ...activeCurrentChat,
      title: activeCurrentChat.messages.length === 0 ? text.slice(0, 30) + '...' : activeCurrentChat.title,
      messages: updatedMessages,
      attachedFileIds: attachedFiles.map((f) => f.id),
      updatedAt: now,
    };

    await saveChat(chatToSave);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedText = '';

    try {
      await sendStreamingChat({
        messages: updatedMessages.slice(0, -1).map((m) => ({ role: m.role, content: m.content })),
        mode: activeCurrentChat.mode,
        contextFiles: attachedFiles,
        settings,
        signal: controller.signal,
        onChunk: (chunk) => {
          accumulatedText += chunk;
          assistantMsgPlaceholder.content = accumulatedText;
          saveChat({
            ...chatToSave,
            messages: [...activeCurrentChat.messages, userMsg, { ...assistantMsgPlaceholder, content: accumulatedText }],
          });
        },
        onSources: (sources) => {
          assistantMsgPlaceholder.sources = sources;
        },
        onError: (err) => {
          assistantMsgPlaceholder.error = true;
          assistantMsgPlaceholder.content = `⚠️ ${err}`;
          saveChat({
            ...chatToSave,
            messages: [...activeCurrentChat.messages, userMsg, assistantMsgPlaceholder],
          });
        },
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        assistantMsgPlaceholder.content = accumulatedText || `⚠️ Error: ${err.message || 'Failed to complete AI request'}`;
        await saveChat({
          ...chatToSave,
          messages: [...activeCurrentChat.messages, userMsg, assistantMsgPlaceholder],
        });
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
      addToast('AI Generation stopped', 'info');
    }
  };

  const handleCopy = (msg: AIMessage) => {
    navigator.clipboard.writeText(msg.content);
    setCopiedMsgId(msg.id);
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleRegenerate = async (msgIndex: number) => {
    if (!activeChat || isGenerating) return;
    const userMsg = activeChat.messages[msgIndex - 1];
    if (!userMsg || userMsg.role !== 'user') return;

    // Prune up to user message and resend
    const pruned = activeChat.messages.slice(0, msgIndex);
    await saveChat({ ...activeChat, messages: pruned });
    handleSendMessage(userMsg.content);
  };

  const handleSaveAsNote = async (msg: AIMessage) => {
    const titleMatch = msg.content.match(/^#+\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1].slice(0, 40) : `AI Note: ${new Date().toLocaleDateString()}`;
    await createNote({
      title,
      content: msg.content,
      category: 'general',
      tags: ['Ivan AI', activeChat?.mode || 'General'],
      isPinned: false,
      linkedFileIds: attachedFiles.map((f) => f.id),
    });
    addToast('Successfully saved AI response to Notes!', 'success');
  };

  const handleCreateTaskFromAI = async (msg: AIMessage) => {
    // Extract bullet points as tasks or create single task
    const lines = msg.content.split('\n');
    const bulletLines = lines
      .filter((l) => /^\s*[-*•\d+.]\s+/.test(l))
      .map((l) => l.replace(/^\s*[-*•\d+.]\s+/, '').trim())
      .filter((l) => l.length > 5 && l.length < 150);

    if (bulletLines.length > 0) {
      for (const t of bulletLines.slice(0, 4)) {
        await createTask({
          title: t,
          category: 'general',
          status: 'todo',
          priority: 'medium',
          subtasks: [],
          tags: ['AI Generated'],
        });
      }
      addToast(`Created ${Math.min(4, bulletLines.length)} tasks from AI response!`, 'success');
    } else {
      await createTask({
        title: msg.content.slice(0, 60),
        description: msg.content,
        category: 'general',
        status: 'todo',
        priority: 'medium',
        subtasks: [],
        tags: ['AI Generated'],
      });
      addToast('Created new task from AI response!', 'success');
    }
  };

  const handleExportChat = () => {
    if (!activeChat) return;
    const text = `# ${activeChat.title} (Mode: ${activeChat.mode.toUpperCase()})\nDate: ${new Date(activeChat.createdAt).toLocaleString()}\n\n` +
      activeChat.messages
        .map((m) => `### ${m.role.toUpperCase()}:\n${m.content}\n`)
        .join('\n---\n\n');

    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeChat.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const quickPrompts = [
    { title: 'Summarize Recent Work', prompt: 'Summarize my recent work, active files, and ongoing projects across Ivan Workspace.', mode: 'general' as AIMode },
    { title: 'Real Analysis Revision', prompt: 'Create 5 revision questions with detailed proofs and step-by-step solutions based on my Real Analysis II notes.', mode: 'study' as AIMode },
    { title: 'Lesson Plan & Activity', prompt: 'Draft a learner-centered lesson plan and 3 classroom exercises from my Advanced Calculus scheme of work.', mode: 'teaching' as AIMode },
    { title: 'Research Methodology', prompt: 'Review my research proposal on AI in Mathematics Education and suggest quantitative statistical tests for my sample.', mode: 'research' as AIMode },
    { title: 'Extract Deadlines', prompt: 'Extract all important deadlines, examination dates, and milestone deliverables from my workspace files.', mode: 'general' as AIMode },
    { title: 'Client Consulting Proposal', prompt: 'Help me draft an executive pitch and pricing breakdown for our EdTech Digital Transformation consulting service.', mode: 'business' as AIMode },
  ];

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Left Conversation History Sidebar */}
      <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden md:flex flex-col shrink-0">
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <button
            onClick={() => handleStartNewChat('general')}
            className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Conversation</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={chatSearchQuery}
              onChange={(e) => setChatSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Chats List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {filteredChats.length === 0 ? (
            <div className="py-8 px-3 text-center space-y-2">
              <Sparkles className="w-5 h-5 text-slate-300 dark:text-slate-600 mx-auto" />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {chatSearchQuery ? 'No matching chats' : 'No conversations yet'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 leading-relaxed">
                {chatSearchQuery ? 'Try a different search term' : 'Click New Conversation above to start'}
              </p>
            </div>
          ) : (
            filteredChats.map((chat) => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                onClick={() => setActiveChatId(chat.id)}
                className={`group px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer flex items-center justify-between gap-2 transition-all ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <div className="truncate flex-1">
                  {editingChatTitleId === chat.id ? (
                    <input
                      type="text"
                      value={editTitleInput}
                      onChange={(e) => setEditTitleInput(e.target.value)}
                      onBlur={() => {
                        if (editTitleInput.trim()) renameChat(chat.id, editTitleInput.trim());
                        setEditingChatTitleId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          if (editTitleInput.trim()) renameChat(chat.id, editTitleInput.trim());
                          setEditingChatTitleId(null);
                        }
                      }}
                      autoFocus
                      className="w-full bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded border border-emerald-500 text-xs"
                    />
                  ) : (
                    <div className="truncate font-medium">{chat.title}</div>
                  )}
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">
                    {chat.mode}
                  </div>
                </div>

                <div className="hidden group-hover:flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => {
                      setEditingChatTitleId(chat.id);
                      setEditTitleInput(chat.title);
                    }}
                    className="p-1 hover:text-amber-500"
                    title="Rename"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteChat(chat.id)}
                    className="p-1 hover:text-rose-500"
                    title="Delete"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-slate-950">
        {/* Top Header: Active Chat Info & Mode Switcher */}
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                {activeChat ? activeChat.title : 'Ivan AI'}
              </h3>
            </div>
          </div>

          {/* AI Mode Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl text-[11px] font-semibold text-slate-600 dark:text-slate-300 overflow-x-auto max-w-[320px] sm:max-w-none">
              {(
                [
                  { id: 'general', label: 'General' },
                  { id: 'study', label: 'Study' },
                  { id: 'teaching', label: 'Teaching' },
                  { id: 'research', label: 'Research' },
                  { id: 'project', label: 'Project' },
                  { id: 'business', label: 'Business' },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    activeChat?.mode === m.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportChat}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg hidden sm:block"
              title="Export conversation as Markdown"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Attached Workspace Files Strip */}
        {attachedFiles.length > 0 && (
          <div className="px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-emerald-950/10 dark:bg-emerald-950/30 flex items-center gap-2 overflow-x-auto text-xs shrink-0">
            <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
              Context Files ({attachedFiles.length}):
            </span>
            {attachedFiles.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium"
              >
                <FileText className="w-3 h-3" />
                <span className="truncate max-w-[150px]">{f.name}</span>
                <button
                  onClick={() => setAttachedFiles((prev) => prev.filter((i) => i.id !== f.id))}
                  className="hover:text-rose-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Messages Stream Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {!activeChat || activeChat.messages.length === 0 ? (
            /* Empty State / Welcome Screen with Quick Prompts */
            <div className="max-w-2xl mx-auto py-8 space-y-6 text-center">
              <div className="w-14 h-14 rounded-xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  How can Ivan AI assist your workspace today?
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  Powered by Google Gemini & OpenAI intelligence, connected directly to your locally stored university notes, research, teaching schemes, and projects.
                </p>
              </div>

              {/* Quick Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                {quickPrompts.map((qp, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      handleModeChange(qp.mode);
                      handleSendMessage(qp.prompt);
                    }}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-emerald-500 transition-all cursor-pointer group shadow-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-emerald-500 transition-colors">
                      <span>{qp.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded uppercase font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500">
                        {qp.mode}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      "{qp.prompt}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Conversation Messages */
            <div className="max-w-3xl mx-auto space-y-6">
              {activeChat.messages.map((msg, index) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 sm:gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-1 shadow-xs">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`rounded-2xl p-4 sm:p-5 max-w-[85%] sm:max-w-[78%] space-y-3 ${
                        isUser
                          ? 'bg-emerald-600 text-white rounded-tr-xs shadow-xs'
                          : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs shadow-xs'
                      }`}
                    >
                      {/* Message Content */}
                      <div className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words font-sans">
                        {msg.content}
                      </div>

                      {/* Sources Used List */}
                      {!isUser && msg.sources && msg.sources.length > 0 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <span className="text-[10px] uppercase font-bold text-slate-400">Sources:</span>
                          {msg.sources.map((s, si) => (
                            <React.Fragment key={si}>
                              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                                {s}
                              </span>
                              {si < msg.sources!.length - 1 && <span aria-hidden="true" className="text-slate-400">·</span>}
                            </React.Fragment>
                          ))}
                        </div>
                      )}

                      {/* Assistant Action Bar */}
                      {!isUser && msg.content && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleCopy(msg)}
                              className="p-1 hover:text-slate-700 dark:hover:text-slate-200 rounded"
                              title="Copy response"
                            >
                              {copiedMsgId === msg.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleRegenerate(index)}
                              disabled={isGenerating}
                              className="p-1 hover:text-slate-700 dark:hover:text-slate-200 rounded disabled:opacity-50"
                              title="Regenerate"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSaveAsNote(msg)}
                              className="px-2 py-1 rounded-md text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-1 transition-colors"
                              title="Save into Notes"
                            >
                              <FileText className="w-3 h-3" />
                              <span>Save Note</span>
                            </button>
                            <button
                              onClick={() => handleCreateTaskFromAI(msg)}
                              className="px-2 py-1 rounded-md text-[10px] font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition-colors"
                              title="Create Task"
                            >
                              <CheckSquare className="w-3 h-3" />
                              <span>Create Task</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-1 font-bold text-xs shadow-xs">
                        IW
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Composer Area */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div className="max-w-3xl mx-auto space-y-2">
            <div className="relative flex items-end gap-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500">
              <button
                type="button"
                onClick={() => setIsAttachingFilesOpen(true)}
                className="p-2 text-slate-400 hover:text-emerald-500 transition-colors rounded-xl hover:bg-slate-200/50 dark:hover:bg-slate-700/50"
                title="Attach workspace documents for context"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              <textarea
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder={`Ask Ivan AI (${activeChat?.mode || 'general'} mode)... Press Enter to send.`}
                className="flex-1 bg-transparent border-0 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none resize-none max-h-32 py-1.5"
              />

              {isGenerating ? (
                <button
                  type="button"
                  onClick={handleStopGeneration}
                  className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-all shadow-sm flex items-center gap-1 text-xs font-semibold"
                  title="Stop generation"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span className="hidden sm:inline">Stop</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleSendMessage()}
                  disabled={!inputMessage.trim()}
                  className="p-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl transition-all shadow-sm"
                  title="Send message"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 px-1">
              <span>Files remain stored locally in IndexedDB. Only selected context is processed by AI.</span>
              <span className="hidden sm:inline">Shift + Enter for new line</span>
            </div>
          </div>
        </div>
      </div>

      {/* Attach Workspace Files Modal */}
      {isAttachingFilesOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Attach Documents to Ivan AI Context
              </h3>
              <button
                onClick={() => setIsAttachingFilesOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select which locally stored files should be provided as context for this conversation.
            </p>

            <div className="max-h-60 overflow-y-auto space-y-1.5 border border-slate-100 dark:border-slate-800 p-2 rounded-xl">
              {files.filter((f) => !f.isTrash).map((file) => {
                const isAttached = attachedFiles.some((f) => f.id === file.id);
                return (
                  <div
                    key={file.id}
                    onClick={() => {
                      if (isAttached) {
                        setAttachedFiles((prev) => prev.filter((i) => i.id !== file.id));
                      } else {
                        setAttachedFiles((prev) => [...prev, file]);
                      }
                    }}
                    className={`p-2 rounded-xl text-xs cursor-pointer flex items-center justify-between ${
                      isAttached
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{file.name}</span>
                    </div>
                    {isAttached && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsAttachingFilesOpen(false)}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold"
              >
                Done ({attachedFiles.length} selected)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

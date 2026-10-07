import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  WorkspaceFile,
  WorkspaceFolder,
  WorkspaceProject,
  WorkspaceTask,
  WorkspaceNote,
  CalendarEvent,
  AIChat,
  AISettings,
  WorkspaceCategory,
  ViewType,
  AIMode,
} from '../types';
import { db } from '../services/db';
import { extractTextFromFile } from '../services/fileExtractor';

interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface WorkspaceContextType {
  currentView: ViewType;
  setCurrentView: (view: ViewType) => void;
  files: WorkspaceFile[];
  folders: WorkspaceFolder[];
  projects: WorkspaceProject[];
  tasks: WorkspaceTask[];
  notes: WorkspaceNote[];
  calendarEvents: CalendarEvent[];
  aiChats: AIChat[];
  activeChatId: string | null;
  setActiveChatId: (id: string | null) => void;
  settings: AISettings;
  updateSettings: (settings: Partial<AISettings>) => Promise<void>;
  selectedFileIds: string[];
  setSelectedFileIds: React.Dispatch<React.SetStateAction<string[]>>;
  toggleSelectFile: (id: string) => void;
  selectAllFiles: (filteredFiles?: WorkspaceFile[]) => void;
  clearSelectedFiles: () => void;
  activePreviewFile: WorkspaceFile | null;
  setActivePreviewFile: (file: WorkspaceFile | null) => void;
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  isMobileNavOpen: boolean;
  setIsMobileNavOpen: (open: boolean) => void;
  isSearchModalOpen: boolean;
  setIsSearchModalOpen: (open: boolean) => void;
  isSettingsModalOpen: boolean;
  setIsSettingsModalOpen: (open: boolean) => void;
  isFloatingAIOpen: boolean;
  setIsFloatingAIOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;

  // File operations
  uploadFiles: (files: FileList | File[], category?: WorkspaceCategory, folderId?: string) => Promise<void>;
  renameFile: (id: string, newName: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  moveFileToTrash: (id: string) => Promise<void>;
  restoreFile: (id: string) => Promise<void>;
  deleteFilePermanently: (id: string) => Promise<void>;
  emptyTrash: () => Promise<void>;
  setFileCategory: (id: string, category: WorkspaceCategory) => Promise<void>;
  setFileFolder: (id: string, folderId?: string) => Promise<void>;
  addTagToFile: (id: string, tag: string) => Promise<void>;
  removeTagFromFile: (id: string, tag: string) => Promise<void>;
  downloadFile: (file: WorkspaceFile) => Promise<void>;

  // Folder operations
  createFolder: (name: string, category: WorkspaceCategory, parentId?: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;

  // Project operations
  createProject: (project: Omit<WorkspaceProject, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateProject: (project: WorkspaceProject) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;

  // Task operations
  createTask: (task: Omit<WorkspaceTask, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (task: WorkspaceTask) => Promise<void>;
  toggleTaskDone: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;

  // Note operations
  createNote: (note: Omit<WorkspaceNote, 'id' | 'createdAt' | 'updatedAt'>) => Promise<WorkspaceNote>;
  updateNote: (note: WorkspaceNote) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  togglePinNote: (id: string) => Promise<void>;

  // Calendar operations
  createCalendarEvent: (event: Omit<CalendarEvent, 'id'>) => Promise<void>;
  deleteCalendarEvent: (id: string) => Promise<void>;

  // AI chat operations
  createChat: (mode?: AIMode, initialPrompt?: string, attachedFileIds?: string[]) => Promise<string>;
  saveChat: (chat: AIChat) => Promise<void>;
  deleteChat: (id: string) => Promise<void>;
  renameChat: (id: string, title: string) => Promise<void>;
  triggerAIPromptFromAnywhere: (prompt: string, mode?: AIMode, attachedFiles?: WorkspaceFile[]) => void;

  refreshAllData: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [folders, setFolders] = useState<WorkspaceFolder[]>([]);
  const [projects, setProjects] = useState<WorkspaceProject[]>([]);
  const [tasks, setTasks] = useState<WorkspaceTask[]>([]);
  const [notes, setNotes] = useState<WorkspaceNote[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [aiChats, setAiChats] = useState<AIChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [activePreviewFile, setActivePreviewFile] = useState<WorkspaceFile | null>(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isFloatingAIOpen, setIsFloatingAIOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [theme, setThemeState] = useState<'light' | 'dark' | 'system'>(() => {
    return (localStorage.getItem('ivan_theme') as 'light' | 'dark' | 'system') || 'system';
  });

  const [settings, setSettings] = useState<AISettings>({
    enabled: true,
    provider: 'auto',
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
    streamResponse: true,
  });

  // Apply theme class
  useEffect(() => {
    localStorage.setItem('ivan_theme', theme);
    const root = document.documentElement;

    const applyTheme = () => {
      const isDark =
        theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        root.classList.add('dark');
        document.body.classList.add('dark');
        root.style.colorScheme = 'dark';
      } else {
        root.classList.remove('dark');
        document.body.classList.remove('dark');
        root.style.colorScheme = 'light';
      }
    };

    applyTheme();

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const listener = () => applyTheme();
      mediaQuery.addEventListener('change', listener);
      return () => mediaQuery.removeEventListener('change', listener);
    }
  }, [theme]);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshAllData = useCallback(async () => {
    try {
      const [f, fold, p, t, n, cal, chats, conf] = await Promise.all([
        db.getAll<WorkspaceFile>('files'),
        db.getAll<WorkspaceFolder>('folders'),
        db.getAll<WorkspaceProject>('projects'),
        db.getAll<WorkspaceTask>('tasks'),
        db.getAll<WorkspaceNote>('notes'),
        db.getAll<CalendarEvent>('calendar_events'),
        db.getAll<AIChat>('ai_chats'),
        db.getSettings(),
      ]);

      setFiles(f.sort((a, b) => b.updatedAt - a.updatedAt));
      setFolders(fold);
      setProjects(p.sort((a, b) => b.updatedAt - a.updatedAt));
      setTasks(t.sort((a, b) => b.updatedAt - a.updatedAt));
      setNotes(n.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0) || b.updatedAt - a.updatedAt));
      setCalendarEvents(cal.sort((a, b) => a.date.localeCompare(b.date)));
      setAiChats(chats.sort((a, b) => b.updatedAt - a.updatedAt));
      setSettings(conf);

      if (chats.length > 0 && !activeChatId) {
        setActiveChatId(chats[0].id);
      }
    } catch (err) {
      console.error('Failed to load workspace data from IndexedDB:', err);
    }
  }, [activeChatId]);

  // Initial load
  useEffect(() => {
    async function init() {
      await db.initializeWithSeedData();
      await refreshAllData();
    }
    init();
  }, [refreshAllData]);

  const updateSettings = async (newSettings: Partial<AISettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    await db.saveSettings(merged);
    addToast('Settings saved successfully', 'success');
  };

  const toggleSelectFile = (id: string) => {
    setSelectedFileIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const selectAllFiles = (filteredFiles?: WorkspaceFile[]) => {
    const target = filteredFiles || files.filter((f) => !f.isTrash);
    setSelectedFileIds(target.map((f) => f.id));
  };

  const clearSelectedFiles = () => {
    setSelectedFileIds([]);
  };

  // Upload files
  const uploadFiles = async (fileList: FileList | File[], category: WorkspaceCategory = 'general', folderId?: string) => {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;

    let successCount = 0;
    const now = Date.now();

    for (const file of arr) {
      try {
        const ext = file.name.split('.').pop()?.toLowerCase() || '';
        const { text } = await extractTextFromFile(file, file.name);

        const newFile: WorkspaceFile = {
          id: `file_${now}_${Math.random().toString(36).substring(2, 7)}`,
          name: file.name,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          extension: ext,
          category,
          folderId,
          tags: [ext.toUpperCase(), category],
          extractedText: text,
          createdAt: now,
          updatedAt: now,
          isFavorite: false,
          isTrash: false,
          lastOpenedAt: now,
        };

        await db.saveFile(newFile, file);
        successCount++;
      } catch (err) {
        console.error('Failed to upload file:', file.name, err);
      }
    }

    await refreshAllData();
    addToast(`Successfully stored ${successCount} file(s) in local IndexedDB`, 'success');
  };

  const renameFile = async (id: string, newName: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    const ext = newName.includes('.') ? newName.split('.').pop()?.toLowerCase() || file.extension : file.extension;
    const updated: WorkspaceFile = {
      ...file,
      name: newName,
      extension: ext,
      updatedAt: Date.now(),
    };
    await db.put('files', updated);
    await refreshAllData();
    addToast(`Renamed file to "${newName}"`, 'success');
  };

  const toggleFavorite = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    const updated: WorkspaceFile = {
      ...file,
      isFavorite: !file.isFavorite,
      updatedAt: Date.now(),
    };
    await db.put('files', updated);
    await refreshAllData();
  };

  const moveFileToTrash = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    const updated: WorkspaceFile = {
      ...file,
      isTrash: true,
      trashedAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.put('files', updated);
    setSelectedFileIds((prev) => prev.filter((i) => i !== id));
    await refreshAllData();
    addToast(`"${file.name}" moved to Trash`, 'info');
  };

  const restoreFile = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    const updated: WorkspaceFile = {
      ...file,
      isTrash: false,
      trashedAt: undefined,
      updatedAt: Date.now(),
    };
    await db.put('files', updated);
    await refreshAllData();
    addToast(`"${file.name}" restored from Trash`, 'success');
  };

  const deleteFilePermanently = async (id: string) => {
    const file = files.find((f) => f.id === id);
    await db.deleteFilePermanently(id);
    await refreshAllData();
    addToast(`"${file?.name || 'File'}" permanently deleted`, 'info');
  };

  const emptyTrash = async () => {
    const trashed = files.filter((f) => f.isTrash);
    for (const f of trashed) {
      await db.deleteFilePermanently(f.id);
    }
    await refreshAllData();
    addToast(`Emptied ${trashed.length} item(s) from Trash`, 'success');
  };

  const setFileCategory = async (id: string, category: WorkspaceCategory) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    const updated: WorkspaceFile = { ...file, category, updatedAt: Date.now() };
    await db.put('files', updated);
    await refreshAllData();
  };

  const setFileFolder = async (id: string, folderId?: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    const updated: WorkspaceFile = { ...file, folderId, updatedAt: Date.now() };
    await db.put('files', updated);
    await refreshAllData();
  };

  const addTagToFile = async (id: string, tag: string) => {
    const file = files.find((f) => f.id === id);
    if (!file || file.tags.includes(tag)) return;
    const updated: WorkspaceFile = { ...file, tags: [...file.tags, tag], updatedAt: Date.now() };
    await db.put('files', updated);
    await refreshAllData();
  };

  const removeTagFromFile = async (id: string, tag: string) => {
    const file = files.find((f) => f.id === id);
    if (!file) return;
    const updated: WorkspaceFile = { ...file, tags: file.tags.filter((t) => t !== tag), updatedAt: Date.now() };
    await db.put('files', updated);
    await refreshAllData();
  };

  const downloadFile = async (file: WorkspaceFile) => {
    const blob = await db.getFileBlob(file.id);
    let downloadBlob = blob;
    if (!downloadBlob && file.extractedText) {
      downloadBlob = new Blob([file.extractedText], { type: file.mimeType || 'text/plain' });
    }
    if (!downloadBlob) {
      addToast('Cannot download: File blob not found', 'error');
      return;
    }
    const url = URL.createObjectURL(downloadBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Folders
  const createFolder = async (name: string, category: WorkspaceCategory, parentId?: string) => {
    const now = Date.now();
    const newFolder: WorkspaceFolder = {
      id: `fold_${now}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      category,
      parentId,
      createdAt: now,
      updatedAt: now,
    };
    await db.saveFolder(newFolder);
    await refreshAllData();
    addToast(`Folder "${name}" created`, 'success');
  };

  const deleteFolder = async (id: string) => {
    // Unlink files in this folder
    for (const f of files.filter((f) => f.folderId === id)) {
      await db.put('files', { ...f, folderId: undefined, updatedAt: Date.now() });
    }
    await db.deleteFolder(id);
    await refreshAllData();
    addToast('Folder deleted', 'info');
  };

  // Projects
  const createProject = async (p: Omit<WorkspaceProject, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newProj: WorkspaceProject = {
      ...p,
      id: `proj_${now}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    await db.saveProject(newProj);
    await refreshAllData();
    addToast(`Project "${p.name}" created`, 'success');
  };

  const updateProject = async (p: WorkspaceProject) => {
    const updated: WorkspaceProject = { ...p, updatedAt: Date.now() };
    await db.saveProject(updated);
    await refreshAllData();
    addToast(`Project "${p.name}" updated`, 'success');
  };

  const deleteProject = async (id: string) => {
    await db.delete('projects', id);
    await refreshAllData();
    addToast('Project removed', 'info');
  };

  // Tasks
  const createTask = async (t: Omit<WorkspaceTask, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = Date.now();
    const newTask: WorkspaceTask = {
      ...t,
      id: `task_${now}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    await db.saveTask(newTask);

    // If task has due date, optionally add calendar event
    if (t.dueDate) {
      await db.saveCalendarEvent({
        id: `ev_task_${newTask.id}`,
        title: `Task Due: ${t.title}`,
        date: t.dueDate,
        type: 'deadline',
        category: t.category,
        linkedId: newTask.id,
      });
    }

    await refreshAllData();
    addToast(`Task "${t.title}" created`, 'success');
  };

  const updateTask = async (t: WorkspaceTask) => {
    const updated: WorkspaceTask = { ...t, updatedAt: Date.now() };
    await db.saveTask(updated);
    await refreshAllData();
  };

  const toggleTaskDone = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const isDone = task.status === 'done';
    const nextStatus = isDone ? 'todo' : 'done';
    await db.saveTask({
      ...task,
      status: nextStatus,
      updatedAt: Date.now(),
    });
    await refreshAllData();
  };

  const deleteTask = async (id: string) => {
    await db.delete('tasks', id);
    await db.delete('calendar_events', `ev_task_${id}`);
    await refreshAllData();
    addToast('Task deleted', 'info');
  };

  // Notes
  const createNote = async (n: Omit<WorkspaceNote, 'id' | 'createdAt' | 'updatedAt'>): Promise<WorkspaceNote> => {
    const now = Date.now();
    const newNote: WorkspaceNote = {
      ...n,
      id: `note_${now}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: now,
      updatedAt: now,
    };
    await db.saveNote(newNote);
    await refreshAllData();
    addToast(`Note "${n.title}" created`, 'success');
    return newNote;
  };

  const updateNote = async (n: WorkspaceNote) => {
    const updated: WorkspaceNote = { ...n, updatedAt: Date.now() };
    await db.saveNote(updated);
    await refreshAllData();
    addToast(`Note "${n.title}" saved`, 'success');
  };

  const deleteNote = async (id: string) => {
    await db.delete('notes', id);
    await refreshAllData();
    addToast('Note deleted', 'info');
  };

  const togglePinNote = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!note) return;
    await db.saveNote({ ...note, isPinned: !note.isPinned, updatedAt: Date.now() });
    await refreshAllData();
  };

  // Calendar
  const createCalendarEvent = async (ev: Omit<CalendarEvent, 'id'>) => {
    const id = `ev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    await db.saveCalendarEvent({ ...ev, id });
    await refreshAllData();
    addToast(`Event "${ev.title}" scheduled`, 'success');
  };

  const deleteCalendarEvent = async (id: string) => {
    await db.delete('calendar_events', id);
    await refreshAllData();
    addToast('Calendar event removed', 'info');
  };

  // AI Chat
  const createChat = async (mode: AIMode = 'general', initialPrompt?: string, attachedFileIds: string[] = []): Promise<string> => {
    const now = Date.now();
    const newChatId = `chat_${now}_${Math.random().toString(36).substring(2, 6)}`;
    const newChat: AIChat = {
      id: newChatId,
      title: initialPrompt ? initialPrompt.slice(0, 35) + '...' : `New ${mode.charAt(0).toUpperCase() + mode.slice(1)} Chat`,
      mode,
      messages: initialPrompt
        ? [
            {
              id: `msg_${now}`,
              role: 'user',
              content: initialPrompt,
              timestamp: now,
            },
          ]
        : [],
      attachedFileIds,
      createdAt: now,
      updatedAt: now,
    };

    await db.saveChat(newChat);
    await refreshAllData();
    setActiveChatId(newChatId);
    return newChatId;
  };

  const saveChat = async (chat: AIChat) => {
    const updated: AIChat = { ...chat, updatedAt: Date.now() };
    await db.saveChat(updated);
    await refreshAllData();
  };

  const deleteChat = async (id: string) => {
    await db.delete('ai_chats', id);
    if (activeChatId === id) {
      const remaining = aiChats.filter((c) => c.id !== id);
      setActiveChatId(remaining.length > 0 ? remaining[0].id : null);
    }
    await refreshAllData();
    addToast('Conversation deleted', 'info');
  };

  const renameChat = async (id: string, title: string) => {
    const chat = aiChats.find((c) => c.id === id);
    if (!chat) return;
    await db.saveChat({ ...chat, title, updatedAt: Date.now() });
    await refreshAllData();
  };

  const triggerAIPromptFromAnywhere = (prompt: string, mode: AIMode = 'general', attachedFiles: WorkspaceFile[] = []) => {
    const fileIds = attachedFiles.map((f) => f.id);
    createChat(mode, prompt, fileIds).then(() => {
      setCurrentView('ai');
    });
  };

  const setTheme = (t: 'light' | 'dark' | 'system') => {
    setThemeState(t);
  };

  return (
    <WorkspaceContext.Provider
      value={{
        currentView,
        setCurrentView,
        files,
        folders,
        projects,
        tasks,
        notes,
        calendarEvents,
        aiChats,
        activeChatId,
        setActiveChatId,
        settings,
        updateSettings,
        selectedFileIds,
        setSelectedFileIds,
        toggleSelectFile,
        selectAllFiles,
        clearSelectedFiles,
        activePreviewFile,
        setActivePreviewFile,
        theme,
        setTheme,
        isMobileNavOpen,
        setIsMobileNavOpen,
        isSearchModalOpen,
        setIsSearchModalOpen,
        isSettingsModalOpen,
        setIsSettingsModalOpen,
        isFloatingAIOpen,
        setIsFloatingAIOpen,
        toasts,
        addToast,
        removeToast,
        uploadFiles,
        renameFile,
        toggleFavorite,
        moveFileToTrash,
        restoreFile,
        deleteFilePermanently,
        emptyTrash,
        setFileCategory,
        setFileFolder,
        addTagToFile,
        removeTagFromFile,
        downloadFile,
        createFolder,
        deleteFolder,
        createProject,
        updateProject,
        deleteProject,
        createTask,
        updateTask,
        toggleTaskDone,
        deleteTask,
        createNote,
        updateNote,
        deleteNote,
        togglePinNote,
        createCalendarEvent,
        deleteCalendarEvent,
        createChat,
        saveChat,
        deleteChat,
        renameChat,
        triggerAIPromptFromAnywhere,
        refreshAllData,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

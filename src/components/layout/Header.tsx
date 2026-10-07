import React, { useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  Menu,
  Search,
  Upload,
  Plus,
  Sparkles,
  Sun,
  Moon,
  Laptop,
  Settings,
  FileText,
  CheckSquare,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentView,
    setIsMobileNavOpen,
    setIsSearchModalOpen,
    setIsSettingsModalOpen,
    theme,
    setTheme,
    uploadFiles,
    setCurrentView,
    createChat,
  } = useWorkspace();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const viewTitles: Record<string, string> = {
    dashboard: 'Workspace Dashboard',
    files: 'Document & File Manager',
    folders: 'Folder Directory',
    recent: 'Recent Files',
    favorites: 'Starred & Favorites',
    ai: 'Ivan AI Assistant',
    projects: 'Project Management & Kanban',
    tasks: 'Tasks & Productivity',
    notes: 'Knowledge Base & Notes',
    calendar: 'Schedule & Deadlines Calendar',
    university: 'University Headquarters',
    teaching: 'Teaching Resources & Curricula',
    school_admin: 'School Administration & ICT',
    research: 'Research & Literature Workspace',
    business: 'Business, Proposals & Clients',
    trash: 'Trash & Recycle Bin',
    storage: 'Storage Management',
    settings: 'Settings & AI Configuration',
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
      e.target.value = '';
    }
  };

  const toggleNextTheme = () => {
    if (theme === 'system') setTheme('light');
    else if (theme === 'light') setTheme('dark');
    else setTheme('system');
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 sticky top-0 z-30 transition-colors">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileUpload}
      />

      {/* Left: Mobile hamburger & title */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={() => setIsMobileNavOpen(true)}
          className="lg:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="truncate">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white truncate">
            {viewTitles[currentView] || 'Ivan Workspace'}
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
            Organize. Work. Learn. Build.
          </p>
        </div>
      </div>

      {/* Center: Search trigger */}
      <div className="flex-1 max-w-md hidden md:block">
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-xs border border-slate-200 dark:border-slate-700/60 transition-colors shadow-xs"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span>Search files, notes, or ask Ivan AI naturally...</span>
          </div>
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded text-slate-500 dark:text-slate-300">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Right: Quick actions */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => setIsSearchModalOpen(true)}
          className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Search"
          aria-label="Search"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
          title="Upload Files to IndexedDB"
        >
          <Upload className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span className="hidden sm:inline">Upload</span>
        </button>

        <button
          onClick={() => {
            setCurrentView('notes');
          }}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
          title="New Note"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Note</span>
        </button>

        <button
          onClick={() => {
            setCurrentView('tasks');
          }}
          className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700"
          title="New Task"
        >
          <CheckSquare className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
          <span>Task</span>
        </button>

        <button
          onClick={() => {
            createChat('general');
            setCurrentView('ai');
          }}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Ivan AI</span>
        </button>

        <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block" />

        {/* Theme Toggle */}
        <button
          onClick={toggleNextTheme}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title={`Current theme: ${theme}. Click to switch.`}
          aria-label="Toggle theme"
        >
          {theme === 'light' && <Sun className="w-4 h-4 text-slate-600" />}
          {theme === 'dark' && <Moon className="w-4 h-4 text-slate-300" />}
          {theme === 'system' && <Laptop className="w-4 h-4 text-slate-400" />}
        </button>

        {/* Settings button */}
        <button
          onClick={() => setIsSettingsModalOpen(true)}
          className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          title="Settings & AI Configuration"
          aria-label="Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

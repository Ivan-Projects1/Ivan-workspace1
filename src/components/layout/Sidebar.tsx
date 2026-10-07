import React from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ViewType } from '../../types';
import {
  LayoutDashboard,
  Files,
  FolderOpen,
  Clock,
  Star,
  Sparkles,
  Kanban,
  CheckSquare,
  FileText,
  Calendar,
  GraduationCap,
  BookOpen,
  Microscope,
  Briefcase,
  Search,
  Trash2,
  HardDrive,
  Settings,
  Building2,
  X,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    files,
    projects,
    tasks,
    notes,
    isMobileNavOpen,
    setIsMobileNavOpen,
    setIsSearchModalOpen,
    setIsSettingsModalOpen,
  } = useWorkspace();

  const totalFiles = files.filter((f) => !f.isTrash).length;
  const favoriteFiles = files.filter((f) => f.isFavorite && !f.isTrash).length;
  const trashedFiles = files.filter((f) => f.isTrash).length;
  const pendingTasks = tasks.filter((t) => t.status !== 'done').length;

  const navItems: Array<{
    id: ViewType;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number;
    isModalTrigger?: boolean;
    section?: string;
  }> = [
    { section: 'WORKSPACE', id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { section: 'WORKSPACE', id: 'files', label: 'My Files', icon: Files, count: totalFiles },
    { section: 'WORKSPACE', id: 'folders', label: 'Folders', icon: FolderOpen },
    { section: 'WORKSPACE', id: 'recent', label: 'Recent', icon: Clock },
    { section: 'WORKSPACE', id: 'favorites', label: 'Favorites', icon: Star, count: favoriteFiles },
    { section: 'INTELLIGENCE', id: 'ai', label: 'Ivan AI', icon: Sparkles },
    { section: 'PRODUCTIVITY', id: 'projects', label: 'Projects', icon: Kanban, count: projects.length },
    { section: 'PRODUCTIVITY', id: 'tasks', label: 'Tasks', icon: CheckSquare, count: pendingTasks },
    { section: 'PRODUCTIVITY', id: 'notes', label: 'Notes', icon: FileText, count: notes.length },
    { section: 'PRODUCTIVITY', id: 'calendar', label: 'Calendar', icon: Calendar },
    { section: 'DOMAINS', id: 'university', label: 'University', icon: GraduationCap },
    { section: 'DOMAINS', id: 'teaching', label: 'Teaching', icon: BookOpen },
    { section: 'DOMAINS', id: 'school_admin', label: 'School Admin', icon: Building2 },
    { section: 'DOMAINS', id: 'research', label: 'Research', icon: Microscope },
    { section: 'DOMAINS', id: 'business', label: 'Business', icon: Briefcase },
    { section: 'SYSTEM', id: 'search', label: 'Search', icon: Search, isModalTrigger: true },
    { section: 'SYSTEM', id: 'trash', label: 'Trash', icon: Trash2, count: trashedFiles },
    { section: 'SYSTEM', id: 'storage', label: 'Storage', icon: HardDrive },
    { section: 'SYSTEM', id: 'settings', label: 'Settings', icon: Settings, isModalTrigger: true },
  ];

  const handleNavClick = (item: (typeof navItems)[0]) => {
    if (item.id === 'search') {
      setIsSearchModalOpen(true);
    } else if (item.id === 'settings') {
      setIsSettingsModalOpen(true);
    } else {
      setCurrentView(item.id);
    }
    setIsMobileNavOpen(false);
  };

  const sections = ['WORKSPACE', 'INTELLIGENCE', 'PRODUCTIVITY', 'DOMAINS', 'SYSTEM'];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileNavOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-xs">
              IW
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">
                IVAN WORKSPACE
              </h1>
              <p className="text-[10px] uppercase tracking-wider text-emerald-400 font-medium">
                Organize. Work. Learn. Build.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsMobileNavOpen(false)}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin">
          {sections.map((sec) => {
            const secItems = navItems.filter((i) => i.section === sec);
            return (
              <div key={sec} className="space-y-0.5">
                <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-slate-500 uppercase">
                  {sec}
                </div>
                {secItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors group ${
                        isActive
                          ? 'bg-emerald-600/15 text-emerald-400 font-semibold border-l-2 border-emerald-500 rounded-l-none'
                          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive
                              ? 'text-emerald-400'
                              : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      {typeof item.count === 'number' && item.count > 0 && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-800 text-slate-400 group-hover:text-slate-300'
                          }`}
                        >
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* User Identity & Local Storage Card */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-medium text-slate-300 text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              IndexedDB Storage
            </span>
            <span className="text-[10px] text-slate-400">{totalFiles} items</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(8, totalFiles * 4))}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full bg-slate-800 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                I
              </div>
              <span className="text-slate-300 font-medium truncate">Ivan Workspace</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

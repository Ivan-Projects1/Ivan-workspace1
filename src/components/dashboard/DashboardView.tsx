import React, { useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import {
  FileText,
  FolderOpen,
  Sparkles,
  Kanban,
  CheckSquare,
  Clock,
  Star,
  HardDrive,
  Calendar,
  ArrowRight,
  Upload,
  Plus,
  FileCode,
  Image as ImageIcon,
  FileSpreadsheet,
  FileQuestion,
  ChevronRight,
} from 'lucide-react';
import { EmptyState } from '../common/EmptyState';

export const DashboardView: React.FC = () => {
  const {
    files,
    folders,
    projects,
    tasks,
    notes,
    calendarEvents,
    aiChats,
    setCurrentView,
    setActivePreviewFile,
    createChat,
  } = useWorkspace();

  const activeFiles = useMemo(() => files.filter((f) => !f.isTrash), [files]);

  // Statistics derived purely from real dynamic data
  const stats = useMemo(() => {
    let pdfs = 0;
    let images = 0;
    let spreadsheets = 0;
    let presentations = 0;
    let codeFiles = 0;
    let docs = 0;
    let totalBytes = 0;

    activeFiles.forEach((f) => {
      totalBytes += f.size || 0;
      const ext = f.extension.toLowerCase();
      if (ext === 'pdf') pdfs++;
      else if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'svg'].includes(ext) || f.mimeType.startsWith('image/')) images++;
      else if (['xls', 'xlsx', 'csv', 'tsv'].includes(ext)) spreadsheets++;
      else if (['ppt', 'pptx'].includes(ext)) presentations++;
      else if (['py', 'js', 'ts', 'tsx', 'jsx', 'c', 'cpp', 'java', 'sql', 'html', 'css', 'json', 'xml'].includes(ext)) codeFiles++;
      else if (['doc', 'docx', 'txt', 'md', 'rtf'].includes(ext)) docs++;
    });

    const activeProjectsCount = projects.filter((p) => p.status === 'active' || p.status === 'planning').length;
    const pendingTasks = tasks.filter((t) => t.status !== 'done');
    const urgentTasks = pendingTasks.filter((t) => t.priority === 'urgent' || t.priority === 'high');
    const favoriteFiles = activeFiles.filter((f) => f.isFavorite);

    return {
      totalFiles: activeFiles.length,
      totalFolders: folders.length,
      pdfs,
      images,
      spreadsheets,
      presentations,
      codeFiles,
      docs,
      totalBytes,
      activeProjectsCount,
      pendingTasksCount: pendingTasks.length,
      urgentTasksCount: urgentTasks.length,
      notesCount: notes.length,
      chatsCount: aiChats.length,
      favoriteCount: favoriteFiles.length,
    };
  }, [activeFiles, folders, projects, tasks, notes, aiChats]);

  // Format bytes
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Recent files (up to 5)
  const recentFiles = useMemo(() => {
    return [...activeFiles]
      .sort((a, b) => (b.lastOpenedAt || b.updatedAt) - (a.lastOpenedAt || a.updatedAt))
      .slice(0, 5);
  }, [activeFiles]);

  // Upcoming deadlines (Tasks & Calendar events)
  const upcomingDeadlines = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const events = calendarEvents
      .filter((e) => e.date >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
    return events;
  }, [calendarEvents]);

  // Categories distribution
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      university: 0,
      teaching: 0,
      school_admin: 0,
      research: 0,
      business: 0,
      software: 0,
      personal: 0,
      general: 0,
    };
    activeFiles.forEach((f) => {
      if (counts[f.category] !== undefined) counts[f.category]++;
      else counts.general++;
    });
    return counts;
  }, [activeFiles]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-6 sm:p-8 text-white shadow-xs">
        <div className="max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>AI-Powered Personal Digital Headquarters</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome back to Ivan Workspace
          </h1>
          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Your centralized digital workspace for university coursework, teaching resources, research literature, administration, business operations, and local document management.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={() => {
                createChat('general', 'Summarize my recent work and workspace activity.');
                setCurrentView('ai');
              }}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors shadow-xs flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Ask AI About Workspace</span>
            </button>
            <button
              onClick={() => setCurrentView('files')}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium text-xs sm:text-sm rounded-lg border border-slate-700 transition-colors flex items-center gap-2"
            >
              <FileText className="w-4 h-4 text-slate-400" />
              <span>Manage Documents</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Core Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => setCurrentView('files')}
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-emerald-500/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Stored Files
            </span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-emerald-500 transition-colors">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {stats.totalFiles}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{stats.totalFolders} folders</span>
            <span aria-hidden="true">·</span>
            <span>{formatSize(stats.totalBytes)}</span>
          </div>
        </div>

        <div
          onClick={() => setCurrentView('projects')}
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-emerald-500/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Active Projects
            </span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-emerald-500 transition-colors">
              <Kanban className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {stats.activeProjectsCount}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{projects.length} total objectives</span>
          </div>
        </div>

        <div
          onClick={() => setCurrentView('tasks')}
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-emerald-500/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pending Tasks
            </span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-emerald-500 transition-colors">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {stats.pendingTasksCount}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className={stats.urgentTasksCount > 0 ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
              {stats.urgentTasksCount} urgent priority
            </span>
          </div>
        </div>

        <div
          onClick={() => setCurrentView('ai')}
          className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-emerald-500/40 transition-colors cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              AI Conversations
            </span>
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-emerald-500 transition-colors">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            {stats.chatsCount}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span>{notes.length} knowledge notes</span>
          </div>
        </div>
      </div>

      {/* File Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Documents', count: stats.docs, icon: FileText },
          { label: 'PDFs', count: stats.pdfs, icon: FileQuestion },
          { label: 'Sheets / CSV', count: stats.spreadsheets, icon: FileSpreadsheet },
          { label: 'Images', count: stats.images, icon: ImageIcon },
          { label: 'Code Files', count: stats.codeFiles, icon: FileCode },
          { label: 'Favorites', count: stats.favoriteCount, icon: Star },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex items-center gap-3 shadow-xs"
            >
              <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg shrink-0">
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.label}</div>
                <div className="text-base font-bold text-slate-900 dark:text-white">{item.count}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Two-Column Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Files & Projects (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Files */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Recent Files</h3>
              </div>
              <button
                onClick={() => setCurrentView('files')}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentFiles.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No files stored yet"
                description="Upload lecture notes, research proposals, or spreadsheets to access them here."
                actionText="Upload Files"
                onAction={() => setCurrentView('files')}
              />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentFiles.map((file) => (
                  <div
                    key={file.id}
                    onClick={() => setActivePreviewFile(file)}
                    className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-lg cursor-pointer transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 font-bold text-xs uppercase">
                        {file.extension || 'DOC'}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {file.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="capitalize">{file.category.replace('_', ' ')}</span>
                          <span aria-hidden="true">·</span>
                          <span>{formatSize(file.size)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          createChat('general', `Please analyze and summarize the document "${file.name}".`, [file.id]);
                          setCurrentView('ai');
                        }}
                        className="px-2.5 py-1 rounded-md text-xs font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border border-emerald-500/20 transition-colors flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>Ask AI</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Active Projects Progress */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Kanban className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Active Projects</h3>
              </div>
              <button
                onClick={() => setCurrentView('projects')}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Manage</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {projects.length === 0 ? (
              <EmptyState
                icon={Kanban}
                title="No active projects"
                description="Structure research theses, software development modules, and institutional plans."
                actionText="New Project"
                onAction={() => setCurrentView('projects')}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projects.slice(0, 4).map((p) => {
                  const completedTasks = p.tasks.filter((t) => t.completed).length;
                  const totalTasks = p.tasks.length;
                  const calcProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : p.progress;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setCurrentView('projects')}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">
                          {p.name}
                        </span>
                        <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0">
                          {p.status}
                        </span>
                      </div>
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${calcProgress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span>{calcProgress}% complete</span>
                        <span>{completedTasks}/{totalTasks} tasks</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Deadlines, Storage & Category Distribution (1 span) */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming Deadlines</h3>
              </div>
              <button
                onClick={() => setCurrentView('calendar')}
                className="text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                <span>Calendar</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {upcomingDeadlines.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">No scheduled upcoming deadlines.</p>
            ) : (
              <div className="space-y-2">
                {upcomingDeadlines.map((e) => (
                  <div
                    key={e.id}
                    className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-start gap-3"
                  >
                    <div className="w-10 text-center shrink-0">
                      <div className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">
                        {new Date(e.date).toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-base font-bold text-slate-900 dark:text-white leading-none">
                        {new Date(e.date).getDate()}
                      </div>
                    </div>
                    <div className="truncate min-w-0">
                      <div className="text-xs font-medium text-slate-900 dark:text-slate-100 truncate">
                        {e.title}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 capitalize mt-0.5 flex items-center gap-1.5">
                        <span>{e.type}</span>
                        <span aria-hidden="true">·</span>
                        <span>{e.category.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category Distribution */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Domain Distribution</h3>
            <div className="space-y-3">
              {[
                { key: 'university', label: 'University', count: categoryCounts.university },
                { key: 'teaching', label: 'Teaching', count: categoryCounts.teaching },
                { key: 'school_admin', label: 'School Admin', count: categoryCounts.school_admin },
                { key: 'research', label: 'Research', count: categoryCounts.research },
                { key: 'business', label: 'Business', count: categoryCounts.business },
                { key: 'software', label: 'Software', count: categoryCounts.software },
              ].map((cat) => {
                const pct = stats.totalFiles > 0 ? Math.round((cat.count / stats.totalFiles) * 100) : 0;
                return (
                  <div
                    key={cat.key}
                    onClick={() => setCurrentView(cat.key as any)}
                    className="cursor-pointer group space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-slate-300 font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {cat.label}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {cat.count} files ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

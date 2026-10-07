import React from 'react';
import { WorkspaceProvider, useWorkspace } from './context/WorkspaceContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/dashboard/DashboardView';
import { FilesView } from './components/files/FilesView';
import { IvanAIChatView } from './components/ai/IvanAIChatView';
import { AIFloatingWidget } from './components/ai/AIFloatingWidget';
import { ProjectsView } from './components/projects/ProjectsView';
import { TasksView } from './components/tasks/TasksView';
import { NotesView } from './components/notes/NotesView';
import { CalendarView } from './components/calendar/CalendarView';
import { CategoryDetailView } from './components/categories/CategoryDetailView';
import { TrashView } from './components/trash/TrashView';
import { StorageView } from './components/storage/StorageView';
import { DocumentViewerModal } from './components/files/DocumentViewerModal';
import { SearchModal } from './components/search/SearchModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { ToastContainer } from './components/common/Toast';

const MainLayout: React.FC = () => {
  const { currentView, activePreviewFile, setActivePreviewFile } = useWorkspace();

  const renderActiveView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'files':
      case 'folders':
      case 'recent':
      case 'favorites':
        return <FilesView />;
      case 'ai':
        return <IvanAIChatView />;
      case 'projects':
        return <ProjectsView />;
      case 'tasks':
        return <TasksView />;
      case 'notes':
        return <NotesView />;
      case 'calendar':
        return <CalendarView />;
      case 'university':
        return <CategoryDetailView category="university" />;
      case 'teaching':
        return <CategoryDetailView category="teaching" />;
      case 'school_admin':
        return <CategoryDetailView category="school_admin" />;
      case 'research':
        return <CategoryDetailView category="research" />;
      case 'business':
        return <CategoryDetailView category="business" />;
      case 'trash':
        return <TrashView />;
      case 'storage':
        return <StorageView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 antialiased overflow-hidden font-sans">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto min-w-0 scrollbar-thin">
          {renderActiveView()}
        </main>
      </div>

      {/* Persistent Floating AI button & quick chat */}
      {currentView !== 'ai' && <AIFloatingWidget />}

      {/* Global Modals */}
      <DocumentViewerModal
        file={activePreviewFile}
        onClose={() => setActivePreviewFile(null)}
      />
      <SearchModal />
      <SettingsModal />
      <ToastContainer />
    </div>
  );
};

export default function App() {
  return (
    <WorkspaceProvider>
      <MainLayout />
    </WorkspaceProvider>
  );
}

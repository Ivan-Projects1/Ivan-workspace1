import React, { useState, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkspaceProject, ProjectStatus, PriorityLevel, WorkspaceCategory } from '../../types';
import {
  Plus,
  Kanban,
  List,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  Trash2,
  Edit2,
  CheckSquare,
  FileText,
  X,
  ChevronRight,
} from 'lucide-react';

export const ProjectsView: React.FC<{ forcedCategory?: WorkspaceCategory }> = ({ forcedCategory }) => {
  const {
    projects,
    createProject,
    updateProject,
    deleteProject,
    createChat,
    setCurrentView,
    addToast,
  } = useWorkspace();

  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<WorkspaceProject | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState<WorkspaceCategory>(forcedCategory || 'research');
  const [formStatus, setFormStatus] = useState<ProjectStatus>('active');
  const [formPriority, setFormPriority] = useState<PriorityLevel>('medium');
  const [formDeadline, setFormDeadline] = useState('');
  const [newTaskInput, setNewTaskInput] = useState('');

  const filteredProjects = useMemo(() => {
    return forcedCategory ? projects.filter((p) => p.category === forcedCategory) : projects;
  }, [projects, forcedCategory]);

  const handleOpenCreateModal = () => {
    setSelectedProject(null);
    setFormName('');
    setFormDesc('');
    setFormCategory(forcedCategory || 'research');
    setFormStatus('active');
    setFormPriority('medium');
    setFormDeadline('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: WorkspaceProject) => {
    setSelectedProject(p);
    setFormName(p.name);
    setFormDesc(p.description);
    setFormCategory(p.category);
    setFormStatus(p.status);
    setFormPriority(p.priority);
    setFormDeadline(p.deadline || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (selectedProject) {
      await updateProject({
        ...selectedProject,
        name: formName.trim(),
        description: formDesc.trim(),
        category: formCategory,
        status: formStatus,
        priority: formPriority,
        deadline: formDeadline || undefined,
      });
    } else {
      await createProject({
        name: formName.trim(),
        description: formDesc.trim(),
        category: formCategory,
        status: formStatus,
        priority: formPriority,
        progress: 0,
        deadline: formDeadline || undefined,
        tasks: [],
        linkedFileIds: [],
        linkedNoteIds: [],
      });
    }
    setIsModalOpen(false);
  };

  const handleToggleTask = async (project: WorkspaceProject, taskId: string) => {
    const updatedTasks = project.tasks.map((t) => (t.id === taskId ? { ...t, completed: !t.completed } : t));
    const completedCount = updatedTasks.filter((t) => t.completed).length;
    const progress = updatedTasks.length > 0 ? Math.round((completedCount / updatedTasks.length) * 100) : project.progress;
    await updateProject({
      ...project,
      tasks: updatedTasks,
      progress,
    });
  };

  const handleAddTaskToProject = async (project: WorkspaceProject) => {
    if (!newTaskInput.trim()) return;
    const newTask = {
      id: `t_${Date.now()}`,
      title: newTaskInput.trim(),
      completed: false,
      priority: 'medium' as PriorityLevel,
    };
    const updatedTasks = [...project.tasks, newTask];
    const completedCount = updatedTasks.filter((t) => t.completed).length;
    const progress = Math.round((completedCount / updatedTasks.length) * 100);
    await updateProject({
      ...project,
      tasks: updatedTasks,
      progress,
    });
    setNewTaskInput('');
    addToast('Task added to project', 'success');
  };

  const handleAskAIAboutProject = (project: WorkspaceProject) => {
    createChat(
      'project',
      `Please analyze my project "${project.name}". Review the scope, suggest a structured milestone timeline, identify technical risks, and generate recommended action items.

Description: ${project.description}
Current Status: ${project.status} (Priority: ${project.priority})
Existing Tasks:
${project.tasks.map((t) => `- [${t.completed ? 'x' : ' '}] ${t.title}`).join('\n')}`
    );
    setCurrentView('ai');
  };

  const kanbanColumns: Array<{ id: ProjectStatus; title: string }> = [
    { id: 'planning', title: 'Planning' },
    { id: 'active', title: 'Active' },
    { id: 'on_hold', title: 'On Hold' },
    { id: 'completed', title: 'Completed' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Kanban className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Projects & Objectives</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage research milestones, academic deliverables, and business initiatives.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'kanban' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="Kanban Board"
            >
              <Kanban className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'kanban' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
          {kanbanColumns.map((col) => {
            const colProjects = filteredProjects.filter((p) => p.status === col.id);
            return (
              <div
                key={col.id}
                className="bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 space-y-3 min-h-[300px]"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${col.id === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      {col.title}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    {colProjects.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {colProjects.map((p) => {
                    const completedTasks = p.tasks.filter((t) => t.completed).length;
                    const totalTasks = p.tasks.length;
                    const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : p.progress;

                    return (
                      <div
                        key={p.id}
                        className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all space-y-3 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                            {p.name}
                          </h4>
                          <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider shrink-0">
                            {p.priority}
                          </span>
                        </div>

                        {p.description && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        )}

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[10px] text-slate-500 dark:text-slate-400">
                            <span>Progress</span>
                            <span>{pct}%</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        {/* Tasks Checklist preview */}
                        {p.tasks.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            {p.tasks.slice(0, 3).map((t) => (
                              <div
                                key={t.id}
                                onClick={() => handleToggleTask(p, t.id)}
                                className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 cursor-pointer hover:text-emerald-500"
                              >
                                <CheckSquare
                                  className={`w-3.5 h-3.5 shrink-0 ${
                                    t.completed ? 'text-emerald-500' : 'text-slate-300 dark:text-slate-600'
                                  }`}
                                />
                                <span className={`truncate ${t.completed ? 'line-through opacity-60' : ''}`}>
                                  {t.title}
                                </span>
                              </div>
                            ))}
                            {p.tasks.length > 3 && (
                              <div className="text-[10px] text-slate-400 pl-5">
                                +{p.tasks.length - 3} more tasks
                              </div>
                            )}
                          </div>
                        )}

                        {/* Card Footer: AI & Edit */}
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                          <button
                            onClick={() => handleAskAIAboutProject(p)}
                            className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1 hover:underline"
                          >
                            <Sparkles className="w-3 h-3" />
                            <span>Project AI</span>
                          </button>

                          <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100">
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              className="p-1 hover:text-slate-900 dark:hover:text-white"
                              title="Edit"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteProject(p.id)}
                              className="p-1 hover:text-rose-500"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
          {filteredProjects.map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40">
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{p.name}</h4>
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {p.status}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1">{p.description}</p>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right text-xs">
                  <div className="font-semibold text-slate-700 dark:text-slate-300">{p.progress}%</div>
                  <div className="text-[10px] text-slate-400">{p.tasks.length} tasks</div>
                </div>

                <button
                  onClick={() => handleAskAIAboutProject(p)}
                  className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg text-xs font-semibold flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>AI Plan</span>
                </button>

                <button
                  onClick={() => handleOpenEditModal(p)}
                  className="p-1.5 text-slate-400 hover:text-slate-600"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedProject ? 'Edit Project' : 'Create New Project'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Project Name</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Master Thesis: AI in Mathematics Education"
                  className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Objectives, scope, and deliverables..."
                  className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Domain Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as WorkspaceCategory)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="university">University</option>
                    <option value="teaching">Teaching</option>
                    <option value="school_admin">School Admin</option>
                    <option value="research">Research</option>
                    <option value="business">Business</option>
                    <option value="software">Software</option>
                    <option value="personal">Personal</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ProjectStatus)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="planning">Planning</option>
                    <option value="active">Active</option>
                    <option value="on_hold">On Hold</option>
                    <option value="completed">Completed</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Priority</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as PriorityLevel)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Target Deadline</label>
                  <input
                    type="date"
                    value={formDeadline}
                    onChange={(e) => setFormDeadline(e.target.value)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                {selectedProject ? 'Save Changes' : 'Create Project'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkspaceTask, PriorityLevel, WorkspaceCategory } from '../../types';
import {
  CheckSquare,
  Square,
  Plus,
  Sparkles,
  Calendar,
  AlertCircle,
  Trash2,
  Edit2,
  Tag,
  Filter,
  CheckCircle2,
  Clock,
  X,
} from 'lucide-react';

export const TasksView: React.FC<{ forcedCategory?: WorkspaceCategory }> = ({ forcedCategory }) => {
  const {
    tasks,
    createTask,
    updateTask,
    toggleTaskDone,
    deleteTask,
    createChat,
    setCurrentView,
    addToast,
  } = useWorkspace();

  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed'>('pending');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<WorkspaceTask | null>(null);

  // Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskCategory, setTaskCategory] = useState<WorkspaceCategory>(forcedCategory || 'university');
  const [taskPriority, setTaskPriority] = useState<PriorityLevel>('medium');
  const [taskDueDate, setTaskDueDate] = useState('');
  const [subtaskInputs, setSubtaskInputs] = useState<string[]>(['']);

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => {
        if (forcedCategory && t.category !== forcedCategory) return false;
        if (activeTab === 'pending' && t.status === 'done') return false;
        if (activeTab === 'completed' && t.status !== 'done') return false;
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        return true;
      })
      .sort((a, b) => {
        // Sort urgent first, then by date
        const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });
  }, [tasks, forcedCategory, activeTab, priorityFilter]);

  const handleOpenCreateModal = () => {
    setSelectedTask(null);
    setTaskTitle('');
    setTaskDesc('');
    setTaskCategory(forcedCategory || 'university');
    setTaskPriority('medium');
    setTaskDueDate('');
    setSubtaskInputs(['']);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (t: WorkspaceTask) => {
    setSelectedTask(t);
    setTaskTitle(t.title);
    setTaskDesc(t.description || '');
    setTaskCategory(t.category);
    setTaskPriority(t.priority);
    setTaskDueDate(t.dueDate || '');
    setSubtaskInputs(t.subtasks.map((s) => s.text).concat(['']));
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const validSubtasks = subtaskInputs
      .filter((s) => s.trim())
      .map((text, i) => ({
        id: `st_${Date.now()}_${i}`,
        text: text.trim(),
        done: false,
      }));

    if (selectedTask) {
      await updateTask({
        ...selectedTask,
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        category: taskCategory,
        priority: taskPriority,
        dueDate: taskDueDate || undefined,
        subtasks: validSubtasks,
      });
    } else {
      await createTask({
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        category: taskCategory,
        status: 'todo',
        priority: taskPriority,
        dueDate: taskDueDate || undefined,
        subtasks: validSubtasks,
        tags: [taskCategory],
      });
    }

    setIsModalOpen(false);
  };

  const handleAskAIHelp = (t: WorkspaceTask) => {
    createChat(
      'general',
      `I need assistance completing this workspace task: "${t.title}".

Details: ${t.description || 'No additional notes provided.'}
Priority: ${t.priority.toUpperCase()} | Domain: ${t.category.toUpperCase()}

Please provide a clear step-by-step action plan, outline, or solution draft to help me finish this task efficiently.`
    );
    setCurrentView('ai');
  };

  const handleToggleSubtask = async (task: WorkspaceTask, subtaskId: string) => {
    const updatedSubtasks = task.subtasks.map((st) => (st.id === subtaskId ? { ...st, done: !st.done } : st));
    await updateTask({
      ...task,
      subtasks: updatedSubtasks,
    });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-emerald-500" />
            <span>Tasks & Action Items</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Track daily academic assignments, grading schedules, and administrative responsibilities.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Tabs & Priority Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'pending'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Pending ({tasks.filter((t) => t.status !== 'done').length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'completed'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Completed ({tasks.filter((t) => t.status === 'done').length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-semibold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({tasks.length})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-xs">No tasks match this filter. Create a new task to stay organized!</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const isDone = task.status === 'done';
            return (
              <div
                key={task.id}
                className={`p-4 bg-white dark:bg-slate-900 border rounded-xl shadow-xs transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-4 group ${
                  isDone
                    ? 'border-slate-200 dark:border-slate-800 opacity-60 bg-slate-50/60 dark:bg-slate-900/40'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {/* Left: Checkbox & Info */}
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <button
                    onClick={() => toggleTaskDone(task.id)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-500 transition-colors"
                  >
                    {isDone ? (
                      <CheckSquare className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={`text-xs sm:text-sm font-semibold text-slate-900 dark:text-white ${
                          isDone ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {task.title}
                      </h4>
                      <span className="text-[10px] uppercase font-semibold text-slate-500 dark:text-slate-400 tracking-wider">
                        {task.priority}
                      </span>
                      <span aria-hidden="true" className="text-slate-400 text-xs">·</span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 capitalize">
                        {task.category.replace('_', ' ')}
                      </span>
                    </div>

                    {task.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {task.description}
                      </p>
                    )}

                    {/* Subtasks */}
                    {task.subtasks && task.subtasks.length > 0 && (
                      <div className="space-y-1 pt-1">
                        {task.subtasks.map((st) => (
                          <div
                            key={st.id}
                            onClick={() => handleToggleSubtask(task, st.id)}
                            className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer hover:text-emerald-500"
                          >
                            <span
                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] ${
                                st.done
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-slate-300 dark:border-slate-700'
                              }`}
                            >
                              {st.done && '✓'}
                            </span>
                            <span className={st.done ? 'line-through opacity-60' : ''}>{st.text}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {task.dueDate && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-rose-500" />
                        <span>Due: {task.dueDate}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => handleAskAIHelp(task)}
                    className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl text-xs font-semibold flex items-center gap-1"
                    title="Ask Ivan AI for guidance"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Help</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(task)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => deleteTask(task.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Task Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedTask ? 'Edit Task' : 'Create New Task'}
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
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Task Title</label>
                <input
                  type="text"
                  required
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Grade Year 2 Linear Algebra Sample Papers"
                  className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={taskDesc}
                  onChange={(e) => setTaskDesc(e.target.value)}
                  placeholder="Additional context or requirements..."
                  className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Category Domain</label>
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value as WorkspaceCategory)}
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
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Priority</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as PriorityLevel)}
                    className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Due Date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                />
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
                {selectedTask ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

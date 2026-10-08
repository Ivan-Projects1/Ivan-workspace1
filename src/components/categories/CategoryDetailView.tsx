import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkspaceCategory } from '../../types';
import { FilesView } from '../files/FilesView';
import { ProjectsView } from '../projects/ProjectsView';
import { TasksView } from '../tasks/TasksView';
import { NotesView } from '../notes/NotesView';
import {
  GraduationCap,
  BookOpen,
  Building2,
  Microscope,
  Briefcase,
  Sparkles,
  Files,
  Kanban,
  CheckSquare,
  FileText,
} from 'lucide-react';

interface CategoryDetailViewProps {
  category: WorkspaceCategory;
}

export const CategoryDetailView: React.FC<CategoryDetailViewProps> = ({ category }) => {
  const { createChat, setCurrentView } = useWorkspace();
  const [activeTab, setActiveTab] = useState<'files' | 'projects' | 'tasks' | 'notes'>('files');

  const meta: Record<
    string,
    {
      title: string;
      desc: string;
      icon: React.ComponentType<{ className?: string }>;
      aiMode: 'study' | 'teaching' | 'research' | 'business' | 'general';
      prompts: Array<{ label: string; prompt: string }>;
    }
  > = {
    university: {
      title: 'University Headquarters',
      desc: 'Course units, lecture notes, academic assignments, problem sets, and exam preparation.',
      icon: GraduationCap,
      aiMode: 'study',
      prompts: [
        { label: 'Summarize Real Analysis Notes', prompt: 'Summarize my Real Analysis II lecture notes and highlight core definitions (Metric Spaces, Compactness, Heine-Borel).' },
        { label: 'Generate 5 Revision Questions', prompt: 'Create 5 rigorous university-level revision questions with proofs based on my university notes.' },
        { label: 'Explain Assignment Problem', prompt: 'Walk me step-by-step through solving a metric topology problem on sequential compactness.' },
      ],
    },
    teaching: {
      title: 'Teaching Resource Manager',
      desc: 'Lesson plans, schemes of work, assessments, marking rubrics, and educational activities.',
      icon: BookOpen,
      aiMode: 'teaching',
      prompts: [
        { label: 'Create Lesson Plan', prompt: 'Draft a 60-minute learner-centered lesson plan on Limits and Continuity with interactive Desmos activities.' },
        { label: 'Construct Marking Guide', prompt: 'Create a standardized rubric and marking guide for an Advanced Calculus diagnostic quiz.' },
        { label: 'Generate Classroom Exercises', prompt: 'Provide 4 differentiated practice exercises for secondary mathematics students learning algebraic vectors.' },
      ],
    },
    school_admin: {
      title: 'School Administration & ICT',
      desc: 'Campus policies, infrastructure strategies, academic board meetings, and results.',
      icon: Building2,
      aiMode: 'general',
      prompts: [
        { label: 'Summarize ICT Strategy', prompt: 'Summarize the School ICT Administration & Infrastructure Master Strategy 2026-2027 and list actionable steps.' },
        { label: 'Draft Meeting Agenda', prompt: 'Draft an agenda for the upcoming Academic and ICT Board meeting covering campus Wi-Fi rollout and privacy.' },
        { label: 'Review Acceptable Use Policy', prompt: 'Critique and draft security guidelines for student and staff digital device use.' },
      ],
    },
    research: {
      title: 'Research & Literature Workspace',
      desc: 'Research proposals, literature reviews, methodology, data analysis, and academic publications.',
      icon: Microscope,
      aiMode: 'research',
      prompts: [
        { label: 'Refine Literature Review', prompt: 'Review my literature review on AI in Mathematics Education and integrate Bandura\'s Social Learning Theory.' },
        { label: 'Formulate Research Questions', prompt: 'Refine my research questions and hypotheses on the cognitive impacts of generative AI scaffolding in STEM.' },
        { label: 'Statistical Methodology Plan', prompt: 'Suggest appropriate parametric and non-parametric tests for my mixed-methods student sample (N=180).' },
      ],
    },
    business: {
      title: 'Business & Consulting Workspace',
      desc: 'Client proposals, service invoices, contracts, deliverables, and commercial projects.',
      icon: Briefcase,
      aiMode: 'business',
      prompts: [
        { label: 'Review Consulting Proposal', prompt: 'Evaluate my Horizon Institute consulting proposal and strengthen the value proposition for digital transformation.' },
        { label: 'Draft Milestone 1 Invoice', prompt: 'Generate a professional invoice breakdown for Milestone 1 ($2,500) covering technical audits and curriculum analysis.' },
        { label: 'Client Pitch Outline', prompt: 'Create a 5-slide pitch outline for school administrators seeking AI-assisted teacher training.' },
      ],
    },
  };

  const current = meta[category] || meta.university;
  const Icon = current.icon;

  const handleLaunchPrompt = (promptText: string) => {
    createChat(current.aiMode, promptText);
    setCurrentView('ai');
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 sm:p-8 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{current.title}</h1>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">{current.desc}</p>
              </div>
            </div>
          </div>

          {/* Domain AI Prompt Shortcuts */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{current.aiMode.toUpperCase()} AI Quick Actions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {current.prompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLaunchPrompt(p.prompt)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium transition-colors text-left shadow-xs flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{p.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('files')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'files'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Files className="w-4 h-4" />
            <span>Documents</span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'projects'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Kanban className="w-4 h-4" />
            <span>Projects</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'tasks'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <CheckSquare className="w-4 h-4" />
            <span>Tasks</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-colors ${
              activeTab === 'notes'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Knowledge Notes</span>
          </button>
        </div>
      </div>

      {/* Render selected view with forced category */}
      <div className="pb-8">
        {activeTab === 'files' && <FilesView forcedCategory={category} />}
        {activeTab === 'projects' && <ProjectsView forcedCategory={category} />}
        {activeTab === 'tasks' && <TasksView forcedCategory={category} />}
        {activeTab === 'notes' && <NotesView forcedCategory={category} />}
      </div>
    </div>
  );
};

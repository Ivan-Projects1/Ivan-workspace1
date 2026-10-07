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
} from '../types';

const DB_NAME = 'ivan_workspace_db';
const DB_VERSION = 1;

class IndexedDBManager {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private openDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' });
          filesStore.createIndex('category', 'category', { unique: false });
          filesStore.createIndex('folderId', 'folderId', { unique: false });
          filesStore.createIndex('isTrash', 'isTrash', { unique: false });
          filesStore.createIndex('isFavorite', 'isFavorite', { unique: false });
          filesStore.createIndex('createdAt', 'createdAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('blobs')) {
          db.createObjectStore('blobs', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('parentId', 'parentId', { unique: false });
          folderStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('category', 'category', { unique: false });
          projectStore.createIndex('status', 'status', { unique: false });
        }

        if (!db.objectStoreNames.contains('tasks')) {
          const taskStore = db.createObjectStore('tasks', { keyPath: 'id' });
          taskStore.createIndex('category', 'category', { unique: false });
          taskStore.createIndex('status', 'status', { unique: false });
          taskStore.createIndex('dueDate', 'dueDate', { unique: false });
        }

        if (!db.objectStoreNames.contains('notes')) {
          const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
          noteStore.createIndex('category', 'category', { unique: false });
          noteStore.createIndex('isPinned', 'isPinned', { unique: false });
        }

        if (!db.objectStoreNames.contains('calendar_events')) {
          const eventStore = db.createObjectStore('calendar_events', { keyPath: 'id' });
          eventStore.createIndex('date', 'date', { unique: false });
          eventStore.createIndex('category', 'category', { unique: false });
        }

        if (!db.objectStoreNames.contains('ai_chats')) {
          const chatStore = db.createObjectStore('ai_chats', { keyPath: 'id' });
          chatStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  private async getStore(storeName: string, mode: IDBTransactionMode = 'readonly'): Promise<IDBObjectStore> {
    const db = await this.openDB();
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
  }

  // Generic helpers
  async getAll<T>(storeName: string): Promise<T[]> {
    const store = await this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | undefined> {
    const store = await this.getStore(storeName, 'readonly');
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async put<T>(storeName: string, value: T): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put(value);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    const store = await this.getStore(storeName, 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // --- File Specific ---
  async saveFile(file: WorkspaceFile, blob?: Blob): Promise<void> {
    await this.put('files', file);
    if (blob) {
      await this.put('blobs', { id: file.id, blob });
    }
  }

  async getFileBlob(id: string): Promise<Blob | undefined> {
    const res = await this.get<{ id: string; blob: Blob }>('blobs', id);
    return res?.blob;
  }

  async deleteFilePermanently(id: string): Promise<void> {
    await this.delete('files', id);
    await this.delete('blobs', id);
  }

  // --- Folders ---
  async saveFolder(folder: WorkspaceFolder): Promise<void> {
    await this.put('folders', folder);
  }

  async deleteFolder(id: string): Promise<void> {
    await this.delete('folders', id);
  }

  // --- Projects ---
  async saveProject(project: WorkspaceProject): Promise<void> {
    await this.put('projects', project);
  }

  // --- Tasks ---
  async saveTask(task: WorkspaceTask): Promise<void> {
    await this.put('tasks', task);
  }

  // --- Notes ---
  async saveNote(note: WorkspaceNote): Promise<void> {
    await this.put('notes', note);
  }

  // --- Calendar ---
  async saveCalendarEvent(event: CalendarEvent): Promise<void> {
    await this.put('calendar_events', event);
  }

  // --- AI Chats ---
  async saveChat(chat: AIChat): Promise<void> {
    await this.put('ai_chats', chat);
  }

  // --- Settings ---
  async getSettings(): Promise<AISettings> {
    const defaultSettings: AISettings = {
      enabled: true,
      provider: 'auto',
      model: 'gpt-4o',
      temperature: 0.7,
      maxTokens: 4096,
      streamResponse: true,
    };
    try {
      const record = await this.get<{ key: string; value: AISettings }>('settings', 'ai_config');
      return record?.value ? { ...defaultSettings, ...record.value } : defaultSettings;
    } catch {
      return defaultSettings;
    }
  }

  async saveSettings(settings: AISettings): Promise<void> {
    await this.put('settings', { key: 'ai_config', value: settings });
  }

  // Seed sample data if database is fresh
  async initializeWithSeedData(): Promise<void> {
    const existingFiles = await this.getAll<WorkspaceFile>('files');
    if (existingFiles.length > 0) return; // Already initialized

    const now = Date.now();

    // 1. Folders
    const folders: WorkspaceFolder[] = [
      { id: 'f_univ_analysis', name: 'Real Analysis II', category: 'university', createdAt: now, updatedAt: now, color: '#0ea5e9' },
      { id: 'f_univ_assign', name: 'Coursework & Assignments', category: 'university', createdAt: now, updatedAt: now, color: '#38bdf8' },
      { id: 'f_teach_math', name: 'Mathematics Curricula', category: 'teaching', createdAt: now, updatedAt: now, color: '#10b981' },
      { id: 'f_teach_plans', name: 'Schemes of Work', category: 'teaching', createdAt: now, updatedAt: now, color: '#059669' },
      { id: 'f_admin_ict', name: 'ICT Administration', category: 'school_admin', createdAt: now, updatedAt: now, color: '#6366f1' },
      { id: 'f_res_proposals', name: 'Research Proposals & Lit Reviews', category: 'research', createdAt: now, updatedAt: now, color: '#8b5cf6' },
      { id: 'f_bus_consulting', name: 'Client Proposals & Invoices', category: 'business', createdAt: now, updatedAt: now, color: '#f59e0b' },
      { id: 'f_soft_workspace', name: 'Ivan Workspace Architecture', category: 'software', createdAt: now, updatedAt: now, color: '#06b6d4' },
    ];

    for (const f of folders) {
      await this.saveFolder(f);
    }

    // 2. Realistic Documents with actual extracted text
    const sampleDocs = [
      {
        id: 'doc_analysis_notes',
        name: 'Real_Analysis_II_Metric_Spaces_and_Compactness.md',
        category: 'university' as WorkspaceCategory,
        folderId: 'f_univ_analysis',
        extension: 'md',
        mimeType: 'text/markdown',
        tags: ['Math', 'Topology', 'Exams', 'Lecture Notes'],
        isFavorite: true,
        text: `# Real Analysis II: Metric Spaces, Continuity, and Compactness

## 1. Metric Spaces Fundamentals
A metric space is an ordered pair $(M, d)$ where $M$ is a set and $d: M \\times M \\to \\mathbb{R}$ satisfies:
1. Positivity: $d(x, y) \\ge 0$, and $d(x, y) = 0 \\iff x = y$
2. Symmetry: $d(x, y) = d(y, x)$
3. Triangle Inequality: $d(x, z) \\le d(x, y) + d(y, z)$

## 2. Heine-Borel Theorem
For a subset $K \\subseteq \\mathbb{R}^n$, the following properties are equivalent:
- $K$ is closed and bounded.
- $K$ is compact (every open cover has a finite subcover).
- Every sequence in $K$ has a convergent subsequence whose limit lies in $K$ (Sequential Compactness).

## 3. Important Deadlines
- Midterm Exam: November 14, 2026 at 09:00 AM in Hall C.
- Problem Set 4 Submission: October 28, 2026.
- Final Comprehensive Examination: December 18, 2026.`,
      },
      {
        id: 'doc_ict_strategy',
        name: 'ICT_Administration_Infrastructure_Strategy_2026.md',
        category: 'school_admin' as WorkspaceCategory,
        folderId: 'f_admin_ict',
        extension: 'md',
        mimeType: 'text/markdown',
        tags: ['Administration', 'ICT', 'Infrastructure', 'Policy'],
        isFavorite: true,
        text: `# School ICT Administration & Infrastructure Master Strategy 2026-2027

## Executive Summary
This document outlines the upgrade path for the institution's digital teaching environment, campus networking, and administrative data privacy policies.

### Key Objectives
1. Campus-wide Wi-Fi 6 coverage across all lecture halls and laboratories.
2. Zero-Trust Access Architecture for student and faculty portals.
3. Centralized Learning Management System (LMS) synchronization with automated grading export.
4. Server backup policy: Daily incremental snapshot with offsite encryption.

### Timeline & Budget
- Phase 1 (Core Switchgear): Completed Q1 2026.
- Phase 2 (Computer Lab Refurbishment): In Progress - scheduled completion November 30, 2026.
- Budget Allocation: $45,000 approved by School Board.`,
      },
      {
        id: 'doc_research_proposal',
        name: 'AI_in_Mathematics_Education_Literature_Review.md',
        category: 'research' as WorkspaceCategory,
        folderId: 'f_res_proposals',
        extension: 'md',
        mimeType: 'text/markdown',
        tags: ['Research', 'AI', 'Pedagogy', 'Literature Review'],
        isFavorite: false,
        text: `# Investigating the Impact of Generative AI Scaffolding on Conceptual Mastery in Secondary Mathematics Education

## Abstract
Recent advances in generative large language models offer unprecedented opportunities for personalized cognitive scaffolding. This paper reviews existing literature on Bandura's Social Learning Theory, Vygotsky's Zone of Proximal Development (ZPD), and interactive prompt engineering in secondary school algebra.

## Key Research Questions
1. How does step-by-step interactive AI prompting affect student retention compared to static worked examples?
2. What are the cognitive pitfalls of automated hints when learners encounter topological or algebraic abstraction?
3. How can educators integrate AI marking guides while mitigating academic dishonesty?

## Methodology
Mixed-methods design across 4 secondary school cohorts ($N = 180$), evaluating pre-test and post-test gains with 6-week follow-up retention assessments.`,
      },
      {
        id: 'doc_math_scheme',
        name: 'Advanced_Calculus_Scheme_of_Work_Term_1.md',
        category: 'teaching' as WorkspaceCategory,
        folderId: 'f_teach_plans',
        extension: 'md',
        mimeType: 'text/markdown',
        tags: ['Teaching', 'Calculus', 'Syllabus', 'Lesson Plan'],
        isFavorite: true,
        text: `# Scheme of Work: Advanced Calculus & Applications (Term 1)

## Week 1: Limits & Continuity Revisited
- Learning Objectives: Formal $\\epsilon-\\delta$ definition of limit.
- Activity: Interactive Desmos visualization & peer proof workshops.
- Assessment: Diagnostic quiz (15 mins).

## Week 2: Mean Value Theorem & Taylor Series
- Learning Objectives: Rolle's Theorem, Mean Value Theorem, Taylor polynomial approximations.
- Practical: Error bound analysis using numerical methods.
- Homework: Problem set on Lagrange form of remainder.

## Week 3-4: Multivariable Partial Derivatives
- Learning Objectives: Directional derivatives, gradient vectors, tangent planes.
- Real-World Application: Gradient descent optimization in Machine Learning models.`,
      },
      {
        id: 'doc_business_proposal',
        name: 'EdTech_Consulting_Client_Proposal.md',
        category: 'business' as WorkspaceCategory,
        folderId: 'f_bus_consulting',
        extension: 'md',
        mimeType: 'text/markdown',
        tags: ['Business', 'Consulting', 'Client', 'Proposal'],
        isFavorite: false,
        text: `# Ivan Workspace Consulting: Digital Transformation & Curriculum Modernization Proposal

## Client: Horizon Educational Institute
**Date:** October 2026
**Scope of Services:**
- Full audit of current digital classroom tools and teacher technical competency.
- Delivery of 3 interactive staff training workshops on AI-assisted lesson generation.
- Implementation of secure student document archival protocols.

## Investment & Deliverables
- Milestone 1: Needs Assessment & Gap Analysis - $2,500
- Milestone 2: Custom Curriculum Digitization Framework - $4,200
- Milestone 3: Workshop Execution & 60-day Support - $3,300
**Total Project Fee:** $10,000 USD`,
      },
      {
        id: 'doc_py_code',
        name: 'matrix_decomposition_benchmarks.py',
        category: 'software' as WorkspaceCategory,
        folderId: 'f_soft_workspace',
        extension: 'py',
        mimeType: 'text/x-python',
        tags: ['Python', 'Algorithms', 'Linear Algebra', 'Code'],
        isFavorite: false,
        text: `"""
Matrix Decomposition Benchmarks
Compares SVD, QR, and Cholesky decompositions for large sparse matrices.
"""
import time
import numpy as np

def benchmark_decompositions(matrix_dim=1500):
    print(f"Generating symmetric positive-definite matrix of size {matrix_dim}x{matrix_dim}...")
    A = np.random.randn(matrix_dim, matrix_dim)
    SPD = np.dot(A, A.T) + np.eye(matrix_dim) * 0.1

    # 1. Cholesky
    t0 = time.perf_counter()
    L = np.linalg.cholesky(SPD)
    t_chol = time.perf_counter() - t0
    print(f"Cholesky Decomposition time: {t_chol:.4f} seconds")

    # 2. QR
    t0 = time.perf_counter()
    Q, R = np.linalg.qr(A)
    t_qr = time.perf_counter() - t0
    print(f"QR Decomposition time: {t_qr:.4f} seconds")

    return {"cholesky_time": t_chol, "qr_time": t_qr}

if __name__ == "__main__":
    benchmark_decompositions()`,
      },
    ];

    for (const d of sampleDocs) {
      const blob = new Blob([d.text], { type: d.mimeType });
      const fileRecord: WorkspaceFile = {
        id: d.id,
        name: d.name,
        size: blob.size,
        mimeType: d.mimeType,
        extension: d.extension,
        category: d.category,
        folderId: d.folderId,
        tags: d.tags,
        extractedText: d.text,
        createdAt: now - Math.floor(Math.random() * 86400000 * 5),
        updatedAt: now,
        isFavorite: d.isFavorite,
        isTrash: false,
        lastOpenedAt: now - 3600000,
      };
      await this.saveFile(fileRecord, blob);
    }

    // 3. Projects
    const projects: WorkspaceProject[] = [
      {
        id: 'proj_thesis',
        name: 'Master Research Thesis: AI in Mathematics Education',
        description: 'Comprehensive research investigation into cognitive scaffolding and generative AI tools in undergraduate and secondary STEM pedagogy.',
        category: 'research',
        status: 'active',
        priority: 'high',
        progress: 65,
        startDate: '2026-09-01',
        deadline: '2026-12-15',
        tasks: [
          { id: 't1', title: 'Complete Chapter 2 Literature Review', completed: true, dueDate: '2026-10-15', priority: 'high' },
          { id: 't2', title: 'Submit Ethics Committee clearance form', completed: true, dueDate: '2026-10-20', priority: 'urgent' },
          { id: 't3', title: 'Collect Phase 1 pilot questionnaire data', completed: false, dueDate: '2026-11-05', priority: 'high' },
          { id: 't4', title: 'Run ANOVA statistical analysis in R/Python', completed: false, dueDate: '2026-11-20', priority: 'medium' },
          { id: 't5', title: 'Draft Discussion and Conclusion chapters', completed: false, dueDate: '2026-12-01', priority: 'high' },
        ],
        linkedFileIds: ['doc_research_proposal'],
        linkedNoteIds: ['note_methodology'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'proj_curriculum',
        name: 'Calculus & Linear Algebra Curriculum Redesign',
        description: 'Modernizing classroom modules with computational notebooks and interactive AI exercises for students.',
        category: 'teaching',
        status: 'active',
        priority: 'medium',
        progress: 40,
        startDate: '2026-09-15',
        deadline: '2026-11-30',
        tasks: [
          { id: 't6', title: 'Finalize Scheme of Work for Term 1', completed: true, dueDate: '2026-10-10', priority: 'medium' },
          { id: 't7', title: 'Design 5 interactive Jupyter/Colab notebooks', completed: false, dueDate: '2026-11-10', priority: 'high' },
          { id: 't8', title: 'Prepare Midterm exam with rubric and marking guide', completed: false, dueDate: '2026-11-12', priority: 'urgent' },
        ],
        linkedFileIds: ['doc_math_scheme'],
        linkedNoteIds: [],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'proj_network_upgrade',
        name: 'School ICT Infrastructure & Cyber Policy',
        description: 'Server room modernization, firewall updates, and Zero-Trust credential roll-out.',
        category: 'school_admin',
        status: 'planning',
        priority: 'high',
        progress: 25,
        startDate: '2026-10-01',
        deadline: '2026-12-31',
        tasks: [
          { id: 't9', title: 'Vendor quote comparison for managed switches', completed: true, dueDate: '2026-10-12', priority: 'medium' },
          { id: 't10', title: 'Draft staff Acceptable Use Policy update', completed: false, dueDate: '2026-11-01', priority: 'high' },
        ],
        linkedFileIds: ['doc_ict_strategy'],
        linkedNoteIds: [],
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const p of projects) {
      await this.saveProject(p);
    }

    // 4. Tasks
    const standaloneTasks: WorkspaceTask[] = [
      {
        id: 'task_real_analysis_hw',
        title: 'Complete Real Analysis Problem Set 4 (Compactness & Bolzano-Weierstrass)',
        description: 'Solve questions 1 through 8. Prove that any infinite bounded subset of R^n has an accumulation point.',
        category: 'university',
        status: 'in_progress',
        priority: 'urgent',
        dueDate: '2026-10-28',
        projectId: 'proj_thesis',
        subtasks: [
          { id: 'st1', text: 'Problem 1-3: Metric topology definitions', done: true },
          { id: 'st2', text: 'Problem 4-6: Heine-Borel theorem application', done: false },
          { id: 'st3', text: 'Problem 7-8: Sequential compactness proof', done: false },
        ],
        tags: ['Math', 'Homework', 'Analysis'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task_exam_grading',
        title: 'Review and moderate Year 2 Algebra Assessment Papers',
        description: 'Cross-check sample scripts and calibrate marking guide with co-lecturer.',
        category: 'teaching',
        status: 'todo',
        priority: 'high',
        dueDate: '2026-11-04',
        subtasks: [
          { id: 'st4', text: 'Grade top 10% sample scripts', done: false },
          { id: 'st5', text: 'Fill marksheet spreadsheet', done: false },
        ],
        tags: ['Grading', 'Teaching', 'Assessments'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task_client_invoice',
        title: 'Send Milestone 1 Invoice to Horizon Institute ($2,500)',
        description: 'Attach signed statement of work and consulting deliverables summary.',
        category: 'business',
        status: 'todo',
        priority: 'medium',
        dueDate: '2026-10-30',
        subtasks: [],
        tags: ['Finance', 'Invoice', 'Consulting'],
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'task_ict_lab',
        title: 'Inspect Science Computer Lab 2 hardware installation',
        description: 'Verify 30 workstations booted onto PXE image and network VLAN tagging operates cleanly.',
        category: 'school_admin',
        status: 'todo',
        priority: 'medium',
        dueDate: '2026-11-08',
        subtasks: [],
        tags: ['ICT', 'Hardware', 'Campus'],
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const t of standaloneTasks) {
      await this.saveTask(t);
    }

    // 5. Notes
    const notes: WorkspaceNote[] = [
      {
        id: 'note_methodology',
        title: 'Research Methodology Notes & Statistical Tests',
        content: `### Quantitative Methodology
- Target Sample: $N = 180$ undergraduate STEM students across 4 lecture sections.
- Dependent variables: Pre-test conceptual score, post-test retention, time on task.
- Statistical package: Python (\`scipy.stats\`, \`statsmodels\`) or R.
- Tests to execute:
  1. Paired-samples $t$-test for pre/post gains.
  2. Two-way ANOVA (AI-Scaffolding condition $\\times$ Prior Math Achievement).
  3. Effect size: Cohen's $d$ and Partial $\\eta^2$.`,
        category: 'research',
        tags: ['Statistics', 'Methodology', 'Thesis'],
        isPinned: true,
        projectId: 'proj_thesis',
        createdAt: now - 86400000,
        updatedAt: now,
      },
      {
        id: 'note_exam_tips',
        title: 'Real Analysis II Exam Revision Formulas & Theorems',
        content: `### Crucial Theorems to Memorize:
1. **Lebesgue's Number Lemma**: If $(M, d)$ is compact and $\\mathcal{U}$ is an open cover, there exists $\\delta > 0$ such that every ball of radius $\\delta$ is contained in some member of $\\mathcal{U}$.
2. **Extreme Value Theorem**: A continuous real-valued function on a compact metric space attains both maximum and minimum.
3. **Uniform Continuity**: Every continuous function from a compact metric space into a metric space is uniformly continuous!`,
        category: 'university',
        tags: ['Study Guide', 'Analysis', 'Formulas'],
        isPinned: true,
        createdAt: now - 172800000,
        updatedAt: now,
      },
      {
        id: 'note_admin_meeting',
        title: 'Academic Board Meeting Minutes - October 2026',
        content: `### Attendees: Head of Department, Senior Lecturers, ICT Officer
**Action Items:**
- Digital attendance tracking rollout approved for semester 2.
- Teaching awards nomination deadline set for November 15.
- Research grant application deadline reminder: December 1.`,
        category: 'school_admin',
        tags: ['Minutes', 'Meeting', 'Governance'],
        isPinned: false,
        createdAt: now - 259200000,
        updatedAt: now,
      },
    ];

    for (const n of notes) {
      await this.saveNote(n);
    }

    // 6. Calendar Events
    const events: CalendarEvent[] = [
      {
        id: 'ev1',
        title: 'Real Analysis Problem Set 4 Due',
        date: '2026-10-28',
        time: '23:59',
        type: 'deadline',
        category: 'university',
        description: 'Submission via faculty portal.',
      },
      {
        id: 'ev2',
        title: 'Horizon Institute Milestone 1 Review Meeting',
        date: '2026-10-30',
        time: '14:00',
        type: 'meeting',
        category: 'business',
        description: 'Review digital transformation audit with academic director.',
      },
      {
        id: 'ev3',
        title: 'Real Analysis II Midterm Examination',
        date: '2026-11-14',
        time: '09:00',
        type: 'exam',
        category: 'university',
        description: 'Main Campus Hall C - Closed book.',
      },
      {
        id: 'ev4',
        title: 'Faculty ICT Committee Review',
        date: '2026-11-06',
        time: '11:00',
        type: 'meeting',
        category: 'school_admin',
        description: 'Review campus Wi-Fi expansion bids.',
      },
      {
        id: 'ev5',
        title: 'Research Thesis Chapter 3 Draft Milestone',
        date: '2026-11-20',
        time: '17:00',
        type: 'milestone',
        category: 'research',
        description: 'Submit methodology and pilot data draft to supervisor.',
      },
    ];

    for (const e of events) {
      await this.saveCalendarEvent(e);
    }

    // 7. Initial Welcome AI Chat
    const initialChat: AIChat = {
      id: 'chat_welcome',
      title: 'Welcome to Ivan AI',
      mode: 'general',
      messages: [
        {
          id: 'msg_welcome',
          role: 'assistant',
          content: `# Hello Ivan, welcome to your Workspace Digital Headquarters!

I am **Ivan AI**, your embedded intelligent assistant. I am connected directly to your locally stored documents, notes, projects, and academic tasks.

### What I can help you with:
- 📚 **Study Assistant**: Ask me to summarize or generate revision quizzes from your *Real Analysis II* notes, solve mathematical proofs, or structure homework solutions.
- 🎓 **Teaching Assistant**: Draft lesson plans, create schemes of work, or construct marking rubrics for your mathematics and ICT classes.
- 🔬 **Research Assistant**: Formulate research questions, review literature on *Social Learning Theory & AI in Education*, or structure your dissertation chapters.
- 💼 **Business & Admin**: Draft client consulting proposals, invoices, and school ICT policy documents.
- 🔍 **Multi-Document Analysis**: Select multiple files in "My Files" to compare, contrast, or extract deadlines into consolidated reports.

**Quick Prompts to try:**
- *"Summarize my Real Analysis II notes"*
- *"Find all files related to ICT Administration"*
- *"Create a 5-question revision quiz based on Metric Spaces"*
- *"Extract the important deadlines from my files"*

How would you like to begin today?`,
          timestamp: now,
          sources: [
            'Real_Analysis_II_Metric_Spaces_and_Compactness.md',
            'ICT_Administration_Infrastructure_Strategy_2026.md',
            'AI_in_Mathematics_Education_Literature_Review.md',
          ],
        },
      ],
      attachedFileIds: ['doc_analysis_notes', 'doc_ict_strategy', 'doc_research_proposal'],
      createdAt: now,
      updatedAt: now,
    };

    await this.saveChat(initialChat);
  }
}

export const db = new IndexedDBManager();

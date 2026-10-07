export type WorkspaceCategory =
  | 'university'
  | 'teaching'
  | 'school_admin'
  | 'research'
  | 'business'
  | 'software'
  | 'personal'
  | 'general';

export interface WorkspaceFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  extension: string;
  category: WorkspaceCategory;
  folderId?: string;
  tags: string[];
  extractedText?: string;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  isTrash: boolean;
  trashedAt?: number;
  lastOpenedAt?: number;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  parentId?: string;
  category: WorkspaceCategory;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type PriorityLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface ProjectTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority?: PriorityLevel;
}

export interface WorkspaceProject {
  id: string;
  name: string;
  description: string;
  category: WorkspaceCategory;
  status: ProjectStatus;
  priority: PriorityLevel;
  progress: number; // 0 - 100
  startDate?: string;
  deadline?: string;
  tasks: ProjectTask[];
  linkedFileIds: string[];
  linkedNoteIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceTask {
  id: string;
  title: string;
  description?: string;
  category: WorkspaceCategory;
  status: 'todo' | 'in_progress' | 'review' | 'done';
  priority: PriorityLevel;
  dueDate?: string;
  projectId?: string;
  subtasks: { id: string; text: string; done: boolean }[];
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkspaceNote {
  id: string;
  title: string;
  content: string; // Markdown / Rich content
  category: WorkspaceCategory;
  tags: string[];
  isPinned: boolean;
  linkedFileIds?: string[];
  projectId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: 'assignment' | 'exam' | 'meeting' | 'deadline' | 'milestone' | 'event';
  category: WorkspaceCategory;
  description?: string;
  linkedId?: string; // id of task or project
}

export type AIMode =
  | 'general'
  | 'study'
  | 'teaching'
  | 'research'
  | 'project'
  | 'business';

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  sources?: string[];
  error?: boolean;
}

export interface AIChat {
  id: string;
  title: string;
  mode: AIMode;
  messages: AIMessage[];
  attachedFileIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AISettings {
  enabled: boolean;
  provider: 'openai' | 'gemini' | 'auto';
  openAIApiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
  streamResponse: boolean;
  systemPromptAddendum?: string;
}

export type ViewType =
  | 'dashboard'
  | 'files'
  | 'folders'
  | 'recent'
  | 'favorites'
  | 'ai'
  | 'projects'
  | 'tasks'
  | 'notes'
  | 'calendar'
  | 'university'
  | 'teaching'
  | 'research'
  | 'business'
  | 'school_admin'
  | 'search'
  | 'trash'
  | 'storage'
  | 'settings';

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
      model: 'gemini-2.5-flash',
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

  // Purge all user and seed data across all object stores
  async purgeAllData(): Promise<void> {
    await this.clear('files');
    await this.clear('blobs');
    await this.clear('folders');
    await this.clear('projects');
    await this.clear('tasks');
    await this.clear('notes');
    await this.clear('calendar_events');
    await this.clear('ai_chats');
  }

  // Ensure fresh clean database with no seed/mock data
  async initializeWithSeedData(): Promise<void> {
    // If the database has leftover mock seed data from previous runs, clean it out
    try {
      const existingFiles = await this.getAll<WorkspaceFile>('files');
      const isLegacySeedFile = existingFiles.some((f) =>
        ['doc_analysis_notes', 'doc_ict_strategy', 'doc_research_proposal', 'doc_math_scheme', 'doc_student_marks', 'doc_syllabus_cs101'].includes(f.id) ||
        f.name.toLowerCase().includes('sample') ||
        f.name.toLowerCase().includes('seed')
      );

      const existingChats = await this.getAll<AIChat>('ai_chats');
      const hasLegacyChat = existingChats.some((c) => c.id === 'chat_welcome' || c.id === 'chat_1' || c.title?.includes('Welcome'));

      const existingProjects = await this.getAll<WorkspaceProject>('projects');
      const hasLegacyProject = existingProjects.some((p) => p.id === 'proj_1' || p.id === 'proj_curriculum');

      if (isLegacySeedFile || hasLegacyChat || hasLegacyProject) {
        await this.purgeAllData();
      }
    } catch (err) {
      console.warn('Initial seed cleanup check completed:', err);
    }
    // No mock seed data is inserted - starts completely clean.
  }
}

export const db = new IndexedDBManager();


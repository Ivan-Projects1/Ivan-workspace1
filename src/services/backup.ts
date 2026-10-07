import JSZip from 'jszip';
import { db } from './db';
import {
  WorkspaceFile,
  WorkspaceFolder,
  WorkspaceProject,
  WorkspaceTask,
  WorkspaceNote,
  CalendarEvent,
  AIChat,
  AISettings,
} from '../types';

export interface WorkspaceExportData {
  version: string;
  exportedAt: string;
  files: WorkspaceFile[];
  folders: WorkspaceFolder[];
  projects: WorkspaceProject[];
  tasks: WorkspaceTask[];
  notes: WorkspaceNote[];
  calendarEvents: CalendarEvent[];
  aiChats: AIChat[];
  settings?: AISettings;
}

export async function exportWorkspaceZip(): Promise<Blob> {
  const zip = new JSZip();

  const [files, folders, projects, tasks, notes, calendarEvents, aiChats, settings] = await Promise.all([
    db.getAll<WorkspaceFile>('files'),
    db.getAll<WorkspaceFolder>('folders'),
    db.getAll<WorkspaceProject>('projects'),
    db.getAll<WorkspaceTask>('tasks'),
    db.getAll<WorkspaceNote>('notes'),
    db.getAll<CalendarEvent>('calendar_events'),
    db.getAll<AIChat>('ai_chats'),
    db.getSettings(),
  ]);

  const metadata: WorkspaceExportData = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    files,
    folders,
    projects,
    tasks,
    notes,
    calendarEvents,
    aiChats,
    settings,
  };

  zip.file('workspace_manifest.json', JSON.stringify(metadata, null, 2));

  // Add individual files
  const filesFolder = zip.folder('files');
  if (filesFolder) {
    for (const f of files) {
      if (!f.isTrash) {
        const blob = await db.getFileBlob(f.id);
        if (blob) {
          filesFolder.file(`${f.id}__${f.name}`, blob);
        } else if (f.extractedText) {
          filesFolder.file(`${f.id}__${f.name}`, f.extractedText);
        }
      }
    }
  }

  return await zip.generateAsync({ type: 'blob' });
}

export async function importWorkspaceZip(zipFile: File | Blob): Promise<{
  filesCount: number;
  projectsCount: number;
  tasksCount: number;
  notesCount: number;
}> {
  const zip = await JSZip.loadAsync(zipFile);
  const manifestFile = zip.file('workspace_manifest.json');

  if (!manifestFile) {
    throw new Error('Invalid workspace backup: workspace_manifest.json not found in archive');
  }

  const manifestStr = await manifestFile.async('text');
  const manifest: WorkspaceExportData = JSON.parse(manifestStr);

  // Restore folders
  for (const folder of manifest.folders || []) {
    await db.saveFolder(folder);
  }

  // Restore files and blobs
  for (const file of manifest.files || []) {
    let blob: Blob | undefined;
    // Look for matching file in files/ folder
    const matchingKey = Object.keys(zip.files).find((k) => k.startsWith(`files/${file.id}__`));
    if (matchingKey) {
      const fileData = zip.file(matchingKey);
      if (fileData) {
        const arrayBuf = await fileData.async('arraybuffer');
        blob = new Blob([arrayBuf], { type: file.mimeType });
      }
    }
    if (!blob && file.extractedText) {
      blob = new Blob([file.extractedText], { type: file.mimeType || 'text/plain' });
    }
    await db.saveFile(file, blob);
  }

  // Restore projects
  for (const proj of manifest.projects || []) {
    await db.saveProject(proj);
  }

  // Restore tasks
  for (const task of manifest.tasks || []) {
    await db.saveTask(task);
  }

  // Restore notes
  for (const note of manifest.notes || []) {
    await db.saveNote(note);
  }

  // Restore calendar events
  for (const ev of manifest.calendarEvents || []) {
    await db.saveCalendarEvent(ev);
  }

  // Restore AI chats
  for (const chat of manifest.aiChats || []) {
    await db.saveChat(chat);
  }

  // Restore settings if present
  if (manifest.settings) {
    await db.saveSettings(manifest.settings);
  }

  return {
    filesCount: manifest.files?.length || 0,
    projectsCount: manifest.projects?.length || 0,
    tasksCount: manifest.tasks?.length || 0,
    notesCount: manifest.notes?.length || 0,
  };
}

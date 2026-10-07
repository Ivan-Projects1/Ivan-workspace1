import React, { useState, useMemo, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { exportWorkspaceZip, importWorkspaceZip } from '../../services/backup';
import {
  HardDrive,
  Download,
  Upload,
  AlertTriangle,
  FileText,
  Trash2,
  PieChart,
  CheckCircle2,
  Database,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';

export const StorageView: React.FC = () => {
  const { files, deleteFilePermanently, refreshAllData, addToast } = useWorkspace();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeFiles = useMemo(() => files.filter((f) => !f.isTrash), [files]);

  // Byte calculations
  const totalBytes = useMemo(() => {
    return files.reduce((acc, f) => acc + (f.size || 0), 0);
  }, [files]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  // Largest files (top 5)
  const largestFiles = useMemo(() => {
    return [...activeFiles].sort((a, b) => b.size - a.size).slice(0, 5);
  }, [activeFiles]);

  // Breakdown by file type
  const typeBreakdown = useMemo(() => {
    const map: Record<string, { count: number; bytes: number }> = {};
    activeFiles.forEach((f) => {
      const ext = f.extension.toUpperCase() || 'OTHER';
      if (!map[ext]) map[ext] = { count: 0, bytes: 0 };
      map[ext].count++;
      map[ext].bytes += f.size || 0;
    });
    return Object.entries(map).sort((a, b) => b[1].bytes - a[1].bytes);
  }, [activeFiles]);

  // Handle ZIP Export
  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const zipBlob = await exportWorkspaceZip();
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ivan_workspace_backup_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addToast('Workspace ZIP backup successfully generated!', 'success');
    } catch (err: any) {
      addToast(`Backup failed: ${err.message}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle ZIP Import
  const handleImportZip = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const summary = await importWorkspaceZip(file);
      await refreshAllData();
      addToast(
        `Restored ${summary.filesCount} files, ${summary.projectsCount} projects, ${summary.tasksCount} tasks, and ${summary.notesCount} notes!`,
        'success'
      );
    } catch (err: any) {
      addToast(`Restore failed: ${err.message}`, 'error');
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <HardDrive className="w-5 h-5 text-emerald-500" />
          <span>Local Storage & Backup Management</span>
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Monitor your browser's IndexedDB file footprint, largest items, and create portable ZIP backups.
        </p>
      </div>

      {/* Storage Card & Quota Indicator */}
      <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Workspace Footprint
            </span>
            <div className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {formatSize(totalBytes)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {files.length} items ({activeFiles.length} active, {files.length - activeFiles.length} in trash)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip"
              className="hidden"
              onChange={handleImportZip}
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>{isImporting ? 'Restoring...' : 'Restore ZIP'}</span>
            </button>

            <button
              onClick={handleExportZip}
              disabled={isExporting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'Packaging...' : 'Export Backup ZIP'}</span>
            </button>
          </div>
        </div>

        {/* Local Storage Notice Banner */}
        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-200 space-y-1 leading-relaxed">
            <span className="font-bold">Browser Storage Persistence Note:</span>
            <p>
              Your files, notes, tasks, and embeddings are stored inside your browser's private IndexedDB sandbox. If you clear site cache or browsing data, your workspace may be wiped. Export periodic ZIP backups to keep your files permanent and portable!
            </p>
          </div>
        </div>
      </div>

      {/* Two Column Section: Largest Files & File Type Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Largest Files */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Largest Files
          </h3>
          {largestFiles.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No stored files.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {largestFiles.map((f) => (
                <div key={f.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="truncate min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white truncate">
                      {f.name}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize">{f.category}</div>
                  </div>
                  <span className="font-mono text-slate-500 shrink-0">{formatSize(f.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* File Type Breakdown */}
        <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Storage by Format
          </h3>
          {typeBreakdown.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No stored files.</p>
          ) : (
            <div className="space-y-2.5">
              {typeBreakdown.slice(0, 6).map(([ext, data]) => {
                const pct = totalBytes > 0 ? Math.round((data.bytes / totalBytes) * 100) : 0;
                return (
                  <div key={ext} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        .{ext} ({data.count} files)
                      </span>
                      <span className="text-slate-400 text-[11px] font-mono">
                        {formatSize(data.bytes)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

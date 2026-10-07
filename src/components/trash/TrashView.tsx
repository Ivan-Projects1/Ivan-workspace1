import React, { useState, useMemo } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkspaceFile } from '../../types';
import { ConfirmModal } from '../common/ConfirmModal';
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  FileText,
  Search,
} from 'lucide-react';

export const TrashView: React.FC = () => {
  const { files, restoreFile, deleteFilePermanently, emptyTrash } = useWorkspace();

  const [confirmEmptyOpen, setConfirmEmptyOpen] = useState(false);
  const [permanentlyDeletingFile, setPermanentlyDeletingFile] = useState<WorkspaceFile | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const trashedFiles = useMemo(() => {
    return files
      .filter((f) => f.isTrash)
      .filter((f) => (searchQuery ? f.name.toLowerCase().includes(searchQuery.toLowerCase()) : true))
      .sort((a, b) => (b.trashedAt || 0) - (a.trashedAt || 0));
  }, [files, searchQuery]);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            <span>Trash & Recycle Bin</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Items in trash remain locally available until permanently deleted or emptied.
          </p>
        </div>

        {trashedFiles.length > 0 && (
          <button
            onClick={() => setConfirmEmptyOpen(true)}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 self-start sm:self-auto transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span>Empty Trash ({trashedFiles.length})</span>
          </button>
        )}
      </div>

      {/* Trashed items list */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-slate-800">
        {trashedFiles.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-2">
            <Trash2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700" />
            <p className="text-xs">Trash is currently empty.</p>
          </div>
        ) : (
          trashedFiles.map((file) => (
            <div
              key={file.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono font-bold text-xs uppercase">
                  {file.extension || 'FILE'}
                </div>
                <div className="truncate">
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                    {file.name}
                  </h4>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                    <span>{formatSize(file.size)}</span>
                    <span aria-hidden="true">·</span>
                    <span className="capitalize">{file.category.replace('_', ' ')}</span>
                    <span aria-hidden="true">·</span>
                    <span>Trashed {file.trashedAt ? new Date(file.trashedAt).toLocaleDateString() : 'recently'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => restoreFile(file.id)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors"
                  title="Restore file to workspace"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Restore</span>
                </button>

                <button
                  onClick={() => setPermanentlyDeletingFile(file)}
                  className="px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors border border-rose-200 dark:border-rose-900/40"
                  title="Delete permanently from IndexedDB"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={confirmEmptyOpen}
        title="Empty Trash"
        message={`Are you sure you want to permanently delete all ${trashedFiles.length} file(s) in the trash? This action removes all binary blobs from IndexedDB and cannot be undone.`}
        confirmText="Empty All"
        isDestructive={true}
        onConfirm={() => {
          emptyTrash();
          setConfirmEmptyOpen(false);
        }}
        onCancel={() => setConfirmEmptyOpen(false)}
      />

      <ConfirmModal
        isOpen={Boolean(permanentlyDeletingFile)}
        title="Permanent File Deletion"
        message={`Are you sure you want to permanently delete "${permanentlyDeletingFile?.name}"? Its contents will be irreversibly removed from IndexedDB storage.`}
        confirmText="Delete Permanently"
        isDestructive={true}
        onConfirm={() => {
          if (permanentlyDeletingFile) deleteFilePermanently(permanentlyDeletingFile.id);
          setPermanentlyDeletingFile(null);
        }}
        onCancel={() => setPermanentlyDeletingFile(null)}
      />
    </div>
  );
};

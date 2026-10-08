import React, { useState, useMemo, useRef } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { WorkspaceFile, WorkspaceCategory } from '../../types';
import {
  Folder,
  FileText,
  Upload,
  Plus,
  Search,
  Filter,
  Grid,
  List as ListIcon,
  Star,
  Trash2,
  Download,
  Sparkles,
  MoreVertical,
  ChevronRight,
  Edit2,
  FolderPlus,
  CheckSquare,
  Square,
  ArrowUpDown,
  Tag,
  Eye,
} from 'lucide-react';

export const FilesView: React.FC<{ forcedCategory?: WorkspaceCategory; forcedFolderId?: string }> = ({
  forcedCategory,
  forcedFolderId,
}) => {
  const {
    files,
    folders,
    selectedFileIds,
    toggleSelectFile,
    selectAllFiles,
    clearSelectedFiles,
    setActivePreviewFile,
    uploadFiles,
    renameFile,
    toggleFavorite,
    moveFileToTrash,
    downloadFile,
    createFolder,
    deleteFolder,
    createChat,
    setCurrentView,
  } = useWorkspace();

  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(forcedFolderId);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>(forcedCategory || 'all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // New folder modal state
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderCategory, setNewFolderCategory] = useState<WorkspaceCategory>(forcedCategory || 'general');

  // Rename modal state
  const [renamingFile, setRenamingFile] = useState<WorkspaceFile | null>(null);
  const [newFileName, setNewFileName] = useState('');

  // Drag over state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active items (excluding trash)
  const activeFiles = useMemo(() => files.filter((f) => !f.isTrash), [files]);

  // Current folder's subfolders
  const currentSubfolders = useMemo(() => {
    return folders.filter((f) => {
      const matchFolder = currentFolderId ? f.parentId === currentFolderId : !f.parentId;
      const matchCat = forcedCategory ? f.category === forcedCategory : true;
      return matchFolder && matchCat;
    });
  }, [folders, currentFolderId, forcedCategory]);

  // Filtered files in this folder & query
  const filteredFiles = useMemo(() => {
    return activeFiles.filter((f) => {
      // Folder match: if inside a folder, only show folder's files
      if (currentFolderId) {
        if (f.folderId !== currentFolderId) return false;
      } else if (!forcedCategory && !searchQuery) {
        // At root, show files without folder or all if searching
        if (f.folderId) return false;
      }

      // Forced or selected category
      if (forcedCategory && f.category !== forcedCategory) return false;
      if (categoryFilter !== 'all' && f.category !== categoryFilter) return false;

      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesName = f.name.toLowerCase().includes(q);
        const matchesTag = f.tags.some((t) => t.toLowerCase().includes(q));
        const matchesText = f.extractedText ? f.extractedText.toLowerCase().includes(q) : false;
        if (!matchesName && !matchesTag && !matchesText) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortBy === 'size') {
        return sortOrder === 'asc' ? a.size - b.size : b.size - a.size;
      }
      return sortOrder === 'asc' ? a.updatedAt - b.updatedAt : b.updatedAt - a.updatedAt;
    });
  }, [activeFiles, currentFolderId, forcedCategory, categoryFilter, searchQuery, sortBy, sortOrder]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(
        e.dataTransfer.files,
        forcedCategory || (categoryFilter !== 'all' ? (categoryFilter as WorkspaceCategory) : 'general'),
        currentFolderId
      );
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim(), newFolderCategory, currentFolderId);
    setNewFolderName('');
    setIsFolderModalOpen(false);
  };

  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingFile || !newFileName.trim()) return;
    await renameFile(renamingFile.id, newFileName.trim());
    setRenamingFile(null);
  };

  const handleMultiFileAI = () => {
    if (selectedFileIds.length === 0) return;
    const selected = activeFiles.filter((f) => selectedFileIds.includes(f.id));
    const names = selected.map((s) => s.name).join(', ');
    createChat('general', `Please compare and analyze the following ${selected.length} documents: ${names}. Provide key similarities, differences, and a consolidated summary.`, selectedFileIds);
    setCurrentView('ai');
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const currentFolder = folders.find((f) => f.id === currentFolderId);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className="p-4 sm:p-6 lg:p-8 space-y-5 max-w-7xl mx-auto min-h-[calc(100vh-4rem)]"
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            uploadFiles(
              e.target.files,
              forcedCategory || (categoryFilter !== 'all' ? (categoryFilter as WorkspaceCategory) : 'general'),
              currentFolderId
            );
            e.target.value = '';
          }
        }}
      />

      {/* Drag & Drop Overlay Banner */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-emerald-950/80 backdrop-blur-sm border-4 border-dashed border-emerald-400 flex flex-col items-center justify-center text-white pointer-events-none">
          <Upload className="w-16 h-16 text-emerald-400 animate-bounce mb-3" />
          <h2 className="text-2xl font-bold">Drop files here to upload to Ivan Workspace</h2>
          <p className="text-emerald-200 mt-1">Files will be parsed, indexed, and stored in IndexedDB.</p>
        </div>
      )}

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 overflow-x-auto py-1">
          <button
            onClick={() => setCurrentFolderId(undefined)}
            className={`font-semibold hover:text-emerald-500 transition-colors ${!currentFolderId ? 'text-emerald-600 dark:text-emerald-400' : ''}`}
          >
            My Files
          </button>
          {currentFolder && (
            <>
              <ChevronRight className="w-3.5 h-3.5 shrink-0" />
              <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">
                {currentFolder.name}
              </span>
            </>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsFolderModalOpen(true)}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-medium transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-1.5"
          >
            <FolderPlus className="w-3.5 h-3.5 text-slate-500" />
            <span>New Folder</span>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Files</span>
          </button>
        </div>
      </div>

      {/* Multi-Selection Action Toolbar */}
      {selectedFileIds.length > 0 && (
        <div className="p-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>{selectedFileIds.length} document(s) selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleMultiFileAI}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Ask AI / Compare</span>
            </button>
            <button
              onClick={() => {
                selectedFileIds.forEach((id) => moveFileToTrash(id));
                clearSelectedFiles();
              }}
              className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Trash</span>
            </button>
            <button
              onClick={clearSelectedFiles}
              className="px-2 py-1 text-xs text-slate-400 hover:text-white transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search filenames, tags, or contents..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {!forcedCategory && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Domains</option>
              <option value="university">University</option>
              <option value="teaching">Teaching</option>
              <option value="school_admin">School Admin</option>
              <option value="research">Research</option>
              <option value="business">Business</option>
              <option value="software">Software</option>
              <option value="personal">Personal</option>
            </select>
          )}

          <button
            onClick={() => {
              if (sortBy === 'date') setSortBy('name');
              else if (sortBy === 'name') setSortBy('size');
              else setSortBy('date');
            }}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700"
            title={`Sorting by ${sortBy}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span className="capitalize">{sortBy}</span>
          </button>

          <div className="border-l border-slate-200 dark:border-slate-700 h-5 mx-1" />

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title={viewMode === 'grid' ? 'Switch to List' : 'Switch to Grid'}
            aria-label="Toggle view mode"
          >
            {viewMode === 'grid' ? <ListIcon className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Folders Section (if any) */}
      {currentSubfolders.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Folders</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {currentSubfolders.map((folder) => {
              const fileCount = activeFiles.filter((f) => f.folderId === folder.id).length;
              return (
                <div
                  key={folder.id}
                  onClick={() => setCurrentFolderId(folder.id)}
                  className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer flex items-center gap-2.5 group shadow-xs"
                >
                  <Folder className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div className="truncate flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {folder.name}
                    </div>
                    <div className="text-[10px] text-slate-400">{fileCount} files</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Files ({filteredFiles.length})
          </h3>
          {filteredFiles.length > 0 && (
            <button
              onClick={() => {
                if (selectedFileIds.length === filteredFiles.length) clearSelectedFiles();
                else selectAllFiles(filteredFiles);
              }}
              className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
            >
              {selectedFileIds.length === filteredFiles.length ? 'Deselect All' : 'Select All'}
            </button>
          )}
        </div>

        {filteredFiles.length === 0 ? (
          <div className="py-14 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 space-y-3 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">No documents found</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Upload documents or drag and drop files from your computer. Everything is stored securely in IndexedDB.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs inline-flex items-center gap-2 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload Files
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFiles.map((file) => {
              const isSelected = selectedFileIds.includes(file.id);
              return (
                <div
                  key={file.id}
                  onClick={() => setActivePreviewFile(file)}
                  className={`relative p-4 rounded-xl border transition-colors cursor-pointer group flex flex-col justify-between shadow-xs bg-white dark:bg-slate-900 ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Card Top: Checkbox, Badge & Favorite */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectFile(file.id);
                      }}
                      className="p-1 text-slate-400 hover:text-emerald-500 transition-colors"
                      aria-label="Select file"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Square className="w-4 h-4 opacity-50 group-hover:opacity-100" />
                      )}
                    </button>

                    <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
                      {file.extension || 'FILE'}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(file.id);
                      }}
                      className={`p-1 transition-colors ${
                        file.isFavorite ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-400'
                      }`}
                      aria-label="Toggle favorite"
                    >
                      <Star className="w-4 h-4 fill-current" />
                    </button>
                  </div>

                  {/* Card Center: Filename & Snippet */}
                  <div className="space-y-1.5 flex-1 min-h-[56px]">
                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                      {file.name}
                    </h4>
                    {file.extractedText && (
                      <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed font-mono">
                        {file.extractedText.slice(0, 100)}
                      </p>
                    )}
                  </div>

                  {/* Card Bottom: Metadata & Actions */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>{formatSize(file.size)}</span>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          createChat('general', `Please analyze and summarize the document "${file.name}".`, [file.id]);
                          setCurrentView('ai');
                        }}
                        className="p-1 hover:text-emerald-500 transition-colors"
                        title="Ask Ivan AI"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadFile(file);
                        }}
                        className="p-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingFile(file);
                          setNewFileName(file.name);
                        }}
                        className="p-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Rename"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          moveFileToTrash(file.id);
                        }}
                        className="p-1 hover:text-rose-500 transition-colors"
                        title="Move to Trash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-medium">
                  <tr>
                    <th className="p-3 w-8"></th>
                    <th className="p-3">Name</th>
                    <th className="p-3">Domain</th>
                    <th className="p-3">Size</th>
                    <th className="p-3">Modified</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredFiles.map((file) => {
                    const isSelected = selectedFileIds.includes(file.id);
                    return (
                      <tr
                        key={file.id}
                        onClick={() => setActivePreviewFile(file)}
                        className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors ${
                          isSelected ? 'bg-emerald-500/10' : ''
                        }`}
                      >
                        <td className="p-3">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectFile(file.id);
                            }}
                            className="text-slate-400 hover:text-emerald-500"
                            aria-label="Select file"
                          >
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono uppercase text-slate-500 dark:text-slate-400 font-semibold tracking-wider">
                              {file.extension || 'FILE'}
                            </span>
                            <span className="truncate max-w-xs">{file.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-500 capitalize">{file.category.replace('_', ' ')}</td>
                        <td className="p-3 text-slate-400 font-mono">{formatSize(file.size)}</td>
                        <td className="p-3 text-slate-400">
                          {new Date(file.updatedAt).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => {
                                createChat('general', `Please analyze and summarize the document "${file.name}".`, [file.id]);
                                setCurrentView('ai');
                              }}
                              className="p-1 text-slate-400 hover:text-emerald-500 transition-colors"
                              title="Ask AI"
                              aria-label="Ask AI"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => downloadFile(file)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                              title="Download"
                              aria-label="Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveFileToTrash(file.id)}
                              className="p-1 text-slate-400 hover:text-rose-500 transition-colors"
                              title="Trash"
                              aria-label="Trash"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* New Folder Modal */}
      {isFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleCreateFolder}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Create New Folder</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Folder Name</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g., Real Analysis Notes, ICT Proposals"
                  className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Category Domain</label>
                <select
                  value={newFolderCategory}
                  onChange={(e) => setNewFolderCategory(e.target.value as WorkspaceCategory)}
                  className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="university">University</option>
                  <option value="teaching">Teaching</option>
                  <option value="school_admin">School Administration</option>
                  <option value="research">Research</option>
                  <option value="business">Business</option>
                  <option value="software">Software Development</option>
                  <option value="personal">Personal</option>
                  <option value="general">General</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFolderModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Create Folder
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Rename File Modal */}
      {renamingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <form
            onSubmit={handleRenameSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl max-w-md w-full p-6 shadow-xl space-y-4"
          >
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Rename File</h3>
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">File Name</label>
              <input
                type="text"
                required
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="mt-1 w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenamingFile(null)}
                className="px-4 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                Rename
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import {
  X,
  History,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  Search,
  Calendar,
  Code2,
  FolderOpen,
  Plus,
  AlertTriangle,
  Edit2,
  FileCode,
} from 'lucide-react';
import { SavedProgram } from '../utils/programHistory';

interface SavedProgramsModalProps {
  isOpen: boolean;
  onClose: () => void;
  programs: SavedProgram[];
  onOpenProgram: (program: SavedProgram) => void;
  onDeleteProgram: (id: string, name: string) => void;
  onRenameProgram: (id: string, newName: string) => void;
  onDuplicateProgram: (id: string) => void;
  onNewProgramClick: () => void;
  theme?: 'dark' | 'light';
  activeProgramId?: string | null;
}

export const SavedProgramsModal: React.FC<SavedProgramsModalProps> = ({
  isOpen,
  onClose,
  programs,
  onOpenProgram,
  onDeleteProgram,
  onRenameProgram,
  onDuplicateProgram,
  onNewProgramClick,
  theme = 'dark',
  activeProgramId,
}) => {
  const isLight = theme === 'light';

  // Filters & Search
  const [selectedLanguage, setSelectedLanguage] = useState<'all' | 'python' | 'cpp'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Delete Confirmation State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Rename inline state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState('');

  // Filtered Programs
  const filteredPrograms = useMemo(() => {
    return programs.filter((p) => {
      const matchesLang = selectedLanguage === 'all' || p.language === selectedLanguage;
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.statement && p.statement.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesLang && matchesSearch;
    });
  }, [programs, selectedLanguage, searchQuery]);

  const pythonCount = programs.filter((p) => p.language === 'python').length;
  const cppCount = programs.filter((p) => p.language === 'cpp').length;

  if (!isOpen) return null;

  const handleStartRename = (p: SavedProgram) => {
    setRenamingId(p.id);
    setRenameInput(p.name);
  };

  const handleSaveRename = (id: string) => {
    if (renameInput.trim()) {
      onRenameProgram(id, renameInput.trim());
    }
    setRenamingId(null);
  };

  const formatDate = (timestamp: number) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0a1220] border-[#1e3256] text-slate-100'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d172a] border-[#1a2b48]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                isLight ? 'bg-sky-100 border-sky-300 text-sky-700' : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400'
              }`}
            >
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Code History & Saved Programs</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${
                    isLight ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-cyan-950 text-cyan-300 border-cyan-700/50'
                  }`}
                >
                  {programs.length} total
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Organized by Python & C++. Reopen, edit, or manage your programs anytime.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onNewProgramClick();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Save Current Code</span>
              <span className="sm:hidden">Save</span>
            </button>

            <button
              onClick={onClose}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
              }`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search & Language Tabs Bar */}
        <div
          className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
            isLight ? 'bg-slate-100/60 border-slate-200' : 'bg-[#080e1b] border-[#16253e]'
          }`}
        >
          {/* Language filter tabs */}
          <div
            className={`flex items-center p-1 rounded-xl border ${
              isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#050912] border-[#182845]'
            }`}
          >
            <button
              onClick={() => setSelectedLanguage('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedLanguage === 'all'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({programs.length})
            </button>

            <button
              onClick={() => setSelectedLanguage('python')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedLanguage === 'python'
                  ? isLight
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
              <span>Python ({pythonCount})</span>
            </button>

            <button
              onClick={() => setSelectedLanguage('cpp')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedLanguage === 'cpp'
                  ? isLight
                    ? 'bg-white text-blue-800 shadow-xs'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" />
              <span>C++ ({cppCount})</span>
            </button>
          </div>

          {/* Search box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border font-medium outline-hidden transition-all ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
                  : 'bg-[#060c18] border-[#1e2f4f] text-slate-200 focus:border-cyan-400'
              }`}
            />
          </div>
        </div>

        {/* Program List Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {filteredPrograms.length === 0 ? (
            <div
              className={`text-center py-12 px-4 rounded-2xl border ${
                isLight ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-[#080e1b] border-[#15233c] text-slate-400'
              }`}
            >
              <FileCode className="w-10 h-10 mx-auto mb-3 opacity-40 text-cyan-400" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-1">
                {searchQuery ? 'No matching programs found' : 'No saved programs in this category'}
              </h4>
              <p className="text-xs max-w-md mx-auto mb-4">
                {searchQuery
                  ? 'Try searching with different keywords or clear the filter.'
                  : 'Your saved programs and drafts will appear here. Click "Save Current Code" to save your first program!'}
              </p>
              <button
                onClick={() => {
                  onClose();
                  onNewProgramClick();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Save Current Code</span>
              </button>
            </div>
          ) : (
            filteredPrograms.map((p) => {
              const lines = p.code.split('\n');
              const previewLines = lines.slice(0, 3).join('\n');
              const isDeleting = deletingId === p.id;
              const isRenaming = renamingId === p.id;
              const isActive = activeProgramId === p.id;

              return (
                <div
                  key={p.id}
                  className={`rounded-xl border transition-all ${
                    isActive
                      ? isLight
                        ? 'border-sky-400 bg-sky-50/50 shadow-sm ring-1 ring-sky-300'
                        : 'border-cyan-500/60 bg-[#0d1a33]/60 shadow-md shadow-cyan-950/20 ring-1 ring-cyan-500/30'
                      : isLight
                      ? 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-50'
                      : 'border-[#172641] bg-[#070d19]/80 hover:border-[#223963] hover:bg-[#091222]'
                  }`}
                >
                  {/* Card Content */}
                  <div className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        {/* Language Badge */}
                        <span
                          className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold flex items-center gap-1 border ${
                            p.language === 'python'
                              ? isLight
                                ? 'bg-amber-50 text-amber-900 border-amber-300'
                                : 'bg-amber-950/70 text-amber-300 border-amber-600/40'
                              : isLight
                              ? 'bg-blue-50 text-blue-900 border-blue-300'
                              : 'bg-blue-950/70 text-blue-300 border-blue-600/40'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              p.language === 'python' ? 'bg-amber-400' : 'bg-blue-400'
                            }`}
                          />
                          {p.language === 'python' ? 'Python 3' : 'C++ 17'}
                        </span>

                        {/* Title / Inline Rename */}
                        {isRenaming ? (
                          <div className="flex items-center gap-1.5 flex-1 max-w-sm">
                            <input
                              type="text"
                              value={renameInput}
                              onChange={(e) => setRenameInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(p.id);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              autoFocus
                              className={`px-2 py-0.5 rounded text-xs border font-semibold outline-hidden w-full ${
                                isLight
                                  ? 'bg-white border-sky-400 text-slate-900'
                                  : 'bg-[#060c18] border-cyan-400 text-white'
                              }`}
                            />
                            <button
                              onClick={() => handleSaveRename(p.id)}
                              className="px-2 py-0.5 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setRenamingId(null)}
                              className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 text-xs hover:bg-slate-600 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <h3
                              className={`text-sm font-bold tracking-tight ${
                                isLight ? 'text-slate-900' : 'text-slate-100'
                              }`}
                            >
                              {p.name}
                            </h3>
                            <button
                              onClick={() => handleStartRename(p)}
                              title="Rename program"
                              className={`p-1 rounded opacity-60 hover:opacity-100 transition-opacity cursor-pointer ${
                                isLight ? 'hover:bg-slate-200' : 'hover:bg-slate-800'
                              }`}
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            {isActive && (
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                                  isLight
                                    ? 'bg-sky-200 text-sky-900'
                                    : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
                                }`}
                              >
                                Active in Editor
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Timestamp & Line count */}
                      <div
                        className={`flex items-center gap-3 text-xs font-mono ${
                          isLight ? 'text-slate-500' : 'text-slate-400'
                        }`}
                      >
                        <span className="flex items-center gap-1 text-[11px]">
                          <Calendar className="w-3 h-3" />
                          {formatDate(p.updatedAt)}
                        </span>
                        <span className="text-[11px] hidden sm:inline">
                          {lines.length} {lines.length === 1 ? 'line' : 'lines'}
                        </span>
                      </div>
                    </div>

                    {/* Code Snippet Preview */}
                    <div
                      className={`relative font-mono text-[11px] p-2.5 rounded-lg border overflow-x-hidden ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-700'
                          : 'bg-[#050912] border-[#131f33] text-slate-300'
                      }`}
                    >
                      <pre className="overflow-hidden text-ellipsis whitespace-pre line-clamp-3">
                        {previewLines}
                      </pre>
                    </div>

                    {/* Delete Confirmation Banner */}
                    {isDeleting ? (
                      <div
                        className={`mt-3 p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 animate-fade-in ${
                          isLight
                            ? 'bg-rose-50 border-rose-200 text-rose-900'
                            : 'bg-rose-950/40 border-rose-600/50 text-rose-200'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                          <span className="text-xs font-semibold">
                            Delete &ldquo;{p.name}&rdquo;? This cannot be undone.
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              onDeleteProgram(p.id, p.name);
                              setDeletingId(null);
                            }}
                            className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
                          >
                            Yes, Delete
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold border cursor-pointer ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                                : 'bg-[#121c2e] border-slate-700 text-slate-300 hover:bg-slate-800'
                            }`}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Action Buttons */
                      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onDuplicateProgram(p.id)}
                            title="Duplicate program"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              isLight
                                ? 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                                : 'bg-[#0e172a] border-[#1b2b47] hover:bg-[#162540] text-slate-300'
                            }`}
                          >
                            <Copy className="w-3 h-3" />
                            <span>Duplicate</span>
                          </button>

                          <button
                            onClick={() => setDeletingId(p.id)}
                            title="Delete program"
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                              isLight
                                ? 'bg-white border-slate-200 hover:bg-rose-50 hover:border-rose-300 text-rose-600'
                                : 'bg-[#0e172a] border-[#1b2b47] hover:bg-rose-950/40 hover:border-rose-600/40 text-rose-400'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            onOpenProgram(p);
                            onClose();
                          }}
                          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open & Edit</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

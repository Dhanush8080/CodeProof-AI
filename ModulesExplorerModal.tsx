import React, { useState, useMemo } from 'react';
import {
  X,
  Package,
  BookOpen,
  Search,
  Plus,
  Code2,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Sparkles,
} from 'lucide-react';
import { MODULES_DATA, ModuleItem } from '../data/modulesData';

interface ModulesExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'python' | 'cpp';
  onInsertImport: (statement: string, moduleName: string) => void;
  onInsertSnippet: (snippet: string, title: string) => void;
  theme?: 'dark' | 'light';
}

export const ModulesExplorerModal: React.FC<ModulesExplorerModalProps> = ({
  isOpen,
  onClose,
  language: initialLanguage,
  onInsertImport,
  onInsertSnippet,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [selectedLang, setSelectedLang] = useState<'python' | 'cpp'>(initialLanguage);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'module' | 'dictionary'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync with prop when opened
  React.useEffect(() => {
    if (isOpen) {
      setSelectedLang(initialLanguage);
    }
  }, [isOpen, initialLanguage]);

  const filteredItems = useMemo(() => {
    return MODULES_DATA.filter((item) => {
      const matchLang = item.language === selectedLang;
      const matchCat = categoryFilter === 'all' || item.category === categoryFilter;
      const query = searchQuery.trim().toLowerCase();
      const matchSearch =
        query === '' ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.importStatement.toLowerCase().includes(query) ||
        item.popularFunctions.some((f) => f.toLowerCase().includes(query));
      return matchLang && matchCat && matchSearch;
    });
  }, [selectedLang, categoryFilter, searchQuery]);

  if (!isOpen) return null;

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore
    }
  };

  const moduleCount = MODULES_DATA.filter((m) => m.language === selectedLang && m.category === 'module').length;
  const dictCount = MODULES_DATA.filter((m) => m.language === selectedLang && m.category === 'dictionary').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden transition-all ${
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
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Modules & Dictionaries Explorer</h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-mono font-bold border ${
                    isLight ? 'bg-sky-50 text-sky-800 border-sky-300' : 'bg-cyan-950 text-cyan-300 border-cyan-700/50'
                  }`}
                >
                  {selectedLang === 'python' ? 'Python Standard Library' : 'C++ STL & Headers'}
                </span>
              </div>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Insert &lsquo;import&rsquo; statements or complete code snippets directly into your editor with one click.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div
          className={`px-5 py-3 border-b flex flex-wrap items-center justify-between gap-3 ${
            isLight ? 'bg-slate-100/60 border-slate-200' : 'bg-[#080e1b] border-[#16253e]'
          }`}
        >
          {/* Language Switcher */}
          <div
            className={`flex items-center p-1 rounded-xl border ${
              isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#050912] border-[#182845]'
            }`}
          >
            <button
              onClick={() => setSelectedLang('python')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedLang === 'python'
                  ? isLight
                    ? 'bg-white text-amber-900 shadow-xs'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Python</span>
            </button>
            <button
              onClick={() => setSelectedLang('cpp')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedLang === 'cpp'
                  ? isLight
                    ? 'bg-white text-blue-900 shadow-xs'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              <span>C++</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div
            className={`flex items-center p-1 rounded-xl border ${
              isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#050912] border-[#182845]'
            }`}
          >
            <button
              onClick={() => setCategoryFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                categoryFilter === 'all'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              All ({moduleCount + dictCount})
            </button>

            <button
              onClick={() => setCategoryFilter('module')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                categoryFilter === 'module'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Modules ({moduleCount})
            </button>

            <button
              onClick={() => setCategoryFilter('dictionary')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                categoryFilter === 'dictionary'
                  ? isLight
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Dictionaries & Maps ({dictCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${selectedLang === 'python' ? 'math, json, dict, pandas...' : 'vector, map, cmath...'}`}
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

        {/* Modules Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredItems.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40 text-cyan-400" />
              <p className="text-sm font-semibold">No modules or dictionary structures match your query.</p>
              <p className="text-xs text-slate-500 mt-1">Try clearing your search keyword.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col justify-between p-4 rounded-xl border transition-all ${
                  isLight
                    ? 'bg-slate-50/70 border-slate-200 hover:border-sky-300 hover:shadow-xs'
                    : 'bg-[#070d19]/80 border-[#172641] hover:border-[#223963] hover:bg-[#091222]'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold font-mono text-cyan-400 dark:text-cyan-300">
                        {item.name}
                      </h3>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                          item.category === 'dictionary'
                            ? isLight
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-amber-950/60 text-amber-300 border-amber-600/40'
                            : isLight
                            ? 'bg-sky-50 text-sky-800 border-sky-300'
                            : 'bg-cyan-950/60 text-cyan-300 border-cyan-600/40'
                        }`}
                      >
                        {item.category === 'dictionary' ? 'Dictionary / Map' : 'Module'}
                      </span>
                    </div>

                    <button
                      onClick={() => handleCopy(item.id, item.importStatement)}
                      title="Copy import statement"
                      className={`p-1 rounded text-xs transition-colors cursor-pointer ${
                        isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
                      }`}
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <p className={`text-xs mb-3 leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    {item.description}
                  </p>

                  {/* Import Statement Box */}
                  <div
                    className={`font-mono text-xs px-2.5 py-1.5 rounded-lg border mb-3 flex items-center justify-between ${
                      isLight
                        ? 'bg-white border-slate-200 text-sky-900 font-semibold'
                        : 'bg-[#050912] border-[#142138] text-cyan-200'
                    }`}
                  >
                    <code className="truncate">{item.importStatement}</code>
                  </div>

                  {/* Common Functions Chips */}
                  {item.popularFunctions.length > 0 && (
                    <div className="mb-3">
                      <span className={`text-[10px] font-semibold block mb-1 uppercase tracking-wider ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                        Popular Functions & Methods:
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.popularFunctions.map((fn, idx) => (
                          <span
                            key={idx}
                            className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                              isLight
                                ? 'bg-slate-100 border-slate-200 text-slate-700'
                                : 'bg-[#0c1629] border-[#1c2c47] text-slate-300'
                            }`}
                          >
                            {fn}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <button
                    onClick={() => {
                      onInsertSnippet(item.snippet, item.name);
                      onClose();
                    }}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                      isLight
                        ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'
                        : 'bg-[#0d172a] border-[#1d2d48] hover:bg-[#15233e] text-slate-200'
                    }`}
                    title="Insert working sample code into editor"
                  >
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Insert Snippet</span>
                  </button>

                  <button
                    onClick={() => {
                      onInsertImport(item.importStatement, item.name);
                    }}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
                    title="Prepend import statement to editor"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Insert Import</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

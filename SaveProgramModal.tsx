import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  FileCode,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface SaveProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  currentName?: string;
  language: 'python' | 'cpp';
  code: string;
  theme?: 'dark' | 'light';
}

export const SaveProgramModal: React.FC<SaveProgramModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentName = '',
  language,
  code,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setName(currentName || '');
      setError('');
    }
  }, [isOpen, currentName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please provide a name for your program.');
      return;
    }
    onSave(trimmed);
    onClose();
  };

  const linesCount = code.split('\n').length;
  const charsCount = code.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className={`w-full max-w-md rounded-2xl border shadow-2xl overflow-hidden transition-all ${
          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0a1222] border-[#1e3256] text-slate-100'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0d172c] border-[#1b2b48]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                isLight ? 'bg-sky-100 border-sky-300 text-sky-700' : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400'
              }`}
            >
              <Save className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Save Program to History</h3>
              <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Preserve your code and reopen it anytime
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-slate-800 text-slate-400'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Program Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder={`e.g. ${language === 'cpp' ? 'Binary Search Tree' : 'Fibonacci Series Solver'}`}
              autoFocus
              className={`w-full px-3.5 py-2.5 rounded-xl text-sm border font-medium outline-hidden transition-all ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-200'
                  : 'bg-[#060c18] border-[#1e2f4f] text-slate-100 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20'
              }`}
            />
            {error && (
              <p className="mt-1.5 text-xs text-rose-500 flex items-center gap-1 font-medium">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{error}</span>
              </p>
            )}
          </div>

          {/* Metadata preview card */}
          <div
            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
              isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#060d1b] border-[#16253e] text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileCode className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {language === 'cpp' ? 'C++ 17' : 'Python 3'}
              </span>
            </div>
            <div className="font-mono">
              {linesCount} {linesCount === 1 ? 'line' : 'lines'} • {charsCount} chars
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                isLight
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'border-[#1e2f4f] text-slate-300 hover:bg-[#121f36]'
              }`}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 shadow-md shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Program</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

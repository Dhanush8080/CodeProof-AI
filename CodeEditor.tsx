import React, { useRef, useEffect } from 'react';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-python';
import {
  Copy,
  Check,
  RotateCcw,
  Trash2,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  FileCode,
  Save,
  FolderOpen,
  Loader2,
  CheckCircle2,
  Package,
  Activity,
} from 'lucide-react';

interface CodeEditorProps {
  code: string;
  language: 'python' | 'cpp';
  onChange: (newCode: string) => void;
  errorLine: number | null;
  onReset: () => void;
  onClear: () => void;
  theme?: 'dark' | 'light';
  programName?: string;
  onSave?: () => void;
  onOpenHistory?: () => void;
  onOpenModules?: () => void;
  onOpenVisualizer?: () => void;
  onLanguageChange?: (lang: 'python' | 'cpp') => void;
  autoSaveStatus?: 'idle' | 'saving' | 'saved';
  cppStandard?: string;
  onCppStandardChange?: (std: string) => void;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  language,
  onChange,
  errorLine,
  onReset,
  onClear,
  theme = 'dark',
  programName,
  onSave,
  onOpenHistory,
  onOpenModules,
  onOpenVisualizer,
  onLanguageChange,
  autoSaveStatus = 'saved',
  cppStandard = 'c++20',
  onCppStandardChange,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [fontSize, setFontSize] = React.useState(14);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const isLight = theme === 'light';

  // Sync scroll between textarea and pre highlight layer
  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
      preRef.current.scrollTop = e.currentTarget.scrollTop;
      preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Handle Tab key (indent 4 spaces)
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '    ';
      const newCode = code.substring(0, start) + spaces + code.substring(end);
      onChange(newCode);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
      return;
    }

    // Auto close brackets and quotes
    const pairs: Record<string, string> = {
      '(': ')',
      '[': ']',
      '{': '}',
      '"': '"',
      "'": "'",
    };

    if (pairs[e.key]) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const char = e.key;
      const closing = pairs[char];

      // If user selected text, wrap it
      if (start !== end) {
        e.preventDefault();
        const selected = code.substring(start, end);
        const newCode = code.substring(0, start) + char + selected + closing + code.substring(end);
        onChange(newCode);
        setTimeout(() => {
          textarea.selectionStart = start + 1;
          textarea.selectionEnd = end + 1;
        }, 0);
        return;
      }
    }
  };

  const prismLang = language === 'cpp' ? Prism.languages.cpp : Prism.languages.python;
  const highlightedCode = React.useMemo(() => {
    try {
      return Prism.highlight(code || ' ', prismLang || Prism.languages.clike, language);
    } catch {
      return code;
    }
  }, [code, prismLang, language]);

  const lines = code.split('\n');

  // Scroll to error line if requested
  useEffect(() => {
    if (errorLine && textareaRef.current) {
      const lineHeight = fontSize * 1.5;
      const targetScroll = Math.max(0, (errorLine - 4) * lineHeight);
      textareaRef.current.scrollTo({ top: targetScroll, behavior: 'smooth' });
    }
  }, [errorLine, fontSize]);

  return (
    <div
      className={`flex flex-col h-full rounded-xl overflow-hidden shadow-xl transition-colors ${
        isLight
          ? 'bg-white border border-slate-300 shadow-slate-300/40'
          : 'bg-[#0a1120] border border-[#1e293b] shadow-cyan-950/10'
      }`}
    >
      {/* Editor Header Bar */}
      <div
        className={`flex items-center justify-between px-4 py-2.5 border-b select-none transition-colors ${
          isLight
            ? 'bg-slate-100 border-slate-300 text-slate-800'
            : 'bg-[#0d1627] border-[#1e293b]'
        }`}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {onLanguageChange ? (
            <div className="flex items-center gap-1.5">
              <label
                htmlFor="editor-language-select"
                className={`text-xs font-mono font-semibold hidden sm:inline ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                Lang:
              </label>
              <select
                id="editor-language-select"
                value={language}
                onChange={(e) => onLanguageChange(e.target.value as 'python' | 'cpp')}
                className={`text-xs font-mono font-bold px-2 py-1 rounded-md border transition-colors cursor-pointer outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-sky-800 shadow-2xs hover:border-sky-500'
                    : 'bg-[#162540] border-[#24395c] text-cyan-300 hover:border-cyan-400'
                }`}
                aria-label="Editor Language Dropdown"
              >
                <option value="python">Python (main.py)</option>
                <option value="cpp">C++ (main.cpp)</option>
              </select>
            </div>
          ) : (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                isLight
                  ? 'bg-white border-slate-300 text-sky-800 shadow-xs'
                  : 'bg-[#162540] border-[#24395c] text-cyan-300'
              }`}
            >
              <FileCode className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
              <span>{language === 'cpp' ? 'main.cpp' : 'main.py'}</span>
            </div>
          )}

          {language === 'cpp' && onCppStandardChange && (
            <div className="flex items-center gap-1">
              <label
                htmlFor="cpp-std-select"
                className={`text-[11px] font-mono font-semibold hidden sm:inline ${
                  isLight ? 'text-slate-600' : 'text-slate-400'
                }`}
              >
                Std:
              </label>
              <select
                id="cpp-std-select"
                value={cppStandard}
                onChange={(e) => onCppStandardChange(e.target.value)}
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded border transition-colors cursor-pointer outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-sky-800 shadow-2xs hover:border-sky-500'
                    : 'bg-[#0f1d33] border-[#233d6b] text-cyan-300 hover:border-cyan-400'
                }`}
                title="Select G++ compiler language standard (C++20, C++17, C++14, C++11)"
              >
                <option value="c++20">C++20 (Modern)</option>
                <option value="c++17">C++17</option>
                <option value="c++14">C++14</option>
                <option value="c++11">C++11</option>
              </select>
            </div>
          )}

          {programName && (
            <span
              title={programName}
              className={`max-w-[160px] truncate text-xs font-bold font-mono px-2 py-0.5 rounded border hidden md:inline ${
                isLight
                  ? 'bg-sky-50 text-sky-900 border-sky-300'
                  : 'bg-cyan-950/70 text-cyan-200 border-cyan-500/30'
              }`}
            >
              {programName}
            </span>
          )}

          {/* Auto-save Status Indicator */}
          <div className="hidden sm:flex items-center gap-1">
            {autoSaveStatus === 'saving' ? (
              <span className="flex items-center gap-1 text-[11px] font-mono text-amber-500 font-medium animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Saving...</span>
              </span>
            ) : autoSaveStatus === 'saved' ? (
              <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-500 font-medium">
                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                <span>Auto-saved</span>
              </span>
            ) : null}
          </div>

          <span
            className={`text-xs font-mono hidden lg:inline ${
              isLight ? 'text-slate-600 font-medium' : 'text-slate-400'
            }`}
          >
            • {lines.length} {lines.length === 1 ? 'line' : 'lines'}
          </span>

          {errorLine && (
            <div className="flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-rose-950/60 border border-rose-500/40 text-rose-300 animate-pulse">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              <span>Error on Line {errorLine}</span>
            </div>
          )}
        </div>

        {/* Editor controls */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Save Program Button */}
          {onSave && (
            <button
              onClick={onSave}
              title="Save program with custom name"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                isLight
                  ? 'bg-sky-50 text-sky-900 hover:bg-sky-100 border border-sky-300 shadow-2xs'
                  : 'bg-gradient-to-r from-cyan-950 to-blue-950 text-cyan-300 hover:text-white border border-cyan-500/40 hover:border-cyan-400 shadow-xs'
              }`}
            >
              <Save className="w-3.5 h-3.5 text-cyan-400" />
              <span>Save</span>
            </button>
          )}

          {/* History / Saved Programs Button */}
          {onOpenHistory && (
            <button
              onClick={onOpenHistory}
              title="View Code History & Saved Programs"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'bg-[#101b2f] border-[#1f3254] text-slate-300 hover:text-white hover:bg-[#162744]'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">History</span>
            </button>
          )}

          {/* Modules & Dictionaries Explorer Button */}
          {onOpenModules && (
            <button
              onClick={onOpenModules}
              title={`Browse popular ${language === 'cpp' ? 'C++ STL headers and maps' : 'Python standard library modules and dictionaries'}`}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                isLight
                  ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 shadow-2xs'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60 hover:text-white'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Modules</span>
            </button>
          )}

          {/* Visualize DS Button */}
          {onOpenVisualizer && (
            <button
              onClick={onOpenVisualizer}
              title="Visualize lists, dictionaries, vectors & linked lists live in the Visualizer tab"
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
                isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100 shadow-2xs'
                  : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Visualize DS</span>
            </button>
          )}

          <div className={`w-[1px] h-4 mx-1 hidden sm:block ${isLight ? 'bg-slate-300' : 'bg-[#1e293b]'}`} />

          <button
            onClick={() => setFontSize((f) => Math.max(11, f - 1))}
            title="Decrease font size"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
            }`}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span
            className={`text-[11px] font-mono px-1 font-semibold ${
              isLight ? 'text-slate-700' : 'text-slate-400'
            }`}
          >
            {fontSize}px
          </span>
          <button
            onClick={() => setFontSize((f) => Math.min(22, f + 1))}
            title="Increase font size"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
            }`}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>

          <div className={`w-[1px] h-4 mx-1 ${isLight ? 'bg-slate-300' : 'bg-[#1e293b]'}`} />

          <button
            onClick={handleCopy}
            title="Copy code"
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-700 hover:bg-slate-200 hover:text-sky-700'
                : 'text-slate-300 hover:bg-[#1e293b] hover:text-cyan-300'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-600 font-semibold">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={onReset}
            title="Reset to template"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                : 'text-slate-400 hover:bg-[#1e293b] hover:text-slate-200'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onClear}
            title="Clear editor"
            className={`p-1.5 rounded transition-colors cursor-pointer ${
              isLight
                ? 'text-rose-600 hover:bg-rose-100 hover:text-rose-800'
                : 'text-slate-400 hover:bg-rose-950/40 hover:text-rose-300'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 flex overflow-hidden font-mono" style={{ fontSize: `${fontSize}px` }}>
        {/* Line Numbers Gutter */}
        <div
          className={`w-12 border-r py-3 select-none flex flex-col items-end pr-2 overflow-hidden shrink-0 transition-colors ${
            isLight
              ? 'bg-slate-50 border-slate-300 text-slate-500 font-semibold'
              : 'bg-[#090f1d] border-[#192437] text-slate-500'
          }`}
        >
          {lines.map((_, i) => {
            const lineNum = i + 1;
            const isError = errorLine === lineNum;
            return (
              <div
                key={i}
                style={{ height: `${fontSize * 1.5}px`, lineHeight: `${fontSize * 1.5}px` }}
                className={`w-full flex items-center justify-end gap-1 text-[11px] ${
                  isError
                    ? isLight
                      ? 'text-rose-700 font-bold bg-rose-100 -mr-2 pr-2'
                      : 'text-rose-400 font-bold bg-rose-900/30 -mr-2 pr-2'
                    : ''
                }`}
              >
                {isError && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Code Viewport with overlay textarea */}
        <div className={`relative flex-1 h-full overflow-hidden ${isLight ? 'bg-white' : 'bg-[#0a1120]'}`}>
          {/* Highlighted syntax display layer */}
          <pre
            ref={preRef}
            aria-hidden="true"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${fontSize * 1.5}px`,
            }}
            className={`absolute inset-0 m-0 p-3 pointer-events-none overflow-hidden whitespace-pre font-mono transition-colors ${
              isLight ? 'text-slate-900' : 'text-slate-200'
            }`}
            dangerouslySetInnerHTML={{ __html: highlightedCode + '\n' }}
          />

          {/* Interactive Editable Textarea */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            style={{
              fontSize: `${fontSize}px`,
              lineHeight: `${fontSize * 1.5}px`,
            }}
            placeholder={
              language === 'python'
                ? '# Write or paste Python code here...\nprint("Hello, CODEPROOF!")'
                : '// Write or paste C++ code here...\n#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, CODEPROOF!" << endl;\n    return 0;\n}'
            }
            className={`absolute inset-0 w-full h-full p-3 font-mono bg-transparent text-transparent resize-none outline-none overflow-auto whitespace-pre ${
              isLight
                ? 'caret-blue-600 selection:bg-blue-200 selection:text-transparent'
                : 'caret-cyan-400 selection:bg-cyan-500/30 selection:text-transparent'
            }`}
          />
        </div>
      </div>

      {/* Editor Footer / Hotkey Hint */}
      <div
        className={`px-4 py-1.5 border-t flex items-center justify-between text-[11px] transition-colors ${
          isLight
            ? 'bg-slate-100 border-slate-300 text-slate-600'
            : 'bg-[#0a1120] border-[#192437] text-slate-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>Indentation: 4 spaces</span>
          <span>•</span>
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-1.5">
          <kbd
            className={`px-1.5 py-0.5 rounded font-mono text-[10px] border font-bold ${
              isLight
                ? 'bg-white text-sky-800 border-slate-300 shadow-2xs'
                : 'bg-[#162540] text-cyan-300 border-[#24395c]'
            }`}
          >
            Ctrl
          </kbd>
          <span>+</span>
          <kbd
            className={`px-1.5 py-0.5 rounded font-mono text-[10px] border font-bold ${
              isLight
                ? 'bg-white text-sky-800 border-slate-300 shadow-2xs'
                : 'bg-[#162540] text-cyan-300 border-[#24395c]'
            }`}
          >
            Enter
          </kbd>
          <span className={isLight ? 'text-slate-600 ml-0.5' : 'text-slate-400 ml-0.5'}>to Run</span>
        </div>
      </div>
    </div>
  );
};

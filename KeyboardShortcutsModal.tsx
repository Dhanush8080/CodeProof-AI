import React, { useEffect } from 'react';
import {
  Keyboard,
  X,
  Play,
  Terminal,
  Bug,
  Sparkles,
  CornerDownLeft,
  CheckCircle2,
  Info,
  ShieldCheck,
  Save,
} from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'python' | 'cpp';
  theme?: 'dark' | 'light';
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
  language,
  theme = 'dark',
}) => {
  const isLight = theme === 'light';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const shortcuts = [
    {
      keys: ['Ctrl', 'Enter'],
      macKeys: ['⌘', 'Enter'],
      action: 'Run Code in Isolated Sandbox',
      description: 'Executes the active Python or C++ code immediately',
      icon: <Play className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />,
    },
    {
      keys: ['Ctrl', 'S'],
      macKeys: ['⌘', 'S'],
      action: 'Save Program to History',
      description: 'Saves your active code with a custom name to Code History',
      icon: <Save className={`w-3.5 h-3.5 ${isLight ? 'text-cyan-600' : 'text-cyan-400'}`} />,
    },
    {
      keys: ['Tab'],
      macKeys: ['Tab'],
      action: 'Indent with 4 spaces',
      description: 'Inserts clean 4-space indentation without losing editor focus',
      icon: <CornerDownLeft className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />,
    },
    {
      keys: ['(', '[', '{', '"'],
      macKeys: ['(', '[', '{', '"'],
      action: 'Auto-Close Pairs',
      description: 'Automatically inserts matching closing brackets and quotes',
      icon: <Terminal className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />,
    },
    {
      keys: ['?'],
      macKeys: ['?'],
      action: 'Toggle Shortcuts & Help',
      description: 'Opens or closes this quick reference guide anytime',
      icon: <Keyboard className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />,
    },
    {
      keys: ['Esc'],
      macKeys: ['Esc'],
      action: 'Close Modal',
      description: 'Dismisses any open overlay or help panel',
      icon: <X className="w-3.5 h-3.5 text-slate-400" />,
    },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className={`w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col border transition-colors ${
          isLight
            ? 'bg-white border-slate-300 shadow-slate-300/60 text-slate-900'
            : 'bg-[#091122] border-[#1e3256] shadow-cyan-950/40 text-slate-100'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#0d182e] border-[#1c2e4e]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border shadow-sm ${
                isLight
                  ? 'bg-sky-100 border-sky-300 text-sky-700'
                  : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400'
              }`}
            >
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-headline" className="text-sm font-bold tracking-wide font-mono">
                Keyboard Shortcuts & Guide
              </h3>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Quick reference for fast coding in CODEPROOF AI
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isLight
                ? 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#1a2b4a]'
            }`}
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto max-h-[75vh] flex flex-col gap-4 text-xs">
          {/* Shortcuts Table */}
          <div className="flex flex-col gap-2">
            <span
              className={`text-[11px] font-bold font-mono uppercase tracking-wider ${
                isLight ? 'text-sky-800 font-extrabold' : 'text-cyan-400'
              }`}
            >
              Keyboard Shortcuts
            </span>

            <div className="grid grid-cols-1 gap-2">
              {shortcuts.map((item, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-colors ${
                    isLight
                      ? 'bg-slate-50 border-slate-200 hover:border-sky-400'
                      : 'bg-[#060b17] border-[#192a47] hover:border-cyan-500/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-1.5 rounded-lg border ${
                        isLight
                          ? 'bg-white border-slate-200 shadow-2xs'
                          : 'bg-[#0e1b33] border-[#1e3358]'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div>
                      <div className={`font-semibold text-xs ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                        {item.action}
                      </div>
                      <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {item.description}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-3">
                    {item.keys.map((key, kIndex) => (
                      <React.Fragment key={kIndex}>
                        <kbd
                          className={`px-2 py-1 rounded-md font-mono text-[11px] font-bold border shadow-2xs ${
                            isLight
                              ? 'bg-white text-sky-800 border-slate-300'
                              : 'bg-[#13233f] text-cyan-300 border-[#233d6b]'
                          }`}
                        >
                          {key}
                        </kbd>
                        {kIndex < item.keys.length - 1 && (
                          <span className={isLight ? 'text-slate-400 font-mono' : 'text-slate-500 font-mono'}>
                            +
                          </span>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Beginner Guide Box */}
          <div
            className={`p-4 rounded-xl border flex flex-col gap-2.5 ${
              isLight
                ? 'bg-sky-50 border-sky-200 text-sky-950'
                : 'bg-gradient-to-br from-[#0b162b] to-[#0d1d38] border-cyan-500/30 text-slate-300'
            }`}
          >
            <div className={`flex items-center gap-2 font-bold ${isLight ? 'text-sky-900' : 'text-cyan-300'}`}>
              <Sparkles className={`w-4 h-4 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
              <span>Beginner Tips for {language === 'cpp' ? 'C++' : 'Python'}</span>
            </div>

            <ul className="space-y-1.5 text-[11px] leading-relaxed">
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span>
                  <strong>Interactive Input:</strong> If your code uses{' '}
                  <code className={`font-mono font-bold ${isLight ? 'text-sky-800' : 'text-cyan-300'}`}>
                    {language === 'cpp' ? 'cin >>' : 'input()'}
                  </code>
                  , the program pauses and asks for your input. Type your value and press Enter.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span>
                  <strong>1-Click AI Error Fix:</strong> If you see red or error output, click{' '}
                  <strong>Fix Error</strong> or <strong>Solve with AI</strong>. The AI identifies the exact line, explains why, and provides a <strong>Fix Code</strong> button.
                </span>
              </li>
              <li className="flex items-start gap-1.5">
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
                <span>
                  <strong>Line-by-Line Explanation:</strong> Click <strong>Explain Code</strong> in the header anytime to understand how each variable and loop functions.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t text-xs ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#0d182e] border-[#1c2e4e]'
          }`}
        >
          <div className={`flex items-center gap-1.5 text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            <ShieldCheck className={`w-3.5 h-3.5 ${isLight ? 'text-emerald-600' : 'text-emerald-400'}`} />
            <span>Isolated Execution • Zero local host execution</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

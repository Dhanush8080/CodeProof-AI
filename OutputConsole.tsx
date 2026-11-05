import React, { useState, useEffect, useRef } from 'react';
import {
  Terminal,
  Play,
  RotateCcw,
  Square,
  Loader2,
  Trash2,
  Bug,
  Keyboard,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Copy,
  Check,
  Send,
  Layers,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Clock,
  CornerDownLeft,
  FileText,
  Edit3,
  ListOrdered,
  Database,
} from 'lucide-react';
import { DataStructureVisualizer } from './DataStructureVisualizer';

export type ExecutionState = 'idle' | 'running' | 'waiting_for_input' | 'completed' | 'error';

export interface CompilerInfo {
  gpp: {
    available: boolean;
    version: string | null;
    fullVersion: string | null;
    path: string | null;
    supportedStandards: string[];
  };
  python: {
    available: boolean;
    version: string | null;
    fullVersion: string | null;
  };
}

export interface OutputConsoleProps {
  output: string;
  stderr: string;
  stdin: string;
  onStdinChange: (val: string) => void;
  executionState: ExecutionState;
  hasError: boolean;
  errorType: 'compile' | 'runtime' | 'sandbox_service' | null;
  exitCode: number | null;
  executionTime: string | null;
  onRun: () => void;
  onClear: () => void;
  onSolveError: () => void;
  onStop: () => void;
  language: 'python' | 'cpp';

  // Interactive input props
  currentPrompt: string;
  onSendInput: (val: string) => void;
  inputHistory: string[];
  onResetInputs: () => void;

  theme?: 'dark' | 'light';
  cppStandard?: string;
  code?: string;
  onHighlightLine?: (line: number) => void;
  onLoadPreset?: (code: string, language: 'python' | 'cpp') => void;
  activeTab?: 'output' | 'input' | 'visualizer' | 'errors';
  onTabChange?: (tab: 'output' | 'input' | 'visualizer' | 'errors') => void;
  compilerInfo?: CompilerInfo | null;
}

export const OutputConsole: React.FC<OutputConsoleProps> = ({
  output,
  stderr,
  stdin,
  onStdinChange,
  executionState,
  hasError,
  errorType,
  exitCode,
  executionTime,
  onRun,
  onClear,
  onSolveError,
  onStop,
  language,
  currentPrompt,
  onSendInput,
  inputHistory,
  onResetInputs,
  theme = 'dark',
  cppStandard = 'c++20',
  code = '',
  onHighlightLine,
  onLoadPreset,
  activeTab: controlledActiveTab,
  onTabChange,
  compilerInfo,
}) => {
  const isLight = theme === 'light';

  // Main Navigation: Separate Input, Output, Visualizer and Errors tabs
  const [internalTab, setInternalTab] = useState<'output' | 'input' | 'visualizer' | 'errors'>('output');
  const activeTab = controlledActiveTab ?? internalTab;
  const setActiveTab = (tab: 'output' | 'input' | 'visualizer' | 'errors') => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  // Input states
  const [largeInputValue, setLargeInputValue] = useState('');
  const [inlineInputValue, setInlineInputValue] = useState('');
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Refs for scrolling and auto-focus
  const terminalScrollRef = useRef<HTMLDivElement>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const inlineInputRef = useRef<HTMLInputElement>(null);
  const largeInputRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledUpRef = useRef(false);

  // When error occurs, highlight errors tab
  useEffect(() => {
    if (executionState === 'error' && stderr.trim().length > 0) {
      if (!output.trim()) {
        setActiveTab('errors');
      }
    }
  }, [executionState, stderr, output]);

  // Focus input when waiting for input
  useEffect(() => {
    if (executionState === 'waiting_for_input') {
      setTimeout(() => {
        if (activeTab === 'input') {
          largeInputRef.current?.focus();
        } else {
          inlineInputRef.current?.focus();
        }
      }, 60);
    }
  }, [executionState, activeTab, currentPrompt]);

  // Handle user scrolling backwards in terminal
  const handleTerminalScroll = () => {
    if (!terminalScrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = terminalScrollRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    userScrolledUpRef.current = !isAtBottom;
  };

  // Auto-scroll to bottom of terminal unless user scrolled backwards
  useEffect(() => {
    if (!userScrolledUpRef.current) {
      terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [output, executionState, inputHistory]);

  const hasContent = output.trim().length > 0 || stderr.trim().length > 0 || inputHistory.length > 0;
  const isCompileError = errorType === 'compile';

  // Copy entire output
  const handleCopy = async () => {
    try {
      const fullText = stderr ? `${output}\n${stderr}` : output;
      await navigator.clipboard.writeText(fullText || '');
      setCopiedOutput(true);
      setTimeout(() => setCopiedOutput(false), 2000);
    } catch {
      // ignore
    }
  };

  // Submit input from the Large Input panel
  const handleSendLargeInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!largeInputValue && largeInputValue !== '') return;

    userScrolledUpRef.current = false;
    onSendInput(largeInputValue);
    setLargeInputValue('');
  };

  // Submit input from the inline bar on Output tab
  const handleSendInlineInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inlineInputValue && inlineInputValue !== '') return;

    userScrolledUpRef.current = false;
    onSendInput(inlineInputValue);
    setInlineInputValue('');
  };

  // Extract possible line number from stderr
  const pyLineMatch = stderr.match(/line (\d+)/i);
  const cppLineMatch = stderr.match(/:(\d+):(?:\d+:)? (?:error|warning):/i);
  const errorLineNumber = pyLineMatch
    ? parseInt(pyLineMatch[1], 10)
    : cppLineMatch
    ? parseInt(cppLineMatch[1], 10)
    : null;

  return (
    <div
      className={`w-full rounded-xl overflow-hidden flex flex-col shadow-2xl transition-colors ${
        isLight
          ? 'bg-white border border-slate-300 shadow-slate-300/40 text-slate-900'
          : 'bg-[#070d19] border border-[#1b2b48] shadow-cyan-950/20 text-slate-100'
      } ${isExpanded ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)] max-w-none' : ''}`}
    >
      {/* ==================== 1. TERMINAL HEADER ==================== */}
      <div
        className={`flex flex-wrap items-center justify-between px-3.5 py-2.5 border-b gap-2 select-none transition-colors ${
          isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-[#0a1324] border-[#1b2d4c]'
        }`}
      >
        {/* Left: Window Dots, Language, & Clear Execution State */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 mr-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block border border-rose-400/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block border border-amber-400/40" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block border border-emerald-400/40" />
          </div>

          <div
            className={`flex items-center gap-1.5 text-xs font-mono font-bold ${
              isLight ? 'text-slate-800' : 'text-slate-200'
            }`}
          >
            <Terminal className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
            <span>IDE TERMINAL</span>
          </div>

          <span
            className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-semibold border ${
              isLight
                ? language === 'cpp' && compilerInfo && !compilerInfo.gpp.available
                  ? 'bg-rose-50 border-rose-300 text-rose-800 shadow-2xs'
                  : 'bg-white border-slate-300 text-sky-800 shadow-2xs'
                : language === 'cpp' && compilerInfo && !compilerInfo.gpp.available
                ? 'bg-rose-950/70 border-rose-500/40 text-rose-300'
                : 'bg-[#112038] border-cyan-500/30 text-cyan-300'
            }`}
          >
            {language === 'cpp'
              ? compilerInfo?.gpp.available && compilerInfo.gpp.version
                ? `C++ ${cppStandard.replace('c++', '').toUpperCase()} (G++ ${compilerInfo.gpp.version})`
                : compilerInfo && !compilerInfo.gpp.available
                ? `C++ ${cppStandard.replace('c++', '').toUpperCase()} (G++ Unavailable)`
                : `C++ ${cppStandard.replace('c++', '').toUpperCase()}`
              : compilerInfo?.python.available && compilerInfo.python.version
              ? `Python ${compilerInfo.python.version} (Modules)`
              : 'Python (Modules)'}
          </span>

          {/* If G++ is confirmed unavailable and language is cpp, show alert banner badge */}
          {language === 'cpp' && compilerInfo && !compilerInfo.gpp.available && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-rose-950/80 border border-rose-500/50 text-rose-300 animate-pulse">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
              <span>G++ Missing</span>
            </div>
          )}

          {/* Execution States: Running, Waiting for Your Input, Completed, Error, Idle */}
          {executionState === 'running' && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono border animate-pulse ${
                isLight
                  ? 'bg-sky-100 border-sky-400 text-sky-950 font-bold'
                  : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-300'
              }`}
            >
              <Loader2 className={`w-3 h-3 animate-spin ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
              <span>Running...</span>
            </div>
          )}

          {executionState === 'waiting_for_input' && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono border shadow-sm animate-pulse ${
                isLight
                  ? 'bg-amber-100 border-amber-500 text-amber-950 font-bold shadow-amber-300/40'
                  : 'bg-amber-950/90 border-amber-500/70 text-amber-300 shadow-amber-500/20'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
              <Keyboard className={`w-3.5 h-3.5 ${isLight ? 'text-amber-700' : 'text-amber-400'}`} />
              <span className="font-bold tracking-wide">Waiting for Your Input</span>
            </div>
          )}

          {executionState === 'completed' && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono border ${
                isLight
                  ? 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold'
                  : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              }`}
            >
              <CheckCircle2 className={`w-3 h-3 ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`} />
              <span>Completed (Exit 0)</span>
            </div>
          )}

          {executionState === 'error' && (
            <div
              className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-mono border ${
                isLight
                  ? 'bg-rose-100 border-rose-500 text-rose-950 font-bold'
                  : 'bg-rose-950/90 border-rose-500/60 text-rose-300'
              }`}
            >
              <XCircle className={`w-3 h-3 ${isLight ? 'text-rose-700' : 'text-rose-400'}`} />
              <span>Error {exitCode !== null ? `(Exit ${exitCode})` : ''}</span>
            </div>
          )}

          {executionState === 'idle' && (
            <span className={`text-[11px] font-mono ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
              Idle
            </span>
          )}
        </div>

        {/* Right: Controls (Run Again, Stop, Clear, Copy, Expand) */}
        <div className="flex items-center gap-1.5">
          {/* Stop Button (Active while Running or Waiting for Input) */}
          {(executionState === 'running' || executionState === 'waiting_for_input') && (
            <button
              onClick={onStop}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold shadow-sm transition-all cursor-pointer animate-pulse border ${
                isLight
                  ? 'bg-rose-100 border-rose-400 hover:bg-rose-200 text-rose-900'
                  : 'bg-rose-950/90 border-rose-500/60 hover:bg-rose-900 text-rose-200'
              }`}
              title="Stop ongoing program execution"
            >
              <Square className={`w-3 h-3 ${isLight ? 'fill-rose-700' : 'fill-rose-300'}`} />
              <span>Stop</span>
            </button>
          )}

          {/* Run Again Button */}
          <button
            onClick={onRun}
            disabled={executionState === 'running'}
            className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-50"
            title="Start fresh execution without automatic inputs (Ctrl+Enter)"
          >
            {executionState === 'running' ? (
              <Loader2 className="w-3 h-3 animate-spin text-slate-950" />
            ) : (
              <RotateCcw className="w-3 h-3 text-slate-950" />
            )}
            <span>Run Again</span>
          </button>

          {/* Clear Console Button */}
          <button
            onClick={onClear}
            disabled={!hasContent && !largeInputValue && !inlineInputValue}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer disabled:opacity-40 border ${
              isLight
                ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-2xs'
                : 'bg-[#0e1b30] border-[#20375b] hover:bg-[#162c4e] text-slate-300 hover:text-white'
            }`}
            title="Clear terminal output, error logs and inputs"
          >
            <Trash2 className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
            <span className="hidden sm:inline">Clear Console</span>
          </button>

          {/* Copy Output Button */}
          {hasContent && (
            <button
              onClick={handleCopy}
              className={`p-1.5 rounded-md transition-colors cursor-pointer border ${
                isLight
                  ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-2xs'
                  : 'bg-[#0e1b30] border-[#20375b] hover:bg-[#162c4e] text-slate-300 hover:text-white'
              }`}
              title="Copy terminal output"
            >
              {copiedOutput ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* Visualize DS Quick Button */}
          <button
            onClick={() => setActiveTab('visualizer')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
              activeTab === 'visualizer'
                ? isLight
                  ? 'bg-sky-100 border-sky-400 text-sky-900 font-bold'
                  : 'bg-cyan-950 border-cyan-500 text-cyan-300 font-bold'
                : isLight
                ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-2xs'
                : 'bg-[#0e1b30] border-[#20375b] hover:bg-[#162c4e] text-slate-300 hover:text-white'
            }`}
            title="Open real-time data structure visualizer"
          >
            <Database className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
            <span className="hidden sm:inline">Visualize DS</span>
          </button>

          {/* Maximize / Restore Toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-1.5 rounded-md transition-colors cursor-pointer border ${
              isLight
                ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700 hover:text-slate-900 shadow-2xs'
                : 'bg-[#0e1b30] border-[#20375b] hover:bg-[#162c4e] text-slate-400 hover:text-slate-200'
            }`}
            title={isExpanded ? 'Restore normal view' : 'Maximize terminal'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ==================== 2. SEPARATE INPUT & OUTPUT TABS ==================== */}
      <div
        className={`flex flex-wrap items-center justify-between px-3.5 py-1.5 border-b text-xs font-mono transition-colors ${
          isLight ? 'bg-slate-50 border-slate-300' : 'bg-[#08101e] border-[#182845]'
        }`}
      >
        <div className="flex items-center gap-1.5">
          {/* Output Tab */}
          <button
            onClick={() => setActiveTab('output')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'output'
                ? isLight
                  ? 'bg-white text-sky-800 border border-sky-400 shadow-2xs font-bold'
                  : 'bg-[#10223d] text-cyan-300 border border-cyan-500/40 shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c182b]'
            }`}
          >
            <Terminal className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
            <span>Output</span>
            {output.trim().length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            )}
          </button>

          {/* Input Tab */}
          <button
            onClick={() => setActiveTab('input')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'input'
                ? isLight
                  ? 'bg-white text-sky-800 border border-sky-400 shadow-2xs font-bold'
                  : 'bg-[#10223d] text-cyan-300 border border-cyan-500/40 shadow-xs'
                : executionState === 'waiting_for_input'
                ? isLight
                  ? 'bg-amber-100 text-amber-900 border border-amber-400 font-bold animate-pulse'
                  : 'bg-amber-950/60 text-amber-300 border border-amber-500/50 animate-pulse'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c182b]'
            }`}
          >
            <Keyboard className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
            <span>Input</span>
            {executionState === 'waiting_for_input' ? (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider animate-bounce ${
                  isLight ? 'bg-amber-500 text-white' : 'bg-amber-500 text-slate-950'
                }`}
              >
                Required
              </span>
            ) : inputHistory.length > 0 ? (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] border ${
                  isLight
                    ? 'bg-slate-200 text-slate-800 border-slate-300'
                    : 'bg-cyan-950 text-cyan-300 border-cyan-500/30'
                }`}
              >
                {inputHistory.length}
              </span>
            ) : null}
          </button>

          {/* Visualizer Tab */}
          <button
            onClick={() => setActiveTab('visualizer')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'visualizer'
                ? isLight
                  ? 'bg-white text-sky-800 border border-sky-400 shadow-2xs font-bold'
                  : 'bg-[#10223d] text-cyan-300 border border-cyan-500/40 shadow-xs'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c182b]'
            }`}
          >
            <Database className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
            <span>Visualizer</span>
            <span
              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                isLight ? 'bg-sky-100 text-sky-800' : 'bg-cyan-950 text-cyan-300 border border-cyan-500/30'
              }`}
            >
              DS
            </span>
          </button>

          {/* Errors Tab */}
          <button
            onClick={() => setActiveTab('errors')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'errors'
                ? isLight
                  ? 'bg-rose-100 text-rose-900 border border-rose-400 shadow-2xs font-bold'
                  : 'bg-rose-950/80 text-rose-300 border border-rose-500/50 shadow-xs'
                : executionState === 'error'
                ? isLight
                  ? 'text-rose-700 bg-rose-50 border border-rose-300 animate-pulse'
                  : 'text-rose-400 bg-rose-950/40 border border-rose-500/40 animate-pulse'
                : isLight
                ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                : 'text-slate-400 hover:text-slate-200 hover:bg-[#0c182b]'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
            <span>Errors</span>
            {stderr.trim().length > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  isLight ? 'bg-rose-600 text-white' : 'bg-rose-900 text-rose-200'
                }`}
              >
                1
              </span>
            )}
          </button>
        </div>

        {/* Right Tab Metrics */}
        <div className={`flex items-center gap-3 text-[11px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
          {inputHistory.length > 0 && (
            <div className="flex items-center gap-1">
              <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Inputs Sent:</span>
              <span className={`font-bold font-mono ${isLight ? 'text-sky-800' : 'text-cyan-300'}`}>
                {inputHistory.length}
              </span>
              <button
                onClick={onResetInputs}
                className={`text-[10px] underline ml-1 cursor-pointer ${
                  isLight ? 'text-slate-600 hover:text-sky-700' : 'text-slate-400 hover:text-cyan-300'
                }`}
                title="Reset input history and restart session"
              >
                Reset
              </button>
            </div>
          )}

          {executionTime && (
            <div className="flex items-center gap-1">
              <Clock className={`w-3 h-3 ${isLight ? 'text-slate-600' : 'text-slate-500'}`} />
              <span className="font-semibold">{executionTime}</span>
            </div>
          )}
        </div>
      </div>

      {/* ==================== 3. TAB CONTENT PANELS ==================== */}
      <div
        className={`overflow-hidden flex flex-col transition-colors ${
          isLight ? 'bg-[#fafafa]' : 'bg-[#050914]'
        } ${isExpanded ? 'flex-1' : activeTab === 'visualizer' ? 'h-[360px]' : 'h-[240px]'}`}
      >
        {/* TAB 1: OUTPUT PANEL */}
        {activeTab === 'output' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Terminal Stream Display */}
            <div
              ref={terminalScrollRef}
              onScroll={handleTerminalScroll}
              className={`flex-1 p-3.5 overflow-y-auto font-mono text-[12.5px] leading-relaxed select-text ${
                isLight ? 'bg-white' : 'bg-[#050914]'
              }`}
            >
              {/* Output Content */}
              {output ? (
                <div
                  className={`whitespace-pre-wrap leading-relaxed font-mono ${
                    isLight ? 'text-slate-900 font-medium' : 'text-slate-100'
                  }`}
                >
                  {output.split('\n').map((line, idx) => {
                    // Visually distinguish user inputs
                    if (line.startsWith('➜ [input]:')) {
                      return (
                        <div
                          key={idx}
                          className={`my-1 px-2.5 py-1 rounded font-semibold flex items-center gap-2 border ${
                            isLight
                              ? 'bg-sky-50 border-sky-300 text-sky-950 shadow-2xs'
                              : 'bg-[#0b172a] border-cyan-500/40 text-cyan-300'
                          }`}
                        >
                          <span className={`font-bold text-xs ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}>
                            ➜ USER INPUT:
                          </span>
                          <span className={`font-mono ${isLight ? 'text-slate-900 font-bold' : 'text-white'}`}>
                            {line.replace('➜ [input]:', '').trim()}
                          </span>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={idx}
                        className={isLight ? 'text-emerald-900 font-semibold' : 'text-emerald-300/90 hover:text-emerald-200'}
                      >
                        {line}
                      </div>
                    );
                  })}
                </div>
              ) : executionState === 'running' && !output ? (
                <div className={`h-full py-12 flex flex-col items-center justify-center gap-2 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <p className="text-xs font-semibold">Program running... waiting for execution output or input requests.</p>
                </div>
              ) : executionState === 'error' && !output ? (
                <div className="h-full py-8 flex flex-col items-center justify-center gap-2 text-center">
                  <AlertTriangle className={`w-6 h-6 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
                  <p className={`text-xs font-semibold ${isLight ? 'text-rose-900' : 'text-rose-300'}`}>
                    Execution produced an error.
                  </p>
                  <button
                    onClick={() => setActiveTab('errors')}
                    className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer border ${
                      isLight
                        ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                        : 'bg-[#10223d] border-rose-500/40 text-rose-300'
                    }`}
                  >
                    View Error Details →
                  </button>
                </div>
              ) : executionState === 'idle' ? (
                <div className="h-full py-10 flex flex-col items-center justify-center gap-1.5 text-center select-none">
                  <Terminal className={`w-7 h-7 mb-1 ${isLight ? 'text-slate-400' : 'text-slate-600'}`} />
                  <p className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                    Interactive IDE Terminal • {language === 'cpp' ? 'C++ 17 GCC' : 'Python 3.10'}
                  </p>
                  <p className={`text-[11px] max-w-md ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                    No automatic values will be fed. The program will pause and wait for your manual input whenever required.
                    Click "Run Again" or press{' '}
                    <kbd
                      className={`px-1 py-0.5 rounded font-mono font-bold ${
                        isLight ? 'bg-slate-200 text-sky-800' : 'bg-[#101b2f] text-cyan-300'
                      }`}
                    >
                      Ctrl+Enter
                    </kbd>
                    .
                  </p>
                </div>
              ) : null}

              {/* Waiting for Input Banner Inside Terminal Output */}
              {executionState === 'waiting_for_input' && (
                <div
                  className={`mt-3 p-3 rounded-lg border shadow-lg flex flex-wrap items-center justify-between gap-2 text-xs animate-fade-in ${
                    isLight
                      ? 'bg-amber-50 border-amber-400 text-amber-950 font-medium'
                      : 'bg-[#0d1c36] border-amber-500/70 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
                    <span className={`font-bold ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
                      Waiting for Your Input:
                    </span>
                    <span
                      className={`font-mono font-bold px-2 py-0.5 rounded border ${
                        isLight
                          ? 'bg-white text-sky-900 border-amber-300 shadow-2xs'
                          : 'bg-[#070e1b] text-cyan-300 border-cyan-500/30'
                      }`}
                    >
                      {currentPrompt || (language === 'cpp' ? 'cin >>' : 'input()')}
                    </span>
                  </div>
                  <span className={`text-[11px] ${isLight ? 'text-slate-600 font-semibold' : 'text-slate-400'}`}>
                    Enter value below and press Enter ↵
                  </span>
                </div>
              )}

              {/* Error highlight inside Output panel */}
              {stderr && (
                <div
                  className={`mt-3 p-3 rounded-lg border shadow-md space-y-2 ${
                    isLight
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-[#200d14] border-rose-500/50 text-rose-200'
                  }`}
                >
                  <div className={`flex items-center justify-between text-xs pb-1 border-b ${isLight ? 'border-rose-200' : 'border-rose-900/40'}`}>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <XCircle className={`w-3.5 h-3.5 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
                      <span>{isCompileError ? 'Compilation Error' : 'Runtime Exception'}</span>
                      {errorLineNumber && (
                        <span
                          className={`px-1.5 py-0.2 rounded font-mono text-[10px] border ${
                            isLight
                              ? 'bg-white text-rose-800 border-rose-300 font-bold'
                              : 'bg-rose-900/60 text-rose-200 border-rose-500/30'
                          }`}
                        >
                          Line {errorLineNumber}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={onSolveError}
                      className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
                    >
                      <Bug className="w-3 h-3 text-white" />
                      <span>Solve with AI</span>
                    </button>
                  </div>
                  <pre
                    className={`text-xs font-mono whitespace-pre-wrap leading-relaxed select-text ${
                      isLight ? 'text-rose-900 font-medium' : 'text-rose-200'
                    }`}
                  >
                    {stderr}
                  </pre>
                </div>
              )}

              <div ref={terminalBottomRef} />
            </div>

            {/* Quick-Action Inline Input Bar on Output Tab */}
            <form
              onSubmit={handleSendInlineInput}
              className={`flex items-center gap-2 px-3 py-2 border-t transition-all ${
                executionState === 'waiting_for_input'
                  ? isLight
                    ? 'bg-amber-50/80 border-amber-400 shadow-md'
                    : 'bg-[#0c1a33] border-cyan-500/70 shadow-lg'
                  : isLight
                  ? 'bg-slate-100 border-slate-300'
                  : 'bg-[#08101e] border-[#182845]'
              }`}
            >
              <div className="flex items-center gap-1.5 text-xs shrink-0 font-mono">
                <CornerDownLeft className={`w-3.5 h-3.5 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
                <span
                  className={`font-bold transition-colors ${
                    executionState === 'waiting_for_input'
                      ? isLight
                        ? 'text-amber-900 font-extrabold animate-pulse'
                        : 'text-cyan-300 animate-pulse'
                      : isLight
                      ? 'text-slate-700'
                      : 'text-slate-400'
                  }`}
                >
                  {language === 'cpp' ? 'cin >>' : 'input()'}:
                </span>
              </div>

              <input
                ref={inlineInputRef}
                type="text"
                value={inlineInputValue}
                onChange={(e) => setInlineInputValue(e.target.value)}
                disabled={executionState === 'completed' || executionState === 'error'}
                placeholder={
                  executionState === 'waiting_for_input'
                    ? `Waiting for your input: ${currentPrompt || 'type here and press Enter'}...`
                    : executionState === 'running'
                    ? 'Program is running... you can type next input ahead'
                    : 'Click Run Again to start interactive session'
                }
                className={`flex-1 px-3 py-1.5 rounded-md text-xs font-mono transition-all focus:outline-none ${
                  executionState === 'waiting_for_input'
                    ? isLight
                      ? 'bg-white border-2 border-amber-500 text-slate-900 placeholder-amber-700/60 ring-2 ring-amber-300/40 font-semibold'
                      : 'bg-[#050b17] border border-cyan-400 ring-1 ring-cyan-400/50 text-cyan-100 placeholder-cyan-500/60'
                    : isLight
                    ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                    : 'bg-[#050a14] border border-[#1b2b46] text-slate-200 placeholder-slate-500 focus:border-cyan-400'
                }`}
              />

              <button
                type="submit"
                disabled={!inlineInputValue.trim() && executionState !== 'waiting_for_input'}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md font-bold text-xs transition-all cursor-pointer shadow-sm ${
                  executionState === 'waiting_for_input'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 animate-pulse'
                    : isLight
                    ? 'bg-sky-700 hover:bg-sky-800 text-white disabled:opacity-40'
                    : 'bg-cyan-950 border border-cyan-500/40 hover:bg-cyan-900/60 text-cyan-300 disabled:opacity-40'
                }`}
                title="Send input to running program's stdin (Enter)"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Input</span>
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: DEDICATED INPUT PANEL */}
        {activeTab === 'input' && (
          <div className="flex-1 flex flex-col p-3.5 gap-3 overflow-y-auto font-mono text-xs">
            {/* Waiting for Input Banner if process is waiting right now */}
            {executionState === 'waiting_for_input' && (
              <div
                className={`p-3 rounded-lg border shadow-md flex items-center justify-between text-xs animate-fade-in ${
                  isLight
                    ? 'bg-amber-50 border-amber-400 text-amber-950'
                    : 'bg-[#0e1f3b] border-amber-500/70 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping inline-block" />
                  <span className={`font-bold ${isLight ? 'text-amber-900' : 'text-amber-300'}`}>
                    Waiting for Your Input:
                  </span>
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded border ${
                      isLight
                        ? 'bg-white text-sky-900 border-amber-300 shadow-2xs'
                        : 'bg-[#070e1b] text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    {currentPrompt || (language === 'cpp' ? 'cin >>' : 'input()')}
                  </span>
                </div>
                <span className={`text-[11px] font-semibold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Type below and press Enter to send
                </span>
              </div>
            )}

            {/* Input Header & Controls */}
            <div className={`flex items-center justify-between text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              <div className="flex items-center gap-2">
                <Edit3 className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-cyan-300'}`}>
                  Editable Input Area
                </span>
                <span className={`text-[11px] hidden sm:inline ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                  (Single value, space-separated, or multi-line)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[11px] ${isLight ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                  <kbd
                    className={`px-1.5 py-0.5 rounded font-bold border ${
                      isLight
                        ? 'bg-white text-sky-800 border-slate-300 shadow-2xs'
                        : 'bg-[#0f1b2f] text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    Enter
                  </kbd>{' '}
                  to submit •{' '}
                  <kbd
                    className={`px-1.5 py-0.5 rounded border ${
                      isLight
                        ? 'bg-white text-slate-700 border-slate-300'
                        : 'bg-[#0f1b2f] text-slate-300 border-slate-700'
                    }`}
                  >
                    Shift+Enter
                  </kbd>{' '}
                  for newline
                </span>
              </div>
            </div>

            {/* Large Editable Textarea */}
            <div className="flex-1 min-h-[120px] flex flex-col relative">
              <textarea
                ref={largeInputRef}
                value={largeInputValue}
                onChange={(e) => setLargeInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendLargeInput();
                  }
                }}
                disabled={executionState === 'completed' || executionState === 'error'}
                placeholder={`Type or paste your input values here...\nExample:\nAlice\n20\nMIT\nCS\n3.95\n\nPress Enter to send, Shift+Enter for a new line.`}
                className={`w-full flex-1 p-3 rounded-lg font-mono text-xs resize-none leading-relaxed focus:outline-none transition-colors ${
                  isLight
                    ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500/40'
                    : 'bg-[#050a14] border border-[#1b2b48] text-slate-100 placeholder-slate-600 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40'
                }`}
              />
            </div>

            {/* Input Actions Bar */}
            <div className={`flex items-center justify-between gap-2 pt-1 border-t ${isLight ? 'border-slate-300' : 'border-[#182845]'}`}>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLargeInputValue('')}
                  disabled={!largeInputValue}
                  className={`px-3 py-1 rounded text-xs cursor-pointer disabled:opacity-40 transition-colors border ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                      : 'bg-[#0e1a2f] border-[#1b2b48] text-slate-400 hover:text-white'
                  }`}
                >
                  Clear Pending
                </button>
                {inputHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={onResetInputs}
                    className={`px-3 py-1 rounded text-xs cursor-pointer transition-colors border ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-700 hover:text-sky-700'
                        : 'bg-[#0e1a2f] border-[#1b2b48] text-slate-400 hover:text-cyan-300'
                    }`}
                  >
                    Reset History ({inputHistory.length})
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => handleSendLargeInput()}
                disabled={!largeInputValue.trim() && executionState !== 'waiting_for_input'}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 cursor-pointer disabled:opacity-40 transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send Input</span>
              </button>
            </div>

            {/* Submitted Inputs History Section */}
            <div className="mt-2 space-y-2">
              <div className={`flex items-center justify-between text-xs pb-1 border-b ${isLight ? 'border-slate-300 text-slate-700' : 'border-[#182845] text-slate-400'}`}>
                <span className={`flex items-center gap-1.5 font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                  <ListOrdered className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                  <span>Submitted Inputs in Terminal History:</span>
                </span>
                <span className={`font-mono font-bold text-[11px] ${isLight ? 'text-sky-800' : 'text-cyan-300'}`}>
                  {inputHistory.length} values sent
                </span>
              </div>

              {inputHistory.length > 0 ? (
                <div
                  className={`max-h-[110px] overflow-y-auto space-y-1.5 p-2 rounded-lg border ${
                    isLight
                      ? 'bg-slate-100 border-slate-300'
                      : 'bg-[#050b17] border-[#1b2b48]'
                  }`}
                >
                  {inputHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center justify-between text-xs font-mono p-1.5 rounded border ${
                        isLight
                          ? 'bg-white border-slate-200 text-slate-900 shadow-2xs'
                          : 'bg-[#0b1629] border-[#1a2d50] text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${
                            isLight
                              ? 'bg-sky-100 text-sky-900 border-sky-300'
                              : 'bg-cyan-950 text-cyan-300 border-cyan-500/30'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <span className="font-semibold select-text">{item}</span>
                      </div>
                      <span className={`text-[10px] flex items-center gap-1 font-semibold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                        <Check className="w-3 h-3" />
                        <span>Delivered to stdin</span>
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div
                  className={`p-3 text-center text-xs rounded-lg border ${
                    isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-600'
                      : 'bg-[#050a14] border-[#16243d] text-slate-500'
                  }`}
                >
                  <span>No inputs submitted yet. Type your values above and press Enter or click Send Input.</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: DATA STRUCTURE VISUALIZER PANEL */}
        {activeTab === 'visualizer' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <DataStructureVisualizer
              code={code}
              language={language}
              theme={theme}
              onHighlightLine={onHighlightLine}
              onLoadPreset={onLoadPreset}
            />
          </div>
        )}

        {/* TAB 4: ERRORS PANEL */}
        {activeTab === 'errors' && (
          <div className="flex-1 p-3.5 overflow-y-auto font-mono text-xs">
            {stderr ? (
              <div className="space-y-3">
                <div className={`flex items-center justify-between pb-2 border-b ${isLight ? 'border-rose-300' : 'border-rose-900/60'}`}>
                  <div className="flex items-center gap-2">
                    <XCircle className={`w-4 h-4 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
                    <span className={`font-bold text-sm ${isLight ? 'text-rose-900' : 'text-rose-300'}`}>
                      {isCompileError ? 'Compilation Error' : 'Runtime Exception'}
                    </span>
                    {errorLineNumber && (
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-mono border font-bold ${
                          isLight
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-rose-900/60 text-rose-200 border-rose-500/40'
                        }`}
                      >
                        Line {errorLineNumber}
                      </span>
                    )}
                  </div>

                  <button
                    onClick={onSolveError}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-md bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-bold text-xs hover:from-rose-400 hover:to-amber-400 transition-all cursor-pointer shadow-md shadow-rose-500/20"
                  >
                    <Bug className="w-3.5 h-3.5 text-slate-950" />
                    <span>Diagnose & Fix with AI</span>
                  </button>
                </div>

                <pre
                  className={`font-mono text-xs whitespace-pre-wrap select-text p-3.5 rounded-lg border leading-relaxed ${
                    isCompileError
                      ? isLight
                        ? 'text-rose-950 bg-rose-50 border-rose-300 font-medium'
                        : 'text-rose-200 bg-rose-950/25 border-rose-500/40'
                      : isLight
                      ? 'text-amber-950 bg-amber-50 border-amber-300 font-medium'
                      : 'text-amber-200 bg-amber-950/25 border-amber-500/40'
                  }`}
                >
                  {stderr}
                </pre>
              </div>
            ) : (
              <div className="h-full py-12 flex flex-col items-center justify-center text-slate-500 gap-1.5 text-center">
                <CheckCircle2 className={`w-8 h-8 mb-1 ${isLight ? 'text-emerald-600' : 'text-emerald-500/60'}`} />
                <p className={`text-xs font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>Zero Errors Reported</p>
                <p className={`text-[11px] max-w-xs ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>
                  Your code compiled and executed cleanly without syntax or runtime exceptions.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

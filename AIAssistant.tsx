import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Bug,
  BookOpen,
  MessageSquare,
  Wrench,
  CheckCircle2,
  Copy,
  Check,
  Send,
  Loader2,
  AlertTriangle,
  Lightbulb,
  CornerDownRight,
  ChevronRight,
  Info,
  Trash2,
  RotateCcw,
} from 'lucide-react';

export interface DebugResult {
  errorName: string;
  simpleExplanation: string;
  lineNumber: number | null;
  whyItHappened: string;
  correctedCode: string;
  diffSummary: string;
  preventionTips: string[];
}

export interface ExplanationStep {
  lines: string;
  codeSnippet: string;
  explanation: string;
  beginnerTip?: string;
}

export interface ExplanationResult {
  overview: string;
  steps: ExplanationStep[];
  complexity: string;
  keyTakeaway: string;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
}

const CONVERSATION_STORAGE_KEY = 'codeproof_ai_conversation';

interface AIAssistantProps {
  activeTab: 'error' | 'explain' | 'chat';
  onTabChange: (tab: 'error' | 'explain' | 'chat') => void;
  debugResult: DebugResult | null;
  isDebugging: boolean;
  onApplyFix: (newCode: string) => void;
  onHighlightLine: (line: number) => void;
  explanationResult: ExplanationResult | null;
  isExplaining: boolean;
  onExplainCode: () => void;
  currentCode: string;
  language: 'python' | 'cpp';
  hasStderr: boolean;
  onTriggerDebug: () => void;
  theme?: 'dark' | 'light';
  onToast?: (msg: string) => void;
  onClearErrorSolver?: () => void;
  onClearExplanation?: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  activeTab,
  onTabChange,
  debugResult,
  isDebugging,
  onApplyFix,
  onHighlightLine,
  explanationResult,
  isExplaining,
  onExplainCode,
  currentCode,
  language,
  hasStderr,
  onTriggerDebug,
  theme = 'dark',
  onToast,
  onClearErrorSolver,
  onClearExplanation,
}) => {
  const isLight = theme === 'light';
  const [copiedCode, setCopiedCode] = useState(false);
  const [fixedApplied, setFixedApplied] = useState(false);

  const getWelcomeMessage = (lang: 'python' | 'cpp'): ChatMessage => ({
    id: 'welcome',
    sender: 'assistant',
    text: `Hello! I'm your CODEPROOF AI tutor. Ask me anything about your ${
      lang === 'cpp' ? 'C++' : 'Python'
    } program, syntax, or concepts!`,
  });

  // Chat state stored separately from saved programs
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CONVERSATION_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {
        // Fallback to fresh welcome
      }
    }
    return [getWelcomeMessage(language)];
  });

  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Section confirmation state: track which section is being cleared independently
  const [sectionToClear, setSectionToClear] = useState<'error' | 'explain' | 'chat' | null>(null);

  // Sync conversation history to dedicated storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(chatMessages));
      } catch {
        // Ignore quota
      }
    }
  }, [chatMessages]);

  const handleFixCode = () => {
    if (!debugResult?.correctedCode) return;
    onApplyFix(debugResult.correctedCode);
    setFixedApplied(true);
    setTimeout(() => setFixedApplied(false), 2500);
  };

  const handleCopyFixed = async () => {
    if (!debugResult?.correctedCode) return;
    await navigator.clipboard.writeText(debugResult.correctedCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // 1. Confirm Clear Error Solver
  const handleConfirmClearError = () => {
    if (onClearErrorSolver) {
      onClearErrorSolver();
    }
    setSectionToClear(null);
    if (onToast) {
      onToast('Error Solver results cleared.');
    }
  };

  // 2. Confirm Clear Explanation
  const handleConfirmClearExplanation = () => {
    if (onClearExplanation) {
      onClearExplanation();
    }
    setSectionToClear(null);
    if (onToast) {
      onToast('Code explanation cleared.');
    }
  };

  // 3. Confirm Clear Tutor Conversation
  const handleConfirmClearChat = () => {
    const fresh = [getWelcomeMessage(language)];
    setChatMessages(fresh);
    setIsChatLoading(false);
    setChatInput('');
    try {
      localStorage.setItem(CONVERSATION_STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // ignore
    }
    setSectionToClear(null);
    if (onToast) {
      onToast('AI tutor conversation cleared.');
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || chatInput;
    if (!textToSend.trim() || isChatLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: textToSend,
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customText) setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/ask-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: textToSend,
          code: currentCode,
          language,
          history: chatMessages.slice(-6),
        }),
      });

      const data = await res.json();
      const replyText = data.reply || data.error || 'I could not answer right now.';

      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: replyText,
        },
      ]);
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: 'Network error communicating with AI tutor.',
        },
      ]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col h-full rounded-xl overflow-hidden shadow-xl transition-colors ${
        isLight
          ? 'bg-white border border-slate-300 shadow-slate-300/40 text-slate-900'
          : 'bg-[#0a1120] border border-[#1e293b] shadow-cyan-950/10 text-slate-100'
      }`}
    >
      {/* AI Header with Tabs & Clear Option */}
      <div
        className={`flex items-center justify-between px-3 py-2 border-b select-none transition-colors ${
          isLight ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-[#0d1627] border-[#1e293b]'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <div
            className={`p-1 rounded-md border ${
              isLight
                ? 'bg-sky-100 border-sky-300 text-sky-700'
                : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400'
            }`}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <span
            className={`text-xs font-bold tracking-wide uppercase font-mono ${
              isLight ? 'text-slate-900 font-extrabold' : 'text-slate-100'
            }`}
          >
            AI Assistant
          </span>
        </div>

        {/* Tab Controls + Clear Button */}
        <div className="flex items-center gap-1.5">
          <div
            className={`flex items-center gap-1 p-0.5 rounded-lg border ${
              isLight ? 'bg-slate-200 border-slate-300' : 'bg-[#060c18] border-[#192742]'
            }`}
          >
            <button
              onClick={() => onTabChange('error')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'error'
                  ? isLight
                    ? 'bg-white text-rose-800 border border-rose-300 shadow-2xs font-bold'
                    : 'bg-gradient-to-r from-rose-950/80 to-amber-950/80 text-rose-300 border border-rose-500/50 shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Bug className={`w-3.5 h-3.5 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
              <span className="hidden sm:inline">Error Solver</span>
              <span className="sm:hidden">Errors</span>
              {hasStderr && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping inline-block" />}
            </button>

            <button
              onClick={() => onTabChange('explain')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'explain'
                  ? isLight
                    ? 'bg-white text-sky-800 border border-sky-300 shadow-2xs font-bold'
                    : 'bg-gradient-to-r from-cyan-950/80 to-blue-950/80 text-cyan-300 border border-cyan-500/50 shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
              <span className="hidden sm:inline">Explain Code</span>
              <span className="sm:hidden">Explain</span>
            </button>

            <button
              onClick={() => onTabChange('chat')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'chat'
                  ? isLight
                    ? 'bg-white text-blue-800 border border-blue-300 shadow-2xs font-bold'
                    : 'bg-gradient-to-r from-blue-950/80 to-indigo-950/80 text-blue-300 border border-blue-500/50 shadow-sm'
                  : isLight
                  ? 'text-slate-600 hover:text-slate-900'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className={`w-3.5 h-3.5 ${isLight ? 'text-blue-600' : 'text-blue-400'}`} />
              <span className="hidden sm:inline">Ask Tutor</span>
              <span className="sm:hidden">Chat</span>
            </button>
          </div>

          {/* Section-Specific Clear Button */}
          <button
            onClick={() => setSectionToClear(activeTab)}
            disabled={
              activeTab === 'error'
                ? !debugResult && !isDebugging
                : activeTab === 'explain'
                ? !explanationResult && !isExplaining
                : chatMessages.length <= 1 && !isChatLoading && !chatInput
            }
            title={
              activeTab === 'error'
                ? 'Clear Error Solver results and explanations'
                : activeTab === 'explain'
                ? 'Clear line-by-line code explanation'
                : 'Clear Tutor conversation history'
            }
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
              isLight
                ? 'bg-white border-slate-300 hover:bg-rose-50 hover:border-rose-300 text-slate-700 hover:text-rose-700 shadow-2xs'
                : 'bg-[#080f1e] border-[#1c2c47] hover:bg-rose-950/50 hover:border-rose-600/50 text-slate-300 hover:text-rose-300'
            }`}
          >
            <Trash2 className="w-3 h-3 text-rose-500" />
            <span className="hidden sm:inline">
              {activeTab === 'error' ? 'Clear Errors' : activeTab === 'explain' ? 'Clear Explanation' : 'Clear Chat'}
            </span>
            <span className="sm:hidden">Clear</span>
          </button>
        </div>
      </div>

      {/* Confirmation Banner for Clearing Active Section Independently */}
      {sectionToClear && (
        <div
          className={`px-3.5 py-2.5 border-b flex flex-wrap items-center justify-between gap-2 text-xs font-semibold animate-fade-in ${
            isLight
              ? 'bg-amber-50 border-amber-200 text-amber-950'
              : 'bg-[#1a1208] border-amber-600/40 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              {sectionToClear === 'error' && 'Clear Error Solver results and explanations?'}
              {sectionToClear === 'explain' && 'Clear line-by-line code explanation?'}
              {sectionToClear === 'chat' && 'Clear Tutor conversation history?'}
              {' This cannot be undone.'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (sectionToClear === 'error') handleConfirmClearError();
                else if (sectionToClear === 'explain') handleConfirmClearExplanation();
                else if (sectionToClear === 'chat') handleConfirmClearChat();
              }}
              className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer shadow-xs transition-colors"
            >
              Yes, Clear
            </button>
            <button
              onClick={() => setSectionToClear(null)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border cursor-pointer transition-colors ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className={`flex-1 overflow-y-auto p-4 transition-colors ${isLight ? 'bg-slate-50' : 'bg-[#080d19]'}`}>
        {/* ==================== TAB 1: AI ERROR SOLVER ==================== */}
        {activeTab === 'error' && (
          <div className="flex flex-col gap-3.5">
            {isDebugging ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className={`w-8 h-8 animate-spin ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
                <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                  Analyzing error with AI...
                </p>
                <p className={`text-xs max-w-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Identifying bug root cause, checking line numbers, and generating corrected code.
                </p>
              </div>
            ) : debugResult ? (
              <div className="flex flex-col gap-3.5">
                {/* Error Banner */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col gap-2 ${
                    isLight
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-rose-950/30 border-rose-500/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-900/60 text-rose-300'}`}>
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                      </div>
                      <span className={`text-sm font-bold font-mono ${isLight ? 'text-rose-900' : 'text-rose-300'}`}>
                        {debugResult.errorName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {debugResult.lineNumber && debugResult.lineNumber > 0 ? (
                        <button
                          onClick={() => onHighlightLine(debugResult.lineNumber!)}
                          className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono cursor-pointer border ${
                            isLight
                              ? 'bg-white border-rose-300 text-rose-800 hover:bg-rose-100'
                              : 'bg-rose-900/50 border-rose-500/30 text-rose-300 hover:bg-rose-900'
                          }`}
                          title="Jump to line in editor"
                        >
                          <CornerDownRight className="w-3 h-3" />
                          <span>Line {debugResult.lineNumber}</span>
                        </button>
                      ) : null}

                      <button
                        onClick={() => setSectionToClear('error')}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer border transition-colors ${
                          isLight
                            ? 'bg-white border-rose-200 text-rose-700 hover:bg-rose-100'
                            : 'bg-rose-950/60 border-rose-600/40 text-rose-300 hover:bg-rose-900/60'
                        }`}
                        title="Clear Error Solver results"
                      >
                        <Trash2 className="w-3 h-3 text-rose-500" />
                        <span>Clear</span>
                      </button>
                    </div>
                  </div>

                  <p className={`text-xs leading-relaxed font-sans ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                    {debugResult.simpleExplanation}
                  </p>
                </div>

                {/* Why It Happened Card */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                    isLight
                      ? 'bg-white border-amber-300 text-slate-800 shadow-2xs'
                      : 'bg-[#0c1424] border-[#1d2c47]'
                  }`}
                >
                  <div className={`flex items-center gap-1.5 text-xs font-semibold ${isLight ? 'text-amber-800 font-bold' : 'text-amber-300'}`}>
                    <Info className="w-3.5 h-3.5 text-amber-500" />
                    <span>Why this happened:</span>
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {debugResult.whyItHappened}
                  </p>
                </div>

                {/* Fix Summary & 1-Click Fix Button */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col gap-3 ${
                    isLight
                      ? 'bg-white border-sky-300 shadow-sm'
                      : 'bg-[#0c182a] border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className={`flex items-center gap-1.5 text-xs font-semibold ${isLight ? 'text-sky-800 font-bold' : 'text-cyan-300'}`}>
                      <Wrench className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                      <span>Correction: {debugResult.diffSummary}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={handleCopyFixed}
                        className={`p-1 rounded transition-colors ${
                          isLight
                            ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-[#162540]'
                        }`}
                        title="Copy fixed code"
                      >
                        {copiedCode ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Corrected Code Preview */}
                  <div
                    className={`max-h-40 overflow-y-auto p-2.5 rounded-lg border font-mono text-[11px] whitespace-pre ${
                      isLight
                        ? 'bg-slate-900 text-emerald-400 border-slate-700'
                        : 'bg-[#060b14] border-[#192742] text-emerald-300'
                    }`}
                  >
                    {debugResult.correctedCode}
                  </div>

                  {/* Fix Code Button */}
                  <button
                    onClick={handleFixCode}
                    className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg font-bold text-xs tracking-wide transition-all shadow-md cursor-pointer ${
                      fixedApplied
                        ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
                        : 'bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-cyan-500/30'
                    }`}
                  >
                    {fixedApplied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-slate-950" />
                        <span>Code Fixed in Editor!</span>
                      </>
                    ) : (
                      <>
                        <Wrench className="w-4 h-4 text-slate-950" />
                        <span>Fix Code (Replace in Editor)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Prevention Tips */}
                {debugResult.preventionTips && debugResult.preventionTips.length > 0 && (
                  <div
                    className={`p-3 rounded-xl border flex flex-col gap-1.5 text-xs ${
                      isLight
                        ? 'bg-white border-slate-200 text-slate-800'
                        : 'bg-[#091120] border-[#18263d]'
                    }`}
                  >
                    <div className={`flex items-center gap-1.5 font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                      <Lightbulb className={`w-3.5 h-3.5 ${isLight ? 'text-amber-500' : 'text-cyan-400'}`} />
                      <span>Tips to avoid this error:</span>
                    </div>
                    <ul className={`list-disc list-inside space-y-1 text-[11px] leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {debugResult.preventionTips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : hasStderr ? (
              <div className="py-8 flex flex-col items-center justify-center gap-3 text-center">
                <div
                  className={`p-3 rounded-full border ${
                    isLight
                      ? 'bg-rose-100 border-rose-300 text-rose-600'
                      : 'bg-rose-950/60 border-rose-500/40 text-rose-400'
                  }`}
                >
                  <Bug className="w-6 h-6" />
                </div>
                <h4 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  Error Detected
                </h4>
                <p className={`text-xs max-w-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Your code produced an error. Click below to let CODEPROOF AI analyze the exact line, why it happened, and fix it.
                </p>
                <button
                  onClick={onTriggerDebug}
                  className="mt-1 flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-amber-500 text-slate-950 font-bold text-xs shadow-md shadow-rose-500/20 hover:from-rose-400 hover:to-amber-400 transition-all cursor-pointer"
                >
                  <Bug className="w-3.5 h-3.5" />
                  <span>Analyze & Fix This Error</span>
                </button>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center text-slate-400">
                <div
                  className={`p-3 rounded-full border ${
                    isLight
                      ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                      : 'bg-[#0e172a] border-[#1e2e4a] text-cyan-400'
                  }`}
                >
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  No Errors Currently
                </h4>
                <p className={`text-xs max-w-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  When you run code that encounters a syntax, runtime, or compilation error, the AI Error Solver will automatically explain the error in plain English and provide a 1-click fix.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 2: EXPLAIN CODE ==================== */}
        {activeTab === 'explain' && (
          <div className="flex flex-col gap-3.5">
            {isExplaining ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-center">
                <Loader2 className={`w-8 h-8 animate-spin ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                <p className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  Generating Line-by-Line Explanation...
                </p>
                <p className={`text-xs max-w-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Breaking down the code structure, syntax rules, and logic for beginners.
                </p>
              </div>
            ) : explanationResult ? (
              <div className="flex flex-col gap-3.5">
                {/* Overview Card */}
                <div
                  className={`p-3.5 rounded-xl border flex flex-col gap-1.5 ${
                    isLight
                      ? 'bg-white border-sky-300 shadow-2xs'
                      : 'bg-gradient-to-br from-[#0c182d] to-[#0e213d] border-cyan-500/30'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold font-mono flex items-center gap-1.5 ${isLight ? 'text-sky-800' : 'text-cyan-300'}`}>
                      <BookOpen className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                      <span>Program Overview</span>
                    </span>

                    <button
                      onClick={() => setSectionToClear('explain')}
                      className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs cursor-pointer border transition-colors ${
                        isLight
                          ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-rose-700'
                          : 'bg-[#14233c] border-[#1e345b] text-slate-300 hover:bg-[#1a2e50] hover:text-rose-300'
                      }`}
                      title="Clear code explanation"
                    >
                      <Trash2 className="w-3 h-3 text-rose-500" />
                      <span>Clear</span>
                    </button>
                  </div>
                  <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                    {explanationResult.overview}
                  </p>
                </div>

                {/* Line by line breakdown */}
                <div className="flex flex-col gap-2.5">
                  <span className={`text-xs font-semibold font-mono ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                    Step-by-Step Breakdown:
                  </span>
                  {explanationResult.steps.map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border flex flex-col gap-1.5 text-xs ${
                        isLight
                          ? 'bg-white border-slate-300 shadow-2xs'
                          : 'bg-[#0a1222] border-[#1e2f4f]'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className={`font-semibold ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}>
                          {step.lines}
                        </span>
                      </div>
                      <div
                        className={`p-1.5 rounded border font-mono text-[11px] whitespace-pre overflow-x-auto ${
                          isLight
                            ? 'bg-slate-900 text-slate-100 border-slate-700'
                            : 'bg-[#060b14] border-[#192740] text-slate-300'
                        }`}
                      >
                        {step.codeSnippet}
                      </div>
                      <p className={`text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        {step.explanation}
                      </p>
                      {step.beginnerTip && (
                        <div
                          className={`flex items-center gap-1 text-[11px] pt-0.5 font-medium ${
                            isLight ? 'text-amber-800' : 'text-amber-300/90'
                          }`}
                        >
                          <Lightbulb className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>Tip: {step.beginnerTip}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Complexity Card */}
                <div
                  className={`p-3 rounded-xl border flex flex-col gap-1 text-xs ${
                    isLight
                      ? 'bg-white border-slate-300'
                      : 'bg-[#0a1424] border-[#1a2d4b]'
                  }`}
                >
                  <span className={`font-semibold ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                    Complexity & Performance:
                  </span>
                  <p className={`text-[11px] font-mono leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    {explanationResult.complexity}
                  </p>
                </div>

                {/* Key Takeaway */}
                <div
                  className={`p-3 rounded-xl border flex items-start gap-2 text-xs ${
                    isLight
                      ? 'bg-sky-50 border-sky-300'
                      : 'bg-cyan-950/30 border-cyan-500/30'
                  }`}
                >
                  <Lightbulb className={`w-4 h-4 shrink-0 mt-0.5 ${isLight ? 'text-sky-700' : 'text-cyan-400'}`} />
                  <div>
                    <span className={`font-bold block mb-0.5 ${isLight ? 'text-sky-900' : 'text-cyan-300'}`}>
                      Key Takeaway:
                    </span>
                    <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      {explanationResult.keyTakeaway}
                    </p>
                  </div>
                </div>

                <button
                  onClick={onExplainCode}
                  className={`mt-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                    isLight
                      ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800'
                      : 'bg-[#111f38] hover:bg-[#162747] text-slate-300 hover:text-cyan-300 border-transparent'
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                  <span>Re-explain Current Code</span>
                </button>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-center text-slate-400">
                <div
                  className={`p-3 rounded-full border ${
                    isLight
                      ? 'bg-sky-100 border-sky-300 text-sky-700'
                      : 'bg-[#0e172a] border-[#1e2e4a] text-cyan-400'
                  }`}
                >
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className={`text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>
                  Understand Your Code
                </h4>
                <p className={`text-xs max-w-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Click "Explain Code" to get a line-by-line, beginner-friendly walkthrough explaining every variable, loop, and function.
                </p>
                <button
                  onClick={onExplainCode}
                  disabled={!currentCode.trim()}
                  className="mt-1 flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 hover:from-cyan-400 hover:to-blue-500 transition-all cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                  <span>Explain Code Now</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ==================== TAB 3: ASK TUTOR ==================== */}
        {activeTab === 'chat' && (
          <div className="flex flex-col h-full justify-between gap-3">
            {/* Chat Messages */}
            <div className="flex flex-col gap-3 overflow-y-auto pr-1">
              {chatMessages.length > 1 && (
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-800/60">
                  <span className={`text-[11px] font-mono ${isLight ? 'text-slate-500 font-medium' : 'text-slate-400'}`}>
                    {chatMessages.length - 1} message{chatMessages.length - 1 === 1 ? '' : 's'} exchanged
                  </span>
                  <button
                    onClick={() => setSectionToClear('chat')}
                    className={`flex items-center gap-1 text-[11px] font-semibold transition-colors cursor-pointer ${
                      isLight ? 'text-rose-600 hover:text-rose-800' : 'text-rose-400 hover:text-rose-300'
                    }`}
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Chat</span>
                  </button>
                </div>
              )}
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`p-3 rounded-xl max-w-[90%] text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-slate-950 font-medium rounded-br-xs'
                        : isLight
                        ? 'bg-white border border-slate-300 text-slate-800 shadow-2xs rounded-bl-xs'
                        : 'bg-[#0f1b33] border border-[#1d3154] text-slate-200 rounded-bl-xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}

              {isChatLoading && (
                <div className={`flex items-center gap-2 text-xs font-mono ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Tutor is thinking...</span>
                </div>
              )}
            </div>

            {/* Quick Prompts & Chat Input */}
            <div className={`flex flex-col gap-2 pt-2 border-t ${isLight ? 'border-slate-300' : 'border-[#192742]'}`}>
              <div className="flex flex-wrap gap-1 text-[11px]">
                {[
                  'What does this code do?',
                  'How can I optimize this?',
                  'Explain this like I am 5',
                ].map((chip, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(chip)}
                    disabled={isChatLoading}
                    className={`px-2 py-0.5 rounded text-[10px] transition-colors cursor-pointer border ${
                      isLight
                        ? 'bg-white border-slate-300 text-slate-700 hover:text-sky-700 hover:border-sky-400'
                        : 'bg-[#101c33] border-[#1d3359] text-slate-400 hover:text-cyan-300'
                    }`}
                  >
                    {chip}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder={`Ask a question about your ${language === 'cpp' ? 'C++' : 'Python'} code...`}
                  disabled={isChatLoading}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs transition-colors focus:outline-none ${
                    isLight
                      ? 'bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-500'
                      : 'bg-[#060c18] border border-[#1e2f4f] text-slate-100 placeholder-slate-500 focus:border-cyan-400'
                  }`}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!chatInput.trim() || isChatLoading}
                  className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold disabled:opacity-40 transition-colors cursor-pointer"
                  title="Send question"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

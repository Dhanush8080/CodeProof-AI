import React, { useState, useEffect, useCallback } from 'react';
import {
  Code2,
  Play,
  Sparkles,
  BookOpen,
  Terminal,
  Layers,
  ChevronDown,
  Info,
  Bug,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  Keyboard,
  HelpCircle,
  Sun,
  Moon,
  FolderOpen,
  Save,
  Plus,
  Package,
  Activity,
} from 'lucide-react';
import { CodeEditor } from './components/CodeEditor';
import { StatementInput } from './components/StatementInput';
import { OutputConsole, ExecutionState, CompilerInfo } from './components/OutputConsole';
import { AIAssistant, DebugResult, ExplanationResult } from './components/AIAssistant';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { SaveProgramModal } from './components/SaveProgramModal';
import { SavedProgramsModal } from './components/SavedProgramsModal';
import { ModulesExplorerModal } from './components/ModulesExplorerModal';
import { SAMPLE_EXAMPLES, CodeExample } from './data/examples';
import {
  detectInputRequirements,
  isEofWaitingForInput,
} from './utils/inputDetector';
import {
  SavedProgram,
  getSavedPrograms,
  saveProgram,
  deleteProgram,
  renameProgram,
  duplicateProgram,
  getAutosavedCode,
  setAutosavedCode,
} from './utils/programHistory';

export default function App() {
  // Theme State: 'dark' (Dark Navy) vs 'light' (Light/High Contrast)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('codeproof_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    }
    return 'dark';
  });

  const isLight = theme === 'light';

  useEffect(() => {
    localStorage.setItem('codeproof_theme', theme);
    if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
      document.documentElement.classList.remove('theme-dark');
      document.documentElement.setAttribute('data-theme', 'light');
      document.body.classList.add('theme-light');
    } else {
      document.documentElement.classList.add('theme-dark');
      document.documentElement.classList.remove('theme-light');
      document.documentElement.setAttribute('data-theme', 'dark');
      document.body.classList.remove('theme-light');
    }
  }, [theme]);

  // Main State
  const [language, setLanguage] = useState<'python' | 'cpp'>('python');
  const [cppStandard, setCppStandard] = useState<'c++20' | 'c++17' | 'c++14' | 'c++11'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('codeproof_cpp_std');
      if (saved === 'c++20' || saved === 'c++17' || saved === 'c++14' || saved === 'c++11') return saved;
    }
    return 'c++20';
  });

  const handleCppStandardChange = (std: string) => {
    const valid =
      std === 'c++20' || std === 'c++17' || std === 'c++14' || std === 'c++11'
        ? std
        : 'c++20';
    setCppStandard(valid);
    localStorage.setItem('codeproof_cpp_std', valid);
    showToast(`G++ Standard: ${valid.toUpperCase()}`);
  };

  const [code, setCode] = useState<string>(SAMPLE_EXAMPLES[0].python.code);
  const [stdin, setStdin] = useState<string>('');
  const [currentStatement, setCurrentStatement] = useState<string>(SAMPLE_EXAMPLES[0].statement);
  const [selectedExampleId, setSelectedExampleId] = useState<string>('largest-three');

  // Help Modal State
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);

  // Generation State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedInfo, setGeneratedInfo] = useState<{
    summary?: string;
    keyConcepts?: string[];
  } | null>(null);

  // Execution State
  const [executionState, setExecutionState] = useState<ExecutionState>('idle');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const eventSourceRef = React.useRef<EventSource | null>(null);
  const isRunning = executionState === 'running' || executionState === 'waiting_for_input';

  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [errorType, setErrorType] = useState<string | null>(null);
  const [executionTime, setExecutionTime] = useState<string | null>(null);

  // Interactive Input Session State
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const [consoleTab, setConsoleTab] = useState<'output' | 'input' | 'visualizer' | 'errors'>('output');

  // Compiler & Runtime environment verification
  const [compilerInfo, setCompilerInfo] = useState<CompilerInfo | null>(null);

  useEffect(() => {
    fetch('/api/compiler-info')
      .then((res) => {
        if (!res.ok) throw new Error('Status ' + res.status);
        return res.json();
      })
      .then((data: CompilerInfo) => {
        setCompilerInfo(data);
      })
      .catch((err) => {
        console.warn('Failed to load compiler info:', err);
      });
  }, []);

  // AI Assistant State
  const [activeAiTab, setActiveAiTab] = useState<'error' | 'explain' | 'chat'>('explain');
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [isDebugging, setIsDebugging] = useState(false);
  const [highlightedErrorLine, setHighlightedErrorLine] = useState<number | null>(null);

  const [explanationResult, setExplanationResult] = useState<ExplanationResult | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Notification / Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Saved Programs & Code History State
  const [savedPrograms, setSavedPrograms] = useState<SavedProgram[]>(() => getSavedPrograms());
  const [activeProgramId, setActiveProgramId] = useState<string | null>(null);
  const [activeProgramName, setActiveProgramName] = useState<string | null>(null);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('saved');

  // Debounced auto-save while editing code
  useEffect(() => {
    setAutoSaveStatus('saving');
    const timer = setTimeout(() => {
      setAutosavedCode(language, code);
      if (activeProgramId) {
        saveProgram(
          activeProgramName || 'Program',
          language,
          code,
          currentStatement,
          activeProgramId
        );
        setSavedPrograms(getSavedPrograms());
      }
      setAutoSaveStatus('saved');
    }, 600);

    return () => clearTimeout(timer);
  }, [code, language, activeProgramId, activeProgramName, currentStatement]);

  // Code History Handlers
  const handleSaveProgram = (customName: string) => {
    const saved = saveProgram(
      customName,
      language,
      code,
      currentStatement,
      activeProgramId || undefined
    );
    setSavedPrograms(getSavedPrograms());
    setActiveProgramId(saved.id);
    setActiveProgramName(saved.name);
    showToast(`Program "${saved.name}" saved to history!`);
  };

  const handleOpenProgram = (prog: SavedProgram) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setLanguage(prog.language);
    setCode(prog.code);
    setCurrentStatement(prog.statement || '');
    setActiveProgramId(prog.id);
    setActiveProgramName(prog.name);
    setStdin('');
    setStdout('');
    setStderr('');
    setExitCode(null);
    setErrorType(null);
    setHighlightedErrorLine(null);
    setDebugResult(null);
    setExplanationResult(null);
    setInputHistory([]);
    setCurrentPrompt('');
    setExecutionState('idle');
    showToast(`Opened program "${prog.name}"`);
  };

  const handleDeleteProgram = (id: string, name: string) => {
    deleteProgram(id);
    setSavedPrograms(getSavedPrograms());
    if (activeProgramId === id) {
      setActiveProgramId(null);
      setActiveProgramName(null);
    }
    showToast(`Program "${name}" deleted.`);
  };

  const handleRenameProgram = (id: string, newName: string) => {
    renameProgram(id, newName);
    setSavedPrograms(getSavedPrograms());
    if (activeProgramId === id) {
      setActiveProgramName(newName);
    }
    showToast(`Renamed to "${newName}"`);
  };

  const handleDuplicateProgram = (id: string) => {
    const dup = duplicateProgram(id);
    if (dup) {
      setSavedPrograms(getSavedPrograms());
      showToast(`Duplicated as "${dup.name}"`);
    }
  };

  // Modules & Dictionaries Modal State & Inserters
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);

  const handleInsertImport = (importStatement: string, moduleName: string) => {
    if (code.includes(importStatement.trim())) {
      showToast(`'${moduleName}' is already imported in your code.`);
      return;
    }
    const lines = code.split('\n');
    let insertIndex = 0;
    while (
      insertIndex < lines.length &&
      (lines[insertIndex].startsWith('#!') ||
        lines[insertIndex].startsWith('//') ||
        lines[insertIndex].startsWith('/*') ||
        lines[insertIndex].startsWith('#'))
    ) {
      insertIndex++;
    }
    lines.splice(insertIndex, 0, importStatement);
    const newCode = lines.join('\n');
    setCode(newCode);
    showToast(`Added '${importStatement}' to editor.`);
  };

  const handleInsertSnippet = (snippet: string, title: string) => {
    const separator = code.trim().length > 0 ? '\n\n' : '';
    setCode(code + separator + snippet);
    showToast(`Inserted ${title} snippet into editor.`);
  };

  // Clear Handlers for Error Solver and Explanation sections
  const handleClearErrorSolver = () => {
    setDebugResult(null);
    setIsDebugging(false);
    setHighlightedErrorLine(null);
  };

  const handleClearExplanation = () => {
    setExplanationResult(null);
    setIsExplaining(false);
  };

  // Switch Language
  const handleLanguageChange = (newLang: 'python' | 'cpp' | 'c++') => {
    const normalizedLang: 'python' | 'cpp' = newLang === 'c++' || newLang === 'cpp' ? 'cpp' : 'python';
    if (normalizedLang === language) return;
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setActiveProgramId(null);
    setActiveProgramName(null);
    setLanguage(normalizedLang);

    // Provide default Hello World template when switching languages
    if (normalizedLang === 'cpp') {
      setCode(`#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`);
      setCurrentStatement('Write a program to print Hello World in C++');
      setSelectedExampleId('hello-world');
      showToast('Switched to C++ with default Hello World template.');
    } else {
      setCode(`# Hello World in Python
print("Hello, World!")
`);
      setCurrentStatement('Write a program to print Hello World in Python');
      setSelectedExampleId('hello-world');
      showToast('Switched to Python with default Hello World template.');
    }

    setStdin('');
    // Clear outputs
    setStdout('');
    setStderr('');
    setExitCode(null);
    setErrorType(null);
    setHighlightedErrorLine(null);
    setDebugResult(null);
    setExplanationResult(null);
    setInputHistory([]);
    setCurrentPrompt('');
    setExecutionState('idle');
  };

  // Load Example
  const handleSelectExample = (example: CodeExample) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setSelectedExampleId(example.id);
    setCurrentStatement(example.statement);
    setCode(language === 'cpp' ? example.cpp.code : example.python.code);
    setStdin('');
    setStdout('');
    setStderr('');
    setExitCode(null);
    setErrorType(null);
    setHighlightedErrorLine(null);
    setDebugResult(null);
    setExplanationResult(null);
    setGeneratedInfo(null);
    setInputHistory([]);
    setCurrentPrompt('');
    setExecutionState('idle');
    showToast(`Loaded example: ${example.title}`);
  };

  // 1. Generate Code from English Statement
  const handleGenerateCode = async (statement: string) => {
    setIsGenerating(true);
    setCurrentStatement(statement);
    setHighlightedErrorLine(null);

    try {
      const res = await fetch('/api/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statement, language }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Failed to generate code (Status ${res.status})`);
      }

      const data = await res.json();
      if (data.code) {
        setCode(data.code);
        setGeneratedInfo({
          summary: data.summary,
          keyConcepts: data.keyConcepts,
        });

        // Clear manual stdin so program waits for user input
        setStdin('');

        // Reset execution and analysis
        setStdout('');
        setStderr('');
        setExitCode(null);
        setErrorType(null);
        setDebugResult(null);
        setExplanationResult(null);
        showToast('Code generated successfully!');
      }
    } catch (err: any) {
      showToast(err.message || 'Error connecting to Gemini API.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Debug Error with AI
  const handleDebugError = useCallback(
    async (errorText?: string) => {
      const err = errorText || stderr;
      if (!err.trim()) return;

      setIsDebugging(true);
      setActiveAiTab('error');

      try {
        const res = await fetch('/api/debug-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code,
            language,
            errorOutput: err,
            userStatement: currentStatement,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to debug error.');
        }

        const data: DebugResult = await res.json();
        setDebugResult(data);
        if (data.lineNumber && data.lineNumber > 0) {
          setHighlightedErrorLine(data.lineNumber);
        }
      } catch (err: any) {
        showToast(err.message || 'Error analyzing bug.');
      } finally {
        setIsDebugging(false);
      }
    },
    [code, language, stderr, currentStatement]
  );

  // Stop active execution or cancel awaiting input
  const handleStopExecution = useCallback(async () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (activeSessionId) {
      try {
        await fetch(`/api/interactive/stop/${activeSessionId}`, { method: 'POST' });
      } catch {
        // ignore
      }
    }
    setExecutionState('idle');
    showToast('Program execution stopped.');
  }, [activeSessionId]);

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // 3. Live Interactive Execution Routine via Server-Sent Events
  const handleRunCode = useCallback(async () => {
    // If an existing session/stream is open, terminate it cleanly
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (activeSessionId) {
      fetch(`/api/interactive/stop/${activeSessionId}`, { method: 'POST' }).catch(() => {});
    }

    setExecutionState('running');
    setStdout('');
    setStderr('');
    setExitCode(null);
    setErrorType(null);
    setHighlightedErrorLine(null);
    setInputHistory([]);
    setCurrentPrompt('');
    setExecutionTime(null);

    const startTime = performance.now();

    // When the selected language is C++, send code to Piston API as requested
    if (language === 'cpp') {
      try {
        const pistonPayload: any = {
          language: 'c++',
          version: '10.2.0',
          files: [
            {
              name: 'main.cpp',
              content: code,
            },
          ],
        };
        if (stdin && stdin.trim().length > 0) {
          pistonPayload.stdin = stdin;
        }

        const pistonRes = await fetch('https://emkc.org/api/v2/piston/execute', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(pistonPayload),
        });

        const elapsed = Math.round(performance.now() - startTime);
        setExecutionTime(`${elapsed}ms`);

        if (pistonRes.ok) {
          const data = await pistonRes.json();

          // Show compile.stderr as a compile error if present, otherwise show run.stdout and run.stderr.
          if (data.compile && data.compile.stderr && data.compile.stderr.trim().length > 0) {
            setExecutionState('error');
            setErrorType('compile');
            setStderr(data.compile.stderr);
            setStdout(data.compile.stdout || '');
            setExitCode(data.compile.code ?? 1);

            const cppLineMatch = data.compile.stderr.match(/(?:main\.cpp|[^\s:]+\.cpp):(\d+):(?:(\d+):)? (?:error|warning):/i);
            if (cppLineMatch) {
              setHighlightedErrorLine(parseInt(cppLineMatch[1], 10));
            }
            setActiveAiTab('error');
            handleDebugError(data.compile.stderr);
            return;
          }

          // Otherwise show run.stdout and run.stderr
          const stdoutVal = data.run?.stdout || '';
          const stderrVal = data.run?.stderr || '';
          const exitCodeVal = data.run?.code ?? 0;

          setStdout(stdoutVal);
          setStderr(stderrVal);
          setExitCode(exitCodeVal);

          if (exitCodeVal !== 0 && stderrVal.trim().length > 0) {
            setExecutionState('error');
            setErrorType('runtime');
            const cppLineMatch = stderrVal.match(/(?:main\.cpp|[^\s:]+\.cpp):(\d+):(?:(\d+):)?/i);
            if (cppLineMatch) {
              setHighlightedErrorLine(parseInt(cppLineMatch[1], 10));
            }
          } else {
            setExecutionState('completed');
            setErrorType(null);
          }
          return;
        } else {
          // If public Piston API is restricted/whitelisted, gracefully fallback to local G++
          const errorData = await pistonRes.json().catch(() => ({}));
          console.warn('Piston API non-200, falling back to local runner:', pistonRes.status, errorData);

          const localRes = await fetch('/api/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, language: 'cpp', stdin, cppStandard }),
          });
          const localData = await localRes.json();
          if (localData.isCompileError || localData.hasError) {
            setExecutionState('error');
            setErrorType(localData.errorType || 'compile');
            setStderr(localData.stderr || localData.error || errorData.message || 'Compilation error');
            setStdout(localData.stdout || '');
            setExitCode(localData.exitCode ?? 1);
            if (localData.errorLine) setHighlightedErrorLine(localData.errorLine);
          } else {
            setExecutionState('completed');
            setStdout(localData.stdout || '');
            setStderr(localData.stderr || '');
            setExitCode(localData.exitCode ?? 0);
          }
          return;
        }
      } catch (err: any) {
        console.warn('Failed to call Piston API, falling back to local runner:', err);
        const localRes = await fetch('/api/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, language: 'cpp', stdin, cppStandard }),
        });
        const localData = await localRes.json();
        setExecutionState(localData.hasError ? 'error' : 'completed');
        setErrorType(localData.errorType || null);
        setStdout(localData.stdout || '');
        setStderr(localData.stderr || '');
        setExitCode(localData.exitCode ?? 0);
        return;
      }
    }

    try {
      const res = await fetch('/api/interactive/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
          cppStandard,
          // CRITICAL: NEVER automatically send initialStdin during run.
          // The program starts fresh and pauses waiting for manual user input.
        }),
      });

      const data = await res.json();

      if (data.isCompileError) {
        const elapsed = Math.round(performance.now() - startTime);
        setExecutionTime(`${elapsed}ms`);
        setExecutionState('error');
        setStderr(data.error || 'Compilation error.');
        setErrorType('compile');
        setExitCode(1);

        if (data.errorLine && data.errorLine > 0) {
          setHighlightedErrorLine(data.errorLine);
        } else {
          const cppLineMatch = (data.error || '').match(/:(\d+):(?:\d+:)? (?:error|warning):/i);
          if (cppLineMatch) {
            setHighlightedErrorLine(parseInt(cppLineMatch[1], 10));
          }
        }
        if (data.simpleExplanation) {
          showToast(data.simpleExplanation);
        }
        setActiveAiTab('error');
        handleDebugError(data.error);
        return;
      }

      if (!data.sessionId) {
        setExecutionState('error');
        setStderr(data.error || 'Failed to start execution session.');
        setErrorType('sandbox_service');
        setExitCode(1);
        return;
      }

      const sessionId = data.sessionId;
      setActiveSessionId(sessionId);

      // Connect to real-time event stream
      const es = new EventSource(`/api/interactive/stream/${sessionId}`);
      eventSourceRef.current = es;

      es.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'stdout') {
            const chunk = msg.text || '';
            setStdout((prev) => prev + chunk);
          } else if (msg.type === 'stderr') {
            const chunk = msg.text || '';
            setStderr((prev) => prev + chunk);
          } else if (msg.type === 'waiting_input') {
            setExecutionState('waiting_for_input');
            setCurrentPrompt(msg.prompt || '');
          } else if (msg.type === 'user_input') {
            const inputVal = msg.text || '';
            setInputHistory((prev) => [...prev, inputVal]);
            // Echo input cleanly so user can see their submitted input in terminal output
            setStdout((prev) => {
              const prefix = prev.length > 0 && !prev.endsWith('\n') ? '\n' : '';
              return prev + `${prefix}➜ [input]: ${inputVal}\n`;
            });
            setExecutionState('running');
            setCurrentPrompt('');
          } else if (msg.type === 'done') {
            const elapsed = Math.round(performance.now() - startTime);
            setExecutionTime(msg.executionTime || `${elapsed}ms`);
            setExitCode(msg.exitCode ?? 0);

            if (msg.exitCode === 0) {
              setExecutionState('completed');
            } else {
              setExecutionState('error');
              setErrorType('runtime');

              if (msg.parsedError && msg.parsedError.errorLine) {
                setHighlightedErrorLine(msg.parsedError.errorLine);
              }

              setStderr((currStderr) => {
                const pyLineMatch = currStderr.match(/line (\d+)/i);
                const cppLineMatch = currStderr.match(/:(\d+):(?:\d+:)? (?:error|warning):/i);
                const detectedLine = pyLineMatch
                  ? parseInt(pyLineMatch[1], 10)
                  : cppLineMatch
                  ? parseInt(cppLineMatch[1], 10)
                  : null;
                if (detectedLine && !msg.parsedError?.errorLine) {
                  setHighlightedErrorLine(detectedLine);
                }
                if (currStderr.trim()) {
                  setActiveAiTab('error');
                  handleDebugError(currStderr);
                }
                return currStderr;
              });
            }

            es.close();
            if (eventSourceRef.current === es) {
              eventSourceRef.current = null;
            }
          } else if (msg.type === 'stopped') {
            setExecutionState('idle');
            showToast('Execution stopped.');
            es.close();
            if (eventSourceRef.current === es) {
              eventSourceRef.current = null;
            }
          } else if (msg.type === 'error') {
            setExecutionState('error');
            setStderr((prev) => (prev ? prev + '\n' + msg.message : msg.message));
            setErrorType('runtime');
            es.close();
            if (eventSourceRef.current === es) {
              eventSourceRef.current = null;
            }
          }
        } catch (err) {
          console.error('Error handling SSE event:', err);
        }
      };

      es.onerror = () => {
        es.close();
        if (eventSourceRef.current === es) {
          eventSourceRef.current = null;
        }
      };
    } catch (err: any) {
      setExecutionState('error');
      setStderr(`Execution error: ${err.message || 'Failed to reach sandbox.'}`);
      setErrorType('sandbox_service');
      setExitCode(-1);
    }
  }, [code, language, stdin, activeSessionId, handleDebugError]);

  // Handle submitting interactive input into running process stdin
  const handleSendInput = useCallback(
    async (val: string) => {
      if (!activeSessionId) {
        showToast('No active program running.');
        return;
      }

      try {
        setExecutionState('running');
        setCurrentPrompt('');

        const res = await fetch(`/api/interactive/input/${activeSessionId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ input: val }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          showToast(errData.error || 'Failed to submit input to process.');
        }
      } catch (err: any) {
        console.error('Failed to submit input:', err);
        showToast('Error sending input to running process.');
      }
    },
    [activeSessionId]
  );

  // Reset inputs and restart interactive run
  const handleResetInputs = useCallback(() => {
    setInputHistory([]);
    setStdin('');
    handleRunCode();
  }, [handleRunCode]);

  // 4. Explain Code Line-by-Line
  const handleExplainCode = async () => {
    if (!code.trim() || isExplaining) return;

    setIsExplaining(true);
    setActiveAiTab('explain');

    try {
      const res = await fetch('/api/explain-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to explain code.');
      }

      const data: ExplanationResult = await res.json();
      setExplanationResult(data);
    } catch (err: any) {
      showToast(err.message || 'Error generating explanation.');
    } finally {
      setIsExplaining(false);
    }
  };

  // 5. Apply Fix from AI Error Solver
  const handleApplyFix = (newCode: string) => {
    setCode(newCode);
    setStderr('');
    setHighlightedErrorLine(null);
    showToast('Fixed code applied to editor! Ready to run.');
  };

  // Reset Editor to current template (default Hello World)
  const handleResetEditor = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (language === 'cpp') {
      setCode(`#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`);
      setCurrentStatement('Write a program to print Hello World in C++');
    } else {
      setCode(`# Hello World in Python
print("Hello, World!")
`);
      setCurrentStatement('Write a program to print Hello World in Python');
    }
    setStdin('');
    setStdout('');
    setStderr('');
    setExitCode(null);
    setErrorType(null);
    setHighlightedErrorLine(null);
    setDebugResult(null);
    setInputHistory([]);
    setCurrentPrompt('');
    setExecutionState('idle');
    showToast(`Reset to default ${language === 'cpp' ? 'C++' : 'Python'} template.`);
  };

  // Global Keyboard shortcuts: Ctrl+Enter / Cmd+Enter to Run Code, '?' for shortcuts guide
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setIsSaveModalOpen(true);
        return;
      }

      // '?' to open help modal when not typing in an input or textarea
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (e.key === '?' && !isInput && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setIsHelpModalOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleRunCode]);

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors ${
        isLight
          ? 'bg-[#f1f5f9] text-slate-900 selection:bg-sky-200 selection:text-sky-900'
          : 'bg-[#060b13] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200'
      }`}
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg border text-xs font-semibold shadow-xl animate-fade-in ${
            isLight
              ? 'bg-white border-sky-400 text-sky-900 shadow-sky-900/10'
              : 'bg-[#0e1f3b] border-cyan-400 text-cyan-200 shadow-cyan-950/40'
          }`}
        >
          <Info className={`w-4 h-4 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Top Header */}
      <header
        className={`px-4 lg:px-6 py-3 border-b sticky top-0 z-40 transition-colors ${
          isLight ? 'bg-white border-slate-300 shadow-2xs' : 'bg-[#080e1b] border-[#18263d]'
        }`}
      >
        <div className="max-w-[1720px] mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Tagline */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-md shadow-cyan-500/30 border border-cyan-300/40">
              <Code2 className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-base font-extrabold tracking-tight font-mono ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}
                >
                  CODEPROOF <span className={isLight ? 'text-sky-600' : 'text-cyan-400'}>AI</span>
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border hidden sm:inline ${
                    isLight
                      ? 'bg-sky-50 text-sky-800 border-sky-300'
                      : 'bg-cyan-950/70 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  v2.0
                </span>
              </div>
              <p
                className={`text-[11px] font-medium tracking-wide ${
                  isLight ? 'text-slate-600' : 'text-cyan-300/80'
                }`}
              >
                Describe. Code. Debug. Learn.
              </p>
            </div>
          </div>

          {/* Center: Language Dropdown & Switcher */}
          <div
            className={`flex items-center gap-2 p-1.5 rounded-xl border ${
              isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#050912] border-[#1e2f4f]'
            }`}
          >
            <label
              htmlFor="language-dropdown"
              className={`text-xs font-mono font-bold flex items-center gap-1.5 px-1 ${
                isLight ? 'text-slate-700' : 'text-slate-300'
              }`}
            >
              <Code2 className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
              <span className="hidden sm:inline">Language:</span>
            </label>

            {/* Language Dropdown Select */}
            <select
              id="language-dropdown"
              name="language"
              aria-label="Language"
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as 'python' | 'cpp')}
              className={`text-xs font-mono font-bold px-3 py-1.5 rounded-lg border transition-all cursor-pointer outline-none ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 shadow-2xs hover:border-sky-500 focus:ring-1 focus:ring-sky-500'
                  : 'bg-[#0f1d33] border-[#223d6b] text-cyan-300 hover:border-cyan-400 focus:ring-1 focus:ring-cyan-400'
              }`}
              title="Select programming language"
            >
              <option value="python">Python</option>
              <option value="cpp">C++</option>
            </select>

            {/* Quick Toggle Buttons */}
            <div className="hidden lg:flex items-center gap-1 border-l pl-2 border-slate-700/30">
              <button
                type="button"
                onClick={() => handleLanguageChange('python')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  language === 'python'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/30'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
                <span>Python</span>
              </button>

              <button
                type="button"
                onClick={() => handleLanguageChange('cpp')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  language === 'cpp'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 shadow-md shadow-cyan-500/30'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block" />
                <span>C++</span>
              </button>
            </div>

            {language === 'cpp' && (
              <select
                value={cppStandard}
                onChange={(e) => handleCppStandardChange(e.target.value)}
                className={`text-[11px] font-mono font-bold px-2 py-1 rounded-md border outline-none cursor-pointer transition-colors ${
                  isLight
                    ? 'bg-white text-sky-900 border-sky-400 shadow-2xs'
                    : 'bg-[#0f1d33] text-cyan-300 border-cyan-500/50'
                }`}
                title="Choose C++ language standard for G++ compilation"
              >
                <option value="c++20">C++20 (Modern)</option>
                <option value="c++17">C++17</option>
                <option value="c++14">C++14</option>
                <option value="c++11">C++11</option>
              </select>
            )}
          </div>

          {/* Right Header Controls: Modules, Code History, Examples & Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Modules & Dictionaries Explorer Button */}
            <button
              type="button"
              onClick={() => setIsModulesModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                isLight
                  ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 shadow-2xs'
                  : 'bg-amber-950/60 border-amber-500/40 text-amber-300 hover:bg-amber-900/60 text-slate-200 hover:text-white'
              }`}
              title={`Browse popular ${language === 'cpp' ? 'C++ STL headers and maps' : 'Python standard library modules and dictionaries'}`}
            >
              <Package className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Modules & Dicts</span>
              <span className="sm:hidden">Modules</span>
            </button>

            {/* Code History / Saved Programs Button */}
            <button
              type="button"
              onClick={() => setIsHistoryModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 hover:border-sky-500 hover:text-sky-800 shadow-2xs'
                  : 'bg-[#0e192e] border-[#203457] hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300'
              }`}
              title="View saved programs and code history"
            >
              <FolderOpen className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
              <span className="hidden sm:inline">My Programs</span>
              <span className="sm:hidden">Programs</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                  isLight ? 'bg-sky-100 text-sky-800' : 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                }`}
              >
                {savedPrograms.length}
              </span>
            </button>

            {/* Quick Save Current Code Button */}
            <button
              type="button"
              onClick={() => setIsSaveModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                isLight
                  ? 'bg-sky-50 border-sky-300 text-sky-900 hover:bg-sky-100'
                  : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60 hover:text-white'
              }`}
              title="Save current code to history"
            >
              <Save className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Save</span>
            </button>

            {/* Examples Menu */}
            <div className="relative group">
              <button
                type="button"
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-800 hover:border-sky-500 shadow-2xs'
                    : 'bg-[#0e192e] border-[#203457] hover:border-cyan-500/50 text-slate-200'
                }`}
              >
                <Layers className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                <span className="hidden sm:inline">Sample Programs</span>
                <span className="sm:hidden">Samples</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              <div
                className={`absolute right-0 top-full mt-1.5 w-64 p-1.5 rounded-xl border shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-800'
                    : 'bg-[#091222] border-[#1e3256]'
                }`}
              >
                <div
                  className={`px-2.5 py-1.5 text-[11px] font-semibold border-b ${
                    isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-[#182742]'
                  }`}
                >
                  Select College Lab Starter:
                </div>
                {SAMPLE_EXAMPLES.map((example) => (
                  <button
                    key={example.id}
                    onClick={() => handleSelectExample(example)}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                      selectedExampleId === example.id
                        ? isLight
                          ? 'bg-sky-50 text-sky-900 font-bold'
                          : 'bg-cyan-950/60 text-cyan-300 font-semibold'
                        : isLight
                        ? 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                        : 'text-slate-300 hover:bg-[#12213d] hover:text-white'
                    }`}
                  >
                    <span>{example.title}</span>
                    {selectedExampleId === example.id && (
                      <CheckCircle2 className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* User-Selectable Theme Toggle: Dark Navy vs Light/High Contrast */}
            <button
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-300 hover:border-sky-500 text-slate-800 hover:text-sky-800 shadow-2xs'
                  : 'bg-[#0e192e] border-[#203457] hover:border-cyan-500/50 text-slate-200 hover:text-cyan-300'
              }`}
              title={`Switch to ${isLight ? 'Dark Navy' : 'Light / High Contrast'} mode`}
              aria-label="Toggle theme mode"
            >
              {isLight ? (
                <>
                  <Moon className="w-3.5 h-3.5 text-blue-600" />
                  <span>Light Contrast</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dark Navy</span>
                </>
              )}
            </button>

            {/* Shortcuts Help Button */}
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-800 hover:text-sky-800 hover:border-sky-500 shadow-2xs'
                  : 'bg-[#0e192e] border-[#203457] hover:border-cyan-500/50 text-slate-300 hover:text-cyan-300'
              }`}
              title="Keyboard shortcuts & help guide (?)"
            >
              <Keyboard className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
              <span className="hidden sm:inline">Shortcuts</span>
              <kbd
                className={`px-1 py-0.2 rounded text-[10px] font-mono hidden md:inline border ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-[#162744] border-transparent text-cyan-300'
                }`}
              >
                ?
              </kbd>
            </button>

            {/* Explain Code Button */}
            <button
              onClick={handleExplainCode}
              disabled={isExplaining || !code.trim()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50 ${
                isLight
                  ? 'bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100'
                  : 'bg-[#0d1c33] border-cyan-500/40 hover:bg-[#122644] text-cyan-300'
              }`}
              title="Explain current code line-by-line"
            >
              <BookOpen className={`w-3.5 h-3.5 ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
              <span>Explain Code</span>
            </button>

            {/* Fix Error Button beside Explain Code */}
            <button
              onClick={() => handleDebugError()}
              disabled={isDebugging || !code.trim()}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50 ${
                isLight
                  ? 'bg-rose-50 border-rose-300 text-rose-800 hover:bg-rose-100'
                  : 'bg-[#271018] border-rose-500/50 hover:bg-[#381622] text-rose-300'
              }`}
              title="Identify and fix errors in code"
            >
              <Bug className={`w-3.5 h-3.5 ${isLight ? 'text-rose-600' : 'text-rose-400'}`} />
              <span>Fix Error</span>
            </button>

            {/* Real-Time Data Structure Visualizer Button */}
            <button
              onClick={() => setConsoleTab('visualizer')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold shadow-2xs transition-all cursor-pointer ${
                consoleTab === 'visualizer'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-bold border-transparent shadow-emerald-500/25'
                  : isLight
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                  : 'bg-[#06201b] border-emerald-500/40 hover:bg-[#092e27] text-emerald-300'
              }`}
              title="Visualize lists, dictionaries, vectors & linked lists step-by-step"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>Visualize DS</span>
            </button>

            {/* Run Button */}
            <button
              onClick={handleRunCode}
              disabled={isRunning}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs tracking-wide shadow-md shadow-cyan-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              <span>Run</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Single Workspace Container */}
      <main className="flex-1 max-w-[1720px] w-full mx-auto p-3 sm:p-4 lg:p-5 flex flex-col gap-3.5">
        {/* 1. TOP: Statement to Code */}
        <section aria-label="Statement to Code">
          <StatementInput
            language={language}
            onGenerate={handleGenerateCode}
            isGenerating={isGenerating}
            generatedInfo={generatedInfo}
            theme={theme}
          />
        </section>

        {/* 2. CENTER SPLIT: Left (Code Editor + Clearly Visible Output Console Below It) & Right (AI Assistant) */}
        <section className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* Left Column (7 cols): Code Editor with Output Console below it */}
          <div className="lg:col-span-7 xl:col-span-7 flex flex-col gap-3.5">
            {/* Code Editor */}
            <div className="h-[380px] lg:h-[420px] flex flex-col">
              <CodeEditor
                code={code}
                language={language}
                onChange={setCode}
                errorLine={highlightedErrorLine}
                onReset={handleResetEditor}
                onClear={() => {
                  setCode('');
                  setStdout('');
                  setStderr('');
                  setHighlightedErrorLine(null);
                }}
                theme={theme}
                programName={activeProgramName || undefined}
                onSave={() => setIsSaveModalOpen(true)}
                onOpenHistory={() => setIsHistoryModalOpen(true)}
                onOpenModules={() => setIsModulesModalOpen(true)}
                onOpenVisualizer={() => setConsoleTab('visualizer')}
                autoSaveStatus={autoSaveStatus}
                cppStandard={cppStandard}
                onCppStandardChange={handleCppStandardChange}
                onLanguageChange={handleLanguageChange}
              />
            </div>

            {/* Output Console directly below Code Editor */}
            <div className="flex flex-col">
              <OutputConsole
                activeTab={consoleTab}
                onTabChange={setConsoleTab}
                output={stdout}
                stderr={stderr}
                stdin={stdin}
                onStdinChange={setStdin}
                executionState={executionState}
                hasError={stderr.trim().length > 0 || (exitCode !== null && exitCode !== 0)}
                errorType={errorType as any}
                exitCode={exitCode}
                executionTime={executionTime}
                onRun={handleRunCode}
                onClear={() => {
                  if (eventSourceRef.current) {
                    eventSourceRef.current.close();
                    eventSourceRef.current = null;
                  }
                  setStdout('');
                  setStderr('');
                  setExitCode(null);
                  setErrorType(null);
                  setHighlightedErrorLine(null);
                  setInputHistory([]);
                  setCurrentPrompt('');
                  setExecutionState('idle');
                }}
                onSolveError={() => {
                  setActiveAiTab('error');
                  handleDebugError();
                }}
                onStop={handleStopExecution}
                language={language}
                currentPrompt={currentPrompt}
                onSendInput={handleSendInput}
                inputHistory={inputHistory}
                onResetInputs={handleResetInputs}
                theme={theme}
                cppStandard={cppStandard}
                code={code}
                onHighlightLine={(line) => setHighlightedErrorLine(line)}
                onLoadPreset={(presetCode, presetLang) => {
                  setCode(presetCode);
                  if (presetLang !== language) {
                    setLanguage(presetLang);
                  }
                  showToast('Loaded visualizer preset code!');
                }}
                compilerInfo={compilerInfo}
              />
            </div>
          </div>

          {/* Right Column (5 cols): AI Assistant */}
          <div className="lg:col-span-5 xl:col-span-5 h-[620px] lg:h-[660px] flex flex-col sticky top-16">
            <AIAssistant
              activeTab={activeAiTab}
              onTabChange={setActiveAiTab}
              debugResult={debugResult}
              isDebugging={isDebugging}
              onApplyFix={handleApplyFix}
              onHighlightLine={(line) => setHighlightedErrorLine(line)}
              explanationResult={explanationResult}
              isExplaining={isExplaining}
              onExplainCode={handleExplainCode}
              currentCode={code}
              language={language}
              hasStderr={stderr.trim().length > 0}
              onTriggerDebug={() => handleDebugError()}
              theme={theme}
              onToast={showToast}
              onClearErrorSolver={handleClearErrorSolver}
              onClearExplanation={handleClearExplanation}
            />
          </div>
        </section>

        {/* Footer Info & Safe Isolated Execution Status */}
        <footer
          className={`flex flex-wrap items-center justify-between text-xs py-2.5 px-3.5 border-t gap-2.5 rounded-xl transition-colors ${
            isLight
              ? 'bg-white border-slate-300 text-slate-700 shadow-2xs'
              : 'bg-[#070c17]/80 border-[#131f33] text-slate-400'
          }`}
        >
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={`font-mono font-bold ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}>
                CODEPROOF AI
              </span>
              <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>•</span>
              <span className={`hidden sm:inline ${isLight ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                Beginner Python & C++
              </span>
            </div>

            {/* Small Status Indicator with Available Keyboard Shortcuts */}
            <button
              onClick={() => setIsHelpModalOpen(true)}
              className={`flex items-center gap-2 px-2.5 py-1 rounded-lg border transition-all cursor-pointer group shadow-2xs ${
                isLight
                  ? 'bg-slate-100 border-slate-300 hover:border-sky-400 hover:bg-slate-200 text-slate-800'
                  : 'bg-[#0c182c] border-[#1e345b] hover:border-cyan-500/60 hover:bg-[#10223d] text-slate-200 hover:text-cyan-200'
              }`}
              title="Click to view all keyboard shortcuts & help guide"
            >
              <Keyboard className={`w-3.5 h-3.5 group-hover:scale-110 transition-transform ${isLight ? 'text-sky-600' : 'text-cyan-400'}`} />
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <kbd
                  className={`px-1.5 py-0.5 rounded font-semibold text-[10px] border ${
                    isLight
                      ? 'bg-white text-sky-800 border-slate-300 shadow-2xs'
                      : 'bg-[#152747] text-cyan-300 border-[#274474]'
                  }`}
                >
                  Ctrl
                </kbd>
                <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>+</span>
                <kbd
                  className={`px-1.5 py-0.5 rounded font-semibold text-[10px] border ${
                    isLight
                      ? 'bg-white text-sky-800 border-slate-300 shadow-2xs'
                      : 'bg-[#152747] text-cyan-300 border-[#274474]'
                  }`}
                >
                  Enter
                </kbd>
                <span className={`ml-1 font-sans font-medium text-[11px] ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                  to Run
                </span>
              </div>
              <span className={`hidden md:inline ${isLight ? 'text-slate-400' : 'text-slate-600'}`}>•</span>
              <span className={`font-medium text-[11px] underline underline-offset-2 hidden md:inline ${isLight ? 'text-sky-700' : 'text-cyan-400'}`}>
                Shortcuts & Guide (?)
              </span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 text-[11px] ${isLight ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Isolated Execution Sandbox</span>
            </div>
            <span className={isLight ? 'text-slate-400' : 'text-slate-600'}>•</span>
            <span className={`font-mono text-[11px] ${isLight ? 'text-slate-500 font-medium' : 'text-slate-500'}`}>
              Gemini 3.1 Flash
            </span>
          </div>
        </footer>

        {/* Keyboard Shortcuts & Help Modal */}
        <KeyboardShortcutsModal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
          language={language}
          theme={theme}
        />

        {/* Save Program Modal */}
        <SaveProgramModal
          isOpen={isSaveModalOpen}
          onClose={() => setIsSaveModalOpen(false)}
          onSave={handleSaveProgram}
          currentName={activeProgramName || undefined}
          language={language}
          code={code}
          theme={theme}
        />

        {/* Code History & Saved Programs Modal */}
        <SavedProgramsModal
          isOpen={isHistoryModalOpen}
          onClose={() => setIsHistoryModalOpen(false)}
          programs={savedPrograms}
          onOpenProgram={handleOpenProgram}
          onDeleteProgram={handleDeleteProgram}
          onRenameProgram={handleRenameProgram}
          onDuplicateProgram={handleDuplicateProgram}
          onNewProgramClick={() => {
            setIsHistoryModalOpen(false);
            setIsSaveModalOpen(true);
          }}
          theme={theme}
          activeProgramId={activeProgramId}
        />

        {/* Modules & Dictionaries Explorer Modal */}
        <ModulesExplorerModal
          isOpen={isModulesModalOpen}
          onClose={() => setIsModulesModalOpen(false)}
          language={language}
          onInsertImport={handleInsertImport}
          onInsertSnippet={handleInsertSnippet}
          theme={theme}
        />
      </main>
    </div>
  );
}

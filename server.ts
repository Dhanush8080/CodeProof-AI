import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import dns from 'node:dns';
import { spawn, execSync, ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import crypto from 'node:crypto';
import { GoogleGenAI, Type } from '@google/genai';

// Prioritize IPv4 to avoid container IPv6 timeout delay
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Initialize Gemini SDK with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const MODEL_NAME = 'gemini-3.1-flash-lite';

// Helper to check API Key
function ensureApiKey(res: express.Response): boolean {
  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      error: 'GEMINI_API_KEY is not configured in Settings > Secrets.',
    });
    return false;
  }
  return true;
}

// 1. STATEMENT TO CODE
app.post('/api/generate-code', async (req, res) => {
  if (!ensureApiKey(res)) return;

  const { statement, language } = req.body;
  if (!statement || typeof statement !== 'string') {
    return res.status(400).json({ error: 'Statement is required.' });
  }

  const lang = language === 'cpp' ? 'C++ (C++17 standard)' : 'Python (Python 3)';

  try {
    const prompt = `You are CODEPROOF AI, a beginner-friendly programming mentor for college students and novice coders.
Task: Convert the following English statement into clean, production-quality, beginner-friendly ${lang} code.

User Statement:
"${statement}"

Requirements:
1. Write complete, runnable code with clear comments explaining the main steps.
2. For Python: use readable variables, standard input handling if user input is requested, and proper formatting.
3. For C++: include necessary headers (#include <iostream>, etc.), using namespace std (or std::), a clean main() function, and return 0.
4. Keep the code intuitive and simple for beginners without unnecessary complex idioms.
5. Provide a short description and 2-4 key programming concepts taught by this problem.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: 'You are CODEPROOF AI code generation engine. Return JSON matching the requested schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            code: {
              type: Type.STRING,
              description: 'The complete runnable source code without markdown wrappers.',
            },
            summary: {
              type: Type.STRING,
              description: '1-2 sentence overview of what the code does.',
            },
            keyConcepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Key concepts used (e.g., conditional statements, loops, variables).',
            },
            inputPromptNote: {
              type: Type.STRING,
              description: 'Instructions on sample inputs if the program expects user input, or empty string.',
            },
          },
          required: ['code', 'summary', 'keyConcepts'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error generating code:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate code.',
    });
  }
});

// 2. LIVE INTERACTIVE CODE EXECUTION ENGINE
// Supports continuous stdin/stdout streaming, multiple inputs, and persistent process state
interface InteractiveSession {
  id: string;
  child: ChildProcess;
  language: 'python' | 'cpp';
  tmpDir: string;
  startTime: number;
  subscribers: Set<express.Response>;
  history: Array<{ type: string; [key: string]: any }>;
  isWaiting: boolean;
  waitTimer: NodeJS.Timeout | null;
  timeoutTimer: NodeJS.Timeout;
  stderrText: string;
}

const activeSessions = new Map<string, InteractiveSession>();

function broadcastSessionEvent(
  session: InteractiveSession,
  eventData: { type: string; [key: string]: any }
) {
  session.history.push(eventData);
  const msg = `data: ${JSON.stringify(eventData)}\n\n`;
  for (const client of session.subscribers) {
    try {
      client.write(msg);
    } catch {
      session.subscribers.delete(client);
    }
  }
}

// ==================== C++ & PYTHON COMPILER / RUNTIME ERROR PARSERS ====================
function parseCppError(stderr: string): {
  errorLine: number | null;
  errorColumn: number | null;
  errorName: string;
  simpleExplanation: string;
} {
  // Check if g++ itself is missing
  if (/g\+\+:\s*not found/i.test(stderr) || /command not found/i.test(stderr) || /not found: g\+\+/i.test(stderr)) {
    return {
      errorLine: null,
      errorColumn: null,
      errorName: 'G++ Compiler Unavailable',
      simpleExplanation: 'Configuration Error: The G++ compiler (/usr/bin/g++) was not found in the execution environment. Please ensure g++ is installed and accessible in the system PATH.',
    };
  }

  const match = stderr.match(/(?:main\.cpp|[^\s:]+\.cpp):(\d+):(?:(\d+):)?\s*(error|fatal error|warning):\s*(.+)/i);
  if (!match) {
    return {
      errorLine: null,
      errorColumn: null,
      errorName: 'G++ Compilation Error',
      simpleExplanation: stderr.trim() || 'G++ encountered a syntax, header, or type error while compiling your code.',
    };
  }

  const errorLine = parseInt(match[1], 10);
  const errorColumn = match[2] ? parseInt(match[2], 10) : null;
  const rawMsg = match[4].trim();

  let errorName = 'G++ Compilation Error';
  let simpleExplanation = rawMsg;

  if (
    /expected\s*['"`‘]?(?:,|or|;|\s)+before/i.test(rawMsg) ||
    /expected\s*['"`‘]?[;,]/i.test(rawMsg) ||
    /expected\s*['"`‘]?;/i.test(rawMsg)
  ) {
    errorName = 'Missing Semicolon';
    simpleExplanation = `Line ${errorLine}: Missing semicolon ';' at or before this position. In C++, every statement must end with a semicolon.`;
  } else if (/was not declared in this scope/i.test(rawMsg)) {
    const varName = rawMsg.match(/['‘]([^'’]+)['’]/)?.[1] || 'identifier';
    errorName = `Undeclared Identifier: '${varName}'`;
    if (['cout', 'cin', 'endl', 'string', 'vector', 'map', 'unordered_map', 'set', 'unordered_set', 'make_unique', 'unique_ptr', 'sort', 'max', 'min'].includes(varName)) {
      simpleExplanation = `Line ${errorLine}: '${varName}' is not recognized. Did you remember to #include the header (<iostream>, <vector>, <string>, <algorithm>, etc.) and use 'std::${varName}' or 'using namespace std;'?`;
    } else {
      simpleExplanation = `Line ${errorLine}: '${varName}' is used before being declared or is outside its scope. Make sure you declare its type first (e.g. 'int ${varName};').`;
    }
  } else if (/No such file or directory/i.test(rawMsg)) {
    const header = rawMsg.match(/[<"‘]([^>"’]+)[>"’]/)?.[1] || 'header';
    errorName = `Header Not Found: <${header}>`;
    simpleExplanation = `Line ${errorLine}: The header file <${header}> was not found. Standard C++ headers include <iostream>, <vector>, <string>, <algorithm>, <map>, <set>, <unordered_map>, <cmath>, <memory>.`;
  } else if (/make_unique/i.test(rawMsg) && (/is not a member of/i.test(rawMsg) || /not declared/i.test(rawMsg))) {
    errorName = 'C++ Standard Mismatch (std::make_unique)';
    simpleExplanation = `Line ${errorLine}: 'std::make_unique' requires C++14 or higher. Please switch your compiler standard to C++14, C++17, or C++20.`;
  } else if (/structured binding/i.test(rawMsg) || /decomposition declaration/i.test(rawMsg)) {
    errorName = 'C++ Standard Mismatch (Structured Binding)';
    simpleExplanation = `Line ${errorLine}: Structured binding syntax (auto [k, v]) requires C++17 or higher.`;
  } else if (/no matching function for call/i.test(rawMsg)) {
    errorName = 'Function Signature Mismatch';
    simpleExplanation = `Line ${errorLine}: No function matches the arguments provided. Check the number and types of arguments.`;
  } else if (/cannot convert/i.test(rawMsg) || /invalid conversion/i.test(rawMsg)) {
    errorName = 'Type Mismatch';
    simpleExplanation = `Line ${errorLine}: Incompatible data types. Check that variable assignments and function return types match.`;
  }

  return { errorLine, errorColumn, errorName, simpleExplanation };
}

function parsePythonError(stderr: string): {
  errorLine: number | null;
  errorName: string;
  simpleExplanation: string;
} {
  const lineMatch =
    stderr.match(/File\s*["'][^"']*main\.py["'],\s*line\s*(\d+)/i) ||
    stderr.match(/line\s*(\d+)/i);
  const errorLine = lineMatch ? parseInt(lineMatch[1], 10) : null;

  const typeMatch = stderr.match(
    /(ModuleNotFoundError|ImportError|KeyError|IndexError|ZeroDivisionError|NameError|TypeError|ValueError|IndentationError|SyntaxError|AttributeError|FileNotFoundError):\s*(.*)/
  );

  if (!typeMatch) {
    return {
      errorLine,
      errorName: 'Python Runtime Error',
      simpleExplanation: stderr.split('\n').filter(Boolean).pop() || 'An error occurred during Python execution.',
    };
  }

  const errorType = typeMatch[1];
  const detail = typeMatch[2].trim();
  let simpleExplanation = detail;

  switch (errorType) {
    case 'ModuleNotFoundError':
    case 'ImportError': {
      const mod = detail.match(/'([^']+)'/)?.[1] || detail;
      simpleExplanation = `Module '${mod}' is not found. Standard modules (math, random, datetime, os, sys, collections, itertools, functools, statistics, json, re) and scientific libraries (pandas, numpy) are pre-installed.`;
      break;
    }
    case 'KeyError': {
      const key = detail.match(/['"]?([^'"]+)['"]?/)?.[1] || detail;
      simpleExplanation = `Key '${key}' not found in dictionary. Tip: Use dict.get('${key}') or check 'if "${key}" in dict:' before accessing.`;
      break;
    }
    case 'IndexError': {
      simpleExplanation = `List index out of range. You tried to access an index that exceeds the length of the list/sequence.`;
      break;
    }
    case 'ZeroDivisionError': {
      simpleExplanation = `Cannot divide by zero. Make sure denominator is not 0 before performing division.`;
      break;
    }
    case 'NameError': {
      const name = detail.match(/'([^']+)'/)?.[1] || 'variable';
      simpleExplanation = `Name '${name}' is not defined. Did you define it before using it or misspell the variable name?`;
      break;
    }
    case 'TypeError': {
      simpleExplanation = `Type mismatch: ${detail}. Ensure data types (e.g. str vs int) are compatible.`;
      break;
    }
    case 'IndentationError': {
      simpleExplanation = `Indentation error: Python relies on consistent indentation (4 spaces per block). Check tabs vs spaces.`;
      break;
    }
    case 'SyntaxError': {
      simpleExplanation = `Syntax error: Python encountered invalid syntax. Check for missing colons ':', unmatched parentheses or quotes.`;
      break;
    }
    case 'AttributeError': {
      simpleExplanation = `Attribute error: ${detail}. The object does not possess the requested method or attribute.`;
      break;
    }
    case 'FileNotFoundError': {
      simpleExplanation = `File not found: ${detail}. Ensure the file path exists or create the file before reading.`;
      break;
    }
  }

  return {
    errorLine,
    errorName: errorType,
    simpleExplanation,
  };
}

// ==================== COMPILER & RUNTIME ENVIRONMENT INFO ====================
// Dynamically verifies installed compilers without assuming or hardcoding
app.get('/api/compiler-info', (_req, res) => {
  let gppAvailable = false;
  let gppVersion: string | null = null;
  let gppFullVersion: string | null = null;
  let gppPath: string | null = null;

  try {
    const whichOut = execSync('which g++', { encoding: 'utf-8', timeout: 3000 }).trim();
    if (whichOut) {
      gppPath = whichOut;
      const verOut = execSync('g++ --version', { encoding: 'utf-8', timeout: 3000 });
      const firstLine = verOut.split('\n')[0].trim();
      gppFullVersion = firstLine;
      const verMatch = firstLine.match(/(\d+\.\d+(?:\.\d+)?)/);
      gppVersion = verMatch ? verMatch[1] : null;
      gppAvailable = true;
    }
  } catch {
    gppAvailable = false;
  }

  let pythonAvailable = false;
  let pythonVersion: string | null = null;
  let pythonFullVersion: string | null = null;

  try {
    const pyOut = execSync('python3 --version', { encoding: 'utf-8', timeout: 3000 }).trim();
    pythonFullVersion = pyOut;
    const pyMatch = pyOut.match(/(\d+\.\d+(?:\.\d+)?)/);
    pythonVersion = pyMatch ? pyMatch[1] : null;
    pythonAvailable = true;
  } catch {
    pythonAvailable = false;
  }

  return res.json({
    gpp: {
      available: gppAvailable,
      version: gppVersion,
      fullVersion: gppFullVersion,
      path: gppPath,
      supportedStandards: ['c++20', 'c++17', 'c++14', 'c++11'],
    },
    python: {
      available: pythonAvailable,
      version: pythonVersion,
      fullVersion: pythonFullVersion,
    },
  });
});

// Start Interactive Session
app.post('/api/interactive/start', async (req, res) => {
  const { code, language, initialStdin, cppStandard = 'c++20' } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code content is required.' });
  }

  const lang = language === 'cpp' ? 'cpp' : 'python';
  const sessionId = crypto.randomUUID();
  const tmpDir = path.join(os.tmpdir(), `codeproof_${sessionId}`);

  try {
    fs.mkdirSync(tmpDir, { recursive: true });

    // Sanitized environment without sensitive API keys
    const sanitizedEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
      HOME: tmpDir,
      LANG: 'C.UTF-8',
      PYTHONUNBUFFERED: '1',
    };

    let child: ChildProcess;

    if (lang === 'cpp') {
      const srcPath = path.join(tmpDir, 'main.cpp');
      const binPath = path.join(tmpDir, 'main.out');
      fs.writeFileSync(srcPath, code, 'utf-8');

      // Verify G++ is available in environment
      let gppAvailable = false;
      try {
        execSync('which g++', { env: sanitizedEnv, stdio: ['pipe', 'pipe', 'pipe'] });
        gppAvailable = true;
      } catch {
        gppAvailable = false;
      }

      if (!gppAvailable) {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}
        return res.json({
          success: false,
          isCompileError: true,
          error: 'Configuration Error: G++ compiler (/usr/bin/g++) is not found in the execution environment.',
          errorName: 'G++ Compiler Unavailable',
          errorLine: null,
          errorColumn: null,
          simpleExplanation: 'Configuration Error: The G++ compiler was not found on this system. Please ensure g++ is installed.',
          exitCode: 127,
        });
      }

      // Modern C++ standard selection (c++20, c++17, c++14, c++11)
      const validStandards = ['c++20', 'c++17', 'c++14', 'c++11'];
      const chosenStd = validStandards.includes(cppStandard) ? cppStandard : 'c++20';

      // Compile C++ with g++ using chosen standard
      try {
        execSync(`g++ -O2 -std=${chosenStd} -Wall "${srcPath}" -o "${binPath}"`, {
          cwd: tmpDir,
          env: sanitizedEnv,
          timeout: 12000,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (compileErr: any) {
        const stderr = compileErr.stderr
          ? compileErr.stderr.toString()
          : compileErr.message;
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}

        const parsed = parseCppError(stderr);
        return res.json({
          success: false,
          isCompileError: true,
          error: stderr || 'C++ compilation failed.',
          errorName: parsed.errorName,
          errorLine: parsed.errorLine,
          errorColumn: parsed.errorColumn,
          simpleExplanation: parsed.simpleExplanation,
          exitCode: 1,
        });
      }

      child = spawn(binPath, [], {
        cwd: tmpDir,
        env: sanitizedEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } else {
      // Python (Python 3.10 with standard library + pandas + numpy)
      const srcPath = path.join(tmpDir, 'main.py');
      fs.writeFileSync(srcPath, code, 'utf-8');

      child = spawn('python3', ['-u', srcPath], {
        cwd: tmpDir,
        env: sanitizedEnv,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    }

    if (initialStdin && typeof initialStdin === 'string' && initialStdin.length > 0 && child.stdin) {
      child.stdin.write(initialStdin.endsWith('\n') ? initialStdin : initialStdin + '\n');
    }

    const session: InteractiveSession = {
      id: sessionId,
      child,
      language: lang,
      tmpDir,
      startTime: Date.now(),
      subscribers: new Set(),
      history: [],
      isWaiting: false,
      waitTimer: null,
      stderrText: '',
      timeoutTimer: setTimeout(() => {
        broadcastSessionEvent(session, {
          type: 'error',
          message: 'Execution session timed out (maximum 60 seconds limit).',
        });
        child.kill('SIGKILL');
      }, 60000),
    };

    // Forward stdout in real time & detect input requests
    let lastStdoutLine = '';
    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      const lines = text.trim().split('\n');
      if (lines.length > 0) {
        lastStdoutLine = lines[lines.length - 1];
      }

      broadcastSessionEvent(session, { type: 'stdout', text });

      // Detect if process pauses waiting for input
      if (session.waitTimer) clearTimeout(session.waitTimer);
      session.isWaiting = false;

      session.waitTimer = setTimeout(() => {
        if (!child.killed && child.exitCode === null) {
          session.isWaiting = true;
          broadcastSessionEvent(session, {
            type: 'waiting_input',
            prompt: lastStdoutLine || '',
          });
        }
      }, 60);
    });

    // Forward stderr in real time
    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      session.stderrText += text;
      broadcastSessionEvent(session, { type: 'stderr', text });

      if (session.waitTimer) clearTimeout(session.waitTimer);
      session.waitTimer = setTimeout(() => {
        if (!child.killed && child.exitCode === null) {
          session.isWaiting = true;
          broadcastSessionEvent(session, {
            type: 'waiting_input',
            prompt: lastStdoutLine || '',
          });
        }
      }, 60);
    });

    // Handle process termination
    child.on('close', (code, signal) => {
      if (session.waitTimer) clearTimeout(session.waitTimer);
      clearTimeout(session.timeoutTimer);

      const elapsedMs = Date.now() - session.startTime;
      const executionTime = `${elapsedMs}ms`;
      const exitCodeVal = code ?? (signal ? 137 : 0);

      let parsedError: any = null;
      if (exitCodeVal !== 0 && session.stderrText.trim()) {
        parsedError =
          session.language === 'cpp'
            ? parseCppError(session.stderrText)
            : parsePythonError(session.stderrText);
      }

      broadcastSessionEvent(session, {
        type: 'done',
        exitCode: exitCodeVal,
        executionTime,
        parsedError,
      });

      // Cleanup tmpDir after short grace period
      setTimeout(() => {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {}
        activeSessions.delete(sessionId);
      }, 5000);
    });

    child.on('error', (err) => {
      broadcastSessionEvent(session, {
        type: 'error',
        message: err.message || 'Process error',
      });
    });

    activeSessions.set(sessionId, session);
    return res.json({ success: true, sessionId });
  } catch (error: any) {
    console.error('Failed to start interactive session:', error);
    return res.status(500).json({
      error: error.message || 'Failed to start execution session.',
    });
  }
});

// SSE Stream for Interactive Session
app.get('/api/interactive/stream/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found or already closed.' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Replay existing history to new subscriber
  for (const evt of session.history) {
    res.write(`data: ${JSON.stringify(evt)}\n\n`);
  }

  session.subscribers.add(res);

  req.on('close', () => {
    session.subscribers.delete(res);
  });
});

// Send Input to Running Process's Stdin
app.post('/api/interactive/input/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { input = '' } = req.body;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }

  if (session.child && session.child.stdin && session.child.stdin.writable) {
    session.isWaiting = false;
    broadcastSessionEvent(session, { type: 'user_input', text: input });
    session.child.stdin.write(input + '\n');
    return res.json({ success: true });
  } else {
    return res.status(400).json({ error: 'Process stdin is not writable.' });
  }
});

// Stop Running Process
app.post('/api/interactive/stop/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);

  if (!session) {
    return res.json({ success: true, message: 'Session already terminated.' });
  }

  try {
    session.child.kill('SIGTERM');
    setTimeout(() => {
      if (!session.child.killed) {
        session.child.kill('SIGKILL');
      }
    }, 400);
    broadcastSessionEvent(session, { type: 'stopped' });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to stop process.' });
  }
});

// 3. SECURE LOCAL ISOLATED CODE EXECUTION ENGINE (G++ 12.3 & Python 3.10)
function executeLocally(
  code: string,
  language: string,
  stdin: string,
  cppStandard = 'c++20'
): {
  success: boolean;
  hasError: boolean;
  errorType: 'compile' | 'runtime' | null;
  errorName?: string;
  errorLine?: number | null;
  errorColumn?: number | null;
  simpleExplanation?: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  executionTime: string;
  waitingForInput: boolean;
} {
  const tmpDir = path.join(os.tmpdir(), `codeproof_run_${crypto.randomUUID()}`);
  fs.mkdirSync(tmpDir, { recursive: true });

  const sanitizedEnv: NodeJS.ProcessEnv = {
    PATH: process.env.PATH || '/usr/local/bin:/usr/bin:/bin',
    HOME: tmpDir,
    LANG: 'C.UTF-8',
    PYTHONUNBUFFERED: '1',
  };

  const startTime = Date.now();

  try {
    if (language === 'cpp') {
      const srcPath = path.join(tmpDir, 'main.cpp');
      const binPath = path.join(tmpDir, 'main.out');

      // If C++ code expects input and no stdin is provided, instrument with streambuf EOF hook
      let preparedCode = code;
      if (/cin\s*>>|getline\s*\(\s*cin|scanf\s*\(/.test(code) && (!stdin || !stdin.trim())) {
        preparedCode = `#include <iostream>
#include <streambuf>
#include <cstdlib>
struct __EofDetectBuf : public std::streambuf {
    std::streambuf* orig;
    __EofDetectBuf(std::streambuf* o) : orig(o) {}
    int_type underflow() override {
        int_type ch = orig->sgetc();
        if (ch == traits_type::eof()) {
            std::cerr << "\\n__INPUT_REQUIRED__\\n";
            std::exit(42);
        }
        return ch;
    }
    int_type uflow() override {
        int_type ch = orig->sbumpc();
        if (ch == traits_type::eof()) {
            std::cerr << "\\n__INPUT_REQUIRED__\\n";
            std::exit(42);
        }
        return ch;
    }
};
__attribute__((constructor)) static void __init_eof_detect() {
    static __EofDetectBuf buf(std::cin.rdbuf());
    std::cin.rdbuf(&buf);
}
#line 1
${code}`;
      }

      fs.writeFileSync(srcPath, preparedCode, 'utf-8');

      const validStandards = ['c++20', 'c++17', 'c++14', 'c++11'];
      const chosenStd = validStandards.includes(cppStandard) ? cppStandard : 'c++20';

      // Verify G++ is available in environment
      let gppAvailable = false;
      try {
        execSync('which g++', { env: sanitizedEnv, stdio: ['pipe', 'pipe', 'pipe'] });
        gppAvailable = true;
      } catch {
        gppAvailable = false;
      }

      if (!gppAvailable) {
        return {
          success: false,
          hasError: true,
          errorType: 'compile',
          errorName: 'G++ Compiler Unavailable',
          errorLine: null,
          errorColumn: null,
          simpleExplanation: 'Configuration Error: The G++ compiler (/usr/bin/g++) was not found on this system. Please ensure g++ is installed.',
          stdout: '',
          stderr: 'Configuration Error: /bin/sh: 1: g++: not found',
          exitCode: 127,
          executionTime: `${Date.now() - startTime}ms`,
          waitingForInput: false,
        };
      }

      try {
        execSync(`g++ -O2 -std=${chosenStd} -Wall "${srcPath}" -o "${binPath}"`, {
          cwd: tmpDir,
          env: sanitizedEnv,
          timeout: 12000,
          stdio: ['pipe', 'pipe', 'pipe'],
        });
      } catch (compileErr: any) {
        const stderr = compileErr.stderr ? compileErr.stderr.toString() : compileErr.message;
        const parsed = parseCppError(stderr);
        return {
          success: false,
          hasError: true,
          errorType: 'compile',
          errorName: parsed.errorName,
          errorLine: parsed.errorLine,
          errorColumn: parsed.errorColumn,
          simpleExplanation: parsed.simpleExplanation,
          stdout: '',
          stderr,
          exitCode: 1,
          executionTime: `${Date.now() - startTime}ms`,
          waitingForInput: false,
        };
      }

      // Execute compiled binary
      try {
        const stdout = execSync(`"${binPath}"`, {
          cwd: tmpDir,
          env: sanitizedEnv,
          input: stdin || '',
          timeout: 10000,
          stdio: ['pipe', 'pipe', 'pipe'],
        }).toString('utf-8');

        return {
          success: true,
          hasError: false,
          errorType: null,
          stdout,
          stderr: '',
          exitCode: 0,
          executionTime: `${Date.now() - startTime}ms`,
          waitingForInput: false,
        };
      } catch (runErr: any) {
        const stdout = runErr.stdout ? runErr.stdout.toString('utf-8') : '';
        const stderr = runErr.stderr ? runErr.stderr.toString('utf-8') : runErr.message;
        const exitCode = runErr.status ?? 1;

        const isInputReq = stderr.includes('__INPUT_REQUIRED__') || exitCode === 42;
        const parsed = parseCppError(stderr);

        return {
          success: isInputReq,
          hasError: !isInputReq,
          errorType: isInputReq ? null : 'runtime',
          errorName: isInputReq ? undefined : parsed.errorName,
          errorLine: isInputReq ? undefined : parsed.errorLine,
          simpleExplanation: isInputReq ? undefined : parsed.simpleExplanation,
          stdout,
          stderr: isInputReq ? '' : stderr,
          exitCode: isInputReq ? 0 : exitCode,
          executionTime: `${Date.now() - startTime}ms`,
          waitingForInput: isInputReq,
        };
      }
    } else {
      // Python 3.10 with full standard library + pandas + numpy
      const srcPath = path.join(tmpDir, 'main.py');
      fs.writeFileSync(srcPath, code, 'utf-8');

      try {
        const stdout = execSync(`python3 -u "${srcPath}"`, {
          cwd: tmpDir,
          env: sanitizedEnv,
          input: stdin || '',
          timeout: 10000,
          stdio: ['pipe', 'pipe', 'pipe'],
        }).toString('utf-8');

        return {
          success: true,
          hasError: false,
          errorType: null,
          stdout,
          stderr: '',
          exitCode: 0,
          executionTime: `${Date.now() - startTime}ms`,
          waitingForInput: false,
        };
      } catch (runErr: any) {
        const stdout = runErr.stdout ? runErr.stdout.toString('utf-8') : '';
        const stderr = runErr.stderr ? runErr.stderr.toString('utf-8') : runErr.message;
        const exitCode = runErr.status ?? 1;

        const isPyWaiting =
          stderr.includes('EOFError') || stderr.includes('EOF when reading a line');
        const parsed = parsePythonError(stderr);

        return {
          success: isPyWaiting,
          hasError: !isPyWaiting,
          errorType: isPyWaiting ? null : 'runtime',
          errorName: isPyWaiting ? undefined : parsed.errorName,
          errorLine: isPyWaiting ? undefined : parsed.errorLine,
          simpleExplanation: isPyWaiting ? undefined : parsed.simpleExplanation,
          stdout,
          stderr: isPyWaiting ? '' : stderr,
          exitCode: isPyWaiting ? 0 : exitCode,
          executionTime: `${Date.now() - startTime}ms`,
          waitingForInput: isPyWaiting,
        };
      }
    }
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
}

app.post('/api/execute', (req, res) => {
  const { code, language, stdin = '', cppStandard = 'c++20' } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code content is required.' });
  }

  try {
    const result = executeLocally(code, language, stdin, cppStandard);
    return res.json(result);
  } catch (error: any) {
    console.error('Execution error:', error);
    return res.status(500).json({
      success: false,
      hasError: true,
      errorType: 'runtime',
      stderr: `Execution error: ${error.message || 'Unable to execute program.'}`,
      stdout: '',
      exitCode: -1,
      waitingForInput: false,
    });
  }
});

// 3. AI ERROR SOLVER
app.post('/api/debug-error', async (req, res) => {
  if (!ensureApiKey(res)) return;

  const { code, language, errorOutput, userStatement } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required.' });
  }

  const lang = language === 'cpp' ? 'C++' : 'Python';
  const hasSpecificError = errorOutput && errorOutput.trim().length > 0;

  try {
    const prompt = `You are CODEPROOF AI, a patient, expert programming teacher helping beginners and college students solve code bugs.
Language: ${lang}

--- SOURCE CODE ---
${code}

${hasSpecificError ? `--- ERROR OUTPUT FROM RUNTIME / COMPILER ---\n${errorOutput}` : '--- PROACTIVE CODE AUDIT ---\nStudent clicked "Fix Error" to inspect and fix any syntax errors, undeclared variables, missing includes/imports, type mismatches, indexing bugs, or infinite loops in this code.'}

${userStatement ? `Context/Original goal: ${userStatement}` : ''}

Your tasks:
1. Identify the primary error or most critical bug (e.g. Missing semicolon, IndexError, ZeroDivisionError, IndentationError, Undeclared variable).
2. Pinpoint the exact line number where this bug occurs or originates (1-indexed). If code has no error, set lineNumber to 0.
3. Explain in plain, encouraging, beginner-friendly English what this error means.
4. Explain clearly WHY it happened with a simple real-world analogy.
5. Provide the complete corrected source code ready to replace in the editor.
6. Provide a concise summary of what was fixed.
7. Give 2-3 prevention tips for college lab exams and assignments.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: 'You are CODEPROOF AI Debugger. Always return well-structured JSON adhering strictly to the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            errorName: {
              type: Type.STRING,
              description: 'Clear name of the error (e.g. SyntaxError, Missing Semicolon, IndexError)',
            },
            simpleExplanation: {
              type: Type.STRING,
              description: 'Simple 1-2 sentence explanation in beginner-friendly language.',
            },
            lineNumber: {
              type: Type.INTEGER,
              description: 'Line number where the error occurs (1-indexed), or 0 if none.',
            },
            whyItHappened: {
              type: Type.STRING,
              description: 'Detailed explanation of why the computer flagged this error.',
            },
            correctedCode: {
              type: Type.STRING,
              description: 'The complete, fully corrected runnable code ready to paste into the editor.',
            },
            diffSummary: {
              type: Type.STRING,
              description: 'Short sentence describing exactly what was fixed.',
            },
            preventionTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2-3 quick tips for beginners to avoid this bug in the future.',
            },
          },
          required: [
            'errorName',
            'simpleExplanation',
            'lineNumber',
            'whyItHappened',
            'correctedCode',
            'diffSummary',
            'preventionTips',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error debugging code:', error);
    return res.status(500).json({
      error: error.message || 'Failed to analyze error.',
    });
  }
});

// 4. AI CODE EXPLANATION
app.post('/api/explain-code', async (req, res) => {
  if (!ensureApiKey(res)) return;

  const { code, language } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required.' });
  }

  const lang = language === 'cpp' ? 'C++' : 'Python';

  try {
    const prompt = `You are CODEPROOF AI, a top tutor for first-year computer science students.
Explain the following ${lang} code LINE BY LINE so any beginner can understand every step:

--- CODE ---
${code}

Requirements:
1. Provide a high-level summary of what the whole program accomplishes.
2. Break down the code into consecutive lines or small logical blocks with beginner-friendly explanations.
3. For each step, provide a simple example or rule of thumb to make it stick.
4. Mention the time and space complexity in simple terms.
5. Give one key takeaway concept for college exams.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: 'You are the CODEPROOF AI Explainer. Return valid JSON adhering to the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: {
              type: Type.STRING,
              description: 'High-level overview of what this program achieves.',
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  lines: {
                    type: Type.STRING,
                    description: 'Line number or range, e.g. "Line 1" or "Lines 3-5"',
                  },
                  codeSnippet: {
                    type: Type.STRING,
                    description: 'The snippet of code being explained.',
                  },
                  explanation: {
                    type: Type.STRING,
                    description: 'Plain English beginner explanation.',
                  },
                  beginnerTip: {
                    type: Type.STRING,
                    description: 'Helpful rule of thumb, analogy, or beginner tip.',
                  },
                },
                required: ['lines', 'codeSnippet', 'explanation'],
              },
            },
            complexity: {
              type: Type.STRING,
              description: 'Time and space complexity explained simply.',
            },
            keyTakeaway: {
              type: Type.STRING,
              description: 'One key takeaway lesson from this code.',
            },
          },
          required: ['overview', 'steps', 'complexity', 'keyTakeaway'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (error: any) {
    console.error('Error explaining code:', error);
    return res.status(500).json({
      error: error.message || 'Failed to explain code.',
    });
  }
});

// 5. AI ASSISTANT CHAT FOR CODE QUESTIONS
app.post('/api/ask-assistant', async (req, res) => {
  if (!ensureApiKey(res)) return;

  const { question, code, language, history } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question is required.' });
  }

  const lang = language === 'cpp' ? 'C++' : 'Python';

  try {
    const formattedHistory = Array.isArray(history)
      ? history.map((msg: any) => ({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        }))
      : [];

    const systemInstruction = `You are CODEPROOF AI Assistant, a friendly, encouraging coding tutor for beginners and college students.
Current Language: ${lang}
Current Code in Editor:
\`\`\`
${code || '// No code written yet'}
\`\`\`
Guidelines:
- Keep answers concise, clear, and encouraging.
- Provide practical code examples when helpful.
- Help students learn the "why" and "how".`;

    const contents = [
      ...formattedHistory,
      {
        role: 'user',
        parts: [{ text: `Regarding this ${lang} program: ${question}` }],
      },
    ];

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction,
      },
    });

    return res.json({
      reply: response.text || 'I am ready to help you with your code!',
    });
  } catch (error: any) {
    console.error('Chat assistant error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to get answer from assistant.',
    });
  }
});

// 6. REAL-TIME DATA STRUCTURE EXECUTION VISUALIZER ENGINE
app.post('/api/visualize-trace', async (req, res) => {
  const { code, language } = req.body;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code content is required.' });
  }

  const lang = language === 'cpp' ? 'cpp' : 'python';

  if (lang === 'python') {
    // Attempt 1: Run native Python tracer for 100% accurate runtime memory tracking
    try {
      const tmpFile = path.join(os.tmpdir(), `trace_${crypto.randomUUID()}.py`);
      fs.writeFileSync(tmpFile, code, 'utf-8');
      try {
        const tracerPath = path.join(process.cwd(), 'tracer.py');
        const output = execSync(`python3 "${tracerPath}" "${tmpFile}"`, {
          timeout: 8000,
          maxBuffer: 10 * 1024 * 1024,
        }).toString('utf-8');
        const steps = JSON.parse(output);
        if (Array.isArray(steps) && steps.length > 0) {
          return res.json({ success: true, steps, engine: 'python_native' });
        }
      } finally {
        try {
          fs.unlinkSync(tmpFile);
        } catch {}
      }
    } catch (err: any) {
      console.warn('Native Python trace runner note:', err.message);
    }
  }

  // Attempt 2 / C++ Execution Tracer: AI-powered line-by-line memory tracer
  if (!ensureApiKey(res)) return;

  try {
    const prompt = `You are a computer science execution tracer and memory visualizer for student code in ${lang === 'cpp' ? 'C++' : 'Python'}.
SOURCE CODE:
\`\`\`${lang}
${code}
\`\`\`

Task:
Simulate the line-by-line execution of this program and output a step-by-step sequence of memory snapshots capturing data structures (vectors/arrays as 'list', hash maps/dictionaries as 'dict', linked lists/nodes as 'linked_list', and primitive variables).

Instructions:
1. Provide up to 25 meaningful execution steps showing how data structures are allocated, populated, modified, or traversed.
2. For arrays / vectors: type='list', values=[{type: 'primitive', value: X}, ...], length: N.
3. For dictionaries / maps: type='dict', entries=[{key: "k", value: {type: 'primitive', value: V}}], size: N.
4. For linked lists: type='linked_list', headId: "node_1", nodes=[{id: "node_1", val: {type: 'primitive', value: X}, nextId: "node_2"}], hasCycle: false.
5. For scalar variables (int, float, bool, string): type='primitive', value: X.
6. Provide concise, student-friendly explanation for each step (e.g. "Pushed 42 to vector 'nums'", "Created node with val 20", "Inserted key 'Alice' in map").`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        systemInstruction: 'You are an execution tracer. Return JSON strictly matching the schema.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            steps: {
              type: Type.ARRAY,
              description: 'Step-by-step execution snapshots',
              items: {
                type: Type.OBJECT,
                properties: {
                  step: { type: Type.INTEGER },
                  line: { type: Type.INTEGER },
                  explanation: { type: Type.STRING },
                  variablesList: {
                    type: Type.ARRAY,
                    description: 'All variables currently in scope at this step',
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: { type: Type.STRING },
                        type: {
                          type: Type.STRING,
                          description: 'One of: list, dict, linked_list, primitive',
                        },
                        primitiveValue: { type: Type.STRING },
                        listValues: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                          description: 'Items if vector/array/list',
                        },
                        dictEntries: {
                          type: Type.ARRAY,
                          description: 'Entries if map/dictionary',
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              key: { type: Type.STRING },
                              value: { type: Type.STRING },
                            },
                            required: ['key', 'value'],
                          },
                        },
                        linkedListNodes: {
                          type: Type.ARRAY,
                          description: 'Nodes if linked list',
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              id: { type: Type.STRING },
                              val: { type: Type.STRING },
                              nextId: { type: Type.STRING },
                            },
                            required: ['id', 'val'],
                          },
                        },
                      },
                      required: ['name', 'type'],
                    },
                  },
                },
                required: ['step', 'line', 'explanation', 'variablesList'],
              },
            },
          },
          required: ['steps'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const rawSteps = parsed.steps || [];

    // Transform variablesList into standardized variables map
    const transformedSteps = rawSteps.map((s: any) => {
      const varsMap: Record<string, any> = {};
      if (Array.isArray(s.variablesList)) {
        for (const item of s.variablesList) {
          if (item.type === 'list') {
            const vals = (item.listValues || []).map((v: any) => ({
              type: 'primitive',
              value: isNaN(Number(v)) ? v : Number(v),
            }));
            varsMap[item.name] = {
              type: 'list',
              values: vals,
              length: vals.length,
            };
          } else if (item.type === 'dict') {
            const entries = (item.dictEntries || []).map((e: any) => ({
              key: e.key,
              value: {
                type: 'primitive',
                value: isNaN(Number(e.value)) ? e.value : Number(e.value),
              },
            }));
            varsMap[item.name] = {
              type: 'dict',
              entries,
              size: entries.length,
            };
          } else if (item.type === 'linked_list') {
            const nodes = (item.linkedListNodes || []).map((n: any) => ({
              id: n.id,
              val: {
                type: 'primitive',
                value: isNaN(Number(n.val)) ? n.val : Number(n.val),
              },
              nextId: n.nextId || null,
            }));
            varsMap[item.name] = {
              type: 'linked_list',
              headId: nodes[0]?.id,
              nodes,
              hasCycle: false,
            };
          } else {
            const rawVal = item.primitiveValue;
            varsMap[item.name] = {
              type: 'primitive',
              value:
                rawVal === 'true'
                  ? true
                  : rawVal === 'false'
                  ? false
                  : isNaN(Number(rawVal))
                  ? rawVal
                  : Number(rawVal),
            };
          }
        }
      }

      return {
        step: s.step,
        line: s.line,
        explanation: s.explanation,
        variables: varsMap,
      };
    });

    return res.json({
      success: true,
      steps: transformedSteps,
      engine: 'ai_tracer',
    });
  } catch (error: any) {
    console.error('Visualizer trace generation failed:', error);
    return res.status(500).json({
      error: error.message || 'Failed to generate execution trace.',
    });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve('.', 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('.', 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CODEPROOF AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();

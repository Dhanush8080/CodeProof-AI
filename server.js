import express from "express";
import dotenv from "dotenv";
import path from "path";
import dns from "node:dns";
import { spawn, execSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import crypto from "node:crypto";
import { GoogleGenAI, Type } from "@google/genai";
dns.setDefaultResultOrder("ipv4first");
dotenv.config();
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3e3;
app.use(express.json());
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || "",
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build"
    }
  }
});
const MODEL_NAME = "gemini-3.1-flash-lite";
function ensureApiKey(res) {
  if (!process.env.GEMINI_API_KEY) {
    res.status(500).json({
      error: "GEMINI_API_KEY is not configured in Settings > Secrets."
    });
    return false;
  }
  return true;
}
app.post("/api/generate-code", async (req, res) => {
  if (!ensureApiKey(res)) return;
  const { statement, language } = req.body;
  if (!statement || typeof statement !== "string") {
    return res.status(400).json({ error: "Statement is required." });
  }
  const lang = language === "cpp" ? "C++ (C++17 standard)" : "Python (Python 3)";
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
        systemInstruction: "You are CODEPROOF AI code generation engine. Return JSON matching the requested schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            code: {
              type: Type.STRING,
              description: "The complete runnable source code without markdown wrappers."
            },
            summary: {
              type: Type.STRING,
              description: "1-2 sentence overview of what the code does."
            },
            keyConcepts: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Key concepts used (e.g., conditional statements, loops, variables)."
            },
            inputPromptNote: {
              type: Type.STRING,
              description: "Instructions on sample inputs if the program expects user input, or empty string."
            }
          },
          required: ["code", "summary", "keyConcepts"]
        }
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("Error generating code:", error);
    return res.status(500).json({
      error: error.message || "Failed to generate code."
    });
  }
});
const activeSessions = /* @__PURE__ */ new Map();
function broadcastSessionEvent(session, eventData) {
  session.history.push(eventData);
  const msg = `data: ${JSON.stringify(eventData)}

`;
  for (const client of session.subscribers) {
    try {
      client.write(msg);
    } catch {
      session.subscribers.delete(client);
    }
  }
}
app.post("/api/interactive/start", async (req, res) => {
  const { code, language, initialStdin } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Code content is required." });
  }
  const lang = language === "cpp" ? "cpp" : "python";
  const sessionId = crypto.randomUUID();
  const tmpDir = path.join(os.tmpdir(), `codeproof_${sessionId}`);
  try {
    fs.mkdirSync(tmpDir, { recursive: true });
    const sanitizedEnv = {
      PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
      HOME: tmpDir,
      LANG: "C.UTF-8",
      PYTHONUNBUFFERED: "1"
    };
    let child;
    if (lang === "cpp") {
      const srcPath = path.join(tmpDir, "main.cpp");
      const binPath = path.join(tmpDir, "main.out");
      fs.writeFileSync(srcPath, code, "utf-8");
      try {
        execSync(`g++ -O2 -std=c++17 -Wall "${srcPath}" -o "${binPath}"`, {
          cwd: tmpDir,
          env: sanitizedEnv,
          timeout: 1e4,
          stdio: ["pipe", "pipe", "pipe"]
        });
      } catch (compileErr) {
        const stderr = compileErr.stderr ? compileErr.stderr.toString() : compileErr.message;
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
        }
        return res.json({
          success: false,
          isCompileError: true,
          error: stderr || "C++ compilation failed.",
          exitCode: 1
        });
      }
      child = spawn(binPath, [], {
        cwd: tmpDir,
        env: sanitizedEnv,
        stdio: ["pipe", "pipe", "pipe"]
      });
    } else {
      const srcPath = path.join(tmpDir, "main.py");
      fs.writeFileSync(srcPath, code, "utf-8");
      child = spawn("python3", ["-u", srcPath], {
        cwd: tmpDir,
        env: sanitizedEnv,
        stdio: ["pipe", "pipe", "pipe"]
      });
    }
    if (initialStdin && typeof initialStdin === "string" && initialStdin.length > 0 && child.stdin) {
      child.stdin.write(initialStdin.endsWith("\n") ? initialStdin : initialStdin + "\n");
    }
    const session = {
      id: sessionId,
      child,
      language: lang,
      tmpDir,
      startTime: Date.now(),
      subscribers: /* @__PURE__ */ new Set(),
      history: [],
      isWaiting: false,
      waitTimer: null,
      timeoutTimer: setTimeout(() => {
        broadcastSessionEvent(session, {
          type: "error",
          message: "Execution session timed out (maximum 60 seconds limit)."
        });
        child.kill("SIGKILL");
      }, 6e4)
    };
    let lastStdoutLine = "";
    child.stdout?.on("data", (data) => {
      const text = data.toString("utf-8");
      const lines = text.trim().split("\n");
      if (lines.length > 0) {
        lastStdoutLine = lines[lines.length - 1];
      }
      broadcastSessionEvent(session, { type: "stdout", text });
      if (session.waitTimer) clearTimeout(session.waitTimer);
      session.isWaiting = false;
      session.waitTimer = setTimeout(() => {
        if (!child.killed && child.exitCode === null) {
          session.isWaiting = true;
          broadcastSessionEvent(session, {
            type: "waiting_input",
            prompt: lastStdoutLine || ""
          });
        }
      }, 60);
    });
    child.stderr?.on("data", (data) => {
      const text = data.toString("utf-8");
      broadcastSessionEvent(session, { type: "stderr", text });
      if (session.waitTimer) clearTimeout(session.waitTimer);
      session.waitTimer = setTimeout(() => {
        if (!child.killed && child.exitCode === null) {
          session.isWaiting = true;
          broadcastSessionEvent(session, {
            type: "waiting_input",
            prompt: lastStdoutLine || ""
          });
        }
      }, 60);
    });
    child.on("close", (code2, signal) => {
      if (session.waitTimer) clearTimeout(session.waitTimer);
      clearTimeout(session.timeoutTimer);
      const elapsedMs = Date.now() - session.startTime;
      const executionTime = `${elapsedMs}ms`;
      broadcastSessionEvent(session, {
        type: "done",
        exitCode: code2 ?? (signal ? 137 : 0),
        executionTime
      });
      setTimeout(() => {
        try {
          fs.rmSync(tmpDir, { recursive: true, force: true });
        } catch {
        }
        activeSessions.delete(sessionId);
      }, 5e3);
    });
    child.on("error", (err) => {
      broadcastSessionEvent(session, {
        type: "error",
        message: err.message || "Process error"
      });
    });
    activeSessions.set(sessionId, session);
    return res.json({ success: true, sessionId });
  } catch (error) {
    console.error("Failed to start interactive session:", error);
    return res.status(500).json({
      error: error.message || "Failed to start execution session."
    });
  }
});
app.get("/api/interactive/stream/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found or already closed." });
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  for (const evt of session.history) {
    res.write(`data: ${JSON.stringify(evt)}

`);
  }
  session.subscribers.add(res);
  req.on("close", () => {
    session.subscribers.delete(res);
  });
});
app.post("/api/interactive/input/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const { input = "" } = req.body;
  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: "Session not found." });
  }
  if (session.child && session.child.stdin && session.child.stdin.writable) {
    session.isWaiting = false;
    broadcastSessionEvent(session, { type: "user_input", text: input });
    session.child.stdin.write(input + "\n");
    return res.json({ success: true });
  } else {
    return res.status(400).json({ error: "Process stdin is not writable." });
  }
});
app.post("/api/interactive/stop/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.json({ success: true, message: "Session already terminated." });
  }
  try {
    session.child.kill("SIGTERM");
    setTimeout(() => {
      if (!session.child.killed) {
        session.child.kill("SIGKILL");
      }
    }, 400);
    broadcastSessionEvent(session, { type: "stopped" });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: err.message || "Failed to stop process." });
  }
});
async function executeInPaiza(code, language, stdin) {
  const paizaLang = language === "cpp" ? "cpp" : "python3";
  const params = new URLSearchParams();
  params.append("source_code", code);
  params.append("language", paizaLang);
  params.append("input", stdin || "");
  params.append("api_key", "guest");
  const createRes = await fetch("https://api.paiza.io/runners/create", {
    method: "POST",
    body: params
  });
  if (!createRes.ok) {
    throw new Error(`Paiza create failed with HTTP ${createRes.status}`);
  }
  const { id } = await createRes.json();
  if (!id) throw new Error("Paiza did not return a session id");
  const maxAttempts = 16;
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 450));
    const detailRes = await fetch(
      `https://api.paiza.io/runners/get_details?id=${id}&api_key=guest`
    );
    if (!detailRes.ok) continue;
    const detail = await detailRes.json();
    if (detail.status === "completed") {
      if (detail.build_stderr && detail.build_stderr.trim().length > 0) {
        return {
          success: false,
          hasError: true,
          errorType: "compile",
          stdout: detail.build_stdout || "",
          stderr: detail.build_stderr,
          exitCode: parseInt(detail.build_exit_code || "1", 10),
          executionTime: `${detail.build_time || "0.1"}s`
        };
      }
      const hasError = detail.exit_code && detail.exit_code !== "0" || detail.stderr && detail.stderr.trim().length > 0 || detail.result === "failure";
      return {
        success: !hasError,
        hasError,
        errorType: hasError ? "runtime" : null,
        stdout: detail.stdout || "",
        stderr: detail.stderr || "",
        exitCode: parseInt(detail.exit_code || "0", 10),
        executionTime: `${detail.time || "0.01"}s`
      };
    }
  }
  throw new Error("Sandbox execution timed out");
}
async function executeInWandbox(code, language, stdin) {
  const compiler = language === "cpp" ? "gcc-13.2.0" : "cpython-3.12.7";
  const payload = {
    compiler,
    code,
    stdin: stdin || ""
  };
  const res = await fetch("https://wandbox.org/api/compile.json", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!res.ok) {
    throw new Error(`Wandbox failed with HTTP ${res.status}`);
  }
  const data = await res.json();
  if (data.compiler_error && data.compiler_error.trim().length > 0) {
    return {
      success: false,
      hasError: true,
      errorType: "compile",
      stdout: data.compiler_output || "",
      stderr: data.compiler_error,
      exitCode: parseInt(data.status || "1", 10),
      executionTime: "0.2s"
    };
  }
  const hasError = data.status && data.status !== "0" || data.program_error && data.program_error.trim().length > 0;
  return {
    success: !hasError,
    hasError,
    errorType: hasError ? "runtime" : null,
    stdout: data.program_output || "",
    stderr: data.program_error || "",
    exitCode: parseInt(data.status || "0", 10),
    executionTime: "0.1s"
  };
}
app.post("/api/execute", async (req, res) => {
  const { code, language, stdin = "" } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Code content is required." });
  }
  let preparedCode = code;
  if (language === "cpp" && /cin\s*>>|getline\s*\(\s*cin|scanf\s*\(/.test(code)) {
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
  try {
    let rawResult;
    try {
      rawResult = await executeInPaiza(preparedCode, language, stdin);
    } catch (paizaErr) {
      console.warn("Paiza sandbox attempt failed, trying Wandbox fallback:", paizaErr.message);
      rawResult = await executeInWandbox(preparedCode, language, stdin);
    }
    const stderr = rawResult.stderr || "";
    const isCppWaiting = stderr.includes("__INPUT_REQUIRED__") || rawResult.exitCode === 42;
    const isPyWaiting = (language === "python" || language === "python3") && (stderr.includes("EOFError") || stderr.includes("EOF when reading a line"));
    const waitingForInput = isCppWaiting || isPyWaiting;
    const cleanStderr = isCppWaiting ? "" : isPyWaiting ? "" : stderr;
    return res.json({
      ...rawResult,
      waitingForInput,
      hasError: waitingForInput ? false : rawResult.hasError,
      stderr: cleanStderr,
      rawStderr: stderr
    });
  } catch (error) {
    console.error("All sandbox execution providers failed:", error);
    return res.status(502).json({
      success: false,
      hasError: true,
      errorType: "sandbox_service",
      stderr: `Execution service error: ${error.message || "Unable to execute code safely."}`,
      stdout: "",
      exitCode: -1,
      waitingForInput: false
    });
  }
});
app.post("/api/debug-error", async (req, res) => {
  if (!ensureApiKey(res)) return;
  const { code, language, errorOutput, userStatement } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Code is required." });
  }
  const lang = language === "cpp" ? "C++" : "Python";
  const hasSpecificError = errorOutput && errorOutput.trim().length > 0;
  try {
    const prompt = `You are CODEPROOF AI, a patient, expert programming teacher helping beginners and college students solve code bugs.
Language: ${lang}

--- SOURCE CODE ---
${code}

${hasSpecificError ? `--- ERROR OUTPUT FROM RUNTIME / COMPILER ---
${errorOutput}` : '--- PROACTIVE CODE AUDIT ---\nStudent clicked "Fix Error" to inspect and fix any syntax errors, undeclared variables, missing includes/imports, type mismatches, indexing bugs, or infinite loops in this code.'}

${userStatement ? `Context/Original goal: ${userStatement}` : ""}

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
        systemInstruction: "You are CODEPROOF AI Debugger. Always return well-structured JSON adhering strictly to the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            errorName: {
              type: Type.STRING,
              description: "Clear name of the error (e.g. SyntaxError, Missing Semicolon, IndexError)"
            },
            simpleExplanation: {
              type: Type.STRING,
              description: "Simple 1-2 sentence explanation in beginner-friendly language."
            },
            lineNumber: {
              type: Type.INTEGER,
              description: "Line number where the error occurs (1-indexed), or 0 if none."
            },
            whyItHappened: {
              type: Type.STRING,
              description: "Detailed explanation of why the computer flagged this error."
            },
            correctedCode: {
              type: Type.STRING,
              description: "The complete, fully corrected runnable code ready to paste into the editor."
            },
            diffSummary: {
              type: Type.STRING,
              description: "Short sentence describing exactly what was fixed."
            },
            preventionTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "2-3 quick tips for beginners to avoid this bug in the future."
            }
          },
          required: [
            "errorName",
            "simpleExplanation",
            "lineNumber",
            "whyItHappened",
            "correctedCode",
            "diffSummary",
            "preventionTips"
          ]
        }
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("Error debugging code:", error);
    return res.status(500).json({
      error: error.message || "Failed to analyze error."
    });
  }
});
app.post("/api/explain-code", async (req, res) => {
  if (!ensureApiKey(res)) return;
  const { code, language } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ error: "Code is required." });
  }
  const lang = language === "cpp" ? "C++" : "Python";
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
        systemInstruction: "You are the CODEPROOF AI Explainer. Return valid JSON adhering to the schema.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            overview: {
              type: Type.STRING,
              description: "High-level overview of what this program achieves."
            },
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  lines: {
                    type: Type.STRING,
                    description: 'Line number or range, e.g. "Line 1" or "Lines 3-5"'
                  },
                  codeSnippet: {
                    type: Type.STRING,
                    description: "The snippet of code being explained."
                  },
                  explanation: {
                    type: Type.STRING,
                    description: "Plain English beginner explanation."
                  },
                  beginnerTip: {
                    type: Type.STRING,
                    description: "Helpful rule of thumb, analogy, or beginner tip."
                  }
                },
                required: ["lines", "codeSnippet", "explanation"]
              }
            },
            complexity: {
              type: Type.STRING,
              description: "Time and space complexity explained simply."
            },
            keyTakeaway: {
              type: Type.STRING,
              description: "One key takeaway lesson from this code."
            }
          },
          required: ["overview", "steps", "complexity", "keyTakeaway"]
        }
      }
    });
    const parsed = JSON.parse(response.text || "{}");
    return res.json(parsed);
  } catch (error) {
    console.error("Error explaining code:", error);
    return res.status(500).json({
      error: error.message || "Failed to explain code."
    });
  }
});
app.post("/api/ask-assistant", async (req, res) => {
  if (!ensureApiKey(res)) return;
  const { question, code, language, history } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }
  const lang = language === "cpp" ? "C++" : "Python";
  try {
    const formattedHistory = Array.isArray(history) ? history.map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [{ text: msg.text }]
    })) : [];
    const systemInstruction = `You are CODEPROOF AI Assistant, a friendly, encouraging coding tutor for beginners and college students.
Current Language: ${lang}
Current Code in Editor:
\`\`\`
${code || "// No code written yet"}
\`\`\`
Guidelines:
- Keep answers concise, clear, and encouraging.
- Provide practical code examples when helpful.
- Help students learn the "why" and "how".`;
    const contents = [
      ...formattedHistory,
      {
        role: "user",
        parts: [{ text: `Regarding this ${lang} program: ${question}` }]
      }
    ];
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents,
      config: {
        systemInstruction
      }
    });
    return res.json({
      reply: response.text || "I am ready to help you with your code!"
    });
  } catch (error) {
    console.error("Chat assistant error:", error);
    return res.status(500).json({
      error: error.message || "Failed to get answer from assistant."
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV === "production") {
    app.use(express.static(path.resolve(".", "dist")));
    app.get("*", (_req, res) => {
      res.sendFile(path.resolve(".", "dist", "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CODEPROOF AI Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();

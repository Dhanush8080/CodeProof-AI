import React, { useState } from 'react';
import { Sparkles, ArrowRight, Loader2, Wand2, Lightbulb } from 'lucide-react';

interface StatementInputProps {
  language: 'python' | 'cpp';
  onGenerate: (statement: string) => Promise<void>;
  isGenerating: boolean;
  generatedInfo: {
    summary?: string;
    keyConcepts?: string[];
  } | null;
  theme?: 'dark' | 'light';
}

const QUICK_PROMPTS = [
  'Write a program to find the largest of three numbers.',
  'Check whether a given number is prime or not.',
  'Calculate the factorial of a number using a loop.',
  'Check if a string is a palindrome.',
  'Generate Fibonacci sequence up to N terms.',
  'Count vowels, consonants, and spaces in a sentence.',
];

export const StatementInput: React.FC<StatementInputProps> = ({
  language,
  onGenerate,
  isGenerating,
  generatedInfo,
  theme = 'dark',
}) => {
  const [statement, setStatement] = useState('');
  const isLight = theme === 'light';

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!statement.trim() || isGenerating) return;
    onGenerate(statement.trim());
  };

  const handleQuickSelect = (prompt: string) => {
    setStatement(prompt);
    onGenerate(prompt);
  };

  return (
    <div
      className={`w-full rounded-xl p-3.5 sm:p-4 shadow-lg transition-colors ${
        isLight
          ? 'bg-white border border-slate-300 shadow-slate-200/50 text-slate-900'
          : 'bg-[#0a1222] border border-[#1e2d4a] shadow-cyan-950/20 text-slate-100'
      }`}
    >
      <div className="flex flex-col gap-2.5">
        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-2.5 items-stretch">
          <div className="relative flex-1">
            <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isLight ? 'text-sky-600' : 'text-cyan-400'}`}>
              <Wand2 className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              placeholder={`Describe your program in simple English (e.g. "Write a program to find the largest of three numbers")...`}
              disabled={isGenerating}
              className={`w-full pl-10 pr-4 py-2.5 rounded-lg text-sm transition-all font-sans focus:outline-none ${
                isLight
                  ? 'bg-slate-50 border border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500'
                  : 'bg-[#060c18] border border-[#22365a] text-slate-100 placeholder-slate-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={!statement.trim() || isGenerating}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm tracking-wide disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20 transition-all shrink-0 cursor-pointer"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                <span>Generating {language === 'cpp' ? 'C++' : 'Python'}...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Generate Code</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-950 hidden sm:inline" />
              </>
            )}
          </button>
        </form>

        {/* Quick Suggestions & Concepts Row */}
        <div className={`flex flex-wrap items-center gap-2 pt-1 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          <span className="flex items-center gap-1 font-medium shrink-0">
            <Lightbulb className={`w-3 h-3 ${isLight ? 'text-amber-600' : 'text-cyan-400'}`} />
            <span>Try asking:</span>
          </span>
          <div className="flex flex-wrap gap-1.5 items-center">
            {QUICK_PROMPTS.slice(0, 4).map((prompt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickSelect(prompt)}
                disabled={isGenerating}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer text-[12px] truncate max-w-[260px] border ${
                  isLight
                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:text-sky-700 hover:border-sky-400 hover:bg-slate-200'
                    : 'bg-[#101b33] border-[#1e3358] text-slate-300 hover:text-cyan-300 hover:border-cyan-500/50 hover:bg-[#142342]'
                }`}
                title={prompt}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Generated Concepts Banner if available */}
        {generatedInfo?.summary && (
          <div
            className={`mt-1 p-2.5 rounded-lg border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs ${
              isLight
                ? 'bg-sky-50 border-sky-300 text-sky-950'
                : 'bg-[#0e1a30] border-cyan-500/30 text-slate-300'
            }`}
          >
            <div>
              <span className={`font-semibold mr-1.5 ${isLight ? 'text-sky-800' : 'text-cyan-300'}`}>
                Generated:
              </span>
              <span>{generatedInfo.summary}</span>
            </div>
            {generatedInfo.keyConcepts && generatedInfo.keyConcepts.length > 0 && (
              <div className="flex flex-wrap gap-1 items-center shrink-0">
                {generatedInfo.keyConcepts.map((concept, i) => (
                  <span
                    key={i}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border font-medium ${
                      isLight
                        ? 'bg-white border-sky-300 text-sky-800'
                        : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                    }`}
                  >
                    {concept}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

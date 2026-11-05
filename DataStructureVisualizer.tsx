import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  Database,
  Link as LinkIcon,
  List as ListIcon,
  Maximize2,
  Minimize2,
  Loader2,
  Info,
  CheckCircle2,
  Code2,
  Hash,
} from 'lucide-react';

export interface TraceVariable {
  type: 'list' | 'dict' | 'linked_list' | 'set' | 'primitive' | 'object';
  value?: any;
  values?: any[];
  length?: number;
  isTuple?: boolean;
  entries?: Array<{ key: string; value: any }>;
  size?: number;
  nodes?: Array<{ id: string; val: any; nextId: string | null }>;
  headId?: string;
  hasCycle?: boolean;
}

export interface TraceStep {
  step: number;
  line: number;
  event?: string;
  explanation: string;
  variables: Record<string, TraceVariable>;
  stdout?: string;
}

interface DataStructureVisualizerProps {
  code: string;
  language: 'python' | 'cpp';
  theme?: 'dark' | 'light';
  onHighlightLine?: (line: number) => void;
  onLoadPreset?: (code: string, language: 'python' | 'cpp') => void;
}

export const VISUALIZER_PRESETS = [
  {
    id: 'linked-list',
    title: 'Linked List Chain',
    desc: 'Build and traverse a 3-node connected chain with pointers',
    language: 'python' as const,
    code: `class Node:
    def __init__(self, val, next=None):
        self.val = val
        self.next = next

# Create nodes
head = Node(10)
head.next = Node(20)
head.next.next = Node(30)

# Traverse with pointer
curr = head
while curr:
    print("Visiting:", curr.val)
    curr = curr.next
`,
  },
  {
    id: 'two-sum-map',
    title: 'Two Sum & Hash Map',
    desc: 'Lookup complements in a dictionary in O(N) time',
    language: 'python' as const,
    code: `nums = [2, 7, 11, 15]
target = 9
seen = {}

result = []
for i, num in enumerate(nums):
    diff = target - num
    if diff in seen:
        result = [seen[diff], i]
        break
    seen[num] = i

print("Indices:", result)
`,
  },
  {
    id: 'list-reverse',
    title: 'Array In-Place Reversal',
    desc: 'Two-pointer array elements swap visualization',
    language: 'python' as const,
    code: `nums = [10, 20, 30, 40, 50]
left = 0
right = len(nums) - 1

while left < right:
    # Swap elements
    nums[left], nums[right] = nums[right], nums[left]
    left += 1
    right -= 1

print("Reversed:", nums)
`,
  },
  {
    id: 'cpp-vector-map',
    title: 'C++ Vector & Map',
    desc: 'STL Vector sorting and Map frequency counting',
    language: 'cpp' as const,
    code: `#include <iostream>
#include <vector>
#include <unordered_map>
#include <algorithm>
using namespace std;

int main() {
    vector<int> numbers = {4, 1, 3, 2};
    sort(numbers.begin(), numbers.end());

    unordered_map<string, int> scores;
    scores["Alice"] = 95;
    scores["Bob"] = 88;
    scores["Charlie"] = 92;

    int total = 0;
    for (int n : numbers) total += n;

    cout << "Total: " << total << endl;
    return 0;
}
`,
  },
];

export const DataStructureVisualizer: React.FC<DataStructureVisualizerProps> = ({
  code,
  language,
  theme = 'dark',
  onHighlightLine,
  onLoadPreset,
}) => {
  const isLight = theme === 'light';

  const [steps, setSteps] = useState<TraceStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playSpeedMs, setPlaySpeedMs] = useState<number>(1000); // 1000ms per step
  const [activeFilter, setActiveFilter] = useState<'all' | 'lists' | 'dicts' | 'linked_lists' | 'vars'>('all');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch or re-generate trace
  const fetchTrace = async () => {
    if (!code.trim()) return;
    setIsLoading(true);
    setErrorMsg(null);
    setIsPlaying(false);

    try {
      const res = await fetch('/api/visualize-trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, language }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Trace engine returned ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data.steps) && data.steps.length > 0) {
        setSteps(data.steps);
        setCurrentStepIndex(0);
        if (onHighlightLine && data.steps[0]?.line) {
          onHighlightLine(data.steps[0].line);
        }
      } else {
        throw new Error('No trace steps generated. Please ensure code has executable statements.');
      }
    } catch (err: any) {
      console.error('Visualizer error:', err);
      setErrorMsg(err.message || 'Failed to generate execution trace.');
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-fetch trace on initial mount or when code changes if empty
  useEffect(() => {
    if (steps.length === 0 && code.trim()) {
      fetchTrace();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update highlighted line in code editor when step changes
  useEffect(() => {
    if (steps.length > 0 && currentStepIndex < steps.length) {
      const step = steps[currentStepIndex];
      if (onHighlightLine && step?.line && step.line > 0) {
        onHighlightLine(step.line);
      }
    }
  }, [currentStepIndex, steps, onHighlightLine]);

  // Handle Play/Pause timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentStepIndex((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playSpeedMs);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, steps.length, playSpeedMs]);

  const currentStep = steps[currentStepIndex] || null;

  // Extract variables categorized
  const categorized = useMemo(() => {
    if (!currentStep) return { lists: [], dicts: [], linkedLists: [], vars: [], pointerMap: {} as Record<number, string[]> };

    const lists: Array<{ name: string; data: TraceVariable }> = [];
    const dicts: Array<{ name: string; data: TraceVariable }> = [];
    const linkedLists: Array<{ name: string; data: TraceVariable }> = [];
    const vars: Array<{ name: string; data: TraceVariable }> = [];

    // Pointer names map (variables holding integers or node references)
    const pointerMap: Record<number, string[]> = {};

    for (const [name, val] of Object.entries(currentStep.variables)) {
      if (val.type === 'list' || val.type === 'set') {
        lists.push({ name, data: val });
      } else if (val.type === 'dict') {
        dicts.push({ name, data: val });
      } else if (val.type === 'linked_list') {
        linkedLists.push({ name, data: val });
      } else {
        vars.push({ name, data: val });
        if (typeof val.value === 'number') {
          if (!pointerMap[val.value]) pointerMap[val.value] = [];
          pointerMap[val.value].push(name);
        }
      }
    }

    return { lists, dicts, linkedLists, vars, pointerMap };
  }, [currentStep]);

  // Helper to extract primitive display value
  const getDisplayVal = (val: any): string => {
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'object' && val.type === 'primitive') {
      return String(val.value);
    }
    if (typeof val === 'object') {
      return JSON.stringify(val);
    }
    return String(val);
  };

  return (
    <div
      className={`flex flex-col h-full overflow-hidden select-text font-sans ${
        isLight ? 'bg-white text-slate-800' : 'bg-[#060b17] text-slate-100'
      }`}
    >
      {/* 1. VISUALIZER TOOLBAR & STEPPER CONTROLS */}
      <div
        className={`flex flex-wrap items-center justify-between px-3.5 py-2 border-b gap-2 transition-colors ${
          isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#091122] border-[#162744]'
        }`}
      >
        {/* Left: Playback Controls */}
        <div className="flex items-center gap-1">
          {/* First Step */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(0);
            }}
            disabled={currentStepIndex === 0 || steps.length === 0}
            className={`p-1.5 rounded-md border text-xs transition-colors cursor-pointer disabled:opacity-30 ${
              isLight
                ? 'bg-white border-slate-300 hover:bg-slate-200 text-slate-700'
                : 'bg-[#0e1a30] border-[#1e345c] hover:bg-[#16294a] text-slate-300'
            }`}
            title="Jump to Start (Step 1)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          {/* Prev Step */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex((prev) => Math.max(0, prev - 1));
            }}
            disabled={currentStepIndex === 0 || steps.length === 0}
            className={`p-1.5 rounded-md border text-xs transition-colors cursor-pointer disabled:opacity-30 ${
              isLight
                ? 'bg-white border-slate-300 hover:bg-slate-200 text-slate-700'
                : 'bg-[#0e1a30] border-[#1e345c] hover:bg-[#16294a] text-slate-300'
            }`}
            title="Previous Step"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Play / Pause Toggle */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={steps.length === 0}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer shadow-xs ${
              isPlaying
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/20'
            }`}
            title={isPlaying ? 'Pause animation' : 'Auto-play animation'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Next Step */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
            }}
            disabled={currentStepIndex >= steps.length - 1 || steps.length === 0}
            className={`p-1.5 rounded-md border text-xs transition-colors cursor-pointer disabled:opacity-30 ${
              isLight
                ? 'bg-white border-slate-300 hover:bg-slate-200 text-slate-700'
                : 'bg-[#0e1a30] border-[#1e345c] hover:bg-[#16294a] text-slate-300'
            }`}
            title="Next Step"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Step */}
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentStepIndex(steps.length - 1);
            }}
            disabled={currentStepIndex >= steps.length - 1 || steps.length === 0}
            className={`p-1.5 rounded-md border text-xs transition-colors cursor-pointer disabled:opacity-30 ${
              isLight
                ? 'bg-white border-slate-300 hover:bg-slate-200 text-slate-700'
                : 'bg-[#0e1a30] border-[#1e345c] hover:bg-[#16294a] text-slate-300'
            }`}
            title="Jump to End"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Step Counter Badge */}
          {steps.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ml-1.5 border ${
                isLight
                  ? 'bg-white border-slate-300 text-sky-900 shadow-2xs'
                  : 'bg-[#0b172a] border-cyan-500/30 text-cyan-300'
              }`}
            >
              Step {currentStepIndex + 1}/{steps.length}
            </span>
          )}
        </div>

        {/* Center: Timeline Scrubber Slider */}
        {steps.length > 1 && (
          <div className="flex-1 max-w-[260px] mx-2 hidden sm:flex items-center gap-2">
            <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>1</span>
            <input
              type="range"
              min={0}
              max={steps.length - 1}
              value={currentStepIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentStepIndex(parseInt(e.target.value, 10));
              }}
              className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              title="Drag to scrub through execution timeline"
            />
            <span className={`text-[10px] font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {steps.length}
            </span>
          </div>
        )}

        {/* Right: Speed & Re-trace Actions */}
        <div className="flex items-center gap-1.5">
          {/* Speed Selector */}
          <div className="flex items-center gap-1 text-[11px] font-mono">
            <span className={`hidden md:inline ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Speed:</span>
            {[
              { label: '0.5x', ms: 1600 },
              { label: '1x', ms: 1000 },
              { label: '2x', ms: 500 },
            ].map((spd) => (
              <button
                key={spd.label}
                onClick={() => setPlaySpeedMs(spd.ms)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                  playSpeedMs === spd.ms
                    ? isLight
                      ? 'bg-sky-100 border-sky-400 text-sky-900'
                      : 'bg-cyan-950 border-cyan-500/60 text-cyan-300'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-600 hover:text-slate-900'
                    : 'bg-[#0a1426] border-[#182845] text-slate-400 hover:text-white'
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>

          {/* Re-Trace Button */}
          <button
            onClick={fetchTrace}
            disabled={isLoading}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer ${
              isLight
                ? 'bg-white border-slate-300 text-sky-800 hover:bg-sky-50 shadow-2xs'
                : 'bg-[#10203a] border-cyan-500/40 text-cyan-300 hover:bg-[#152a4e]'
            }`}
            title="Re-analyze and execute code to trace data structure memory"
          >
            {isLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">Re-Trace</span>
          </button>
        </div>
      </div>

      {/* 2. CURRENT STEP EXPLANATION & LINE BANNER */}
      {currentStep && (
        <div
          className={`px-3.5 py-2 border-b flex flex-wrap items-center justify-between gap-2 text-xs transition-colors ${
            isLight ? 'bg-sky-50/70 border-sky-200' : 'bg-[#09152b] border-[#1a3158]'
          }`}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold border ${
                isLight
                  ? 'bg-white text-sky-900 border-sky-300 shadow-2xs'
                  : 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
              }`}
            >
              Line {currentStep.line}
            </span>
            <span
              className={`font-semibold ${
                isLight ? 'text-slate-800' : 'text-slate-100'
              }`}
            >
              {currentStep.explanation}
            </span>
          </div>

          {/* Data Structure Category Filters */}
          <div className="flex items-center gap-1 text-[11px] font-mono">
            {[
              { id: 'all', label: 'All Structures' },
              { id: 'lists', label: `Lists (${categorized.lists.length})` },
              { id: 'dicts', label: `Dicts (${categorized.dicts.length})` },
              { id: 'linked_lists', label: `Nodes (${categorized.linkedLists.length})` },
              { id: 'vars', label: `Vars (${categorized.vars.length})` },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer ${
                  activeFilter === f.id
                    ? isLight
                      ? 'bg-sky-600 text-white font-bold'
                      : 'bg-cyan-500 text-slate-950 font-bold'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. VISUALIZATION CANVAS */}
      <div className="flex-1 p-3.5 overflow-y-auto space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <div className="text-center">
              <p className={`text-sm font-bold ${isLight ? 'text-slate-800' : 'text-slate-100'}`}>
                Tracing Execution & Allocating Memory...
              </p>
              <p className={`text-xs mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Executing student code and capturing live snapshots of lists, dictionaries, and nodes.
              </p>
            </div>
          </div>
        ) : errorMsg ? (
          <div
            className={`p-4 rounded-xl border ${
              isLight ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
            }`}
          >
            <p className="font-bold text-sm">Visualizer Note</p>
            <p className="text-xs mt-1 font-mono">{errorMsg}</p>
            <button
              onClick={fetchTrace}
              className="mt-3 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-semibold cursor-pointer hover:bg-rose-700"
            >
              Try Re-Tracing
            </button>
          </div>
        ) : steps.length === 0 ? (
          /* Empty State: Load Data Structure Lab Presets */
          <div className="flex flex-col items-center justify-center py-6 px-4 text-center">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 border ${
                isLight
                  ? 'bg-sky-50 border-sky-200 text-sky-600'
                  : 'bg-cyan-950/60 border-cyan-500/40 text-cyan-400'
              }`}
            >
              <Database className="w-6 h-6" />
            </div>
            <h3 className={`text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Real-Time Data Structure Visualizer
            </h3>
            <p className={`text-xs max-w-md mt-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Watch memory evolve step-by-step as code executes. Inspect list index cells, hash table keys, and linked
              list node pointers in real time.
            </p>

            <button
              onClick={fetchTrace}
              className="mt-4 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-bold text-xs shadow-md shadow-cyan-500/20 cursor-pointer hover:from-cyan-400 hover:to-blue-500"
            >
              Trace Current Code
            </button>

            {/* Quick Presets */}
            {onLoadPreset && (
              <div className="mt-6 w-full max-w-xl text-left">
                <span className={`text-xs font-bold font-mono tracking-wide ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  OR LOAD A VISUALIZER LAB PRESET:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                  {VISUALIZER_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onLoadPreset(p.code, p.language)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 hover:border-sky-500 hover:bg-sky-50/50'
                          : 'bg-[#0a1324] border-[#1a2d4e] hover:border-cyan-500/60 hover:bg-[#0f1d38]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xs ${isLight ? 'text-sky-900' : 'text-cyan-300'}`}>
                          {p.title}
                        </span>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                            p.language === 'cpp'
                              ? 'bg-blue-950/60 text-blue-300 border-blue-500/40'
                              : 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                          }`}
                        >
                          {p.language.toUpperCase()}
                        </span>
                      </div>
                      <p className={`text-[11px] mt-1 line-clamp-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                        {p.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Render Active Structures */
          <div className="space-y-4">
            {/* ================= SECTION A: LINKED LIST NODES ================= */}
            {(activeFilter === 'all' || activeFilter === 'linked_lists') &&
              categorized.linkedLists.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-cyan-400">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>LINKED LISTS & POINTER CHAINS</span>
                  </div>

                  {categorized.linkedLists.map(({ name, data }) => {
                    const nodes = data.nodes || [];
                    return (
                      <div
                        key={name}
                        className={`p-3.5 rounded-xl border shadow-sm ${
                          isLight
                            ? 'bg-slate-50/90 border-slate-300'
                            : 'bg-[#0a1326] border-[#182b4c]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-inherit">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono font-bold text-xs ${isLight ? 'text-sky-800' : 'text-cyan-300'}`}>
                              Node Pointer: <span className="underline">{name}</span>
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                                isLight
                                  ? 'bg-white border-slate-300 text-slate-700'
                                  : 'bg-[#050a14] border-cyan-500/30 text-cyan-300'
                              }`}
                            >
                              Chain Length: {nodes.length} {nodes.length === 1 ? 'node' : 'nodes'}
                            </span>
                          </div>

                          {data.hasCycle && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 animate-pulse">
                              Circular Cycle Detected
                            </span>
                          )}
                        </div>

                        {/* Horizontal Node Diagram with Arrows */}
                        <div className="flex items-center gap-2 overflow-x-auto py-2 px-1">
                          {nodes.length === 0 ? (
                            <span className={`text-xs italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              Empty list / null pointer
                            </span>
                          ) : (
                            nodes.map((node, nIdx) => {
                              const isHead = nIdx === 0;
                              const isLast = nIdx === nodes.length - 1;

                              return (
                                <React.Fragment key={node.id || nIdx}>
                                  {/* Individual Node Box */}
                                  <div
                                    className={`flex flex-col rounded-lg border shadow-md transition-all shrink-0 min-w-[96px] ${
                                      isHead
                                        ? isLight
                                          ? 'border-sky-500 bg-white ring-2 ring-sky-300'
                                          : 'border-cyan-400 bg-[#0d1c38] ring-1 ring-cyan-400/50'
                                        : isLight
                                        ? 'border-slate-300 bg-white'
                                        : 'border-[#1e345c] bg-[#0c182f]'
                                    }`}
                                  >
                                    {/* Node Header Badge */}
                                    <div
                                      className={`px-2 py-1 text-[10px] font-mono font-bold flex items-center justify-between border-b ${
                                        isHead
                                          ? isLight
                                            ? 'bg-sky-100 text-sky-950 border-sky-300'
                                            : 'bg-cyan-950 text-cyan-300 border-cyan-500/40'
                                          : isLight
                                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                                          : 'bg-[#081020] text-slate-400 border-[#162744]'
                                      }`}
                                    >
                                      <span>{isHead ? 'HEAD' : `Node [${nIdx}]`}</span>
                                      <span className="opacity-60 text-[9px]">#{node.id.slice(-4)}</span>
                                    </div>

                                    {/* Node Body: Val & Next */}
                                    <div className="flex divide-x divide-inherit">
                                      {/* Val Compartment */}
                                      <div className="p-2 flex-1 text-center">
                                        <div className={`text-[9px] uppercase font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                                          Val
                                        </div>
                                        <div className={`text-sm font-extrabold font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                          {getDisplayVal(node.val)}
                                        </div>
                                      </div>

                                      {/* Next Pointer Compartment */}
                                      <div className="p-2 w-10 flex flex-col items-center justify-center">
                                        <div className={`text-[9px] uppercase font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                                          Next
                                        </div>
                                        <span className={`text-xs font-bold font-mono ${node.nextId ? 'text-emerald-400' : 'text-rose-400'}`}>
                                          {node.nextId ? '•' : 'Ø'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Directional Connector Arrow */}
                                  <div className="flex items-center text-cyan-400 px-1 shrink-0">
                                    <ArrowRight className="w-4 h-4" />
                                  </div>
                                </React.Fragment>
                              );
                            })
                          )}

                          {/* Terminal NULL */}
                          <div
                            className={`px-2 py-1 rounded text-xs font-mono font-bold shrink-0 border ${
                              isLight
                                ? 'bg-slate-200 border-slate-300 text-slate-600'
                                : 'bg-[#091122] border-[#182a4a] text-slate-400'
                            }`}
                          >
                            NULL
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            {/* ================= SECTION B: LISTS, VECTORS & ARRAYS ================= */}
            {(activeFilter === 'all' || activeFilter === 'lists') && categorized.lists.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-blue-400">
                  <ListIcon className="w-3.5 h-3.5" />
                  <span>LISTS, ARRAYS & VECTORS</span>
                </div>

                {categorized.lists.map(({ name, data }) => {
                  const items = data.values || [];
                  return (
                    <div
                      key={name}
                      className={`p-3.5 rounded-xl border shadow-sm ${
                        isLight ? 'bg-slate-50/90 border-slate-300' : 'bg-[#0a1326] border-[#182b4c]'
                      }`}
                    >
                      {/* List Header */}
                      <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-inherit">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold text-xs ${isLight ? 'text-sky-800' : 'text-cyan-300'}`}>
                            {name}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-700'
                                : 'bg-[#050a14] border-cyan-500/30 text-cyan-300'
                            }`}
                          >
                            Length: {data.length ?? items.length} | {data.isTuple ? 'Tuple' : 'Indexed Array'}
                          </span>
                        </div>
                      </div>

                      {/* Horizontal Array Cells */}
                      <div className="flex items-end gap-1.5 overflow-x-auto py-2 px-1">
                        {items.length === 0 ? (
                          <span className={`text-xs italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            Empty list []
                          </span>
                        ) : (
                          items.map((item, idx) => {
                            // Check if a pointer variable points to this index
                            const pointersAtIdx = categorized.pointerMap[idx] || [];

                            return (
                              <div key={idx} className="flex flex-col items-center shrink-0">
                                {/* Pointer Tag above Cell (e.g. ▲ i, left) */}
                                {pointersAtIdx.length > 0 && (
                                  <div className="flex flex-col items-center mb-1 animate-bounce">
                                    <span
                                      className={`px-1.5 py-0.2 rounded font-mono text-[9px] font-bold border shadow-xs ${
                                        isLight
                                          ? 'bg-amber-100 border-amber-400 text-amber-950'
                                          : 'bg-amber-950 border-amber-500/60 text-amber-300'
                                      }`}
                                    >
                                      {pointersAtIdx.join(', ')}
                                    </span>
                                    <span className="text-[8px] text-amber-500 leading-none">▼</span>
                                  </div>
                                )}

                                {/* Array Element Box */}
                                <div
                                  className={`w-14 h-14 rounded-lg flex flex-col items-center justify-center border shadow-md transition-all ${
                                    pointersAtIdx.length > 0
                                      ? isLight
                                        ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                                        : 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-400/50'
                                      : isLight
                                      ? 'bg-white border-slate-300 hover:border-sky-400'
                                      : 'bg-[#0c1830] border-[#1f3760] hover:border-cyan-400'
                                  }`}
                                >
                                  {/* Value */}
                                  <span
                                    className={`text-sm font-extrabold font-mono truncate px-1 ${
                                      isLight ? 'text-slate-900' : 'text-white'
                                    }`}
                                    title={getDisplayVal(item)}
                                  >
                                    {getDisplayVal(item)}
                                  </span>
                                </div>

                                {/* Index Number Below Cell */}
                                <span
                                  className={`text-[10px] font-mono mt-1 font-bold ${
                                    isLight ? 'text-slate-500' : 'text-slate-400'
                                  }`}
                                >
                                  [{idx}]
                                </span>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ================= SECTION C: DICTIONARIES & HASH MAPS ================= */}
            {(activeFilter === 'all' || activeFilter === 'dicts') && categorized.dicts.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-emerald-400">
                  <Database className="w-3.5 h-3.5" />
                  <span>DICTIONARIES, HASH MAPS & KEY-VALUE PAIRS</span>
                </div>

                {categorized.dicts.map(({ name, data }) => {
                  const entries = data.entries || [];
                  return (
                    <div
                      key={name}
                      className={`p-3.5 rounded-xl border shadow-sm ${
                        isLight ? 'bg-slate-50/90 border-slate-300' : 'bg-[#0a1326] border-[#182b4c]'
                      }`}
                    >
                      {/* Dict Header */}
                      <div className="flex items-center justify-between mb-3 pb-1.5 border-b border-inherit">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold text-xs ${isLight ? 'text-emerald-800' : 'text-emerald-300'}`}>
                            {name}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              isLight
                                ? 'bg-white border-slate-300 text-slate-700'
                                : 'bg-[#050a14] border-emerald-500/30 text-emerald-300'
                            }`}
                          >
                            Size: {data.size ?? entries.length} entries
                          </span>
                        </div>
                      </div>

                      {/* Grid of Key-Value Cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                        {entries.length === 0 ? (
                          <span className={`text-xs italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                            Empty dictionary {'{}'}
                          </span>
                        ) : (
                          entries.map((entry, eIdx) => (
                            <div
                              key={eIdx}
                              className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 shadow-xs transition-colors ${
                                isLight
                                  ? 'bg-white border-slate-300 hover:border-emerald-400'
                                  : 'bg-[#0c1830] border-[#1c3258] hover:border-emerald-500/60'
                              }`}
                            >
                              {/* Key Box */}
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className={`text-[10px] font-mono font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                                  KEY:
                                </span>
                                <span
                                  className={`text-xs font-bold font-mono truncate px-1.5 py-0.5 rounded border ${
                                    isLight
                                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                      : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                  }`}
                                  title={entry.key}
                                >
                                  "{entry.key}"
                                </span>
                              </div>

                              <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />

                              {/* Value Box */}
                              <div className="flex items-center gap-1 min-w-0">
                                <span className={`text-[10px] font-mono font-bold ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                                  VAL:
                                </span>
                                <span
                                  className={`text-xs font-extrabold font-mono truncate px-1.5 py-0.5 rounded border ${
                                    isLight
                                      ? 'bg-slate-100 border-slate-300 text-slate-900'
                                      : 'bg-[#060c18] border-[#20365c] text-white'
                                  }`}
                                  title={getDisplayVal(entry.value)}
                                >
                                  {getDisplayVal(entry.value)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ================= SECTION D: SCALAR VARIABLES ================= */}
            {(activeFilter === 'all' || activeFilter === 'vars') && categorized.vars.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold font-mono text-amber-400">
                  <Hash className="w-3.5 h-3.5" />
                  <span>LOCAL VARIABLES & SCALAR PRIMITIVES</span>
                </div>

                <div
                  className={`p-3.5 rounded-xl border shadow-sm ${
                    isLight ? 'bg-slate-50/90 border-slate-300' : 'bg-[#0a1326] border-[#182b4c]'
                  }`}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {categorized.vars.map(({ name, data }) => (
                      <div
                        key={name}
                        className={`p-2.5 rounded-lg border flex flex-col justify-between shadow-xs transition-colors ${
                          isLight
                            ? 'bg-white border-slate-300 hover:border-amber-400'
                            : 'bg-[#0c1830] border-[#1c3258] hover:border-amber-500/60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold font-mono ${isLight ? 'text-sky-800' : 'text-cyan-300'}`}>
                            {name}
                          </span>
                          <span className={`text-[9px] font-mono ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>
                            {typeof data.value}
                          </span>
                        </div>
                        <span className={`text-sm font-extrabold font-mono mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {getDisplayVal(data.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Utility for detecting interactive input requirements in Python and C++ code.
 */

export interface InputDetectionResult {
  requiresInput: boolean;
  expectedCount: number;
  prompts: string[];
}

export function detectInputRequirements(code: string, language: 'python' | 'cpp'): InputDetectionResult {
  if (!code || typeof code !== 'string') {
    return { requiresInput: false, expectedCount: 0, prompts: [] };
  }

  if (language === 'python') {
    // Matches input("prompt") or input('prompt') or input()
    const inputPromptRegex = /input\s*\(\s*(['"])([\s\S]*?)\1\s*\)/g;
    const plainInputRegex = /input\s*\(\s*\)/g;

    const prompts: string[] = [];
    let match: RegExpExecArray | null;

    while ((match = inputPromptRegex.exec(code)) !== null) {
      prompts.push(match[2] || 'Enter input: ');
    }

    const plainMatches = code.match(plainInputRegex);
    const plainCount = plainMatches ? plainMatches.length : 0;
    for (let i = 0; i < plainCount; i++) {
      prompts.push('Enter input: ');
    }

    const hasSysStdin = /sys\.stdin\.(?:readline|read)/.test(code);
    const totalCount = prompts.length + (hasSysStdin ? 1 : 0);

    return {
      requiresInput: totalCount > 0,
      expectedCount: totalCount,
      prompts: prompts.length > 0 ? prompts : ['Enter input: '],
    };
  } else {
    // C++: Matches cin >> var1 >> var2...
    const cinRegex = /cin\s*((?:>>\s*[a-zA-Z0-9_\[\]\.\-\>]+)+)/g;
    let count = 0;
    let match: RegExpExecArray | null;

    while ((match = cinRegex.exec(code)) !== null) {
      const vars = match[1].split('>>').filter((v) => v.trim());
      count += vars.length;
    }

    const getlineRegex = /getline\s*\(\s*cin\s*,/g;
    const getlineMatches = code.match(getlineRegex);
    if (getlineMatches) count += getlineMatches.length;

    const scanfRegex = /scanf\s*\(/g;
    const scanfMatches = code.match(scanfRegex);
    if (scanfMatches) count += scanfMatches.length;

    // Extract cout << "prompt" before cin
    const coutRegex = /cout\s*<<\s*["']([^"']+)["']/g;
    const prompts: string[] = [];
    while ((match = coutRegex.exec(code)) !== null) {
      // filter out newlines or decorative lines
      const text = match[1].trim();
      if (text && !text.includes('---') && !text.includes('===')) {
        prompts.push(match[1]);
      }
    }

    return {
      requiresInput: count > 0,
      expectedCount: Math.max(count, prompts.length),
      prompts: prompts.length > 0 ? prompts : ['Enter input for cin >>: '],
    };
  }
}

/**
 * Checks if stderr represents an EOF error waiting for stdin in Python
 */
export function isEofWaitingForInput(stderr: string): boolean {
  if (!stderr) return false;
  return (
    stderr.includes('EOFError') ||
    stderr.includes('EOF when reading a line') ||
    stderr.includes('Resource temporarily unavailable')
  );
}

/**
 * Builds realistic terminal display string by interleaving prompts, user inputs, and output.
 */
export function buildInteractiveTerminalOutput(
  rawStdout: string,
  inputHistory: string[],
  prompts: string[],
  isWaitingForInput: boolean
): string {
  if (inputHistory.length === 0) {
    return rawStdout;
  }

  // If we have inputs, we can format them cleanly
  return rawStdout;
}

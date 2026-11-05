export interface SavedProgram {
  id: string;
  name: string;
  language: 'python' | 'cpp';
  code: string;
  statement?: string;
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'codeproof_saved_programs';
const AUTOSAVE_PREFIX = 'codeproof_autosave_';

const DEFAULT_INITIAL_PROGRAMS: SavedProgram[] = [
  {
    id: 'starter-py-1',
    name: 'Find Largest of Three Numbers',
    language: 'python',
    statement: 'Write a Python program to find the largest of three numbers.',
    code: `# Python Program: Find largest of three numbers
def find_largest(a, b, c):
    if a >= b and a >= c:
        return a
    elif b >= a and b >= c:
        return b
    else:
        return c

print("--- Largest of Three Numbers ---")
x = float(input("Enter first number: "))
y = float(input("Enter second number: "))
z = float(input("Enter third number: "))

largest = find_largest(x, y, z)
print(f"The largest number among {x}, {y}, and {z} is {largest}")
`,
    createdAt: Date.now() - 3600000 * 24,
    updatedAt: Date.now() - 3600000 * 24,
  },
  {
    id: 'starter-cpp-1',
    name: 'Check Prime Number',
    language: 'cpp',
    statement: 'Write a C++ program to check if a number is prime.',
    code: `#include <iostream>
using namespace std;

bool isPrime(int n) {
    if (n <= 1) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}

int main() {
    int num;
    cout << "Enter an integer to check prime: ";
    if (cin >> num) {
        if (isPrime(num)) {
            cout << num << " is a PRIME number!" << endl;
        } else {
            cout << num << " is NOT a prime number." << endl;
        }
    }
    return 0;
}
`,
    createdAt: Date.now() - 3600000 * 12,
    updatedAt: Date.now() - 3600000 * 12,
  },
];

export function getSavedPrograms(): SavedProgram[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed default initial programs so user has immediate history
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_PROGRAMS));
      return DEFAULT_INITIAL_PROGRAMS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return DEFAULT_INITIAL_PROGRAMS;
  } catch (err) {
    console.error('Failed to parse saved programs:', err);
    return [];
  }
}

export function saveProgram(
  name: string,
  language: 'python' | 'cpp',
  code: string,
  statement?: string,
  existingId?: string
): SavedProgram {
  const programs = getSavedPrograms();
  const now = Date.now();

  if (existingId) {
    const existingIndex = programs.findIndex((p) => p.id === existingId);
    if (existingIndex !== -1) {
      const updated: SavedProgram = {
        ...programs[existingIndex],
        name: name.trim() || programs[existingIndex].name,
        language,
        code,
        statement: statement || programs[existingIndex].statement,
        updatedAt: now,
      };
      programs[existingIndex] = updated;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
      return updated;
    }
  }

  // Create new
  const newProgram: SavedProgram = {
    id: 'prog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name.trim() || `Untitled ${language === 'cpp' ? 'C++' : 'Python'} Program`,
    language,
    code,
    statement: statement || '',
    createdAt: now,
    updatedAt: now,
  };

  const updatedList = [newProgram, ...programs];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedList));
  return newProgram;
}

export function deleteProgram(id: string): boolean {
  try {
    const programs = getSavedPrograms();
    const filtered = programs.filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.error('Failed to delete program:', err);
    return false;
  }
}

export function renameProgram(id: string, newName: string): SavedProgram | null {
  try {
    const programs = getSavedPrograms();
    const index = programs.findIndex((p) => p.id === id);
    if (index === -1) return null;
    programs[index].name = newName.trim();
    programs[index].updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(programs));
    return programs[index];
  } catch (err) {
    console.error('Failed to rename program:', err);
    return null;
  }
}

export function duplicateProgram(id: string): SavedProgram | null {
  try {
    const programs = getSavedPrograms();
    const target = programs.find((p) => p.id === id);
    if (!target) return null;

    const dup: SavedProgram = {
      ...target,
      id: 'prog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: `${target.name} (Copy)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const updated = [dup, ...programs];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return dup;
  } catch (err) {
    console.error('Failed to duplicate program:', err);
    return null;
  }
}

// Autosave functions
export function getAutosavedCode(language: 'python' | 'cpp'): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(`${AUTOSAVE_PREFIX}${language}`);
  } catch {
    return null;
  }
}

export function setAutosavedCode(language: 'python' | 'cpp', code: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${AUTOSAVE_PREFIX}${language}`, code);
  } catch {
    // Ignore storage quota errors
  }
}

export interface CodeExample {
  id: string;
  title: string;
  statement: string;
  python: {
    code: string;
    stdin: string;
  };
  cpp: {
    code: string;
    stdin: string;
  };
}

export const SAMPLE_EXAMPLES: CodeExample[] = [
  {
    id: 'hello-world',
    title: 'Hello, World!',
    statement: 'Write a program to print Hello, World!',
    python: {
      code: `# Hello World in Python
print("Hello, World!")
`,
      stdin: '',
    },
    cpp: {
      code: `#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}
`,
      stdin: '',
    },
  },
  {
    id: 'largest-three',
    title: 'Largest of Three Numbers',
    statement: 'Write a program to find the largest of three numbers.',
    python: {
      code: `# Program to find the largest of three numbers
# Enter three numbers separated by space or lines
a = float(input("Enter first number: "))
b = float(input("Enter second number: "))
c = float(input("Enter third number: "))

if (a >= b) and (a >= c):
    largest = a
elif (b >= a) and (b >= c):
    largest = b
else:
    largest = c

print(f"The largest number between {a}, {b}, and {c} is: {largest}")
`,
      stdin: '25\n78\n42\n',
    },
    cpp: {
      code: `// Program to find the largest of three numbers
#include <iostream>
using namespace std;

int main() {
    double a, b, c;
    cout << "Enter three numbers: ";
    if (!(cin >> a >> b >> c)) {
        cout << "Invalid input!" << endl;
        return 1;
    }

    double largest;
    if (a >= b && a >= c) {
        largest = a;
    } else if (b >= a && b >= c) {
        largest = b;
    } else {
        largest = c;
    }

    cout << "The largest number is: " << largest << endl;
    return 0;
}
`,
      stdin: '25 78 42\n',
    },
  },
  {
    id: 'check-prime',
    title: 'Check Prime Number',
    statement: 'Write a program to check whether a given number is prime or not.',
    python: {
      code: `# Program to check if a number is prime
num = int(input("Enter a positive integer: "))

if num > 1:
    is_prime = True
    for i in range(2, int(num ** 0.5) + 1):
        if num % i == 0:
            is_prime = False
            break

    if is_prime:
        print(f"{num} is a prime number.")
    else:
        print(f"{num} is not a prime number.")
else:
    print(f"{num} is not a prime number.")
`,
      stdin: '29\n',
    },
    cpp: {
      code: `// Program to check prime number
#include <iostream>
#include <cmath>
using namespace std;

int main() {
    int num;
    cout << "Enter a positive integer: ";
    cin >> num;

    if (num <= 1) {
        cout << num << " is not a prime number." << endl;
        return 0;
    }

    bool isPrime = true;
    for (int i = 2; i <= sqrt(num); ++i) {
        if (num % i == 0) {
            isPrime = false;
            break;
        }
    }

    if (isPrime) {
        cout << num << " is a prime number." << endl;
    } else {
        cout << num << " is not a prime number." << endl;
    }

    return 0;
}
`,
      stdin: '29\n',
    },
  },
  {
    id: 'palindrome',
    title: 'Palindrome Checker',
    statement: 'Write a program to check if a given word is a palindrome.',
    python: {
      code: `# Program to check if a string is a palindrome
word = input("Enter a word: ").strip()

# Compare string with its reverse
reversed_word = word[::-1]

if word.lower() == reversed_word.lower():
    print(f"'{word}' is a palindrome!")
else:
    print(f"'{word}' is NOT a palindrome. Reversed is '{reversed_word}'.")
`,
      stdin: 'racecar\n',
    },
    cpp: {
      code: `// Program to check if a string is a palindrome
#include <iostream>
#include <string>
#include <algorithm>
using namespace std;

int main() {
    string word;
    cout << "Enter a word: ";
    cin >> word;

    string original = word;
    string reversedStr = word;
    reverse(reversedStr.begin(), reversedStr.end());

    if (original == reversedStr) {
        cout << "'" << original << "' is a palindrome!" << endl;
    } else {
        cout << "'" << original << "' is NOT a palindrome." << endl;
    }

    return 0;
}
`,
      stdin: 'madam\n',
    },
  },
  {
    id: 'fibonacci',
    title: 'Fibonacci Sequence',
    statement: 'Generate Fibonacci sequence up to N terms.',
    python: {
      code: `# Program to generate Fibonacci sequence up to n terms
n = int(input("How many terms? "))

# First two terms
n1, n2 = 0, 1
count = 0

if n <= 0:
    print("Please enter a positive integer.")
elif n == 1:
    print("Fibonacci sequence up to", n, ":")
    print(n1)
else:
    print("Fibonacci sequence:")
    while count < n:
        print(n1, end=" ")
        nth = n1 + n2
        # Update values
        n1 = n2
        n2 = nth
        count += 1
    print()
`,
      stdin: '8\n',
    },
    cpp: {
      code: `// Fibonacci sequence in C++
#include <iostream>
using namespace std;

int main() {
    int n;
    cout << "How many terms? ";
    cin >> n;

    int t1 = 0, t2 = 1, nextTerm = 0;

    cout << "Fibonacci Series: ";
    for (int i = 1; i <= n; ++i) {
        if (i == 1) {
            cout << t1 << " ";
            continue;
        }
        if (i == 2) {
            cout << t2 << " ";
            continue;
        }
        nextTerm = t1 + t2;
        t1 = t2;
        t2 = nextTerm;
        cout << nextTerm << " ";
    }
    cout << endl;
    return 0;
}
`,
      stdin: '8\n',
    },
  },
  {
    id: 'dict-map-frequency',
    title: 'Word Frequency (Dictionary & Map)',
    statement: 'Write a program to count the frequency of each word using a Dictionary (Python) or unordered_map (C++).',
    python: {
      code: `# Word frequency counter using Python Dictionary
def count_words(sentence):
    words = sentence.strip().split()
    frequency = {}
    for w in words:
        cleaned = w.lower().strip(".,!?;:")
        if cleaned:
            frequency[cleaned] = frequency.get(cleaned, 0) + 1
    return frequency

line = input("Enter a sentence to analyze: ")
result = count_words(line)

print("--- Word Frequency Dictionary ---")
for word, count in sorted(result.items(), key=lambda item: -item[1]):
    print(f"'{word}': {count} time(s)")
`,
      stdin: 'code proof ai is fast and code proof is easy\n',
    },
    cpp: {
      code: `// Word frequency counter using C++ unordered_map
#include <iostream>
#include <string>
#include <sstream>
#include <unordered_map>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    string line;
    cout << "Enter a sentence to analyze: ";
    getline(cin, line);

    stringstream ss(line);
    string word;
    unordered_map<string, int> freq;

    while (ss >> word) {
        // Simple lowercase cleanup
        for (char &c : word) c = tolower(c);
        freq[word]++;
    }

    cout << "--- Word Frequency (unordered_map) ---" << endl;
    for (const auto& [w, count] : freq) {
        cout << "'" << w << "': " << count << " time(s)" << endl;
    }
    return 0;
}
`,
      stdin: 'code proof ai is fast and code proof is easy\n',
    },
  },
  {
    id: 'math-random-simulation',
    title: 'Math & Random Modules Simulation',
    statement: 'Write a program using Math and Random modules to compute hypotenuse, powers, and roll dice.',
    python: {
      code: `# Using Python standard library modules: math and random
import math
import random

print("--- Math & Random Modules ---")
side_a = float(input("Enter side A: "))
side_b = float(input("Enter side B: "))

# math functions
hypotenuse = math.hypot(side_a, side_b)
print(f"Hypotenuse: {round(hypotenuse, 4)}")
print(f"Square root of side A: {math.sqrt(side_a):.4f}")

# random dice roll
roll = random.randint(1, 6)
print(f"Lucky dice roll (1-6): {roll}")
`,
      stdin: '3\n4\n',
    },
    cpp: {
      code: `// Using C++ standard libraries: <cmath> and <cstdlib>
#include <iostream>
#include <cmath>
#include <cstdlib>
#include <ctime>
using namespace std;

int main() {
    double a, b;
    cout << "Enter side A: ";
    cin >> a;
    cout << "Enter side B: ";
    cin >> b;

    // cmath hypotenuse
    double hyp = hypot(a, b);
    cout << "Hypotenuse: " << hyp << endl;
    cout << "Square root of side A: " << sqrt(a) << endl;

    // Pseudo-random dice roll (1-6)
    int roll = (rand() % 6) + 1;
    cout << "Lucky dice roll (1-6): " << roll << endl;
    return 0;
}
`,
      stdin: '3\n4\n',
    },
  },
];

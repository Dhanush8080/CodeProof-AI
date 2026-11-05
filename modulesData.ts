export interface ModuleItem {
  id: string;
  name: string;
  language: 'python' | 'cpp';
  category: 'module' | 'dictionary' | 'data-structure';
  importStatement: string;
  description: string;
  popularFunctions: string[];
  snippet: string;
  docUrl?: string;
}

export const MODULES_DATA: ModuleItem[] = [
  // ==================== PYTHON MODULES ====================
  {
    id: 'py-math',
    name: 'math',
    language: 'python',
    category: 'module',
    importStatement: 'import math',
    description: 'Provides mathematical functions including trigonometry, logarithms, factorials, and constants like pi and e.',
    popularFunctions: ['math.sqrt(x)', 'math.ceil(x)', 'math.floor(x)', 'math.pow(x, y)', 'math.gcd(a, b)', 'math.factorial(n)', 'math.pi'],
    snippet: `# math module example
import math

val = 16
print("Square root of", val, "is", math.sqrt(val))
print("Ceiling of 4.2:", math.ceil(4.2))
print("GCD of 48 and 18:", math.gcd(48, 18))
print("Pi:", round(math.pi, 4))
`,
  },
  {
    id: 'py-random',
    name: 'random',
    language: 'python',
    category: 'module',
    importStatement: 'import random',
    description: 'Implements pseudo-random number generators for various distributions, shuffling, and random item selection.',
    popularFunctions: ['random.randint(a, b)', 'random.choice(seq)', 'random.shuffle(list)', 'random.sample(seq, k)', 'random.random()'],
    snippet: `# random module example
import random

roll = random.randint(1, 6)
print("Dice roll:", roll)

fruits = ["apple", "banana", "cherry", "mango"]
print("Random pick:", random.choice(fruits))
`,
  },
  {
    id: 'py-datetime',
    name: 'datetime',
    language: 'python',
    category: 'module',
    importStatement: 'from datetime import datetime, date, timedelta',
    description: 'Supplies classes for manipulating dates and times in both simple and complex ways.',
    popularFunctions: ['datetime.now()', 'date.today()', 'timedelta(days=n)', 'dt.strftime("%Y-%m-%d")', 'datetime.strptime()'],
    snippet: `# datetime module example
from datetime import datetime, date, timedelta

now = datetime.now()
print("Current timestamp:", now.strftime("%Y-%m-%d %H:%M:%S"))
tomorrow = date.today() + timedelta(days=1)
print("Tomorrow's date:", tomorrow)
`,
  },
  {
    id: 'py-json',
    name: 'json',
    language: 'python',
    category: 'module',
    importStatement: 'import json',
    description: 'Encodes and decodes JSON (JavaScript Object Notation) data, converting Python dictionaries to/from JSON strings.',
    popularFunctions: ['json.dumps(obj, indent=2)', 'json.loads(string)', 'json.dump()', 'json.load()'],
    snippet: `# json module example
import json

data = {"student": "Alice", "marks": 92, "passed": True}
json_str = json.dumps(data, indent=2)
print("JSON String:\n", json_str)

parsed = json.loads(json_str)
print("Decoded Name:", parsed["student"])
`,
  },
  {
    id: 'py-os',
    name: 'os',
    language: 'python',
    category: 'module',
    importStatement: 'import os',
    description: 'Provides a portable way of using operating system dependent functionality like file paths and environment variables.',
    popularFunctions: ['os.path.join()', 'os.path.exists()', 'os.getcwd()', 'os.listdir()', 'os.environ.get()'],
    snippet: `# os module example
import os

print("Current Working Directory:", os.getcwd())
full_path = os.path.join("data", "files", "sample.txt")
print("Constructed Path:", full_path)
`,
  },
  {
    id: 'py-sys',
    name: 'sys',
    language: 'python',
    category: 'module',
    importStatement: 'import sys',
    description: 'Provides access to some variables used or maintained by the interpreter and functions interacting with the Python engine.',
    popularFunctions: ['sys.argv', 'sys.stdin.read()', 'sys.exit(0)', 'sys.version', 'sys.maxsize'],
    snippet: `# sys module example
import sys

print("Python Version:", sys.version.split()[0])
print("Max Integer Size:", sys.maxsize)
`,
  },
  {
    id: 'py-collections',
    name: 'collections',
    language: 'python',
    category: 'module',
    importStatement: 'from collections import Counter, defaultdict, deque, namedtuple',
    description: 'Offers high-performance specialized container alternatives to Python general purpose built-in dict, list, set, and tuple.',
    popularFunctions: ['Counter(iterable)', 'defaultdict(type)', 'deque()', 'namedtuple()'],
    snippet: `# collections module example
from collections import Counter, defaultdict

# Frequency counter
words = ["apple", "banana", "apple", "cherry", "banana", "apple"]
counts = Counter(words)
print("Top counts:", counts.most_common(2))

# Defaultdict
grouping = defaultdict(list)
grouping["fruits"].append("Mango")
print("Defaultdict result:", dict(grouping))
`,
  },
  {
    id: 'py-itertools',
    name: 'itertools',
    language: 'python',
    category: 'module',
    importStatement: 'import itertools',
    description: 'Constructs fast, memory-efficient tools for creating iterators, permutations, combinations, and cartesian products.',
    popularFunctions: ['itertools.permutations()', 'itertools.combinations()', 'itertools.cycle()', 'itertools.chain()'],
    snippet: `# itertools module example
import itertools

items = ['A', 'B', 'C']
perms = list(itertools.permutations(items, 2))
print("Permutations of 2:", perms)

combs = list(itertools.combinations(items, 2))
print("Combinations of 2:", combs)
`,
  },
  {
    id: 'py-re',
    name: 're',
    language: 'python',
    category: 'module',
    importStatement: 'import re',
    description: 'Provides regular expression matching operations similar to those found in Perl for advanced pattern recognition.',
    popularFunctions: ['re.search(pattern, text)', 're.findall(pattern, text)', 're.sub(pattern, repl, text)', 're.match()'],
    snippet: `# re module example
import re

text = "Contact us at support@example.com or admin@codeproof.io"
emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
print("Found Emails:", emails)
`,
  },
  {
    id: 'py-pandas',
    name: 'pandas',
    language: 'python',
    category: 'module',
    importStatement: 'import pandas as pd',
    description: 'The standard data science and analysis library providing DataFrame and Series structures for tabular data manipulation.',
    popularFunctions: ['pd.DataFrame(data)', 'pd.Series(data)', 'df.describe()', 'df.head()', 'df.groupby()', 'df.to_csv()'],
    snippet: `# pandas library example
import pandas as pd

data = {
    "Name": ["Alice", "Bob", "Charlie"],
    "Score": [88, 95, 79],
    "Grade": ["B", "A", "C"]
}

df = pd.DataFrame(data)
print("--- Student DataFrame ---")
print(df)
print("\nMean Score:", df["Score"].mean())
`,
  },
  {
    id: 'py-heapq',
    name: 'heapq',
    language: 'python',
    category: 'module',
    importStatement: 'import heapq',
    description: 'Implements a binary heap (priority queue) algorithm where the smallest element is always stored at root (min-heap).',
    popularFunctions: ['heapq.heappush(heap, item)', 'heapq.heappop(heap)', 'heapq.heapify(list)', 'heapq.nlargest(n, iter)', 'heapq.nsmallest(n, iter)'],
    snippet: `# heapq priority queue example
import heapq

numbers = [20, 1, 45, 12, 8]
heapq.heapify(numbers)
print("Min element (root):", numbers[0])
heapq.heappush(numbers, 0)
print("Smallest 3 numbers:", heapq.nsmallest(3, numbers))
`,
  },
  {
    id: 'py-functools',
    name: 'functools',
    language: 'python',
    category: 'module',
    importStatement: 'from functools import lru_cache, reduce, partial',
    description: 'Higher-order functions that act on or return other functions, including memoization (lru_cache) and reduce.',
    popularFunctions: ['@lru_cache(maxsize=128)', 'reduce(func, seq)', 'partial(func, *args)'],
    snippet: `# functools module example: Fast Fibonacci with lru_cache
from functools import lru_cache, reduce

@lru_cache(maxsize=None)
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)

print("Fibonacci(35):", fib(35))
product = reduce(lambda a, b: a * b, [1, 2, 3, 4, 5])
print("Factorial of 5 (via reduce):", product)
`,
  },
  {
    id: 'py-statistics',
    name: 'statistics',
    language: 'python',
    category: 'module',
    importStatement: 'import statistics',
    description: 'Functions for calculating mathematical statistics of numeric data including mean, median, mode, and standard deviation.',
    popularFunctions: ['statistics.mean(data)', 'statistics.median(data)', 'statistics.mode(data)', 'statistics.stdev(data)'],
    snippet: `# statistics module example
import statistics

grades = [85, 90, 78, 92, 88, 95, 88]
print("Mean Grade:", round(statistics.mean(grades), 2))
print("Median:", statistics.median(grades))
print("Mode:", statistics.mode(grades))
print("Standard Deviation:", round(statistics.stdev(grades), 2))
`,
  },

  // ==================== PYTHON DICTIONARIES ====================
  {
    id: 'py-dict-nested',
    name: 'Nested Dictionaries',
    language: 'python',
    category: 'dictionary',
    importStatement: '# Nested Python dictionary structure',
    description: 'Hierarchical dictionary containing other dictionaries as values for complex structured records and data modeling.',
    popularFunctions: ['dict[outer][inner]', 'dict.setdefault(k, {})', 'for user, info in dict.items():'],
    snippet: `# Nested dictionary representation
company = {
    "emp101": {"name": "Sarah", "role": "Lead Architect", "skills": ["Python", "C++"]},
    "emp102": {"name": "James", "role": "Data Engineer", "skills": ["Python", "SQL"]}
}

for emp_id, details in company.items():
    print(f"ID: {emp_id} | Name: {details['name']} | Role: {details['role']}")
`,
  },
  {
    id: 'py-dict-basic',
    name: 'dict (Creation & Access)',
    language: 'python',
    category: 'dictionary',
    importStatement: '# Built-in Python dict (no import required)',
    description: 'Key-value mapping data structure with O(1) average lookup, insertion, and deletion.',
    popularFunctions: ['dict[key]', 'dict.get(key, default)', 'key in dict', 'len(dict)', 'dict.clear()'],
    snippet: `# Python Dictionary basics
student = {
    "name": "David",
    "age": 20,
    "courses": ["CS101", "Math201"],
    "gpa": 3.85
}

print("Student Name:", student["name"])
# Safe access with .get()
print("Graduation Year:", student.get("grad_year", "Not Set"))
`,
  },
  {
    id: 'py-dict-methods',
    name: 'dict (Methods & Iteration)',
    language: 'python',
    category: 'dictionary',
    importStatement: '# Built-in Python dict methods',
    description: 'Methods for extracting keys, values, key-value pairs, and updating or removing entries.',
    popularFunctions: ['dict.items()', 'dict.keys()', 'dict.values()', 'dict.update()', 'dict.pop(key)', 'dict.setdefault()'],
    snippet: `# Iterating and modifying a dictionary
inventory = {"apples": 10, "oranges": 5, "peaches": 8}

# Loop through key-value pairs
print("--- Inventory List ---")
for item, count in inventory.items():
    print(f"{item.capitalize()}: {count} in stock")

# Updating inventory
inventory.update({"grapes": 15, "apples": 12})
removed = inventory.pop("oranges", None)
print("Remaining items:", list(inventory.keys()))
`,
  },
  {
    id: 'py-dict-comprehension',
    name: 'dict Comprehension',
    language: 'python',
    category: 'dictionary',
    importStatement: '# Python dictionary comprehension syntax',
    description: 'Concise syntax for constructing new dictionaries from iterables with optional filtering.',
    popularFunctions: ['{k: v for k, v in iterable}', '{k: v for x in list if condition}'],
    snippet: `# Dictionary Comprehension
numbers = [1, 2, 3, 4, 5]
squares_map = {n: n**2 for n in numbers}
print("Squares:", squares_map)

# Filtering even numbers only
even_cubes = {n: n**3 for n in numbers if n % 2 == 0}
print("Even Cubes:", even_cubes)
`,
  },
  {
    id: 'py-dict-frequency',
    name: 'Word Frequency Dictionary',
    language: 'python',
    category: 'dictionary',
    importStatement: 'from collections import Counter',
    description: 'Counting occurrences of words or elements using a dictionary or Counter.',
    popularFunctions: ['freq_dict[item] = freq_dict.get(item, 0) + 1', 'Counter(words)'],
    snippet: `# Word frequency counter using dictionary
text = "code proof ai is simple and code proof is fast"
words = text.split()

frequency = {}
for word in words:
    frequency[word] = frequency.get(word, 0) + 1

for word, count in sorted(frequency.items(), key=lambda x: -x[1]):
    print(f"'{word}': {count}")
`,
  },

  // ==================== C++ STL MODULES & HEADERS ====================
  {
    id: 'cpp-iostream',
    name: '<iostream>',
    language: 'cpp',
    category: 'module',
    importStatement: '#include <iostream>',
    description: 'Standard Input/Output stream objects: cin, cout, cerr, and clog with stream operators << and >>.',
    popularFunctions: ['std::cout << val', 'std::cin >> val', 'std::endl', 'std::getline(cin, str)'],
    snippet: `#include <iostream>
using namespace std;

int main() {
    cout << "Standard C++ I/O Stream ready!" << endl;
    return 0;
}
`,
  },
  {
    id: 'cpp-vector',
    name: '<vector>',
    language: 'cpp',
    category: 'module',
    importStatement: '#include <vector>',
    description: 'Dynamic contiguous array that resizes automatically when elements are added or removed.',
    popularFunctions: ['vec.push_back(x)', 'vec.pop_back()', 'vec.size()', 'vec.empty()', 'vec.clear()', 'vec.front()', 'vec.back()'],
    snippet: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    vector<int> nums = {10, 20, 30};
    nums.push_back(40);
    
    cout << "Vector elements: ";
    for (int n : nums) cout << n << " ";
    cout << endl;
    return 0;
}
`,
  },
  {
    id: 'cpp-string',
    name: '<string>',
    language: 'cpp',
    category: 'module',
    importStatement: '#include <string>',
    description: 'Standard std::string class supporting dynamic characters, concatenation, and substrings.',
    popularFunctions: ['str.length()', 'str.substr(pos, len)', 'str.find(sub)', 'std::to_string()', 'std::stoi()'],
    snippet: `#include <iostream>
#include <string>
using namespace std;

int main() {
    string greeting = "Hello, CodeProof!";
    cout << "Length: " << greeting.length() << endl;
    cout << "Substr: " << greeting.substr(7, 9) << endl;
    return 0;
}
`,
  },
  {
    id: 'cpp-algorithm',
    name: '<algorithm>',
    language: 'cpp',
    category: 'module',
    importStatement: '#include <algorithm>',
    description: 'Collection of STL algorithm functions for sorting, searching, counting, reversing, and transforming containers.',
    popularFunctions: ['std::sort(b, e)', 'std::binary_search()', 'std::reverse(b, e)', 'std::max_element()', 'std::count()'],
    snippet: `#include <iostream>
#include <vector>
#include <algorithm>
using namespace std;

int main() {
    vector<int> vals = {42, 13, 89, 7, 24};
    sort(vals.begin(), vals.end());
    
    cout << "Sorted: ";
    for (int v : vals) cout << v << " ";
    cout << endl;
    
    cout << "Max: " << *max_element(vals.begin(), vals.end()) << endl;
    return 0;
}
`,
  },
  {
    id: 'cpp-cmath',
    name: '<cmath>',
    language: 'cpp',
    category: 'module',
    importStatement: '#include <cmath>',
    description: 'Common mathematical functions for floating-point calculations like powers, roots, and trigonometry.',
    popularFunctions: ['sqrt(x)', 'pow(b, e)', 'abs(x)', 'ceil(x)', 'floor(x)', 'round(x)', 'log(x)'],
    snippet: `#include <iostream>
#include <cmath>
using namespace std;

int main() {
    double x = 25.0;
    cout << "Square root of " << x << ": " << sqrt(x) << endl;
    cout << "2 raised to 8: " << pow(2, 8) << endl;
    return 0;
}
`,
  },
  {
    id: 'cpp-numeric',
    name: '<numeric>',
    language: 'cpp',
    category: 'module',
    importStatement: '#include <numeric>',
    description: 'Mathematical and numeric algorithms including accumulate (sum), gcd, lcm, and iota.',
    popularFunctions: ['std::accumulate(b, e, 0)', 'std::gcd(a, b)', 'std::lcm(a, b)', 'std::iota(b, e, val)'],
    snippet: `#include <iostream>
#include <vector>
#include <numeric>
using namespace std;

int main() {
    vector<int> nums = {1, 2, 3, 4, 5};
    int sum = accumulate(nums.begin(), nums.end(), 0);
    cout << "Sum: " << sum << endl;
    cout << "GCD(48, 18): " << std::gcd(48, 18) << endl;
    return 0;
}
`,
  },
  {
    id: 'cpp-queue',
    name: '<queue>',
    language: 'cpp',
    category: 'module',
    importStatement: '#include <queue>',
    description: 'FIFO Queue and max/min Priority Queue container adapters.',
    popularFunctions: ['q.push(x)', 'q.pop()', 'q.front()', 'pq.top()', 'q.empty()'],
    snippet: `#include <iostream>
#include <queue>
using namespace std;

int main() {
    // Max priority queue (heap)
    priority_queue<int> pq;
    pq.push(10);
    pq.push(50);
    pq.push(30);

    cout << "Largest element: " << pq.top() << endl;
    return 0;
}
`,
  },

  // ==================== C++ DICTIONARIES & MAPS ====================
  {
    id: 'cpp-unordered-map',
    name: '<unordered_map> (Hash Table)',
    language: 'cpp',
    category: 'dictionary',
    importStatement: '#include <unordered_map>',
    description: 'O(1) average time hash table associative container mapping keys to values without sorting.',
    popularFunctions: ['map[key]', 'map.find(key)', 'map.count(key)', 'map.insert({k, v})', 'map.erase(key)', 'map.size()'],
    snippet: `#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;

int main() {
    unordered_map<string, int> scores;
    scores["Alice"] = 95;
    scores["Bob"] = 88;
    scores["Charlie"] = 92;

    cout << "Alice's score: " << scores["Alice"] << endl;

    // Check if key exists
    if (scores.find("David") == scores.end()) {
        cout << "David is not in the database." << endl;
    }

    // C++17 Structured binding iteration
    for (const auto& [name, score] : scores) {
        cout << name << " -> " << score << endl;
    }
    return 0;
}
`,
  },
  {
    id: 'cpp-map',
    name: '<map> (Ordered Red-Black Tree)',
    language: 'cpp',
    category: 'dictionary',
    importStatement: '#include <map>',
    description: 'O(log N) self-balancing binary search tree dictionary that keeps all keys sorted in ascending order.',
    popularFunctions: ['map[key]', 'map.find(key)', 'map.lower_bound()', 'map.upper_bound()', 'map.size()'],
    snippet: `#include <iostream>
#include <string>
#include <map>
using namespace std;

int main() {
    // Keys will automatically be sorted alphabetically
    map<string, double> productPrices;
    productPrices["Laptop"] = 999.99;
    productPrices["Mouse"] = 24.50;
    productPrices["Keyboard"] = 79.00;

    cout << "--- Sorted Product Catalog ---" << endl;
    for (const auto& [item, price] : productPrices) {
        cout << item << ": $" << price << endl;
    }
    return 0;
}
`,
  },
  {
    id: 'cpp-map-frequency',
    name: 'C++ Frequency Counter (unordered_map)',
    language: 'cpp',
    category: 'dictionary',
    importStatement: '#include <unordered_map>',
    description: 'Standard interview and competitive programming pattern to count element frequencies in O(N) time.',
    popularFunctions: ['freq[x]++', 'for (auto& [val, count] : freq)'],
    snippet: `#include <iostream>
#include <vector>
#include <unordered_map>
using namespace std;

int main() {
    vector<int> arr = {4, 1, 2, 4, 1, 4, 3, 2, 4};
    unordered_map<int, int> freq;

    for (int num : arr) {
        freq[num]++;
    }

    cout << "--- Element Frequency ---" << endl;
    for (const auto& [val, count] : freq) {
        cout << val << " occurs " << count << " times" << endl;
    }
    return 0;
}
`,
  },
  {
    id: 'cpp-set',
    name: '<set> & <unordered_set>',
    language: 'cpp',
    category: 'module',
    importStatement: '#include <set>\n#include <unordered_set>',
    description: 'Associative containers that store unique elements in sorted order (std::set) or hashed order (std::unordered_set).',
    popularFunctions: ['set.insert(x)', 'set.count(x)', 'set.find(x)', 'set.erase(x)', 'set.size()'],
    snippet: `#include <iostream>
#include <set>
#include <unordered_set>
using namespace std;

int main() {
    set<int> uniqueSorted = {5, 2, 8, 2, 5, 1};
    cout << "Unique Sorted: ";
    for (int n : uniqueSorted) cout << n << " ";
    cout << endl;

    if (uniqueSorted.count(8)) {
        cout << "8 is present in the set!" << endl;
    }
    return 0;
}
`,
  },
  {
    id: 'cpp-templates-classes',
    name: 'C++ Templates & Classes',
    language: 'cpp',
    category: 'module',
    importStatement: '#include <memory>\n#include <iostream>',
    description: 'Generic programming with templates and RAII memory management using modern smart pointers (std::unique_ptr, std::make_unique).',
    popularFunctions: ['template<typename T>', 'std::make_unique<T>()', 'std::unique_ptr<T>'],
    snippet: `#include <iostream>
#include <string>
#include <memory>
using namespace std;

// Generic Template Class
template <typename T>
class Box {
private:
    T item;
public:
    Box(T val) : item(val) {}
    T get() const { return item; }
};

int main() {
    // Modern C++14/17/20 Smart Pointer
    auto numBox = make_unique<Box<int>>(100);
    auto strBox = make_unique<Box<string>>("Modern C++ Standard");

    cout << "Box 1: " << numBox->get() << endl;
    cout << "Box 2: " << strBox->get() << endl;
    return 0;
}
`,
  },
];

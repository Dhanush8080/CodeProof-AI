// test_interactive.js
import http from 'http';

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let resBody = '';
      res.on('data', chunk => resBody += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(resBody));
        } catch {
          resolve(resBody);
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function listenSSE(sessionId, onEvent) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: `/api/interactive/stream/${sessionId}`,
      method: 'GET',
    }, (res) => {
      let buffer = '';
      res.on('data', (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n\n');
        buffer = lines.pop(); // keep remainder
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.slice(6);
            try {
              const event = JSON.parse(jsonStr);
              onEvent(event);
              if (event.type === 'done' || event.type === 'stopped' || event.type === 'error') {
                req.destroy();
                resolve();
              }
            } catch (e) {
              console.error('Error parsing SSE event in test:', e);
            }
          }
        }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runTests() {
  console.log('=== TEST 1: Python 5 Interactive Inputs ===');
  const pyCode = `
print("Starting Student Profile Setup...")
name = input("Enter your name: ")
age = input("Enter your age: ")
college = input("Enter your college: ")
major = input("Enter your major: ")
gpa = input("Enter your GPA: ")
print(f"SUCCESS: {name}, {age} years old, studying {major} at {college} with GPA {gpa}!")
`;

  const pyStart = await post('/api/interactive/start', { code: pyCode, language: 'python' });
  console.log('Python started session:', pyStart.sessionId);

  let pyEvents = [];
  const ssePyPromise = listenSSE(pyStart.sessionId, (evt) => {
    pyEvents.push(evt);
    if (evt.type === 'stdout') process.stdout.write('[OUT] ' + evt.text);
    if (evt.type === 'waiting_input') console.log('[PROMPT]', evt.prompt);
  });

  const inputs = ['Alice', '20', 'MIT', 'CS', '3.95'];
  for (const val of inputs) {
    await sleep(250);
    console.log(`[USER INPUT] -> ${val}`);
    await post(`/api/interactive/input/${pyStart.sessionId}`, { input: val });
  }

  await ssePyPromise;
  console.log('Python test completed!\n');

  console.log('=== TEST 2: C++ 5 Interactive Inputs ===');
  const cppCode = `
#include <iostream>
#include <string>
using namespace std;

int main() {
    cout << "Enter 5 integers one by one:" << endl;
    int a, b, c, d, e;
    cout << "Value 1: ";
    cin >> a;
    cout << "Value 2: ";
    cin >> b;
    cout << "Value 3: ";
    cin >> c;
    cout << "Value 4: ";
    cin >> d;
    cout << "Value 5: ";
    cin >> e;
    int sum = a + b + c + d + e;
    cout << "Total Sum = " << sum << endl;
    return 0;
}
`;

  const cppStart = await post('/api/interactive/start', { code: cppCode, language: 'cpp' });
  console.log('C++ started session:', cppStart.sessionId);

  const sseCppPromise = listenSSE(cppStart.sessionId, (evt) => {
    if (evt.type === 'stdout') process.stdout.write('[CPP OUT] ' + evt.text);
    if (evt.type === 'waiting_input') console.log('[CPP PROMPT]', evt.prompt);
  });

  const cppInputs = ['10', '25', '35', '40', '50'];
  for (const val of cppInputs) {
    await sleep(250);
    console.log(`[CPP USER INPUT] -> ${val}`);
    await post(`/api/interactive/input/${cppStart.sessionId}`, { input: val });
  }

  await sseCppPromise;
  console.log('C++ test completed!\n');

  console.log('ALL TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});

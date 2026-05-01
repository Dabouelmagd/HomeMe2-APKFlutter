/**
 * Standalone unit test for sameOriginRewrite.
 * Runs in node (not jsdom) — minimally simulates a browser global.
 */
const assert = require('assert');

// --- Minimal browser globals --------------------------------------------------
class FakeWebSocket {
  constructor(url, protocols) {
    this.url = url; this.protocols = protocols;
    FakeWebSocket._lastUrl = url;
  }
}
FakeWebSocket.CONNECTING = 0; FakeWebSocket.OPEN = 1;
FakeWebSocket.CLOSING = 2; FakeWebSocket.CLOSED = 3;

const fetchCalls = [];
async function fakeFetch(input, init) {
  const url = typeof input === 'string' ? input : (input && input.url);
  fetchCalls.push(url);
  return { ok: true, status: 200, url };
}

global.window = {
  location: { origin: 'https://homemeapp.net' },
  fetch: fakeFetch,
  WebSocket: FakeWebSocket,
};
global.Request = function (url, init) { this.url = url; Object.assign(this, init || {}); };
global.fetch = fakeFetch;

process.env.REACT_APP_BACKEND_URL = 'https://dashboard-rescue-12.emergent.host';

// Mock axios
const axiosInstance = {
  interceptors: {
    request: {
      _hooks: [],
      use(fn) { this._hooks.push(fn); },
    },
  },
  // simulated send
  async _send(config) {
    let cfg = { ...config };
    for (const h of this.interceptors.request._hooks) cfg = h(cfg) || cfg;
    return cfg;
  },
};

require.cache[require.resolve('axios')] = {
  exports: { default: axiosInstance, ...axiosInstance },
};

// Now load the module under test (transpile imports manually since it's ES6+)
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../src/api/sameOriginRewrite.js'), 'utf8');

// Crude ES → CJS for the test harness: replace `import axios from 'axios';` with our mock
const cjs = src
  .replace(/import\s+axios\s+from\s+['"]axios['"];?/g, '/* axios injected from outer scope */')
  .replace(/export\s+function/g, 'function')
  .replace(/export\s+(const|let|var)\s+/g, '$1 ');

// Append exports
const finalSrc = cjs + '\nmodule.exports = { installSameOriginRewrite, attachRewriteToAxios, getRewriteFn };\n';

const Module = require('module');
const m = new Module('test');
// Prepend an `axios` const so the inlined module finds it
const wrappedSrc = `const axios = ${JSON.stringify({})};\n` + finalSrc;
// Actually inject the live axiosInstance via a closure
const wrap = new Function('axios', 'module', 'console', 'window', 'process', 'Request', wrappedSrc.replace(/^const axios = .*;\n/, ''));
const exportsObj = { exports: {} };
wrap(axiosInstance, exportsObj, console, global.window, process, global.Request);
const { installSameOriginRewrite, getRewriteFn } = exportsObj.exports;

// --- TESTS ---
console.log('1. Install rewrite (cross-origin → same-origin)…');
installSameOriginRewrite();

const rewrite = getRewriteFn();
assert.strictEqual(
  rewrite('https://dashboard-rescue-12.emergent.host/api/auth/login'),
  'https://homemeapp.net/api/auth/login',
  'http URL should be rewritten to same-origin'
);
console.log('   ✓ http URL rewritten correctly');

assert.strictEqual(
  rewrite('wss://dashboard-rescue-12.emergent.host/ws/chat/u1'),
  'wss://homemeapp.net/ws/chat/u1',
  'ws URL should be rewritten too'
);
console.log('   ✓ wss URL rewritten correctly');

assert.strictEqual(
  rewrite('https://other-host.com/api/x'),
  'https://other-host.com/api/x',
  'Unrelated URLs should pass through'
);
console.log('   ✓ unrelated URLs untouched');

console.log('2. window.fetch monkey-patch…');
window.fetch('https://dashboard-rescue-12.emergent.host/api/auth/register', { method: 'POST' });
const lastFetched = fetchCalls[fetchCalls.length - 1];
assert.ok(
  lastFetched.startsWith('https://homemeapp.net/'),
  `expected fetch to be rewritten, got: ${lastFetched}`
);
console.log(`   ✓ fetch() rewrote → ${lastFetched}`);

console.log('3. WebSocket monkey-patch…');
new window.WebSocket('wss://dashboard-rescue-12.emergent.host/ws/chat/abc');
assert.ok(
  FakeWebSocket._lastUrl.startsWith('wss://homemeapp.net/'),
  `expected ws to be rewritten, got: ${FakeWebSocket._lastUrl}`
);
console.log(`   ✓ WebSocket() rewrote → ${FakeWebSocket._lastUrl}`);

console.log('4. axios request interceptor…');
(async () => {
  const sent = await axiosInstance._send({ url: 'https://dashboard-rescue-12.emergent.host/api/users' });
  assert.strictEqual(
    sent.url,
    'https://homemeapp.net/api/users',
    'axios interceptor should rewrite URL'
  );
  console.log(`   ✓ axios rewrote → ${sent.url}`);

  console.log('\n✅ All sameOriginRewrite unit tests passed.');
})().catch((e) => {
  console.error('❌ Test failed:', e);
  process.exit(1);
});

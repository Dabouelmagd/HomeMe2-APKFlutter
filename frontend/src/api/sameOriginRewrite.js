/**
 * sameOriginRewrite.js
 * ---------------------------------------------------------------
 * If the build was baked with REACT_APP_BACKEND_URL pointing to a
 * cross-origin host (e.g. dashboard-rescue-12.emergent.host) but the
 * page is served from a different origin where the same backend is
 * also reachable at /api (e.g. homemeapp.net), this module transparently
 * rewrites every cross-origin API call to same-origin.
 *
 * Why:
 *  - Same-origin = no CORS preflight latency
 *  - Same-origin = no third-party-cookie blocking
 *  - Same-origin = unaffected by ISP/extension blocks of *.emergent.host
 *  - Same-origin = stale service workers can't re-route POSTs anymore
 *
 * Coverage:
 *  - axios (via global request interceptor + helper for axios.create())
 *  - window.fetch
 *  - window.WebSocket  (handles  http→ws  /  https→wss  too)
 *
 * Safe no-op when origins match (preview / local dev).
 * ---------------------------------------------------------------
 */
import axios from 'axios';

const RAW_BACKEND_URL = (process.env.REACT_APP_BACKEND_URL || '').replace(/\/+$/, '');

let _installed = false;
let _rewriteFn = (url) => url;

export function getRewriteFn() {
  return _rewriteFn;
}

/** Apply the same request rewrite to a custom axios instance (e.g. axios.create()). */
export function attachRewriteToAxios(instance) {
  if (!instance || typeof instance.interceptors?.request?.use !== 'function') return;
  instance.interceptors.request.use((config) => {
    if (typeof config.url === 'string') config.url = _rewriteFn(config.url);
    if (typeof config.baseURL === 'string') config.baseURL = _rewriteFn(config.baseURL);
    return config;
  });
}

export function installSameOriginRewrite() {
  if (_installed) return;
  if (typeof window === 'undefined' || !window.location?.origin) return;

  const sameOrigin = window.location.origin.replace(/\/+$/, '');
  if (!RAW_BACKEND_URL || sameOrigin === RAW_BACKEND_URL) {
    _installed = true;
    return; // no rewrite needed
  }

  // Build ws/wss equivalents of both URLs so WebSocket calls also redirect.
  const httpToWs = (u) => u.replace(/^https:/i, 'wss:').replace(/^http:/i, 'ws:');
  const wsBackend = httpToWs(RAW_BACKEND_URL);
  const wsSameOrigin = httpToWs(sameOrigin);

  _rewriteFn = (url) => {
    if (typeof url !== 'string') return url;
    if (url.startsWith(RAW_BACKEND_URL)) {
      return sameOrigin + url.slice(RAW_BACKEND_URL.length);
    }
    if (url.startsWith(wsBackend)) {
      return wsSameOrigin + url.slice(wsBackend.length);
    }
    return url;
  };

  // 1) Global axios request interceptor (covers default axios + future
  //    instances that don't override interceptors).
  attachRewriteToAxios(axios);

  // 2) window.fetch monkey-patch.
  const origFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    try {
      if (typeof input === 'string') {
        return origFetch(_rewriteFn(input), init);
      }
      if (input && typeof input.url === 'string') {
        const newUrl = _rewriteFn(input.url);
        if (newUrl !== input.url) {
          return origFetch(new Request(newUrl, input), init);
        }
      }
    } catch (_e) { /* swallow — fall through to original */ }
    return origFetch(input, init);
  };

  // 3) window.WebSocket monkey-patch.
  const OrigWS = window.WebSocket;
  if (OrigWS) {
    function PatchedWebSocket(url, protocols) {
      return new OrigWS(_rewriteFn(url), protocols);
    }
    PatchedWebSocket.prototype = OrigWS.prototype;
    // Mirror static fields (CONNECTING/OPEN/CLOSING/CLOSED).
    for (const k of Object.keys(OrigWS)) {
      try { PatchedWebSocket[k] = OrigWS[k]; } catch (_e) { /* readonly */ }
    }
    PatchedWebSocket.CONNECTING = OrigWS.CONNECTING;
    PatchedWebSocket.OPEN = OrigWS.OPEN;
    PatchedWebSocket.CLOSING = OrigWS.CLOSING;
    PatchedWebSocket.CLOSED = OrigWS.CLOSED;
    window.WebSocket = PatchedWebSocket;
  }

  _installed = true;
  // eslint-disable-next-line no-console
  console.log('[homeme] same-origin rewrite ON:', RAW_BACKEND_URL, '→', sameOrigin);
}

// ============================================================
//  API CLIENT
//
//  Optional. When window.NOKJ_API_BASE is set, accounts are checked by the
//  backend and the session is a JWT instead of a localStorage record. Course,
//  homework and grade data is still local: wiring those endpoints is the next
//  step (see README, "Current status"). With no base set every call here is
//  unused and the app behaves exactly as before.
// ============================================================

function apiBase() {
  return String(window.NOKJ_API_BASE || '').replace(/\/+$/, '');
}

function apiEnabled() {
  return apiBase() !== '';
}

function apiToken() {
  try { return localStorage.getItem('nokj-token') || ''; } catch (e) { return ''; }
}

function apiSetToken(token) {
  try {
    if (token) localStorage.setItem('nokj-token', token);
    else localStorage.removeItem('nokj-token');
  } catch (e) { /* storage unavailable */ }
}

// Performs one JSON request. Rejects with an Error carrying `status` and the
// server's message so callers can tell a rejected password from an unreachable
// server.
function apiRequest(path, options) {
  options = options || {};
  var headers = { 'Content-Type': 'application/json' };
  var token = apiToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  if (options.headers) {
    for (var key in options.headers) {
      if (Object.prototype.hasOwnProperty.call(options.headers, key)) headers[key] = options.headers[key];
    }
  }
  return fetch(apiBase() + path, {
    method: options.method || 'GET',
    headers: headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  }).then(function (response) {
    return response.text().then(function (raw) {
      var data = {};
      if (raw) {
        try { data = JSON.parse(raw); } catch (e) { data = {}; }
      }
      if (!response.ok) {
        var error = new Error(data.error || ('Request failed (' + response.status + ')'));
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    });
  });
}

function apiLogin(email, password) {
  return apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email: email, password: password }
  }).then(function (data) {
    apiSetToken(data.token);
    return data.user;
  });
}

function apiRegister(payload) {
  return apiRequest('/api/auth/register', { method: 'POST', body: payload })
    .then(function (data) { return data.user; });
}

function apiMe() {
  return apiRequest('/api/auth/me').then(function (data) { return data.user; });
}

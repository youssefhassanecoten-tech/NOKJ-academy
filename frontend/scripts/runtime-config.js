// Runtime configuration. Loaded before every other script.
//
// A deployment points the app at a backend without touching code, either by
// setting the globals before this file loads or by adding meta tags:
//
//   <meta name="nokj-api-base" content="https://api.example.com">
//   <meta name="nokj-signaling-url" content="wss://api.example.com/ws">
//
// With no api base the app stays in demo mode and keeps everything in
// localStorage, which is how the hosted demo runs.
(function () {
  function meta(name) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? (el.getAttribute('content') || '') : '';
  }
  if (typeof window.NOKJ_API_BASE === 'undefined') {
    window.NOKJ_API_BASE = meta('nokj-api-base');
  }
  if (typeof window.NOKJ_SIGNALING_URL === 'undefined') {
    window.NOKJ_SIGNALING_URL = meta('nokj-signaling-url');
  }
  // With an API base and no explicit signalling URL, assume the hub is served
  // by the same host at /ws. This is what the bundled backend does.
  if (!window.NOKJ_SIGNALING_URL && window.NOKJ_API_BASE) {
    try {
      var url = new URL(window.NOKJ_API_BASE);
      url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
      url.pathname = '/ws';
      url.search = '';
      url.hash = '';
      window.NOKJ_SIGNALING_URL = url.toString();
    } catch (e) { /* leave unset; meetings stay local */ }
  }
})();

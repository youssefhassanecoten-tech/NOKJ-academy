# mobile

Mobile strategy for NOKJ Academy.

The SPA in `frontend/` is already responsive on mobile and tablet, so there is
no separate mobile UI planned. The strategy is to ship it as an installable
PWA (manifest + service worker) and provide a small Capacitor wrapper that
points at the hosted frontend URL.

This avoids rewriting the web UI while still giving users an app-like
experience: install to home screen, standalone window, and native wrapper
when desired.

Prototype deliverables (manifest, service worker, Capacitor config) for this
directory are pending; for now the plan is recorded here.
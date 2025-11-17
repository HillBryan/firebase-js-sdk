---
"@firebase/messaging": minor
"firebase": minor
---

Add an optional `options` object parameter with a `serviceWorkerRegistration` attribute to `deleteToken()` to support explicit worker selection when removing messaging tokens. This maintains full backwards compatibility while expanding the public API surface.


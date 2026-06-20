# SECURITY-003 — Missing HTTP security headers (CSP, anti-clickjacking, MIME-sniff)

- **Reported by:** Security audit
- **Date:** 2026-06-19
- **Status:** Fixed
- **Severity:** Medium (defense-in-depth against XSS / clickjacking / MIME sniffing)

**bug** = The Express app served the site with no security headers. There was no
Content-Security-Policy (so any injected `<script>` would execute with full
privileges), no `X-Frame-Options` (the game could be framed by a malicious site
for clickjacking), no `X-Content-Type-Options` (browser MIME-sniffing), and the
default `X-Powered-By: Express` banner leaked the stack.

**bug reason** = No header middleware was configured; Express ships none of these
by default.

**applied fix** (`server/index.js`): added a small middleware (before the static
handler) that sets:
- `Content-Security-Policy`: `default-src 'self'`; `script-src 'self'` (no inline
  scripts exist, so this blocks injected/inline script execution — the strongest
  XSS mitigation); `style-src 'self' 'unsafe-inline'` (runtime CSSOM tweaks);
  `img-src 'self' data: blob:` (poster JPG + the game-over flag rendered from a
  `blob:` SVG); `connect-src 'self'` (same-origin Socket.IO websocket);
  `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`,
  `form-action 'self'`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
  `Referrer-Policy: no-referrer`, a restrictive `Permissions-Policy`, and removes
  `X-Powered-By`.

**outcome** = Verified the headers are present on responses (`curl -D -`) and that
the CSP does not break the app: the entry gate canvas, the Uncle Sam poster JPG,
ES-module loading, the Socket.IO websocket, and the `blob:`-based game-over flag
all still work in-browser. The strict `script-src 'self'` complements the
existing `escapeHtml`/safe-DOM rendering as defense-in-depth against XSS.

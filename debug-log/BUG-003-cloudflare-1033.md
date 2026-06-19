# BUG-003 — Public link fails with Cloudflare error 1033

- **Reported by:** Jesse (manual test of v1)
- **Date:** 2026-06-19
- **Status:** Fixed

**bug** = Opening the shared public link in Chrome showed Cloudflare
**error 1033 (Argo Tunnel error)** instead of the game; the site could not be
reached by any external user.

**bug reason** = The local game server was healthy (`/health` returned 200), but
the `cloudflared` quick tunnel could not connect to Cloudflare's edge. It
defaults to the **QUIC protocol over UDP (port 7844)**, and this VM blocks
outbound UDP, so every connection attempt failed with
`failed to dial to edge with quic: timeout: no recent network activity`. With no
active connector registered at the edge, Cloudflare served error 1033 to
visitors.

**applied fix** = Restarted the tunnel forcing the HTTP/2 transport (TCP 443,
which is allowed) instead of QUIC:
`cloudflared tunnel --url http://localhost:3000 --protocol http2 --no-autoupdate`.
The tunnel then logged `Registered tunnel connection ... protocol=http2`.

**outcome** = The public URL now serves the game. Verified end-to-end:
`curl https://<sub>.trycloudflare.com/health` returns **200** through the tunnel.
New working link issued to the user. (Note: quick tunnels are ephemeral and tied
to this dev session; a permanent deploy will replace it.)

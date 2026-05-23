# Deployment — Caddy

> **Phase F4.** Written for the live demo deploy. Skip for dev.

Caddy is our reverse proxy + TLS terminator on the production VPS.
Auto-renews Let's Encrypt certs.

## Planned Caddyfile

```caddy
{
    email admin@<domain>
}

niro.<domain> {
    encode gzip zstd
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "geolocation=(self), camera=(self), microphone=()"
    }
    reverse_proxy localhost:3000
}

api.niro.<domain> {
    encode gzip zstd
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        Access-Control-Allow-Origin "https://niro.<domain>"
        Access-Control-Allow-Credentials "true"
        Access-Control-Allow-Methods "GET, POST, PATCH, DELETE, OPTIONS"
        Access-Control-Allow-Headers "Authorization, Content-Type"
    }
    reverse_proxy localhost:8000
}
```

Replace `<domain>` with the resolved name (see [`open-questions.md OQ-4`](../open-questions.md)).

## DNS setup

Before Caddy can provision certs:

1. Set A record `niro.<domain>` → VPS IP.
2. Set A record `api.niro.<domain>` → VPS IP.
3. Wait 1–5 minutes for propagation; verify with `dig`.
4. Restart Caddy: `sudo systemctl restart caddy`.
5. Watch logs: `journalctl -u caddy -f` — first request should
   trigger ACME challenge.

## Things that go wrong

- **Cloudflare proxying:** if you route DNS through Cloudflare proxied
  ("orange cloud"), Let's Encrypt sees Cloudflare's cert, not Caddy's
  attempt. Either disable proxying or switch to DNS-01 challenge.
- **Port 80 blocked:** ACME HTTP-01 requires port 80 open. Check
  firewall.
- **Wrong DNS:** `dig +short niro.<domain>` must return your VPS IP.

## TLS rating

Defaults are good but verify with SSL Labs after deploy.
Target: A+ rating.

## To be added

- [ ] Phase F4: actual Caddyfile (replace `<domain>`)
- [ ] Phase F4: SSL Labs scan result link

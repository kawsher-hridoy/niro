# Demo — Risk Register & Pre-flight

> **Canonical reference:** [`DESIGN.md §14`](../../DESIGN.md#14-risk-register).
> This file is the operational pre-flight checklist run on the morning of
> any demo (Phase E recording day, Phase F dry-runs, Phase G live demo).

## Top 10 risks (from DESIGN.md §14)

| # | Risk | Mitigation |
|---|---|---|
| 1 | Azure model deployment revoked | `AIProvider` abstraction; Anthropic + Gemini keys ready; flip env var |
| 2 | AI hallucinated dosage | Banned-phrase linter; confidence threshold; disclaimer everywhere |
| 3 | Content filter refuses | Probe pre-clears; backup deployment ready |
| 4 | bKash sandbox flaky | Mock with 2s `paid` response is fine for demo |
| 5 | Compounder logs in as doctor | Device binding + biometric (Phase F+) |
| 6 | Network failure mid-demo | Local fallback; hotspot tethered; pre-recorded video on phone |
| 7 | "What if AI is wrong" judge question | Prepped answer (see `live-script.md` Q&A) |
| 8 | BMDC API outage | Cache 24h; Phase-1 entirely mocked |
| 9 | Bangla typography breaks | Self-host Noto Sans Bengali; cross-browser test before demo |
| 10 | Solo dev burnout | Cut Day 3/4 features ruthlessly; mock chamber if behind |

## Pre-flight checklist (run morning of any demo)

### 90 minutes before

- [ ] Eat. Water. Charged laptop.
- [ ] Phone fully charged + hotspot tethering tested.
- [ ] MBBS friend confirmed for live demo (Phase F/G only).

### 60 minutes before

- [ ] Boot demo laptop. Disable notifications, sleep timers, screen savers.
- [ ] Clean dev environment: fresh Postgres (or seeded DB), no test
      garbage.
- [ ] Verify `docker compose up -d postgres` runs.
- [ ] Backend up: `curl localhost:8000/api/v1/health` returns 200.
- [ ] Frontend up: `localhost:3000` loads in <2s.
- [ ] Run `niro/probe.py` against the Azure deployment → 6/6 pass.

### 30 minutes before

- [ ] Walk the entire demo end-to-end **once**.
- [ ] Verify Bangla typography on the demo browser (look at one sample
      paragraph).
- [ ] Check timeline: Rahima has 3 past entries.
- [ ] Verify 6 seeded doctors visible in directory.
- [ ] Network test: `curl -o /dev/null -s -w "%{time_total}\n" https://ai-for-security.services.ai.azure.com/openai/v1/`
      should be < 1s.
- [ ] Open backup tabs:
  - One with the dev environment (`localhost:3000`).
  - One with the prod environment (`https://niro.<domain>`) — Phase G.
  - One with the doctor portal on a second profile.
- [ ] Pre-recorded video on phone, full screen, paused at the title card.

### 15 minutes before

- [ ] Browser zoom set to 110% (helps from the back of the room).
- [ ] Hide bookmarks bar.
- [ ] Run a 30-second smoke test (sign in → upload → see result).
- [ ] If MBBS friend involved: confirm they're standing by, link to
      their screen.

### 5 minutes before

- [ ] Deep breath.
- [ ] If anything broke in the past 30 minutes, switch to the
      pre-recorded fallback.

## Fallback hierarchy

If the live demo fails mid-run:

1. **Network burp:** wait 5 seconds, try again.
2. **AI timeout:** click "request human verification" (which is what we'd
   recommend anyway); show the consent flow instead.
3. **Backend crash:** switch to the prod environment tab.
4. **Both environments down:** pull out the phone, play the pre-recorded
   90-second video.
5. **Everything down:** verbal pitch only, refer to slides.

Never apologize for a fallback in real time. Move on. Judges remember
recovery, not failure.

## Post-demo

- [ ] Log judge questions to `docs/build-log.md`.
- [ ] Any new issues → file as `docs/open-questions.md OQ-NN`.
- [ ] Send thank-you note to MBBS friend (Phase G only).

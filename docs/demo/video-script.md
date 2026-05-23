# Demo — Phase-1 Video Script

> **Canonical reference:** [`DESIGN.md §13`](../../DESIGN.md#13-demo-script)
> for the table version. This file is the shooting plan with timestamps,
> shot list, and voice-over copy.

## Constraints

- **Length:** 90 seconds (ICADHI submission rules) — going over loses points.
- **Format:** screen recording + voice-over.
- **Language:** Bangla voice-over; English captions burned in.
- **Tools:** OBS Studio for recording (Linux); DaVinci Resolve or
  CapCut for editing + captions.

## Shot list

| t | Shot | Action | VO (Bangla) | Caption (English) |
|---|---|---|---|---|
| 0:00 | Title card | Niro logo fades in over a soft Bangla pattern | "নিরো — আপনার স্বাস্থ্য, আপন হাতে।" | "Niro — your health, in your own hands." |
| 0:05 | Patient home | Phone screen, app loads, shows timeline with 3 past entries | "রহিমার পুরো মেডিকেল হিস্ট্রি — সব এক জায়গায়।" | "Rahima's complete medical history — all in one place." |
| 0:12 | Upload action | Tap "Upload Prescription", camera/gallery picker, select prescription image | "নতুন প্রেসক্রিপশন আপলোড করুন।" | "Upload a new prescription." |
| 0:18 | AI processing | Brief loading state | "AI ৩ সেকেন্ডে বুঝিয়ে দিল।" | "AI explains in 3 seconds." |
| 0:21 | Analysis result | Show structured medications + Bangla explanation + red flag chips | (continuing) | (continuing) |
| 0:30 | History cross-ref | Highlight: "আপনি জানুয়ারিতে Metformin-এ ছিলেন; এই নতুন প্রেসক্রিপশনে Glimepiride যোগ হয়েছে — সতর্কতা।" | "শুধু এই প্রেসক্রিপশন না — আপনার পুরো হিস্ট্রি দেখে AI সতর্ক করল।" | "AI doesn't just read this prescription — it cross-references your full history." |
| 0:42 | Request verification | Tap "Request Verification", select Dr. Bijoy, consent dialog with "full history, 24h" | "ডাঃ বিজয়কে যাচাই করতে বলুন। মাত্র ৪০০ টাকায়।" | "Ask Dr. Bijoy to verify — just 400 BDT." |
| 0:55 | Doctor tablet | Cut to doctor's tablet — AI case summary on screen, history timeline below | "ডাক্তার পান AI-তৈরি case summary, ৫ মিনিটে সিদ্ধান্ত।" | "Doctor gets an AI-prepared case summary, reviews in 5 minutes." |
| 1:10 | Access log | Cut back to patient — show access log: "Dr. Bijoy viewed your profile at 2:34 PM" with a revoke button | "প্রতিটি অ্যাক্সেস log হয়। গোপনীয়তা সম্পূর্ণ আপনার হাতে।" | "Every access is logged. Privacy is in your hands." |
| 1:20 | Closing card | Niro logo + tagline + "AI-Driven Telemedicine · IEEE ICADHI 2026 · Track 1" | "নিরো — বাংলাদেশের প্রথম রোগী-নিয়ন্ত্রিত মেডিকেল রেকর্ড।" | "Niro — Bangladesh's first patient-owned medical record." |
| 1:30 | End | Fade to black | — | — |

## Pre-shoot checklist

- [ ] Clean dev env: fresh DB, no test data lingering.
- [ ] Seed 3 past timeline entries for "Rahima" patient: an Rx from
      January (Metformin) + a lab report + a previous doctor review.
- [ ] Seed 6 doctor profiles. Pick "Dr. Bijoy" (Tier 2, Tk 400).
- [ ] Verify Bangla typography on Chrome at the recording resolution.
- [ ] Increase font size to 18px+ for video legibility.
- [ ] Disable browser notifications.
- [ ] Plug in keyboard + mouse (no laptop trackpad fumbling).
- [ ] Test voice-over recording mic levels.

## Recording

1. OBS scene: full-screen window capture of `localhost:3000` at 1920×1080.
2. Record at 60fps to allow slow-mo zooms in post if needed.
3. Two passes:
   - **Pass 1: silent walkthrough.** Drive the app per the shot list.
   - **Pass 2: voice-over.** Record Bangla VO over the silent video.
4. Add English captions in DaVinci Resolve.
5. Export at 1080p, MP4 H.264, ~10 MB target.

## Post

- [ ] Captions burned in (not as a separate sidecar — judges may not enable them).
- [ ] Voice-over levels normalized to -14 LUFS.
- [ ] Light background music optional but distracting; default to silence.
- [ ] Title and closing cards at 4s and 10s respectively.

## Failure modes

| Risk | Mitigation |
|---|---|
| Live AI call times out during recording | Pre-record the analysis result; use a screenshot animation |
| Bangla shows wrong glyphs | Verify on Chrome before recording (see `frontend/bangla-typography.md` test matrix) |
| Recording too long | Cut the access-log shot first; it's the most expendable |
| VO sounds robotic | Re-record; expressiveness > studio quality |

## To be filled in Phase E (recording day)

- [ ] Final video file location: `niro/submissions/phase-1.mp4`
- [ ] Submission timestamp + confirmation screenshot

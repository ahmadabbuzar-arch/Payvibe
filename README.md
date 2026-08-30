# PayVibe

**UPI, but not boring.**

A premium, fun UPI payment companion built as a static web app (HTML/CSS/vanilla JS), designed to be wrapped into an Android APK with a WebView/Web-to-APK converter.

## What this is

PayVibe is a **front-end UPI launcher**. It builds standard `upi://pay?...` deep links and hands off to whichever UPI apps are installed on the device. It is **not a UPI network member, not a bank, and does not process payments itself** — the operating system and the user's chosen UPI app own the actual money movement.

## What this is not

- Not a real payment processor. No money is moved by this code.
- Not a source of guaranteed payment confirmation. A WebView cannot reliably know whether a UPI app payment succeeded — the app only knows whether it *launched* the UPI intent. The UI always says "Payment initiated. Please verify the transaction in your UPI app." rather than falsely claiming success.
- Not a credit, risk, or financial score. The "Payment Vibe" percentage on the home screen is entertainment copy only, and is explicitly labeled as such in the UI.

## Project structure

```
PayVibe/
├── index.html          All screens (single-page shell, no build step)
├── styles.css           Design system + all screen styles
├── app.js                Navigation, UPI service, sound manager, QR scanner,
│                          storage, copy engine, history, demo mode
├── manifest.json         PWA metadata (optional, safe no-op in APK builds)
├── service-worker.js     Optional offline shell caching (skipped on file://)
└── assets/
    ├── logo/payvibe-logo.svg
    ├── icons/*.svg        16 line icons (also inlined as <symbol> in index.html
    │                      for reliability inside WebView/file:// contexts)
    └── sounds/             50 payment sound effects (funny_payment_01–50.mp3),
                             sourced from your uploaded ZIP, untouched
```

## Modules (all in `app.js`)

- **Storage** — thin localStorage wrapper. Never stores UPI PIN, OTP, card PIN, or banking passwords — those fields don't exist anywhere in this app.
- **Copy** — the Roman Hinglish (no Devanagari) micro-copy engine, driven by the selected Personality (Funny / Savage / Deadpan / Gamer / Attitude) and by the Fun Mode toggle.
- **SoundManager** — `playSound`, `playRandomSound`, `stopSound`, `setDefaultSound`, `setSoundEnabled`, `previewSound`. Guarantees only one of the 50 sounds plays at a time.
- **UpiService** — validates UPI IDs and amounts, builds the `upi://pay` URI, and attempts the handoff. Comments in the code explain exactly why success can't be verified client-side.
- **QrScanner** — layered fallback chain: native `BarcodeDetector` on the live camera feed first; if that's unavailable but the camera works, an **upload-a-QR-image** button reuses the same detector against the uploaded file; if `BarcodeDetector` isn't supported at all, a **manual paste field** (UPI link or bare UPI ID) keeps the payment flow usable end-to-end instead of dead-ending.
- **History** — local transaction log with search/filter, clearly separated from the always-demo home-screen "Recent Vibes" sample data.

## Sound files

All 50 files from your ZIP were extracted and copied in unchanged (same bytes, same order — `funny_payment_01.mp3` through `funny_payment_50.mp3`) into `assets/sounds/`. They're split evenly across four categories (Funny / Savage / Desi / Attitude) inside the Sounds screen so they're browsable; nothing about the audio itself was modified.

## Packaging into an APK

This is a static site — no build step, no server-side code, no external CDN dependencies. Point any WebView/Web-to-APK wrapper (e.g. a Capacitor/Cordova/Median-style tool) at this folder's `index.html` as the entry point and it should run as-is. A few things were done specifically for that:

- All JS is vanilla, all assets are local, no `localStorage`-incompatible APIs are assumed.
- Icons are inlined as SVG `<symbol>` defs in `index.html` (not fetched at runtime) so they render even under `file://`.
- Horizontal scroll is disabled, touch targets are ≥48px, and the layout is tested down to a 360px viewport.
- The QR scanner degrades gracefully with no camera access.
- The service worker registration is skipped automatically outside `http(s)://` contexts.

## Before going live

Swap `UpiService.attemptPayment` and `QrScanner` to whatever authorized payment/QR SDK you're licensed to use for production UPI traffic — the current implementation is a thin, honest wrapper around the OS-level UPI intent, intentionally kept modular so a real payment provider can be dropped in later without touching the UI layer.

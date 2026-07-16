# Changelog

All notable changes to `@pinecall/ionic` are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.2.0] — unreleased

> Committed but **not yet on npm** (the registry's latest is 0.1.0). Push the
> `v0.2.0` tag to publish it.

### Added — Android: native calls via self-managed ConnectionService

- New `android/` Capacitor plugin: shared `io.pinecall.call.*` (byte-identical
  to `@pinecall/react-native`'s — WebRTC via `io.github.webrtc-sdk:android`,
  the Pinecall protocol, and self-managed Telecom) plus `PinecallCallPlugin`
  (`@CapacitorPlugin`).
- Manifest merges `MANAGE_OWN_CALLS` / `RECORD_AUDIO` and the
  `ConnectionService`; `build.gradle` pulls WebRTC.
- On Android the app draws the call UI (`CallOverlay`) while the system handles
  audio routing and focus. API 26+; emulator/web falls back to `@pinecall/web`.

> The shared Kotlin was verified compiling in the react-native repo, but this
> plugin is **untested on a physical Android device**.

## [0.1.0] — 2026-06-24

First published release: native AI voice calls on iOS via CallKit + WebRTC,
packaged as a Capacitor plugin.

### Added

- **Capacitor plugin** (root) — `PinecallIonic.podspec` (brings in WebRTC-SDK
  transitively), `Package.swift`, and `ios/Sources/PinecallCallPlugin/`
  uniting `CXProvider` (ring / answer / end / mute) with native WebRTC over
  Pinecall's standard protocol (token → `/webrtc/offer` → DataChannel).
- **Headless core** — `src/client.ts`'s `CallClient`: one API with a
  per-platform strategy (iOS device → the native plugin; web/simulator →
  `@pinecall/web`'s `VoiceSession`), plus `isNativeCallSupported` for
  resolution.
- **Call direction** — `startCall({ direction: "outgoing" })` uses
  `CXStartCallAction` for the native outgoing-call UI (no ring) and reports
  `startedConnecting` / `connected`; `"incoming"` keeps the `CXProvider` ring
  path. Audio/WebRTC setup is shared between the answer and start actions.
- **Example app** (`examples/app`) — agent list, two buttons per agent
  (📞 you call · 🔔 agent rings you), and an in-call overlay with a live
  transcript.
- `docs/background-calls-pushkit.md` — reference implementation for ringing a
  backgrounded app via PushKit.
- MIT LICENSE.

Verified end-to-end on a real iPhone: tap an agent → native CallKit ring →
answer → native WebRTC conversation with a Pinecall agent (Deepgram Flux STT,
`gpt-5-chat-latest`, ElevenLabs TTS), with speaker/mute/hangup driven from the
native call UI.

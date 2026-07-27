# Changelog

All notable changes to `@pinecall/ionic` are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [0.2.1] — 2026-07-27

### Fixed — duplicate user bubbles in the native transcript

- `CallClient.upsertUser` appended a second bubble for the same utterance on
  physical devices. Deepgram Flux fires **multiple `user.message` finals per
  turn**, and the old "find the last interim message" check only matched the
  first one — every extra final appended a duplicate. A `bot.word` arriving
  before the final made it worse: the bot message became the last entry, so the
  final never found the interim to replace.
- The web/simulator strategy never showed this, which is why it went unnoticed:
  there `CallClient` delegates the transcript to `@pinecall/web`'s
  `VoiceSession`, whose `mergeUserTurn` already carries the fix. The native
  DataChannel path was a copy of the pre-fix logic.
- Ported `mergeUserTurn` verbatim: replace the **last user message while no bot
  reply follows it**; a new user bubble starts only after a bot reply. Both
  strategies now behave identically.
- Message ids were `messages.length + 1`, but an upsert replaces without growing
  the array, so two different messages could share an id — enough to collapse or
  duplicate rows in any consumer using the id as a React `key`. Replaced with a
  monotonic counter that resets with the call.

Reported from a real iPhone by the Axion app.

## [0.2.0] — 2026-07-16

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

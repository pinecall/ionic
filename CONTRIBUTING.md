# Contributing

Contributions are welcome, whatever the size.

## Project layout

This repo is the Capacitor plugin itself, plus a demo app:

- **`src/`** — the headless TypeScript core (`CallClient`, the React hook, and
  the platform strategy that picks native vs `@pinecall/web`).
- **`ios/Sources/PinecallCallPlugin/`** — the native iOS plugin: CallKit
  (`CXProvider`) + WebRTC.framework.
- **`android/src/main/java/io/pinecall/call/`** — the native Android plugin:
  self-managed Telecom `ConnectionService` + WebRTC. This code is shared,
  byte-for-byte, with [`@pinecall/react-native`](https://github.com/pinecall/react-native)
  — **fix bugs in both repos, or neither.**
- **`examples/app/`** — the demo Ionic app + a dev token server.

## Development workflow

```sh
npm install
npm run build     # tsc → dist/
npm run watch     # tsc --watch while you work
```

To exercise a change you need the example app, since the interesting parts only
exist on a device:

```sh
cd examples/app/server && cp .env.example .env   # add your PINECALL_API_KEY
npm install && npm start                         # agent + token server on :8787

cd .. && npm install
VITE_SERVER_BASE=http://<your-mac-LAN-ip>:8787 npm run build
npx cap run ios                                  # a REAL device — see below
```

The example app depends on the plugin from the repo root, so your `src/` changes
land in it after a `npm run build` + `npx cap sync`. Native changes need a
rebuild from Xcode / Android Studio (`examples/app/ios` / `examples/app/android`).

## Testing native changes needs real hardware

This is the one rule that bites everyone:

- **CallKit does not exist on the iOS simulator.** The simulator silently takes
  the `@pinecall/web` fallback path, so a simulator run proves nothing about the
  native call path.
- **The Android emulator falls back the same way.** Self-managed Telecom needs a
  physical device on API 26+.

So any change to CallKit/Telecom, the audio session (`RTCAudioSession` +
`provider(didActivate:)`), or the WebRTC setup must be verified on a real phone
before it ships. The audio-session handoff is precisely the thing that cannot be
reproduced anywhere else.

## Sending a pull request

- Prefer small pull requests focused on one change.
- Make sure `npm run build` is clean — CI runs it on every PR.
- Say **which device and OS version** you tested on for native changes.
- If the change touches `android/`, mirror it in `@pinecall/react-native`.
- For changes to the public API, open an issue to discuss it first.

# @pinecall/ionic

**Native WhatsApp-style AI voice calls for Ionic / Capacitor apps.**

Your users get a real phone call — native CallKit ring, the iOS in-call screen,
lock-screen controls, earpiece/speaker routing — and on the other end is a
[Pinecall](https://pinecall.io) AI agent. You keep full control of the in-app
UI: the core is headless, the live transcript is plain data, render it with
whatever components you like.

```
tap "call" ──▶ CallKit rings (native UI)
       answer ──▶ native WebRTC audio ⇄ voice.pinecall.io ⇄ your agent
                  DataChannel events ──▶ live transcript in YOUR components
```

## Why a native plugin?

WebView-based WebRTC (`@pinecall/web`) works great in browsers — but during a
CallKit call, **iOS hands the audio session to the CXCall**, and a WKWebView's
audio can never join it (mic captures silence, remote audio is muted). This
plugin runs WebRTC **natively** (WebRTC.framework) and starts its audio units
exactly when CallKit activates the session (`provider(didActivate:)` →
`RTCAudioSession`). That's the same architecture WhatsApp uses.

On the web and the iOS **simulator** (where CallKit doesn't work), the same
API transparently falls back to `@pinecall/web` — one codebase, every target.

## Install

```bash
npm install @pinecall/ionic
npx cap sync ios
```

Add to `ios/App/App/Info.plist`:

```xml
<key>NSMicrophoneUsageDescription</key>
<string>Microphone access is needed to talk to the agent.</string>
<key>UIBackgroundModes</key>
<array>
  <string>audio</string>
  <string>voip</string>
</array>
```

## Backend: mint call tokens

The plugin never sees your Pinecall API key. Your backend runs the agent and
exposes a token endpoint ([full example](examples/app/server/index.mjs)):

```js
import { Pinecall } from "@pinecall/sdk";

const pc = new Pinecall(); // PINECALL_API_KEY from env
const agent = pc.agent("assistant", {
  prompt: "You are a friendly voice assistant.",
  llm: "openai/gpt-5-chat-latest",
  voice: "elevenlabs/sarah",
  stt: "deepgram/flux",
  greeting: "Hey there! How can I help you today?",
});

app.get("/api/token", async (_req, res) => {
  const t = await agent.createToken("webrtc"); // 60s, single-use
  res.json({ token: t.token, server: t.server, expires_in: t.expiresIn });
});
```

## Use — React

```tsx
import { CallClient } from "@pinecall/ionic";
import { useCallClient } from "@pinecall/ionic/react";

const client = new CallClient(); // one shared instance

function CallScreen() {
  const call = useCallClient(client);

  if (call.status === "idle") {
    return (
      <button
        onClick={() =>
          call.startCall({
            agentId: "assistant",
            callerName: "Assistant",
            handle: "AI voice agent",
            tokenUrl: "https://your-backend.com/api/token",
          })
        }
      >
        📞 Call the agent
      </button>
    );
  }

  // Your UI, your components — the transcript is plain data:
  return (
    <div>
      <p>{call.status} · {call.phase} · {call.duration}s</p>
      {call.messages.map((m) => (
        <p key={m.id}>{m.role === "bot" ? "🤖" : "🗣"} {m.text}</p>
      ))}
      <button onClick={call.toggleSpeaker}>🔊</button>
      <button onClick={call.toggleMute}>🎙</button>
      <button onClick={call.endCall}>End</button>
    </div>
  );
}
```

> During the native ring, CallKit owns the screen — render your in-call UI
> when `status` is `connecting`/`connected` (see the example app's
> [Home.tsx](examples/app/src/pages/Home.tsx)).

### Any other framework

`CallClient` is a plain subscribable store — no React required:

```ts
const client = new CallClient();
client.subscribe(() => render(client.getState()));
```

## API

### `CallClient` (headless core)

| Member | Description |
|---|---|
| `startCall(opts)` | Ring natively (device) or connect directly (web/simulator). `opts: { agentId, callerName, handle?, tokenUrl, config? }` |
| `endCall()` | Hang up (also syncs the native call UI). |
| `toggleMute()` | Mic on/off (native mute button also works). |
| `toggleSpeaker()` | Loudspeaker ↔ earpiece (device only; earpiece is the default). |
| `getState()` / `subscribe(cb)` | Reactive store: `{ status, phase, agentId, isMuted, isSpeaker, duration, messages, error }` |

`messages: TranscriptMessage[]` — `{ id, role: 'user' | 'bot', text, isInterim? }`,
updated live word-by-word while the agent speaks.

### `useCallClient(client?)` — `@pinecall/ionic/react`

React hook returning the state plus the actions. Pass a shared `CallClient` so
non-React code (push handlers, SSE listeners) can start calls on the same
instance.

### `PinecallCall` (raw plugin)

The low-level Capacitor plugin (`startCall`/`endCall`/`setMuted`/`setSpeaker` +
`state`/`serverEvent` listeners) for advanced integrations.

## Example app

[`examples/app`](examples/app) — agent address book, native calls, custom
in-call overlay with live transcript, plus a dev backend (`server/`) with the
token endpoint and an SSE "the agent calls you" trigger:

```bash
cd examples/app/server && cp .env.example .env  # add PINECALL_API_KEY
npm install && npm start                        # agent + token server on :8787

cd .. && npm install
VITE_SERVER_BASE=http://<your-mac-LAN-ip>:8787 npm run build
npx cap run ios   # real device — CallKit doesn't work on the simulator
```

## Platform support

| Target | Call UI | Audio | Status |
|---|---|---|---|
| iOS device | CallKit (native) | WebRTC.framework (native) | ✅ |
| iOS simulator | in-app (yours) | webview WebRTC | ✅ (CallKit unsupported by the simulator) |
| Web | in-app (yours) | webview WebRTC | ✅ |
| Android | ConnectionService | native WebRTC | 🔜 roadmap |

## Roadmap

- Android (ConnectionService + native WebRTC)
- True outgoing-call UX (`CXStartCallAction` instead of self-incoming ring)
- PushKit/VoIP push — ring a killed app when the agent calls you
- Mid-call `configure()` (hot-swap voice/language) and sealed token metadata
- Reconnection / ICE restarts, bluetooth route picker, CallKit icon
- `@pinecall/react-native` with the same architecture

## License

MIT

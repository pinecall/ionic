import type { PluginListenerHandle } from '@capacitor/core';

// ── Transcript ───────────────────────────────────────────────────────────────

export interface TranscriptMessage {
  id: number;
  role: 'user' | 'bot';
  text: string;
  /** User message still being spoken (interim STT). */
  isInterim?: boolean;
  /** Server-assigned id for word-by-word bot updates. */
  messageId?: string;
}

// ── Call state (headless store shape) ────────────────────────────────────────

export type CallStatus =
  | 'idle'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'error';

export type CallPhase = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface CallState {
  status: CallStatus;
  phase: CallPhase;
  /** Your app-level id of who is being called (echo of startCall). */
  agentId: string | null;
  isMuted: boolean;
  /** Loudspeaker on. Native only — earpiece is the default, like WhatsApp. */
  isSpeaker: boolean;
  duration: number;
  messages: TranscriptMessage[];
  error: string | null;
}

// ── startCall options ────────────────────────────────────────────────────────

export interface StartCallOptions {
  /** Pinecall agent id to talk to. */
  agentId: string;
  /** Name shown in the native call UI. */
  callerName: string;
  /** Secondary line in the native call UI (e.g. "AI voice agent"). */
  handle?: string;
  /**
   * `'outgoing'` (default) — the user dials the agent: native outgoing-call
   * UI, connects immediately. `'incoming'` — the agent calls the user:
   * native ring, connects on answer. Ringing a killed/backgrounded app
   * requires PushKit (paid Apple Developer account) — on the roadmap.
   */
  direction?: 'outgoing' | 'incoming';
  /**
   * Your backend endpoint returning `{ token, server }` — mint it with
   * `agent.createToken("webrtc")`. The plugin fetches it directly (native)
   * or via fetch (web). Your Pinecall API key never reaches the client.
   */
  tokenUrl: string;
  /**
   * Session config overrides for the web strategy (voice, stt, language…).
   * Ignored on native for now.
   */
  config?: Record<string, unknown>;
}

// ── Raw native plugin surface (advanced users) ───────────────────────────────

export type NativeCallState =
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'declined'
  | 'error';

export interface PinecallCallPlugin {
  /** True on a physical iOS device (CallKit + native WebRTC available). */
  isNativeCallSupported(): Promise<{ supported: boolean }>;
  /** Ring (incoming) or dial (outgoing) natively; the plugin owns WebRTC. */
  startCall(options: {
    callId: string;
    callerName: string;
    handle?: string;
    tokenUrl: string;
    direction?: 'outgoing' | 'incoming';
  }): Promise<void>;
  endCall(): Promise<void>;
  setMuted(options: { muted: boolean }): Promise<void>;
  /** Route audio to loudspeaker (on: true) or earpiece (on: false). */
  setSpeaker(options: { on: boolean }): Promise<void>;
  addListener(
    event: 'state',
    cb: (data: { state: NativeCallState; reason?: string }) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    event: 'serverEvent',
    cb: (data: { data: string }) => void,
  ): Promise<PluginListenerHandle>;
}

import { Capacitor } from '@capacitor/core';
import { VoiceSession } from '@pinecall/web/core';
import type {
  SessionStatus,
  CallPhase,
  TranscriptMessage,
} from '@pinecall/web/core';
import type { AgentContact } from '../data/agents';
import { TOKEN_ENDPOINT } from '../config';
import { PinecallCall, type NativeCallState } from './nativeCall';

/**
 * CallManager — single source of truth for an AI voice call.
 *
 * Two strategies behind ONE state/API (Strategy pattern):
 *
 *  - **iOS device** → the in-app native plugin (PinecallCall): CallKit owns
 *    the call UI AND WebRTC.framework owns the audio, coordinated through
 *    CallKit's didActivate. Fully native, WhatsApp-style. The webview only
 *    renders the agent list + live transcript (from `serverEvent`s).
 *  - **Browser / iOS simulator** → @pinecall/web VoiceSession (webview
 *    WebRTC) with the in-app overlay. CallKit doesn't work on the simulator
 *    (callservicesd kills the call, verified) and webview audio can't join a
 *    CXCall's audio session — hence the split.
 */

export interface CallState {
  status: SessionStatus | 'ringing';
  phase: CallPhase;
  agent: AgentContact | null;
  isMuted: boolean;
  /** Loudspeaker on (native only — earpiece is the default, like WhatsApp). */
  isSpeaker: boolean;
  messages: TranscriptMessage[];
  duration: number;
}

type Listener = () => void;

const isNative = Capacitor.isNativePlatform();

/** CallKit + native WebRTC only work on REAL devices (not the simulator). */
async function resolveUseNative(): Promise<boolean> {
  if (!isNative) return false;
  const { Device } = await import('@capacitor/device');
  const info = await Device.getInfo();
  return !info.isVirtual;
}

class CallManager {
  private session: VoiceSession | null = null; // web/simulator strategy
  private agent: AgentContact | null = null;
  private listeners = new Set<Listener>();
  private useNative = false;
  private nativeWired = false;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private botWords: Record<string, string[]> = {};

  private state: CallState = {
    status: 'idle',
    phase: 'idle',
    agent: null,
    isMuted: false,
    isSpeaker: false,
    messages: [],
    duration: 0,
  };

  // ---- reactive store (React useSyncExternalStore) --------------------------

  getState = (): CallState => this.state;

  subscribe = (cb: Listener): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  private set(patch: Partial<CallState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  // ---- public API -----------------------------------------------------------

  /** Place a call to an AI agent. Arrow-bound so it survives destructuring. */
  startCall = async (agent: AgentContact): Promise<void> => {
    this.reset();
    this.useNative = await resolveUseNative();
    console.log(`[CM] startCall(${agent.id}) — native=${this.useNative}`);

    this.agent = agent;
    this.set({ agent, status: this.useNative ? 'ringing' : 'connecting', messages: [] });

    if (this.useNative) {
      await this.ensureNativeWired();
      await PinecallCall.startCall({
        callId: `pc-${agent.id}-${Math.floor(performance.now()).toString(36)}`,
        callerName: agent.name,
        handle: agent.tagline,
        tokenUrl: `${TOKEN_ENDPOINT}?agent=${encodeURIComponent(agent.id)}`,
      });
    } else {
      this.session = new VoiceSession({
        agent: agent.id,
        config: agent.config,
        tokenProvider: () =>
          fetch(`${TOKEN_ENDPOINT}?agent=${encodeURIComponent(agent.id)}`).then((r) => {
            if (!r.ok) throw new Error(`token endpoint ${r.status}`);
            return r.json();
          }),
      });
      this.wireSession(this.session);
      try {
        await this.session.connect();
      } catch (err) {
        console.error('[CM] connect failed', err);
        this.reset();
      }
    }
  };

  /** Hang up from the in-app UI. */
  endCall = async (): Promise<void> => {
    if (this.useNative) {
      await PinecallCall.endCall(); // 'state: ended' event runs reset()
    } else {
      this.reset();
    }
  };

  toggleMute(): void {
    const muted = !this.state.isMuted;
    if (this.useNative) {
      PinecallCall.setMuted({ muted });
      this.set({ isMuted: muted });
    } else if (this.session) {
      this.session.setMuted(muted);
      this.set({ isMuted: this.session.getState().isMuted });
    }
  }

  /** Loudspeaker ↔ earpiece (native device only; no-op on web/simulator). */
  toggleSpeaker(): void {
    if (!this.useNative) return;
    const on = !this.state.isSpeaker;
    PinecallCall.setSpeaker({ on });
    this.set({ isSpeaker: on });
  }

  // ---- native strategy: plugin events ---------------------------------------

  private async ensureNativeWired() {
    if (this.nativeWired) return;
    this.nativeWired = true;

    await PinecallCall.addListener('state', ({ state, reason }) => {
      console.log(`[CM] native state=${state}${reason ? ` (${reason})` : ''}`);
      this.onNativeState(state);
    });

    await PinecallCall.addListener('serverEvent', ({ data }) => {
      try {
        this.onServerEvent(JSON.parse(data));
      } catch {
        /* non-JSON frame — ignore */
      }
    });
  }

  private onNativeState(state: NativeCallState) {
    switch (state) {
      case 'ringing':
        this.set({ status: 'ringing' });
        break;
      case 'connecting':
        this.set({ status: 'connecting' });
        break;
      case 'connected': {
        this.set({ status: 'connected', phase: 'listening', duration: 0 });
        const startedAt = performance.now();
        this.durationTimer = setInterval(() => {
          this.set({ duration: Math.floor((performance.now() - startedAt) / 1000) });
        }, 1000);
        break;
      }
      case 'ended':
      case 'declined':
      case 'error':
        this.reset();
        break;
    }
  }

  /** Map Pinecall DataChannel events → transcript (same wire as VoiceSession). */
  private onServerEvent(d: Record<string, any>) {
    switch (d.event) {
      case 'user.speaking':
        if (d.text) this.upsertUser(d.text, true);
        this.set({ phase: 'listening' });
        break;
      case 'user.message':
        if (d.text) this.upsertUser(d.text, false);
        this.set({ phase: 'thinking' });
        break;
      case 'bot.word': {
        if (!d.message_id || !d.word) break;
        const words = (this.botWords[d.message_id] ??= []);
        words[d.word_index ?? words.length] = d.word;
        this.upsertBot(d.message_id, words.filter(Boolean).join(' '));
        this.set({ phase: 'speaking' });
        break;
      }
      case 'bot.finished':
        if (d.message_id && d.text) this.upsertBot(d.message_id, d.text);
        this.set({ phase: 'listening' });
        break;
    }
  }

  private upsertUser(text: string, isInterim: boolean) {
    const msgs = this.state.messages;
    const last = msgs[msgs.length - 1];
    if (last?.role === 'user' && last.isInterim) {
      this.set({ messages: [...msgs.slice(0, -1), { ...last, text, isInterim }] });
    } else {
      this.set({ messages: [...msgs, { id: msgs.length + 1, role: 'user', text, isInterim }] });
    }
  }

  private upsertBot(messageId: string, text: string) {
    const msgs = this.state.messages;
    const idx = msgs.findIndex((m) => m.messageId === messageId);
    if (idx >= 0) {
      this.set({ messages: msgs.map((m, i) => (i === idx ? { ...m, text } : m)) });
    } else {
      this.set({ messages: [...msgs, { id: msgs.length + 1, role: 'bot', text, messageId }] });
    }
  }

  // ---- web/simulator strategy ------------------------------------------------

  private wireSession(session: VoiceSession) {
    session.subscribe(() => {
      const s = session.getState();
      this.set({
        status: s.status,
        phase: s.phase,
        isMuted: s.isMuted,
        messages: s.messages,
        duration: s.duration,
      });
    });
  }

  // ---- teardown ---------------------------------------------------------------

  private reset() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    this.session?.destroy();
    this.session = null;
    this.agent = null;
    this.botWords = {};
    this.set({
      status: 'idle',
      phase: 'idle',
      agent: null,
      isMuted: false,
      isSpeaker: false,
      duration: 0,
    });
  }
}

export const callManager = new CallManager();

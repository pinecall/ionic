import { VoiceSession } from '@pinecall/web/core';
import { PinecallCall } from './plugin';
import type {
  CallState,
  NativeCallState,
  StartCallOptions,
  TranscriptMessage,
} from './definitions';

const INITIAL_STATE: CallState = {
  status: 'idle',
  phase: 'idle',
  agentId: null,
  isMuted: false,
  isSpeaker: false,
  duration: 0,
  messages: [],
  error: null,
};

type Listener = () => void;

/**
 * CallClient — headless call store. Framework-agnostic: subscribe to state
 * changes and render ANY UI you want (the transcript is plain data).
 *
 * Strategy per platform, one API:
 *  - iOS device → native plugin: CallKit UI + WebRTC.framework audio,
 *    coordinated through CallKit's audio-session activation.
 *  - Browser / iOS simulator → @pinecall/web VoiceSession (webview WebRTC);
 *    render your own in-call UI from this state.
 *
 * React: pair with `useCallClient` from `@pinecall/ionic/react`.
 */
export class CallClient {
  private state: CallState = { ...INITIAL_STATE };
  private listeners = new Set<Listener>();
  private session: VoiceSession | null = null; // web strategy
  private useNative = false;
  private nativeWired = false;
  private durationTimer: ReturnType<typeof setInterval> | null = null;
  private botWords: Record<string, string[]> = {};
  /**
   * Ids monótonos. NO se puede usar `messages.length + 1`: un upsert reemplaza sin
   * hacer crecer el array, así que dos mensajes distintos terminan con el mismo id y
   * un `key={m.id}` en React los colapsa o los duplica.
   */
  private nextId = 1;

  // ── reactive store (plugs into useSyncExternalStore, Vue refs, etc.) ──────

  getState = (): Readonly<CallState> => this.state;

  subscribe = (cb: Listener): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  private set(patch: Partial<CallState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((l) => l());
  }

  // ── public API ─────────────────────────────────────────────────────────────

  startCall = async (opts: StartCallOptions): Promise<void> => {
    this.reset();
    this.useNative = (await PinecallCall.isNativeCallSupported()).supported;
    const direction = opts.direction ?? 'outgoing';

    this.set({
      agentId: opts.agentId,
      status: this.useNative && direction === 'incoming' ? 'ringing' : 'connecting',
      messages: [],
      error: null,
    });

    if (this.useNative) {
      await this.ensureNativeWired();
      await PinecallCall.startCall({
        callId: `pc-${opts.agentId}-${Math.floor(performance.now()).toString(36)}`,
        callerName: opts.callerName,
        handle: opts.handle,
        tokenUrl: opts.tokenUrl,
        direction,
      });
    } else {
      this.session = new VoiceSession({
        agent: opts.agentId,
        config: opts.config,
        tokenProvider: () =>
          fetch(opts.tokenUrl).then((r) => {
            if (!r.ok) throw new Error(`token endpoint ${r.status}`);
            return r.json();
          }),
      });
      this.wireSession(this.session);
      try {
        await this.session.connect();
      } catch (err) {
        this.set({ error: err instanceof Error ? err.message : String(err) });
        this.reset();
      }
    }
  };

  endCall = async (): Promise<void> => {
    if (this.useNative) {
      await PinecallCall.endCall(); // 'ended' state event runs reset()
    } else {
      this.reset();
    }
  };

  toggleMute = (): void => {
    const muted = !this.state.isMuted;
    if (this.useNative) {
      void PinecallCall.setMuted({ muted });
      this.set({ isMuted: muted });
    } else if (this.session) {
      this.session.setMuted(muted);
      this.set({ isMuted: this.session.getState().isMuted });
    }
  };

  /** Loudspeaker ↔ earpiece. No-op in browsers. */
  toggleSpeaker = (): void => {
    if (!this.useNative) return;
    const on = !this.state.isSpeaker;
    void PinecallCall.setSpeaker({ on });
    this.set({ isSpeaker: on });
  };

  // ── native strategy ────────────────────────────────────────────────────────

  private async ensureNativeWired() {
    if (this.nativeWired) return;
    this.nativeWired = true;

    await PinecallCall.addListener('state', ({ state, reason }) => {
      this.onNativeState(state, reason);
    });
    await PinecallCall.addListener('serverEvent', ({ data }) => {
      try {
        this.onServerEvent(JSON.parse(data));
      } catch {
        /* non-JSON frame */
      }
    });
  }

  private onNativeState(state: NativeCallState, reason?: string) {
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
      case 'error':
        this.set({ error: reason ?? 'call failed' });
        this.reset();
        break;
      case 'ended':
      case 'declined':
        this.reset();
        break;
    }
  }

  /** Pinecall DataChannel events → transcript (same wire as VoiceSession). */
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

  /**
   * La transcripción del usuario: la parcial (STT interino) se va reemplazando hasta que
   * llega la final.
   *
   * Se busca el ÚLTIMO mensaje de usuario que siga interino, esté donde esté — no sólo el
   * último del array. Si el bot empieza a hablar antes de que la STT cierre la frase (barge-in,
   * o simplemente que `bot.word` gane la carrera a `user.message`), el mensaje del bot queda
   * último; mirando sólo esa posición, la final del usuario se AGREGABA en vez de reemplazar la
   * parcial, y la frase aparecía DOS VECES en pantalla.
   */
  private upsertUser(text: string, isInterim: boolean) {
    const msgs = this.state.messages;
    let idx = -1;
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'user' && msgs[i].isInterim) {
        idx = i;
        break;
      }
      // Otra final del usuario más atrás cierra la búsqueda: pertenece a otro turno.
      if (msgs[i].role === 'user') break;
    }
    if (idx >= 0) {
      const next = [...msgs];
      next[idx] = { ...next[idx], text, isInterim };
      this.set({ messages: next });
    } else {
      this.set({
        messages: [...msgs, { id: this.nextId++, role: 'user', text, isInterim }],
      });
    }
  }

  private upsertBot(messageId: string, text: string) {
    const msgs = this.state.messages;
    const idx = msgs.findIndex((m) => m.messageId === messageId);
    if (idx >= 0) {
      this.set({ messages: msgs.map((m, i) => (i === idx ? { ...m, text } : m)) });
    } else {
      this.set({
        messages: [...msgs, { id: this.nextId++, role: 'bot', text, messageId }],
      });
    }
  }

  // ── web strategy ───────────────────────────────────────────────────────────

  private wireSession(session: VoiceSession) {
    session.subscribe(() => {
      const s = session.getState();
      this.set({
        status: s.status === 'error' ? 'error' : s.status,
        phase: (s.phase === 'pause' ? 'listening' : s.phase) as CallState['phase'],
        isMuted: s.isMuted,
        messages: s.messages.filter(
          (m): m is TranscriptMessage & { role: 'user' | 'bot' } => m.role !== 'system',
        ),
        duration: s.duration,
        error: s.error,
      });
    });
  }

  // ── teardown ───────────────────────────────────────────────────────────────

  private reset() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
    this.session?.destroy();
    this.session = null;
    this.botWords = {};
    this.nextId = 1;
    this.set({ ...INITIAL_STATE, error: this.state.error });
  }
}

/**
 * The AI agents you can "call" — the address book.
 *
 * `id` must match an agent that the `server/` backend runs and mints tokens
 * for. The bundled backend runs one agent, `assistant` (English, deepgram/flux).
 * Add more here once your backend registers + serves tokens for them.
 */
export interface AgentContact {
  id: string;
  name: string;
  /** Shown as the "phone number" line in the native call UI. */
  tagline: string;
  /** Emoji/initial used for the avatar. */
  avatar: string;
  /** Optional per-agent session config overrides (voice, stt, language…). */
  config?: Record<string, unknown>;
}

export const AGENTS: AgentContact[] = [
  {
    id: 'assistant',
    name: 'Assistant',
    tagline: 'AI voice agent',
    avatar: '🤖',
  },
];

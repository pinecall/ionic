import { callAgent } from './client';
import { AGENTS } from '../data/agents';
import { RING_STREAM } from '../config';

/**
 * Listen for server-initiated "the agent is calling you" events (SSE) and
 * present a native incoming call. This is the in-app-event inbound path —
 * dev-testable in the simulator with no PushKit:
 *
 *   curl -X POST "http://localhost:8787/api/ring?agent=assistant"
 *
 * PushKit (ringing a killed app) is a separate, real-device-only path.
 *
 * Returns a cleanup function.
 */
export function listenForInboundCalls(): () => void {
  const es = new EventSource(RING_STREAM);

  es.addEventListener('ring', (e: MessageEvent) => {
    try {
      const { agent: agentId } = JSON.parse(e.data);
      const agent = AGENTS.find((a) => a.id === agentId) ?? AGENTS[0];
      // Reuses the same flow as an outbound tap: presents the native
      // CallKit incoming UI, connects the VoiceSession on accept.
      void callAgent(agent);
    } catch (err) {
      console.error('[inbound] bad ring payload', err);
    }
  });

  es.onerror = () => {
    // EventSource auto-reconnects; log for visibility during dev.
    console.warn('[inbound] ring stream disconnected, retrying…');
  };

  return () => es.close();
}

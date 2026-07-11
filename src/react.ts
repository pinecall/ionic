import { useEffect, useState, useSyncExternalStore } from 'react';
import { CallClient } from './client';
import type { CallState, StartCallOptions } from './definitions';

export interface UseCallResult extends CallState {
  startCall: (opts: StartCallOptions) => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleSpeaker: () => void;
  client: CallClient;
}

/**
 * React binding for a `CallClient`. Headless — you own the UI entirely:
 * render `messages` (the live transcript), `status`, `phase`, `duration`
 * with whatever components you like.
 *
 * ```tsx
 * const call = useCallClient(client);
 * return call.status === 'connected'
 *   ? <MyCallScreen messages={call.messages} onHangup={call.endCall} />
 *   : <MyAgentList onCall={(a) => call.startCall({ agentId: a.id, ... })} />;
 * ```
 *
 * Pass a shared `CallClient` instance (recommended — lets non-React code
 * like push/SSE handlers start calls too), or omit it to create one local
 * to the component tree.
 */
export function useCallClient(client?: CallClient): UseCallResult {
  const [owned] = useState(() => client ?? new CallClient());
  const state = useSyncExternalStore(owned.subscribe, owned.getState);

  useEffect(() => {
    // Nothing to clean up today (native listeners are process-wide),
    // reserved for future session-scoped resources.
  }, [owned]);

  return {
    ...state,
    startCall: owned.startCall,
    endCall: owned.endCall,
    toggleMute: owned.toggleMute,
    toggleSpeaker: owned.toggleSpeaker,
    client: owned,
  };
}

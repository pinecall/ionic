import { useSyncExternalStore } from 'react';
import { callManager } from './callManager';

/** Reactive view of the current call. */
export function useCall() {
  const state = useSyncExternalStore(callManager.subscribe, callManager.getState);
  return {
    ...state,
    startCall: callManager.startCall,
    endCall: callManager.endCall,
    toggleMute: () => callManager.toggleMute(),
    toggleSpeaker: () => callManager.toggleSpeaker(),
  };
}

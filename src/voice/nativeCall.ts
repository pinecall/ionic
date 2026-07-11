import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

/**
 * JS surface of the in-app native plugin (ios/App/App/PinecallCall*.swift).
 * Native CallKit UI + native WebRTC audio, speaking Pinecall's standard
 * WebRTC protocol. iOS-device only — simulator/browser use @pinecall/web.
 */
export type NativeCallState =
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'ended'
  | 'declined'
  | 'error';

export interface PinecallCallPlugin {
  /** Ring natively; on answer the plugin connects WebRTC on its own. */
  startCall(options: {
    callId: string;
    callerName: string;
    handle?: string;
    /** Backend endpoint returning { token, server } (our server/index.mjs). */
    tokenUrl: string;
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

export const PinecallCall = registerPlugin<PinecallCallPlugin>('PinecallCall');

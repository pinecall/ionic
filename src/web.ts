import { WebPlugin } from '@capacitor/core';
import type { PinecallCallPlugin } from './definitions';

/**
 * Web fallback for the raw plugin: reports "no native call support" so
 * `CallClient` picks the browser strategy (@pinecall/web VoiceSession).
 * The call methods are never used on web — CallClient bypasses them.
 */
export class PinecallCallWeb extends WebPlugin implements PinecallCallPlugin {
  async isNativeCallSupported(): Promise<{ supported: boolean }> {
    return { supported: false };
  }

  async startCall(): Promise<void> {
    throw this.unimplemented('Use CallClient — it handles web via @pinecall/web.');
  }

  async endCall(): Promise<void> {
    throw this.unimplemented('Use CallClient — it handles web via @pinecall/web.');
  }

  async setMuted(): Promise<void> {
    throw this.unimplemented('Use CallClient — it handles web via @pinecall/web.');
  }

  async setSpeaker(): Promise<void> {
    // No speaker/earpiece distinction in browsers — no-op.
  }
}

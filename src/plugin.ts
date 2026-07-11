import { registerPlugin } from '@capacitor/core';
import type { PinecallCallPlugin } from './definitions';

/** Raw native plugin — most apps should use `CallClient` instead. */
export const PinecallCall = registerPlugin<PinecallCallPlugin>('PinecallCall', {
  web: () => import('./web').then((m) => new m.PinecallCallWeb()),
});

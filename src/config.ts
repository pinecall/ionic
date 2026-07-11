/**
 * Base URL of the `server/` backend (token + inbound ring).
 *
 * - Browser dev & iOS Simulator → localhost reaches your Mac.
 * - Real iOS device → localhost is the DEVICE, not your Mac. Set
 *   VITE_SERVER_BASE to your Mac's LAN IP, e.g.
 *   `VITE_SERVER_BASE=http://192.168.1.42:8787`
 */
export const SERVER_BASE: string =
  import.meta.env.VITE_SERVER_BASE ?? 'http://localhost:8787';

export const TOKEN_ENDPOINT = `${SERVER_BASE}/api/token`;
export const RING_STREAM = `${SERVER_BASE}/api/ring/stream`;

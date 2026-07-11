/**
 * Dev-only WebRTC diagnostics — wraps RTCPeerConnection so every instance
 * logs ICE gathering/connection states and each gathered candidate type.
 * Purpose: diagnose "stuck in connecting" (e.g. iOS simulator UDP/ICE
 * limitations) with ground truth instead of guesses. Remove for production.
 */
export function installWebRTCDebug(): void {
  const Native = window.RTCPeerConnection;
  if (!Native || (Native as unknown as { __pcDebug?: boolean }).__pcDebug) return;

  const Wrapped = function (this: unknown, config?: RTCConfiguration) {
    const pc = new Native(config);
    console.log('[RTC] new RTCPeerConnection, iceServers=', JSON.stringify(config?.iceServers));
    pc.addEventListener('icegatheringstatechange', () =>
      console.log('[RTC] gathering:', pc.iceGatheringState),
    );
    pc.addEventListener('iceconnectionstatechange', () =>
      console.log('[RTC] ice:', pc.iceConnectionState),
    );
    pc.addEventListener('connectionstatechange', () =>
      console.log('[RTC] conn:', pc.connectionState),
    );
    pc.addEventListener('icecandidate', (e) => {
      if (!e.candidate) {
        console.log('[RTC] candidate gathering DONE');
        return;
      }
      const typ = e.candidate.candidate.match(/ typ (\w+)/)?.[1] ?? '?';
      console.log('[RTC] candidate:', typ, e.candidate.protocol, e.candidate.address ?? '');
    });
    pc.addEventListener('icecandidateerror', (e) => {
      const err = e as RTCPeerConnectionIceErrorEvent;
      console.warn('[RTC] candidate ERROR:', err.errorCode, err.errorText, err.url);
    });
    return pc;
  } as unknown as typeof RTCPeerConnection;

  Wrapped.prototype = Native.prototype;
  Object.setPrototypeOf(Wrapped, Native); // keep statics (generateCertificate)
  (Wrapped as unknown as { __pcDebug: boolean }).__pcDebug = true;
  window.RTCPeerConnection = Wrapped;
}

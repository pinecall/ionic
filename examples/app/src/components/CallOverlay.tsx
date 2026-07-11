import { IonIcon } from '@ionic/react';
import { call, mic, micOff, volumeHigh } from 'ionicons/icons';
import { useCallClient } from '@pinecall/ionic/react';
import { AGENTS } from '../data/agents';
import { callClient } from '../voice/client';
import './CallOverlay.css';

/**
 * Example in-call UI — 100% custom. Everything here comes from the headless
 * CallClient state: build yours with any components you like.
 */

const STATUS_LABEL: Record<string, string> = {
  ringing: 'Ringing…',
  connecting: 'Connecting…',
  connected: 'Connected',
  error: 'Call failed',
  idle: '',
};

function fmt(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const CallOverlay: React.FC = () => {
  const {
    agentId, status, phase, isMuted, isSpeaker, messages, duration,
    endCall, toggleMute, toggleSpeaker,
  } = useCallClient(callClient);

  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) return null;

  const connected = status === 'connected';
  const statusLine = connected ? fmt(duration) : STATUS_LABEL[status] ?? '';

  return (
    <div className="call-overlay">
      <div className="glow glow-top" />
      <div className="glow glow-bottom" />

      <div className="call-head">
        <div className={`call-avatar phase-${phase}`}>
          <span>{agent.avatar}</span>
        </div>
        <h1 className="call-name">{agent.name}</h1>
        <div className={`status-pill ${connected ? 'live' : ''}`}>
          <span className="dot" />
          {statusLine}
        </div>
      </div>

      <div className="call-transcript">
        {messages.slice(-6).map((m) => (
          <div key={m.id} className={`bubble ${m.role === 'bot' ? 'assistant' : 'user'}`}>
            {m.text}
          </div>
        ))}
      </div>

      <div className="call-actions">
        <button
          className={`round-btn ${isSpeaker ? 'active' : ''}`}
          onClick={toggleSpeaker}
          disabled={!connected}
          aria-label={isSpeaker ? 'Earpiece' : 'Speaker'}
        >
          <IonIcon icon={volumeHigh} />
        </button>
        <button
          className={`round-btn ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          disabled={!connected}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <IonIcon icon={isMuted ? micOff : mic} />
        </button>
        <button className="round-btn hangup" onClick={() => endCall()} aria-label="End call">
          <IonIcon icon={call} />
        </button>
      </div>
    </div>
  );
};

export default CallOverlay;

import { IonIcon } from '@ionic/react';
import { call, mic, micOff, volumeHigh } from 'ionicons/icons';
import { useCall } from '../voice/useCall';
import './CallOverlay.css';

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
    agent, status, phase, isMuted, isSpeaker, messages, duration,
    endCall, toggleMute, toggleSpeaker,
  } = useCall();

  if (!agent) return null;

  const connected = status === 'connected';
  const statusLine = connected ? fmt(duration) : STATUS_LABEL[status] ?? '';

  return (
    <div className="call-overlay">
      <div className={`call-avatar phase-${phase}`}>
        <span>{agent.avatar}</span>
      </div>
      <h1 className="call-name">{agent.name}</h1>
      <p className="call-status">{statusLine}</p>

      <div className="call-transcript">
        {messages.slice(-4).map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
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
        <button className="round-btn hangup" onClick={endCall} aria-label="End call">
          <IonIcon icon={call} />
        </button>
      </div>
    </div>
  );
};

export default CallOverlay;

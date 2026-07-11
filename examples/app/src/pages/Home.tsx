import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonButton,
  IonIcon,
} from '@ionic/react';
import { call as callIcon, notifications as ringIcon } from 'ionicons/icons';
import { useCallClient } from '@pinecall/ionic/react';
import { AGENTS } from '../data/agents';
import { callClient, callAgent } from '../voice/client';
import CallOverlay from '../components/CallOverlay';
import './Home.css';

const Home: React.FC = () => {
  const { status } = useCallClient(callClient);
  // While ringing, CallKit owns the screen — our overlay appears on accept.
  const showOverlay = status !== 'idle' && status !== 'ringing';

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Agents</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">Agents</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonList>
          {AGENTS.map((a) => (
            <IonItem key={a.id} lines="full">
              <IonAvatar slot="start" className="agent-avatar">
                <span>{a.avatar}</span>
              </IonAvatar>
              <IonLabel>
                <h2>{a.name}</h2>
                <p>{a.tagline}</p>
              </IonLabel>
              {/* Simulate the agent calling YOU — native incoming ring */}
              <IonButton
                slot="end"
                fill="clear"
                shape="round"
                aria-label={`${a.name} calls you`}
                onClick={() => callAgent(a, 'incoming')}
              >
                <IonIcon slot="icon-only" icon={ringIcon} color="warning" />
              </IonButton>
              {/* You call the agent — native outgoing call */}
              <IonButton
                slot="end"
                fill="clear"
                shape="round"
                aria-label={`Call ${a.name}`}
                onClick={() => callAgent(a, 'outgoing')}
              >
                <IonIcon slot="icon-only" icon={callIcon} color="success" />
              </IonButton>
            </IonItem>
          ))}
        </IonList>

        {showOverlay && <CallOverlay />}
      </IonContent>
    </IonPage>
  );
};

export default Home;

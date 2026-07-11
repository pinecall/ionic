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
import { call as callIcon } from 'ionicons/icons';
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
              <IonButton
                slot="end"
                fill="clear"
                shape="round"
                aria-label={`Call ${a.name}`}
                onClick={() => callAgent(a)}
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

import { CallClient } from '@pinecall/ionic';
import type { AgentContact } from '../data/agents';
import { TOKEN_ENDPOINT } from '../config';

/**
 * One shared CallClient for the whole app — React components bind to it via
 * useCallClient(callClient), and non-React code (the SSE inbound listener)
 * can start calls on the same instance.
 */
export const callClient = new CallClient();

/** Start a call to one of our address-book agents. */
export function callAgent(agent: AgentContact): Promise<void> {
  return callClient.startCall({
    agentId: agent.id,
    callerName: agent.name,
    handle: agent.tagline,
    tokenUrl: `${TOKEN_ENDPOINT}?agent=${encodeURIComponent(agent.id)}`,
    config: agent.config,
  });
}

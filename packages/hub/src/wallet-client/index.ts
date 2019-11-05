export const MESSAGE_RELAY_REQUESTED = 'WALLET.MESSAGING.MESSAGE_RELAY_REQUESTED';

export const messageRelayRequested = (to: string, messagePayload: any) => ({
  type: MESSAGE_RELAY_REQUESTED as typeof MESSAGE_RELAY_REQUESTED,
  to,
  messagePayload
});

/**
 * The event emitted when the wallet requests a message be relayed to the opponent's wallet.
 */
export type MessageRelayRequested = ReturnType<typeof messageRelayRequested>;

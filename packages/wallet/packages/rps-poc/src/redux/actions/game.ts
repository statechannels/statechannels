import Message from '../../game-engine/Message'

export enum GameTypes {
  CHOOSE_OPPONENT,
  CHOOSE_A_PLAY,
  MESSAGE_RECEIVED,
  EVENT_RECEIVED,
  MESSAGE_SENT,
}

export const chooseOpponent = ({ opponentAddress, stake }: { opponentAddress: string, stake: number }) => ({
  type: types.CHOOSE_OPPONENT,
  opponentAddress,
  stake,
});

export const chooseAPlay = (aPlay: string) => ({
  type: types.CHOOSE_A_PLAY,
  aPlay,
});

export const messageReceived = (message: Message) => ({
  type: types.MESSAGE_RECEIVED,
  message,
});

export const messageSent = (message: Message) => ({
  type: types.MESSAGE_SENT,
  message,
});

export const eventReceived = (event: object) => ({
  type: types.EVENT_RECEIVED,
  event,
});

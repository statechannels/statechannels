export const MESSAGE_FROM_APP = 'AUTO_OPPONENT.MESSAGE_FROM_APP';
export const MESSAGE_TO_APP = 'AUTO_OPPONENT.MESSAGE_TO_APP';
export const INITIALIZATION_SUCCESS = 'AUTO_OPPONENT.INITIALIZATION_SUCCESS';

export const messageFromApp = (data) => ({
  type: MESSAGE_FROM_APP as typeof MESSAGE_FROM_APP,
  data,
});

export const messageToApp = (data) => ({
  type: MESSAGE_TO_APP as typeof MESSAGE_TO_APP,
  data,
});

export const initializationSuccess = (address) => ({
  type: INITIALIZATION_SUCCESS as typeof INITIALIZATION_SUCCESS,
  address,
});

export type MessageFromApp = ReturnType<typeof messageFromApp>;
export type MessageToApp = ReturnType<typeof messageToApp>;
export type InitializationSuccess = ReturnType<typeof initializationSuccess>;

export type AnyAction = MessageFromApp | MessageToApp | InitializationSuccess;


import * as states from '../../states';
import * as actions from '../actions';
import decode from '../../utils/decode-utils';

import { ourTurn, validTransition } from '../../utils/reducer-utils';
import { signPositionHex, validSignature } from '../../utils/signing-utils';
import { challengeRejected } from '../../interface/outgoing';
import { handleSignatureAndValidationMessages } from '../../utils/state-utils';


export const runningReducer = (state: states.RunningState, action: actions.WalletAction): states.WalletState => {
  return waitForUpdateReducer(state, action);
};

const waitForUpdateReducer = (state: states.WaitForUpdate, action: actions.WalletAction): states.WalletState => {
  switch (action.type) {
    case actions.OWN_POSITION_RECEIVED:
      const messageOutbox = handleSignatureAndValidationMessages(state, action);
      const data = action.data;
      const position = decode(data);
      // check it's our turn
      if (!ourTurn(state)) {
        return {
          ...state, messageOutbox,
        };
      }

      // check transition
      if (!validTransition(state, position)) {
        return {
          ...state, messageOutbox,
        };
      }

      const signature = signPositionHex(data, state.privateKey);

      return states.waitForUpdate({
        ...state,
        turnNum: state.turnNum + 1,
        lastPosition: { data, signature },
        penultimatePosition: state.lastPosition,
        messageOutbox,
      });

    case actions.OPPONENT_POSITION_RECEIVED:
      const validationMessage = handleSignatureAndValidationMessages(state, action);
      if (ourTurn(state)) { return { ...state, messageOutbox: validationMessage }; }

      const position1 = decode(action.data);
      // check signature
      if (!action.signature) { return { ...state, messageOutbox: validationMessage }; }
      const messageSignature = action.signature as string;
      const opponentAddress = state.participants[1 - state.ourIndex];
      if (!validSignature(action.data, messageSignature, opponentAddress)) { return { ...state, messageOutbox: validationMessage }; }

      // check transition
      if (!validTransition(state, position1)) { return { ...state, messageOutbox: validationMessage }; }

      return states.waitForUpdate({
        ...state,
        turnNum: state.turnNum + 1,
        lastPosition: { data: action.data, signature: messageSignature },
        penultimatePosition: state.lastPosition,
        messageOutbox: handleSignatureAndValidationMessages(state, action),
      });

    case actions.CHALLENGE_CREATED_EVENT:
      // transition to responding
      return states.acknowledgeChallenge({ ...state, challengeExpiry: action.expirationTime });

    case actions.CHALLENGE_REQUESTED:
      // The application should validate this but just in case we check as well
      if (ourTurn(state)) {
        const message = challengeRejected("Challenges can only be issued when waiting for the other user.");
        return states.waitForUpdate({ ...state, messageOutbox: message });
      }
      // transition to challenging
      return states.approveChallenge(state);

    default:
      return state;
  }
};



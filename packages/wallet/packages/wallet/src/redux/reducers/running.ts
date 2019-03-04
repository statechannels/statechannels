
import * as states from '../../states';
import * as actions from '../actions';

import { ourTurn, validTransition } from '../../utils/reducer-utils';
import { signCommitment, validCommitmentSignature } from '../../utils/signing-utils';
import { challengeRejected, showWallet } from 'magmo-wallet-client/lib/wallet-events';
import { handleSignatureAndValidationMessages } from '../../utils/state-utils';


export const runningReducer = (state: states.RunningState, action: actions.WalletAction): states.WalletState => {
  return waitForUpdateReducer(state, action);
};

const waitForUpdateReducer = (state: states.WaitForUpdate, action: actions.WalletAction): states.WalletState => {
  switch (action.type) {
    case actions.OWN_COMMITMENT_RECEIVED:
      const messageOutbox = handleSignatureAndValidationMessages(state, action);

      // check it's our turn
      if (!ourTurn(state)) {
        return {
          ...state, messageOutbox,
        };
      }

      // check transition
      if (!validTransition(state, action.commitment)) {
        return {
          ...state, messageOutbox,
        };
      }

      const signature = signCommitment(action.commitment, state.privateKey);

      return states.waitForUpdate({
        ...state,
        turnNum: state.turnNum + 1,
        lastCommitment: { commitment: action.commitment, signature },
        penultimateCommitment: state.lastCommitment,
        messageOutbox,
      });

    case actions.OPPONENT_COMMITMENT_RECEIVED:
      const validationMessage = handleSignatureAndValidationMessages(state, action);
      if (ourTurn(state)) { return { ...state, messageOutbox: validationMessage }; }

      // check signature
      if (!action.signature) { return { ...state, messageOutbox: validationMessage }; }
      const messageSignature = action.signature as string;
      const opponentAddress = state.participants[1 - state.ourIndex];
      if (!validCommitmentSignature(action.commitment, messageSignature, opponentAddress)) { return { ...state, messageOutbox: validationMessage }; }

      // check transition
      if (!validTransition(state, action.commitment)) { return { ...state, messageOutbox: validationMessage }; }

      return states.waitForUpdate({
        ...state,
        turnNum: state.turnNum + 1,
        lastCommitment: { commitment: action.commitment, signature: messageSignature },
        penultimateCommitment: state.lastCommitment,
        messageOutbox: handleSignatureAndValidationMessages(state, action),
      });

    case actions.CHALLENGE_CREATED_EVENT:
      // transition to responding
      return states.chooseResponse({ ...state, challengeExpiry: action.finalizedAt, displayOutbox: showWallet() });

    case actions.CHALLENGE_REQUESTED:
      // The application should validate this but just in case we check as well
      if (ourTurn(state)) {
        const message = challengeRejected("Challenges can only be issued when waiting for the other user.");
        return states.waitForUpdate({ ...state, messageOutbox: message });
      }
      // transition to challenging
      return states.approveChallenge({ ...state, displayOutbox: showWallet() });

    default:
      return state;
  }
};



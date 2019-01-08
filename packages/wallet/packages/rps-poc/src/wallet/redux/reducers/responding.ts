import { WalletState, RespondingState } from '../../states';
import * as states from '../../states/responding';
import * as challengeStates from '../../states/challenging';
import * as runningStates from '../../states/running';
import { WalletAction } from '../actions';
import * as actions from '../actions';
import { unreachable, ourTurn, validTransition } from '../../utils/reducer-utils';
import { signPositionHex } from '../../utils/signing-utils';
import { createRespondWithMoveTransaction } from '../../utils/transaction-generator';
import { challengeResponseRequested, challengeComplete } from '../../interface/outgoing';
import { handleSignatureAndValidationMessages } from '../../utils/state-utils';
import decode from '../../utils/decode-utils';


export const respondingReducer = (state: RespondingState, action: WalletAction): WalletState => {
  // Handle any signature/validation request centrally to avoid duplicating code for each state
  if (action.type === actions.OWN_POSITION_RECEIVED || action.type === actions.OPPONENT_POSITION_RECEIVED) {
    return { ...state, messageOutbox: handleSignatureAndValidationMessages(state, action) };
  }

  switch (state.type) {
    case states.ACKNOWLEDGE_CHALLENGE:
      return acknowledgeChallengeReducer(state, action);
    case states.CHOOSE_RESPONSE:
      return chooseResponseReducer(state, action);
    case states.TAKE_MOVE_IN_APP:
      return takeMoveInAppReducer(state, action);
    case states.INITIATE_RESPONSE:
      return initiateResponseReducer(state, action);
    case states.WAIT_FOR_RESPONSE_SUBMISSION:
      return waitForResponseSubmissionReducer(state, action);
    case states.WAIT_FOR_RESPONSE_CONFIRMATION:
      return waitForResponseConfirmationReducer(state, action);
    case states.ACKNOWLEDGE_CHALLENGE_COMPLETE:
      return acknowledgeChallengeCompleteReducer(state, action);
    default:
      return unreachable(state);
  }

};

export const acknowledgeChallengeReducer = (state: states.AcknowledgeChallenge, action: WalletAction): WalletState => {
  switch (action.type) {

    case actions.CHALLENGE_ACKNOWLEDGED:
      return states.chooseResponse(state);
    case actions.CHALLENGE_TIMED_OUT:
      return challengeStates.acknowledgeChallengeTimeout(state);
    default:
      return state;
  }
};

export const chooseResponseReducer = (state: states.ChooseResponse, action: WalletAction): WalletState => {
  switch (action.type) {
    case actions.RESPOND_WITH_MOVE_CHOSEN:
      return states.takeMoveInApp({ ...state, messageOutbox: challengeResponseRequested() });
    case actions.RESPOND_WITH_EXISTING_MOVE_CHOSEN:
      const { data, signature } = state.lastPosition;
      const transaction = createRespondWithMoveTransaction(state.adjudicator, data, signature);
      return states.initiateResponse({
        ...state,
        transactionOutbox: transaction,
      });
    case actions.RESPOND_WITH_REFUTE_CHOSEN:
      return states.initiateResponse(state);
    case actions.CHALLENGE_TIMED_OUT:
      return challengeStates.acknowledgeChallengeTimeout(state);
    default:
      return state;
  }
};

export const takeMoveInAppReducer = (state: states.TakeMoveInApp, action: WalletAction): WalletState => {
  switch (action.type) {
    case actions.CHALLENGE_POSITION_RECEIVED:
      const data = action.data;
      const position = decode(data);
      // check it's our turn
      if (!ourTurn(state)) { return state; }

      // check transition
      if (!validTransition(state, position)) { return state; }

      const signature = signPositionHex(data, state.privateKey);
      const transaction = createRespondWithMoveTransaction(state.adjudicator, data, signature);
      return states.initiateResponse({
        ...state,
        turnNum: state.turnNum + 1,
        lastPosition: { data, signature },
        penultimatePosition: state.lastPosition,
        transactionOutbox: transaction,
      });

    case actions.CHALLENGE_TIMED_OUT:
      return challengeStates.acknowledgeChallengeTimeout(state);
    default:
      return state;
  }
};

export const initiateResponseReducer = (state: states.InitiateResponse, action: WalletAction): WalletState => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return states.waitForResponseSubmission(state);
    default:
      return state;
  }
};

export const waitForResponseSubmissionReducer = (state: states.WaitForResponseSubmission, action: WalletAction): WalletState => {
  switch (action.type) {

    case actions.TRANSACTION_SUBMITTED:
      return states.waitForResponseConfirmation(state);
    default:
      return state;
  }
};

export const waitForResponseConfirmationReducer = (state: states.WaitForResponseConfirmation, action: WalletAction): WalletState => {
  switch (action.type) {
    case actions.TRANSACTION_CONFIRMED:
      return states.acknowledgeChallengeComplete(state);
    default:
      return state;
  }
};

export const acknowledgeChallengeCompleteReducer = (state: states.AcknowledgeChallengeComplete, action: WalletAction): WalletState => {
  switch (action.type) {
    case actions.CHALLENGE_RESPONSE_ACKNOWLEDGED:
      return runningStates.waitForUpdate({ ...state, messageOutbox: challengeComplete() });
    default:
      return state;
  }
};

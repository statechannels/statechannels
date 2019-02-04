import * as states from '../../states';
import * as actions from '../actions';

import { WalletState, ClosingState } from '../../states';
import { WalletAction } from '../actions';
import { unreachable, ourTurn, validTransition } from '../../utils/reducer-utils';
import { State, Channel } from 'fmg-core';
import decode from '../../utils/decode-utils';
import { signPositionHex, validSignature, signVerificationData } from '../../utils/signing-utils';
import { messageRequest, closeSuccess, concludeSuccess, concludeFailure, hideWallet } from 'wallet-client/lib/wallet-events';
import { createConcludeAndWithdrawTransaction } from '../../utils/transaction-generator';

export const closingReducer = (state: ClosingState, action: WalletAction): WalletState => {
  switch (state.type) {
    case states.APPROVE_CONCLUDE:
      return approveConcludeReducer(state, action);
    case states.WAIT_FOR_OPPONENT_CONCLUDE:
      return waitForOpponentConclude(state, action);
    case states.APPROVE_CLOSE_ON_CHAIN:
      return approveCloseOnChainReducer(state, action);
    case states.ACKNOWLEDGE_CLOSE_SUCCESS:
      return acknowledgeCloseSuccessReducer(state, action);
    case states.ACKNOWLEDGE_CLOSED_ON_CHAIN:
      return acknowledgeClosedOnChainReducer(state, action);
    case states.WAIT_FOR_CLOSE_INITIATION:
      return waitForCloseInitiatorReducer(state, action);
    case states.WAIT_FOR_CLOSE_SUBMISSION:
      return waitForCloseSubmissionReducer(state, action);
    case states.WAIT_FOR_CLOSE_CONFIRMED:
      return waitForCloseConfirmedReducer(state, action);
    case states.WAIT_FOR_OPPONENT_CLOSE:
      return waitForOpponentCloseReducer(state, action);
    case states.ACKNOWLEDGE_CONCLUDE:
      return acknowledgeConcludeReducer(state, action);
    case states.CLOSE_TRANSACTION_FAILED:
      return closeTransactionFailedReducer(state, action);
    default:
      return unreachable(state);
  }
};

const closeTransactionFailedReducer = (state: states.CloseTransactionFailed, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.RETRY_TRANSACTION:
      const { penultimatePosition: from, lastPosition: to } = state;
      const myAddress = state.participants[state.ourIndex];
      const verificationSignature = signVerificationData(myAddress, state.userAddress, state.channelId, state.privateKey);

      const concludeAndWithdrawArgs = {
        contractAddress: state.adjudicator,
        fromState: from.data,
        toState: to.data,
        participant: state.participants[state.ourIndex],
        destination: state.userAddress,
        channelId: state.channelId,
        fromSignature: from.signature,
        toSignature: to.signature,
        verificationSignature,
      };
      const transactionOutbox = createConcludeAndWithdrawTransaction(concludeAndWithdrawArgs);
      return states.waitForCloseSubmission({ ...state, transactionOutbox });
  }
  return state;
};

const acknowledgeConcludeReducer = (state: states.AcknowledgeConclude, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.CONCLUDE_APPROVED:
      if (!ourTurn(state)) { return { ...state, displayOutbox: hideWallet(), messageOutbox: concludeFailure('Other', 'It is not the current user\'s turn') }; }
      const { positionData, positionSignature, sendMessageAction } = composeConcludePosition(state);
      const lastState = decode(state.lastPosition.data);
      if (lastState.stateType === State.StateType.Conclude) {
        if (state.adjudicator) {
          return states.approveCloseOnChain({
            ...state,
            adjudicator: state.adjudicator,
            turnNum: decode(positionData).turnNum,
            penultimatePosition: state.lastPosition,
            lastPosition: { data: positionData, signature: positionSignature },
            messageOutbox: sendMessageAction,
          });
        } else {
          return states.acknowledgeCloseSuccess({
            ...state,
            messageOutbox: concludeSuccess(),
          });
        }
      }
  }
  return state;
};


const waitForOpponentCloseReducer = (state: states.WaitForOpponentClose, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.GAME_CONCLUDED_EVENT:
      return states.approveWithdrawal(state);
  }
  return state;

};

const waitForCloseConfirmedReducer = (state: states.WaitForCloseConfirmed, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.TRANSACTION_CONFIRMED:
      return states.waitForChannel({ ...state, messageOutbox: closeSuccess(), displayOutbox: hideWallet() });
  }
  return state;
};

const waitForCloseInitiatorReducer = (state: states.WaitForCloseInitiation, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.TRANSACTION_SENT_TO_METAMASK:
      return states.waitForCloseSubmission(state);
    case actions.GAME_CONCLUDED_EVENT:
      return states.approveWithdrawal(state);
  }
  return state;
};

const waitForCloseSubmissionReducer = (state: states.WaitForCloseSubmission, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.TRANSACTION_SUBMISSION_FAILED:
      return states.closeTransactionFailed(state);
    case actions.TRANSACTION_SUBMITTED:
      return states.waitForCloseConfirmed({ ...state, transactionHash: action.transactionHash });
  }
  return state;
};

const approveCloseOnChainReducer = (state: states.ApproveCloseOnChain, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.APPROVE_CLOSE:

      const { penultimatePosition: from, lastPosition: to } = state;
      const myAddress = state.participants[state.ourIndex];
      const verificationSignature = signVerificationData(myAddress, action.withdrawAddress, state.channelId, state.privateKey);

      const concludeAndWithdrawArgs = {
        contractAddress: state.adjudicator,
        fromState: from.data,
        toState: to.data,
        participant: state.participants[state.ourIndex],
        destination: action.withdrawAddress,
        channelId: state.channelId,
        fromSignature: from.signature,
        toSignature: to.signature,
        verificationSignature,
      };
      const transactionOutbox = createConcludeAndWithdrawTransaction(concludeAndWithdrawArgs);
      const signature = signPositionHex('CloseStarted', state.privateKey);
      const messageOutbox = messageRequest(state.participants[1 - state.ourIndex], 'CloseStarted', signature);
      return states.waitForCloseInitiation({ ...state, userAddress: action.withdrawAddress, transactionOutbox, messageOutbox });
    case actions.MESSAGE_RECEIVED:
      const opponentAddress = state.participants[1 - state.ourIndex];
      if (action.data === 'CloseStarted' && validSignature(action.data, action.signature || '0x0', opponentAddress)) {
        return states.waitForOpponentClose(state);
      }
    case actions.GAME_CONCLUDED_EVENT:
      return states.approveWithdrawal(state);
  }
  return state;
};

const approveConcludeReducer = (state: states.ApproveConclude, action: WalletAction) => {
  switch (action.type) {
    case actions.CONCLUDE_APPROVED:
      if (!ourTurn(state)) { return { ...state, displayOutbox: hideWallet(), messageOutbox: concludeFailure('Other', 'It is not the current user\'s turn') }; }

      const { positionData, positionSignature, sendMessageAction } = composeConcludePosition(state);
      const lastState = decode(state.lastPosition.data);
      if (lastState.stateType === State.StateType.Conclude) {
        if (state.adjudicator) {
          return states.approveCloseOnChain({
            ...state,
            adjudicator: state.adjudicator,
            turnNum: decode(positionData).turnNum,
            penultimatePosition: state.lastPosition,
            lastPosition: { data: positionData, signature: positionSignature },
            messageOutbox: sendMessageAction,
          });
        } else {
          return states.acknowledgeCloseSuccess({
            ...state,
            messageOutbox: concludeSuccess(),
          });
        }
      } else {
        return states.waitForOpponentConclude({
          ...state,
          turnNum: decode(positionData).turnNum,
          penultimatePosition: state.lastPosition,
          lastPosition: { data: positionData, signature: positionSignature },
          messageOutbox: sendMessageAction,
        });
      }
      break;
    case actions.CONCLUDE_REJECTED:
      if (state.adjudicator) {
        return states.waitForUpdate({ ...state, adjudicator: state.adjudicator, displayOutbox: hideWallet(), messageOutbox: concludeFailure('UserDeclined') });
      } else {
        return states.waitForChannel({ ...state, displayOutbox: hideWallet(), messageOutbox: concludeFailure('UserDeclined') });
      }
    default:
      return state;
  }
};

const waitForOpponentConclude = (state: states.WaitForOpponentConclude, action: WalletAction) => {
  switch (action.type) {
    case actions.MESSAGE_RECEIVED:

      if (!action.signature) { return { ...state, displayOutbox: hideWallet(), messageOutbox: concludeFailure('Other', 'Signature is missing from the message.') }; }

      const opponentAddress = state.participants[1 - state.ourIndex];
      if (!validSignature(action.data, action.signature, opponentAddress)) {
        return { ...state, displayOutbox: hideWallet(), messageOutbox: concludeFailure('Other', 'The signature provided is not valid.') };
      }
      const concludePosition = decode(action.data);
      // check transition
      if (!validTransition(state, concludePosition)) {
        return { ...state, displayOutbox: hideWallet(), messageOutbox: concludeFailure('Other', `The transition from ${state.type} to conclude is not valid.`) };
      }
      if (state.adjudicator !== undefined) {
        return states.approveCloseOnChain({
          ...state,
          adjudicator: state.adjudicator,
          turnNum: concludePosition.turnNum,
          penultimatePosition: state.lastPosition,
          lastPosition: { data: action.data, signature: action.signature },
          messageOutbox: concludeSuccess(),
        });
      } else {
        return states.acknowledgeCloseSuccess({
          ...state,
          messageOutbox: concludeSuccess(),
        });
      }

    default:
      return state;
  }
};



const acknowledgeCloseSuccessReducer = (state: states.AcknowledgeCloseSuccess, action: WalletAction) => {
  switch (action.type) {
    case actions.CLOSE_SUCCESS_ACKNOWLEDGED:
      return states.waitForChannel({
        ...state,
        messageOutbox: closeSuccess(),
      });
    default:
      return state;
  }
};

const acknowledgeClosedOnChainReducer = (state: states.AcknowledgeClosedOnChain, action: WalletAction) => {
  switch (action.type) {
    case actions.CLOSED_ON_CHAIN_ACKNOWLEDGED:
      return states.waitForChannel({
        ...state,
        messageOutbox: closeSuccess(),
      });
    default:
      return state;
  }
};

const composeConcludePosition = (state: states.ClosingState) => {
  const lastState = decode(state.lastPosition.data);
  const stateCount = (lastState.stateType === State.StateType.Conclude) ? 1 : 0;
  const { libraryAddress, channelNonce, participants, turnNum } = state;
  const channel = new Channel(libraryAddress, channelNonce, participants);

  const concludeState = new State({
    channel,
    stateType: State.StateType.Conclude,
    turnNum: turnNum + 1,
    stateCount,
    resolution: lastState.resolution,
  });

  const positionData = concludeState.toHex();
  const positionSignature = signPositionHex(positionData, state.privateKey);
  const sendMessageAction = messageRequest(state.participants[1 - state.ourIndex], positionData, positionSignature);
  return { positionData, positionSignature, sendMessageAction };
};
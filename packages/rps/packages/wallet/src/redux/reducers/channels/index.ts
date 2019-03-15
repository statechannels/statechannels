import {
  OPENING,
  FUNDING,
  RUNNING,
  CHALLENGING,
  RESPONDING,
  WITHDRAWING,
  CLOSING,
  approveConclude,
  ApproveConclude,
  acknowledgeConclude,
  AcknowledgeConclude,
  ChannelState,
} from '../../states/channels';

import { openingReducer } from './opening';
import { fundingReducer } from './funding';
import { runningReducer } from './running';
import { challengingReducer } from './challenging';
import { respondingReducer } from './responding';
import { withdrawingReducer } from './withdrawing';
import { closingReducer } from './closing';
import { WalletAction, CONCLUDE_REQUESTED, COMMITMENT_RECEIVED } from '../../actions';
import { unreachable, ourTurn, validTransition } from '../../../utils/reducer-utils';
import { validCommitmentSignature } from '../../../utils/signing-utils';
import { showWallet } from 'magmo-wallet-client/lib/wallet-events';
import { CommitmentType } from 'fmg-core';
import { NextChannelState } from '../../states/shared';

export const channelReducer = (
  state: ChannelState,
  action: WalletAction,
  unhandledAction?: WalletAction,
): NextChannelState<ChannelState> => {
  const conclusionStateFromOwnRequest = receivedValidOwnConclusionRequest(state, action);
  if (conclusionStateFromOwnRequest) {
    return {
      channelState: conclusionStateFromOwnRequest,
      outboxState: { displayOutbox: showWallet() },
    };
  }

  const conclusionStateFromOpponentRequest = receivedValidOpponentConclusionRequest(state, action);
  if (conclusionStateFromOpponentRequest) {
    return {
      channelState: conclusionStateFromOpponentRequest,
      outboxState: { displayOutbox: showWallet() },
    };
  }

  switch (state.stage) {
    case OPENING:
      return openingReducer(state, action);
    case FUNDING:
      return fundingReducer(state, action, unhandledAction);
    case RUNNING:
      return runningReducer(state, action);
    case CHALLENGING:
      return challengingReducer(state, action);
    case RESPONDING:
      return respondingReducer(state, action);
    case WITHDRAWING:
      return withdrawingReducer(state, action);
    case CLOSING:
      return closingReducer(state, action);
    default:
      return unreachable(state);
  }
};

const receivedValidOwnConclusionRequest = (
  state: ChannelState,
  action: WalletAction,
): ApproveConclude | null => {
  if (state.stage !== FUNDING && state.stage !== RUNNING) {
    return null;
  }
  if (action.type !== CONCLUDE_REQUESTED || !ourTurn(state)) {
    return null;
  }
  return approveConclude({ ...state });
};

const receivedValidOpponentConclusionRequest = (
  state: ChannelState,
  action: WalletAction,
): AcknowledgeConclude | null => {
  if (state.stage !== FUNDING && state.stage !== RUNNING) {
    return null;
  }
  if (action.type !== COMMITMENT_RECEIVED) {
    return null;
  }

  const { commitment, signature } = action;

  if (commitment.commitmentType !== CommitmentType.Conclude) {
    return null;
  }
  // check signature
  const opponentAddress = state.participants[1 - state.ourIndex];
  if (!validCommitmentSignature(commitment, signature, opponentAddress)) {
    return null;
  }
  if (!validTransition(state, commitment)) {
    return null;
  }

  return acknowledgeConclude({
    ...state,
    turnNum: commitment.turnNum,
    lastCommitment: { commitment, signature },
    penultimateCommitment: state.lastCommitment,
  });
};

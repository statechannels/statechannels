import * as states from '../state';
import * as actions from '../actions';

import { internal, COMMITMENT_RECEIVED } from '../../actions';
import { messageRelayRequested, fundingSuccess } from 'magmo-wallet-client/lib/wallet-events';

import { unreachable, validTransition } from '../../../utils/reducer-utils';
import { signCommitment, validCommitmentSignature } from '../../../utils/signing-utils';

import { Channel, Commitment, CommitmentType } from 'fmg-core';
import { handleSignatureAndValidationMessages } from '../../../utils/state-utils';
import { StateWithSideEffects } from '../../utils';
import { WalletProtocol } from '../../types';

export const fundingReducer = (
  state: states.FundingState,
  action: actions.ChannelAction | internal.FundingConfirmed,
): StateWithSideEffects<states.ChannelStatus> => {
  // Handle any signature/validation request centrally to avoid duplicating code for each state
  if (
    action.type === actions.OWN_COMMITMENT_RECEIVED ||
    action.type === actions.OPPONENT_COMMITMENT_RECEIVED
  ) {
    return {
      state,
      sideEffects: { messageOutbox: handleSignatureAndValidationMessages(state, action) },
    };
  }

  switch (state.type) {
    // Funding is ongoing
    case states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP:
      return waitForFundingAndPostFundSetupReducer(state, action);
    case states.WAIT_FOR_FUNDING_CONFIRMATION:
      return waitForFundingConfirmationReducer(state, action);
    case states.A_WAIT_FOR_POST_FUND_SETUP:
      return aWaitForPostFundSetupReducer(state, action);
    case states.B_WAIT_FOR_POST_FUND_SETUP:
      return bWaitForPostFundSetupReducer(state, action);

    //
    default:
      return unreachable(state);
  }
};

const waitForFundingAndPostFundSetupReducer = (
  state: states.WaitForFundingAndPostFundSetup,
  action: actions.ChannelAction | internal.InternalAction,
): StateWithSideEffects<states.OpenedState> => {
  switch (action.type) {
    case COMMITMENT_RECEIVED:
      const { commitment, signature } = action;
      if (!validTransitionToPostFundState(state, commitment, signature)) {
        return { state };
      }
      if (state.ourIndex === 0) {
        // Player B skipped our turn, and so we should ignore their message.
        return { state };
      } else {
        // Player A sent their post fund setup too early.
        // We shouldn't respond, but we store their commitment.
        return {
          state: states.waitForFundingConfirmation({
            ...state,
            turnNum: commitment.turnNum,
            penultimateCommitment: state.lastCommitment,
            lastCommitment: { commitment, signature },
          }),
        };
      }

    case internal.FUNDING_CONFIRMED:
      if (action.channelId === state.channelId) {
        const {
          postFundSetupCommitment,
          commitmentSignature,
          sendCommitmentAction,
        } = composePostFundCommitment(state);

        const params = {
          ...state,
          turnNum: postFundSetupCommitment.turnNum,
          penultimateCommitment: state.lastCommitment,
          lastCommitment: {
            commitment: postFundSetupCommitment,
            signature: commitmentSignature,
          },
        };

        if (state.ourIndex === 0) {
          return {
            state: states.aWaitForPostFundSetup(params),
            sideEffects: {
              messageOutbox: sendCommitmentAction,
            },
          };
        } else {
          return {
            state: states.bWaitForPostFundSetup({ ...state }),
            sideEffects: {
              messageOutbox: sendCommitmentAction,
            },
          };
        }
      } else {
        return { state };
      }
    default:
      return { state };
  }
};

const aWaitForPostFundSetupReducer = (
  state: states.AWaitForPostFundSetup,
  action: actions.ChannelAction | internal.InternalAction,
): StateWithSideEffects<states.OpenedState> => {
  switch (action.type) {
    case COMMITMENT_RECEIVED:
      const { commitment: postFundState, signature } = action;
      if (!validTransitionToPostFundState(state, postFundState, signature)) {
        return { state };
      }

      return {
        state: states.waitForUpdate({
          ...state,
          turnNum: postFundState.turnNum,
          lastCommitment: { commitment: postFundState, signature },
          penultimateCommitment: state.lastCommitment,
        }),
        sideEffects: {
          messageOutbox: [fundingSuccess(state.channelId, state.lastCommitment.commitment)],
        },
      };
    default:
      return { state };
  }
};

const bWaitForPostFundSetupReducer = (
  state: states.BWaitForPostFundSetup,
  action: actions.ChannelAction | internal.InternalAction,
): StateWithSideEffects<states.OpenedState> => {
  switch (action.type) {
    case COMMITMENT_RECEIVED:
      const { commitment, signature } = action;
      if (!validTransitionToPostFundState(state, commitment, signature)) {
        return { state };
      }

      const newState = { ...state, turnNum: commitment.turnNum };
      const {
        postFundSetupCommitment,
        commitmentSignature,
        sendCommitmentAction,
      } = composePostFundCommitment(newState);
      return {
        state: states.waitForUpdate({
          ...newState,
          turnNum: postFundSetupCommitment.turnNum,
          lastCommitment: { commitment: postFundSetupCommitment, signature: commitmentSignature },
          penultimateCommitment: { commitment, signature },
        }),
        sideEffects: {
          messageOutbox: [
            sendCommitmentAction,
            fundingSuccess(state.channelId, state.lastCommitment.commitment),
          ],
        },
      };
    default:
      return { state };
  }
};

const waitForFundingConfirmationReducer = (
  state: states.WaitForFundingConfirmation,
  action: actions.ChannelAction | internal.InternalAction,
): StateWithSideEffects<states.OpenedState> => {
  switch (action.type) {
    case internal.FUNDING_CONFIRMED:
      if (state.channelId === action.channelId) {
        const {
          postFundSetupCommitment,
          commitmentSignature,
          sendCommitmentAction,
        } = composePostFundCommitment(state);
        return {
          state: states.waitForUpdate({
            ...state,
            turnNum: postFundSetupCommitment.turnNum,
            penultimateCommitment: state.lastCommitment,
            lastCommitment: {
              commitment: postFundSetupCommitment,
              signature: commitmentSignature,
            },
          }),
          sideEffects: {
            messageOutbox: [
              sendCommitmentAction,
              fundingSuccess(state.channelId, state.lastCommitment.commitment),
            ],
          },
        };
      } else {
        return { state };
      }

    default:
      return { state };
  }
};

const validTransitionToPostFundState = (
  state: states.FundingState,
  data: Commitment,
  signature: string | undefined,
) => {
  if (!signature) {
    return false;
  }

  const opponentAddress = state.participants[1 - state.ourIndex];

  if (!validCommitmentSignature(data, signature, opponentAddress)) {
    return false;
  }
  if (!validTransition(state, data)) {
    return false;
  }
  if (data.commitmentType !== 1) {
    return false;
  }
  return true;
};

const composePostFundCommitment = (
  state:
    | states.WaitForFundingAndPostFundSetup // This is exactly when A should send their commitment
    | states.WaitForFundingConfirmation // This is when B sends their commitment, if A sends too early
    | states.BWaitForPostFundSetup, // This is exactly when B should send their commitment
) => {
  // It's beneficial to lazily replace our previous commitment only when it is time
  // to send our new commitment, rather than eagerly replace it whenever the wallet knows
  // what the next commitment should be, as this is in line with one of the wallet's obligations:
  // - Only send a post-fund setup commitment after the channel is fully funded.
  const { libraryAddress, channelNonce, participants, turnNum, lastCommitment } = state;
  const channel: Channel = { channelType: libraryAddress, nonce: channelNonce, participants };

  const postFundSetupCommitment: Commitment = {
    channel,
    commitmentType: CommitmentType.PostFundSetup,
    turnNum: turnNum + 1,
    commitmentCount: state.ourIndex,
    allocation: lastCommitment.commitment.allocation,
    destination: lastCommitment.commitment.destination,
    appAttributes: state.lastCommitment.commitment.appAttributes,
  };
  const commitmentSignature = signCommitment(postFundSetupCommitment, state.privateKey);

  const sendCommitmentAction = messageRelayRequested(state.participants[1 - state.ourIndex], {
    processId: state.channelId,
    protocol: WalletProtocol.DirectFunding,
    data: {
      commitment: postFundSetupCommitment,
      signature: commitmentSignature,
    },
  });
  return { postFundSetupCommitment, commitmentSignature, sendCommitmentAction };
};

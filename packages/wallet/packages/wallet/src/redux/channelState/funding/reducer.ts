import * as states from '../state';
import * as actions from '../actions';
import {
  internal,
  TRANSACTION_CONFIRMED,
  MESSAGE_RECEIVED,
  COMMITMENT_RECEIVED,
} from '../../actions';
import {
  messageRelayRequested,
  fundingSuccess,
  fundingFailure,
  showWallet,
  hideWallet,
} from 'magmo-wallet-client/lib/wallet-events';

import { unreachable, validTransition } from '../../../utils/reducer-utils';
import { signCommitment, validCommitmentSignature } from '../../../utils/signing-utils';

import { Channel, Commitment, CommitmentType } from 'fmg-core';
import { handleSignatureAndValidationMessages } from '../../../utils/state-utils';
import { StateWithSideEffects } from '../../utils';
import { WalletProcedure } from '../../types';

export const fundingReducer = (
  state: states.FundingState,
  action: actions.ChannelAction | internal.DirectFundingConfirmed,
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
    // Setup funding process
    case states.WAIT_FOR_FUNDING_REQUEST:
      return waitForFundingRequestReducer(state, action);
    case states.WAIT_FOR_FUNDING_APPROVAL:
      return approveFundingReducer(state, action);

    // Funding is ongoing
    case states.WAIT_FOR_FUNDING_AND_POST_FUND_SETUP:
      return waitForFundingAndPostFundSetupReducer(state, action);
    case states.WAIT_FOR_FUNDING_CONFIRMATION:
      return waitForFundingConfirmationReducer(state, action);
    case states.A_WAIT_FOR_POST_FUND_SETUP:
      return aWaitForPostFundSetupReducer(state, action);
    case states.B_WAIT_FOR_POST_FUND_SETUP:
      return bWaitForPostFundSetupReducer(state, action);

    // Ending the stage
    case states.ACKNOWLEDGE_FUNDING_SUCCESS:
      return acknowledgeFundingSuccessReducer(state, action);
    case states.ACKNOWLEDGE_FUNDING_DECLINED:
      return acknowledgeFundingDeclinedReducer(state, action);
    //
    default:
      return unreachable(state);
  }
};

const waitForFundingRequestReducer = (
  state: states.WaitForFundingRequest,
  action: actions.ChannelAction | internal.InternalAction,
): StateWithSideEffects<states.OpenedState> => {
  switch (action.type) {
    case actions.FUNDING_REQUESTED:
      return {
        state: states.approveFunding({ ...state }),
        sideEffects: { displayOutbox: showWallet() },
      };
    default:
      return { state };
  }
};

const approveFundingReducer = (
  state: states.WaitForFundingApproval,
  action: actions.ChannelAction | internal.InternalAction,
): StateWithSideEffects<states.OpenedState | states.WaitForChannel> => {
  switch (action.type) {
    case actions.FUNDING_APPROVED:
      return {
        state: states.waitForFundingAndPostFundSetup(state),
      };
    case actions.FUNDING_REJECTED:
      const relayFundingDeclinedMessage = messageRelayRequested(
        state.participants[1 - state.ourIndex],
        {
          channelId: state.channelId,
          procedure: WalletProcedure.DirectFunding,
          data: 'FundingDeclined',
        },
      );
      const fundingFailureMessage = fundingFailure(state.channelId, 'FundingDeclined');
      return {
        state: states.waitForChannel({ ...state }),
        sideEffects: {
          messageOutbox: [relayFundingDeclinedMessage, fundingFailureMessage],
          displayOutbox: hideWallet(),
        },
      };
    case MESSAGE_RECEIVED:
      if (action.data === 'FundingDeclined') {
        return { state: states.acknowledgeFundingDeclined(state) };
      } else {
        return { state };
      }
    case actions.FUNDING_DECLINED_ACKNOWLEDGED:
      return { state: states.approveFunding({ ...state, unhandledAction: action }) };
    default:
      return { state };
  }
};

const waitForFundingAndPostFundSetupReducer = (
  state: states.WaitForFundingAndPostFundSetup,
  action: actions.ChannelAction | internal.InternalAction,
): StateWithSideEffects<states.OpenedState> => {
  switch (action.type) {
    case MESSAGE_RECEIVED:
      if (action.data === 'FundingDeclined') {
        return {
          state: states.acknowledgeFundingDeclined({ ...state }),
        };
      } else {
        return { state };
      }
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

    case internal.DIRECT_FUNDING_CONFIRMED:
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

    case TRANSACTION_CONFIRMED:
      // WARNING: This is pretty brittle
      if (state.funded) {
        // Player B can now confirm funding and is only waiting on post fund setup
        if (state.ourIndex === 0) {
          return {
            state: states.aWaitForPostFundSetup({ ...state }),
          };
        } else {
          return {
            state: states.bWaitForPostFundSetup({ ...state }),
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
        state: states.acknowledgeFundingSuccess({
          ...state,
          turnNum: postFundState.turnNum,
          lastCommitment: { commitment: postFundState, signature },
          penultimateCommitment: state.lastCommitment,
        }),
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
        state: states.acknowledgeFundingSuccess({
          ...newState,
          turnNum: postFundSetupCommitment.turnNum,
          lastCommitment: { commitment: postFundSetupCommitment, signature: commitmentSignature },
          penultimateCommitment: { commitment, signature },
        }),
        sideEffects: { messageOutbox: sendCommitmentAction },
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
    case internal.DIRECT_FUNDING_CONFIRMED:
      if (state.channelId === action.channelId) {
        const {
          postFundSetupCommitment,
          commitmentSignature,
          sendCommitmentAction,
        } = composePostFundCommitment(state);
        return {
          state: states.acknowledgeFundingSuccess({
            ...state,
            turnNum: postFundSetupCommitment.turnNum,
            penultimateCommitment: state.lastCommitment,
            lastCommitment: {
              commitment: postFundSetupCommitment,
              signature: commitmentSignature,
            },
          }),
          sideEffects: { messageOutbox: sendCommitmentAction },
        };
      } else {
        return { state };
      }

    default:
      return { state };
  }
};

const acknowledgeFundingDeclinedReducer = (
  state: states.AcknowledgeFundingDeclined,
  action: actions.ChannelAction | internal.InternalAction,
): StateWithSideEffects<states.ChannelStatus> => {
  switch (action.type) {
    case actions.FUNDING_DECLINED_ACKNOWLEDGED:
      return {
        state: states.waitForChannel({
          ...state,
        }),
        sideEffects: {
          messageOutbox: fundingFailure(state.channelId, 'FundingDeclined'),
          displayOutbox: hideWallet(),
        },
      };
  }
  return { state };
};

const acknowledgeFundingSuccessReducer = (
  state: states.AcknowledgeFundingSuccess,
  action: actions.ChannelAction | internal.InternalAction,
): StateWithSideEffects<states.OpenedState> => {
  switch (action.type) {
    case actions.FUNDING_SUCCESS_ACKNOWLEDGED:
      return {
        state: states.waitForUpdate({
          ...state,
        }),
        sideEffects: {
          displayOutbox: hideWallet(),
          messageOutbox: fundingSuccess(state.channelId, state.lastCommitment.commitment),
        },
      };
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
    channelId: state.channelId,
    procedure: WalletProcedure.DirectFunding,
    data: {
      commitment: postFundSetupCommitment,
      signature: commitmentSignature,
    },
  });
  return { postFundSetupCommitment, commitmentSignature, sendCommitmentAction };
};

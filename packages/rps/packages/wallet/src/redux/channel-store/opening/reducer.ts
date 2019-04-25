import * as channelStates from '../state';
import * as actions from '../../actions';
import {
  signatureSuccess,
  validationSuccess,
  signatureFailure,
  validationFailure,
} from 'magmo-wallet-client/lib/wallet-events';

import { signCommitment, validCommitmentSignature } from '../../../utils/signing-utils';
import { CommitmentType } from 'fmg-core';
import { StateWithSideEffects } from '../../utils';

export const openingReducer = (
  state: channelStates.WaitForPreFundSetup,
  action: actions.WalletAction,
): StateWithSideEffects<
  channelStates.WaitForPreFundSetup | channelStates.WaitForFundingAndPostFundSetup
> => {
  switch (action.type) {
    case actions.channel.OWN_COMMITMENT_RECEIVED:
      const ownCommitment = action.commitment;

      // check it's a PreFundSetupB
      if (ownCommitment.commitmentType !== CommitmentType.PreFundSetup) {
        return {
          state,
          sideEffects: {
            messageOutbox: signatureFailure('Other', 'Expected a prefund setup position.'),
          },
        };
      }
      if (ownCommitment.commitmentCount !== 1) {
        return {
          state,
          sideEffects: {
            messageOutbox: signatureFailure('Other', 'Expected state count to be 1.'),
          },
        };
      }

      const signature = signCommitment(ownCommitment, state.privateKey);

      // if so, unpack its contents into the state
      return {
        state: channelStates.waitForFundingAndPostFundSetup({
          ...state,
          turnNum: 1,
          lastCommitment: { commitment: ownCommitment, signature },
          penultimateCommitment: state.lastCommitment,
          funded: false,
        }),
        sideEffects: { messageOutbox: signatureSuccess(signature) },
      };

    case actions.channel.OPPONENT_COMMITMENT_RECEIVED:
      const opponentCommitment = action.commitment;

      // check it's a PreFundSetupB
      if (opponentCommitment.commitmentType !== CommitmentType.PreFundSetup) {
        return {
          state,
          sideEffects: {
            messageOutbox: validationFailure('Other', 'Expected a prefund setup position.'),
          },
        };
      }

      if (opponentCommitment.commitmentCount !== 1) {
        return {
          state,
          sideEffects: {
            messageOutbox: validationFailure('Other', 'Expected state count to be 1.'),
          },
        };
      }
      const opponentAddress2 = state.participants[1 - state.ourIndex];

      if (!validCommitmentSignature(action.commitment, action.signature, opponentAddress2)) {
        return {
          state,
          sideEffects: { messageOutbox: validationFailure('InvalidSignature') },
        };
      }

      // if so, unpack its contents into the state
      return {
        state: channelStates.waitForFundingAndPostFundSetup({
          ...state,
          turnNum: 1,
          lastCommitment: { commitment: action.commitment, signature: action.signature },
          penultimateCommitment: state.lastCommitment,
          funded: false,
        }),
        sideEffects: { messageOutbox: validationSuccess() },
      };

    default:
      return { state };
  }
};

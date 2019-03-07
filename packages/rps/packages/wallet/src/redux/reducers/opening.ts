import * as states from '../states';
import * as actions from '../actions';
import {
  signatureSuccess,
  validationSuccess,
  signatureFailure,
  validationFailure,
} from 'magmo-wallet-client/lib/wallet-events';

import { unreachable } from '../../utils/reducer-utils';
import { signCommitment, validCommitmentSignature } from '../../utils/signing-utils';
import { CommitmentType } from 'fmg-core';
import { bigNumberify } from 'ethers/utils';
import { channelID } from 'fmg-core/lib/channel';

export const openingReducer = (
  state: states.OpeningState,
  action: actions.WalletAction,
): states.WalletState => {
  switch (state.type) {
    case states.WAIT_FOR_CHANNEL:
      return waitForChannelReducer(state, action);
    case states.WAIT_FOR_PRE_FUND_SETUP:
      return waitForPreFundSetupReducer(state, action);
    default:
      return unreachable(state);
  }
};

const waitForChannelReducer = (state: states.WaitForChannel, action: actions.WalletAction) => {
  switch (action.type) {
    case actions.LOGGED_IN:
      const { uid } = action;
      return states.waitForAddress({ ...state, uid });
    case actions.OWN_COMMITMENT_RECEIVED:
      const ownCommitment = action.commitment;

      // check it's a PreFundSetupA
      if (ownCommitment.commitmentType !== CommitmentType.PreFundSetup) {
        // Since these checks are happening during a signature request we'll return a sig failure
        return {
          ...state,
          messageOutbox: signatureFailure('Other', 'Expected a pre fund setup position.'),
        };
      }
      if (ownCommitment.commitmentCount !== 0) {
        return { ...state, messageOutbox: signatureFailure('Other', 'Expected state count to 0.') };
      }

      const ourAddress = ownCommitment.channel.participants[0] as string;

      if (ourAddress !== state.address) {
        return {
          ...state,
          messageOutbox: signatureFailure(
            'Other',
            'Address provided does not match the one stored in the wallet.',
          ),
        };
      }

      const signature = signCommitment(ownCommitment, state.privateKey);
      // if so, unpack its contents into the state
      return states.waitForPreFundSetup({
        ...state,
        libraryAddress: ownCommitment.channel.channelType,
        channelId: channelID(ownCommitment.channel),
        ourIndex: ownCommitment.channel.participants.indexOf(state.address),
        participants: ownCommitment.channel.participants as [string, string],
        channelNonce: ownCommitment.channel.nonce,
        turnNum: 0,
        lastCommitment: { commitment: ownCommitment, signature },
        messageOutbox: signatureSuccess(signature),
        requestedTotalFunds: '0x0',
        requestedYourDeposit: '0x0',
      });

    case actions.OPPONENT_COMMITMENT_RECEIVED:
      const opponentCommitment = action.commitment;

      // all these checks will fail silently for the time being
      // check it's a PreFundSetupA
      if (opponentCommitment.commitmentType !== CommitmentType.PreFundSetup) {
        return {
          ...state,
          messageOutbox: validationFailure('Other', 'Expected a prefund setup position'),
        };
      }
      if (opponentCommitment.commitmentCount !== 0) {
        return {
          ...state,
          messageOutbox: validationFailure('Other', 'Expected state count to be 0'),
        };
      }

      const ourAddress2 = opponentCommitment.channel.participants[1] as string;
      const opponentAddress2 = opponentCommitment.channel.participants[0] as string;

      if (!validCommitmentSignature(action.commitment, action.signature, opponentAddress2)) {
        return { ...state, messageOutbox: validationFailure('InvalidSignature') };
      }

      if (ourAddress2 !== state.address) {
        return {
          ...state,
          messageOutbox: validationFailure(
            'Other',
            'Address provided does not match the one stored in the wallet.',
          ),
        };
      }

      // if so, unpack its contents into the state
      return states.waitForPreFundSetup({
        ...state,
        libraryAddress: opponentCommitment.channel.channelType,
        channelId: channelID(opponentCommitment.channel),
        ourIndex: opponentCommitment.channel.participants.indexOf(state.address),
        participants: opponentCommitment.channel.participants as [string, string],
        channelNonce: opponentCommitment.channel.nonce,
        turnNum: 0,
        lastCommitment: { commitment: action.commitment, signature: action.signature },
        messageOutbox: validationSuccess(),
        requestedTotalFunds: '0x0',
        requestedYourDeposit: '0x0',
      });

    default:
      return state;
  }
};

const waitForPreFundSetupReducer = (
  state: states.WaitForPreFundSetup,
  action: actions.WalletAction,
) => {
  switch (action.type) {
    case actions.OWN_COMMITMENT_RECEIVED:
      const ownCommitment = action.commitment;

      // check it's a PreFundSetupB
      if (ownCommitment.commitmentType !== CommitmentType.PreFundSetup) {
        return {
          ...state,
          messageOutbox: signatureFailure('Other', 'Expected a prefund setup position.'),
        };
      }
      if (ownCommitment.commitmentCount !== 1) {
        return {
          ...state,
          messageOutbox: signatureFailure('Other', 'Expected state count to be 1.'),
        };
      }

      const signature = signCommitment(ownCommitment, state.privateKey);

      // if so, unpack its contents into the state
      return states.waitForFundingRequest({
        ...state,
        turnNum: 1,
        lastCommitment: { commitment: ownCommitment, signature },
        penultimateCommitment: state.lastCommitment,
        messageOutbox: signatureSuccess(signature),
        requestedTotalFunds: bigNumberify(ownCommitment.allocation[0])
          .add(ownCommitment.allocation[1])
          .toHexString(),
        requestedYourDeposit: ownCommitment.allocation[state.ourIndex],
      });

    case actions.OPPONENT_COMMITMENT_RECEIVED:
      const opponentCommitment = action.commitment;

      // check it's a PreFundSetupB
      if (opponentCommitment.commitmentType !== CommitmentType.PreFundSetup) {
        return {
          ...state,
          messageOutbox: validationFailure('Other', 'Expected a prefund setup position.'),
        };
      }

      if (opponentCommitment.commitmentCount !== 1) {
        return {
          ...state,
          messageOutbox: validationFailure('Other', 'Expected state count to be 1.'),
        };
      }
      const opponentAddress2 = state.participants[1 - state.ourIndex];

      if (!validCommitmentSignature(action.commitment, action.signature, opponentAddress2)) {
        return { ...state, messageOutbox: validationFailure('InvalidSignature') };
      }

      // if so, unpack its contents into the state
      return states.waitForFundingRequest({
        ...state,
        turnNum: 1,
        lastCommitment: { commitment: action.commitment, signature: action.signature },
        penultimateCommitment: state.lastCommitment,
        messageOutbox: validationSuccess(),
        requestedTotalFunds: bigNumberify(opponentCommitment.allocation[0])
          .add(opponentCommitment.allocation[1])
          .toHexString(),
        requestedYourDeposit: opponentCommitment.allocation[state.ourIndex],
      });

    default:
      return state;
  }
};

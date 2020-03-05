import {
  ChannelConstants,
  Participant,
  Outcome,
  SignedState
} from '@statechannels/xstate-wallet/lib/src/store/types';
import {bigNumberify} from 'ethers/utils';
import {ethers} from 'ethers';
import {cHubStateChannelPK, cHubStateChannelAddress} from '../../constants';
import {AddressZero} from 'ethers/constants';
import {firstState, signState} from '@statechannels/xstate-wallet/lib/src/store/state-utils';
import * as R from 'ramda';

const wallet1 = new ethers.Wallet(
  '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318'
); // 0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf

export const wallet2 = new ethers.Wallet(
  '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727'
); // 0x2222E21c8019b14dA16235319D34b5Dd83E644A9

const first: Participant = {
  signingAddress: wallet1.address,
  destination: '0x0000000000000000000000000000000000000000000000000000000000000001',
  participantId: 'a'
};

const hub: Participant = {
  signingAddress: cHubStateChannelAddress,
  destination: '0x0000000000000000000000000000000000000000000000000000000000000002',
  participantId: 'hub'
};

const second: Participant = {
  signingAddress: wallet2.address,
  destination: '0x0000000000000000000000000000000000000000000000000000000000000003',
  participantId: 'a'
};

export const participants: [Participant, Participant, Participant] = [first, hub, second];

const chainId = '0x01';
const challengeDuration = bigNumberify(10);
const appDefinition = AddressZero;

const channel: ChannelConstants = {
  channelNonce: bigNumberify(0),
  chainId,
  challengeDuration,
  participants: R.slice(0, 2, participants),
  appDefinition
};

const channel3: ChannelConstants = {
  channelNonce: bigNumberify(0),
  chainId,
  challengeDuration,
  participants,
  appDefinition
};

const destinations = participants.map(p => p.destination);
const amounts = [bigNumberify(7), bigNumberify(5), bigNumberify(3)];
const outcome: Outcome = {
  type: 'SimpleAllocation',
  assetHolderAddress: AddressZero,
  allocationItems: [0, 1].map(i => ({
    destination: destinations[i],
    amount: amounts[i]
  }))
};

const outcome3: Outcome = {
  type: 'SimpleAllocation',
  assetHolderAddress: AddressZero,
  allocationItems: [0, 1, 2].map(i => ({
    destination: destinations[i],
    amount: amounts[i]
  }))
};

const ledgerState = firstState(outcome, channel);
export const ledgerStateMessage: SignedState = {
  ...ledgerState,
  signatures: [signState(ledgerState, wallet1.privateKey)]
};

export const ledgerStateResponse: SignedState = {
  ...ledgerState,
  signatures: [
    signState(ledgerState, wallet1.privateKey),
    signState(ledgerState, cHubStateChannelPK)
  ]
};

const ledgerState3 = firstState(outcome3, channel3);
export const ledgerStateMessage3: SignedState = {
  ...ledgerState3,
  signatures: [signState(ledgerState3, wallet1.privateKey)]
};

export const ledgerStateResponse3: SignedState = {
  ...ledgerState3,
  signatures: [
    signState(ledgerState3, wallet1.privateKey),
    signState(ledgerState3, cHubStateChannelPK)
  ]
};

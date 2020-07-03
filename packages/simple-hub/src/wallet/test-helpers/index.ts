import {
  ChannelConstants,
  Participant,
  Outcome,
  SignedState,
  State,
  firstState,
  signState
} from '../xstate-wallet-internals';
import {ethers, BigNumber} from 'ethers';
import {
  cHubChannelPK,
  cHubChannelSigningAddress,
  cHubParticipantId,
  cHubChainDestination
} from '../../constants';
import {AddressZero} from '@ethersproject/constants';
import * as _ from 'lodash/fp';

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
  signingAddress: cHubChannelSigningAddress,
  destination: cHubChainDestination,
  participantId: cHubParticipantId
};

const second: Participant = {
  signingAddress: wallet2.address,
  destination: '0x0000000000000000000000000000000000000000000000000000000000000003',
  participantId: 'b'
};

export const participants: [Participant, Participant, Participant] = [first, hub, second];

const chainId = '0x01';
const challengeDuration = 10;
const appDefinition = AddressZero;

const channel: ChannelConstants = {
  channelNonce: 0,
  chainId,
  challengeDuration,
  participants: _.slice(0, 2, participants),
  appDefinition
};

const channel3: ChannelConstants = {
  channelNonce: 0,
  chainId,
  challengeDuration,
  participants,
  appDefinition
};

const destinations = [
  participants[1].destination,
  participants[0].destination,
  participants[2].destination
];
const amounts = [BigNumber.from(7), BigNumber.from(5), BigNumber.from(3)];
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
export const ledgerStateIncoming: SignedState = {
  ...ledgerState,
  signatures: [signState(ledgerState, wallet1.privateKey)]
};

export const ledgerStateResponse: SignedState = {
  ...ledgerState,
  signatures: [signState(ledgerState, wallet1.privateKey), signState(ledgerState, cHubChannelPK)]
};

export const ledgerStateResponse2: SignedState = {
  ...ledgerState,
  turnNum: 1,
  signatures: [signState(ledgerState, wallet1.privateKey), signState(ledgerState, cHubChannelPK)]
};

const ledgerState3 = firstState(outcome3, channel3);
export const ledgerStateIncoming3: SignedState = {
  ...ledgerState3,
  signatures: [signState(ledgerState3, wallet1.privateKey)]
};

export const ledgerStateResponse3: SignedState = {
  ...ledgerState3,
  signatures: [signState(ledgerState3, wallet1.privateKey), signState(ledgerState3, cHubChannelPK)]
};

const ledgerState3_2: State = {...ledgerState3, turnNum: 1};
export const ledgerStateIncoming3_2: SignedState = {
  ...ledgerState3_2,
  signatures: [signState(ledgerState3_2, wallet1.privateKey)]
};

export const ledgerStateResponse3_2: SignedState = {
  ...ledgerState3_2,
  signatures: [
    signState(ledgerState3_2, wallet1.privateKey),
    signState(ledgerState3_2, cHubChannelPK)
  ]
};

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

const wallet1 = new ethers.Wallet(
  '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318'
); // 0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf

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
export const participants: [Participant, Participant] = [first, hub];

const chainId = '0x01';
const challengeDuration = bigNumberify(10);
const appDefinition = AddressZero;

const channel: ChannelConstants = {
  channelNonce: bigNumberify(0),
  chainId,
  challengeDuration,
  participants,
  appDefinition
};

const destinations = participants.map(p => p.destination);
const amounts = [bigNumberify(7), bigNumberify(5)];
const outcome: Outcome = {
  type: 'SimpleAllocation',
  assetHolderAddress: AddressZero,
  allocationItems: [0, 1].map(i => ({
    destination: destinations[i],
    amount: amounts[i]
  }))
};

const ledgerState = firstState(outcome, channel);
export const ledgerState1: SignedState = {
  ...ledgerState,
  signatures: [signState(ledgerState, wallet1.privateKey)]
};

export const ledgerState2: SignedState = {
  ...ledgerState,
  signatures: [
    signState(ledgerState, wallet1.privateKey),
    signState(ledgerState, cHubStateChannelPK)
  ]
};

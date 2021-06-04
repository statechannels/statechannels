import {Signature} from '@ethersproject/bytes';
import {Wallet} from '@ethersproject/wallet';

import {
  Bytes32,
  Channel,
  convertAddressToBytes32,
  encodeOutcome,
  getChannelId,
  getFixedPart,
  hashAppPart,
  signState,
  State,
} from '../src';
import {FixedPart} from '../src/contract/state';
import {Bytes} from '../src/contract/types';

export const chainId = '0x7a69'; // 31337 in hex (hardhat network default)
export const channelNonce = 2;

export const Alice = new Wallet(
  '0x277fb9e0ad81dc836c60294e385b10dfcc0a9586eeb0b1d31da92e384a0d2efa'
);
export const Bob = new Wallet('0xc8774aa98410b3e3281ff1ec40ea2637d2b9280328c4d1ff00d06cd95dd42cbd');
export const participants = [Alice.address, Bob.address];

const channel: Channel = {chainId, channelNonce, participants};
export const channelId = getChannelId(channel);

export function finalState(assetHolderAddress: string): State {
  return {
    challengeDuration: 600,
    appDefinition: '0x8504FcA6e1e73947850D66D032435AC931892116',
    channel,
    turnNum: 6,
    isFinal: true,
    outcome: [
      {
        assetHolderAddress,
        allocationItems: [
          {destination: convertAddressToBytes32(Alice.address), amount: '0x5'},
          {destination: convertAddressToBytes32(Bob.address), amount: '0x5'},
        ],
      },
    ],
    appData: '0x', // TODO choose a more representative example
  };
}

export function finalizationProof(
  state: State
): {
  largestTurnNum: number;
  fixedPart: FixedPart;
  appPartHash: Bytes32;
  outcomeBytes: Bytes;
  numStates: 1;
  whoSignedWhat: [0, 0];
  sigs: [Signature, Signature];
} {
  return {
    largestTurnNum: state.turnNum,
    fixedPart: getFixedPart(state),
    appPartHash: hashAppPart(state),
    outcomeBytes: encodeOutcome(state.outcome),
    numStates: 1,
    whoSignedWhat: [0, 0],
    sigs: [
      signState(state, Alice.privateKey).signature,
      signState(state, Bob.privateKey).signature,
    ],
  };
}

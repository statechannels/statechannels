import {Signature} from '@ethersproject/bytes';
import {Wallet} from '@ethersproject/wallet';
import {constants, ContractReceipt} from 'ethers';

import {
  Bytes32,
  Channel,
  convertAddressToBytes32,
  encodeOutcome,
  getChannelId,
  getFixedPart,
  hashAppPart,
  signChallengeMessage,
  SignedState,
  signState,
  State,
} from '../src';
import {FixedPart, getVariablePart, hashState, VariablePart} from '../src/contract/state';
import {Bytes} from '../src/contract/types';

import {nitroAdjudicator, provider} from './vanillaSetup';

export const chainId = '0x7a69'; // 31337 in hex (hardhat network default)
export const channelNonce = 2;

export const Alice = new Wallet(
  '0x277fb9e0ad81dc836c60294e385b10dfcc0a9586eeb0b1d31da92e384a0d2efa'
);
export const Bob = new Wallet('0xc8774aa98410b3e3281ff1ec40ea2637d2b9280328c4d1ff00d06cd95dd42cbd');
export const participants = [Alice.address, Bob.address];

export const channel: Channel = {chainId, channelNonce, participants};
export const channelId = getChannelId(channel);

export const someOtherChannelId = getChannelId({...channel, channelNonce: 1337});

export function someState(assetHolderAddress: string): State {
  return {
    challengeDuration: 600,
    appDefinition: '0x8504FcA6e1e73947850D66D032435AC931892116',
    channel,
    turnNum: 6,
    isFinal: false,
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

export function someLedgerState(assetHolderAddress: string): State {
  return {
    challengeDuration: 600,
    appDefinition: constants.AddressZero,
    channel: ledgerChannel,
    turnNum: 6,
    isFinal: false,
    outcome: [
      {
        assetHolderAddress,
        allocationItems: [{destination: channelId, amount: '0xa'}],
      },
    ],
    appData: '0x',
  };
}

export function finalState(assetHolderAddress: string): State {
  return {
    ...someState(assetHolderAddress),
    isFinal: true,
  };
}

export function counterSignedSupportProof( // for challenging and outcome pushing
  state: State
): {
  largestTurnNum: number;
  fixedPart: FixedPart;
  variableParts: VariablePart[];
  isFinalCount: number;
  whoSignedWhat: [0, 0];
  signatures: [Signature, Signature];
  challengeSignature: Signature;
  outcomeBytes: string;
  stateHash: string;
  challengerAddress: string;
} {
  return {
    largestTurnNum: state.turnNum,
    fixedPart: getFixedPart(state),
    variableParts: [getVariablePart(state)],
    isFinalCount: 0,
    whoSignedWhat: [0, 0],
    signatures: [
      signState(state, Alice.privateKey).signature,
      signState(state, Bob.privateKey).signature,
    ],
    challengeSignature: signChallengeMessage([{state} as SignedState], Alice.privateKey),
    outcomeBytes: encodeOutcome(state.outcome),
    stateHash: hashState(state),
    challengerAddress: Alice.address,
  };
}

export function finalizationProof( // for concluding
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

export async function getFinalizesAtFromTransactionHash(hash: string): Promise<number> {
  const receipt = (await provider.getTransactionReceipt(hash)) as ContractReceipt;
  return nitroAdjudicator.interface.decodeEventLog('ChallengeRegistered', receipt.logs[0].data)[2];
}

export async function waitForChallengesToTimeOut(finalizesAtArray: number[]): Promise<void> {
  const finalizesAt = Math.max(...finalizesAtArray);
  await provider.send('evm_setNextBlockTimestamp', [finalizesAt + 1]);
  await provider.send('evm_mine', []);
}

export const ledgerChannel: Channel = {chainId, channelNonce: channelNonce + 10000, participants};
export const ledgerChannelId = getChannelId(ledgerChannel);

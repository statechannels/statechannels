import * as walletStates from '../redux/state';
import * as scenarios from '../redux/__tests__/test-scenarios';
import * as states from '../redux/state';

const {
  channelId,
  channelNonce,
  libraryAddress,
  participants,
  preFundCommitment0: preFundCommitment1,
  preFundCommitment1: preFundCommitment2,
} = scenarios;

export const defaultParams = {
  adjudicator: 'adj-address',
  channelId,
  channelNonce,
  libraryAddress,
  participants,
  uid: 'uid',
  lastCommitment: { commitment: preFundCommitment2, signature: 'fake-sig' },
  penultimateCommitment: { commitment: preFundCommitment1, signature: 'fake-sig' },
  turnNum: preFundCommitment2.turnNum,
  networkId: 3,
  challengeExpiry: 0,
  transactionHash: '0x0',
  userAddress: '0x0',
  funded: false,
};

////////////////////////////
// WALLET NOT INITIALIZED //
////////////////////////////

export const dummyWaitForLogin: walletStates.WalletState = walletStates.waitForLogin();
export const dummyWaitForMetaMask: walletStates.WalletState = walletStates.metaMaskError({
  ...dummyWaitForLogin,
});
//

////////////////////////////
// WALLET INITIALIZED //
////////////////////////////

const defaults = {
  ...states.EMPTY_SHARED_DATA,
  uid: 'uid',
  processStore: {},
  adjudicatorStore: {},
  address: 'address',
  privateKey: 'privateKey',
};

export const initializedState = states.initialized({ ...defaults });

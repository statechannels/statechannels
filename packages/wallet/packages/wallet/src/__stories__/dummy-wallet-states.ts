import * as walletStates from '../redux/state';
import * as scenarios from '../domain/commitments/__tests__';
import * as states from '../redux/state';

const { channelId, channelNonce, libraryAddress, participants } = scenarios;
const preFundCommitment1 = scenarios.appCommitment({ turnNum: 0 }).commitment;
const preFundCommitment2 = scenarios.appCommitment({ turnNum: 1 }).commitment;
export const defaultParams = {
  adjudicator: 'adj-address',
  channelId,
  channelNonce,
  libraryAddress,
  participants,
  uid: 'uid',
  commitments: [
    { commitment: preFundCommitment1, signature: 'fake-sig' },
    { commitment: preFundCommitment2, signature: 'fake-sig' },
  ],
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

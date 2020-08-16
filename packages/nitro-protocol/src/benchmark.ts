import {AddressZero, HashZero} from 'ethers/constants';
import {Wallet} from 'ethers';

import {initialized, signState} from './signatures';

const {address, privateKey} = Wallet.createRandom();

const state = {
  isFinal: false,
  channel: {
    chainId: '0x0',
    channelNonce: 0,
    participants: [address],
  },
  outcome: [
    {
      assetHolderAddress: AddressZero,
      allocationItems: [],
    },
  ],
  appDefinition: AddressZero,
  appData: HashZero,
  challengeDuration: 1,
  turnNum: 1,
};
console.log('START');

// const initialized = Promise.resolve();

initialized.then(() => {
  console.time('signState');
  Array(1000)
    .fill(undefined)
    .map((_, turnNum) => signState({...state, turnNum}, privateKey));
  console.timeEnd('signState');

  // console.time('getChannelId');
  // Array(10_000)
  //   .fill(undefined)
  //   .map(() => getChannelId(state.channel));
  // console.timeEnd('getChannelId');

  // const hashed = hashState(state);
  // console.time('signData');
  // Array(1000)
  //   .fill(undefined)
  //   .map(() => signData(hashed, privateKey));
  // console.timeEnd('signData');
});

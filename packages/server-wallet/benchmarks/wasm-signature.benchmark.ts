import { ethers, Wallet } from 'ethers';
import _ from 'lodash';
import { signState, State, simpleEthAllocation, toNitroState } from '@statechannels/wallet-core';
import { signState as wasmSignState } from '@statechannels/wasm-utils';

import { participant } from '../src/wallet/__test__/fixtures/participants';

async function benchmark(): Promise<void> {
  const wallet = Wallet.createRandom();
  const state: State = {
    chainId: '0x1',
    channelNonce: 0x01,
    participants: [participant({ signingAddress: wallet.address })],
    outcome: simpleEthAllocation([]),
    turnNum: 1,
    isFinal: false,
    appData: '0x00',
    appDefinition: ethers.constants.AddressZero,
    challengeDuration: 0x5,
  };

  const iter = _.range(1_000);
  console.time('signState');
  iter.map(() => signState(state, wallet.privateKey));
  console.timeEnd('signState');

  console.time('wasmSignState');
  iter.map(() => wasmSignState(toNitroState(state), wallet.privateKey));
  console.timeEnd('wasmSignState');
}

benchmark();

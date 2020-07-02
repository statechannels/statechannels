import React from 'react';
import ReactDOM from 'react-dom';
import {useMachine} from '@xstate/react';

import {machine} from './workflows/approve-budget-and-fund';
import {ethers} from 'ethers';
import {ChainWatcher} from '@statechannels/wallet-core/lib/src/chain';
import {MemoryBackend} from '@statechannels/wallet-core/lib/src/store/memory-backend';
import {TestStore} from '@statechannels/wallet-core/lib/src/test-store';
import {MessagingService} from '@statechannels/wallet-core/lib/src/messaging';
import {ethBudget} from '@statechannels/wallet-core/lib/src/utils/budget-utils';

const {privateKey} = ethers.Wallet.createRandom();
const chain = new ChainWatcher();
const backend = new MemoryBackend();
const store = new TestStore(chain, backend);
store.initialize([privateKey]);
const messagingService = new MessagingService(store);
const alice = {
  participantId: 'a',
  signingAddress: '0xa',
  destination: '0xad' as any
};
const hub = {
  participantId: 'b',
  signingAddress: '0xb',
  destination: '0xbd' as any
};
const testContext = {
  budget: ethBudget('rps.statechannels.org', {}),
  requestId: 55,
  player: alice,
  hub
};

const approveBudgetAndFund = machine(store, messagingService, testContext);

function Toggle() {
  const [current] = useMachine(approveBudgetAndFund, {devTools: true});

  return <div>{current.value}</div>;
}

ReactDOM.render(<Toggle />, document.getElementById('root'));

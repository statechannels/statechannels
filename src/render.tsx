import React from 'react';
import ReactDOM from 'react-dom';
import {useMachine} from '@xstate/react';

import {ethers} from 'ethers';
import {ethBudget} from '@statechannels/wallet-core';
import {ChainWatcher} from './chain';
import {MemoryBackend} from './store/memory-backend';
import {TestStore} from './test-store';
import {MessagingService} from './/messaging';
import {machine} from './workflows/approve-budget-and-fund';
import {NODE_ENV} from 'config';

let privateKey;
try {
  ({privateKey} = ethers.Wallet.createRandom());
} catch (e) {
  if (NODE_ENV !== 'development') {
    throw e;
  } else {
    console.warn(e);
    console.warn(
      'The warning above would be a runtime error if the NODE_ENV was not `development`. The error has been supressed to aid testing in jsdom.'
    );
  }
}
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

import React from 'react';
import ReactDOM from 'react-dom';
import {useMachine} from '@xstate/react';

import {machine} from './workflows/approve-budget-and-fund';
import {ethers} from 'ethers';
import {ChainWatcher} from './chain';
import {MemoryBackend} from './store/memory-backend';
import {TestStore} from './workflows/tests/store';
import {MessagingService} from './messaging';
import {ethBudget} from './utils/budget-utils';

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
  const [current, send] = useMachine(approveBudgetAndFund, {devTools: true});

  return (
    <button onClick={() => send('USER_APPROVES_BUDGET')}>
      {current.matches('inactive') ? 'Off' : 'On'}
    </button>
  );
}

ReactDOM.render(<Toggle />, document.getElementById('root'));

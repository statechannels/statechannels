import React from 'react';
import ReactDOM from 'react-dom';
import {useMachine} from '@xstate/react';

// import {machine} from './workflows/approve-budget-and-fund';
import {machine as directlyFundedAppMachine} from './workflows/directly-funded-app';
import {ethers} from 'ethers';
import {ChainWatcher} from './chain';
import {MemoryBackend} from './store/memory-backend';
import {TestStore} from './workflows/tests/store';
import {MessagingService} from './messaging';
// import {ethBudget} from './utils/budget-utils';

const {privateKey} = ethers.Wallet.createRandom();
const chain = new ChainWatcher();
const backend = new MemoryBackend();
const store = new TestStore(chain, backend);
store.initialize([privateKey]);
const messagingService = new MessagingService(store);
// const alice = {
//   participantId: 'a',
//   signingAddress: '0xa',
//   destination: '0xad' as any
// };
// const hub = {
//   participantId: 'b',
//   signingAddress: '0xb',
//   destination: '0xbd' as any
// };
const testContext = {
  channelId: '123'
};

const directlyFundedApp = directlyFundedAppMachine(store, messagingService, testContext);

function Toggle() {
  const [current] = useMachine(directlyFundedApp, {devTools: true});

  return <div>{current.value}</div>;
}

ReactDOM.render(<Toggle />, document.getElementById('root'));

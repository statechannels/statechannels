import {ethers} from 'ethers';

import {ChannelWallet} from './channel-wallet';
import {MessagingService} from './messaging';
import {ChainWatcher} from './chain';
import {IndexedDBBackend} from './store/indexedDB-backend';
import {MemoryBackend} from './store/memory-backend';
import {TestStore} from './workflows/tests/store';
import {State} from './store/types';
import {ETH_ASSET_HOLDER_ADDRESS, CHALLENGE_DURATION} from './constants';
import {makeDestination} from './utils/outcome';
import {bigNumberify} from 'ethers/utils';
import {calculateChannelId} from './store/state-utils';
(async function() {
  const {privateKey, address} = ethers.Wallet.createRandom();
  const chain = new ChainWatcher();
  const backend = process.env.USE_INDEXED_DB ? new IndexedDBBackend() : new MemoryBackend();
  const store = new TestStore(chain, backend);
  await store.initialize([privateKey]);
  const messagingService = new MessagingService(store);
  const channelWallet = new ChannelWallet(store, messagingService);

  // Communicate via postMessage
  window.addEventListener('message', async event => {
    if (event.data && event.data.jsonrpc && event.data.jsonrpc === '2.0') {
      process.env.ADD_LOGS &&
        console.log(`INCOMING JSONRPC REQUEST: ${JSON.stringify(event.data, null, 1)}`);
      channelWallet.pushMessage(event.data);
    }
  });
  channelWallet.onSendMessage(m => {
    window.parent.postMessage(m, '*');
    process.env.ADD_LOGS && console.log(`OUTGOING JSONRPC MESSAGE: ${JSON.stringify(m, null, 1)}`);
  });

  // Seed the store with a ledger channel.

  const state: State = {
    outcome: {
      type: 'SimpleAllocation',
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
      allocationItems: [
        {
          destination: makeDestination('0xaaaa84838319627fa056fc3fc29ab94d479b8502'),
          amount: bigNumberify('0x3b9aca00')
        },
        {
          destination: makeDestination('0x06C61e614f291840Da440BbDD8175dF4Ad5728b7'),
          amount: bigNumberify('0x3b9aca00')
        }
      ]
    },
    turnNum: bigNumberify('0x00'),
    appData: '0x0',
    isFinal: false,
    chainId: '9001',
    participants: [
      {destination: makeDestination(address), participantId: address, signingAddress: address},
      {
        destination: makeDestination('0xaaaa84838319627fa056fc3fc29ab94d479b8502'),
        signingAddress: '0xaaaa84838319627Fa056fC3FC29ab94d479B8502',
        participantId: 'firebase:simple-hub'
      }
    ],
    channelNonce: bigNumberify('0x00'),
    appDefinition: '0x0000000000000000000000000000000000000000',
    challengeDuration: CHALLENGE_DURATION
  };

  await store.createEntry({...state, signatures: ['mySig', 'hubSig']});
  await store.setLedger(calculateChannelId(state));
});

import {ethers} from 'ethers';

import {ChannelWallet} from './channel-wallet';
import {MessagingService} from './messaging';
import {ChainWatcher} from './chain';
import {IndexedDBBackend} from './store/indexedDB-backend';
import {MemoryBackend} from './store/memory-backend';
import {TestStore} from './workflows/tests/store';
import {State, Participant} from './store/types';
import {ETH_ASSET_HOLDER_ADDRESS, CHALLENGE_DURATION, HUB} from './constants';
import {makeDestination} from './utils/outcome';
import {bigNumberify} from 'ethers/utils';
import {calculateChannelId, signState} from './store/state-utils';
import {getProvider} from './utils/contract-utils';

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

  const me: Participant = {
    destination: makeDestination(
      await getProvider()
        .getSigner()
        .getAddress()
    ),
    participantId: address,
    signingAddress: address
  };
  const state: State = {
    outcome: {
      type: 'SimpleAllocation',
      assetHolderAddress: ETH_ASSET_HOLDER_ADDRESS,
      allocationItems: [
        {destination: HUB.destination, amount: ethers.utils.parseEther('1')},
        {destination: me.destination, amount: ethers.utils.parseEther('1')}
      ]
    },
    turnNum: bigNumberify('0x00'),
    appData: '0x0',
    isFinal: false,
    chainId: '9001',
    participants: [me, HUB],
    channelNonce: bigNumberify('0x00'),
    appDefinition: '0x0000000000000000000000000000000000000000',
    challengeDuration: CHALLENGE_DURATION
  };
  store.createEntry({
    ...state,
    signatures: [
      signState(state, '0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29'),
      signState(state, privateKey)
    ]
  });
  (store as any).setNonce(
    state.participants.map(p => p.signingAddress),
    bigNumberify(1)
  );
  const ledgerChannelId = calculateChannelId(state);
  store.setLedger(ledgerChannelId);
  await store.chain.deposit(ledgerChannelId, '0', ethers.utils.parseEther('2').toHexString());

  await store.createEntry({...state, signatures: ['mySig', 'hubSig']});
  await store.setLedger(calculateChannelId(state));
});

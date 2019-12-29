import {getChannelId, Channel} from '@statechannels/wallet-protocols';
import {Store} from './storage/store';
import * as ethers from 'ethers';
import {interpret, Interpreter} from 'xstate';
import {Wallet} from '@statechannels/wallet-protocols/lib/src/protocols';
import * as jrs from 'jsonrpc-lite';
import {validateRequest} from './json-rpc-validation/validator';
import {IStore} from '@statechannels/wallet-protocols/lib/src/store';
import {CreateChannelEvent} from '@statechannels/wallet-protocols/lib/src/protocols/wallet/protocol';
const ethersWallet = ethers.Wallet.createRandom();
const store: IStore = new Store({privateKeys: {[ethersWallet.address]: ethersWallet.privateKey}});

const machine = interpret<Wallet.Init, any, Wallet.Events>(
  Wallet.machine(store, {processes: [], id: 'wallet'})
)
  .onTransition(console.log)
  .onEvent(console.log)
  .start();

window.addEventListener('message', async event => {
  if (event.data && event.data.jsonrpc && event.data.jsonrpc === '2.0') {
    const jsonRpcMessage = event.data;
    const parsedMessage = jrs.parseObject(event.data);
    switch (parsedMessage.type) {
      case 'notification':
      case 'success':
        console.warn(`Received unexpected JSON-RPC message ${JSON.stringify(jsonRpcMessage)}`);
        break;
      case 'error':
        throw new Error('TODO: Respond with error message');

      case 'request':
        const validationResult = await validateRequest(jsonRpcMessage);
        if (!validationResult.isValid) {
          throw Error('Validation Failure');
        }
        const {id} = parsedMessage.payload;
        switch (parsedMessage.payload.method) {
          case 'GetAddress':
            const address = ethersWallet.address;
            window.parent.postMessage(jrs.success(id, address), '*');
            break;
          case 'CreateChannel':
            await handleCreateChannelMessage(parsedMessage.payload, machine, store, ethersWallet);
            break;
          case 'PushMessage':
            await handlePushMessage(parsedMessage.payload, machine, store, ethersWallet);
        }
        break;
    }
  }
});

async function handlePushMessage(
  payload: jrs.RequestObject,
  machine: Interpreter<Wallet.Init, any, Wallet.Events>,
  store: IStore,
  ethersWallet: ethers.Wallet
) {
  machine.send((payload.params as any).data as any);

  window.parent.postMessage(jrs.success(payload.id, {success: true}), '*');
}

async function handleCreateChannelMessage(
  payload: jrs.RequestObject,
  machine: Interpreter<Wallet.Init, any, Wallet.Events>,
  store: IStore,
  ethersWallet: ethers.Wallet
) {
  const params = payload.params as any;
  const {participants} = payload.params as any;

  const address = ethersWallet.address;
  const addressMatches = participants[0].signingAddress === address;

  if (!addressMatches) {
    throw new Error('TODO');
  } else {
    const createChannel: CreateChannelEvent = {
      type: 'CREATE_CHANNEL',
      participants: params.participants,
      allocations: params.allocations[0].allocationItems,
      appDefinition: params.appDefinition,
      appData: params.appData
    };

    // TODO: Nonce management / setting the chainID correctly (state machines)
    const channel: Channel = {
      participants: params.participants.map(p => p.signingAddress),
      channelNonce: '1',
      chainId: 'mainnet?'
    };
    machine.send(createChannel);

    const channelId = getChannelId(channel);
    const response = jrs.success(payload.id, await getChannelInfo(channelId, store));
    window.parent.postMessage(response, '*');
  }
}

async function getChannelInfo(channelId: string, store: IStore) {
  const latestState = store.getLatestState(channelId);
  const channelEntry = store.getEntry(channelId);
  const {participants} = channelEntry;
  const {appData, appDefinition, turnNum} = latestState;

  // TODO: Status and funding
  const funding = [];
  const status = 'opening';

  return {
    participants,
    allocations: [{token: '0x0', allocationItems: latestState.outcome}],
    appDefinition,
    appData,
    status,
    funding,
    turnNum,
    channelId
  };
}

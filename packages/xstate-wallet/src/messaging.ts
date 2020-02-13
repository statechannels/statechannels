import {
  UpdateChannelParams,
  CloseChannelParams,
  CreateChannelParams,
  PushMessageParams,
  JoinChannelParams,
  parseRequest,
  CreateChannelRequest,
  UpdateChannelRequest,
  PushMessageRequest,
  CloseChannelRequest
} from '@statechannels/client-api-schema';
import {
  getChannelId,
  Channel,
  CreateChannelEvent,
  AddressableMessage,
  unreachable
} from '@statechannels/wallet-protocols';
import * as ethers from 'ethers';
import {bigNumberify} from 'ethers/utils';
import * as jrs from 'jsonrpc-lite';

import {validateRequest} from './json-rpc-validation/validator';
import {
  createStateVarsFromUpdateChannelParams,
  createJsonRpcAllocationsFromOutcome
} from './utils/json-rpc-utils';
import {WorkflowManager} from './workflow-manager';
import {fromEvent, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {filterByPromise} from 'filter-async-rxjs-pipe';
import {Store} from './store';
import {ChannelStoreEntry} from './store/memory-channel-storage';

export function observeRequests(
  channelId: string
): Observable<JoinChannelParams | CloseChannelParams | UpdateChannelParams> {
  return fromEvent(window, 'message').pipe(
    filterByPromise(async (e: MessageEvent) => {
      if (!e || !e.data.jsonrpc || e.data.jsonrpc !== '2.0') {
        return false;
      }
      const parsedMessage = jrs.parseObject(e.data);
      if (parsedMessage.type !== 'request') {
        return false;
      }
      const validationResult = await validateRequest(e.data);
      if (!validationResult.isValid) {
        console.error(validationResult);
        return false;
      }
      if (
        e.data.type !== 'UpdateChannel' &&
        e.data.type !== 'CloseChannel' &&
        e.data.type !== 'JoinChannel'
      ) {
        return false;
      }
      return e.data.params.channelId === channelId;
    }),
    map((e: MessageEvent) => {
      return e.data.params;
    })
  );
}

async function metamaskUnlocked(): Promise<string> {
  return new Promise(function(resolve, reject) {
    function ifSelectedAddressThenResolve() {
      if (typeof window.ethereum.selectedAddress === 'string') {
        resolve(window.ethereum.selectedAddress);
      }
    }
    ifSelectedAddressThenResolve();
    window.ethereum.on('accountsChanged', function() {
      ifSelectedAddressThenResolve();
    });
  });
}

export async function handleMessage(
  event,
  workflowManager: WorkflowManager,
  store: Store,
  ourWallet: ethers.Wallet
) {
  const request = parseRequest(event.data);
  const {id} = request;

  switch (request.method) {
    case 'GetAddress':
      const address = ourWallet.address;
      window.parent.postMessage(jrs.success(id, address), '*');
      break;
    case 'GetEthereumSelectedAddress':
      //  ask metamask permission to access accounts
      await window.ethereum.enable();
      //  block until accounts changed
      //  (indicating user acceptance)
      const ethereumSelectedAddress: string = await metamaskUnlocked();
      window.parent.postMessage(jrs.success(id, ethereumSelectedAddress), '*');
      break;
    case 'CreateChannel':
      await handleCreateChannelMessage(request, workflowManager, store, ourWallet);
      break;
    case 'UpdateChannel':
      await handleUpdateChannel(request, workflowManager, store);
      break;
    case 'PushMessage':
      await handlePushMessage(request, workflowManager);
      break;
    case 'CloseChannel':
      await handleCloseChannel(request, workflowManager, store);
      break;
    case 'JoinChannel':
      await handleJoinChannel(request, store);
      break;
    case 'GetBudget':
    case 'ChallengeChannel':
      // TODO: handle these requests
      break;
    default:
      unreachable(request);
  }
}

async function handleJoinChannel(payload: {id: jrs.ID; params: JoinChannelParams}, store: Store) {
  // TODO: The application workflow should be updated to wait until we get a  join channel from the client
  const {id} = payload;
  const {channelId} = payload.params;
  const result = jrs.success(id, await getChannelInfo(await store.getEntry(channelId)));
  window.parent.postMessage(result, '*');
}

async function handleCloseChannel(
  payload: CloseChannelRequest,
  workflowManager: WorkflowManager,
  store: Store
) {
  const {id} = payload;
  const {channelId} = payload.params as CloseChannelParams;
  workflowManager.dispatchToWorkflows({type: 'PLAYER_REQUEST_CONCLUDE', channelId});
  const result = jrs.success(id, await getChannelInfo(await store.getEntry(channelId)));
  window.parent.postMessage(result, '*');
}

async function handleUpdateChannel(
  payload: UpdateChannelRequest,
  workflowManager: WorkflowManager,
  store: Store
) {
  const params = payload.params as UpdateChannelParams;
  const entry = await store.getEntry(params.channelId);
  const {latest} = entry;

  const state = createStateVarsFromUpdateChannelParams(latest, params);
  workflowManager.dispatchToWorkflows({type: 'PLAYER_STATE_UPDATE', state});
  window.parent.postMessage(jrs.success(payload.id, await getChannelInfo(entry)), '*');
  dispatchChannelUpdatedMessage(entry);
}

async function handlePushMessage(payload: PushMessageRequest, workflowManager: WorkflowManager) {
  const {data: event} = payload.params as PushMessageParams;
  // TODO WE Should probably verify that the data is an event
  workflowManager.dispatchToWorkflows(event as any);

  window.parent.postMessage(
    jrs.success(payload.id, {
      success: true
    }),
    '*'
  );
}

async function handleCreateChannelMessage(
  payload: CreateChannelRequest,
  workflowManager: WorkflowManager,
  store: Store,
  ethersWallet: ethers.Wallet
) {
  const params = payload.params as CreateChannelParams;
  const {participants} = payload.params as any;

  const address = ethersWallet.address;
  const addressMatches = participants[0].signingAddress === address;

  if (!addressMatches) {
    throw new Error('TODO');
  } else {
    const createChannel: CreateChannelEvent = {
      type: 'CREATE_CHANNEL',
      participants: params.participants,
      allocations: params.allocations,
      appDefinition: params.appDefinition,
      appData: params.appData,
      chainId: process.env.NETWORK_CHAIN_ID || '0',
      challengeDuration: 500
    };

    const channel: Channel = {
      participants: params.participants.map(p => p.signingAddress),
      channelNonce: '1',
      chainId: process.env.NETWORK_CHAIN_ID || '0'
    };
    const channelId = getChannelId(channel);
    workflowManager.dispatchToWorkflows(createChannel);

    const response = jrs.success(payload.id, await getChannelInfo(await store.getEntry(channelId)));
    window.parent.postMessage(response, '*');
  }
}

async function getChannelInfo(channelEntry: ChannelStoreEntry) {
  const {latest, channelId} = channelEntry;
  const {appData, turnNum} = latest;
  const {participants, appDefinition} = channelEntry.channelConstants;
  // TODO: Status and funding
  const funding = [];
  let status = 'running';
  if (turnNum.eq(0)) {
    status = 'proposed';
  } else if (turnNum.lt(2 * participants.length - 1)) {
    status = 'opening';
  } else if (channelEntry.supported?.isFinal) {
    status = 'closed';
  } else if (latest?.isFinal) {
    status = 'closing';
  }

  return {
    participants,

    allocations: createJsonRpcAllocationsFromOutcome(latest.outcome),
    appDefinition,
    appData,
    status,
    funding,
    turnNum,
    channelId
  };
}

// TODO: Probably should be async and the store should have async methods
export function dispatchChannelUpdatedMessage(channelEntry: ChannelStoreEntry) {
  // TODO: Right now we assume anything that is not a null channel is an app channel
  if (bigNumberify(channelEntry.channelConstants.appDefinition).isZero()) {
    return;
  }
  getChannelInfo(channelEntry).then(channelInfo => {
    const notification = jrs.notification('ChannelUpdated', channelInfo);
    window.parent.postMessage(notification, '*');
  });
}

export function sendMessage(message: AddressableMessage) {
  const notification = jrs.notification('MessageQueued', {
    recipient: message.to,
    sender: 'TODO',
    data: message
  });
  window.parent.postMessage(notification, '*');
}

export function sendDisplayMessage(displayMessage: 'Show' | 'Hide') {
  const showWallet = displayMessage === 'Show';
  const message = jrs.notification('UIUpdate', {showWallet});
  window.parent.postMessage(message, '*');
}

import {
  getChannelId,
  Channel,
  Store,
  CreateChannelEvent,
  ChannelStoreEntry,
  AddressableMessage
} from '@statechannels/wallet-protocols';
import * as ethers from 'ethers';
import * as jrs from 'jsonrpc-lite';
import {validateRequest} from './json-rpc-validation/validator';

import {UpdateChannelParams} from '@statechannels/client-api-schema/types/update-channel';
import {
  createStateFromUpdateChannelParams,
  createJsonRpcAllocationsFromOutcome
} from './utils/json-rpc-utils';
import {CloseChannelParams} from '@statechannels/client-api-schema/types/close-channel';
import {bigNumberify} from 'ethers/utils';

import {CreateChannelParams} from '@statechannels/client-api-schema/types/create-channel';
import {PushMessageParams} from '@statechannels/client-api-schema/types/push-message';
import {WorkflowManager} from './workflow-manager';
import {JoinChannelParams} from '@statechannels/client-api-schema';

export async function handleMessage(
  event,
  workflowManager: WorkflowManager,
  store: Store,
  ourWallet: ethers.Wallet
) {
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
            const address = ourWallet.address;
            window.parent.postMessage(jrs.success(id, address), '*');
            break;
          case 'CreateChannel':
            await handleCreateChannelMessage(
              parsedMessage.payload,
              workflowManager,
              store,
              ourWallet
            );
            break;
          case 'UpdateChannel':
            await handleUpdateChannel(parsedMessage.payload, workflowManager, store);
            break;
          case 'PushMessage':
            await handlePushMessage(parsedMessage.payload, workflowManager);
            break;
          case 'CloseChannel':
            await handleCloseChannel(parsedMessage.payload, workflowManager, store);
            break;
          case 'JoinChannel':
            await handleJoinChannel(parsedMessage.payload as any, store);
            break;
        }
        break;
    }
  }
}

async function handleJoinChannel(payload: {id: jrs.ID; params: JoinChannelParams}, store: Store) {
  // TODO: The application workflow should be updated to wait until we get a  join channel from the client
  const {id} = payload;
  const {channelId} = payload.params;
  const result = jrs.success(id, await getChannelInfo(channelId, store.getEntry(channelId)));
  window.parent.postMessage(result, '*');
}

async function handleCloseChannel(
  payload: jrs.RequestObject,
  workflowManager: WorkflowManager,
  store: Store
) {
  const {id} = payload;
  const {channelId} = payload.params as CloseChannelParams;
  workflowManager.dispatchToWorkflows({type: 'PLAYER_REQUEST_CONCLUDE', channelId});
  const result = jrs.success(id, await getChannelInfo(channelId, store.getEntry(channelId)));
  window.parent.postMessage(result, '*');
}

async function handleUpdateChannel(
  payload: jrs.RequestObject,
  workflowManager: WorkflowManager,
  store: Store
) {
  const params = payload.params as UpdateChannelParams;
  const entry = store.getEntry(params.channelId);
  const {latestState} = entry;

  const state = createStateFromUpdateChannelParams(latestState, params);
  workflowManager.dispatchToWorkflows({type: 'PLAYER_STATE_UPDATE', state});
  window.parent.postMessage(
    jrs.success(
      payload.id,
      await getChannelInfo(params.channelId, store.getEntry(params.channelId))
    ),
    '*'
  );
  dispatchChannelUpdatedMessage(params.channelId, store.getEntry(params.channelId));
}

async function handlePushMessage(payload: jrs.RequestObject, workflowManager: WorkflowManager) {
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
  payload: jrs.RequestObject,
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
      allocations: params.allocations[0].allocationItems,
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

    const response = jrs.success(
      payload.id,
      await getChannelInfo(channelId, store.getEntry(channelId))
    );
    window.parent.postMessage(response, '*');
  }
}

async function getChannelInfo(channelId: string, channelEntry: ChannelStoreEntry) {
  const {participants, latestState} = channelEntry;
  const {appData, appDefinition, turnNum, channel} = latestState;

  // TODO: Status and funding
  const funding = [];
  let status = 'running';
  if (turnNum === 0) {
    status = 'proposed';
  } else if (turnNum < 2 * channel.participants.length - 1) {
    status = 'opening';
  } else if (channelEntry.hasSupportedState && channelEntry.latestSupportedState.isFinal) {
    status = 'closed';
  } else if (latestState && latestState.isFinal) {
    status = 'closing';
  }

  return {
    participants,
    //TODO: Somewhere the outcome is getting malformed
    allocations: createJsonRpcAllocationsFromOutcome(
      Array.isArray(latestState.outcome) ? latestState.outcome : [latestState.outcome]
    ),
    appDefinition,
    appData,
    status,
    funding,
    turnNum,
    channelId
  };
}

// TODO: Probably should be async and the store should have async methods
export function dispatchChannelUpdatedMessage(channelId: string, channelEntry: ChannelStoreEntry) {
  // TODO: Right now we assume anything that is not a null channel is an app channel
  if (
    channelEntry.states.length === 0 ||
    bigNumberify(channelEntry.latestState.appDefinition).isZero()
  ) {
    return;
  }
  getChannelInfo(channelId, channelEntry).then(channelInfo => {
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

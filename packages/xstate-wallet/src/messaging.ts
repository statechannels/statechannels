import {EventEmitter} from 'eventemitter3';
import {
  parseRequest,
  CreateChannelRequest,
  UpdateChannelRequest,
  CloseChannelRequest,
  JoinChannelRequest,
  Response
} from '@statechannels/client-api-schema';
import {AddressableMessage, unreachable} from '@statechannels/wallet-protocols';
import {bigNumberify} from 'ethers/utils';
import * as jrs from 'jsonrpc-lite';

import {fromEvent, Observable} from 'rxjs';
import {map, filter} from 'rxjs/operators';
import {Store} from './store';
import {ChannelStoreEntry} from './store/memory-channel-storage';
import {Message} from './store/wire-protocol';
import {createJsonRpcAllocationsFromOutcome} from './utils/json-rpc-utils';

type ChannelRequest =
  | CreateChannelRequest
  | JoinChannelRequest
  | UpdateChannelRequest
  | CloseChannelRequest;

interface InternalEvents {
  ChannelRequest: [ChannelRequest];
  CreateChannelRequest: [CreateChannelRequest];
  SendResponse: [Response];
}

export interface MessagingServiceInterface {
  readonly outboxFeed: Observable<Response>;
  receiveMessage(message: any): Promise<void>;
  readonly requestFeed: Observable<ChannelRequest>;
  channelUpdatedFeed(channelId: string): Observable<UpdateChannelRequest | CloseChannelRequest>;
  sendResponse(id: number, result: Response['result']): Promise<void>;
}

export class MessagingService implements MessagingServiceInterface {
  private eventEmitter = new EventEmitter<InternalEvents>();

  constructor(private store: Store) {
    this.eventEmitter = new EventEmitter();
  }

  public get outboxFeed(): Observable<Response> {
    return fromEvent(this.eventEmitter, 'SendResponse');
  }

  public channelUpdatedFeed(channelId: string) {
    return this.requestFeed.pipe(
      filter(req => {
        return (
          (req.method === 'UpdateChannel' || req.method === 'CloseChannel') &&
          req.params.channelId === channelId
        );
      }),
      map(req => req as CloseChannelRequest | UpdateChannelRequest)
    );
  }
  get requestFeed(): Observable<ChannelRequest> {
    return fromEvent<ChannelRequest>(this.eventEmitter, 'ChannelRequest');
  }

  public async sendResponse(id: number, result: Response['result']) {
    const response = {id, jsonrpc: '2.0', result} as Response; // typescript can't handle this otherwise
    this.eventEmitter.emit('SendResponse', response);
  }

  public async receiveMessage(message) {
    const request = parseRequest(message);
    const {id} = request;

    switch (request.method) {
      case 'GetAddress':
        const address = this.store.getAddress();
        this.sendResponse(id, address);
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
        this.eventEmitter.emit('CreateChannelRequest', request);
        break;
      case 'UpdateChannel':
      case 'CloseChannel':
      case 'JoinChannel':
        this.eventEmitter.emit('ChannelRequest', request);
        break;
      case 'PushMessage':
        // todo: should verify message format here
        const message = request.params as Message;
        this.store.pushMessage(message);
        break;
      case 'GetBudget':
      case 'ChallengeChannel':
        // TODO: handle these requests
        break;
      default:
        unreachable(request);
    }
  }
}

async function metamaskUnlocked(): Promise<string> {
  return new Promise(function(resolve) {
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

// TODO: Clean this up
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

import {EventEmitter} from 'eventemitter3';
import {
  parseRequest,
  CreateChannelRequest,
  UpdateChannelRequest,
  CloseChannelRequest,
  JoinChannelRequest,
  Response,
  ChannelResult,
  ChannelStatus,
  Notification,
  ChannelClosingNotification,
  ChannelUpdatedNotification
} from '@statechannels/client-api-schema';
import {unreachable} from '@statechannels/wallet-protocols';
import * as jrs from 'jsonrpc-lite';

import {fromEvent, Observable} from 'rxjs';
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
  SendMessage: [Response | Notification];
}

export interface MessagingServiceInterface {
  readonly outboxFeed: Observable<Response>;
  receiveMessage(message: any): Promise<void>;
  readonly requestFeed: Observable<ChannelRequest>;
  sendChannelNotification(
    method: ChannelClosingNotification['method'] | ChannelUpdatedNotification['method'],
    notificationData: ChannelResult
  );
  sendResponse(id: number, result: Response['result']): Promise<void>;
}

export class MessagingService implements MessagingServiceInterface {
  private eventEmitter = new EventEmitter<InternalEvents>();

  constructor(private store: Store) {
    this.eventEmitter = new EventEmitter();
  }

  public get outboxFeed(): Observable<Response> {
    return fromEvent(this.eventEmitter, 'SendMessage');
  }

  get requestFeed(): Observable<ChannelRequest> {
    return fromEvent<ChannelRequest>(this.eventEmitter, 'ChannelRequest');
  }

  public async sendResponse(id: number, result: Response['result']) {
    const response = {id, jsonrpc: '2.0', result} as Response; // typescript can't handle this otherwise
    this.eventEmitter.emit('SendMessage', response);
  }

  public async sendChannelNotification(
    method: ChannelClosingNotification['method'] | ChannelUpdatedNotification['method'],
    notificationData: ChannelResult
  ) {
    const notification = {jsonrpc: '2.0', method, params: notificationData} as Notification; // typescript can't handle this otherwise
    this.eventEmitter.emit('SendMessage', notification);
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

export async function convertToChannelResult(
  channelEntry: ChannelStoreEntry
): Promise<ChannelResult> {
  const {latest, channelId} = channelEntry;
  const {appData, turnNum} = latest;
  const {participants, appDefinition} = channelEntry.channelConstants;

  let status: ChannelStatus = 'running';
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
    turnNum: turnNum.toHexString(),
    channelId
  };
}

// TODO: Should be handled by messaging service?
export function sendDisplayMessage(displayMessage: 'Show' | 'Hide') {
  const showWallet = displayMessage === 'Show';
  const message = jrs.notification('UIUpdate', {showWallet});
  window.parent.postMessage(message, '*');
}

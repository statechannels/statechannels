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
  ChannelUpdatedNotification,
  Request
} from '@statechannels/client-api-schema';

import * as jrs from 'jsonrpc-lite';

import {fromEvent, Observable} from 'rxjs';
import {Store} from './store';
import {ChannelStoreEntry} from './store/memory-channel-storage';
import {Message as WireMessage} from '@statechannels/wire-format';
import {unreachable} from './utils';
import {isAllocation, Message} from './store/types';
import {serializeAllocation} from './serde/app-messages/serialize';
import {deserializeMessage} from './serde/wire-format/deserialize';
import {serializeMessage} from './serde/wire-format/serialize';

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
  readonly outboxFeed: Observable<Response | Notification>;
  readonly requestFeed: Observable<ChannelRequest>;

  receiveRequest(jsonRpcMessage: Request): Promise<void>;

  sendChannelNotification(
    method: ChannelClosingNotification['method'] | ChannelUpdatedNotification['method'],
    notificationData: ChannelResult
  );
  sendMessageNotification(message: Message): Promise<void>;
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

  public async sendMessageNotification(message: Message) {
    // TODO: It is awakward to have to generate sender/recipient
    const ourAddress = await this.store.getAddress();
    const sender = ourAddress;
    const objectiveRecipients =
      message.objectives
        ?.map(o => o.participants)
        .reduce((a, b) => {
          return a.concat(b);
        }) || [];
    const stateRecipients =
      message.signedStates?.map(ss => ss.participants).reduce((a, b) => a.concat(b)) || [];

    const filteredRecipients = [...new Set((objectiveRecipients || []).concat(stateRecipients))]
      .filter(p => {
        return p.signingAddress !== sender;
      })
      .map(p => p.participantId);

    filteredRecipients.forEach(recipient => {
      const notification = {
        jsonrpc: '2.0',
        method: 'MessageQueued',
        params: serializeMessage(message, recipient, sender)
      } as Notification; // typescript can't handle this otherwise
      this.eventEmitter.emit('SendMessage', notification);
    });
  }

  public async receiveRequest(jsonRpcRequest: Request) {
    const request = parseRequest(jsonRpcRequest);
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
        const message = request.params as WireMessage;
        if (message.recipient !== this.store.getAddress()) {
          throw new Error(`Received message not addressed to us ${JSON.stringify(message)}`);
        }
        this.store.pushMessage(deserializeMessage(message));
        await this.sendResponse(id, {success: true});
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

  const outcome = latest.outcome;

  if (!isAllocation(outcome)) {
    throw new Error('Can only send allocations to the app');
  }

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
    allocations: serializeAllocation(outcome),
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

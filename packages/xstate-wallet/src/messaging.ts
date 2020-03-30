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
  Request,
  ApproveBudgetAndFundRequest,
  ChannelProposedNotification,
  CloseAndWithdrawRequest,
  ErrorResponse,
  FundingStrategy
} from '@statechannels/client-api-schema';

import {fromEvent, Observable} from 'rxjs';
import {ChannelStoreEntry} from './store/channel-store-entry';
import {validateMessage} from '@statechannels/wire-format';
import {unreachable, isSimpleEthAllocation, makeDestination} from './utils';
import {isAllocation, Message, SiteBudget, Participant} from './store/types';
import {serializeAllocation, serializeSiteBudget} from './serde/app-messages/serialize';
import {deserializeMessage} from './serde/wire-format/deserialize';
import {serializeMessage} from './serde/wire-format/serialize';
import {AppRequestEvent} from './event-types';
import {deserializeAllocations, deserializeBudgetRequest} from './serde/app-messages/deserialize';

import {bigNumberify} from 'ethers/utils';
import {CHALLENGE_DURATION, NETWORK_ID, WALLET_VERSION} from './constants';
import {Store} from './store';

type ChannelRequest =
  | CreateChannelRequest
  | JoinChannelRequest
  | UpdateChannelRequest
  | CloseChannelRequest
  | ApproveBudgetAndFundRequest
  | CloseAndWithdrawRequest;

interface InternalEvents {
  AppRequest: [AppRequestEvent];
  CreateChannelRequest: [CreateChannelRequest];
  SendMessage: [Response | Notification | ErrorResponse];
}

export interface MessagingServiceInterface {
  readonly outboxFeed: Observable<Response | Notification>;
  readonly requestFeed: Observable<AppRequestEvent>;

  receiveRequest(jsonRpcMessage: Request, fromDomain: string): Promise<void>;
  sendBudgetNotification(notificationData: SiteBudget): Promise<void>;
  sendChannelNotification(
    method: (ChannelClosingNotification | ChannelUpdatedNotification)['method'],
    notificationData: ChannelResult
  );
  sendChannelNotification(
    method: ChannelProposedNotification['method'],
    notificationData: ChannelResult & {fundingStrategy: FundingStrategy}
  );
  sendMessageNotification(message: Message): Promise<void>;
  sendDisplayMessage(displayMessage: 'Show' | 'Hide');
  sendResponse(id: number, result: Response['result']): Promise<void>;
  sendError(id: number, error: ErrorResponse['error']): Promise<void>;
}

export class MessagingService implements MessagingServiceInterface {
  private eventEmitter = new EventEmitter<InternalEvents>();

  constructor(private store: Store) {
    this.eventEmitter = new EventEmitter();
  }

  public get outboxFeed(): Observable<Response> {
    return fromEvent(this.eventEmitter, 'SendMessage');
  }

  get requestFeed(): Observable<AppRequestEvent> {
    return fromEvent(this.eventEmitter, 'AppRequest');
  }

  public async sendResponse(id: number, result: Response['result']) {
    const response: Response = {id, jsonrpc: '2.0', result};
    this.eventEmitter.emit('SendMessage', response);
  }

  public async sendError(id: number, error: ErrorResponse['error']) {
    const response = {id, jsonrpc: '2.0', error} as ErrorResponse; // typescript can't handle this otherwise
    this.eventEmitter.emit('SendMessage', response);
  }

  public async sendBudgetNotification(notificationData: SiteBudget) {
    const notification: Notification = {
      jsonrpc: '2.0',
      method: 'BudgetUpdated',
      params: serializeSiteBudget(notificationData)
    };
    this.eventEmitter.emit('SendMessage', notification);
  }

  public async sendChannelNotification(
    method: ChannelClosingNotification['method'] | ChannelUpdatedNotification['method'],
    notificationData: ChannelResult
  );
  // eslint-disable-next-line no-dupe-class-members
  public async sendChannelNotification(
    method: ChannelProposedNotification['method'],
    notificationData: ChannelResult & {fundingStrategy: FundingStrategy}
  );
  // eslint-disable-next-line no-dupe-class-members
  public async sendChannelNotification(method, notificationData) {
    const notification = {jsonrpc: '2.0', method, params: notificationData} as Notification; // typescript can't handle this otherwise
    this.eventEmitter.emit('SendMessage', notification);
  }

  public async sendMessageNotification(message: Message) {
    // TODO: It is awkward to have to generate sender/recipient
    const ourAddress = await this.store.getAddress();
    const sender = ourAddress;
    const objectiveRecipients =
      message.objectives?.map(o => o.participants).reduce((a, b) => a.concat(b)) || [];
    const stateRecipients =
      message.signedStates?.map(ss => ss.participants).reduce((a, b) => a.concat(b)) || [];

    const filteredRecipients = [...new Set((objectiveRecipients || []).concat(stateRecipients))]
      .filter(p => p.signingAddress !== sender)
      .map(p => p.participantId);

    filteredRecipients.forEach(recipient => {
      const notification: Notification = {
        jsonrpc: '2.0',
        method: 'MessageQueued',
        params: validateMessage(serializeMessage(message, recipient, sender))
      };
      this.eventEmitter.emit('SendMessage', notification);
    });
  }

  public sendDisplayMessage(displayMessage: 'Show' | 'Hide') {
    const showWallet = displayMessage === 'Show';
    const notification: Notification = {
      jsonrpc: '2.0',
      method: 'UIUpdate',
      params: {showWallet}
    };
    this.eventEmitter.emit('SendMessage', notification);
  }

  public async receiveRequest(jsonRpcRequest: Request, fromDomain: string) {
    const request = parseRequest(jsonRpcRequest);
    const {id: requestId} = request;

    switch (request.method) {
      case 'GetWalletInformation':
        await this.sendResponse(requestId, {
          signingAddress: await this.store.getAddress(),
          selectedAddress: this.store.chain.ethereumIsEnabled
            ? this.store.chain.selectedAddress
            : null,
          walletVersion: WALLET_VERSION
        });
        break;
      case 'EnableEthereum':
        if (this.store.chain.ethereumIsEnabled) {
          await this.sendResponse(requestId, {
            signingAddress: await this.store.getAddress(),
            selectedAddress: this.store.chain.selectedAddress,
            walletVersion: WALLET_VERSION
          });
        } else {
          this.eventEmitter.emit('AppRequest', {type: 'ENABLE_ETHEREUM', requestId});
        }
        break;
      case 'CreateChannel':
      case 'UpdateChannel':
      case 'CloseChannel':
      case 'JoinChannel':
      case 'ApproveBudgetAndFund':
      case 'CloseAndWithdraw':
        const appRequest = await convertToInternalEvent(request, this.store, fromDomain);
        this.eventEmitter.emit('AppRequest', appRequest);
        break;
      case 'PushMessage':
        const message = validateMessage(request.params);
        if (message.recipient !== (await this.store.getAddress())) {
          throw new Error(`Received message not addressed to us ${JSON.stringify(message)}`);
        }
        await this.store.pushMessage(deserializeMessage(message));
        await this.sendResponse(requestId, {success: true});
        break;
      case 'GetBudget':
        const site = request.params.hubAddress;
        const siteBudget = await this.store.getBudget(site);
        await this.sendResponse(requestId, siteBudget ? serializeSiteBudget(siteBudget) : {});
        break;
      case 'ChallengeChannel':
      case 'GetState':
        // TODO: handle these requests
        break;

      default:
        unreachable(request);
    }
  }
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
  } else if (channelEntry.isSupported && channelEntry.supported.isFinal) {
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

export function convertToInternalParticipant(participant: {
  destination: string;
  signingAddress: string;
  participantId: string;
}): Participant {
  return {
    ...participant,
    destination: makeDestination(participant.destination)
  };
}
async function convertToInternalEvent(
  request: ChannelRequest,
  store: Store,
  domain: string
): Promise<AppRequestEvent> {
  switch (request.method) {
    case 'CloseAndWithdraw':
      return {
        type: 'CLOSE_AND_WITHDRAW',
        requestId: request.id,
        player: convertToInternalParticipant(request.params.player),
        hub: convertToInternalParticipant(request.params.hub),
        site: domain
      };
    case 'ApproveBudgetAndFund':
      const {hub, playerParticipantId} = request.params;
      const signingAddress = await store.getAddress();
      const destination = store.chain.selectedAddress;
      if (!destination) {
        throw new Error('No selected destination');
      }
      return {
        type: 'APPROVE_BUDGET_AND_FUND',
        requestId: request.id,
        budget: deserializeBudgetRequest(request.params, domain),
        player: convertToInternalParticipant({
          participantId: playerParticipantId,
          signingAddress,
          destination
        }),
        hub: convertToInternalParticipant(hub)
      };
    case 'CloseChannel':
      return {
        type: 'PLAYER_REQUEST_CONCLUDE',
        requestId: request.id,
        channelId: request.params.channelId
      };
    case 'CreateChannel': {
      const outcome = deserializeAllocations(request.params.allocations);
      if (!isSimpleEthAllocation(outcome)) {
        throw new Error('Currently only a simple ETH allocation is supported');
      }
      return {
        type: 'CREATE_CHANNEL',
        ...request.params,
        participants: request.params.participants.map(convertToInternalParticipant),
        outcome,
        challengeDuration: bigNumberify(CHALLENGE_DURATION),
        chainId: NETWORK_ID,
        requestId: request.id,
        applicationSite: domain
      };
    }
    case 'JoinChannel':
      return {
        type: 'JOIN_CHANNEL',
        ...request.params,
        requestId: request.id,
        applicationSite: domain
      };
    case 'UpdateChannel':
      const outcome = deserializeAllocations(request.params.allocations);

      if (!isSimpleEthAllocation(outcome)) {
        throw new Error('Currently only a simple ETH allocation is supported');
      }

      return {
        type: 'PLAYER_STATE_UPDATE',
        requestId: request.id,
        outcome,
        channelId: request.params.channelId,
        appData: request.params.appData
      };
  }
}

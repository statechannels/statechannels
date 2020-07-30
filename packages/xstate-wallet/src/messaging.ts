import {EventEmitter} from 'eventemitter3';
import {
  parseRequest,
  CreateChannelRequest,
  UpdateChannelRequest,
  CloseChannelRequest,
  JoinChannelRequest,
  Response,
  ChannelResult,
  Notification,
  ChannelClosingNotification,
  ChannelUpdatedNotification,
  Request,
  ApproveBudgetAndFundRequest,
  ChannelProposedNotification,
  CloseAndWithdrawRequest,
  ErrorResponse,
  ChallengeChannelRequest,
  FundingStrategy,
  parseResponse
} from '@statechannels/client-api-schema';
import {fromEvent, Observable} from 'rxjs';
import {validateMessage} from '@statechannels/wire-format';
import {
  Message,
  DomainBudget,
  Participant,
  unreachable,
  isSimpleEthAllocation,
  makeDestination,
  serializeDomainBudget,
  serializeChannelEntry,
  deserializeMessage,
  serializeMessage,
  deserializeAllocations,
  deserializeBudgetRequest
} from '@statechannels/wallet-core';

import {AppRequestEvent} from './event-types';
import {
  CHALLENGE_DURATION,
  GIT_VERSION,
  CHAIN_NETWORK_ID,
  HUB_PARTICIPANT_ID,
  HUB_ADDRESS,
  HUB_DESTINATION
} from './config';
import {Store} from './store';

type ChannelRequest =
  | ChallengeChannelRequest
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

export const isChannelUpdated = (m: Response | Notification): m is ChannelUpdatedNotification =>
  'method' in m && m.method === 'ChannelUpdated';
export const isChannelProposed = (m: Response | Notification): m is ChannelProposedNotification =>
  'method' in m && m.method === 'ChannelProposed';

export interface MessagingServiceInterface {
  readonly outboxFeed: Observable<Response | Notification | ErrorResponse>;
  readonly requestFeed: Observable<AppRequestEvent>;

  receiveRequest(jsonRpcMessage: object, fromDomain: string): Promise<void>;
  sendBudgetNotification(notificationData: DomainBudget): Promise<void>;
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
    const response = parseResponse({id, jsonrpc: '2.0', result});
    this.eventEmitter.emit('SendMessage', response);
  }

  public async sendError(id: number, error: ErrorResponse['error']) {
    const response = {id, jsonrpc: '2.0', error} as ErrorResponse; // typescript can't handle this otherwise
    this.eventEmitter.emit('SendMessage', response);
  }

  public async sendBudgetNotification(notificationData: DomainBudget) {
    const notification: Notification = {
      jsonrpc: '2.0',
      method: 'BudgetUpdated',
      params: serializeDomainBudget(notificationData)
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

  public async receiveRequest(jsonRpcRequest: object, fromDomain: string) {
    const request = parseRequest(jsonRpcRequest); // If this doesn't throw, we narrow the type to Request
    const {id: requestId} = request;

    switch (request.method) {
      case 'GetWalletInformation':
        await this.sendResponse(requestId, {
          signingAddress: await this.store.getAddress(),
          destinationAddress: (await this.store.getDestinationAddress()) ?? undefined,
          walletVersion: GIT_VERSION
        });
        break;
      case 'EnableEthereum':
        const destinationAddress = await this.store.getDestinationAddress();
        if (this.store.chain.ethereumIsEnabled && destinationAddress) {
          await this.sendResponse(requestId, {
            signingAddress: await this.store.getAddress(),
            destinationAddress,
            walletVersion: GIT_VERSION
          });
        } else {
          this.eventEmitter.emit('AppRequest', {type: 'ENABLE_ETHEREUM', requestId});
        }
        break;
      case 'GetChannels':
        const channelEntries = await this.store.getApplicationChannels(
          fromDomain,
          request.params.includeClosed
        );
        const serializedChannelEntries = await Promise.all(
          channelEntries.map(serializeChannelEntry)
        );
        await this.sendResponse(requestId, serializedChannelEntries);

        break;
      case 'ChallengeChannel':
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
        const DomainBudget = await this.store.getBudget(fromDomain);
        await this.sendResponse(requestId, DomainBudget ? serializeDomainBudget(DomainBudget) : {});
        break;
      case 'GetState':
        // TODO: handle these requests
        break;

      default:
        unreachable(request);
    }
  }
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
    case 'ChallengeChannel':
      return {
        type: 'PLAYER_REQUEST_CHALLENGE',
        requestId: request.id,
        channelId: request.params.channelId
      };
    case 'CloseAndWithdraw':
      const closeAndWithdrawDestination = await store.getDestinationAddress();
      if (!closeAndWithdrawDestination) {
        throw new Error('No selected destination');
      }
      if (!(request.params.hubParticipantId !== HUB_PARTICIPANT_ID)) {
        throw new Error(`You may only closeAndWithdraw for hub with id ${HUB_PARTICIPANT_ID}`);
      }
      return {
        type: 'CLOSE_AND_WITHDRAW',
        requestId: request.id,
        player: convertToInternalParticipant({
          participantId: await store.getAddress(),
          signingAddress: await store.getAddress(),
          destination: closeAndWithdrawDestination
        }),
        hub: convertToInternalParticipant({
          participantId: request.params.hubParticipantId,
          signingAddress: HUB_ADDRESS,
          destination: HUB_DESTINATION
        }),
        domain: domain
      };
    case 'ApproveBudgetAndFund':
      const {hub, playerParticipantId} = request.params;
      const signingAddress = await store.getAddress();
      const destination = await store.getDestinationAddress();
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
        challengeDuration: CHALLENGE_DURATION,
        chainId: CHAIN_NETWORK_ID,
        requestId: request.id,
        applicationDomain: domain
      };
    }
    case 'JoinChannel':
      return {
        type: 'JOIN_CHANNEL',
        ...request.params,
        requestId: request.id,
        applicationDomain: domain
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

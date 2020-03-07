import {MessagingServiceInterface, MessagingService} from '../messaging';
import {Wallet} from 'ethers/wallet';
import {Store, MemoryStore} from '../store/memory-store';
import {ChannelWallet, logTransition} from '../channel-wallet';
import {Participant} from '../store/types';
import {Chain} from '../chain';
import {
  isNotification,
  PushMessageRequest,
  JoinChannelRequest,
  CreateChannelRequest,
  UpdateChannelRequest,
  CloseChannelRequest,
  CreateBudgetAndFundRequest
} from '@statechannels/client-api-schema';
import {interpret, Interpreter} from 'xstate';
import {applicationWorkflow, WorkflowContext} from '../workflows/application';
import {Guid} from 'guid-typescript';

export class Player {
  privateKey: string;
  get signingAddress() {
    return new Wallet(this.privateKey).address;
  }
  store: Store;
  messagingService: MessagingServiceInterface;
  channelWallet: ChannelWallet;

  startAppWorkflow(startingState: string, context?: WorkflowContext) {
    const workflowId = Guid.create().toString();
    const machine = interpret<any, any, any>(
      applicationWorkflow(this.store, this.messagingService, context),
      {
        devTools: true
      }
    )
      .onTransition((state, event) => process.env.ADD_LOGS && logTransition(state, event, this.id))

      .start(startingState);

    this.channelWallet.workflows.push({id: workflowId, machine, domain: 'TODO'});
  }
  get workflowMachine(): Interpreter<any, any, any, any> | undefined {
    return this.channelWallet.workflows[0]?.machine;
  }
  get workflowState(): string | object | undefined {
    return this.channelWallet.workflows[0]?.machine.state.value;
  }
  get destination() {
    return '0x63e3fb11830c01ac7c9c64091c14bb6cbaac9ac7';
  }
  get participant(): Participant {
    return {
      participantId: this.signingAddress,
      destination: this.destination,
      signingAddress: this.signingAddress
    };
  }
  get participantId(): string {
    return this.signingAddress;
  }
  constructor(privateKey: string, private id: string, chain: Chain) {
    this.privateKey = privateKey;
    this.store = new MemoryStore([this.privateKey], chain);
    this.messagingService = new MessagingService(this.store);
    this.channelWallet = new ChannelWallet(this.store, this.messagingService, id);
  }
}

export function hookUpMessaging(playerA: Player, playerB: Player) {
  playerA.channelWallet.onSendMessage(message => {
    if (isNotification(message) && message.method === 'MessageQueued') {
      const pushMessageRequest = generatePushMessage(message.params);
      if (process.env.ADD_LOGS) {
        console.log(`MESSAGE A->B: ${JSON.stringify(pushMessageRequest)}`);
      }
      playerB.channelWallet.pushMessage(pushMessageRequest);
    }
  });

  playerB.channelWallet.onSendMessage(message => {
    if (isNotification(message) && message.method === 'MessageQueued') {
      const pushMessageRequest = generatePushMessage(message.params);
      if (process.env.ADD_LOGS) {
        console.log(`MESSAGE B->A: ${JSON.stringify(pushMessageRequest)}`);
      }
      playerA.channelWallet.pushMessage(pushMessageRequest);
    }
  });
}

function generatePushMessage(messageParams): PushMessageRequest {
  return {
    jsonrpc: '2.0',
    id: 111111111,
    method: 'PushMessage',
    params: messageParams
  };
}

export function generateCloseRequest(channelId: string): CloseChannelRequest {
  return {
    jsonrpc: '2.0',
    method: 'CloseChannel',
    id: 777777777,
    params: {
      channelId
    }
  };
}

export function generatePlayerUpdate(
  channelId: string,
  playerA: Participant,
  playerB: Participant
): UpdateChannelRequest {
  return {
    id: 555555555,
    method: 'UpdateChannel',
    jsonrpc: '2.0',
    params: {
      channelId,
      participants: [playerA, playerB],
      appData: '0x0',
      allocations: [
        {
          token: '0x0',
          allocationItems: [
            {
              destination: playerA.destination,
              amount: '0x06f05b59d3b20000'
            },
            {
              destination: playerB.destination,
              amount: '0x06f05b59d3b20000'
            }
          ]
        }
      ]
    }
  };
}

export function generateJoinChannelRequest(channelId: string): JoinChannelRequest {
  return {id: 222222222, method: 'JoinChannel', jsonrpc: '2.0', params: {channelId}};
}

export function generateCreateChannelRequest(
  playerA: Participant,
  playerB: Participant
): CreateChannelRequest {
  return {
    jsonrpc: '2.0',
    id: 3333333333,
    method: 'CreateChannel',
    params: {
      participants: [playerA, playerB],
      allocations: [
        {
          token: '0x0',
          allocationItems: [
            {
              destination: playerA.destination,
              amount: '0x06f05b59d3b20000'
            },
            {
              destination: playerB.destination,
              amount: '0x06f05b59d3b20000'
            }
          ]
        }
      ],
      appDefinition: '0x430869383d611bBB1ce7Ca207024E7901bC26b40',
      appData: '0x0' // TODO: This works for now but will break when we start validating
    }
  };
}

export function generateCreateBudgetAndFundRequest(): CreateBudgetAndFundRequest {
  return {
    jsonrpc: '2.0',
    id: 88888888,
    method: 'CreateBudgetAndFund',
    params: {
      site: 'rps.statechannels.org',
      hub: 'rps.statechannels.org',
      playerAmount: '0x5',
      hubAmount: '0x5'
    }
  };
}

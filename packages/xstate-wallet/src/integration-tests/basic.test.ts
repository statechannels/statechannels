import {Participant} from '../store/types';
import {MessagingService, MessagingServiceInterface} from '../messaging';
import {MemoryStore, Store} from '../store/memory-store';
import {Wallet} from 'ethers';
import {ChannelWallet, Workflow} from '../channel-wallet';

import {
  CreateChannelRequest,
  isNotification,
  PushMessageRequest,
  CreateChannelResponse,
  JoinChannelRequest,
  JoinChannelResponse
} from '@statechannels/client-api-schema';
import {filter, map} from 'rxjs/operators';
import {Observable} from 'rxjs';
import waitForExpect from 'wait-for-expect';
import {FakeChain, Chain} from '../chain';

jest.setTimeout(30000);

function generatePushMessage(data: any, recipient: string, sender: string): PushMessageRequest {
  return {
    jsonrpc: '2.0',
    id: 111111111,
    method: 'PushMessage',
    params: {data, recipient, sender}
  };
}

function generateJoinChannelRequest(channelId: string): JoinChannelRequest {
  return {id: 222222222, method: 'JoinChannel', jsonrpc: '2.0', params: {channelId}};
}

function generateCreateChannelRequest(
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
              destination: playerA.destination,
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

it('allows for two wallets to fund an app', async () => {
  const fakeChain = new FakeChain();
  const playerA = new Player(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    fakeChain
  );
  const playerB = new Player(
    '0x3341c348ea8ade1ba7c3b6f071bfe9635c544b7fb5501797eaa2f673169a7d0d',
    'PlayerB',
    fakeChain
  );

  playerA.channelWallet.onSendMessage(message => {
    if (isNotification(message) && message.method === 'MessageQueued') {
      const pushMessageRequest = generatePushMessage(
        message.params,
        playerB.participantId,
        playerA.participantId
      );
      console.log(`MESSAGE A->B: ${JSON.stringify(pushMessageRequest)}`);
      playerB.channelWallet.pushMessage(pushMessageRequest);
    }
  });
  playerB.channelWallet.onSendMessage(message => {
    if (isNotification(message) && message.method === 'MessageQueued') {
      const pushMessageRequest = generatePushMessage(
        message.params,
        playerA.participantId,
        playerB.participantId
      );
      console.log(`MESSAGE B->A: ${JSON.stringify(pushMessageRequest)}`);
      playerA.channelWallet.pushMessage(pushMessageRequest);
    }
  });

  const createEvent = generateCreateChannelRequest(playerA.participant, playerB.participant);

  const playerAResponsePromise = createPromise(
    playerA.messagingService.outboxFeed.pipe(
      filter(m => 'id' in m && m.id === createEvent.id),
      map(m => m as CreateChannelResponse)
    )
  );

  await playerA.messagingService.receiveMessage(createEvent);

  playerA.channelWallet.workflows[0].machine.send({type: 'USER_APPROVES'});

  const response = await playerAResponsePromise;
  expect(response.result).toBeDefined();
  const {channelId} = response.result;

  const joinEvent: JoinChannelRequest = generateJoinChannelRequest(channelId);

  const playerBResponsePromise = createPromise(
    playerB.messagingService.outboxFeed.pipe(
      filter(r => 'id' in r && r.id === joinEvent.id),
      map(r => r as JoinChannelResponse)
    )
  );

  await playerB.messagingService.receiveMessage(joinEvent);

  // Wait for the create channel service to start
  await waitForExpect(async () => {
    expect(playerB.workflow?.machine.state.value).toMatchObject({
      confirmJoinChannelWorkflow: 'invokeCreateChannelConfirmation'
    });
  }, 3000);

  playerB.channelWallet.workflows[0].machine.send({type: 'USER_APPROVES'});

  const playerBResponse: JoinChannelResponse = await playerBResponsePromise;
  expect(playerBResponse.result).toBeDefined();

  // Wait for the create channel service to start
  await waitForExpect(async () => {
    expect(playerA.workflow?.machine.state.value).toEqual('running');
    expect(playerB.workflow?.machine.state.value).toEqual('running');
  }, 3000);
});

class Player {
  privateKey: string;
  get signingAddress() {
    return new Wallet(this.privateKey).address;
  }
  store: Store;
  messagingService: MessagingServiceInterface;
  channelWallet: ChannelWallet;

  get workflow(): Workflow | undefined {
    return this.channelWallet.workflows.length > 0 ? this.channelWallet.workflows[0] : undefined;
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
  constructor(privateKey: string, id: string, chain: Chain) {
    this.privateKey = privateKey;
    this.store = new MemoryStore([this.privateKey], chain);
    this.messagingService = new MessagingService(this.store);
    this.channelWallet = new ChannelWallet(this.store, this.messagingService, id);
  }
}

function createPromise<T>(observable: Observable<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    observable.subscribe(o => {
      resolve(o);
    });
  });
}

import {Participant} from '../store/types';
import {MessagingService, MessagingServiceInterface} from '../messaging';
import {MemoryStore, Store} from '../store/memory-store';
import {Wallet} from 'ethers';
import {filter} from 'rxjs/operators';
import {ChannelWallet} from '../channel-wallet';
jest.setTimeout(50000);
function createChannel(playerA: Participant, playerB: Participant) {
  return {
    jsonrpc: '2.0',
    id: 1581594378830,
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

it('works', async () => {
  const playerA = new Player('0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e');
  const playerB = new Player('0x3341c348ea8ade1ba7c3b6f071bfe9635c544b7fb5501797eaa2f673169a7d0d');

  const createEvent = createChannel(playerA.participant, playerB.participant);
  const playerAResponse = playerA.messagingService.outboxFeed.pipe(
    filter(r => r.id === createEvent.id)
  );

  await playerA.messagingService.receiveMessage(createEvent);

  playerA.channelWallet.workflows[0].machine.send({type: 'USER_APPROVES'});
  const response = await playerAResponse.toPromise();
  expect(response).toMatchObject({});
});

class Player {
  privateKey: string;
  get signingAddress() {
    return new Wallet(this.privateKey).address;
  }
  store: Store;
  messagingService: MessagingServiceInterface;
  channelWallet: ChannelWallet;
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
  constructor(privateKey: string) {
    this.privateKey = privateKey;
    this.store = new MemoryStore([this.privateKey]);
    this.messagingService = new MessagingService(this.store);
    this.channelWallet = new ChannelWallet(this.store, this.messagingService);
  }
}

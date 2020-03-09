import {
  CreateChannelResponse,
  JoinChannelRequest,
  JoinChannelResponse
} from '@statechannels/client-api-schema';
import {filter, map, first} from 'rxjs/operators';
import waitForExpect from 'wait-for-expect';
import {FakeChain} from '../chain';
import {
  Player,
  generateCreateChannelRequest,
  hookUpMessaging,
  generateJoinChannelRequest
} from './helpers';

jest.setTimeout(30000);

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

  hookUpMessaging(playerA, playerB);

  const createEvent = generateCreateChannelRequest(playerA.participant, playerB.participant);
  const createPromise = playerA.messagingService.outboxFeed
    .pipe(
      filter(m => 'id' in m && m.id === createEvent.id),
      map(m => m as CreateChannelResponse),
      first()
    )
    .toPromise();
  await playerA.messagingService.receiveRequest(createEvent);

  playerA.channelWallet.workflows[0].machine.send({type: 'USER_APPROVES'});

  const createResponse = await createPromise;
  expect(createResponse.result).toBeDefined();

  const {channelId} = createResponse.result;
  const joinEvent: JoinChannelRequest = generateJoinChannelRequest(channelId);
  const joinPromise = playerB.messagingService.outboxFeed
    .pipe(
      filter((r): r is JoinChannelResponse => 'id' in r && r.id === joinEvent.id),
      first()
    )
    .toPromise();
  await playerB.messagingService.receiveRequest(joinEvent);

  // Wait for the create channel service to start
  await waitForExpect(async () => {
    expect(playerB.workflowState).toMatchObject({
      confirmJoinChannelWorkflow: {confirmChannelCreation: 'invokeCreateChannelConfirmation'}
    });
  }, 3000);

  playerB.channelWallet.workflows[0].machine.send({type: 'USER_APPROVES'});

  const playerBResponse: JoinChannelResponse = await joinPromise;

  expect(playerBResponse.result).toBeDefined();

  await waitForExpect(async () => {
    expect(playerA.workflowState).toEqual('running');
    expect(playerB.workflowState).toEqual('running');
  }, 3000);
});

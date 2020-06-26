import {CreateChannelResponse} from '@statechannels/client-api-schema';
import {filter, first} from 'rxjs/operators';
import {FakeChain} from '../../chain';
import {
  Player,
  generateCreateChannelRequest,
  hookUpMessaging,
  generateJoinChannelRequest
} from '../../integration-tests/helpers';
import {isChannelUpdated, isChannelProposed} from '../../messaging';

jest.setTimeout(20000);

it('allows for two wallets to fund an app', async () => {
  const fakeChain = new FakeChain();

  const playerA = await Player.createPlayer(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    fakeChain
  );
  const playerB = await Player.createPlayer(
    '0x3341c348ea8ade1ba7c3b6f071bfe9635c544b7fb5501797eaa2f673169a7d0d',
    'PlayerB',
    fakeChain
  );

  hookUpMessaging(playerA, playerB);
  const channelId = '0x440b56b6c5b0adca1ee99e3926d1b123fd867566cfab5150479f9d5e9317fa1e';

  const createEvent = generateCreateChannelRequest(playerA.participant, playerB.participant);

  const isCreateChannelResponse = (m): m is CreateChannelResponse =>
    'id' in m && m.id === createEvent.id;

  // intercepts response to createChannel request
  const createPromise = playerA.messagingService.outboxFeed
    .pipe(filter(isCreateChannelResponse), first())
    .toPromise();

  // sends the request to the messaging service
  await playerA.messagingService.receiveRequest(createEvent, 'localhost');

  // wait for response (todo: probably don't need to do this?)
  const createResponse = await createPromise;
  expect(createResponse.result.channelId).toEqual(channelId);
  console.log('[A] response received');

  // wait for a channel proposedNotification
  const channelProposedNotification = await playerB.messagingService.outboxFeed
    .pipe(filter(isChannelProposed), first())
    .toPromise();
  // check it's the right channel
  expect(channelProposedNotification.params.channelId).toEqual(channelId);
  console.log('[B] proposal received');

  const aRunning = waitForRunning(playerA);
  const bRunning = waitForRunning(playerB);

  // send the JoinChannel request
  playerB.channelWallet.pushMessage(generateJoinChannelRequest(channelId), 'localhost');
  // manually approve
  console.log('[B] app approves proposal');

  await bRunning;
  console.log('[B] running');
  await aRunning;
  console.log('[A] running');

  // check the store
  [playerA, playerB].map(async player => {
    const entry = await player.store.getEntry(channelId);
    expect(entry.applicationDomain).toEqual('localhost');
  });
});

const waitForRunning = async (player: Player) =>
  player.messagingService.outboxFeed
    .pipe(
      filter(isChannelUpdated),
      filter(notification => notification.params.status === 'running'),
      first()
    )
    .toPromise();

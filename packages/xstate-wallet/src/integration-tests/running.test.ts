import {FakeChain} from '../chain';
import {Player, hookUpMessaging, generatePlayerUpdate} from './helpers';
import {bigNumberify} from 'ethers/utils';
import waitForExpect from 'wait-for-expect';
import {simpleEthAllocation} from '../utils';
import {first} from 'rxjs/operators';
jest.setTimeout(30000);

let playerA, playerB: Player;
let players: [Player, Player];
const channelId = '0xe70b337fb9cd3917fc3c5f53ded1a1343cbd519b389fad2bbe56000910bbfa8f';

beforeEach(async () => {
  const fakeChain = new FakeChain();

  playerA = await Player.createPlayer(
    '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318',
    'PlayerA',
    fakeChain
  );
  playerB = await Player.createPlayer(
    '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727',
    'PlayerB',
    fakeChain
  );
  players = [playerA, playerB];

  hookUpMessaging(playerA, playerB);

  const amount = bigNumberify('0x06f05b59d3b20000');
  const outcome = simpleEthAllocation(players.map(({destination}) => ({destination, amount})));
  const stateVars = {
    outcome,
    turnNum: bigNumberify(4),
    appData: '0x0',
    isFinal: false
  };

  const playerBChannelUpdatedPromise = playerB.store
    .channelUpdatedFeed(channelId)
    .pipe(first())
    .toPromise();

  playerA.store.createChannel(
    players.map(p => p.participant),
    bigNumberify(4),
    stateVars
  );

  await playerBChannelUpdatedPromise;

  const context: any = {channelId, applicationDomain: 'localhost', fundingStrategy: 'Direct'};
  players.map(player => {
    player.startAppWorkflow('running', context);
    player.workflowMachine?.send('SPAWN_OBSERVERS');
  });
});

test('accepts states when running', async () => {
  await playerA.messagingService.receiveRequest(
    generatePlayerUpdate(channelId, playerA.participant, playerB.participant),
    'localhost'
  );

  await waitForExpect(async () => {
    expect(playerA.workflowState).toEqual('running');
    expect(playerB.workflowState).toEqual('running');
    const playerATurnNum = (await playerA.store.getEntry(channelId)).latest.turnNum.toNumber();
    expect(playerATurnNum).toBe(5);
    const playerBTurnNum = (await playerB.store.getEntry(channelId)).latest.turnNum.toNumber();
    expect(playerBTurnNum).toBe(5);
  }, 3000);

  await playerB.messagingService.receiveRequest(
    generatePlayerUpdate(channelId, playerA.participant, playerB.participant),
    'localhost'
  );

  await waitForExpect(async () => {
    expect(playerA.workflowState).toEqual('running');
    expect(playerB.workflowState).toEqual('running');
    const playerATurnNum = (await playerA.store.getEntry(channelId)).latest.turnNum.toNumber();
    expect(playerATurnNum).toBe(6);
    const playerBTurnNum = (await playerB.store.getEntry(channelId)).latest.turnNum.toNumber();
    expect(playerBTurnNum).toBe(6);
  }, 3000);
});

import {FakeChain} from '../chain';
import {Player, hookUpMessaging, generatePlayerUpdate} from './helpers';
import {bigNumberify} from 'ethers/utils';
import waitForExpect from 'wait-for-expect';
import {simpleEthAllocation} from '../utils';
import {first} from 'rxjs/operators';
jest.setTimeout(30000);
test('accepts states when running', async () => {
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
  const outcome = simpleEthAllocation([
    {
      destination: playerA.destination,
      amount: bigNumberify('0x06f05b59d3b20000')
    },
    {
      destination: playerA.destination,
      amount: bigNumberify('0x06f05b59d3b20000')
    }
  ]);

  hookUpMessaging(playerA, playerB);

  const stateVars = {
    outcome,
    turnNum: bigNumberify(5),
    appData: '0x0',
    isFinal: false
  };
  const {channelId, latest} = await playerA.store.createChannel(
    [playerA.participant, playerB.participant],
    bigNumberify(4),
    stateVars
  );

  await playerB.store.addState(latest);
  await playerB.store.signAndAddState(channelId, latest);

  await playerB.store
    .channelUpdatedFeed(channelId)
    .pipe(first(e => e.isSupported))
    .toPromise();

  const context: any = {channelId, applicationDomain: 'localhost', fundingStrategy: 'Direct'};
  playerA.startAppWorkflow('running', context);
  playerB.startAppWorkflow('running', context);
  playerA.workflowMachine?.send('SPAWN_OBSERVERS');
  playerB.workflowMachine?.send('SPAWN_OBSERVERS');

  await playerA.messagingService.receiveRequest(
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

  await playerB.messagingService.receiveRequest(
    generatePlayerUpdate(channelId, playerA.participant, playerB.participant),
    'localhost'
  );
  await waitForExpect(async () => {
    expect(playerA.workflowState).toEqual('running');
    expect(playerB.workflowState).toEqual('running');
    const playerATurnNum = (await playerA.store.getEntry(channelId)).latest.turnNum.toNumber();
    expect(playerATurnNum).toBe(7);
    const playerBTurnNum = (await playerB.store.getEntry(channelId)).latest.turnNum.toNumber();
    expect(playerBTurnNum).toBe(7);
  }, 3000);
});

import {FakeChain} from '../chain';
import {Player, hookUpMessaging, generatePlayerUpdate} from './helpers';
import waitForExpect from 'wait-for-expect';
import {simpleEthAllocation} from '../utils';
import {first} from 'rxjs/operators';
import {CHAIN_NETWORK_ID} from '../config';
import {BigNumber, constants} from 'ethers';
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
  const players = [playerA, playerB];

  const amount = BigNumber.from('0x06f05b59d3b20000');
  const outcome = simpleEthAllocation(players.map(({destination}) => ({destination, amount})));

  hookUpMessaging(playerA, playerB);

  const turnNum = BigNumber.from(5);
  const signedState = players.reduce((state, player) => player.signState(state), {
    outcome,
    turnNum,
    appData: '0x0',
    isFinal: false,
    participants: [playerA.participant, playerB.participant],
    challengeDuration: BigNumber.from(4),
    chainId: CHAIN_NETWORK_ID,
    appDefinition: constants.AddressZero,
    channelNonce: BigNumber.from(4),
    signatures: []
  });
  const {channelId} = await players.map(({store}) => store.addState(signedState))[0];

  await playerB.store
    .channelUpdatedFeed(channelId)
    .pipe(first())
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
    expect(playerATurnNum).toBe(turnNum.add(1).toNumber());
    const playerBTurnNum = (await playerB.store.getEntry(channelId)).latest.turnNum.toNumber();
    expect(playerBTurnNum).toBe(turnNum.add(1).toNumber());
  }, 3000);

  await playerB.messagingService.receiveRequest(
    generatePlayerUpdate(channelId, playerA.participant, playerB.participant),
    'localhost'
  );
  await waitForExpect(async () => {
    expect(playerA.workflowState).toEqual('running');
    expect(playerB.workflowState).toEqual('running');
    const playerATurnNum = (await playerA.store.getEntry(channelId)).latest.turnNum.toNumber();
    expect(playerATurnNum).toBe(turnNum.add(2).toNumber());
    const playerBTurnNum = (await playerB.store.getEntry(channelId)).latest.turnNum.toNumber();
    expect(playerBTurnNum).toBe(turnNum.add(2).toNumber());
  }, 3000);
});

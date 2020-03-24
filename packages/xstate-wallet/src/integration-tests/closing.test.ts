import {FakeChain} from '../chain';
import {Player, hookUpMessaging, generateCloseRequest} from './helpers';
import {bigNumberify} from 'ethers/utils';
import waitForExpect from 'wait-for-expect';
import {simpleEthAllocation} from '../utils/outcome';
jest.setTimeout(30000);
test('concludes on their turn', async () => {
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
  playerB.store.signAndAddState(channelId, latest);

  [playerA, playerB].forEach(async player => {
    player.startAppWorkflow('running', {channelId});
    player.workflowMachine?.send('SPAWN_OBSERVERS');
    await player.store.setFunding(channelId, {type: 'Direct'});
  });

  await playerA.messagingService.receiveRequest(generateCloseRequest(channelId));

  await waitForExpect(async () => {
    expect(playerA.workflowState).toEqual('done');
    expect(playerB.workflowState).toEqual('done');
    expect((await playerA.store.getEntry(channelId)).supported.isFinal).toBe(true);
    expect((await playerB.store.getEntry(channelId)).supported.isFinal).toBe(true);
  }, 3000);
});

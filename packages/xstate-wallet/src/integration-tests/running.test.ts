import {FakeChain} from '../chain';
import {Player, hookUpMessaging} from './helpers';
import {SimpleEthAllocation} from '../store/types';
import {bigNumberify} from 'ethers/utils';
import waitForExpect from 'wait-for-expect';

test('accepts states when running', async () => {
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
  const outcome: SimpleEthAllocation = {
    allocationItems: [
      {
        destination: playerA.destination,
        amount: bigNumberify('0x06f05b59d3b20000')
      },
      {
        destination: playerA.destination,
        amount: bigNumberify('0x06f05b59d3b20000')
      }
    ],
    type: 'SimpleEthAllocation'
  };

  hookUpMessaging(playerA, playerB);
  const stateVars = {
    outcome,
    turnNum: bigNumberify(5),
    appData: '0x0',
    isFinal: false
  };
  playerA.store.createChannel(
    [playerA.participant, playerB.participant],
    bigNumberify(5),
    stateVars
  );

  playerA.startAppWorkflow('running');
  playerB.startAppWorkflow('running');
  playerA.store.signAndAddState(
    '0x1823994d6d3b53b82f499c1aca2095b94108ba3ff59f55c6e765da1e24874ab2',
    stateVars
  );

  await waitForExpect(async () => {
    expect(playerA.workflowState).toEqual('running');
    expect(playerB.workflowState).toEqual('running');
    const playerBTurnNum = (
      await playerB.store.getEntry(
        '0x1823994d6d3b53b82f499c1aca2095b94108ba3ff59f55c6e765da1e24874ab2'
      )
    ).latest.turnNum.toNumber();
    expect(playerBTurnNum).toBe(5);
  }, 3000);
});

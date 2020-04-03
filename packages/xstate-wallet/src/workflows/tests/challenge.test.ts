import {AddressZero} from 'ethers/constants';
import {interpret} from 'xstate';
import {bigNumberify, hexZeroPad} from 'ethers/utils';
import waitForExpect from 'wait-for-expect';

import {CHALLENGE_DURATION, NETWORK_ID} from '../../constants';
import {FakeChain} from '../../chain';
import {machine as challengeMachine} from '../challenge-channel';
import {Player} from '../../integration-tests/helpers';
import {signState} from '../../store/state-utils';
import {simpleEthAllocation} from '../../utils/outcome';
import {State} from '../../store/types';

import {TestStore} from './store';

jest.setTimeout(50000);

// Test suite variables
let fakeChain: FakeChain;
let store: TestStore;
let playerA: Player;
let playerB: Player;
let state: State;
let channelId: string;

beforeEach(async () => {
  fakeChain = new FakeChain();
  store = new TestStore(fakeChain);

  playerA = await Player.createPlayer(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    fakeChain
  );

  playerB = await Player.createPlayer(
    '0x3341c348ea8ade1ba7c3b6f071bfe9635c544b7fb5501797eaa2f673169a7d0d',
    'PlayerB',
    fakeChain
  );

  await store.setPrivateKey('0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e');

  state = {
    outcome: simpleEthAllocation([
      {
        destination: playerA.destination,
        amount: bigNumberify(hexZeroPad('0x06f05b59d3b20000', 32))
      },
      {
        destination: playerA.destination,
        amount: bigNumberify(hexZeroPad('0x06f05b59d3b20000', 32))
      }
    ]),
    turnNum: bigNumberify(5),
    appData: '0x0',
    isFinal: false,
    challengeDuration: CHALLENGE_DURATION,
    chainId: NETWORK_ID,
    channelNonce: bigNumberify(0),
    appDefinition: AddressZero,
    participants: [playerA.participant, playerB.participant]
  };

  const allSignState = {
    ...state,
    signatures: [playerA, playerB].map(({privateKey}) => signState(state, privateKey))
  };

  channelId = (await store.createEntry(allSignState)).channelId;
});

it('initializes and starts challenge thing', async () => {
  const service = interpret(challengeMachine(store, {channelId})).start();

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('waitForResponseOrTimeout');
    const {
      channelStorage: {finalizesAt, turnNumRecord}
    } = await fakeChain.getChainInfo(channelId);
    expect(finalizesAt).toStrictEqual(state.challengeDuration.add(1));
    expect(turnNumRecord).toStrictEqual(state.turnNum);
  }, 10000);
});

it('finalized when timeout ends', async () => {
  const service = interpret(challengeMachine(store, {channelId})).start();

  // Wait until the challenge is on-chain, then fast-forward the blocks.
  service.onTransition(
    ({value}) => value === 'waitForResponseOrTimeout' && fakeChain.setBlockNumber(301) // NOTE: CHALLENGE_DURATION is 300)
  );

  await waitForExpect(async () => {
    expect(service.state.value).toEqual('done');
    const {finalized} = await fakeChain.getChainInfo(channelId);
    expect(finalized).toBe(true);
  }, 10_000);
});

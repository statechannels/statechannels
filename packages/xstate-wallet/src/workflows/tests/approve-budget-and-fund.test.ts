import {
  wallet1 as playerWallet,
  wallet2 as hubWallet,
  first as player,
  second as hub
} from './data';
import {bigNumberify} from 'ethers/utils';

import {ethBudget} from '../../utils/budget-utils';
import {FakeChain} from '../../chain';
import {TestStore} from './store';
import {SimpleHub} from './simple-hub';
import {subscribeToMessages} from './message-service';

import {machine as approveBudgetAndFund} from '../approve-budget-and-fund';
import {MessagingService} from '../../messaging';
import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

jest.setTimeout(20000);
const EXPECT_TIMEOUT = process.env.CI ? 9500 : 5000;

const budget = ethBudget('example.com', {
  availableReceiveCapacity: bigNumberify(5),
  availableSendCapacity: bigNumberify(5)
});

hub.participantId = 'hub';
player.participantId = 'player';

const initialContext = {
  budget,
  hub,
  player,
  requestId: 123
};
let chain, playerStore, hubStore, messagingService;

beforeEach(async () => {
  chain = new FakeChain();
  playerStore = new TestStore(chain);
  messagingService = new MessagingService(playerStore);

  hubStore = new SimpleHub(hubWallet.privateKey);
  await playerStore.initialize([playerWallet.privateKey]);

  subscribeToMessages({
    [player.participantId]: playerStore,
    [hub.participantId]: hubStore
  });
});

it('works end to end', async () => {
  const runningWorkflow = interpret(
    approveBudgetAndFund(playerStore, messagingService, initialContext)
  ).start();

  await waitForExpect(async () => {
    expect(runningWorkflow.state.value).toEqual('waitForUserApproval');
  }, EXPECT_TIMEOUT);

  await runningWorkflow.send({type: 'USER_APPROVES_BUDGET'});
  // creates preFS
  // sends preFS to hub
  // hub replies with signed preFS
  // workflow subscribes to chain
  // chain responds with initial state
  // it's the hub turn first

  await waitForExpect(async () => {
    expect(runningWorkflow.state.value).toEqual({deposit: 'waitTurn'});
  }, EXPECT_TIMEOUT);

  const ledgerId = (runningWorkflow.state.context as any).ledgerId;

  chain.depositSync(ledgerId, 0, 5);

  // goes to submitTransaction
  // waitMining, which happens immediately
  // skip waitFullyFunded
  // end in done

  await waitForExpect(async () => {
    expect(runningWorkflow.state.value).toEqual('done');
  }, EXPECT_TIMEOUT);

  expect(true).toBe(true);
});

it('works when someone else deposits the full amount', async () => {
  const runningWorkflow = interpret(
    approveBudgetAndFund(playerStore, messagingService, initialContext)
  ).start();

  await waitForExpect(async () => {
    expect(runningWorkflow.state.value).toEqual('waitForUserApproval');
  }, EXPECT_TIMEOUT);

  await runningWorkflow.send({type: 'USER_APPROVES_BUDGET'});
  // creates preFS
  // sends preFS to hub
  // hub replies with signed preFS
  // workflow subscribes to chain
  // chain responds with initial state
  // it's the hub turn first

  await waitForExpect(async () => {
    expect(runningWorkflow.state.value).toEqual({deposit: 'waitTurn'});
  }, EXPECT_TIMEOUT);

  const ledgerId = (runningWorkflow.state.context as any).ledgerId;

  chain.depositSync(ledgerId, 0, 10);

  // skip submitTransaction
  // skip waitMining
  // skip waitFullyFunded
  // end in done

  await waitForExpect(async () => {
    expect(runningWorkflow.state.value).toEqual('done');
  }, EXPECT_TIMEOUT);
});

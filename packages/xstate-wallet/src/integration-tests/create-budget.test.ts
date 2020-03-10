import {ApproveBudgetAndFundResponse} from '@statechannels/client-api-schema';
import {filter, map, first} from 'rxjs/operators';
import {FakeChain} from '../chain';
import {Player, generateApproveBudgetAndFundRequest} from './helpers';
import waitForExpect from 'wait-for-expect';

jest.setTimeout(30000);

it('allows for a wallet to approve a budget and fund with the hub', async () => {
  const fakeChain = new FakeChain();

  const playerA = new Player(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    fakeChain
  );

  const createBudgetEvent = generateApproveBudgetAndFundRequest(playerA.participant);
  const createBudgetPromise = playerA.messagingService.outboxFeed
    .pipe(
      filter(m => 'id' in m && m.id === createBudgetEvent.id),
      map(m => m as ApproveBudgetAndFundResponse),
      first()
    )
    .toPromise();
  await playerA.messagingService.receiveRequest(createBudgetEvent);
  await waitForExpect(async () => {
    expect(playerA.workflowState).toEqual('waitForUserApproval');
  }, 3000);
  playerA.channelWallet.workflows[0].machine.send({type: 'USER_APPROVES_BUDGET'});

  const createResponse = await createBudgetPromise;

  expect(createResponse.result).toBeDefined();
});

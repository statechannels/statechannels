import {ApproveBudgetAndFundResponse} from '@statechannels/client-api-schema';
import {filter, map, first} from 'rxjs/operators';
import {FakeChain} from '../chain';
import {Player, generateApproveBudgetAndFundRequest, hookUpMessaging} from './helpers';
import waitForExpect from 'wait-for-expect';
import {FundLedger} from '../store/types';
import {checkThat} from '../utils';
import {isSimpleEthAllocation} from '../utils/outcome';

import {bigNumberify} from 'ethers/utils';

jest.setTimeout(30000);

it('allows for a wallet to approve a budget and fund with the hub', async () => {
  const fakeChain = new FakeChain();

  const playerA = new Player(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    fakeChain
  );

  const hub = new Player(
    '0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29',
    'Hub',
    fakeChain
  );

  hookUpMessaging(playerA, hub);
  // We need to spawn a create and fund ledger when receiving the objective
  // This should be similar to how the actual hub handles this
  hub.store.objectiveFeed
    .pipe(
      filter((o): o is FundLedger => {
        return o.type === 'FundLedger';
      })
    )
    .subscribe(async o => {
      const entry = await hub.store.getEntry(o.data.ledgerId);
      hub.startCreateAndFundLedger({
        ledgerId: o.data.ledgerId,
        participants: o.participants,
        initialOutcome: checkThat(entry.latest.outcome, isSimpleEthAllocation)
      });
    });

  const createBudgetEvent = generateApproveBudgetAndFundRequest(
    playerA.participant,
    hub.participant
  );
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

  const createResponse: ApproveBudgetAndFundResponse = await createBudgetPromise;
  const ethBudget = createResponse.result.budgets[0];

  // Check that the budget shows the funds are free
  expect(ethBudget.free.hubAmount).toEqual('0x5');
  expect(ethBudget.free.playerAmount).toEqual('0x5');
  // Check that the ledger channel is set up correct
  const ledgerEntry = await playerA.store.getLedger(hub.signingAddress);
  expect(ledgerEntry.isSupported).toBe(true);
  const allocation = checkThat(ledgerEntry.supported.outcome, isSimpleEthAllocation);
  expect(allocation.allocationItems).toContainEqual({
    destination: hub.destination,
    amount: bigNumberify('0x5')
  });
  expect(allocation.allocationItems).toContainEqual({
    destination: playerA.destination,
    amount: bigNumberify('0x5')
  });
  // Check that the funds are reflected on chain
  const chainInfo = await playerA.store.chain.getChainInfo(ledgerEntry.channelId);
  expect(chainInfo.amount.eq(10)).toBe(true);
});

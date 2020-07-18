import {filter, map, first} from 'rxjs/operators';
import {FundLedger, assertSimpleEthAllocation, BN} from '@statechannels/wallet-core';

import {hexZeroPad} from '@ethersproject/bytes';
import {ApproveBudgetAndFundResponse} from '@statechannels/client-api-schema';

import {FakeChain} from '../chain';
import {TEST_APP_DOMAIN} from '../workflows/tests/data';
import {Player, generateApproveBudgetAndFundRequest, hookUpMessaging} from './helpers';

jest.setTimeout(30000);

it('allows for a wallet to approve a budget and fund with the hub', async () => {
  const fakeChain = new FakeChain();

  const playerA = await Player.createPlayer(
    '0x275a2e2cd9314f53b42246694034a80119963097e3adf495fbf6d821dc8b6c8e',
    'PlayerA',
    fakeChain
  );

  const hub = await Player.createPlayer(
    '0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29',
    'Hub',
    fakeChain
  );

  hookUpMessaging(playerA, hub);
  await playerA.store.chain.ethereumEnable();
  await playerA.store.setDestinationAddress(playerA.signingAddress);
  // We need to spawn a create and fund ledger when receiving the objective
  // This should be similar to how the actual hub handles this
  hub.store.objectiveFeed
    .pipe(filter((o): o is FundLedger => o.type === 'FundLedger'))
    .subscribe(async o => {
      const entry = await hub.store.getEntry(o.data.ledgerId);
      hub.startCreateAndFundLedger({
        ledgerId: o.data.ledgerId,
        participants: o.participants,
        initialOutcome: assertSimpleEthAllocation(entry.latest.outcome)
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
  await playerA.messagingService.receiveRequest(createBudgetEvent, 'localhost');
  // The approveBudgetAndFund workflow has to skip the approval state
  // owing to the lack of a UI
  // await waitForExpect(async () => {
  //   fakeChain;
  //   expect(playerA.workflowState).toEqual('waitForUserApproval');
  // }, 3000);
  playerA.channelWallet.workflows[0].service.send({type: 'USER_APPROVES_BUDGET'});

  await createBudgetPromise;

  // Check that the ledger channel is set up correct
  const ledgerEntry = await playerA.store.getLedger(hub.signingAddress);
  expect(ledgerEntry.isSupported).toBe(true);
  const allocation = assertSimpleEthAllocation(ledgerEntry.supported.outcome);
  expect(allocation.allocationItems).toContainEqual({
    destination: hub.destination,
    amount: BN.from(hexZeroPad('0x5', 32))
  });
  expect(allocation.allocationItems).toContainEqual({
    destination: playerA.destination,
    amount: BN.from(hexZeroPad('0x5', 32))
  });
  // Check that the funds are reflected on chain
  const chainInfo = await playerA.store.chain.getChainInfo(ledgerEntry.channelId);
  expect(chainInfo.amount).toBe(BN.from(10));

  expect(await playerA.store.getBudget(TEST_APP_DOMAIN)).toBeDefined();
});

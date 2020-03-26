import {filter, map, first} from 'rxjs/operators';
import {FakeChain} from '../chain';
import {Player, generateApproveBudgetAndFundRequest, hookUpMessaging} from './helpers';
import {FundLedger} from '../store/types';
import {checkThat} from '../utils';
import {isSimpleEthAllocation} from '../utils/outcome';

import {bigNumberify, hexZeroPad} from 'ethers/utils';
import {ApproveBudgetAndFundResponse} from '@statechannels/client-api-schema/src';

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
  // The approveBudgetAndFund workflow has to skip the approval state
  // owing to the lack of a UI
  // await waitForExpect(async () => {
  //   fakeChain;
  //   expect(playerA.workflowState).toEqual('waitForUserApproval');
  // }, 3000);
  playerA.channelWallet.workflows[0].machine.send({type: 'USER_APPROVES_BUDGET'});

  await createBudgetPromise;

  // Check that the ledger channel is set up correct
  const ledgerEntry = await playerA.store.getLedger(hub.signingAddress);
  expect(ledgerEntry.isSupported).toBe(true);
  const allocation = checkThat(ledgerEntry.supported.outcome, isSimpleEthAllocation);
  expect(allocation.allocationItems).toContainEqual({
    destination: hub.destination,
    amount: bigNumberify(hexZeroPad('0x5', 32))
  });
  expect(allocation.allocationItems).toContainEqual({
    destination: playerA.destination,
    amount: bigNumberify(hexZeroPad('0x5', 32))
  });
  // Check that the funds are reflected on chain
  const chainInfo = await playerA.store.chain.getChainInfo(ledgerEntry.channelId);
  expect(chainInfo.amount.eq(10)).toBe(true);
});

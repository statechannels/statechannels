import {CloseAndWithdrawResponse} from '@statechannels/client-api-schema';
import {filter, map, first} from 'rxjs/operators';
import {
  simpleEthAllocation,
  isCloseLedger,
  CloseLedger,
  BN,
  Zero
} from '@statechannels/wallet-core';
import waitForExpect from 'wait-for-expect';

import {CHALLENGE_DURATION} from '../config';
import {FakeChain} from '../chain';
import {TEST_APP_DOMAIN, budget} from '../workflows/tests/data';

import {Player, hookUpMessaging, generateCloseAndWithdrawRequest} from './helpers';
jest.setTimeout(30000);

it('allows for a wallet to close the ledger channel with the hub and withdraw', async () => {
  const fakeChain = new FakeChain();
  await fakeChain.ethereumEnable();
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
  const outcome = simpleEthAllocation([
    {amount: BN.from(6), destination: playerA.destination},
    {amount: BN.from(4), destination: hub.destination}
  ]);
  hookUpMessaging(playerA, hub);

  const ledgerChannel = await playerA.store.createChannel(
    [playerA, hub].map(p => p.participant),
    CHALLENGE_DURATION,
    {
      outcome,
      turnNum: 20,
      isFinal: false,
      appData: '0x00'
    }
  );

  await playerA.store.setDestinationAddress(playerA.signingAddress);
  await playerA.store.createBudget(budget(BN.from(6), BN.from(4)));
  await hub.store.createBudget(budget(BN.from(6), BN.from(4)));

  await playerA.store.setLedger(ledgerChannel.channelId);
  await hub.store
    .channelUpdatedFeed(ledgerChannel.channelId)
    .pipe(first())
    .toPromise();
  await hub.store.setLedger(ledgerChannel.channelId);
  await hub.store.signAndAddState(ledgerChannel.channelId, ledgerChannel.latest);
  await playerA.store.chain.deposit(ledgerChannel.channelId, '0x00', '0x10');

  hub.store.objectiveFeed.pipe(filter(o => isCloseLedger(o))).subscribe(async o => {
    hub.startCloseLedgerAndWithdraw({
      player: hub.participant,
      opponent: playerA.participant,
      requestId: 134556607,
      ledgerId: (o as CloseLedger).data.ledgerId,
      domain: TEST_APP_DOMAIN
    });
  });

  const closeAndWithdrawMessage = generateCloseAndWithdrawRequest(
    playerA.participant,
    hub.participant
  );
  const closeAndWithdrawPromise = playerA.messagingService.outboxFeed
    .pipe(
      filter(m => 'id' in m && m.id === closeAndWithdrawMessage.id),
      map(m => m as CloseAndWithdrawResponse),
      first()
    )
    .toPromise();
  await playerA.messagingService.receiveRequest(closeAndWithdrawMessage, 'localhost');

  await waitForExpect(async () => {
    expect(playerA.workflowState).toEqual('waitForUserApproval');
  }, 3000);
  playerA.channelWallet.workflows[0].service.send({type: 'USER_APPROVES_CLOSE'});
  await waitForExpect(async () => {
    expect(hub.workflowState).toEqual('waitForUserApproval');
  }, 3000);
  hub.channelWallet.workflows[0].service.send({type: 'USER_APPROVES_CLOSE'});

  const closeAndWithdrawResponse: CloseAndWithdrawResponse = await closeAndWithdrawPromise;

  // Verify the response is correct
  expect(closeAndWithdrawResponse.result.success).toBe(true);

  // Verify that the blockchain is correct
  const chainView = await playerA.store.chain.getChainInfo(ledgerChannel.channelId);
  expect(chainView.channelStorage.finalizesAt > 0).toBe(true);
  expect(chainView.amount).toBe(Zero);

  // Check the channel is finalized
  const latestEntry = await playerA.store.getEntry(ledgerChannel.channelId);
  expect(latestEntry.hasConclusionProof).toBe(true);

  waitForExpect(async () => {
    expect(playerA.workflowState).toEqual('success');
  }, 3000);
  // Check the budget has been removed
  expect(await playerA.store.dbBackend.getBudget(TEST_APP_DOMAIN)).not.toBeDefined();
});

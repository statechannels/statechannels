import {
  CreateChannelParams,
  Participant,
  Allocation,
  CloseChannelParams,
} from '@statechannels/client-api-schema';
import {BN, makeDestination} from '@statechannels/wallet-core';
import {ETH_ASSET_HOLDER_ADDRESS} from '@statechannels/wallet-core/lib/src/config';
import {ethers} from 'ethers';

import {defaultTestConfig} from '../../config';
import {Wallet} from '../../wallet';
import {getChannelResultFor, getPayloadFor} from '../test-helpers';

const a = new Wallet({...defaultTestConfig, postgresDBName: 'TEST_A'});
const b = new Wallet({...defaultTestConfig, postgresDBName: 'TEST_B'});

let channelId: string;
let participantA: Participant;
let participantB: Participant;

beforeAll(async () => {
  await a.dbAdmin().createDB();
  await b.dbAdmin().createDB();
  await Promise.all([a.dbAdmin().migrateDB(), b.dbAdmin().migrateDB()]);

  participantA = {
    signingAddress: await a.getSigningAddress(),
    participantId: 'a',
    destination: makeDestination(
      '0xaaaa000000000000000000000000000000000000000000000000000000000001'
    ),
  };
  participantB = {
    signingAddress: await b.getSigningAddress(),
    participantId: 'b',
    destination: makeDestination(
      '0xbbbb000000000000000000000000000000000000000000000000000000000002'
    ),
  };

  /**
   * Create a directly funded channel that will be used as the ledger channel.
   *
   * Note that this is just a simplification of the direct-funding test.
   */

  // TODO: Play around with these numbers and test underflow scenarios
  const aDepositAmtETH = BN.from(1);
  const bDepositAmtETH = BN.from(1);

  const ledgerChannelArgs = {
    participants: [participantA, participantB],
    allocations: [
      {
        allocationItems: [
          {
            destination: participantA.destination,
            amount: aDepositAmtETH,
          },
          {
            destination: participantB.destination,
            amount: bDepositAmtETH,
          },
        ],
        token: ETH_ASSET_HOLDER_ADDRESS,
      },
    ],
    appDefinition: ethers.constants.AddressZero,
    appData: '0x00',
    fundingStrategy: 'Direct' as const,
  };
  const resultA0 = await a.createChannel(ledgerChannelArgs);
  channelId = resultA0.channelResults[0].channelId;
  await b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));
  const resultB1 = await b.joinChannel({channelId});
  await a.pushMessage(getPayloadFor(participantA.participantId, resultB1.outbox));
  const fundingPostADeposit = {
    channelId,
    token: ETH_ASSET_HOLDER_ADDRESS,
    amount: aDepositAmtETH,
  };
  await a.updateFundingForChannels([fundingPostADeposit]);
  await b.updateFundingForChannels([fundingPostADeposit]);
  const fundingPostBDeposit = {
    channelId,
    token: ETH_ASSET_HOLDER_ADDRESS,
    amount: BN.add(aDepositAmtETH, bDepositAmtETH),
  };
  const resultA2 = await a.updateFundingForChannels([fundingPostBDeposit]);
  await b.updateFundingForChannels([fundingPostBDeposit]);
  const resultB3 = await b.pushMessage(getPayloadFor(participantB.participantId, resultA2.outbox));
  await a.pushMessage(getPayloadFor(participantA.participantId, resultB3.outbox));

  // FIXME: Should not need to do this
  a.__setLedger(channelId, ETH_ASSET_HOLDER_ADDRESS);
  b.__setLedger(channelId, ETH_ASSET_HOLDER_ADDRESS);
});

afterAll(async () => {
  await Promise.all([a.destroy(), b.destroy()]);
  await a.dbAdmin().dropDB();
  await b.dbAdmin().dropDB();
  // TODO: Add to the truncate / dropDB method
  a.store.eraseLedgerDataFromMemory();
  b.store.eraseLedgerDataFromMemory();
});

it('Create a ledger funded channel between two wallets ', async () => {
  const allocation: Allocation = {
    allocationItems: [
      {
        destination: participantA.destination,
        amount: BN.from(1),
      },
      {
        destination: participantB.destination,
        amount: BN.from(1),
      },
    ],
    token: ETH_ASSET_HOLDER_ADDRESS, // must be even length
  };

  const createChannelParams: CreateChannelParams = {
    participants: [participantA, participantB],
    allocations: [allocation],
    appDefinition: ethers.constants.AddressZero,
    appData: '0x00', // must be even length
    fundingStrategy: 'Ledger',
  };

  //        A <> B
  // PreFund0
  const resultA0 = await a.createChannel(createChannelParams);

  // TODO compute the channelId for a better test
  channelId = resultA0.channelResults[0].channelId;

  expect(getChannelResultFor(channelId, resultA0.channelResults)).toMatchObject({
    status: 'opening',
    turnNum: 0,
  });

  expect(resultA0.outbox[0].params.data).toMatchObject({
    signedStates: [
      {turnNum: 0}, // The application's post fund
    ],
  });

  //    > PreFund0A
  const resultB0 = await b.pushMessage(getPayloadFor(participantB.participantId, resultA0.outbox));

  expect(getChannelResultFor(channelId, resultB0.channelResults)).toMatchObject({
    status: 'proposed',
    turnNum: 0,
  });

  //       PreFund0B
  //   LedgerUpdateB
  const resultB1 = await b.joinChannel({channelId});

  expect(getChannelResultFor(channelId, [resultB1.channelResult])).toMatchObject({
    status: 'opening',
    turnNum: 1,
  });

  expect(resultB1.outbox[0].params.data).toMatchObject({
    signedStates: [
      {turnNum: 5}, // The ledger channel update
      {turnNum: 1}, // The application's pre fund
    ],
  });

  //        PreFund0B <
  //    LedgerUpdateB <
  // LedgerUpdateA
  // PostFund2A
  const resultA1 = await a.pushMessage(getPayloadFor(participantA.participantId, resultB1.outbox));

  expect(getChannelResultFor(channelId, resultA1.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 2,
  });

  expect(resultA1.outbox[0].params.data).toMatchObject({
    signedStates: [
      {turnNum: 5}, // The ledger channel update
      {turnNum: 2}, // The application's post fund
    ],
  });

  // > PostFund3A
  // > LedgerUpdateA
  //     PostFund3B
  const resultB3 = await b.pushMessage(getPayloadFor(participantB.participantId, resultA1.outbox));

  expect(getChannelResultFor(channelId, resultB3.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });

  expect(resultB3.outbox[0].params.data).toMatchObject({
    signedStates: [
      {turnNum: 3}, // The application's post fund
    ],
  });

  //    PostFund3B <
  const resultA3 = await a.pushMessage(getPayloadFor(participantA.participantId, resultB3.outbox));

  expect(getChannelResultFor(channelId, resultA3.channelResults)).toMatchObject({
    status: 'running',
    turnNum: 3,
  });
});

it('Rejects b closing with `not your turn`', async () => {
  const closeChannelParams: CloseChannelParams = {
    channelId,
  };

  const bCloseChannel = b.closeChannel(closeChannelParams);

  await expect(bCloseChannel).rejects.toMatchObject(new Error('not my turn'));
});

it('Closes the channel', async () => {
  const closeChannelParams: CloseChannelParams = {
    channelId,
  };

  // A generates isFinal4
  const aCloseChannelResult = await a.closeChannel(closeChannelParams);

  expect(getChannelResultFor(channelId, [aCloseChannelResult.channelResult])).toMatchObject({
    status: 'closing',
    turnNum: 4,
  });

  const bPushMessageResult = await b.pushMessage(
    getPayloadFor(participantB.participantId, aCloseChannelResult.outbox)
  );

  // B pushed isFinal4, generated countersigned isFinal4
  expect(getChannelResultFor(channelId, bPushMessageResult.channelResults)).toMatchObject({
    status: 'closed',
    turnNum: 4,
  });

  // A pushed the countersigned isFinal4
  const aPushMessageResult = await a.pushMessage(
    getPayloadFor(participantA.participantId, bPushMessageResult.outbox)
  );

  expect(getChannelResultFor(channelId, aPushMessageResult.channelResults)).toMatchObject({
    status: 'closed',
    turnNum: 4,
  });
});

import _ from 'lodash';
import {
  addHash,
  createSignatureEntry,
  hashState,
  SignedStateVarsWithHash,
  unreachable,
} from '@statechannels/wallet-core';
import {ethers} from 'ethers';

import {testKnex as knex} from '../../../jest/knex-setup-teardown';
import {defaultTestConfig} from '../../config';
import {SignedBy, StateWithBals, TestChannel} from '../../engine/__test__/fixtures/test-channel';
import {Store} from '../../engine/store';
import {TestLedgerChannel} from '../../engine/__test__/fixtures/test-ledger-channel';
import {createLogger} from '../../logger';
import {LedgerRequestStatus, RichLedgerRequest} from '../../models/ledger-request';
import {DBAdmin} from '../..';
import {LedgerManager} from '../ledger-manager';
import {Destination} from '../../type-aliases';
import {State} from '../../models/channel/state';
import {addState, clearOldStates, dropNonVariables} from '../../state-utils';
import {channel} from '../../models/__test__/fixtures/channel';

jest.setTimeout(10_000);

let store: Store;

let manager: LedgerManager;
beforeAll(async () => {
  await DBAdmin.migrateDatabase(defaultTestConfig());
  store = new Store(
    knex,
    defaultTestConfig().metricsConfiguration.timingMetrics,
    defaultTestConfig().skipEvmValidation,
    '0',
    createLogger(defaultTestConfig())
  );
  manager = await LedgerManager.create({store});
});

afterEach(async () => {
  await DBAdmin.truncateDatabase(defaultTestConfig());
});

it(
  'SYNC: will create a proposal from requests in the queue',
  testLedgerCrank({
    as: 'leader',
    before: {
      agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
      requests: [
        ['fund', 'd', 1, 1, 'queued'],
        ['defund', 'c', 5, 5, 'queued'],
      ],
    },
    after: {
      agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
      proposed: {turn: 6, bals: {a: 9, b: 9, d: 2}},
      requests: [
        ['fund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 5}],
        ['defund', 'c', 5, 5, 'pending', {missedOps: 0, lastSeen: 5}],
      ],
    },
  })
);

describe('as leader', () => {
  describe('in the accept state', () => {
    it(
      'will create a proposal from requests in the queue',
      testLedgerCrank({
        as: 'leader',
        before: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          requests: [
            ['fund', 'd', 1, 1, 'queued'],
            ['defund', 'c', 5, 5, 'queued'],
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          proposed: {turn: 6, bals: {a: 9, b: 9, d: 2}},
          requests: [
            ['fund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 5, 5, 'pending', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );

    it(
      `will marks requests that appear in the state as successful`,
      testLedgerCrank({
        as: 'leader',
        before: {
          agreed: {turn: 6, bals: {a: 9, b: 9, d: 2}},
          requests: [
            ['fund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 5, 5, 'queued', {missedOps: 0, lastSeen: 5}],
          ],
        },
        after: {
          agreed: {turn: 6, bals: {a: 9, b: 9, d: 2}},
          requests: [
            ['fund', 'd', 1, 1, 'succeeded', {missedOps: 0, lastSeen: 6}],
            ['defund', 'c', 5, 5, 'succeeded', {missedOps: 0, lastSeen: 6}],
          ],
        },
      })
    );

    it(
      `it increases missedOps if the requests aren't accepted`,
      testLedgerCrank({
        as: 'leader',
        before: {
          agreed: {turn: 6, bals: {a: 5, b: 5, c: 10}},
          requests: [
            ['fund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 5}], // was pending, but not accepted
            ['defund', 'c', 5, 5, 'queued'], // didn't see state 5, so won't be a missedOp
          ],
        },
        after: {
          agreed: {turn: 6, bals: {a: 5, b: 5, c: 10}},
          proposed: {turn: 7, bals: {a: 9, b: 9, d: 2}},
          requests: [
            ['fund', 'd', 1, 1, 'pending', {missedOps: 1, lastSeen: 6}],
            ['defund', 'c', 5, 5, 'pending', {missedOps: 0, lastSeen: 6}],
          ],
        },
      })
    );

    it(
      `will mark bad requests as insufficent-funds / inconsistent`,
      testLedgerCrank({
        as: 'leader',
        before: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          requests: [
            ['fund', 'd', 6, 6, 'queued', {missedOps: 0, lastSeen: 5}], // not enough funds
            ['defund', 'c', 1, 1, 'queued', {missedOps: 0, lastSeen: 5}], // c has 10, not 2
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          requests: [
            ['fund', 'd', 6, 6, 'insufficient-funds', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 1, 1, 'inconsistent', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );

    it(
      `will cancel two requests where the funding is still queued`,
      testLedgerCrank({
        as: 'leader',
        before: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          requests: [
            ['fund', 'd', 1, 1, 'queued', {missedOps: 0, lastSeen: 5}],
            ['defund', 'd', 1, 1, 'queued'],
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          requests: [
            ['fund', 'd', 1, 1, 'cancelled', {missedOps: 0, lastSeen: 5}],
            ['defund', 'd', 1, 1, 'cancelled', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );

    it(
      `will cancel two requests where the funding was pending but not accepted`,
      testLedgerCrank({
        as: 'leader',
        before: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          requests: [
            ['fund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'd', 1, 1, 'queued'],
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          requests: [
            ['fund', 'd', 1, 1, 'cancelled', {missedOps: 0, lastSeen: 5}],
            ['defund', 'd', 1, 1, 'cancelled', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );

    it(
      `won't cancel requests if the funding has already been accepted`,
      testLedgerCrank({
        as: 'leader',
        before: {
          agreed: {turn: 5, bals: {a: 4, b: 4, c: 10, d: 2}},
          requests: [
            ['fund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'd', 1, 1, 'queued'],
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 4, b: 4, c: 10, d: 2}},
          proposed: {turn: 6, bals: {a: 5, b: 5, c: 10}},
          requests: [
            ['fund', 'd', 1, 1, 'succeeded', {missedOps: 0, lastSeen: 5}],
            ['defund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );

    it(
      `won't mark requests as insufficient-funding if there's a defund that frees enough funds`,
      testLedgerCrank({
        as: 'leader',
        before: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          requests: [
            ['fund', 'd', 6, 6, 'pending'], // not enough funds for this
            ['defund', 'c', 1, 9, 'queued'], // .. unless this defund is applied first
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          proposed: {turn: 6, bals: {a: 0, b: 8, d: 12}},
          requests: [
            ['fund', 'd', 6, 6, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 1, 9, 'pending', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );
  });

  describe('in the proposal state', () => {
    it(
      'takes no action',
      testLedgerCrank({
        as: 'leader',
        before: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          proposed: {turn: 6, bals: {a: 9, b: 9, d: 2}},
          requests: [
            ['fund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 5, 5, 'pending', {missedOps: 0, lastSeen: 5}],
            ['fund', 'e', 1, 1, 'queued', {missedOps: 0, lastSeen: 5}],
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          proposed: {turn: 6, bals: {a: 9, b: 9, d: 2}},
          requests: [
            ['fund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 5, 5, 'pending', {missedOps: 0, lastSeen: 5}],
            ['fund', 'e', 1, 1, 'queued', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );
  });

  describe('in the counter-proposal state', () => {
    it(
      `will accept a counter-proposal and re-propose any missing requests`,
      testLedgerCrank({
        as: 'leader',
        before: {
          agreed: {turn: 5, bals: {a: 5, b: 5, c: 10}},
          proposed: {turn: 6, bals: {a: 9, b: 9, d: 2}}, // leader proposes fund d and defund c
          counterProposed: {turn: 7, bals: {a: 4, b: 4, c: 10, d: 2}}, // follower just accepted fund d
          requests: [
            ['fund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 5, 5, 'pending', {missedOps: 0, lastSeen: 5}],
          ],
        },
        after: {
          agreed: {turn: 7, bals: {a: 4, b: 4, c: 10, d: 2}}, // counterProposal -> agreed
          proposed: {turn: 8, bals: {a: 9, b: 9, d: 2}}, // re-propose to defund c
          requests: [
            ['fund', 'd', 1, 1, 'succeeded', {missedOps: 0, lastSeen: 7}],
            ['defund', 'c', 5, 5, 'pending', {missedOps: 1, lastSeen: 7}],
          ],
        },
      })
    );

    it(
      `won't apply cancellations if the state was accepted`,
      testLedgerCrank({
        as: 'leader',
        before: {
          agreed: {turn: 5, bals: {a: 10, b: 10}},
          proposed: {turn: 6, bals: {a: 7, b: 8, d: 2, c: 3}}, // leader proposes fund c and d
          counterProposed: {turn: 7, bals: {a: 9, b: 9, d: 2}}, // follower just accepted fund d
          requests: [
            ['fund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['fund', 'c', 2, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'd', 1, 1, 'queued'], // but now we have a defund request for d
          ],
        },
        after: {
          agreed: {turn: 7, bals: {a: 9, b: 9, d: 2}}, // leader accepts counterproposal
          proposed: {turn: 8, bals: {a: 8, b: 9, c: 3}}, // re-proposes fund c and defund d
          requests: [
            ['defund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 7}],
            ['fund', 'd', 1, 1, 'succeeded', {missedOps: 0, lastSeen: 7}],
            ['fund', 'c', 2, 1, 'pending', {missedOps: 1, lastSeen: 7}],
          ],
        },
      })
    );
    it(
      `will apply cancellations if the state wasn't accepted`,
      testLedgerCrank({
        as: 'leader',
        before: {
          agreed: {turn: 5, bals: {a: 10, b: 10}},
          proposed: {turn: 6, bals: {a: 7, b: 8, d: 2, c: 3}}, // leader proposes fund c and d
          counterProposed: {turn: 7, bals: {a: 9, b: 9, d: 2}}, // follower just accepted fund d
          requests: [
            ['fund', 'd', 1, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['fund', 'c', 2, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 2, 1, 'queued'], // but now we have a defund request for c
          ],
        },
        after: {
          agreed: {turn: 7, bals: {a: 9, b: 9, d: 2}}, // leader accepts counterproposal
          requests: [
            ['fund', 'd', 1, 1, 'succeeded', {missedOps: 0, lastSeen: 7}],
            ['fund', 'c', 2, 1, 'cancelled', {missedOps: 0, lastSeen: 7}],
            ['defund', 'c', 2, 1, 'cancelled', {missedOps: 0, lastSeen: 7}],
          ],
        },
      })
    );
  });
});

describe('as follower', () => {
  describe('in the agreement state', () => {
    it(
      `marks included requests as succeeded`,
      testLedgerCrank({
        as: 'follower',
        before: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 2}},
          requests: [
            ['defund', 'd', 1, 1, 'pending'], // d is not there, so this succeeded
            ['fund', 'c', 2, 0, 'pending'], // this also succeeded
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 2}},
          requests: [
            ['defund', 'd', 1, 1, 'succeeded', {missedOps: 0, lastSeen: 5}],
            ['fund', 'c', 2, 0, 'succeeded', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );
    it(
      `marks inconsistent states`,
      testLedgerCrank({
        as: 'follower',
        before: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 2, d: 1}},
          requests: [
            ['defund', 'd', 1, 1, 'queued'], // amount doesn't match with d's total
            ['fund', 'c', 2, 1, 'queued'], // c is funded, but with a different amt
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 2, d: 1}},
          requests: [
            ['defund', 'd', 1, 1, 'inconsistent', {missedOps: 0, lastSeen: 5}],
            ['fund', 'c', 2, 1, 'inconsistent', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );
    it(
      `will cancel requests that haven't been included`,
      testLedgerCrank({
        as: 'follower',
        before: {
          agreed: {turn: 5, bals: {a: 10, b: 10}},
          requests: [
            ['fund', 'c', 2, 1, 'queued'],
            ['defund', 'c', 2, 1, 'queued'],
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 10, b: 10}},
          requests: [
            ['fund', 'c', 2, 1, 'cancelled', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 2, 1, 'cancelled', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );
    it(
      `won't cancel requests that have been included`,
      testLedgerCrank({
        as: 'follower',
        before: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 3}},
          requests: [
            ['fund', 'c', 2, 1, 'pending'], // has been included
            ['defund', 'c', 2, 1, 'queued'],
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 3}},
          requests: [
            ['fund', 'c', 2, 1, 'succeeded', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 2, 1, 'queued', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );
  });
  describe('in the proposal state', () => {
    it(
      `accepts the state if complete overlap`,
      testLedgerCrank({
        as: 'follower',
        before: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 3}},
          proposed: {turn: 6, bals: {a: 8, b: 10, d: 5}},
          requests: [
            ['fund', 'd', 4, 1, 'queued'], // included in proposal
            ['defund', 'c', 2, 1, 'queued'], // included in proposal
            ['fund', 'e', 1, 1, 'queued'],
          ],
        },
        after: {
          agreed: {turn: 6, bals: {a: 8, b: 10, d: 5}},
          requests: [
            ['fund', 'd', 4, 1, 'succeeded', {missedOps: 0, lastSeen: 6}],
            ['defund', 'c', 2, 1, 'succeeded', {missedOps: 0, lastSeen: 6}],
            ['fund', 'e', 1, 1, 'queued', {missedOps: 1, lastSeen: 6}],
          ],
        },
      })
    );
    it(
      `makes a counterproposal if there's some overlap`,
      testLedgerCrank({
        as: 'follower',
        before: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 3, g: 1}},
          proposed: {turn: 6, bals: {a: 8, b: 10, d: 5, f: 2}},
          requests: [
            ['fund', 'd', 4, 1, 'queued'], // included in proposal
            ['defund', 'c', 2, 1, 'queued'], // included in proposal
            ['fund', 'e', 1, 1, 'queued'],
            // don't have defund g
            // don't have fund f
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 3, g: 1}},
          proposed: {turn: 6, bals: {a: 8, b: 10, d: 5, f: 2}},
          counterProposed: {turn: 7, bals: {a: 8, b: 10, d: 5, g: 1}},
          requests: [
            ['fund', 'd', 4, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 2, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['fund', 'e', 1, 1, 'queued', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );
    it(
      `makes a counterproposal to return to agreed if there's no overlap`,
      testLedgerCrank({
        as: 'follower',
        before: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 3, g: 1}},
          proposed: {turn: 6, bals: {a: 8, b: 10, d: 5, f: 2}},
          requests: [
            ['fund', 'e', 1, 1, 'queued'],
            // don't have fund f, defund g, fund d or defund c
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 3, g: 1}},
          proposed: {turn: 6, bals: {a: 8, b: 10, d: 5, f: 2}},
          counterProposed: {turn: 7, bals: {a: 10, b: 10, c: 3, g: 1}},
          requests: [['fund', 'e', 1, 1, 'queued', {missedOps: 0, lastSeen: 5}]],
        },
      })
    );
  });
  describe('in the counter-proposal state', () => {
    it(
      `takes no action`,
      testLedgerCrank({
        as: 'follower',
        before: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 3, g: 1}},
          proposed: {turn: 6, bals: {a: 8, b: 10, d: 5, f: 2}},
          counterProposed: {turn: 7, bals: {a: 8, b: 10, d: 5, g: 1}},
          requests: [
            ['fund', 'd', 4, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 2, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['fund', 'e', 1, 1, 'queued', {missedOps: 0, lastSeen: 5}],
          ],
        },
        after: {
          agreed: {turn: 5, bals: {a: 10, b: 10, c: 3, g: 1}},
          proposed: {turn: 6, bals: {a: 8, b: 10, d: 5, f: 2}},
          counterProposed: {turn: 7, bals: {a: 8, b: 10, d: 5, g: 1}},
          requests: [
            ['fund', 'd', 4, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['defund', 'c', 2, 1, 'pending', {missedOps: 0, lastSeen: 5}],
            ['fund', 'e', 1, 1, 'queued', {missedOps: 0, lastSeen: 5}],
          ],
        },
      })
    );
  });
});

function testLedgerCrank(args: LedgerCrankTestCaseArgs): () => Promise<void> {
  return async () => {
    // setup
    // -----
    const testCase = new LedgerCrankTestCase(args);

    // - create skeleton ledgerChannelObject
    const ledgerChannel = TestLedgerChannel.create({});

    const channelLookup = new ChannelLookup();
    channelLookup.set('a', ledgerChannel.participantA.destination);
    channelLookup.set('b', ledgerChannel.participantB.destination);

    // first we need to turn strings like 'c' and 'd' into actual channels in the store
    for (const key of testCase.referencedChannelDests) {
      channelLookup.set(key, TestChannel.create({aBal: 5, bBal: 5}).channelId);
    }

    // - construct and add the before states
    const stateToParams = (
      state: StateDesc,
      type: 'agreed' | 'proposed' | 'counter-proposed'
    ): StateWithBals => ({
      turn: state.turn,
      bals: Object.keys(state.bals).map(
        k => [channelLookup.get(k), state.bals[k]] as [string, number]
      ),
      signedBy: {agreed: 'both', proposed: 0, 'counter-proposed': 1}[type] as SignedBy,
    });

    const statesToInsert: StateWithBals[] = _.compact([
      testCase.agreedBefore && stateToParams(testCase.agreedBefore, 'agreed'),
      testCase.proposedBefore && stateToParams(testCase.proposedBefore, 'proposed'),
      testCase.counterProposedBefore &&
        stateToParams(testCase.counterProposedBefore, 'counter-proposed'),
    ]);

    const myIndex = args.as === 'leader' ? 0 : 1;
    await ledgerChannel.insertInto(store, {
      participant: myIndex,
      states: statesToInsert,
    });

    const originalRequests: RichLedgerRequest[] = [];
    for (const req of testCase.requestsBefore) {
      const channelToBeFunded = channelLookup.get(req.channelKey);

      switch (req.type) {
        case 'fund':
          originalRequests.push(ledgerChannel.fundingRequest({...req, channelToBeFunded}));
          break;
        case 'defund':
          originalRequests.push(ledgerChannel.defundingRequest({...req, channelToBeFunded}));
          break;
        default:
          unreachable(req.type);
      }
    }

    // crank
    // -----
    const channelId = ledgerChannel.channelId;

    // Collect the correct input to the synchronous logic
    const tx = store.knex as any;
    const DELETE_ME_storedLedger = await store.getAndLockChannel(channelId, tx);

    const vars = statesToInsert
      .map(s => ledgerChannel.signedStateWithHash(s.turn, s.bals, s.signedBy))
      .map(dropNonVariables);

    expect(vars.map(_summary).sort()[0]).toMatchObject(
      DELETE_ME_storedLedger.vars.map(_summary).sort()[0]
    );
    // console.log(vars.map(_summary).sort()[0]);
    // console.log(DELETE_ME_storedLedger.vars.map(_summary).sort()[0]);
    expect(_.sortBy(vars, s => s.stateHash)).toEqual(
      _.sortBy(DELETE_ME_storedLedger.vars, s => s.stateHash)
    );

    const privateKey =
      args.as === 'leader'
        ? '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318'
        : '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727';
    const {address: signingAddress} = new ethers.Wallet(privateKey);

    const ledger = channel({
      ...ledgerChannel.channelConstants,
      channelId,
      myIndex,
      signingAddress,
      // TODO: There is a bug here, where the behaviour of the ledger funding protocol differs
      // depending on how the states are stored
      vars: _.cloneDeep(_.sortBy(vars, s => -s.turnNum)),
    });

    const requests = _.cloneDeep(originalRequests);
    const requests2 = _.cloneDeep(originalRequests);
    expect(requests.map(describeRequest)).toEqual(requests2.map(describeRequest));

    const statesToBeSigned = manager.synchronousCrankLogic(DELETE_ME_storedLedger, requests);

    // BEGIN CODE FOR CREATING CONSISTENCY
    function _summary(s: State | SignedStateVarsWithHash) {
      const signatures = 'signatures' in s ? s.signatures : s.signedState.signatures;
      const hash = 'stateHash' in s ? s.stateHash : hashState(s.signedState);
      return [s.turnNum, hash, signatures.map(sig => (sig.signer[2] === '1' ? 'A' : 'B'))];
    }

    // REGRESSION
    function describeRequest(req: RichLedgerRequest): RequestDesc {
      return [
        req.type,
        channelLookup.getKey(req.channelToBeFunded),
        Number(req.amountA),
        Number(req.amountB),
        req.status,
        {missedOps: req.missedOpportunityCount, lastSeen: req.lastSeenAgreedState || undefined},
      ];
    }

    const statesToBeSigned2 = manager.synchronousCrankLogic(ledger, requests2);
    expect(requests.map(describeRequest)).toEqual(requests2.map(describeRequest));
    expect(statesToBeSigned.map(_summary).sort()).toMatchObject(
      statesToBeSigned2.map(_summary).sort()
    );
    // REGRESSION

    // console.log('as', args.as);
    const signedStatesBefore = statesToBeSigned.map(s => s.signedState).map(addHash);
    signedStatesBefore.forEach(s => (s.signatures = [createSignatureEntry(s, privateKey)]));
    // console.log('states signed', signedStatesBefore.map(_summary));

    // console.log('ledger before', ledger.vars.map(_summary));

    if (signedStatesBefore.length > 0) {
      signedStatesBefore.map(state => {
        // console.log('adding', _summary(state));
        // console.log('to', ledger.vars.map(_summary));
        ledger.vars = addState(ledger.vars, state);
        // console.log('gives', ledger.vars.map(_summary));
      });
    }

    // console.log(signedStatesBefore.map(_summary));
    // console.log('ledger after', ledger.vars.map(_summary));
    ledger.vars = clearOldStates(ledger.vars, ledger.support);
    // console.log('after clearing', ledger.vars.map(_summary));

    // END CODE FOR CREATING CONSISTENCY

    // assertions
    // ----------
    // get the latest agreed state and the turn number
    function checkRequests(requests: RichLedgerRequest[]): void {
      const agreedState = ledger.latestFullySignedState;
      if (!agreedState) throw new Error(`No latest agreed state`);
      const ledgerStateDesc: LedgerStateDescription = {
        agreed: toStateDesc(agreedState, channelLookup),
        requests: [],
      };

      const proposedState = ledger.uniqueStateAt(agreedState.turnNum + 1);
      if (proposedState) {
        expect(proposedState.signerIndices).toEqual([0]);
        ledgerStateDesc['proposed'] = toStateDesc(proposedState, channelLookup);
      }
      const counterProposedState = ledger.uniqueStateAt(agreedState.turnNum + 2);
      if (counterProposedState) {
        expect(counterProposedState.signerIndices).toEqual([1]);
        ledgerStateDesc['counterProposed'] = toStateDesc(counterProposedState, channelLookup);
      }

      ledgerStateDesc.requests = requests.map(describeRequest);
      ledgerStateDesc.requests.sort();
      args.after.requests.sort();
      expect(ledgerStateDesc).toEqual(args.after);
    }

    // REGRESSION
    checkRequests(requests);
    checkRequests(requests2);
    // REGRESSION
  };
}

function toStateDesc(state: State, lookup: ChannelLookup): StateDesc {
  const bals: StateDesc['bals'] = {};
  state.simpleAllocationOutcome?.items.forEach(
    i => (bals[lookup.getKey(i.destination)] = Number(i.amount))
  );
  return {
    turn: state.turnNum,
    bals,
  };
}
class LedgerCrankTestCase {
  constructor(private args: LedgerCrankTestCaseArgs) {}

  get statesBefore(): StateDesc[] {
    return _.compact([
      this.args.before.agreed,
      this.args.before.proposed,
      this.args.before.counterProposed,
    ]);
  }

  get statesAfter(): StateDesc[] {
    return _.compact([
      this.args.after.agreed,
      this.args.after.proposed,
      this.args.after.counterProposed,
    ]);
  }

  get agreedBefore(): StateDesc {
    return this.args.before.agreed;
  }
  get proposedBefore(): StateDesc | undefined {
    return this.args.before.proposed;
  }
  get counterProposedBefore(): StateDesc | undefined {
    return this.args.before.counterProposed;
  }

  get agreedAfter(): StateDesc {
    return this.args.after.agreed;
  }
  get proposedAfter(): StateDesc | undefined {
    return this.args.after.proposed;
  }
  get counterProposedAfter(): StateDesc | undefined {
    return this.args.after.counterProposed;
  }

  get requestsBefore(): Request[] {
    return this.args.before.requests.map(r => ({
      type: r[0],
      channelKey: r[1],
      amtA: r[2],
      amtB: r[3],
      status: r[4],
      missedOps: r[5]?.missedOps,
      lastSeen: r[5]?.lastSeen,
    }));
  }

  get requestsAfter(): Request[] {
    return this.args.after.requests.map(r => ({
      type: r[0],
      channelKey: r[1],
      amtA: r[2],
      amtB: r[3],
      status: r[4],
      missedOps: r[5]?.missedOps,
      lastSeen: r[5]?.lastSeen,
    }));
  }

  get referencedChannelDests(): string[] {
    const referencedChannels = new Set<string>();
    // add any channels referenced in the states
    [...this.statesBefore, ...this.statesAfter]
      .flatMap(s => Object.keys(s.bals))
      .forEach(x => referencedChannels.add(x));
    // as well as any channels referenced in the requests
    [...this.args.before.requests, ...this.args.after.requests].forEach(r =>
      referencedChannels.add(r[1])
    );
    // a and b are special and refer to the participants
    referencedChannels.delete('a');
    referencedChannels.delete('b');
    return Array.from(referencedChannels);
  }
}

class ChannelLookup {
  private lookup: Record<string, Destination> = {};

  get(key: string): Destination {
    const val = this.lookup[key];
    if (!val) throw Error(`ChannelLookup missing key ${key}`);
    return val;
  }

  getKey(val: string): string {
    const key = Object.keys(this.lookup).find(key => this.lookup[key] === val);
    if (!key) throw Error(`ChannelLookup missing key for value ${val}`);
    return key;
  }

  set(k: string, v: Destination): void {
    this.lookup[k] = v;
  }
}

interface Request {
  type: 'fund' | 'defund';
  channelKey: string;
  amtA: number;
  amtB: number;
  status: LedgerRequestStatus;
  missedOps?: number;
  lastSeen?: number;
}

type RequestDesc =
  | ['defund' | 'fund', string, number, number, LedgerRequestStatus]
  | [
      'defund' | 'fund',
      string,
      number,
      number,
      LedgerRequestStatus,
      {missedOps?: number; lastSeen?: number}
    ];

type StateDesc = {
  turn: number;
  bals: Record<string, number>;
};

interface LedgerStateDescription {
  agreed: StateDesc;
  proposed?: StateDesc;
  counterProposed?: StateDesc;
  requests: RequestDesc[];
}

interface LedgerCrankTestCaseArgs {
  as: 'leader' | 'follower';
  before: LedgerStateDescription;
  after: LedgerStateDescription;
}

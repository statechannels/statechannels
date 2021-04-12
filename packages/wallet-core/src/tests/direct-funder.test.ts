import {ethers} from 'ethers';
import * as _ from 'lodash';
import {DirectFunder} from 'protocols';

import {unreachable} from '../utils';
import {addHash, calculateChannelId} from '../state-utils';
import {BN} from '../bignumber';
import {
  Action,
  initialize,
  MAX_WAITING_TIME,
  openChannelCranker,
  OpenChannelEvent,
  OpenChannelObjective,
  OpenChannelResult,
  SignedStateHash,
  WaitingFor
} from '../protocols/direct-funder';
import {
  Address,
  makeAddress,
  SignedState,
  SimpleAllocation,
  State,
  StateWithHash,
  Uint256
} from '../types';

import {ONE_DAY, participants, signStateHelper} from './test-helpers';
import {DeepPartial, fixture} from './fixture';
const {A: participantA, B: participantB} = participants;

const {AddressZero} = ethers.constants;
jest.setTimeout(10_000);

type Peer = 'A' | 'B';

const deposits = {
  part: BN.from(2),
  A: BN.from(3),
  B: BN.from(5),
  total: BN.from(8)
};
const assetHolderAddress = makeAddress(AddressZero); // must be even length
const outcome: SimpleAllocation = {
  type: 'SimpleAllocation',
  allocationItems: [
    {destination: participantA.destination, amount: deposits.A},
    {destination: participantB.destination, amount: deposits.B}
  ],
  assetHolderAddress
};

const openingState: State = {
  participants: [participantA, participantB],
  chainId: '0x01',
  challengeDuration: ONE_DAY,
  channelNonce: 0,
  appDefinition: ethers.constants.AddressZero as Address,
  appData: makeAddress(AddressZero), // must be even length
  turnNum: 0,
  outcome,
  isFinal: false
};

const channelId = calculateChannelId(openingState);

function richify(
  state: State
): StateWithHash & {
  signedBy(...peers: Peer[]): SignedStateHash;
  stateSignedBy(...peers: Peer[]): SignedState;
} {
  const withHash = addHash(state);

  return {
    ...withHash,
    signedBy(...peers: Peer[]) {
      const signedState = signStateHelper(withHash, ...peers);
      const signatures = _.sortBy(signedState.signatures, sig => sig.signer);

      return {hash: withHash.stateHash, signatures};
    },
    stateSignedBy(...peers: Peer[]) {
      return signStateHelper(withHash, ...peers);
    }
  };
}

const richPreFS = richify(openingState);
const richPostFS = richify({...openingState, turnNum: 3});

const initial: OpenChannelObjective = {
  channelId,
  openingState,
  status: WaitingFor.theirPreFundSetup,
  myIndex: 0,
  preFundSetup: richPreFS.signedBy(),
  funding: {amount: BN.from(0), finalized: true},
  fundingRequest: undefined,
  postFundSetup: richPostFS.signedBy()
};

describe('initialization', () => {
  test('when the opening state makes sense', () => {
    expect(initialize(openingState, 0)).toMatchObject(initial);
    expect(initialize(openingState, 1)).toMatchObject({...initial, myIndex: 1});
    expect(initialize(signStateHelper(openingState, 'A'), 1)).toMatchObject({
      ...initial,
      myIndex: 1,
      preFundSetup: richPreFS.signedBy('A')
    });
    expect(initialize(signStateHelper(openingState, 'A', 'B'), 0)).toMatchObject({
      ...initial,
      preFundSetup: richPreFS.signedBy('A', 'B')
    });
    expect(initialize(signStateHelper(openingState, 'B', 'A'), 0)).toMatchObject({
      ...initial,
      preFundSetup: richPreFS.signedBy('A', 'B')
    });
  });

  test('when the index is out of range', () => {
    expect(() => initialize(openingState, -1)).toThrow('Unexpected index');
    expect(() => initialize(openingState, 0.5)).toThrow('Unexpected index');
    expect(() => initialize(openingState, 2)).toThrow('Unexpected index');
  });

  test('when the opening state has the wrong turn number', () => {
    expect(() => initialize({...openingState, turnNum: 1}, 0)).toThrow('Unexpected state');
  });

  test('when the outcome does not match the expectations', () => {
    expect(() => initialize({...openingState, outcome: 'any' as any}, 0)).toThrow(
      /not valid, isSimpleAllocation failed/
    );

    const outcome = {
      type: 'SimpleAllocation' as const,
      assetHolderAddress: ethers.constants.AddressZero as any,
      allocationItems: []
    };
    expect(() => initialize({...openingState, outcome}, 0)).toThrow('unexpected outcome');
  });
});

describe('cranking', () => {
  type TestCase = [
    string,
    OpenChannelObjective, // current
    OpenChannelEvent,
    DeepPartial<OpenChannelObjective>, // expected
    DeepPartial<Action>[]
  ];

  describe('as alice', () => {
    const objectiveFixture = fixture(initial);
    const empty = objectiveFixture();
    const zeroOutcomeState = addHash({
      ...openingState,
      outcome: {
        type: 'SimpleAllocation',
        assetHolderAddress,
        allocationItems: [
          {destination: participants.A.destination, amount: BN.from(0)},
          {destination: participants.B.destination, amount: BN.from(0)}
        ]
      }
    });
    const zeroOutcome = initialize(signStateHelper(zeroOutcomeState, 'A'), 1);

    const aliceSignedPre = objectiveFixture({
      status: WaitingFor.theirPreFundSetup,
      preFundSetup: richPreFS.signedBy('A')
    });
    const bobSigned = objectiveFixture({
      status: WaitingFor.theirPreFundSetup,
      preFundSetup: richPreFS.signedBy('B')
    });
    const readyToFund = objectiveFixture({
      status: WaitingFor.safeToDeposit,
      preFundSetup: richPreFS.signedBy('A', 'B')
    });
    const fundingRequest = {
      tx: 'tx',
      attempts: 0,
      submittedAt: 0
    };
    const depositPending = objectiveFixture({
      status: WaitingFor.theirPostFundState,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      fundingRequest
    });
    const deposited = objectiveFixture({
      status: WaitingFor.theirPostFundState,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: deposits.A, finalized: false},
      fundingRequest
    });
    const almostFunded = objectiveFixture({
      status: WaitingFor.theirPostFundState,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: deposits.total, finalized: false},
      fundingRequest
    });
    const funded = objectiveFixture({
      status: WaitingFor.theirPostFundState,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: deposits.total, finalized: true},
      fundingRequest
    });
    const aliceSignedPost = objectiveFixture({
      status: WaitingFor.theirPostFundState,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: deposits.total, finalized: true},
      fundingRequest,
      postFundSetup: richPostFS.signedBy('A')
    });

    const sendState: (signedState?: SignedState) => OpenChannelEvent = s => ({
      type: 'StatesReceived',
      states: s ? [s] : []
    });

    const submitted = (attempt: number, submittedAt = 0): OpenChannelEvent => ({
      type: 'DepositSubmitted',
      tx: 'tx',
      attempt,
      submittedAt
    });

    const deposit = (amount: number | Uint256, finalized = false): OpenChannelEvent => ({
      type: 'FundingUpdated',
      amount: BN.from(amount),
      finalized
    });

    const nudge = {type: 'Crank'} as const;

    const funding = (amount: number | Uint256, finalized = false) => ({
      amount: BN.from(amount),
      finalized
    });

    let msg: string;
    // prettier-ignore
    const cases: TestCase[] = [
      [msg = 'Nudging',
             empty,          nudge, {preFundSetup: richPreFS.signedBy('A')},      [{type: 'sendStates'}] ],
      [ msg, aliceSignedPre, nudge, {preFundSetup: richPreFS.signedBy('A')},      [] ],
      [ msg, bobSigned,      nudge, {preFundSetup: richPreFS.signedBy('A', 'B')}, [{type: 'sendStates'}, {type: 'deposit'}] ],
      [ msg, readyToFund,    nudge, {funding: funding(0, true)},                  [{type: 'deposit', amount: deposits.A}] ],
      [ msg, zeroOutcome,    nudge, {}, [{type: 'sendStates', states: [expect.objectContaining({turnNum: 0}), expect.objectContaining({turnNum: 3})]} ] ],
      

      [ msg = 'Receiving a preFundSetup state',
             empty,          sendState(richPreFS.stateSignedBy('B')), {preFundSetup: richPreFS.signedBy('A', 'B')}, [{type: 'sendStates'}, {type: 'deposit'}] ],
      [ msg, aliceSignedPre, sendState(richPreFS.stateSignedBy('B')), {preFundSetup: richPreFS.signedBy('A', 'B')}, [{type: 'deposit'}] ],


      [ msg = 'Receiving a deposit event',
             readyToFund, deposit(deposits.A),     {funding: funding(deposits.A),     postFundSetup: richPostFS.signedBy()}, [] ],
      [ msg, readyToFund, deposit(deposits.part),  {funding: funding(deposits.part),  postFundSetup: richPostFS.signedBy()}, [{type: 'deposit', amount: BN.sub(deposits.A, deposits.part)}] ],
      [ msg, readyToFund, deposit(deposits.total), {funding: funding(deposits.total), postFundSetup: richPostFS.signedBy()}, [] ],
      [ msg, readyToFund, deposit(deposits.total, true), {funding: funding(deposits.total, true), postFundSetup: richPostFS.signedBy('A')}, [{type: 'sendStates'}] ],

      [ msg, deposited, deposit(deposits.A),       {funding: funding(deposits.A),       postFundSetup: richPostFS.signedBy()}, [] ],
      [ msg, deposited, deposit(deposits.A, true), {funding: funding(deposits.A, true), postFundSetup: richPostFS.signedBy()}, [] ],
      [ msg, deposited, deposit(deposits.total),   {funding: funding(deposits.total),   postFundSetup: richPostFS.signedBy()}, [] ],
      [ msg, deposited, deposit(9),                {funding: funding(9),                postFundSetup: richPostFS.signedBy()}, [] ],
      [ msg, deposited, deposit(deposits.total, true), {funding: funding(deposits.total, true), postFundSetup: richPostFS.signedBy('A')}, [{type: 'sendStates'}] ],

      [ msg, almostFunded, deposit(deposits.A),       {funding: funding(deposits.A),     postFundSetup: richPostFS.signedBy()}, [] ],
      [ msg, almostFunded, deposit(deposits.total),   {funding: funding(deposits.total), postFundSetup: richPostFS.signedBy()}, [] ],
      [ msg, almostFunded, deposit(9),                {funding: funding(9),              postFundSetup: richPostFS.signedBy()}, [] ],
      [ msg, almostFunded, deposit(deposits.total, true), {funding: funding(deposits.total, true), postFundSetup: richPostFS.signedBy('A')}, [{type: 'sendStates'}] ],

      [ 'Receiving a deposit submitted event',
        depositPending, submitted(0), {funding: funding(0, true), fundingRequest: {tx: 'tx'}, postFundSetup: richPostFS.signedBy()}, [] ],

      [ msg = 'Receiving a preFundSetup state',
             funded,          nudge, {postFundSetup: richPostFS.signedBy('A' )}, [{type: 'sendStates'}] ],
      [ msg, funded,          sendState(richPostFS.stateSignedBy('B')), {status: 'success', postFundSetup: richPostFS.signedBy('A', 'B')}, [{type: 'sendStates'}] ],
      [ msg, aliceSignedPost, sendState(richPostFS.stateSignedBy('B')), {status: 'success', postFundSetup: richPostFS.signedBy('A', 'B')}, [] ],
    ];

    test.each(cases)('%s works: %#', (_msg, before, event, after, actions) => {
      expect(openChannelCranker(before, event, participants.A.privateKey)).toMatchObject({
        objective: after,
        actions
      });
    });

    const receiveNonParticipantState = sendState({
      ...openingState,
      signatures: [{signature: 'a sig', signer: 'eve' as any}]
    });
    const receiveUnexpectedState = sendState(signStateHelper({...openingState, turnNum: 1}));

    const handleError = (data: any) => (message: string) => {
      const error = new Error(message) as any;
      _.set(error, 'data', {...data, message});

      return {type: 'handleError' as const, error};
    };

    type ErrorCase = [
      DirectFunder.ErrorModes['message'],
      OpenChannelObjective, // current
      OpenChannelEvent,
      DeepPartial<OpenChannelObjective>, // expected
      // Generates an action, given a message
      (message: string) => {type: 'handleError'; error: Error & {data: any}}
    ];

    const error = {status: 'error'} as const;
    const theFuture = MAX_WAITING_TIME + 500;
    //prettier-ignore
    const errorCases: ErrorCase[] = [
      [ 'NonParticipantSignature', empty, receiveNonParticipantState, error, handleError({signature: {signer: 'eve'}})],
      [ 'ReceivedUnexpectedState', empty, receiveUnexpectedState, error,     handleError({received: expect.any(String), expected: [richPreFS.stateHash, richPostFS.stateHash]}) ],
      [ 'TimedOutWhileFunding', depositPending, {type: 'Crank', now: theFuture}, error, handleError({now: theFuture}) ],
      [ 'UnexpectedEvent',      depositPending, {type: 'Unknown'} as any, error, handleError({event: {type: 'Unknown'}}) ]
    ];
    test.each(errorCases)('error %s', (msg, before, event, after, actionGenerator) => {
      const result = openChannelCranker(before, event, participants.A.privateKey);
      expect(result).toMatchObject({
        objective: {...after, status: 'error'},
        actions: [{type: 'handleError', error: expect.any(Error)}]
      });

      const [{error}] = result.actions as any;
      const {error: expectedError} = actionGenerator(msg);
      expect(error.data).toMatchObject(expectedError.data);
    });
  });
});

function generateEvent(action: Action, objective: OpenChannelObjective): OpenChannelEvent {
  switch (action.type) {
    case 'deposit':
      // Assume no chain re-orgs
      return {
        type: 'FundingUpdated',
        amount: BN.add(action.amount, objective.funding.amount),
        finalized: false
      };
    case 'sendStates':
      return {type: 'StatesReceived', states: action.states};
    case 'handleError':
      throw action.error;
    default:
      return unreachable(action);
  }
}

function crankAndExpect(
  peer: Peer,
  currentState: Record<Peer, OpenChannelObjective>,
  actionOrEvent: Action | OpenChannelEvent,
  objective: DeepPartial<OpenChannelObjective>,
  actions: DeepPartial<Action>[]
): OpenChannelResult {
  const event =
    actionOrEvent.type === 'deposit' ||
    actionOrEvent.type === 'sendStates' ||
    actionOrEvent.type === 'handleError'
      ? generateEvent(actionOrEvent, currentState[peer])
      : actionOrEvent;
  const output = openChannelCranker(currentState[peer], event, participants[peer].privateKey);
  expect(output).toMatchObject({objective, actions});
  currentState[peer] = output.objective;

  return output;
}

test('pure objective cranker start to finish', () => {
  const currentState = {
    A: _.cloneDeep(initialize(openingState, 0)),
    B: _.cloneDeep(initialize(signStateHelper(openingState, 'A'), 1))
  };

  /*
  This test is meant to match eg. the with-peers direct-funding test from server-wallet
  It does not intend to test all behaviours of the protocol.
  In particular, similar to the matching server-wallet test, it  does not actually trigger funding, but manually
  tells the protocol that the channel's funding was updated
  See https://github.com/statechannels/statechannels/blob/2b188f919cc0d1b3d4a12aca8918ddc0fb1bbaca/packages/server-wallet/src/__test-with-peers__/create-and-close-channel/direct-funding.test.ts#L73

  For the purpose of this test, I am arbitrarily deciding that the actions & events occur in this order:
  1. Alice signs the preFS, triggers preFS action 1
  2. Bob receives preFS event 1, trigers preFS action 2
  3. Alice receives preFS event 2, triggers deposit action 1
  4. Alice receives deposit event 1, does nothing
  5. Bob receives deposit event 1, triggers deposit action 1
  6. Bob receives deposit action 2 (UNFINALIZED)
  7. Alice receives deposit action 2 (UNFINALIZED)
  8. Bob receives deposit action 2 (FINALIZED), triggers postFS action 1
  9. Alice receives deposit action 2 (FINALIZED), triggers postFS action 2
  10. Alice receives postFS event 1, is finished
  11. Bob receives postFS event 1, is finished

  You can imagine a more exhaustive test here where
  - generated actions are put into a set
  - when the set is non-empty, a random element is chosen and applied

  This would help test that the protocol handles "race conditions"
  */

  // This is used just to kickstart Alice's cranker
  const nudge = {type: 'Crank' as const};

  // 1. Alice signs the preFS, triggers preFS action 1
  let output = crankAndExpect(
    'A',
    currentState,
    nudge,
    {
      status: WaitingFor.theirPreFundSetup,
      preFundSetup: richPreFS.signedBy('A'),
      funding: {amount: BN.from(0), finalized: true},
      fundingRequest: undefined,
      postFundSetup: richPostFS.signedBy()
    },
    [{type: 'sendStates', states: [expect.objectContaining({turnNum: 0})]}]
  );

  // 2. Bob nudges (representing a joinChannel call), triggers preFS action 2
  expect(currentState.B.preFundSetup.signatures).toHaveLength(1);
  output = crankAndExpect(
    'B',
    currentState,
    nudge,
    {
      status: WaitingFor.safeToDeposit,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: BN.from(0), finalized: true},
      fundingRequest: undefined,
      postFundSetup: richPostFS.signedBy()
    },
    [{type: 'sendStates', states: [expect.objectContaining({turnNum: 0})]}]
  );

  // 3. Alice receives preFS event 2, triggers deposit action 1
  output = crankAndExpect(
    'A',
    currentState,
    output.actions[0],
    {
      status: WaitingFor.channelFunded,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: BN.from(0), finalized: true},
      fundingRequest: undefined,
      postFundSetup: richPostFS.signedBy()
    },
    [{type: 'deposit', amount: deposits.A}]
  );

  // 4. Alice receives deposit event 1, does nothing
  const alicesDeposit = output.actions[0];
  output = crankAndExpect(
    'A',
    currentState,
    alicesDeposit,
    {
      status: WaitingFor.channelFunded,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: BN.from(deposits.A), finalized: false},
      fundingRequest: undefined,
      postFundSetup: richPostFS.signedBy()
    },
    []
  );

  // 5. Bob receives deposit event 1, triggers deposit action 1
  output = crankAndExpect(
    'B',
    currentState,
    alicesDeposit,
    {
      status: WaitingFor.channelFunded,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: BN.from(deposits.A), finalized: false},
      fundingRequest: undefined,
      postFundSetup: richPostFS.signedBy()
    },
    [{type: 'deposit', amount: deposits.B}]
  );
  const bobsDeposit = output.actions[0];

  // 6. Bob receives deposit action 2 (UNFINALIZED)
  output = crankAndExpect(
    'B',
    currentState,
    bobsDeposit,
    {
      status: WaitingFor.channelFunded,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: deposits.total, finalized: false},
      fundingRequest: undefined,
      postFundSetup: richPostFS.signedBy()
    },
    []
  );

  // 7. Alice receives deposit action 2 (UNFINALIZED)
  output = crankAndExpect(
    'A',
    currentState,
    bobsDeposit,
    {
      status: WaitingFor.channelFunded,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: deposits.total, finalized: false},
      fundingRequest: undefined,
      postFundSetup: richPostFS.signedBy()
    },
    []
  );
  const finalFundingEvent: OpenChannelEvent = {
    type: 'FundingUpdated',
    amount: currentState.B.funding.amount,
    finalized: true
  };

  // 8. Bob receives deposit action 2 (FINALIZED), triggers postFS action 1
  output = crankAndExpect(
    'B',
    currentState,
    finalFundingEvent,
    {
      status: WaitingFor.theirPostFundState,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: deposits.total, finalized: true},
      fundingRequest: undefined,
      postFundSetup: richPostFS.signedBy('B')
    },
    [{type: 'sendStates', states: [expect.objectContaining({turnNum: 3})]}]
  );
  const bobsPostFS = output.actions[0];

  // 9. Alice receives deposit action 2 (FINALIZED), triggers postFS action 2
  output = crankAndExpect(
    'A',
    currentState,
    finalFundingEvent,
    {
      status: WaitingFor.theirPostFundState,
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: deposits.total, finalized: true},
      fundingRequest: undefined,
      postFundSetup: richPostFS.signedBy('A')
    },
    [{type: 'sendStates', states: [expect.objectContaining({turnNum: 3})]}]
  );
  const alicesPostFS = output.actions[0];

  // 10. Alice receives postFS event 1, is finished
  output = crankAndExpect(
    'A',
    currentState,
    bobsPostFS,
    {
      status: 'success',
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: deposits.total, finalized: true},
      fundingRequest: undefined,
      postFundSetup: richPostFS.signedBy('A', 'B')
    },
    []
  );

  // 11. Bob receives postFS event 1, is finished
  output = crankAndExpect(
    'B',
    currentState,
    alicesPostFS,
    {
      status: 'success',
      preFundSetup: richPreFS.signedBy('A', 'B'),
      funding: {amount: deposits.total, finalized: true},
      fundingRequest: undefined,
      postFundSetup: richPostFS.signedBy('A', 'B')
    },
    []
  );

  // To satisfy a jest ts-lint rule, we need to put a token expectation within the test block
  expect(output).toBeDefined();
});
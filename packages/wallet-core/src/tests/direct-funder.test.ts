import {ethers} from 'ethers';
import * as _ from 'lodash';

import {unreachable} from '../utils';
import {addHash, calculateChannelId} from '../state-utils';
import {BN} from '../bignumber';
import {
  Action,
  openChannelCranker,
  OpenChannelEvent,
  OpenChannelObjective,
  OpenChannelResult,
  WaitingFor
} from '../protocols/direct-funder';
import {Address, makeAddress, SimpleAllocation, State} from '../types';

import {ONE_DAY, participants} from './test-helpers';
const {A: participantA, B: participantB} = participants;

const {AddressZero} = ethers.constants;
jest.setTimeout(10_000);

type Peer = 'A' | 'B';
type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

const outcome: SimpleAllocation = {
  type: 'SimpleAllocation',
  allocationItems: [
    {destination: participantA.destination, amount: BN.from(1)},
    {destination: participantB.destination, amount: BN.from(2)}
  ],
  assetHolderAddress: makeAddress(AddressZero) // must be even length
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

const richPreFS = addHash(openingState);
const richPostFS = addHash({...openingState, turnNum: 3});

const initial: OpenChannelObjective = {
  channelId,
  openingState,
  status: WaitingFor.theirPreFundSetup,
  myIndex: 0,
  preFundSetup: {hash: richPreFS.stateHash, signatures: []},
  funding: {amount: BN.from(0), finalized: true},
  fundingRequests: [],
  postFS: {hash: richPostFS.stateHash, signatures: []}
};

test('pure objective cranker', () => {
  const currentState = {
    A: _.cloneDeep(initial),
    B: _.cloneDeep({...initial, myIndex: 1})
  };

  /*
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
  const nullEvent = {type: 'FundingUpdated' as const, amount: BN.from(0), finalized: true};

  // 1. Alice signs the preFS, triggers preFS action 1
  let output = crankAndExpect(
    'A',
    currentState,
    nullEvent,
    {
      status: WaitingFor.theirPreFundSetup,
      preFundSetup: {
        hash: richPreFS.stateHash,
        signatures: [{signer: participants.A.signingAddress}]
      },
      funding: {amount: BN.from(0), finalized: true},
      fundingRequests: [],
      postFS: {hash: richPostFS.stateHash, signatures: []}
    },
    [{type: 'sendMessage', message: {recipient: 'bob', message: expect.any(Object)}}]
  );

  // 2. Bob receives preFS event 1, trigers preFS action 2
  output = crankAndExpect(
    'B',
    currentState,
    output.actions[0],
    {
      status: WaitingFor.safeToDeposit,
      preFundSetup: {
        hash: richPreFS.stateHash,
        signatures: [
          {signer: participants.A.signingAddress},
          {signer: participants.B.signingAddress}
        ]
      },
      funding: {amount: BN.from(0), finalized: true},
      fundingRequests: [],
      postFS: {hash: richPostFS.stateHash, signatures: []}
    },
    [{type: 'sendMessage', message: {recipient: 'alice'}}]
  );

  // 3. Alice receives preFS event 2, triggers deposit action 1
  output = crankAndExpect(
    'A',
    currentState,
    output.actions[0],
    {
      status: WaitingFor.channelFunded,
      preFundSetup: {
        hash: richPreFS.stateHash,
        signatures: [
          {signer: participants.A.signingAddress},
          {signer: participants.B.signingAddress}
        ]
      },
      funding: {amount: BN.from(0), finalized: true},
      fundingRequests: [],
      postFS: {hash: richPostFS.stateHash, signatures: []}
    },
    [{type: 'deposit', amount: BN.from(1)}]
  );

  // 4. Alice receives deposit event 1, does nothing
  const alicesDeposit = output.actions[0];
  output = crankAndExpect(
    'A',
    currentState,
    alicesDeposit,
    {
      status: WaitingFor.channelFunded,
      preFundSetup: {
        hash: richPreFS.stateHash,
        signatures: [
          {signer: participants.A.signingAddress},
          {signer: participants.B.signingAddress}
        ]
      },
      funding: {amount: BN.from(1), finalized: false},
      fundingRequests: [],
      postFS: {hash: richPostFS.stateHash, signatures: []}
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
      preFundSetup: {
        hash: richPreFS.stateHash,
        signatures: [
          {signer: participants.A.signingAddress},
          {signer: participants.B.signingAddress}
        ]
      },
      funding: {amount: BN.from(1), finalized: false},
      fundingRequests: [],
      postFS: {hash: richPostFS.stateHash, signatures: []}
    },
    [{type: 'deposit', amount: BN.from(2)}]
  );
  const bobsDeposit = output.actions[0];

  // 6. Bob receives deposit action 2 (UNFINALIZED)
  output = crankAndExpect(
    'B',
    currentState,
    bobsDeposit,
    {
      status: WaitingFor.channelFunded,
      preFundSetup: {
        hash: richPreFS.stateHash,
        signatures: [
          {signer: participants.A.signingAddress},
          {signer: participants.B.signingAddress}
        ]
      },
      funding: {amount: BN.from(3), finalized: false},
      fundingRequests: [],
      postFS: {hash: richPostFS.stateHash, signatures: []}
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
      preFundSetup: {
        hash: richPreFS.stateHash,
        signatures: [
          {signer: participants.A.signingAddress},
          {signer: participants.B.signingAddress}
        ]
      },
      funding: {amount: BN.from(3), finalized: false},
      fundingRequests: [],
      postFS: {hash: richPostFS.stateHash, signatures: []}
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
      preFundSetup: {
        hash: richPreFS.stateHash,
        signatures: [
          {signer: participants.A.signingAddress},
          {signer: participants.B.signingAddress}
        ]
      },
      funding: {amount: BN.from(3), finalized: true},
      fundingRequests: [],
      postFS: {hash: richPostFS.stateHash, signatures: [{signer: participants.B.signingAddress}]}
    },
    [{type: 'sendMessage', message: {recipient: 'alice'}}]
  );
  const bobsPostFS = output.actions[0];

  // 9. Alice receives deposit action 2 (FINALIZED), triggers postFS action 2
  output = crankAndExpect(
    'A',
    currentState,
    finalFundingEvent,
    {
      status: WaitingFor.theirPostFundState,
      preFundSetup: {
        hash: richPreFS.stateHash,
        signatures: [
          {signer: participants.A.signingAddress},
          {signer: participants.B.signingAddress}
        ]
      },
      funding: {amount: BN.from(3), finalized: true},
      fundingRequests: [],
      postFS: {hash: richPostFS.stateHash, signatures: [{signer: participants.A.signingAddress}]}
    },
    [{type: 'sendMessage', message: {recipient: 'bob'}}]
  );
  const alicesPostFS = output.actions[0];

  // 10. Alice receives postFS event 1, is finished
  output = crankAndExpect(
    'A',
    currentState,
    bobsPostFS,
    {
      status: 'success',
      preFundSetup: {
        hash: richPreFS.stateHash,
        signatures: [
          {signer: participants.A.signingAddress},
          {signer: participants.B.signingAddress}
        ]
      },
      funding: {amount: BN.from(3), finalized: true},
      fundingRequests: [],
      postFS: {
        hash: richPostFS.stateHash,
        signatures: [
          {signer: participants.A.signingAddress},
          {signer: participants.B.signingAddress}
        ]
      }
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
      preFundSetup: {
        hash: richPreFS.stateHash,
        signatures: [
          {signer: participants.A.signingAddress},
          {signer: participants.B.signingAddress}
        ]
      },
      funding: {amount: BN.from(3), finalized: true},
      fundingRequests: [],
      postFS: {
        hash: richPostFS.stateHash,
        signatures: [
          {signer: participants.A.signingAddress},
          {signer: participants.B.signingAddress}
        ]
      }
    },
    []
  );

  // To satisfy a jest ts-lint rule, we need to put a token expectation within the test block
  expect(output).toBeDefined();
});

describe('error modes', () => {
  test('receiving a signature from a non-participant', () => {
    const signatures = [{signature: 'a signature', signer: participants.H.signingAddress}];
    const signedStates = [{...openingState, signatures}];
    expect(() =>
      openChannelCranker(
        initial,
        {type: 'MessageReceived', message: {signedStates}},
        participants.A.privateKey
      )
    ).toThrow('received a signature from a non-participant');
  });

  test('receiving an unexpected state', () => {
    const signedStates = [{...openingState, signatures: [], turnNum: 4}];
    expect(() =>
      openChannelCranker(
        initial,
        {type: 'MessageReceived', message: {signedStates}},
        participants.A.privateKey
      )
    ).toThrow('Unexpected state hash');
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
    case 'sendMessage':
      return {type: 'MessageReceived', message: action.message.message};
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
    actionOrEvent.type === 'deposit' || actionOrEvent.type === 'sendMessage'
      ? generateEvent(actionOrEvent, currentState[peer])
      : actionOrEvent;
  const output = openChannelCranker(currentState[peer], event, participants[peer].privateKey);
  expect(output).toMatchObject({objective, actions});
  currentState[peer] = output.objective;

  return output;
}

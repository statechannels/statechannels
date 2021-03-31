import {ethers} from 'ethers';
import * as _ from 'lodash';

import {unreachable} from '../utils';
import {addHash} from '../state-utils';
import {BN} from '../bignumber';
import {
  Action,
  openChannelCranker,
  OpenChannelEvent,
  OpenChannelObjective,
  OpenChannelResult
} from '../protocols/direct-funder';
import {Address, makeAddress, SimpleAllocation, State} from '../types';

import {ONE_DAY, participants} from './test-helpers';
const {A: participantA, B: participantB} = participants;

const {AddressZero} = ethers.constants;
jest.setTimeout(10_000);

let channelId: string;
type Peer = 'A' | 'B';

test('pure objective cranker', () => {
  const outcome: SimpleAllocation = {
    type: 'SimpleAllocation',
    allocationItems: [
      {destination: participantA.destination, amount: BN.from(1)},
      {destination: participantB.destination, amount: BN.from(1)}
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

  const richPreFS = addHash(openingState);
  const richPostFS = addHash({...openingState, turnNum: 3});

  const initial: OpenChannelObjective = {
    channelId,
    openingState,
    myIndex: 0,
    preFS: {hash: richPreFS.stateHash, signatures: []},
    funding: {amount: BN.from(0), finalized: true},
    fundingRequests: [],
    postFS: {hash: richPostFS.stateHash, signatures: []}
  };
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

  // This event contains no data. It's currently used just to kickstart Alice's cranker
  const nullAction: Action = {type: 'deposit', amount: BN.from(0)};

  // 1. Alice signs the preFS, triggers preFS action 1
  const output1 = crankAndExpect(
    'A',
    currentState,
    nullAction,
    {
      preFS: {
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
  const output2 = crankAndExpect(
    'B',
    currentState,
    output1.actions[0],
    {
      preFS: {
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
  const output3 = crankAndExpect(
    'A',
    currentState,
    output2.actions[0],
    {
      preFS: {
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

  expect(output3).toBeDefined();
});

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

function generateEvent(action: Action): OpenChannelEvent {
  switch (action.type) {
    case 'deposit':
      // FIXME We need to add a 'funding updated' event to OpenChannelEvent
      return {signedStates: []};
    case 'sendMessage':
      return action.message.message;
    default:
      return unreachable(action);
  }
}

function crankAndExpect(
  peer: Peer,
  currentState: Record<Peer, OpenChannelObjective>,
  action: Action,
  objective: DeepPartial<OpenChannelObjective>,
  actions: DeepPartial<Action>[]
): OpenChannelResult {
  const event = generateEvent(action);
  const output = openChannelCranker(currentState[peer], event, participants[peer].privateKey);
  expect(output).toMatchObject({objective, actions});
  currentState[peer] = output.objective;

  return output;
}

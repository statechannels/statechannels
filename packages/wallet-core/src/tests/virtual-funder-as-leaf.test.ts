import {ethers} from 'ethers';
import * as _ from 'lodash';

import {makeDestination} from '../utils';
import {addHash, calculateChannelId} from '../state-utils';
import {BN} from '../bignumber';
import {
  Action,
  initialize,
  cranker,
  OpenChannelEvent,
  OpenChannelObjective,
  SignedStateHash,
  WaitingFor,
  ParticipantIdx
} from '../protocols/virtual-funder-as-leaf';
import {
  Address,
  ChannelConstants,
  makeAddress,
  OpenChannel,
  SignatureEntry,
  SignedState,
  SignedStateWithHash,
  SimpleAllocation,
  State,
  Uint256
} from '../types';

import {ONE_DAY, participants, signStateHelper} from './test-helpers';
import {DeepPartial, fixture} from './fixture';
const {A: participantA, B: participantB} = participants;

const {AddressZero} = ethers.constants;

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

const targetChannel: ChannelConstants = {
  participants: [participantA, participantB],
  chainId: '0x01',
  challengeDuration: ONE_DAY,
  channelNonce: 0,
  appDefinition: ethers.constants.AddressZero as Address
};

const openingState: State = {
  ...targetChannel,
  appData: makeAddress(AddressZero), // must be even length
  turnNum: 0,
  outcome,
  isFinal: false
};
const targetChannelId = calculateChannelId(openingState);

const openingChannel: OpenChannel = {
  participants: [participantA, participantB],
  type: 'OpenChannel',
  data: {
    targetChannelId,
    fundingStrategy: 'Virtual'
  }
};

const channelId = calculateChannelId(openingState);
const ledgerChannelId = calculateChannelId({...openingState, channelNonce: 5});

function richify(
  state: State
): SignedStateWithHash & {
  signedBy(...peers: ParticipantIdx[]): SignedStateHash;
  stateSignedBy(...peers: ParticipantIdx[]): SignedState;
} {
  const withHash = addHash(state);
  const asPeer = (p: ParticipantIdx) => {
    switch (p) {
      case ParticipantIdx.Left:
        return 'A';
      case ParticipantIdx.Middle:
        return 'H';
      case ParticipantIdx.Right:
        return 'B';
    }
  };

  return {
    signatures: [],
    ...withHash,
    signedBy(...peers: ParticipantIdx[]) {
      const asPeers = peers.map(asPeer);
      const signedState = signStateHelper(withHash, ...asPeers);
      const signatures = _.sortBy(signedState.signatures, sig => sig.signer);

      return {hash: withHash.stateHash, signatures};
    },
    stateSignedBy(...peers: ParticipantIdx[]) {
      return signStateHelper(withHash, ...peers.map(asPeer));
    }
  };
}

function addChannelId(channel: ChannelConstants) {
  return {...channel, channelId: makeDestination(calculateChannelId(channel))};
}

type Peer = 'A' | 'H' | 'B';

declare global {
  interface String {
    signedBy(...peers: Peer[]): SignedStateHash;
  }
}

const signerLookup: Record<Peer, Address> = {
  A: participants.A.signingAddress,
  B: participants.B.signingAddress,
  H: participants.H.signingAddress
};

const nameLookup: Record<Peer, string> = {
  A: 'Alice',
  B: 'Bob',
  H: 'Henry'
};

String.prototype.signedBy = function (...peers: Peer[]): SignedStateHash {
  const signatures = peers.map(signer => ({
    signature: `by ${nameLookup[signer]}`,
    signer: signerLookup[signer]
  }));

  return {hash: String(this), signatures};
};

const hashes: Record<'t' | 'j0' | 'j1' | 'gleft' | 'gright', string> = {
  t: 'target',
  j0: 'joint state initial',
  j1: 'joint state funds target',
  gleft: 'left guarantor state',
  gright: 'right guarantor state'
};

const initial: OpenChannelObjective = {
  channelId,
  ledgerChannelId,
  openingState,
  status: WaitingFor.theirPreFundSetup,
  myIndex: 0,
  expectedHashes: {
    targetPreFundSetup: hashes.t.signedBy(),
    jointPreFundSetup: hashes.j0.signedBy(),
    joinChannelFundsChannel: hashes.j1.signedBy(),
    guarantorPreFundSetup: hashes.gleft.signedBy()
  },
  // FIXME
  channels: {
    target: addChannelId(targetChannel),
    middle: addChannelId(targetChannel),
    left: addChannelId(targetChannel),
    right: addChannelId(targetChannel)
  },
  guarantorFunding: {amount: BN.from(0)},
  fundingRequests: []
  // preFundSetup: richPreFS.signedBy(),
  // funding: {amount: BN.from(0), finalized: true},
  // fundingRequest: undefined,
  // postFundSetup: richPostFS.signedBy()
};

describe('initialization', () => {
  test('when the opening state makes sense', () => {
    // expect(initialize(openingChannel, 0)).toMatchObject(initial);
    // expect(initialize(openingChannel, 1)).toMatchObject({...initial, myIndex: 1});
    // expect(initialize(signStateHelper(openingState, 'A'), 1)).toMatchObject({
    //   ...initial,
    //   myIndex: 1,
    //   preFundSetup: richPreFS.signedBy('A')
    // });
    // expect(initialize(signStateHelper(openingState, 'A', 'B'), 0)).toMatchObject({
    //   ...initial,
    //   preFundSetup: richPreFS.signedBy('A', 'B')
    // });
    // expect(initialize(signStateHelper(openingState, 'B', 'A'), 0)).toMatchObject({
    //   ...initial,
    //   preFundSetup: richPreFS.signedBy('A', 'B')
    // });
  });

  // test('when the index is out of range', () => {
  //   expect(() => initialize(openingChannel, -1)).toThrow('Unexpected index');
  //   expect(() => initialize(openingChannel, 0.5)).toThrow('Unexpected index');
  //   expect(() => initialize(openingChannel, 2)).toThrow('Unexpected index');
  // });

  // test('when the opening state has the wrong turn number', () => {
  //   expect(() => initialize({...openingState, turnNum: 1}, 0)).toThrow('Unexpected state');
  // });

  // test('when the outcome does not match the expectations', () => {
  //   expect(() => initialize({...openingState, outcome: 'any' as any}, 0)).toThrow(
  //     /not valid, isSimpleAllocation failed/
  //   );

  //   const outcome = {
  //     type: 'SimpleAllocation' as const,
  //     assetHolderAddress: ethers.constants.AddressZero as any,
  //     allocationItems: []
  //   };
  //   expect(() => initialize({...openingState, outcome}, 0)).toThrow('unexpected outcome');
  // });
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
    const BobSigned = objectiveFixture({
      expectedHashes: {
        jointPreFundSetup: hashes.j0.signedBy('B'),
        targetPreFundSetup: hashes.t.signedBy('B')
      }
    });
    const HenrySigned = objectiveFixture({
      expectedHashes: {
        jointPreFundSetup: hashes.j0.signedBy('H'),
        guarantorPreFundSetup: hashes.gleft.signedBy('H')
      }
    });
    const PeersSigned = objectiveFixture({
      expectedHashes: {
        jointPreFundSetup: hashes.j0.signedBy('B', 'H'),
        targetPreFundSetup: hashes.t.signedBy('B'),
        guarantorPreFundSetup: hashes.gleft.signedBy('H')
      }
    });

    const _zeroOutcomeState = addHash({
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

    const _sendState: (signedState?: SignedStateHash) => OpenChannelEvent = s => ({
      type: 'StatesReceived',
      states: s ? [s] : []
    });

    const crank = {type: 'Crank'} as const;

    const _funding = (amount: number | Uint256, finalized = false) => ({
      amount: BN.from(amount),
      finalized
    });

    type TestSignature = Partial<{[key in Peer]: string}>;

    type TestSignedStateHash = [string, TestSignature];
    // | [string, Peer]
    // | [string, Peer, Peer]
    // | [string, Peer, Peer, Peer];

    function sendStates(...testStates: TestSignedStateHash[]): Action {
      const states = testStates.map(([key, testSignatures]: [string, TestSignature]) => {
        const hash = hashes[key];

        const signatures: SignatureEntry[] = _.entries(testSignatures).map(([peer, signature]) => ({
          signature: signature as string,
          signer: signerLookup[peer]
        }));
        // const signatures: SignatureEntry[] = _.map(testSignatures, (signature: string, peer) => ({
        //   signature,
        //   signer: signerLookup[peer]
        // }));

        return {hash, signatures};
      });

      return {type: 'SendStates', states};
    }

    let msg: string;
    const A = 'SIGN_BY_KEYSTORE';
    const B = 'by Bob';
    const H = 'by Henry';

    //prettier-ignore
    const cases: TestCase[] = [
      [ (msg = 'Cranking'),
             empty,         crank, {status: WaitingFor.theirPreFundSetup},      [sendStates(['t', {A}],    ['j0', {A}],       ['gleft', {A}])] ],
      [ msg, BobSigned,     crank, {status: WaitingFor.theirPreFundSetup},      [sendStates(['t', {A, B}], ['j0', {A, B}],    ['gleft', {A}])] ],
      [ msg, HenrySigned,   crank, {status: WaitingFor.theirPreFundSetup},      [sendStates(['t', {A}],    ['j0', {A, H}],    ['gleft', {A, H}])] ],
      [ msg, PeersSigned,   crank, {status: WaitingFor.ledgerRequestSubmitted}, [sendStates(['t', {A, B}], ['j0', {A, B, H}], ['gleft', {A, H}]), {type: 'RequestLedgerFunding'}] ]

      // [ msg, aliceSignedPre, nudge, {preFundSetup: richPreFS.signedBy('A')},      [] ],
      // [ msg, readyToFund,    nudge, {funding: funding(0, true)},                  [{type: 'deposit', amount: deposits.A}] ],
      // [ msg, zeroOutcome,    nudge, {}, [{type: 'sendStates', states: [expect.objectContaining({turnNum: 0}), expect.objectContaining({turnNum: 3})]} ] ],

      // [ msg = 'Receiving a preFundSetup state',
      //        empty,          sendState(richPreFS.stateSignedBy('B')), {preFundSetup: richPreFS.signedBy('A', 'B')}, [{type: 'sendStates'}, {type: 'deposit'}] ],
      // [ msg, aliceSignedPre, sendState(richPreFS.stateSignedBy('B')), {preFundSetup: richPreFS.signedBy('A', 'B')}, [{type: 'deposit'}] ],

      // [ msg = 'Receiving a deposit event',
      //        readyToFund, deposit(deposits.A),     {funding: funding(deposits.A),     postFundSetup: richPostFS.signedBy()}, [] ],
      // [ msg, readyToFund, deposit(deposits.part),  {funding: funding(deposits.part),  postFundSetup: richPostFS.signedBy()}, [{type: 'deposit', amount: BN.sub(deposits.A, deposits.part)}] ],
      // [ msg, readyToFund, deposit(deposits.total), {funding: funding(deposits.total), postFundSetup: richPostFS.signedBy()}, [] ],
      // [ msg, readyToFund, deposit(deposits.total, true), {funding: funding(deposits.total, true), postFundSetup: richPostFS.signedBy('A')}, [{type: 'sendStates'}] ],

      // [ msg, deposited, deposit(deposits.A),       {funding: funding(deposits.A),       postFundSetup: richPostFS.signedBy()}, [] ],
      // [ msg, deposited, deposit(deposits.A, true), {funding: funding(deposits.A, true), postFundSetup: richPostFS.signedBy()}, [] ],
      // [ msg, deposited, deposit(deposits.total),   {funding: funding(deposits.total),   postFundSetup: richPostFS.signedBy()}, [] ],
      // [ msg, deposited, deposit(9),                {funding: funding(9),                postFundSetup: richPostFS.signedBy()}, [] ],
      // [ msg, deposited, deposit(deposits.total, true), {funding: funding(deposits.total, true), postFundSetup: richPostFS.signedBy('A')}, [{type: 'sendStates'}] ],

      // [ msg, almostFunded, deposit(deposits.A),       {funding: funding(deposits.A),     postFundSetup: richPostFS.signedBy()}, [] ],
      // [ msg, almostFunded, deposit(deposits.total),   {funding: funding(deposits.total), postFundSetup: richPostFS.signedBy()}, [] ],
      // [ msg, almostFunded, deposit(9),                {funding: funding(9),              postFundSetup: richPostFS.signedBy()}, [] ],
      // [ msg, almostFunded, deposit(deposits.total, true), {funding: funding(deposits.total, true), postFundSetup: richPostFS.signedBy('A')}, [{type: 'sendStates'}] ],

      // [ 'Receiving a deposit submitted event',
      //   depositPending, submitted(0), {funding: funding(0, true), fundingRequest: {tx: 'tx'}, postFundSetup: richPostFS.signedBy()}, [] ],

      // [ msg = 'Receiving a preFundSetup state',
      //        funded,          nudge, {postFundSetup: richPostFS.signedBy('A' )}, [{type: 'sendStates'}] ],
      // [ msg, funded,          sendState(richPostFS.stateSignedBy('B')), {status: 'success', postFundSetup: richPostFS.signedBy('A', 'B')}, [{type: 'sendStates'}] ],
      // [ msg, aliceSignedPost, sendState(richPostFS.stateSignedBy('B')), {status: 'success', postFundSetup: richPostFS.signedBy('A', 'B')}, [] ],
    ];

    test.each(cases)('%s works: %#', (_msg, before, event, after, actions) => {
      const result = cranker(before, event);
      expect(result).toMatchObject({objective: after, actions});
    });
  });
});

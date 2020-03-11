import {interpret} from 'xstate';
import waitForExpect from 'wait-for-expect';

import {SimpleHub} from './simple-hub';
import {bigNumberify, BigNumberish} from 'ethers/utils';
import _ from 'lodash';
import {signState, calculateChannelId} from '../../store/state-utils';
import {Participant, Outcome, SignedState, ChannelConstants} from '../../store/types';
import {AddressZero, HashZero} from 'ethers/constants';
import {add} from '../../utils/math-utils';
import {simpleEthAllocation, simpleEthGuarantee} from '../../utils/outcome';

import {wallet1, wallet2, wallet3, threeParticipants as participants} from './data';
import {subscribeToMessages} from './message-service';
import {ParticipantIdx} from '../virtual-funding-as-leaf';
import {VirtualDefundingAsLeaf} from '..';
import {TestStore} from './store';

jest.setTimeout(20000);
const EXPECT_TIMEOUT = process.env.CI ? 9500 : 2000;
const chainId = '0x01';
const challengeDuration = bigNumberify(10);
const appDefinition = AddressZero;
const alice = participants[ParticipantIdx.A];
const bob = participants[ParticipantIdx.B];
const hub = participants[ParticipantIdx.Hub];
const aliceAndBob = [alice, bob];
const aliceAndHub = [alice, hub];
const bobAndHub = [bob, hub];

let channelNonce = 0;
const channelConstants = (participants: Participant[]): ChannelConstants => ({
  channelNonce: bigNumberify(channelNonce++),
  chainId,
  challengeDuration,
  participants,
  appDefinition
});

const privateKeys: Record<string, string> = {
  [alice.participantId]: wallet1.privateKey,
  [bob.participantId]: wallet2.privateKey,
  [hub.participantId]: wallet3.privateKey
};

const state = (
  constants: ChannelConstants,
  outcome: Outcome,
  turnNum: BigNumberish = 0,
  isFinal = false
): SignedState => {
  const state = {
    ...constants,
    isFinal,
    turnNum: bigNumberify(turnNum),
    appData: HashZero,
    outcome
  };

  // TODO: Hard-code these signatures
  return {
    ...state,
    signatures: constants.participants.map(p => signState(state, privateKeys[p.participantId]))
  };
};

/*
  STORE SETUP
  x + y = z

  Channels:
  T: turn 5, [{destination: A, amount: x}, {destination: B, amount: y}]
  J: turn 1, [{ destination: T, amount: z}, {destination: H, amount: z}]
  L1: turn 8, [{destination: A, amount: a}, {destination: H, amount: h1}, {destination: G1, amount: z}}]
  L2: turn 6, [{destination: B, amount: b}, {destination: H, amount: h2}, {destination: G2, amount: z}}]
  G1: turn 0, {target: J, destinations: [J, A, H]}
  G2: turn 0, {target: J, destinations: [J, B, H]}

  Stores:
  A: T, J, L1, G1
  B: T, J, L2, G2
*/

const targetAmounts = [2, 3].map(bigNumberify);
const targetChannel = channelConstants(aliceAndBob);
const targetChannelId = calculateChannelId(targetChannel);
const targetOutcome = simpleEthAllocation([
  {destination: alice.destination, amount: targetAmounts[0]},
  {destination: bob.destination, amount: targetAmounts[1]}
]);
const targetTurnNum = 5;
const targetState = state(targetChannel, targetOutcome, targetTurnNum, true);

const jointChannel = channelConstants(participants);
const jointChannelId = calculateChannelId(jointChannel);
const jointOutcome = simpleEthAllocation([
  {destination: targetChannelId, amount: targetAmounts.reduce(add)},
  {destination: hub.destination, amount: targetAmounts.reduce(add)}
]);
const jointState = state(jointChannel, jointOutcome, 1);

const ledger1Amounts = [5, 7].map(bigNumberify);
const ledger1 = channelConstants(aliceAndHub);
const ledger1Outcome = simpleEthAllocation([
  {destination: hub.destination, amount: ledger1Amounts[0]},
  {destination: alice.destination, amount: ledger1Amounts[1]}
]);
const ledger1TurnNum = 8;
const ledger1State = state(ledger1, ledger1Outcome, ledger1TurnNum);

const guarantor1 = channelConstants(aliceAndHub);
const guarantor1Outcome = simpleEthGuarantee(
  jointChannelId,
  targetChannelId,
  alice.destination,
  hub.destination
);
const guarantor1State = state(guarantor1, guarantor1Outcome);

const ledger2Amounts = [5, 7].map(bigNumberify);
const ledger2 = channelConstants(bobAndHub);
const ledger2Outcome = simpleEthAllocation([
  {destination: hub.destination, amount: ledger2Amounts[0]},
  {destination: bob.destination, amount: ledger2Amounts[1]}
]);
const ledger2TurnNum = 6;
const ledger2State = state(ledger2, ledger2Outcome, ledger2TurnNum);

const guarantor2 = channelConstants(bobAndHub);
const guarantor2Outcome = simpleEthGuarantee(
  jointChannelId,
  targetChannelId,
  bob.destination,
  hub.destination
);
const guarantor2State = state(guarantor2, guarantor2Outcome);

const context: VirtualDefundingAsLeaf.Init = {targetChannelId};

let aStore: TestStore;
let bStore: TestStore;

beforeEach(() => {
  aStore = new TestStore([wallet1.privateKey]);

  const {channelId: ledger1Id} = aStore.createEntry(ledger1State, {type: 'Direct'});
  const {channelId: guarantor1Id} = aStore.createEntry(guarantor1State, {
    type: 'Indirect',
    ledgerId: ledger1Id
  });
  const {channelId: jointChannelId} = aStore.createEntry(jointState, {
    type: 'Guarantee',
    guarantorChannelId: guarantor1Id
  });
  aStore.createEntry(targetState, {type: 'Virtual', jointChannelId});

  bStore = new TestStore([wallet2.privateKey]);
  const {channelId: ledger2Id} = bStore.createEntry(ledger2State, {type: 'Direct'});
  const {channelId: guarantor2Id} = bStore.createEntry(guarantor2State, {
    type: 'Indirect',
    ledgerId: ledger2Id
  });
  bStore.createEntry(jointState, {type: 'Guarantee', guarantorChannelId: guarantor2Id});
  bStore.createEntry(targetState, {type: 'Virtual', jointChannelId});
});

test('virtual defunding with a simple hub', async () => {
  const hubStore = new SimpleHub(wallet3.privateKey);

  const aService = interpret(VirtualDefundingAsLeaf.machine(aStore).withContext(context));
  const bService = interpret(VirtualDefundingAsLeaf.machine(bStore).withContext(context));
  const services = [aService, bService];

  subscribeToMessages({
    [alice.participantId]: aStore,
    [bob.participantId]: bStore,
    [hub.participantId]: hubStore
  });

  services.forEach(service => service.start());

  await waitForExpect(async () => {
    expect(bService.state.value).toEqual('success');
    expect(aService.state.value).toEqual('success');
  }, EXPECT_TIMEOUT);
});

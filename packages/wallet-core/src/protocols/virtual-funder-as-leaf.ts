import * as _ from 'lodash';

import {checkThat, isSimpleAllocation} from '../utils';
import {BN} from '../bignumber';
import {
  Address,
  ChannelConstants,
  Destination,
  OpenChannel,
  SignatureEntry,
  SignedState,
  SignedStateVariables,
  StateVariables,
  StateWithHash,
  Uint256
} from '../types';

export const REPLACED_BY_OBJECTIVE_MANAGER = 'SIGN_BY_KEYSTORE';

export const enum OutcomeIdx {
  Left = 0,
  Middle = 1,
  Right = 2
}
export const enum ParticipantIdx {
  Left = 0,
  Right = 1,
  Middle = 2
}

export type OpenChannelEvent =
  | {type: 'Crank'; now?: number}
  | {type: 'StatesReceived'; states: SignedStateHash[]}
  | {type: 'FundingUpdated'; amount: Uint256};

export enum WaitingFor {
  theirPreFundSetup = 'VirtualFunder.theirPreFundSetup',
  ledgerRequestSubmitted = 'VirtualFunder.ledgerRequestSubmitted',
  channelFunded = 'VirtualFunder.channelFunded',
  jointChannelUpdate = 'VirtualFunder.jointChannelUpdate'
}

const enum States {
  targetPreFS = 'targetPreFundSetup',
  gPreFS = 'guarantorPreFundSetup',
  jPreFS = 'jointPreFundSetup',
  jFundsChannel = 'joinChannelFundsChannel'
}
type ExpectedHashes = Record<States, SignedStateHash>;

const enum Channels {
  target = 'target',
  middle = 'middle',
  left = 'left',
  right = 'right'
}
type Constants = Record<Channels, {channelId: Destination} & ChannelConstants>;

export type OpenChannelObjective = {
  status: WaitingFor | 'success' | 'error';
  channelId: string;
  openingState: StateVariables | SignedStateVariables;
  channels: Constants;
  myIndex: number;
  ledgerChannelId: string;

  expectedHashes: ExpectedHashes;

  // TODO: The asset class is _ignored_ here.
  guarantorFunding: {amount: Uint256};
  fundingRequests: {requestedAt: number}[];
};

export function initialize(wireObjective: OpenChannel, myIndex: number): OpenChannelObjective {
  if (wireObjective.data.fundingStrategy !== 'Virtual') {
    // FIXME
    // return new Error('unexpected funding strategy');
    throw 'unimplemented';
  }

  const {openingState, nonces} = (wireObjective.data as unknown) as {
    openingState: SignedState;
    nonces: Record<'left' | 'middle' | 'right', Uint256>;
  };

  if (openingState.turnNum !== 0) {
    throw 'unexpected state';
  }

  const allowedIndices = [0, 1];
  if (!allowedIndices.includes(myIndex)) {
    throw 'unexpected index';
  }

  // FIXME
  const expectedHashes: ExpectedHashes = {nonces} as any;

  // FIXME
  const channels: Constants = {} as any;

  return {
    channelId: channels.target.channelId,
    ledgerChannelId: 'foo', // FIXME
    myIndex,
    channels,
    openingState,
    status: WaitingFor.theirPreFundSetup,
    expectedHashes,
    guarantorFunding: {amount: BN.from(0)},
    fundingRequests: []
  };
}

type SendStates = {type: 'SendStates'; states: SignedStateHash[]};
type RequestFunding = {
  type: 'RequestLedgerFunding';
  amount: Uint256;
  ledgerChannelId: string;
  targetChannelId: string;
};
export type Action = SendStates | RequestFunding;

const guard = <T extends Action>(name: Action['type']) => (o: Action): o is T => o.type === name;
const isSendStates = guard<SendStates>('SendStates');

export type OpenChannelResult = {
  objective: OpenChannelObjective;
  actions: Action[];
};

/**
 *
 * @param objective: A rich OpenChannelObjective data structure storing relevant data to the objective
 * @param event an OpenChannelEvent that can trigger a state transition + actions
 * @returns OpenChannelResult, a data structure containing
 *            - the current state of the objective
 *            - actionst to be triggered by an imperative shell
 *
 * This is a state machine implementation of a protocol for opening a directly funded channel.
 * It operates on a "rich" OpenChannelObjective state, which stores:
 * 1. the channel's initial state
 * 2. the hash of the expected preFS and its hash
 * 3. the ledger funding of the guarantor channel
 * 4. funding requests
 * 5. the hash of the expected preFS and its hash
 *
 * The machine receives either messages or chain events.
 * It _whitelists_ states, rejecting any state other than the expected state.
 *
 * A wallet implementation can then use the result with this sequence of asynchronous operations
 * 1. record the new objective state as well as the resulting actions
 * 2. trigger the resulting actions asynchronously
 * 3. mark the actions as being successful
 *
 * If the wallet crashes after 1 & before 3, the wallet can decide to re-trigger
 * the actions on a case-by-case basis, based on whether the action is safe to
 * re-trigger.
 */
export function cranker(before: OpenChannelObjective, event: OpenChannelEvent): OpenChannelResult {
  const objective = _.cloneDeep(before);
  const actions: Action[] = [];

  const {participants} = objective.channels.target;
  const {myIndex} = objective;
  const me = participants[myIndex];

  // First, process the event
  switch (event.type) {
    case 'FundingUpdated':
      objective.guarantorFunding.amount = event.amount;
      break;
    case 'StatesReceived':
      event.states.map(({hash, signatures}) => {
        let signaturesMerged = false;

        _.map(objective.expectedHashes, val => {
          if (val.hash === hash) {
            signaturesMerged = true;
            val.signatures = mergeSignatures(val.signatures, signatures);
          }
        });

        if (!signaturesMerged) {
          // FIXME: Enter an error state
          throw 'unimplemented';
        }
      });
      break;
  }

  // Then, transition & collect actions:

  // 1. Sign preFS in the target, joint & guarantor channel
  const firstSteps = [States.targetPreFS, States.jPreFS, States.gPreFS];
  firstSteps.map(step => {
    if (!signedbyMe(objective, step, me.signingAddress)) {
      signStateAction(step, objective, actions);
    }
  });

  const completedFirstStep = firstSteps.every(step => completed(objective, step));

  if (!completedFirstStep) {
    objective.status = WaitingFor.theirPreFundSetup;
    return {objective, actions};
  }

  // 2. Request ledger funding
  if (objective.fundingRequests.length === 0) {
    const ledgerChannelId = objective.ledgerChannelId;
    const targetChannelId = objective.channelId;

    const openingOutcome = checkThat(objective.openingState.outcome, isSimpleAllocation);
    const amount = openingOutcome.allocationItems.map(i => i.amount).reduce(BN.add, BN.from(0));

    actions.push({type: 'RequestLedgerFunding', amount, ledgerChannelId, targetChannelId});
    objective.status = WaitingFor.ledgerRequestSubmitted;
    return {objective, actions};
  } else if (BN.eq(objective.guarantorFunding.amount, 0)) {
    objective.status = WaitingFor.channelFunded;
    return {objective, actions};
  }

  // 3. Sign update in joint channel
  if (!signedbyMe(objective, States.jFundsChannel, me.signingAddress)) {
    signStateAction(States.jFundsChannel, objective, actions);
  }

  // 4. Wait for joint channel to be updated
  if (completed(objective, States.jFundsChannel)) {
    objective.status = 'success';
    return {objective, actions};
  } else {
    objective.status = WaitingFor.jointChannelUpdate;
    return {objective, actions};
  }
}

function signedbyMe(objective: OpenChannelObjective, step: States, me: Address): boolean {
  return objective.expectedHashes[step].signatures.map(e => e.signer).includes(me);
}

function completed(objective: OpenChannelObjective, step: States): boolean {
  const expected = step === States.jPreFS || step === States.jFundsChannel ? 3 : 2;
  const current = objective.expectedHashes[step].signatures.length;

  return expected === current;
}

function signStateAction(
  key: States,
  objective: OpenChannelObjective,
  actions: Action[]
): Action[] {
  const {participants} = objective.channels.target;
  const {signingAddress} = participants[objective.myIndex];

  const entry = {signature: REPLACED_BY_OBJECTIVE_MANAGER, signer: signingAddress};

  const hashEntry = objective.expectedHashes[key];
  const newSignatures = mergeSignatures(hashEntry.signatures, [entry]);
  hashEntry.signatures = newSignatures;

  const existingAction = actions.find(isSendStates);
  if (existingAction) {
    existingAction.states.push(hashEntry);
    existingAction.states.sort();
  } else {
    actions.push({type: 'SendStates', states: [hashEntry]});
  }

  return actions;
}

type StateGenerator = (o: OpenChannelObjective) => StateWithHash;
export const utils: Record<States, StateGenerator> = {
  joinChannelFundsChannel(_o) {
    // FIXME
    throw 'unmplemented';
  },
  jointPreFundSetup(_o) {
    // FIXME
    throw 'unimplemented';
  },
  targetPreFundSetup(_o) {
    // FIXME
    throw 'unimplemented';
  },
  guarantorPreFundSetup(_o) {
    // FIXME
    throw 'unimplemented';
  }
};

// FIXME: Deduplicate
// BEGIN: COPIED FROM direct-funder.ts
function mergeSignatures(left: SignatureEntry[], right: SignatureEntry[]): SignatureEntry[] {
  // TODO: Perhaps this should place signatures according to the participant's index?
  const unsorted = _.uniqBy(_.concat(left, right), entry => entry.signer);

  return _.sortBy(unsorted, entry => entry.signer);
}

export type SignedStateHash = {hash: string; signatures: SignatureEntry[]};
// END: COPIED FROM direct-funder.ts

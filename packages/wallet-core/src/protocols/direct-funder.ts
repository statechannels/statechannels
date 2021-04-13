import * as _ from 'lodash';

import {checkThat, isSimpleAllocation} from '../utils';
import {BN} from '../bignumber';
import {calculateChannelId, hashState, signState} from '../state-utils';
import {Address, SignatureEntry, SignedState, State, Uint256} from '../types';

// TODO: This ought to be configurable
export const MAX_WAITING_TIME = 5_000;

export type OpenChannelEvent = {now?: number} & (
  | {type: 'Crank'} // Allows you to crank it every now and then to see if it's timed out.
  | {type: 'StatesReceived'; states: SignedState[]}
  | {type: 'FundingUpdated'; amount: Uint256; finalized: boolean}
  | {type: 'DepositSubmitted'; tx: string; attempt: number; submittedAt: number}
  | {type: 'Approval'}
);

export type SignedStateHash = {hash: string; signatures: SignatureEntry[]};

export enum WaitingFor {
  approval = 'DirectFunder.approval',
  theirPreFundSetup = 'DirectFunder.theirPreFundSetup',
  safeToDeposit = 'DirectFunder.safeToDeposit',
  channelFunded = 'DirectFunder.channelFunded',
  theirPostFundState = 'DirectFunder.theirPostFundSetup'
}

const enum Steps {
  preFundSetup = 'preFundSetup',
  postFundSetup = 'postFundSetup'
}

export type OpenChannelObjective = {
  status: WaitingFor | 'success' | 'error';
  approved: boolean;
  channelId: string;
  openingState: State;
  myIndex: number;

  preFundSetup: SignedStateHash;
  // TODO: (ChainService) The asset class is _ignored_ here.
  funding: {amount: Uint256; finalized: boolean};
  fundingRequest: {tx: string; attempts: number; submittedAt: number} | undefined;
  postFundSetup: SignedStateHash;
};

export function initialize(
  openingState: State | SignedState,
  myIndex: number,
  approved = false
): OpenChannelObjective {
  if (openingState.turnNum !== 0) {
    throw new Error(`Unexpected state due to turnNum ${openingState.turnNum}`);
  }

  const allowedIndices = _.range(0, openingState.participants.length);
  if (!allowedIndices.includes(myIndex)) {
    throw new Error(`Unexpected index due to index ${myIndex}`);
  }

  // HACK (Implicitly) check that the outcome is as expected
  utils.fundingMilestone(openingState, openingState.participants[myIndex].destination);

  const signatures =
    'signatures' in openingState ? mergeSignatures([], openingState.signatures) : [];

  return {
    approved,
    channelId: calculateChannelId(openingState),
    myIndex,
    openingState: _.omit(openingState, 'signatures'),
    status: WaitingFor.theirPreFundSetup,
    preFundSetup: {hash: hashState(setupState(openingState, Steps.preFundSetup)), signatures},
    funding: {amount: BN.from(0), finalized: true},
    fundingRequest: undefined,
    postFundSetup: {hash: hashState(setupState(openingState, Steps.postFundSetup)), signatures: []}
  };
}

export type Action =
  | {type: 'sendStates'; states: SignedState[]}
  // TODO: (ChainService) We will need to include more data once this gets hooked up to a chain service
  | {type: 'deposit'; amount: Uint256}
  | {type: 'handleError'; error: Error};

export type OpenChannelResult = {
  objective: OpenChannelObjective;
  actions: Action[];
};

/**
 *
 * @param objective: A rich OpenChannelObjective data structure storing relevant data to the objective
 * @param event an OpenChannelEvent that can trigger a state transition + actions
 * @param myPrivateKey
 * @returns OpenChannelResult, a data structure containing
 *            - the current state of the objective
 *            - actionst to be triggered by an imperative shell
 *
 * This is a state machine implementation of a protocol for opening a directly funded channel.
 * It operates on a "rich" OpenChannelObjective state, which stores:
 * 1. the channel's initial state
 * 2. the hash of the expected preFS and its hash
 * 3. the on-chain funding of the channel
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
 *
 * ## ASSUMPTIONS ##
 * - the opening state has a SimpleAllocation outcome
 * - the outcome has exactly one destination per participant
 */
export function openChannelCranker(
  currentObjectiveState: OpenChannelObjective,
  event: OpenChannelEvent,
  myPrivateKey: string
): OpenChannelResult {
  const objective = _.cloneDeep(currentObjectiveState);
  const actions: Action[] = [];

  const {participants} = objective.openingState;
  const me = participants[objective.myIndex];

  // First, process the event

  switch (event.type) {
    case 'Crank':
      break;
    case 'Approval':
      objective.approved = true;
      break;
    case 'DepositSubmitted':
      objective.fundingRequest = {
        tx: event.tx,
        submittedAt: event.submittedAt,
        attempts: event.attempt
      };
      break;
    case 'FundingUpdated':
      objective.funding.amount = event.amount;
      objective.funding.finalized = event.finalized;
      break;
    case 'StatesReceived': {
      const {states: signedStates} = event;

      // TODO: Assume there's only one signed state
      if (signedStates && signedStates[0]) {
        const signedState = signedStates[0];
        const hash = hashState(signedState);
        const {signatures} = signedState;

        for (const signature of signatures) {
          if (!participants.find(p => p.signingAddress === signature.signer)) {
            objective.status = 'error';
            const error = new DirectFunderError({
              message: 'NonParticipantSignature',
              signature
            });
            actions.push({type: 'handleError', error});
            return {objective, actions};
          }
        }

        if (hash === objective.preFundSetup.hash) {
          objective.preFundSetup.signatures = mergeSignatures(
            objective.preFundSetup.signatures,
            signatures
          );
        } else if (hash === objective.postFundSetup.hash) {
          objective.postFundSetup.signatures = mergeSignatures(
            objective.postFundSetup.signatures,
            signatures
          );
        } else {
          objective.status = 'error';
          const error = new DirectFunderError({
            message: 'ReceivedUnexpectedState',
            received: hash,
            expected: [objective.preFundSetup.hash, objective.postFundSetup.hash]
          });
          actions.push({type: 'handleError', error});
          return {objective, actions};
        }
      }
      break;
    }
    default:
      return handleUnexpectedEvent(event, objective);
  }

  // Then, transition & collect actions:
  if (!objective.approved) {
    objective.status = WaitingFor.approval;
    return {objective, actions};
  }

  if (!signedbyMe(objective, Steps.preFundSetup, me.signingAddress)) {
    signStateAction(Steps.preFundSetup, myPrivateKey, objective, actions);
  }

  if (!completed(objective, Steps.preFundSetup)) {
    objective.status = WaitingFor.theirPreFundSetup;
    return {objective, actions};
  }

  // Mostly copied from server-wallet/src/protocols/direct-funder
  const {funding} = objective;
  const {targetBefore, targetAfter, targetTotal} = utils.fundingMilestone(
    objective.openingState,
    me.destination
  );
  // if we're fully funded, we're done
  if (BN.gte(funding.amount, targetTotal) && funding.finalized) {
    // This is the only path where the channel is directly funded,
    // so we move onto postFS
    // The rest of the paths should **return**.
  }
  // if it isn't my turn yet, take no action
  else if (BN.lt(funding.amount, targetBefore)) {
    objective.status = WaitingFor.safeToDeposit;
    return {objective, actions};
  }
  // if my deposit is already on chain, take no action
  else if (BN.gte(funding.amount, targetAfter)) {
    objective.status = WaitingFor.channelFunded;
    return {objective, actions};
  }
  // if there's an outstanding chain request, take no action
  // TODO: (ChainService) This assumes that each participant deposits exactly once per channel
  else if (objective.fundingRequest) {
    if (event.now && event.now >= objective.fundingRequest.submittedAt + MAX_WAITING_TIME) {
      objective.status = 'error';
      const error = new DirectFunderError({
        message: 'TimedOutWhileFunding',
        now: event.now,
        submittedAt: objective.fundingRequest.submittedAt
      });
      actions.push({type: 'handleError', error});
      return {objective, actions};
    } else {
      objective.status = WaitingFor.channelFunded;
      return {objective, actions};
    }
  } else {
    // otherwise, deposit
    const amount = BN.sub(targetAfter, funding.amount); // previous checks imply this is >0
    actions.push({type: 'deposit', amount});
    objective.status = WaitingFor.channelFunded;
    return {objective, actions};
  }

  // Now that the channel is funded, it's safe to sign the postFS
  if (!signedbyMe(objective, Steps.postFundSetup, me.signingAddress)) {
    signStateAction(Steps.postFundSetup, myPrivateKey, objective, actions);
  }

  if (!completed(objective, Steps.postFundSetup)) {
    objective.status = WaitingFor.theirPostFundState;
    return {objective, actions};
  } else {
    objective.status = 'success';
    return {objective, actions};
  }
}

function signedbyMe(objective: OpenChannelObjective, step: Steps, me: Address): boolean {
  return objective[step].signatures.map(e => e.signer).includes(me);
}

function completed(objective: OpenChannelObjective, step: Steps): boolean {
  const {openingState: firstState} = objective;
  return objective[step].signatures.length === firstState.participants.length;
}

function setupState(openingState: State, step: Steps): State {
  const turnNum = step === Steps.preFundSetup ? 0 : 2 * openingState.participants.length - 1;

  return {...openingState, turnNum};
}

function signStateAction(
  step: Steps,
  myPrivateKey: string,
  objective: OpenChannelObjective,
  actions: Action[]
): Action[] {
  const {openingState, myIndex} = objective;
  const me = openingState.participants[myIndex];

  const state = setupState(openingState, step);
  const signature = signState(state, myPrivateKey);
  const entry = {signature, signer: me.signingAddress};
  objective[step].signatures = mergeSignatures(objective[step].signatures, [entry]);
  const signedState = {...state, signatures: [entry]};

  const existingAction = actions.find(a => a.type === 'sendStates');
  if (existingAction) {
    (existingAction as any).states.push(signedState);
  } else {
    actions.push({type: 'sendStates', states: [{...state, signatures: [entry]}]});
  }

  return actions;
}

function mergeSignatures(left: SignatureEntry[], right: SignatureEntry[]): SignatureEntry[] {
  // TODO: Perhaps this should place signatures according to the participant's index?
  const unsorted = _.uniqBy(_.concat(left, right), entry => entry.signer);

  return _.sortBy(unsorted, entry => entry.signer);
}

type FundingMilestone = {
  targetBefore: Uint256;
  targetAfter: Uint256;
  targetTotal: Uint256;
};

export const utils = {
  fundingMilestone(state: State, destination: string): FundingMilestone {
    const {allocationItems} = checkThat(state.outcome, isSimpleAllocation);

    const myAllocationItem = _.find(allocationItems, ai => ai.destination === destination);
    if (!myAllocationItem) {
      // throw new ChannelError(ChannelError.reasons.destinationNotInAllocations, {
      //   destination: this.participants[this.myIndex].destination
      // });
      throw new Error('unexpected outcome');
    }

    const allocationsBefore = _.takeWhile(allocationItems, a => a.destination !== destination);
    const targetBefore = allocationsBefore.map(a => a.amount).reduce(BN.add, BN.from(0));

    const targetAfter = BN.add(targetBefore, myAllocationItem.amount);

    const targetTotal = allocationItems.map(a => a.amount).reduce(BN.add, BN.from(0));

    return {targetBefore, targetAfter, targetTotal};
  }
};

export type ErrorModes =
  | {message: 'NonParticipantSignature'; signature: SignatureEntry}
  | {message: 'ReceivedUnexpectedState'; received: string; expected: [string, string]}
  | {message: 'TimedOutWhileFunding'; now: number; submittedAt: number}
  | {message: 'UnexpectedEvent'; event: any};

class DirectFunderError extends Error {
  constructor(public data: ErrorModes) {
    super(data.message);
  }
}

/**
 * In principle, one can send any event to the cranker.
 * We handle this by moving to an error state with an "UnexpectedEvent" error,
 * to avoid throwing a generic error.
 *
 * By extracting this in a function where event has type `never`, this forces the
 * developer to handle all _known_ event types before returning the output of
 * handleUnexpectedEvent
 *
 * @param event unsafe event sent to the cranker
 * @param objective current objective state
 * @returns objective moved to error state
 *
 */
function handleUnexpectedEvent(event: never, objective: OpenChannelObjective): OpenChannelResult {
  const error = new DirectFunderError({event, message: 'UnexpectedEvent'});
  objective.status = 'error';
  return {objective, actions: [{type: 'handleError', error}]};
}

import * as _ from 'lodash';

import {checkThat, isSimpleAllocation, unreachable} from '../utils';
import {BN} from '../bignumber';
import {calculateChannelId, hashState, signState} from '../state-utils';
import {Address, Payload, SignatureEntry, SignedState, State, Uint256} from '../types';

// TODO (WALLET_VERSION): This should be determined and exported by wallet-core
export const WALLET_VERSION = 'SomeVersion';

type AddressedMessage = {recipient: string; message: Payload};

export type OpenChannelEvent = {now: number} & (
  | {type: 'Nudge'}
  | {type: 'MessageReceived'; message: Payload}
  | {type: 'FundingUpdated'; amount: Uint256; finalized: boolean}
  | {type: 'DepositSubmitted'; tx: string; attempt: number; submittedAt: number; now: number}
);

export type SignedStateHash = {hash: string; signatures: SignatureEntry[]};

export enum WaitingFor {
  theirPreFundSetup = 'DirectFunder.theirPreFundSetup',
  safeToDeposit = 'DirectFunder.safeToDeposit',
  channelFunded = 'DirectFunder.channelFunded',
  theirPostFundState = 'DirectFunder.theirPostFundSetup'
}

const enum Hashes {
  preFundSetup = 'preFundSetup',
  postFundSetup = 'postFundSetup'
}

export type OpenChannelObjective = {
  status: WaitingFor | 'success' | 'error';
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
  myIndex: number
): OpenChannelObjective {
  if (openingState.turnNum !== 0) {
    throw 'unexpected state';
  }

  const allowedIndices = _.range(0, openingState.participants.length);
  if (!allowedIndices.includes(myIndex)) {
    throw 'unexpected index';
  }

  const signatures =
    'signatures' in openingState ? mergeSignatures([], openingState.signatures) : [];

  return {
    channelId: calculateChannelId(openingState),
    myIndex,
    openingState: _.omit(openingState, 'signatures'),
    status: WaitingFor.theirPreFundSetup,
    preFundSetup: {hash: hashState(setupState(openingState, Hashes.preFundSetup)), signatures},
    funding: {amount: BN.from(0), finalized: true},
    fundingRequest: undefined,
    postFundSetup: {hash: hashState(setupState(openingState, Hashes.postFundSetup)), signatures: []}
  };
}

export type Action =
  | {type: 'sendMessage'; message: AddressedMessage}
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
    case 'Nudge':
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
    case 'MessageReceived': {
      const {signedStates} = event.message;

      // TODO: Assume there's only one signed state
      if (signedStates && signedStates[0]) {
        const signedState = signedStates[0];
        const hash = hashState(signedState);
        const {signatures} = signedState;

        for (const signature of signatures) {
          if (!participants.find(p => p.signingAddress === signature.signer)) {
            objective.status = 'error';
            const error = new Error('received a signature from a non-participant');
            _.set(error, 'code', 0);
            _.set(error, 'signer', signature.signer);
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
          const error = new Error('Unexpected state hash');
          _.set(error, 'code', 1);
          _.set(error, 'received', hash);
          _.set(error, 'expected', [objective.preFundSetup.hash, objective.postFundSetup.hash]);
          actions.push({type: 'handleError', error});
          return {objective, actions};
        }
      }
      break;
    }
    default:
      return unreachable(event);
  }

  // Then, transition & collect actions:

  if (!signedbyMe(objective, Hashes.preFundSetup, me.signingAddress)) {
    signStateAction(Hashes.preFundSetup, myPrivateKey, objective, actions);
  }

  if (!completed(objective, Hashes.preFundSetup)) {
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
    // TODO: (ChainService) This should handle timed out funding requests
    objective.status = WaitingFor.channelFunded;
    return {objective, actions};
  } else {
    // otherwise, deposit
    const amount = BN.sub(targetAfter, funding.amount); // previous checks imply this is >0
    actions.push({type: 'deposit', amount});
    objective.status = WaitingFor.channelFunded;
    return {objective, actions};
  }

  // Now that the channel is funded, it's safe to sign the postFS
  if (!signedbyMe(objective, Hashes.postFundSetup, me.signingAddress)) {
    signStateAction(Hashes.postFundSetup, myPrivateKey, objective, actions);
  }

  if (!completed(objective, Hashes.postFundSetup)) {
    objective.status = WaitingFor.theirPostFundState;
    return {objective, actions};
  } else {
    objective.status = 'success';
    return {objective, actions};
  }
}

function signedbyMe(objective: OpenChannelObjective, step: Hashes, me: Address): boolean {
  return objective[step].signatures.map(e => e.signer).includes(me);
}

function completed(objective: OpenChannelObjective, step: Hashes): boolean {
  const {openingState: firstState} = objective;
  return objective[step].signatures.length === firstState.participants.length;
}

function setupState(openingState: State, key: Hashes): State {
  const turnNum = key === Hashes.preFundSetup ? 0 : 2 * openingState.participants.length - 1;

  return {...openingState, turnNum};
}

function signStateAction(
  key: Hashes,
  myPrivateKey: string,
  objective: OpenChannelObjective,
  actions: Action[]
): Action[] {
  const {openingState, myIndex} = objective;
  const me = openingState.participants[myIndex];

  const state = setupState(openingState, key);
  const signature = signState(state, myPrivateKey);
  const entry = {signature, signer: me.signingAddress};
  objective[key].signatures = mergeSignatures(objective[key].signatures, [entry]);

  recipients(objective).map(recipient => {
    const message: Payload = {
      walletVersion: WALLET_VERSION,
      signedStates: [{...state, signatures: [entry]}]
    };
    actions.push({type: 'sendMessage', message: {recipient, message}});
  });

  return actions;
}

function recipients({openingState: {participants}, myIndex}: OpenChannelObjective): string[] {
  return participants.filter((_p, idx) => idx !== myIndex).map(p => p.participantId);
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

const utils = {
  fundingMilestone(state: State, destination: string): FundingMilestone {
    const {allocationItems} = checkThat(state.outcome, isSimpleAllocation);

    const myAllocationItem = _.find(allocationItems, ai => ai.destination === destination);
    if (!myAllocationItem) {
      // throw new ChannelError(ChannelError.reasons.destinationNotInAllocations, {
      //   destination: this.participants[this.myIndex].destination
      // });
      throw 'missing';
    }

    const allocationsBefore = _.takeWhile(allocationItems, a => a.destination !== destination);
    const targetBefore = allocationsBefore.map(a => a.amount).reduce(BN.add, BN.from(0));

    const targetAfter = BN.add(targetBefore, myAllocationItem.amount);

    const targetTotal = allocationItems.map(a => a.amount).reduce(BN.add, BN.from(0));

    return {targetBefore, targetAfter, targetTotal};
  }
};

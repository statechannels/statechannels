import * as _ from 'lodash';

import {checkThat, isSimpleAllocation} from '../utils';
import {Message} from '../wire-protocol';
import {BN} from '../bignumber';
import {addHash, hashState, signState} from '../state-utils';
import {Address, SignatureEntry, State, StateWithHash, Uint256} from '../types';

type AddressedMessage = {recipient: string; message: Message};

// FIXME: For the purpose of prototyping, I am ignoring blockchain events.
export type OpenChannelEvent = Message;

type SignedStateHash = {hash: string; signatures: SignatureEntry[]};

export type OpenChannelObjective = {
  channelId: string;
  openingState: State;
  myIndex: number;

  preFS: SignedStateHash;
  // FIXME: The asset class is _ignored_ here.
  funding: {amount: Uint256; finalized: boolean};
  fundingRequests: {tx: string}[];
  postFS: SignedStateHash;
};

export type Action =
  | {type: 'sendMessage'; message: AddressedMessage}
  // FIXME: What data is required here?
  | {type: 'deposit'; amount: Uint256};

type Result = {
  // FIXME: The statuses could be named, like "waitingForDeposit", "waitingForPostFS", etc.
  status: 'inProgress' | 'success' | 'error';
  objective: OpenChannelObjective;
  actions: Action[];
};

/**
 *
 * @param objective
 * @param event
 * @param myPrivateKey
 * @returns Result
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
  objective: OpenChannelObjective,
  event: OpenChannelEvent,
  myPrivateKey: string
): Result {
  const {participants} = objective.openingState;
  const me = participants[objective.myIndex];

  // First, receive the message

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  // FIXME: Assume there's only one signed state
  if (event.signedStates && event.signedStates[0]) {
    const signedState = event.signedStates[0];
    const hash = hashState(signedState);
    const {signatures} = signedState;

    if (hash === objective.preFS.hash) {
      objective.preFS.signatures = mergeSignatures(objective.preFS.signatures, signatures);
    } else if (hash === objective.postFS.hash) {
      objective.postFS.signatures = mergeSignatures(objective.postFS.signatures, signatures);
    } else {
      throw new Error(
        `Unexpected state hash ${hash}. Expecting ${objective.preFS.hash} or ${objective.postFS.hash}`
      );
    }
  }

  // Then, react:
  const actions: Action[] = [];

  if (!signedbyMe(objective, 'preFS', me.signingAddress)) {
    signStateAction('preFS', myPrivateKey, objective, actions);
  }

  if (!completed(objective, 'preFS')) {
    return {status: 'inProgress', objective, actions};
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
    return {status: 'inProgress', objective, actions};
  }
  // if my deposit is already on chain, take no action
  else if (BN.gte(funding.amount, targetAfter)) {
    return {status: 'inProgress', objective, actions};
  }
  // if there's an outstanding chain request, take no action
  // FIXME: This assumes that each participant deposits exactly once per channel
  else if (objective.fundingRequests.length === 1) {
    // FIXME: This should handle timed out
    return {status: 'inProgress', objective, actions};
  } else {
    // otherwise, deposit
    const amount = BN.sub(targetAfter, funding.amount); // previous checks imply this is >0
    actions.push({type: 'deposit', amount});
    return {status: 'inProgress', objective, actions};
  }

  // Now that
  if (!signedbyMe(objective, 'postFS', me.signingAddress)) {
    signStateAction('postFS', myPrivateKey, objective, actions);
  }

  if (!completed(objective, 'postFS')) {
    return {status: 'inProgress', objective, actions};
  } else {
    return {status: 'success', objective, actions};
  }
}

function signedbyMe(
  objective: OpenChannelObjective,
  step: 'preFS' | 'postFS',
  me: Address
): boolean {
  return objective[step].signatures.map(e => e.signer).includes(me);
}

function completed(objective: OpenChannelObjective, step: 'preFS' | 'postFS'): boolean {
  const {openingState: firstState} = objective;
  return objective[step].signatures.length === firstState.participants.length;
}

function signStateAction(
  key: 'preFS' | 'postFS',
  myPrivateKey: string,
  objective: OpenChannelObjective,
  actions: Action[]
): Action[] {
  const {openingState: firstState, channelId, myIndex} = objective;
  const me = firstState.participants[myIndex];

  const turnNum = key === 'preFS' ? 0 : 2 * firstState.participants.length - 1;
  const state: StateWithHash = addHash({...firstState, turnNum});
  const signature = signState(state, myPrivateKey);
  const entry = {signature, signer: me.signingAddress};
  objective[key].signatures.push(entry);

  recipients(objective).map(recipient => {
    const message: Message = {signedStates: [{...state, signatures: [entry]}]};
    actions.push({type: 'sendMessage', message: {recipient, message}});
  });

  return actions;
}

function recipients({openingState: {participants}, myIndex}: OpenChannelObjective): string[] {
  return participants.filter((_p, idx) => idx !== myIndex).map(p => p.participantId);
}

function mergeSignatures(left: SignatureEntry[], right: SignatureEntry[]): SignatureEntry[] {
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

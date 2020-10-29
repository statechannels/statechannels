import {compose, map, filter} from 'lodash/fp';
import _ from 'lodash';
import {
  allocateToTarget,
  checkThat,
  isSimpleAllocation,
  Outcome,
  SignedStateWithHash,
  SimpleAllocation,
  areAllocationItemsEqual,
  BN,
} from '@statechannels/wallet-core';
import {Transaction} from 'knex';

import {Store} from '../wallet/store';
import {Bytes32} from '../type-aliases';
import {LedgerRequestType} from '../models/ledger-request';

import {Protocol, ProtocolResult, ChannelState} from './state';
import {
  MarkLedgerFundingRequestsAsComplete,
  noAction,
  ProtocolAction,
  SignLedgerState,
} from './actions';

export type ProtocolState = {
  fundingChannel: ChannelState;
  channelsRequestingFunds: ChannelState[];
  channelsReturningFunds: ChannelState[];
};

const retrieveFundsFromClosedChannels = (
  original: SimpleAllocation,
  channelsReturningFunds: ChannelState[]
): SimpleAllocation => ({
  ...original,
  allocationItems: channelsReturningFunds.reduce(
    (allocationItems, channel) =>
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (channel.supported!.outcome as SimpleAllocation).allocationItems
        .reduce((allocationItems, {destination, amount}) => {
          const idx = allocationItems.findIndex(to => destination === to.destination);
          return idx > -1
            ? _.update(allocationItems, idx, to => ({
                destination,
                amount: BN.add(amount, to.amount),
              }))
            : [...allocationItems, {destination, amount}];
        }, allocationItems)
        .filter(item => item.destination !== channel.channelId),
    original.allocationItems
  ),
});

const allocateFundsToChannels = (
  original: SimpleAllocation,
  allocationTargets: ChannelState[]
): {
  allocated: SimpleAllocation;
  insufficientFunds: Bytes32[];
} => {
  // This could fail at some point if there is no longer space to fund stuff
  // TODO: Handle that case
  const insufficientFunds: Bytes32[] = [];
  const allocated = allocationTargets.reduce((outcome, {channelId, supported}) => {
    try {
      return allocateToTarget(
        outcome,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (supported!.outcome as SimpleAllocation).allocationItems,
        channelId
      ) as SimpleAllocation;
    } catch (e) {
      if (
        // A proposed channel wants more funds than are available from a participant
        e.message.toString() === 'Insufficient funds in fundingChannel channel' ||
        // There is no participant balance at all (exactly 0 left)
        e.message.toString() === 'Destination missing from ledger channel'
      )
        insufficientFunds.push(channelId);
      return outcome;
    }
  }, original);

  return {allocated, insufficientFunds};
};

const intersectOutcome = (a: SimpleAllocation, b: SimpleAllocation): SimpleAllocation => {
  if (a.assetHolderAddress !== b.assetHolderAddress)
    throw new Error('intersectOutcome: assetHolderAddresses not equal');
  return {
    type: 'SimpleAllocation',
    assetHolderAddress: b.assetHolderAddress,
    allocationItems: _.intersectionWith(
      a.allocationItems,
      b.allocationItems,
      areAllocationItemsEqual
    ),
  };
};

const xorOutcome = (a: SimpleAllocation, b: SimpleAllocation): SimpleAllocation => {
  if (a.assetHolderAddress !== b.assetHolderAddress)
    throw new Error('xorOutcome: assetHolderAddresses not equal');
  return {
    type: 'SimpleAllocation',
    assetHolderAddress: b.assetHolderAddress,
    allocationItems: _.xorWith(a.allocationItems, b.allocationItems, areAllocationItemsEqual),
  };
};

/**
 * Follows an algorithm to guarantee that an agreed upon ledger update will be signed by
 * 2 participants in at most 2 round trips. Either can propose a state at any time and either
 * can counterpropose a state at any time. However, if they follow the algorithm below they
 * should always be able to compute the expected outcome by the second round trip.
 *
 * Algorithm:
 *
 * IF there are any pending ledger updates (to fund OR defund a channel)
 *
 *   i. Check if I already signed a new ledger update O₁. If I did, then use that. [1]
 *      Otherwise, iteratively allocate funds from the supported state's (i.e., S) outcome
 *      to each request, call this O₁.
 *
 *  ii. Check if there is a conflicting ledger update, O₂.
 *
 *      a. If O₁ ⋂ O₂ ≠ O₁ sign an outcome for O₁ ⋂ O₂ with turn number 2
 *         higher than the one corresponding to O₂.
 *
 *      b. If O₁ ⋂ O₂ = O₁ = O then sign O with turn number 2 corresponding to O₂.
 *
 * [1] If you sign O₁, a new request may come in to your wallet — we ignore those new
 *     requests until either O₁ or O₂ is signed, to avoid an endless loop.
 */
const computeNewOutcome = ({
  fundingChannel: {
    supported,
    latestNotSignedByMe,
    latestSignedByMe,
    channelId,
    participants: {length: n},
  },
  channelsRequestingFunds,
  channelsReturningFunds,
}: ProtocolState): SignLedgerState | false => {
  // Sanity-checks
  if (!supported) return false;
  if (!latestSignedByMe) return false;
  if (supported.turnNum < n) return false;

  const myLatestOutcome = checkThat(latestSignedByMe.outcome, isSimpleAllocation);
  const supportedOutcome = checkThat(supported.outcome, isSimpleAllocation);

  // Nothing left to do, no actions to take
  if (channelsRequestingFunds.length === 0 && channelsReturningFunds.length === 0) return false;

  // TODO: Sort should be somewhere else
  channelsRequestingFunds = _.sortBy(channelsRequestingFunds, a => a.latest.channelNonce);
  channelsReturningFunds = _.sortBy(channelsReturningFunds, a => a.latest.channelNonce);

  const receivedOriginal =
    latestNotSignedByMe && latestNotSignedByMe.turnNum === supported.turnNum + 2;
  const receivedMerged =
    latestNotSignedByMe && latestNotSignedByMe.turnNum === supported.turnNum + 2 * n;
  const sentOriginal = latestSignedByMe.turnNum === supported.turnNum + n;
  const sentMerged = latestSignedByMe.turnNum === supported.turnNum + 2 * n;

  // Avoid repeating action if awaiting response (for original proposal or counterproposal)
  if (!receivedMerged && ((!receivedOriginal && sentOriginal) || sentMerged)) return false;

  // The new outcome is the supported outcome, funding all pending ledger requests
  let myExpectedOutcome: Outcome;

  // Any channels which the algorithm decides cannot be funded (thus must be rejected)
  let insufficientFundsFor: Bytes32[] = [];

  // If you already proposed an update though, re-use that,
  // don't re-compute (set of pending requests may have changed)
  if (sentOriginal || sentMerged) myExpectedOutcome = myLatestOutcome;
  else
    ({
      allocated: myExpectedOutcome,
      insufficientFunds: insufficientFundsFor,
    } = allocateFundsToChannels(
      // Defunding happens before funding new requests
      retrieveFundsFromClosedChannels(supportedOutcome, channelsReturningFunds),
      channelsRequestingFunds
    ));

  let newOutcome: Outcome = myExpectedOutcome;
  let newTurnNum: number = supported.turnNum + n;

  /**
   * If I already received a proposal then (1) check if it is conflicting and
   * if it is, then (2) sign the intersection (3) with an increased turn number,
   * but otherwise just continue as normal (my signature will create a support)
   */
  if (receivedOriginal || receivedMerged) {
    const {outcome: conflictingOutcome} = latestNotSignedByMe as SignedStateWithHash;

    const theirLatestOutcome = checkThat(conflictingOutcome, isSimpleAllocation);

    if (!_.isEqual(theirLatestOutcome, myExpectedOutcome) /* (1) */) {
      const merged = intersectOutcome(myExpectedOutcome, theirLatestOutcome);
      const xor = xorOutcome(myExpectedOutcome, theirLatestOutcome);

      const bothFunding = channelsRequestingFunds.filter(({channelId}) =>
        _.some(merged.allocationItems, ['destination', channelId])
      );

      const bothDefunding = channelsReturningFunds.filter(
        ({channelId}) => !_.some(xor.allocationItems, ['destination', channelId])
      );

      const agreedUponOutcome = allocateFundsToChannels(
        retrieveFundsFromClosedChannels(supportedOutcome, bothDefunding),
        bothFunding
      ); // (2)

      newOutcome = agreedUponOutcome.allocated; // (2)
      newTurnNum = supported.turnNum + 2 * n; // (3)
      insufficientFundsFor = insufficientFundsFor.concat(agreedUponOutcome.insufficientFunds);
    } else {
      // The "your counter proposal is equal to my original proposal!" scenario.
      //
      // This scenario is quite nuanced:
      //   a. I sent a state
      //   b. The counterparty sent a conflicting state (before receiving mine)
      //   c. The counterparty received my original state and signed the merged outcome
      //      and this merged outcome was equal to my original state.
      //   d. Before receiving the conflicting state (b) I receive the merged state (c)
      //   e. Thus I have a received a merged state (turnNum = S + 2 * n), and NOT an original
      //      state (which would have had turnNum = S + n) which is EQUAL to my original state
      //      (which had turnNum = S + n).
      //
      // In this case, I must sign the same state I signed before, but 2 turnNums higher.
      //
      if (receivedMerged && sentOriginal) newTurnNum = supported.turnNum + 2 * n;
    }
  }

  return {
    type: 'SignLedgerState',
    channelId,
    stateToSign: {
      ...supported,
      outcome: newOutcome,
      turnNum: newTurnNum,
    },
    channelsNotFunded: insufficientFundsFor,
  };
};

const markRequestsAsComplete = ({
  fundingChannel: {supported},
  channelsRequestingFunds,
  channelsReturningFunds,
}: ProtocolState): MarkLedgerFundingRequestsAsComplete | false => {
  if (!supported) return false;
  if (channelsRequestingFunds.length === 0 && channelsReturningFunds.length === 0) return false;

  const fundedChannels = channelsRequestingFunds.filter(({channelId}) =>
    _.some(
      checkThat(supported.outcome, isSimpleAllocation).allocationItems,
      allocationItem => allocationItem.destination === channelId
    )
  );

  const defundedChannels = channelsReturningFunds.filter(
    ({channelId}) =>
      !_.some(
        checkThat(supported.outcome, isSimpleAllocation).allocationItems,
        allocationItem => allocationItem.destination === channelId
      )
  );

  if (fundedChannels.length === 0 && defundedChannels.length === 0) return false;

  return {
    type: 'MarkLedgerFundingRequestsAsComplete',
    fundedChannels: fundedChannels.map(channel => channel.channelId),
    defundedChannels: defundedChannels.map(channel => channel.channelId),
  };
};

// NOTE: Deciding _not_ to care about turn taking
// const myTurnToDoLedgerStuff = ({
//   fundingChannel: {supported, participants, myIndex},
// }: ProtocolState): boolean =>
//   !!supported && (supported.turnNum + 1) % participants.length === myIndex;

export const protocol: Protocol<ProtocolState> = (
  ps: ProtocolState
): ProtocolResult<ProtocolAction> =>
  markRequestsAsComplete(ps) || computeNewOutcome(ps) || noAction;

/**
 * Helper method to retrieve scoped data needed for ProcessLedger protocol.
 */
export const getProcessLedgerQueueProtocolState = async (
  store: Store,
  ledgerChannelId: Bytes32,
  tx: Transaction
): Promise<ProtocolState> => {
  const ledgerRequests = await store.getPendingLedgerRequests(ledgerChannelId, tx);
  return {
    fundingChannel: await store.getChannel(ledgerChannelId, tx),
    channelsRequestingFunds: await Promise.all(
      compose(
        map(({channelToBeFunded}: LedgerRequestType) => store.getChannel(channelToBeFunded, tx)),
        filter(['status', 'pending']),
        filter(['type', 'fund'])
      )(ledgerRequests)
    ),
    channelsReturningFunds: await Promise.all(
      compose(
        map(({channelToBeFunded}: LedgerRequestType) => store.getChannel(channelToBeFunded, tx)),
        filter(['status', 'pending']),
        filter(['type', 'defund'])
      )(ledgerRequests)
    ),
  };
};

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
  AllocationItem,
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

function removeChannelFromAllocation(
  allocationItems: AllocationItem[],
  channel: ChannelState
): AllocationItem[] {
  if (!channel.supported) throw new Error('state is unsupported');

  const {allocationItems: channelAllocations} = checkThat(
    channel.supported.outcome,
    isSimpleAllocation
  );

  const [removed, remaining] = _.partition(allocationItems, ['destination', channel.channelId]);

  if (removed.length !== 1) throw new Error('Expected to find exactly one item');

  if (removed[0].amount !== channelAllocations.map(x => x.amount).reduce(BN.add, BN.from(0)))
    throw new Error('Expected outcome allocations to add up to the allocation in ledger');

  return channelAllocations.reduce((remainingItems, {destination, amount}) => {
    const idx = remainingItems.findIndex(to => destination === to.destination);
    return idx > -1
      ? _.update(remainingItems, idx, to => ({
          destination,
          amount: BN.add(amount, to.amount),
        }))
      : [...remainingItems, {destination, amount}];
  }, remaining);
}

const retrieveFundsFromClosedChannels = (
  {assetHolderAddress, allocationItems}: SimpleAllocation,
  channelsReturningFunds: ChannelState[]
): SimpleAllocation => ({
  type: 'SimpleAllocation',
  assetHolderAddress: assetHolderAddress,
  allocationItems: channelsReturningFunds.reduce(removeChannelFromAllocation, allocationItems),
});

const allocateFundsToChannels = (
  original: SimpleAllocation,
  allocationTargets: ChannelState[]
): {
  allocated: SimpleAllocation;
  insufficientFunds: Bytes32[];
} => {
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
 *   i. Check if I already signed a new ledger update. If I did, then call its outcome O₁. [1]
 *      Otherwise, iteratively allocate funds from the supported state's (i.e., S) outcome
 *      to each request, call this O₁.
 *
 *  ii. If there is a conflicting ledger update, call its outcome O₂. Sign O₁ ⋂ O₂ with the
 *      higher turn number between 2 higher than the latest I signed and the turn number
 *      of what was received from the counterparty, O₂.
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

  const conflict = latestNotSignedByMe && latestNotSignedByMe.turnNum > supported.turnNum;

  // If I have signed the newest thing, take no further action
  if (latestSignedByMe.turnNum > Math.max(supported.turnNum, latestNotSignedByMe?.turnNum || 0))
    return false;

  // The new outcome is the supported outcome, funding all pending ledger requests
  let myExpectedOutcome: Outcome;

  // Any channels which the algorithm decides cannot be funded (thus must be rejected)
  let insufficientFundsFor: Bytes32[] = [];

  // Check if I already signed a new ledger update, if so continue with that
  if (latestSignedByMe.turnNum === supported.turnNum + n) myExpectedOutcome = myLatestOutcome;
  // Otherwise, iteratively allocate funds from the supported state's (i.e., S) outcome
  else
    ({
      allocated: myExpectedOutcome,
      insufficientFunds: insufficientFundsFor,
    } = allocateFundsToChannels(
      retrieveFundsFromClosedChannels(supportedOutcome, channelsReturningFunds),
      channelsRequestingFunds
    ));

  let newOutcome: Outcome = myExpectedOutcome;
  let newTurnNum: number = supported.turnNum + n;

  // If there is a conflicting ledger update, sign the intersection
  if (conflict) {
    const {
      outcome: conflictingOutcome,
      turnNum: conflictingTurnNum,
    } = latestNotSignedByMe as SignedStateWithHash;

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
      insufficientFundsFor = insufficientFundsFor.concat(agreedUponOutcome.insufficientFunds);
    }

    // Bump the turn number to indicate conflict resolution
    newTurnNum = Math.max(latestSignedByMe.turnNum + n, conflictingTurnNum); // (3)
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

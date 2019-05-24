import { BigNumber, bigNumberify } from 'ethers/utils';
import { Address } from 'fmg-core';
import { HUB_ADDRESS } from '../../constants';
import AllocatorChannel from '../models/allocatorChannel';
import { Blockchain } from './blockchain';

/* todo:
 * Current logic of the deposit manager:
 * When a deposit even arrives, if the adjudicator requires additional funding, fully fund the adjudicator.
 *
 * Correct logic:
 * When a deposit event arrives, check to see if the adjudicator has sufficient funds for the hub to safely deposit.
 * If so, only deposit hub's share.
 */

export async function onDepositEvent(
  channelId: Address,
  amountDeposited: BigNumber,
  destinationHoldings: BigNumber,
) {
  // todo: to avoid manual case conversions, we can switch to knexSnakeCaseMappers.
  // https://vincit.github.io/objection.js/recipes/snake-case-to-camel-case-conversion.html#snake-case-to-camel-case-conversion
  const channel_id = channelId;
  const allocatorChannel = await AllocatorChannel.query()
    .findOne({
      channel_id,
    })
    .eager('[commitments.[allocations], participants]');

  if (!allocatorChannel) {
    console.log(`Allocator channel ${channelId} not in database`);
    return;
  }

  await AllocatorChannel.query()
    .findById(allocatorChannel.id)
    .patch({ holdings: destinationHoldings.toHexString() });

  const commitments = allocatorChannel.commitments;
  const latestCommitment = commitments.reduce((prevCommitment, currentCommitment) => {
    return prevCommitment.turnNumber > currentCommitment.turnNumber
      ? prevCommitment
      : currentCommitment;
  });

  const hubParticipatIndex = allocatorChannel.participants
    .map(participant => participant.address)
    .indexOf(HUB_ADDRESS);

  const totalNeededInAdjudicator = latestCommitment.allocations
    .map(allocation => allocation.amount)
    .reduce((accumulator, currentAmount) => {
      const sumSoFar = bigNumberify(accumulator);
      const toAdd = bigNumberify(currentAmount);
      const sum = sumSoFar.add(toAdd);
      return sum.toHexString();
    });

  const channelNeedsMoreFunds = bigNumberify(totalNeededInAdjudicator).gt(
    bigNumberify(destinationHoldings),
  );

  if (channelNeedsMoreFunds) {
    const allocationNeededFromHub = latestCommitment.allocations[hubParticipatIndex];
    await Blockchain.fund(
      channelId,
      destinationHoldings.toHexString(),
      allocationNeededFromHub.amount,
    );
  } else {
    console.log('Channel is fully funded');
  }
}

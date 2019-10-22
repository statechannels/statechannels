import { bigNumberify } from 'ethers/utils';
import { Address, Uint256 } from 'fmg-core';
import { addHex } from 'magmo-wallet';
import { HUB_ADDRESS } from '../../constants';
import Channel from '../models/channel';
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
  amountDeposited: Uint256,
  destinationHoldings: Uint256,
) {
  // todo: to avoid manual case conversions, we can switch to knexSnakeCaseMappers.
  // https://vincit.github.io/objection.js/recipes/snake-case-to-camel-case-conversion.html#snake-case-to-camel-case-conversion
  const channel_id = channelId;
  const channel = await Channel.query()
    .findOne({
      channel_id,
    })
    .eager('[commitments.[allocations], participants]');

  const holdings = destinationHoldings;

  if (!channel) {
    console.log(`Allocator channel ${channelId} not in database`);
    return;
  }

  await Channel.query()
    .findById(channel.id)
    .patch({ holdings });

  const commitments = channel.commitments;
  const latestCommitment = commitments.reduce((prevCommitment, currentCommitment) => {
    return prevCommitment.turnNumber > currentCommitment.turnNumber
      ? prevCommitment
      : currentCommitment;
  });

  const hubParticipatIndex = channel.participants
    .map(participant => participant.address)
    .indexOf(HUB_ADDRESS);

  const totalNeededInAdjudicator = latestCommitment.allocations
    .map(allocation => allocation.amount)
    .reduce(addHex);

  const channelNeedsMoreFunds = bigNumberify(totalNeededInAdjudicator).gt(bigNumberify(holdings));

  if (channelNeedsMoreFunds) {
    const allocationNeededFromHub = latestCommitment.allocations[hubParticipatIndex];
    await Blockchain.fund(channelId, holdings, allocationNeededFromHub.amount);
  } else {
    console.log('Channel is fully funded');
  }
}

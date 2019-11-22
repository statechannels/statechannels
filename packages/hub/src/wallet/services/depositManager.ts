import {addHex} from '@statechannels/wallet';
import {bigNumberify} from 'ethers/utils';
import {HUB_ADDRESS} from '../../constants';
import Channel from '../models/channel';
import {AssetHolderWatcherEvent} from './asset-holder-watcher';
import {Blockchain} from './blockchain';

/* todo:
 * Current logic of the deposit manager:
 * When a deposit even arrives, if the asset holder requires additional funding, fully fund the asset holder.
 *
 * Correct logic:
 * When a deposit event arrives, check to see if the asset holder has sufficient funds for the hub to safely deposit.
 * If so, only deposit hub's share.
 */

export async function onDepositEvent(assetHolderEvent: AssetHolderWatcherEvent) {
  // todo: to avoid manual case conversions, we can switch to knexSnakeCaseMappers.
  // https://vincit.github.io/objection.js/recipes/snake-case-to-camel-case-conversion.html#snake-case-to-camel-case-conversion
  const channel = await Channel.query()
    .findOne({
      channel_id: assetHolderEvent.channelId
    })
    .eager('[states.[outcome.[allocation]], participants, holdings]');

  const holdings = assetHolderEvent.destinationHoldings;

  if (!channel) {
    console.log(`Allocator channel ${assetHolderEvent.channelId} not in database`);
    return;
  }

  const newHolding = {
    assetHolderAddress: assetHolderEvent.assetHolderAddress,
    amount: assetHolderEvent.destinationHoldings
  };

  let updatedHoldings = [newHolding];
  if (channel.holdings) {
    updatedHoldings = channel.holdings.map(channelHolding => {
      if (channelHolding.assetHolderAddress === assetHolderEvent.assetHolderAddress) {
        return {
          assetHolderAddress: channelHolding.assetHolderAddress,
          amount: channelHolding.amount
        };
      }
      return newHolding;
    });
    if (updatedHoldings.length === channel.holdings.length) {
      updatedHoldings = [...updatedHoldings, newHolding];
    }
  }
  const updatedChannel = {...channel, holdings: updatedHoldings};
  await Channel.query().upsertGraph(updatedChannel);

  const states = channel.states;
  const latestState = states.reduce((prevState, currentState) => {
    return prevState.turnNum > currentState.turnNum ? prevState : currentState;
  });

  const hubParticipatIndex = channel.participants
    .map(participant => participant.address)
    .indexOf(HUB_ADDRESS);

  const outcomesForAssetHolder = latestState.outcome.filter(
    outcome => outcome.assetHolderAddress === assetHolderEvent.assetHolderAddress
  );
  if (outcomesForAssetHolder.length !== 1) {
    throw Error('Deposited event cannot be matched with an allocation outcome');
  }

  const outcomeForAssetHolder = outcomesForAssetHolder[0];
  const totalNeededInChannel = outcomeForAssetHolder.allocation
    .map(allocation => allocation.amount)
    .reduce(addHex);

  const channelNeedsMoreFunds = bigNumberify(totalNeededInChannel).gt(bigNumberify(holdings));

  if (channelNeedsMoreFunds) {
    const allocationNeededFromHub = outcomeForAssetHolder.allocation[hubParticipatIndex];
    await Blockchain.fund(assetHolderEvent.channelId, holdings, allocationNeededFromHub.amount);
  } else {
    console.log('Channel is fully funded');
  }
}

import {bigNumberify} from 'ethers/utils';
import {HUB_ADDRESS} from '../../constants';
import Channel from '../models/channel';
import ChannelHolding from '../models/channelHoldings';
import {addHex} from '../utilities/hex-utils';
import {AssetHolderWatcherEvent} from './asset-holder-watcher';
import {Blockchain} from './blockchain';
import {logger} from '../../logger';

const log = logger();

function updateHoldings(
  newHolding: ChannelHolding,
  currentHoldings: ChannelHolding[]
): ChannelHolding[] {
  let updatedHoldings = [newHolding];
  if (
    currentHoldings &&
    currentHoldings.filter(holding => holding.assetHolderAddress === newHolding.assetHolderAddress)
      .length > 0
  ) {
    updatedHoldings = currentHoldings.map(channelHolding => {
      if (channelHolding.assetHolderAddress === newHolding.assetHolderAddress) {
        return newHolding;
      }
      return channelHolding;
    });
  } else {
    updatedHoldings = [...currentHoldings, newHolding];
  }
  return updatedHoldings;
}

/* Todo:
 * Current logic of the deposit manager:
 * When a deposit even arrives, if the asset holder requires additional funding, fully fund the asset holder.
 *
 * Correct logic:
 * When a deposit event arrives, check to see if the asset holder has sufficient funds for the hub to safely deposit.
 * If so, only deposit hub's share.
 */

export async function onDepositEvent(assetHolderEvent: AssetHolderWatcherEvent) {
  // Todo: to avoid manual case conversions, we can switch to knexSnakeCaseMappers.
  // https://vincit.github.io/objection.js/recipes/snake-case-to-camel-case-conversion.html#snake-case-to-camel-case-conversion
  const channel = await Channel.query()
    .findOne({
      channel_id: assetHolderEvent.channelId
    })
    .eager('[states.[outcome.[allocationItems]], participants, holdings]');

  const holdings = assetHolderEvent.destinationHoldings;

  if (!channel) {
    log.error(`Allocator channel ${assetHolderEvent.channelId} not in database`);
    return;
  }

  const newHolding = {
    assetHolderAddress: assetHolderEvent.assetHolderAddress,
    amount: assetHolderEvent.destinationHoldings
  };

  const updatedHoldings = updateHoldings(ChannelHolding.fromJson(newHolding), channel.holdings);
  const updatedChannel = {...channel, holdings: updatedHoldings};
  await Channel.query().upsertGraph(updatedChannel);

  const states = channel.states;
  const latestState = states.reduce((prevState, currentState) =>
    prevState.turnNum > currentState.turnNum ? prevState : currentState
  );

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
  const totalNeededInChannel = outcomeForAssetHolder.allocationItems
    .map(allocationItem => allocationItem.amount)
    .reduce(addHex);

  const channelNeedsMoreFunds = bigNumberify(totalNeededInChannel).gt(bigNumberify(holdings));

  if (channelNeedsMoreFunds) {
    const allocationNeededFromHub = outcomeForAssetHolder.allocationItems[hubParticipatIndex];
    await Blockchain.fund(assetHolderEvent.channelId, holdings, allocationNeededFromHub.amount);
  } else {
    log.info('Channel is fully funded');
  }
}

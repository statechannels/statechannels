import _ from 'lodash';
import {ETH_ASSET_HOLDER_ADDRESS} from '@statechannels/wallet-core/lib/src/config';
import {BN} from '@statechannels/wallet-core';

import {Funding, RequiredColumns} from '../../funding';
import {Fixture, DeepPartial} from '../../../wallet/__test__/fixtures/utils';

export const funding: Fixture<Funding> = (props?: DeepPartial<RequiredColumns>) => {
  const defaultChannelId = 'must be overwritten';

  const defaults: RequiredColumns = {
    assetHolder: ETH_ASSET_HOLDER_ADDRESS,
    channelId: defaultChannelId,
    amount: BN.from(0),
  };

  props = _.merge(defaults, props);

  if (props.channelId === defaultChannelId) throw 'Sorry, channel id must be supplied';

  return Funding.fromJson(props);
};

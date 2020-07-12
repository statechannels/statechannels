import { Channel, RequiredColumns } from '../../../models/channel';
import { Fixture } from '../../../wallet/__test__/fixtures/utils';
import _ from 'lodash';
import { createState } from '../../../wallet/__test__/fixtures/states';
import { calculateChannelId } from '@statechannels/wallet-core';
import { alice } from '../../../wallet/__test__/fixtures/signingWallets';

export const channel: Fixture<Channel> = (props?: Partial<RequiredColumns>) => {
  const {
    appDefinition,
    chainId,
    challengeDuration,
    channelNonce,
    participants,
  } = createState();

  const defaults: RequiredColumns = {
    appDefinition,
    channelNonce,
    chainId,
    challengeDuration,
    participants,
    signingAddress: alice().address,
    vars: [],
  };

  const columns: RequiredColumns = _.merge(defaults, props);

  const channelId = calculateChannelId(columns);
  return Channel.fromJson(_.merge({ channelId }, columns));
};

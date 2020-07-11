import { Channel, ChannelColumns } from '../../../models/channel';
import { Fixture } from './utils';
import _ from 'lodash';
import { createState } from './states';
import { calculateChannelId } from '@statechannels/wallet-core';

type WithoutId = Omit<ChannelColumns, 'channelId'>;
export const channel: Fixture<Channel> = (props?: Partial<ChannelColumns>) => {
  const {
    appDefinition,
    chainId,
    challengeDuration,
    channelNonce,
    participants,
  } = createState();

  const defaults: WithoutId = {
    appDefinition,
    channelNonce,
    chainId,
    challengeDuration,
    participants,
    myIndex: 0,
    vars: [],
  };

  const columns: WithoutId = _.merge(defaults, props);

  const channelId = calculateChannelId(columns);
  return Channel.fromJson(_.merge({ channelId }, columns));
};

import {calculateChannelId} from '@statechannels/wallet-core';
import _ from 'lodash';

import {Channel, RequiredColumns} from '../../../models/channel';
import {Fixture, fixture} from '../../../wallet/__test__/fixtures/utils';
import {addHash} from '../../../state-utils';
import {alice} from '../../../wallet/__test__/fixtures/signingWallets';
import {createState, stateSignedBy} from '../../../wallet/__test__/fixtures/states';

export const channel: Fixture<Channel> = (props?: Partial<RequiredColumns>) => {
  const {appDefinition, chainId, challengeDuration, channelNonce, participants} = createState();

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
  return Channel.fromJson(_.merge({channelId}, columns));
};

export const channelWithVars: Fixture<Channel> = fixture<Channel>(
  channel({vars: [addHash(stateSignedBy()())]})
);

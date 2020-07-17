import {Channel, RequiredColumns} from '../../../models/channel';
import {Fixture, fixture} from '../../../wallet/__test__/fixtures/utils';
import _ from 'lodash';
import {createState, stateSignedBy} from '../../../wallet/__test__/fixtures/states';
import {calculateChannelId} from '@statechannels/wallet-core';
import {alice} from '../../../wallet/__test__/fixtures/signingWallets';
import {addHash} from '../../../state-utils';

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

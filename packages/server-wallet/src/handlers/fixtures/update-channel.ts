import {simpleEthAllocation, BN} from '@statechannels/wallet-core';

import {UpdateChannelHandlerParams} from '../update-channel';
import {alice, bob} from '../../wallet/__test__/fixtures/participants';
import {fixture} from '../../wallet/__test__/fixtures/utils';

const defaultVars: UpdateChannelHandlerParams = {
  channelId: '0x1234',
  appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
  outcome: simpleEthAllocation([
    {destination: alice().destination, amount: BN.from(1)},
    {destination: bob().destination, amount: BN.from(3)},
  ]),
};

export const updateChannelFixture = fixture(defaultVars);

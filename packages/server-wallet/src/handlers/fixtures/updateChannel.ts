import {simpleEthAllocation, BN} from '@statechannels/wallet-core';

import {UpdateChannelHandlerParams} from '../updateChannel';
import {alice, bob} from '../../wallet/__test__/fixtures/participants';
import {fixture} from '../../wallet/__test__/fixtures/utils';
import {Uint256} from '../../type-aliases';
import {stateWithHashSignedBy} from '../../wallet/__test__/fixtures/states';
import {ChannelState} from '../../protocols/state';

const defaultVars: UpdateChannelHandlerParams = {
  channelId: '0x1234',
  appData: '0x0000000000000000000000000000000000000000000000000000000000000000',
  outcome: simpleEthAllocation([
    {destination: alice().destination, amount: BN.from(1)},
    {destination: bob().destination, amount: BN.from(3)},
  ]),
};

export const updateChannelFixture = fixture(defaultVars);

const defaultChannelState: ChannelState = {
  channelId: '0x1234',
  myIndex: 0,
  supported: stateWithHashSignedBy()({turnNum: 3}),
  latest: stateWithHashSignedBy()({turnNum: 3}),
  funding: (): Uint256 => '0x0',
};

export const channelStateFixture = fixture(defaultChannelState);

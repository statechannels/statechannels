import { BN, makeAddress } from '@statechannels/wallet-core';
import { UpdateChannelParams } from '@statechannels/client-api-schema';
import { constants } from 'ethers';

import { channel } from '../../../models/__test__/fixtures/channel';

import { alice, bob } from './participants';
import { fixture } from './utils';

const defaultVars: UpdateChannelParams = {
  appData: '0x0abc',
  channelId: channel().channelId,
  allocations: [
    {
      assetHolderAddress: makeAddress(constants.AddressZero),
      allocationItems: [
        { destination: alice().destination, amount: BN.from(1) },
        { destination: bob().destination, amount: BN.from(3) },
      ],
    },
  ],
};

export const updateChannelArgs = fixture(defaultVars);

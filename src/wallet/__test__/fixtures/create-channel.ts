import { BN } from '@statechannels/wallet-core';
import { fixture } from './utils';
import { alice, bob } from './participants';
import { CreateChannelParams } from '../..';
import { constants } from 'ethers';

const defaultVars: CreateChannelParams = {
  appData: '0xabc',
  participants: [alice(), bob()],
  appDefinition: constants.AddressZero,
  fundingStrategy: 'Direct',
  allocations: [
    {
      token: '0x00',
      allocationItems: [
        { destination: alice().destination, amount: BN.from(1) },
        { destination: bob().destination, amount: BN.from(3) },
      ],
    },
  ],
};

export const createChannelArgs = fixture(defaultVars);

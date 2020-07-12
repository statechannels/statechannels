import _ from 'lodash';
import { BigNumber, makeDestination } from '@statechannels/wallet-core';
import { fixture } from './utils';
import { alice, bob } from './participants';
import { CreateChannelParams } from '../..';
import { constants } from 'ethers';

const defaultVars: CreateChannelParams = {
  appData: '0xabc',
  participants: [alice(), bob()],
  appDefinition: makeDestination(constants.AddressZero),
  fundingStrategy: 'Direct',
  allocations: [
    {
      token: 'eth',
      allocationItems: [
        { destination: alice().destination, amount: BigNumber.from(1) },
        { destination: bob().destination, amount: BigNumber.from(3) },
      ],
    },
  ],
};

export const createChannelArgs = fixture(defaultVars);

import {Participant, makeDestination} from '@statechannels/wallet-core';

import * as wallets from './signingWallets';
import {fixture} from './utils';

const _alice: Participant = {
  signingAddress: wallets.alice().address,
  destination: makeDestination(
    '0xaaaa000000000000000000000000000000000000000000000000000000000001'
  ),
  participantId: 'alice',
};
const _bob: Participant = {
  signingAddress: wallets.bob().address,
  destination: makeDestination(
    '0xbbbb000000000000000000000000000000000000000000000000000000000002'
  ),
  participantId: 'bob',
};

export const participant = fixture(_alice);
export const alice = fixture(_alice);
export const bob = fixture(_bob);

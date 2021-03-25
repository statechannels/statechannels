import {Participant, makeDestination} from '@statechannels/wallet-core';

import * as wallets from './signing-wallets';
import {fixture} from './utils';

const _alice: Participant = {
  signingAddress: wallets.alice().address,
  destination: makeDestination(
    '0x00000000000000000000000000000000000000000000000000000000000aaaa1'
  ),
  participantId: 'alice',
};
const _bob: Participant = {
  signingAddress: wallets.bob().address,
  destination: makeDestination(
    '0x00000000000000000000000000000000000000000000000000000000000bbbb2'
  ),
  participantId: 'bob',
};
const _charlie: Participant = {
  signingAddress: wallets.charlie().address,
  destination: makeDestination(
    '0x00000000000000000000000000000000000000000000000000000000000cccc3'
  ),
  participantId: 'charlie',
};

export const participant = fixture(_alice);
export const alice = fixture(_alice);
export const bob = fixture(_bob);
export const charlie = fixture(_charlie);

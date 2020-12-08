import {Participant, makeDestination} from '@statechannels/wallet-core';

import * as wallets from './signing-wallets';
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
const _charlie: Participant = {
  signingAddress: wallets.charlie().address,
  destination: makeDestination(
    '0xcccc000000000000000000000000000000000000000000000000000000000003'
  ),
  participantId: 'charlie',
};

export const participant = fixture(_alice);
export const alice = fixture(_alice);
export const bob = fixture(_bob);
export const charlie = fixture(_charlie);

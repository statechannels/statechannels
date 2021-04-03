import * as _ from 'lodash';

import {createSignatureEntry} from '../state-utils';
import {makeAddress, SignedState, State} from '../types';
import {makeDestination} from '../utils';

export const ONE_DAY = 86400;

export const participants = {
  A: {
    privateKey: '0x95942b296854c97024ca3145abef8930bf329501b718c0f66d57dba596ff1318',
    signingAddress: makeAddress('0x11115FAf6f1BF263e81956F0Cc68aEc8426607cf'),
    participantId: 'alice',
    destination: makeDestination(
      '0x00000000000000000000000000000000000000000000000000000000000aaaa1'
    )
  },
  B: {
    privateKey: '0xb3ab7b031311fe1764b657a6ae7133f19bac97acd1d7edca9409daa35892e727',
    signingAddress: makeAddress('0x2222E21c8019b14dA16235319D34b5Dd83E644A9'),
    participantId: 'bob',
    destination: makeDestination(
      '0x00000000000000000000000000000000000000000000000000000000000bbbb2'
    )
  },
  H: {
    privateKey: '0xc9a5f30ceaf2a0ccbb30d50aa9de3f273aa6e76f89e26090c42775e9647f5b6a',
    signingAddress: makeAddress('0x33335846dd121B14B4C313Cb6b766F09e75890dF'),
    participantId: 'hub',
    destination: makeDestination(
      '0x00000000000000000000000000000000000000000000000000000000000ffff3'
    )
  }
};

type Peer = keyof typeof participants;
export function signStateHelper(state: State, by: Peer): SignedState {
  const entry = createSignatureEntry(state, participants[by].privateKey);

  return {..._.cloneDeep(state), signatures: [entry]};
}

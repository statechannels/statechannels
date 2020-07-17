import { fixture } from '../../../wallet/__test__/fixtures/utils';
import { Nonce } from '../../nonce';
import { alice, bob } from '../../../wallet/__test__/fixtures/participants';

const defaultValue: Nonce = Nonce.fromJson({
  value: 0,
  addresses: [alice().signingAddress, bob().signingAddress],
});

export const nonce = fixture<Nonce>(defaultValue);

import {
  BN,
  SignedState,
  SignedStateWithHash,
  State,
  hashState,
  simpleEthAllocation,
  SignatureEntry,
} from '@statechannels/wallet-core';
import _ from 'lodash';
import {flow} from 'fp-ts/lib/function';

import {SigningWallet} from '../../../models/signing-wallet';
import {addHash} from '../../../state-utils';

import {Fixture, fixture, overwriteOutcome} from './utils';
import {alice, bob} from './participants';
import {alice as aliceWallet} from './signing-wallets';

const defaultState: State = {
  appData: '0x',
  appDefinition: '0x0000000000000000000000000000000000000000',
  isFinal: false,
  turnNum: 0,
  outcome: simpleEthAllocation([
    {destination: alice().destination, amount: BN.from(1)},
    {destination: bob().destination, amount: BN.from(3)},
  ]),
  participants: [alice(), bob()],
  channelNonce: 1,
  chainId: '0x01',
  challengeDuration: 9001,
};

// Caching signatures saves about 200ms per signature
// TODO: Persist these signatures between tests
const signatureCache: Record<string, SignatureEntry> = {};
const _signState = (s: State, sw: SigningWallet): SignatureEntry => {
  const key = `${sw.privateKey}-${hashState(s)}`;
  return (signatureCache[key] = signatureCache[key] || sw.syncSignState(s));
};

export const createState = fixture(defaultState, overwriteOutcome);

const addSignatures = (wallets: SigningWallet[]) => (s: State): SignedState => ({
  ...s,
  signatures: wallets.map(sw => _signState(s, sw)),
});

export const stateSignedBy = (signingWallets = [aliceWallet()]): Fixture<SignedState> =>
  fixture<SignedState>(
    _.merge({signatures: []}, defaultState),
    flow(overwriteOutcome, addSignatures(signingWallets))
  );

// FIXME: This should be replaced with stateWithHashSignedBy2.
// The problem with this version is that it is impossible to get a state
// signed only by bob.
export const stateWithHashSignedBy = (
  pk = aliceWallet(),
  ...otherWallets: SigningWallet[]
): Fixture<SignedStateWithHash> =>
  fixture(
    createState() as SignedStateWithHash,
    flow(overwriteOutcome, addSignatures([pk, ...otherWallets]), addHash)
  );

export const stateWithHashSignedBy2 = (
  signingWallets: SigningWallet[] = [aliceWallet()]
): Fixture<SignedStateWithHash> =>
  fixture(
    createState() as SignedStateWithHash,
    flow(overwriteOutcome, addSignatures(signingWallets), addHash)
  );

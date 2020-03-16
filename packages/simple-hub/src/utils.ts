import {Participant} from './wallet/xstate-wallet-internals';
import {cHubChannelSigningAddress} from './constants';
import * as R from 'ramda';

export function containsHub(participant: Participant): boolean {
  return participant.signingAddress === cHubChannelSigningAddress;
}
export const notContainsHub = R.compose(R.not, containsHub);

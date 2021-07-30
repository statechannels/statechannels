import {utils} from 'ethers';
import ExitFormat from '@statechannels/exit-format';

export type AssetOutcome = ExitFormat.SingleAssetExit;
export type Outcome = ExitFormat.Exit;
export const encodeOutcome = ExitFormat.encodeExit;
export const decodeOutcome = ExitFormat.decodeExit;

import {Bytes32} from './types';

export function hashOutcome(outcome: Outcome): Bytes32 {
  const encodedOutcome = encodeOutcome(outcome);
  return utils.keccak256(encodedOutcome);
}

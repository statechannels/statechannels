export {
  Commitment,
  BaseCommitment,
  CommitmentType,
  toHex,
  mover,
  fromHex,
  ethereumArgs,
  asEthersObject,
  fromParameters,
} from './commitment';
export {Channel, channelID} from './channel';
export {toUint256, sign, recover, decodeSignature, SolidityType, SolidityParameter} from './utils';

import * as CountingApp from './counting-app';
export {CountingApp};
export const ADDRESS_ZERO = '0x' + '0'.repeat(40);

export {Signature, Address, Uint256, Uint32, Uint8, Bytes32, Bytes, Byte} from './types';
export {
  CountingCommitment,
  SolidityCountingCommitmentType,
  createCommitment as createCountingCommitment,
  asCoreCommitment as countingCommitmentAsCoreCommitment,
  args as countingAppEthereumArgs,
} from './counting-app';

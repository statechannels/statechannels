export {
  Commitment,
  CommitmentType,
  toHex,
  fromHex,
  ethereumArgs,
  asEthersObject,
} from './commitment';
export { Channel } from './channel';
export {
  toHex32,
  padBytes32,
  sign,
  recover,
  decodeSignature,
  SolidityType,
  SolidityParameter,
} from './utils';

// TODO: these should probably be in their own package
export { default as expectRevert } from './test/helpers/expect-revert';
export { increaseTime, DURATION } from './test/helpers/increase-time';

import * as CountingApp from './test-app/counting-app';
export { CountingApp };


export {
  MessageSignature,
  Address,
  Uint32,
  Uint8,
  Bytes32,
  Bytes,
} from './types';

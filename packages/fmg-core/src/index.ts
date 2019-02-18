export {
  Commitment,
  CommitmentType,
  toHex,
  fromHex,
  ethereumArgs,
  asEthersObject,
} from './Commitment';
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

export {
  CountingCommitment,
  SolidityCountingCommitmentType,
  createCommitment,
  asCoreCommitment,
  args as testEthereumArgs,
} from './test-app/counting-app';


export { bigNumberify, BigNumber, BigNumberish } from 'ethers/utils';

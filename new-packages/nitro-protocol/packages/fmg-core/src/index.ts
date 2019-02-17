import { ethers } from 'ethers';
export * from './state';
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
  CountingState,
  SolidityCountingStateType,
  createState,
  asCoreState,
  args as ethereumArgs,
} from './test-game/counting-game';


export { bigNumberify, BigNumber } from 'ethers/utils';

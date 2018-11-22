export { State } from './state';
export { Channel } from './channel';
export { toHex32, padBytes32, sign, recover, decodeSignature, SolidityType, SolidityParameter } from './utils';


// TODO: these should probably be in their own package
export { default as expectRevert } from './test/helpers/expect-revert';
export { increaseTime, increaseTimeTo, DURATION } from './test/helpers/increase-time';

export { CountingGame } from './test-game/counting-game';

// @ts-ignore
export { StateLibArtifact } from '../build/contracts/State.json';
// @ts-ignore
export { CountingStateArtifact } from '../build/contracts/CountingState.json';
// @ts-ignore
export { CountingGameArtifact } from '../build/contracts/CountingGame.json';

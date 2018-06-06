export { State } from './src/state';
export { Channel } from './src/channel';
export { toHex32, padBytes32 } from './src/utils';

// TODO: these should probably be in their own package
export { default as assertRevert } from './test/helpers/assert-revert';
export { increaseTime, increaseTimeTo, duration } from './test/helpers/increase-time';
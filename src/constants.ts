import {Address} from './store-types';

require('../env');

export const NAME = 'Neo Bot';

// This account is provided eth in @statechannels/devtools/utils/startGanache.js
export const SERVER_SIGNER_PRIVATE_KEY =
  process.env.SERVER_SIGNER_PRIVATE_KEY ||
  '0x7ab741b57e8d94dd7e1a29055646bafde7010f38a900f55bbd7647880faa6ee8';
export const SERVER_SIGNER_ADDRESS =
  process.env.SERVER_SIGNER_ADDRESS || '0xD9995BAE12FEe327256FFec1e3184d492bD94C31';

export const SERVER_ADDRESS = (process.env.SERVER_ADDRESS ||
  '0x100063c326b27f78b2cBb7cd036B8ddE4d4FCa7C') as Address;
export const SERVER_PRIVATE_KEY =
  process.env.SERVER_PRIVATE_KEY ||
  '0x1b427b7ab88e2e10674b5aa92bb63c0ca26aa0b5a858e1d17295db6ad91c049b';

export const unreachable = (x: never) => x;

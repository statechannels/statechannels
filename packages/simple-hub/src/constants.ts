export const cFirebasePrefix = process.env.FIREBASE_PREFIX || 'default-prefix';

export const cHubStateChannelAddress =
  process.env.HUB_STATE_CHANNEL_ADDRESS || '0x100063c326b27f78b2cBb7cd036B8ddE4d4FCa7C';
export const cHubStateChannelPK =
  process.env.HUB_STATE_CHANNEL_PK ||
  '0x1b427b7ab88e2e10674b5aa92bb63c0ca26aa0b5a858e1d17295db6ad91c049b';

// This account is provided eth in @statechannels/devtools/utils/startGanache.js
export const cHubChainPK =
  process.env.HUB_CHAIN_PK || '0x7ab741b57e8d94dd7e1a29055646bafde7010f38a900f55bbd7647880faa6ee8';
export const cHubChainAddress =
  process.env.HUB_CHAIN_ADDRESS || '0xD9995BAE12FEe327256FFec1e3184d492bD94C31';

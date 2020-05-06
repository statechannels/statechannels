import {Wallet, utils} from 'ethers';

export const cFirebasePrefix = process.env.FIREBASE_PREFIX || 'default-prefix';

export const cHubChannelPK =
  process.env.HUB_CHANNEL_PK ||
  '0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29';
// '0xaaaa84838319627Fa056fC3FC29ab94d479B8502'
export const cHubChannelSigningAddress = new Wallet(cHubChannelPK).address;

// This account is provided eth in @statechannels/devtools/utils/startGanache.js
export const cHubChainPK =
  process.env.HUB_CHAIN_PK || '0x187bb12e927c1652377405f81d93ce948a593f7d66cfba383ee761858b05921a';

export const cHubChainDestination = utils.hexZeroPad(new Wallet(cHubChannelPK).address, 32);

export const cHubParticipantId = process.env.HUB_PARTICIPANT_ID || 'firebase:simple-hub';

export const LOG_DESTINATION = process.env.LOG_DESTINATION ?? 'console';

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

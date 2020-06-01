import {Wallet, utils} from 'ethers';
import path from 'path';

export const cFirebasePrefix = process.env.FIREBASE_PREFIX || 'default-prefix';

export const cHubChannelPK =
  process.env.HUB_CHANNEL_PK ||
  '0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29';
// '0xaaaa84838319627Fa056fC3FC29ab94d479B8502'
export const cHubChannelSigningAddress = new Wallet(cHubChannelPK).address;

// This account is provided eth in @statechannels/devtools/src/constants.ts
// The corresponding address is 0x8199de05654e9afa5C081BcE38F140082C9a7733
if (!process.env.HUB_CHAIN_PK) {
  throw new Error('HUB_CHAIN_PK environment variable must be defined');
}
export const cHubChainPK = process.env.HUB_CHAIN_PK;

export const cHubChainDestination = utils.hexZeroPad(new Wallet(cHubChainPK).address, 32);

export const cHubParticipantId = process.env.HUB_PARTICIPANT_ID || 'firebase:simple-hub';

export const LOG_DESTINATION = process.env.LOG_DESTINATION
  ? process.env.LOG_DESTINATION === 'console'
    ? 'console'
    : path.join(process.env.LOG_DESTINATION, 'simple-hub.log')
  : 'console';

export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

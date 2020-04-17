import {bigNumberify, hexZeroPad} from 'ethers/utils';

export const WALLET_VERSION = 'xstate-wallet@VersionTBD';

export const ETH_ASSET_HOLDER_ADDRESS =
  process.env.ETH_ASSET_HOLDER_ADDRESS || '0x0000000000000000000000000000000000000000';

export const NITRO_ADJUDICATOR_ADDRESS =
  process.env.NITRO_ADJUDICATOR_ADDRESS || '0x0000000000000000000000000000000000000000';

// TODO: Move top ENV variable
export const HUB_ADDRESS =
  process.env.HUB_ADDRESS ||
  // Corresponds to '0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29' from test data
  '0xaaaa84838319627Fa056fC3FC29ab94d479B8502';
export const HUB_DESTINATION = hexZeroPad(HUB_ADDRESS, 32) as any;
export const HUB = {
  destination: HUB_DESTINATION,
  signingAddress: HUB_ADDRESS,
  participantId: 'firebase:simple-hub'
};
export const CHALLENGE_DURATION = bigNumberify(0x12c); // 5 minutes
export const NETWORK_ID = process.env.CHAIN_NETWORK_ID || '0';

export const ETH_TOKEN = '0x0000000000000000000000000000000000000000';

export function assetHolderAddress(tokenAddress: string): string | undefined {
  if (bigNumberify(tokenAddress).isZero()) return ETH_ASSET_HOLDER_ADDRESS;

  throw 'Tokens not supported';
}

export function tokenAddress(assetHolderAddress: string): string | undefined {
  if (assetHolderAddress === ETH_ASSET_HOLDER_ADDRESS) return ETH_TOKEN;

  throw 'Tokens not supported';
}

// TODO: Use getEnvBool from devtools once working
export function getBool(val: string | undefined): boolean {
  switch (val) {
    case undefined:
    case null:
    case 'null':
    case 'false':
    case 'FALSE':
    case '0':
      return false;
    default:
      return true;
  }
}
export const CLEAR_STORAGE_ON_START = getBool(process.env.CLEAR_STORAGE_ON_START);
export const USE_INDEXED_DB = getBool(process.env.USE_INDEXED_DB);

export const LOG_FILE = process.env.LOG_FILE;
export const ADD_LOGS = !!LOG_FILE || getBool(process.env.ADD_LOGS);

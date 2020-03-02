import {bigNumberify} from 'ethers/utils';

export const ETH_ASSET_HOLDER_ADDRESS =
  process.env.ETH_ASSET_HOLDER_ADDRESS || '0x0000000000000000000000000000000000000000';

export const NITRO_ADJUDICATOR_ADDRESS =
  process.env.NITRO_ADJUDICATOR_ADDRESS || '0x0000000000000000000000000000000000000000';

// TODO: Move top ENV variable
export const HUB_ADDRESS = process.env.HUB_ADDRESS || '0x100063c326b27f78b2cBb7cd036B8ddE4d4FCa7C';
export const CHALLENGE_DURATION = bigNumberify(0x12c); // 5 minutes
export const NETWORK_ID = process.env.CHAIN_NETWORK_ID || '0';

export const ETH_TOKEN = '0x0';

export function assetHolderAddress(tokenAddress: string): string | undefined {
  if (bigNumberify(tokenAddress).isZero()) {
    return ETH_ASSET_HOLDER_ADDRESS;
  }
  // TODO: store mapping, implement lookup
  return tokenAddress;
}

export function tokenAddress(assetHolderAddress: string): string | undefined {
  if (assetHolderAddress === ETH_ASSET_HOLDER_ADDRESS) {
    return ETH_TOKEN;
  }
  // TODO: store mapping, implement lookup
  return assetHolderAddress;
}

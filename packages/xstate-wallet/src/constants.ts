import {bigNumberify} from 'ethers/utils';
import {Participant} from './store/types';
import {makeDestination} from './utils/outcome';

export const ETH_ASSET_HOLDER_ADDRESS =
  process.env.ETH_ASSET_HOLDER_ADDRESS || '0x0000000000000000000000000000000000000000';

export const NITRO_ADJUDICATOR_ADDRESS =
  process.env.NITRO_ADJUDICATOR_ADDRESS || '0x0000000000000000000000000000000000000000';

// TODO: Move top ENV variable
// Corresponds to '0x8624ebe7364bb776f891ca339f0aaa820cc64cc9fca6a28eec71e6d8fc950f29' from test data
export const HUB_ADDRESS = process.env.HUB_ADDRESS || '0xaaaa84838319627Fa056fC3FC29ab94d479B8502';
export const HUB_DESTINATION = HUB_ADDRESS;
export const HUB: Participant = {
  destination: makeDestination(HUB_DESTINATION.toLowerCase()),
  signingAddress: HUB_ADDRESS,
  participantId: 'firebase:simple-hub'
};
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

import {AddressZero} from 'ethers/constants';
import {hexZeroPad, bigNumberify} from 'ethers/utils';
import {Destination} from './store';

export const NODE_ENV: string = process.env.NODE_ENV as string;

export const WALLET_VERSION: string = process.env.WALLET_VERSION || 'xstate-wallet@VersionTBD';

export const CHAIN_NETWORK_ID: string = process.env.CHAIN_NETWORK_ID || '0';

export const CLEAR_STORAGE_ON_START = Boolean(process.env.CLEAR_STORAGE_ON_START);

export const ETH_ASSET_HOLDER_ADDRESS: string = process.env.ETH_ASSET_HOLDER_ADDRESS || AddressZero;

export const HUB_ADDRESS: string =
  process.env.HUB_ADDRESS || '0xaaaa84838319627Fa056fC3FC29ab94d479B8502';

export const LOG_DESTINATION: string | undefined = process.env.LOG_DESTINATION;

export const NITRO_ADJUDICATOR_ADDRESS: string =
  process.env.NITRO_ADJUDICATOR_ADDRESS || AddressZero;

export const USE_INDEXED_DB = Boolean(process.env.USE_INDEXED_DB);

export const CHALLENGE_DURATION = bigNumberify(process.env.CHALLENGE_DURATION || '0x12c');

// TODO: Embed this inside logger.ts
export const ADD_LOGS = !!LOG_DESTINATION;

export const HUB = {
  destination: hexZeroPad(HUB_ADDRESS, 32) as Destination,
  signingAddress: HUB_ADDRESS,
  participantId: 'firebase:simple-hub'
};

import {
  getAdjudicatorContractAddress,
  getConsensusContractAddress,
  getNetworkId,
} from './utils/contract-utils';

export const ADJUDICATOR_ADDRESS = getAdjudicatorContractAddress();
export const CONSENSUS_LIBRARY_ADDRESS = getConsensusContractAddress();
export const NETWORK_ID = getNetworkId();
export const USE_STORAGE = process.env.USE_STORAGE === 'TRUE';
// TODO: Move top ENV variable
export const HUB_ADDRESS = '0x100063c326b27f78b2cBb7cd036B8ddE4d4FCa7C';

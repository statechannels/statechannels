import {
  getAdjudicatorContractAddress,
  getConsensusContractAddress,
  getNetworkId,
} from './utils/contract-utils';

export const ADJUDICATOR_ADDRESS = getAdjudicatorContractAddress();
export const CONSENSUS_LIBRARY_ADDRESS = getConsensusContractAddress();
export const NETWORK_ID = getNetworkId();
